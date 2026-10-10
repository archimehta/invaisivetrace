import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Platform, Pressable, SafeAreaView, ScrollView, StatusBar as NativeStatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import catalogJson from './data/fisc-species.json';

type Species = (typeof catalogJson)[number];
type Report = {
  id: string; speciesName: string; scientificName?: string; isFiscListed: boolean;
  listedCategory?: string; sourceUrl?: string | null; geminiSuggestion?: string; observedAt: string; note?: string; latitude: number; longitude: number;
  exactLocationPublic: boolean; reviewStatus: string; photoUrl?: string | null;
  photos?: { id: string; url: string; isPrimary: boolean; position: number }[];
  activity?: { id: string; type: string; actorRole: string; publicReason?: string; fromStatus?: string; toStatus?: string; occurredAt: string }[];
  impactEvents?: { id: string; type: string; date: string; note: string; actorRole: string; photos: string[] }[];
};
type PlantGuess = { isPlant?: boolean; commonName?: string; scientificName?: string; alternatives?: string[]; confidence?: string; rationale?: string; fiscMatch?: { id: string; category: string } | null };
type Coordinate = { latitude: number; longitude: number };

const catalog = catalogJson as Species[];
const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const ORLANDO: Coordinate = { latitude: 28.5383, longitude: -81.3792 };
const colors = { ink: '#18352B', muted: '#6A7B72', green: '#28734D', pale: '#EAF4E9', lime: '#C9E9A9', paper: '#F6F8F3', white: '#FFFFFF', border: '#DFE8DE', amber: '#8B5A12', amberPale: '#FFF4DB', red: '#9B443C' };

async function uploadPhoto<T>(path: string, photo: ImagePicker.ImagePickerAsset, parameters: Record<string, string> = {}): Promise<T> {
  const response = await FileSystem.uploadAsync(`${API_URL}${path}`, photo.uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'photo',
    mimeType: photo.mimeType || 'image/jpeg',
    parameters,
  });
  let payload: any;
  try { payload = JSON.parse(response.body); }
  catch { throw new Error(`The server returned an unreadable response (${response.status}).`); }
  if (response.status < 200 || response.status >= 300) {
    throw new Error(payload?.error || `Upload failed (${response.status}).`);
  }
  return payload as T;
}

function htmlSafe(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

function createMapHtml(center: Coordinate, reports: Report[], selectable: boolean) {
  const data = JSON.stringify(reports.map((report) => ({
    id: report.id, name: report.speciesName, category: report.listedCategory || 'Possible unlisted invasive',
    status: report.reviewStatus, lat: report.latitude, lng: report.longitude,
  }))).replace(/</g, '\\u003c');
  const title = selectable ? 'Tap the map to place the sighting pin' : 'Community reports';
  const markerCode = selectable
    ? `let pin=L.marker([${center.latitude},${center.longitude}],{draggable:true}).addTo(map); pin.on('dragend',()=>send(pin.getLatLng())); map.on('click',e=>{pin.setLatLng(e.latlng);send(e.latlng)}); function send(p){window.ReactNativeWebView?.postMessage(JSON.stringify({type:'pin',latitude:p.lat,longitude:p.lng}))}`
    : `const reports=${data}; for (const r of reports){const marker=L.circleMarker([r.lat,r.lng],{radius:9,color:r.status==='verified'?'#28734d':'#bb7917',weight:2,fillColor:r.status==='verified'?'#5eae7e':'#edc56c',fillOpacity:.9}).addTo(map); marker.bindPopup('<b>'+escapeText(r.name)+'</b><br>'+escapeText(r.category)+'<br>Status: '+escapeText(r.status.replace('_',' ')))} function escapeText(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}`;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0;background:#eef3eb;font-family:-apple-system,BlinkMacSystemFont,sans-serif}.hint{position:absolute;z-index:500;top:10px;left:50%;transform:translateX(-50%);padding:7px 11px;border-radius:20px;background:#fff;color:#18352b;font-size:12px;box-shadow:0 2px 10px #19352b30;white-space:nowrap}</style></head><body><div id="map"></div><div class="hint">${title}</div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const map=L.map('map',{zoomControl:true}).setView([${center.latitude},${center.longitude}],${selectable ? 15 : 11});L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);${markerCode}</script></body></html>`;
}

function MapPanel({ center, reports, selectable = false, onPin, height = 330 }: { center: Coordinate; reports: Report[]; selectable?: boolean; onPin?: (point: Coordinate) => void; height?: number }) {
  const html = useMemo(() => createMapHtml(center, reports, selectable), [center.latitude, center.longitude, reports, selectable]);
  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'pin' && Number.isFinite(message.latitude) && Number.isFinite(message.longitude)) onPin?.({ latitude: message.latitude, longitude: message.longitude });
    } catch { /* Ignore non-map messages. */ }
  };
  return <View style={[styles.mapFrame, { height }]}><WebView source={{ html }} originWhitelist={['*']} onMessage={handleMessage} javaScriptEnabled domStorageEnabled /></View>;
}

function ActionButton({ title, onPress, secondary = false, disabled = false, small = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; small?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, small && styles.buttonSmall, disabled && styles.buttonDisabled, pressed && !disabled && { opacity: .82 }]}><Text style={[styles.buttonText, secondary && styles.buttonTextSecondary, small && styles.buttonTextSmall]}>{title}</Text></Pressable>;
}

export default function App() {
  const [tab, setTab] = useState<'map' | 'report' | 'review'>('map');
  const [reports, setReports] = useState<Report[]>([]);
  const [moderationReports, setModerationReports] = useState<Report[]>([]);
  const [apiOnline, setApiOnline] = useState(false);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [supportingPhotos, setSupportingPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [guess, setGuess] = useState<PlantGuess | null>(null);
  const [guessMessage, setGuessMessage] = useState('');
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [exactLocationPublic, setExactLocationPublic] = useState(false);
  const [location, setLocation] = useState<Coordinate | null>(null);
  const [locationMessage, setLocationMessage] = useState('Use your location or tap the map to position the sighting pin.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [reviewerPassword, setReviewerPassword] = useState('');
  const [reviewerToken, setReviewerToken] = useState('');
  const [reviewerRole, setReviewerRole] = useState('');
  const [reviewReason, setReviewReason] = useState('Reviewed for the demo.');
  const [inviteEmail, setInviteEmail] = useState('');
  const [impactType, setImpactType] = useState<'inspection' | 'treatment' | 'follow-up'>('inspection');
  const [impactNote, setImpactNote] = useState('');
  const [impactDate, setImpactDate] = useState(new Date().toISOString().slice(0, 10));
  const [impactPhoto, setImpactPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [correctionName, setCorrectionName] = useState('');
  const [inviteResult, setInviteResult] = useState('');

  const refreshReports = async () => {
    try {
      const response = await fetch(`${API_URL}/api/reports`);
      if (!response.ok) throw new Error('Report service unavailable');
      const payload = await response.json();
      setReports(payload.reports || []);
      setApiOnline(true);
    } catch { setApiOnline(false); }
  };

  useEffect(() => { void refreshReports(); }, []);

  const refreshModerationReports = async () => {
    if (!reviewerToken) return;
    const response = await fetch(`${API_URL}/api/moderation/reports`, { headers: { Authorization: `Bearer ${reviewerToken}` } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Could not load reviewer queue.');
    setModerationReports(payload.reports || []);
  };

  const reviewerRequest = async (path: string, method: string, body: Record<string, string>) => {
    const response = await fetch(`${API_URL}${path}`, { method, headers: { Authorization: `Bearer ${reviewerToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const payload = response.status === 204 ? {} : await response.json();
    if (!response.ok) throw new Error(payload.error || 'Reviewer action failed.');
    return payload;
  };

  const changeReview = async (report: Report, status: string) => {
    try {
      await reviewerRequest(`/api/reports/${report.id}/review`, 'POST', { status, reason: reviewReason, speciesName: correctionName.trim() });
      setCorrectionName('');
      await Promise.all([refreshReports(), refreshModerationReports()]);
    } catch (error) { Alert.alert('Review update failed', error instanceof Error ? error.message : 'Try again.'); }
  };

  const addImpactEvent = async (report: Report) => {
    if (!impactNote.trim()) return Alert.alert('Add an event note', 'Describe the inspection, treatment, or follow-up outcome.');
    try {
      const parameters = { type: impactType, date: impactDate, note: impactNote.trim() };
      if (impactPhoto) await uploadPhoto(`/api/reports/${report.id}/impact-events`, impactPhoto, parameters);
      else await reviewerRequest(`/api/reports/${report.id}/impact-events`, 'POST', parameters);
      setImpactNote(''); setImpactPhoto(null);
      await Promise.all([refreshReports(), refreshModerationReports()]);
    } catch (error) { Alert.alert('Could not record event', error instanceof Error ? error.message : 'Try again.'); }
  };

  const inviteReviewer = async () => {
    try {
      const payload = await reviewerRequest('/api/moderation/invitations', 'POST', { email: inviteEmail });
      setInviteResult(`${payload.email} · temporary password: ${payload.temporaryPassword}`);
      setInviteEmail('');
    } catch (error) { Alert.alert('Invitation failed', error instanceof Error ? error.message : 'Try again.'); }
  };

  const loginReviewer = async () => {
    try {
      const response = await fetch(`${API_URL}/api/moderation/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: reviewerEmail, password: reviewerPassword }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not sign in.');
      setReviewerToken(payload.token); setReviewerRole(payload.role); setReviewerPassword('');
    } catch (error) { Alert.alert('Reviewer sign-in failed', error instanceof Error ? error.message : 'Connect to the local API.'); }
  };

  useEffect(() => { if (reviewerToken) void refreshModerationReports().catch((error) => Alert.alert('Reviewer queue unavailable', error.message)); }, [reviewerToken]);

  const filteredSpecies = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return catalog.slice(0, 10);
    return catalog.filter((item) => [item.scientificName, ...item.scientificSynonyms, ...item.commonNames].some((name) => name.toLocaleLowerCase().includes(query))).slice(0, 12);
  }, [search]);

  const choosePhoto = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          const actions = permission.canAskAgain
            ? [{ text: 'OK' }]
            : [
                { text: 'Cancel', style: 'cancel' as const },
                { text: 'Open Settings', onPress: () => { void Linking.openSettings().catch(() => Alert.alert('Settings unavailable', 'Open iPhone Settings, choose Expo Go, and enable Camera access.')); } },
              ];
          Alert.alert(
            'Camera permission needed',
            permission.canAskAgain
              ? 'Allow camera access to take a plant photo. You can also choose a photo from your library.'
              : 'Camera access is turned off for Expo Go. Enable it in iPhone Settings, then try again.',
            actions,
          );
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.82 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.82 });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) {
        Alert.alert('No photo selected', 'Choose a photo or take another picture and try again.');
        return;
      }
      setPhoto(asset);
      setSupportingPhotos([]);
      setGuess(null);
      setGuessMessage('Photo ready. Ask Gemini for a tentative plant identification, or identify it manually.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please check Expo Go permissions and try again.';
      Alert.alert(useCamera ? 'Could not open camera' : 'Could not open photo library', message);
    }
  };

  const chooseSupportingPhotos = async () => {
    try {
      const remaining = 3 - supportingPhotos.length;
      if (remaining <= 0) return;
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.82, allowsMultipleSelection: true, selectionLimit: remaining });
      if (!result.canceled && result.assets?.length) setSupportingPhotos((current) => [...current, ...result.assets].slice(0, 3));
    } catch (error) { Alert.alert('Could not add supporting photos', error instanceof Error ? error.message : 'Try again.'); }
  };

  const identifyPhoto = async () => {
    if (!photo) return;
    setIsIdentifying(true);
    setGuessMessage('Sending photo for tentative identification…');
    try {
      const payload = await uploadPhoto<PlantGuess>('/api/identify', photo);
      if (!payload || typeof payload !== 'object') throw new Error('Identification returned an unreadable response. Search the catalog or enter a plant name manually.');
      setGuess(payload);
      if (payload.isPlant === false) {
        setSelectedSpecies(null);
        setManualName('');
        setGuessMessage('Gemini could not confirm that this image shows a plant. Check the photo, or identify the plant manually if you are sure it is one.');
        return;
      }
      const matched = findInCatalog(payload.scientificName) || findInCatalog(payload.commonName);
      if (matched) {
        setSelectedSpecies(matched);
        setManualName('');
        setManualMode(false);
        setGuessMessage('Tentative suggestion matched the FISC catalog. Review it and confirm or choose another plant.');
      } else {
        setSelectedSpecies(null);
        setManualName(payload.scientificName || payload.commonName || '');
        setManualMode(true);
        setGuessMessage('No FISC catalog match. This does not mean the plant is non-invasive; you can report it as a possible unlisted invasive.');
      }
    } catch (error) {
      setGuessMessage(error instanceof Error ? error.message : 'Gemini unavailable. Search the catalog or enter the name manually.');
    } finally { setIsIdentifying(false); }
  };

  const setCurrentLocation = async () => {
    setLocationMessage('Requesting location…');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationMessage('Location permission denied. You can still tap the map to place the sighting pin.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setLocation(point);
      setLocationMessage('Location found. Tap the map to adjust the pin if needed.');
    } catch (error) {
      console.warn('Location lookup failed:', error);
      setLocationMessage('Could not get GPS location. Check Expo Go location access or tap the map to place the sighting pin.');
    }
  };

  const submitReport = async () => {
    const speciesName = selectedSpecies?.commonNames[0] || manualName.trim();
    const manualMatchesGuess = Boolean(guess && [guess.commonName, guess.scientificName].some((name) => name && name.trim().toLocaleLowerCase() === manualName.trim().toLocaleLowerCase()));
    const scientificName = selectedSpecies?.scientificName || (!manualMode || manualMatchesGuess ? guess?.scientificName || '' : '');
    if (!photo || !speciesName) return Alert.alert('Add a photo and plant name', 'Select a FISC-listed plant or enter an unlisted plant name.');
    if (!location) return Alert.alert('Choose a location', 'Use GPS or tap the map to place the sighting pin.');
    const oversized = [photo, ...supportingPhotos].find((item) => item.fileSize && item.fileSize > 5 * 1024 * 1024);
    if (oversized) return Alert.alert('Photo is too large', 'Each report photo must be 5 MB or smaller. Choose a smaller image and try again.');
    setIsSubmitting(true);
    try {
      const created = await uploadPhoto<{ report: { id: string } }>('/api/reports', photo, {
        speciesName,
        scientificName,
        geminiSuggestion: guess ? `${guess.commonName || ''} ${guess.scientificName || ''}`.trim() : '',
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        observedAt: new Date().toISOString(),
        note,
        exactLocationPublic: String(exactLocationPublic),
      });
      for (const supportingPhoto of supportingPhotos) await uploadPhoto(`/api/reports/${created.report.id}/photos`, supportingPhoto);
      await refreshReports();
      setPhoto(null); setSupportingPhotos([]); setGuess(null); setSelectedSpecies(null); setManualName(''); setManualMode(false); setSearch(''); setNote(''); setLocation(null); setExactLocationPublic(false); setTab('map');
      Alert.alert('Report submitted', 'Your sighting is on the community map as unverified and can now be reviewed.');
    } catch (error) {
      Alert.alert('Could not submit report', error instanceof Error ? error.message : 'Check that the phone and API laptop are on the same Wi-Fi.');
    } finally { setIsSubmitting(false); }
  };

  const renderReportCard = (report: Report, reviewerView = false) => {
    const expanded = expandedReportId === report.id;
    const photos = report.photos?.length ? report.photos : (report.photoUrl ? [{ id: `${report.id}-legacy`, url: report.photoUrl, isPrimary: true, position: 0 }] : []);
    const privateImageHeaders = reviewerView && reviewerToken ? { Authorization: `Bearer ${reviewerToken}` } : undefined;
    return <View key={`${reviewerView ? 'review-' : ''}${report.id}`} style={styles.reportCardWrap}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${report.speciesName}, ${report.reviewStatus}. Tap for details`} onPress={() => setExpandedReportId(expanded ? null : report.id)} style={styles.reportCard}>
        {photos[0] ? <Image source={{ uri: photos[0].url, headers: privateImageHeaders }} style={styles.reportPhoto} /> : <View style={[styles.reportPhoto, styles.photoPlaceholder]}><Text>🌿</Text></View>}
        <View style={styles.reportInfo}><View style={styles.reportTopLine}><Text style={styles.reportName} numberOfLines={1}>{report.speciesName}</Text><View style={[styles.statusPill, report.reviewStatus === 'verified' ? styles.statusVerified : styles.statusUnverified]}><Text style={styles.statusText}>{report.reviewStatus.replace('_', ' ')}</Text></View></View>
          <Text style={styles.reportDetail}>{report.isFiscListed ? report.listedCategory : 'Possible unlisted invasive'} · {new Date(report.observedAt).toLocaleDateString()}</Text>
          {report.note ? <Text style={styles.reportNote} numberOfLines={2}>{report.note}</Text> : null}
          <Text style={styles.reportLocation}>{report.exactLocationPublic ? 'Precise location shared' : 'Approximate location'} · {report.latitude.toFixed(3)}, {report.longitude.toFixed(3)}</Text>
          <Text style={styles.expandHint}>{expanded ? 'Hide details ▲' : `Details, activity${photos.length > 1 ? ` · ${photos.length} photos` : ''} ▾`}</Text>
        </View>
      </Pressable>
      {expanded ? <View style={styles.expandedReport}>
        {photos.length > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoGallery}>{photos.map((item) => <Image key={item.id} source={{ uri: item.url, headers: privateImageHeaders }} style={styles.galleryPhoto} />)}</ScrollView> : null}
        {report.scientificName ? <Text style={styles.detailScientific}>{report.scientificName}</Text> : null}
        <Text style={styles.detailCopy}>{report.isFiscListed ? `FISC ${report.listedCategory} · Catalog match` : 'Not found in the FISC catalog · possible unlisted invasive'}</Text>
        {report.sourceUrl ? <Text style={styles.sourceLink} onPress={() => void Linking.openURL(report.sourceUrl!).catch(() => Alert.alert('Could not open source', 'Check your internet connection.'))}>View FISC source ↗</Text> : null}
        {report.geminiSuggestion ? <Text style={styles.detailCopy}>Original Gemini suggestion: {report.geminiSuggestion}</Text> : null}
        <Text style={styles.detailCopy}>{report.exactLocationPublic ? 'Exact location shared by reporter' : 'Approximate public location'}</Text>
        {report.note ? <Text style={styles.detailNote}>{report.note}</Text> : null}
        <Text style={styles.timelineHeading}>Public activity</Text>
        {(report.activity || []).length ? report.activity!.map((event) => <View key={event.id} style={styles.timelineRow}><View style={styles.timelineDot} /><View style={{ flex: 1 }}><Text style={styles.timelineTitle}>{event.toStatus ? `Status: ${event.toStatus.replace('_', ' ')}` : event.type.replaceAll('_', ' ')}</Text><Text style={styles.timelineText}>{event.actorRole}{event.publicReason ? ` · ${event.publicReason}` : ''}</Text><Text style={styles.timelineDate}>{new Date(event.occurredAt).toLocaleString()}</Text></View></View>) : <Text style={styles.detailCopy}>No activity recorded yet.</Text>}
        {(report.impactEvents || []).length ? <><Text style={styles.timelineHeading}>Impact and follow-up</Text>{report.impactEvents!.map((event) => <View key={event.id} style={styles.impactEvent}><Text style={styles.timelineTitle}>{event.type} · {new Date(event.date).toLocaleDateString()}</Text><Text style={styles.timelineText}>{event.note}</Text>{event.photos.map((url, index) => <Image key={`${event.id}-${index}`} source={{ uri: url, headers: privateImageHeaders }} style={styles.eventPhoto} />)}</View>)}</> : null}
        {reviewerView && reviewerToken ? <View style={styles.reviewerTools}>
          <Text style={styles.timelineHeading}>Reviewer actions · {reviewerRole}</Text>
          <TextInput style={styles.searchInput} value={reviewReason} onChangeText={setReviewReason} placeholder="Public reason for status change" />
          {report.reviewStatus !== 'rejected' ? <TextInput style={[styles.searchInput, { marginTop: 7 }]} value={correctionName} onChangeText={setCorrectionName} placeholder={`Correct ID (current: ${report.speciesName})`} /> : null}
          {correctionName.trim() ? <View style={{ marginTop: 7 }}><ActionButton small secondary title="Save identification correction" onPress={() => void changeReview(report, report.reviewStatus)} /></View> : null}
          <View style={styles.reviewActions}>
            {(['needs_review', 'verified', 'rejected'] as const).filter((status) => status !== report.reviewStatus).map((status) => <ActionButton key={status} small secondary title={status.replace('_', ' ')} onPress={() => void changeReview(report, status)} />)}
          </View>
          {report.reviewStatus !== 'rejected' ? <>
            <Text style={styles.timelineHeading}>Record impact or follow-up</Text>
            <View style={styles.reviewActions}>{(['inspection', 'treatment', 'follow-up'] as const).map((type) => <ActionButton key={type} small secondary title={type} onPress={() => setImpactType(type)} disabled={false} />)}</View>
            <Text style={styles.detailCopy}>Event type: {impactType} · {impactDate}</Text>
            <TextInput style={styles.searchInput} value={impactDate} onChangeText={setImpactDate} placeholder="Date (YYYY-MM-DD)" />
            <TextInput style={[styles.searchInput, styles.noteInput, { marginTop: 7 }]} value={impactNote} onChangeText={setImpactNote} placeholder="Required event note" multiline />
            <View style={styles.reviewActions}><ActionButton small secondary title={impactPhoto ? 'Photo added' : 'Optional photo'} onPress={async () => { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .82 }); if (!result.canceled) setImpactPhoto(result.assets?.[0] || null); }} /><ActionButton small title="Save event" onPress={() => void addImpactEvent(report)} /></View>
          </> : null}
          {reviewerRole === 'moderator' ? <ActionButton title="Delete report" secondary small onPress={() => Alert.alert('Delete report?', 'This removes the report and its history from PocketBase.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await reviewerRequest(`/api/reports/${report.id}`, 'DELETE', {}); await Promise.all([refreshReports(), refreshModerationReports()]); } catch (error) { Alert.alert('Delete failed', error instanceof Error ? error.message : 'Try again.'); } } }])} /> : null}
        </View> : null}
      </View> : null}
    </View>;
  };

  const activeCenter = location || ORLANDO;
  const reportCountLabel = `${reports.length} ${reports.length === 1 ? 'sighting' : 'sightings'}`;
  const impactCounts = reports.flatMap((report) => report.impactEvents || []).reduce((counts, event) => { counts[event.type] = (counts[event.type] || 0) + 1; return counts; }, {} as Record<string, number>);
  const verifiedCount = reports.filter((report) => report.reviewStatus === 'verified').length;

  return <SafeAreaView style={styles.safe}>
    <StatusBar style="dark" />
    <View style={styles.topBar}>
      <View style={styles.brandIcon}><Text style={styles.brandIconText}>✳</Text></View>
      <View style={{ flex: 1 }}><Text style={styles.brand}>SPOT THE SPREAD</Text><Text style={styles.brandSub}>Community plant watch · Central Florida</Text></View>
      <View style={[styles.connectionDot, apiOnline ? styles.connected : styles.disconnected]} />
    </View>
    {!apiOnline && <Pressable style={styles.offlineBanner} onPress={() => void refreshReports()}><Text style={styles.offlineText}>Local report server not connected · tap to retry · manual identification still available</Text></Pressable>}
    <View style={styles.nav}>
      <Pressable style={[styles.navItem, tab === 'map' && styles.navActive]} onPress={() => setTab('map')}><Text style={[styles.navText, tab === 'map' && styles.navTextActive]}>Map</Text></Pressable>
      <Pressable style={[styles.navItem, tab === 'report' && styles.navActive]} onPress={() => setTab('report')}><Text style={[styles.navText, tab === 'report' && styles.navTextActive]}>＋ Report</Text></Pressable>
      <Pressable style={[styles.navItem, tab === 'review' && styles.navActive]} onPress={() => setTab('review')}><Text style={[styles.navText, tab === 'review' && styles.navTextActive]}>Review</Text></Pressable>
    </View>

    {tab === 'map' ? <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.heroRow}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>ORANGE COUNTY, FLORIDA</Text><Text style={styles.heading}>Local sightings.{"\n"}Shared for good.</Text></View><View style={styles.countCard}><Text style={styles.countNumber}>{reports.length}</Text><Text style={styles.countLabel}>community{"\n"}reports</Text></View></View>
      <Text style={styles.bodyCopy}>Possible invasive plants, mapped by neighbors and reviewed by people who know the local landscape.</Text>
      <View style={styles.mapWrap}><MapPanel center={ORLANDO} reports={reports} height={315} /></View>
      <View style={styles.mapLegend}><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#bb7917' }]} /><Text style={styles.legendText}>Unverified</Text></View><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#28734d' }]} /><Text style={styles.legendText}>Verified</Text></View><Text style={styles.attribution}>© OpenStreetMap</Text></View>
      <View style={styles.impactSummary}><Text style={styles.impactSummaryTitle}>Recorded community activity</Text><View style={styles.impactMetrics}><Text style={styles.impactMetric}>{verifiedCount} verified</Text><Text style={styles.impactMetric}>{impactCounts.inspection || 0} inspected</Text><Text style={styles.impactMetric}>{impactCounts.treatment || 0} treated</Text><Text style={styles.impactMetric}>{impactCounts['follow-up'] || 0} follow-ups</Text></View><Text style={styles.sizeHint}>Counts show recorded reports and events, not eradication or ecological improvement.</Text></View>
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Recent sightings</Text><Text style={styles.sectionMeta}>{reportCountLabel}</Text></View>
      {reports.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>The map is ready for its first sighting</Text><Text style={styles.emptyText}>Add a possible invasive plant to start building a shared picture of what is growing nearby.</Text><ActionButton title="Create the first report" onPress={() => setTab('report')} /></View> : reports.map((report) => renderReportCard(report))}
      <View style={styles.disclaimer}><Text style={styles.disclaimerTitle}>A list match is useful. A missing match is not a verdict.</Text><Text style={styles.disclaimerText}>The FISC catalog is a reference list, not an exhaustive inventory. Unlisted plants can still be reported as possible invasives and await expert review.</Text></View>
    </ScrollView> : tab === 'report' ? <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>NEW COMMUNITY SIGHTING</Text><Text style={styles.headingSmall}>What did you find?</Text><Text style={styles.bodyCopy}>Take a clear photo of the plant. Gemini can suggest an ID, then you confirm or correct it.</Text>
      {photo ? <View style={styles.photoPreviewWrap}><Image source={{ uri: photo.uri }} style={styles.photoPreview} /><Pressable style={styles.removePhoto} onPress={() => { setPhoto(null); setGuess(null); }}><Text style={styles.removePhotoText}>×</Text></Pressable></View> : <View style={styles.photoPlaceholderLarge}><Text style={styles.photoEmoji}>🌱</Text><Text style={styles.photoHint}>Get close to the leaves, flowers, or fruit</Text></View>}
      <View style={styles.buttonRow}><View style={{ flex: 1 }}><ActionButton title="Take photo" onPress={() => void choosePhoto(true)} /></View><View style={{ flex: 1 }}><ActionButton title="Upload photo" secondary onPress={() => void choosePhoto(false)} /></View></View>
      {photo ? <View style={styles.supportingPhotos}><Text style={styles.detailCopy}>Primary photo · Gemini analyzes this image</Text><View style={styles.supportingHead}><Text style={styles.stepTitle}>Supporting photos ({supportingPhotos.length}/3)</Text><ActionButton title="＋ Add photos" secondary small onPress={() => void chooseSupportingPhotos()} disabled={supportingPhotos.length >= 3} /></View><Text style={styles.detailCopy}>Add other angles or the surrounding scene. Every report photo is shared publicly.</Text><ScrollView horizontal contentContainerStyle={styles.photoGallery}>{supportingPhotos.map((item, index) => <View key={`${item.uri}-${index}`} style={styles.supportThumbWrap}><Image source={{ uri: item.uri }} style={styles.supportThumb} /><Pressable style={styles.removeThumb} onPress={() => setSupportingPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))}><Text style={styles.removePhotoText}>×</Text></Pressable></View>)}</ScrollView><Text style={styles.sizeHint}>Up to 5 MB each · image metadata is removed on upload</Text></View> : null}
      {photo ? <View style={styles.identifyBlock}><ActionButton title={isIdentifying ? 'Identifying…' : '✦  Suggest an ID with Gemini'} onPress={() => void identifyPhoto()} disabled={isIdentifying || !apiOnline} secondary={!apiOnline} />
        {isIdentifying ? <ActivityIndicator color={colors.green} style={{ marginTop: 12 }} /> : null}
        {guessMessage ? <Text style={[styles.helperText, guess && styles.successHelper]}>{guessMessage}</Text> : null}
      </View> : null}
      {guess ? <View style={styles.guessCard}><View style={styles.guessBadge}><Text style={styles.guessBadgeText}>AI SUGGESTION · {guess.confidence || 'uncertain'}</Text></View><Text style={styles.guessName}>{guess.commonName || 'Plant candidate'}</Text>{guess.scientificName ? <Text style={styles.scientific}>{guess.scientificName}</Text> : null}{guess.rationale ? <Text style={styles.guessRationale}>{guess.rationale}</Text> : null}<Text style={styles.helperText}>Gemini can be wrong. Confirm or correct this identification below.</Text></View> : null}

      <View style={styles.stepLabel}><View style={styles.stepCircle}><Text style={styles.stepCircleText}>1</Text></View><Text style={styles.stepTitle}>Confirm the plant</Text></View>
      <View style={styles.modeToggle}><Pressable style={[styles.modeButton, !manualMode && styles.modeButtonActive]} onPress={() => { setManualMode(false); setManualName(''); }}><Text style={[styles.modeText, !manualMode && styles.modeTextActive]}>FISC listed</Text></Pressable><Pressable style={[styles.modeButton, manualMode && styles.modeButtonActive]} onPress={() => { setManualMode(true); setSelectedSpecies(null); }}><Text style={[styles.modeText, manualMode && styles.modeTextActive]}>Possible unlisted</Text></Pressable></View>
      {!manualMode ? <>
        <TextInput style={styles.searchInput} placeholder="Search common or scientific name" placeholderTextColor="#91A098" value={search} onChangeText={setSearch} autoCapitalize="none" />
        <View style={styles.speciesList}>{filteredSpecies.map((species) => <Pressable key={species.id} onPress={() => { setSelectedSpecies(species); setManualName(''); }} style={[styles.speciesChoice, selectedSpecies?.id === species.id && styles.speciesChoiceActive]}>
          <View style={{ flex: 1 }}><Text style={styles.speciesCommon}>{species.commonNames[0] || species.scientificName}</Text><Text style={styles.speciesScientific}>{species.scientificName}{species.commonNames.length > 1 ? ` · +${species.commonNames.length - 1} names` : ''}</Text></View><Text style={styles.categoryPill}>{species.category.replace('Category ', 'Cat. ')}</Text>
        </Pressable>)}
        {!filteredSpecies.length ? <Text style={styles.helperText}>No FISC list match. Choose “Possible unlisted” to record it for expert review.</Text> : null}</View>
        {selectedSpecies ? <View style={styles.listMatchCard}><Text style={styles.listMatchHeading}>FISC {selectedSpecies.category} · Florida invasive plant list</Text><Text style={styles.sourceText}>This match means the plant is listed in this FISC category. <Text style={styles.linkText} onPress={() => { void Linking.openURL(selectedSpecies.sourceUrl).catch(() => Alert.alert('Could not open source', 'Check that your phone has an internet connection.')); }}>View source ↗</Text></Text></View> : null}
      </> : <>
        <TextInput style={styles.searchInput} placeholder="Plant name (common or scientific)" placeholderTextColor="#91A098" value={manualName} onChangeText={setManualName} />
        {findInCatalog(manualName) ? <View style={styles.listMatchCard}><Text style={styles.listMatchHeading}>This name matches FISC {findInCatalog(manualName)?.category}</Text><Text style={styles.sourceText}>The report will be labeled with this sourced catalog category.</Text></View> : <View style={styles.unlistedCallout}><Text style={styles.unlistedTitle}>Not found in the FISC catalog ≠ not invasive</Text><Text style={styles.unlistedText}>Submit it as a possible unlisted invasive. A moderator can review and correct the identification.</Text></View>}
      </>}

      <View style={styles.stepLabel}><View style={styles.stepCircle}><Text style={styles.stepCircleText}>2</Text></View><Text style={styles.stepTitle}>Pin the sighting</Text></View>
      <Text style={styles.helperText}>{locationMessage}</Text><ActionButton title="◎  Use my current location" onPress={() => void setCurrentLocation()} secondary small />
      <View style={{ marginTop: 12 }}><MapPanel center={activeCenter} reports={[]} selectable onPin={(point) => { setLocation(point); setLocationMessage(`Pin set at ${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}. Drag it to adjust.`); }} height={235} /></View>
      {location ? <Text style={styles.coordinateText}>Selected: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</Text> : null}
      <Pressable onPress={() => setExactLocationPublic(!exactLocationPublic)} style={styles.consentRow}><View style={[styles.checkbox, exactLocationPublic && styles.checkboxChecked]}>{exactLocationPublic ? <Text style={styles.checkmark}>✓</Text> : null}</View><View style={{ flex: 1 }}><Text style={styles.consentTitle}>Show exact location on the public map</Text><Text style={styles.consentSub}>If off, the public pin is approximate. Moderators can still review the precise location.</Text></View></Pressable>
      <View style={styles.stepLabel}><View style={styles.stepCircle}><Text style={styles.stepCircleText}>3</Text></View><Text style={styles.stepTitle}>Add context and submit</Text></View>
      <TextInput style={[styles.searchInput, styles.noteInput]} placeholder="Optional note: size, nearby trail, or habitat" placeholderTextColor="#91A098" value={note} onChangeText={setNote} multiline textAlignVertical="top" maxLength={1200} />
      <View style={styles.submitNotice}><Text style={styles.submitNoticeText}>Your photo, plant name, note, and selected map location are visible to the community. Exact coordinates are shared only if you opt in. Reports appear as <Text style={{ fontWeight: '800' }}>unverified</Text> until a moderator reviews them. Avoid including people or identifying details in photos and notes.</Text></View>
      <ActionButton title={isSubmitting ? 'Submitting report…' : 'Submit sighting'} onPress={() => void submitReport()} disabled={isSubmitting || !apiOnline} />
      {!apiOnline ? <Text style={styles.errorHelper}>Connect the phone and API server to the same Wi-Fi to submit reports.</Text> : null}
      <View style={{ height: 28 }} />
    </ScrollView> : <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>INVITE-ONLY REVIEW</Text><Text style={styles.headingSmall}>Reviewer tools</Text>
      {!reviewerToken ? <View style={styles.reviewerLogin}><Text style={styles.bodyCopy}>Sign in with the demo reviewer credentials supplied by the moderator.</Text><TextInput style={styles.searchInput} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={reviewerEmail} onChangeText={setReviewerEmail} /><TextInput style={[styles.searchInput, { marginTop: 8 }]} placeholder="Password" secureTextEntry value={reviewerPassword} onChangeText={setReviewerPassword} /><View style={{ marginTop: 10 }}><ActionButton title="Sign in" onPress={() => void loginReviewer()} disabled={!apiOnline} /></View></View> : <>
        <View style={styles.reviewerHeader}><Text style={styles.detailCopy}>Signed in · {reviewerRole}</Text><ActionButton small secondary title="Sign out" onPress={() => { void reviewerRequest('/api/moderation/logout', 'POST', {}).catch(() => undefined); setReviewerToken(''); setReviewerRole(''); setModerationReports([]); }} /></View>
        {reviewerRole === 'moderator' ? <View style={styles.inviteBox}><Text style={styles.timelineHeading}>Invite a reviewer</Text><TextInput style={styles.searchInput} placeholder="Reviewer email" autoCapitalize="none" keyboardType="email-address" value={inviteEmail} onChangeText={setInviteEmail} /><View style={{ marginTop: 8 }}><ActionButton title="Create invite" onPress={() => void inviteReviewer()} /></View>{inviteResult ? <Text selectable style={styles.helperText}>{inviteResult}</Text> : null}</View> : null}
        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Review queue</Text><Text style={styles.sectionMeta}>{moderationReports.length} reports</Text></View>
        {moderationReports.length ? moderationReports.map((report) => renderReportCard(report, true)) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No reports to review</Text><Text style={styles.emptyText}>New reports will appear here for review.</Text></View>}
      </>}
    </ScrollView>}
  </SafeAreaView>;
}

function findInCatalog(name?: string) {
  const normalize = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const query = normalize(name || '');
  if (!query) return null;
  return catalog.find((species) => [species.scientificName, ...species.scientificSynonyms, ...species.commonNames].some((candidate) => normalize(candidate) === query)) || null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight : 0 },
  topBar: { minHeight: 68, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.paper },
  brandIcon: { height: 38, width: 38, borderRadius: 14, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }, brandIconText: { color: colors.white, fontSize: 22, fontWeight: '700' }, brand: { fontSize: 13, fontWeight: '900', letterSpacing: 1.25, color: colors.ink }, brandSub: { fontSize: 11, color: colors.muted, marginTop: 2 }, connectionDot: { width: 9, height: 9, borderRadius: 5 }, connected: { backgroundColor: '#48A66A' }, disconnected: { backgroundColor: '#D39437' },
  offlineBanner: { paddingVertical: 7, paddingHorizontal: 16, backgroundColor: colors.amberPale }, offlineText: { textAlign: 'center', color: colors.amber, fontSize: 11, fontWeight: '600' },
  nav: { flexDirection: 'row', marginHorizontal: 18, backgroundColor: '#E8EEE6', borderRadius: 15, padding: 4, marginBottom: 5 }, navItem: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' }, navActive: { backgroundColor: colors.white, shadowColor: '#142A1D', shadowOpacity: .08, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, navText: { fontSize: 13, color: colors.muted, fontWeight: '600' }, navTextActive: { color: colors.ink, fontWeight: '800' },
  content: { paddingHorizontal: 19, paddingTop: 18, paddingBottom: 26 }, heroRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, eyebrow: { color: colors.green, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 }, heading: { color: colors.ink, fontSize: 30, lineHeight: 34, fontWeight: '800', letterSpacing: -.5 }, headingSmall: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -.5 }, countCard: { width: 83, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 17, backgroundColor: colors.pale, alignItems: 'center', marginBottom: 3 }, countNumber: { fontSize: 24, color: colors.green, fontWeight: '900' }, countLabel: { fontSize: 9, lineHeight: 12, color: colors.green, textAlign: 'center', fontWeight: '700' }, bodyCopy: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 10, marginBottom: 15 }, mapWrap: { overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: colors.border }, mapFrame: { overflow: 'hidden', borderRadius: 18, backgroundColor: '#E6EEE4' }, mapLegend: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingTop: 10, paddingBottom: 22 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, legendDot: { width: 9, height: 9, borderRadius: 5 }, legendText: { fontSize: 11, color: colors.muted, fontWeight: '600' }, attribution: { marginLeft: 'auto', fontSize: 10, color: colors.muted }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, sectionTitle: { fontSize: 18, color: colors.ink, fontWeight: '800' }, sectionMeta: { color: colors.muted, fontSize: 12 },
  emptyCard: { backgroundColor: colors.white, padding: 18, borderRadius: 18, borderWidth: 1, borderColor: colors.border }, emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, emptyText: { color: colors.muted, lineHeight: 18, fontSize: 13, marginTop: 6, marginBottom: 14 }, reportCard: { backgroundColor: colors.white, borderRadius: 17, borderWidth: 1, borderColor: colors.border, padding: 10, flexDirection: 'row', gap: 12, marginBottom: 0 }, reportPhoto: { width: 78, height: 78, borderRadius: 12, backgroundColor: '#E4EEE1' }, photoPlaceholder: { alignItems: 'center', justifyContent: 'center' }, reportInfo: { flex: 1, justifyContent: 'center' }, reportTopLine: { flexDirection: 'row', alignItems: 'center', gap: 6 }, reportName: { color: colors.ink, fontSize: 14, fontWeight: '800', flex: 1 }, statusPill: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 }, statusVerified: { backgroundColor: colors.pale }, statusUnverified: { backgroundColor: colors.amberPale }, statusText: { color: colors.amber, fontWeight: '800', fontSize: 9, textTransform: 'capitalize' }, reportDetail: { color: colors.green, fontSize: 11, fontWeight: '700', marginTop: 5 }, reportNote: { color: colors.muted, fontSize: 11, marginTop: 4 }, reportLocation: { color: colors.muted, fontSize: 10, marginTop: 5 }, disclaimer: { backgroundColor: '#EAF1E9', borderRadius: 15, padding: 14, marginTop: 13 }, disclaimerTitle: { color: colors.ink, fontWeight: '800', fontSize: 12 }, disclaimerText: { color: colors.muted, lineHeight: 16, fontSize: 11, marginTop: 5 },
  photoPlaceholderLarge: { height: 185, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: '#B7C9B8', backgroundColor: '#ECF3E9', alignItems: 'center', justifyContent: 'center', marginTop: 4 }, photoEmoji: { fontSize: 37 }, photoHint: { color: colors.muted, fontSize: 12, marginTop: 8 }, photoPreviewWrap: { position: 'relative', marginTop: 4 }, photoPreview: { width: '100%', height: 220, borderRadius: 18, resizeMode: 'cover', backgroundColor: '#EAF1E9' }, removePhoto: { position: 'absolute', top: 10, right: 10, height: 32, width: 32, borderRadius: 16, backgroundColor: '#11251DCC', alignItems: 'center', justifyContent: 'center' }, removePhotoText: { fontSize: 24, lineHeight: 26, color: colors.white }, buttonRow: { flexDirection: 'row', gap: 10, marginTop: 12 }, button: { minHeight: 46, borderRadius: 13, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.green }, buttonSecondary: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1 }, buttonSmall: { minHeight: 38, alignSelf: 'flex-start', paddingVertical: 9, borderRadius: 11 }, buttonDisabled: { opacity: .45 }, buttonText: { color: colors.white, fontSize: 13, fontWeight: '800' }, buttonTextSecondary: { color: colors.ink }, buttonTextSmall: { fontSize: 12 }, identifyBlock: { marginTop: 10 }, helperText: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 8 }, successHelper: { color: colors.green }, guessCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 14, marginTop: 12 }, guessBadge: { alignSelf: 'flex-start', backgroundColor: colors.amberPale, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 }, guessBadgeText: { color: colors.amber, fontSize: 9, fontWeight: '900', letterSpacing: .6 }, guessName: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 9 }, scientific: { color: colors.muted, fontSize: 12, fontStyle: 'italic', marginTop: 3 }, guessRationale: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 7 },
  reportCardWrap: { backgroundColor: colors.white, borderRadius: 17, borderWidth: 1, borderColor: colors.border, marginBottom: 10, overflow: 'hidden' }, expandedReport: { paddingHorizontal: 13, paddingBottom: 14, borderTopWidth: 1, borderColor: colors.border }, expandHint: { color: colors.green, fontSize: 10, fontWeight: '800', marginTop: 6 }, photoGallery: { gap: 8, paddingVertical: 10 }, galleryPhoto: { width: 190, height: 140, borderRadius: 12, backgroundColor: colors.pale }, detailScientific: { color: colors.ink, fontSize: 12, fontStyle: 'italic', marginTop: 5 }, detailCopy: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 5 }, detailNote: { color: colors.ink, fontSize: 12, lineHeight: 17, marginTop: 8 }, timelineHeading: { color: colors.ink, fontSize: 13, fontWeight: '900', marginTop: 14, marginBottom: 6 }, timelineRow: { flexDirection: 'row', gap: 9, paddingVertical: 6 }, timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green, marginTop: 4 }, timelineTitle: { color: colors.ink, fontSize: 11, fontWeight: '800', textTransform: 'capitalize' }, timelineText: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 2 }, timelineDate: { color: colors.muted, fontSize: 9, marginTop: 3 }, impactEvent: { padding: 10, borderRadius: 10, backgroundColor: colors.pale, marginBottom: 6 }, eventPhoto: { width: 100, height: 80, borderRadius: 8, marginTop: 6 }, reviewerTools: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderColor: colors.border }, reviewActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }, supportingPhotos: { backgroundColor: colors.white, borderRadius: 14, padding: 12, marginTop: 10, borderWidth: 1, borderColor: colors.border }, supportingHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 }, supportThumbWrap: { position: 'relative', marginRight: 8 }, supportThumb: { width: 82, height: 70, borderRadius: 9 }, removeThumb: { position: 'absolute', top: 3, right: 3, width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#11251DCC' }, sizeHint: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 5 }, reviewerLogin: { backgroundColor: colors.white, borderRadius: 15, padding: 14, borderWidth: 1, borderColor: colors.border }, reviewerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, inviteBox: { padding: 13, backgroundColor: colors.pale, borderRadius: 14, marginBottom: 17 }, impactSummary: { padding: 13, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 18 }, impactSummaryTitle: { color: colors.ink, fontSize: 12, fontWeight: '900' }, impactMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }, impactMetric: { backgroundColor: colors.pale, color: colors.green, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 10, fontWeight: '800' },
  sourceLink: { color: colors.green, fontSize: 11, textDecorationLine: 'underline', fontWeight: '800', marginTop: 5 },
  stepLabel: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 24, marginBottom: 11 }, stepCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' }, stepCircleText: { color: colors.green, fontSize: 12, fontWeight: '900' }, stepTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, modeToggle: { flexDirection: 'row', borderRadius: 12, backgroundColor: '#E8EEE6', padding: 4, marginBottom: 10 }, modeButton: { flex: 1, borderRadius: 9, alignItems: 'center', paddingVertical: 9 }, modeButtonActive: { backgroundColor: colors.white }, modeText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, modeTextActive: { color: colors.ink, fontWeight: '800' }, searchInput: { minHeight: 46, borderRadius: 12, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, color: colors.ink, fontSize: 13 }, speciesList: { marginTop: 7, backgroundColor: colors.white, borderRadius: 13, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, speciesChoice: { minHeight: 55, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }, speciesChoiceActive: { backgroundColor: colors.pale }, speciesCommon: { color: colors.ink, fontSize: 13, fontWeight: '700' }, speciesScientific: { color: colors.muted, fontSize: 10, marginTop: 3, fontStyle: 'italic' }, categoryPill: { color: colors.green, backgroundColor: colors.pale, fontSize: 9, fontWeight: '900', overflow: 'hidden', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 5 }, listMatchCard: { marginTop: 9, backgroundColor: colors.pale, borderRadius: 12, padding: 12 }, listMatchHeading: { color: colors.green, fontSize: 12, fontWeight: '800' }, sourceText: { color: colors.ink, fontSize: 11, lineHeight: 16, marginTop: 5 }, linkText: { color: colors.green, textDecorationLine: 'underline', fontWeight: '800' }, unlistedCallout: { backgroundColor: colors.amberPale, borderRadius: 12, padding: 12, marginTop: 8 }, unlistedTitle: { color: colors.amber, fontWeight: '800', fontSize: 12 }, unlistedText: { color: '#745B30', fontSize: 11, lineHeight: 16, marginTop: 4 }, coordinateText: { fontSize: 10, color: colors.green, marginTop: 6, fontWeight: '700' }, consentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 12, backgroundColor: colors.white, borderRadius: 13, borderWidth: 1, borderColor: colors.border, padding: 12 }, checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#A7B7A9', alignItems: 'center', justifyContent: 'center' }, checkboxChecked: { backgroundColor: colors.green, borderColor: colors.green }, checkmark: { color: colors.white, fontSize: 14, lineHeight: 17, fontWeight: '900' }, consentTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' }, consentSub: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 }, noteInput: { minHeight: 80, paddingTop: 12 }, submitNotice: { padding: 11, marginTop: 11, marginBottom: 11, backgroundColor: colors.pale, borderRadius: 10 }, submitNoticeText: { color: colors.ink, fontSize: 11, lineHeight: 16 }, errorHelper: { color: colors.red, fontSize: 11, marginTop: 8, textAlign: 'center' },
});
