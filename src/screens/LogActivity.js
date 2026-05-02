import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logActivity } from '../services/NutritionAPI';

const TYPE_META = {
  strength: { label: 'Styrketraening', emoji: '\uD83D\uDCAA', color: '#f59e0b' },
  mobility: { label: 'Mobility / Yoga', emoji: '\uD83E\uDDD8', color: '#8b5cf6' },
  bike:     { label: 'Cykel',           emoji: '\uD83D\uDEB4', color: '#3b82f6' },
  other:    { label: 'Anden aktivitet', emoji: '\u26A1',       color: '#6b7280' },
};

export default function LogActivity({ activityType, onBack, onDone }) {
  const meta = TYPE_META[activityType] || TYPE_META.other;
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [rpe, setRpe] = useState(5);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const dur = parseInt(duration, 10);
    if (!dur || dur <= 0) {
      Alert.alert('Fejl', 'Indtast en gyldig varighed i minutter');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type: activityType,
        started_at: new Date().toISOString(),
        duration_sec: dur * 60,
        calories_kcal: calories ? parseInt(calories, 10) : null,
        perceived_effort: rpe,
        notes: notes || null,
        source: 'manual',
      };
      await logActivity(payload);
      Alert.alert('Gemt!', meta.label + ' logget (' + dur + ' min)', [
        { text: 'OK', onPress: () => { if (onDone) onDone(); } }
      ]);
    } catch (e) {
      Alert.alert('Fejl', 'Kunne ikke gemme: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.back}>Tilbage</Text></TouchableOpacity>
        <Text style={s.title}>{meta.emoji} {meta.label}</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.banner, { backgroundColor: meta.color }]}>
          <Text style={s.bannerEmoji}>{meta.emoji}</Text>
          <Text style={s.bannerText}>Log din {meta.label.toLowerCase()}</Text>
        </View>

        <Text style={s.label}>Varighed (minutter) *</Text>
        <TextInput
          style={s.input}
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
          placeholder="30"
          placeholderTextColor="#9ca3af"
        />

        <Text style={s.label}>Kalorier (valgfri)</Text>
        <TextInput
          style={s.input}
          value={calories}
          onChangeText={setCalories}
          keyboardType="number-pad"
          placeholder="200"
          placeholderTextColor="#9ca3af"
        />

        <Text style={s.label}>Anstrengelse (RPE 1-10)</Text>
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

        <Text style={s.label}>Noter (valgfri)</Text>
        <TextInput
          style={[s.input, s.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="F.eks. oevelser, vaegt, sets..."
          placeholderTextColor="#9ca3af"
          multiline
        />

        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: meta.color }]}
          onPress={save}
          disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveText}>Gem traening</Text>}
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
  input: { backgroundColor: '#1e293b', color: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  rpeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rpeBtn: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#475569', backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  rpeText: { color: '#cbd5e1', fontSize: 15 },
  saveBtn: { marginTop: 24, borderRadius: 12, padding: 16, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});