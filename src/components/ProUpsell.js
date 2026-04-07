// src/components/ProUpsell.js
// Vis denne komponent til nye brugere efter onboarding
// OPDATERET: Bruger RevenueCat i stedet for Stripe

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, SERVER, getAuthToken } from '../data';
import Purchases from 'react-native-purchases';

// RevenueCat API Keys
const REVENUECAT_IOS_KEY = 'appl_RSTGHBSwwJLczMzoqgBiNYDFDIb';
const REVENUECAT_ANDROID_KEY = 'goog_YOUR_REVENUECAT_ANDROID_KEY'; // TODO: Tilføj Android key

const proFeatures = [
  { emoji: '🤖', title: 'AI Coach', desc: 'Personlig træningsplan der tilpasser sig dig' },
  { emoji: '📊', title: 'Avanceret statistik', desc: 'Dybdegående analyse af din træning' },
  { emoji: '🎯', title: 'Ubegrænsede mål', desc: 'Sæt så mange mål du vil' },
  { emoji: '🗺️', title: 'Rutebibliotek', desc: 'Gem og del dine yndlingsruter' },
  { emoji: '💬', title: 'AI Chat', desc: 'Stil spørgsmål om løb og få svar' },
  { emoji: '📈', title: 'Fremskridtsrapporter', desc: 'Ugentlige og månedlige opsummeringer' },
];

let isRevenueCatConfigured = false;

async function initRevenueCat() {
  if (isRevenueCatConfigured) return true;
  
  try {
    // Skip på web
    if (Platform.OS === 'web') {
      console.log('RevenueCat: Web platform - skipping');
      return false;
    }
    
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
    
    if (apiKey.includes('YOUR_REVENUECAT')) {
      console.log('RevenueCat: Not configured for this platform');
      return false;
    }
    
    await Purchases.configure({ apiKey });
    isRevenueCatConfigured = true;
    return true;
  } catch (err) {
    console.error('RevenueCat init error:', err);
    return false;
  }
}

export default function ProUpsell({ onSkip, onUpgrade }) {
  const [loading, setLoading] = useState(false);
  const [offerings, setOfferings] = useState(null);
  const [priceString, setPriceString] = useState('49 kr');
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const setup = async () => {
      const configured = await initRevenueCat();
      setIsConfigured(configured);
      
      if (configured) {
        try {
          const offerings = await Purchases.getOfferings();
          if (offerings.current) {
            setOfferings(offerings.current);
            // Hent pris fra første package
            const pkg = offerings.current.availablePackages?.[0];
            if (pkg?.product?.priceString) {
              setPriceString(pkg.product.priceString);
            }
          }
        } catch (err) {
          console.error('Error fetching offerings:', err);
        }
      }
    };
    
    setup();
  }, []);

  const handleUpgrade = async () => {
    // Hvis RevenueCat ikke er konfigureret (web eller manglende key)
    if (!isConfigured) {
      if (Platform.OS === 'web') {
        Alert.alert(
          'Køb via app',
          'In-app køb er kun tilgængelige i iOS og Android appen. Download appen for at opgradere til Pro.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Kommer snart',
          'In-app køb er under opsætning. Prøv igen senere.',
          [{ text: 'OK' }]
        );
      }
      return;
    }

    if (!offerings || !offerings.availablePackages?.length) {
      Alert.alert('Fejl', 'Kunne ikke hente priser. Prøv igen senere.');
      return;
    }

    setLoading(true);

    try {
      const pkg = offerings.availablePackages[0];
      const { customerInfo } = await Purchases.purchasePackage(pkg);

      // Tjek om købet gav Pro adgang
      if (customerInfo.entitlements.active['pro']) {
        // Opdater server med subscription status
        const token = getAuthToken();
        if (token) {
          try {
            await fetch(`${SERVER}/subscription/activate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                revenueCatId: customerInfo.originalAppUserId,
              }),
            });
          } catch (e) {
            console.log('Server sync warning:', e);
          }
        }

        Alert.alert(
          '🎉 Velkommen til Pro!',
          'Du har nu adgang til alle funktioner. God træning!',
          [{ text: 'Kom i gang', onPress: onUpgrade || onSkip }]
        );
      }
    } catch (err) {
      if (!err.userCancelled) {
        console.error('Purchase error:', err);
        Alert.alert('Køb fejlede', 'Der opstod en fejl. Prøv igen senere.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!isConfigured) {
      Alert.alert('Kommer snart', 'Gendan køb er under opsætning.');
      return;
    }

    setLoading(true);
    
    try {
      const customerInfo = await Purchases.restorePurchases();
      
      if (customerInfo.entitlements.active['pro']) {
        const token = getAuthToken();
        if (token) {
          try {
            await fetch(`${SERVER}/subscription/activate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                revenueCatId: customerInfo.originalAppUserId,
              }),
            });
          } catch (e) {
            console.log('Server sync warning:', e);
          }
        }

        Alert.alert(
          '✅ Køb gendannet!',
          'Din Pro subscription er aktiveret.',
          [{ text: 'Fortsæt', onPress: onUpgrade || onSkip }]
        );
      } else {
        Alert.alert('Ingen køb fundet', 'Vi kunne ikke finde et aktivt abonnement.');
      }
    } catch (err) {
      console.error('Restore error:', err);
      Alert.alert('Fejl', 'Kunne ikke gendanne køb. Prøv igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.badge}>⭐ PRO</Text>
          <Text style={s.title}>Lås op for fuld kraft</Text>
          <Text style={s.subtitle}>Få adgang til alle funktioner og nå dine mål hurtigere</Text>
        </View>

        <View style={s.featuresGrid}>
          {proFeatures.map((f, i) => (
            <View key={i} style={s.featureCard}>
              <Text style={s.featureEmoji}>{f.emoji}</Text>
              <Text style={s.featureTitle}>{f.title}</Text>
              <Text style={s.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>

        <View style={s.priceSection}>
          <Text style={s.price}>{priceString}</Text>
          <Text style={s.priceUnit}>/måned</Text>
        </View>

        <Text style={s.guarantee}>✓ Annuller når som helst • ✓ 7 dages gratis prøveperiode</Text>

        <TouchableOpacity 
          style={[s.upgradeBtn, loading && s.upgradeBtnDisabled]} 
          onPress={handleUpgrade}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.upgradeBtnText}>🚀 Start gratis prøveperiode</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.restoreBtn} onPress={handleRestore} disabled={loading}>
          <Text style={s.restoreBtnText}>Gendan tidligere køb</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.skipBtn} onPress={onSkip}>
          <Text style={s.skipBtnText}>Fortsæt med gratis version</Text>
        </TouchableOpacity>

        <Text style={s.terms}>
          Betaling opkræves via din App Store konto. Abonnement fornyes automatisk medmindre det annulleres mindst 24 timer før periodens udløb.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  badge: {
    backgroundColor: colors.accent,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.dim,
    textAlign: 'center',
    maxWidth: 300,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
    maxWidth: 500,
  },
  featureCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    width: '45%',
    minWidth: 140,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 12,
    color: colors.dim,
    textAlign: 'center',
    lineHeight: 17,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.accent,
  },
  priceUnit: {
    fontSize: 18,
    color: colors.dim,
    marginLeft: 4,
  },
  guarantee: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 20,
    textAlign: 'center',
  },
  upgradeBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginBottom: 12,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  upgradeBtnDisabled: {
    opacity: 0.6,
  },
  upgradeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  restoreBtn: {
    paddingVertical: 12,
    marginBottom: 8,
  },
  restoreBtnText: {
    color: colors.dim,
    fontSize: 14,
  },
  skipBtn: {
    paddingVertical: 12,
  },
  skipBtnText: {
    color: colors.muted,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  terms: {
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    lineHeight: 14,
  },
});
