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
if (!isWeb && typeof global !== 'undefined') {
  global._backgroundLocations = global._backgroundLocations || [];
  global._isBackgroundTracking = false;
}

if (!isWeb && TaskManager) {
  // --- DEBUG LOG (midlertidig fejlsoegning af baggrunds-tracking) ---
if (!global._dbgLog) { global._dbgLog = []; }
global._dbg = (msg) => {
  try {
    const ts = new Date().toLocaleTimeString('da-DK', { hour12: false });
    global._dbgLog.push(ts + '  ' + msg);
    if (global._dbgLog.length > 60) { global._dbgLog.shift(); }
  } catch (e) {}
};
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }) => {
    global._dbg('BG-task fired (error=' + (error ? 'JA' : 'nej') + ')');
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
  // DEBUG: refresh debug-panel ca. 1x/sek
  const [dbgTick, setDbgTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDbgTick(x => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
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
  const handlePositionUpdateRef = useRef(null);
  const lastForegroundTimestampRef = useRef(0);

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
      global._dbg('AppState -> ' + nextAppState);
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
    });

    return () => subscription?.remove();
  }, []);

  // ─── KEEPALIVE: prevent iOS from killing app when swiped away during tracking ────────
  // On iOS, swiping the app away while tracking can terminate the process even with
  // UIBackgroundModes=location set, if there is no active foreground service.
  // Playing a (near-)silent looping audio session keeps the app process alive.
  // We bundle a local silent asset so this never depends on the network.
  // NOTE: this effect is written to be race-safe — if the user swipes the app away
  // the instant tracking starts, the cleanup must still find and dispose the sound
  // even if createAsync() hasn't resolved yet. Otherwise a half-created sound is
  // orphaned while the audio session tears down, which crashed the app intermittently.
  useEffect(() => {
    if (isWeb || !isTracking || isPaused) return;
    let cancelled = false;
    let kaWatchdog = null;
    // Hold the sound in a closure var that cleanup can always see.
    let soundRef = null;

    const startSilentAudio = async () => {
      try {
        const { Audio, InterruptionModeIOS, InterruptionModeAndroid } = require('expo-av');
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
          // iOS suspenderer en afbrydelig lydsession i baggrunden, hvilket
          // stopper location efter ~30-60s. DoNotMix holder sessionen aktiv.
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        });
        if (cancelled) return; // unmounted during setAudioModeAsync — bail out
        // Local bundled silent loop. shouldPlay:true makes createAsync start playback
        // itself, so we must NOT call playAsync() again afterwards (double-start crash).
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/silence.mp3'),
          { isLooping: true, volume: 0.01, shouldPlay: true }
        );
        soundRef = sound;
        // Watchdog: iOS can silently stop the keepalive audio session, which lets the
        // app suspend and kills background GPS. Periodically re-assert playback.
        if (kaWatchdog) { clearInterval(kaWatchdog); }
        kaWatchdog = setInterval(async () => {
          if (cancelled || !soundRef) { return; }
          try {
            const st = await soundRef.getStatusAsync();
            if (st && st.isLoaded && !st.isPlaying) {
              await soundRef.playAsync();
            }
          } catch (e) {
            console.log('keepalive watchdog error', e);
          }
        }, 10000);
        // If we were cancelled while createAsync was resolving, dispose immediately.
        if (cancelled) {
          await sound.unloadAsync().catch(() => {});
          soundRef = null;
          return;
        }
        console.log('[Keepalive] Silent audio session active');
      } catch (e) {
        // expo-av not available or asset missing — silently continue.
        console.log('[Keepalive] Audio session not available:', e && e.message);
      }
    };
    startSilentAudio();

    return () => {
      cancelled = true;
      // Dispose whatever exists, guarding every async call so a fast unmount
      // never throws or leaves an orphaned sound instance.
      if (soundRef) {
        if (kaWatchdog) { clearInterval(kaWatchdog); kaWatchdog = null; }
        const s = soundRef;
        soundRef = null;
        s.stopAsync().catch(() => {});
        s.unloadAsync().catch(() => {});
      }
    };
  }, [isTracking, isPaused]);

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
    global._dbg('pos-update modtaget');
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
      const timeDiff = Math.max(0.1, (newPos.timestamp - lastPos.timestamp) / 1000);
      const speedMs = dist / timeDiff;
      const speedKmh = speedMs * 3.6;
      const accuracy = newPos.accuracy || 15;

      // ── GPS FILTERING ────────────────────────────────────────────────────────────
      // Tightened so the recorded route actually follows roads/paths instead of
      // drawing long straight lines between inaccurate fixes.
      const MIN_DISTANCE = 1;        // ignore sub-1m jitter
      const MAX_SPEED_KMH = 60;      // covers edge-case GPS spikes; real runners won't hit this
      // Reject low-quality fixes. Phone GPS on a clear sky is typically 5-15m.
      // Anything worse than ~25-35m produces the "cuts across buildings" artefact.
      // We allow a little more slack for background (battery-saver) points.
      const MAX_ACCURACY = fromBackground ? 35 : 25;
      // Dynamic jump limit: allow up to speed×time + 25 m safety buffer, min 60 m.
      // Much tighter than before (was 120 m) so a single bad fix can't fling the line.
      const MAX_SINGLE_JUMP = Math.max(60, (MAX_SPEED_KMH / 3.6) * timeDiff + 25);

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
          isRunning: speedKmh >= 9, // speed-based only; BG points have real speed data
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
      // Første position - kraev god accuracy fra start (ellers springer GPS rundt senere)
      const accuracy = newPos.accuracy || 15;
      if (accuracy <= 30) {
        const firstPos = { ...newPos, speed: 0, segmentDistance: 0, isRunning: false };
        positionsRef.current = [firstPos];
        setPositions([firstPos]);
        lastValidPositionRef.current = newPos;
        console.log(`✓ GPS: First position recorded, acc:${accuracy.toFixed(0)}m`);
      } else {
        console.log(`✗ GPS: First position rejected, acc:${accuracy.toFixed(0)}m too poor (need <= 30m)`);
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
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
        // Deferred updates: let OS batch points every 5 m / 1 s — reduces wake-ups
        // without losing distance precision.
        deferredUpdatesInterval: 1000,
        deferredUpdatesDistance: 5,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'RunWithAI',
          notificationBody: activityType === 'run' ? 'Tracker dit løb...' : 'Tracker din gåtur...',
          notificationColor: '#c8ff00',
        },
        // iOS: NEVER pause updates automatically — this is the #1 reason
        // background tracking silently stops mid-run.
        pausesUpdatesAutomatically: false,
        // OtherNavigation: less aggressive batching than Fitness mode.
        activityType: Location.ActivityType.OtherNavigation,
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
            timeInterval: 1000,   // 1 s — avoids flooding when screen is on
            distanceInterval: 2,  // at least 2 m movement between foreground samples
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
    }, 1000);

    if (!isWeb && Location) {
      await startBackgroundLocationTracking();
      watchSubscriptionRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 2 }, (location) => {
          (handlePositionUpdateRef.current || handlePositionUpdate)({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            accuracy: location.coords.accuracy,
          });
        }
      );
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
    processBackgroundLocations();

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
      else met = 15.8;                     // race
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
      notes: null,
      type: (activityType === 'walk') ? 'walk' : (runningKm >= walkingKm ? 'run' : 'walk'),
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
      if (voiceCoachRef.current) voiceCoachRef.current.destroy();
    };
  }, []);

  return (
    <View style={s.container}>
      {/* DEBUG PANEL (midlertidig) */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 40, left: 4, right: 4, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.75)', padding: 6, borderRadius: 6, maxHeight: 200 }}>
        <Text style={{ color: '#0f0', fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
          {((global._dbgLog || []).slice(-14).join('\n')) + (dbgTick ? '' : '')}
        </Text>
      </View>
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
          <Text style={s.statValue}>{activityType === 'bike' ? formatSpeed() : formatPace()}</Text>
          <Text style={s.statLabel}>{activityType === 'bike' ? 'KM/T' : 'MIN/KM'}</Text>
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
