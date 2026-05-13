/**
 * useHealthKit.js
 *
 * Custom hook til at læse sundhedsdata fra Apple HealthKit.
 * Bruges til at hente puls, skridt, distance og andre metrics under løb,
 * samt daglige kalorier til ernærings-dashboard.
 *
 * Installation:
 * npm install react-native-health
 * npx expo prebuild --clean
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

// Kun import på iOS - Android bruger Health Connect
let AppleHealthKit = null;
if (Platform.OS === 'ios') {
  try {
    const mod = require('react-native-health');
    // Modulet skal have Constants for at være brugbart
    if (mod && mod.Constants) {
      AppleHealthKit = mod;
    }
  } catch (e) {
    AppleHealthKit = null;
  }
}

// HealthKit permissions vi anmoder om
const HEALTHKIT_PERMISSIONS = {
  permissions: {
    read: [
      AppleHealthKit?.Constants?.Permissions?.HeartRate,
      AppleHealthKit?.Constants?.Permissions?.StepCount,
      AppleHealthKit?.Constants?.Permissions?.DistanceWalkingRunning,
      AppleHealthKit?.Constants?.Permissions?.ActiveEnergyBurned,
      AppleHealthKit?.Constants?.Permissions?.BasalEnergyBurned,
      AppleHealthKit?.Constants?.Permissions?.Workout,
    ].filter(Boolean),
    write: [
      AppleHealthKit?.Constants?.Permissions?.Workout,
      AppleHealthKit?.Constants?.Permissions?.DistanceWalkingRunning,
      AppleHealthKit?.Constants?.Permissions?.ActiveEnergyBurned,
    ].filter(Boolean),
  },
};

/**
 * Hook til HealthKit integration
 *
 * @param {Object} options
 * @param {boolean} options.enabled - Om HealthKit skal være aktiv
 * @param {number} options.heartRateInterval - Interval for puls-polling i ms (default: 5000)
 * @returns {Object} HealthKit state og funktioner
 */
export function useHealthKit({ enabled = true, heartRateInterval = 5000 } = {}) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);

  // Health data state
  const [heartRate, setHeartRate] = useState(null);
  const [stepCount, setStepCount] = useState(0);
  const [distance, setDistance] = useState(0);
  const [calories, setCalories] = useState(0);

  const heartRateIntervalRef = useRef(null);
  const isTrackingRef = useRef(false);

  // Initialiser HealthKit
  useEffect(() => {
    // Kræver iOS + native modul + enabled flag
    if (Platform.OS !== 'ios' || !enabled || !AppleHealthKit) {
      setIsInitializing(false);
      return;
    }

    if (typeof AppleHealthKit.isAvailable !== 'function') {
      console.warn('[HealthKit] isAvailable is not a function - native module not linked');
      setIsInitializing(false);
      return;
    }

    AppleHealthKit.isAvailable((err, available) => {
      if (err) {
        console.error('[HealthKit] Availability check error:', err);
        setError('Kunne ikke tjekke HealthKit tilgængelighed');
        setIsInitializing(false);
        return;
      }

      setIsAvailable(available);

      if (!available) {
        console.warn('[HealthKit] Not available on this device');
        setIsInitializing(false);
        return;
      }

      // Anmod om permissions
      AppleHealthKit.initHealthKit(HEALTHKIT_PERMISSIONS, (initErr) => {
        if (initErr) {
          console.error('[HealthKit] initHealthKit error:', initErr);
          setError('Kunne ikke få adgang til HealthKit');
          setIsAuthorized(false);
        } else {
          console.log('[HealthKit] Initialized successfully');
          setIsAuthorized(true);
          setError(null);
        }
        setIsInitializing(false);
      });
    });
  }, [enabled]);

  // Auto-hent daglige kalorier når HealthKit er autoriseret
  useEffect(() => {
    if (isAuthorized) {
      fetchDailyCalories();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  /**
   * Hent seneste puls fra HealthKit
   */
  const fetchHeartRate = useCallback(() => {
    if (!isAuthorized || Platform.OS !== 'ios' || !AppleHealthKit) return;

    const options = {
      unit: 'bpm',
      startDate: new Date(Date.now() - 60000).toISOString(),
      endDate: new Date().toISOString(),
      ascending: false,
      limit: 1,
    };

    AppleHealthKit.getHeartRateSamples(options, (err, results) => {
      if (err) { console.warn('[HealthKit] Heart rate fetch error:', err); return; }
      if (results && results.length > 0) {
        setHeartRate(Math.round(results[0].value));
      }
    });
  }, [isAuthorized]);

  /**
   * Hent skridt for i dag
   */
  const fetchStepCount = useCallback(() => {
    if (!isAuthorized || Platform.OS !== 'ios' || !AppleHealthKit) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    AppleHealthKit.getStepCount({
      startDate: today.toISOString(),
      endDate: new Date().toISOString(),
    }, (err, results) => {
      if (err) { console.warn('[HealthKit] Step count fetch error:', err); return; }
      if (results) setStepCount(Math.round(results.value));
    });
  }, [isAuthorized]);

  /**
   * Hent distance for en given periode (bruges under løb)
   */
  const fetchDistance = useCallback((startDate) => {
    if (!isAuthorized || Platform.OS !== 'ios' || !AppleHealthKit) return;

    AppleHealthKit.getDistanceWalkingRunning({
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
    }, (err, results) => {
      if (err) { console.warn('[HealthKit] Distance fetch error:', err); return; }
      if (results) setDistance(results.value);
    });
  }, [isAuthorized]);

  /**
   * Hent kalorier for en given periode (bruges under løb)
   */
  const fetchCalories = useCallback((startDate) => {
    if (!isAuthorized || Platform.OS !== 'ios' || !AppleHealthKit) return;

    AppleHealthKit.getActiveEnergyBurned({
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
    }, (err, results) => {
      if (err) { console.warn('[HealthKit] Calories fetch error:', err); return; }
      if (results && results.length > 0) {
        setCalories(Math.round(results.reduce((sum, s) => sum + s.value, 0)));
      }
    });
  }, [isAuthorized]);

  /**
   * Hent dagens samlede aktive kalorier fra midnat til nu.
   * Bruges til ernærings-dashboard.
   */
  const fetchDailyCalories = useCallback(() => {
    if (!isAuthorized || Platform.OS !== 'ios' || !AppleHealthKit) return;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    AppleHealthKit.getActiveEnergyBurned({
      startDate: startOfDay.toISOString(),
      endDate: new Date().toISOString(),
    }, (err, results) => {
      if (err) { console.warn('[HealthKit] Daily calories fetch error:', err); return; }
      if (results && results.length > 0) {
        const total = Math.round(results.reduce((sum, s) => sum + s.value, 0));
        setCalories(total);
        console.log('[HealthKit] Daily active calories:', total);
      } else {
        setCalories(0);
      }
    });
  }, [isAuthorized]);

  /**
   * Start tracking af sundhedsdata (bruges under løb)
   */
  const startTracking = useCallback((runStartTime = new Date()) => {
    if (!isAuthorized || Platform.OS !== 'ios' || isTrackingRef.current) return;

    console.log('[HealthKit] Starting health tracking');
    isTrackingRef.current = true;

    fetchHeartRate();
    fetchDistance(runStartTime);
    fetchCalories(runStartTime);

    heartRateIntervalRef.current = setInterval(() => {
      fetchHeartRate();
      fetchDistance(runStartTime);
      fetchCalories(runStartTime);
    }, heartRateInterval);
  }, [isAuthorized, heartRateInterval, fetchHeartRate, fetchDistance, fetchCalories]);

  /**
   * Stop tracking af sundhedsdata
   */
  const stopTracking = useCallback(() => {
    if (heartRateIntervalRef.current) {
      clearInterval(heartRateIntervalRef.current);
      heartRateIntervalRef.current = null;
    }
    isTrackingRef.current = false;
    console.log('[HealthKit] Stopped health tracking');
  }, []);

  /**
   * Gem en workout til HealthKit
   */
  const saveWorkout = useCallback(async (workoutData) => {
    if (!isAuthorized || Platform.OS !== 'ios' || !AppleHealthKit) {
      return { success: false, error: 'HealthKit not available' };
    }

    return new Promise((resolve) => {
      AppleHealthKit.saveWorkout({
        type: 'Running',
        startDate: workoutData.startTime.toISOString(),
        endDate: workoutData.endTime.toISOString(),
        energyBurned: workoutData.calories || 0,
        distance: workoutData.distance || 0,
      }, (err, result) => {
        if (err) {
          console.error('[HealthKit] Save workout error:', err);
          resolve({ success: false, error: err });
        } else {
          console.log('[HealthKit] Workout saved successfully');
          resolve({ success: true, result });
        }
      });
    });
  }, [isAuthorized]);

  /**
   * Hent workouts fra Apple Health (sidste N dage)
   */
  const fetchWorkouts = useCallback(async (daysBack = 7) => {
    if (Platform.OS !== 'ios' || !AppleHealthKit || !isAuthorized) {
      console.log('[HealthKit] fetchWorkouts: ikke tilgængelig');
      return [];
    }

    return new Promise((resolve) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      AppleHealthKit.getAnchoredWorkouts({
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      }, (err, results) => {
        if (err) { console.warn('[HealthKit] getAnchoredWorkouts error:', err); resolve([]); return; }

        const rawList = (results && results.data) ? results.data : [];
        console.log('[HealthKit] getAnchoredWorkouts returned', rawList.length, 'workouts');

        resolve(rawList.map(w => ({
          external_id: w.id || w.uuid || (w.start + '_' + (w.activityName || 'workout')),
          type: w.activityName || 'workout',
          start_time: w.start || w.startDate,
          end_time: w.end || w.endDate,
          duration_seconds: w.duration || 0,
          distance_meters: w.distance || 0,
          calories: w.calories || 0,
          source: 'apple_health',
        })));
      });
    });
  }, [isAuthorized]);

  // Cleanup ved unmount
  useEffect(() => {
    return () => { stopTracking(); };
  }, [stopTracking]);

  return {
    // Status
    isAvailable,
    isAuthorized,
    isInitializing,
    error,
    isSupported: Platform.OS === 'ios' && !!AppleHealthKit,

    // Data
    heartRate,
    stepCount,
    distance,
    calories,

    // Actions
    startTracking,
    stopTracking,
    saveWorkout,

    // Manual fetch
    fetchHeartRate,
    fetchStepCount,
    fetchDistance,
    fetchCalories,
    fetchDailyCalories,
    fetchWorkouts,
  };
}

export default useHealthKit;
