// src/components/ProUpsell.js
// Vis denne komponent til nye brugere efter onboarding

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, SERVER, getAuthToken } from '../data';

const proFeatures = [
  { emoji: '🤖', title: 'AI Coach', desc: 'Personlig træningsplan der tilpasser sig dig' },
  { emoji: '📊', title: 'Avanceret statistik', desc: 'Dybdegående analyse af din træning' },
  { emoji: '🎯', title: 'Ubegrænsede mål', desc: 'Sæt så mange mål du vil' },
  { emoji: '🗺️', title: 'Rutebibliotek', desc: 'Gem og del dine yndlingsruter' },
  { emoji: '💬', title: 'AI Chat', desc: 'Stil spørgsmål om løb og få svar' },
  { emoji: '📈', title: 'Fremskridtsrapporter', desc: 'Ugentlige og månedlige opsummeringer' },
];

export default function ProUpsell({ onSkip, onUpgrade }) {
  
  const handleUpgrade = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${SERVER}/create-checkout-session`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ priceId: 'price_1TBU4s5DwJ9LegdIxUvhaTJu' })
      });
      const data = await res.json();
      if (data.url) {
        if (Platform.OS === 'web') window.open(data.url, '_blank');
        else Linking.openURL(data.url);
      }
    } catch (e) {
      console.log('Checkout error:', e);
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
          <Text style={s.price}>49 kr</Text>
          <Text style={s.priceUnit}>/måned</Text>
        </View>
        
        <Text style={s.guarantee}>✓ Annuller når som helst • ✓ 7 dages gratis prøveperiode</Text>

        <TouchableOpacity style={s.upgradeBtn} onPress={handleUpgrade || onUpgrade}>
          <Text style={s.upgradeBtnText}>🚀 Start gratis prøveperiode</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.skipBtn} onPress={onSkip}>
          <Text style={s.skipBtnText}>Fortsæt med gratis version</Text>
        </TouchableOpacity>
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
  },
  upgradeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  skipBtn: {
    paddingVertical: 12,
  },
  skipBtnText: {
    color: colors.muted,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
