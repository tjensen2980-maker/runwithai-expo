import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, loadCoachGreeting } from '../data';

// ============================================================
// Home.js - New AI-first home screen
// PR #4: Standalone screen that can be tested alongside the
// existing Plan screen. No existing screens are modified.
// ============================================================

const DAYS_DA = ['Son', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lor'];

function formatGreeting(t) {
  const hour = new Date().getHours();
  if (hour < 10) return 'God morgen';
  if (hour < 17) return 'God dag';
  if (hour < 22) return 'God aften';
  return 'God nat';
}

function getTodayWorkout(weekPlan) {
  if (!weekPlan || !Array.isArray(weekPlan) || weekPlan.length === 0) return null;
  const todayShort = DAYS_DA[new Date().getDay()];
  return weekPlan.find(d => d.day === todayShort) || weekPlan[0];
}

function buildAIGreeting({ profile, nextWorkout, todayWorkout }) {
  const name = (profile && profile.name) ? profile.name : '';
  const parts = [];


  // Today's training
  const tw = todayWorkout;
  if (tw && tw.rest) {
    parts.push('I dag er en hviledag - god restitution!');
  } else if (tw && (tw.workout || tw.name)) {
    const wname = tw.workout || (typeof tw.name === 'string' ? tw.name : (tw.name && tw.name.intermediate) || 'træning');
    parts.push(`I dag star der ${wname} paa programmet.`);
  } else if (nextWorkout) {
    const wn = typeof nextWorkout.name === 'string'
      ? nextWorkout.name
      : (nextWorkout.name && (nextWorkout.name.intermediate || nextWorkout.name.beginner)) || '';
    if (wn) parts.push(`Naeste traening: ${wn}.`);
  }

  // Friendly close
  if (parts.length === 0) {
    parts.push('Klar til at komme i gang? Spoerg mig om noget - planlaegning, mad eller motivation.');
  } else {
    parts.push('Spoerg mig om noget hvis du har brug for hjaelp.');
  }

  const greet = formatGreeting();
  return { name, greet, body: parts.join(' ') };
}

export default function Home({
  level,
  profile,
  weekPlan,
  nextWorkout,
  runs,
  onNavigate,
  onStartActivity,
  onOpenChat,
  isPro,
  isFree,
  onShowPricing,
}) {
  const { t } = useTranslation();
  const [chatDraft, setChatDraft] = useState('');



  // Derived values
  const todayWorkout = useMemo(() => getTodayWorkout(weekPlan), [weekPlan]);

  const greeting = useMemo(() => buildAIGreeting({
    profile,
    nextWorkout,
    todayWorkout,
  }), [profile, nextWorkout, todayWorkout]);

  // Den AEGTE hilsen fra coach-hjernen (serveren kender plan, loeb og skader).
  // Skabelon-hilsenen ovenfor bruges som fallback mens den indlaeses.
  const [liveGreeting, setLiveGreeting] = useState(null);
  useEffect(() => {
    let aktiv = true;
    loadCoachGreeting().then(g => { if (aktiv && g) setLiveGreeting(g); }).catch(() => {});
    return () => { aktiv = false; };
  }, []);

  // Weekly km from runs
  const weeklyKm = useMemo(() => {
    if (!runs || !Array.isArray(runs)) return 0;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return runs.reduce((sum, r) => {
      const t = new Date(r.date || 0).getTime();
      if (t >= weekAgo) {
        const km = parseFloat(r.km) || 0;
        return sum + km;
      }
      return sum;
    }, 0);
  }, [runs]);

  const weeklyGoal = (profile && profile.weeklyKmGoal) ? profile.weeklyKmGoal : 15;
  const milestoneTarget = 50;
  const totalKm = useMemo(() => {
    if (!runs || !Array.isArray(runs)) return 0;
    return runs.reduce((s, r) => s + (parseFloat(r.km) || 0), 0);
  }, [runs]);
  const milestoneRemaining = Math.max(0, milestoneTarget - totalKm);

  const handleSendChat = () => {
    const text = chatDraft.trim();
    if (!text) {
      if (onOpenChat) onOpenChat();
      return;
    }
    if (onOpenChat) onOpenChat(text);
    setChatDraft('');
  };

  const handleChip = (chipId) => {
    switch (chipId) {
      case 'plan':
        if (onOpenChat) onOpenChat('Hvad er min plan for i dag?');
        break;
      case 'start':
        if (onStartActivity) onStartActivity('motion');
        break;
      default:
        break;
    }
  };


  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* AI Coach hero */}
      <View style={styles.aiHero}>
        <View style={styles.aiBadgeRow}>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI COACH</Text>
          </View>
        </View>
        <Text style={styles.aiGreetingLine1}>
          {greeting.greet}{greeting.name ? `, ${greeting.name}` : ''} 👋
        </Text>
        <Text style={styles.aiGreetingBody}>{liveGreeting || greeting.body}</Text>
        <View style={styles.aiInputRow}>
          <TextInput
            style={styles.aiInput}
            value={chatDraft}
            onChangeText={setChatDraft}
            placeholder="Spoerg din AI coach..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            returnKeyType="send"
            onSubmitEditing={handleSendChat}
          />
          <TouchableOpacity style={styles.aiSendBtn} onPress={handleSendChat}>
            <Text style={styles.aiSendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        <TouchableOpacity style={[styles.chip, styles.chipPrimary]} onPress={() => handleChip('plan')}>
          <Text style={styles.chipPrimaryText}>📋 Dagens plan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip} onPress={() => handleChip('start')}>
          <Text style={styles.chipText}>🏃 Start traening</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Next workout */}
      {todayWorkout && (
        <View style={styles.nextWorkoutCard}>
          <View style={styles.nwHead}>
            <Text style={styles.nwLabel}>NAESTE TRAENING</Text>
            <View style={styles.nwBadge}><Text style={styles.nwBadgeText}>I DAG</Text></View>
          </View>
          <Text style={styles.nwTitle}>
            {todayWorkout.workout || (typeof todayWorkout.name === 'string' ? todayWorkout.name : 'Træning')}
          </Text>
          {todayWorkout.description ? (
            <Text style={styles.nwSub} numberOfLines={2}>{todayWorkout.description}</Text>
          ) : null}
          {!todayWorkout.rest && (
            <TouchableOpacity style={styles.nwCta} onPress={() => onStartActivity && onStartActivity('motion')}>
              <Text style={styles.nwCtaText}>▶ Start traening</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Dagens overblik */}
      <Text style={styles.sectionTitle}>DAGENS OVERBLIK</Text>
      <View style={styles.keyGrid}>


        <TouchableOpacity style={[styles.keyCard, styles.keyCardDark]} onPress={() => onNavigate && onNavigate('activity')}>
          <Text style={styles.keyIcon}>📏</Text>
          <Text style={[styles.keyTitle, styles.keyTitleOnDark]}>UGEN</Text>
          <Text style={[styles.keyValue, styles.keyValueOnDark]}>
            {weeklyKm.toFixed(1).replace('.', ',')} / {weeklyGoal}
          </Text>
          <Text style={[styles.keySub, styles.keySubOnDark]}>km</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.keyCard} onPress={() => onNavigate && onNavigate('stats')}>
          <Text style={styles.keyIcon}>🏆</Text>
          <Text style={styles.keyTitle}>MILEPAEL</Text>
          <Text style={[styles.keyValue, styles.keyValueSmall]}>
            {milestoneRemaining.toFixed(1).replace('.', ',')} km
          </Text>
          <Text style={styles.keySub}>til 50 km maal</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: 16, paddingBottom: 32 },

  aiHero: {
    backgroundColor: '#1a1a1a',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
  },
  aiBadgeRow: { flexDirection: 'row', marginBottom: 10 },
  aiBadge: {
    backgroundColor: 'rgba(255,87,34,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiBadgeText: { color: '#ff8a65', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  aiGreetingLine1: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  aiGreetingBody: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 20, marginBottom: 14 },
  aiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
  },
  aiInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: Platform.OS === 'ios' ? 10 : 6 },
  aiSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSendBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  chipsRow: { paddingVertical: 4, paddingRight: 16, gap: 8 },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  chipPrimaryText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  nextWorkoutCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    marginBottom: 4,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nwHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  nwLabel: { fontSize: 10, color: colors.muted, letterSpacing: 1, fontWeight: '700' },
  nwBadge: { backgroundColor: '#ffebee', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  nwBadgeText: { color: colors.accent, fontSize: 10, fontWeight: '700' },
  nwTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 4 },
  nwSub: { fontSize: 12, color: colors.muted, lineHeight: 16 },
  nwCta: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  nwCtaText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  sectionTitle: {
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 2,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 10,
  },

  keyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  keyCard: {
    width: '48%',
    minHeight: 110,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyCardAccent: { backgroundColor: '#fff3e0', borderColor: '#ffe0b2' },
  keyCardDark: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  keyIcon: { fontSize: 20, marginBottom: 4 },
  keyTitle: { fontSize: 10, color: colors.muted, letterSpacing: 1, fontWeight: '700' },
  keyValue: { fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 4 },
  keyValueSmall: { fontSize: 16 },
  keySub: { fontSize: 10, color: colors.muted, marginTop: 2 },
  keyTitleOnDark: { color: 'rgba(255,255,255,0.6)' },
  keyValueOnDark: { color: '#fff' },
  keySubOnDark: { color: 'rgba(255,255,255,0.6)' },
});
