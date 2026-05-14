/**
 * useHealthKit.js
 *
 * Custom hook til at læse sundhedsdata fra Apple HealthKit.
 * Bruger @kingstinct/react-native-healthkit (Nitro Modules).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

// Kun import på iOS - Android bruger Health Connect
let HK = null;
let loadError = null;

if (Platform.OS === 'ios') {
    try {
        HK = require('@kingstinct/react-native-healthkit');
        console.log('[HealthKit] Kingstinct module loaded. Keys:', Object.keys(HK).slice(0, 20));
    } catch (e) {
        loadError = 'require failed: ' + (e && e.message ? e.message : String(e));
        console.warn('[HealthKit]', loadError);
        HK = null;
    }
}

// HealthKit permissions vi anmoder om
const READ_PERMISSIONS = [
    'HKQuantityTypeIdentifierHeartRate',
    'HKQuantityTypeIdentifierStepCount',
    'HKQuantityTypeIdentifierDistanceWalkingRunning',
    'HKQuantityTypeIdentifierActiveEnergyBurned',
    'HKQuantityTypeIdentifierBasalEnergyBurned',
    'HKWorkoutTypeIdentifier',
];
const WRITE_PERMISSIONS = [
    'HKWorkoutTypeIdentifier',
    'HKQuantityTypeIdentifierDistanceWalkingRunning',
    'HKQuantityTypeIdentifierActiveEnergyBurned',
];

// Helper: kald en eksporteret funktion uanset om den hedder X eller defaultX
function pick(...names) {
    if (!HK) return null;
    for (const n of names) {
        if (typeof HK[n] === 'function') return HK[n];
        if (HK.default && typeof HK.default[n] === 'function') return HK.default[n];
    }
    return null;
}

async function safeIsAvailable() {
    const fn = pick('isHealthDataAvailable');
    if (!fn) throw new Error('isHealthDataAvailable not a function');
    return await fn();
}

async function safeRequestAuth() {
    const fn = pick('requestAuthorization');
    if (!fn) throw new Error('requestAuthorization not a function');
    return await fn(READ_PERMISSIONS, WRITE_PERMISSIONS);
}

async function querySum(typeId, startDate, endDate, unit) {
    // Primary path: sum raw samples to include ALL sources (iPhone + Apple Watch).
    // queryStatisticsForQuantity can be limited to a single default source in some versions.
    const qFn = pick('queryQuantitySamples');
    if (qFn) {
        try {
            const samples = await qFn(typeId, { from: startDate, to: endDate, unit });
            if (Array.isArray(samples)) {
                console.log('[HealthKit] querySum samples for', typeId, 'count=', samples.length);
                if (samples.length > 0) {
                    // Deduplicate Apple Watch <-> iPhone overlap: HealthKit already deduplicates
                    // active energy across the same time window when reading samples, but Watch
                    // is the preferred source. Sum all samples; iOS marks dupes as different UUIDs
                    // so we trust HealthKit's per-sample data.
                    const total = samples.reduce((s, x) => s + (x.quantity || x.value || 0), 0);
                    console.log('[HealthKit] querySum raw total=', total, 'first sample=', JSON.stringify(samples[0]).slice(0, 200));
                    return total;
                }
            }
        } catch (e) {
            console.warn('[HealthKit] queryQuantitySamples err:', e && e.message);
        }
    }
    // Fallback: statistics aggregation
    const fn = pick('queryStatisticsForQuantity');
    if (fn) {
        try {
            const res = await fn(typeId, ['cumulativeSum'], startDate, endDate, unit);
            console.log('[HealthKit] querySum statistics res=', JSON.stringify(res).slice(0, 200));
            if (res && res.sumQuantity) {
                const v = (typeof res.sumQuantity === 'number') ? res.sumQuantity
                    : (res.sumQuantity.quantity || res.sumQuantity.value);
                if (typeof v === 'number') return v;
            }
        } catch (e) {
            console.warn('[HealthKit] queryStatistics err:', e && e.message);
        }
    }
    return 0;
}

async function queryLatest(typeId, startDate, endDate, unit) {
    const qFn = pick('queryQuantitySamples');
    if (!qFn) return null;
    const samples = await qFn(typeId, { from: startDate, to: endDate, unit, limit: 1, ascending: false });
    if (Array.isArray(samples) && samples.length > 0) {
        return samples[0].quantity || samples[0].value || null;
    }
    return null;
}

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
        let cancelled = false;
        console.log('[HealthKit] init effect run. iOS=', Platform.OS === 'ios', 'enabled=', enabled, 'moduleLoaded=', !!HK);
        setDebugStatus('init-start');

        if (Platform.OS !== 'ios' || !enabled) {
            setDebugStatus('skip-not-ios');
            setIsInitializing(false);
            return;
        }
        if (!HK) {
            setDebugStatus('skip-no-module');
            setError(loadError || 'kingstinct healthkit module not loaded');
            setIsInitializing(false);
            return;
        }

        (async () => {
            try {
                const available = await safeIsAvailable();
                if (cancelled) return;
                console.log('[HealthKit] isAvailable=', available);
                setIsAvailable(!!available);
                if (!available) {
                    setDebugStatus('not-available');
                    setIsInitializing(false);
                    return;
                }
                setDebugStatus('calling-requestAuthorization');
                await safeRequestAuth();
                if (cancelled) return;
                setDebugStatus('authorized');
                setIsAuthorized(true);
                setError(null);
            } catch (e) {
                if (cancelled) return;
                console.warn('[HealthKit] init error:', e);
                setDebugStatus('init-error');
                setError((e && e.message) ? e.message : String(e));
                setIsAuthorized(false);
            } finally {
                if (!cancelled) setIsInitializing(false);
            }
        })();

        return () => { cancelled = true; };
    }, [enabled]);

    const fetchDailyCalories = useCallback(async () => {
        console.log('[HealthKit] fetchDailyCalories called. authorized=', isAuthorized);
        if (!isAuthorized || Platform.OS !== 'ios' || !HK) return;
        try {
            const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
            const total = await querySum('HKQuantityTypeIdentifierActiveEnergyBurned', startOfDay, new Date(), 'kcal');
            const rounded = Math.round(total || 0);
            setCalories(rounded);
            console.log('[HealthKit] Daily active calories:', rounded);
        } catch (e) {
            console.warn('[HealthKit] daily cal err:', e);
        }
    }, [isAuthorized]);

    useEffect(() => {
        if (isAuthorized) {
            fetchDailyCalories();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthorized]);

    const fetchHeartRate = useCallback(async () => {
        if (!isAuthorized || Platform.OS !== 'ios' || !HK) return;
        try {
            const v = await queryLatest('HKQuantityTypeIdentifierHeartRate', new Date(Date.now() - 60000), new Date(), 'count/min');
            if (typeof v === 'number') setHeartRate(Math.round(v));
        } catch (e) { console.warn('[HealthKit] HR err:', e); }
    }, [isAuthorized]);

    const fetchStepCount = useCallback(async () => {
        if (!isAuthorized || Platform.OS !== 'ios' || !HK) return;
        try {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const total = await querySum('HKQuantityTypeIdentifierStepCount', today, new Date(), 'count');
            setStepCount(Math.round(total || 0));
        } catch (e) { console.warn('[HealthKit] steps err:', e); }
    }, [isAuthorized]);

    const fetchDistance = useCallback(async (startDate) => {
        if (!isAuthorized || Platform.OS !== 'ios' || !HK) return;
        try {
            const total = await querySum('HKQuantityTypeIdentifierDistanceWalkingRunning', startDate, new Date(), 'm');
            setDistance(total || 0);
        } catch (e) { console.warn('[HealthKit] dist err:', e); }
    }, [isAuthorized]);

    const fetchCalories = useCallback(async (startDate) => {
        if (!isAuthorized || Platform.OS !== 'ios' || !HK) return;
        try {
            const total = await querySum('HKQuantityTypeIdentifierActiveEnergyBurned', startDate, new Date(), 'kcal');
            setCalories(Math.round(total || 0));
        } catch (e) { console.warn('[HealthKit] cal err:', e); }
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
        if (!isAuthorized || Platform.OS !== 'ios' || !HK) return { success: false, error: 'HealthKit not available' };
        try {
            const saveFn = pick('saveWorkoutSample', 'saveWorkout');
            if (!saveFn) return { success: false, error: 'saveWorkout not supported' };
            const result = await saveFn('HKWorkoutActivityTypeRunning', [], workoutData.startTime, workoutData.endTime, {
                totalEnergyBurned: { quantity: workoutData.calories || 0, unit: 'kcal' },
                totalDistance: { quantity: workoutData.distance || 0, unit: 'm' },
            });
            return { success: true, result };
        } catch (e) {
            return { success: false, error: e };
        }
    }, [isAuthorized]);

    const fetchWorkouts = useCallback(async (daysBack = 7) => {
        if (Platform.OS !== 'ios' || !HK || !isAuthorized) return [];
        try {
            const qFn = pick('queryWorkoutSamples', 'queryWorkouts');
            if (!qFn) return [];
            const startDate = new Date(); startDate.setDate(startDate.getDate() - daysBack);
            const results = await qFn({ from: startDate, to: new Date() });
            const list = Array.isArray(results) ? results : (results && results.data) ? results.data : [];
            return list.map(w => ({
                external_id: w.uuid || w.id || (w.startDate + '_' + (w.workoutActivityType || 'workout')),
                type: w.workoutActivityType || w.activityName || 'workout',
                start_time: w.startDate || w.start,
                end_time: w.endDate || w.end,
                duration_seconds: w.duration || 0,
                distance_meters: (w.totalDistance && (w.totalDistance.quantity || w.totalDistance.value)) || w.distance || 0,
                calories: (w.totalEnergyBurned && (w.totalEnergyBurned.quantity || w.totalEnergyBurned.value)) || w.calories || 0,
                source: 'apple_health',
            }));
        } catch (e) {
            console.warn('[HealthKit] fetchWorkouts err:', e);
            return [];
        }
    }, [isAuthorized]);

    useEffect(() => () => { stopTracking(); }, [stopTracking]);

    return {
        isAvailable,
        isAuthorized,
        isInitializing,
        error,
        isSupported: Platform.OS === 'ios' && !!HK,
        nativeModuleLoaded: !!HK,
        debugStatus,
        heartRate, stepCount, distance, calories,
        startTracking, stopTracking, saveWorkout,
        fetchHeartRate, fetchStepCount, fetchDistance, fetchCalories,
        fetchDailyCalories, fetchWorkouts,
    };
}

export default useHealthKit;
