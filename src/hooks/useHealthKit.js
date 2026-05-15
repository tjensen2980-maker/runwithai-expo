/**
 * useHealthKit.js
 *
 * Custom hook til at læse sundhedsdata fra Apple HealthKit.
 * Bruger @kingstinct/react-native-healthkit v9 (Nitro Modules).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

// Kun import på iOS - Android bruger Health Connect
let HK = null;
let loadError = null;

if (Platform.OS === 'ios') {
    try {
        HK = require('@kingstinct/react-native-healthkit');
        const exportedKeys = Object.keys(HK || {}).slice(0, 40);
        console.log('[HealthKit] Kingstinct module loaded. Keys:', exportedKeys);
    } catch (e) {
        loadError = 'require failed: ' + (e && e.message ? e.message : String(e));
        console.warn('[HealthKit]', loadError);
        HK = null;
    }
}

// HealthKit permissions. v9 accepts both with and without HK prefix.
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

// v9 API: requestAuthorization({ toRead, toShare })
async function safeRequestAuth() {
    const fn = pick('requestAuthorization');
    if (!fn) throw new Error('requestAuthorization not a function');
    // Try v9 object-style first
    try {
        return await fn({ toRead: READ_PERMISSIONS, toShare: WRITE_PERMISSIONS });
    } catch (e1) {
        console.warn('[HealthKit] requestAuth object-style failed, trying array-style:', e1 && e1.message);
        try {
            return await fn(READ_PERMISSIONS, WRITE_PERMISSIONS);
        } catch (e2) {
            console.warn('[HealthKit] requestAuth array-style also failed:', e2 && e2.message);
            throw e2;
        }
    }
}

// Diagnostic store - last query result for surfacing in UI
let lastDiagnostic = '';
export function getHKDiagnostic() { return lastDiagnostic; }

// Sum a quantity for a window using raw samples with verbose logging.
// We deliberately avoid queryStatisticsForQuantity because its return shape
// varies wildly between versions and caused incorrect totals.
async function querySum(typeId, startDate, endDate, unit) {
    console.log('[HealthKit] querySum start. typeId=', typeId, 'from=', startDate.toISOString(), 'to=', endDate.toISOString(), 'unit=', unit);
    const qFn = pick('queryQuantitySamples');
    if (!qFn) {
        console.warn('[HealthKit] queryQuantitySamples not available');
        lastDiagnostic = 'no queryQuantitySamples fn';
        return 0;
    }
    const sampleAttempts = [
        { sig: 'v9 from/to/unit/limit:0', fn: () => qFn(typeId, { from: startDate, to: endDate, unit, limit: 0 }) },
        { sig: 'v9 from/to/unit', fn: () => qFn(typeId, { from: startDate, to: endDate, unit }) },
        { sig: 'v9 from/to', fn: () => qFn(typeId, { from: startDate, to: endDate }) },
        { sig: 'startDate/endDate', fn: () => qFn(typeId, { startDate, endDate }) },
        { sig: 'just type', fn: () => qFn(typeId) },
    ];
    let raw = null;
    let workingSig = '';
    let lastErr = null;
    for (const attempt of sampleAttempts) {
        try {
            raw = await attempt.fn();
            workingSig = attempt.sig;
            console.log('[HealthKit] querySum sig "' + attempt.sig + '" succeeded');
            break;
        } catch (e) {
            lastErr = e;
        }
    }
    if (raw === null) {
        console.warn('[HealthKit] all signatures failed:', lastErr && lastErr.message);
        lastDiagnostic = 'all sigs failed: ' + (lastErr && lastErr.message ? lastErr.message : 'unknown');
        return 0;
    }
    const samples = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.samples) ? raw.samples : []);
    console.log('[HealthKit] querySum count=', samples.length);
    // Source breakdown
    const sourceTotals = {};
    for (const s of samples) {
        const src = s.sourceName || (s.source && (s.source.name || s.source.bundleIdentifier)) || (s.sourceRevision && s.sourceRevision.source && s.sourceRevision.source.name) || 'unknown';
        const v = (typeof s.quantity === 'number') ? s.quantity
            : (s.quantity && typeof s.quantity.doubleValue === 'number') ? s.quantity.doubleValue
            : (typeof s.value === 'number') ? s.value : 0;
        sourceTotals[src] = (sourceTotals[src] || 0) + v;
    }
    console.log('[HealthKit] querySum sourceTotals=', JSON.stringify(sourceTotals));
    if (samples.length > 0) {
        console.log('[HealthKit] querySum sample[0] keys:', Object.keys(samples[0]).join(','));
        console.log('[HealthKit] querySum sample[0] full:', JSON.stringify(samples[0]).slice(0, 500));
    }
    let total = 0;
    for (const v of Object.values(sourceTotals)) total += v;
    console.log('[HealthKit] querySum TOTAL=', total);
    // Store diagnostic for UI display
    const sourceList = Object.entries(sourceTotals).map(function(e) { return e[0] + '=' + Math.round(e[1]); }).join('|');
    lastDiagnostic = 'sig=' + workingSig + ' n=' + samples.length + ' tot=' + Math.round(total) + ' src:[' + sourceList + ']';
    return total;
}

async function queryLatest(typeId, startDate, endDate, unit) {
    const qFn = pick('queryQuantitySamples', 'getMostRecentQuantitySample');
    if (!qFn) return null;
    try {
        const raw = await qFn(typeId, { from: startDate, to: endDate, unit, limit: 1, ascending: false });
        const samples = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.samples) ? raw.samples : (raw ? [raw] : []));
        if (samples.length > 0) {
            const s = samples[0];
            return (typeof s.quantity === 'number') ? s.quantity
                : (s.quantity && s.quantity.doubleValue) ? s.quantity.doubleValue
                : s.value || null;
        }
    } catch (e) {
        console.warn('[HealthKit] queryLatest err:', e && e.message);
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
        console.log('[HealthKit] init effect. iOS=', Platform.OS === 'ios', 'enabled=', enabled, 'moduleLoaded=', !!HK);
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
            // Surface diagnostic info in the error field so we can see it on the debug overlay
            setError('DBG: ' + lastDiagnostic);
            console.log('[HealthKit] Daily active calories:', rounded);
        } catch (e) {
            console.warn('[HealthKit] daily cal err:', e);
            setError('cal err: ' + (e && e.message ? e.message : String(e)));
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
            const list = Array.isArray(results) ? results : (results && Array.isArray(results.samples) ? results.samples : (results && results.data) ? results.data : []);
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
