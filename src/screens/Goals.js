import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, SafeAreaView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, SERVER, getAuthToken } from '../data';
import { getGoals, updateGoals } from '../services/NutritionAPI';

// Ugedage brugt til "Foretrukne dage"
const WEEK_DAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'LÃ¸r', 'SÃ¸n'];

function Field({ label, value, onChange, keyboard, placeholder, suffix }) {
    return (
          <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>
        <View style={s.inputRow}>
        <TextInput
            style={s.input}
          value={value === null || value === undefined ? '' : String(value)}
                      onChangeText={onChange}
          keyboardType={keyboard || 'default'}
          placeholder={placeholder || ''}
          placeholderTextColor={colors.muted}
        />
{suffix ? <Text style={s.suffix}>{suffix}</Text> : null}
  </View>
  </View>
   );
}

export default function Goals({ profile, onProfileChange, onBack }) {
    const { t } = useTranslation();
    const [form, setForm] = useState(profile || {});
    const [saved, setSaved] = useState(false);
    const [loadingDaily, setLoadingDaily] = useState(true);

  // ERNÃRINGSPLAN local state
  const [primaryGoal, setPrimaryGoal] = useState((profile && profile.primaryGoal) || 'maintain');
    const [goalPace, setGoalPace] = useState((profile && profile.goalPace) || 'normal');
    const [activityLevel, setActivityLevel] = useState((profile && profile.activityLevel) || 'moderate');
    const [planType, setPlanType] = useState((profile && profile.planType) || 'balanced');
    const [targetWeight, setTargetWeight] = useState((profile && profile.targetWeight) ? String(profile.targetWeight) : '');
    const [calcResult, setCalcResult] = useState(null);
    const [calculating, setCalculating] = useState(false);

  // DAGLIGE MÃL (flettet ind fra tidligere GoalsSetup)
  const [targetKcal, setTargetKcal] = useState('');
    const [targetProtein, setTargetProtein] = useState('');
    const [targetCarbs, setTargetCarbs] = useState('');
    const [targetFat, setTargetFat] = useState('');

  // Hent daglige mÃ¥l fra server ved load
  useEffect(() => {
        let mounted = true;
        (async () => {
                try {
                          const g = await getGoals();
                          if (!mounted || !g) return;
                          if (g.primary_goal) setPrimaryGoal(g.primary_goal);
                          setTargetKcal(g.target_kcal != null ? String(g.target_kcal) : '');
                          setTargetProtein(g.target_protein_g != null ? String(g.target_protein_g) : '');
                          setTargetCarbs(g.target_carbs_g != null ? String(g.target_carbs_g) : '');
                          setTargetFat(g.target_fat_g != null ? String(g.target_fat_g) : '');
                } catch (e) {
                          console.log('Goals load error:', e && e.message);
                } finally {
                          if (mounted) setLoadingDaily(false);
                }
        })();
        return () => { mounted = false; };
  }, []);

  const field = (key) => ({
        value: form[key] || '',
        onChange: (v) => setForm(f => ({ ...f, [key]: v })),
  });

  const parseNum = (v) => {
        if (v === null || v === undefined || v === '') return null;
        const n = Number(String(v).replace(',', '.'));
        return isNaN(n) ? null : Math.round(n);
  };

  const calculateGoals = async () => {
        setCalculating(true);
        try {
                const token = await getAuthToken();
                const body = {
                          primary_goal: primaryGoal,
                          goal_pace: goalPace,
                          activity_level: activityLevel,
                          plan_type: planType,
                };
                if (targetWeight) body.target_weight_kg = parseFloat(targetWeight);

          const res = await fetch(`${SERVER}/goals/auto`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(body),
          });
                const data = await res.json();
                if (res.ok) {
                          setCalcResult(data);
                          // ForhÃ¥ndsudfyld de daglige felter med beregnet resultat
                  if (data.target_kcal != null) setTargetKcal(String(data.target_kcal));
                          if (data.target_protein_g != null) setTargetProtein(String(data.target_protein_g));
                          if (data.target_carbs_g != null) setTargetCarbs(String(data.target_carbs_g));
                          if (data.target_fat_g != null) setTargetFat(String(data.target_fat_g));
          // Auto-save calculated goals so MealPlan and other screens see the new values
          // even if the user forgets to press the manual Gem button below.
          try {
            // 1. Update App profile-state so other screens (MealPlan) see new values immediately
            if (onProfileChange) {
              onProfileChange({
                ...form,
                primaryGoal,
                goalPace,
                activityLevel,
                planType,
                targetWeight,
                target_kcal: data.target_kcal,
                target_protein_g: data.target_protein_g,
                target_carbs_g: data.target_carbs_g,
                target_fat_g: data.target_fat_g,
              });
            }
            // 2. Persist daily goals to server so getGoals() returns them on next load
            await updateGoals({
              primary_goal: primaryGoal,
              target_kcal: data.target_kcal != null ? data.target_kcal : null,
              target_protein_g: data.target_protein_g != null ? data.target_protein_g : null,
              target_carbs_g: data.target_carbs_g != null ? data.target_carbs_g : null,
              target_fat_g: data.target_fat_g != null ? data.target_fat_g : null,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          } catch (saveErr) {
            Alert.alert('Auto-save fejlede', (saveErr && saveErr.message) || 'Tryk paa Gem-knappen for at gemme manuelt');
          }
                } else {
                          Alert.alert('Fejl', data.error || 'Kunne ikke beregne');
                }
        } catch (err) {
                Alert.alert('Fejl', 'Server-forbindelse fejlede');
        }
        setCalculating(false);
  };

  const save = async () => {
        // Gem profil-baserede felter lokalt
        const updated = { ...form, primaryGoal, goalPace, activityLevel, planType, targetWeight };
        if (onProfileChange) onProfileChange(updated);

        // Gem daglige mÃ¥l via NutritionAPI
        try {
                await updateGoals({
                          primary_goal: primaryGoal,
                          target_kcal: parseNum(targetKcal),
                          target_protein_g: parseNum(targetProtein),
                          target_carbs_g: parseNum(targetCarbs),
                          target_fat_g: parseNum(targetFat),
                });
        } catch (e) {
                Alert.alert('Fejl', 'Kunne ikke gemme daglige mÃ¥l: ' + (e && e.message));
                return;
        }

        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
  };

  return (
        <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.pageTitle}>{t('more.menu.goals') || 'MÃ¥l'}</Text>

{/* ââ UGENTLIGE MÃL ââ */}
        <Text style={s.sectionTitle}>{t('settings.sections.weeklyGoals') || 'Ugentlige mÃ¥l'}</Text>
        <View style={s.card}>
          <Field label={t('settings.fields.weeklyKm') || 'Km denne uge'} {...field('weeklyKm')} keyboard="numeric" placeholder="25" />
                    <Field label={t('settings.fields.weeklyKmGoal') || 'MÃ¥l km/uge'} value={form.weeklyKmGoal || ''} onChange={v => setForm(f => ({ ...f, weeklyKmGoal: v }))} keyboard="numeric" placeholder="30" />
                    <Field label={t('settings.fields.weeklyRunsGoal') || 'MÃ¥l lÃ¸b/uge'} value={form.weeklyRunsGoal || ''} onChange={v => setForm(f => ({ ...f, weeklyRunsGoal: v }))} keyboard="numeric" placeholder="3" />
                    <Text style={[s.label, { marginBottom: 8 }]}>{t('settings.fields.preferredDays') || 'Foretrukne dage'}</Text>
          <View style={s.daysRow}>
        {WEEK_DAYS.map(day => {
                        const active = (form.preferredDays || []).includes(day);
                        return (
                                          <TouchableOpacity
                            key={day}
                            style={[s.dayBtn, active && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                            onPress={() => setForm(f => {
                                                  const current = f.preferredDays || [];
                                                  return { ...f, preferredDays: active ? current.filter(d => d !== day) : [...current, day] };
                            })}>
                                                <Text style={[s.dayBtnText, active && { color: colors.black || '#000' }]}>{day}</Text>
                              </TouchableOpacity>
                        );
})}
</View>
  </View>

{/* ââ ERNÃRINGSPLAN ââ */}
        <Text style={s.sectionTitle}>ð ERNÃRINGSPLAN</Text>
        <View style={s.card}>
        {/* HovedmÃ¥l */}
                    <Text style={[s.label, { marginBottom: 8 }]}>HOVEDMÃL</Text>
          <View style={s.goalGrid}>
        {[
        { id: 'lose_fat', label: 'ð¥ Tabe fedt' },
        { id: 'maintain', label: 'âï¸ Vedligeholde' },
        { id: 'gain_muscle', label: 'ðª Bygge muskler' },
        { id: 'run_faster', label: 'â¡ LÃ¸b hurtigere' },
        { id: 'run_longer', label: 'ð LÃ¸b lÃ¦ngere' },
                      ].map(g => (
                                      <TouchableOpacity
                                            key={g.id}
                style={[s.goalBtn, primaryGoal === g.id && { borderColor: colors.accent, backgroundColor: colors.accent + '15' }]}
                onPress={() => setPrimaryGoal(g.id)}>
                                  <Text style={[s.goalBtnText, primaryGoal === g.id && { color: colors.accent }]}>{g.label}</Text>
                  </TouchableOpacity>
            ))}
              </View>

{/* Takt */}
          <Text style={[s.label, { marginBottom: 8, marginTop: 8 }]}>TAKT</Text>
          <View style={s.sexRow}>
          {[
                { id: 'slow', label: 'Langsom' },
          { id: 'normal', label: 'Normal' },
          { id: 'fast', label: 'Hurtig' },
                        ].map(p => (
                                        <TouchableOpacity
                                              key={p.id}
                style={[s.sexBtn, goalPace === p.id && { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}
                onPress={() => setGoalPace(p.id)}>
                                  <Text style={[s.sexBtnText, goalPace === p.id && { color: colors.accent }]}>{p.label}</Text>
                  </TouchableOpacity>
            ))}
              </View>

{/* Aktivitetsniveau */}
          <Text style={[s.label, { marginBottom: 8, marginTop: 14 }]}>AKTIVITETSNIVEAU</Text>
          <View style={s.goalGrid}>
          {[
          { id: 'sedentary', label: 'ðª Stillesiddende' },
          { id: 'light', label: 'ð¶ Let' },
          { id: 'moderate', label: 'ð Moderat' },
          { id: 'active', label: 'ð¨ Aktiv' },
          { id: 'very_active', label: 'ð¥ Meget aktiv' },
                        ].map(a => (
                                        <TouchableOpacity
                                              key={a.id}
                style={[s.goalBtn, activityLevel === a.id && { borderColor: colors.accent, backgroundColor: colors.accent + '15' }]}
                onPress={() => setActivityLevel(a.id)}>
                                  <Text style={[s.goalBtnText, activityLevel === a.id && { color: colors.accent }]}>{a.label}</Text>
                  </TouchableOpacity>
            ))}
              </View>

{/* Plan-type */}
          <Text style={[s.label, { marginBottom: 8, marginTop: 14 }]}>MAKRO-FORDELING</Text>
          <View style={s.goalGrid}>
          {[
          { id: 'balanced', label: 'Balanceret (25/50/25)' },
          { id: 'high_protein', label: 'HÃ¸jt protein (35/40/25)' },
          { id: 'low_carb', label: 'Lav-kulhydrat (30/25/45)' },
          { id: 'keto', label: 'Keto (25/5/70)' },
                        ].map(p => (
                                        <TouchableOpacity
                                              key={p.id}
                style={[s.goalBtn, planType === p.id && { borderColor: colors.accent, backgroundColor: colors.accent + '15' }]}
                onPress={() => setPlanType(p.id)}>
                                  <Text style={[s.goalBtnText, planType === p.id && { color: colors.accent }]}>{p.label}</Text>
                  </TouchableOpacity>
            ))}
              </View>

{/* MÃ¥l-vÃ¦gt (valgfri) */}
{(primaryGoal === 'lose_fat' || primaryGoal === 'gain_muscle') && (
              <View style={{ marginTop: 14 }}>
              <Field
                label="MÃL-VÃGT (KG, VALGFRI)"
                value={targetWeight}
                onChange={setTargetWeight}
                keyboard="numeric"
                placeholder="70"
              />
                  </View>
          )}

{/* Beregn-knap */}
          <TouchableOpacity
            style={[s.saveBtn, { marginTop: 8 }]}
            onPress={calculateGoals}
            disabled={calculating}>
            {calculating
                           ? <ActivityIndicator color={colors.black || '#000'} />
                            : <Text style={s.saveBtnText}>â¨ Beregn mit kaloriemÃ¥l</Text>}
              </TouchableOpacity>

            {/* Resultat */}
             {calcResult && calcResult.target_kcal && (
                          <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Text style={[s.label, { marginBottom: 10 }]}>BEREGNET MÃL</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: colors.muted, fontSize: 13 }}>Dagligt kaloriemÃ¥l</Text>
                <Text style={{ color: colors.accent, fontSize: 18, fontWeight: '900' }}>{calcResult.target_kcal} kcal</Text>
              </View>
{calcResult.bmr_kcal && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>BMR (hvile-forbrug)</Text>
                  <Text style={{ color: colors.text, fontSize: 13 }}>{calcResult.bmr_kcal} kcal</Text>
  </View>
              )}
{calcResult.tdee_kcal && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>TDEE (totalt forbrug)</Text>
                  <Text style={{ color: colors.text, fontSize: 13 }}>{calcResult.tdee_kcal} kcal</Text>
  </View>
              )}
</View>
          )}
</View>

{/* ââ MINE DAGLIGE MÃL (manuelt justerbare, gemmes pÃ¥ serveren) ââ */}
        <Text style={s.sectionTitle}>Mine daglige mÃ¥l</Text>
        <View style={s.card}>
          <Text style={[s.label, { marginBottom: 6 }]}>
                      Beregnet ovenfor â du kan finjustere her. VÃ¦rdier gemmes nÃ¥r du trykker Gem.
          </Text>
{loadingDaily ? (
              <ActivityIndicator color={colors.accent} />
          ) : (
                        <>
                          <Field
                label="Kalorier per dag"
                value={targetKcal}
                onChange={setTargetKcal}
                keyboard="numeric"
                suffix="kcal"
                placeholder="2200"
              />
                                <Field
                label="Protein per dag"
                value={targetProtein}
                onChange={setTargetProtein}
                keyboard="numeric"
                suffix="g"
                placeholder="150"
              />
                                <Field
                label="Kulhydrater per dag"
                value={targetCarbs}
                onChange={setTargetCarbs}
                keyboard="numeric"
                suffix="g"
                placeholder="220"
              />
                                <Field
                label="Fedt per dag"
                value={targetFat}
                onChange={setTargetFat}
                keyboard="numeric"
                suffix="g"
                placeholder="70"
              />
                  </>
          )}
</View>

{/* ââ LÃBETYPE PRÃFERENCER ââ */}
        <Text style={s.sectionTitle}>{t('settings.sections.trainingTypes') || 'LÃ¸betype-prÃ¦ferencer'}</Text>
        <View style={s.card}>
          <Text style={[s.label, { marginBottom: 10 }]}>{t('settings.fields.preferredTypes') || 'Foretrukne typer'}</Text>
          <View style={s.goalGrid}>
        {[
        { id: 'easy', label: t('settings.runTypes.easy') || 'Let' },
        { id: 'interval', label: t('settings.runTypes.interval') || 'Interval' },
        { id: 'tempo', label: t('settings.runTypes.tempo') || 'Tempo' },
        { id: 'long', label: t('settings.runTypes.long') || 'Langt' },
        { id: 'trail', label: t('settings.runTypes.trail') || 'Trail' },
        { id: 'race', label: t('settings.runTypes.race') || 'Konkurrence' },
                      ].map(typ => {
                                      const active = (form.preferredTypes || []).includes(typ.id);
                                      return (
                                                        <TouchableOpacity
                                          key={typ.id}
                                              style={[s.goalBtn, active && { borderColor: colors.accent, backgroundColor: colors.accent + '15' }]}
                                          onPress={() => setForm(f => {
                                                                const types = f.preferredTypes || [];
                                                                return { ...f, preferredTypes: active ? types.filter(x => x !== typ.id) : [...types, typ.id] };
                                          })}>
                                                              <Text style={[s.goalBtnText, active && { color: colors.accent }]}>{typ.label}</Text>
                            </TouchableOpacity>
                                          );
          })}
</View>
  </View>

        <TouchableOpacity style={s.saveBtn} onPress={save}>
            <Text style={s.saveBtnText}>{saved ? 'â ' + (t('settings.actions.saved') || 'Gemt') : (t('settings.actions.save') || 'Gem')}</Text>
  </TouchableOpacity>
  </ScrollView>
  </SafeAreaView>
  );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 16, paddingBottom: 80 },
    pageTitle: { fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: 8 },
    sectionTitle: { fontSize: 11, color: colors.muted, letterSpacing: 1.5, fontWeight: '700', marginTop: 18, marginBottom: 8, textTransform: 'uppercase' },
    card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, gap: 10 },
    fieldWrap: { gap: 6 },
    label: { fontSize: 12, color: colors.muted, fontWeight: '600' },
    inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 12 },
    input: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 10 },
    suffix: { color: colors.muted, fontSize: 13, marginLeft: 8 },
    sexRow: { flexDirection: 'row', gap: 8 },
    sexBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.bg },
    sexBtnText: { color: colors.text, fontWeight: '600' },
    goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    goalBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: 'transparent', backgroundColor: colors.bg },
    goalBtnText: { color: colors.text, fontWeight: '600' },
    saveBtn: { marginTop: 24, backgroundColor: colors.accent, borderRadius: 12, padding: 14, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    daysRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    dayBtn: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border2 || colors.border || '#333', backgroundColor: colors.surface || colors.bg },
    dayBtnText: { color: colors.dim || colors.muted, fontSize: 12, fontWeight: '600' },
});
