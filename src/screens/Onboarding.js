import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, LEVELS, generateTrainingPlan, saveTrainingPlan } from '../data';
import OnboardingCarousel from '../components/OnboardingCarousel';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGES = [
  { code: 'da', flag: '🇩🇰', name: 'Dansk' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'it', flag: '🇮🇹', name: 'Italiano' },
  { code: 'pt', flag: '🇵🇹', name: 'Português' },
  { code: 'nl', flag: '🇳🇱', name: 'Nederlands' },
  { code: 'pl', flag: '🇵🇱', name: 'Polski' },
  { code: 'sv', flag: '🇸🇪', name: 'Svenska' },
  { code: 'fi', flag: '🇫🇮', name: 'Suomi' },
  { code: 'el', flag: '🇬🇷', name: 'Î•Î»Î»Î·Î½Î¹ÎºÎ¬' },
  { code: 'cs', flag: '🇨🇿', name: 'ÄŒeÅ¡tina' },
  { code: 'ro', flag: '🇷🇴', name: 'RomânÄƒ' },
  { code: 'hu', flag: '🇭🇺', name: 'Magyar' },
  { code: 'bg', flag: '🇧🇬', name: 'Ð‘ÑŠÐ»Ð³Ð°Ñ€ÑÐºÐ¸' },
  { code: 'hr', flag: '🇭🇷', name: 'Hrvatski' },
  { code: 'sk', flag: '🇸🇰', name: 'SlovenÄina' },
  { code: 'sl', flag: '🇸🇮', name: 'SlovenÅ¡Äina' },
  { code: 'lt', flag: '🇱🇹', name: 'LietuviÅ³' },
  { code: 'lv', flag: '🇱🇻', name: 'LatvieÅ¡u' },
  { code: 'et', flag: '🇪🇪', name: 'Eesti' },
  { code: 'ga', flag: '🇮🇪', name: 'Gaeilge' },
  { code: 'mt', flag: '🇲🇹', name: 'Malti' },
];

export default function Onboarding({ onDone }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [selectedLang, setSelectedLang] = useState(i18n.language || 'en');
  const [goalInfo, setGoalInfo] = useState({ name: '', age: '', weeklyKm: '', goal: '', raceDate: '', injuries: '' });
  const [aiPlan, setAiPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(false);

  const changeLanguage = async (code) => {
    setSelectedLang(code);
    i18n.changeLanguage(code);
    await AsyncStorage.setItem('userLanguage', code);
  };

  // [ONBOARDING-PLAN] Generer AI-plan ud fra brugerens onboarding-svar
  const goToPlan = async () => {
    setStep(4);
    setPlanError(false);
    setPlanLoading(true);
    try {
      const profile = {
        name: goalInfo.name || "",
        age: goalInfo.age || "",
        weeklyKm: goalInfo.weeklyKm || "",
        goal: goalInfo.goal || "",
        raceDate: goalInfo.raceDate || "",
        injuries: goalInfo.injuries || "",
      };
      const lvl = chosen || "beginner";
      const plan = await generateTrainingPlan(profile, lvl, []);
      if (plan) {
        setAiPlan(plan);
        // Gem planen paa serveren saa den lander i kalenderen (fire-and-forget:
        // et netvaerksudfald maa aldrig vaelte selve onboarding-oplevelsen)
        try { await saveTrainingPlan(plan); } catch (e) {}
      } else { setPlanError(true); }
    } catch (e) {
      setPlanError(true);
    } finally {
      setPlanLoading(false);
    }
  };

  const features = [
    { emoji: '🤖', title: t('onboarding.features.ai.title'), desc: t('onboarding.features.ai.desc') },
    { emoji: '📈', title: t('onboarding.features.adapts.title'), desc: t('onboarding.features.adapts.desc') },
    { emoji: '🛡️', title: t('onboarding.features.injury.title'), desc: t('onboarding.features.injury.desc') },
    { emoji: '🎯', title: t('onboarding.features.goals.title'), desc: t('onboarding.features.goals.desc') },
  ];

  const levels = [
    { id: 'beginner',     label: t('onboarding.levels.beginner.label'),     sub: t('onboarding.levels.beginner.sub'),     emoji: '🌱', color: '#2ecc71' },
    { id: 'intermediate', label: t('onboarding.levels.intermediate.label'), sub: t('onboarding.levels.intermediate.sub'), emoji: '🏃', color: '#ff6b35' },
    { id: 'advanced',     label: t('onboarding.levels.advanced.label'),     sub: t('onboarding.levels.advanced.sub'),     emoji: '⚡', color: '#c8ff00' },
  ];

  const goals = [
    { id: 'fitness', label: t('onboarding.goals.fitness.label'), sub: t('onboarding.goals.fitness.sub') },
    { id: '5k',      label: t('onboarding.goals.5k.label'),      sub: t('onboarding.goals.5k.sub') },
    { id: '10k',     label: t('onboarding.goals.10k.label'),     sub: t('onboarding.goals.10k.sub') },
    { id: 'half',    label: t('onboarding.goals.half.label'),    sub: t('onboarding.goals.half.sub') },
    { id: 'full',    label: t('onboarding.goals.full.label'),    sub: t('onboarding.goals.full.sub') },
    { id: 'weight',  label: t('onboarding.goals.weight.label'),  sub: t('onboarding.goals.weight.sub') },
  ];

  // ── STEP 0: Language Selection ──────────────────────────────────────────────
  if (step === 0) return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.splash} showsVerticalScrollIndicator={false}>
        <View style={s.logoWrap}>
          <Text style={s.logoRun}>RUN</Text>
          <Text style={s.logoWith}>WITH</Text>
          <Text style={s.logoAi}>AI</Text>
        </View>
        
        <Text style={s.langTitle}>🌍 Choose your language</Text>
        <Text style={s.langSubtitle}>Vælg dit sprog • Wähle deine Sprache</Text>
        
        <View style={s.langGrid}>
          {LANGUAGES.map(lang => (
            <TouchableOpacity
              key={lang.code}
              style={[
                s.langCard,
                selectedLang === lang.code && { borderColor: colors.accent, backgroundColor: colors.accent + '15' }
              ]}
              onPress={() => changeLanguage(lang.code)}
            >
              <Text style={s.langFlag}>{lang.flag}</Text>
              <Text style={[
                s.langName,
                selectedLang === lang.code && { color: colors.accent }
              ]}>{lang.name}</Text>
              {selectedLang === lang.code && (
                <Text style={{ color: colors.accent, fontSize: 14 }}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[s.ctaBtn, { marginTop: 24 }]} onPress={() => setStep(1)}>
          <Text style={s.ctaBtnText}>{t('auth.continue') || 'Continue'} →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  // ── STEP 1: Splash ──────────────────────────────────────────────────────────
  if (step === 1) return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.splash} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => setStep(0)} style={s.backBtn}>
          <Text style={s.backBtnText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <View style={s.logoWrap}>
          <Text style={s.logoRun}>RUN</Text>
          <Text style={s.logoWith}>WITH</Text>
          <Text style={s.logoAi}>AI</Text>
        </View>
        <Text style={s.tagline}>{t('onboarding.tagline')}</Text>
        <Text style={s.headline}>
          {t('onboarding.headline.before')}
          <Text style={{ color: colors.accent }}>{t('onboarding.headline.highlight')}</Text>
          {t('onboarding.headline.after')}
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
        <TouchableOpacity style={s.ctaBtn} onPress={() => setStep(2)}>
          <Text style={s.ctaBtnText}>{t('onboarding.tryFree')} →</Text>
        </TouchableOpacity>
        <Text style={s.fine}>{t('onboarding.fine')}</Text>
      </ScrollView>
    </SafeAreaView>
  );

  // ── STEP 2: Niveau ──────────────────────────────────────────────────────────
  if (step === 2) return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.splash} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => setStep(1)} style={s.backBtn}>
          <Text style={s.backBtnText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={s.levelTitle}>{t('onboarding.levelQuestion')}</Text>
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
          onPress={() => chosen && setStep(3)}
          disabled={!chosen}>
          <Text style={s.ctaBtnText}>{chosen ? `${t('auth.continue')} →` : t('onboarding.selectLevel')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  // ── STEP 3: Profilinfo & mål ─────────────────────────────────────────────────
  if (step === 3) return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.splash} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => setStep(2)} style={s.backBtn}>
          <Text style={s.backBtnText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={s.levelTitle}>{t('onboarding.tellUsAboutYou')}</Text>
        <Text style={s.levelSubTitle}>{t('onboarding.coachUsesThis')}</Text>

        {[
          { key: 'name',     label: t('onboarding.fields.name'),     placeholder: 'Thomas',  keyboard: 'default' },
          { key: 'age',      label: t('onboarding.fields.age'),      placeholder: '32',      keyboard: 'numeric' },
          { key: 'weeklyKm', label: t('onboarding.fields.weeklyKm'), placeholder: '25',      keyboard: 'numeric' },
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

        <View style={s.fieldWrap}>
          <Text style={s.fieldLabel}>{'Skader eller smerter vi skal tage hensyn til? (valgfrit)'}</Text>
          <TextInput
            style={[s.fieldInput, { minHeight: 60 }]}
            placeholder={'F.eks. oemt knae, skinnebensbetaendelse...'}
            placeholderTextColor={colors.muted}
            value={goalInfo.injuries}
            onChangeText={v => setGoalInfo(g => ({ ...g, injuries: v }))}
            multiline
          />
        </View>

        <Text style={[s.fieldLabel, { marginTop: 8, marginBottom: 8 }]}>{t('onboarding.primaryGoal')}</Text>
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
            <Text style={s.fieldLabel}>{t('onboarding.raceDate')}</Text>
            <TextInput
              style={s.fieldInput}
              placeholder={t('onboarding.raceDatePlaceholder')}
              placeholderTextColor={colors.muted}
              value={goalInfo.raceDate}
              onChangeText={v => setGoalInfo(g => ({ ...g, raceDate: v }))}
            />
          </View>
        )}

        <TouchableOpacity style={[s.ctaBtn, { marginTop: 24 }]} onPress={() => goToPlan()}>
          <Text style={s.ctaBtnText}>{t('auth.continue')} →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ alignItems: 'center', marginTop: 12 }} onPress={() => goToPlan()}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{t('onboarding.skipForNow')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  // ── STEP 4: AI leverer din plan ──────────────────────────────────────────────
  if (step === 4) return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {planLoading && (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Text style={[s.levelTitle, { textAlign: "center" }]}>{t("onboarding.plan.building") || "Jeg lægger din plan sammen ud fra det du fortalte…"}</Text>
            <Text style={{ color: colors.muted, marginTop: 12, textAlign: "center" }}>{goalInfo.name ? (goalInfo.name + ", giv mig et øjeblik.") : "Giv mig et øjeblik."}</Text>
          </View>
        )}
        {!planLoading && planError && (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Text style={[s.levelTitle, { textAlign: "center" }]}>Kunne ikke lave planen lige nu</Text>
            <Text style={{ color: colors.muted, marginTop: 12, textAlign: "center" }}>Du kan altid få din coach til at lave den senere.</Text>
            <TouchableOpacity style={[s.ctaBtn, { marginTop: 24 }]} onPress={() => goToPlan()}>
              <Text style={s.ctaBtnText}>Prøv igen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ alignItems: "center", marginTop: 12 }} onPress={() => setStep(5)}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>Fortsæt</Text>
            </TouchableOpacity>
          </View>
        )}
        {!planLoading && !planError && aiPlan && (
          <View>
            <Text style={s.levelTitle}>{goalInfo.name ? (goalInfo.name + ", her er din plan") : "Her er din plan"}</Text>
            <Text style={{ color: colors.muted, marginTop: 8, lineHeight: 20 }}>
              {"Du fortalte at du " + (goalInfo.weeklyKm ? ("løber omkring " + goalInfo.weeklyKm + " km om ugen") : "vil i gang") + (goalInfo.goal ? (" og har som mål: " + goalInfo.goal) : "") + (goalInfo.injuries ? (". Vi tager hensyn til: " + goalInfo.injuries) : "") + ". Derfor ser din uge sådan ud:"}
            </Text>
            <View style={{ marginTop: 20 }}>
              {(aiPlan.weekPlan || aiPlan.plan || []).map((d, i) => (
                <View key={i} style={[s.planCard, d.rest && s.planCardRest]}>
                  <Text style={s.planWeekDay}>Uge {Math.floor(i / 7) + 1} – {d.day || ('Dag ' + (i + 1))}</Text>
                  <Text style={s.planTitle}>{d.rest ? 'Hvile' : (d.title || 'Løbetur')}</Text>
                  {!!d.workout && <Text style={s.planDesc}>{d.workout}</Text>}
                  {!!d.km && !d.rest && <Text style={s.planKm}>{d.km} km</Text>}
                </View>
              ))}
            </View>
            {aiPlan.summary ? (<Text style={{ color: colors.muted, marginTop: 16, lineHeight: 20 }}>{aiPlan.summary}</Text>) : null}
            <TouchableOpacity style={[s.ctaBtn, { marginTop: 28 }]} onPress={() => setStep(5)}>
              <Text style={s.ctaBtnText}>Fortsæt →</Text>
            </TouchableOpacity>
          </View>
        )}
        {!planLoading && !planError && !aiPlan && (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <TouchableOpacity style={[s.ctaBtn, { marginTop: 24 }]} onPress={() => goToPlan()}>
              <Text style={s.ctaBtnText}>Lav min plan</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  // ── STEP 5: PRO Upsell ──────────────────────────────────────────────────────
  if (step === 5) return (
    <OnboardingCarousel 
      visible={true}
      isOnboarding={true}
      onComplete={() => onDone(chosen, goalInfo)}
      onClose={() => onDone(chosen, goalInfo)}
    />
  );

  return null;
}

const s = StyleSheet.create({
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
  planCard:      { backgroundColor: '#FDEFE7', borderRadius: 16, padding: 16, marginBottom: 12 },
  planCardRest:  { backgroundColor: '#F2F2F4' },
  planWeekDay:   { color: colors.accent, fontWeight: '700', fontSize: 14, marginBottom: 4 },
  planTitle:     { color: colors.black, fontWeight: '800', fontSize: 20, marginBottom: 4 },
  planDesc:      { color: colors.muted, fontSize: 16, lineHeight: 22 },
  planKm:        { color: colors.muted, fontSize: 15, marginTop: 4 },
  goalLabel:     { color: colors.text, fontWeight: '700', fontSize: 13, marginBottom: 3 },
  goalSub:       { color: colors.dim, fontSize: 11 },
  // Language selector styles
  langTitle:     { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 20, marginBottom: 4 },
  langSubtitle:  { color: colors.dim, fontSize: 13, marginBottom: 20 },
  langGrid:      { gap: 8 },
  langCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 12 },
  langFlag:      { fontSize: 24 },
  langName:      { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
});
