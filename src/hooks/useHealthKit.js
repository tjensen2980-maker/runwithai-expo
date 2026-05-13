/**
 * useHealthKit.js
 * 
 * Custom hook til at lÃ¦se sundhedsdata fra Apple HealthKit.
 * Bruges til at hente puls, skridt, distance og andre metrics under lÃ¸b.
 * 
 * Installation:
 * npm install react-native-health
 * npx expo prebuild --clean
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';

// Kun import pÃ¥ iOS - Android bruger Health Connect
let AppleHealthKit = null;
if (Platform.OS === 'ios') {
  try { AppleHealthKit = require('react-native-health'); } catch (e) { AppleHealthKit = null; }
}

// HealthKit permissions vi anmoder om
const HEALTHKIT_PERMISSIONS = {
  permissions: {
    read: [
      AppleHealthKit?.Constants?.Permissions?.HeartRate,
      AppleHealthKit?.Constants?.Permissions?.StepCount,
      AppleHealthKit?.Constants?.Permissions?.DistanceWalkingRunning,
      AppleHealthKit?.Constants?.Permissions?.ActiveEnergyBurned,
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
 * @param {boolean} options.enabled - Om HealthKit skal vÃ¦re aktiv
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
    if (Platform.OS !== 'ios' || !enabled) {
      setIsInitializing(false);
      return;
    }

    const initHealthKit = () => {
      // Tjek om HealthKit er tilgÃ¦ngelig
      if (!AppleHealthKit || typeof AppleHealthKit.isAvailable !== 'function') {
          Alert.alert('HK INIT','AppleHealthKit module is NULL'); setIsInitializing(false); return; }
      AppleHealthKit.isAvailable((err, available) => {
        if (err) {
          console.error('[HealthKit] Availability check error:', err);
          setError('Kunne ikke tjekke HealthKit tilgÃ¦ngelighed');
          setIsInitializing(false);
          return;
        }

        setIsAvailable(available);

        if (!available) {
          Alert.alert('HK INIT','isAvailable returned FALSE');
          setIsInitializing(false);
          return;
        }

        // Anmod om permissions
        AppleHealthKit.initHealthKit(HEALTHKIT_PERMISSIONS, (initErr) => {
          if (initErr) {
            Alert.alert('HK INIT ERR', 'initHealthKit error: ' + (initErr && initErr.message || JSON.stringify(initErr)));
            setError('Kunne ikke fÃ¥ adgang til HealthKit');
            setIsAuthorized(false);
          } else {
            Alert.alert('HK INIT','Successfully initialized - authorized=true');
            setIsAuthorized(true);
            setError(null);
          }
          setIsInitializing(false);
        });
      });
    };

    initHealthKit();
  }, [enabled]);

  /**
   * Hent seneste puls fra HealthKit
   */
  const fetchHeartRate = useCallback(() => {
    if (!isAuthorized || Platform.OS !== 'ios') return;

    const options = {
      unit: 'bpm',
      startDate: new Date(Date.now() - 60000).toISOString(), // Sidste minut
      endDate: new Date().toISOString(),
      ascending: false,
      limit: 1,
    };

    AppleHealthKit.getHeartRateSamples(options, (err, results) => {
      if (err) {
        console.warn('[HealthKit] Heart rate fetch error:', err);
        return;
      }

      if (results && results.length > 0) {
        const latestHeartRate = Math.round(results[0].value);
        setHeartRate(latestHeartRate);
        console.log('[HealthKit] Heart rate:', latestHeartRate, 'bpm');
      }
    });
  }, [isAuthorized]);

  /**
   * Hent skridt for i dag
   */
  const fetchStepCount = useCallback(() => {
    if (!isAuthorized || Platform.OS !== 'ios') return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const options = {
      startDate: today.toISOString(),
      endDate: new Date().toISOString(),
    };

    AppleHealthKit.getStepCount(options, (err, results) => {
      if (err) {
        console.warn('[HealthKit] Step count fetch error:', err);
        return;
      }

      if (results) {
        setStepCount(Math.round(results.value));
      }
    });
  }, [isAuthorized]);

  /**
   * Hent distance for en given periode
   */
  const fetchDistance = useCallback((startDate) => {
    if (!isAuthorized || Platform.OS !== 'ios') return;

    const options = {
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
    };

    AppleHealthKit.getDistanceWalkingRunning(options, (err, results) => {
      if (err) {
        console.warn('[HealthKit] Distance fetch error:', err);
        return;
      }

      if (results) {
        // Resultat er i meter
        setDistance(results.value);
      }
    });
  }, [isAuthorized]);

  /**
   * Hent kalorier for en given periode
   */
  const fetchCalories = useCallback((startDate) => {
    if (!isAuthorized || Platform.OS !== 'ios') return;

    const options = {
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
    };

    AppleHealthKit.getActiveEnergyBurned(options, (err, results) => {
      if (err) {
        console.warn('[HealthKit] Calories fetch error:', err);
        return;
      }

      if (results && results.length > 0) {
        const totalCalories = results.reduce((sum, sample) => sum + sample.value, 0);
        setCalories(Math.round(totalCalories));
      }
    });
  }, [isAuthorized]);

  /**
   * Start tracking af sundhedsdata (bruges under lÃ¸b)
   */
  const startTracking = useCallback((runStartTime = new Date()) => {
    if (!isAuthorized || Platform.OS !== 'ios' || isTrackingRef.current) return;

    console.log('[HealthKit] Starting health tracking');
    isTrackingRef.current = true;

    // Hent initial data
    fetchHeartRate();
    fetchDistance(runStartTime);
    fetchCalories(runStartTime);

    // Start interval for lÃ¸bende opdateringer
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
    if (!isAuthorized || Platform.OS !== 'ios') {
      return { success: false, error: 'HealthKit not available' };
    }

    return new Promise((resolve) => {
      const options = {
        type: 'Running',
        startDate: workoutData.startTime.toISOString(),
        endDate: workoutData.endTime.toISOString(),
        energyBurned: workoutData.calories || 0, // kcal
        distance: workoutData.distance || 0, // meter
      };

      AppleHealthKit.saveWorkout(options, (err, result) => {
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
   * Bruges til auto-sync af aktiviteter
   */
const fetchWorkouts = useCallback(async (daysBack = 7) => {
    console.log('[HealthKit] fetchWorkouts called, isAuthorized=', isAuthorized);
    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      console.log('[HealthKit] fetchWorkouts: not iOS or AppleHealthKit unavailable');
      return [];
    }
    if (!isAuthorized) {
      console.log('[HealthKit] fetchWorkouts: not authorized yet');
      return [];
    }
    return new Promise((resolve) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      const options = {
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      };
      AppleHealthKit.getAnchoredWorkouts(options, (err, results) => {
        if (err) {
          console.warn('[HealthKit] getAnchoredWorkouts error:', err);
          resolve([]);
          return;
        }
        const rawList = (results && results.data) ? results.data : [];
        console.log('[HealthKit] getAnchoredWorkouts returned', rawList.length, 'workouts');
        const workouts = rawList.map(w => ({
          external_id: w.id || w.uuid || (w.start + '_' + (w.activityName || 'workout')),
          type: w.activityName || 'workout',
          start_time: w.start || w.startDate,
          end_time: w.end || w.endDate,
          duration_seconds: w.duration || 0,
          distance_meters: w.distance || 0,
          calories: w.calories || 0,
          source: 'apple_health',
        }));
        resolve(workouts);
      });
    });
  }, [isAuthorized]);

  // Cleanup ved unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    // Status
    isAvailable,
    isAuthorized,
    isInitializing,
    error,
    isSupported: Platform.OS === 'ios',
    
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
    fetchWorkouts,
  };
}

export default useHealthKit;
