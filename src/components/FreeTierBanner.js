import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { ADS_CONFIG, hasUsableBannerConfig } from '../config/ads';
import { initializeMobileAds } from '../services/MobileAds';

export default function FreeTierBanner({ isPro, subscriptionKnown, placement }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const ad = useMemo(() => {
    // Fail closed: never request an ad until the server has confirmed the tier.
    // This prevents a paid user from briefly seeing an ad during startup or an
    // account lookup failure.
    if (!subscriptionKnown || isPro || Platform.OS === 'web' || !hasUsableBannerConfig(Platform.OS)) return null;
    try {
      const module = require('react-native-google-mobile-ads');
      const unitId = ADS_CONFIG.testMode
        ? module.TestIds.ADAPTIVE_BANNER
        : Platform.OS === 'ios'
          ? ADS_CONFIG.iosBannerUnitId
          : ADS_CONFIG.androidBannerUnitId;
      return {
        BannerAd: module.BannerAd,
        size: module.BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
        unitId,
      };
    } catch (error) {
      return null;
    }
  }, [isPro, subscriptionKnown]);

  useEffect(() => {
    let active = true;
    if (!ad) return undefined;
    initializeMobileAds().then(initialized => {
      if (active) setReady(initialized);
    });
    return () => { active = false; };
  }, [ad]);

  if (!ad || !ready || failed) return null;

  const BannerAd = ad.BannerAd;
  return (
    <View style={styles.wrap} accessibilityLabel={`Advertisement ${placement || ''}`.trim()}>
      <BannerAd
        unitId={ad.unitId}
        size={ad.size}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={(error) => {
          console.log(`Banner ad failed (${placement || 'unknown'}):`, error?.message || error);
          setFailed(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 50,
    overflow: 'hidden',
  },
});
