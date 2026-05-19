// src/utils/notifications.js
// Lokale push-notifikationer via expo-notifications.
// Krav: expo-notifications maa vaere installeret (tilfoejes i package.json naar klar).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Lazy import af expo-notifications saa appen ikke crasher hvis modulet ikke er installeret endnu
let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.warn('expo-notifications ikke installeret endnu - notifikationer er deaktiveret');
}

const STORAGE_KEY = 'runwithai.notification.settings.v1';

const DEFAULT_SETTINGS = {
  mealReminderEnabled: false,
  mealReminderHour: 18,
  mealReminderMinute: 0,
  workoutReminderEnabled: false,
  workoutReminderMinutesBefore: 60,
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

// Annullér alle planlagte notifikationer fra appen
export async function cancelAll() {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) { /* ignore */ }
}

// Daglig maaltids-paamindelse paa et bestemt tidspunkt
export async function scheduleMealReminder(hour, minute) {
  if (!Notifications) return null;
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Husk dit maaltid',
        body: 'Du har endnu ikke logget alle dine maaltider i dag.',
        sound: 'default',
      },
      trigger: {
        hour: Number(hour) || 18,
        minute: Number(minute) || 0,
        repeats: true,
      },
    });
    return id;
  } catch (e) {
    return null;
  }
}

// Engangs-paamindelse foer et planlagt loeb
export async function scheduleWorkoutReminder(workoutDate, minutesBefore) {
  if (!Notifications) return null;
  try {
    const when = new Date(workoutDate);
    if (isNaN(when.getTime())) return null;
    const triggerDate = new Date(when.getTime() - (Number(minutesBefore) || 60) * 60 * 1000);
    if (triggerDate.getTime() <= Date.now()) return null; // i fortiden
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Traening om kort tid',
        body: 'Dit planlagte loeb starter snart. God traening!',
        sound: 'default',
      },
      trigger: triggerDate,
    });
    return id;
  } catch (e) {
    return null;
  }
}

// Synkronisér alle planlagte notifikationer ud fra settings
export async function syncFromSettings(settings, upcomingWorkouts) {
  if (!Notifications) return;
  await cancelAll();
  const s = settings || (await loadSettings());
  if (s.mealReminderEnabled) {
    await scheduleMealReminder(s.mealReminderHour, s.mealReminderMinute);
  }
  if (s.workoutReminderEnabled && Array.isArray(upcomingWorkouts)) {
    for (const w of upcomingWorkouts) {
      if (w && w.date) {
        await scheduleWorkoutReminder(w.date, s.workoutReminderMinutesBefore);
      }
    }
  }
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
