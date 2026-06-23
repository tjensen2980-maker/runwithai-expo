import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Platform, AppState } from 'react-native';
import { colors, SERVER, getAuthToken } from '../data';
import VoiceCoach, { stopSpeaking, setVoiceAuthToken } from '../components/VoiceCoach';
import { useTranslation } from 'react-i18next';
// ─── MUSIC TEMPO MATCHER IMPORTS ────────────────────────────────────────────
import MusicButton from './components/MusicButton';
import MusicMatcher from './components/MusicMatcher';
import useCadence from '../hooks/useCadence';
// ─── PHOTO STORY IMPORTS ────────────────────────────────────────────────────
import RunCamera, { uploadPendingPhotos, clearPendingPhotos } from './components/RunCamera';
import PhotoStory from './components/PhotoStory';
// ─── VOICE INPUT (talk to AI coach) ─────────────────────────────────────────
import VoiceInput from './components/VoiceInput';
// Live Activity (iOS laaseskaerm/Dynamic Island)
import LiveActivity from '../modules/LiveActivity';
// Conditionally import native modules
let MapView, Marker, Polyline, PROVIDER_GOOGLE;
let Location;
let TaskManager;
const isWeb = Platform.OS === 'web';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Only import native modules when not on web
if (!isWeb) {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    Polyline = Maps.Polyline;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  } catch (e) {
    console.log('react-native-maps not available');
  }
  
  try {
    Location = require('expo-location');
  } catch (e) {
    console.log('expo-location not available');
  }

  try {
    TaskManager = require('expo-task-manager');
  } catch (e) {
    console.log('expo-task-manager not available');
  }
}

// ─── BACKGROUND LOCATION TASK DEFINITION ───────────────────────────────────
if (!isWeb && typeof global !== 'undefined') {
  global._backgroundLocations = global._backgroundLocations || [];
  global._isBackgroundTracking = false;
}

if (!isWeb && TaskManager) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }) => {
    if (error) {
      console.error('Background location error:', error);
      return;
    }
    if (data) {
      const { locations } = data;
      if (locations && locations.length > 0) {
        const newLocations = locations.map(loc => ({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp,
          accuracy: loc.coords.accuracy,
        }));
        global._backgroundLocations = [
          ...(global._backgroundLocations || []),
          ...newLocations,
        ];
        console.log('BG location:', newLocations.length, 'pts, acc:', newLocations[0]?.accuracy?.toFixed(0) + 'm');
      }
    }
  });
}

// ─── NATIVE TRACKER MAP ─────────────────────────────────────────────────────
function NativeTrackerMap({ positions, currentPosition, t }) {
  const mapRef = useRef(null);
  useEffect(() => {
    if (mapRef.current && currentPosition) {
      mapRef.current.animateToRegion({
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    }
  }, [currentPosition]);
  useEffect(() => {
    if (mapRef.current && positions.length > 1) {
      const coords = positions.map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
      }));
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [positions]);
  if (!MapView) {
    return (
      <View style={styles.mapPlaceholder}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>🗺️</Text>
        <Text style={{ color: colors.text, fontSize: 14 }}>{t('tracker.mapNotAvailable')}</Text>
      </View>
    );
  }
  const initialRegion = currentPosition ? {
    latitude: currentPosition.latitude,
    longitude: currentPosition.longitude,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  } : {
    latitude: 56.0,
    longitude: 10.5,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };
  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={initialRegion}
      showsUserLocation={true}
      followsUserLocation={positions.length <= 1}
    >
      {positions.length > 1 && (
        <Polyline
          coordinates={positions.map(p => ({ latitude: p.latitude, longitude: p.longitude }))}
          strokeColor={colors.accent}
          strokeWidth={4}
        />
      )}
      {positions.length > 0 && (
        <Marker
          coordinate={{ latitude: positions[0].latitude, longitude: positions[0].longitude }}
          pinColor="#c8ff00"
          title="Start"
        />
      )}
    </MapView>
  );
}

// ─── WEB TRACKER MAP (Leaflet) ──────────────────────────────────────────────
function WebTrackerMap({ positions, currentPosition }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polylineRef = useRef(null);
  const markerRef = useRef(null);
  useEffect(() => {
    if (!isWeb || typeof window === 'undefined' || !mapRef.current) return;
    const init = () => {
      if (!window.L) return;
      const L = window.L;
      if (!mapInstanceRef.current) {
        const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
        if (currentPosition) {
          map.setView([currentPosition.latitude, currentPosition.longitude], 16);
        } else if (window._lastKnownLocation) {
          map.setView([window._lastKnownLocation.lat, window._lastKnownLocation.lon], 15);
        } else {
          map.setView([56.0, 10.5], 13);
        }
        mapInstanceRef.current = map;
      }
      const map = mapInstanceRef.current;
      if (positions.length > 1) {
        const latlngs = positions.map(p => [p.latitude, p.longitude]);
        if (polylineRef.current) {
          polylineRef.current.setLatLngs(latlngs);
        } else {
          polylineRef.current = L.polyline(latlngs, { color: colors.accent, weight: 4, opacity: 0.9 }).addTo(map);
        }
        map.fitBounds(polylineRef.current.getBounds(), { padding: [30, 30] });
      }
      if (currentPosition) {
        const pos = [currentPosition.latitude, currentPosition.longitude];
        if (markerRef.current) {
          markerRef.current.setLatLng(pos);
        } else {
          const icon = L.divIcon({
            html: '<div style="background:#c8ff00;width:14px;height:14px;border-radius:50%;border:3px solid #000;box-shadow:0 0 10px #c8ff00"></div>',
            className: '',
            iconAnchor: [7, 7]
          });
          markerRef.current = L.marker(pos, { icon }).addTo(map);
        }
        if (positions.length <= 1) {
          map.setView(pos, 16);
        }
      }
    };
    if (window.L) {
      init();
    } else if (!window._leafletLoadedTracker) {
      window._leafletLoadedTracker = true;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = init;
      document.head.appendChild(script);
    } else {
      const poll = setInterval(() => { if (window.L) { clearInterval(poll); init(); } }, 100);
    }
  }, [positions, currentPosition]);
  return <View ref={mapRef} style={styles.map} />;
}

// ─── UNIFIED TRACKER MAP ────────────────────────────────────────────────────
function TrackerMap(props) {
  if (isWeb) return <WebTrackerMap {...props} />;
  return <NativeTrackerMap {...props} />;
}

// ─── PERSONAL STATS COMPONENT ───────────────────────────────────────────────
function PersonalStats({ runs, activityType, t }) {
  const getText = (key, fallback) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  const filteredRuns = runs.filter(r => {
    if (activityType === 'run') return r.type !== 'walk';
    return r.type === 'walk';
  });

  if (filteredRuns.length === 0) return null;

  const totalKm = filteredRuns.reduce((sum, r) => sum + (r.km || 0), 0);
  const runsWithPace = filteredRuns.filter(r => r.pace > 0 && r.km >= 0.5);
  const bestPace = runsWithPace.length > 0 ? Math.min(...runsWithPace.map(r => r.pace)) : null;
  const longestRun = Math.max(...filteredRuns.map(r => r.km || 0));
  
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  
  const thisWeekRuns = filteredRuns.filter(r => {
    const runDate = new Date(r.date || r.created_at);
    return runDate >= weekStart;
  });
  const thisWeekKm = thisWeekRuns.reduce((sum, r) => sum + (r.km || 0), 0);
  const thisWeekCount = thisWeekRuns.length;

  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekStart);
  
  const lastWeekRuns = filteredRuns.filter(r => {
    const runDate = new Date(r.date || r.created_at);
    return runDate >= lastWeekStart && runDate < lastWeekEnd;
  });
  const lastWeekKm = lastWeekRuns.reduce((sum, r) => sum + (r.km || 0), 0);

  const kmDiff = thisWeekKm - lastWeekKm;
  const trendUp = kmDiff > 0;
  const trendDown = kmDiff < 0;

  const formatPaceValue = (pace) => {
    if (!pace || pace <= 0) return '--:--';
    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const label = activityType === 'run' 
    ? getText('tracker.stats.runs', 'løb') 
    : getText('tracker.stats.walks', 'gåture');

  return (
    <View style={ps.container}>
      <Text style={ps.title}>
        {activityType === 'run' 
          ? `🏃 ${getText('tracker.stats.yourProgress', 'Din fremgang')}` 
          : `🚶 ${getText('tracker.stats.yourProgress', 'Din fremgang')}`}
      </Text>
      
      <View style={ps.weekCard}>
        <View style={ps.weekHeader}>
          <Text style={ps.weekTitle}>{getText('tracker.stats.thisWeek', 'Denne uge')}</Text>
          {(trendUp || trendDown) && (
            <View style={[ps.trendBadge, trendUp ? ps.trendUp : ps.trendDown]}>
              <Text style={[ps.trendText, trendUp ? ps.trendTextUp : ps.trendTextDown]}>
                {trendUp ? '↑' : '↓'} {Math.abs(kmDiff).toFixed(1)} km
              </Text>
            </View>
          )}
        </View>
        <View style={ps.weekStats}>
          <View style={ps.weekStat}>
            <Text style={ps.weekValue}>{thisWeekKm.toFixed(1)}</Text>
            <Text style={ps.weekLabel}>KM</Text>
          </View>
          <View style={ps.weekDivider} />
          <View style={ps.weekStat}>
            <Text style={ps.weekValue}>{thisWeekCount}</Text>
            <Text style={ps.weekLabel}>{label.toUpperCase()}</Text>
          </View>
        </View>
        {lastWeekKm > 0 && (
          <Text style={ps.lastWeek}>
            {getText('tracker.stats.lastWeek', 'Sidste uge')}: {lastWeekKm.toFixed(1)} km
          </Text>
        )}
      </View>

      <View style={ps.recordsRow}>
        <View style={ps.recordCard}>
          <Text style={ps.recordIcon}>🏆</Text>
          <Text style={ps.recordValue}>{formatPaceValue(bestPace)}</Text>
          <Text style={ps.recordLabel}>{getText('tracker.stats.bestPace', 'Bedste tempo')}</Text>
        </View>
        <View style={ps.recordCard}>
          <Text style={ps.recordIcon}>📏</Text>
          <Text style={ps.recordValue}>{longestRun.toFixed(1)}</Text>
          <Text style={ps.recordLabel}>{getText('tracker.stats.longestRun', 'Længste løb')}</Text>
        </View>
        <View style={ps.recordCard}>
          <Text style={ps.recordIcon}>📊</Text>
          <Text style={ps.recordValue}>{totalKm.toFixed(0)}</Text>
          <Text style={ps.recordLabel}>{getText('tracker.stats.totalKm', 'Total km')}</Text>
        </View>
      </View>
    </View>
  );
}

const ps = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 },
  weekCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  weekTitle: { fontSize: 12, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  trendBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  trendUp: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
  trendDown: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  trendText: { fontSize: 11, fontWeight: '700' },
  trendTextUp: { color: '#22c55e' },
  trendTextDown: { color: '#ef4444' },
  weekStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  weekStat: { alignItems: 'center' },
  weekValue: { fontSize: 28, fontWeight: '800', color: colors.accent },
  weekLabel: { fontSize: 11, fontWeight: '600', color: colors.muted, marginTop: 2 },
  weekDivider: { width: 1, height: 30, backgroundColor: colors.border },
  lastWeek: { fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 10 },
  recordsRow: { flexDirection: 'row', gap: 8 },
  recordCard: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  recordIcon: { fontSize: 16, marginBottom: 4 },
  recordValue: { fontSize: 16, fontWeight: '800', color: colors.text },
  recordLabel: { fontSize: 9, fontWeight: '600', color: colors.muted, marginTop: 2, textTransform: 'uppercase' },
});

// ─── RUNTRACKER COMPONENT ───────────────────────────────────────────────────
export default function RunTracker({ activityType = 'run', onBack, profile, level, weekPlan, nextWorkout, runs, onShowPricing }) {
  const { t } = useTranslation();
  const [isTracking, setIsTracking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false); // TEST: AI-coach starter slaaet fra for at teste baggrunds-GPS
  const voiceCoachRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [positions, setPositions] = useState([]);
  const [isForeground, setIsForeground] = useState(true); // pause heavy map when app is backgrounded
  const [currentPosition, setCurrentPosition] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [gpsError, setGpsError] = useState('');
  const [gpsPoints, setGpsPoints] = useState(0);
  const [filteredPoints, setFilteredPoints] = useState(0);
  
  const watchSubscriptionRef = useRef(null);
  const lastLiveActivityUpdateRef = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const distanceRef = useRef(0);
  const positionsRef = useRef([]);
  const lastValidPositionRef = useRef(null);
  const lastSampleTimestampRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const handlePositionUpdateRef = useRef(null);
  const lastForegroundTimestampRef = useRef(0);
  const keepAliveSoundRef = useRef(null); // stille loop-lyd der holder appen vaagen i baggrunden (iOS audio-mode)
  const keepAliveWatchdogRef = useRef(null); // interval der overvaager og genstarter keep-alive lyden

  // ─── PHOTO STORY STATE ──────────────────────────────────────────────────
  const [savedRunId, setSavedRunId] = useState(null);
  const [showStory, setShowStory] = useState(false);

  // ─── MUSIC TEMPO MATCHER STATE & HOOK ───────────────────────────────────
  const [musicVisible, setMusicVisible] = useState(false);
  const paceSecPerKm = distance > 0 ? (duration / (distance / 1000)) : 0;
  const { cadence, bpmRange } = useCadence({
    currentPaceSecondsPerKm: paceSecPerKm,
    isRunning: isTracking && !isPaused,
  });

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // ─── PROCESS BACKGROUND LOCATIONS ───────────────────────────────────────
  const processBackgroundLocations = () => {
    if (!isWeb && global._backgroundLocations && global._backgroundLocations.length > 0) {
      const bgLocations = [...global._backgroundLocations].sort((a, b) => a.timestamp - b.timestamp);
      global._backgroundLocations = [];
      console.log('Processing', bgLocations.length, 'background locations');
      bgLocations.forEach(newPos => {
        if (handlePositionUpdateRef.current) {
          handlePositionUpdateRef.current(newPos, true);
        }
      });
    }
  };

  // ─── APP STATE HANDLER (foreground/background) ────────────────────────────
  useEffect(() => {
    if (isWeb) return;

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App foregrounded, processing background locations...');
        if (global._backgroundLocations && global._backgroundLocations.length > 0) {
          const bgLocations = [...global._backgroundLocations].sort((a, b) => a.timestamp - b.timestamp);
          global._backgroundLocations = [];
          console.log('Foreground: processing', bgLocations.length, 'buffered BG points');
          bgLocations.forEach(newPos => {
            if (handlePositionUpdateRef.current) {
              handlePositionUpdateRef.current(newPos, true);
            }
          });
        }
      }
      appStateRef.current = nextAppState;
      setIsForeground(nextAppState === 'active');
    });

    return () => subscription?.remove();
  }, []);

  // ─── PERIODIC CHECK FOR BACKGROUND LOCATIONS ────────────────────────────
  // Drain BG buffer regularly. When app is active we DEDUPE against the last
  // foreground timestamp (instead of throwing all BG points away), so we never
  // lose distance during the transition foreground→background→foreground.
  useEffect(() => {
    if (!isTracking || isPaused || isWeb) return;

    const bgInterval = setInterval(() => {
      if (!global._backgroundLocations || global._backgroundLocations.length === 0) return;

      const bgLocations = [...global._backgroundLocations].sort((a, b) => a.timestamp - b.timestamp);
      global._backgroundLocations = [];

      const lastFgTs = lastForegroundTimestampRef.current || 0;
      bgLocations.forEach(newPos => {
        // Dedupe: skip BG points that are within 2s of a foreground point we already have.
        // This lets BG buffer fill the GAP without duplicating live foreground samples.
        if (appStateRef.current === 'active' && Math.abs(newPos.timestamp - lastFgTs) < 2000) {
          return;
        }
        if (handlePositionUpdateRef.current) {
          handlePositionUpdateRef.current(newPos, true);
        }
      });
    }, 1000);

    return () => clearInterval(bgInterval);
  }, [isTracking, isPaused]);

  const handlePositionUpdate = (newPos, fromBackground = false) => {
    setGpsStatus('active');
    setCurrentPosition(newPos);
    setGpsPoints(prev => prev + 1);

    // Track timestamp of latest foreground sample so the BG buffer drain
    // can dedupe instead of duplicating distance.
    if (!fromBackground) {
      lastForegroundTimestampRef.current = newPos.timestamp;
    }
    
    const lastPos = lastValidPositionRef.current;
    
    if (lastPos) {
      const dist = calculateDistance(lastPos.latitude, lastPos.longitude, newPos.latitude, newPos.longitude);
      // timeDiff maales mellem de to FAKTISKE punkter (anker -> nu), saa farten
      // bliver korrekt selv naar mellemliggende sub-2m-samples er droppet.
      const timeDiff = Math.max(0.1, (newPos.timestamp - lastPos.timestamp) / 1000);
      const speedKmh = (dist / timeDiff) * 3.6;
      const accuracy = newPos.accuracy || 15;
      // DEBUG: track largest gap mellem paa hinanden foelgende samples (detekter iOS BG batching/suspension)
            global._fr = global._fr || { dist: 0, jump: 0, speed: 0, acc: 0, maxGap: 0, bigGaps: 0 };
            if (timeDiff > global._fr.maxGap) global._fr.maxGap = timeDiff;
            if (timeDiff > 10) global._fr.bigGaps++;
            // ── GPS FILTERING (iOS-batching aware) ────────────────────
      // iOS batches background location heavily when the screen is locked.
      // We allow larger gaps and bigger jumps on iOS, and use interpolation
      // (see escape valve below) so distance is still counted when gaps occur.
      const isIOS = Platform.OS === 'ios';
      // Adaptive min distance: reject moves smaller than the GPS noise floor so jitter
// while standing/walking (small wiggles within the accuracy radius) is not counted.
const MIN_DISTANCE = Math.max(1, Math.min(8, accuracy * 0.3));
      const MAX_SPEED_KMH = activityType === 'bike' ? 80 : (activityType === 'walk' ? 12 : 30);
      const MAX_ACCURACY = fromBackground ? (isIOS ? 150 : 100) : (isIOS ? 75 : 50);
      // Platform/activity dependent jump cap so iOS batched points are not dropped.
      const JUMP_CAP = isIOS
        ? (activityType === 'bike' ? 500 : 300)
        : (activityType === 'bike' ? 250 : 150);
      const MAX_SINGLE_JUMP = Math.min(JUMP_CAP, Math.max(60, (MAX_SPEED_KMH / 3.6) * timeDiff + 30));

      const isMinDistance = dist >= MIN_DISTANCE;
      const isNotTeleport = dist <= MAX_SINGLE_JUMP;
              // Speed check is only reliable over short gaps; after a pause (big timeDiff) a single sample looks artificially fast, so skip it then.
      // timeDiff er nu tid siden seneste sample (lille), saa fartfiltret er paalideligt - behold det altid.
      const isReasonableSpeed = speedKmh <= MAX_SPEED_KMH;
      const isAccurate = accuracy <= MAX_ACCURACY;

      const isValidPoint = isMinDistance && isNotTeleport && isReasonableSpeed && isAccurate;
      
      if (isValidPoint) {
        const newDistance = distanceRef.current + dist;
        distanceRef.current = newDistance;
        setDistance(newDistance);
        
                // LET UDJAEVNING (kun visning/rute - distance regnes paa raa punkter, uaendret)
        const prevDrawn = positionsRef.current[positionsRef.current.length - 1];
        let drawLat = newPos.latitude;
        let drawLng = newPos.longitude;
        if (prevDrawn) {
          const alpha = 0.7;
          drawLat = prevDrawn.latitude * (1 - alpha) + newPos.latitude * alpha;
          drawLng = prevDrawn.longitude * (1 - alpha) + newPos.longitude * alpha;
        }

        const posWithData = {
          ...newPos,
          latitude: drawLat,
          longitude: drawLng,
          speed: speedKmh,
          segmentDistance: dist,
          isRunning: !fromBackground && speedKmh >= 9,
        };
        
        positionsRef.current = [...positionsRef.current, posWithData];
        setPositions(positionsRef.current);
        lastValidPositionRef.current = newPos;
        
        console.log(`✓ GPS: +${dist.toFixed(1)}m = ${(newDistance/1000).toFixed(3)}km | ${speedKmh.toFixed(1)}km/h | acc:${accuracy.toFixed(0)}m`);
      } else {
        setFilteredPoints(prev => prev + 1);
        // FIX: punkt forkastet KUN pga. MIN_DISTANCE er stadig en valid position.
        // Ryk referencen frem saa naeste punkt ikke maales mod et foraeldet punkt
                            // (ellers oppustes afstand+fart -> falske speed-drops). Distancen taelles ikke med her.
                  if (isNotTeleport) {
          lastValidPositionRef.current = newPos;
          lastSampleTimestampRef.current = newPos.timestamp;
        }
        // Smart escape: ved GPS-gap (typisk iOS-baggrunds-batch) taeller vi den
        // interpolerede distance med - capped til hvad max-fart tillader - saa vi
        // ikke mister km. Bedre at undertaelle lidt end at tegne en lige linje.
                              if (!isNotTeleport && timeDiff > 5 && accuracy <= 200) {
                    const maxAllowedDist = (MAX_SPEED_KMH / 3.6) * timeDiff;
                                const interpolatedDist = Math.min(dist, maxAllowedDist);
          if (interpolatedDist > MIN_DISTANCE) {
            const newDistance = distanceRef.current + interpolatedDist;
            distanceRef.current = newDistance;
            setDistance(newDistance);
            const posWithData = {
              ...newPos,
              speed: (interpolatedDist / timeDiff) * 3.6,
              segmentDistance: interpolatedDist,
              isRunning: false,
              interpolated: true,
            };
            positionsRef.current = [...positionsRef.current, posWithData];
            setPositions(positionsRef.current);
            console.log(`~ GPS interpolated: +${interpolatedDist.toFixed(1)}m (raw ${dist.toFixed(1)}m, gap ${timeDiff.toFixed(1)}s)`);
          }
          lastValidPositionRef.current = newPos;
          lastSampleTimestampRef.current = newPos.timestamp;
        }
        const reasons = [];
        if (!isMinDistance) reasons.push(`dist<${MIN_DISTANCE}m`);
        if (!isNotTeleport) reasons.push(`jump>${MAX_SINGLE_JUMP}m`);
        if (!isReasonableSpeed) reasons.push(`speed>${MAX_SPEED_KMH}km/h`);
        if (!isAccurate) reasons.push(`acc>${MAX_ACCURACY}m`);
        global._fr = global._fr || { dist: 0, jump: 0, speed: 0, acc: 0 };
        if (!isMinDistance) global._fr.dist++;
        if (!isNotTeleport) global._fr.jump++;
        if (!isReasonableSpeed) global._fr.speed++;
        if (!isAccurate) global._fr.acc++;
        console.log(`✗ GPS filtered: ${dist.toFixed(1)}m, ${speedKmh.toFixed(1)}km/h, acc:${accuracy.toFixed(0)}m [${reasons.join(', ')}]`);
      }
    } else {
              // Første position - kraev god accuracy fra start (ellers springer GPS rundt senere)
        const accuracy = newPos.accuracy || 15;
        if (accuracy <= (activityType === 'bike' ? 75 : 50)) {
        const firstPos = { ...newPos, speed: 0, segmentDistance: 0, isRunning: false };
        positionsRef.current = [firstPos];
        setPositions([firstPos]);
        lastValidPositionRef.current = newPos;
        lastSampleTimestampRef.current = newPos.timestamp;
        console.log(`✓ GPS: First position recorded, acc:${accuracy.toFixed(0)}m`);
      } else {
        console.log(`✗ GPS: First position rejected, acc:${accuracy.toFixed(0)}m too poor (need <= 50m)`);
      }
    }
  };

  // Keep ref in sync
  handlePositionUpdateRef.current = handlePositionUpdate;

  const startBackgroundLocationTracking = async () => {
    if (isWeb || !Location || !TaskManager) return false;

    try {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        console.log('Background location permission denied');
        return false;
      }

      const isTaskRunning = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isTaskRunning) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }

      global._backgroundLocations = [];
      global._isBackgroundTracking = true;

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Platform.OS === 'ios' ? Location.Accuracy.Highest : Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        // distanceInterval: 0 = leverer punkter kontinuerligt (ikke kun hver 5m), undgaar GPS-gaps.
        distanceInterval: 0,
        // Distance-based deferred updates give a more consistent km measurement
        // in the background than time-based ones (OS won't skip points after
                        // every 10 m of movement, even if it batches them).
                deferredUpdatesInterval: 0,
                deferredUpdatesDistance: 0,  // deliver points continuously in background (more points, better distance when screen locked)
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'RunWithAI',
          notificationBody: activityType === 'run' ? 'Tracking dit løb...' : 'Tracking din gåtur...',
          notificationColor: '#c8ff00',
        },
        pausesUpdatesAutomatically: false,
                // Fitness holder GPS i live-mode under bevaegelse (mindst iOS-batching
                // naar skaermen er laast). Deferred updates er slaaet fra ovenfor.
                activityType: Location.ActivityType.Fitness,
      });

      console.log('Background tracking started');
      return true;
    } catch (e) {
      console.error('Failed to start background location:', e);
      return false;
    }
  };

  const stopBackgroundLocationTracking = async () => {
    if (isWeb || !Location || !TaskManager) return;

    try {
      global._isBackgroundTracking = false;
      const isTaskRunning = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isTaskRunning) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log('Background tracking stopped');
      }
    } catch (e) {
      console.error('Failed to stop background location:', e);
    }
  };

  const startTracking = async () => {
    console.log('=== START TRACKING ===');
    setIsTracking(true);
    setIsPaused(false);
    setGpsStatus('waiting');
    setGpsError('');
    setGpsPoints(0);
    setFilteredPoints(0);
    global._fr = { dist: 0, jump: 0, speed: 0, acc: 0, maxGap: 0, bigGaps: 0 }; // reset GPS filter debug counters per run
    startTimeRef.current = Date.now() - (duration * 1000);
    
    // Start Live Activity (iOS) - vises paa laaseskaerm og Dynamic Island
    LiveActivity.start({
      activityType,
      distanceMeters: distanceRef.current,
      durationSeconds: duration,
      paceMinPerKm: 0,
      isPaused: false,
    }).catch(e => console.log('LiveActivity start failed:', e));
    
    // Reset refs
    positionsRef.current = positions;
    lastValidPositionRef.current = null;
    lastSampleTimestampRef.current = 0;
    distanceRef.current = distance;
    
    const token = getAuthToken();
    setVoiceAuthToken(token);
    const bestPace = (runs || []).filter(r => r.pace > 0 && r.km > 0.5).reduce((best, r) => (!best || r.pace < best) ? r.pace : best, null);
    const bestKm = (runs || []).filter(r => r.km > 0).reduce((best, r) => (!best || r.km > best) ? r.km : best, null);
    const targetKm = nextWorkout?.km || null;
    voiceCoachRef.current = new VoiceCoach({
      enabled: voiceEnabled,
      name: profile?.name || t('tracker.defaultRunner'),
      activityType,
      bestPace,
      bestKm,
      targetKm,
    });
    
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDuration(elapsed);
      if (voiceCoachRef.current) {
        const km = distanceRef.current / 1000;
        const paceMinPerKm = km > 0 ? (elapsed / 60) / km : 0;
        voiceCoachRef.current.update({ km, durationSecs: elapsed, paceMinPerKm });
      }
      // Opdater Live Activity hver sekund med friske stats
      // Opdater Live Activity max hvert 3. sekund (undgaa iOS race condition)
      const now = Date.now();
      if (!lastLiveActivityUpdateRef.current || now - lastLiveActivityUpdateRef.current >= 1000) {
        lastLiveActivityUpdateRef.current = now;
        const km = distanceRef.current / 1000;
        const paceMinPerKm = km > 0 ? (elapsed / 60) / km : 0;
        LiveActivity.update({
          distanceMeters: distanceRef.current,
          durationSeconds: elapsed,
          paceMinPerKm: paceMinPerKm,
          isPaused: false,
        }).catch(() => {});
      }
    }, 1000);

    if (!isWeb && Location) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setGpsStatus('error');
          setGpsError(t('tracker.gps.denied'));
          return;
        }

        await startBackgroundLocationTracking();
        await startKeepAliveAudio();

        if (Platform.OS === 'android') {
          watchSubscriptionRef.current = await Location.watchPositionAsync(
          { 
            accuracy: Location.Accuracy.BestForNavigation, 
            timeInterval: 500,
            distanceInterval: 1
          },
          (location) => {
            const update = handlePositionUpdateRef.current || handlePositionUpdate;
            update({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              timestamp: location.timestamp,
              accuracy: location.coords.accuracy,
            });
          }
        );
        console.log('Foreground GPS started (500ms/1m)');
        } else {
          watchSubscriptionRef.current = await Location.watchPositionAsync(
{ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 1 },
(location) => {
(handlePositionUpdateRef.current || handlePositionUpdate)({
latitude: location.coords.latitude,
longitude: location.coords.longitude,
timestamp: location.timestamp,
accuracy: location.coords.accuracy,
});
}
);
console.log('iOS foreground GPS started (1000ms/1m) - bg task continues when locked');
        }
      } catch (e) {
        setGpsStatus('error');
        setGpsError(e.message || t('tracker.gps.error'));
      }
      return;
    }
    
    if (isWeb && typeof navigator !== 'undefined' && navigator.geolocation) {
      watchSubscriptionRef.current = navigator.geolocation.watchPosition(
        (position) => {
          (handlePositionUpdateRef.current || handlePositionUpdate)({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: position.timestamp,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          setGpsStatus('error');
          if (error.code === 1) setGpsError(t('tracker.gps.denied'));
          else if (error.code === 2) setGpsError(t('tracker.gps.unavailable'));
          else setGpsError(t('tracker.gps.timeout'));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
      );
      return;
    }
    
    setGpsStatus('error');
    setGpsError(t('tracker.gps.notAvailable'));
  };


    // ─── KEEP-ALIVE AUDIO (holder appen vaagen i baggrunden) ───────────────
    // Afspiller en stille lyd i loop saa iOS audio-mode holder appen i live mens
    // skaermen er laast. Uden dette suspenderer iOS appen mellem VoiceCoach-klip
    // og GPS-leveringen stopper (lange lige linjer / store gaps).
    const startKeepAliveAudio = async () => {
          if (isWeb) return;
          try {
                  const AV = require('expo-av');
                  await AV.Audio.setAudioModeAsync({
                            allowsRecordingIOS: false,
                            playsInSilentModeIOS: true,
                            staysActiveInBackground: true,
                            shouldDuckAndroid: true,
                    interruptionModeIOS: AV.Audio.InterruptionModeIOS.MixWithOthers,
                  });
                  if (keepAliveSoundRef.current) {
                            try { await keepAliveSoundRef.current.unloadAsync(); } catch {}
                            keepAliveSoundRef.current = null;
                  }
                  const { sound } = await AV.Audio.Sound.createAsync(
                            require('../../assets/silence.mp3'),
                    { shouldPlay: true, isLooping: true, volume: 0.05 }                          );
                  keepAliveSoundRef.current = sound;
                  // Watchdog: hvis iOS pauser den stille loop, genstart den straks saa appen ikke suspenderes.
                  sound.setOnPlaybackStatusUpdate((status) => {
                    if (status && status.isLoaded && !status.isPlaying && !status.didJustFinish) {
                      sound.playAsync().catch(() => {});
                    }
                  });
                  if (keepAliveWatchdogRef.current) clearInterval(keepAliveWatchdogRef.current);
                  keepAliveWatchdogRef.current = setInterval(async () => {
                    try {
                      const s = keepAliveSoundRef.current;
                      if (!s) return;
                      const st = await s.getStatusAsync();
                      if (st && st.isLoaded && !st.isPlaying) {
                        await s.playAsync().catch(() => {});
                        console.log('Keep-alive watchdog: restarted silent loop');
                      }
                    } catch {}
                  }, 2000);
                  console.log('Keep-alive audio started');
          } catch (e) {
                  console.log('Keep-alive audio failed:', e.message);
          }
    };

    const stopKeepAliveAudio = async () => {
          if (isWeb) return;
          try {
                  if (keepAliveWatchdogRef.current) {
                            clearInterval(keepAliveWatchdogRef.current);
                            keepAliveWatchdogRef.current = null;
                  }
                  if (keepAliveSoundRef.current) {
                            try { await keepAliveSoundRef.current.setOnPlaybackStatusUpdate(null); } catch {}
                            await keepAliveSoundRef.current.stopAsync().catch(() => {});
                            await keepAliveSoundRef.current.unloadAsync().catch(() => {});
                            keepAliveSoundRef.current = null;
                            console.log('Keep-alive audio stopped');
                  }
          } catch (e) {
                  console.log('Keep-alive stop failed:', e.message);
          }
    };
  
  const stopGpsWatch = () => {
    if (watchSubscriptionRef.current) {
      if (!isWeb && watchSubscriptionRef.current.remove) {
        watchSubscriptionRef.current.remove();
      } else if (isWeb && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchSubscriptionRef.current);
      }
      watchSubscriptionRef.current = null;
    }
  };

  const pauseTracking = async () => {
    setIsPaused(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    stopGpsWatch();
    await stopBackgroundLocationTracking();
    await stopKeepAliveAudio();
    // Marker Live Activity som pause - bliver staaende paa laaseskaerm
    const km = distanceRef.current / 1000;
    const paceMinPerKm = km > 0 ? (duration / 60) / km : 0;
    LiveActivity.update({
      distanceMeters: distanceRef.current,
      durationSeconds: duration,
      paceMinPerKm,
      isPaused: true,
    }).catch(() => {});
  };

  // ─── RESUME TRACKING (FIX: nulstiller ikke distance/positions) ───────────
  const resumeTracking = async () => {
    setIsPaused(false);
    setGpsStatus('waiting');
    startTimeRef.current = Date.now() - (duration * 1000);

    const token = getAuthToken();
    setVoiceAuthToken(token);

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDuration(elapsed);
      if (voiceCoachRef.current) {
        const km = distanceRef.current / 1000;
        const paceMinPerKm = km > 0 ? (elapsed / 60) / km : 0;
        voiceCoachRef.current.update({ km, durationSecs: elapsed, paceMinPerKm });
      }
      // Opdater Live Activity hver sekund med friske stats
      // Opdater Live Activity max hvert 3. sekund (undgaa iOS race condition)
      const now = Date.now();
      if (!lastLiveActivityUpdateRef.current || now - lastLiveActivityUpdateRef.current >= 1000) {
        lastLiveActivityUpdateRef.current = now;
        const km = distanceRef.current / 1000;
        const paceMinPerKm = km > 0 ? (elapsed / 60) / km : 0;
        LiveActivity.update({
          distanceMeters: distanceRef.current,
          durationSeconds: elapsed,
          paceMinPerKm: paceMinPerKm,
          isPaused: false,
        }).catch(() => {});
      }
    }, 1000);

    if (!isWeb && Location) {
      await startBackgroundLocationTracking();
      await startKeepAliveAudio();
      if (Platform.OS === 'android') {
        watchSubscriptionRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 500, distanceInterval: 1 },
        (location) => {
          (handlePositionUpdateRef.current || handlePositionUpdate)({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            accuracy: location.coords.accuracy,
          });
        }
      );
      } else {
        watchSubscriptionRef.current = await Location.watchPositionAsync(
{ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 1 },
(location) => {
(handlePositionUpdateRef.current || handlePositionUpdate)({
latitude: location.coords.latitude,
longitude: location.coords.longitude,
timestamp: location.timestamp,
accuracy: location.coords.accuracy,
});
}
);
console.log('iOS resume foreground GPS started');
      }
    } else if (isWeb && typeof navigator !== 'undefined' && navigator.geolocation) {
      watchSubscriptionRef.current = navigator.geolocation.watchPosition(
        (position) => {
          (handlePositionUpdateRef.current || handlePositionUpdate)({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: position.timestamp,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => { setGpsStatus('error'); },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
      );
    }
  };

  const stopAndSave = async () => {
    console.log('=== STOP AND SAVE ===');
    if (intervalRef.current) clearInterval(intervalRef.current);
    stopGpsWatch();
    await stopBackgroundLocationTracking();
    await stopKeepAliveAudio();
    processBackgroundLocations();
    
    // Afslut Live Activity
    LiveActivity.end().catch(() => {});
    
    setIsTracking(false);

const km = parseFloat((distance / 1000).toFixed(2));
const paceMinPerKm = km > 0 ? (duration / 60) / km : 0;

// ─── BEREGN KALORIER (kcal = MET × kg × timer) ─────────────────────────
const weightKg = parseFloat(profile?.weight_kg || profile?.weight) || 70; // fallback 70 kg
const hours = duration / 3600;
// MET-værdier: gå ~3.5, jog ~7, løb ~9.8, hurtigt løb ~11.5
let met;
const speedKmh = (duration > 0 && km > 0) ? (km / (duration / 3600)) : 0;

if (activityType === 'walk') {
  met = 3.5;
} else if (activityType === 'bike') {
  // Cykling MET baseret paa hastighed (km/t)
  if (speedKmh < 16) met = 4.0;        // afslappet
  else if (speedKmh < 19) met = 6.8;   // moderat
  else if (speedKmh < 22) met = 8.0;   // raskt
  else if (speedKmh < 25) met = 10.0;  // hurtigt
  else if (speedKmh < 30) met = 12.0;  // racer-tempo
  else met = 15.8;                      // race
} else {
  // Loeb: brug pace til at vurdere intensitet
  if (paceMinPerKm > 0 && paceMinPerKm < 5) met = 11.5;
  else if (paceMinPerKm > 0 && paceMinPerKm < 6) met = 9.8;
  else if (paceMinPerKm > 0 && paceMinPerKm < 7) met = 8.3;
  else met = 7.0;
}
const calories = Math.round(met * weightKg * hours);
console.log('Calories: ' + calories + ' kcal (MET=' + met + ', weight=' + weightKg + 'kg, hours=' + hours.toFixed(2) + ')');

    if (voiceCoachRef.current) {
      voiceCoachRef.current.finish({ km, durationSecs: duration, paceMinPerKm });
    }

    const route = positionsRef.current.map(p => ({ lat: p.latitude, lng: p.longitude }));

    let runningDistance = 0;
    let walkingDistance = 0;
    positionsRef.current.forEach(p => {
      if (p.segmentDistance) {
        if (p.isRunning) {
          runningDistance += p.segmentDistance;
        } else {
          walkingDistance += p.segmentDistance;
        }
      }
    });

    const runningKm = parseFloat((runningDistance / 1000).toFixed(2));
    const walkingKm = parseFloat((walkingDistance / 1000).toFixed(2));

    console.log(`Final: ${km}km (run:${runningKm}, walk:${walkingKm}), ${gpsPoints} GPS pts, ${filteredPoints} filtered`);

const runData = {
  km,
  duration,
  pace: paceMinPerKm,
  heart_rate: null,
  calories,
  route,
      notes: `gps:${gpsPoints}/${gpsPoints + filteredPoints} d:${(global._fr||{}).dist||0} j:${(global._fr||{}).jump||0} s:${(global._fr||{}).speed||0} a:${(global._fr||{}).acc||0} g:${((global._fr||{}).maxGap||0).toFixed(0)} b:${(global._fr||{}).bigGaps||0}`,
  type: activityType === 'run' ? 'run' : 'walk',
  date: new Date().toISOString(),
  running_km: runningKm,
  walking_km: walkingKm,
};

// Bike-payload til /activities endpoint
const bikePayload = {
  type: 'bike',
  started_at: new Date(Date.now() - duration * 1000).toISOString(),
  duration_sec: duration,
  calories_kcal: calories,
  distance_m: Math.round(km * 1000),
  avg_speed_kmh: speedKmh > 0 ? parseFloat(speedKmh.toFixed(2)) : null,
  max_speed_kmh: null,
  gps_polyline: route.length > 0 ? JSON.stringify(route) : null,
  notes: `gps:${gpsPoints}/${gpsPoints + filteredPoints} d:${(global._fr||{}).dist||0} j:${(global._fr||{}).jump||0} s:${(global._fr||{}).speed||0} a:${(global._fr||{}).acc||0} g:${((global._fr||{}).maxGap||0).toFixed(0)} b:${(global._fr||{}).bigGaps||0}`,
  source: 'app',
};

    try {
      const token = getAuthToken();
      if (token) {
        const isBike = activityType === 'bike';
        const url = isBike ? (SERVER + '/activities') : (SERVER + '/runs');
        const body = isBike ? bikePayload : runData;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify(body),
        });

// Check for limit_exceeded (Free tier)
        if (res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          if (errData.error === 'limit_exceeded') {
            Alert.alert(
              'Aktivitetsgraense naaet',
              'Du har naaet graensen paa ' + (errData.limit || 3) + ' aktiviteter/uge paa Free. Opgrader til Basic eller Pro for ubegraenset adgang.',
              [
                { text: 'Senere', style: 'cancel' },
                { text: 'Opgrader', onPress: () => { if (onShowPricing) onShowPricing(); } },
              ]
            );
            return;
          }
        }
        const result = await res.json();
        console.log('Server response:', JSON.stringify(result));

        if (result.id) {
          try {
            await uploadPendingPhotos(result.id);
          } catch (uploadErr) {
            console.warn('Photo upload error:', uploadErr);
          }
          setSavedRunId(result.id);
          setShowStory(true);
          return;
        }
      }
    } catch (e) {
      console.log('Failed to save run:', e);
    }

    if (onBack) onBack();
  };

  const handleBack = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    stopGpsWatch();
    await stopBackgroundLocationTracking();
    await stopKeepAliveAudio();
    LiveActivity.end().catch(() => {});
    if (onBack) onBack();
  };

  const handleStoryClose = () => {
    setShowStory(false);
    setSavedRunId(null);
    if (onBack) onBack();
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
const formatPace = () => {
    if (distance < 10) return '--:--';
    const paceInSeconds = duration / (distance / 1000);
    const mins = Math.floor(paceInSeconds / 60);
    const secs = Math.floor(paceInSeconds % 60);
    return mins + ':' + secs.toString().padStart(2, '0');
  };

  const formatSpeed = () => {
    if (distance < 10 || duration < 1) return '--';
    const kmh = (distance / 1000) / (duration / 3600);
    return kmh.toFixed(1);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopGpsWatch();
      stopBackgroundLocationTracking();
      stopKeepAliveAudio();
      LiveActivity.end().catch(() => {});
      if (voiceCoachRef.current) voiceCoachRef.current.destroy();
    };
  }, []);

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.7}>
        <Text style={s.backText}>← {t('common.back')}</Text>
      </TouchableOpacity>
      <View style={s.header}>
        <Text style={s.title}>{activityType === 'bike' ? '🚴 Cykling' : activityType === 'run' ? ('🏃 ' + t('run.title')) : ('🚶 ' + t('run.walk'))}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[s.voiceToggle, voiceEnabled && s.voiceToggleActive]}
            onPress={() => {
              const next = !voiceEnabled;
              setVoiceEnabled(next);
              if (voiceCoachRef.current) voiceCoachRef.current.setEnabled(next);
            }}
          >
            <Text style={{ fontSize: 16 }}>{voiceEnabled ? '🔊' : '🔇'}</Text>
            <Text style={[s.voiceToggleText, voiceEnabled && s.voiceToggleTextActive]}>
              {voiceEnabled ? t('tracker.voiceOn') : t('tracker.voiceOff')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={s.subtitle}>
        {!isTracking ? t('tracker.status.ready') : isPaused ? t('tracker.status.paused') : t('tracker.status.tracking')}
      </Text>

      {!isTracking && runs && runs.length > 0 && activityType !== 'bike' && (
        <PersonalStats runs={runs} activityType={activityType} t={t} />
      )}
      
      {isTracking && (
        <Text style={[
          s.gpsStatus,
          gpsStatus === 'error' ? s.gpsError :
          gpsStatus === 'active' ? s.gpsActive :
          gpsStatus === 'waiting' ? s.gpsWaiting : s.gpsIdle
        ]}>
          {gpsStatus === 'error' ? `⚠️ ${gpsError}` :
                        gpsStatus === 'active' ? `📍 ${gpsPoints} punkter (${filteredPoints} filtreret | d:${(global._fr||{}).dist||0} j:${(global._fr||{}).jump||0} s:${(global._fr||{}).speed||0} a:${(global._fr||{}).acc||0})` :
           gpsStatus === 'waiting' ? `⏳ ${t('tracker.gps.waiting')}` : ''}
        </Text>
      )}
      
      <View style={s.statsContainer}>
        <View style={s.statBox}>
          <Text style={s.statValue}>{(distance / 1000).toFixed(2)}</Text>
          <Text style={s.statLabel}>{t('run.km')}</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statValue}>{formatTime(duration)}</Text>
          <Text style={s.statLabel}>{t('run.time')}</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statValue}>{activityType === 'bike' ? formatSpeed() : formatPace()}</Text>
          <Text style={s.statLabel}>{activityType === 'bike' ? 'KM/T' : 'MIN/KM'}</Text>
        </View>
      </View>
      
      <View style={s.mapContainer}>
        {isForeground && !isTracking && !isPaused && (
        <TrackerMap positions={positions} currentPosition={currentPosition} t={t} />
        )}
      </View>
      
      <View style={s.controls}>
        {!isTracking ? (
          <TouchableOpacity style={[s.btn, s.btnStart]} onPress={startTracking}>
            <View style={s.playIcon} />
          </TouchableOpacity>
        ) : isPaused ? (
          <>
            <TouchableOpacity style={[s.btn, s.btnStart]} onPress={resumeTracking}>
              <View style={s.playIcon} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnStop]} onPress={stopAndSave}>
              <View style={s.stopIcon} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={[s.btn, s.btnPause]} onPress={pauseTracking}>
              <View style={s.pauseIcon}>
                <View style={s.pauseBar} />
                <View style={s.pauseBar} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnStop]} onPress={stopAndSave}>
              <View style={s.stopIcon} />
            </TouchableOpacity>
          </>
        )}
        <MusicButton
          bpm={bpmRange.target}
          isRunning={isTracking && !isPaused}
          isPlaying={false}
          onPress={() => setMusicVisible(true)}
        />
      </View>

      <VoiceInput
        isRunning={isTracking && !isPaused}
        stats={{
          km: distance / 1000,
          duration: duration,
          pace: distance > 0 ? (duration / 60) / (distance / 1000) : 0,
        }}
      />

      <RunCamera isRunning={isTracking && !isPaused} />

      <MusicMatcher
        visible={musicVisible}
        onClose={() => setMusicVisible(false)}
        currentPaceSecondsPerKm={paceSecPerKm}
        isRunning={isTracking && !isPaused}
        activityType={activityType}
      />

      <PhotoStory
        runId={savedRunId}
        visible={showStory}
        onClose={handleStoryClose}
        route={positions.map(p => ({ lat: p.latitude, lng: p.longitude }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: '100%', borderRadius: 16 },
  mapPlaceholder: { width: '100%', height: '100%', borderRadius: 16, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', paddingBottom: 4 },
  voiceToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  voiceToggleActive: { backgroundColor: colors.accent + '20', borderWidth: 1, borderColor: colors.accent + '50' },
  voiceToggleText: { fontSize: 11, fontWeight: '600', color: colors.muted },
  voiceToggleTextActive: { color: colors.accent },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, paddingHorizontal: 20 },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 32, fontWeight: 'bold', color: colors.accent },
  statLabel: { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: '600' },
  mapContainer: { flex: 1, marginHorizontal: 16, marginBottom: 10, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.card },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 16, paddingBottom: 40 },
  btn: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  btnStart: { backgroundColor: colors.accent },
  btnPause: { backgroundColor: '#f59e0b' },
  btnStop: { backgroundColor: '#ef4444' },
  backBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 40, left: 16, zIndex: 100, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  gpsStatus: { textAlign: 'center', fontSize: 12, paddingVertical: 6, marginHorizontal: 16, borderRadius: 8, overflow: 'hidden' },
  gpsError: { color: '#fff', backgroundColor: '#ef4444' },
  gpsActive: { color: '#000', backgroundColor: colors.accent },
  gpsWaiting: { color: colors.muted, backgroundColor: colors.surface },
  gpsIdle: { color: colors.muted, backgroundColor: 'transparent' },
  playIcon: { width: 0, height: 0, borderLeftWidth: 18, borderLeftColor: '#fff', borderTopWidth: 11, borderTopColor: 'transparent', borderBottomWidth: 11, borderBottomColor: 'transparent', marginLeft: 4 },
  stopIcon: { width: 22, height: 22, backgroundColor: '#fff', borderRadius: 3 },
  pauseIcon: { flexDirection: 'row', gap: 6 },
  pauseBar: { width: 6, height: 22, backgroundColor: '#fff', borderRadius: 2 },
});
