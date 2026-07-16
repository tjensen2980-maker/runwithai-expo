import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, LEVELS, generateTrainingPlan, saveTrainingPlan } from '../data';
import OnboardingCarousel from '../components/OnboardingCarousel';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { getDeviceLanguage } from '../i18n';
import CoachIntro from './CoachIntro'; // onboarding som samtale
import { localizeWorkoutLabel } from '../utils/localizeWorkout';

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
  { code: 'el', flag: '🇬🇷', name: 'Ελληνικά' },
  { code: 'cs', flag: '🇨🇿', name: 'Čeština' },
  { code: 'ro', flag: '🇷🇴', name: 'Română' },
  { code: 'hu', flag: '🇭🇺', name: 'Magyar' },
  { code: 'bg', flag: '🇧🇬', name: 'Български' },
  { code: 'hr', flag: '🇭🇷', name: 'Hrvatski' },
  { code: 'sk', flag: '🇸🇰', name: 'Slovenčina' },
  { code: 'sl', flag: '🇸🇮', name: 'Slovenščina' },
  { code: 'lt', flag: '🇱🇹', name: 'Lietuvių' },
  { code: 'lv', flag: '🇱🇻', name: 'Latviešu' },
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

  const localizePlanDay = (value, index) => {
    const normalized = String(value || '').trim().toLowerCase().replace(/[.]/g, '');
    const aliases = {
      mon: 'mon', monday: 'mon', man: 'mon', mandag: 'mon', montag: 'mon', mo: 'mon',
      tue: 'tue', tuesday: 'tue', tir: 'tue', tirsdag: 'tue', dienstag: 'tue', di: 'tue',
      wed: 'wed', wednesday: 'wed', ons: 'wed', onsdag: 'wed', mittwoch: 'wed', mi: 'wed',
      thu: 'thu', thursday: 'thu', tor: 'thu', torsdag: 'thu', donnerstag: 'thu', do: 'thu',
      fri: 'fri', friday: 'fri', fre: 'fri', fredag: 'fri', freitag: 'fri', fr: 'fri',
      sat: 'sat', saturday: 'sat', lør: 'sat', lørdag: 'sat', samstag: 'sat', sa: 'sat',
      sun: 'sun', sunday: 'sun', søn: 'sun', søndag: 'sun', sonntag: 'sun', so: 'sun',
    };
    return aliases[normalized]
      ? t(`onboarding.plan.weekdays.${aliases[normalized]}`)
      : (value || t('onboarding.plan.day', { day: index + 1 }));
  };

  const changeLanguage = async (code) => {
    setSelectedLang(code);
    if (code === getDeviceLanguage()) {
      await AsyncStorage.multiRemove(['userLanguage', 'userLanguageDeviceBaseline']);
    } else {
      await AsyncStorage.multiSet([
        ['userLanguage', code],
        ['userLanguageDeviceBaseline', getDeviceLanguage()],
      ]);
    }
    await i18n.changeLanguage(code);
  };

  // [ONBOARDING-PLAN] Generer AI-plan ud fra brugerens onboarding-svar
  const goToPlan = async (override) => {
    setStep(4);
    setPlanError(false);
    setPlanLoading(true);
    const gi = { ...goalInfo, ...(override || {}) };
    try {
      const profile = {
        name: gi.name || "",
        age: gi.age || "",
        weeklyKm: gi.weeklyKm || "",
        goal: gi.goal || "",
        raceDate: gi.raceDate || "",
        injuries: gi.injuries || "",
        height: gi.height || "",
        weight: gi.weight || "",
        level: gi.level || "",
        language: selectedLang,
      };
      const lvl = (override && override.level) || chosen || "beginner";
      const plan = await generateTrainingPlan(profile, lvl, [], selectedLang);
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

  // ── COACH-INTERVIEW: erstatter formular-trinnene 2-3 ──────────────────
  // Sprogvalg (0) og splash (1) beholdes; plan (4) og paywall (5) genbruges.
  if (step === 2 || step === 3) {
    return (
      <CoachIntro
        onFaerdig={(svar) => {
          setGoalInfo(g => ({ ...g, ...svar }));
          setChosen(svar.level || null);
          goToPlan(svar);
        }}
      />
    );
  }
  // ── STEP 0: Language Selection ──────────────────────────────────────────────
  if (step === 0) return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.splash} showsVerticalScrollIndicator={false}>
        <View style={s.logoWrap}>
          <Text style={s.logoRun}>RUN</Text>
          <Text style={s.logoWith}>WITH</Text>
          <Text style={s.logoAi}>AI</Text>
        </View>
        
        <Text style={s.langTitle}>🌍 {t('onboarding.languageTitle')}</Text>
        <Text style={s.langSubtitle}>{t('onboarding.languageSubtitle')}</Text>
        
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
            <Text style={[s.levelTitle, { textAlign: "center" }]}>{t('onboarding.plan.building')}</Text>
            <Text style={{ color: colors.muted, marginTop: 12, textAlign: "center" }}>
              {goalInfo.name ? t('onboarding.plan.waitNamed', { name: goalInfo.name }) : t('onboarding.plan.wait')}
            </Text>
          </View>
        )}
        {!planLoading && planError && (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Text style={[s.levelTitle, { textAlign: "center" }]}>{t('onboarding.plan.errorTitle')}</Text>
            <Text style={{ color: colors.muted, marginTop: 12, textAlign: "center" }}>{t('onboarding.plan.errorMessage')}</Text>
            <TouchableOpacity style={[s.ctaBtn, { marginTop: 24 }]} onPress={() => goToPlan()}>
              <Text style={s.ctaBtnText}>{t('common.retry')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ alignItems: "center", marginTop: 12 }} onPress={() => setStep(5)}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{t('auth.continue')}</Text>
            </TouchableOpacity>
          </View>
        )}
        {!planLoading && !planError && aiPlan && (
          <View>
            <Text style={s.levelTitle}>
              {goalInfo.name ? t('onboarding.plan.readyNamed', { name: goalInfo.name }) : t('onboarding.plan.ready')}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 8, lineHeight: 20 }}>{t('onboarding.plan.basedOnAnswers')}</Text>
            {!!goalInfo.weeklyKm && <Text style={{ color: colors.muted, marginTop: 4 }}>{t('onboarding.plan.weeklyDistance', { km: goalInfo.weeklyKm })}</Text>}
            {!!goalInfo.goal && <Text style={{ color: colors.muted, marginTop: 4 }}>{t('onboarding.plan.goal', { goal: goalInfo.goal })}</Text>}
            {!!goalInfo.injuries && <Text style={{ color: colors.muted, marginTop: 4 }}>{t('onboarding.plan.considerations', { injuries: goalInfo.injuries })}</Text>}
            <View style={{ marginTop: 20 }}>
              {(aiPlan.weekPlan || aiPlan.plan || []).map((d, i) => (
                <View key={i} style={[s.planCard, d.rest && s.planCardRest]}>
                  <Text style={s.planWeekDay}>{t('onboarding.plan.weekAndDay', { week: Math.floor(i / 7) + 1, day: localizePlanDay(d.day, i) })}</Text>
                  <Text style={s.planTitle}>{d.rest ? t('workoutLabels.rest') : localizeWorkoutLabel(d.title || t('onboarding.plan.run'), t)}</Text>
                  {!!d.workout && <Text style={s.planDesc}>{localizeWorkoutLabel(d.workout, t)}</Text>}
                  {!!d.km && !d.rest && <Text style={s.planKm}>{d.km} km</Text>}
                </View>
              ))}
            </View>
            {aiPlan.summary ? (<Text style={{ color: colors.muted, marginTop: 16, lineHeight: 20 }}>{aiPlan.summary}</Text>) : null}
            <TouchableOpacity style={[s.ctaBtn, { marginTop: 28 }]} onPress={() => setStep(5)}>
              <Text style={s.ctaBtnText}>{t('auth.continue')} →</Text>
            </TouchableOpacity>
          </View>
        )}
        {!planLoading && !planError && !aiPlan && (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <TouchableOpacity style={[s.ctaBtn, { marginTop: 24 }]} onPress={() => goToPlan()}>
              <Text style={s.ctaBtnText}>{t('onboarding.plan.makePlan')}</Text>
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
