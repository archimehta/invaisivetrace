import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ActionButton, colors, Coordinate, MapPanel, Report, styles } from '../components/shared';
import { SightingsVM } from '../hooks/useSightings';

const transitions: Record<string, string[]> = { unverified: ['needs_review', 'verified', 'rejected'], needs_review: ['verified', 'rejected', 'unverified'], verified: ['needs_review', 'rejected'], rejected: ['needs_review'] };
const pretty = (value: string) => value.replace('_', ' ').replace(/^./, (letter) => letter.toUpperCase());

export function ReviewScreen({ vm }: { vm: SightingsVM }) {
  const { authUser, reviewReports, refreshReviewReports, authToken, reviewReport, removalEstimateAction, correctReportLocation, addImpactEvent, deleteReport, pickEventPhoto, reviewBusy, setReviewBusy, setTab } = vm;
  const [filter, setFilter] = useState<'all' | 'unverified' | 'needs_review' | 'verified' | 'rejected'>('all');
  const [error, setError] = useState('');
  const visible = useMemo(() => reviewReports.filter((report) => filter === 'all' || report.reviewStatus === filter), [filter, reviewReports]);
  if (authUser?.role !== 'moderator') return <View style={[styles.content, { flex: 1, justifyContent: 'center' }]}><Text style={styles.headingSmall}>Moderator access required</Text><Text style={styles.bodyCopy}>Sign in with the configured moderator account to review reports.</Text><ActionButton title="Go to account" onPress={() => setTab('account')} /></View>;
  return <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 50 }]} keyboardShouldPersistTaps="handled">
    <Text style={styles.eyebrow}>MODERATOR WORKSPACE</Text><Text style={styles.headingSmall}>Review reports</Text><Text style={styles.bodyCopy}>Review the identification and evidence, then choose a status and record a public reason. Your personal identity is not shown in public activity.</Text>
    <ActionButton title="Refresh queue ↻" secondary small onPress={() => void refreshReviewReports(authToken).catch((cause) => setError(cause.message))} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14, marginBottom: 12 }}>{(['all', 'unverified', 'needs_review', 'verified', 'rejected'] as const).map((status) => <Pressable key={status} onPress={() => setFilter(status)} style={{ paddingVertical: 8, paddingHorizontal: 11, borderRadius: 16, backgroundColor: filter === status ? colors.green : '#E8EDE4' }}><Text style={{ color: filter === status ? colors.white : colors.ink, fontSize: 10, fontWeight: '800' }}>{status === 'all' ? 'All' : pretty(status)}</Text></Pressable>)}</View>
    {error ? <Text style={{ color: colors.red, fontSize: 12, marginBottom: 10 }}>{error}</Text> : null}
    {visible.length ? visible.map((report) => <ReviewReport key={report.id} report={report} busy={reviewBusy} setBusy={setReviewBusy} reviewReport={reviewReport} removalEstimateAction={removalEstimateAction} correctReportLocation={correctReportLocation} addImpactEvent={addImpactEvent} deleteReport={deleteReport} pickEventPhoto={pickEventPhoto} onError={setError} />) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Nothing in this filter</Text><Text style={styles.emptyText}>There are no reports matching this status right now.</Text></View>}
  </ScrollView>;
}

function ReviewReport({ report, busy, setBusy, reviewReport, removalEstimateAction, correctReportLocation, addImpactEvent, deleteReport, pickEventPhoto, onError }: { report: Report; busy: boolean; setBusy: (value: boolean) => void; reviewReport: SightingsVM['reviewReport']; removalEstimateAction: SightingsVM['removalEstimateAction']; correctReportLocation: SightingsVM['correctReportLocation']; addImpactEvent: SightingsVM['addImpactEvent']; deleteReport: SightingsVM['deleteReport']; pickEventPhoto: SightingsVM['pickEventPhoto']; onError: (value: string) => void }) {
  const [reason, setReason] = useState('');
  const [correctedName, setCorrectedName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [eventType, setEventType] = useState<'inspection' | 'treatment' | 'follow-up'>('inspection');
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventNote, setEventNote] = useState('');
  const [eventPhoto, setEventPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [coverage, setCoverage] = useState(report.coverageAreaSqFt ? String(report.coverageAreaSqFt) : '');
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [correctedPoint, setCorrectedPoint] = useState<Coordinate>({ latitude: report.latitude, longitude: report.longitude });
  const statusOptions = transitions[report.reviewStatus] || [];

  const saveReview = async (status: string) => {
    if (!reason.trim()) return onError('Add a public reason before applying a review status.');
    const coverageValue = coverage.trim() ? Number(coverage) : undefined;
    if (coverage.trim() && (!Number.isFinite(coverageValue) || Number(coverageValue) < 1 || Number(coverageValue) > 43_560)) return onError('Coverage must be from 1 to 43,560 square feet.');
    setBusy(true); onError('');
    try { await reviewReport(report, status, reason, correctedName, scientificName, coverageValue); setReason(''); setCorrectedName(''); setScientificName(''); }
    catch (cause) { onError(cause instanceof Error ? cause.message : 'Could not update report.'); }
    finally { setBusy(false); }
  };
  const runEstimateAction = async (action: 'request' | 'retry' | 'reassess') => {
    const amount = Number(coverage);
    if (!Number.isFinite(amount) || amount < 1 || amount > 43_560) return onError('Enter coverage from 1 to 43,560 square feet.');
    setBusy(true); onError('');
    try { await removalEstimateAction(report.id, action, amount); }
    catch (cause) { onError(cause instanceof Error ? cause.message : 'Could not update the removal estimate.'); }
    finally { setBusy(false); }
  };
  const saveLocation = async () => {
    setBusy(true); onError('');
    try { await correctReportLocation(report.id, correctedPoint); setShowLocationForm(false); }
    catch (cause) { onError(cause instanceof Error ? cause.message : 'Could not correct the report location.'); }
    finally { setBusy(false); }
  };
  const saveEvent = async () => {
    if (!eventNote.trim()) return onError('Add a note before recording the event.');
    setBusy(true); onError('');
    try { await addImpactEvent(report.id, eventType, eventDate, eventNote.trim(), eventPhoto || undefined); setEventNote(''); setEventPhoto(null); setShowEventForm(false); }
    catch (cause) { onError(cause instanceof Error ? cause.message : 'Could not record event.'); }
    finally { setBusy(false); }
  };
  const confirmDelete = () => Alert.alert('Delete this report?', 'This permanently removes the report and its photos, activity, and event history.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete report', style: 'destructive', onPress: () => { setBusy(true); void deleteReport(report.id).catch((cause) => onError(cause.message)).finally(() => setBusy(false)); } }]);

  return <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 13, marginBottom: 12 }}>
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>{report.photoUrl ? <Image source={{ uri: report.photoUrl }} style={{ width: 70, height: 70, borderRadius: 12 }} /> : null}<View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontSize: 15, fontWeight: '900' }}>{report.speciesName}</Text>{report.scientificName ? <Text style={{ color: colors.muted, fontSize: 11, fontStyle: 'italic', marginTop: 2 }}>{report.scientificName}</Text> : null}<Text style={{ color: colors.green, fontSize: 10, fontWeight: '800', marginTop: 5 }}>{pretty(report.reviewStatus)} · {report.isFiscListed ? report.listedCategory : 'Possible unlisted'}</Text></View></View>
    <Text style={styles.helperText}>Submitted by {report.reporter?.displayName || 'Community member'} · {new Date(report.observedAt).toLocaleString()}</Text>
    <Text style={styles.helperText}>Moderator coordinates: {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)} · {report.exactLocationPublic ? 'exact pin public' : 'public pin approximate'}</Text>
    <Pressable onPress={() => setShowLocationForm((visible) => !visible)} style={{ paddingVertical: 10 }}><Text style={{ color: colors.green, fontSize: 11, fontWeight: '900' }}>{showLocationForm ? 'Close location correction' : 'Correct map pin'}</Text></Pressable>
    {showLocationForm ? <View style={{ marginBottom: 10 }}><MapPanel center={correctedPoint} reports={[]} selectable onPin={setCorrectedPoint} height={220} /><Text style={styles.helperText}>Move the pin to the observed location. Saving rechecks Florida and county eligibility.</Text><ActionButton title={busy ? 'Saving…' : 'Save corrected location'} disabled={busy} onPress={() => void saveLocation()} small /></View> : null}
    {report.note ? <Text style={{ color: colors.ink, fontSize: 12, lineHeight: 17, marginTop: 8 }}>“{report.note}”</Text> : null}
    {(report.photos || []).length > 1 ? <ScrollView horizontal contentContainerStyle={{ gap: 7, marginTop: 9 }}>{report.photos!.map((photo) => <Image key={photo.id} source={{ uri: photo.url }} style={{ width: 105, height: 85, borderRadius: 10 }} />)}</ScrollView> : null}
    <TextInput value={correctedName} onChangeText={setCorrectedName} placeholder={`Correct identification (currently ${report.speciesName})`} placeholderTextColor="#87938A" style={[styles.searchInput, { marginTop: 12 }]} />
    {correctedName.trim() ? <TextInput value={scientificName} onChangeText={setScientificName} placeholder="Correct scientific name (optional)" placeholderTextColor="#87938A" style={[styles.searchInput, { marginTop: 7 }]} /> : null}
    <TextInput value={reason} onChangeText={setReason} placeholder="Public reason for this review (required)" placeholderTextColor="#87938A" multiline maxLength={500} style={[styles.searchInput, { minHeight: 65, marginTop: 7, paddingTop: 10 }]} />
    {report.reviewStatus !== 'verified' && report.isFiscListed ? <View style={{ marginTop: 10 }}><TextInput value={coverage} onChangeText={setCoverage} keyboardType="decimal-pad" placeholder="Optional infested coverage in sq ft (max 43,560)" placeholderTextColor="#87938A" style={styles.searchInput} /><Text style={styles.helperText}>Entering coverage here queues an estimate after verification. Leave blank to verify without an estimate.</Text></View> : null}
    {report.reviewStatus === 'verified' && report.isFiscListed ? <View style={{ marginTop: 13, padding: 12, borderRadius: 13, backgroundColor: '#F1F3EC' }}>
      <Text style={{ color: colors.ink, fontSize: 13, fontWeight: '900' }}>Removal cost estimate</Text>
      <Text style={styles.helperText}>{report.estimateStatus === 'coverage_needed' ? 'Coverage needed' : report.estimateStatus === 'pending' ? 'Estimate being prepared' : report.estimateStatus === 'ready' ? 'Current estimate available' : report.estimateStatus === 'stale' ? 'Estimate needs reassessment after treatment' : report.estimateStatus === 'unavailable' ? 'Estimate unavailable' : report.estimateStatus === 'ineligible' ? `Not eligible: ${report.estimateReason || 'location or species could not be confirmed'}` : 'No estimate requested yet'}{report.estimateCounty ? ` · ${report.estimateCounty} County` : ''}</Text>
      <TextInput value={coverage} onChangeText={setCoverage} keyboardType="decimal-pad" placeholder="Infested coverage in square feet (max 43,560)" placeholderTextColor="#87938A" style={[styles.searchInput, { marginTop: 8 }]} />
      {report.estimateStatus === 'pending' || report.estimateStatus === 'ineligible' ? null : report.estimateStatus === 'stale' ? <ActionButton title={busy ? 'Queueing…' : 'Confirm area & reassess'} disabled={busy} onPress={() => void runEstimateAction('reassess')} small /> : report.estimateStatus === 'unavailable' ? <ActionButton title={busy ? 'Queueing…' : 'Retry estimate'} disabled={busy} onPress={() => void runEstimateAction('retry')} small /> : <ActionButton title={busy ? 'Queueing…' : report.estimateStatus === 'ready' ? 'Update area & regenerate' : 'Save area & request estimate'} disabled={busy} onPress={() => void runEstimateAction('request')} small />}
      <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 7 }}>Estimate cap: one acre. Verification remains available if estimating fails.</Text>
    </View> : null}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>{statusOptions.map((status) => <Pressable key={status} disabled={busy} onPress={() => void saveReview(status)} style={{ backgroundColor: status === 'rejected' ? '#F8E9E6' : colors.pale, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, opacity: busy ? 0.5 : 1 }}><Text style={{ color: status === 'rejected' ? colors.red : colors.green, fontSize: 10, fontWeight: '900' }}>Mark {pretty(status)}</Text></Pressable>)}</View>
    {report.reviewStatus !== 'rejected' ? <><Pressable onPress={() => setShowEventForm((visible) => !visible)} style={{ paddingVertical: 12 }}><Text style={{ color: colors.green, fontSize: 11, fontWeight: '900' }}>{showEventForm ? 'Close event form' : '+ Record inspection, treatment or follow-up'}</Text></Pressable>{showEventForm ? <View style={{ backgroundColor: '#F1F3EC', padding: 11, borderRadius: 13 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>{(['inspection', 'treatment', 'follow-up'] as const).map((type) => <Pressable key={type} onPress={() => setEventType(type)} style={{ flex: 1, padding: 8, borderRadius: 9, backgroundColor: eventType === type ? colors.green : colors.white, alignItems: 'center' }}><Text style={{ color: eventType === type ? colors.white : colors.ink, fontSize: 9, fontWeight: '800' }}>{pretty(type)}</Text></Pressable>)}</View>
      <TextInput value={eventDate} onChangeText={setEventDate} placeholder="Event date (YYYY-MM-DD)" style={[styles.searchInput, { marginTop: 8 }]} />
      <TextInput value={eventNote} onChangeText={setEventNote} placeholder={eventType === 'follow-up' ? 'Outcome observed (e.g. recurrence or no regrowth)' : 'Describe the field event'} multiline maxLength={1200} style={[styles.searchInput, { minHeight: 62, marginTop: 8, paddingTop: 10 }]} />
      <Pressable onPress={() => void pickEventPhoto().then(setEventPhoto).catch((cause) => onError(cause.message))} style={{ paddingVertical: 9 }}><Text style={{ color: colors.green, fontSize: 10, fontWeight: '800' }}>{eventPhoto ? 'Optional event photo selected · tap to replace' : 'Add optional event photo'}</Text></Pressable>
      {eventPhoto ? <Image source={{ uri: eventPhoto.uri }} style={{ width: 90, height: 75, borderRadius: 9, marginBottom: 8 }} /> : null}
      <ActionButton title={busy ? 'Saving…' : 'Save field event'} disabled={busy} onPress={() => void saveEvent()} small />
    </View> : null}</> : null}
    <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 7 }}>Verified means the sighting was reviewed. Event records are separate evidence and do not imply eradication or ecological recovery.</Text>
    <Pressable onPress={confirmDelete} style={{ alignSelf: 'flex-start', paddingTop: 12 }}><Text style={{ color: colors.red, fontSize: 10, fontWeight: '900' }}>Delete report permanently</Text></Pressable>
  </View>;
}
