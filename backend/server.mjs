import cors from 'cors';
import express from 'express';
import multer from 'multer';
import PocketBase from 'pocketbase';
import sharp from 'sharp';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
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
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REPORT_PHOTOS = 4;
const sessions = new Map();

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
  let collection;
  try {
    collection = await pb.collections.getOne(name);
  } catch (error) {
    if (error?.status !== 404) throw error;
    collection = await pb.collections.create({
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
  const existingNames = new Set((collection.fields || []).map((field) => field.name));
  const missingFields = fields.filter((field) => !existingNames.has(field.name));
  if (missingFields.length) await pb.collections.update(collection.id, { fields: [...collection.fields, ...missingFields] });
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
    text('locationLabel', false, 160),
    bool('exactLocationPublic'), text('reviewStatus', true, 32), text('reviewNote', false, 1200),
    text('reporterId', false, 64), text('reporterName', false, 160),
    { name: 'photo', type: 'file', required: true, maxSelect: 1, maxSize: MAX_IMAGE_BYTES, mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] },
  ], ['CREATE INDEX idx_reports_status ON reports (reviewStatus)']);

  const reportsCollection = await pb.collections.getOne('reports');
  await ensureCollection('report_photos', [
    { name: 'report', type: 'relation', collectionId: reportsCollection.id, cascadeDelete: true, maxSelect: 1, required: true },
    number('position', true), bool('isPrimary'),
    { name: 'image', type: 'file', required: true, maxSelect: 1, maxSize: MAX_IMAGE_BYTES, mimeTypes: ['image/jpeg'] },
  ], ['CREATE INDEX idx_report_photos_report ON report_photos (report)']);
  await ensureCollection('report_activity', [
    { name: 'report', type: 'relation', collectionId: reportsCollection.id, cascadeDelete: true, maxSelect: 1, required: true },
    text('eventType', true, 40), text('actorRole', true, 40), text('publicReason', false, 500),
    text('fromStatus', false, 32), text('toStatus', false, 32), text('occurredAt', true, 40),
  ], ['CREATE INDEX idx_report_activity_report ON report_activity (report)']);
  await ensureCollection('impact_events', [
    { name: 'report', type: 'relation', collectionId: reportsCollection.id, cascadeDelete: true, maxSelect: 1, required: true },
    text('eventType', true, 40), text('eventDate', true, 40), text('note', true, 1200),
    { name: 'photos', type: 'file', required: false, maxSelect: 3, maxSize: MAX_IMAGE_BYTES, mimeTypes: ['image/jpeg'] },
    text('actorRole', true, 40),
  ], ['CREATE INDEX idx_impact_events_report ON impact_events (report)']);
  // `users` may be a PocketBase auth collection and requires PocketBase passwords.
  // App credentials are custom scrypt hashes, so keep them in a separate base collection.
  await ensureCollection('app_accounts', [
    text('email', true, 240), text('displayName', true, 120), text('passwordHash', true, 200), text('role', true, 32), bool('active'), bool('leaderboardVisible'),
  ], ['CREATE UNIQUE INDEX idx_app_accounts_email ON app_accounts (email)']);

  const email = (process.env.DEMO_MODERATOR_EMAIL || 'moderator@spot-the-spread.local').trim().toLowerCase();
  const password = process.env.DEMO_MODERATOR_PASSWORD;
  const existingEmails = new Set((await pb.collection('app_accounts').getFullList({ fields: 'email' })).map((item) => item.email));
  const legacyReviewers = await pb.collection('reviewers').getFullList().catch(() => []);
  for (const legacy of legacyReviewers) {
    const legacyEmail = String(legacy.email || '').trim().toLowerCase();
    if (!legacyEmail || existingEmails.has(legacyEmail)) continue;
    await pb.collection('app_accounts').create({
      email: legacyEmail,
      displayName: legacy.role === 'moderator' ? 'Community Moderator' : legacyEmail.split('@')[0],
      passwordHash: legacy.passwordHash,
      role: legacyEmail === email ? 'moderator' : 'user',
      active: Boolean(legacy.active),
      leaderboardVisible: false,
    });
    existingEmails.add(legacyEmail);
  }
  const existingUsers = await pb.collection('app_accounts').getFullList({ fields: 'id,email,role,displayName' });
  for (const user of existingUsers.filter((item) => item.role === 'moderator' && item.email !== email)) {
    await pb.collection('app_accounts').update(user.id, { role: 'user' });
  }
  const existingModerator = existingUsers.find((item) => item.email === email);
  if (existingModerator) {
    const changes = { role: 'moderator', active: true, displayName: existingModerator.displayName || 'Community Moderator' };
    if (password) changes.passwordHash = hashPassword(password);
    await pb.collection('app_accounts').update(existingModerator.id, changes);
  } else {
    const generatedPassword = password || randomBytes(9).toString('base64url');
    await pb.collection('app_accounts').create({ email, displayName: 'Community Moderator', role: 'moderator', passwordHash: hashPassword(generatedPassword), active: true, leaderboardVisible: false });
    if (!password) console.log(`Demo moderator login: ${email} / ${generatedPassword} (save this password; it is shown only at first setup)`);
  }

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
  const oldReports = await pb.collection('reports').getFullList({ fields: 'id,observedAt,reviewStatus' });
  for (const report of oldReports) {
    const hasActivity = await pb.collection('report_activity').getFirstListItem(`report = "${report.id}"`).then(() => true).catch(() => false);
    if (!hasActivity) await pb.collection('report_activity').create({
      report: report.id,
      eventType: 'history_started',
      actorRole: 'System',
      publicReason: 'Activity history enabled for this existing demo report.',
      toStatus: report.reviewStatus || 'unverified',
      occurredAt: report.observedAt || new Date().toISOString(),
    });
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
function contributorTitle(confirmedReports) {
  if (confirmedReports >= 20) return 'Charles Darwin';
  if (confirmedReports >= 10) return 'Tree Hugger';
  if (confirmedReports >= 5) return 'Plant Purveyor';
  if (confirmedReports >= 1) return 'Nature Novice';
  return 'Awaiting first confirmation';
}
const fileUrl = (record, filename, publicOrigin, route = 'api/files') => `${publicOrigin}/${route}/${record.id}/${encodeURIComponent(filename)}`;
async function projectReport(record, publicOrigin = `http://localhost:${PORT}`, { includePrivateLocation = false, includeReporter = false } = {}) {
  const linkedPhotos = await pb.collection('report_photos').getFullList({ filter: `report = "${record.id}"`, sort: 'position' }).catch(() => []);
  const activity = await pb.collection('report_activity').getFullList({ filter: `report = "${record.id}"`, sort: 'occurredAt' }).catch(() => []);
  const impactEvents = await pb.collection('impact_events').getFullList({ filter: `report = "${record.id}"`, sort: '-eventDate' }).catch(() => []);
  const primary = record.photo ? [{ id: `${record.id}-primary`, url: fileUrl(record, record.photo, publicOrigin), isPrimary: true, position: 0 }] : [];
  return {
  id: record.id,
  speciesName: record.speciesName,
  scientificName: record.scientificName,
  isFiscListed: record.isFiscListed,
  listedCategory: record.listedCategory,
  sourceUrl: findSpecies(record.speciesId)?.sourceUrl || null,
  geminiSuggestion: record.geminiSuggestion,
  observedAt: record.observedAt,
  locationLabel: record.locationLabel || 'Orange County, FL',
  note: record.note,
  latitude: includePrivateLocation ? record.latitude : record.publicLatitude,
  longitude: includePrivateLocation ? record.longitude : record.publicLongitude,
  exactLocationPublic: record.exactLocationPublic,
  reviewStatus: record.reviewStatus,
  photos: [...primary, ...linkedPhotos.map((photo) => ({ id: photo.id, url: fileUrl(photo, photo.image, publicOrigin, 'api/photo-files'), isPrimary: Boolean(photo.isPrimary), position: photo.position }))].sort((a, b) => a.position - b.position),
  photoUrl: record.photo ? fileUrl(record, record.photo, publicOrigin) : null,
  activity: activity.map((item) => ({ id: item.id, type: item.eventType, actorRole: item.actorRole, publicReason: item.publicReason, fromStatus: item.fromStatus, toStatus: item.toStatus, occurredAt: item.occurredAt })),
  impactEvents: impactEvents.map((item) => ({ id: item.id, type: item.eventType, date: item.eventDate, note: item.note, actorRole: item.actorRole, photos: (item.photos || []).map((filename) => fileUrl(item, filename, publicOrigin, 'api/impact-files')) })),
  created: record.created || record.observedAt,
  ...(includeReporter ? { reporter: { id: record.reporterId || null, displayName: record.reporterName || 'Community member' } } : {}),
  };
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function requireReviewer(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  const session = token && sessions.get(token);
  if (!session || !['moderator', 'reviewer'].includes(session.role)) return res.status(401).json({ error: 'Sign in with a moderator account to continue.' });
  req.reviewer = session;
  next();
}
function requireUser(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  const session = token && sessions.get(token);
  if (!session) return res.status(401).json({ error: 'Sign in to submit and track your sightings.' });
  req.user = session;
  next();
}
function requireModerator(req, res, next) {
  requireReviewer(req, res, (error) => {
    if (error) return next(error);
    if (req.reviewer.role !== 'moderator') return res.status(403).json({ error: 'Moderator access is required.' });
    next();
  });
}
async function normalizeImage(file) {
  if (!file) throw Object.assign(new Error('Choose an image first.'), { status: 400 });
  if (file.size > MAX_IMAGE_BYTES) throw Object.assign(new Error('Each photo must be 5 MB or smaller.'), { status: 413 });
  let buffer;
  try {
    buffer = await sharp(file.buffer, { failOn: 'error' }).rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  } catch {
    throw Object.assign(new Error('Could not process this image. Choose a JPEG, PNG, or supported phone photo.'), { status: 400 });
  }
  if (buffer.length > MAX_IMAGE_BYTES) throw Object.assign(new Error('This image is still larger than 5 MB after processing. Choose a smaller photo.'), { status: 413 });
  return buffer;
}

async function addActivity(reportId, event) {
  return pb.collection('report_activity').create({ report: reportId, occurredAt: new Date().toISOString(), ...event });
}

app.get('/api/health', (_req, res) => res.json({ ok: true, accountSystem: true, catalogCount: catalog.length, geminiEnabled: Boolean(process.env.GEMINI_API_KEY) }));
app.get('/api/metrics', async (_req, res, next) => {
  try {
    const [reports, accounts] = await Promise.all([
      pb.collection('reports').getFullList({ filter: 'reviewStatus != "rejected"', fields: 'speciesName,scientificName,listedCategory,reviewStatus,locationLabel,reporterId' }),
      pb.collection('app_accounts').getFullList({ fields: 'id,displayName,role,leaderboardVisible' }),
    ]);
    const confirmed = reports.filter((report) => report.reviewStatus === 'verified');
    const awaiting = reports.filter((report) => ['unverified', 'needs_review'].includes(report.reviewStatus));
    const speciesCounts = new Map();
    for (const report of confirmed) {
      const name = String(report.speciesName || 'Unidentified plant');
      const scientificName = String(report.scientificName || '');
      const key = `${scientificName.toLowerCase()}|${name.toLowerCase()}`;
      const item = speciesCounts.get(key) || { name, scientificName, category: report.listedCategory || null, count: 0 };
      item.count += 1;
      speciesCounts.set(key, item);
    }
    const locationCounts = new Map();
    for (const report of confirmed) {
      const label = String(report.locationLabel || 'Orange County, FL').trim().slice(0, 100) || 'Orange County, FL';
      locationCounts.set(label, (locationCounts.get(label) || 0) + 1);
    }
    const countsByUser = new Map();
    for (const report of reports) {
      if (!report.reporterId) continue;
      const item = countsByUser.get(report.reporterId) || { reportsSubmitted: 0, confirmedReports: 0 };
      item.reportsSubmitted += 1;
      if (report.reviewStatus === 'verified') item.confirmedReports += 1;
      countsByUser.set(report.reporterId, item);
    }
    const leaderboard = accounts.filter((account) => account.role === 'user').map((account) => {
      const contribution = countsByUser.get(account.id) || { reportsSubmitted: 0, confirmedReports: 0 };
      return { name: account.leaderboardVisible ? account.displayName : 'Anonymous contributor', reportsSubmitted: contribution.reportsSubmitted, confirmedReports: contribution.confirmedReports, title: contributorTitle(contribution.confirmedReports) };
    }).filter((item) => item.reportsSubmitted > 0).sort((a, b) => b.reportsSubmitted - a.reportsSubmitted || b.confirmedReports - a.confirmedReports).slice(0, 20).map((item, index) => ({ rank: index + 1, ...item }));
    res.json({
      summary: { reportsSubmitted: reports.length, confirmedReports: confirmed.length, awaitingReview: awaiting.length },
      topSpecies: [...speciesCounts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5),
      topLocations: [...locationCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5),
      leaderboard,
    });
  } catch (error) { next(error); }
});
app.post('/api/auth/signup', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const displayName = String(req.body?.displayName || '').trim().slice(0, 120);
    const password = String(req.body?.password || '');
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (displayName.length < 2) return res.status(400).json({ error: 'Enter a name with at least two characters.' });
    if (password.length < 8) return res.status(400).json({ error: 'Use a password with at least 8 characters.' });
    const duplicate = await pb.collection('app_accounts').getFirstListItem(`email = "${email.replaceAll('"', '')}"`).catch(() => null);
    if (duplicate) return res.status(409).json({ error: 'An account already exists for that email.' });
    const user = await pb.collection('app_accounts').create({ email, displayName, passwordHash: hashPassword(password), role: 'user', active: true, leaderboardVisible: false });
    const token = randomBytes(32).toString('base64url');
    sessions.set(token, { userId: user.id, email: user.email, displayName: user.displayName, role: user.role, leaderboardVisible: user.leaderboardVisible });
    res.status(201).json({ token, user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, leaderboardVisible: user.leaderboardVisible } });
  } catch (error) { next(error); }
});
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const user = await pb.collection('app_accounts').getFirstListItem(`email = "${email.replaceAll('"', '')}"`).catch(() => null);
    if (!user?.active || !verifyPassword(password, user.passwordHash)) return res.status(401).json({ error: 'Email or password is incorrect.' });
    const token = randomBytes(32).toString('base64url');
    sessions.set(token, { userId: user.id, email: user.email, displayName: user.displayName, role: user.role, leaderboardVisible: Boolean(user.leaderboardVisible) });
    res.json({ token, user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, leaderboardVisible: Boolean(user.leaderboardVisible) } });
  } catch (error) { next(error); }
});
app.get('/api/auth/me', requireUser, (req, res) => res.json({ user: { id: req.user.userId, email: req.user.email, displayName: req.user.displayName, role: req.user.role, leaderboardVisible: Boolean(req.user.leaderboardVisible) } }));
app.post('/api/auth/logout', requireUser, (req, res) => {
  sessions.delete(req.get('authorization')?.replace(/^Bearer\s+/i, ''));
  res.json({ ok: true });
});
app.get('/api/account/metrics', requireUser, async (req, res, next) => {
  try {
    const ownReports = await pb.collection('reports').getFullList({ filter: `reporterId = "${req.user.userId}"`, fields: 'id,reviewStatus' });
    const reportIds = ownReports.map((report) => report.id);
    const impactEvents = reportIds.length ? await pb.collection('impact_events').getFullList({ fields: 'id,report' }).catch(() => []) : [];
    const ownReportIds = new Set(reportIds);
    res.json({ metrics: { reportsSubmitted: ownReports.length, verifiedReports: ownReports.filter((report) => report.reviewStatus === 'verified').length, awaitingReview: ownReports.filter((report) => ['unverified', 'needs_review'].includes(report.reviewStatus)).length, impactEventsRecorded: impactEvents.filter((event) => ownReportIds.has(event.report)).length } });
  } catch (error) { next(error); }
});
app.post('/api/account/leaderboard-visibility', requireUser, async (req, res, next) => {
  try {
    const visible = req.body?.visible === true;
    await pb.collection('app_accounts').update(req.user.userId, { leaderboardVisible: visible });
    req.user.leaderboardVisible = visible;
    res.json({ leaderboardVisible: visible });
  } catch (error) { next(error); }
});
app.get('/api/account/reports', requireUser, async (req, res, next) => {
  try {
    const records = await pb.collection('reports').getFullList({ filter: `reporterId = "${req.user.userId}"`, sort: '-observedAt' });
    const publicOrigin = `http://${req.get('host')}`;
    res.json({ reports: await Promise.all(records.map((record) => projectReport(record, publicOrigin, { includePrivateLocation: true }))) });
  } catch (error) { next(error); }
});
app.get('/api/moderation/metrics', requireModerator, async (_req, res, next) => {
  try {
    const [users, reports] = await Promise.all([
      pb.collection('app_accounts').getFullList({ fields: 'id,email,displayName,role,created' }),
      pb.collection('reports').getFullList({ fields: 'id,reporterId,reporterName,reviewStatus,observedAt' }),
    ]);
    const byUser = new Map();
    for (const report of reports) {
      if (!report.reporterId) continue;
      const aggregate = byUser.get(report.reporterId) || { reportsSubmitted: 0, verifiedReports: 0, awaitingReview: 0 };
      aggregate.reportsSubmitted += 1;
      if (report.reviewStatus === 'verified') aggregate.verifiedReports += 1;
      if (['unverified', 'needs_review'].includes(report.reviewStatus)) aggregate.awaitingReview += 1;
      aggregate.lastReportAt = [aggregate.lastReportAt, report.observedAt].filter(Boolean).sort().at(-1);
      byUser.set(report.reporterId, aggregate);
    }
    const contributors = users.filter((user) => user.role === 'user').map((user) => ({ id: user.id, displayName: user.displayName, email: user.email, accountCreatedAt: user.created || null, ...(byUser.get(user.id) || { reportsSubmitted: 0, verifiedReports: 0, awaitingReview: 0 }) })).sort((a, b) => b.reportsSubmitted - a.reportsSubmitted || a.displayName.localeCompare(b.displayName));
    res.json({ metrics: { registeredUsers: contributors.length, reportsSubmitted: reports.length, verifiedReports: reports.filter((report) => report.reviewStatus === 'verified').length, awaitingReview: reports.filter((report) => ['unverified', 'needs_review'].includes(report.reviewStatus)).length }, contributors });
  } catch (error) { next(error); }
});
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
    const records = await pb.collection('reports').getFullList({ filter: 'reviewStatus != "rejected"', sort: '-observedAt' });
    const publicOrigin = `http://${_req.get('host')}`;
    res.json({ reports: await Promise.all(records.map((record) => projectReport(record, publicOrigin))) });
  } catch (error) { next(error); }
});
async function proxyFile(collection, id, filename, req, res) {
  try {
    let reportId = id;
    if (collection === 'report_photos' || collection === 'impact_events') {
      const related = await pb.collection(collection).getOne(id);
      reportId = related.report;
    }
    const parentReport = await pb.collection('reports').getOne(reportId);
    if (parentReport.reviewStatus === 'rejected') {
      const accessToken = req.get('authorization')?.replace(/^Bearer\s+/i, '');
      const session = accessToken && sessions.get(accessToken);
      if (!session || (session.role !== 'moderator' && session.userId !== parentReport.reporterId)) return res.status(404).end();
    }
    const token = await pb.files.getToken();
    const url = `${PB_URL}/api/files/${collection}/${encodeURIComponent(id)}/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}`;
    const response = await fetch(url);
    if (!response.ok) return res.status(response.status).end();
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch { res.status(502).end(); }
}
app.get('/api/files/:id/:filename', (req, res) => proxyFile('reports', req.params.id, req.params.filename, req, res));
app.get('/api/photo-files/:id/:filename', (req, res) => proxyFile('report_photos', req.params.id, req.params.filename, req, res));
app.get('/api/impact-files/:id/:filename', (req, res) => proxyFile('impact_events', req.params.id, req.params.filename, req, res));

app.post('/api/moderation/logout', requireReviewer, (req, res) => {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  sessions.delete(token);
  res.json({ ok: true });
});

app.get('/api/moderation/reports', requireReviewer, async (_req, res, next) => {
  try {
    const records = await pb.collection('reports').getFullList({ sort: '-observedAt' });
    const publicOrigin = `http://${_req.get('host')}`;
    res.json({ reports: await Promise.all(records.map((record) => projectReport(record, publicOrigin, { includePrivateLocation: true, includeReporter: true }))) });
  } catch (error) { next(error); }
});

app.post('/api/identify', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a plant photo first.' });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'Gemini is not configured. Search the FISC list or enter a plant name manually.' });
  try {
    const image = await normalizeImage(req.file);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { text: 'Identify the visible plant from this image. Do not infer invasive status. Return a tentative best common name, scientific name if reasonably known, up to 3 plausible alternative names, confidence as low/medium/high, and a short visual rationale. If the image is not a plant or identification is uncertain, say so. Respond only as JSON with keys isPlant (boolean), commonName (string), scientificName (string), alternatives (array of strings), confidence (string), rationale (string).' },
          { inline_data: { mime_type: 'image/jpeg', data: image.toString('base64') } },
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

app.post('/api/reports', upload.single('photo'), requireUser, async (req, res, next) => {
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
    const image = await normalizeImage(req.file);
    const report = new FormData();
    const fields = {
      speciesName,
      scientificName: String(body.scientificName || match?.scientificName || ''),
      speciesId: match?.id || '',
      listedCategory: match?.category || '',
      isFiscListed: Boolean(match),
      geminiSuggestion: String(body.geminiSuggestion || '').slice(0, 500),
      observedAt: String(body.observedAt || new Date().toISOString()),
      locationLabel: String(body.locationLabel || 'Orange County, FL').trim().slice(0, 160),
      note: String(body.note || '').slice(0, 1200),
      latitude,
      longitude,
      publicLatitude: exactLocationPublic ? latitude : roundCoordinate(latitude),
      publicLongitude: exactLocationPublic ? longitude : roundCoordinate(longitude),
      exactLocationPublic,
      reviewStatus: 'unverified',
      reviewNote: '',
      reporterId: req.user.userId,
      reporterName: req.user.displayName,
    };
    for (const [key, value] of Object.entries(fields)) report.append(key, String(value));
    report.append('photo', new Blob([image], { type: 'image/jpeg' }), 'plant.jpg');
    const created = await pb.collection('reports').create(report);
    await addActivity(created.id, { eventType: 'submitted', actorRole: 'Reporter', publicReason: 'Community report submitted.', toStatus: 'unverified' });
    res.status(201).json({ report: await projectReport(created, `http://${req.get('host')}`) });
  } catch (error) { next(error); }
});

app.post('/api/reports/:id/photos', upload.single('photo'), requireUser, async (req, res, next) => {
  try {
    const report = await pb.collection('reports').getOne(req.params.id);
    if (report.reviewStatus === 'rejected') return res.status(404).json({ error: 'This report is not available.' });
    if (report.reporterId !== req.user.userId && req.user.role !== 'moderator') return res.status(403).json({ error: 'You can only add photos to your own reports.' });
    const existing = await pb.collection('report_photos').getFullList({ filter: `report = "${report.id}"` });
    const count = (report.photo ? 1 : 0) + existing.length;
    if (count >= MAX_REPORT_PHOTOS) return res.status(400).json({ error: `A report can include up to ${MAX_REPORT_PHOTOS} photos.` });
    const image = await normalizeImage(req.file);
    const saved = await pb.collection('report_photos').create({
      report: report.id,
      position: count,
      isPrimary: false,
      image: new File([image], 'supporting-photo.jpg', { type: 'image/jpeg' }),
    });
    res.status(201).json({ photo: { id: saved.id, url: fileUrl(saved, saved.image, `http://${req.get('host')}`, 'api/photo-files'), isPrimary: false, position: saved.position } });
  } catch (error) { next(error); }
});

const allowedStatuses = new Set(['unverified', 'needs_review', 'verified', 'rejected']);
const allowedTransitions = {
  unverified: new Set(['needs_review', 'verified', 'rejected']),
  needs_review: new Set(['verified', 'rejected', 'unverified']),
  verified: new Set(['needs_review', 'rejected']),
  rejected: new Set(['needs_review']),
};
app.post('/api/reports/:id/review', requireReviewer, async (req, res, next) => {
  try {
    const report = await pb.collection('reports').getOne(req.params.id);
    const status = String(req.body?.status || '');
    const reason = String(req.body?.reason || '').trim().slice(0, 500);
    if (!allowedStatuses.has(status)) return res.status(400).json({ error: 'Choose a supported review status.' });
    const speciesName = String(req.body?.speciesName || '').trim();
    if (status === report.reviewStatus && !speciesName) return res.status(400).json({ error: 'Choose a status change or provide a corrected identification.' });
    if (status !== report.reviewStatus && !allowedTransitions[report.reviewStatus]?.has(status)) return res.status(409).json({ error: `Cannot move a ${report.reviewStatus} report to ${status}.` });
    if (!reason) return res.status(400).json({ error: 'Add a public reason for this review action.' });
    const fields = { reviewStatus: status };
    const scientificName = String(req.body?.scientificName || '').trim();
    if (speciesName) {
      const match = findSpecies(speciesName) || findSpecies(scientificName);
      fields.speciesName = speciesName.slice(0, 240);
      fields.scientificName = (scientificName || match?.scientificName || '').slice(0, 240);
      fields.speciesId = match?.id || '';
      fields.listedCategory = match?.category || '';
      fields.isFiscListed = Boolean(match);
    }
    const updated = await pb.collection('reports').update(report.id, fields);
    await addActivity(report.id, { eventType: 'review_status_changed', actorRole: req.reviewer.role, publicReason: reason, fromStatus: report.reviewStatus, toStatus: status });
    if (speciesName && speciesName !== report.speciesName) await addActivity(report.id, { eventType: 'identification_corrected', actorRole: req.reviewer.role, publicReason: `Identification updated to ${speciesName}.`, fromStatus: status, toStatus: status });
    const projected = await projectReport(updated, `http://${req.get('host')}`);
    res.json({ report: projected });
  } catch (error) { next(error); }
});

app.post('/api/reports/:id/impact-events', upload.single('photo'), requireReviewer, async (req, res, next) => {
  try {
    const report = await pb.collection('reports').getOne(req.params.id);
    if (report.reviewStatus === 'rejected') return res.status(409).json({ error: 'Impact events cannot be added to a rejected report.' });
    const eventType = String(req.body?.type || '');
    const eventDate = String(req.body?.date || '').trim();
    const note = String(req.body?.note || '').trim();
    if (!['inspection', 'treatment', 'follow-up'].includes(eventType)) return res.status(400).json({ error: 'Choose inspection, treatment, or follow-up.' });
    if (!eventDate || Number.isNaN(Date.parse(eventDate))) return res.status(400).json({ error: 'Enter a valid event date.' });
    if (!note) return res.status(400).json({ error: 'Add a note describing the recorded event.' });
    const fields = { report: report.id, eventType, eventDate, note: note.slice(0, 1200), actorRole: req.reviewer.role };
    if (req.file) fields.photos = new File([await normalizeImage(req.file)], 'event-photo.jpg', { type: 'image/jpeg' });
    const event = await pb.collection('impact_events').create(fields);
    await addActivity(report.id, { eventType: 'impact_event_added', actorRole: req.reviewer.role, publicReason: `${eventType} recorded for ${eventDate}.` });
    res.status(201).json({ event: { id: event.id, type: event.eventType, date: event.eventDate, note: event.note, actorRole: event.actorRole, photos: (event.photos || []).map((filename) => fileUrl(event, filename, `http://${req.get('host')}`, 'api/impact-files')) } });
  } catch (error) { next(error); }
});

app.delete('/api/reports/:id', requireModerator, async (req, res, next) => {
  try {
    await pb.collection('reports').delete(req.params.id);
    res.status(204).end();
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.message || 'The local report service encountered an error.' });
});

await setupDatabase();
app.listen(PORT, '0.0.0.0', () => console.log(`Spot the Spread API listening on http://0.0.0.0:${PORT}`));
