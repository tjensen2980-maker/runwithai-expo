/**
 * VoiceInput.js v2 — Talk to AI Coach during runs
 * TAP to start recording, TAP again to stop and send
 * Place in: src/screens/components/VoiceInput.js
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';

const isWeb = Platform.OS === 'web';
const SERVER = 'https://runwithai-server-production.up.railway.app';

let getAuthToken;
try { getAuthToken = require('../../data').getAuthToken; } catch { getAuthToken = () => null; }

export default function VoiceInput({ isRunning, stats }) {
  const [state, setState] = useState('idle'); // idle | recording | processing
  const [statusMsg, setStatusMsg] = useState('');
  const [lastResponse, setLastResponse] = useState(null);
  const recordingRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ─── PLAY TTS RESPONSE ────────────────────────────────────────────
  const playTTSResponse = useCallback(async (text) => {
    try {
      const token = getAuthToken();
      if (!token || isWeb) return;

      const AV = require('expo-av');
      await AV.Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const res = await fetch(`${SERVER}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ text, voice: 'marin' }),
      });
      if (!res.ok) throw new Error(`TTS ${res.status}`);

      const blob = await res.blob();
      const dataUri = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const { sound } = await AV.Audio.Sound.createAsync(
        { uri: dataUri },
        { shouldPlay: true, volume: 1.0 }
      );
      await new Promise((resolve) => {
        const timeout = setTimeout(() => { sound.unloadAsync().catch(() => {}); resolve(); }, 30000);
        sound.setOnPlaybackStatusUpdate((s) => {
          if (s.didJustFinish) { clearTimeout(timeout); sound.unloadAsync().catch(() => {}); resolve(); }
        });
      });
    } catch (err) {
      console.log('[VoiceInput] TTS error:', err.message);
      try { require('expo-speech').speak(text, { language: 'da-DK' }); } catch {}
    }
  }, []);

  // ─── TAP HANDLER ──────────────────────────────────────────────────
  const handleTap = useCallback(async () => {
    if (state === 'processing') return;

    if (state === 'idle') {
      // START RECORDING
      try {
        setStatusMsg('Starter mikrofon...');
        const AV = require('expo-av');

        const perm = await AV.Audio.requestPermissionsAsync();
        if (perm.status !== 'granted') {
          setStatusMsg('Mikrofon-tilladelse nægtet');
          setTimeout(() => setStatusMsg(''), 3000);
          return;
        }

        await AV.Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const recording = new AV.Audio.Recording();
        await recording.prepareToRecordAsync(
          AV.Audio.RecordingOptionsPresets
            ? AV.Audio.RecordingOptionsPresets.HIGH_QUALITY
            : {
                android: { extension: '.m4a', outputFormat: 3, audioEncoder: 3, sampleRate: 16000, numberOfChannels: 1, bitRate: 128000 },
                ios: { extension: '.m4a', audioQuality: 127, sampleRate: 16000, numberOfChannels: 1, bitRate: 128000, outputFormat: 'aac' },
                web: {},
              }
        );
        await recording.startAsync();
        recordingRef.current = recording;
        setState('recording');
        setStatusMsg('Lytter — tryk igen for at sende');

        // Pulse animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: false }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
          ])
        ).start();
      } catch (err) {
        console.log('[VoiceInput] Record start error:', err.message);
        setStatusMsg('Fejl: ' + err.message);
        setState('idle');
        setTimeout(() => setStatusMsg(''), 5000);
      }

    } else if (state === 'recording') {
      // STOP & SEND
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      setState('processing');
      setStatusMsg('Sender til AI coach...');

      try {
        const recording = recordingRef.current;
        if (!recording) throw new Error('Ingen optagelse');

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        recordingRef.current = null;
        console.log('[VoiceInput] Recording URI:', uri);

        if (!uri) throw new Error('Ingen fil gemt');

        const AV = require('expo-av');
        await AV.Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });

        const token = getAuthToken();
        if (!token) throw new Error('Ikke logget ind');

        const formData = new FormData();
        formData.append('audio', {
          uri: uri,
          type: 'audio/m4a',
          name: 'voice.m4a',
        });

        if (stats) {
          formData.append('context', JSON.stringify({
            km: stats.km || 0,
            duration: stats.duration || 0,
            pace: stats.pace || 0,
          }));
        }

        setStatusMsg('Whisper transcriberer...');

        const res = await fetch(`${SERVER}/voice-coach`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Server ${res.status}: ${errText.substring(0, 100)}`);
        }

        const data = await res.json();
        console.log('[VoiceInput] Response:', data);

        setLastResponse(data.text);
        setStatusMsg('');
        setState('idle');

        if (data.text) {
          await playTTSResponse(data.text);
        }
      } catch (err) {
        console.log('[VoiceInput] Send error:', err.message);
        setStatusMsg('Fejl: ' + err.message);
        setState('idle');
        setTimeout(() => setStatusMsg(''), 5000);
      }
    }
  }, [state, stats, pulseAnim, playTTSResponse]);

  // Don't render on web or when not running
  if (isWeb || !isRunning) return null;

  return (
    <View style={s.container}>
      {/* Response bubble */}
      {lastResponse && state === 'idle' && !statusMsg && (
        <View style={s.responseBubble}>
          <Text style={s.responseText} numberOfLines={4}>{lastResponse}</Text>
        </View>
      )}

      {/* Status message */}
      {statusMsg ? (
        <View style={[s.statusBubble, state === 'recording' && s.statusRecording]}>
          {state === 'recording' && <View style={s.recordingDot} />}
          {state === 'processing' && <ActivityIndicator size="small" color="#c8ff00" />}
          <Text style={s.statusText}>{statusMsg}</Text>
        </View>
      ) : null}

      {/* Mic button */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[
            s.micBtn,
            state === 'recording' && s.micBtnRecording,
            state === 'processing' && s.micBtnProcessing,
          ]}
          onPress={handleTap}
          disabled={state === 'processing'}
          activeOpacity={0.7}
        >
          <Text style={s.micIcon}>
            {state === 'processing' ? '⏳' : state === 'recording' ? '⏹️' : '🎙️'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    bottom: 120,
    alignItems: 'flex-start',
    zIndex: 50,
  },
  micBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#c8ff00',
  },
  micBtnRecording: {
    backgroundColor: '#ff4444',
    borderColor: '#ff4444',
  },
  micBtnProcessing: {
    opacity: 0.6,
  },
  micIcon: { fontSize: 24 },
  statusBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    gap: 6,
    maxWidth: 250,
  },
  statusRecording: {
    backgroundColor: 'rgba(255,0,0,0.85)',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  responseBubble: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    maxWidth: 240,
  },
  responseText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
  },
});
