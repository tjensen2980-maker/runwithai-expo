import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, LEVELS } from '../data';
import ProUpsell from '../components/ProUpsell';

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [goalInfo, setGoalInfo] = useState({ name: '', age: '', weeklyKm: '', goal: '', raceDate: '' });

  const features = [
    { emoji: '🤖', title: 'AI der forstår din krop', desc: 'Læser dine løbedata og laver en ny plan efter hvert løb' },
    { emoji: '📈', title: 'Tilpasser sig i samtale', desc: 'Fortæl coachen du er træt — planen opdateres med det samme' },
    { emoji: '🛡️', title: 'Skadeforebyggelse', desc: 'Opdager overbelastning før du mærker det' },
    { emoji: '🎯', title: 'Alle dine mål på én gang', desc: 'Halvmaraton, vægttab og distance — AI balancerer dem' },
  ];

  const levels = [
    { id: 'beginner',     label: 'Jeg er ny løber',      sub: 'Løber af og til eller netop startet',    emoji: '🌱', color: '#2ecc71' },
    { id: 'intermediate', label: 'Jeg løber jævnligt',   sub: 'Løber et par gange om ugen',             emoji: '🏃', color: '#ff6b35' },
    { id: 'advanced',     label: 'Jeg er seriøs løber',  sub: 'Kender pulszoner, HRV og træningsteori', emoji: '⚡', color: '#c8ff00' },
  ];

  const goals = [
    { id: 'fitness', label: '💪 Generel fitness', sub: 'Kom i form og hold vægten' },
    { id: '5k',      label: '🏅 5 km race',       sub: 'Forbedre din 5 km tid' },
    { id: '10k',     label: '🥈 10 km race',      sub: 'Træn til 10 km' },
    { id: 'half',    label: '🥇 Halvmaraton',      sub: '21 km udfordring' },
    { id: 'full',    label: '🏆 Maraton',          sub: '42 km challenge' },
    { id: 'weight',  label: '⚖️ Vægttab',          sub: 'Løb og tab dig' },
  ];

  // ── STEP 0: Splash ──────────────────────────────────────────────────────────
  if (step === 0) return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.splash} showsVerticalScrollIndicator={false}>
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
        <Text style={s.fine}>Virker med Garmin · Ingen kreditkort · Beta adgang</Text>
      </ScrollView>
    </SafeAreaView>
  );

  // ── STEP 1: Niveau ──────────────────────────────────────────────────────────
  if (step === 1) return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.splash} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => setStep(0)} style={s.backBtn}>
          <Text style={s.backBtnText}>← Tilbage</Text>
        </TouchableOpacity>
        <Text style={s.levelTitle}>Hvad er dit løbeniveau?</Text>
        {levels.map(opt => (
          <TouchableOpacity
            key={opt.id}
            onPress={() => setChosen(opt.id)}
            style={[s.levelCard, chosen === opt.id && { borderColor: opt.color, backgroundColor: opt.color + '15' }]}>
            <Text style={s.levelEmoji}>{opt.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.levelLabel, chosen === opt.id && { color: opt.color }]}>{opt.label}</Text>
              <Text style={s.levelSub}>{opt.sub}</Text>
            </View>
            {chosen === opt.id && <Text style={{ color: opt.color, fontSize: 18 }}>✓</Text>}
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[s.ctaBtn, { marginTop: 24, opacity: chosen ? 1 : 0.4 }]}
          onPress={() => chosen && setStep(2)}
          disabled={!chosen}>
          <Text style={s.ctaBtnText}>{chosen ? 'Fortsæt →' : 'Vælg dit niveau'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  // ── STEP 2: Profilinfo & mål ─────────────────────────────────────────────────
  if (step === 2) return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.splash} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => setStep(1)} style={s.backBtn}>
          <Text style={s.backBtnText}>← Tilbage</Text>
        </TouchableOpacity>
        <Text style={s.levelTitle}>Fortæl os om dig</Text>
        <Text style={s.levelSubTitle}>AI coachen bruger dette til at tilpasse din træning</Text>

        {[
          { key: 'name',     label: 'Dit navn',             placeholder: 'Thomas',  keyboard: 'default' },
          { key: 'age',      label: 'Alder',                placeholder: '32',      keyboard: 'numeric' },
          { key: 'weeklyKm', label: 'Km du løber om ugen',  placeholder: '25',      keyboard: 'numeric' },
        ].map(field => (
          <View key={field.key} style={s.fieldWrap}>
            <Text style={s.fieldLabel}>{field.label}</Text>
            <TextInput
              style={s.fieldInput}
              placeholder={field.placeholder}
              placeholderTextColor={colors.muted}
              value={goalInfo[field.key]}
              onChangeText={v => setGoalInfo(g => ({ ...g, [field.key]: v }))}
              keyboardType={field.keyboard}
            />
          </View>
        ))}

        <Text style={[s.fieldLabel, { marginTop: 8, marginBottom: 8 }]}>Dit primære mål</Text>
        <View style={s.goalGrid}>
          {goals.map(g => (
            <TouchableOpacity
              key={g.id}
              style={[s.goalCard, goalInfo.goal === g.id && { borderColor: colors.accent, backgroundColor: colors.accent + '15' }]}
              onPress={() => setGoalInfo(prev => ({ ...prev, goal: g.id }))}>
              <Text style={[s.goalLabel, goalInfo.goal === g.id && { color: colors.accent }]}>{g.label}</Text>
              <Text style={s.goalSub}>{g.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {['half', 'full', '5k', '10k'].includes(goalInfo.goal) && (
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>Race dato (valgfrit)</Text>
            <TextInput
              style={s.fieldInput}
              placeholder="f.eks. 15. september 2025"
              placeholderTextColor={colors.muted}
              value={goalInfo.raceDate}
              onChangeText={v => setGoalInfo(g => ({ ...g, raceDate: v }))}
            />
          </View>
        )}

        <TouchableOpacity style={[s.ctaBtn, { marginTop: 24 }]} onPress={() => setStep(3)}>
          <Text style={s.ctaBtnText}>Fortsæt →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ alignItems: 'center', marginTop: 12 }} onPress={() => setStep(3)}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>Spring over for nu</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  // ── STEP 3: PRO Upsell ──────────────────────────────────────────────────────
  if (step === 3) return (
    <ProUpsell 
      onSkip={() => onDone(chosen, goalInfo)}
      onUpgrade={() => onDone(chosen, goalInfo)}
    />
  );

  return null;
}

const s = StyleSheet.create({
  // FIX: Ændret fra colors.black til colors.bg for lyst tema
  safe:          { flex: 1, backgroundColor: colors.bg },
  splash:        { padding: 24, paddingBottom: 60 },
  logoWrap:      { marginTop: 24, marginBottom: 8 },
  logoRun:       { fontSize: 52, fontWeight: '900', color: colors.black, lineHeight: 52 },
  logoWith:      { fontSize: 52, fontWeight: '900', color: colors.black, lineHeight: 52 },
  logoAi:        { fontSize: 52, fontWeight: '900', color: colors.accent, lineHeight: 52 },
  tagline:       { color: colors.muted, fontSize: 13, marginBottom: 16 },
  headline:      { fontSize: 18, color: colors.text, fontWeight: '600', lineHeight: 26, marginBottom: 28 },
  featureGrid:   { gap: 10, marginBottom: 28 },
  featureCard:   { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  featureEmoji:  { fontSize: 24, marginBottom: 8 },
  featureTitle:  { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  featureDesc:   { color: colors.dim, fontSize: 12, lineHeight: 18 },
  ctaBtn:        { backgroundColor: colors.accent, borderRadius: 16, padding: 18, alignItems: 'center' },
  ctaBtnText:    { color: '#ffffff', fontWeight: '800', fontSize: 17 },
  fine:          { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 12 },
  backBtn:       { marginBottom: 20 },
  backBtnText:   { color: colors.muted, fontSize: 15 },
  levelTitle:    { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 6 },
  levelSubTitle: { color: colors.dim, fontSize: 14, marginBottom: 20, lineHeight: 20 },
  levelCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border, gap: 12 },
  levelEmoji:    { fontSize: 28 },
  levelLabel:    { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  levelSub:      { fontSize: 12, color: colors.dim },
  fieldWrap:     { marginBottom: 16 },
  fieldLabel:    { color: colors.dim, fontSize: 11, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput:    { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, color: colors.text, fontSize: 16 },
  goalGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  goalCard:      { width: '47%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12 },
  goalLabel:     { color: colors.text, fontWeight: '700', fontSize: 13, marginBottom: 3 },
  goalSub:       { color: colors.dim, fontSize: 11 },
});
