// src/screens/GoalsSetup.js
// Skærm til at sætte daglige kalorie- og makro-mål.
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
      Alert.alert('Gemt', 'Dine mål er gemt.');
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
    <SafeAreaView style={s.safe} edges={['top','left','right']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Mine mål</Text>

        <GoalPicker value={primaryGoal} onChange={setPrimaryGoal} />

        <Field
          label="Kalorier per dag"
          value={targetKcal}
          onChange={setTargetKcal}
          suffix="kcal"
          placeholder="2200"
        />
        <Field
          label="Protein per dag"
          value={targetProtein}
          onChange={setTargetProtein}
          suffix="g"
          placeholder="150"
        />
        <Field
          label="Kulhydrater per dag"
          value={targetCarbs}
          onChange={setTargetCarbs}
          suffix="g"
          placeholder="220"
        />
        <Field
          label="Fedt per dag"
          value={targetFat}
          onChange={setTargetFat}
          suffix="g"
          placeholder="70"
        />

        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          onPress={onSave}
          disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? 'Gemmer...' : 'Gem mål'}</Text>
        </TouchableOpacity>

        {onBack ? (
          <TouchableOpacity style={s.backBtn} onPress={onBack}>
            <Text style={s.backBtnText}>Tilbage</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 20 },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 14, color: colors.muted, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10
  },
  suffix: { color: colors.muted, fontSize: 14, marginLeft: 8 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.card
  },
  pickerBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  pickerText: { color: colors.muted, fontSize: 14 },
  pickerTextActive: { color: '#000', fontWeight: '700' },
  saveBtn: {
    backgroundColor: colors.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  backBtn: { padding: 14, alignItems: 'center', marginTop: 8 },
  backBtnText: { color: colors.muted, fontSize: 14 }
});