// src/components/OnboardingCarousel.js
// 3-tier swipeable carousel: Free / Basic / Pro
// Used after onboarding for new users AND as upgrade modal for existing free users

import React, { useState, useEffect, useRef } from 
'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Dimensions, Alert, ActivityIndicator, Linking, Modal
} from 
'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { SERVER, getAuthToken } from 
'../data';
import { configureRevenueCat } from '../services/RevenueCat';

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://www.runwithai.app/privatliv.html';

const { width: SCREEN_W } = Dimensions.get('window');

// EN plan: Pro med 14 dages gratis proeveperiode.
// Prisen vises som tekst her; App Store-arket viser altid den autoritative pris.
const OFFER = {
  id: 'pro',
  pkgId: '$rc_monthly', // RevenueCat-pakkens identifier i default-offeringen (verificeret i dashboardet)
};

function recordPaywallEvent(purchases, event, details = {}) {
  if (!purchases?.setAttributes) return;

  const timestamp = new Date().toISOString();
  const attributes = {
    paywall_last_event: event,
    paywall_last_event_at: timestamp,
    [`paywall_${event}_at`]: timestamp,
  };

  if (details.price) attributes.paywall_price = String(details.price).slice(0, 50);
  if (details.goal) attributes.paywall_goal = String(details.goal).slice(0, 100);
  if (details.errorCode) attributes.paywall_error_code = String(details.errorCode).slice(0, 80);

  purchases.setAttributes(attributes).catch(error => {
    console.log('Paywall analytics warning:', error?.message || error);
  });
}

export default function OnboardingCarousel({ visible, onComplete, onClose, isOnboarding, goalLabel = '' }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0); // start on Basic
  const [loading, setLoading] = useState(false);
  const [offerings, setOfferings] = useState(null);
  const [monthlyPackage, setMonthlyPackage] = useState(null);
  const [priceString, setPriceString] = useState('');
  const [priceLoading, setPriceLoading] = useState(true);
  const purchasesRef = useRef(null);
  const scrollRef = useRef(null);
  const benefits = [
    { emoji: '🧠', text: t('onboarding.paywall.benefits.adaptive') },
    { emoji: '🎧', text: t('onboarding.paywall.benefits.audioCoach') },
    { emoji: '📅', text: t('onboarding.paywall.benefits.calendar') },
    { emoji: '💬', text: t('onboarding.paywall.benefits.chat') },
  ];

  useEffect(() => {
    if (!visible) return;
    const init = async () => {
      setPriceLoading(true);
      try {
        const purchases = await configureRevenueCat(getAuthToken());
        if (!purchases) return;

        purchasesRef.current = purchases;
        const off = await purchases.getOfferings();
        setOfferings(off.current);
        const pkg = off.current?.availablePackages?.find(
          candidate => candidate.identifier === OFFER.pkgId
            || candidate.product?.identifier === 'app.runwithai.pro.monthly'
        );
        setMonthlyPackage(pkg || null);
        setPriceString(pkg?.product?.priceString || '');
        recordPaywallEvent(purchases, 'viewed', {
          price: pkg?.product?.priceString || '',
          goal: goalLabel,
        });
      } catch (e) {
        console.log('RC init err:', e);
      } finally {
        setPriceLoading(false);
      }
    };
    init();
    // setTimeout(() => scrollRef.current?.scrollTo({ x: SCREEN_W, animated: false }), 100);  // disabled - start on Free
  }, [visible]);

  const handleSelect = async (tier) => {
    if (tier.id === 'free') {
      recordPaywallEvent(purchasesRef.current, 'free_selected');
      onComplete && onComplete('free');
      return;
    }

    const purchases = purchasesRef.current;
    if (!purchases || !offerings) {
      Alert.alert(t('common.error'), t('onboarding.paywall.errors.prices'));
      return;
    }

    const pkg = monthlyPackage;
    if (!pkg) {
      Alert.alert(t('common.error'), t('onboarding.paywall.errors.packageUnavailable'));
      return;
    }

    setLoading(true);
    recordPaywallEvent(purchases, 'trial_tapped', { price: priceString, goal: goalLabel });
    try {
      const { customerInfo } = await purchases.purchasePackage(pkg);
      const isActive = customerInfo.entitlements.active[tier.id] ||
                       customerInfo.entitlements.active['pro'] ||
                       customerInfo.entitlements.active['basic'];

      if (!isActive) {
        throw new Error('RevenueCat did not return an active entitlement.');
      }

      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication is required to activate the subscription.');
      }

      const response = await fetch(SERVER + '/subscription/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          revenueCatId: customerInfo.originalAppUserId,
          tier: tier.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Subscription sync failed (${response.status}).`);
      }

      recordPaywallEvent(purchases, 'trial_started', { price: priceString, goal: goalLabel });
      Alert.alert(t('onboarding.paywall.welcomeTitle'), t('onboarding.paywall.welcomeMessage'));
      onComplete && onComplete(tier.id);
    } catch (err) {
      if (err.userCancelled) {
        recordPaywallEvent(purchases, 'purchase_cancelled');
      } else {
        recordPaywallEvent(purchases, 'purchase_failed', {
          errorCode: err?.code || 'unknown',
        });
        Alert.alert(t('onboarding.paywall.errors.purchaseTitle'), err.message || t('common.retry'));
      }
    } finally {
      setLoading(false);
    }
  };


  const handleRestore = async () => {
    const purchases = purchasesRef.current;
    if (!purchases || loading) {
      Alert.alert(t('common.error'), t('onboarding.paywall.errors.prices'));
      return;
    }

    setLoading(true);
    try {
      const info = await purchases.restorePurchases();
      const tier = info.entitlements.active['pro'] ? 'pro' :
                   info.entitlements.active['basic'] ? 'basic' : null;
      if (tier) {
        const token = getAuthToken();
        if (!token) {
          throw new Error('Authentication is required to restore the subscription.');
        }

        const response = await fetch(SERVER + '/subscription/activate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({
            revenueCatId: info.originalAppUserId,
            tier,
          }),
        });

        if (!response.ok) {
          throw new Error(`Subscription sync failed (${response.status}).`);
        }

        Alert.alert(t('onboarding.paywall.restoreSuccessTitle'), t('onboarding.paywall.restoreSuccessMessage'));
        onComplete && onComplete(tier);
      } else {
        Alert.alert(t('onboarding.paywall.noPurchasesTitle'), t('onboarding.paywall.noPurchasesMessage'));
      }
    } catch (e) {
      console.log('Restore purchase error:', e);
      Alert.alert(t('common.error'), t('onboarding.paywall.errors.restore'));
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={!!visible} animationType="slide" transparent={false}>
      <View style={s.wrap}>
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            {
              paddingTop: Math.max(insets.top, 48) + 12,
              paddingBottom: Math.max(insets.bottom, 16) + 32,
            },
          ]}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.badge}>
            <Text style={s.badgeText} maxFontSizeMultiplier={1.1}>
              {t('proUpsell.features.aiCoach.title')}
            </Text>
          </View>
          <Text style={s.headline} maxFontSizeMultiplier={1.15}>
            {t('onboarding.paywall.headline')}
          </Text>
          <Text style={s.sub} maxFontSizeMultiplier={1.2}>
            {t('onboarding.paywall.subtitle')}
          </Text>

          {!!goalLabel && (
            <View style={s.goalBox}>
              <Text style={s.goalText} maxFontSizeMultiplier={1.15}>
                {t('onboarding.plan.goal', { goal: goalLabel })}
              </Text>
            </View>
          )}

          <View style={s.benefits}>
            {benefits.map((b, i) => (
              <View key={i} style={s.benefitRow}>
                <Text style={s.benefitEmoji} maxFontSizeMultiplier={1.1}>{b.emoji}</Text>
                <Text style={s.benefitText} maxFontSizeMultiplier={1.2}>{b.text}</Text>
              </View>
            ))}
          </View>

          <View style={s.giftBox}>
            <Text style={s.giftBig} maxFontSizeMultiplier={1.15}>
              {t('onboarding.paywall.trial')}
            </Text>
            {priceLoading ? (
              <ActivityIndicator color="#ff7a50" style={{ marginTop: 8 }} />
            ) : (
              <Text style={s.giftSmall} maxFontSizeMultiplier={1.15}>
                {priceString
                  ? t('onboarding.paywall.afterTrial', { price: priceString })
                  : t('onboarding.paywall.errors.prices')}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[s.cta, loading && s.disabled]}
            onPress={() => handleSelect(OFFER)}
            activeOpacity={0.85}
            disabled={loading || priceLoading || !monthlyPackage}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text
                style={s.ctaText}
                maxFontSizeMultiplier={1.1}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {t('proUpsell.startTrial')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.freeLink} onPress={() => handleSelect({ id: 'free' })} disabled={loading}>
            <Text style={s.freeLinkText} maxFontSizeMultiplier={1.15}>
              {t('proUpsell.continueWithFree')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.restore} onPress={handleRestore} disabled={loading || priceLoading}>
            <Text style={s.restoreText} maxFontSizeMultiplier={1.15}>
              {t('onboarding.paywall.restore')}
            </Text>
          </TouchableOpacity>

          <Text style={s.renewalText} maxFontSizeMultiplier={1.15}>{t('pricing.terms')}</Text>
          <View style={s.legalLinks}>
            <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
              <Text style={s.legalLink}>{t('settings.termsOfService')}</Text>
            </TouchableOpacity>
            <Text style={s.legalSeparator}>•</Text>
            <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
              <Text style={s.legalLink}>{t('settings.privacyPolicy')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#101114' },
  scroll: { paddingHorizontal: 24, alignItems: 'stretch' },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,87,34,0.18)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  badgeText: { color: '#ff7a50', fontWeight: '800', fontSize: 12, letterSpacing: 2 },
  headline: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 14 },
  sub: { color: 'rgba(255,255,255,0.65)', fontSize: 16, lineHeight: 23, marginTop: 8 },
  goalBox: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 18 },
  goalText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  benefits: { marginTop: 26 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  benefitEmoji: { fontSize: 20, width: 32 },
  benefitText: { color: '#fff', fontSize: 15.5, flex: 1, lineHeight: 21 },
  giftBox: { backgroundColor: 'rgba(255,87,34,0.12)', borderColor: 'rgba(255,87,34,0.45)', borderWidth: 1, borderRadius: 16, padding: 18, marginTop: 22, alignItems: 'center' },
  giftBig: { color: '#ff7a50', fontSize: 24, fontWeight: '900' },
  giftSmall: { color: 'rgba(255,255,255,0.75)', fontSize: 13.5, marginTop: 6, textAlign: 'center' },
  cta: { backgroundColor: '#ff5722', borderRadius: 16, minHeight: 60, paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  disabled: { opacity: 0.55 },
  ctaText: { color: '#fff', fontSize: 16, lineHeight: 21, fontWeight: '900', textAlign: 'center', width: '100%' },
  freeLink: { alignItems: 'center', marginTop: 18 },
  freeLinkText: { color: 'rgba(255,255,255,0.55)', fontSize: 14.5, textDecorationLine: 'underline' },
  restore: { alignItems: 'center', marginTop: 14 },
  restoreText: { color: 'rgba(255,255,255,0.35)', fontSize: 13 },
  renewalText: { color: 'rgba(255,255,255,0.42)', fontSize: 11.5, lineHeight: 17, textAlign: 'center', marginTop: 22 },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  legalLink: { color: 'rgba(255,255,255,0.65)', fontSize: 12, textDecorationLine: 'underline' },
  legalSeparator: { color: 'rgba(255,255,255,0.35)', marginHorizontal: 9 },
});
