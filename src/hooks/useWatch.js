/**
 * useWatch.js
 *
 * Custom hook til bidirektionel kommunikation med Apple Watch.
 * Bruger WatchConnectivity framework via native bridge (RCTWatchConnectivity).
 *
 * Features:
 * - Send løbedata til Watch (distance, tempo, puls)
 * - Modtag kommandoer fra Watch (start/stop/pause)
 * - Modtag workout complete fra Watch og gem til server
 * - Send dagens træningsplan til Watch (som Garmin kalender)
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
      const liveUpdateSubscriptionRef = useRef(null);
      const reachabilitySubscriptionRef = useRef(null);

  // Gem todayTraining reference så vi kan sende den hurtigt
  const todayTrainingRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Send dagens træning til Watch
  // Mappe til præcis de keys ContentView.swift/TodayTrainingCard forventer:
  //   name, km, description, pace, type = "TODAY_TRAINING"
  // ─────────────────────────────────────────────────────────────────────────
  const sendTodayTraining = useCallback(async (todayPlan, fullPlan) => {
          if (!WatchModule.isSupported) return;

                                            // Byg payload med de keys Watch-appen forventer
                                            const watchPayload = {
                                                      type: 'TODAY_TRAINING',
                                                      name: todayPlan?.title || todayPlan?.name || todayPlan?.type || 'Dagens træning',
                                                      km: todayPlan?.distance_km || todayPlan?.km || todayPlan?.distance || 0,
                                                      description: todayPlan?.description || todayPlan?.notes || '',
                                                      // Pace kan være "5:30" eller "5:30-6:00"
                                                      pace: todayPlan?.target_pace || todayPlan?.pace || '',
                                                      trainingPlan: fullPlan || [],
                                                      timestamp: Date.now(),
                                            };

                                            // Gem lokalt til hurtig adgang ved GET_TODAY_TRAINING
                                            todayTrainingRef.current = watchPayload;

                                            console.log('[useWatch] Sending today training to Watch:', watchPayload.name);

                                            try {
                                                      if (isReachable) {
                                                                  await WatchModule.sendUpdateToWatch(watchPayload);
                                                                  console.log('[useWatch] sendUpdateToWatch success');
                                                      } else {
                                                                  // Background delivery – garanteret levering
                                                        await WatchModule.transferUserInfo(watchPayload);
                                                                  console.log('[useWatch] transferUserInfo success');
                                                      }
                                            } catch (err) {
                                                      console.warn('[useWatch] sendTodayTraining error:', err.message);
                                                      // Fallback til transferUserInfo
            try {
                        await WatchModule.transferUserInfo(watchPayload);
            } catch (err2) {
                        console.error('[useWatch] transferUserInfo fallback failed:', err2.message);
            }
                                            }
  }, [isReachable]);

  useEffect(() => {
          if (!enabled || Platform.OS !== 'ios') return;

                // Tjek initial Watch status
                WatchModule.getWatchStatus().then(status => {
                          setIsPaired(status.isPaired);
                          setIsWatchAppInstalled(status.isWatchAppInstalled);
                          setIsReachable(status.isReachable);
                }).catch(err => {
                          console.warn('[useWatch] getWatchStatus error:', err);
                });

                // Håndter kommandoer fra Watch
                messageSubscriptionRef.current = WatchModule.addListener((event) => {
                          console.log('[useWatch] Received from Watch:', event);

                                                                               if (event.command) {
                                                                                           if (event.command === 'GET_TODAY_TRAINING') {
                                                                                                         // Watch beder om træningsdata – send det gemte straks
                                                                                             if (todayTrainingRef.current) {
                                                                                                             WatchModule.sendUpdateToWatch(todayTrainingRef.current)
                                                                                                               .catch(() => WatchModule.transferUserInfo(todayTrainingRef.current));
                                                                                                 }
                                                                                                         // Bed App.js om at sende opdateret plan
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

                                                                                              try {
                                                                                                          // Watch sender distance i METER – konverter til km
                            const distanceMeters = event.distance || 0;
                                                                                                          const distanceKm = parseFloat((distanceMeters / 1000).toFixed(2));
                                                                                                          const durationSecs = Math.round(event.duration || event.elapsedTime || 0);
                                                                                                          const paceSecsPerKm = distanceKm > 0 ? durationSecs / distanceKm : 0;

                            const run = {
                                          km: distanceKm,
                                          duration: durationSecs,
                                          duration_secs: durationSecs,
                                          pace: parseFloat(paceSecsPerKm.toFixed(1)),
                                          pace_secs_per_km: parseFloat(paceSecsPerKm.toFixed(1)),
                                          heart_rate: event.avgHeartRate || event.heartRate || 0,
                                          avg_hr: event.avgHeartRate || event.heartRate || 0,
                                          max_hr: event.maxHeartRate || 0,
                                          cadence: event.cadence || 0,
                                          total_ascent: event.totalAscent || 0,
                                          total_descent: event.totalDescent || 0,
                                          total_steps: event.totalSteps || 0,
                                          splits: event.splits || [],
                                          date: new Date().toISOString(),
                                          source: 'apple_watch',
                                          created_at: new Date().toISOString(),
                            };

                            const saved = await saveRun(run);
                                                                                                          console.log('[Watch] Run saved:', saved ? 'success' : 'failed');
                                                                                                          onWorkoutComplete?.(run, saved);
                                                                                                  } catch (err) {
                                                                                                          console.error('[Watch] Error saving run:', err);
                                                                                                  }
                });

                // Håndter live workout opdateringer fra Watch
                liveUpdateSubscriptionRef.current = WatchModule.addLiveUpdateListener((event) => {
                          onCommand?.('LIVE_UPDATE', event);
                });

                // Håndter reachability ændringer
                reachabilitySubscriptionRef.current = WatchModule.addReachabilityListener((reachable) => {
                          console.log('[useWatch] Reachability changed:', reachable);
                          setIsReachable(reachable);

                                                                                                // Når Watch bliver reachable – send træningsdata straks
                                                                                                if (reachable && todayTrainingRef.current) {
                                                                                                            WatchModule.sendUpdateToWatch(todayTrainingRef.current)
                                                                                                              .catch(err => console.warn('[useWatch] Auto-send on reachable failed:', err.message));
                                                                                                    }
                });

                return () => {
                          messageSubscriptionRef.current?.remove();
                          workoutSubscriptionRef.current?.remove();
                          liveUpdateSubscriptionRef.current?.remove();
                          reachabilitySubscriptionRef.current?.remove();
                };
  }, [enabled, onCommand, onWorkoutComplete]);

  // Send live løbedata til Watch under aktivt løb
  const sendRunUpdate = useCallback(async (data) => {
          if (!WatchModule.isSupported || !isReachable) return;
          try {
                    await WatchModule.sendUpdateToWatch({ type: 'RUN_UPDATE', ...data });
          } catch (err) {
                    console.warn('[useWatch] sendRunUpdate error:', err);
          }
  }, [isReachable]);

  // Send JWT token til Watch så den kan kommunikere direkte med Railway
  const sendAuthToWatch = async (jwtToken, userId) => {
    if (!jwtToken) return;
    try {
      await WatchModule.sendMessage({
        type: 'AUTH_UPDATE',
        jwtToken,
        userId: userId || null,
        timestamp: Date.now(),
      });
      console.log('[useWatch] JWT token sendt til Watch');
    } catch (e) {
      console.warn('[useWatch] Kunne ikke sende token til Watch:', e?.message);
    }
  };

  return {
          isReachable,
          isPaired,
          isWatchAppInstalled,
          lastWatchWorkout,
          sendTodayTraining,
          sendRunUpdate,
          sendAuthToWatch,
  };
}
