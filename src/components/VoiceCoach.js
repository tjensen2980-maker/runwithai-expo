// ─── VOICE COACH ─────────────────────────────────────────────────────────────
// AI stemme-coaching under løb
// OpenAI TTS via expo-av (native) / Audio API (web)
// expo-speech / Web Speech API som fallback
// ─────────────────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// Server URL for TTS
const SERVER = 'https://runwithai-server-production.up.railway.app';
let authToken = null;
export function setVoiceAuthToken(token) { authToken = token; }

// Lazy-load native modules
let ExpoAV = null;
let ExpoSpeech = null;
let ExpoFileSystem = null;

if (!isWeb) {
  try { ExpoAV = require('expo-av'); } catch (e) { console.log('expo-av not available'); }
  try { ExpoSpeech = require('expo-speech'); } catch (e) { console.log('expo-speech not available'); }
  try { ExpoFileSystem = require('expo-file-system'); } catch (e) { console.log('expo-file-system not available'); }
}

// ─── TTS ENGINE ──────────────────────────────────────────────────────────────
let speechQueue = [];
let isSpeaking = false;
let currentSound = null; // Track current expo-av Sound for cleanup

function speak(text, lang = 'da-DK') {
  console.log('[VoiceCoach] speak:', text.substring(0, 50));
  speechQueue.push(text);
  processQueue(lang);
}

async function processQueue(lang = 'da-DK') {
  if (isSpeaking || speechQueue.length === 0) return;
  isSpeaking = true;
  const text = speechQueue.shift();

  try {
    if (isWeb) {
      await speakFallback(text, lang);
    } else if (authToken) {
      // Native: try OpenAI TTS — do NOT fall back to expo-speech
      // so we can hear if expo-av actually plays
      await speakOpenAINative(text);
    } else {
      await speakFallback(text, lang);
    }
  } catch (e) {
    console.log('[VoiceCoach] TTS error:', e.message);
    // Only use expo-speech fallback if OpenAI TTS completely failed (network error etc)
    try { await speakFallback(text, lang); } catch {}
  }

  isSpeaking = false;
  if (speechQueue.length > 0) {
    processQueue(lang);
  }
}

// Native-only: fetch TTS, play with expo-av
async function speakOpenAINative(text) {
  const AV = require('expo-av');

  // Set audio mode for silent mode support
  await AV.Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: true,
  });

  // Fetch TTS audio
  const res = await fetch(`${SERVER}/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ text, voice: 'marin' }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}`);

  // Convert blob to base64
  const blob = await res.blob();
  const dataUri = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result); // "data:audio/mpeg;base64,XXXX..."
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  // Try playing directly from data URI first
  try {
    const { sound } = await AV.Audio.Sound.createAsync(
      { uri: dataUri },
      { shouldPlay: true, volume: 1.0 }
    );
    currentSound = sound;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        sound.unloadAsync().catch(() => {});
        currentSound = null;
        resolve();
      }, 30000);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          clearTimeout(timeout);
          sound.unloadAsync().catch(() => {});
          currentSound = null;
          resolve();
        }
      });
    });
  } catch (dataUriErr) {
    // Data URI didn't work — try writing to file
    console.log('[VoiceCoach] Data URI playback failed, trying file:', dataUriErr.message);
    
    const FS = require('expo-file-system');
    const base64 = dataUri.split(',')[1];
    const fileUri = FS.cacheDirectory + 'tts_' + Date.now() + '.mp3';
    
    await FS.writeAsStringAsync(fileUri, base64, {
      encoding: FS.EncodingType.Base64,
    });

    const { sound } = await AV.Audio.Sound.createAsync(
      { uri: fileUri },
      { shouldPlay: true, volume: 1.0 }
    );
    currentSound = sound;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        sound.unloadAsync().catch(() => {});
        currentSound = null;
        FS.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
        resolve();
      }, 30000);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          clearTimeout(timeout);
          sound.unloadAsync().catch(() => {});
          currentSound = null;
          FS.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
          resolve();
        }
      });
    });
  }
}

// OpenAI TTS via server — natural voice
async function speakOpenAI(text) {
  // Set audio mode FIRST
  if (!isWeb && ExpoAV) {
    try {
      await ExpoAV.Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch {}
  }

  if (!isWeb && ExpoAV && ExpoFileSystem) {
    // Native: fetch as blob, read as base64, write to file, play with expo-av
    const res = await fetch(`${SERVER}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ text, voice: 'marin' }),
    });
    if (!res.ok) throw new Error(`TTS server error: ${res.status}`);

    // React Native supports blob → FileReader → base64
    const blob = await res.blob();
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // reader.result is "data:audio/mpeg;base64,XXXX..."
        const b64 = reader.result.split(',')[1];
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const fileUri = ExpoFileSystem.cacheDirectory + 'tts_' + Date.now() + '.mp3';
    await ExpoFileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: ExpoFileSystem.EncodingType.Base64,
    });

    const { Sound } = ExpoAV;
    const { sound } = await Sound.createAsync(
      { uri: fileUri },
      { shouldPlay: false, volume: 1.0 }
    );
    currentSound = sound;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        sound.unloadAsync().catch(() => {});
        currentSound = null;
        ExpoFileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
        resolve();
      }, 30000);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          clearTimeout(timeout);
          sound.unloadAsync().catch(() => {});
          currentSound = null;
          ExpoFileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
          resolve();
        }
      });
      sound.playAsync().catch(() => {
        clearTimeout(timeout);
        sound.unloadAsync().catch(() => {});
        currentSound = null;
        resolve();
      });
    });
  }

  if (isWeb) {
    const res = await fetch(`${SERVER}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ text, voice: 'marin' }),
    });
    if (!res.ok) throw new Error(`TTS server error: ${res.status}`);
    
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Audio playback failed')); };
      audio.play().catch(reject);
    });
  }

  throw new Error('No audio playback available');
}

// ArrayBuffer → Base64 helper (works in React Native)
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Fallback: expo-speech (native) or Web Speech API (web)
async function speakFallback(text, lang) {
  if (!isWeb && ExpoSpeech) {
    return new Promise((resolve) => {
      // Timeout safety — resolve after 15 seconds max
      const timeout = setTimeout(resolve, 15000);
      try {
        ExpoSpeech.speak(text, {
          language: lang,
          rate: 1.0,
          pitch: 1.0,
          onDone: () => { clearTimeout(timeout); resolve(); },
          onError: () => { clearTimeout(timeout); resolve(); },
          onStopped: () => { clearTimeout(timeout); resolve(); },
        });
      } catch (e) {
        clearTimeout(timeout);
        console.log('[VoiceCoach] expo-speech error:', e);
        resolve();
      }
    });
  }

  if (!isWeb) {
    // Last resort native: try require expo-speech dynamically
    try {
      const Speech = require('expo-speech');
      return new Promise((resolve) => {
        const timeout = setTimeout(resolve, 15000);
        Speech.speak(text, {
          language: lang,
          rate: 1.0,
          pitch: 1.0,
          onDone: () => { clearTimeout(timeout); resolve(); },
          onError: () => { clearTimeout(timeout); resolve(); },
          onStopped: () => { clearTimeout(timeout); resolve(); },
        });
      });
    } catch (e) {
      console.log('[VoiceCoach] dynamic expo-speech import failed:', e);
    }
  }
  
  if (isWeb && typeof window !== 'undefined' && window.speechSynthesis) {
    return new Promise((resolve) => {
      const doSpeak = (voices) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        const daVoice = voices.find(v => v.lang.startsWith('da')) || voices.find(v => v.lang.startsWith('en-'));
        if (daVoice) utterance.voice = daVoice;
        utterance.onend = resolve;
        utterance.onerror = resolve;
        window.speechSynthesis.speak(utterance);
      };
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        doSpeak(voices);
      } else {
        window.speechSynthesis.onvoiceschanged = () => doSpeak(window.speechSynthesis.getVoices());
        setTimeout(() => doSpeak(window.speechSynthesis.getVoices()), 500);
      }
    });
  }
}

export function stopSpeaking() {
  speechQueue = [];
  isSpeaking = false;
  
  // Stop current expo-av sound
  if (currentSound) {
    try { currentSound.stopAsync().catch(() => {}); } catch {}
    currentSound = null;
  }
  
  if (isWeb && typeof window !== 'undefined') {
    window.speechSynthesis?.cancel();
  }
  if (!isWeb && ExpoSpeech) {
    try { ExpoSpeech.stop(); } catch {}
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmtPaceVoice(pace) {
  if (!pace || pace <= 0) return null;
  const mins = Math.floor(pace);
  const secs = Math.round((pace - mins) * 60);
  if (secs === 0) return `${mins} blank`;
  if (secs < 10) return `${mins} nul ${secs}`;
  return `${mins} ${secs}`;
}

function fmtTimeVoice(secs) {
  if (!secs) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.round(secs % 60);
  if (h > 0 && m > 0) return `${h} time${h > 1 ? 'r' : ''} og ${m} minutter`;
  if (h > 0) return `${h} time${h > 1 ? 'r' : ''}`;
  if (m > 0 && s > 0) return `${m} minutter og ${s} sekunder`;
  if (m > 0) return `${m} minutter`;
  return `${s} sekunder`;
}

// ─── MOTIVATION SÆTNINGER ────────────────────────────────────────────────────
const MOTIVATION_RUN = [
  'Godt tempo, bliv ved sådan!',
  'Du løber rigtig godt lige nu.',
  'Perfekt rytme, hold fast i den.',
  'Flot indsats, du kører stærkt.',
  'Bare bliv ved, du er i god form.',
  'Stærkt løb, fortsæt præcis sådan.',
  'Du gør det fremragende.',
  'Fantastisk arbejde derude!',
];

const MOTIVATION_WALK = [
  'God tur, bare bliv ved.',
  'Du går godt, nyd turen.',
  'Flot tempo, fortsæt sådan.',
  'Dejlig tur, du klarer det godt.',
];

let lastMotivationIdx = -1;
function getMotivation(type) {
  const list = type === 'walk' ? MOTIVATION_WALK : MOTIVATION_RUN;
  let idx;
  do { idx = Math.floor(Math.random() * list.length); } while (idx === lastMotivationIdx && list.length > 1);
  lastMotivationIdx = idx;
  return list[idx];
}

// ─── VOICE COACH ─────────────────────────────────────────────────────────────
export default class VoiceCoach {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.name = (options.name || 'løber').split(' ')[0];
    this.activityType = options.activityType || 'run';
    this.bestPace = options.bestPace || null;
    this.bestKm = options.bestKm || null;
    this.targetKm = options.targetKm || null;

    this.lastAnnouncedKm = 0;
    this.lastMotivationTime = 0;
    this.hasAnnouncedStart = false;
    this.hasAnnounced100m = false;
    this.hasAnnounced500m = false;
    this.hasAnnouncedHalfway = false;
    this.splitPaces = [];
    this.kmInterval = 1;
    this.motivationInterval = 5 * 60 * 1000;

    // Pre-warm voices on web
    if (isWeb && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.getVoices(); };
    }

    // Configure audio on native
    if (!isWeb && ExpoAV) {
      try {
        ExpoAV.Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        }).catch(() => {});
      } catch {}
    }
  }

  update({ km, durationSecs, paceMinPerKm }) {
    if (!this.enabled) return;

    if (!this.hasAnnouncedStart) {
      this._announceStart();
      this.hasAnnouncedStart = true;
      this.lastMotivationTime = Date.now();
    }

    if (!this.hasAnnounced100m && km >= 0.1) {
      speak('GPS signal er godt, vi tracker din rute.');
      this.hasAnnounced100m = true;
    }

    if (!this.hasAnnounced500m && km >= 0.5) {
      const paceStr = fmtPaceVoice(paceMinPerKm);
      let msg = 'Fem hundrede meter.';
      if (paceStr && paceMinPerKm > 0) msg += ` Du ligger på en pace på ${paceStr}.`;
      msg += ' Godt i gang!';
      speak(msg);
      this.hasAnnounced500m = true;
    }

    const currentKm = Math.floor(km);
    if (currentKm > this.lastAnnouncedKm && currentKm >= 1) {
      this._announceKmSplit(currentKm, paceMinPerKm, durationSecs);
      this.lastAnnouncedKm = currentKm;
    }

    if (this.targetKm && !this.hasAnnouncedHalfway && km >= this.targetKm / 2 && km < this.targetKm / 2 + 0.1) {
      this._announceHalfway(km);
      this.hasAnnouncedHalfway = true;
    }

    const now = Date.now();
    const interval = durationSecs < 600 ? 3 * 60 * 1000 : this.motivationInterval;
    if (now - this.lastMotivationTime > interval && durationSecs > 30) {
      if (km > 0.1) {
        this._announceMotivation(paceMinPerKm);
      } else {
        const timeStr = fmtTimeVoice(durationSecs);
        speak(`${timeStr} gået. ${getMotivation(this.activityType)}`);
      }
      this.lastMotivationTime = now;
    }
  }

  finish({ km, durationSecs, paceMinPerKm }) {
    if (!this.enabled) return;
    const activity = this.activityType === 'walk' ? 'turen' : 'løbet';
    const paceStr = fmtPaceVoice(paceMinPerKm);
    const timeStr = fmtTimeVoice(durationSecs);
    const kmRounded = km.toFixed(1).replace('.', ',');

    let msg = `Sådan ${this.name}! ${activity} er slut. Du har tilbagelagt ${kmRounded} kilometer på ${timeStr}.`;
    if (paceStr && paceMinPerKm > 0) msg += ` Med en gennemsnitlig pace på ${paceStr}.`;

    if (this.bestPace && paceMinPerKm < this.bestPace && paceMinPerKm > 0) {
      msg += ` Og det er faktisk en ny personlig rekord i pace! Tillykke!`;
    }
    if (this.bestKm && km > this.bestKm) {
      msg += ` Det er din længste tur nogensinde, imponerende!`;
    }

    msg += ` Godt klaret!`;
    speak(msg);
  }

  _announceStart() {
    const starts = this.activityType === 'walk'
      ? [`Så er vi i gang ${this.name}, god tur!`, `Perfekt, lad os komme af sted ${this.name}!`]
      : [`Så er vi i gang ${this.name}, godt løb!`, `Perfekt ${this.name}, lad os komme ud og løbe!`, `${this.name}, vi kører! God tur derude.`];
    const msg = starts[Math.floor(Math.random() * starts.length)];
    let extra = '';
    if (this.targetKm) {
      extra = ` I dag skal vi ramme ${this.targetKm} kilometer.`;
    }
    speak(msg + extra);
  }

  _announceKmSplit(kmNum, pace, durationSecs) {
    this.splitPaces.push(pace);
    const paceStr = fmtPaceVoice(pace);
    const timeStr = fmtTimeVoice(durationSecs);
    let msg = `${kmNum} kilometer klaret.`;
    if (paceStr && pace > 0) msg += ` Pace ${paceStr}.`;
    if (this.splitPaces.length >= 2) {
      const prevPace = this.splitPaces[this.splitPaces.length - 2];
      const diff = pace - prevPace;
      if (diff < -0.15) msg += ' Det var hurtigere end den forrige, flot!';
      else if (diff > 0.3) msg += ' Lidt langsommere, men det er helt okay.';
      else msg += ' Fint og stabilt.';
    }
    if (this.bestPace && pace > 0 && pace < this.bestPace) {
      msg += ' Du ligger faktisk foran din bedste pace!';
    }
    if (this.targetKm && this.targetKm - kmNum > 0 && this.targetKm - kmNum <= 3) {
      const left = Math.round(this.targetKm - kmNum);
      if (left === 1) msg += ' Kun én kilometer tilbage!';
      else msg += ` Kun ${left} kilometer tilbage.`;
    }
    speak(msg);
  }

  _announceHalfway(km) {
    const left = Math.round((this.targetKm - km) * 10) / 10;
    const leftStr = left.toFixed(1).replace('.', ',');
    speak(`Du er halvvejs ${this.name}! Kun ${leftStr} kilometer tilbage. ${getMotivation(this.activityType)}`);
  }

  _announceMotivation(pace) {
    let msg = getMotivation(this.activityType);
    if (pace && pace > 0 && Math.random() > 0.5) {
      const paceStr = fmtPaceVoice(pace);
      if (paceStr) msg += ` Din pace ligger på ${paceStr}.`;
    }
    speak(msg);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) stopSpeaking();
  }

  destroy() {
    stopSpeaking();
    this.enabled = false;
  }
}