/**
 * useHealthKit.js
 *
 * Custom hook til at læse sundhedsdata fra Apple HealthKit.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

// Kun import på iOS - Android bruger Health Connect
let AppleHealthKit = null;
let loadError = null;

if (Platform.OS === 'ios') {
    try {
          const mod = require('react-native-health');
          // react-native-health kan eksportere på flere måder afhængig af bundler.
      // Prøv alle de almindelige steder hvor Constants kan ligge.
      const candidate =
              (mod && mod.Constants && mod) ||
              (mod && mod.default && mod.default.Constants && mod.default) ||
              null;

      if (candidate) {
              AppleHealthKit = candidate;
              console.log('[HealthKit] Native module loaded OK. Keys:', Object.keys(candidate).slice(0, 10));
      } else {
              loadError = 'react-native-health loaded but Constants missing. mod keys: ' + (mod ? Object.keys(mod).join(',') : 'null');
              console.warn('[HealthKit]', loadError);
      }
    } catch (e) {
          loadError = 'require failed: ' + (e && e.message ? e.message : String(e));
          console.warn('[HealthKit]', loadError);
          AppleHealthKit = null;
    }
}

const C = AppleHealthKit && AppleHealthKit.Constants ? AppleHealthKit.Constants : null;

// HealthKit permissions vi anmoder om
const HEALTHKIT_PERMISSIONS = C ? {
    permissions: {
          read: [
                  C.Permissions.HeartRate,
                  C.Permissions.StepCount,
                  C.Permissions.DistanceWalkingRunning,
                  C.Permissions.ActiveEnergyBurned,
                  C.Permissions.BasalEnergyBurned,
                  C.Permissions.Workout,
                ].filter(Boolean),
          write: [
                  C.Permissions.Workout,
                  C.Permissions.DistanceWalkingRunning,
                  C.Permissions.ActiveEnergyBurned,
                ].filter(Boolean),
    },
} : { permissions: { read: [], write: [] } };

export function useHealthKit({ enabled = true, heartRateInterval = 5000 } = {}) {
    const [isAvailable, setIsAvailable] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState(loadError);
    const [debugStatus, setDebugStatus] = useState('boot');

  const [heartRate, setHeartRate] = useState(null);
    const [stepCount, setStepCount] = useState(0);
    const [distance, setDistance] = useState(0);
    const [calories, setCalories] = useState(0);

  const heartRateIntervalRef = useRef(null);
    const isTrackingRef = useRef(false);

  useEffect(() => {
        console.log('[HealthKit] init effect run. iOS=', Platform.OS === 'ios', 'enabled=', enabled, 'moduleLoaded=', !!AppleHealthKit);
        setDebugStatus('init-start');

                if (Platform.OS !== 'ios' || !enabled) {
                        setDebugStatus('skip-not-ios');
                        setIsInitializing(false);
                        return;
                }
        if (!AppleHealthKit) {
                setDebugStatus('skip-no-module');
                                                setError(loadError || 'react-native-health module not loaded');
                setIsInitializing(false);
                return;
        }
        if (typeof AppleHealthKit.isAvailable !== 'function') {
                setDebugStatus('skip-no-isAvailable');
                setError('AppleHealthKit.isAvailable not a function');
                setIsInitializing(false);
                return;
        }

                AppleHealthKit.isAvailable((err, available) => {
                        console.log('[HealthKit] isAvailable result:', err, available);
                        if (err) {
                                  setDebugStatus('isAvailable-error');
                    setError('isAvailable error: ' + (err.message || String(err)));
                                  setIsInitializing(false);
                                  return;
                        }
                        setIsAvailable(!!available);
                        if (!available) {
                                  setDebugStatus('not-available');
                                  setIsInitializing(false);
                                  return;
                        }

                                                 setDebugStatus('calling-initHealthKit');
                        console.log('[HealthKit] Calling initHealthKit with permissions:', HEALTHKIT_PERMISSIONS);

                                                 AppleHealthKit.initHealthKit(HEALTHKIT_PERMISSIONS, (initErr) => {
                                                           console.log('[HealthKit] initHealthKit callback. err=', initErr);
                                                           if (initErr) {
                                                                       setDebugStatus('init-error');
                                                                       setError('initHealthKit: ' + (initErr.message || String(initErr)));
                                                                       setIsAuthorized(false);
                                                           } else {
                                                                       setDebugStatus('authorized');
                                                                       setIsAuthorized(true);
                                                                       setError(null);
                                                           }
                                                           setIsInitializing(false);
                                                 });
                });
  }, [enabled]);

  useEffect(() => {
        if (isAuthorized) {
                fetchDailyCalories();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

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
                if (err) { console.warn('[HealthKit] HR err:', err); return; }
                if (results && results.length > 0) setHeartRate(Math.round(results[0].value));
        });
  }, [isAuthorized]);

  const fetchStepCount = useCallback(() => {
        if (!isAuthorized || Platform.OS !== 'ios' || !AppleHealthKit) return;
        const today = new Date(); today.setHours(0,0,0,0);
        AppleHealthKit.getStepCount({ startDate: today.toISOString(), endDate: new Date().toISOString() }, (err, results) => {
                if (err) { console.warn('[HealthKit] steps err:', err); return; }
                if (results) setStepCount(Math.round(results.value));
        });
  }, [isAuthorized]);

  const fetchDistance = useCallback((startDate) => {
        if (!isAuthorized || Platform.OS !== 'ios' || !AppleHealthKit) return;
        AppleHealthKit.getDistanceWalkingRunning({ startDate: startDate.toISOString(), endDate: new Date().toISOString() }, (err, results) => {
                if (err) { console.warn('[HealthKit] dist err:', err); return; }
                if (results) setDistance(results.value);
        });
  }, [isAuthorized]);

  const fetchCalories = useCallback((startDate) => {
        if (!isAuthorized || Platform.OS !== 'ios' || !AppleHealthKit) return;
        AppleHealthKit.getActiveEnergyBurned({ startDate: startDate.toISOString(), endDate: new Date().toISOString() }, (err, results) => {
                if (err) { console.warn('[HealthKit] cal err:', err); return; }
                if (results && results.length > 0) {
                          setCalories(Math.round(results.reduce((sum, s) => sum + s.value, 0)));
                }
        });
  }, [isAuthorized]);

  const fetchDailyCalories = useCallback(() => {
        console.log('[HealthKit] fetchDailyCalories called. authorized=', isAuthorized);
        if (!isAuthorized || Platform.OS !== 'ios' || !AppleHealthKit) return;
        const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
        AppleHealthKit.getActiveEnergyBurned({ startDate: startOfDay.toISOString(), endDate: new Date().toISOString() }, (err, results) => {
                console.log('[HealthKit] daily cal result. err=', err, 'count=', results && results.length);
                if (err) { console.warn('[HealthKit] daily cal err:', err); return; }
                if (results && results.length > 0) {
                          const total = Math.round(results.reduce((sum, s) => sum + s.value, 0));
                          setCalories(total);
                          console.log('[HealthKit] Daily active calories:', total);
                } else {
                          setCalories(0);
                }
        });
  }, [isAuthorized]);

  const startTracking = useCallback((runStartTime = new Date()) => {
        if (!isAuthorized || Platform.OS !== 'ios' || isTrackingRef.current) return;
        isTrackingRef.current = true;
        fetchHeartRate(); fetchDistance(runStartTime); fetchCalories(runStartTime);
        heartRateIntervalRef.current = setInterval(() => {
                fetchHeartRate(); fetchDistance(runStartTime); fetchCalories(runStartTime);
        }, heartRateInterval);
  }, [isAuthorized, heartRateInterval, fetchHeartRate, fetchDistance, fetchCalories]);

  const stopTracking = useCallback(() => {
        if (heartRateIntervalRef.current) { clearInterval(heartRateIntervalRef.current); heartRateIntervalRef.current = null; }
        isTrackingRef.current = false;
  }, []);

  const saveWorkout = useCallback(async (workoutData) => {
        if (!isAuthorized || Platform.OS !== 'ios' || !AppleHealthKit) return { success: false, error: 'HealthKit not available' };
        return new Promise((resolve) => {
                AppleHealthKit.saveWorkout({
                          type: 'Running',
                          startDate: workoutData.startTime.toISOString(),
                          endDate: workoutData.endTime.toISOString(),
                          energyBurned: workoutData.calories || 0,
                          distance: workoutData.distance || 0,
                }, (err, result) => {
                          if (err) resolve({ success: false, error: err });
                          else resolve({ success: true, result });
                });
        });
  }, [isAuthorized]);

  const fetchWorkouts = useCallback(async (daysBack = 7) => {
        if (Platform.OS !== 'ios' || !AppleHealthKit || !isAuthorized) return [];
        return new Promise((resolve) => {
                const startDate = new Date(); startDate.setDate(startDate.getDate() - daysBack);
                AppleHealthKit.getAnchoredWorkouts({ startDate: startDate.toISOString(), endDate: new Date().toISOString() }, (err, results) => {
                          if (err) { resolve([]); return; }
                          const rawList = (results && results.data) ? results.data : [];
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

  useEffect(() => () => { stopTracking(); }, [stopTracking]);

  return {
        isAvailable,
        isAuthorized,
        isInitializing,
        error,
        isSupported: Platform.OS === 'ios' && !!AppleHealthKit,
        nativeModuleLoaded: !!AppleHealthKit,
        debugStatus,
        heartRate, stepCount, distance, calories,
        startTracking, stopTracking, saveWorkout,
        fetchHeartRate, fetchStepCount, fetchDistance, fetchCalories,
        fetchDailyCalories, fetchWorkouts,
  };
}

export default useHealthKit;
