import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ActionButton, MapPanel, ORLANDO, colors, Report, ScreenGuide, styles, summarizeImpact } from '../components/shared';
import { BrandWordmark } from '../components/BrandWordmark';
import { SightingsVM } from '../hooks/useSightings';

export function MapScreen({vm}:{vm:SightingsVM}) {
 const {reports,setTab,mapCenter,mapLocationMessage,locateMapCenter,openSightingsForPlant}=vm;
 const [statusFilter,setStatusFilter]=useState<'all'|'verified'|'unverified'>('all');
 const [genusFilter,setGenusFilter]=useState('all');
 useEffect(()=>{void locateMapCenter();},[locateMapCenter]);
 const verified=reports.filter(report=>report.reviewStatus==='verified').length;
 const genusOf=(report:Report)=>{
  const genus=report.scientificName?.trim().split(/\s+/)[0];
  return genus ? `${genus[0].toUpperCase()}${genus.slice(1)}` : 'Unknown genus';
 };
 const genera=useMemo(()=>[...new Set(reports.map(genusOf))].sort((a,b)=>a.localeCompare(b)),[reports]);
 const mapReports=useMemo(()=>reports.filter(report=>{
  const statusMatches=statusFilter==='all'||(statusFilter==='verified'?report.reviewStatus==='verified':report.reviewStatus==='unverified'||report.reviewStatus==='needs_review');
  return statusMatches&&(genusFilter==='all'||genusOf(report)===genusFilter);
 }),[reports,statusFilter,genusFilter]);
 const impact=summarizeImpact(mapReports);
 return <ScrollView contentContainerStyle={[styles.content,{paddingTop:0}]}>
  <View style={{backgroundColor:'#183E2E',marginHorizontal:-20,paddingHorizontal:22,paddingTop:25,paddingBottom:22,borderBottomLeftRadius:28,borderBottomRightRadius:28,marginBottom:20}}>
   <BrandWordmark />
   <Text style={{fontSize:9,color:'#C9DDBE',fontWeight:'800',letterSpacing:1.7,marginTop:5}}>FLORIDA · COMMUNITY FIELD GUIDE</Text>
   <Text style={{fontSize:31,lineHeight:36,color:'#FFFDF3',fontWeight:'700',marginTop:13,fontFamily:'Georgia'}}>Know what’s{ '\n' }growing nearby.</Text>
   <Text style={{fontSize:13,lineHeight:19,color:'#D4E2D5',marginTop:8,maxWidth:300}}>Community sightings help us notice invasive plants earlier and protect the places we love.</Text>
   <View style={{flexDirection:'row',gap:10,marginTop:18}}>
    <View style={{flex:1,backgroundColor:'#FFFFFF18',borderRadius:15,padding:12}}><Text style={{fontSize:23,color:'#FFFDF3',fontWeight:'800'}}>{reports.length}</Text><Text style={{fontSize:10,color:'#D4E2D5',marginTop:2}}>community reports</Text></View>
    <View style={{flex:1,backgroundColor:'#FFFFFF18',borderRadius:15,padding:12}}><Text style={{fontSize:23,color:'#FFFDF3',fontWeight:'800'}}>{verified}</Text><Text style={{fontSize:10,color:'#D4E2D5',marginTop:2}}>reviewed sightings</Text></View>
   </View>
  </View>
  <ScreenGuide items={[
   {label:'Map pins',detail:'Each pin is one community report. Tap it to see the submitted plant and review status.',scope:'Shared data'},
   {label:'Filter the pins',detail:'Choose a plant genus and whether to show verified or unverified reports. The map updates to match.',scope:'This view'},
   {label:'Pin colors',detail:'Green means moderator-verified; amber means not yet verified.',scope:'This view'},
   {label:'Fieldwork totals',detail:'Separate counts show verified reports, inspections, treatments and follow-ups. They are different kinds of activity.',scope:'Shared data'},
  ]}/>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:5}}><View><Text style={{fontSize:21,color:colors.ink,fontWeight:'700',fontFamily:'Georgia'}}>Sightings map</Text><Text style={{fontSize:11,color:colors.muted,marginTop:3}}>Possible invasive plants near you</Text></View><Text style={{fontSize:10,color:colors.green,fontWeight:'800'}}>LIVE MAP</Text></View>
  <Text style={{fontSize:10,color:colors.muted,fontWeight:'800',marginTop:10,marginBottom:7}}>REVIEW STATUS</Text>
  <View style={{flexDirection:'row',gap:7,marginBottom:10}}>{([['all','All'],['verified','Verified'],['unverified','Unverified']] as const).map(([value,label])=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:statusFilter===value}} onPress={()=>setStatusFilter(value)} style={{borderRadius:18,paddingVertical:8,paddingHorizontal:13,backgroundColor:statusFilter===value?colors.green:'#EEF0E8',borderWidth:1,borderColor:statusFilter===value?colors.green:colors.border}}><Text style={{fontSize:11,fontWeight:'800',color:statusFilter===value?colors.white:colors.ink}}>{label}</Text></Pressable>)}</View>
  <Text style={{fontSize:10,color:colors.muted,fontWeight:'800',marginBottom:7}}>PLANT GENUS</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:7,paddingBottom:8}}>{[['all','All genera'],...genera.map(genus=>[genus,genus])].map(([value,label])=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:genusFilter===value}} onPress={()=>setGenusFilter(value)} style={{borderRadius:18,paddingVertical:8,paddingHorizontal:13,backgroundColor:genusFilter===value?'#DDE8D9':colors.white,borderWidth:1,borderColor:genusFilter===value?colors.green:colors.border}}><Text style={{fontSize:11,fontWeight:'800',color:colors.green}}>{label}</Text></Pressable>)}</ScrollView>
  <Text style={{fontSize:10,color:colors.muted,marginBottom:8}}>{mapReports.length} {mapReports.length===1?'report':'reports'} shown</Text>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:10}}><Text style={{color:colors.muted,fontSize:10,flex:1,marginRight:8}}>{mapLocationMessage}</Text><Pressable accessibilityRole="button" onPress={()=>void locateMapCenter()} style={{paddingVertical:8,paddingHorizontal:10,backgroundColor:'#E8EEE5',borderRadius:10}}><Text style={{color:colors.green,fontSize:10,fontWeight:'800'}}>Center on me</Text></Pressable></View>
  <View style={styles.mapWrap}><MapPanel center={mapCenter || ORLANDO} reports={mapReports} onReportSelect={openSightingsForPlant} height={350}/></View>
  <View style={styles.mapLegend}><View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:'#bb7917'}]}/><Text style={styles.legendText}>Awaiting review</Text></View><View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:'#28734d'}]}/><Text style={styles.legendText}>Verified</Text></View><Text style={styles.attribution}>© OpenStreetMap</Text></View>
  <View style={{backgroundColor:colors.white,borderWidth:1,borderColor:colors.border,borderRadius:17,padding:14,marginBottom:14}}><Text style={{fontSize:13,color:colors.ink,fontWeight:'800'}}>Community fieldwork totals</Text><View style={{flexDirection:'row',gap:6,marginTop:10}}>{[['Verified',impact.verified],['Inspections',impact.inspections],['Treatments',impact.treatments],['Follow-ups',impact.followUps]].map(([label,value])=><View key={String(label)} style={{flex:1,backgroundColor:'#F1F3EC',borderRadius:10,padding:8}}><Text style={{fontSize:17,color:colors.green,fontWeight:'900'}}>{value}</Text><Text style={{fontSize:8,color:colors.muted,marginTop:3}}>{label}</Text></View>)}</View><Text style={{fontSize:9,lineHeight:14,color:colors.muted,marginTop:8}}>Counts are based on visible reports. Verified sightings are distinct from inspections, treatments and follow-up observations.</Text></View>
  <View style={{backgroundColor:'#EAF0E6',borderRadius:18,padding:16,marginTop:2,marginBottom:12}}><Text style={{fontSize:15,color:colors.ink,fontWeight:'800'}}>Notice something unusual?</Text><Text style={{fontSize:12,lineHeight:18,color:colors.muted,marginTop:5,marginBottom:12}}>Add a photo and location to help build a shared picture of what’s growing nearby.</Text><ActionButton title="Report a plant" onPress={()=>setTab('report')} small/></View>
 </ScrollView>;
}
