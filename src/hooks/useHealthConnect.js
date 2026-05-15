/**
 * useHealthConnect.js
 *
 * Custom hook til at læse sundhedsdata fra Android Health Connect.
 * Bruger react-native-health-connect.
 *
 * STEP 2: Permission flow + fetchDailyCalories implementeret.
 * Henter aktive kalorier fra Health Connect for dagens start til nu.
 *
 * API'en der bruges (react-native-health-connect v3):
 *  - initialize(): Promise<boolean>
 *  - requestPermission(permissions): Promise<Permission[]>
 *  - getGrantedPermissions(): Promise<Permission[]>
 *  - readRecords(recordType, options): Promise<{records: Record[]}>
 *  - getSdkStatus(): Promise<number>  (3 = available)
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

const READ_PERMISSIONS = [
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
];

// Helper: get exported function from module, default export, or both
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

async function safeRequestPermission() {
  const fn = pick('requestPermission');
  if (!fn) return [];
  try {
    return await fn(READ_PERMISSIONS);
  } catch (e) {
    console.warn('[HealthConnect] requestPermission err:', e && e.message);
    return [];
  }
}

async function safeGetGrantedPermissions() {
  const fn = pick('getGrantedPermissions');
  if (!fn) return [];
  try {
    return await fn();
  } catch (e) {
    console.warn('[HealthConnect] getGrantedPermissions err:', e && e.message);
    return [];
  }
}

// Sum ActiveCaloriesBurned records for a time window.
async function readCalories(startDate, endDate) {
  const fn = pick('readRecords');
  if (!fn) return 0;
  try {
    const result = await fn('ActiveCaloriesBurned', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      },
    });
    const records = Array.isArray(result) ? result : (result && Array.isArray(result.records) ? result.records : []);
    let total = 0;
    for (const r of records) {
      // energy.inKilocalories is standard; fall back to other shapes if needed.
      const v = (r.energy && typeof r.energy.inKilocalories === 'number') ? r.energy.inKilocalories
              : (r.energy && typeof r.energy.value === 'number') ? r.energy.value
              : (typeof r.calories === 'number') ? r.calories : 0;
      total += v;
    }
    return total;
  } catch (e) {
    console.warn('[HealthConnect] readCalories err:', e && e.message);
    return 0;
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
        setIsAvailable(!!initOk);
        if (!initOk) {
          setIsInitializing(false);
          return;
        }

        // First check what's already granted
        let granted = await safeGetGrantedPermissions();
        if (cancelled) return;

        const hasCalories = Array.isArray(granted) && granted.some(p =>
          (p.recordType === 'ActiveCaloriesBurned' || p.recordType === 'TotalCaloriesBurned')
          && p.accessType === 'read'
        );

        if (!hasCalories) {
          // Ask the user
          const result = await safeRequestPermission();
          if (cancelled) return;
          granted = Array.isArray(result) ? result : await safeGetGrantedPermissions();
        }

        const hasNow = Array.isArray(granted) && granted.some(p =>
          (p.recordType === 'ActiveCaloriesBurned' || p.recordType === 'TotalCaloriesBurned')
          && p.accessType === 'read'
        );
        setIsAuthorized(hasNow);
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

  const fetchDailyCalories = useCallback(async () => {
    if (!isAuthorized || Platform.OS !== 'android' || !HC) return;
    try {
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const total = await readCalories(startOfDay, new Date());
      setCalories(Math.round(total || 0));
    } catch (e) {
      console.warn('[HealthConnect] daily cal err:', e);
      setError('cal err: ' + (e && e.message ? e.message : String(e)));
    }
  }, [isAuthorized]);

  // Auto-fetch when authorization becomes true
  useEffect(() => {
    if (isAuthorized) {
      fetchDailyCalories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  // Stubs for future expansion (HR, steps, distance, workouts)
  const fetchHeartRate = useCallback(async () => {}, []);
  const fetchStepCount = useCallback(async () => {}, []);
  const fetchDistance = useCallback(async () => {}, []);
  const fetchCalories = useCallback(async (startDate) => {
    if (!isAuthorized || Platform.OS !== 'android' || !HC) return;
    try {
      const total = await readCalories(startDate || new Date(0), new Date());
      setCalories(Math.round(total || 0));
    } catch (e) {
      console.warn('[HealthConnect] cal err:', e);
    }
  }, [isAuthorized]);

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
