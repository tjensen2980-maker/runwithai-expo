import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { colors, LEVELS } from '../data';

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [chosen, setChosen] = useState(null);

  const features = [
    { emoji: '🤖', title: 'AI der forstår din krop', desc: 'Læser dine Garmin-data og laver en ny plan efter hvert løb' },
    { emoji: '📈', title: 'Tilpasser sig i samtale', desc: 'Fortæl coachen du er træt — planen opdateres med det samme' },
    { emoji: '🛡️', title: 'Skadeforebyggelse', desc: 'Opdager overbelastning før du mærker det' },
    { emoji: '🎯', title: 'Alle dine mål på én gang', desc: 'Halvmaraton, vægttab og distance — AI balancerer dem' },
  ];

  const levels = [
    { id: 'beginner',     label: 'Jeg er ny løber',      sub: 'Løber af og til eller netop startet',    emoji: '🌱', color: '#2ecc71' },
    { id: 'intermediate', label: 'Jeg løber jævnligt',   sub: 'Løber et par gange om ugen',             emoji: '🏃', color: '#ff6b35' },
    { id: 'advanced',     label: 'Jeg er seriøs løber',  sub: 'Kender pulszoner, HRV og træningsteori', emoji: '⚡', color: '#c8ff00' },
  ];

  if (step === 0) return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.splash} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View style={s.logoWrap}>
          <Text style={s.logoRun}>RUN</Text>
          <Text style={s.logoWith}>WITH</Text>
          <Text style={s.logoAi}>AI</Text>
        </View>
        <Text style={s.tagline}>Din personlige AI løbecoach · Beta</Text>
        <Text style={s.headline}>
          Den første løbe-app der{' '}
          <Text style={{ color: colors.accent }}>lytter til dig</Text>
          {' '}— og justerer din plan mens I taler.
        </Text>

        {/* Features */}
        <View style={s.featureGrid}>
          {features.map(f => (
            <View key={f.title} style={s.featureCard}>
              <Text style={s.featureEmoji}>{f.emoji}</Text>
              <Text style={s.featureTitle}>{f.title}</Text>
              <Text style={s.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.ctaBtn} onPress={() => setStep(1)}>
          <Text style={s.ctaBtnText}>Prøv gratis →</Text>
        </TouchableOpacity>
        <Text style={s.subtext}>Virker med Garmin · Ingen kreditkort · Beta-adgang</Text>
      </ScrollView>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.levelWrap} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => setStep(0)} style={s.backBtn}>
          <Text style={s.backText}>← Tilbage</Text>
        </TouchableOpacity>
        <Text style={s.levelTitle}>Én hurtig ting</Text>
        <Text style={s.levelSub}>
          Så RunWithAI kan tale til dig på den rigtige måde — du kan skifte det senere.
        </Text>

        {levels.map(opt => (
          <TouchableOpacity key={opt.id} onPress={() => setChosen(opt.id)}
            style={[s.levelCard, chosen === opt.id && { borderColor: opt.color, backgroundColor: opt.color + '15' }]}>
            <Text style={s.levelEmoji}>{opt.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.levelLabel, chosen === opt.id && { color: opt.color }]}>{opt.label}</Text>
              <Text style={s.levelSubLabel}>{opt.sub}</Text>
            </View>
            {chosen === opt.id && <Text style={{ color: opt.color, fontSize: 18 }}>✓</Text>}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[s.ctaBtn, { marginTop: 24, opacity: chosen ? 1 : 0.4 }]}
          onPress={() => chosen && onDone(chosen)}
          disabled={!chosen}>
          <Text style={s.ctaBtnText}>{chosen ? 'Kom i gang →' : 'Vælg dit niveau'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.black },
  splash:      { padding: 28, paddingTop: 20 },
  logoWrap:    { marginBottom: 8 },
  logoRun:     { fontSize: 64, fontWeight: '900', color: colors.accent, lineHeight: 58, letterSpacing: 2 },
  logoWith:    { fontSize: 64, fontWeight: '900', color: colors.text,   lineHeight: 58, letterSpacing: 2 },
  logoAi:      { fontSize: 64, fontWeight: '900', color: colors.accent, lineHeight: 58, letterSpacing: 2 },
  tagline:     { fontFamily: 'monospace', fontSize: 11, color: colors.muted, letterSpacing: 2, marginBottom: 20, marginTop: 10 },
  headline:    { fontSize: 18, color: colors.text, lineHeight: 26, marginBottom: 28, fontWeight: '500' },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  featureCard: { width: '47%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16 },
  featureEmoji:{ fontSize: 24, marginBottom: 8 },
  featureTitle:{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 4 },
  featureDesc: { fontSize: 12, color: colors.dim, lineHeight: 17 },
  ctaBtn:      { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  ctaBtnText:  { fontSize: 16, fontWeight: '700', color: colors.black, letterSpacing: 0.5 },
  subtext:     { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 12 },
  levelWrap:   { padding: 28, paddingTop: 16 },
  backBtn:     { marginBottom: 20 },
  backText:    { color: colors.muted, fontSize: 14 },
  levelTitle:  { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 8 },
  levelSub:    { fontSize: 14, color: colors.dim, lineHeight: 21, marginBottom: 24 },
  levelCard:   { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 14, marginBottom: 10 },
  levelEmoji:  { fontSize: 26 },
  levelLabel:  { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  levelSubLabel:{ fontSize: 12, color: colors.dim },
});
