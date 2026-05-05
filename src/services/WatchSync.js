// WatchSync.js - Send auth data til Apple Watch via WCSession
import { NativeModules, Platform } from 'react-native';

const { RCTWatchConnectivity } = NativeModules;
import { SERVER as SERVER_URL } from '../config';

export async function syncAuthToWatch(token, userId) {
  if (Platform.OS !== 'ios') return { skipped: 'not_ios' };
  if (!RCTWatchConnectivity) return { skipped: 'no_module' };
  if (!token || !userId) return { skipped: 'missing_data' };

  try {
    const state = await RCTWatchConnectivity.getState();
    if (!state.supported) return { skipped: 'not_supported' };
    if (!state.paired) return { skipped: 'no_watch_paired' };
    if (!state.watchAppInstalled) return { skipped: 'app_not_installed' };

    const context = {
      userId: String(userId),
      token: String(token),
      serverUrl: SERVER_URL,
      updatedAt: new Date().toISOString()
    };

    const result = await RCTWatchConnectivity.updateApplicationContext(context);
    console.log('[WatchSync] Auth sent to watch:', result);
    return { success: true };
  } catch (err) {
    console.log('[WatchSync] Error:', err && err.message ? err.message : err);
    return { error: err && err.message ? err.message : String(err) };
  }
}

export async function clearAuthOnWatch() {
  if (Platform.OS !== 'ios') return;
  if (!RCTWatchConnectivity) return;
  try {
    await RCTWatchConnectivity.updateApplicationContext({
      userId: '',
      token: '',
      serverUrl: SERVER_URL,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.log('[WatchSync] clearAuth error:', err && err.message ? err.message : err);
  }
}
