// src/screens/GoalsSetup.js
// Skaerm til at saette daglige kalorie- og makro-mal.
// Kalder GET /goals ved load og PUT /goals ved save.

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../data';
import { getGoals, updateGoals } from '../services/NutritionAPI';

// ---- Reusable input field ----
function Field({ label, value, onChange, suffix, placeholder }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={value === null || value === undefined ? '' : String(value)}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder={placeholder || ''}
          placeholderTextColor={colors.muted}
        />
        {suffix ? <Text style={s.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

// ---- Goal-type picker ----
function GoalPicker({ value, onChange }) {
  const options = [
    { id: 'lose_fat', label: 'Tab fedt' },
    { id: 'maintain', label: 'Vedligehold' },
    { id: 'gain_muscle', label: 'Byg muskler' },
    { id: 'run_faster', label: 'Løb hurtigere' },
    { id: 'run_longer', label: 'Løb længere' }
  ];
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>Primært mål</Text>
      <View style={s.pickerRow}>
        {options.map(opt => {
          const active = value === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[s.pickerBtn, active && s.pickerBtnActive]}
              onPress={() => onChange(opt.id)}>
              <Text style={[s.pickerText, active && s.pickerTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function GoalsSetup({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [primaryGoal, setPrimaryGoal] = useState(null);
  const [targetKcal, setTargetKcal] = useState('');
  const [targetProtein, setTargetProtein] = useState('');
  const [targetCarbs, setTargetCarbs] = useState('');
  const [targetFat, setTargetFat] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const g = await getGoals();
        if (!mounted) return;
        if (g) {
          setPrimaryGoal(g.primary_goal || null);
          setTargetKcal(g.target_kcal != null ? String(g.target_kcal) : '');
          setTargetProtein(g.target_protein_g != null ? String(g.target_protein_g) : '');
          setTargetCarbs(g.target_carbs_g != null ? String(g.target_carbs_g) : '');
          setTargetFat(g.target_fat_g != null ? String(g.target_fat_g) : '');
        }
      } catch (e) {
        console.log('GoalsSetup load error:', e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const parseNum = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).replace(',', '.'));
    return isNaN(n) ? null : Math.round(n);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await updateGoals({
        primary_goal: primaryGoal,
        target_kcal: parseNum(targetKcal),
        target_protein_g: parseNum(targetProtein),
        target_carbs_g: parseNum(targetCarbs),
        target_fat_g: parseNum(targetFat)
      });
      Alert.alert('Gemt', 'Dine mal er gemt.');
      if (onBack) onBack();
    } catch (e) {
      Alert.alert('Fejl', 'Kunne ikke gemme: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loaderWrap}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backTxt}>Tilbage</Text>
        </TouchableOpacity>
        <Text style={s.title}>Mine mål</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.intro}>
          Sæt dine daglige mål for kalorier og makros. App'en bruger dem til at vise dagens balance og guide dig.
        </Text>

        <GoalPicker value={primaryGoal} onChange={setPrimaryGoal} />

        <Text style={s.section}>Daglige mål</Text>

        <Field label="Kalorier" value={targetKcal} onChange={setTargetKcal} suffix="kcal" placeholder="2200" />
        <Field label="Protein" value={targetProtein} onChange={setTargetProtein} suffix="g" placeholder="150" />
        <Field label="Kulhydrater" value={targetCarbs} onChange={setTargetCarbs} suffix="g" placeholder="250" />
        <Field label="Fedt" value={targetFat} onChange={setTargetFat} suffix="g" placeholder="70" />

        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.5 }]}
          onPress={onSave}
          disabled={saving}>
          {saving
            ? <ActivityIndicator color={colors.card} />
            : <Text style={s.saveTxt}>Gem mål</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
    borderBottomColor: colors.border, backgroundColor: colors.card
  },
  backBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  backTxt: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  content: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 14, color: colors.dim, marginBottom: 16, lineHeight: 20 },
  section: {
    fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 1,
    marginTop: 16, marginBottom: 8, textTransform: 'uppercase'
  },
  fieldWrap: { marginBottom: 14 },
  label: { fontSize: 13, color: colors.muted, marginBottom: 6, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14
  },
  input: {
    flex: 1, fontSize: 16, color: colors.text, paddingVertical: Platform.OS === 'ios' ? 14 : 10
  },
  suffix: { fontSize: 14, color: colors.muted, marginLeft: 8, fontWeight: '600' },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border
  },
  pickerBtnActive: { backgroundColor: colors.accent + '20', borderColor: colors.accent },
  pickerText: { fontSize: 14, color: colors.dim, fontWeight: '600' },
  pickerTextActive: { color: colors.accent, fontWeight: '700' },
  saveBtn: {
    marginTop: 24, backgroundColor: colors.black, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center'
  },
  saveTxt: { color: colors.card, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }
});