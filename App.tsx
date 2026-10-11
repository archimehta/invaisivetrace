import React from 'react';
import { SafeAreaView, Platform, StatusBar as NativeStatusBar, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSightings } from './src/hooks/useSightings';
import { MapScreen } from './src/screens/MapScreen';
import { SightingsScreen } from './src/screens/SightingsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { MetricsScreen } from './src/screens/MetricsScreen';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { colors } from './src/components/shared';

export default function App(){
 const vm=useSightings();
 const tabs: {key: typeof vm.tab; icon: string; label: string}[] = vm.authUser?.role==='moderator'
  ? [{key:'home',icon:'⌂',label:'Home'},{key:'map',icon:'⌖',label:'Explore'},{key:'sightings',icon:'▤',label:'Sightings'},{key:'report',icon:'＋',label:'Report'},{key:'metrics',icon:'✦',label:'Metrics'},{key:'review',icon:'✓',label:'Review'}]
  : [{key:'home',icon:'⌂',label:'Home'},{key:'map',icon:'⌖',label:'Explore'},{key:'report',icon:'＋',label:'Report'},{key:'sightings',icon:'▤',label:'Sightings'},{key:'metrics',icon:'✦',label:'Metrics'}];
 return <SafeAreaView style={{flex:1,backgroundColor:colors.paper,paddingTop:Platform.OS==='android'?NativeStatusBar.currentHeight:0}}>
  <StatusBar style="dark" />
  {!vm.apiOnline&&<Pressable onPress={()=>void vm.refreshReports()} style={{padding:9,backgroundColor:colors.amberPale}}><Text style={{textAlign:'center',color:colors.amber,fontSize:11}}>Offline · Tap to retry connection</Text></Pressable>}
  <View style={{flex:1}}>{vm.tab==='home'?<HomeScreen vm={vm}/>:vm.tab==='map'?<MapScreen vm={vm}/>:vm.tab==='sightings'?<SightingsScreen vm={vm}/>:vm.tab==='account'?<AccountScreen vm={vm}/>:vm.tab==='metrics'?<MetricsScreen vm={vm}/>:vm.tab==='review'?<ReviewScreen vm={vm}/>:<ReportScreen vm={vm}/>}</View>
  {vm.tab!=='account'&&<Pressable accessibilityRole="button" accessibilityLabel="Open account" onPress={()=>vm.setTab('account')} style={{position:'absolute',top:73,right:18,zIndex:10,width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center',backgroundColor:'#FFFDF3',borderWidth:1,borderColor:colors.border,shadowColor:'#17372A',shadowOpacity:.12,shadowRadius:5,shadowOffset:{width:0,height:2},elevation:3}}><View pointerEvents="none" style={{alignItems:'center',justifyContent:'flex-end'}}><View style={{width:9,height:9,borderRadius:5,backgroundColor:colors.green,marginBottom:2}}/><View style={{width:18,height:10,borderTopLeftRadius:10,borderTopRightRadius:10,backgroundColor:colors.green}}/></View></Pressable>}
  <View style={{flexDirection:'row',alignItems:'center',backgroundColor:'#FFFDF8',borderTopWidth:1,borderTopColor:colors.border,paddingTop:6,paddingBottom:7}}>
   {tabs.map(item=>{
    const selected=vm.tab===item.key;
    const isReport=item.key==='report';
    return <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{selected}} onPress={()=>vm.setTab(item.key)} style={{flex:1,minWidth:0,height:58,alignItems:'center',justifyContent:'center',gap:2,paddingHorizontal:1}}>
     <View style={{width:isReport?44:36,height:isReport?40:29,alignItems:'center',justifyContent:'center',borderRadius:isReport?15:16,backgroundColor:isReport?(selected?colors.green:'#DDE8D9'):selected?'#E8EDE4':'transparent',borderWidth:isReport&&!selected?1:0,borderColor:'#C8D8C2',shadowColor:'#17372A',shadowOpacity:isReport ? 0.16 : 0,shadowRadius:isReport?4:0,shadowOffset:{width:0,height:2},elevation:isReport?2:0}}><Text style={{width:28,height:isReport?31:25,lineHeight:isReport?31:25,textAlign:'center',fontSize:isReport?26:19,fontWeight:isReport?'700':'400',color:isReport?(selected?colors.white:colors.green):selected?colors.green:colors.muted}}>{item.icon}</Text></View>
     <Text numberOfLines={1} style={{height:13,lineHeight:13,textAlign:'center',fontSize:9,fontWeight:selected||isReport?'800':'500',color:selected||isReport?colors.green:colors.muted}}>{item.label}</Text>
    </Pressable>;
   })}
  </View>
 </SafeAreaView>;
}
