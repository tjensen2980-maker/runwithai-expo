import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Platform } from 'react-native';
import { colors, SERVER, getAuthToken } from '../data';
import VoiceCoach, { stopSpeaking, setVoiceAuthToken } from '../components/VoiceCoach';
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
const isWeb = Platform.OS === 'web';
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
}
// ─── NATIVE TRACKER MAP ─────────────────────────────────────────────────────
function NativeTrackerMap({ positions, currentPosition }) {
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
        <Text style={{ color: colors.text, fontSize: 14 }}>Kort ikke tilgængeligt</Text>
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
// ─── RUNTRACKER COMPONENT ───────────────────────────────────────────────────
export default function RunTracker({ activityType = 'run', onBack, profile, level, weekPlan, nextWorkout, runs }) {
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
  
  const watchSubscriptionRef = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const distanceRef = useRef(0);

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
  const handlePositionUpdate = (newPos) => {
    setGpsStatus('active');
    setCurrentPosition(newPos);
    setPositions(prev => {
      if (prev.length > 0) {
        const lastPos = prev[prev.length - 1];
        const dist = calculateDistance(lastPos.latitude, lastPos.longitude, newPos.latitude, newPos.longitude);
        if (dist > 3) {
          setDistance(d => {
            const newDist = d + dist;
            distanceRef.current = newDist;
            return newDist;
          });
          return [...prev, newPos];
        }
        return prev;
      }
      return [newPos];
    });
  };
  const startTracking = async () => {
    console.log('startTracking called');
    setIsTracking(true);
    setIsPaused(false);
    setGpsStatus('waiting');
    setGpsError('');
    startTimeRef.current = Date.now() - (duration * 1000);
    const token = getAuthToken();
    setVoiceAuthToken(token);
    const bestPace = (runs || []).filter(r => r.pace > 0 && r.km > 0.5).reduce((best, r) => (!best || r.pace < best) ? r.pace : best, null);
    const bestKm = (runs || []).filter(r => r.km > 0).reduce((best, r) => (!best || r.km > best) ? r.km : best, null);
    const targetKm = nextWorkout?.km || null;
    voiceCoachRef.current = new VoiceCoach({
      enabled: voiceEnabled,
      name: profile?.name || 'løber',
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
          setGpsError('GPS tilladelse nægtet');
          return;
        }
        watchSubscriptionRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 },
          (location) => {
            handlePositionUpdate({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              timestamp: location.timestamp,
            });
          }
        );
      } catch (e) {
        setGpsStatus('error');
        setGpsError(e.message || 'GPS fejl');
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
          });
        },
        (error) => {
          setGpsStatus('error');
          if (error.code === 1) setGpsError('GPS tilladelse nægtet');
          else if (error.code === 2) setGpsError('GPS utilgængelig');
          else setGpsError('GPS timeout');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
      );
      return;
    }
    setGpsStatus('error');
    setGpsError('GPS ikke tilgængelig');
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
  const pauseTracking = () => {
    setIsPaused(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    stopGpsWatch();
  };
  const resumeTracking = () => {
    setIsPaused(false);
    startTimeRef.current = Date.now() - (duration * 1000);
    startTracking();
  };

  const stopAndSave = async () => {
    console.log('stopAndSave called');
    if (intervalRef.current) clearInterval(intervalRef.current);
    stopGpsWatch();
    setIsTracking(false);

    const km = parseFloat((distance / 1000).toFixed(2));
    const paceMinPerKm = km > 0 ? (duration / 60) / km : 0;

    if (voiceCoachRef.current) {
      voiceCoachRef.current.finish({ km, durationSecs: duration, paceMinPerKm });
    }

    const route = positions.map(p => ({ lat: p.latitude, lng: p.longitude }));

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
    };

    console.log('Saving run:', { km: runData.km, duration: runData.duration, routePoints: route.length });

    try {
      const token = getAuthToken();
      if (token) {
        const res = await fetch(`${SERVER}/runs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(runData),
        });
        const result = await res.json();
        console.log('Run saved:', result);

        // ─── UPLOAD PHOTOS & SHOW STORY AFTER SAVE ────────────────────────
        if (result.id) {
          // Upload any photos taken during the run
          try {
            await uploadPendingPhotos(result.id);
          } catch (uploadErr) {
            console.warn('Photo upload error (continuing):', uploadErr);
          }
          setSavedRunId(result.id);
          setShowStory(true);
          return; // Don't go back yet — story modal will handle it
        }
      }
    } catch (e) {
      console.log('Failed to save run:', e);
    }

    if (onBack) onBack();
  };

  const handleBack = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    stopGpsWatch();
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
    if (distance < 50) return '--:--';
    const paceInSeconds = duration / (distance / 1000);
    const mins = Math.floor(paceInSeconds / 60);
    const secs = Math.floor(paceInSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopGpsWatch();
      if (voiceCoachRef.current) voiceCoachRef.current.destroy();
    };
  }, []);

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.7}>
        <Text style={s.backText}>← Tilbage</Text>
      </TouchableOpacity>
      <View style={s.header}>
        <Text style={s.title}>{activityType === 'run' ? '🏃 Løb' : '🚶 Gå'}</Text>
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
              {voiceEnabled ? 'Stemme til' : 'Stemme fra'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={s.subtitle}>
          {!isTracking ? 'Tryk start for at begynde' : isPaused ? 'På pause' : 'Tracker...'}
      </Text>
      {isTracking && (
        <Text style={[
          s.gpsStatus,
          gpsStatus === 'error' ? s.gpsError :
          gpsStatus === 'active' ? s.gpsActive :
          gpsStatus === 'waiting' ? s.gpsWaiting : s.gpsIdle
        ]}>
          {gpsStatus === 'error' ? `⚠️ ${gpsError}` :
           gpsStatus === 'active' ? '📍 GPS aktiv' :
           gpsStatus === 'waiting' ? '⏳ Finder GPS signal...' : ''}
        </Text>
      )}
      <View style={s.statsContainer}>
        <View style={s.statBox}>
          <Text style={s.statValue}>{(distance / 1000).toFixed(2)}</Text>
          <Text style={s.statLabel}>KM</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statValue}>{formatTime(duration)}</Text>
          <Text style={s.statLabel}>TID</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statValue}>{formatPace()}</Text>
          <Text style={s.statLabel}>MIN/KM</Text>
        </View>
      </View>
      <View style={s.mapContainer}>
        <TrackerMap positions={positions} currentPosition={currentPosition} />
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

      {/* ─── VOICE INPUT (talk to AI coach during run) ───────────────────── */}
      <VoiceInput
        isRunning={isTracking && !isPaused}
        stats={{
          km: distance / 1000,
          duration: duration,
          pace: distance > 0 ? (duration / 60) / (distance / 1000) : 0,
        }}
      />

      {/* ─── CAMERA BUTTON (floating, during active run) ─────────────────── */}
      <RunCamera isRunning={isTracking && !isPaused} />

      {/* ─── MUSIC TEMPO MATCHER MODAL ───────────────────────────────────── */}
      <MusicMatcher
        visible={musicVisible}
        onClose={() => setMusicVisible(false)}
        currentPaceSecondsPerKm={paceSecPerKm}
        isRunning={isTracking && !isPaused}
        activityType={activityType}
      />

      {/* ─── PHOTO STORY MODAL (after run saved) ─────────────────────────── */}
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
  map: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  mapPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
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