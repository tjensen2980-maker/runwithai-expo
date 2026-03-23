/**
 * cadenceEstimator.js — RunWithAI Music Tempo Matcher
 *
 * Two estimation modes:
 *   1. Accelerometer-based (primary): uses expo-sensors to detect foot strikes
 *   2. Pace-based heuristic (fallback): estimates cadence from current pace
 *
 * Output: steps per minute (SPM) which maps 1:1 to target BPM
 */

// ---------------------------------------------------------------------------
// MODE 1: Pace-based heuristic (fallback when accelerometer is unavailable)
// ---------------------------------------------------------------------------

/**
 * Convert pace (seconds per km) to estimated cadence (SPM).
 *
 * Based on research data:
 *   - Elite runners: ~185-195 SPM at 3:00-3:30 min/km
 *   - Recreational fast: ~170-180 SPM at 4:30-5:30 min/km
 *   - Easy jog: ~155-165 SPM at 6:00-7:00 min/km
 *   - Walk/slow jog: ~140-155 SPM at 7:00-8:00 min/km
 *
 * Formula: SPM = BASE_CADENCE + CADENCE_FACTOR × speed_kmh
 */
const BASE_CADENCE = 120;
const CADENCE_FACTOR = 4.5;
const MIN_CADENCE = 140;
const MAX_CADENCE = 200;

export function paceToСadence(paceSecondsPerKm) {
  if (!paceSecondsPerKm || paceSecondsPerKm <= 0) return MIN_CADENCE;

  const speedKmh = 3600 / paceSecondsPerKm;
  const raw = BASE_CADENCE + CADENCE_FACTOR * speedKmh;

  return Math.round(Math.min(Math.max(raw, MIN_CADENCE), MAX_CADENCE));
}

/**
 * Convert pace string "M:SS" to seconds.
 */
export function parsePace(paceStr) {
  const parts = paceStr.split(':');
  if (parts.length !== 2) return null;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

// ---------------------------------------------------------------------------
// MODE 2: Accelerometer-based step detection (primary)
// ---------------------------------------------------------------------------

const STEP_THRESHOLD = 1.2;       // g-force threshold for step detection
const MIN_STEP_INTERVAL_MS = 250; // max ~240 SPM
const MAX_STEP_INTERVAL_MS = 800; // min ~75 SPM
const SMOOTHING_WINDOW = 8;       // number of steps to average over

export class AccelerometerCadenceDetector {
  constructor() {
    this._stepTimestamps = [];
    this._lastStepTime = 0;
    this._currentCadence = 0;
    this._magnitudeBuffer = [];
    this._bufferSize = 5;
    this._isAboveThreshold = false;
    this._onCadenceUpdate = null;
  }

  /**
   * Register a callback for cadence updates.
   * @param {function} callback - receives { cadence, confidence }
   */
  onCadenceUpdate(callback) {
    this._onCadenceUpdate = callback;
  }

  /**
   * Feed a single accelerometer reading.
   * Call this from the Accelerometer subscription at ~60-100Hz.
   *
   * @param {{ x: number, y: number, z: number }} data
   * @param {number} timestamp - performance.now() or Date.now()
   */
  processReading({ x, y, z }, timestamp) {
    // Compute magnitude (gravity-inclusive)
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    // Simple moving average to smooth noise
    this._magnitudeBuffer.push(magnitude);
    if (this._magnitudeBuffer.length > this._bufferSize) {
      this._magnitudeBuffer.shift();
    }
    const smoothed =
      this._magnitudeBuffer.reduce((a, b) => a + b, 0) /
      this._magnitudeBuffer.length;

    // Peak detection: rising edge crossing
    if (!this._isAboveThreshold && smoothed > STEP_THRESHOLD) {
      this._isAboveThreshold = true;
      const interval = timestamp - this._lastStepTime;

      if (
        interval >= MIN_STEP_INTERVAL_MS &&
        interval <= MAX_STEP_INTERVAL_MS
      ) {
        this._stepTimestamps.push(timestamp);
        this._lastStepTime = timestamp;

        // Keep only recent steps for windowed average
        const cutoff = timestamp - 15000; // 15s window
        this._stepTimestamps = this._stepTimestamps.filter(t => t > cutoff);

        this._updateCadence();
      } else if (interval > MAX_STEP_INTERVAL_MS) {
        // Likely paused/stopped — reset
        this._lastStepTime = timestamp;
      }
    } else if (smoothed < STEP_THRESHOLD * 0.85) {
      // Hysteresis: require drop below 85% of threshold to reset
      this._isAboveThreshold = false;
    }
  }

  _updateCadence() {
    const steps = this._stepTimestamps;
    if (steps.length < SMOOTHING_WINDOW) {
      // Not enough data yet — rough estimate
      if (steps.length >= 2) {
        const elapsed = steps[steps.length - 1] - steps[0];
        this._currentCadence = Math.round(
          ((steps.length - 1) / (elapsed / 1000)) * 60
        );
      }
      return;
    }

    // Windowed average over last N steps
    const recent = steps.slice(-SMOOTHING_WINDOW);
    const elapsed = recent[recent.length - 1] - recent[0];
    const cadence = Math.round(
      ((recent.length - 1) / (elapsed / 1000)) * 60
    );

    this._currentCadence = Math.min(Math.max(cadence, MIN_CADENCE), MAX_CADENCE);

    if (this._onCadenceUpdate) {
      this._onCadenceUpdate({
        cadence: this._currentCadence,
        confidence: steps.length >= SMOOTHING_WINDOW ? 'high' : 'low',
      });
    }
  }

  /**
   * Get current estimated cadence.
   */
  getCadence() {
    return this._currentCadence;
  }

  /**
   * Reset state (e.g. when run is paused/stopped).
   */
  reset() {
    this._stepTimestamps = [];
    this._lastStepTime = 0;
    this._currentCadence = 0;
    this._magnitudeBuffer = [];
    this._isAboveThreshold = false;
  }
}

// ---------------------------------------------------------------------------
// BPM mapping
// ---------------------------------------------------------------------------

/**
 * Convert cadence (SPM) to target BPM for music matching.
 * Runners naturally sync to beats, so SPM ≈ BPM.
 *
 * @param {number} cadence - steps per minute
 * @param {object} options
 * @param {number} options.tolerance - BPM range ± (default: 4)
 * @param {boolean} options.allowHalf - also match BPM/2 tracks (default: true)
 * @returns {{ target: number, min: number, max: number, halfTarget: number|null }}
 */
export function cadenceToBpmRange(cadence, { tolerance = 4, allowHalf = true } = {}) {
  const target = Math.round(cadence);
  return {
    target,
    min: target - tolerance,
    max: target + tolerance,
    halfTarget: allowHalf ? Math.round(target / 2) : null,
    halfMin: allowHalf ? Math.round(target / 2) - Math.floor(tolerance / 2) : null,
    halfMax: allowHalf ? Math.round(target / 2) + Math.floor(tolerance / 2) : null,
  };
}
