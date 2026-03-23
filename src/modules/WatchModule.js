/**
 * WatchModule.js
 * 
 * Wrapper modul til Apple Watch kommunikation via TurboModule.
 * Håndterer native bridge og event emission.
 */

import { Platform, NativeModules, NativeEventEmitter } from 'react-native';

// Hent native modul
const { RCTWatchConnectivity } = NativeModules;

// Event emitter til at lytte på native events
let eventEmitter = null;
if (Platform.OS === 'ios' && RCTWatchConnectivity) {
  eventEmitter = new NativeEventEmitter(RCTWatchConnectivity);
}

/**
 * WatchModule API
 */
const WatchModule = {
  /**
   * Tjek om Watch connectivity er understøttet
   */
  isSupported: Platform.OS === 'ios' && !!RCTWatchConnectivity,

  /**
   * Hent aktuel Watch status
   * @returns {Promise<Object>} Watch status objekt
   */
  getWatchStatus: async () => {
    if (!WatchModule.isSupported) {
      return {
        isPaired: false,
        isWatchAppInstalled: false,
        isReachable: false,
      };
    }

    try {
      const status = await RCTWatchConnectivity.getWatchStatus();
      return status;
    } catch (err) {
      console.warn('[WatchModule] getWatchStatus error:', err);
      return {
        isPaired: false,
        isWatchAppInstalled: false,
        isReachable: false,
      };
    }
  },

  /**
   * Send data til Apple Watch
   * @param {Object} update - Data at sende
   * @returns {Promise<Object>} Resultat
   */
  sendUpdateToWatch: async (update) => {
    if (!WatchModule.isSupported) {
      console.warn('[WatchModule] Watch connectivity not supported');
      return { status: 'unsupported' };
    }

    try {
      const result = await RCTWatchConnectivity.sendUpdateToWatch(update);
      return result;
    } catch (err) {
      console.error('[WatchModule] sendUpdateToWatch error:', err);
      throw err;
    }
  },

  /**
   * Tilføj listener for beskeder fra Watch
   * @param {Function} callback - Callback funktion
   * @returns {Object} Subscription objekt med remove() metode
   */
  addListener: (callback) => {
    if (!eventEmitter) {
      console.warn('[WatchModule] Event emitter not available');
      return { remove: () => {} };
    }

    const subscription = eventEmitter.addListener('WatchMessage', (event) => {
      callback(event);
    });

    return subscription;
  },

  /**
   * Tilføj listener for reachability ændringer
   * @param {Function} callback - Callback funktion med boolean parameter
   * @returns {Object} Subscription objekt
   */
  addReachabilityListener: (callback) => {
    if (!eventEmitter) {
      return { remove: () => {} };
    }

    const subscription = eventEmitter.addListener('WatchReachability', (event) => {
      callback(event.isReachable);
    });

    return subscription;
  },

  /**
   * Send application context til Watch
   * Application context er persistent og sendes når Watch app åbnes
   * @param {Object} context - Context data
   */
  updateApplicationContext: async (context) => {
    if (!WatchModule.isSupported) {
      return { status: 'unsupported' };
    }

    try {
      const result = await RCTWatchConnectivity.updateApplicationContext(context);
      return result;
    } catch (err) {
      console.error('[WatchModule] updateApplicationContext error:', err);
      throw err;
    }
  },

  /**
   * Send fil til Watch
   * @param {string} filePath - Sti til fil
   * @param {Object} metadata - Metadata om filen
   */
  transferFile: async (filePath, metadata = {}) => {
    if (!WatchModule.isSupported) {
      return { status: 'unsupported' };
    }

    try {
      const result = await RCTWatchConnectivity.transferFile(filePath, metadata);
      return result;
    } catch (err) {
      console.error('[WatchModule] transferFile error:', err);
      throw err;
    }
  },
};

export default WatchModule;
