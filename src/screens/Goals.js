import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, SafeAreaView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, SERVER, getAuthToken } from '../data';

// Ugedage brugt til "Foretrukne dage"
const WEEK_DAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

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


  const field = (key) => ({
        value: form[key] || '',
        onChange: (v) => setForm(f => ({ ...f, [key]: v })),
  });



  const save = async () => {
        // Gem profil-baserede felter lokalt
        const updated = { ...form, goalPace, planType };
        if (onProfileChange) onProfileChange(updated);


        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
  };

  return (
        <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.pageTitle}>{t('more.menu.goals') || 'Mål'}</Text>

{/* ── UGENTLIGE MÅL ── */}
        <Text style={s.sectionTitle}>{t('settings.sections.weeklyGoals') || 'Ugentlige mål'}</Text>
        <View style={s.card}>
          <Field label={t('settings.fields.weeklyKm') || 'Km denne uge'} {...field('weeklyKm')} keyboard="numeric" placeholder="25" />
                    <Field label={t('settings.fields.weeklyKmGoal') || 'Mål km/uge'} value={form.weeklyKmGoal || ''} onChange={v => setForm(f => ({ ...f, weeklyKmGoal: v }))} keyboard="numeric" placeholder="30" />
                    <Field label={t('settings.fields.weeklyRunsGoal') || 'Mål løb/uge'} value={form.weeklyRunsGoal || ''} onChange={v => setForm(f => ({ ...f, weeklyRunsGoal: v }))} keyboard="numeric" placeholder="3" />
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

{/* ── LØBETYPE PRÆFERENCER ── */}
        <Text style={s.sectionTitle}>{t('settings.sections.trainingTypes') || 'Løbetype-præferencer'}</Text>
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
            <Text style={s.saveBtnText}>{saved ? '✓ ' + (t('settings.actions.saved') || 'Gemt') : (t('settings.actions.save') || 'Gem')}</Text>
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
