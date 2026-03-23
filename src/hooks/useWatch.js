/**
 * useWatch.js
 * 
 * Custom hook til bidirektionel kommunikation med Apple Watch.
 * Bruger WatchConnectivity framework via TurboModule.
 * 
 * Features:
 * - Send løbedata til Watch (distance, tempo, puls)
 * - Modtag kommandoer fra Watch (start/stop/pause)
 * - Reachability status
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Platform, NativeEventEmitter } from 'react-native';
import WatchModule from '../modules/WatchModule';

/**
 * Hook til Apple Watch kommunikation
 * 
 * @param {Object} config
 * @param {Function} config.onCommand - Callback når Watch sender en kommando
 * @param {boolean} config.enabled - Om watch connectivity skal være aktiv
 * @returns {Object} Watch state og funktioner
 */
export function useWatch({ onCommand, enabled = true } = {}) {
  const [isReachable, setIsReachable] = useState(false);
  const [isPaired, setIsPaired] = useState(false);
  const [isWatchAppInstalled, setIsWatchAppInstalled] = useState(false);
  
  const subscriptionRef = useRef(null);
  const reachabilitySubscriptionRef = useRef(null);

  // Setup event listeners
  useEffect(() => {
    if (Platform.OS !== 'ios' || !enabled) return;

    // Lyt efter beskeder fra Watch
    subscriptionRef.current = WatchModule.addListener((event) => {
      console.log('[Watch] Received event:', event);
      
      // Håndter kommandoer fra Watch
      if (event.command) {
        onCommand?.(event.command, event.data);
      }
    });

    // Lyt efter reachability ændringer
    reachabilitySubscriptionRef.current = WatchModule.addReachabilityListener((reachable) => {
      console.log('[Watch] Reachability changed:', reachable);
      setIsReachable(reachable);
    });

    // Tjek initial status
    WatchModule.getWatchStatus().then((status) => {
      setIsPaired(status.isPaired);
      setIsWatchAppInstalled(status.isWatchAppInstalled);
      setIsReachable(status.isReachable);
    }).catch((err) => {
      console.warn('[Watch] Could not get status:', err);
    });

    return () => {
      subscriptionRef.current?.remove();
      reachabilitySubscriptionRef.current?.remove();
    };
  }, [enabled, onCommand]);

  /**
   * Send løbedata til Watch
   * 
   * @param {Object} runData
   * @param {number} runData.distance - Distance i meter
   * @param {string} runData.pace - Tempo som string (f.eks. "5:30")
   * @param {number} runData.duration - Varighed i sekunder
   * @param {number} runData.heartRate - Puls i bpm
   * @param {boolean} runData.isRunning - Om løbet er aktivt
   */
  const sendRunUpdate = useCallback(async (runData) => {
    if (Platform.OS !== 'ios' || !enabled) return;

    try {
      await WatchModule.sendUpdateToWatch({
        type: 'RUN_UPDATE',
        distance: runData.distance,
        pace: runData.pace,
        duration: runData.duration,
        heartRate: runData.heartRate,
        isRunning: runData.isRunning,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('[Watch] Failed to send run update:', err);
    }
  }, [enabled]);

  /**
   * Send besked til Watch om at starte løb
   */
  const sendStartCommand = useCallback(async () => {
    if (Platform.OS !== 'ios' || !enabled) return;

    try {
      await WatchModule.sendUpdateToWatch({
        type: 'COMMAND',
        command: 'START_RUN',
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('[Watch] Failed to send start command:', err);
    }
  }, [enabled]);

  /**
   * Send besked til Watch om at stoppe løb
   */
  const sendStopCommand = useCallback(async () => {
    if (Platform.OS !== 'ios' || !enabled) return;

    try {
      await WatchModule.sendUpdateToWatch({
        type: 'COMMAND',
        command: 'STOP_RUN',
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('[Watch] Failed to send stop command:', err);
    }
  }, [enabled]);

  /**
   * Send besked til Watch om at pause løb
   */
  const sendPauseCommand = useCallback(async () => {
    if (Platform.OS !== 'ios' || !enabled) return;

    try {
      await WatchModule.sendUpdateToWatch({
        type: 'COMMAND',
        command: 'PAUSE_RUN',
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('[Watch] Failed to send pause command:', err);
    }
  }, [enabled]);

  /**
   * Send workout summary til Watch (efter løb er færdigt)
   */
  const sendWorkoutSummary = useCallback(async (summary) => {
    if (Platform.OS !== 'ios' || !enabled) return;

    try {
      await WatchModule.sendUpdateToWatch({
        type: 'WORKOUT_SUMMARY',
        totalDistance: summary.distance,
        totalDuration: summary.duration,
        averagePace: summary.averagePace,
        calories: summary.calories,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('[Watch] Failed to send workout summary:', err);
    }
  }, [enabled]);

  return {
    // Status
    isSupported: Platform.OS === 'ios',
    isReachable,
    isPaired,
    isWatchAppInstalled,
    
    // Actions
    sendRunUpdate,
    sendStartCommand,
    sendStopCommand,
    sendPauseCommand,
    sendWorkoutSummary,
  };
}

export default useWatch;
