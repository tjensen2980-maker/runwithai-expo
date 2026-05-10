// src/components/OnboardingCarousel.js
// 3-tier swipeable carousel: Free / Basic / Pro
// Used after onboarding for new users AND as upgrade modal for existing free users

import React, { useState, useEffect, useRef } from 
'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Dimensions, Platform, Alert, ActivityIndicator, Linking, Modal
} from 
'react-native';
import { SafeAreaView } from 
'react-native-safe-area-context';
import { SERVER, getAuthToken } from 
'../data';

// RevenueCat conditional import
let Purchases = null;
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try { Purchases = require(
'react-native-purchases'
).default; } catch (e) {}
}

const REVENUECAT_IOS_KEY = 'appl_RSTGHBSwwJLczMzoqgBiNYDFDIb';
const TERMS_URL = 'https://www.runwithai.app/terms';
const PRIVACY_URL = 'https://www.runwithai.app/privacy';

const { width: SCREEN_W } = Dimensions.get('window');

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: '0 kr',
    period: 'gratis for altid',
    trial: null,
    color: '#9CA3AF',
    accent: '#6B7280',
    features: [
      { icon: '✓', text: '3 aktiviteter pr. uge' },
      { icon: '✓', text: 'Løb, gang og cykling' },
      { icon: '✓', text: 'Basis statistik' },
      { icon: '✗', text: 'Ingen AI Coach' },
      { icon: '✗', text: 'Ingen madtracker' },
      { icon: '✗', text: 'Ingen madplan' },
    ],
    cta: 'Fortsæt gratis',
    pkgId: null,
    swipeHint: 'Swipe → for Basic 59 kr/md med AI Coach',
  },
  {
    id: 'basic',
    name: 'Basic',
    price: '59 kr',
    period: 'pr. måned',
    trial: '14 dages gratis prøve',
    color: '#3B82F6',
    accent: '#2563EB',
    badge: 'POPULÆR',
    features: [
      { icon: '✓', text: 'Ubegrænsede aktiviteter' },
      { icon: '✓', text: 'AI Coach' },
      { icon: '✓', text: 'Avanceret statistik' },
      { icon: '✓', text: 'AI ruter' },
      { icon: '✓', text: 'Kalender og planlægning' },
      { icon: '✗', text: 'Ingen madtracker' },
    ],
    cta: 'Start 14 dages prøve',
    pkgId: 'basic_monthly',
    swipeHint: 'Swipe → for Pro 99 kr/md med madplan',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '99 kr',
    period: 'pr. måned',
    trial: '14 dages gratis prøve',
    color: '#EF4444',
    accent: '#DC2626',
    badge: 'BEDSTE VÆRDI',
    features: [
      { icon: '✓', text: 'Alt i Basic' },
      { icon: '✓', text: 'Madtracker med AI' },
      { icon: '✓', text: 'Personlig madplan' },
      { icon: '✓', text: 'Ernærings-dashboard' },
      { icon: '✓', text: 'Stregkode-scanner' },
      { icon: '✓', text: 'Madbillede-analyse' },
    ],
    cta: 'Start 14 dages prøve',
    pkgId: 'pro_monthly',
  },
];

export default function OnboardingCarousel({ visible, onComplete, onClose, isOnboarding }) {
  const [currentIndex, setCurrentIndex] = useState(0); // start on Basic
  const [loading, setLoading] = useState(false);
  const [offerings, setOfferings] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    const init = async () => {
      if (!Purchases) return;
      try {
        await Purchases.configure({ apiKey: REVENUECAT_IOS_KEY });
        const off = await Purchases.getOfferings();
        setOfferings(off.current);
      } catch (e) {
        console.log('RC init err:', e);
      }
    };
    init();
    // setTimeout(() => scrollRef.current?.scrollTo({ x: SCREEN_W, animated: false }), 100);  // disabled - start on Free
  }, [visible]);

  const handleSelect = async (tier) => {
    if (tier.id === 'free') {
      onComplete && onComplete('free');
      return;
    }

    if (!Purchases || !offerings) {
      Alert.alert('Fejl', 'Kunne ikke hente priser. Proev igen senere.');
      return;
    }

    const pkg = offerings.availablePackages.find(p =>
      p.identifier === tier.pkgId || p.product?.identifier?.includes(tier.id)
    ) || offerings.availablePackages[0];

    if (!pkg) {
      Alert.alert('Fejl', 'Pakke ikke tilgaengelig.');
      return;
    }

    setLoading(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isActive = customerInfo.entitlements.active[tier.id] ||
                       customerInfo.entitlements.active['pro'] ||
                       customerInfo.entitlements.active['basic'];

      if (isActive) {
        const token = getAuthToken();
        try {
          await fetch(SERVER + '/subscription/activate', {
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
        } catch (syncErr) {
          console.log('Server sync warn:', syncErr);
        }
        Alert.alert('🎉 Velkommen!', 'Du har nu ' + tier.name + '-adgang.');
        onComplete && onComplete(tier.id);
      }
    } catch (err) {
      if (!err.userCancelled) {
          Alert.alert('Koeb mislykkedes', err.message || 'Proev igen.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setCurrentIndex(idx);
  };

  const handleRestore = async () => {
    if (!Purchases) return;
    try {
      const info = await Purchases.restorePurchases();
      const tier = info.entitlements.active['pro'] ? 'pro' :
                   info.entitlements.active['basic'] ? 'basic' : null;
      if (tier) {
        Alert.alert('Gendannet', 'Du er ' + tier + '-bruger.');
        onComplete && onComplete(tier);
      } else {
        Alert.alert('Ingen koeb', 'Ingen aktive abonnementer fundet.');
      }
    } catch (e) {
      Alert.alert('Fejl', 'Kunne ikke gendanne.');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType='slide' presentationStyle='fullScreen'>
      <SafeAreaView style={styles.container}>
        {!isOnboarding && (
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        )}

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={styles.scroll}
        >
          {TIERS.map((tier) => (
            <View key={tier.id} style={[styles.page, { width: SCREEN_W }]}>
              <ScrollView contentContainerStyle={styles.pageContent}>
                {tier.badge && (
                  <View style={[styles.badge, { backgroundColor: tier.accent }]}>
                    <Text style={styles.badgeText}>{tier.badge}</Text>
                  </View>
                )}
                <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
                <Text style={styles.price}>{tier.price}</Text>
                <Text style={styles.period}>{tier.period}</Text>
                {tier.trial && (
                  <Text style={[styles.trial, { color: tier.accent }]}>{tier.trial}</Text>
                )}

                <View style={styles.featuresBox}>
                  {tier.features.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Text style={[styles.featureIcon, { color: f.icon === '✓' ? '#10B981' : '#9CA3AF' }]}>{f.icon}</Text>
                      <Text style={styles.featureText}>{f.text}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.ctaBtn, { backgroundColor: tier.accent }]}
                  onPress={() => handleSelect(tier)}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color='#fff' />
                  ) : (
                    <Text style={styles.ctaText}>{tier.cta}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn}>
                  <Text style={styles.restoreText}>Gendan køb</Text>
                </TouchableOpacity>

                {tier.swipeHint && (
                  <Text style={styles.swipeHint}>{tier.swipeHint}</Text>
                )}
                <View style={styles.legal}>
                  <Text style={styles.legalText}>
                    Abonnementer fornyes automatisk. Annuller i Apple ID-indstillinger.
                  </Text>
                  <View style={styles.legalLinks}>
                    <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
                      <Text style={styles.legalLink}>Vilkaar</Text>
                    </TouchableOpacity>
                    <Text style={styles.legalSep}>•</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
                      <Text style={styles.legalLink}>Privatliv</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dots}>
          {TIERS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, currentIndex === i && styles.dotActive]}
            />
          ))}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  swipeHint: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 12, fontStyle: 'italic' },
  container: { flex: 1, backgroundColor: '#000' },
  closeBtn: {
    position: 'absolute', top: 50, right: 20, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  scroll: { flex: 1 },
  page: { flex: 1 },
  pageContent: { padding: 32, paddingTop: 80, alignItems: 'center', paddingBottom: 40 },
  badge: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
    marginBottom: 16,
  },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  tierName: { fontSize: 36, fontWeight: '900', marginBottom: 8 },
  price: { fontSize: 48, fontWeight: '900', color: '#fff', marginBottom: 4 },
  period: { fontSize: 16, color: '#9CA3AF', marginBottom: 8 },
  trial: { fontSize: 14, fontWeight: '600', marginBottom: 24 },
  featuresBox: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 20, marginBottom: 32,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  featureIcon: { fontSize: 18, fontWeight: '900', width: 28 },
  featureText: { color: '#fff', fontSize: 15, flex: 1 },
  ctaBtn: {
    width: '100%', paddingVertical: 18, borderRadius: 14,
    alignItems: 'center', marginBottom: 12,
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  restoreBtn: { padding: 12, marginBottom: 20 },
  restoreText: { color: '#9CA3AF', fontSize: 14, textDecorationLine: 'underline' },
  legal: { alignItems: 'center', paddingHorizontal: 16 },
  legalText: { color: '#6B7280', fontSize: 11, textAlign: 'center', marginBottom: 8, lineHeight: 16 },
  legalLinks: { flexDirection: 'row', alignItems: 'center' },
  legalLink: { color: '#9CA3AF', fontSize: 12, textDecorationLine: 'underline' },
  legalSep: { color: '#6B7280', marginHorizontal: 8 },
  dots: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 16,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4,
  },
  dotActive: { backgroundColor: '#fff', width: 24 },
});
