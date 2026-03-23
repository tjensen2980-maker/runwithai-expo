/**
 * MusicButton.js — Floating music button for RunTracker
 *
 * Shows a pulsing music icon that:
 *   - Displays current BPM when running
 *   - Opens MusicMatcher bottom sheet on tap
 *   - Pulses in sync with cadence when active
 *
 * Usage in RunTracker.js:
 *   <MusicButton
 *     bpm={bpmRange.target}
 *     isRunning={isRunning}
 *     isPlaying={!!currentTrack}
 *     onPress={() => setMusicVisible(true)}
 *   />
 */

import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  Animated,
  StyleSheet,
  View,
} from 'react-native';

const SPOTIFY_GREEN = '#1DB954';

export default function MusicButton({ bpm, isRunning, isPlaying, onPress }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation synced to BPM
  useEffect(() => {
    if (!isRunning || !bpm || bpm <= 0) {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
      return;
    }

    const beatDuration = 60000 / bpm; // ms per beat

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: beatDuration * 0.15,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: beatDuration * 0.85,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [bpm, isRunning]);

  // Glow when playing
  useEffect(() => {
    Animated.timing(glowAnim, {
      toValue: isPlaying ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isPlaying]);

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(29,185,84,0)', 'rgba(29,185,84,0.5)'],
  });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ scale: pulseAnim }],
          borderColor,
          borderWidth: 3,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {/* Music note icon */}
        <Text style={styles.icon}>♪</Text>
        {isRunning && bpm > 0 && (
          <View style={styles.bpmOverlay}>
            <Text style={styles.bpmText}>{bpm}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 28,
  },
  button: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: SPOTIFY_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  icon: {
    color: '#FFF',
    fontSize: 22,
    marginTop: -2,
  },
  bpmOverlay: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  bpmText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
