import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, SafeAreaView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, SERVER, getAuthToken } from '../data';

function Field({ label, value, onChange, keyboard, placeholder }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value || ''}
        onChangeText={onChange}
        keyboardType={keyboard || 'default'}
        placeholder={placeholder || ''}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

function SexPicker({ value, onChange, t }) {
  const options = [
    { id: 'Mand', label: t('settings.sex.male') },
    { id: 'Kvinde', label: t('settings.sex.female') },
  ];
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{t('settings.fields.sex')}</Text>
      <View style={s.sexRow}>
        {options.map(o => (
          <TouchableOpacity
            key={o.id}
            style={[s.sexBtn, value === o.id && { borderColor: colors.accent, backgroundColor: colors.accent }]}
            onPress={() => onChange(o.id)}
          >
            <Text style={[s.sexBtnText, value === o.id && { color: '#fff' }]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function Goals({ profile, onProfileChange, onBack }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(profile || {});
  const [saved, setSaved] = useState(false);

  // ERNÆRINGSPLAN local state
  const [primaryGoal, setPrimaryGoal] = useState((profile && profile.primaryGoal) || 'maintain');
  const [goalPace, setGoalPace] = useState((profile && profile.goalPace) || 'normal');
  const [activityLevel, setActivityLevel] = useState((profile && profile.activityLevel) || 'moderate');
  const [planType, setPlanType] = useState((profile && profile.planType) || 'balanced');
  const [targetWeight, setTargetWeight] = useState((profile && profile.targetWeight) ? String(profile.targetWeight) : '');
  const [calcResult, setCalcResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const field = (key) => ({
    value: form[key] || '',
    onChange: (v) => setForm(f => ({ ...f, [key]: v })),
  });

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
    } else {
      Alert.alert('Fejl', data.error || 'Kunne ikke beregne');
    }
  } catch (err) {
    Alert.alert('Fejl', 'Server-forbindelse fejlede');
  }
  setCalculating(false);
};

  const save = () => {
    const updated = { ...form, primaryGoal, goalPace, activityLevel, planType, targetWeight };
    if (onProfileChange) onProfileChange(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.pageTitle}>{t('more.menu.goals') || 'Mål'}</Text>

        {/* ââ UGENTLIGE MÃL ââ */}
        <Text style={s.sectionTitle}>{t('settings.sections.weeklyGoals')}</Text>
        <View style={s.card}>
          <Field label={t('settings.fields.weeklyKm')} {...field('weeklyKm')} keyboard="numeric" placeholder="25" />
          <Field label={t('settings.fields.weeklyKmGoal')} value={form.weeklyKmGoal || ''} onChange={v => setForm(f => ({ ...f, weeklyKmGoal: v }))} keyboard="numeric" placeholder="30" />
          <Field label={t('settings.fields.weeklyRunsGoal')} value={form.weeklyRunsGoal || ''} onChange={v => setForm(f => ({ ...f, weeklyRunsGoal: v }))} keyboard="numeric" placeholder="3" />
          <Text style={[s.label, { marginBottom: 8 }]}>{t('settings.fields.preferredDays')}</Text>
          <View style={s.daysRow}>
            {days.map(day => {
              const active = (form.preferredDays || []).includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[s.dayBtn, active && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                  onPress={() => setForm(f => {
                    const days = f.preferredDays || [];
                    return { ...f, preferredDays: active ? days.filter(d => d !== day) : [...days, day] };
                  })}>
                  <Text style={[s.dayBtnText, active && { color: colors.black }]}>{day}</Text>
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
      { id: 'lose_fat',    label: 'ð¥ Tabe fedt' },
      { id: 'maintain',    label: 'âï¸ Vedligeholde' },
      { id: 'gain_muscle', label: 'ðª Bygge muskler' },
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
      { id: 'slow',   label: 'Langsom' },
      { id: 'normal', label: 'Normal' },
      { id: 'fast',   label: 'Hurtig' },
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
      { id: 'sedentary',   label: 'ðª Stillesiddende' },
      { id: 'light',       label: 'ð¶ Let' },
      { id: 'moderate',    label: 'ð Moderat' },
      { id: 'active',      label: 'ð¨ Aktiv' },
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
      { id: 'balanced',     label: 'Balanceret (25/50/25)' },
      { id: 'high_protein', label: 'HÃ¸jt protein (35/40/25)' },
      { id: 'low_carb',     label: 'Lav-kulhydrat (30/25/45)' },
      { id: 'keto',         label: 'Keto (25/5/70)' },
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
      ? <ActivityIndicator color={colors.black} />
      : <Text style={s.saveBtnText}>â¨ Beregn mit kaloriemÃ¥l</Text>}
  </TouchableOpacity>

  {/* Resultat */}
  {calcResult && calcResult.target_kcal && (
    <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
      <Text style={[s.label, { marginBottom: 10 }]}>DIT MÃL</Text>
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '600' }}>PROTEIN</Text>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 4 }}>{calcResult.target_protein_g}g</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '600' }}>KULHYDRAT</Text>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 4 }}>{calcResult.target_carbs_g}g</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '600' }}>FEDT</Text>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 4 }}>{calcResult.target_fat_g}g</Text>
        </View>
      </View>
    </View>
  )}
</View>


        {/* ââ LÃBETYPE PRÃFERENCER ââ */}
        <Text style={s.sectionTitle}>{t('settings.sections.trainingTypes')}</Text>
        <View style={s.card}>
          <Text style={[s.label, { marginBottom: 10 }]}>{t('settings.fields.preferredTypes')}</Text>
          <View style={s.goalGrid}>
            {[
              { id: 'easy',     label: t('settings.runTypes.easy') },
              { id: 'interval', label: t('settings.runTypes.interval') },
              { id: 'tempo',    label: t('settings.runTypes.tempo') },
              { id: 'long',     label: t('settings.runTypes.long') },
              { id: 'trail',    label: t('settings.runTypes.trail') },
              { id: 'race',     label: t('settings.runTypes.race') },
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
          <Text style={s.saveBtnText}>{saved ? '✓ ' + (t('settings.actions.saved') || 'Gemt') : (t('settings.actions.save') || 'Gem')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.bg },
  scroll:         { padding: 16, paddingBottom: 80 },
  pageTitle:      { fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: 8 },
  sectionTitle:   { fontSize: 11, color: colors.muted, letterSpacing: 1.5, fontWeight: '700', marginTop: 18, marginBottom: 8, textTransform: 'uppercase' },
  card:           { backgroundColor: colors.card, borderRadius: 14, padding: 14, gap: 10 },
  fieldWrap:      { gap: 6 },
  label:          { fontSize: 12, color: colors.muted, fontWeight: '600' },
  input:          { backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 15 },
  sexRow:         { flexDirection: 'row', gap: 8 },
  sexBtn:         { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.bg },
  sexBtnText:     { color: colors.text, fontWeight: '600' },
  goalGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalBtn:        { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: 'transparent', backgroundColor: colors.bg },
  goalBtnText:    { color: colors.text, fontWeight: '600' },
  zonesWrap:      { marginTop: 8, gap: 4 },
  zonesTitle:     { fontSize: 11, color: colors.muted, fontWeight: '700', marginBottom: 4, letterSpacing: 1 },
  zoneRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  zoneDot:        { width: 10, height: 10, borderRadius: 5 },
  zoneLabel:      { flex: 1, fontSize: 13, color: colors.text },
  zoneRange:      { fontSize: 12, color: colors.muted },
  saveBtn:        { marginTop: 24, backgroundColor: colors.accent, borderRadius: 12, padding: 14, alignItems: 'center' },
  saveBtnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  daysRow:      { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayBtn:       { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border2, backgroundColor: colors.surface },
  dayBtnText:   { color: colors.dim, fontSize: 12, fontWeight: '600' },
});
