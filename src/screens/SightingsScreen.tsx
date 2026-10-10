import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ActionButton, colors, styles } from '../components/shared';
import { SightingsVM } from '../hooks/useSightings';

export function SightingsScreen({vm}:{vm:SightingsVM}) {
 const {reports,setTab}=vm;
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState<'all'|'verified'|'unverified'>('all');
 const visible=useMemo(()=>reports.filter(r=>(filter==='all'||r.reviewStatus===filter)&&[r.speciesName,r.scientificName||'',r.note||''].join(' ').toLowerCase().includes(query.toLowerCase())),[reports,filter,query]);
 return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
  <Text style={styles.eyebrow}>ORANGE COUNTY · COMMUNITY</Text>
  <Text style={styles.headingSmall}>Sightings</Text>
  <Text style={styles.bodyCopy}>Browse plants reported by the community and see which sightings have been reviewed.</Text>
  <View style={{backgroundColor:colors.white,borderRadius:15,paddingHorizontal:14,marginBottom:11,borderWidth:1,borderColor:colors.border,flexDirection:'row',alignItems:'center'}}><Text style={{fontSize:17,marginRight:8}}>⌕</Text><TextInput placeholder="Search plants or notes" value={query} onChangeText={setQuery} placeholderTextColor="#8A988E" style={{height:46,color:colors.ink,flex:1}}/></View>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,marginBottom:16}}>{(['all','unverified','verified'] as const).map(f=><Pressable key={f} onPress={()=>setFilter(f)} style={{paddingVertical:9,paddingHorizontal:15,borderRadius:18,backgroundColor:filter===f?colors.green:'#E8EDE4'}}><Text style={{color:filter===f?colors.white:colors.ink,fontSize:11,fontWeight:'700'}}>{f==='all'?'All reports':f==='unverified'?'Awaiting review':'Verified'}</Text></Pressable>)}</ScrollView>
  <View style={[styles.sectionHead,{marginBottom:12}]}><View><Text style={styles.sectionTitle}>Recent reports</Text><Text style={{fontSize:11,color:colors.muted,marginTop:3}}>Reports stay unverified until reviewed.</Text></View><Text style={styles.sectionMeta}>{visible.length} found</Text></View>
  {visible.length===0?<View style={styles.emptyCard}><Text style={styles.emptyTitle}>{reports.length?'No matching sightings':'No sightings yet'}</Text><Text style={styles.emptyText}>{reports.length?'Try another search or filter.':'Share the first report to start building a community picture of local invasive plants.'}</Text><ActionButton title="Report a plant" onPress={()=>setTab('report')}/></View>:visible.map(report=><View key={report.id} style={styles.reportCard}>
   {report.photoUrl?<Image source={{uri:report.photoUrl}} style={styles.reportPhoto}/>:<View style={[styles.reportPhoto,styles.photoPlaceholder]}><Text>🌿</Text></View>}
   <View style={styles.reportInfo}><View style={styles.reportTopLine}><Text style={styles.reportName} numberOfLines={1}>{report.speciesName}</Text><View style={[styles.statusPill,report.reviewStatus==='verified'?styles.statusVerified:styles.statusUnverified]}><Text style={[styles.statusText,report.reviewStatus==='verified'&&{color:colors.green}]}>{report.reviewStatus.replace('_',' ')}</Text></View></View>
    <Text style={styles.reportDetail}>{report.isFiscListed?report.listedCategory:'Possible unlisted invasive'} · {new Date(report.observedAt).toLocaleDateString()}</Text>
    {report.note?<Text style={styles.reportNote} numberOfLines={2}>{report.note}</Text>:null}
    <Text style={styles.reportLocation}>{report.exactLocationPublic?'Precise location shared':'Approximate location'} · {report.latitude.toFixed(3)}, {report.longitude.toFixed(3)}</Text>
   </View>
  </View>)}
  <View style={styles.disclaimer}><Text style={styles.disclaimerTitle}>A list match is useful. A missing match is not a verdict.</Text><Text style={styles.disclaimerText}>The FISC catalog is a reference list, not an exhaustive inventory. Unlisted plants can still be reported as possible invasives and await expert review.</Text></View>
 </ScrollView>;
}
