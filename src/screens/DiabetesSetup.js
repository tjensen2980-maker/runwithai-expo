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
  DIABETES_TYPES,
  TREATMENTS,
  loadDiabetesProfile,
  saveDiabetesProfile,
  clearDiabetesProfile,
  validateDiabetesProfile,
  usesInsulin,
} from '../utils/diabetes';

export default function DiabetesSetup({ onBack }) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [diabetesType, setDiabetesType] = useState(DIABETES_TYPES.NONE);
  const [treatment, setTreatment] = useState(TREATMENTS.NONE);
  const [diagnosisDate, setDiagnosisDate] = useState('');
  const [hba1c, setHba1c] = useState('');
  const [insulinCarbRatio, setInsulinCarbRatio] = useState('');
  const [correctionFactor, setCorrectionFactor] = useState('');
  const [preExerciseMin, setPreExerciseMin] = useState('');
  const [countCarbs, setCountCarbs] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await loadDiabetesProfile();
      if (p) {
        setEnabled(!!p.enabled);
        setDiabetesType(p.diabetesType || DIABETES_TYPES.NONE);
        setTreatment(p.treatment || TREATMENTS.NONE);
        setDiagnosisDate(p.diagnosisDate || '');
        setHba1c(p.hba1c ? String(p.hba1c) : '');
        setInsulinCarbRatio(p.insulinCarbRatio ? String(p.insulinCarbRatio) : '');
        setCorrectionFactor(p.correctionFactor ? String(p.correctionFactor) : '');
        setPreExerciseMin(p.preExerciseMin ? String(p.preExerciseMin) : '');
        setCountCarbs(!!p.countCarbs);
        setDisclaimerAccepted(!!p.disclaimerAccepted);
      }
      setLoaded(true);
    })();
  }, []);

  const insulinUsed = usesInsulin({ treatment });

  const handleSave = async () => {
    if (!enabled) {
      await saveDiabetesProfile({ enabled: false });
      Alert.alert(t('diabetes.setup.saved', 'Profil gemt'));
      if (onBack) onBack();
      return;
    }
    if (!disclaimerAccepted) {
      Alert.alert(t('diabetes.setup.disclaimerRequired', 'Du skal acceptere ansvarsfraskrivelsen'));
      return;
    }
    if (!diabetesType || diabetesType === DIABETES_TYPES.NONE) {
      Alert.alert(t('diabetes.setup.missingType', 'Vaelg diabetes-type'));
      return;
    }
    const profile = {
      enabled: true,
      diabetesType,
      treatment,
      diagnosisDate: diagnosisDate || null,
      hba1c: hba1c ? parseFloat(hba1c) : null,
      insulinCarbRatio: insulinCarbRatio ? parseFloat(insulinCarbRatio) : null,
      correctionFactor: correctionFactor ? parseFloat(correctionFactor) : null,
      preExerciseMin: preExerciseMin ? parseFloat(preExerciseMin) : null,
      countCarbs: !!countCarbs,
      disclaimerAccepted: true,
      disclaimerAcceptedAt: new Date().toISOString(),
    };
    const v = validateDiabetesProfile(profile);
    if (!v.ok) {
      Alert.alert('Error', 'Profile validation failed: ' + v.error);
      return;
    }
    await saveDiabetesProfile(profile);
    Alert.alert(t('diabetes.setup.saved', 'Profil gemt'));
    if (onBack) onBack();
  };

  const handleDelete = () => {
    Alert.alert(
      t('diabetes.setup.delete', 'Slet diabetes-profil'),
      t('diabetes.setup.deleteConfirm', 'Er du sikker?'),
      [
        { text: t('common.cancel', 'Annuller'), style: 'cancel' },
        {
          text: t('diabetes.setup.delete', 'Slet'),
          style: 'destructive',
          onPress: async () => {
            await clearDiabetesProfile();
            setEnabled(false);
            setDiabetesType(DIABETES_TYPES.NONE);
            setTreatment(TREATMENTS.NONE);
            setDiagnosisDate('');
            setHba1c('');
            setInsulinCarbRatio('');
            setCorrectionFactor('');
            setPreExerciseMin('');
            setCountCarbs(false);
            setDisclaimerAccepted(false);
            Alert.alert(t('diabetes.setup.deleted', 'Profil slettet'));
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

  const typeOptions = [
    { id: DIABETES_TYPES.TYPE1, labelKey: 'diabetes.setup.typeT1', fallback: 'Type 1' },
    { id: DIABETES_TYPES.TYPE2, labelKey: 'diabetes.setup.typeT2', fallback: 'Type 2' },
    { id: DIABETES_TYPES.PREDIABETES, labelKey: 'diabetes.setup.typePre', fallback: 'Praediabetes' },
    { id: DIABETES_TYPES.GESTATIONAL, labelKey: 'diabetes.setup.typeGest', fallback: 'Graviditet' },
  ];

  const treatmentOptions = [
    { id: TREATMENTS.NONE, labelKey: 'diabetes.setup.txNone', fallback: 'Ingen' },
    { id: TREATMENTS.DIET, labelKey: 'diabetes.setup.txDiet', fallback: 'Kost/livsstil' },
    { id: TREATMENTS.METFORMIN, labelKey: 'diabetes.setup.txMetformin', fallback: 'Metformin' },
    { id: TREATMENTS.ORAL_OTHER, labelKey: 'diabetes.setup.txOral', fallback: 'Andre tabletter' },
    { id: TREATMENTS.GLP1, labelKey: 'diabetes.setup.txGLP1', fallback: 'GLP-1 (Ozempic/Wegovy)' },
    { id: TREATMENTS.BASAL_INSULIN, labelKey: 'diabetes.setup.txBasal', fallback: 'Basal insulin' },
    { id: TREATMENTS.BOLUS_INSULIN, labelKey: 'diabetes.setup.txBolus', fallback: 'Basal + bolus' },
    { id: TREATMENTS.PUMP, labelKey: 'diabetes.setup.txPump', fallback: 'Insulinpumpe' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>{'<-'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('diabetes.setup.title', 'Diabetes profil')}</Text>
        </View>

        <Text style={styles.intro}>
          {t('diabetes.setup.intro', 'Aktiver diabetes-stoette for tilpassede maaltidsforslag, blodsukker-vejledning og motion.')}
        </Text>

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            {t(
              'diabetes.setup.disclaimer',
              'VIGTIGT: Denne app erstatter IKKE din laege eller dit diabetesteam. Vi foreslaar ALDRIG konkrete insulin-doser eller medicin-aendringer. Juster aldrig din behandling baseret paa app-raad alene.'
            )}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>{t('diabetes.setup.enable', 'Aktiver diabetes-stoette')}</Text>
            <Switch value={enabled} onValueChange={setEnabled} />
          </View>
        </View>

        {enabled && (
          <>
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>{t('diabetes.setup.acceptDisclaimer', 'Jeg accepterer ansvarsfraskrivelsen ovenfor')}</Text>
                <Switch value={disclaimerAccepted} onValueChange={setDisclaimerAccepted} />
              </View>
            </View>

            <Text style={styles.sectionLabel}>{t('diabetes.setup.type', 'Diabetes-type')}</Text>
            <View style={styles.typeGrid}>
              {typeOptions.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.typeBtn, diabetesType === opt.id && styles.typeBtnActive]}
                  onPress={() => setDiabetesType(opt.id)}
                >
                  <Text style={[styles.typeBtnText, diabetesType === opt.id && styles.typeBtnTextActive]}>
                    {t(opt.labelKey, opt.fallback)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>{t('diabetes.setup.treatment', 'Behandling')}</Text>
            <View style={styles.typeGrid}>
              {treatmentOptions.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.typeBtn, treatment === opt.id && styles.typeBtnActive]}
                  onPress={() => setTreatment(opt.id)}
                >
                  <Text style={[styles.typeBtnText, treatment === opt.id && styles.typeBtnTextActive]}>
                    {t(opt.labelKey, opt.fallback)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>{t('diabetes.setup.diagnosisDate', 'Diagnose-dato (valgfri)')}</Text>
            <TextInput
              style={styles.input}
              value={diagnosisDate}
              onChangeText={setDiagnosisDate}
              placeholder={t('diabetes.setup.datePlaceholder', 'AAAA-MM-DD')}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
            />

            <Text style={styles.sectionLabel}>{t('diabetes.setup.hba1c', 'HbA1c (mmol/mol, valgfri)')}</Text>
            <TextInput
              style={styles.input}
              value={hba1c}
              onChangeText={setHba1c}
              placeholder="48"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
            />

            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>{t('diabetes.setup.countCarbs', 'Jeg taeller kulhydrater')}</Text>
                <Switch value={countCarbs} onValueChange={setCountCarbs} />
              </View>
            </View>

            {insulinUsed && (
              <>
                <Text style={styles.sectionLabel}>
                  {t('diabetes.setup.carbRatio', 'Insulin/kulhydrat-ratio (g/E, valgfri)')}
                </Text>
                <Text style={styles.helperText}>
                  {t('diabetes.setup.carbRatioHelp', 'F.eks. 10 = 1 enhed insulin daekker 10 g kulhydrat. Appen doserer aldrig - tallet bruges kun informativt.')}
                </Text>
                <TextInput
                  style={styles.input}
                  value={insulinCarbRatio}
                  onChangeText={setInsulinCarbRatio}
                  placeholder="10"
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                />

                <Text style={styles.sectionLabel}>
                  {t('diabetes.setup.correctionFactor', 'Korrektionsfaktor (mmol/L pr. E, valgfri)')}
                </Text>
                <TextInput
                  style={styles.input}
                  value={correctionFactor}
                  onChangeText={setCorrectionFactor}
                  placeholder="2.5"
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                />
              </>
            )}

            <Text style={styles.sectionLabel}>
              {t('diabetes.setup.preExerciseMin', 'Mindste blodsukker foer motion (mmol/L)')}
            </Text>
            <TextInput
              style={styles.input}
              value={preExerciseMin}
              onChangeText={setPreExerciseMin}
              placeholder="6.0"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
            />
          </>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{t('diabetes.setup.save', 'Gem profil')}</Text>
        </TouchableOpacity>

        {enabled && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>{t('diabetes.setup.delete', 'Slet diabetes-profil')}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 60 },
  loading: { color: colors.text, textAlign: 'center', marginTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 8, marginRight: 8 },
  backText: { color: colors.text, fontSize: 24, fontWeight: '600' },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  intro: { color: colors.muted, fontSize: 14, marginBottom: 16, lineHeight: 20 },
  disclaimerBox: {
    backgroundColor: '#3a2a00',
    borderColor: '#ffaa00',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  disclaimerText: { color: '#ffd680', fontSize: 12, lineHeight: 18 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  label: { color: colors.text, fontSize: 15, flex: 1, marginRight: 12 },
  sectionLabel: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  helperText: { color: colors.muted, fontSize: 12, marginBottom: 6, lineHeight: 16 },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 15,
    marginBottom: 4,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    flexGrow: 1,
    minWidth: '47%',
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.card,
  },
  typeBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  typeBtnText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  typeBtnTextActive: { color: colors.bg },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: colors.bg, fontSize: 16, fontWeight: '700' },
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
