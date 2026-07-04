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

// EN plan: Pro med 14 dages gratis proeveperiode.
// Prisen vises som tekst her; App Store-arket viser altid den autoritative pris.
const OFFER = {
  id: 'pro',
  pkgId: '$rc_monthly', // RevenueCat-pakkens identifier i default-offeringen (verificeret i dashboardet)
};
const PRICE_TEXT = '49 kr';
const BENEFITS = [
  { emoji: '🧠', text: 'Din plan tilpasser sig efter hvert løb' },
  { emoji: '🎧', text: 'Coachen i ørerne mens du træner' },
  { emoji: '📅', text: 'Ugeplan og kalender der følger med' },
  { emoji: '💬', text: 'Spørg din coach om alt — når som helst' },
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
    <Modal visible={!!visible} animationType="slide" transparent={false}>
      <SafeAreaView style={s.wrap}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.badge}><Text style={s.badgeText}>AI COACH</Text></View>
          <Text style={s.headline}>Din personlige AI-coach</Text>
          <Text style={s.sub}>En træningsplan der tilpasser sig dig — hver uge, hvert løb.</Text>

          <View style={s.benefits}>
            {BENEFITS.map((b, i) => (
              <View key={i} style={s.benefitRow}>
                <Text style={s.benefitEmoji}>{b.emoji}</Text>
                <Text style={s.benefitText}>{b.text}</Text>
              </View>
            ))}
          </View>

          <View style={s.giftBox}>
            <Text style={s.giftBig}>14 dage gratis</Text>
            <Text style={s.giftSmall}>Derefter {PRICE_TEXT}/md. Opsig når som helst — med ét tryk.</Text>
          </View>

          <TouchableOpacity style={s.cta} onPress={() => handleSelect(OFFER)} activeOpacity={0.85}>
            <Text style={s.ctaText}>Start min træning</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.freeLink} onPress={() => handleSelect({ id: 'free' })}>
            <Text style={s.freeLinkText}>Fortsæt med gratis version</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.restore} onPress={handleRestore}>
            <Text style={s.restoreText}>Gendan køb</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#101114' },
  scroll: { padding: 24, paddingBottom: 48, alignItems: 'stretch' },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,87,34,0.18)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, marginTop: 8 },
  badgeText: { color: '#ff7a50', fontWeight: '800', fontSize: 12, letterSpacing: 2 },
  headline: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 14 },
  sub: { color: 'rgba(255,255,255,0.65)', fontSize: 16, lineHeight: 23, marginTop: 8 },
  benefits: { marginTop: 26 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  benefitEmoji: { fontSize: 20, width: 32 },
  benefitText: { color: '#fff', fontSize: 15.5, flex: 1, lineHeight: 21 },
  giftBox: { backgroundColor: 'rgba(255,87,34,0.12)', borderColor: 'rgba(255,87,34,0.45)', borderWidth: 1, borderRadius: 16, padding: 18, marginTop: 22, alignItems: 'center' },
  giftBig: { color: '#ff7a50', fontSize: 24, fontWeight: '900' },
  giftSmall: { color: 'rgba(255,255,255,0.75)', fontSize: 13.5, marginTop: 6, textAlign: 'center' },
  cta: { backgroundColor: '#ff5722', borderRadius: 16, paddingVertical: 17, alignItems: 'center', marginTop: 22 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  freeLink: { alignItems: 'center', marginTop: 18 },
  freeLinkText: { color: 'rgba(255,255,255,0.55)', fontSize: 14.5, textDecorationLine: 'underline' },
  restore: { alignItems: 'center', marginTop: 14 },
  restoreText: { color: 'rgba(255,255,255,0.35)', fontSize: 13 },
});
