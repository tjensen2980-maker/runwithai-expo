// ═══════════════════════════════════════════════════════════════════════════
// PRICING.JS - RunWithAI Pro Subscription Component (RevenueCat)
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
} from 'react-native';
import Purchases from 'react-native-purchases';

const API_URL = 'https://runwithai-server-production.up.railway.app';

// RevenueCat API Keys - du får disse fra RevenueCat dashboard
const REVENUECAT_IOS_KEY = 'appl_RSTGHBSwwJLczMzoqgBiNYDFDIb'; // Erstat med din rigtige nøgle
const REVENUECAT_ANDROID_KEY = 'goog_YOUR_REVENUECAT_ANDROID_KEY'; // Erstat med din rigtige nøgle

// ─── INITIALIZE REVENUECAT ──────────────────────────────────────────────────
let isRevenueCatConfigured = false;

async function initRevenueCat(userId) {
  if (isRevenueCatConfigured) return;
  
  try {
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
    
    // Check if keys are configured
    if (apiKey.includes('YOUR_REVENUECAT')) {
      console.log('RevenueCat not configured - using placeholder keys');
      return;
    }
    
    await Purchases.configure({ apiKey });
    
    if (userId) {
      await Purchases.logIn(userId);
    }
    
    isRevenueCatConfigured = true;
  } catch (err) {
    console.error('RevenueCat init error:', err);
  }
}

// ─── USE SUBSCRIPTION HOOK ──────────────────────────────────────────────────
export function useSubscription(token) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!token) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSubscription(data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [token]);

  const isPro = subscription?.tier === 'pro';
  const canTrackRun = true; // Allow all users to track runs for now

  return { subscription, isPro, canTrackRun, loading, refresh };
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
  const [loading, setLoading] = useState(false);
  const [offerings, setOfferings] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // Initialize RevenueCat and fetch offerings
  useEffect(() => {
    const init = async () => {
      await initRevenueCat(token);
      
      // Check if configured
      if (REVENUECAT_IOS_KEY.includes('YOUR_REVENUECAT') && Platform.OS === 'ios') {
        setIsConfigured(false);
        return;
      }
      if (REVENUECAT_ANDROID_KEY.includes('YOUR_REVENUECAT') && Platform.OS === 'android') {
        setIsConfigured(false);
        return;
      }
      
      setIsConfigured(true);
      
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current) {
          setOfferings(offerings.current);
        }
      } catch (err) {
        console.error('Error fetching offerings:', err);
      }
    };

    init();
  }, [token]);

  const handleSubscribe = async () => {
    if (!isConfigured) {
      Alert.alert(
        '🚀 Kommer snart!', 
        'Pro-abonnement vil snart være tilgængeligt. Vi arbejder på at færdiggøre betalingsintegration.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!token) {
      Alert.alert('Log ind', 'Du skal være logget ind for at købe abonnement');
      return;
    }

    if (!offerings || !offerings.availablePackages.length) {
      Alert.alert('Fejl', 'Kunne ikke hente produkter. Prøv igen.');
      return;
    }

    setLoading(true);

    try {
      const pkg = offerings.availablePackages[0];
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      
      if (customerInfo.entitlements.active['pro']) {
        // Update server
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
        
        Alert.alert('🎉 Velkommen til Pro!', 'Dit abonnement er nu aktivt.');
        onClose();
      }
    } catch (err) {
      if (!err.userCancelled) {
        console.error('Purchase error:', err);
        Alert.alert('Fejl', 'Køb fejlede. Prøv igen.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (!isConfigured) {
      Alert.alert('Gendan køb', 'Denne funktion kommer snart.', [{ text: 'OK' }]);
      return;
    }

    setRestoring(true);

    try {
      const customerInfo = await Purchases.restorePurchases();
      
      if (customerInfo.entitlements.active['pro']) {
        // Update server
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
        
        Alert.alert('✅ Gendannet!', 'Dit Pro abonnement er gendannet.');
        onClose();
      } else {
        Alert.alert('Info', 'Ingen aktive abonnementer fundet.');
      }
    } catch (err) {
      console.error('Restore error:', err);
      Alert.alert('Fejl', 'Kunne ikke gendanne køb. Prøv igen.');
    } finally {
      setRestoring(false);
    }
  };

  // Get price from offerings or use fallback
  const productPrice = offerings?.availablePackages?.[0]?.product?.priceString || '49 kr';

  // ─── PRO FEATURES ─────────────────────────────────────────────────────────
  const proFeatures = [
    '🎯 Personlige træningsplaner',
    '🤖 AI Voice Coach under løb',
    '📊 Avanceret statistik og analyse',
    '🎵 Spotify musik-integration',
    '💬 Ubegrænset AI Coach chat',
    '🏃 Interval træning med timer',
    '❤️ Pulszoner og kalorier',
    '🗺️ Detaljerede rutekort',
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>RunWithAI Pro</Text>
        <Text style={styles.subtitle}>Få mest muligt ud af din løbetræning</Text>
      </View>

      {/* Price Card */}
      <View style={styles.priceCard}>
        <Text style={styles.price}>{productPrice}</Text>
        <Text style={styles.period}>/ måned</Text>
        <Text style={styles.trial}>Prøv gratis i 7 dage</Text>
      </View>

      {/* Features List */}
      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Alt inkluderet:</Text>
        {proFeatures.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
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
          <Text style={styles.subscribeButtonText}>Start gratis prøveperiode</Text>
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
          <Text style={styles.restoreButtonText}>Gendan tidligere køb</Text>
        )}
      </TouchableOpacity>

      {/* Terms */}
      <Text style={styles.terms}>
        Abonnementet fornyes automatisk. Du kan opsige når som helst.
        {'\n'}Ved at fortsætte accepterer du vores vilkår og betingelser.
      </Text>

      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Luk</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
  },
  priceCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#FF4500',
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF4500',
  },
  period: {
    fontSize: 18,
    color: '#888888',
    marginTop: 4,
  },
  trial: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 12,
    fontWeight: '600',
  },
  featuresContainer: {
    marginBottom: 32,
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
    borderBottomColor: '#222222',
  },
  featureText: {
    fontSize: 16,
    color: '#ffffff',
  },
  subscribeButton: {
    backgroundColor: '#FF4500',
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
  terms: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  closeButton: {
    marginTop: 24,
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FF4500',
    fontSize: 16,
  },
});
