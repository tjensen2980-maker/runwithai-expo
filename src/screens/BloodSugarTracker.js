import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  Platform,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors } from '../data';
import {
  loadDiabetesProfile,
  getTargetsForType,
  DEFAULT_TARGETS,
} from '../utils/diabetes';
import {
  READING_CONTEXTS,
  CONTEXT_LABELS,
  loadReadings,
  saveReading,
  deleteReading,
  categorizeReading,
  computeStats,
  filterByDays,
} from '../utils/bloodSugar';

const RANGES = [
  { key: '1d', days: 1 },
  { key: '7d', days: 7 },
  { key: '30d', days: 30 },
  { key: '90d', days: 90 },
];

const CONTEXT_OPTIONS = [
  { id: READING_CONTEXTS.FASTING, labelKey: 'bloodSugar.ctx.fasting', fallback: 'Fastende' },
  { id: READING_CONTEXTS.PRE_MEAL, labelKey: 'bloodSugar.ctx.preMeal', fallback: 'Foer maaltid' },
  { id: READING_CONTEXTS.POST_MEAL, labelKey: 'bloodSugar.ctx.postMeal', fallback: 'Efter maaltid' },
  { id: READING_CONTEXTS.BEDTIME, labelKey: 'bloodSugar.ctx.bedtime', fallback: 'Sengetid' },
  { id: READING_CONTEXTS.PRE_EXERCISE, labelKey: 'bloodSugar.ctx.preExercise', fallback: 'Foer motion' },
  { id: READING_CONTEXTS.POST_EXERCISE, labelKey: 'bloodSugar.ctx.postExercise', fallback: 'Efter motion' },
  { id: READING_CONTEXTS.RANDOM, labelKey: 'bloodSugar.ctx.random', fallback: 'Tilfaeldig' },
];

function formatTime(ts) {
  try {
    const d = new Date(ts);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return dd + '/' + mm + ' ' + hh + ':' + min;
  } catch (e) {
    return '';
  }
}

function categoryColor(cat) {
  if (cat === 'low' || cat === 'belowTarget') return '#ff4444';
  if (cat === 'high' || cat === 'aboveTarget') return '#ffaa00';
  if (cat === 'inRange') return '#44cc66';
  return colors.muted;
}

export default function BloodSugarTracker({ onBack }) {
  const { t } = useTranslation();
  const [readings, setReadings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [rangeKey, setRangeKey] = useState('7d');
  const [modalVisible, setModalVisible] = useState(false);
  const [valueInput, setValueInput] = useState('');
  const [contextChoice, setContextChoice] = useState(READING_CONTEXTS.RANDOM);
  const [noteInput, setNoteInput] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const [list, prof] = await Promise.all([loadReadings(), loadDiabetesProfile()]);
    setReadings(list);
    setProfile(prof);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const targets = profile ? getTargetsForType(profile.diabetesType) : DEFAULT_TARGETS;
  const currentRange = RANGES.find(r => r.key === rangeKey) || RANGES[1];
  const windowReadings = filterByDays(readings, currentRange.days);
  const stats = computeStats(windowReadings, profile);

  const closeModal = () => {
    Keyboard.dismiss();
    setModalVisible(false);
  };

  const handleAdd = async () => {
    Keyboard.dismiss();
    const v = parseFloat(String(valueInput).replace(',', '.'));
    if (!isFinite(v) || v <= 0 || v > 40) {
      Alert.alert(
        t('bloodSugar.errInvalidTitle', 'Ugyldig vaerdi'),
        t('bloodSugar.errInvalidBody', 'Indtast en blodsukker-vaerdi mellem 1.0 og 40.0 mmol/L.')
      );
      return;
    }
    setSaving(true);
    const res = await saveReading({
      valueMmolL: v,
      context: contextChoice,
      note: noteInput.trim(),
    });
    setSaving(false);
    if (!res.ok) {
      Alert.alert(t('bloodSugar.errSaveTitle', 'Kunne ikke gemme'));
      return;
    }
    setValueInput('');
    setNoteInput('');
    setContextChoice(READING_CONTEXTS.RANDOM);
    setModalVisible(false);
    refresh();
  };

  const handleDelete = (entry) => {
    Alert.alert(
      t('bloodSugar.deleteTitle', 'Slet maaling'),
      t('bloodSugar.deleteBody', 'Er du sikker?'),
      [
        { text: t('common.cancel', 'Annuller'), style: 'cancel' },
        {
          text: t('common.delete', 'Slet'),
          style: 'destructive',
          onPress: async () => {
            await deleteReading(entry.id);
            refresh();
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

  const renderItem = ({ item }) => {
    const cat = categorizeReading(item.valueMmolL, item.context, targets);
    const color = categoryColor(cat);
    return (
      <TouchableOpacity onLongPress={() => handleDelete(item)} activeOpacity={0.7}>
        <View style={styles.entryRow}>
          <View style={[styles.entryDot, { backgroundColor: color }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.entryValue}>
              {item.valueMmolL.toFixed(1)} <Text style={styles.entryUnit}>mmol/L</Text>
            </Text>
            <Text style={styles.entryMeta}>
              {t('bloodSugar.ctx.' + item.context, CONTEXT_LABELS[item.context] || item.context)}
              {item.note ? ' - ' + item.note : ''}
            </Text>
          </View>
          <Text style={styles.entryTime}>{formatTime(item.timestamp)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>{'<-'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('bloodSugar.title', 'Blodsukker')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.rangeRow}>
          {RANGES.map(r => (
            <TouchableOpacity
              key={r.key}
              style={[styles.rangeBtn, rangeKey === r.key && styles.rangeBtnActive]}
              onPress={() => setRangeKey(r.key)}
            >
              <Text style={[styles.rangeBtnText, rangeKey === r.key && styles.rangeBtnTextActive]}>
                {t('bloodSugar.range.' + r.key, r.key)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsTop}>
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>{t('bloodSugar.stat.avg', 'Gennemsnit')}</Text>
              <Text style={styles.statValue}>{stats.avg != null ? stats.avg.toFixed(1) : '-'}</Text>
              <Text style={styles.statUnit}>mmol/L</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>{t('bloodSugar.stat.min', 'Min')}</Text>
              <Text style={styles.statValue}>{stats.min != null ? stats.min.toFixed(1) : '-'}</Text>
              <Text style={styles.statUnit}>mmol/L</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>{t('bloodSugar.stat.max', 'Max')}</Text>
              <Text style={styles.statValue}>{stats.max != null ? stats.max.toFixed(1) : '-'}</Text>
              <Text style={styles.statUnit}>mmol/L</Text>
            </View>
          </View>
          <View style={styles.tirRow}>
            <View style={styles.tirBar}>
              <View style={[styles.tirSegment, { flex: stats.lowPct || 0, backgroundColor: '#ff4444' }]} />
              <View style={[styles.tirSegment, { flex: stats.inRangePct || 0, backgroundColor: '#44cc66' }]} />
              <View style={[styles.tirSegment, { flex: stats.highPct || 0, backgroundColor: '#ffaa00' }]} />
            </View>
            <Text style={styles.tirText}>
              {t('bloodSugar.stat.tir', 'Tid i maal')}: {stats.inRangePct != null ? stats.inRangePct + '%' : '-'}
              {' '}({stats.count} {t('bloodSugar.stat.measurements', 'maalinger')})
            </Text>
          </View>
          <Text style={styles.targetText}>
            {t('bloodSugar.stat.target', 'Maal')}: {targets.fastingMin}-{targets.fastingMax} mmol/L
          </Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ {t('bloodSugar.add', 'Tilfoej maaling')}</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>{t('bloodSugar.history', 'Historik')}</Text>
        {windowReadings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {t('bloodSugar.empty', 'Ingen maalinger endnu. Tryk paa knappen ovenfor for at logge din foerste maaling.')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={windowReadings}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        <Text style={styles.disclaimerSmall}>
          {t(
            'bloodSugar.disclaimer',
            'Disse tal er kun til din egen reference. Diskuter altid moenstre med din laege eller dit diabetesteam.'
          )}
        </Text>

        <View style={{ height: 60 }} />
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.modalCard}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>{t('bloodSugar.add', 'Tilfoej maaling')}</Text>

              <Text style={styles.sectionLabel}>{t('bloodSugar.valueLabel', 'Blodsukker (mmol/L)')}</Text>
              <TextInput
                style={styles.input}
                value={valueInput}
                onChangeText={setValueInput}
                placeholder="5.6"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={Keyboard.dismiss}
                autoFocus
              />

              <Text style={styles.sectionLabel}>{t('bloodSugar.contextLabel', 'Kontekst')}</Text>
              <View style={styles.ctxGrid}>
                {CONTEXT_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.ctxBtn, contextChoice === opt.id && styles.ctxBtnActive]}
                    onPress={() => { Keyboard.dismiss(); setContextChoice(opt.id); }}
                  >
                    <Text style={[styles.ctxBtnText, contextChoice === opt.id && styles.ctxBtnTextActive]}>
                      {t(opt.labelKey, opt.fallback)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>{t('bloodSugar.noteLabel', 'Note (valgfri)')}</Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                value={noteInput}
                onChangeText={setNoteInput}
                placeholder={t('bloodSugar.notePlaceholder', 'F.eks. efter morgenmad')}
                placeholderTextColor={colors.muted}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={Keyboard.dismiss}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancel]}
                  onPress={closeModal}
                  disabled={saving}
                >
                  <Text style={styles.modalCancelText}>{t('common.cancel', 'Annuller')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalSave]}
                  onPress={handleAdd}
                  disabled={saving}
                >
                  <Text style={styles.modalSaveText}>{t('bloodSugar.save', 'Gem')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 60 },
  loading: { color: colors.text, textAlign: 'center', marginTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 0 },
  backBtn: { padding: 8, marginRight: 8 },
  backText: { color: colors.text, fontSize: 24, fontWeight: '600' },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },

  rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  rangeBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.card,
  },
  rangeBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  rangeBtnText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  rangeBtnTextActive: { color: colors.bg },

  statsCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  statsTop: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 },
  statBlock: { alignItems: 'center' },
  statLabel: { color: colors.muted, fontSize: 12 },
  statValue: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 2 },
  statUnit: { color: colors.muted, fontSize: 11 },
  tirRow: { marginBottom: 8 },
  tirBar: {
    height: 8,
    flexDirection: 'row',
    backgroundColor: '#222',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  tirSegment: { height: '100%' },
  tirText: { color: colors.muted, fontSize: 12 },
  targetText: { color: colors.muted, fontSize: 11, fontStyle: 'italic' },

  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  addBtnText: { color: colors.bg, fontSize: 15, fontWeight: '700' },

  sectionLabel: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 8, marginBottom: 6 },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },

  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  entryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  entryValue: { color: colors.text, fontSize: 16, fontWeight: '700' },
  entryUnit: { color: colors.muted, fontSize: 12, fontWeight: '400' },
  entryMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  entryTime: { color: colors.muted, fontSize: 12, marginLeft: 8 },
  separator: { height: 6 },

  disclaimerSmall: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 16,
    lineHeight: 16,
    fontStyle: 'italic',
  },

  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 15,
    marginBottom: 4,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalCard: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  ctxGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ctxBtn: {
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.card,
  },
  ctxBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  ctxBtnText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  ctxBtnTextActive: { color: colors.bg },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancel: { backgroundColor: colors.card },
  modalCancelText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  modalSave: { backgroundColor: colors.accent },
  modalSaveText: { color: colors.bg, fontSize: 15, fontWeight: '700' },
});
