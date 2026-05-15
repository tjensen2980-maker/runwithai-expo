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

// Parse a sample timestamp into a Date, handling ms epoch, seconds epoch, and ISO strings
function parseSampleDate(raw) {
    if (raw == null) return null;
    if (raw instanceof Date) return raw;
    if (typeof raw === 'number') {
        // If number looks like seconds-since-epoch (10 digits), convert to ms
        if (raw < 1e12) return new Date(raw * 1000);
        return new Date(raw);
    }
    if (typeof raw === 'string') {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) return d;
        const n = Number(raw);
        if (!isNaN(n)) return parseSampleDate(n);
    }
    return null;
}

// Sum a quantity for a window using raw samples with explicit high limit.
async function querySum(typeId, startDate, endDate, unit) {
    console.log('[HealthKit] querySum start. typeId=', typeId, 'from=', startDate.toISOString(), 'to=', endDate.toISOString(), 'unit=', unit);
    const qFn = pick('queryQuantitySamples');
    if (!qFn) {
        lastDiagnostic = 'no queryQuantitySamples fn';
        return 0;
    }
    // Try with explicit high limit FIRST so we don't get default 20-sample cap.
    // Use a sane number (10k) - one day rarely has more samples than that.
    const sampleAttempts = [
        { sig: 'from/to/unit/limit:10000', fn: () => qFn(typeId, { from: startDate, to: endDate, unit, limit: 10000 }) },
        { sig: 'from/to/limit:10000', fn: () => qFn(typeId, { from: startDate, to: endDate, limit: 10000 }) },
        { sig: 'from/to/unit', fn: () => qFn(typeId, { from: startDate, to: endDate, unit }) },
        { sig: 'from/to', fn: () => qFn(typeId, { from: startDate, to: endDate }) },
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
        lastDiagnostic = 'all sigs failed: ' + (lastErr && lastErr.message ? lastErr.message : 'unknown');
        return 0;
    }
    const samples = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.samples) ? raw.samples : []);
    console.log('[HealthKit] querySum count=', samples.length);

    // Capture first sample's date raw format for diagnostic
    let firstDateRaw = 'none';
    let firstDateParsed = 'none';
    if (samples.length > 0) {
        const s0 = samples[0];
        firstDateRaw = JSON.stringify(s0.startDate || s0.start || s0.endDate || s0.end || 'no-date-field');
        const d = parseSampleDate(s0.startDate || s0.start || s0.endDate || s0.end);
        firstDateParsed = d ? d.toISOString() : 'unparseable';
        console.log('[HealthKit] sample[0] keys=', Object.keys(s0).join(','));
        console.log('[HealthKit] sample[0] full=', JSON.stringify(s0).slice(0, 500));
    }

    // Sum WITHOUT date filtering (trust the API's from/to). If we got n=86k,
    // we'll see that in the diagnostic and add filtering back.
    const sourceTotals = {};
    for (const s of samples) {
        const src = s.sourceName
            || (s.source && (s.source.name || s.source.bundleIdentifier))
            || (s.sourceRevision && s.sourceRevision.source && s.sourceRevision.source.name)
            || 'unknown';
        const v = (typeof s.quantity === 'number') ? s.quantity
            : (s.quantity && typeof s.quantity.doubleValue === 'number') ? s.quantity.doubleValue
            : (typeof s.value === 'number') ? s.value : 0;
        sourceTotals[src] = (sourceTotals[src] || 0) + v;
    }
    let total = 0;
    for (const v of Object.values(sourceTotals)) total += v;
    console.log('[HealthKit] querySum TOTAL=', total);

    const sourceList = Object.entries(sourceTotals).map(function(e) { return e[0] + '=' + Math.round(e[1]); }).join('|');
    lastDiagnostic = 'sig=' + workingSig + ' n=' + samples.length + ' tot=' + Math.round(total) + ' d0=' + firstDateRaw + ' src:[' + sourceList + ']';
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
