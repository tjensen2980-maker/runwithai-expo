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
    const liveUpdateSubscriptionRef = useRef(null);
    const reachabilitySubscriptionRef = useRef(null);

    // Gem todayTraining reference så vi kan sende den hurtigt
    const todayTrainingRef = useRef(null);

    // Funktion til at sende dagens træning til Watch
    const sendTodayTraining = useCallback(async (todayPlan, fullPlan) => {
        if (!WatchModule.isSupported) return;
        
        const payload = {
            todayTraining: todayPlan || null,
            trainingPlan: fullPlan || [],
            timestamp: Date.now(),
        };
        
        // Gem lokalt til hurtig adgang
        todayTrainingRef.current = payload;
        
        console.log('[useWatch] Sending today training to Watch:', todayPlan?.type || 'null');
        
        try {
            // Prøv direkte sendMessage hvis Watch er reachable
            if (isReachable) {
                await WatchModule.sendUpdateToWatch(payload);
                console.log('[useWatch] sendUpdateToWatch success');
            } else {
                // Brug transferUserInfo som background delivery
                await WatchModule.transferUserInfo(payload);
                console.log('[useWatch] transferUserInfo success');
            }
        } catch (err) {
            console.warn('[useWatch] sendTodayTraining error:', err.message);
            // Prøv transferUserInfo som fallback
            try {
                await WatchModule.transferUserInfo(payload);
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
                // Svar på GET_TODAY_TRAINING request fra uret
                if (event.command === 'GET_TODAY_TRAINING') {
                    // Send den gemte træning direkte
                    if (todayTrainingRef.current) {
                        WatchModule.sendUpdateToWatch(todayTrainingRef.current)
                            .catch(() => WatchModule.transferUserInfo(todayTrainingRef.current));
                    }
                    // onCommand callback bruges til at bede App.js sende plan
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

            // Konverter og gem løbet
            try {
                const distanceKm = parseFloat((event.distance || 0).toFixed(2));
                const durationSecs = Math.round(event.elapsedTime || 0);
                const paceSecsPerKm = distanceKm > 0 ? durationSecs / distanceKm : 0;

                const run = {
                    km: distanceKm,
                    duration: durationSecs,
                    duration_secs: durationSecs,
                    pace: parseFloat(paceSecsPerKm.toFixed(1)),
                    pace_secs_per_km: parseFloat(paceSecsPerKm.toFixed(1)),
                    heart_rate: event.heartRate || event.avgHeartRate || 0,
                    avg_hr: event.avgHeartRate || event.heartRate || 0,
                    max_hr: event.maxHeartRate || 0,
                    cadence: event.cadence || 0,
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
            // Kan bruges til live tracking UI på iPhone
            onCommand?.('LIVE_UPDATE', event);
        });

        // Håndter reachability ændringer
        reachabilitySubscriptionRef.current = WatchModule.addReachabilityListener((reachable) => {
            console.log('[useWatch] Reachability changed:', reachable);
            setIsReachable(reachable);
            
            // Når Watch bliver reachable, send straks træningsdata
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
            await WatchModule.sendUpdateToWatch({
                type: 'RUN_UPDATE',
                ...data,
            });
        } catch (err) {
            console.warn('[useWatch] sendRunUpdate error:', err);
        }
    }, [isReachable]);

    return {
        isReachable,
        isPaired,
        isWatchAppInstalled,
        lastWatchWorkout,
        sendTodayTraining,
        sendRunUpdate,
    };
}
