import React, { useMemo, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { ActionButton, colors, Report, styles } from '../components/shared';
import { SightingsVM } from '../hooks/useSightings';

const statusLabel = (status: string) => status.replace('_', ' ');
const eventLabel = (type: string) => type === 'follow-up' ? 'Follow-up' : type[0].toUpperCase() + type.slice(1);

export function SightingsScreen({ vm }: { vm: SightingsVM }) {
  const { reports, setTab } = vm;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unverified' | 'needs_review' | 'verified'>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const visible = useMemo(() => reports.filter((report) => (filter === 'all' || report.reviewStatus === filter) && [report.speciesName, report.scientificName || '', report.note || ''].join(' ').toLowerCase().includes(query.toLowerCase())), [reports, filter, query]);

  return <>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>ORANGE COUNTY · COMMUNITY</Text>
      <Text style={styles.headingSmall}>Sightings</Text>
      <Text style={styles.bodyCopy}>Open a report to see its photos, source, review activity and recorded fieldwork.</Text>
      <View style={{ backgroundColor: colors.white, borderRadius: 15, paddingHorizontal: 14, marginBottom: 11, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }}><Text style={{ fontSize: 17, marginRight: 8 }}>⌕</Text><TextInput placeholder="Search plants or notes" value={query} onChangeText={setQuery} placeholderTextColor="#8A988E" style={{ height: 46, color: colors.ink, flex: 1 }} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>{(['all', 'unverified', 'needs_review', 'verified'] as const).map((value) => <Pressable key={value} onPress={() => setFilter(value)} style={{ paddingVertical: 9, paddingHorizontal: 13, borderRadius: 18, backgroundColor: filter === value ? colors.green : '#E8EDE4' }}><Text style={{ color: filter === value ? colors.white : colors.ink, fontSize: 11, fontWeight: '700' }}>{value === 'all' ? 'All reports' : value === 'unverified' ? 'Unverified' : value === 'needs_review' ? 'Needs review' : 'Verified'}</Text></Pressable>)}</ScrollView>
      <View style={[styles.sectionHead, { marginBottom: 12 }]}><View><Text style={styles.sectionTitle}>Recent reports</Text><Text style={{ fontSize: 11, color: colors.muted, marginTop: 3 }}>Reports stay unverified until reviewed.</Text></View><Text style={styles.sectionMeta}>{visible.length} found</Text></View>
      {visible.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{reports.length ? 'No matching sightings' : 'No sightings yet'}</Text><Text style={styles.emptyText}>{reports.length ? 'Try another search or filter.' : 'Share the first report to start building a community picture of local invasive plants.'}</Text><ActionButton title="Report a plant" onPress={() => setTab('report')} /></View> : visible.map((report) => <ReportCard key={report.id} report={report} onOpen={() => setSelectedReport(report)} />)}
      <View style={styles.disclaimer}><Text style={styles.disclaimerTitle}>A list match is useful. A missing match is not a verdict.</Text><Text style={styles.disclaimerText}>The FISC catalog is a reference list, not an exhaustive inventory. Unlisted plants can still be reported as possible invasives and await expert review.</Text></View>
    </ScrollView>
    <Modal visible={Boolean(selectedReport)} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setSelectedReport(null)}>
      <SafeAreaView style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0007' }}>
        <View style={{ height: '92%', backgroundColor: colors.paper, borderTopLeftRadius: 25, borderTopRightRadius: 25, overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 19, paddingTop: 13, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}><Text style={styles.eyebrow}>SIGHTING DETAILS</Text><Text style={{ color: colors.ink, fontSize: 20, fontWeight: '800' }} numberOfLines={1}>{selectedReport?.speciesName || 'Report'}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close report details" onPress={() => setSelectedReport(null)} style={{ width: 38, height: 38, borderRadius: 20, backgroundColor: '#E8EDE4', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.ink, fontSize: 24, lineHeight: 27 }}>×</Text></Pressable>
          </View>
          {selectedReport ? <ScrollView contentContainerStyle={{ padding: 17, paddingBottom: 36 }}><ReportDetails report={selectedReport} /></ScrollView> : null}
        </View>
      </SafeAreaView>
    </Modal>
  </>;
}

function ReportCard({ report, onOpen }: { report: Report; onOpen: () => void }) {
  const primaryPhoto = report.photos?.find((photo) => photo.isPrimary) || report.photos?.[0];
  const photoUrl = primaryPhoto?.url || report.photoUrl;
  const badgeColor = report.reviewStatus === 'verified' ? colors.green : report.reviewStatus === 'needs_review' ? '#72549A' : colors.amber;
  return <Pressable onPress={onOpen} accessibilityRole="button" style={[styles.reportCard, { padding: 12 }]}>
    {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.reportPhoto} /> : <View style={[styles.reportPhoto, styles.photoPlaceholder]}><Text>🌿</Text></View>}
    <View style={[styles.reportInfo, { minWidth: 0 }]}><View style={styles.reportTopLine}><Text style={styles.reportName} numberOfLines={1}>{report.speciesName}</Text><View style={[styles.statusPill, { backgroundColor: report.reviewStatus === 'verified' ? colors.pale : report.reviewStatus === 'needs_review' ? '#F0EAF7' : colors.amberPale }]}><Text style={[styles.statusText, { color: badgeColor }]}>{statusLabel(report.reviewStatus)}</Text></View></View>
      <Text style={styles.reportDetail}>{report.isFiscListed ? report.listedCategory || 'FISC-listed' : 'Possible unlisted invasive'} · {new Date(report.observedAt).toLocaleDateString()}</Text>
      {report.note ? <Text style={styles.reportNote} numberOfLines={2}>{report.note}</Text> : null}
      <Text style={styles.reportLocation}>{report.exactLocationPublic ? 'Precise location shared' : 'Approximate location'} · {report.latitude.toFixed(3)}, {report.longitude.toFixed(3)}</Text>
      <Text style={{ color: colors.green, fontSize: 10, fontWeight: '800', marginTop: 7 }}>View report details →</Text>
    </View>
  </Pressable>;
}

function ReportDetails({ report }: { report: Report }) {
  const photos = report.photos?.length ? report.photos : report.photoUrl ? [{ id: `${report.id}-primary`, url: report.photoUrl, isPrimary: true, position: 0 }] : [];
  return <>
    {photos.length ? <><Text style={styles.eyebrow}>REPORT PHOTOS · {photos.length}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>{photos.map((photo) => <View key={photo.id}><Image source={{ uri: photo.url }} style={{ width: 220, height: 185, borderRadius: 14, backgroundColor: colors.pale }} />{photo.isPrimary ? <Text style={{ color: colors.green, fontSize: 10, fontWeight: '800', marginTop: 4 }}>Primary photo · Gemini input</Text> : <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>Supporting angle</Text>}</View>)}</ScrollView></> : null}
    <Text style={styles.eyebrow}>IDENTIFICATION</Text>
    {report.scientificName ? <Text style={{ color: colors.ink, fontSize: 12, fontStyle: 'italic', marginBottom: 4 }}>{report.scientificName}</Text> : null}
    <Text style={styles.helperText}>{report.isFiscListed ? `Listed in ${report.listedCategory || 'the FISC catalog'}.` : 'Not found in the FISC catalog; this does not establish that the plant is non-invasive.'}</Text>
    {report.sourceUrl ? <Text style={{ color: colors.green, fontSize: 11, fontWeight: '800', textDecorationLine: 'underline', marginTop: 5 }} onPress={() => void Linking.openURL(report.sourceUrl!).catch(() => Alert.alert('Could not open source', 'Check your internet connection.'))}>View FISC source ↗</Text> : null}
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
