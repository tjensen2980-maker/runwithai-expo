// src/modules/LiveActivity.js
// JavaScript wrapper omkring den native LiveActivityModule.
// Paa iOS 16.2+ starter/opdaterer/afslutter den en ActivityKit Live Activity
// der vises paa laaseskaerm og Dynamic Island.
// Paa Android vises en vedvarende (ongoing) notifikation der opdateres loebende
// med distance, tid og tempo - Androids naermeste pendant til en Live Activity.
// Kalde-koden (RunTracker) behoever ikke conditionals: API'et er det samme paa begge platforme.

import { NativeModules, Platform } from 'react-native';

const { LiveActivityModule } = NativeModules;

// ---------------------------------------------------------------------------
// iOS: ActivityKit via native modul
// ---------------------------------------------------------------------------
const isIOSAvailable = Platform.OS === 'ios' && !!LiveActivityModule;

// ---------------------------------------------------------------------------
// Android: vedvarende notifikation via expo-notifications
// ---------------------------------------------------------------------------
const isAndroid = Platform.OS === 'android';

let Notifications = null;
if (isAndroid) {
  try {
    // Lazy require saa iOS-bundlen ikke paavirkes
    Notifications = require('expo-notifications');
  } catch (e) {
    console.log('LiveActivity(Android): expo-notifications ikke tilgaengelig:', e?.message || e);
  }
}

const ANDROID_CHANNEL_ID = 'run-live-activity';
const ANDROID_NOTIFICATION_ID = 'run-live-activity-notification';

let isActive = false;
let androidChannelReady = false;

// --- Hjaelpere til formatering -------------------------------------------

function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

function formatDistanceKm(meters) {
  const km = (meters || 0) / 1000;
  return km.toFixed(2);
}

function formatPace(paceMinPerKm) {
  if (!paceMinPerKm || paceMinPerKm <= 0 || !isFinite(paceMinPerKm)) return '--:--';
  const totalSec = Math.round(paceMinPerKm * 60);
  const m = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function activityLabel(type) {
  switch (type) {
    case 'walk': return 'Gang';
    case 'bike': return 'Cykling';
    case 'run':
    default: return 'Løb';
  }
}

function buildAndroidContent(params) {
  const distance = formatDistanceKm(params.distanceMeters);
  const duration = formatDuration(params.durationSeconds);
  const pace = formatPace(params.paceMinPerKm);
  const label = activityLabel(params.activityType);
  const title = params.isPaused ? `${label} (pause)` : `${label} i gang`;
  const body = `${distance} km  •  ${duration}  •  ${pace} /km`;
  return { title, body };
}

async function ensureAndroidChannel() {
  if (!Notifications || androidChannelReady) return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Aktivt løb',
      importance: Notifications.AndroidImportance.LOW, // ingen lyd/vibration ved opdatering
      sound: null,
      vibrationPattern: null,
      enableVibrate: false,
      showBadge: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC,
    });
    androidChannelReady = true;
  } catch (e) {
    console.log('LiveActivity(Android): kunne ikke oprette kanal:', e?.message || e);
  }
}

async function ensureAndroidPermission() {
  if (!Notifications) return false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return !!req.granted;
  } catch (e) {
    console.log('LiveActivity(Android): permission fejl:', e?.message || e);
    return false;
  }
}

async function presentAndroidNotification(params) {
  if (!Notifications) return false;
  const { title, body } = buildAndroidContent(params);
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: ANDROID_NOTIFICATION_ID,
      content: {
        title,
        body,
        sticky: true,        // kan ikke swipes vaek mens loebet koerer
        autoDismiss: false,
        priority: Notifications.AndroidNotificationPriority?.LOW,
        color: '#ff4500',
      },
      trigger: null,          // vis med det samme
    });
    return true;
  } catch (e) {
    console.log('LiveActivity(Android): present fejl:', e?.message || e);
    return false;
  }
}

// --- Offentligt API -------------------------------------------------------

/**
 * Returnerer true hvis en "live activity" (iOS) eller ongoing notifikation (Android)
 * kan vises paa denne enhed.
 */
export async function isSupported() {
  if (isIOSAvailable) {
    try {
      return await LiveActivityModule.isSupported();
    } catch (e) {
      console.log('LiveActivity.isSupported error:', e);
      return false;
    }
  }
  if (isAndroid && Notifications) {
    return true;
  }
  return false;
}

/**
 * Starter en ny Live Activity (iOS) eller ongoing notifikation (Android).
 * @param {Object} params
 * @param {string} params.activityType 'run' | 'walk' | 'bike'
 * @param {number} params.distanceMeters
 * @param {number} params.durationSeconds
 * @param {number} params.paceMinPerKm minutter pr km (0 hvis ikke beregnet endnu)
 * @param {boolean} params.isPaused
 */
export async function start(params) {
  const p = {
    activityType: params?.activityType || 'run',
    distanceMeters: params?.distanceMeters || 0,
    durationSeconds: params?.durationSeconds || 0,
    paceMinPerKm: params?.paceMinPerKm || 0,
    isPaused: params?.isPaused || false,
  };

  // iOS
  if (isIOSAvailable) {
    try {
      const supported = await LiveActivityModule.isSupported();
      if (!supported) {
        console.log('LiveActivity: not supported on this device');
        return null;
      }
      const id = await LiveActivityModule.start(p);
      isActive = true;
      console.log('LiveActivity started (iOS):', id);
      return id;
    } catch (e) {
      console.log('LiveActivity.start error (iOS):', e?.message || e);
      return null;
    }
  }

  // Android
  if (isAndroid && Notifications) {
    try {
      const granted = await ensureAndroidPermission();
      if (!granted) {
        console.log('LiveActivity(Android): notifikations-tilladelse ikke givet');
        return null;
      }
      await ensureAndroidChannel();
      const ok = await presentAndroidNotification(p);
      isActive = ok;
      console.log('LiveActivity started (Android):', ok);
      return ok ? ANDROID_NOTIFICATION_ID : null;
    } catch (e) {
      console.log('LiveActivity.start error (Android):', e?.message || e);
      return null;
    }
  }

  return null;
}

/**
 * Opdaterer den nuvaerende Live Activity / notifikation med nye stats.
 * Safe at kalde selv hvis ingen er aktiv (returnerer false).
 */
export async function update(params) {
  const p = {
    activityType: params?.activityType || 'run',
    distanceMeters: params?.distanceMeters || 0,
    durationSeconds: params?.durationSeconds || 0,
    paceMinPerKm: params?.paceMinPerKm || 0,
    isPaused: params?.isPaused || false,
  };

  // iOS
  if (isIOSAvailable) {
    if (!isActive) return false;
    try {
      return await LiveActivityModule.update(p);
    } catch (e) {
      console.log('LiveActivity.update error (iOS):', e?.message || e);
      return false;
    }
  }

  // Android: gen-postning med samme identifier opdaterer den eksisterende notifikation
  if (isAndroid && Notifications) {
    if (!isActive) return false;
    return await presentAndroidNotification(p);
  }

  return false;
}

/**
 * Afslutter den nuvaerende Live Activity / fjerner notifikationen fra laaseskaermen.
 */
export async function end() {
  // iOS
  if (isIOSAvailable) {
    try {
      const result = await LiveActivityModule.end();
      isActive = false;
      console.log('LiveActivity ended (iOS)');
      return result;
    } catch (e) {
      console.log('LiveActivity.end error (iOS):', e?.message || e);
      isActive = false;
      return false;
    }
  }

  // Android
  if (isAndroid && Notifications) {
    try {
      await Notifications.dismissNotificationAsync(ANDROID_NOTIFICATION_ID);
    } catch (e) {
      console.log('LiveActivity.end dismiss fejl (Android):', e?.message || e);
    }
    isActive = false;
    console.log('LiveActivity ended (Android)');
    return true;
  }

  isActive = false;
  return false;
}

export default {
  isSupported,
  start,
  update,
  end,
};
