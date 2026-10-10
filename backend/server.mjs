import cors from 'cors';
import express from 'express';
import multer from 'multer';
import PocketBase from 'pocketbase';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const PORT = Number(process.env.PORT || 8787);
const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const PB_EMAIL = process.env.PB_SUPERUSER_EMAIL;
const PB_PASSWORD = process.env.PB_SUPERUSER_PASSWORD;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const mapDecimals = Math.min(5, Math.max(1, Number(process.env.PUBLIC_MAP_DECIMALS || 3)));
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

if (!PB_EMAIL || !PB_PASSWORD) {
  console.error('Set PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD in backend/.env.');
  process.exit(1);
}

const catalog = JSON.parse(await readFile(path.join(root, 'data/fisc-species.json'), 'utf8'));
const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES } });
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const text = (name, required = false, max = 500) => ({ name, type: 'text', required, max });
const number = (name, required = false) => ({ name, type: 'number', required });
const json = (name) => ({ name, type: 'json' });
const bool = (name) => ({ name, type: 'bool' });

async function ensureCollection(name, fields, indexes = []) {
  try {
    await pb.collections.getOne(name);
  } catch (error) {
    if (error?.status !== 404) throw error;
    await pb.collections.create({
      name,
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields,
      indexes,
    });
  }
}

async function setupDatabase() {
  await pb.collection('_superusers').authWithPassword(PB_EMAIL, PB_PASSWORD);
  await ensureCollection('species', [
    text('slug', true, 160), text('scientificName', true, 240), json('scientificSynonyms'),
    json('commonNames'), json('zones'), text('category', true, 40), text('region', true, 80),
    text('sourceName', true, 200), text('sourceUrl', true, 500), text('sourceVersion', true, 80),
    text('sourceRetrievedAt', true, 20),
  ], ['CREATE UNIQUE INDEX idx_species_slug ON species (slug)']);
  await ensureCollection('reports', [
    text('speciesName', true, 240), text('scientificName', false, 240), text('speciesId', false, 160),
    text('listedCategory', false, 40), bool('isFiscListed'), text('geminiSuggestion', false, 500),
    text('observedAt', true, 40), text('note', false, 1200),
    number('latitude', true), number('longitude', true), number('publicLatitude', true), number('publicLongitude', true),
    bool('exactLocationPublic'), text('reviewStatus', true, 32), text('reviewNote', false, 1200),
    { name: 'photo', type: 'file', required: true, maxSelect: 1, maxSize: MAX_IMAGE_BYTES, mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] },
  ], ['CREATE INDEX idx_reports_status ON reports (reviewStatus)']);

  const existing = await pb.collection('species').getFullList({ fields: 'id,slug,sourceVersion,sourceRetrievedAt' });
  const ids = new Map(existing.map((record) => [record.slug, record]));
  for (const species of catalog) {
    const record = {
      slug: species.id,
      scientificName: species.scientificName,
      scientificSynonyms: species.scientificSynonyms,
      commonNames: species.commonNames,
      zones: species.zones,
      category: species.category,
      region: species.region,
      sourceName: species.sourceName,
      sourceUrl: species.sourceUrl,
      sourceVersion: species.sourceVersion,
      sourceRetrievedAt: species.sourceRetrievedAt,
    };
    const current = ids.get(species.id);
    if (!current) await pb.collection('species').create(record);
    else if (current.sourceVersion !== species.sourceVersion || current.sourceRetrievedAt !== species.sourceRetrievedAt) {
      await pb.collection('species').update(current.id, record);
    }
  }
  console.log(`PocketBase ready: ${catalog.length} FISC plants loaded.`);
}

const normalize = (value = '') => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const speciesNames = (species) => [species.scientificName, ...species.scientificSynonyms, ...species.commonNames];
const findSpecies = (value) => {
  const wanted = normalize(value);
  if (!wanted) return null;
  return catalog.find((species) => speciesNames(species).some((candidate) => normalize(candidate) === wanted)) || null;
};
const roundCoordinate = (value) => Number(Number(value).toFixed(mapDecimals));
const projectReport = (record, publicOrigin = `http://localhost:${PORT}`) => ({
  id: record.id,
  speciesName: record.speciesName,
  scientificName: record.scientificName,
  isFiscListed: record.isFiscListed,
  listedCategory: record.listedCategory,
  geminiSuggestion: record.geminiSuggestion,
  observedAt: record.observedAt,
  note: record.note,
  latitude: record.publicLatitude,
  longitude: record.publicLongitude,
  exactLocationPublic: record.exactLocationPublic,
  reviewStatus: record.reviewStatus,
  photoUrl: record.photo ? `${publicOrigin}/api/files/${record.id}/${encodeURIComponent(record.photo)}` : null,
  created: record.created || record.observedAt,
});

app.get('/api/health', (_req, res) => res.json({ ok: true, catalogCount: catalog.length, geminiEnabled: Boolean(process.env.GEMINI_API_KEY) }));
app.get('/api/species', (req, res) => {
  const search = normalize(String(req.query.search || ''));
  const results = search
    ? catalog.filter((species) => speciesNames(species).some((name) => normalize(name).includes(search)))
    : catalog;
  res.json({ count: results.length, sourceVersion: catalog[0]?.sourceVersion, species: results });
});
app.get('/api/reports', async (_req, res, next) => {
  try {
    // PocketBase 0.40 collections in this project store the observation time
    // explicitly; they don't expose the legacy built-in `created` timestamp.
    const records = await pb.collection('reports').getFullList({ sort: '-observedAt' });
    const publicOrigin = `http://${_req.get('host')}`;
    res.json({ reports: records.map((record) => projectReport(record, publicOrigin)) });
  } catch (error) { next(error); }
});
app.get('/api/files/:id/:filename', async (req, res) => {
  try {
    const token = await pb.files.getToken();
    const url = `${PB_URL}/api/files/reports/${encodeURIComponent(req.params.id)}/${encodeURIComponent(req.params.filename)}?token=${encodeURIComponent(token)}`;
    const response = await fetch(url);
    if (!response.ok) return res.status(response.status).end();
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch { res.status(502).end(); }
});

app.post('/api/identify', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a plant photo first.' });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'Gemini is not configured. Search the FISC list or enter a plant name manually.' });
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { text: 'Identify the visible plant from this image. Do not infer invasive status. Return a tentative best common name, scientific name if reasonably known, up to 3 plausible alternative names, confidence as low/medium/high, and a short visual rationale. If the image is not a plant or identification is uncertain, say so. Respond only as JSON with keys isPlant (boolean), commonName (string), scientificName (string), alternatives (array of strings), confidence (string), rationale (string).' },
          { inline_data: { mime_type: req.file.mimetype, data: req.file.buffer.toString('base64') } },
        ] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });
    const payload = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: payload.error?.message || 'Gemini identification failed.' });
    const resultText = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    if (!resultText) return res.status(502).json({ error: 'Gemini returned no identification. Try a clearer photo or identify it manually.' });
    const identification = JSON.parse(resultText);
    const match = findSpecies(identification.scientificName) || findSpecies(identification.commonName);
    res.json({ ...identification, fiscMatch: match ? { id: match.id, scientificName: match.scientificName, commonNames: match.commonNames, category: match.category, sourceUrl: match.sourceUrl } : null });
  } catch (error) {
    res.status(502).json({ error: error.message || 'Gemini identification failed. Search the catalog or enter a name manually.' });
  }
});

app.post('/api/reports', upload.single('photo'), async (req, res, next) => {
  try {
    const body = req.body;
    const speciesName = String(body.speciesName || '').trim();
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    if (!req.file) return res.status(400).json({ error: 'A photo is required for a sighting report.' });
    if (!speciesName) return res.status(400).json({ error: 'Confirm or enter a plant name before submitting.' });
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Choose a valid sighting location.' });
    }
    const match = findSpecies(speciesName) || findSpecies(body.scientificName);
    const exactLocationPublic = body.exactLocationPublic === 'true';
    const report = new FormData();
    const fields = {
      speciesName,
      scientificName: String(body.scientificName || match?.scientificName || ''),
      speciesId: match?.id || '',
      listedCategory: match?.category || '',
      isFiscListed: Boolean(match),
      geminiSuggestion: String(body.geminiSuggestion || '').slice(0, 500),
      observedAt: String(body.observedAt || new Date().toISOString()),
      note: String(body.note || '').slice(0, 1200),
      latitude,
      longitude,
      publicLatitude: exactLocationPublic ? latitude : roundCoordinate(latitude),
      publicLongitude: exactLocationPublic ? longitude : roundCoordinate(longitude),
      exactLocationPublic,
      reviewStatus: 'unverified',
      reviewNote: '',
    };
    for (const [key, value] of Object.entries(fields)) report.append(key, String(value));
    report.append('photo', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname || 'plant.jpg');
    const created = await pb.collection('reports').create(report);
    res.status(201).json({ report: projectReport(created, `http://${req.get('host')}`) });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.message || 'The local report service encountered an error.' });
});

await setupDatabase();
app.listen(PORT, '0.0.0.0', () => console.log(`Spot the Spread API listening on http://0.0.0.0:${PORT}`));
