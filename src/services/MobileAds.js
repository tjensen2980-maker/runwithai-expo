import { Platform } from 'react-native';
import { ADS_CONFIG } from '../config/ads';

let startupPromise = null;

export function initializeMobileAds() {
  if (!ADS_CONFIG.enabled || Platform.OS === 'web') return Promise.resolve(false);
  if (startupPromise) return startupPromise;

  startupPromise = (async () => {
    try {
      const adsModule = require('react-native-google-mobile-ads');
      const mobileAds = adsModule.default;
      const { AdsConsent, MaxAdContentRating } = adsModule;

      // UMP checks whether a consent form is required for the user's region.
      // Google test ads do not use the publisher's account or production data,
      // so the test build skips UMP until the real AdMob app IDs are installed.
      if (!ADS_CONFIG.testMode) {
        try {
          await AdsConsent.gatherConsent();
        } catch (consentError) {
          console.log('Ad consent warning:', consentError?.message || consentError);
        }

        const consentInfo = await AdsConsent.getConsentInfo().catch(() => ({ canRequestAds: true }));
        if (consentInfo?.canRequestAds === false) return false;
      }

      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.PG,
        tagForChildDirectedTreatment: false,
        testDeviceIdentifiers: ADS_CONFIG.testMode ? ['EMULATOR'] : [],
      });
      await mobileAds().initialize();
      return true;
    } catch (error) {
      // Expo Go and old native builds do not contain the native ad module.
      // Hiding the slot keeps those builds usable until a fresh native build.
      console.log('Mobile ads unavailable:', error?.message || error);
      return false;
    }
  })();

  return startupPromise;
}

export async function showAdPrivacyOptions() {
  if (!ADS_CONFIG.enabled || Platform.OS === 'web') return false;
  try {
    const { AdsConsent } = require('react-native-google-mobile-ads');
    await AdsConsent.showPrivacyOptionsForm();
    return true;
  } catch (error) {
    console.log('Ad privacy options unavailable:', error?.message || error);
    return false;
  }
}
