// CoachIntro.js - Onboarding som samtale: coachen interviewer dig.
// Scriptede spoergsmaal (hurtigt og robust), aegte AI bygger planen bagefter.
// Alle tekster via i18n (da/en fuldt oversat; oevrige sprog falder tilbage til en).
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../data';

const KM_FOR_NIVEAU = { beginner: 5, intermediate: 15, advanced: 30 };

export default function CoachIntro({ onFaerdig }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [beskeder, setBeskeder] = useState([]);
  const [svar, setSvar] = useState({});
  const [trin, setTrin] = useState(-1);
  const [skriver, setSkriver] = useState(false);
  const [input, setInput] = useState('');
  const scroll = useRef(null);
  const faerdigSendt = useRef(false);

  const SCRIPT = [
    { key: 'name', type: 'text', placeholder: t('coachIntro.phName'), q: () => t('coachIntro.qName') },
    { key: 'age', type: 'number', placeholder: t('coachIntro.phAge'), q: (s) => t('coachIntro.qAge', { name: s.name || t('coachIntro.fallbackYou') }) },
    { key: 'height', type: 'number', placeholder: t('coachIntro.phHeight'), q: () => t('coachIntro.qHeight') },
    { key: 'weight', type: 'number', placeholder: t('coachIntro.phWeight'), q: () => t('coachIntro.qWeight') },
    { key: 'level', type: 'chips', q: () => t('coachIntro.qLevel'), valg: [
      { id: 'beginner', label: t('coachIntro.levelBeginner') },
      { id: 'intermediate', label: t('coachIntro.levelIntermediate') },
      { id: 'advanced', label: t('coachIntro.levelAdvanced') },
    ] },
    { key: 'goal', type: 'chips', q: () => t('coachIntro.qGoal'), valg: [
      { id: '5k', label: t('coachIntro.goal5k') },
      { id: '10k', label: t('coachIntro.goal10k') },
      { id: 'half', label: t('coachIntro.goalHalf') },
      { id: 'full', label: t('coachIntro.goalFull') },
      { id: 'weight', label: t('coachIntro.goalWeight') },
    ] },
    { key: 'injuries', type: 'text', placeholder: t('coachIntro.phInjuries'), chip: t('coachIntro.injuriesNone'), q: () => t('coachIntro.qInjuries') },
  ];

  const stil = (trin >= 0 && trin < SCRIPT.length) ? SCRIPT[trin] : null;

  // Naeste coach-besked med skrive-pause
  useEffect(() => {
    let vaek = false;
    if (trin >= SCRIPT.length) {
      if (!faerdigSendt.current) {
        faerdigSendt.current = true;
        setSkriver(true);
        setTimeout(() => {
          if (vaek) return;
          setSkriver(false);
          setBeskeder(b => [...b, { fra: 'coach', tekst: t('coachIntro.done', { name: svar.name || t('coachIntro.fallbackYou') }) }]);
          const km = KM_FOR_NIVEAU[svar.level] || 10;
          setTimeout(() => { if (!vaek) onFaerdig({ ...svar, weeklyKm: String(km) }); }, 1400);
        }, 900);
      }
      return () => { vaek = true; };
    }
    setSkriver(true);
    const tid = setTimeout(() => {
      if (vaek) return;
      setSkriver(false);
      const naeste = trin + 1 <= 0 ? 0 : trin;
      setBeskeder(b => [...b, { fra: 'coach', tekst: SCRIPT[naeste >= 0 ? naeste : 0].q(svar) }]);
    }, trin === -1 ? 700 : 850);
    return () => { vaek = true; clearTimeout(tid); };
  }, [trin]);

  // Foerste spoergsmaal
  useEffect(() => { setTrin(0); }, []);

  useEffect(() => { setTimeout(() => scroll.current && scroll.current.scrollToEnd({ animated: true }), 80); }, [beskeder, skriver]);

  function afgiv(vaerdi, visning) {
    if (!stil) return;
    setBeskeder(b => [...b, { fra: 'bruger', tekst: visning || String(vaerdi) }]);
    setSvar(s => ({ ...s, [stil.key]: vaerdi }));
    setInput('');
    setTrin(x => x + 1);
  }

  function sendTekst() {
    const v = input.trim();
    if (!v) return;
    if (stil && stil.type === 'number') {
      const tal = v.replace(/[^0-9]/g, '');
      if (!tal) return;
      afgiv(tal);
    } else {
      afgiv(v);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[s.safe, { paddingTop: Math.max(58, insets.top + 12) }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.top}>
        <View style={s.aiDot} />
        <Text style={s.topTitel}>{t('coachIntro.title')}</Text>
      </View>
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {beskeder.map((b, i) => (
          <View key={i} style={[s.boble, b.fra === 'coach' ? s.bobleCoach : s.bobleBruger]}>
            <Text style={b.fra === 'coach' ? s.bobleCoachTekst : s.bobleBrugerTekst}>{b.tekst}</Text>
          </View>
        ))}
        {skriver && (
          <View style={[s.boble, s.bobleCoach, { flexDirection: 'row', gap: 5 }]}>
            <View style={s.prik} /><View style={[s.prik, { opacity: 0.6 }]} /><View style={[s.prik, { opacity: 0.3 }]} />
          </View>
        )}
      </ScrollView>
      {stil && !skriver && stil.type === 'chips' && (
        <View style={s.chipRaekke}>
          {stil.valg.map(v => (
            <TouchableOpacity key={v.id} style={s.chip} onPress={() => afgiv(v.id, v.label)}>
              <Text style={s.chipTekst}>{v.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {stil && !skriver && stil.type !== 'chips' && (
        <View style={[s.inputOmraade, { paddingBottom: Math.max(28, insets.bottom + 12) }]}>
          {stil.chip && (
            <TouchableOpacity style={[s.chip, { alignSelf: 'center', marginBottom: 10 }]} onPress={() => afgiv('', stil.chip)}>
              <Text style={s.chipTekst}>{stil.chip}</Text>
            </TouchableOpacity>
          )}
          <View style={s.inputRaekke}>
            <TextInput
              style={s.input}
              value={input}
              onChangeText={setInput}
              placeholder={stil.placeholder}
              placeholderTextColor={colors.muted}
              keyboardType={stil.type === 'number' ? 'number-pad' : 'default'}
              returnKeyType='send'
              onSubmitEditing={sendTekst}
              autoFocus
            />
            <TouchableOpacity style={s.sendKnap} onPress={sendTekst}>
              <Text style={s.sendTekst}>{'↑'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: colors.bg },
  top:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 14 },
  aiDot:           { width: 18, height: 18, borderRadius: 9, backgroundColor: '#EFFFF8', borderWidth: 4, borderColor: colors.accent2 },
  topTitel:        { color: colors.text, fontSize: 17, fontWeight: '800' },
  boble:           { maxWidth: '82%', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 10 },
  bobleCoach:      { backgroundColor: colors.card, alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  bobleBruger:     { backgroundColor: colors.accent, alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  bobleCoachTekst: { color: colors.text, fontSize: 16, lineHeight: 23 },
  bobleBrugerTekst:{ color: '#07140E', fontSize: 16, fontWeight: '700' },
  prik:            { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted },
  chipRaekke:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16, paddingBottom: 28, justifyContent: 'center' },
  chip:            { backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border2, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 18 },
  chipTekst:       { color: colors.accent2, fontSize: 15, fontWeight: '700' },
  inputOmraade:    { padding: 16, paddingBottom: 28 },
  inputRaekke:     { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input:           { flex: 1, backgroundColor: colors.card, borderRadius: 24, paddingVertical: 13, paddingHorizontal: 18, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border },
  sendKnap:        { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  sendTekst:       { color: '#07140E', fontSize: 22, fontWeight: '800' },
});
