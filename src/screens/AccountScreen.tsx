import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ActionButton, colors, contributorTitle, styles } from '../components/shared';
import { SightingsVM } from '../hooks/useSightings';

export function AccountScreen({ vm }: { vm: SightingsVM }) {
  const { authUser, authMode, setAuthMode, authName, setAuthName, authEmail, setAuthEmail, authPassword, setAuthPassword, authBusy, authenticate, signOut, userMetrics, moderatorMetrics, refreshAccountData, setLeaderboardVisibility } = vm;
  const title = contributorTitle(userMetrics?.verifiedReports || 0);
  return <ScrollView contentContainerStyle={[styles.content, { paddingTop: 25, paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
    <Text style={styles.eyebrow}>YOUR FIELDWORK</Text>
    <Text style={styles.headingSmall}>{authUser ? 'Your account' : 'Join the community'}</Text>
    <Text style={styles.bodyCopy}>Keep your sightings together and see how your observations support local stewardship.</Text>

    {!authUser ? <View style={{ backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16 }}>
      <View style={styles.modeToggle}>
        <Pressable onPress={() => setAuthMode('login')} style={[styles.modeButton, authMode === 'login' && styles.modeButtonActive]}><Text style={[styles.modeText, authMode === 'login' && styles.modeTextActive]}>Sign in</Text></Pressable>
        <Pressable onPress={() => setAuthMode('signup')} style={[styles.modeButton, authMode === 'signup' && styles.modeButtonActive]}><Text style={[styles.modeText, authMode === 'signup' && styles.modeTextActive]}>Create account</Text></Pressable>
      </View>
      {authMode === 'signup' ? <TextInput style={[styles.searchInput, { marginBottom: 10 }]} placeholder="Your name" placeholderTextColor="#91A098" value={authName} onChangeText={setAuthName} autoCapitalize="words" textContentType="name" /> : null}
      <TextInput style={[styles.searchInput, { marginBottom: 10 }]} placeholder="Email address" placeholderTextColor="#91A098" value={authEmail} onChangeText={setAuthEmail} autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" />
      <TextInput style={[styles.searchInput, { marginBottom: 12 }]} placeholder="Password (8+ characters)" placeholderTextColor="#91A098" value={authPassword} onChangeText={setAuthPassword} secureTextEntry textContentType={authMode === 'signup' ? 'newPassword' : 'password'} />
      {authMode === 'signup' ? <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 12 }}>Your name and email are linked privately to submitted sightings for project metrics. Public reports hide your identity; leaderboard names are anonymous unless you opt in later from this screen.</Text> : null}
      {authBusy ? <ActivityIndicator color={colors.green} /> : <ActionButton title={authMode === 'signup' ? 'Create community account' : 'Sign in'} onPress={() => void authenticate()} />}
      <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 12 }}>This demo account is for this shared project database. Use a password you do not use for another service.</Text>
    </View> : <>
      <View style={{ backgroundColor: colors.green, borderRadius: 20, padding: 17 }}>
        <Text style={{ color: '#D8E6D3', fontSize: 10, fontWeight: '800', letterSpacing: 1.3 }}>{authUser.role === 'moderator' ? 'MODERATOR ACCOUNT' : 'COMMUNITY MEMBER'}</Text>
        <Text style={{ color: '#FFFDF3', fontSize: 21, fontWeight: '800', marginTop: 7 }}>{authUser.displayName}</Text>
        <Text style={{ color: '#D8E6D3', fontSize: 12, marginTop: 3 }}>{authUser.email}</Text>
      </View>

      <View style={{ marginTop: 20, flexDirection: 'row', gap: 9 }}>
        {[
          ['Reports', userMetrics?.reportsSubmitted ?? '—'],
          ['Verified', userMetrics?.verifiedReports ?? '—'],
          ['Awaiting review', userMetrics?.awaitingReview ?? '—'],
        ].map(([label, value]) => <View key={label} style={{ flex: 1, backgroundColor: colors.pale, borderRadius: 15, padding: 12 }}><Text style={{ color: colors.green, fontSize: 22, fontWeight: '900' }}>{value}</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>{label}</Text></View>)}
      </View>
      {authUser.role === 'user' ? <View style={{ marginTop: 14, padding: 15, backgroundColor: '#F2EFE3', borderRadius: 17 }}>
        <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '800' }}>Your field title</Text>
        <Text style={{ color: colors.green, fontSize: 17, fontWeight: '900', marginTop: 5 }}>{title.name}</Text>
        <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 }}>{title.next ? `${Math.max(0, title.next.count - (userMetrics?.verifiedReports || 0))} more confirmed sighting${title.next.count - (userMetrics?.verifiedReports || 0) === 1 ? '' : 's'} to reach ${title.next.name}.` : 'You’ve reached the highest field title.'}</Text>
      </View> : null}
      <Pressable onPress={() => void refreshAccountData()} style={{ alignSelf: 'flex-start', paddingVertical: 11 }}><Text style={{ color: colors.green, fontSize: 12, fontWeight: '800' }}>Refresh contribution metrics ↻</Text></Pressable>

      {authUser.role === 'user' ? <Pressable onPress={() => void setLeaderboardVisibility(!authUser.leaderboardVisible)} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 3, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 13 }}>
        <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: authUser.leaderboardVisible ? colors.green : '#FFFFFF', borderColor: authUser.leaderboardVisible ? colors.green : '#A7B7A9', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 13 }}>{authUser.leaderboardVisible ? '✓' : ''}</Text></View>
        <View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontSize: 12, fontWeight: '800' }}>Show my name on the leaderboard</Text><Text style={{ color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 3 }}>{authUser.leaderboardVisible ? 'Your display name is visible with your report totals.' : 'You appear as Anonymous contributor.'}</Text></View>
      </Pressable> : null}

      {authUser.role === 'moderator' ? <View style={{ marginTop: 9 }}>
        <Text style={styles.eyebrow}>COMMUNITY METRICS</Text>
        <Text style={styles.sectionTitle}>Participation dashboard</Text>
        <Text style={styles.helperText}>Account identities and submission totals are visible only to the moderator. Public map cards stay anonymous.</Text>
        <View style={{ flexDirection: 'row', gap: 9, marginTop: 12 }}>
          {[
            ['Members', moderatorMetrics?.metrics.registeredUsers ?? '—'],
            ['All reports', moderatorMetrics?.metrics.reportsSubmitted ?? '—'],
            ['Verified', moderatorMetrics?.metrics.verifiedReports ?? '—'],
          ].map(([label, value]) => <View key={label} style={{ flex: 1, backgroundColor: '#F1EFE4', borderRadius: 15, padding: 12 }}><Text style={{ color: colors.ink, fontSize: 20, fontWeight: '900' }}>{value}</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>{label}</Text></View>)}
        </View>
        <View style={{ flexDirection: 'row', gap: 9, marginTop: 8 }}>
          {[
            ['Inspections', moderatorMetrics?.metrics.inspections ?? '—'],
            ['Treatments', moderatorMetrics?.metrics.treatments ?? '—'],
            ['Follow-ups', moderatorMetrics?.metrics.followUps ?? '—'],
          ].map(([label, value]) => <View key={label} style={{ flex: 1, backgroundColor: '#E8EEE5', borderRadius: 13, padding: 11 }}><Text style={{ color: colors.green, fontSize: 18, fontWeight: '900' }}>{value}</Text><Text style={{ color: colors.muted, fontSize: 9, marginTop: 4 }}>{label}</Text></View>)}
        </View>
        <Pressable onPress={() => vm.setTab('review')} style={{ marginTop: 14, backgroundColor: colors.green, borderRadius: 12, padding: 12, alignItems: 'center' }}><Text style={{ color: colors.white, fontSize: 12, fontWeight: '800' }}>Open moderator review queue →</Text></Pressable>
        <View style={{ marginTop: 15, backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          <Text style={{ padding: 14, color: colors.ink, fontSize: 14, fontWeight: '800' }}>Member contributions</Text>
          {moderatorMetrics?.contributors.length ? moderatorMetrics.contributors.map((member) => <View key={member.id} style={{ paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ color: colors.ink, fontSize: 13, fontWeight: '800' }}>{member.displayName}</Text>
            <Text style={{ color: colors.muted, fontSize: 10, marginTop: 3 }}>{member.email}</Text>
            <Text style={{ color: colors.green, fontSize: 11, fontWeight: '700', marginTop: 5 }}>{member.reportsSubmitted} reports · {member.verifiedReports} verified · {member.awaitingReview} awaiting review</Text>
          </View>) : <Text style={{ padding: 14, color: colors.muted, fontSize: 12 }}>{moderatorMetrics ? 'No community reports have been submitted yet.' : 'Metrics will appear when the API is reachable.'}</Text>}
        </View>
      </View> : <View style={{ marginTop: 20, backgroundColor: colors.white, borderRadius: 17, borderWidth: 1, borderColor: colors.border, padding: 15 }}>
        <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '800' }}>Your observations matter</Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 }}>Your profile details are used for private contribution metrics. Sightings shared on the community map don’t show your name or email.</Text>
      </View>}

      <View style={{ marginTop: 20 }}><ActionButton title="Sign out" onPress={() => void signOut()} secondary /></View>
    </>}
  </ScrollView>;
}
