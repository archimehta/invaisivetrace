import { useEffect, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';
import { Species, Report, PlantGuess, Coordinate, catalog, API_URL, ORLANDO, findInCatalog, uploadPhoto } from '../components/shared';

export function useSightings() {


const [tab, setTab] = useState<'home' | 'map' | 'sightings' | 'report'>('home');

const [reports, setReports] = useState<Report[]>([]);

const [apiOnline, setApiOnline] = useState(false);

const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);

const [guess, setGuess] = useState<PlantGuess | null>(null);

const [guessMessage, setGuessMessage] = useState('');

const [isIdentifying, setIsIdentifying] = useState(false);

const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);

const [manualName, setManualName] = useState('');

const [manualMode, setManualMode] = useState(false);

const [search, setSearch] = useState('');

const [note, setNote] = useState('');

const [exactLocationPublic, setExactLocationPublic] = useState(false);

const [location, setLocation] = useState<Coordinate | null>(null);

const [locationMessage, setLocationMessage] = useState('Use your location or tap the map to position the sighting pin.');

const [isSubmitting, setIsSubmitting] = useState(false);



const refreshReports = async () => {

    try {

const response = await fetch(`${API_URL}/api/reports`);

      if (!response.ok) throw new Error('Report service unavailable');

const payload = await response.json();

      setReports(payload.reports || []);

      setApiOnline(true);

    } catch { setApiOnline(false); }

  };



  useEffect(() => { void refreshReports(); }, []);



const filteredSpecies = useMemo(() => {

const query = search.trim().toLocaleLowerCase();

    if (!query) return catalog.slice(0, 10);

    return catalog.filter((item) => [item.scientificName, ...item.scientificSynonyms, ...item.commonNames].some((name) => name.toLocaleLowerCase().includes(query))).slice(0, 12);

  }, [search]);



const choosePhoto = async (useCamera: boolean) => {

    try {

      if (useCamera) {

const permission = await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {

const actions = permission.canAskAgain

            ? [{ text: 'OK' }]

            : [

                { text: 'Cancel', style: 'cancel' as const },

                { text: 'Open Settings', onPress: () => { void Linking.openSettings().catch(() => Alert.alert('Settings unavailable', 'Open iPhone Settings, choose Expo Go, and enable Camera access.')); } },

              ];

          Alert.alert(

            'Camera permission needed',

            permission.canAskAgain

              ? 'Allow camera access to take a plant photo. You can also choose a photo from your library.'

              : 'Camera access is turned off for Expo Go. Enable it in iPhone Settings, then try again.',

            actions,

          );

          return;

        }

      }



const result = useCamera

        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.82 })

        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.82 });

      if (result.canceled) return;

const asset = result.assets?.[0];

      if (!asset) {

        Alert.alert('No photo selected', 'Choose a photo or take another picture and try again.');

        return;

      }

      setPhoto(asset);

      setGuess(null);

      setGuessMessage('Photo ready. Ask Gemini for a tentative plant identification, or identify it manually.');

    } catch (error) {

const message = error instanceof Error ? error.message : 'Please check Expo Go permissions and try again.';

      Alert.alert(useCamera ? 'Could not open camera' : 'Could not open photo library', message);

    }

  };



const identifyPhoto = async () => {

    if (!photo) return;

    setIsIdentifying(true);

    setGuessMessage('Sending photo for tentative identification…');

    try {

const payload = await uploadPhoto<PlantGuess>('/api/identify', photo);

      if (!payload || typeof payload !== 'object') throw new Error('Identification returned an unreadable response. Search the catalog or enter a plant name manually.');

      setGuess(payload);

      if (payload.isPlant === false) {

        setSelectedSpecies(null);

        setManualName('');

        setGuessMessage('Gemini could not confirm that this image shows a plant. Check the photo, or identify the plant manually if you are sure it is one.');

        return;

      }

const matched = findInCatalog(payload.scientificName) || findInCatalog(payload.commonName);

      if (matched) {

        setSelectedSpecies(matched);

        setManualName('');

        setManualMode(false);

        setGuessMessage('Tentative suggestion matched the FISC catalog. Review it and confirm or choose another plant.');

      } else {

        setSelectedSpecies(null);

        setManualName(payload.scientificName || payload.commonName || '');

        setManualMode(true);

        setGuessMessage('No FISC catalog match. This does not mean the plant is non-invasive; you can report it as a possible unlisted invasive.');

      }

    } catch (error) {

      setGuessMessage(error instanceof Error ? error.message : 'Gemini unavailable. Search the catalog or enter the name manually.');

    } finally { setIsIdentifying(false); }

  };



const setCurrentLocation = async () => {

    setLocationMessage('Requesting location…');

    try {

const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {

        setLocationMessage('Location permission denied. You can still tap the map to place the sighting pin.');

        return;

      }

const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

const point = { latitude: current.coords.latitude, longitude: current.coords.longitude };

      setLocation(point);

      setLocationMessage('Location found. Tap the map to adjust the pin if needed.');

    } catch (error) {

      console.warn('Location lookup failed:', error);

      setLocationMessage('Could not get GPS location. Check Expo Go location access or tap the map to place the sighting pin.');

    }

  };



const submitReport = async () => {

const speciesName = selectedSpecies?.commonNames[0] || manualName.trim();

const manualMatchesGuess = Boolean(guess && [guess.commonName, guess.scientificName].some((name) => name && name.trim().toLocaleLowerCase() === manualName.trim().toLocaleLowerCase()));

const scientificName = selectedSpecies?.scientificName || (!manualMode || manualMatchesGuess ? guess?.scientificName || '' : '');

    if (!photo || !speciesName) return Alert.alert('Add a photo and plant name', 'Select a FISC-listed plant or enter an unlisted plant name.');

    if (!location) return Alert.alert('Choose a location', 'Use GPS or tap the map to place the sighting pin.');

    setIsSubmitting(true);

    try {

      await uploadPhoto('/api/reports', photo, {

        speciesName,

        scientificName,

        geminiSuggestion: guess ? `${guess.commonName || ''} ${guess.scientificName || ''}`.trim() : '',

        latitude: String(location.latitude),

        longitude: String(location.longitude),

        observedAt: new Date().toISOString(),

        note,

        exactLocationPublic: String(exactLocationPublic),

      });

      await refreshReports();

      setPhoto(null); setGuess(null); setSelectedSpecies(null); setManualName(''); setManualMode(false); setSearch(''); setNote(''); setLocation(null); setExactLocationPublic(false); setTab('home');

      Alert.alert('Report submitted', 'Your sighting is on the community map as unverified and can now be reviewed.');

    } catch (error) {

      Alert.alert('Could not submit report', error instanceof Error ? error.message : 'Check that the phone and API laptop are on the same Wi-Fi.');

    } finally { setIsSubmitting(false); }

  };



const activeCenter = location || ORLANDO;

const reportCountLabel = `${reports.length} ${reports.length === 1 ? 'sighting' : 'sightings'}`;




return {tab,setTab,reports,apiOnline,photo,setPhoto,guess,setGuess,guessMessage,isIdentifying,selectedSpecies,setSelectedSpecies,manualName,setManualName,manualMode,setManualMode,search,setSearch,note,setNote,exactLocationPublic,setExactLocationPublic,location,setLocation,locationMessage,setLocationMessage,isSubmitting,refreshReports,filteredSpecies,choosePhoto,identifyPhoto,setCurrentLocation,submitReport,activeCenter,reportCountLabel};
}
export type SightingsVM = ReturnType<typeof useSightings>;
