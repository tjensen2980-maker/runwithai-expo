/**
 * useHealthConnect.js
 *
 * Custom hook til at læse sundhedsdata fra Android Health Connect.
 * Bruger react-native-health-connect.
 *
 * STEP 1: Safe skeleton. Loader biblioteket via try/catch og returnerer
 * tomme værdier hvis modulet ikke kan loades eller native side ikke er
 * konfigureret endnu. På den måde kan EAS Build bygges uden at app'en
 * crasher selvom AndroidManifest endnu ikke har permissions sat op.
 *
 * Permissions og rigtig data-hentning tilføjes i et senere skridt.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

let HC = null;
let loadError = null;

if (Platform.OS === 'android') {
  try {
    HC = require('react-native-health-connect');
  } catch (e) {
    loadError = 'require failed: ' + (e && e.message ? e.message : String(e));
    console.warn('[HealthConnect]', loadError);
    HC = null;
  }
}

// Helper: kald en eksporteret funktion uanset om den er navngivet eller default
function pick(...names) {
  if (!HC) return null;
  for (const n of names) {
    if (typeof HC[n] === 'function') return HC[n];
    if (HC.default && typeof HC.default[n] === 'function') return HC.default[n];
  }
  return null;
}

async function safeInitialize() {
  const fn = pick('initialize');
  if (!fn) return false;
  try {
    return await fn();
  } catch (e) {
    console.warn('[HealthConnect] initialize err:', e && e.message);
    return false;
  }
}

async function safeGetSdkStatus() {
  const fn = pick('getSdkStatus');
  if (!fn) return null;
  try {
    return await fn();
  } catch (e) {
    return null;
  }
}

export function useHealthConnect({ enabled = true } = {}) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(loadError);

  const [heartRate, setHeartRate] = useState(null);
  const [stepCount, setStepCount] = useState(0);
  const [distance, setDistance] = useState(0);
  const [calories, setCalories] = useState(0);

  const isTrackingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    if (Platform.OS !== 'android' || !enabled) {
      setIsInitializing(false);
      return;
    }
    if (!HC) {
      setError(loadError || 'react-native-health-connect not loaded');
      setIsInitializing(false);
      return;
    }

    (async () => {
      try {
        const initOk = await safeInitialize();
        if (cancelled) return;
        const status = await safeGetSdkStatus();
        if (cancelled) return;
        setIsAvailable(!!initOk);
        // Permissions håndteres i senere skridt. For nu markerer vi os ikke som authorized.
        setIsAuthorized(false);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        console.warn('[HealthConnect] init error:', e);
        setError((e && e.message) ? e.message : String(e));
        setIsAuthorized(false);
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    })();

    return () => { cancelled = true; };
  }, [enabled]);

  // Stub implementations. Udfyldes når permissions er på plads.
  const fetchDailyCalories = useCallback(async () => {
    if (!isAuthorized || Platform.OS !== 'android' || !HC) return;
    // TODO: readRecords('ActiveCaloriesBurned', { timeRangeFilter: ... })
  }, [isAuthorized]);

  const fetchHeartRate = useCallback(async () => {}, []);
  const fetchStepCount = useCallback(async () => {}, []);
  const fetchDistance = useCallback(async () => {}, []);
  const fetchCalories = useCallback(async () => {}, []);

  const startTracking = useCallback(() => {
    if (!isAuthorized || Platform.OS !== 'android' || isTrackingRef.current) return;
    isTrackingRef.current = true;
  }, [isAuthorized]);

  const stopTracking = useCallback(() => {
    isTrackingRef.current = false;
  }, []);

  const saveWorkout = useCallback(async () => {
    return { success: false, error: 'not implemented yet' };
  }, []);

  const fetchWorkouts = useCallback(async () => {
    return [];
  }, []);

  useEffect(() => () => { stopTracking(); }, [stopTracking]);

  return {
    isAvailable,
    isAuthorized,
    isInitializing,
    error,
    isSupported: Platform.OS === 'android' && !!HC,
    nativeModuleLoaded: !!HC,
    heartRate, stepCount, distance, calories,
    startTracking, stopTracking, saveWorkout,
    fetchHeartRate, fetchStepCount, fetchDistance, fetchCalories,
    fetchDailyCalories, fetchWorkouts,
  };
}

export default useHealthConnect;
