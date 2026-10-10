import React, { useMemo } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Linking, Image, Platform, Pressable, SafeAreaView, ScrollView, StatusBar as NativeStatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import catalogJson from '../../data/fisc-species.json';
export type Species = (typeof catalogJson)[number];

export type ReportPhoto = { id: string; url: string; isPrimary: boolean; position: number };
export type ReportActivity = { id: string; type: string; actorRole: string; publicReason?: string; fromStatus?: string; toStatus?: string; occurredAt: string };
export type ImpactEvent = { id: string; type: 'inspection' | 'treatment' | 'follow-up'; date: string; note: string; actorRole: string; photos: string[] };
export type Report = {
  id: string; speciesName: string; scientificName?: string; isFiscListed: boolean;
  listedCategory?: string; sourceUrl?: string | null; geminiSuggestion?: string;
  observedAt: string; created?: string; note?: string; latitude: number; longitude: number;
  exactLocationPublic: boolean; reviewStatus: string; photoUrl?: string | null;
  photos?: ReportPhoto[]; activity?: ReportActivity[]; impactEvents?: ImpactEvent[];
  reporter?: { id: string | null; displayName: string };
  locationLabel?: string;
};
export function summarizeImpact(reports: Report[]) {
  const events = reports.flatMap((report) => report.impactEvents || []);
  return {
    verified: reports.filter((report) => report.reviewStatus === 'verified').length,
    inspections: events.filter((event) => event.type === 'inspection').length,
    treatments: events.filter((event) => event.type === 'treatment').length,
    followUps: events.filter((event) => event.type === 'follow-up').length,
  };
}

export type PlantGuess = { isPlant?: boolean; commonName?: string; scientificName?: string; alternatives?: string[]; confidence?: string; rationale?: string; fiscMatch?: { id: string; category: string } | null };

export type Coordinate = { latitude: number; longitude: number };



export const catalog = catalogJson as Species[];

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

export const ORLANDO: Coordinate = { latitude: 28.5383, longitude: -81.3792 };

export const colors = { ink: '#17372A', muted: '#728075', green: '#244B36', pale: '#E5EDE3', lime: '#DDE6D2', paper: '#FAF9F5', white: '#FFFFFF', border: '#E5E8DF', amber: '#8B5A12', amberPale: '#FFF4DB', red: '#9B443C' };

export function contributorTitle(confirmedReports: number) {
  if (confirmedReports >= 20) return { name: 'Charles Darwin', next: null as null | { name: string; count: number } };
  if (confirmedReports >= 10) return { name: 'Tree Hugger', next: { name: 'Charles Darwin', count: 20 } };
  if (confirmedReports >= 5) return { name: 'Plant Purveyor', next: { name: 'Tree Hugger', count: 10 } };
  if (confirmedReports >= 1) return { name: 'Nature Novice', next: { name: 'Plant Purveyor', count: 5 } };
  return { name: 'First confirmation awaits', next: { name: 'Nature Novice', count: 1 } };
}



export async function uploadPhoto<T>(path: string, photo: ImagePicker.ImagePickerAsset, parameters: Record<string, string> = {}, token?: string): Promise<T> {

const response = await FileSystem.uploadAsync(`${API_URL}${path}`, photo.uri, {

    httpMethod: 'POST',

    uploadType: FileSystem.FileSystemUploadType.MULTIPART,

    fieldName: 'photo',

    mimeType: photo.mimeType || 'image/jpeg',

    parameters,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,

  });

let payload: any;

  try { payload = JSON.parse(response.body); }

  catch { throw new Error(`The server returned an unreadable response (${response.status}).`); }

  if (response.status < 200 || response.status >= 300) {

    throw new Error(payload?.error || `Upload failed (${response.status}).`);

  }

  return payload as T;

}



function createMapHtml(center: Coordinate, reports: Report[], selectable: boolean) {

const data = JSON.stringify(reports.map((report) => ({

    id: report.id, name: report.speciesName, category: report.listedCategory || 'Possible unlisted invasive',

    status: report.reviewStatus, lat: report.latitude, lng: report.longitude,

  }))).replace(/</g, '\\u003c');

const title = selectable ? 'Tap the map to place the sighting pin' : 'Community reports';

const markerCode = selectable
    ? `let pin=L.marker([${center.latitude},${center.longitude}],{draggable:true}).addTo(map); pin.on('dragend',()=>send(pin.getLatLng())); map.on('click',e=>{pin.setLatLng(e.latlng);send(e.latlng)}); function send(p){window.ReactNativeWebView?.postMessage(JSON.stringify({type:'pin',latitude:p.lat,longitude:p.lng}))}`
    : `const reports=${data}; for (const r of reports){const marker=L.circleMarker([r.lat,r.lng],{radius:9,color:r.status==='verified'?'#244B36':'#bb7917',weight:2,fillColor:r.status==='verified'?'#4c9169':'#edc56c',fillOpacity:.9}).addTo(map); marker.bindPopup('<b>'+escapeText(r.name)+'</b><br>'+escapeText(r.category)+'<br>Status: '+escapeText(r.status.replace('_',' ')))} function escapeText(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}`;

  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0;background:#eef3eb;font-family:-apple-system,BlinkMacSystemFont,sans-serif}.hint{position:absolute;z-index:500;top:10px;left:50%;transform:translateX(-50%);padding:7px 11px;border-radius:20px;background:#fff;color:#18352b;font-size:12px;box-shadow:0 2px 10px #19352b30;white-space:nowrap}</style></head><body><div id="map"></div><div class="hint">${title}</div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const map=L.map('map',{zoomControl:true}).setView([${center.latitude},${center.longitude}],${selectable ? 15 : 11});L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);${markerCode}</script></body></html>`;

}



export function MapPanel({ center, reports, selectable = false, onPin, height = 330 }: { center: Coordinate; reports: Report[]; selectable?: boolean; onPin?: (point: Coordinate) => void; height?: number }) {

const html = useMemo(() => createMapHtml(center, reports, selectable), [center.latitude, center.longitude, reports, selectable]);

const handleMessage = (event: WebViewMessageEvent) => {

    try {

const message = JSON.parse(event.nativeEvent.data);

      if (message.type === 'pin' && Number.isFinite(message.latitude) && Number.isFinite(message.longitude)) onPin?.({ latitude: message.latitude, longitude: message.longitude });

    } catch { /* Ignore non-map messages. */ }

  };

  return <View style={[styles.mapFrame, { height }]}><WebView source={{ html }} originWhitelist={['*']} onMessage={handleMessage} javaScriptEnabled domStorageEnabled /></View>;

}



export function ActionButton({ title, onPress, secondary = false, disabled = false, small = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; small?: boolean }) {

  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, small && styles.buttonSmall, disabled && styles.buttonDisabled, pressed && !disabled && { opacity: .82 }]}><Text style={[styles.buttonText, secondary && styles.buttonTextSecondary, small && styles.buttonTextSmall]}>{title}</Text></Pressable>;

}




export function findInCatalog(name?: string) {

const normalize = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const query = normalize(name || '');

  if (!query) return null;

  return catalog.find((species) => [species.scientificName, ...species.scientificSynonyms, ...species.commonNames].some((candidate) => normalize(candidate) === query)) || null;

}



export const styles = StyleSheet.create({

  safe: { flex: 1, backgroundColor: colors.paper, paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight : 0 },

  topBar: { minHeight: 68, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.paper },

  brandIcon: { height: 38, width: 38, borderRadius: 14, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }, brandIconText: { color: colors.white, fontSize: 22, fontWeight: '700' }, brand: { fontSize: 13, fontWeight: '900', letterSpacing: 1.25, color: colors.ink }, brandSub: { fontSize: 11, color: colors.muted, marginTop: 2 }, connectionDot: { width: 9, height: 9, borderRadius: 5 }, connected: { backgroundColor: '#48A66A' }, disconnected: { backgroundColor: '#D39437' },

  offlineBanner: { paddingVertical: 7, paddingHorizontal: 16, backgroundColor: colors.amberPale }, offlineText: { textAlign: 'center', color: colors.amber, fontSize: 11, fontWeight: '600' },

  nav: { flexDirection: 'row', marginHorizontal: 18, backgroundColor: '#F0F0E8', borderRadius: 18, padding: 5, marginTop: 10, marginBottom: 7 }, navItem: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' }, navActive: { backgroundColor: colors.green, shadowColor: '#142A1D', shadowOpacity: .15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, navText: { fontSize: 13, color: colors.muted, fontWeight: '600' }, navTextActive: { color: colors.white, fontWeight: '800' },

  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 42 }, heroRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, eyebrow: { color: colors.green, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 }, heading: { color: colors.ink, fontSize: 30, lineHeight: 34, fontWeight: '800', letterSpacing: -.5 }, headingSmall: { color: colors.ink, fontSize: 29, fontWeight: '700', letterSpacing: -.6, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, countCard: { minWidth: 68, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 16, backgroundColor: colors.pale, alignItems: 'center', marginBottom: 3 }, countNumber: { fontSize: 24, color: colors.green, fontWeight: '900' }, countLabel: { fontSize: 9, lineHeight: 12, color: colors.green, textAlign: 'center', fontWeight: '700' }, bodyCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 14 }, mapWrap: { overflow: 'hidden', borderRadius: 22, borderWidth: 1, borderColor: colors.border }, mapFrame: { overflow: 'hidden', borderRadius: 18, backgroundColor: '#E6EEE4' }, mapLegend: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingTop: 10, paddingBottom: 22 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, legendDot: { width: 9, height: 9, borderRadius: 5 }, legendText: { fontSize: 11, color: colors.muted, fontWeight: '600' }, attribution: { marginLeft: 'auto', fontSize: 10, color: colors.muted }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, sectionTitle: { fontSize: 20, color: colors.ink, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, sectionMeta: { color: colors.muted, fontSize: 12 },

  emptyCard: { backgroundColor: colors.white, padding: 18, borderRadius: 18, borderWidth: 1, borderColor: colors.border }, emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, emptyText: { color: colors.muted, lineHeight: 18, fontSize: 13, marginTop: 6, marginBottom: 14 }, reportCard: { backgroundColor: colors.white, borderRadius: 19, borderWidth: 1, borderColor: colors.border, padding: 11, flexDirection: 'row', gap: 12, marginBottom: 10 }, reportPhoto: { width: 76, height: 76, borderRadius: 13, backgroundColor: '#E4EEE1' }, photoPlaceholder: { alignItems: 'center', justifyContent: 'center' }, reportInfo: { flex: 1, justifyContent: 'center' }, reportTopLine: { flexDirection: 'row', alignItems: 'center', gap: 6 }, reportName: { color: colors.ink, fontSize: 14, fontWeight: '800', flex: 1 }, statusPill: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 }, statusVerified: { backgroundColor: colors.pale }, statusUnverified: { backgroundColor: colors.amberPale }, statusText: { color: colors.amber, fontWeight: '800', fontSize: 9, textTransform: 'capitalize' }, reportDetail: { color: colors.green, fontSize: 11, fontWeight: '700', marginTop: 5 }, reportNote: { color: colors.muted, fontSize: 11, marginTop: 4 }, reportLocation: { color: colors.muted, fontSize: 10, marginTop: 5 }, disclaimer: { backgroundColor: '#EAF1E9', borderRadius: 15, padding: 14, marginTop: 13 }, disclaimerTitle: { color: colors.ink, fontWeight: '800', fontSize: 12 }, disclaimerText: { color: colors.muted, lineHeight: 16, fontSize: 11, marginTop: 5 },

  photoPlaceholderLarge: { height: 195, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: '#C5D1C0', backgroundColor: '#F0F3EB', alignItems: 'center', justifyContent: 'center', marginTop: 5 }, photoEmoji: { fontSize: 37 }, photoHint: { color: colors.muted, fontSize: 12, marginTop: 8 }, photoPreviewWrap: { position: 'relative', marginTop: 4 }, photoPreview: { width: '100%', height: 270, borderRadius: 20, resizeMode: 'cover', backgroundColor: '#EAF1E9' }, removePhoto: { position: 'absolute', top: 10, right: 10, height: 32, width: 32, borderRadius: 16, backgroundColor: '#11251DCC', alignItems: 'center', justifyContent: 'center' }, removePhotoText: { fontSize: 24, lineHeight: 26, color: colors.white }, buttonRow: { flexDirection: 'row', gap: 10, marginTop: 12 }, button: { minHeight: 50, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.green }, buttonSecondary: { backgroundColor: '#EEF0E5', borderColor: '#E4E7DD', borderWidth: 1 }, buttonSmall: { minHeight: 38, alignSelf: 'flex-start', paddingVertical: 9, borderRadius: 11 }, buttonDisabled: { opacity: .45 }, buttonText: { color: colors.white, fontSize: 13, fontWeight: '700' }, buttonTextSecondary: { color: colors.ink }, buttonTextSmall: { fontSize: 12 }, identifyBlock: { marginTop: 10 }, helperText: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 8 }, successHelper: { color: colors.green }, guessCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 17, marginTop: 13 }, guessBadge: { alignSelf: 'flex-start', backgroundColor: colors.amberPale, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 }, guessBadgeText: { color: colors.amber, fontSize: 9, fontWeight: '900', letterSpacing: .6 }, guessName: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 9 }, scientific: { color: colors.muted, fontSize: 12, fontStyle: 'italic', marginTop: 3 }, guessRationale: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 7 },

  stepLabel: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 24, marginBottom: 11 }, stepCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' }, stepCircleText: { color: colors.green, fontSize: 12, fontWeight: '900' }, stepTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, modeToggle: { flexDirection: 'row', borderRadius: 12, backgroundColor: '#E8EEE6', padding: 4, marginBottom: 10 }, modeButton: { flex: 1, borderRadius: 9, alignItems: 'center', paddingVertical: 9 }, modeButtonActive: { backgroundColor: colors.white }, modeText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, modeTextActive: { color: colors.ink, fontWeight: '800' }, searchInput: { minHeight: 46, borderRadius: 12, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, color: colors.ink, fontSize: 13 }, speciesList: { marginTop: 7, backgroundColor: colors.white, borderRadius: 13, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, speciesChoice: { minHeight: 55, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }, speciesChoiceActive: { backgroundColor: colors.pale }, speciesCommon: { color: colors.ink, fontSize: 13, fontWeight: '700' }, speciesScientific: { color: colors.muted, fontSize: 10, marginTop: 3, fontStyle: 'italic' }, categoryPill: { color: colors.green, backgroundColor: colors.pale, fontSize: 9, fontWeight: '900', overflow: 'hidden', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 5 }, listMatchCard: { marginTop: 9, backgroundColor: colors.pale, borderRadius: 12, padding: 12 }, listMatchHeading: { color: colors.green, fontSize: 12, fontWeight: '800' }, sourceText: { color: colors.ink, fontSize: 11, lineHeight: 16, marginTop: 5 }, linkText: { color: colors.green, textDecorationLine: 'underline', fontWeight: '800' }, unlistedCallout: { backgroundColor: colors.amberPale, borderRadius: 12, padding: 12, marginTop: 8 }, unlistedTitle: { color: colors.amber, fontWeight: '800', fontSize: 12 }, unlistedText: { color: '#745B30', fontSize: 11, lineHeight: 16, marginTop: 4 }, coordinateText: { fontSize: 10, color: colors.green, marginTop: 6, fontWeight: '700' }, consentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 12, backgroundColor: colors.white, borderRadius: 13, borderWidth: 1, borderColor: colors.border, padding: 12 }, checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#A7B7A9', alignItems: 'center', justifyContent: 'center' }, checkboxChecked: { backgroundColor: colors.green, borderColor: colors.green }, checkmark: { color: colors.white, fontSize: 14, lineHeight: 17, fontWeight: '900' }, consentTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' }, consentSub: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 }, noteInput: { minHeight: 80, paddingTop: 12 }, submitNotice: { padding: 11, marginTop: 11, marginBottom: 11, backgroundColor: colors.pale, borderRadius: 10 }, submitNoticeText: { color: colors.ink, fontSize: 11, lineHeight: 16 }, errorHelper: { color: colors.red, fontSize: 11, marginTop: 8, textAlign: 'center' },

  heroBanner: { height: 235, overflow: 'hidden', backgroundColor: '#244B36', position: 'relative' },
  heroPhoto: { width: '100%', height: '100%', position: 'absolute' },
  heroShade: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(11,36,24,0.45)' },
  heroBrand: { position: 'absolute', left: 25, top: 19 },
  heroBrandName: { color: '#FFFFFF', fontSize: 38, lineHeight: 38, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  heroBrandSub: { color: '#FFFFFF', fontSize: 10, letterSpacing: 1.3, lineHeight: 15, marginTop: 10, fontWeight: '700' },
  heroCaption: { color: '#FFFFFF', fontSize: 20, lineHeight: 25, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', position: 'absolute', left: 25, bottom: 17 },
  heroConnection: { position: 'absolute', right: 23, top: 24, borderColor: '#FFFFFF', borderWidth: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  progressActive: { backgroundColor: colors.green, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  progressActiveText: { color: '#FFFFFF', fontWeight: '700' },
  progressStep: { backgroundColor: '#E8EDE4', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  progressText: { color: colors.ink },
  progressLine: { width: 65, height: 2, backgroundColor: '#DDE3D9' },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 7, marginBottom: 26 },
  progressLabel: { color: colors.muted, fontSize: 11 },
  photoTips: { padding: 16, marginTop: 13, backgroundColor: '#F0F3EB', borderRadius: 16 },
  photoTipsTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 7 },
  photoTipsText: { color: colors.muted, fontSize: 12, lineHeight: 22 },

});
