import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { ActionButton, colors, contributorTitle, styles } from '../components/shared';
import { SightingsVM } from '../hooks/useSightings';

export function MetricsScreen({ vm }: { vm: SightingsVM }) {
  const { communityMetrics, refreshCommunityMetrics, refreshAccountData, communityTrends, trendsLoading, trendsError, refreshCommunityTrends, authToken, authUser, userMetrics, setTab, moderationQueue, reviewReport } = vm;
  const [trendInterval, setTrendInterval] = useState<'week' | 'month'>('week');
  const [trendRange, setTrendRange] = useState<'30d' | '90d' | '6m' | '1y' | 'all'>('90d');
  const data = communityMetrics;
  const title = contributorTitle(userMetrics?.verifiedReports || 0);
  const speciesMax = Math.max(1, ...(data?.topSpecies.map((item) => item.count) || []));
  const locationMax = Math.max(1, ...(data?.topLocations.map((item) => item.count) || []));
  const pendingReports = moderationQueue.filter((report) => ['unverified', 'needs_review'].includes(report.reviewStatus));
  const formatDate = (value?: string) => {
    if (!value) return 'Not provided';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };
  useEffect(() => { void refreshCommunityTrends(trendInterval, trendRange); }, [trendInterval, trendRange]);
  const trendPoints = communityTrends?.interval === trendInterval && communityTrends.range === trendRange ? communityTrends.points : [];
  const maxTrendCount = Math.max(1, ...trendPoints.flatMap((point) => [point.submitted, point.confirmed]));
  const rangeLabels = [['30d', '30 days'], ['90d', '90 days'], ['6m', '6 mo'], ['1y', '1 year'], ['all', 'All'] ] as const;
  const formatPeriod = (value: string) => {
    const date = new Date(`${value}T00:00:00Z`);
    return trendInterval === 'week'
      ? date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', timeZone: 'UTC' })
      : date.toLocaleDateString(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' });
  };

  return <ScrollView contentContainerStyle={[styles.content, { paddingTop: 24, paddingBottom: 42 }]}>
    <Text style={styles.eyebrow}>THE COMMUNITY FIELD REPORT</Text>
    <Text style={styles.headingSmall}>Our impact, in the field</Text>
    <Text style={styles.bodyCopy}>Patterns from local sightings help neighbors and land stewards see what’s spreading. Only moderator-confirmed reports shape species and location trends.</Text>

    <View style={{ backgroundColor: colors.green, borderRadius: 22, padding: 17 }}>
      <Text style={{ color: '#D9E7D5', fontSize: 10, fontWeight: '800', letterSpacing: 1.3 }}>ORANGE COUNTY COMMUNITY</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        {[
          ['Reports', data?.summary.reportsSubmitted ?? '—'],
          ['Confirmed', data?.summary.confirmedReports ?? '—'],
          ['Awaiting review', data?.summary.awaitingReview ?? '—'],
        ].map(([label, count]) => <View key={label} style={{ flex: 1, backgroundColor: '#FFFFFF18', borderRadius: 14, padding: 11 }}><Text style={{ color: '#FFFDF3', fontSize: 21, fontWeight: '900' }}>{count}</Text><Text style={{ color: '#D9E7D5', fontSize: 9, marginTop: 4 }}>{label}</Text></View>)}
      </View>
    </View>
    <Pressable onPress={() => { void refreshCommunityMetrics(); void refreshCommunityTrends(trendInterval, trendRange); if (authToken) void refreshAccountData(); }} style={{ alignSelf: 'flex-start', paddingVertical: 11 }}><Text style={{ color: colors.green, fontSize: 12, fontWeight: '800' }}>Refresh metrics ↻</Text></Pressable>

    <View style={{ marginTop: 13, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 15 }}>
      <Text style={styles.eyebrow}>SIGHTINGS OVER TIME</Text>
      <Text style={styles.sectionTitle}>Reports submitted & confirmed</Text>
      <Text style={styles.helperText}>Submissions are grouped by upload date; confirmations by moderator review date.</Text>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 13, backgroundColor: colors.paper, borderRadius: 13, padding: 4 }}>
        {([['week', 'Weekly'], ['month', 'Monthly']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: trendInterval === value }} onPress={() => setTrendInterval(value)} style={{ flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 9, backgroundColor: trendInterval === value ? colors.green : 'transparent' }}><Text style={{ color: trendInterval === value ? colors.white : colors.muted, fontSize: 11, fontWeight: '800' }}>{label}</Text></Pressable>)}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 10 }}>
        {rangeLabels.map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: trendRange === value }} onPress={() => setTrendRange(value)} style={{ borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: trendRange === value ? '#E5EDE3' : colors.paper }}><Text style={{ color: trendRange === value ? colors.green : colors.muted, fontSize: 10, fontWeight: '800' }}>{label}</Text></Pressable>)}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 14, marginBottom: 3 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green }} /><Text style={{ color: colors.muted, fontSize: 9 }}>Submitted</Text></View><View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#B28A47' }} /><Text style={{ color: colors.muted, fontSize: 9 }}>Confirmed</Text></View></View>
      <Text style={{ color: colors.muted, fontSize: 8, marginTop: 2 }}>Numbers under each period: submitted · confirmed</Text>
      {trendsLoading && !communityTrends ? <View style={{ minHeight: 150, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.green} /><Text style={styles.helperText}>Loading trend data…</Text></View> : trendsError ? <View style={{ minHeight: 125, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.red, fontSize: 11, textAlign: 'center' }}>{trendsError}</Text></View> : trendPoints.length ? <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ alignItems: 'flex-end', gap: 7, paddingTop: 12, paddingBottom: 4 }}>
        {trendPoints.map((point) => <View key={point.period} accessibilityLabel={`${formatPeriod(point.period)}: ${point.submitted} submitted, ${point.confirmed} confirmed`} style={{ width: 48, alignItems: 'center' }}>
          <View style={{ height: 112, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
            <View style={{ width: 15, height: Math.max(2, point.submitted / maxTrendCount * 104), borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: colors.green }} />
            <View style={{ width: 15, height: Math.max(2, point.confirmed / maxTrendCount * 104), borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: '#B28A47' }} />
          </View>
          <Text style={{ color: colors.muted, fontSize: 9, marginTop: 6 }}>{formatPeriod(point.period)}</Text>
          <Text style={{ color: colors.ink, fontSize: 8, marginTop: 2 }}>{point.submitted} · {point.confirmed}</Text>
        </View>)}
      </ScrollView> : trendsLoading ? <View style={{ minHeight: 150, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.green} /></View> : <View style={{ minHeight: 125, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center' }}>No reports in this date range yet. Try a wider range or check back after new sightings are submitted.</Text></View>}
    </View>

    {authUser?.role === 'moderator' ? <View style={{ marginTop: 16 }}>
      <Text style={styles.eyebrow}>MODERATOR TOOLS</Text>
      <Text style={styles.sectionTitle}>Reports awaiting review</Text>
      <Text style={styles.helperText}>Confirm valid sightings to include them in community trends and contributor titles.</Text>
      {pendingReports.length ? pendingReports.map((report) => <View key={report.id} style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 14, marginTop: 10 }}>
        {(report.photos || []).length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -14, marginTop: -14, marginBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}>{(report.photos || []).map((photo) => <Image key={photo.id} source={{ uri: photo.url }} accessibilityLabel="Sighting report photo" style={{ width: 230, height: 170, borderRadius: 14, backgroundColor: colors.pale }} />)}</ScrollView> : <View style={{ backgroundColor: colors.pale, borderRadius: 13, padding: 14, marginBottom: 12 }}><Text style={{ color: colors.muted, fontSize: 11 }}>No photo attached to this report.</Text></View>}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}><Text style={{ color: colors.ink, fontSize: 14, fontWeight: '800', flex: 1 }}>{report.speciesName}</Text><Text style={{ color: colors.amber, backgroundColor: colors.amberPale, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, fontSize: 9, fontWeight: '800' }}>{report.reviewStatus.replace('_', ' ').toUpperCase()}</Text></View>
        {report.scientificName ? <Text style={{ color: colors.muted, fontSize: 11, fontStyle: 'italic', marginTop: 3 }}>{report.scientificName}</Text> : null}
        <View style={{ backgroundColor: colors.paper, borderRadius: 12, padding: 11, marginTop: 11 }}>
          <Text style={{ color: colors.ink, fontSize: 11, lineHeight: 18 }}>Reporter: {report.reporter?.displayName || 'Community member'}</Text>
          <Text style={{ color: colors.ink, fontSize: 11, lineHeight: 18 }}>Observed: {formatDate(report.observedAt)}</Text>
          <Text style={{ color: colors.ink, fontSize: 11, lineHeight: 18 }}>Submitted: {formatDate(report.created)}</Text>
          <Text style={{ color: colors.ink, fontSize: 11, lineHeight: 18 }}>Area: {report.locationLabel || 'Orange County, FL'}</Text>
          <Text style={{ color: colors.ink, fontSize: 11, lineHeight: 18 }}>Coordinates: {typeof report.latitude === 'number' && typeof report.longitude === 'number' ? `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}` : 'Unavailable'}{report.exactLocationPublic ? ' · exact location public' : ' · public map location is approximate'}</Text>
          <Text style={{ color: colors.ink, fontSize: 11, lineHeight: 18 }}>FISC catalog: {report.isFiscListed ? `Listed${report.listedCategory ? ` · ${report.listedCategory}` : ''}` : 'Not listed / possible unlisted invasive'}</Text>
          {report.sourceUrl ? <Text accessibilityRole="link" onPress={() => { void Linking.openURL(report.sourceUrl!).catch(() => {}); }} style={{ color: colors.green, fontSize: 11, lineHeight: 18, textDecorationLine: 'underline' }}>Open FISC source</Text> : null}
          <Text style={{ color: colors.ink, fontSize: 11, lineHeight: 18 }}>Report ID: {report.id}</Text>
        </View>
        {report.geminiSuggestion ? <View style={{ marginTop: 10 }}><Text style={{ color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: .7 }}>AI SUGGESTION · UNVERIFIED</Text><Text style={{ color: colors.ink, fontSize: 11, lineHeight: 16, marginTop: 4 }}>{report.geminiSuggestion}</Text></View> : null}
        <View style={{ marginTop: 10 }}><Text style={{ color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: .7 }}>REPORTER NOTES</Text><Text style={{ color: colors.ink, fontSize: 11, lineHeight: 16, marginTop: 4 }}>{report.note?.trim() || 'No notes provided.'}</Text></View>
        {(report.activity || []).length ? <View style={{ marginTop: 10 }}><Text style={{ color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: .7 }}>REVIEW HISTORY</Text>{report.activity!.map((event) => <Text key={event.id} style={{ color: colors.ink, fontSize: 10, lineHeight: 15, marginTop: 4 }}>{formatDate(event.occurredAt)} · {event.type.replaceAll('_', ' ')}{event.publicReason ? ` — ${event.publicReason}` : ''}</Text>)}</View> : null}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 11 }}>
          <View style={{ flex: 1 }}><ActionButton title="Confirm sighting" onPress={() => { void reviewReport(report.id, 'verified'); }} /></View>
          <View style={{ flex: 1 }}><ActionButton title="Needs review" onPress={() => { void reviewReport(report.id, 'needs_review'); }} secondary /></View>
        </View>
      </View>) : <View style={styles.emptyCard}><Text style={styles.helperText}>No reports are waiting for review.</Text></View>}
    </View> : null}

    {!data ? <View style={styles.emptyCard}><ActivityIndicator color={colors.green} /><Text style={[styles.helperText, { textAlign: 'center' }]}>Connect to the API to load community metrics.</Text></View> : <>
      <View style={{ marginTop: 14 }}>
        <Text style={styles.eyebrow}>WHAT’S SHOWING UP</Text>
        <Text style={styles.sectionTitle}>Most reported species</Text>
        <Text style={styles.helperText}>Ranked by moderator-confirmed sightings.</Text>
        <View style={{ backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, marginTop: 11 }}>
          {data.topSpecies.length ? data.topSpecies.map((item, index) => <View key={`${item.scientificName}-${item.name}`} style={{ paddingVertical: 13, borderBottomWidth: index === data.topSpecies.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><Text style={{ color: colors.ink, fontSize: 13, fontWeight: '800', flex: 1 }}>{item.name}</Text><Text style={{ color: colors.green, fontSize: 13, fontWeight: '900' }}>{item.count}</Text></View>
            {item.scientificName ? <Text style={{ color: colors.muted, fontSize: 10, fontStyle: 'italic', marginTop: 3 }}>{item.scientificName}</Text> : null}
            <View style={{ height: 5, backgroundColor: '#E9EEE6', borderRadius: 5, marginTop: 8, overflow: 'hidden' }}><View style={{ height: '100%', width: `${Math.max(6, item.count / speciesMax * 100)}%`, backgroundColor: colors.green, borderRadius: 5 }} /></View>
          </View>) : <Text style={{ color: colors.muted, fontSize: 12, paddingVertical: 15 }}>No confirmed species trends yet. They’ll appear as reports are reviewed.</Text>}
        </View>
      </View>

      <View style={{ marginTop: 23 }}>
        <Text style={styles.eyebrow}>WHERE THEY’RE APPEARING</Text>
        <Text style={styles.sectionTitle}>Sightings by area</Text>
        <Text style={styles.helperText}>Areas are grouped at city or county level; precise pins aren’t shown here.</Text>
        <View style={{ backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, marginTop: 11 }}>
          {data.topLocations.length ? data.topLocations.map((item, index) => <View key={item.name} style={{ paddingVertical: 13, borderBottomWidth: index === data.topLocations.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: colors.ink, fontSize: 13, fontWeight: '800' }}>{item.name}</Text><Text style={{ color: colors.green, fontSize: 13, fontWeight: '900' }}>{item.count}</Text></View>
            <View style={{ height: 5, backgroundColor: '#E9EEE6', borderRadius: 5, marginTop: 8, overflow: 'hidden' }}><View style={{ height: '100%', width: `${Math.max(6, item.count / locationMax * 100)}%`, backgroundColor: '#B28A47', borderRadius: 5 }} /></View>
          </View>) : <Text style={{ color: colors.muted, fontSize: 12, paddingVertical: 15 }}>No confirmed location patterns yet.</Text>}
        </View>
      </View>

      <View style={{ marginTop: 23 }}>
        <Text style={styles.eyebrow}>COMMUNITY RECOGNITION</Text>
        <Text style={styles.sectionTitle}>Fieldwork leaderboard</Text>
        <Text style={styles.helperText}>Ranked by total uploads. Titles are earned only through moderator-confirmed reports.</Text>
        <View style={{ backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginTop: 11 }}>
          {data.leaderboard.length ? data.leaderboard.map((member) => <View key={member.rank} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#E8EEE5', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.green, fontSize: 12, fontWeight: '900' }}>{member.rank}</Text></View>
            <View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontSize: 12, fontWeight: '800' }}>{member.name}</Text><Text style={{ color: colors.green, fontSize: 10, marginTop: 3 }}>{member.title}</Text></View>
            <View style={{ alignItems: 'flex-end' }}><Text style={{ color: colors.ink, fontSize: 14, fontWeight: '900' }}>{member.reportsSubmitted}</Text><Text style={{ color: colors.muted, fontSize: 9 }}>uploads · {member.confirmedReports} confirmed</Text></View>
          </View>) : <Text style={{ color: colors.muted, fontSize: 12, padding: 15 }}>The leaderboard will begin when community members submit reports.</Text>}
        </View>
      </View>
    </>}

    <View style={{ marginTop: 23 }}>
      <Text style={styles.eyebrow}>EARN YOUR FIELD TITLES</Text>
      <Text style={styles.sectionTitle}>Every confirmed sighting counts</Text>
      <Text style={styles.helperText}>Titles use the number of reports a moderator has confirmed.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 11 }}>
        {[[1, 'Nature Novice'], [5, 'Plant Purveyor'], [10, 'Tree Hugger'], [20, 'Charles Darwin']].map(([threshold, name]) => <View key={String(threshold)} style={{ width: '48%', backgroundColor: colors.pale, borderRadius: 15, padding: 13 }}><Text style={{ color: colors.green, fontSize: 11, fontWeight: '900' }}>{name}</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>{threshold}+ confirmed</Text></View>)}
      </View>
    </View>

    {authUser?.role === 'user' ? <View style={{ marginTop: 22, backgroundColor: '#F2EFE3', borderRadius: 18, padding: 15 }}>
      <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '800' }}>Your title · {title.name}</Text>
      <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 5 }}>{title.next ? `${Math.max(0, title.next.count - (userMetrics?.verifiedReports || 0))} more confirmed ${title.next.count - (userMetrics?.verifiedReports || 0) === 1 ? 'sighting' : 'sightings'} to reach ${title.next.name}.` : 'You’ve reached the highest field title. Thank you for helping the community keep watch.'}</Text>
    </View> : authUser ? null : <View style={{ marginTop: 22 }}><ActionButton title="Sign in to see your title" onPress={() => setTab('account')} secondary /></View>}
    <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 18 }}>These are community observations, not a complete ecological survey. Reports only count as confirmed after moderator review.</Text>
  </ScrollView>;
}
