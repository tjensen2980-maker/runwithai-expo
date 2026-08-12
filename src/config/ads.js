// Google test ads are enabled while this feature is being verified in a build.
// Replace the production unit IDs and set testMode to false before release.
export const ADS_CONFIG = {
  enabled: true,
  testMode: true,
  iosBannerUnitId: '',
  androidBannerUnitId: '',
};

export function hasUsableBannerConfig(platform) {
  if (!ADS_CONFIG.enabled) return false;
  if (ADS_CONFIG.testMode) return true;
  return Boolean(platform === 'ios'
    ? ADS_CONFIG.iosBannerUnitId
    : ADS_CONFIG.androidBannerUnitId);
}

export function shouldShowAdPrivacyOptions() {
  return ADS_CONFIG.enabled && !ADS_CONFIG.testMode;
}
