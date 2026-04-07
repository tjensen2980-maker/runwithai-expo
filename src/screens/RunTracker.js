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
// Global storage for background locations (TaskManager runs outside React)
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
        // Store in global for pickup by component
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
export default function RunTracker({ activityType = 'run', onBack, profile, level, weekPlan, nextWorkout, runs }) {
  const { t } = useTranslation();
  const [isTracking, setIsTracking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const voiceCoachRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [positions, setPositions] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [gpsError, setGpsError] = useState('');
  const [gpsPoints, setGpsPoints] = useState(0);
  const [filteredPoints, setFilteredPoints] = useState(0);
  
  const watchSubscriptionRef = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const distanceRef = useRef(0);
  const positionsRef = useRef([]);
  const lastValidPositionRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

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

  // ─── PROCESS BACKGROUND LOCATIONS ─────────────────────────────────────────
  const processBackgroundLocations = () => {
    if (!isWeb && global._backgroundLocations && global._backgroundLocations.length > 0) {
      const bgLocations = [...global._backgroundLocations];
      global._backgroundLocations = [];
      
      console.log('Processing', bgLocations.length, 'background locations');
      bgLocations.forEach(newPos => {
        handlePositionUpdate(newPos, true);
      });
    }
  };

  // ─── APP STATE HANDLER (foreground/background) ────────────────────────────
  useEffect(() => {
    if (isWeb) return;

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App foregrounded, processing background locations...');
        processBackgroundLocations();
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription?.remove();
  }, []);

  // ─── PERIODIC CHECK FOR BACKGROUND LOCATIONS ──────────────────────────────
  useEffect(() => {
    if (!isTracking || isPaused || isWeb) return;

    const bgInterval = setInterval(() => {
      processBackgroundLocations();
    }, 1000);

    return () => clearInterval(bgInterval);
  }, [isTracking, isPaused]);

  const handlePositionUpdate = (newPos, fromBackground = false) => {
    setGpsStatus('active');
    setCurrentPosition(newPos);
    setGpsPoints(prev => prev + 1);
    
    const lastPos = lastValidPositionRef.current;
    
    if (lastPos) {
      const dist = calculateDistance(lastPos.latitude, lastPos.longitude, newPos.latitude, newPos.longitude);
      const timeDiff = Math.max(0.1, (newPos.timestamp - lastPos.timestamp) / 1000);
      const speedMs = dist / timeDiff;
      const speedKmh = speedMs * 3.6;
      const accuracy = newPos.accuracy || 15;
      
      // ═══════════════════════════════════════════════════════════════════
      // STRICT GPS FILTERING - prevents phantom distance from GPS jumps
      // ═══════════════════════════════════════════════════════════════════
      const MIN_DISTANCE = 1;        // Minimum 1m movement to count
      const MAX_SINGLE_JUMP = 30;    // Max 30m per single update (prevents teleports)
      const MAX_SPEED_KMH = 25;      // Max 25 km/h (fast run = ~20 km/h)
      const MAX_ACCURACY = 25;       // Reject points with >25m accuracy
      
      const isMinDistance = dist >= MIN_DISTANCE;
      const isNotTeleport = dist <= MAX_SINGLE_JUMP;
      const isReasonableSpeed = speedKmh <= MAX_SPEED_KMH;
      const isAccurate = accuracy <= MAX_ACCURACY;
      
      const isValidPoint = isMinDistance && isNotTeleport && isReasonableSpeed && isAccurate;
      
      if (isValidPoint) {
        const newDistance = distanceRef.current + dist;
        distanceRef.current = newDistance;
        setDistance(newDistance);
        
        const posWithData = {
          ...newPos,
          speed: speedKmh,
          segmentDistance: dist,
          isRunning: speedKmh >= 7,
        };
        
        positionsRef.current = [...positionsRef.current, posWithData];
        setPositions(positionsRef.current);
        lastValidPositionRef.current = newPos;
        
        console.log(`✓ GPS: +${dist.toFixed(1)}m = ${(newDistance/1000).toFixed(3)}km | ${speedKmh.toFixed(1)}km/h | acc:${accuracy.toFixed(0)}m`);
      } else {
        setFilteredPoints(prev => prev + 1);
        const reasons = [];
        if (!isMinDistance) reasons.push(`dist<${MIN_DISTANCE}m`);
        if (!isNotTeleport) reasons.push(`jump>${MAX_SINGLE_JUMP}m`);
        if (!isReasonableSpeed) reasons.push(`speed>${MAX_SPEED_KMH}km/h`);
        if (!isAccurate) reasons.push(`acc>${MAX_ACCURACY}m`);
        console.log(`✗ GPS filtered: ${dist.toFixed(1)}m, ${speedKmh.toFixed(1)}km/h, acc:${accuracy.toFixed(0)}m [${reasons.join(', ')}]`);
      }
    } else {
      // First position - always accept if accuracy is reasonable
      const accuracy = newPos.accuracy || 15;
      if (accuracy <= 50) {
        const firstPos = { ...newPos, speed: 0, segmentDistance: 0, isRunning: false };
        positionsRef.current = [firstPos];
        setPositions([firstPos]);
        lastValidPositionRef.current = newPos;
        console.log(`✓ GPS: First position recorded, acc:${accuracy.toFixed(0)}m`);
      } else {
        console.log(`✗ GPS: First position rejected, acc:${accuracy.toFixed(0)}m too poor`);
      }
    }
  };

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
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
        deferredUpdatesInterval: 500,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'RunWithAI',
          notificationBody: activityType === 'run' ? 'Tracking dit løb...' : 'Tracking din gåtur...',
          notificationColor: '#c8ff00',
        },
        pausesUpdatesAutomatically: false,
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
    startTimeRef.current = Date.now() - (duration * 1000);
    
    // Reset refs
    positionsRef.current = positions;
    lastValidPositionRef.current = null;
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

        watchSubscriptionRef.current = await Location.watchPositionAsync(
          { 
            accuracy: Location.Accuracy.BestForNavigation, 
            timeInterval: 500,
            distanceInterval: 1
          },
          (location) => {
            handlePositionUpdate({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              timestamp: location.timestamp,
              accuracy: location.coords.accuracy,
            });
          }
        );
        console.log('Foreground GPS started (500ms/1m)');
      } catch (e) {
        setGpsStatus('error');
        setGpsError(e.message || t('tracker.gps.error'));
      }
      return;
    }
    
    if (isWeb && typeof navigator !== 'undefined' && navigator.geolocation) {
      watchSubscriptionRef.current = navigator.geolocation.watchPosition(
        (position) => {
          handlePositionUpdate({
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
  };

  const resumeTracking = () => {
    setIsPaused(false);
    startTimeRef.current = Date.now() - (duration * 1000);
    startTracking();
  };

  const stopAndSave = async () => {
    console.log('=== STOP AND SAVE ===');
    if (intervalRef.current) clearInterval(intervalRef.current);
    stopGpsWatch();
    await stopBackgroundLocationTracking();
    processBackgroundLocations();
    
    setIsTracking(false);

    const km = parseFloat((distance / 1000).toFixed(2));
    const paceMinPerKm = km > 0 ? (duration / 60) / km : 0;

    if (voiceCoachRef.current) {
      voiceCoachRef.current.finish({ km, durationSecs: duration, paceMinPerKm });
    }

    const route = positionsRef.current.map(p => ({ lat: p.latitude, lng: p.longitude }));

    // Calculate running vs walking distance
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
      calories: null,
      route,
      notes: null,
      type: activityType === 'run' ? 'run' : 'walk',
      date: new Date().toISOString(),
      running_km: runningKm,
      walking_km: walkingKm,
    };

    console.log('Saving run data:', JSON.stringify({ km, duration, runningKm, walkingKm, routePoints: route.length }));

    try {
      const token = getAuthToken();
      if (token) {
        const res = await fetch(`${SERVER}/runs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(runData),
        });
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
      } else {
        console.log('No auth token!');
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
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopGpsWatch();
      stopBackgroundLocationTracking();
      if (voiceCoachRef.current) voiceCoachRef.current.destroy();
    };
  }, []);

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.7}>
        <Text style={s.backText}>← {t('common.back')}</Text>
      </TouchableOpacity>
      <View style={s.header}>
        <Text style={s.title}>{activityType === 'run' ? `🏃 ${t('run.title')}` : `🚶 ${t('run.walk')}`}</Text>
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

      {!isTracking && runs && runs.length > 0 && (
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
           gpsStatus === 'active' ? `📍 ${gpsPoints} punkter (${filteredPoints} filtreret)` :
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
          <Text style={s.statValue}>{formatPace()}</Text>
          <Text style={s.statLabel}>MIN/KM</Text>
        </View>
      </View>
      
      <View style={s.mapContainer}>
        <TrackerMap positions={positions} currentPosition={currentPosition} t={t} />
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
