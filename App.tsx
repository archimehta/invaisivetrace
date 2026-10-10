import React from 'react';
import { SafeAreaView, Platform, StatusBar as NativeStatusBar, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSightings } from './src/hooks/useSightings';
import { MapScreen } from './src/screens/MapScreen';
import { SightingsScreen } from './src/screens/SightingsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { colors } from './src/components/shared';

export default function App(){
 const vm=useSightings();
 return <SafeAreaView style={{flex:1,backgroundColor:colors.paper,paddingTop:Platform.OS==='android'?NativeStatusBar.currentHeight:0}}>
  <StatusBar style="dark" />
  {!vm.apiOnline&&<Pressable onPress={()=>void vm.refreshReports()} style={{padding:9,backgroundColor:colors.amberPale}}><Text style={{textAlign:'center',color:colors.amber,fontSize:11}}>Offline · Tap to retry connection</Text></Pressable>}
  <View style={{flex:1}}>{vm.tab==='home'?<HomeScreen vm={vm}/>:vm.tab==='map'?<MapScreen vm={vm}/>:vm.tab==='sightings'?<SightingsScreen vm={vm}/>:<ReportScreen vm={vm}/>}</View>
  <View style={{flexDirection:'row',backgroundColor:'#FFFDF8',borderTopWidth:1,borderTopColor:colors.border,paddingTop:8,paddingBottom:9}}>
   {([{key:'home',icon:'⌂',label:'Home'},{key:'map',icon:'⌖',label:'Explore'},{key:'sightings',icon:'▤',label:'Sightings'},{key:'report',icon:'＋',label:'Report'}] as const).map(item=><Pressable key={item.key} accessibilityRole="tab" accessibilityState={{selected:vm.tab===item.key}} onPress={()=>vm.setTab(item.key)} style={{flex:1,alignItems:'center',gap:3,paddingVertical:5}}><View style={{paddingHorizontal:14,paddingVertical:3,borderRadius:18,backgroundColor:vm.tab===item.key?'#E8EDE4':'transparent'}}><Text style={{fontSize:20,color:vm.tab===item.key?colors.green:colors.muted}}>{item.icon}</Text></View><Text style={{fontSize:10,fontWeight:vm.tab===item.key?'800':'500',color:vm.tab===item.key?colors.green:colors.muted}}>{item.label}</Text></Pressable>)}
  </View>
 </SafeAreaView>;
}
