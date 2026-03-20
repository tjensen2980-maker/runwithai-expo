// ═══════════════════════════════════════════════════════════════════════════════
// PRICING.JS - RunWithAI Pro Subscription Component
// ═══════════════════════════════════════════════════════════════════════════════
// Tilføj denne fil til din components mappe og importer den i App.js

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

// Web-compatible Linking
const openURL = (url) => {
  if (Platform.OS === 'web') {
    window.open(url, '_blank');
  } else {
    import('react-native').then(({ Linking }) => {
      Linking.openURL(url);
    });
  }
};

const API_URL = 'https://runwithai-server-production.up.railway.app';

// ─── PRICING PLANS ──────────────────────────────────────────────────────────────
const PLANS = {
  free: {
    name: 'Free',
    price: '0',
    period: '',
    features: [
      '10 løb per måned',
      'Basis statistik',
      'Ugentlig oversigt',
    ],
    limitations: [
      'Ingen AI coach',
      'Ingen badges',
      'Ingen Garmin sync',
    ],
  },
  monthly: {
    name: 'Pro Månedlig',
    price: '49',
    period: '/md',
    priceId: 'price_1TAy6y5vfJTCWWKE6SAScpOa',
    features: [
      'Ubegrænset løb',
      'AI løbecoach',
      'Alle badges & achievements',
      'Streak tracking',
      'Puls zoner',
      'Garmin sync',
      'Social feed',
      'Eksporter data',
    ],
    highlight: true,
  },
  yearly: {
    name: 'Pro Årlig',
    price: '399',
    period: '/år',
    priceId: 'price_1TAy7I5vfJTCWWKETZJMH5d3',
    features: [
      'Alt i Pro Månedlig',
      'Spar 189 kr (32%)',
      'Prioriteret support',
    ],
    savings: 'Spar 32%',
  },
};

// ─── SUBSCRIPTION HOOK ──────────────────────────────────────────────────────────
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

// ─── PAYWALL COMPONENT ──────────────────────────────────────────────────────────
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

// ─── PRICING PAGE COMPONENT ─────────────────────────────────────────────────────
export default function PricingPage({ token, onClose, currentTier = 'free' }) {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (interval) => {
    if (!token) {
      Alert.alert('Log ind', 'Du skal være logget ind for at købe abonnement');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interval }),
      });

      const data = await res.json();

      if (data.url) {
        // Åbn Stripe Checkout i browser
        openURL(data.url);
      } else {
        Alert.alert('Fejl', data.error || 'Kunne ikke starte checkout');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      Alert.alert('Fejl', 'Noget gik galt. Prøv igen.');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!token) return;

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.url) {
        openURL(data.url);
      } else {
        Alert.alert('Fejl', data.error || 'Kunne ikke åbne kundeportal');
      }
    } catch (err) {
      console.error('Portal error:', err);
      Alert.alert('Fejl', 'Noget gik galt. Prøv igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Vælg din plan</Text>
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

      {/* Plan Toggle */}
      <View style={styles.planToggle}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            selectedPlan === 'monthly' && styles.toggleButtonActive,
          ]}
          onPress={() => setSelectedPlan('monthly')}
        >
          <Text
            style={[
              styles.toggleText,
              selectedPlan === 'monthly' && styles.toggleTextActive,
            ]}
          >
            Månedlig
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            selectedPlan === 'yearly' && styles.toggleButtonActive,
          ]}
          onPress={() => setSelectedPlan('yearly')}
        >
          <Text
            style={[
              styles.toggleText,
              selectedPlan === 'yearly' && styles.toggleTextActive,
            ]}
          >
            Årlig
          </Text>
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>-32%</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Selected Plan Card */}
      <View style={styles.planCard}>
        <View style={styles.planHeader}>
          <Text style={styles.planName}>
            {selectedPlan === 'monthly' ? 'Pro Månedlig' : 'Pro Årlig'}
          </Text>
          <View style={styles.priceContainer}>
            <Text style={styles.currency}>kr</Text>
            <Text style={styles.price}>
              {selectedPlan === 'monthly' ? '49' : '399'}
            </Text>
            <Text style={styles.period}>
              {selectedPlan === 'monthly' ? '/md' : '/år'}
            </Text>
          </View>
          {selectedPlan === 'yearly' && (
            <Text style={styles.yearlyBreakdown}>
              Kun 33 kr/md • Spar 189 kr
            </Text>
          )}
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
          {selectedPlan === 'yearly' && (
            <FeatureItem text="Prioriteret support" highlight />
          )}
        </View>

        {/* Subscribe Button */}
        {currentTier === 'pro' ? (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={handleManageSubscription}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.manageButtonText}>Administrer abonnement</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={() => handleSubscribe(selectedPlan)}
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
          {selectedPlan === 'monthly'
            ? 'Forny automatisk hver måned. Annuller når som helst.'
            : 'Forny automatisk hvert år. Annuller når som helst.'}
        </Text>
      </View>

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
          🔒 Sikker betaling via Stripe
        </Text>
        <Text style={styles.footerText}>
          Spørgsmål? kontakt@runwithai.app
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── HELPER COMPONENTS ──────────────────────────────────────────────────────────
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

// ─── STYLES ─────────────────────────────────────────────────────────────────────
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
  planToggle: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1f',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#c8ff00',
  },
  toggleText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 15,
  },
  toggleTextActive: {
    color: '#000',
  },
  savingsBadge: {
    backgroundColor: '#ff6b35',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  savingsText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
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
  currency: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 8,
    marginRight: 4,
  },
  price: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
  },
  period: {
    fontSize: 18,
    color: '#888',
    marginBottom: 12,
    marginLeft: 4,
  },
  yearlyBreakdown: {
    fontSize: 14,
    color: '#c8ff00',
    marginTop: 8,
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
  manageButton: {
    backgroundColor: '#2a2a2f',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c8ff00',
  },
  manageButtonText: {
    color: '#c8ff00',
    fontSize: 16,
    fontWeight: '600',
  },
  terms: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
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
