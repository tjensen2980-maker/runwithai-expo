// src/screens/NotificationSettings.js
// Indstillinger for lokale push-notifikationer.

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../data';
import { useTranslation } from 'react-i18next';
import {
  loadSettings, saveSettings, requestPermission, checkPermission,
  syncFromSettings, cancelAll, NOTIFICATION_DEFAULTS
} from '../utils/notifications';

export default function NotificationSettings({ onBack, upcomingWorkouts }) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(NOTIFICATION_DEFAULTS);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setSettings(s);
      const p = await checkPermission();
      setPermissionGranted(p.granted);
      setLoading(false);
    })();
  }, []);

  const update = async (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveSettings(next);
    if (permissionGranted) {
      await syncFromSettings(next, upcomingWorkouts);
    }
  };

  const handleEnableMeal = async (val) => {
    if (val && !permissionGranted) {
      const r = await requestPermission();
      if (!r.granted) {
        Alert.alert(
          'Tilladelse afvist',
          'Du skal give appen tilladelse til notifikationer i Indstillinger.'
        );
        return;
      }
      setPermissionGranted(true);
    }
    await update({ mealReminderEnabled: val });
  };

  const handleEnableWorkout = async (val) => {
    if (val && !permissionGranted) {
      const r = await requestPermission();
      if (!r.granted) {
        Alert.alert(
          'Tilladelse afvist',
          'Du skal give appen tilladelse til notifikationer i Indstillinger.'
        );
        return;
      }
      setPermissionGranted(true);
    }
    await update({ workoutReminderEnabled: val });
  };

  const setMealTime = (hour) => update({ mealReminderHour: hour });
  const setMinutesBefore = (m) => update({ workoutReminderMinutesBefore: m });

  const handleClearAll = async () => {
    Alert.alert(
      'Ryd notifikationer',
      'Vil du annullere alle planlagte notifikationer?',
      [
        { text: 'Annuller', style: 'cancel' },
        { text: 'Ryd', style: 'destructive', onPress: async () => { await cancelAll(); Alert.alert('Ryddet', 'Alle planlagte notifikationer er fjernet.'); } }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.title}>Indlaeser...</Text>
      </SafeAreaView>
    );
  }

  const HOURS = [7, 12, 18, 20, 21];
  const MINUTES_OPTIONS = [15, 30, 60, 90, 120];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backTxt}>{'< Tilbage'}</Text>
        </TouchableOpacity>
        <Text style={s.title}>Notifikationer</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {!permissionGranted ? (
          <View style={s.warningBox}>
            <Text style={s.warningTxt}>
              Notifikationer er ikke tilladt. Slaa en paamindelse til nedenfor for at give tilladelse.
            </Text>
          </View>
        ) : null}

        <View style={s.card}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Daglig maaltids-paamindelse</Text>
              <Text style={s.sublabel}>Faa en notifikation hver dag om at logge dine maaltider.</Text>
            </View>
            <Switch
              value={settings.mealReminderEnabled}
              onValueChange={handleEnableMeal}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>
          {settings.mealReminderEnabled ? (
            <View style={s.optionRow}>
              <Text style={s.optionLabel}>Tidspunkt:</Text>
              <View style={s.chips}>
                {HOURS.map(h => (
                  <TouchableOpacity
                    key={h}
                    onPress={() => setMealTime(h)}
                    style={[s.chip, settings.mealReminderHour === h ? s.chipActive : null]}
                  >
                    <Text style={[s.chipTxt, settings.mealReminderHour === h ? s.chipTxtActive : null]}>
                      {String(h).padStart(2, '0')}:00
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View style={s.card}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Traeningspaamindelse</Text>
              <Text style={s.sublabel}>Faa besked foer dit planlagte loeb.</Text>
            </View>
            <Switch
              value={settings.workoutReminderEnabled}
              onValueChange={handleEnableWorkout}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>
          {settings.workoutReminderEnabled ? (
            <View style={s.optionRow}>
              <Text style={s.optionLabel}>Minutter foer:</Text>
              <View style={s.chips}>
                {MINUTES_OPTIONS.map(m => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setMinutesBefore(m)}
                    style={[s.chip, settings.workoutReminderMinutesBefore === m ? s.chipActive : null]}
                  >
                    <Text style={[s.chipTxt, settings.workoutReminderMinutesBefore === m ? s.chipTxtActive : null]}>
                      {m} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <TouchableOpacity style={s.clearBtn} onPress={handleClearAll}>
          <Text style={s.clearTxt}>Ryd alle planlagte notifikationer</Text>
        </TouchableOpacity>

        <Text style={s.footnote}>
          Notifikationer gemmes lokalt paa din enhed. Du kan altid aendre indstillingerne her.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  backBtn: { width: 80 },
  backTxt: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  warningBox: { backgroundColor: '#fff5e6', borderColor: '#ffb84d', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14 },
  warningTxt: { color: '#7a4a00', fontSize: 13 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  sublabel: { fontSize: 12, color: colors.muted, marginTop: 4, paddingRight: 8 },
  optionRow: { marginTop: 14, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  optionLabel: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTxt: { fontSize: 13, color: colors.text, fontWeight: '600' },
  chipTxtActive: { color: colors.background, fontWeight: '700' },
  clearBtn: { marginTop: 8, padding: 14, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.red },
  clearTxt: { color: colors.red, fontWeight: '700', fontSize: 14 },
  footnote: { marginTop: 18, fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 18 },
});
