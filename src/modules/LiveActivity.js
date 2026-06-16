// src/modules/LiveActivity.js
// JavaScript wrapper omkring den native LiveActivityModule.
// Paa iOS 16.2+ starter/opdaterer/afslutter den en ActivityKit Live Activity
// der vises paa laaseskaerm og Dynamic Island.
// Paa Android og aeldre iOS er alle metoder no-ops, saa kalde-koden ikke behoever conditionals.

import { NativeModules, Platform } from 'react-native';

const { LiveActivityModule } = NativeModules;

const isAvailable = Platform.OS === 'ios' && !!LiveActivityModule;

let isActive = false;

/**
 * Returnerer true hvis Live Activities er supported og aktiverede
 * (iOS 16.2+ med tilladelse).
 */
export async function isSupported() {
  if (!isAvailable) return false;
  try {
    return await LiveActivityModule.isSupported();
  } catch (e) {
    console.log('LiveActivity.isSupported error:', e);
    return false;
  }
}

/**
 * Starter en ny Live Activity.
 * @param {Object} params
 * @param {string} params.activityType  'run' | 'walk' | 'bike'
 * @param {number} params.distanceMeters
 * @param {number} params.durationSeconds
 * @param {number} params.paceMinPerKm   minutter pr km (0 hvis ikke beregnet endnu)
 * @param {boolean} params.isPaused
 */
export async function start(params) {
  if (!isAvailable) return null;
  try {
    const supported = await LiveActivityModule.isSupported();
    if (!supported) {
      console.log('LiveActivity: not supported on this device');
      return null;
    }
    const id = await LiveActivityModule.start({
      activityType: params.activityType || 'run',
      distanceMeters: params.distanceMeters || 0,
      durationSeconds: params.durationSeconds || 0,
      paceMinPerKm: params.paceMinPerKm || 0,
      isPaused: params.isPaused || false,
    });
    isActive = true;
    console.log('LiveActivity started:', id);
    return id;
  } catch (e) {
    console.log('LiveActivity.start error:', e?.message || e);
    return null;
  }
}

/**
 * Opdaterer den nuvaerende Live Activity med nye stats.
 * Safe at kalde selv hvis ingen er aktiv (returnerer false).
 */
export async function update(params) {
  if (!isAvailable || !isActive) return false;
  try {
    return await LiveActivityModule.update({
      distanceMeters: params.distanceMeters || 0,
      durationSeconds: params.durationSeconds || 0,
      paceMinPerKm: params.paceMinPerKm || 0,
      isPaused: params.isPaused || false,
    });
  } catch (e) {
    console.log('LiveActivity.update error:', e?.message || e);
    return false;
  }
}

/**
 * Afslutter den nuvaerende Live Activity og fjerner den fra laaseskaermen.
 */
export async function end() {
  if (!isAvailable) return false;
  try {
    const result = await LiveActivityModule.end();
    isActive = false;
    console.log('LiveActivity ended');
    return result;
  } catch (e) {
    console.log('LiveActivity.end error:', e?.message || e);
    isActive = false;
    return false;
  }
}

export default {
  isSupported,
  start,
  update,
  end,
};
