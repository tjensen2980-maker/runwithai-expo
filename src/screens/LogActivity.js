import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logActivity } from '../services/NutritionAPI';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TYPE_META = {
  strength: { emoji: '\uD83D\uDCAA', color: '#f59e0b' },
  mobility: { emoji: '\uD83E\uDDD8', color: '#8b5cf6' },
  bike:     { emoji: '\uD83D\uDEB4', color: '#3b82f6' },
  other:    { emoji: '\u26A1',       color: '#6b7280' },
};

// MET-værdier ved RPE 5 (moderat). Skaleres lineært med RPE.
// Kilde: Compendium of Physical Activities
const BASE_MET = {
  strength: 5.0,   // generel styrketræning, moderat
  mobility: 2.5,   // yoga / stretching
  bike:     7.0,   // cykling 19-22 km/t
  other:    5.0,   // generel aktivitet
};

function calcKcal(type, durationMin, rpe, weightKg) {
  if (!durationMin || !weightKg) return 0;
  const baseMet = BASE_MET[type] || 5.0;
  // RPE 5 = base MET. RPE 1 = 0.5x, RPE 10 = 1.5x
  const rpeFactor = 0.5 + (rpe / 10);
  const met = baseMet * rpeFactor;
  const hours = durationMin / 60;
  return Math.round(met * weightKg * hours);
}

export default function LogActivity({ activityType, onBack, onDone }) {
  const { t } = useTranslation();
  const meta = TYPE_META[activityType] || TYPE_META.other;
  const activityLabel = t(`logActivity.types.${activityType || 'other'}`);
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [rpe, setRpe] = useState(5);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [weightKg, setWeightKg] = useState(75); // default fallback

  // Hent brugerens vægt fra AsyncStorage (samme som RunTracker bruger)
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('userWeightKg');
        if (stored) {
          const w = parseFloat(stored);
          if (w > 0) setWeightKg(w);
        }
      } catch (e) { /* fallback til 75 */ }
    })();
  }, []);

  // Auto-beregnet kalorier (live preview)
  const autoKcal = useMemo(
    () => calcKcal(activityType, parseInt(duration, 10), rpe, weightKg),
    [activityType, duration, rpe, weightKg]
  );

  const save = async () => {
    const dur = parseInt(duration, 10);
    if (!dur || dur <= 0) {
      Alert.alert(t('common.error'), t('logActivity.invalidDuration'));
      return;
    }
    setSaving(true);
    try {
      // Brug manuel indtastning hvis givet, ellers auto-beregnet
      const finalKcal = calories ? parseInt(calories, 10) : autoKcal;
      const payload = {
        type: activityType,
        started_at: new Date().toISOString(),
        duration_sec: dur * 60,
        calories_kcal: finalKcal > 0 ? finalKcal : null,
        perceived_effort: rpe,
        notes: notes || null,
        source: 'manual',
      };
      await logActivity(payload);
      Alert.alert(t('logActivity.savedTitle'), t('logActivity.savedMessage', { activity: activityLabel, duration: dur, calories: finalKcal }), [
        { text: 'OK', onPress: () => { if (onDone) onDone(); } }
      ]);
    } catch (e) {
      Alert.alert(t('common.error'), t('logActivity.saveError', { error: e.message }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.back}>{t('common.back')}</Text></TouchableOpacity>
        <Text style={s.title}>{meta.emoji} {activityLabel}</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.banner, { backgroundColor: meta.color }]}>
          <Text style={s.bannerEmoji}>{meta.emoji}</Text>
          <Text style={s.bannerText}>{t('logActivity.logActivity', { activity: activityLabel.toLowerCase() })}</Text>
        </View>

        <Text style={s.label}>{t('logActivity.duration')}</Text>
        <TextInput
          style={s.input}
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
          placeholder="30"
          placeholderTextColor="#9ca3af"
        />

        <Text style={s.label}>{t('logActivity.calories')}</Text>
        <TextInput
          style={s.input}
          value={calories}
          onChangeText={setCalories}
          keyboardType="number-pad"
          placeholder={autoKcal > 0 ? String(autoKcal) : '200'}
          placeholderTextColor="#9ca3af"
        />
        {autoKcal > 0 && !calories ? (
          <Text style={s.hint}>{t('logActivity.calorieEstimate', { calories: autoKcal, weight: weightKg, rpe })}</Text>
        ) : null}

        <Text style={s.label}>{t('logActivity.effort')}</Text>
        <View style={s.rpeRow}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <TouchableOpacity
              key={n}
              style={[s.rpeBtn, rpe === n && { backgroundColor: meta.color, borderColor: meta.color }]}
              onPress={() => setRpe(n)}>
              <Text style={[s.rpeText, rpe === n && { color: '#fff', fontWeight: '700' }]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>{t('logActivity.notes')}</Text>
        <TextInput
          style={[s.input, s.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('logActivity.notesPlaceholder')}
          placeholderTextColor="#9ca3af"
          multiline
        />

        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: meta.color }]}
          onPress={save}
          disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveText}>{t('logActivity.save')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  back: { color: '#60a5fa', fontSize: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  banner: { borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20 },
  bannerEmoji: { fontSize: 48, marginBottom: 8 },
  bannerText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  label: { color: '#cbd5e1', fontSize: 14, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  hint: { color: '#94a3b8', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  input: { backgroundColor: '#1e293b', color: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  rpeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rpeBtn: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#475569', backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  rpeText: { color: '#cbd5e1', fontSize: 15 },
  saveBtn: { marginTop: 24, borderRadius: 12, padding: 16, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
