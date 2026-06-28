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

export default {
  isAvailable,
  startBackgroundLocation,
  stopBackgroundLocation,
  addLocationListener,
  addErrorListener,
};
