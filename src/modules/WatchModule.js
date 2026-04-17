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

// Initialiser event emitter (kun iOS)
if (Platform.OS === 'ios' && RCTWatchConnectivity) {
    try {
          eventEmitter = new NativeEventEmitter(RCTWatchConnectivity);
    } catch (e) {
          console.warn('[WatchModule] Could not create event emitter:', e);
    }
}

const WatchModule = {
    isSupported: Platform.OS === 'ios' && !!RCTWatchConnectivity,

    /**
         * Hent Watch status (paired, installed, reachable)
     */
    getWatchStatus: async () => {
          if (!WatchModule.isSupported) {
                  return { isPaired: false, isWatchAppInstalled: false, isReachable: false };
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
     */
    sendUpdateToWatch: async (update) => {
          if (!WatchModule.isSupported) {
                  console.warn('[WatchModule] Watch connectivity not supported');
                  return null;
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
         * Tilføj listener for workout complete fra Watch
     */
    addWorkoutCompleteListener: (callback) => {
          if (!eventEmitter) {
                  return { remove: () => {} };
          }

      const subscription = eventEmitter.addListener('WatchWorkoutComplete', (event) => {
              callback(event);
      });

      return subscription;
    },

    /**
         * Tilføj listener for live updates fra Watch
     */
    addLiveUpdateListener: (callback) => {
          if (!eventEmitter) {
                  return { remove: () => {} };
          }

      const subscription = eventEmitter.addListener('WatchLiveUpdate', (event) => {
              callback(event);
      });

      return subscription;
    },

    /**
         * Tilføj listener for reachability ændringer
     */
    addReachabilityListener: (callback) => {
          if (!eventEmitter) {
                  return { remove: () => {} };
          }

      const subscription = eventEmitter.addListener('WatchReachabilityChanged', (event) => {
              callback(event.isReachable);
      });

      return subscription;
    },

    /**
     * Send data til Watch via transferUserInfo (background, guaranteed delivery)
     * Bruges som fallback når Watch ikke er nåeligt
     */
    transferUserInfo: async (data) => {
        if (!WatchModule.isSupported) {
            console.warn('[WatchModule] Watch connectivity not supported');
            return null;
        }
        try {
            // Try native transferUserInfo if available, otherwise use sendUpdateToWatch
            if (RCTWatchConnectivity.transferUserInfo) {
                const result = await RCTWatchConnectivity.transferUserInfo(data);
                return result;
            } else {
                // Fallback: brug sendUpdateToWatch (kræver reachable)
                const result = await RCTWatchConnectivity.sendUpdateToWatch(data);
                return result;
            }
        } catch (err) {
            console.error('[WatchModule] transferUserInfo error:', err);
            throw err;
        }
    },

};

export default WatchModule;
