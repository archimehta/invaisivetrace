import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Image, Linking, Modal, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { ActionButton, colors, Report, ScreenGuide, styles } from '../components/shared';
import { SightingsVM } from '../hooks/useSightings';

const statusLabel = (status: string) => status === 'verified' ? 'Verified' : status === 'needs_review' ? 'Needs review' : status === 'unverified' ? 'Unverified' : status.replaceAll('_', ' ');
const eventLabel = (type: string) => type === 'follow-up' ? 'Follow-up' : type[0].toUpperCase() + type.slice(1);
const reportGenus = (report: Report) => {
  const genus = report.scientificName?.trim().split(/\s+/)[0];
  return genus ? `${genus[0].toUpperCase()}${genus.slice(1)}` : 'Unknown genus';
};

export function SightingsScreen({ vm }: { vm: SightingsVM }) {
  const { reports, setTab, tab, refreshReports, sightingsSearchRequest, clearSightingsSearchRequest } = vm;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unverified' | 'needs_review' | 'verified' | 'rejected'>('all');
  const [genusFilter, setGenusFilter] = useState('all');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const refreshRef = useRef(refreshReports);
  refreshRef.current = refreshReports;
  const selectedReport = reports.find((report) => report.id === selectedReportId) || null;
  const hasPendingEstimates = reports.some((report) => report.removalEstimate?.status === 'pending');
  useEffect(() => {
    if (!sightingsSearchRequest) return;
    setQuery(sightingsSearchRequest.query);
    setFilter('all');
    setGenusFilter('all');
    setSelectedReportId(sightingsSearchRequest.reportId);
    clearSightingsSearchRequest();
  }, [sightingsSearchRequest?.requestId, clearSightingsSearchRequest]);
  useEffect(() => {
    if (tab !== 'sightings' || !hasPendingEstimates) return;
    let remainingMs = 120_000;
    let lastTick = Date.now();
    let active = AppState.currentState === 'active';
    const timer = setInterval(() => {
      const now = Date.now();
      if (active && AppState.currentState === 'active') {
        remainingMs -= now - lastTick;
        if (remainingMs <= 0) { clearInterval(timer); return; }
        void refreshRef.current();
      }
      lastTick = now;
    }, 10_000);
    const appState = AppState.addEventListener('change', (state) => {
      const now = Date.now();
      if (active && state !== 'active') remainingMs -= now - lastTick;
      lastTick = now;
      active = state === 'active';
    });
    return () => { clearInterval(timer); appState.remove(); };
  }, [tab, hasPendingEstimates]);
  const genera = useMemo(() => [...new Set(reports.map(reportGenus))].sort((a, b) => a.localeCompare(b)), [reports]);
  const visible = useMemo(() => reports.filter((report) => (filter === 'all' || report.reviewStatus === filter) && (genusFilter === 'all' || reportGenus(report) === genusFilter) && [report.speciesName, report.scientificName || '', report.note || ''].join(' ').toLowerCase().includes(query.toLowerCase())), [reports, filter, genusFilter, query]);

  return <>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>FLORIDA · COMMUNITY</Text>
      <Text style={styles.headingSmall}>Community field guide</Text>
      <Text style={styles.bodyCopy}>Explore reported plants. Open a sighting for identification, review history and removal estimates.</Text>
      <ScreenGuide items={[
        {label:'Search',detail:'Matches plant names, scientific names and reporter notes in the loaded reports.',scope:'This view'},
        {label:'Review status filters',detail:'Show all, verified, unverified, needs-review or rejected reports.',scope:'This view'},
        {label:'Genus filter',detail:'Narrow reports to a scientific plant genus. Genus is taken from the scientific name.',scope:'This view'},
        {label:'Report cards',detail:'Show a short summary. Tap a card to open the full detail sheet with photos, location privacy, activity and fieldwork.',scope:'Shared data'},
        {label:'Estimate details',detail:'When available, the detail sheet shows the AI ballpark; it is not a contractor quote.',scope:'Shared data'},
      ]} />
      <View style={{ backgroundColor: colors.white, borderRadius: 15, paddingHorizontal: 14, marginBottom: 11, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }}><Text style={{ fontSize: 17, marginRight: 8 }}>⌕</Text><TextInput accessibilityLabel="Search sightings by plant name or notes" placeholder="Search plants or notes" value={query} onChangeText={setQuery} placeholderTextColor="#8A988E" style={{ minHeight: 48, fontSize: 16, color: colors.ink, flex: 1 }} /></View>
      <Text style={{ color: colors.ink, fontSize: 11, fontWeight: '800', marginBottom: 7 }}>Review status</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>{(['all', 'unverified', 'needs_review', 'verified', 'rejected'] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={{ paddingVertical: 9, paddingHorizontal: 13, borderRadius: 18, backgroundColor: filter === value ? colors.green : '#E8EDE4' }}><Text style={{ color: filter === value ? colors.white : colors.ink, fontSize: 11, fontWeight: '700' }}>{value === 'all' ? 'All reports' : value === 'needs_review' ? 'Needs review' : statusLabel(value)}</Text></Pressable>)}</ScrollView>
      <Text style={{ color: colors.ink, fontSize: 11, fontWeight: '800', marginBottom: 7 }}>Plant genus</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 15 }}>{['all', ...genera].map((genus) => <Pressable key={genus} accessibilityRole="button" accessibilityState={{ selected: genusFilter === genus }} onPress={() => setGenusFilter(genus)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: genusFilter === genus ? '#DDE8D9' : colors.paper, borderWidth: 1, borderColor: genusFilter === genus ? '#B9CCB3' : colors.border }}><Text style={{ color: genusFilter === genus ? colors.green : colors.ink, fontSize: 10, fontWeight: '800' }}>{genus === 'all' ? 'All genera' : genus}</Text></Pressable>)}</ScrollView>
      <View style={[styles.sectionHead, { marginBottom: 12 }]}><View><Text style={styles.sectionTitle}>Recent reports</Text><Text style={{ fontSize: 11, color: colors.muted, marginTop: 3 }}>Reports stay unverified until reviewed.</Text></View><Text style={styles.sectionMeta}>{visible.length} found</Text></View>
      {visible.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{reports.length ? 'No matching sightings' : 'No sightings yet'}</Text><Text style={styles.emptyText}>{reports.length ? 'Try another search or filter.' : 'Share the first report to start building a community picture of local invasive plants.'}</Text><ActionButton title="Report a plant" onPress={() => setTab('report')} /></View> : visible.map((report) => <ReportCard key={report.id} report={report} onOpen={() => setSelectedReportId(report.id)} />)}
      <View style={styles.disclaimer}><Text style={styles.disclaimerTitle}>A list match is useful. A missing match is not a verdict.</Text><Text style={styles.disclaimerText}>The FISC catalog is a reference list, not an exhaustive inventory. Unlisted plants can still be reported as possible invasives and await expert review.</Text></View>
    </ScrollView>
    <Modal visible={Boolean(selectedReport)} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setSelectedReportId(null)}>
      <SafeAreaView style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0007' }}>
        <View style={{ height: '92%', backgroundColor: colors.paper, borderTopLeftRadius: 25, borderTopRightRadius: 25, overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 19, paddingTop: 13, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}><Text style={styles.eyebrow}>SIGHTING DETAILS</Text><Text style={{ color: colors.ink, fontSize: 20, fontWeight: '800' }}>{selectedReport?.speciesName || 'Report'}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close report details" onPress={() => setSelectedReportId(null)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8EDE4', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.ink, fontSize: 24, lineHeight: 27 }}>×</Text></Pressable>
          </View>
          {selectedReport ? <ScrollView contentContainerStyle={{ padding: 17, paddingBottom: 36 }}><ReportDetails report={selectedReport} onRefresh={() => void refreshReports()} /></ScrollView> : null}
        </View>
      </SafeAreaView>
    </Modal>
  </>;
}

function ReportCard({ report, onOpen }: { report: Report; onOpen: () => void }) {
  const primaryPhoto = report.photos?.find((photo) => photo.isPrimary) || report.photos?.[0];
  const photoUrl = primaryPhoto?.url || report.photoUrl;
  const badgeColor = report.reviewStatus === 'verified' ? colors.green : report.reviewStatus === 'needs_review' ? '#72549A' : colors.amber;
  return <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${report.speciesName} sighting, ${statusLabel(report.reviewStatus)}`} style={[styles.reportCard, { padding: 12, flexDirection: 'column', gap: 10 }]}>
    {photoUrl ? <Image source={{ uri: photoUrl }} accessibilityLabel={`Reported ${report.speciesName}`} style={{ width: '100%', height: 160, borderRadius: 12, backgroundColor: colors.pale }} /> : null}
    <View style={{ minWidth: 0 }}>
      <View style={[styles.statusPill, { alignSelf: 'flex-start', backgroundColor: report.reviewStatus === 'verified' ? colors.pale : report.reviewStatus === 'needs_review' ? '#F0EAF7' : colors.amberPale }]}><Text style={[styles.statusText, { color: badgeColor, fontSize: 12 }]}>{statusLabel(report.reviewStatus)}</Text></View>
      <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '700', marginTop: 8 }}>{report.speciesName}</Text>
      {report.scientificName ? <Text style={{ color: colors.ink, fontSize: 14, fontStyle: 'italic', marginTop: 3 }}>{report.scientificName}</Text> : null}
      <Text style={[styles.reportDetail, { fontSize: 13 }]}>{report.isFiscListed ? report.listedCategory || 'FISC-listed' : 'Possible unlisted invasive'} · {new Date(report.observedAt).toLocaleDateString()}</Text>
      {report.note ? <Text style={[styles.reportNote, { fontSize: 14, lineHeight: 20 }]} numberOfLines={2}>{report.note}</Text> : null}
      {report.locationLabel ? <Text style={{ color: colors.ink, fontSize: 14, marginTop: 8 }}>{report.locationLabel}</Text> : null}
      <Text style={[styles.reportLocation, { fontSize: 12 }]}>{report.exactLocationPublic ? 'Precise location shared' : 'Approximate location'} · {report.latitude.toFixed(3)}, {report.longitude.toFixed(3)}</Text>
      <Text style={{ color: colors.green, fontSize: 14, fontWeight: '700', marginTop: 10 }}>View sighting →</Text>
    </View>
  </Pressable>;
}

function ReportDetails({ report, onRefresh }: { report: Report; onRefresh: () => void }) {
  const photos = report.photos?.length ? report.photos : report.photoUrl ? [{ id: `${report.id}-primary`, url: report.photoUrl, isPrimary: true, position: 0 }] : [];
  return <>
    {photos.length ? <><Text style={styles.eyebrow}>REPORT PHOTOS · {photos.length}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>{photos.map((photo) => <View key={photo.id}><Image source={{ uri: photo.url }} style={{ width: 220, height: 185, borderRadius: 14, backgroundColor: colors.pale }} />{photo.isPrimary ? <Text style={{ color: colors.green, fontSize: 10, fontWeight: '800', marginTop: 4 }}>Primary photo · Gemini input</Text> : <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>Supporting angle</Text>}</View>)}</ScrollView></> : null}
    <Text style={styles.eyebrow}>IDENTIFICATION</Text>
    {report.scientificName ? <Text style={{ color: colors.ink, fontSize: 12, fontStyle: 'italic', marginBottom: 4 }}>{report.scientificName}</Text> : null}
    <Text style={styles.helperText}>{report.isFiscListed ? `Listed in ${report.listedCategory || 'the FISC catalog'}.` : 'Not found in the FISC catalog; this does not establish that the plant is non-invasive.'}</Text>
    {report.sourceUrl ? <Text style={{ color: colors.green, fontSize: 11, fontWeight: '800', textDecorationLine: 'underline', marginTop: 5 }} onPress={() => void Linking.openURL(report.sourceUrl!).catch(() => Alert.alert('Could not open source', 'Check your internet connection.'))}>View FISC source ↗</Text> : null}
    {report.removalEstimate ? <RemovalCostDetails estimate={report.removalEstimate} onRefresh={onRefresh} /> : null}
    {report.geminiSuggestion ? <Text style={[styles.helperText, { marginTop: 7 }]}>AI suggestion recorded: {report.geminiSuggestion}</Text> : null}
    {report.note ? <View style={{ marginTop: 13, padding: 12, borderRadius: 13, backgroundColor: '#F1F3EC' }}><Text style={{ color: colors.ink, fontSize: 12, fontWeight: '800' }}>Field note</Text><Text style={styles.helperText}>{report.note}</Text></View> : null}
    <View style={{ marginTop: 13, padding: 12, borderRadius: 13, backgroundColor: '#F1F3EC' }}><Text style={{ color: colors.ink, fontSize: 12, fontWeight: '800' }}>Report status · {statusLabel(report.reviewStatus)}</Text><Text style={styles.helperText}>{report.exactLocationPublic ? `Reporter opted to show the precise public location (${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}).` : 'Public coordinates are approximate. The precise location is available to moderators.'}</Text></View>
    <Text style={[styles.eyebrow, { marginTop: 16 }]}>PUBLIC ACTIVITY</Text>
    {(report.activity || []).length ? report.activity!.map((activity) => <View key={activity.id} style={{ borderLeftWidth: 2, borderLeftColor: colors.green, paddingLeft: 10, paddingVertical: 5, marginBottom: 5 }}><Text style={{ color: colors.ink, fontSize: 11, fontWeight: '800' }}>{activity.actorRole} · {new Date(activity.occurredAt).toLocaleString()}</Text><Text style={styles.helperText}>{activity.publicReason || activity.type.replaceAll('_', ' ')}</Text>{activity.toStatus ? <Text style={{ color: colors.green, fontSize: 10, marginTop: 3 }}>{activity.fromStatus ? `${statusLabel(activity.fromStatus)} → ` : ''}{statusLabel(activity.toStatus)}</Text> : null}</View>) : <Text style={styles.helperText}>No activity recorded yet.</Text>}
    <Text style={[styles.eyebrow, { marginTop: 14 }]}>FIELDWORK EVENTS</Text>
    {(report.impactEvents || []).length ? report.impactEvents!.map((event) => <View key={event.id} style={{ padding: 11, borderRadius: 12, backgroundColor: '#F1F3EC', marginBottom: 8 }}><Text style={{ color: colors.green, fontSize: 11, fontWeight: '900' }}>{eventLabel(event.type)} · {new Date(event.date).toLocaleDateString()}</Text><Text style={{ color: colors.ink, fontSize: 12, lineHeight: 17, marginTop: 4 }}>{event.note}</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>Recorded by {event.actorRole}</Text>{event.photos?.length ? <ScrollView horizontal contentContainerStyle={{ gap: 8, marginTop: 8 }}>{event.photos.map((url, index) => <Image key={`${event.id}-${index}`} source={{ uri: url }} style={{ width: 120, height: 100, borderRadius: 10 }} />)}</ScrollView> : null}</View>) : <Text style={styles.helperText}>No inspections, treatments or follow-ups recorded.</Text>}
    <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 9 }}>A verified sighting confirms review of the observation; it does not prove treatment or ecological recovery.</Text>
  </>;
}

function RemovalCostDetails({ estimate, onRefresh }: { estimate: NonNullable<Report['removalEstimate']>; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const validRange = typeof estimate.lowUsd === 'number' && Number.isFinite(estimate.lowUsd) && estimate.lowUsd > 0
    && typeof estimate.highUsd === 'number' && Number.isFinite(estimate.highUsd) && estimate.highUsd >= estimate.lowUsd;
  const status = estimate.status === 'ready' && !validRange ? 'unavailable' : estimate.status;
  const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
  return <View style={{ marginTop: 13, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, overflow: 'hidden' }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)} style={{ padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>Removal cost estimate</Text><Text style={{ color: colors.ink, fontSize: 14, marginTop: 5 }}>{status === 'ready' ? `${money(estimate.lowUsd!)}–${money(estimate.highUsd!)} · one visit` : status === 'pending' ? 'Estimate being prepared' : status === 'stale' ? 'Reassessment needed · price hidden' : 'Estimate unavailable'}</Text></View>
      <Text style={{ color: colors.green, fontSize: 18, fontWeight: '800' }}>{expanded ? '−' : '+'}</Text>
    </Pressable>
    {expanded ? <View style={{ paddingHorizontal: 13, paddingBottom: 13, borderTopWidth: 1, borderTopColor: colors.border }}>
      {status === 'ready' ? <>
        <Text style={styles.helperText}>AI-generated ballpark from general model knowledge, not current vendor pricing. Get local quotes before making decisions.</Text>
        <Text style={{ color: colors.ink, fontSize: 14, lineHeight: 21, marginTop: 9 }}>Total estimated range: {money(estimate.lowUsd!)}–{money(estimate.highUsd!)} USD</Text>
        <Text style={styles.helperText}>Reported area: {typeof estimate.areaSqFt === 'number' && Number.isFinite(estimate.areaSqFt) && estimate.areaSqFt > 0 ? `${estimate.areaSqFt.toLocaleString()} sq ft` : 'Not provided'}</Text>
        {estimate.method && !estimate.method.startsWith('AI-generated ballpark') ? <Text style={styles.helperText}>Suggested approach: {estimate.method}</Text> : null}
        <Text style={styles.helperText}>This is a total range, not an itemized contractor quote. Labor, materials and disposal costs are not separately provided.</Text>
        {estimate.scope ? <Text style={styles.helperText}>Scope: {estimate.scope}</Text> : null}
        {estimate.exclusions ? <Text style={styles.helperText}>Excludes: {estimate.exclusions}</Text> : null}
        {estimate.rationale ? <Text style={styles.helperText}>Rationale: {estimate.rationale}</Text> : null}
        {estimate.assumptions ? <Text style={styles.helperText}>Assumptions: {estimate.assumptions}</Text> : null}
        <Text style={{ color: colors.muted, fontSize: 10, marginTop: 9 }}>Generated {estimate.generatedAt ? new Date(estimate.generatedAt).toLocaleDateString() : 'date unavailable'}</Text>
      </> : <>
        <Text style={styles.helperText}>{status === 'pending' ? 'A moderator-requested rough AI ballpark is being prepared. It will not use live pricing research.' : status === 'stale' ? 'A treatment was recorded. A moderator must confirm the remaining infested area before a new estimate can be published.' : 'An AI ballpark is not currently available. This does not affect the report or its verified status.'}</Text>
        <Pressable accessibilityRole="button" onPress={onRefresh} style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingVertical: 10 }}><Text style={{ color: colors.green, fontSize: 14, fontWeight: '700' }}>Refresh estimate status ↻</Text></Pressable>
      </>}
    </View> : null}
  </View>;
}
