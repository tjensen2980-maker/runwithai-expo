import { Platform } from 'react-native';

const REVENUECAT_IOS_KEY = 'appl_RSTGHBSwwJLczMzoqgBiNYDFDIb';
const REVENUECAT_ANDROID_KEY = 'goog_YOUR_REVENUECAT_ANDROID_KEY';

let Purchases = null;
let configured = false;
let identifiedUserId = null;

if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    Purchases = require('react-native-purchases').default;
  } catch (error) {
    console.log('RevenueCat is not available:', error.message);
  }
}

function decodeJwtPayload(token) {
  try {
    const payload = String(token || '').split('.')[1];
    if (!payload || typeof globalThis.atob !== 'function') return null;

    const normalized = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=');

    return JSON.parse(globalThis.atob(normalized));
  } catch {
    return null;
  }
}

function getStableAppUserId(token) {
  const payload = decodeJwtPayload(token);
  const rawId = [payload?.userId, payload?.user_id, payload?.id, payload?.sub]
    .find(value => value != null && !String(value).includes('@'));
  if (!rawId) return null;

  const appUserId = `runwithai:${String(rawId)}`;
  return appUserId.length <= 100 ? appUserId : null;
}

function getApiKey() {
  return Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
}

export async function configureRevenueCat(token) {
  if (!Purchases || Platform.OS === 'web') return null;

  const apiKey = getApiKey();
  if (!apiKey || apiKey.includes('YOUR_REVENUECAT')) return null;

  const appUserId = getStableAppUserId(token);

  if (!configured) {
    // Start from RevenueCat's cached/anonymous customer, then log in. This lets
    // existing installations safely merge earlier anonymous purchases.
    await Purchases.configure({ apiKey });
    configured = true;
  }

  if (appUserId && appUserId !== identifiedUserId) {
    await Purchases.logIn(appUserId);
    identifiedUserId = appUserId;
  }

  return Purchases;
}

export async function logOutRevenueCat() {
  if (!Purchases || !configured || !identifiedUserId) return;

  try {
    await Purchases.logOut();
  } catch (error) {
    console.log('RevenueCat logout warning:', error.message);
  } finally {
    identifiedUserId = null;
  }
}
