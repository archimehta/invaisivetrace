import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ActionButton, MapPanel, colors, ScreenGuide, styles, findInCatalog } from '../components/shared';
import { SightingsVM } from '../hooks/useSightings';

export function ReportScreen({vm}:{vm:SightingsVM}) {
 const {photo,setPhoto,supportingPhotos,setSupportingPhotos,guess,setGuess,guessMessage,isIdentifying,selectedSpecies,setSelectedSpecies,manualName,setManualName,manualMode,setManualMode,search,setSearch,note,setNote,exactLocationPublic,setExactLocationPublic,location,setLocation,locationMessage,setLocationMessage,isSubmitting,apiOnline,filteredSpecies,choosePhoto,identifyPhoto,setCurrentLocation,submitReport,activeCenter,authUser,setTab} = vm;
 const [step,setStep] = useState<1|2|3|4>(1);
 const plantReady=Boolean(selectedSpecies?.commonNames[0]||manualName.trim());
 const goNext=()=>{
   if(step===1 && !photo){Alert.alert('Add a photo','Take a photo or choose one from your library first.');return;}
   if(step===2 && !plantReady){Alert.alert('Confirm the plant','Choose a plant from the list or enter a possible unlisted plant name.');return;}
   if(step===3 && !location){Alert.alert('Choose a location','Use your location or tap the map to place a pin.');return;}
   setStep((step+1) as 1|2|3|4);
 };
 if(!authUser) return <View style={[styles.content,{flex:1,justifyContent:'center'}]}><Text style={styles.eyebrow}>COMMUNITY ACCOUNT</Text><Text style={styles.headingSmall}>Sign in to share a sighting</Text><Text style={styles.bodyCopy}>An account lets you track your reports and helps the project measure community participation. Your name stays off the public map.</Text><ActionButton title="Go to account" onPress={()=>setTab('account')}/></View>;
 return <View style={{flex:1}}>
 <View style={{paddingHorizontal:20,paddingTop:18,paddingBottom:12,backgroundColor:colors.paper}}>
   <Text style={{color:colors.green,fontSize:10,fontWeight:'800',letterSpacing:1.5}}>COMMUNITY FIELD NOTE</Text>
   <Text style={{color:colors.ink,fontSize:27,fontWeight:'700',fontFamily:'Georgia',marginTop:6}}>Add a sighting</Text>
   <Text style={{color:colors.muted,fontSize:12,marginTop:4}}>A few details can help the community keep watch.</Text>
   <View style={{flexDirection:'row',marginTop:18,gap:7}}>{[1,2,3,4].map(n=><Pressable key={n} onPress={()=>{if(n<step)setStep(n as 1|2|3|4)}} style={{flex:1,gap:6}}><View style={{height:5,borderRadius:6,backgroundColor:n<=step?colors.green:colors.border}}/><Text style={{color:n===step?colors.green:colors.muted,fontSize:10,fontWeight:n===step?'800':'500'}}>{['Photo','Identify','Location','Review'][n-1]}</Text></Pressable>)}</View>
 </View>
 <ScrollView key={step} contentContainerStyle={[styles.content,{paddingBottom:35}]} keyboardShouldPersistTaps="handled">
 <ScreenGuide items={[
   {label:'Progress steps',detail:'Photo → identify → location → review. The bar shows where you are; completed steps can be tapped to go back.',scope:'This view'},
   ...(step === 1 ? [
     {label:'Main photo',detail:'This is the primary evidence attached to the report and the image used for an optional AI suggestion.',scope:'This view' as const},
     {label:'Camera and library buttons',detail:'Choose a new photo or an existing image. A person must still confirm the plant name.',scope:'This view' as const},
   ] : step === 2 ? [
     {label:'AI suggestion',detail:'Gemini offers a tentative visual guess. It is not a verified identification; choose or correct the name yourself.',scope:'This view' as const},
     {label:'FISC catalog',detail:'Searches Florida’s reference list. “Possible unlisted” lets you report a plant that is not in the catalog.',scope:'Shared data' as const},
   ] : step === 3 ? [
     {label:'Location pin',detail:'Use GPS or tap the map to set the observation location. Drag the pin to adjust it.',scope:'This view' as const},
     {label:'Exact-location option',detail:'Controls whether the public map uses exact or approximate coordinates. Moderators can see the precise pin.',scope:'This view' as const},
   ] : [
     {label:'Field note',detail:'Add context such as plant size or nearby habitat. It is shared with the report.',scope:'This view' as const},
     {label:'Submit sighting',detail:'Saves the report for the community and moderator queue. It starts as unverified.',scope:'Shared data' as const},
   ]),
 ]} />
{step===1&&<>
    <Text style={styles.eyebrow}>STEP 01 · PHOTO</Text><Text style={styles.headingSmall}>Capture the plant</Text><Text style={styles.bodyCopy}>Get close enough to show its leaves, flowers, or fruit.</Text>

      {photo ? <View style={styles.photoPreviewWrap}><Image source={{ uri: photo.uri }} style={styles.photoPreview} /><Pressable style={styles.removePhoto} onPress={() => { setPhoto(null); setGuess(null); }}><Text style={styles.removePhotoText}>×</Text></Pressable></View> : <View style={styles.photoPlaceholderLarge}><Text style={styles.photoEmoji}>🌱</Text><Text style={styles.photoHint}>Get close to the leaves, flowers, or fruit</Text></View>}

      {!photo && <View style={styles.photoTips}><Text style={styles.photoTipsTitle}>Tips for a clear photo</Text><Text style={styles.photoTipsText}>• Focus on leaves, flowers, or fruit{'\n'}• Avoid blurry or dark photos{'\n'}• Include multiple angles if possible</Text></View>}
    <View style={styles.buttonRow}><View style={{ flex: 1 }}><ActionButton title="Take photo" onPress={() => void choosePhoto(true)} /></View><View style={{ flex: 1 }}><ActionButton title="Upload photo" secondary onPress={() => void choosePhoto(false)} /></View></View>

      {photo ? <View style={{backgroundColor:'#EAF0E6',borderRadius:14,padding:12,marginTop:12}}><Text style={{color:colors.ink,fontSize:12,fontWeight:'700'}}>Photo added</Text><Text style={{color:colors.muted,fontSize:11,marginTop:3}}>Next, we’ll help you confirm what it might be.</Text></View> : null}

</>}
{step===2&&<>
      <Text style={styles.eyebrow}>STEP 02 · IDENTIFY</Text><Text style={styles.headingSmall}>What did you find?</Text><Text style={styles.bodyCopy}>Search the Florida list or enter a possible unlisted plant.</Text>
      {photo ? <View style={{flexDirection:'row',alignItems:'center',gap:10,marginBottom:13,backgroundColor:'#F0F2EA',padding:9,borderRadius:14}}><Image source={{uri:photo.uri}} style={{width:54,height:54,borderRadius:10}}/><Text style={{flex:1,color:colors.muted,fontSize:11}}>Your photo is ready for an optional AI suggestion.</Text><Pressable onPress={()=>void identifyPhoto()} disabled={isIdentifying||!apiOnline}><Text style={{color:colors.green,fontWeight:'800',fontSize:11}}>{isIdentifying?'Working…':'Suggest ID'}</Text></Pressable></View>:null}
      {isIdentifying ? <ActivityIndicator color={colors.green} style={{ marginTop: 12 }} /> : null}
      {guessMessage ? <Text style={[styles.helperText, guess && styles.successHelper]}>{guessMessage}</Text> : null}
      {guess ? <View style={styles.guessCard}><View style={styles.guessBadge}><Text style={styles.guessBadgeText}>AI SUGGESTION · {guess.confidence || 'uncertain'}</Text></View><Text style={styles.guessName}>{guess.commonName || 'Plant candidate'}</Text>{guess.scientificName ? <Text style={styles.scientific}>{guess.scientificName}</Text> : null}{guess.rationale ? <Text style={styles.guessRationale}>{guess.rationale}</Text> : null}<Text style={styles.helperText}>Gemini can be wrong. Confirm or correct this identification below.</Text></View> : null}
      <Text style={styles.stepTitle}>Confirm the plant</Text>

      <View style={styles.modeToggle}><Pressable style={[styles.modeButton, !manualMode && styles.modeButtonActive]} onPress={() => { setManualMode(false); setManualName(''); }}><Text style={[styles.modeText, !manualMode && styles.modeTextActive]}>FISC listed</Text></Pressable><Pressable style={[styles.modeButton, manualMode && styles.modeButtonActive]} onPress={() => { setManualMode(true); setSelectedSpecies(null); }}><Text style={[styles.modeText, manualMode && styles.modeTextActive]}>Possible unlisted</Text></Pressable></View>

      {!manualMode ? <>

        <TextInput style={styles.searchInput} placeholder="Search common or scientific name" placeholderTextColor="#91A098" value={search} onChangeText={setSearch} autoCapitalize="none" />

        <View style={[styles.speciesList,{height:Math.min(320,Math.max(55,filteredSpecies.length*55))}]}><ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">{filteredSpecies.map((species) => <Pressable key={species.id} onPress={() => { setSelectedSpecies(species); setManualName(''); }} style={[styles.speciesChoice, selectedSpecies?.id === species.id && styles.speciesChoiceActive]}>

          <View style={{ flex: 1 }}><Text style={styles.speciesCommon}>{species.commonNames[0] || species.scientificName}</Text><Text style={styles.speciesScientific}>{species.scientificName}{species.commonNames.length > 1 ? ` · +${species.commonNames.length - 1} names` : ''}</Text></View><Text style={styles.categoryPill}>{species.category.replace('Category ', 'Cat. ')}</Text>

        </Pressable>)}

        {!filteredSpecies.length ? <Text style={styles.helperText}>No FISC list match. Choose “Possible unlisted” to record it for expert review.</Text> : null}</ScrollView></View>

        {selectedSpecies ? <View style={styles.listMatchCard}><Text style={styles.listMatchHeading}>FISC {selectedSpecies.category} · Florida invasive plant list</Text><Text style={styles.sourceText}>This match means the plant is listed in this FISC category. <Text style={styles.linkText} onPress={() => { void Linking.openURL(selectedSpecies.sourceUrl).catch(() => Alert.alert('Could not open source', 'Check that your phone has an internet connection.')); }}>View source ↗</Text></Text></View> : null}

      </> : <>

        <TextInput style={styles.searchInput} placeholder="Plant name (common or scientific)" placeholderTextColor="#91A098" value={manualName} onChangeText={setManualName} />

        {findInCatalog(manualName) ? <View style={styles.listMatchCard}><Text style={styles.listMatchHeading}>This name matches FISC {findInCatalog(manualName)?.category}</Text><Text style={styles.sourceText}>The report will be labeled with this sourced catalog category.</Text></View> : <View style={styles.unlistedCallout}><Text style={styles.unlistedTitle}>Not found in the FISC catalog ≠ not invasive</Text><Text style={styles.unlistedText}>Submit it as a possible unlisted invasive. A moderator can review and correct the identification.</Text></View>}

      </>}




</>}
{step===3&&<>
      <Text style={styles.eyebrow}>STEP 03 · WHERE</Text><Text style={styles.headingSmall}>Pin the place</Text><Text style={styles.bodyCopy}>A nearby location helps others understand where the plant is spreading.</Text>


      <Text style={styles.helperText}>{locationMessage}</Text><ActionButton title="◎  Use my current location" onPress={() => void setCurrentLocation()} secondary small />

  <View style={{ marginTop: 12 }}><MapPanel center={activeCenter} reports={[]} selectable onPin={(point) => { void setLocation(point); setLocationMessage(`Pin set at ${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}. Drag it to adjust.`); }} height={235} /></View>

      {location ? <Text style={styles.coordinateText}>Selected: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</Text> : null}

      {photo ? <View style={{ marginTop: 18, padding: 13, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border }}><Text style={styles.stepTitle}>Other angles (optional)</Text><Text style={styles.helperText}>Gemini analyzes the main photo. Add up to three context photos for reviewers ({supportingPhotos.length}/3).</Text><View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>{supportingPhotos.map((item, index) => <View key={`${item.uri}-${index}`} style={{ position: 'relative' }}><Image source={{ uri: item.uri }} style={{ width: 68, height: 68, borderRadius: 12 }} /><Pressable onPress={() => setSupportingPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={{ position: 'absolute', top: -6, right: -6, width: 23, height: 23, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.white, fontWeight: '800' }}>×</Text></Pressable></View>)}</View>{supportingPhotos.length < 3 ? <View style={[styles.buttonRow, { marginTop: 10 }]}><View style={{ flex: 1 }}><ActionButton small title="Take another" secondary onPress={() => void choosePhoto(true, true)} /></View><View style={{ flex: 1 }}><ActionButton small title="Choose another" onPress={() => void choosePhoto(false, true)} /></View></View> : <Text style={[styles.helperText, { color: colors.green }]}>Maximum of three context photos reached.</Text>}</View> : null}

      <Pressable onPress={() => setExactLocationPublic(!exactLocationPublic)} style={styles.consentRow}><View style={[styles.checkbox, exactLocationPublic && styles.checkboxChecked]}>{exactLocationPublic ? <Text style={styles.checkmark}>✓</Text> : null}</View><View style={{ flex: 1 }}><Text style={styles.consentTitle}>Show exact location on the public map</Text><Text style={styles.consentSub}>If off, the public pin is approximate. Moderators can still review the precise location.</Text></View></Pressable>


</>}
{step===4&&<>
      <Text style={styles.eyebrow}>STEP 04 · SHARE</Text><Text style={styles.headingSmall}>Review your sighting</Text><Text style={styles.bodyCopy}>Add an optional field note before sharing with the community.</Text>

      <View style={{backgroundColor:colors.white,borderRadius:17,padding:13,borderWidth:1,borderColor:colors.border,flexDirection:'row',gap:12,alignItems:'center',marginBottom:13}}>{photo?<Image source={{uri:photo.uri}} style={{width:70,height:70,borderRadius:12}}/>:null}<View style={{flex:1}}><Text style={{fontSize:14,color:colors.ink,fontWeight:'800'}}>{selectedSpecies?.commonNames[0]||manualName||'Plant name needed'}</Text><Text style={{fontSize:11,color:colors.muted,marginTop:4}}>{selectedSpecies?`FISC ${selectedSpecies.category}`:'Possible unlisted plant'}</Text><Text style={{fontSize:10,color:colors.muted,marginTop:4}}>📍 {location?.latitude.toFixed(3)}, {location?.longitude.toFixed(3)}</Text></View></View>


      <TextInput style={[styles.searchInput, styles.noteInput]} placeholder="Optional note: size, nearby trail, or habitat" placeholderTextColor="#91A098" value={note} onChangeText={setNote} multiline textAlignVertical="top" maxLength={1200} />

      <View style={styles.submitNotice}><Text style={styles.submitNoticeText}>Your photo, plant name, note, and selected map location are visible to the community. Exact coordinates are shared only if you opt in. Reports appear as <Text style={{ fontWeight: '800' }}>unverified</Text> until a moderator reviews them. Avoid including people or identifying details in photos and notes.</Text></View>

      {!apiOnline ? <Text style={styles.errorHelper}>Connect the phone and API server to the same Wi-Fi to submit reports.</Text> : null}

      <View style={{ height: 28 }} />


</>}
 </ScrollView>
 <View style={{paddingHorizontal:18,paddingTop:12,paddingBottom:18,backgroundColor:colors.white,borderTopWidth:1,borderColor:colors.border,flexDirection:'row',gap:10}}>
 {step>1&&<View style={{flex:1}}><ActionButton title="Back" secondary onPress={()=>setStep((step-1) as 1|2|3|4)}/></View>}
 <View style={{flex:2}}><ActionButton title={step===4?(isSubmitting?'Submitting…':'Submit sighting'):'Continue  →'} disabled={step===4?(isSubmitting||!apiOnline):false} onPress={()=>{if(step===4)void submitReport();else goNext();}}/></View>
 </View>
 </View>;
}
