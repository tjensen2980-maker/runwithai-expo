// src/utils/notifications.js
// Lokale push-notifikationer via expo-notifications.
// Stoetter fri valg af dage + tidspunkt for traenings- og maaltids-paamindelser.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Lazy import - appen crasher ikke hvis modulet mangler
let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.warn('expo-notifications ikke installeret - notifikationer er deaktiveret');
}

const STORAGE_KEY = 'runwithai.notification.settings.v2';

// dayIndex: 0=Sun, 1=Mon, ..., 6=Sat (matcher JS Date.getDay)
// I expo-notifications WeeklyTrigger er weekday: 1=Sunday, 2=Monday, ..., 7=Saturday
// Vi konverterer: expoWeekday = jsDayIndex + 1

const DEFAULT_SETTINGS = {
  workoutEnabled: false,
  workoutTime: '07:00',
  workoutDays: [1, 3, 5], // Man, Ons, Fre
  mealEnabled: false,
  mealTime: '18:00',
  mealDays: [0, 1, 2, 3, 4, 5, 6], // alle dage
};

// ---- Settings persistence -------------------------------------------------

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (e) {
    return false;
  }
}

// ---- Permission handling --------------------------------------------------

export async function requestPermission() {
  if (!Notifications) return { granted: false, reason: 'module-missing' };
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return { granted: true };
    const req = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true }
    });
    return { granted: req.granted === true, raw: req };
  } catch (e) {
    return { granted: false, reason: 'error', error: String(e) };
  }
}

export async function checkPermission() {
  if (!Notifications) return { granted: false };
  try {
    const s = await Notifications.getPermissionsAsync();
    return { granted: !!s.granted, raw: s };
  } catch (e) {
    return { granted: false };
  }
}

// ---- Schedule helpers -----------------------------------------------------

export async function cancelAll() {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) { /* ignore */ }
}

function parseTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return { hour: 7, minute: 0 };
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return {
    hour: isNaN(h) ? 7 : Math.max(0, Math.min(23, h)),
    minute: isNaN(m) ? 0 : Math.max(0, Math.min(59, m)),
  };
}

// Schedule one weekly repeating notification for (dayIndex, hour, minute)
// dayIndex: 0=Sun, ..., 6=Sat
async function scheduleWeekly(dayIndex, hour, minute, title, body) {
  if (!Notifications) return null;
  try {
    const weekday = ((dayIndex % 7) + 7) % 7 + 1; // 1=Sun .. 7=Sat
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        sound: 'default',
      },
      trigger: {
        weekday: weekday,
        hour: Number(hour) || 7,
        minute: Number(minute) || 0,
        repeats: true,
      },
    });
    return id;
  } catch (e) {
    return null;
  }
}

// Synkronisér alle planlagte notifikationer ud fra settings
export async function syncFromSettings(settings) {
  if (!Notifications) return;
  await cancelAll();
  const s = settings || (await loadSettings());

  if (s.workoutEnabled && Array.isArray(s.workoutDays) && s.workoutDays.length > 0) {
    const { hour, minute } = parseTime(s.workoutTime);
    for (const d of s.workoutDays) {
      await scheduleWeekly(d, hour, minute, 'Tid til traening', 'Det er tid til dit planlagte loeb. God traening!');
    }
  }

  if (s.mealEnabled && Array.isArray(s.mealDays) && s.mealDays.length > 0) {
    const { hour, minute } = parseTime(s.mealTime);
    for (const d of s.mealDays) {
      await scheduleWeekly(d, hour, minute, 'Husk dit maaltid', 'Glem ikke at logge dit maaltid i dag.');
    }
  }
}

// Bridge - laes settings fra brugerens profil-felter (bagudkompatibilitet)
export function settingsFromProfile(profile) {
  if (!profile) return { ...DEFAULT_SETTINGS };
  return {
    workoutEnabled: !!profile.notifEnabled,
    workoutTime: profile.notifTime || '07:00',
    workoutDays: Array.isArray(profile.notifDays) ? profile.notifDays : [1, 3, 5],
    mealEnabled: !!profile.mealNotifEnabled,
    mealTime: profile.mealNotifTime || '18:00',
    mealDays: Array.isArray(profile.mealNotifDays) ? profile.mealNotifDays : [0,1,2,3,4,5,6],
  };
}

// Init - kald ved app start
export async function initNotifications() {
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) { /* ignore */ }
}

export const NOTIFICATION_DEFAULTS = DEFAULT_SETTINGS;
