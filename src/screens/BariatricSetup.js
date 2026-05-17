import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors } from '../data';
import {
  SURGERY_TYPES,
  loadBariatricProfile,
  saveBariatricProfile,
  clearBariatricProfile,
  validateBariatricProfile,
} from '../utils/bariatric';

export default function BariatricSetup({ onBack }) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [surgeryType, setSurgeryType] = useState(SURGERY_TYPES.NONE);
  const [surgeryDate, setSurgeryDate] = useState('');
  const [startWeight, setStartWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [height, setHeight] = useState('');
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await loadBariatricProfile();
      if (p) {
        setEnabled(!!p.enabled);
        setSurgeryType(p.surgeryType || SURGERY_TYPES.NONE);
        setSurgeryDate(p.surgeryDate || '');
        setStartWeight(p.startWeight ? String(p.startWeight) : '');
        setGoalWeight(p.goalWeight ? String(p.goalWeight) : '');
        setHeight(p.height ? String(p.height) : '');
        setDisclaimerAccepted(!!p.disclaimerAccepted);
      }
      setLoaded(true);
    })();
  }, []);

  const handleSave = async () => {
    if (!enabled) {
      // Save with disabled flag, no validation needed
      await saveBariatricProfile({ enabled: false });
      Alert.alert(t('bariatric.setup.saved', 'Profil gemt'));
      if (onBack) onBack();
      return;
    }
    if (!disclaimerAccepted) {
      Alert.alert(t('bariatric.setup.disclaimerRequired', 'Du skal acceptere ansvarsfraskrivelsen'));
      return;
    }
    if (!surgeryType || surgeryType === SURGERY_TYPES.NONE) {
      Alert.alert(t('bariatric.setup.missingType', 'Vælg type operation'));
      return;
    }
    if (!surgeryDate) {
      Alert.alert(t('bariatric.setup.invalidDate', 'Indtast en gyldig dato'));
      return;
    }
    const d = new Date(surgeryDate);
    if (isNaN(d.getTime())) {
      Alert.alert(t('bariatric.setup.invalidDate', 'Indtast en gyldig dato'));
      return;
    }
    const profile = {
      enabled: true,
      surgeryType,
      surgeryDate,
      startWeight: startWeight ? parseFloat(startWeight) : null,
      goalWeight: goalWeight ? parseFloat(goalWeight) : null,
      height: height ? parseFloat(height) : null,
      disclaimerAccepted: true,
      disclaimerAcceptedAt: new Date().toISOString(),
    };
    const v = validateBariatricProfile(profile);
    if (!v.ok) {
      Alert.alert('Error', 'Profile validation failed: ' + v.error);
      return;
    }
    await saveBariatricProfile(profile);
    Alert.alert(t('bariatric.setup.saved', 'Profil gemt'));
    if (onBack) onBack();
  };

  const handleDelete = () => {
    Alert.alert(
      t('bariatric.setup.delete', 'Slet bariatrisk profil'),
      t('bariatric.setup.deleteConfirm', 'Er du sikker?'),
      [
        { text: t('common.cancel', 'Annuller'), style: 'cancel' },
        {
          text: t('bariatric.setup.delete', 'Slet'),
          style: 'destructive',
          onPress: async () => {
            await clearBariatricProfile();
            setEnabled(false);
            setSurgeryType(SURGERY_TYPES.NONE);
            setSurgeryDate('');
            setStartWeight('');
            setGoalWeight('');
            setHeight('');
            setDisclaimerAccepted(false);
            Alert.alert(t('bariatric.setup.deleted', 'Profil slettet'));
            if (onBack) onBack();
          },
        },
      ]
    );
  };

  if (!loaded) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('bariatric.setup.title', 'Bariatrisk profil')}</Text>
        </View>

        <Text style={styles.intro}>{t('bariatric.setup.intro', '')}</Text>

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>{t('bariatric.setup.disclaimer', '')}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>{t('bariatric.setup.enable', 'Aktivér bariatrisk støtte')}</Text>
          <Switch value={enabled} onValueChange={setEnabled} />
        </View>

        {enabled && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>{t('bariatric.setup.acceptDisclaimer', '')}</Text>
              <Switch value={disclaimerAccepted} onValueChange={setDisclaimerAccepted} />
            </View>

            <Text style={styles.sectionLabel}>{t('bariatric.setup.surgeryType', 'Type operation')}</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, surgeryType === SURGERY_TYPES.SLEEVE && styles.typeBtnActive]}
                onPress={() => setSurgeryType(SURGERY_TYPES.SLEEVE)}
              >
                <Text style={[styles.typeBtnText, surgeryType === SURGERY_TYPES.SLEEVE && styles.typeBtnTextActive]}>
                  {t('bariatric.setup.surgeryTypeSleeve', 'Gastric Sleeve')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, surgeryType === SURGERY_TYPES.BYPASS && styles.typeBtnActive]}
                onPress={() => setSurgeryType(SURGERY_TYPES.BYPASS)}
              >
                <Text style={[styles.typeBtnText, surgeryType === SURGERY_TYPES.BYPASS && styles.typeBtnTextActive]}>
                  {t('bariatric.setup.surgeryTypeBypass', 'Gastric Bypass')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>{t('bariatric.setup.surgeryDate', 'Operationsdato')}</Text>
            <TextInput
              style={styles.input}
              value={surgeryDate}
              onChangeText={setSurgeryDate}
              placeholder={t('bariatric.setup.surgeryDatePlaceholder', 'ÅÅÅÅ-MM-DD')}
              placeholderTextColor="#888"
              autoCapitalize="none"
            />

            <Text style={styles.sectionLabel}>{t('bariatric.setup.startWeight', 'Startvægt (kg)')}</Text>
            <TextInput
              style={styles.input}
              value={startWeight}
              onChangeText={setStartWeight}
              placeholder="0"
              placeholderTextColor="#888"
              keyboardType="decimal-pad"
            />

            <Text style={styles.sectionLabel}>{t('bariatric.setup.goalWeight', 'Målvægt (kg)')}</Text>
            <TextInput
              style={styles.input}
              value={goalWeight}
              onChangeText={setGoalWeight}
              placeholder="0"
              placeholderTextColor="#888"
              keyboardType="decimal-pad"
            />

            <Text style={styles.sectionLabel}>{t('bariatric.setup.height', 'Højde (cm)')}</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              placeholder="0"
              placeholderTextColor="#888"
              keyboardType="decimal-pad"
            />
          </>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{t('bariatric.setup.save', 'Gem profil')}</Text>
        </TouchableOpacity>

        {enabled && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>{t('bariatric.setup.delete', 'Slet bariatrisk profil')}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors && colors.bg ? colors.bg : '#000' },
  scroll: { padding: 16 },
  loading: { color: '#fff', textAlign: 'center', marginTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 8, marginRight: 8 },
  backText: { color: '#fff', fontSize: 24 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  intro: { color: '#ccc', fontSize: 14, marginBottom: 16, lineHeight: 20 },
  disclaimerBox: {
    backgroundColor: '#3a2a00',
    borderColor: '#ffaa00',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  disclaimerText: { color: '#ffd680', fontSize: 12, lineHeight: 18 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: '#222',
    borderBottomWidth: 1,
  },
  label: { color: '#fff', fontSize: 15, flex: 1, marginRight: 12 },
  sectionLabel: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15,
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  typeBtnActive: { backgroundColor: '#c8ff00', borderColor: '#c8ff00' },
  typeBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  typeBtnTextActive: { color: '#000' },
  saveBtn: {
    backgroundColor: '#c8ff00',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  deleteBtn: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  deleteBtnText: { color: '#ff4444', fontSize: 14, fontWeight: '600' },
});
