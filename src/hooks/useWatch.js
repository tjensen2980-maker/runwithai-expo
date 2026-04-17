/**
 * useWatch.js
 *
 * Custom hook til bidirektionel kommunikation med Apple Watch.
 * Bruger WatchConnectivity framework via native bridge.
 *
 * Features:
 * - Send løbedata til Watch (distance, tempo, puls)
 * - Modtag kommandoer fra Watch (start/stop/pause)
 * - Modtag workout complete fra Watch og gem til server
 * - Send dagens træningsplan til Watch (som Garmin)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import WatchModule from '../modules/WatchModule';
import { saveRun } from '../../data';

export function useWatch({
      enabled = true,
      onCommand,
      onWorkoutComplete,
} = {}) {
      const [isReachable, setIsReachable] = useState(false);
      const [isPaired, setIsPaired] = useState(false);
      const [isWatchAppInstalled, setIsWatchAppInstalled] = useState(false);
      const [lastWatchWorkout, setLastWatchWorkout] = useState(null);

  const messageSubscriptionRef = useRef(null);
      const workoutSubscriptionRef = useRef(null);
      const reachabilitySubscriptionRef = useRef(null);

  useEffect(() => {
          if (!enabled || Platform.OS !== 'ios') return;

                // Håndter kommandoer fra Watch
                messageSubscriptionRef.current = WatchModule.addListener((event) => {
                          if (event.command) {
                                      // Svar på GET_TODAY_TRAINING request fra uret
                            if (event.command === 'GET_TODAY_TRAINING') {
                                          // onCommand callback bruges til at bede App.js sende planen
                                        onCommand?.('GET_TODAY_TRAINING', event.data);
                            } else {
                                          onCommand?.(event.command, event.data);
                            }
                          }
                });

                // Håndter workout complete fra Watch
                workoutSubscriptionRef.current = WatchModule.addWorkoutCompleteListener(async (event) => {
                          console.log('[Watch] Workout complete received:', event);
                          setLastWatchWorkout(event);

                                                                                              // Konverter Watch data til server format og gem
                                                                                              try {
                                                                                                          const distanceKm = (event.distanceMeters || 0) / 1000;
                                                                                                          const durationSecs = event.durationSeconds || 0;
                                                                                                          const paceSecsPerKm = distanceKm > 0 ? durationSecs / distanceKm : 0;

                            const run = {
                                          km: parseFloat(distanceKm.toFixed(2)),
                                          duration: durationSecs,
                                          duration_secs: durationSecs,
                                          pace: parseFloat(paceSecsPerKm.toFixed(1)),
                                          pace_secs_per_km: parseFloat(paceSecsPerKm.toFixed(1)),
                                          heart_rate: event.avgHeartRate || 0,
                                          avg_hr: event.avgHeartRate || 0,
                                          calories: event.calories || 0,
                                          cadence: event.cadence || 0,
                                          total_steps: event.totalSteps || 0,
                                          total_ascent: event.totalAscent || 0,
                                          source: 'apple_watch',
                                          date: new Date(event.timestamp ? event.timestamp * 1000 : Date.now()).toISOString(),
                                          splits: (event.splits || []).map(s => ({
                                                          km: s.km,
                                                          pace: s.pace,
                                                          time: s.time,
                                                          heartRate: s.heartRate,
                                          })),
                            };

                            const saved = await saveRun(run);
                                                                                                          console.log('[Watch] Run saved to server:', saved);
                                                                                                          onWorkoutComplete?.(run, saved);
                                                                                                  } catch (err) {
                                                                                                          console.error('[Watch] Failed to save watch workout:', err);
                                                                                                          onWorkoutComplete?.(event, null);
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
                          messageSubscriptionRef.current?.remove?.();
                          workoutSubscriptionRef.current?.remove?.();
                          reachabilitySubscriptionRef.current?.remove?.();
                };
  }, [enabled]);

  /**
       * Send løbedata til Watch under aktivt løb
       */
  const sendRunUpdate = useCallback(async (data) => {
          if (!enabled || Platform.OS !== 'ios') return;

                                        try {
                                                  await WatchModule.sendUpdateToWatch({
                                                              type: 'RUN_UPDATE',
                                                              distance: data.distance,
                                                              duration: data.duration,
                                                              pace: data.pace,
                                                              heartRate: data.heartRate,
                                                              calories: data.calories,
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
          if (!enabled || Platform.OS !== 'ios') return;

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
       * Send stop kommando til Watch
       */
  const sendStopCommand = useCallback(async () => {
          if (!enabled || Platform.OS !== 'ios') return;

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
       * Send pause kommando til Watch
       */
  const sendPauseCommand = useCallback(async () => {
          if (!enabled || Platform.OS !== 'ios') return;

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
       * Send dagens træningsplan til Watch (som Garmin)
       * @param {object} plan - { name, km, description, workout, type }
       */
  const sendTodayTraining = useCallback(async (plan) => {
          if (!enabled || Platform.OS !== 'ios' || !plan) return;

                                            const payload = {
                                                      type: 'TODAY_TRAINING',
                                                      name: plan.name || plan.workout || 'Dagens træning',
                                                      km: plan.km || 0,
                                                      description: plan.description || plan.workout || '',
                                                      workoutType: plan.type || 'run',
                                                      date: new Date().toISOString(),
                                                      timestamp: Date.now(),
                                            };

                                            try {
                                                      // Prøv direkte besked først (kræver at uret er nåeligt)
            await WatchModule.sendUpdateToWatch(payload);
                                                      console.log('[Watch] Today training sent via message');
                                            } catch (err) {
                                                      // Fallback: brug transferUserInfo (leveres i baggrunden)
            try {
                        await WatchModule.transferUserInfo(payload);
                        console.log('[Watch] Today training sent via transferUserInfo');
            } catch (err2) {
                        console.warn('[Watch] Failed to send today training:', err2);
            }
                                            }
  }, [enabled]);

  return {
          // Status
          isSupported: Platform.OS === 'ios',
          isReachable,
          isPaired,
          isWatchAppInstalled,
          lastWatchWorkout,

          // Actions
          sendRunUpdate,
          sendStartCommand,
          sendStopCommand,
          sendPauseCommand,
          sendTodayTraining,
  };
}

export default useWatch;
