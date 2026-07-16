import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const OPTIONS = [
  { type: 'mobility', emoji: '\uD83E\uDDD8', color: '#8b5cf6' },
  { type: 'bike',     emoji: '\uD83D\uDEB4', color: '#3b82f6' },
  { type: 'other',    emoji: '\u26A1',       color: '#6b7280' },
];

export default function ActivityTypePicker({ onBack, onPick }) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.back}>{t('common.back')}</Text></TouchableOpacity>
        <Text style={s.title}>{t('activityPicker.title')}</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.intro}>{t('activityPicker.intro')}</Text>
        {OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.type}
            style={[s.card, { borderLeftColor: opt.color }]}
            onPress={() => onPick(opt.type)}
            activeOpacity={0.8}>
            <Text style={s.cardEmoji}>{opt.emoji}</Text>
            <View style={s.cardText}>
              <Text style={s.cardLabel}>{t(`activityPicker.options.${opt.type}.label`)}</Text>
              <Text style={s.cardDesc}>{t(`activityPicker.options.${opt.type}.description`)}</Text>
            </View>
            <Text style={s.cardArrow}>{'\u203A'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  back: { color: '#60a5fa', fontSize: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  scroll: { padding: 16 },
  intro: { color: '#cbd5e1', fontSize: 16, marginBottom: 16, marginTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderLeftWidth: 5, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardEmoji: { fontSize: 36, marginRight: 14 },
  cardText: { flex: 1 },
  cardLabel: { color: '#fff', fontSize: 17, fontWeight: '700' },
  cardDesc: { color: '#94a3b8', fontSize: 13, marginTop: 3 },
  cardArrow: { color: '#64748b', fontSize: 28, marginLeft: 8 },
});
