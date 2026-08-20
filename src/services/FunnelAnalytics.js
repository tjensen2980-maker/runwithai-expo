import { Platform } from 'react-native';
import { SERVER, getAuthToken } from '../data';

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};

  return Object.entries(metadata).slice(0, 20).reduce((result, [key, value]) => {
    if (!/^[a-zA-Z0-9_]{1,50}$/.test(key)) return result;
    if (typeof value === 'string') result[key] = value.slice(0, 200);
    else if (typeof value === 'number' && Number.isFinite(value)) result[key] = value;
    else if (typeof value === 'boolean') result[key] = value;
    return result;
  }, {});
}

export async function trackFunnelEvent(event, metadata = {}) {
  const token = getAuthToken();
  if (!token || !event) return false;

  try {
    const response = await fetch(`${SERVER}/analytics/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        event,
        metadata: sanitizeMetadata({ platform: Platform.OS, ...metadata }),
      }),
    });
    return response.ok;
  } catch (error) {
    console.log('Funnel analytics warning:', error?.message || error);
    return false;
  }
}
