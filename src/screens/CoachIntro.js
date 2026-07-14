// CoachIntro.js - Onboarding som samtale: coachen interviewer dig.
// Scriptede spoergsmaal (hurtigt og robust), aegte AI bygger planen bagefter.
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { colors } from '../data';

const KM_FOR_NIVEAU = { beginner: 5, intermediate: 15, advanced: 30 };

const SCRIPT = [
  { key: 'name', type: 'text', placeholder: 'Dit navn', q: () => 'Hej! Jeg er din personlige AI-løbecoach 🏃 Før vi går i gang, vil jeg gerne lære dig lidt at kende. Hvad hedder du?' },
  { key: 'age', type: 'number', placeholder: 'Alder', q: (s) => 'Hyggeligt at møde dig, ' + (s.name || 'du') + '! Hvor gammel er du?' },
  { key: 'height', type: 'number', placeholder: 'Højde i cm', q: () => 'Hvor høj er du? (i cm)' },
  { key: 'weight', type: 'number', placeholder: 'Vægt i kg', q: () => 'Og hvad vejer du cirka? (i kg)' },
  { key: 'level', type: 'chips', q: () => 'Tak! Hvor meget løber du i dag?', valg: [
    { id: 'beginner', label: 'Jeg er ny til løb' },
    { id: 'intermediate', label: 'Jeg løber af og til' },
    { id: 'advanced', label: 'Jeg løber fast hver uge' },
  ] },
  { key: 'goal', type: 'chips', q: () => 'Stærkt! Og hvad drømmer du om at opnå?', valg: [
    { id: '5k', label: 'Løbe 5 km' },
    { id: '10k', label: 'Løbe 10 km' },
    { id: 'half', label: 'Halvmaraton' },
    { id: 'full', label: 'Maraton' },
    { id: 'weight', label: 'Sundhed & vægttab' },
  ] },
  { key: 'injuries', type: 'text', placeholder: 'Beskriv kort - eller tryk Ingen', chip: 'Nej, ingen skader', q: () => 'Sidste spørgsmål: har du skader eller smerter, jeg skal tage hensyn til, når jeg bygger din plan?' },
];

export default function CoachIntro({ onFaerdig }) {
  const [beskeder, setBeskeder] = useState([]);
  const [svar, setSvar] = useState({});
  const [trin, setTrin] = useState(-1);
  const [skriver, setSkriver] = useState(false);
  const [input, setInput] = useState('');
  const scroll = useRef(null);
  const faerdigSendt = useRef(false);

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
          setBeskeder(b => [...b, { fra: 'coach', tekst: 'Perfekt, ' + (svar.name || '') + '! Jeg har alt, jeg skal bruge. Nu bygger jeg din personlige træningsplan 🌱' }]);
          const km = KM_FOR_NIVEAU[svar.level] || 10;
          setTimeout(() => { if (!vaek) onFaerdig({ ...svar, weeklyKm: String(km) }); }, 1400);
        }, 900);
      }
      return () => { vaek = true; };
    }
    setSkriver(true);
    const t = setTimeout(() => {
      if (vaek) return;
      setSkriver(false);
      const naeste = trin + 1 <= 0 ? 0 : trin;
      setBeskeder(b => [...b, { fra: 'coach', tekst: SCRIPT[naeste >= 0 ? naeste : 0].q(svar) }]);
    }, trin === -1 ? 700 : 850);
    return () => { vaek = true; clearTimeout(t); };
  }, [trin]);

  // Foerste spoergsmaal
  useEffect(() => { setTrin(0); }, []);

  useEffect(() => { setTimeout(() => scroll.current && scroll.current.scrollToEnd({ animated: true }), 80); }, [beskeder, skriver]);

  function afgiv(vaerdi, visning) {
    if (!stil) return;
    setBeskeder(b => [...b, { fra: 'bruger', tekst: visning || String(vaerdi) }]);
    setSvar(s => ({ ...s, [stil.key]: vaerdi }));
    setInput('');
    setTrin(t => t + 1);
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
    <KeyboardAvoidingView style={s.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.top}>
        <View style={s.aiDot} />
        <Text style={s.topTitel}>Din AI-coach</Text>
      </View>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
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
        <View style={s.inputOmraade}>
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
  safe:            { flex: 1, backgroundColor: colors.bg, paddingTop: 58 },
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
