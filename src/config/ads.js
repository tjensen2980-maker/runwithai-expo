// Production AdMob configuration. AdMob can take up to an hour to activate a
// newly-created ad unit, and app review/app-ads.txt verification can take longer.
export const ADS_CONFIG = {
  enabled: true,
  testMode: false,
  iosBannerUnitId: 'ca-app-pub-5451352100325177/9954003879',
  androidBannerUnitId: 'ca-app-pub-5451352100325177/2872118028',
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
