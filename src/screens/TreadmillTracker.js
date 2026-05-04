// ============================================
// TreadmillTracker.js
// Indoor running/walking tracker for treadmill
// - Timer + manual distance buttons
// - Accelerometer-based step counting (hybrid distance estimate)
// - Manual calibration against treadmill display
// - Saves as run with type: 'treadmill'
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Pedometer } from 'expo-sensors';
import { useSafeAreaInsets, SafeAreaView as SafeAreaViewCtx } from 'react-native-safe-area-context';

const API_URL =
  (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_URL) ||
  'https://runwithai-server-staging.up.railway.app';

// Step length estimate from height (cm)
// Running: roughly height_cm * 0.413 / 100 = step length in meters
function estimateStepLengthM(heightCm, mode) {
  const h = parseFloat(heightCm) || 175;
  if (mode === 'walk') return (h * 0.413) / 100; // walking
  return (h * 0.45) / 100; // running (slightly longer stride)
}

// MET values for calorie estimate
function metForActivity(mode, paceMinPerKm) {
  if (mode === 'walk') return 3.8;
  if (!paceMinPerKm || paceMinPerKm === Infinity) return 8.3; // moderate run
  if (paceMinPerKm < 4) return 14.5;     // sub-4 min/km
  if (paceMinPerKm < 5) return 11.5;
  if (paceMinPerKm < 6) return 9.8;
  if (paceMinPerKm < 7) return 8.3;
  if (paceMinPerKm < 8) return 7.0;
  return 5.5;
}

function formatTime(seconds) {
  const s = Math.floor(seconds || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

function formatPace(minPerKm) {
  if (!minPerKm || !isFinite(minPerKm) || minPerKm <= 0) return '--:--';
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return m + ':' + String(s).padStart(2, '0');
}

export default function TreadmillTracker({ token, profile, mode, onClose, onSaved }) {
  // mode: 'run' or 'walk'
  const activityMode = mode === 'walk' ? 'walk' : 'run';
  const insets = useSafeAreaInsets();
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [manualKm, setManualKm] = useState(0); // distance entered by user from treadmill
  const [steps, setSteps] = useState(0);
  const [pedometerAvailable, setPedometerAvailable] = useState(false);
  const [calibrationVisible, setCalibrationVisible] = useState(false);
  const [calibrationInput, setCalibrationInput] = useState('');
  const [saving, setSaving] = useState(false);

  const startTimeRef = useRef(null);
  const pausedTimeRef = useRef(0);
  const intervalRef = useRef(null);
  const pedometerSubRef = useRef(null);
  const startStepsRef = useRef(0);

  const heightCm = (profile && (profile.height_cm || profile.height)) || 175;
  const weightKg = (profile && (profile.weight_kg || profile.weight)) || 75;
  const stepLengthM = estimateStepLengthM(heightCm, activityMode);

  // Step-based distance estimate (km)
  const stepKm = (steps * stepLengthM) / 1000;

  // Final distance: prefer manual entry if user has set it, otherwise use step estimate
  const distanceKm = manualKm > 0 ? manualKm : stepKm;

  const minutes = seconds / 60;
  const paceMinPerKm = distanceKm > 0 ? minutes / distanceKm : 0;
  const speedKmh = minutes > 0 ? (distanceKm / (minutes / 60)) : 0;

  const met = metForActivity(activityMode, paceMinPerKm);
  const calories = Math.round(met * weightKg * (minutes / 60));

  // ---------- Check pedometer availability ----------
  useEffect(function () {
    let mounted = true;
    Pedometer.isAvailableAsync()
      .then(function (available) {
        if (mounted) setPedometerAvailable(available);
      })
      .catch(function () {
        if (mounted) setPedometerAvailable(false);
      });
    return function () { mounted = false; };
  }, []);

  // ---------- Start/stop pedometer subscription ----------
  useEffect(function () {
    if (running && !paused && pedometerAvailable) {
      // Start watching steps
      const sub = Pedometer.watchStepCount(function (result) {
        // result.steps is count since subscription started
        setSteps(function (prev) {
          // We just take the cumulative steps from this subscription
          return result.steps;
        });
      });
      pedometerSubRef.current = sub;
      return function () {
        if (pedometerSubRef.current && pedometerSubRef.current.remove) {
          pedometerSubRef.current.remove();
        }
        pedometerSubRef.current = null;
      };
    }
  }, [running, paused, pedometerAvailable]);

  // ---------- Timer ----------
  useEffect(function () {
    if (running && !paused) {
      intervalRef.current = setInterval(function () {
        setSeconds(function (prev) { return prev + 1; });
      }, 1000);
      return function () {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [running, paused]);

  // ---------- Actions ----------
  function handleStart() {
    if (!running) {
      startTimeRef.current = Date.now();
      setRunning(true);
      setPaused(false);
    } else if (paused) {
      setPaused(false);
    }
  }

  function handlePause() {
    setPaused(true);
  }

  function handleAddKm(amount) {
    setManualKm(function (prev) {
      return Math.max(0, Math.round((prev + amount) * 100) / 100);
    });
  }

  function openCalibration() {
    setCalibrationInput(distanceKm > 0 ? distanceKm.toFixed(2) : '');
    setCalibrationVisible(true);
  }

  function applyCalibration() {
    const val = parseFloat(calibrationInput.replace(',', '.'));
    if (isNaN(val) || val < 0) {
      Alert.alert('Ugyldig værdi', 'Indtast et tal, fx 5.2');
      return;
    }
    setManualKm(Math.round(val * 100) / 100);
    setCalibrationVisible(false);
  }

  async function handleStop() {
    if (distanceKm <= 0) {
      Alert.alert(
        'Ingen distance',
        'Tilføj distance manuelt eller løb længere så skridt kan måles.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Afslut og gem?',
      'Distance: ' + distanceKm.toFixed(2) + ' km · Tid: ' + formatTime(seconds) + ' · ' + calories + ' kcal',
      [
        { text: 'Annuller', style: 'cancel' },
        { text: 'Gem', onPress: saveRun },
      ]
    );
  }

  async function saveRun() {
    setSaving(true);
    try {
      const body = {
        date: new Date().toISOString(),
        km: distanceKm,
        duration: seconds,
        pace: paceMinPerKm > 0 ? Math.round(paceMinPerKm * 100) / 100 : null,
        calories: calories,
        type: 'treadmill',
        notes: activityMode === 'walk' ? 'Indendoers gang (loebebaand)' : 'Indendoers loeb (loebebaand)',
        total_steps: steps || null,
      };

      const res = await fetch(API_URL + '/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      Alert.alert(
        'Gemt! 🏃',
        distanceKm.toFixed(2) + ' km på ' + formatTime(seconds) + ' · ' + calories + ' kcal forbrændt.',
        [{ text: 'OK', onPress: function () { if (onSaved) onSaved(data); if (onClose) onClose(); } }]
      );
    } catch (e) {
      Alert.alert('Fejl', e.message || 'Kunne ikke gemme');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (running && (seconds > 10 || distanceKm > 0)) {
      Alert.alert(
        'Forkast løb?',
        'Du mister al data fra denne tur.',
        [
          { text: 'Behold', style: 'cancel' },
          { text: 'Forkast', style: 'destructive', onPress: function () { if (onClose) onClose(); } },
        ]
      );
    } else {
      if (onClose) onClose();
    }
  }

// ---------- Render ----------
  return (
    <SafeAreaViewCtx style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>
            {activityMode === 'walk' ? '🚶 Løbebånd · Gang' : '🏃 Løbebånd · Løb'}
          </Text>
          {pedometerAvailable ? (
            <Text style={styles.headerSub}>Skridt-tæller aktiv</Text>
          ) : (
            <Text style={[styles.headerSub, { color: '#fa3c00' }]}>Skridt-tæller utilgængelig</Text>
          )}
        </View>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Big timer */}
        <View style={styles.timerBox}>
          <Text style={styles.timerLabel}>TID</Text>
          <Text style={styles.timer}>{formatTime(seconds)}</Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{distanceKm.toFixed(2)}</Text>
            <Text style={styles.statLabel}>KM</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatPace(paceMinPerKm)}</Text>
            <Text style={styles.statLabel}>MIN/KM</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{calories}</Text>
            <Text style={styles.statLabel}>KCAL</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{steps}</Text>
            <Text style={styles.statLabel}>SKRIDT</Text>
          </View>
        </View>

        {/* Speed indicator */}
        {distanceKm > 0 && minutes > 0 ? (
          <View style={styles.speedBox}>
            <Text style={styles.speedLabel}>Hastighed</Text>
            <Text style={styles.speedValue}>{speedKmh.toFixed(1)} km/t</Text>
          </View>
        ) : null}

        {/* Distance buttons */}
        <Text style={styles.sectionTitle}>JUSTÉR DISTANCE</Text>
        <Text style={styles.sectionHint}>
          Tilføj km manuelt fra løbebåndets display
        </Text>
        <View style={styles.distanceButtons}>
          <TouchableOpacity
            style={styles.distBtn}
            onPress={function () { handleAddKm(0.1); }}
            disabled={!running}
          >
            <Text style={styles.distBtnText}>+0.1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.distBtn}
            onPress={function () { handleAddKm(0.5); }}
            disabled={!running}
          >
            <Text style={styles.distBtnText}>+0.5</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.distBtn}
            onPress={function () { handleAddKm(1); }}
            disabled={!running}
          >
            <Text style={styles.distBtnText}>+1.0</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.distBtn}
            onPress={function () { handleAddKm(-0.1); }}
            disabled={!running || manualKm <= 0}
          >
            <Text style={[styles.distBtnText, { color: '#888' }]}>−0.1</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={openCalibration}
          style={styles.calibrateBtn}
          disabled={!running}
        >
          <Text style={styles.calibrateBtnText}>
            🎯 Indtast præcis distance fra løbebånd
          </Text>
        </TouchableOpacity>

        {/* Tip */}
        {!running ? (
          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>💡 Sådan bruger du tracker</Text>
            <Text style={styles.tipText}>
              1. Tryk START når du begynder på løbebåndet{"\n"}
              2. Tilføj distance manuelt med +0.1 / +0.5 / +1.0 knapperne{"\n"}
              3. Eller indtast den præcise distance når du er færdig{"\n"}
              4. Skridt tælles automatisk hvis telefonen er på dig
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom action bar */}
      <View style={[styles.bottomBar, { paddingBottom: 0 + (insets.bottom || 0) }]}>
        {!running ? (
          <TouchableOpacity
            style={[styles.bigBtn, styles.startBtn]}
            onPress={handleStart}
          >
            <Text style={styles.bigBtnText}>START</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
            {paused ? (
              <TouchableOpacity
                style={[styles.bigBtn, styles.startBtn, { flex: 1 }]}
                onPress={handleStart}
              >
                <Text style={styles.bigBtnText}>FORTSÆT</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.bigBtn, styles.pauseBtn, { flex: 1 }]}
                onPress={handlePause}
              >
                <Text style={styles.bigBtnText}>PAUSE</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.bigBtn, styles.stopBtn, { flex: 1 }]}
              onPress={handleStop}
              disabled={saving}
            >
              <Text style={styles.bigBtnText}>{saving ? 'GEMMER...' : 'STOP'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Calibration modal */}
      <Modal
        visible={calibrationVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={function () { setCalibrationVisible(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Indtast præcis distance</Text>
            <Text style={styles.modalHint}>
              Aflæs løbebåndets display og indtast km
            </Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="decimal-pad"
              placeholder="fx 5.20"
              placeholderTextColor="#666"
              value={calibrationInput}
              onChangeText={setCalibrationInput}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={function () { setCalibrationVisible(false); }}
              >
                <Text style={styles.modalBtnText}>Annuller</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={applyCalibration}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Anvend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaViewCtx>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerBtn: {
    width: 60,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: { color: '#fff', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub: { color: '#888', fontSize: 11, marginTop: 2 },

  content: { padding: 16, paddingBottom: 40 },

  timerBox: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#161616',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  timerLabel: { color: '#888', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  timer: { color: '#fff', fontSize: 64, fontWeight: '900', letterSpacing: -2 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#161616',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  statValue: { color: '#fa3c00', fontSize: 28, fontWeight: '900' },
  statLabel: { color: '#888', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },

  speedBox: {
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  speedLabel: { color: '#888', fontSize: 13 },
  speedValue: { color: '#fff', fontSize: 18, fontWeight: '700' },

  sectionTitle: { color: '#888', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginTop: 8, marginBottom: 4 },
  sectionHint: { color: '#666', fontSize: 12, marginBottom: 10 },

  distanceButtons: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  distBtn: {
    flex: 1,
    backgroundColor: '#fa3c00',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  distBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  calibrateBtn: {
    backgroundColor: '#161616',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  calibrateBtnText: { color: '#fa3c00', fontSize: 14, fontWeight: '600' },

  tipBox: {
    backgroundColor: '#161616',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    marginTop: 8,
  },
  tipTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  tipText: { color: '#aaa', fontSize: 13, lineHeight: 20 },

  bottomBar: {
    paddingHorizontal: 14,
    paddingTop: 14,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#222',
    minHeight: 90,
  },
  bigBtn: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  bigBtnText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  startBtn: { backgroundColor: '#22c55e' },
  pauseBtn: { backgroundColor: '#f59e0b' },
  stopBtn: { backgroundColor: '#fa3c00' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 6 },
  modalHint: { color: '#888', fontSize: 13, marginBottom: 16 },
  modalInput: {
    backgroundColor: '#0a0a0a',
    color: '#fff',
    fontSize: 24,
    padding: 14,
    borderRadius: 10,
    textAlign: 'center',
    fontWeight: '700',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#2a2a2a' },
  modalBtnPrimary: { backgroundColor: '#fa3c00' },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});