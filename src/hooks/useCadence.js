import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';

/**
 * useCadence
 * Uses the native step counter (Core Motion / CMPedometer on iOS) as the
 * primary source for cadence (steps per minute). This is power-efficient and
 * handled by the device motion coprocessor, so it does NOT keep the JS thread
 * awake or pressure memory in the background the way the raw Accelerometer did.
 * Falls back to a pace-based estimation when the pedometer is unavailable.
 * Starts with a default BPM so music matching works immediately.
 */

// Typical running cadence ~150-185 spm; walking ~90-120 spm.
const DEFAULT_BPM = 160;

function createBpmRange(target) {
  return {
    min: Math.max(0, target - 5),
    max: target + 5,
    target,
  };
}

function estimateFromPace(currentPaceSecondsPerKm, activityType) {
  // Rough cadence estimate from pace when no sensor data is available.
  if (!currentPaceSecondsPerKm || currentPaceSecondsPerKm <= 0) {
    return DEFAULT_BPM;
  }
  const minPerKm = currentPaceSecondsPerKm / 60;
  // Faster pace -> higher cadence. Clamp to a sane range.
  let bpm;
  if (activityType === 'walk') {
    bpm = 130 - (minPerKm - 8) * 4;
    bpm = Math.max(90, Math.min(135, bpm));
  } else {
    bpm = 185 - (minPerKm - 4) * 8;
    bpm = Math.max(150, Math.min(190, bpm));
  }
  return Math.round(bpm);
}

export default function useCadence({ currentPaceSecondsPerKm, isRunning = false, activityType = 'run' }) {
  const [cadence, setCadence] = useState(DEFAULT_BPM);
  const [bpmRange, setBpmRange] = useState(() => createBpmRange(DEFAULT_BPM));
  const [source, setSource] = useState('none');

  const subscriptionRef = useRef(null);
  const lastSampleRef = useRef(null); // { steps, timestamp }
  const fallbackIntervalRef = useRef(null);

  const cleanup = useCallback(() => {
    if (subscriptionRef.current) {
      try { subscriptionRef.current.remove(); } catch (e) {}
      subscriptionRef.current = null;
    }
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
    lastSampleRef.current = null;
  }, []);

  // Pace-based fallback updater (used when pedometer is unavailable).
  const startFallback = useCallback(() => {
    if (fallbackIntervalRef.current) return;
    setSource('pace');
    const tick = () => {
      const bpm = estimateFromPace(currentPaceSecondsPerKm, activityType);
      setCadence(bpm);
      setBpmRange(createBpmRange(bpm));
    };
    tick();
    fallbackIntervalRef.current = setInterval(tick, 3000);
  }, [currentPaceSecondsPerKm, activityType]);

  useEffect(() => {
    let cancelled = false;

    if (!isRunning) {
      cleanup();
      return;
    }

    const start = async () => {
      let available = false;
      try {
        available = await Pedometer.isAvailableAsync();
      } catch (e) {
        available = false;
      }
      if (cancelled) return;

      if (!available) {
        // No native step counter -> use pace-based estimate.
        startFallback();
        return;
      }

      // Show a useful default match while the pedometer collects enough steps.
      setSource('default');

      // Subscribe to live step updates from the native motion coprocessor.
      // watchStepCount reports cumulative steps since subscription start.
      lastSampleRef.current = { steps: 0, timestamp: Date.now() };
      try {
        subscriptionRef.current = Pedometer.watchStepCount((result) => {
          const now = Date.now();
          const totalSteps = (result && typeof result.steps === 'number') ? result.steps : 0;
          const prev = lastSampleRef.current;
          if (!prev) {
            lastSampleRef.current = { steps: totalSteps, timestamp: now };
            return;
          }
          const deltaSteps = totalSteps - prev.steps;
          const deltaMs = now - prev.timestamp;
          // Only update on a meaningful window to smooth the value.
          if (deltaMs >= 2000 && deltaSteps >= 0) {
            const spm = Math.round((deltaSteps / deltaMs) * 60000);
            lastSampleRef.current = { steps: totalSteps, timestamp: now };
            if (spm > 0) {
              setSource('pedometer');
              setCadence(spm);
              setBpmRange(createBpmRange(spm));
            }
          }
        });
      } catch (e) {
        startFallback();
      }
    };

    start();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [isRunning, activityType, startFallback, cleanup]);

  return {
    cadence,
    bpmRange,
    source,
  };
}
