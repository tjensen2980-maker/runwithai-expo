// ═══════════════════════════════════════════════════════════════════════════
// PRICING.JS - RunWithAI Pro Subscription Component (Apple IAP)
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
import * as RNIap from 'react-native-iap';

const API_URL = 'https://runwithai-server-production.up.railway.app';

// Product IDs - skal matche App Store Connect
const PRODUCT_IDS = ['app.runwithai.pro.monthly'];

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

  const isPro = subscription?.tier === 'pro' || subscription?.status === 'active';
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
  const [products, setProducts] = useState([]);
  const [restoring, setRestoring] = useState(false);

  // Initialize IAP
  useEffect(() => {
    let purchaseUpdateSubscription;
    let purchaseErrorSubscription;

    const initIAP = async () => {
      if (Platform.OS !== 'ios') return;

      try {
        await RNIap.initConnection();
        const availableProducts = await RNIap.getSubscriptions({ skus: PRODUCT_IDS });
        setProducts(availableProducts);
      } catch (err) {
        console.error('IAP init error:', err);
      }

      // Listen for purchases
      purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase) => {
        const receipt = purchase.transactionReceipt;
        if (receipt) {
          try {
            // Validate with server
            const res = await fetch(`${API_URL}/validate-receipt`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                receipt,
                productId: purchase.productId,
              }),
            });

            const data = await res.json();

            if (data.success) {
              await RNIap.finishTransaction({ purchase, isConsumable: false });
              Alert.alert('🎉 Velkommen til Pro!', 'Dit abonnement er nu aktivt.');
              onClose();
            } else {
              Alert.alert('Fejl', data.error || 'Kunne ikke validere køb');
            }
          } catch (err) {
            console.error('Validation error:', err);
            Alert.alert('Fejl', 'Kunne ikke validere køb');
          }
        }
        setLoading(false);
      });

      purchaseErrorSubscription = RNIap.purchaseErrorListener((error) => {
        console.error('Purchase error:', error);
        if (error.code !== 'E_USER_CANCELLED') {
          Alert.alert('Fejl', 'Køb fejlede. Prøv igen.');
        }
        setLoading(false);
      });
    };

    initIAP();

    return () => {
      if (purchaseUpdateSubscription) {
        purchaseUpdateSubscription.remove();
      }
      if (purchaseErrorSubscription) {
        purchaseErrorSubscription.remove();
      }
      if (Platform.OS === 'ios') {
        RNIap.endConnection();
      }
    };
  }, [token, onClose]);

  const handleSubscribe = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Info', 'In-App Purchase er kun tilgængelig på iOS');
      return;
    }

    if (!token) {
      Alert.alert('Log ind', 'Du skal være logget ind for at købe abonnement');
      return;
    }

    setLoading(true);

    try {
      await RNIap.requestSubscription({ sku: PRODUCT_IDS[0] });
    } catch (err) {
      console.error('Purchase error:', err);
      if (err.code !== 'E_USER_CANCELLED') {
        Alert.alert('Fejl', 'Kunne ikke starte køb. Prøv igen.');
      }
      setLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (Platform.OS !== 'ios') return;

    setRestoring(true);

    try {
      const purchases = await RNIap.getAvailablePurchases();

      if (purchases.length > 0) {
        // Send to server for validation
        const res = await fetch(`${API_URL}/restore-purchases`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ purchases }),
        });

        const data = await res.json();

        if (data.success && data.hasActiveSub) {
          Alert.alert('✅ Gendannet!', 'Dit Pro abonnement er gendannet.');
          onClose();
        } else {
          Alert.alert('Info', 'Ingen aktive abonnementer fundet.');
        }
      } else {
        Alert.alert('Info', 'Ingen tidligere køb fundet.');
      }
    } catch (err) {
      console.error('Restore error:', err);
      Alert.alert('Fejl', 'Kunne ikke gendanne køb. Prøv igen.');
    } finally {
      setRestoring(false);
    }
  };

  // Get price from product or use fallback
  const productPrice = products.length > 0 ? products[0].localizedPrice : '49 kr';

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
