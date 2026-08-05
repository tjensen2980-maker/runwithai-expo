import * as WebBrowser from 'expo-web-browser';
import { SERVER } from '../config';
import { getAuthToken } from '../data';

const APP_REDIRECT = 'app.runwithai://strava-callback';

async function api(path, options = {}) {
  const token = getAuthToken();
  const response = await fetch(`${SERVER}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.code = data.error;
    throw error;
  }
  return data;
}

export async function getIntegrationStatus() {
  return api('/integrations/status');
}

export async function connectStrava() {
  const { url } = await api('/integrations/strava/connect-url');
  const result = await WebBrowser.openAuthSessionAsync(url, APP_REDIRECT);
  if (result.type !== 'success' || !result.url) return { connected: false, cancelled: true };
  const status = result.url.match(/[?&]status=([^&]+)/)?.[1];
  if (status !== 'connected') throw new Error('strava_connection_failed');
  return { connected: true };
}

export async function disconnectStrava() {
  return api('/integrations/strava', { method: 'DELETE' });
}

export async function syncExistingRuns() {
  return api('/integrations/strava/sync', { method: 'POST' });
}
