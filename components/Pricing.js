// ═══════════════════════════════════════════════════════════════════════════
// PRICING.JS - RunWithAI Pro Subscription Component (Apple IAP)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';

// Expo IAP imports
import * as InAppPurchases from 'expo-in-app-purchases';

const API_URL = 'https://runwithai-server-production.up.railway.app';

// Product IDs - skal matche App Store Connect
const PRODUCT_IDS = ['app.runwithai.pro.monthly'];

// ─── SUBSCRIPTION HOOK ──────────────────────────────────────────────────────
export function useSubscription(token) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    fetchSubscription();
  }, [token]);

  const fetchSubscription = async () => {
    try {
      const res = await fetch(`${API_URL}/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSubscription(data);
    } catch (err) {
      console.error('Subscription fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isPro = subscription?.tier === 'pro';
  const canTrackRun = subscription?.canTrackRun ?? true;

  return { subscription, loading, isPro, canTrackRun, refresh: fetchSubscription };
}

// ─── PAYWALL COMPONENT ──────────────────────────────────────────────────────
export function Paywall({ feature, children, token, onUpgrade }) {
  const { isPro, loading } = useSubscription(token);

  if (loading) {
    return (
      <View style={styles.paywallLoading}>
        <ActivityIndicator color="#c8ff00" />
      </View>
    );
  }

  if (isPro) {
    return children;
  }

  return (
    <View style={styles.paywallContainer}>
      <View style={styles.paywallOverlay}>
        <Text style={styles.paywallIcon}>🔒</Text>
        <Text style={styles.paywallTitle}>Pro Feature</Text>
        <Text style={styles.paywallText}>
          {feature || 'Denne funktion'} kræver Pro abonnement
        </Text>
        <TouchableOpacity style={styles.paywallButton} onPress={onUpgrade}>
          <Text style={styles.paywallButtonText}>Opgrader til Pro</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── PRICING PAGE COMPONENT ─────────────────────────────────────────────────
export default function PricingPage({ token, onClose, currentTier = 'free' }) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [restoring, setRestoring] = useState(false);
  const [connected, setConnected] = useState(false);

  // Initialize IAP connection
  useEffect(() => {
    const initIAP = async () => {
      if (Platform.OS !== 'ios') return;
      
      try {
        await InAppPurchases.connectAsync();
        setConnected(true);
        
        const { results } = await InAppPurchases.getProductsAsync(PRODUCT_IDS);
        if (results) {
          setProducts(results);
        }
      } catch (err) {
        console.error('IAP init error:', err);
      }
    };

    initIAP();

    // Cleanup
    return () => {
      if (Platform.OS === 'ios' && connected) {
        InAppPurchases.disconnectAsync();
      }
    };
  }, []);

  // Listen for purchase updates
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const subscription = InAppPurchases.setPurchaseListener(async ({ responseCode, results, errorCode }) => {
      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        for (const purchase of results) {
          if (!purchase.acknowledged) {
            try {
              // Send receipt til server for validering
              const res = await fetch(`${API_URL}/validate-receipt`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ 
                  receipt: purchase.transactionReceipt,
                  productId: purchase.productId,
                }),
              });

              const data = await res.json();

              if (data.success) {
                // Finish transaction
                await InAppPurchases.finishTransactionAsync(purchase, false);
                Alert.alert('🎉 Velkommen til Pro!', 'Dit abonnement er nu aktivt.');
                onClose();
              } else {
                Alert.alert('Fejl', data.error || 'Kunne ikke validere køb');
              }
            } catch (err) {
              console.error('Receipt validation error:', err);
              Alert.alert('Fejl', 'Kunne ikke validere køb. Prøv igen.');
            }
          }
        }
      } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
        console.log('User cancelled purchase');
      } else {
        console.error('Purchase error:', errorCode);
        Alert.alert('Fejl', 'Køb fejlede. Prøv igen.');
      }
      setLoading(false);
    });

    return () => {
      // Cleanup handled by disconnectAsync
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

    if (!connected) {
      Alert.alert('Fejl', 'Kunne ikke forbinde til App Store. Prøv igen.');
      return;
    }

    setLoading(true);

    try {
      await InAppPurchases.purchaseItemAsync(PRODUCT_IDS[0]);
    } catch (err) {
      console.error('Purchase request error:', err);
      Alert.alert('Fejl', 'Kunne ikke starte køb. Prøv igen.');
      setLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (Platform.OS !== 'ios') return;

    setRestoring(true);

    try {
      const { results } = await InAppPurchases.getPurchaseHistoryAsync();
      
      if (results && results.length > 0) {
        // Send til server for validering
        const res = await fetch(`${API_URL}/restore-purchases`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ purchases: results }),
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
  const productPrice = products.length > 0 
    ? products[0].price 
    : '49 kr';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>RunWithAI Pro</Text>
        <Text style={styles.subtitle}>
          Få mest muligt ud af din løbetræning
        </Text>
      </View>

      {/* Current Plan Badge */}
      {currentTier === 'pro' && (
        <View style={styles.currentPlanBadge}>
          <Text style={styles.currentPlanText}>✓ Du har Pro</Text>
        </View>
      )}

      {/* Plan Card */}
      <View style={styles.planCard}>
        <View style={styles.planHeader}>
          <Text style={styles.planName}>PRO MÅNEDLIG</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{productPrice}</Text>
            <Text style={styles.period}>/md</Text>
          </View>
        </View>

        {/* Features List */}
        <View style={styles.featuresList}>
          <FeatureItem text="Ubegrænset løb tracking" />
          <FeatureItem text="AI løbecoach med personlig feedback" />
          <FeatureItem text="Alle badges & achievements" />
          <FeatureItem text="Streak tracking & motivation" />
          <FeatureItem text="Avanceret puls zone analyse" />
          <FeatureItem text="Garmin Connect sync" />
          <FeatureItem text="Social feed med venner" />
          <FeatureItem text="Eksporter alle dine data" />
        </View>

        {/* Subscribe Button */}
        {currentTier !== 'pro' && (
          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={handleSubscribe}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.subscribeButtonText}>
                Start Pro nu →
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Terms */}
        <Text style={styles.terms}>
          Abonnementet fornyes automatisk hver måned.{'\n'}
          Du kan annullere når som helst i Indstillinger.
        </Text>
      </View>

      {/* Restore Purchases */}
      <TouchableOpacity
        style={styles.restoreButton}
        onPress={handleRestorePurchases}
        disabled={restoring}
      >
        {restoring ? (
          <ActivityIndicator color="#888" size="small" />
        ) : (
          <Text style={styles.restoreButtonText}>Gendan tidligere køb</Text>
        )}
      </TouchableOpacity>

      {/* Free Plan Comparison */}
      <View style={styles.freePlanCard}>
        <Text style={styles.freePlanTitle}>Free Plan</Text>
        <Text style={styles.freePlanPrice}>Gratis</Text>
        <View style={styles.freePlanFeatures}>
          <FeatureItem text="10 løb per måned" dimmed />
          <FeatureItem text="Basis statistik" dimmed />
          <FeatureItem text="Ugentlig oversigt" dimmed />
        </View>
        <View style={styles.limitations}>
          <LimitationItem text="Ingen AI coach" />
          <LimitationItem text="Ingen badges" />
          <LimitationItem text="Ingen Garmin sync" />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🔒 Sikker betaling via App Store
        </Text>
        <Text style={styles.footerText}>
          Spørgsmål? kontakt@runwithai.app
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── HELPER COMPONENTS ──────────────────────────────────────────────────────
function FeatureItem({ text, highlight, dimmed }) {
  return (
    <View style={styles.featureItem}>
      <Text style={[styles.featureCheck, highlight && styles.featureHighlight]}>
        ✓
      </Text>
      <Text style={[styles.featureText, dimmed && styles.featureTextDimmed]}>
        {text}
      </Text>
    </View>
  );
}

function LimitationItem({ text }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.limitationX}>✕</Text>
      <Text style={styles.limitationText}>{text}</Text>
    </View>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 8,
  },
  closeButtonText: {
    color: '#888',
    fontSize: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 8,
  },
  currentPlanBadge: {
    backgroundColor: 'rgba(200, 255, 0, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'center',
    marginBottom: 20,
  },
  currentPlanText: {
    color: '#c8ff00',
    fontWeight: '600',
  },
  planCard: {
    backgroundColor: '#1a1a1f',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#c8ff00',
    marginBottom: 20,
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2f',
  },
  planName: {
    fontSize: 14,
    color: '#c8ff00',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  period: {
    fontSize: 18,
    color: '#888',
    marginBottom: 8,
    marginLeft: 4,
  },
  featuresList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureCheck: {
    color: '#c8ff00',
    fontSize: 16,
    marginRight: 12,
    width: 20,
  },
  featureHighlight: {
    color: '#ff6b35',
  },
  featureText: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
  },
  featureTextDimmed: {
    color: '#666',
  },
  limitationX: {
    color: '#ff4444',
    fontSize: 14,
    marginRight: 12,
    width: 20,
  },
  limitationText: {
    color: '#666',
    fontSize: 14,
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: '#c8ff00',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  subscribeButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  terms: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    lineHeight: 18,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 20,
  },
  restoreButtonText: {
    color: '#888',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  freePlanCard: {
    backgroundColor: '#1a1a1f',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  freePlanTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#888',
    marginBottom: 4,
  },
  freePlanPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 16,
  },
  freePlanFeatures: {
    marginBottom: 12,
  },
  limitations: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2f',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  footerText: {
    color: '#666',
    fontSize: 13,
    marginBottom: 8,
  },
  // Paywall styles
  paywallLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  paywallContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 15, 0.95)',
    padding: 20,
  },
  paywallOverlay: {
    backgroundColor: '#1a1a1f',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 320,
  },
  paywallIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  paywallTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  paywallText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  paywallButton: {
    backgroundColor: '#c8ff00',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  paywallButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
