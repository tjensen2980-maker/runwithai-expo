import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, SafeAreaView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, assessProfile } from '../data';

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

export default function Profile({ profile, onProfileChange, onBack }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(profile || {});
  const [saved, setSaved] = useState(false);

  const field = (key) => ({
    value: form[key] || '',
    onChange: (v) => setForm(f => ({ ...f, [key]: v })),
  });

  const goals = [
    { id: 'fitness', label: t('settings.goals.fitness') },
    { id: '5k',      label: '5 km' },
    { id: '10k',     label: '10 km' },
    { id: 'half',    label: t('settings.goals.half') },
    { id: 'full',    label: t('settings.goals.full') },
    { id: 'weight',  label: t('settings.goals.weight') },
  ];

  const a = assessProfile(form);

  const save = () => {
    if (onProfileChange) onProfileChange(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={{ paddingVertical: 8, paddingRight: 16 }}>
              <Text style={{ fontSize: 24, color: colors.text }}>‹</Text>
            </TouchableOpacity>
          )}
          <Text style={s.pageTitle}>{t('settings.sections.profile', 'Profil')}</Text>
        </View>

        {/* ── PERSONLIG INFO ── */}
        <Text style={s.sectionTitle}>{t('settings.sections.personalInfo')}</Text>
        <View style={s.card}>
          <Field label={t('settings.fields.name')} {...field('name')} placeholder="Thomas" />
          <Field label={t('settings.fields.age')} {...field('age')} keyboard="numeric" placeholder="32" />
          <SexPicker value={form.sex || 'Mand'} onChange={v => setForm(f => ({ ...f, sex: v }))} t={t} />
          <Field label={t('settings.fields.weight')} {...field('weight')} keyboard="numeric" placeholder="75" />
          <Field label={t('settings.fields.height')} {...field('height')} keyboard="numeric" placeholder="180" />
        </View>

        {/* ── LØB & MÅL ── */}
        <Text style={s.sectionTitle}>{t('settings.sections.runningGoals')}</Text>
        <View style={s.card}>
          <Field label={t('settings.fields.yearsRunning')} {...field('yearsRunning')} keyboard="numeric" placeholder="3" />
          <Text style={[s.label, { marginBottom: 8 }]}>{t('settings.fields.primaryGoal')}</Text>
          <View style={s.goalGrid}>
            {goals.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[s.goalBtn, form.goal === g.id && { borderColor: colors.accent, backgroundColor: colors.accent + '15' }]}
                onPress={() => setForm(f => ({ ...f, goal: g.id }))}>
                <Text style={[s.goalBtnText, form.goal === g.id && { color: colors.accent }]}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {['half','full','5k','10k'].includes(form.goal) && (
            <Field label={t('settings.fields.raceDate')} {...field('raceDate')} placeholder="15. sep 2025" />
          )}
        </View>

        {/* ── PULS ── */}
        <Text style={s.sectionTitle}>{t('settings.sections.heartRateZones')}</Text>
        <View style={s.card}>
          <Field label={t('settings.fields.restingHr')} {...field('restingHr')} keyboard="numeric" placeholder="58" />
          <Field label={t('settings.fields.maxHr')} {...field('maxHr')} keyboard="numeric" placeholder="185" />
          <Field label={t('settings.fields.vo2max')} {...field('vo2max')} keyboard="numeric" placeholder="52" />
          {a && (
            <View style={s.zonesWrap}>
              <Text style={s.zonesTitle}>{t('settings.zones.calculated')}</Text>
              {[
                { label: t('settings.zones.z1'), z: a.zones.z1, color: '#64b5f6' },
                { label: t('settings.zones.z2'), z: a.zones.z2, color: '#81c784' },
                { label: t('settings.zones.z3'), z: a.zones.z3, color: '#ffb74d' },
                { label: t('settings.zones.z4'), z: a.zones.z4, color: '#ff8a65' },
                { label: t('settings.zones.z5'), z: a.zones.z5, color: '#ef5350' },
              ].map(({ label, z, color }) => (
                <View key={label} style={s.zoneRow}>
                  <View style={[s.zoneDot, { backgroundColor: color }]} />
                  <Text style={s.zoneLabel}>{label}</Text>
                  <Text style={[s.zoneRange, { color }]}>{z.low}–{z.high} bpm</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── SKADER ── */}
        <Text style={s.sectionTitle}>{t('settings.sections.injuries')}</Text>
        <View style={s.card}>
          <Field label={t('settings.fields.injuries')} {...field('injuries')} placeholder={t('settings.fields.injuriesPlaceholder')} />
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={save}>
          <Text style={s.saveBtnText}>{saved ? '✓ Gemt' : 'Gem'}</Text>
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
});
