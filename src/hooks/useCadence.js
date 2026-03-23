/**
 * useCadence.js — React hook for real-time cadence detection
 *
 * Uses expo-sensors Accelerometer as primary source,
 * falls back to pace-based estimation.
 * Starts with a default BPM so music matching works immediately.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  paceToСadence,
  cadenceToBpmRange,
} from '../utils/cadenceEstimator';

// Try to import Accelerometer — may not be available on web
let Accelerometer = null;
let AccelerometerCadenceDetector = null;
try {
  const sensors = require('expo-sensors');
  Accelerometer = sensors.Accelerometer;
  const estimator = require('../utils/cadenceEstimator');
  AccelerometerCadenceDetector = estimator.AccelerometerCadenceDetector;
} catch (e) {
  console.log('[useCadence] expo-sensors not available, using pace fallback');
}

const ACCELEROMETER_UPDATE_INTERVAL = 16; // ~60Hz

// Default cadences for immediate music matching
const DEFAULT_CADENCE = {
  run: 165, // typical running cadence
  walk: 110, // typical walking cadence
};

export default function useCadence({ currentPaceSecondsPerKm, isRunning = false, activityType = 'run' }) {
  const defaultCadence = DEFAULT_CADENCE[activityType] || DEFAULT_CADENCE.run;
  const [cadence, setCadence] = useState(defaultCadence);
  const [bpmRange, setBpmRange] = useState(cadenceToBpmRange(defaultCadence));
  const [source, setSource] = useState('none'); // 'accelerometer' | 'pace' | 'default' | 'none'

  const detectorRef = useRef(AccelerometerCadenceDetector ? new AccelerometerCadenceDetector() : null);
  const subscriptionRef = useRef(null);
  const fallbackIntervalRef = useRef(null);

  // Update BPM range whenever cadence changes
  useEffect(() => {
    if (cadence > 0) {
      setBpmRange(cadenceToBpmRange(cadence));
    }
  }, [cadence]);

  // Set default cadence when run starts
  useEffect(() => {
    if (isRunning) {
      setCadence(defaultCadence);
      setBpmRange(cadenceToBpmRange(defaultCadence));
      setSource('default');
    }
  }, [isRunning, defaultCadence]);

  // Try to start accelerometer
  const startAccelerometer = useCallback(async () => {
    if (!Accelerometer || !detectorRef.current) return false;

    try {
      const available = await Accelerometer.isAvailableAsync();
      if (!available) {
        console.log('[useCadence] Accelerometer not available, using pace fallback');
        return false;
      }

      Accelerometer.setUpdateInterval(ACCELEROMETER_UPDATE_INTERVAL);

      const detector = detectorRef.current;
      detector.reset();
      detector.onCadenceUpdate(({ cadence: c }) => {
        if (c > 0) {
          setCadence(c);
          setSource('accelerometer');
        }
      });

      subscriptionRef.current = Accelerometer.addListener((data) => {
        detector.processReading(data, performance.now());
      });

      return true;
    } catch (err) {
      console.warn('[useCadence] Accelerometer error:', err);
      return false;
    }
  }, []);

  // Pace-based fallback
  const startPaceFallback = useCallback(() => {
    setSource((prev) => prev === 'accelerometer' ? prev : 'pace');

    // Update cadence every 3 seconds from pace
    fallbackIntervalRef.current = setInterval(() => {
      if (currentPaceSecondsPerKm && currentPaceSecondsPerKm > 0) {
        const estimated = paceToСadence(currentPaceSecondsPerKm);
        if (estimated > 0) {
          setCadence(estimated);
          setSource('pace');
        }
      }
    }, 3000);
  }, [currentPaceSecondsPerKm]);

  // Start/stop based on isRunning
  useEffect(() => {
    if (!isRunning) {
      // Cleanup
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
      if (detectorRef.current) detectorRef.current.reset();
      setSource('none');
      return;
    }

    // Start detection
    (async () => {
      const accelStarted = await startAccelerometer();
      // Always start pace fallback too — it upgrades the default BPM as pace data comes in
      startPaceFallback();
    })();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };
  }, [isRunning, startAccelerometer, startPaceFallback]);

  // If using pace fallback, update when pace changes
  useEffect(() => {
    if ((source === 'pace' || source === 'default') && currentPaceSecondsPerKm > 0) {
      const estimated = paceToСadence(currentPaceSecondsPerKm);
      if (estimated > 0) {
        setCadence(estimated);
        setSource('pace');
      }
    }
  }, [currentPaceSecondsPerKm, source]);

  return {
    cadence,
    bpmRange,
    source,
  };
}