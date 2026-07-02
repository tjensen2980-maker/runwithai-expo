// BackgroundLocation.js
// JS-wrapper for det native BackgroundLocationModule (iOS).
// Bruger CLBackgroundActivitySession under motorhjelmen saa GPS-tracking
// fortsaetter selv naar skaermen er slukket og JS-traaden er suspenderet.
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const Native = NativeModules.BackgroundLocationModule;
const emitter = (Platform.OS === 'ios' && Native) ? new NativeEventEmitter(Native) : null;

export function isAvailable() {
  return Platform.OS === 'ios' && !!Native;
}

export async function startBackgroundLocation() {
  if (!isAvailable()) return false;
  try {
    return await Native.start();
  } catch (e) {
    console.log('BackgroundLocation.start error', e);
    return false;
  }
}

export async function stopBackgroundLocation() {
  if (!isAvailable()) return false;
  try {
    return await Native.stop();
  } catch (e) {
    console.log('BackgroundLocation.stop error', e);
    return false;
  }
}

export function addLocationListener(cb) {
  if (!emitter) return { remove() {} };
  return emitter.addListener('onLocation', cb);
}

export function addErrorListener(cb) {
  if (!emitter) return { remove() {} };
  return emitter.addListener('onError', cb);
}

export async function getBufferedLocations() {
  if (!isAvailable()) return [];
  try {
    return await Native.getBufferedLocations();
  } catch (e) {
    console.log("getBufferedLocations error", e);
    return [];
  }
}

export async function getBufferSize() {
  if (!isAvailable()) return 0;
  try {
    return await Native.getBufferSize();
  } catch (e) {
    console.log("getBufferSize error", e);
    return 0;
  }
}
export async function getStats() {
  if (!isAvailable()) return 0;
  try {
    return await Native.getStats();
  } catch (e) {
    console.log("getStats error", e);
    return 0;
  }
}

export default {
  isAvailable,
  startBackgroundLocation,
  stopBackgroundLocation,
  addLocationListener,
  addErrorListener,
  getBufferedLocations,
  getBufferSize,
};
