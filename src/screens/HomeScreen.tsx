import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ActionButton, colors, styles, summarizeImpact } from '../components/shared';
import { SightingsVM } from '../hooks/useSightings';

export function HomeScreen({vm}:{vm:SightingsVM}) {
 const {reports,setTab}=vm;
 const verified=reports.filter(report=>report.reviewStatus==='verified').length;
 const impact=summarizeImpact(reports);
 return <ScrollView contentContainerStyle={[styles.content,{paddingTop:0,paddingBottom:34}]}>
  <View style={{backgroundColor:'#183E2E',marginHorizontal:-20,paddingHorizontal:23,paddingTop:29,paddingBottom:25,borderBottomLeftRadius:30,borderBottomRightRadius:30}}>
   <Text style={{fontSize:11,color:'#C9DDBE',fontWeight:'800',letterSpacing:1.8}}>SPOT THE SPREAD · ORANGE COUNTY</Text>
   <Text style={{fontSize:34,lineHeight:40,color:'#FFFDF3',fontWeight:'700',marginTop:18,fontFamily:'Georgia'}}>Small sightings.{ '\n' }A healthier home.</Text>
   <Text style={{fontSize:14,lineHeight:21,color:'#D4E2D5',marginTop:12}}>Our mission is to help neighbors notice and document invasive plants early, so local communities can better protect Florida’s natural places.</Text>
   <View style={{marginTop:20}}><ActionButton title="Report a plant  →" onPress={()=>setTab('report')}/></View>
  </View>

  <View style={{marginTop:22,flexDirection:'row',gap:10}}>
   <View style={{flex:1,backgroundColor:'#E8EEE5',borderRadius:17,padding:14}}><Text style={{fontSize:24,color:colors.green,fontWeight:'800'}}>{reports.length}</Text><Text style={{fontSize:11,color:colors.muted,marginTop:4}}>community sightings</Text></View>
   <View style={{flex:1,backgroundColor:'#F5EEDF',borderRadius:17,padding:14}}><Text style={{fontSize:24,color:'#8B5A12',fontWeight:'800'}}>{verified}</Text><Text style={{fontSize:11,color:colors.muted,marginTop:4}}>reviewed by moderators</Text></View>
  </View>
  <View style={{marginTop:10,backgroundColor:colors.white,borderRadius:17,borderWidth:1,borderColor:colors.border,padding:14}}><Text style={{fontSize:13,color:colors.ink,fontWeight:'800'}}>Recorded fieldwork</Text><Text style={{fontSize:10,color:colors.muted,marginTop:3}}>Follow-up records describe observations; they do not claim eradication.</Text><View style={{flexDirection:'row',gap:6,marginTop:11}}>{[['Verified sightings',impact.verified],['Inspections',impact.inspections],['Treatments',impact.treatments],['Follow-ups',impact.followUps]].map(([label,value])=><View key={String(label)} style={{flex:1,backgroundColor:'#F1F3EC',borderRadius:10,padding:8}}><Text style={{fontSize:17,color:colors.green,fontWeight:'900'}}>{value}</Text><Text style={{fontSize:8,color:colors.muted,marginTop:3}}>{label}</Text></View>)}</View></View>

  <View style={{marginTop:25}}><Text style={styles.eyebrow}>WHY IT MATTERS</Text><Text style={{fontSize:22,lineHeight:28,color:colors.ink,fontWeight:'700',fontFamily:'Georgia'}}>Local knowledge can make a difference.</Text><Text style={{fontSize:13,lineHeight:20,color:colors.muted,marginTop:8}}>Invasive plants can spread quickly and disrupt the places people and wildlife depend on. A photo and a rough location turn an individual observation into useful community awareness.</Text></View>

  <View style={{marginTop:22,backgroundColor:colors.white,borderWidth:1,borderColor:colors.border,borderRadius:20,padding:16}}>
   <Text style={{fontSize:16,color:colors.ink,fontWeight:'800'}}>How Spot the Spread works</Text>
   {[['01','Photograph','Capture a clear photo of a plant you’re concerned about.'],['02','Check','Review an optional AI suggestion and confirm or correct the name.'],['03','Share','Add the location; the community can see the report while it awaits review.']].map(([number,title,body])=><View key={number} style={{flexDirection:'row',gap:12,marginTop:15}}><View style={{width:29,height:29,borderRadius:15,backgroundColor:'#E8EEE5',alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:10,color:colors.green,fontWeight:'900'}}>{number}</Text></View><View style={{flex:1}}><Text style={{fontSize:13,color:colors.ink,fontWeight:'800'}}>{title}</Text><Text style={{fontSize:11,color:colors.muted,lineHeight:16,marginTop:2}}>{body}</Text></View></View>)}
  </View>

  <View style={{marginTop:22}}><Text style={styles.eyebrow}>GET INVOLVED</Text><Text style={{fontSize:21,color:colors.ink,fontWeight:'700',fontFamily:'Georgia'}}>Explore your community</Text><Text style={{fontSize:12,color:colors.muted,marginTop:4,marginBottom:12}}>See what neighbors have spotted around Orange County.</Text>
   <View style={{flexDirection:'row',gap:10}}>{[['⌖','Explore map','map'],['▤','Sightings','sightings']].map(([icon,label,destination])=><Pressable key={destination} onPress={()=>setTab(destination as 'map'|'sightings')} style={{flex:1,backgroundColor:'#E8EEE5',borderRadius:15,padding:14}}><Text style={{fontSize:19,color:colors.green}}>{icon}</Text><Text style={{fontSize:12,color:colors.ink,fontWeight:'800',marginTop:8}}>{label}  →</Text></Pressable>)}</View>
  </View>

  <Text style={{fontSize:10,lineHeight:15,color:colors.muted,marginTop:20}}>Reports are community observations, not expert determinations. AI suggestions may be wrong, and sightings remain unverified until reviewed.</Text>
 </ScrollView>;
}
