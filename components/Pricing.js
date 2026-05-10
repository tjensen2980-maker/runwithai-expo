// ═══════════════════════════════════════════════════════════════════════════
// PRICING.JS - RunWithAI Pro Subscription Component (RevenueCat + i18n)
// Sort/rød/hvid tema + Terms & Privacy links for App Store compliance
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { SERVER } from '../src/config';
const API_URL = SERVER;

// Legal URLs
const PRIVACY_POLICY_URL = 'https://www.runwithai.app/privacy';
const TERMS_OF_USE_URL = 'https://www.runwithai.app/terms';

// RevenueCat API Keys
const REVENUECAT_IOS_KEY = 'appl_RSTGHBSwwJLczMzoqgBiNYDFDIb';
const REVENUECAT_ANDROID_KEY = 'goog_YOUR_REVENUECAT_ANDROID_KEY';

// ─── SAFE REVENUECAT IMPORT ─────────────────────────────────────────────────
let Purchases = null;
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    Purchases = require('react-native-purchases').default;
  } catch (e) {
    console.log('RevenueCat not available:', e.message);
  }
}

// ─── INITIALIZE REVENUECAT ──────────────────────────────────────────────────
let isRevenueCatConfigured = false;

async function initRevenueCat(userId) {
  if (Platform.OS === 'web' || isRevenueCatConfigured || !Purchases) {
    return false;
  }
  
  try {
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
    
    if (apiKey.includes('YOUR_REVENUECAT')) {
      console.log('RevenueCat not configured - using placeholder keys');
      return false;
    }
    
    await Purchases.configure({ apiKey });
    
    if (userId) {
      try {
        await Purchases.logIn(String(userId));
      } catch (loginErr) {
        console.log('RevenueCat login warning:', loginErr.message);
      }
    }
    
    isRevenueCatConfigured = true;
    return true;
  } catch (err) {
    console.error('RevenueCat init error:', err);
    return false;
  }
}

// ─── USE SUBSCRIPTION HOOK ──────────────────────────────────────────────────
export function useSubscription(token) {
  const [subscription, setSubscription] = useState(null);
  const [tierInfo, setTierInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!token) {
      setSubscription(null);
      setTierInfo(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch tier info from new endpoint
      const tierRes = await fetch(API_URL + '/users/me/tier', {
        headers: { Authorization: 'Bearer ' + token },
      });
      const tierData = await tierRes.json();
      setTierInfo(tierData);
      setSubscription({ tier: tierData.tier, status: tierData.status, isPro: tierData.isPro, isBasic: tierData.isBasic, isFree: tierData.isFree });
    } catch (err) {
      console.error('Error fetching tier:', err);
      setSubscription(null);
      setTierInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [token]);

  // Tier flags
  const tier = tierInfo?.tier || 'free';
  const isPro = tierInfo?.isPro || false;
  const isBasic = tierInfo?.isBasic || false;
  const isFree = tierInfo?.isFree !== false; // default to free if unknown

  // Feature flags
  const canUseMealTracking = tierInfo?.canUseMealTracking || false;
  const canUseMealPlan = tierInfo?.canUseMealPlan || false;
  const canUseAICoach = tierInfo?.canUseAICoach || false;
  const canUseAllActivities = tierInfo?.canUseAllActivities || false;
  const weeklyActivityLimit = tierInfo?.weeklyActivityLimit || null;

  // Backwards compat
  const canTrackRun = true;

  return {
    subscription,
    tier,
    isPro,
    isBasic,
    isFree,
    canTrackRun,
    canUseMealTracking,
    canUseMealPlan,
    canUseAICoach,
    canUseAllActivities,
    weeklyActivityLimit,
    loading,
    refresh,
  };
}

// ─── PAYWALL COMPONENT ──────────────────────────────────────────────────────
export function Paywall({ visible, onClose, token }) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <PricingPage token={token} onClose={onClose} />
    </Modal>
  );
}

// ─── PRICING PAGE COMPONENT ─────────────────────────────────────────────────
export default function PricingPage({ token, onClose, currentTier = 'free' }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [offerings, setOfferings] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // Initialize RevenueCat and fetch offerings
  useEffect(() => {
    const init = async () => {
      try {
        if (Platform.OS === 'web') {
          setIsConfigured(false);
          return;
        }

        if (!Purchases) {
          console.log('Purchases module not available');
          setIsConfigured(false);
          return;
        }

        if (REVENUECAT_IOS_KEY.includes('YOUR_REVENUECAT') && Platform.OS === 'ios') {
          setIsConfigured(false);
          return;
        }
        if (REVENUECAT_ANDROID_KEY.includes('YOUR_REVENUECAT') && Platform.OS === 'android') {
          setIsConfigured(false);
          return;
        }

        const configured = await initRevenueCat(token);
        
        if (!configured) {
          setIsConfigured(false);
          return;
        }
        
        setIsConfigured(true);
        
        try {
          const offs = await Purchases.getOfferings();
          if (offs.current) {
            setOfferings(offs.current);
          }
        } catch (err) {
          console.error('Error fetching offerings:', err);
        }
      } catch (err) {
        console.error('PricingPage init error:', err);
      }
    };

    init();
  }, [token]);

  const handleSubscribe = async () => {
    if (!isConfigured || !Purchases) {
      if (Platform.OS === 'web') {
        Alert.alert(
          'Køb via app',
          'In-app køb er kun tilgængelige i iOS og Android appen.',
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

    if (!token) {
      Alert.alert('Log ind påkrævet', 'Du skal være logget ind for at købe.');
      return;
    }

    if (!offerings || !offerings.availablePackages || !offerings.availablePackages.length) {
      Alert.alert(t('pricing.error') || 'Fejl', 'Kunne ikke hente priser. Prøv igen senere.');
      return;
    }

    setLoading(true);

    try {
      const pkg = offerings.availablePackages[0];
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      
      if (customerInfo.entitlements.active['pro']) {
        try {
          await fetch(`${API_URL}/subscription/activate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              revenueCatId: customerInfo.originalAppUserId,
            }),
          });
        } catch (syncErr) {
          console.log('Server sync warning:', syncErr);
        }
        
        Alert.alert('🎉 ' + (t('pricing.success') || 'Du er nu Pro!'), 'Du har nu adgang til alle funktioner.');
        onClose();
      }
    } catch (err) {
      if (!err.userCancelled) {
        console.error('Purchase error:', err);
        Alert.alert(t('pricing.error') || 'Fejl', t('pricing.tryAgain') || 'Der opstod en fejl. Prøv igen.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (!isConfigured || !Purchases) {
      Alert.alert(
        t('pricing.restore') || 'Gendan køb',
        Platform.OS === 'web' 
          ? 'Gendan køb er kun tilgængeligt i iOS og Android appen.'
          : 'Kommer snart.',
        [{ text: 'OK' }]
      );
      return;
    }

    setRestoring(true);

    try {
      const customerInfo = await Purchases.restorePurchases();
      
      if (customerInfo.entitlements.active['pro']) {
        try {
          await fetch(`${API_URL}/subscription/activate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              revenueCatId: customerInfo.originalAppUserId,
            }),
          });
        } catch (syncErr) {
          console.log('Server sync warning:', syncErr);
        }
        
        Alert.alert('✅ Køb gendannet!', 'Din Pro subscription er aktiveret.');
        onClose();
      } else {
        Alert.alert('Ingen køb fundet', 'Vi kunne ikke finde et aktivt abonnement.');
      }
    } catch (err) {
      console.error('Restore error:', err);
      Alert.alert(t('pricing.error') || 'Fejl', 'Kunne ikke gendanne køb. Prøv igen.');
    } finally {
      setRestoring(false);
    }
  };

  // Get price from offerings or use fallback
  const productPrice = offerings?.availablePackages?.[0]?.product?.priceString || '99 kr';

  // Build features array from the nested object structure in da.json
  const featuresObj = t('pricing.features', { returnObjects: true });
  let proFeatures = [];
  
  if (featuresObj && typeof featuresObj === 'object' && !Array.isArray(featuresObj)) {
    proFeatures = Object.values(featuresObj);
  } else if (Array.isArray(featuresObj)) {
    proFeatures = featuresObj;
  } else {
    proFeatures = [
      'Personlig AI-coach',
      'Ubegrænsede løb',
      'Avanceret statistik',
      'Skræddersyede træningsplaner',
      'Stemme-coach under løb',
      'Eksportér data'
    ];
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('pricing.title') || 'RunWithAI Pro'}</Text>
        <Text style={styles.subtitle}>{t('pricing.subtitle') || 'Lås op for alle funktioner'}</Text>
      </View>

      {/* Price Card */}
      <View style={styles.priceCard}>
        <Text style={styles.price}>{productPrice}</Text>
        <Text style={styles.period}>{t('pricing.perMonth') || '/måned'}</Text>
        <Text style={styles.trial}>7 dages gratis prøveperiode</Text>
      </View>

      {/* Subscription Info - Required by Apple */}
      <View style={styles.subscriptionInfo}>
        <Text style={styles.subscriptionInfoTitle}>Abonnementsdetaljer</Text>
        <Text style={styles.subscriptionInfoText}>• RunWithAI Pro - Månedligt abonnement</Text>
        <Text style={styles.subscriptionInfoText}>• Varighed: 1 måned, fornyes automatisk</Text>
        <Text style={styles.subscriptionInfoText}>• Pris: {productPrice} pr. måned</Text>
        <Text style={styles.subscriptionInfoText}>• 7 dages gratis prøveperiode</Text>
      </View>

      {/* Features List */}
      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Inkluderet i Pro</Text>
        {proFeatures.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      {/* Subscribe Button */}
      <TouchableOpacity
        style={[styles.subscribeButton, loading && styles.buttonDisabled]}
        onPress={handleSubscribe}
        disabled={loading || restoring}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.subscribeButtonText}>
            {t('pricing.subscribe') || 'Start gratis prøveperiode'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Restore Purchases */}
      <TouchableOpacity
        style={styles.restoreButton}
        onPress={handleRestorePurchases}
        disabled={loading || restoring}
      >
        {restoring ? (
          <ActivityIndicator color="#888888" />
        ) : (
          <Text style={styles.restoreButtonText}>{t('pricing.restore') || 'Gendan køb'}</Text>
        )}
      </TouchableOpacity>

      {/* Terms & Privacy - Required by Apple */}
      <View style={styles.legalContainer}>
        <Text style={styles.legalText}>
          Betaling opkræves via din Apple ID-konto ved bekræftelse af køb. 
          Abonnementet fornyes automatisk, medmindre det annulleres mindst 24 timer før den aktuelle periodes udløb. 
          Du kan administrere og annullere dit abonnement i dine Apple ID-kontoindstillinger.
        </Text>
        
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => Linking.openURL(TERMS_OF_USE_URL)}>
            <Text style={styles.legalLink}>Vilkår og betingelser</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
            <Text style={styles.legalLink}>Privatlivspolitik</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>{t('common.cancel') || 'Luk'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── STYLES - SORT/RØD/HVID TEMA ────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaaaaa',
    textAlign: 'center',
  },
  priceCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  period: {
    fontSize: 18,
    color: '#aaaaaa',
    marginTop: 4,
  },
  trial: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 12,
    fontWeight: '600',
  },
  subscriptionInfo: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  subscriptionInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 10,
  },
  subscriptionInfoText: {
    fontSize: 13,
    color: '#aaaaaa',
    marginBottom: 4,
    lineHeight: 20,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  checkmark: {
    fontSize: 18,
    color: '#FF3B30',
    marginRight: 12,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 16,
    color: '#ffffff',
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  restoreButton: {
    padding: 16,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#888888',
    fontSize: 14,
  },
  legalContainer: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  legalText: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalLink: {
    fontSize: 13,
    color: '#FF3B30',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 13,
    color: '#666666',
    marginHorizontal: 12,
  },
  closeButton: {
    marginTop: 24,
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FF3B30',
    fontSize: 16,
  },
});
