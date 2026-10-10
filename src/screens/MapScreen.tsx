import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ActionButton, MapPanel, ORLANDO, colors, styles } from '../components/shared';
import { SightingsVM } from '../hooks/useSightings';

export function MapScreen({vm}:{vm:SightingsVM}) {
 const {reports,setTab}=vm;
 const verified=reports.filter(report=>report.reviewStatus==='verified').length;
 return <ScrollView contentContainerStyle={[styles.content,{paddingTop:0}]}>
  <View style={{backgroundColor:'#183E2E',marginHorizontal:-20,paddingHorizontal:22,paddingTop:25,paddingBottom:22,borderBottomLeftRadius:28,borderBottomRightRadius:28,marginBottom:20}}>
   <Text style={{fontSize:11,color:'#C9DDBE',fontWeight:'800',letterSpacing:1.7}}>SPOT THE SPREAD · ORANGE COUNTY</Text>
   <Text style={{fontSize:31,lineHeight:36,color:'#FFFDF3',fontWeight:'700',marginTop:13,fontFamily:'Georgia'}}>Know what’s{ '\n' }growing nearby.</Text>
   <Text style={{fontSize:13,lineHeight:19,color:'#D4E2D5',marginTop:8,maxWidth:300}}>Community sightings help us notice invasive plants earlier and protect the places we love.</Text>
   <View style={{flexDirection:'row',gap:10,marginTop:18}}>
    <View style={{flex:1,backgroundColor:'#FFFFFF18',borderRadius:15,padding:12}}><Text style={{fontSize:23,color:'#FFFDF3',fontWeight:'800'}}>{reports.length}</Text><Text style={{fontSize:10,color:'#D4E2D5',marginTop:2}}>community reports</Text></View>
    <View style={{flex:1,backgroundColor:'#FFFFFF18',borderRadius:15,padding:12}}><Text style={{fontSize:23,color:'#FFFDF3',fontWeight:'800'}}>{verified}</Text><Text style={{fontSize:10,color:'#D4E2D5',marginTop:2}}>reviewed sightings</Text></View>
   </View>
  </View>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:11}}><View><Text style={{fontSize:21,color:colors.ink,fontWeight:'700',fontFamily:'Georgia'}}>Sightings map</Text><Text style={{fontSize:11,color:colors.muted,marginTop:3}}>Possible invasive plants near you</Text></View><Text style={{fontSize:10,color:colors.green,fontWeight:'800'}}>LIVE MAP</Text></View>
  <View style={styles.mapWrap}><MapPanel center={ORLANDO} reports={reports} height={350}/></View>
  <View style={styles.mapLegend}><View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:'#bb7917'}]}/><Text style={styles.legendText}>Awaiting review</Text></View><View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:'#28734d'}]}/><Text style={styles.legendText}>Verified</Text></View><Text style={styles.attribution}>© OpenStreetMap</Text></View>
  <View style={{backgroundColor:'#EAF0E6',borderRadius:18,padding:16,marginTop:2,marginBottom:12}}><Text style={{fontSize:15,color:colors.ink,fontWeight:'800'}}>Notice something unusual?</Text><Text style={{fontSize:12,lineHeight:18,color:colors.muted,marginTop:5,marginBottom:12}}>Add a photo and location to help build a shared picture of what’s growing nearby.</Text><ActionButton title="Report a plant" onPress={()=>setTab('report')} small/></View>
 </ScrollView>;
}
