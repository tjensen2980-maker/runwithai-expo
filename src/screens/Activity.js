import React, { useState, useEffect } from 'react';
import { Icon } from '../components/Icons';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Modal, Platform } from 'react-native';

import { colors, LEVELS, loadRuns, generateTrainingPlan, SERVER, getAuthToken, loadBadges, checkAndAwardBadges, loadStreak, calculateStreak, BADGES } from '../data';

// ─── NYE KOMPONENTER ──────────────────────────────────────────────────────────
import Badges, { NewBadgeCelebration } from './components/Badges';
import Streak, { StreakCard, StreakCalendar } from './components/Streak';
import SocialFeed from './components/SocialFeed';
import Integrations from './components/Integrations';

// ─── STYLES (lazy initialiseret for at undgå bundler hoisting) ───────────────
let _activityStyles = null;
function getActivityStyles() {
  if (!_activityStyles) _activityStyles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.bg },
  title:              { fontSize: 9, color: colors.muted, letterSpacing: 2, fontWeight: '700', marginBottom: 16, marginTop: 8, textTransform: 'uppercase' },
  summaryRow:         { flexDirection: 'row', gap: 8, marginBottom: 20 },
  summaryCard:        { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.05, shadowRadius:6, elevation:1 },
  summaryVal:         { fontSize: 22, fontWeight: '900', color: colors.accent, marginBottom: 4, letterSpacing: -0.5 },
  summaryLabel:       { fontSize: 9, color: colors.muted, textAlign: 'center', letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600' },
  tabs:               { flexDirection: 'row', gap: 6, marginBottom: 18, flexWrap: 'wrap' },
  tab:                { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: colors.card, minWidth: 70 },
  tabActive:          { backgroundColor: colors.black },
  tabText:            { color: colors.muted, fontWeight: '600', fontSize: 10, letterSpacing: 0.5 },
  tabTextActive:      { color: colors.card, fontWeight: '800' },
  emptyWrap:          { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji:         { fontSize: 40, marginBottom: 12 },
  emptyTitle:         { color: colors.black, fontSize: 17, fontWeight: '800', marginBottom: 8, letterSpacing: -0.3 },
  emptyDesc:          { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  planHeader:         { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  planTitle:          { color: colors.black, fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  planDate:           { color: colors.muted, fontSize: 12, marginTop: 2 },
  generateBtn:        { backgroundColor: colors.black, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  generateBtnText:    { color: colors.card, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  friendAddBox:       { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.05, shadowRadius:6, elevation:1 },
  friendAddTitle:     { color: colors.black, fontWeight: '700', fontSize: 14, marginBottom: 12, letterSpacing: -0.2 },
  friendAddRow:       { flexDirection: 'row', gap: 8, alignItems: 'center' },
  friendInput:        { flex: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 12, color: colors.text, fontSize: 14 },
  friendAddBtn:       { backgroundColor: colors.black, borderRadius: 10, width: 44, alignItems: 'center', justifyContent: 'center', height: 44 },
  friendAddBtnText:   { color: colors.card, fontSize: 22, fontWeight: '800' },
  friendAddMsg:       { color: colors.accent, fontSize: 12, marginTop: 8 },
  friendSectionTitle: { fontSize: 9, color: colors.muted, letterSpacing: 2, fontWeight: '700', marginBottom: 10, marginTop: 4, textTransform: 'uppercase' },
  friendCard:         { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.04, shadowRadius:4, elevation:1, gap: 12 },
  friendAvatar:       { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent + '15', alignItems: 'center', justifyContent: 'center' },
  friendAvatarText:   { color: colors.accent, fontWeight: '900', fontSize: 16 },
  friendName:         { color: colors.black, fontWeight: '700', fontSize: 14, letterSpacing: -0.2 },
  friendEmail:        { color: colors.muted, fontSize: 11, marginTop: 2 },
  acceptBtn:          { backgroundColor: colors.green + '15', borderRadius: 8, padding: 8 },
  acceptBtnText:      { color: colors.green, fontWeight: '800', fontSize: 13 },
  rejectBtn:          { backgroundColor: colors.surface, borderRadius: 8, padding: 8 },
  rejectBtnText:      { color: colors.muted, fontWeight: '800', fontSize: 13 },
  card:               { backgroundColor: colors.card, borderRadius: 18, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:8, elevation:2 },
  cardHeader:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  runType:            { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  runDate:            { color: colors.muted, fontSize: 11, marginTop: 3 },
  runKm:              { color: colors.black, fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  shareIcon:          { backgroundColor: colors.surface, borderRadius: 8, padding: 7 },
  shareIconText:      { fontSize: 13 },
  metrics:            { flexDirection: 'row', gap: 20 },
  metric:             { alignItems: 'center' },
  metricVal:          { color: colors.black, fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  metricLabel:        { color: colors.muted, fontSize: 9, marginTop: 2, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: '600' },
  splitsPreview:      { flexDirection: 'row', gap: 4, marginTop: 12, flexWrap: 'wrap' },
  splitPill:          { backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, alignItems: 'center' },
  splitPillKm:        { color: colors.muted, fontSize: 9, fontWeight: '600' },
  splitPillPace:      { color: colors.black, fontSize: 11, fontWeight: '800' },
  splitsMore:         { color: colors.muted, fontSize: 12, alignSelf: 'center' },
  progressCard:       { backgroundColor: colors.card, borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.05, shadowRadius:6, elevation:1 },
  sectionTitle:       { fontSize: 9, color: colors.muted, letterSpacing: 2, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase' },
  metricPicker:       { flexDirection: 'row', gap: 6, marginBottom: 14 },
  metricBtn:          { flex: 1, paddingVertical: 7, borderRadius: 9, alignItems: 'center', backgroundColor: colors.surface },
  metricBtnActive:    { backgroundColor: colors.black },
  metricBtnText:      { color: colors.muted, fontSize: 11, fontWeight: '600' },
  metricBtnTextActive:{ color: colors.card, fontWeight: '800' },
  trendRow:           { flexDirection: 'row', gap: 8, marginTop: 8 },
  trendBadge:         { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, padding: 8 },
  trendIcon:          { fontSize: 12 },
  trendText:          { fontSize: 11, fontWeight: '700' },
  weekWrap:           { gap: 6 },
  dayRow:             { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 12, gap: 12, shadowColor: '#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.04, shadowRadius:4, elevation:1 },
  dayLeft:            { width: 36 },
  dayName:            { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  dayMid:             { flex: 1 },
  dayWorkout:         { color: colors.black, fontSize: 13, fontWeight: '600', letterSpacing: -0.2 },
  dayDesc:            { color: colors.muted, fontSize: 11, marginTop: 2 },
  dayKm:              { fontSize: 13, fontWeight: '800', letterSpacing: -0.3, color: colors.black },
  feedCard:           { backgroundColor: colors.card, borderRadius: 18, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.05, shadowRadius:6, elevation:1 },
  feedHeader:         { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  feedName:           { color: colors.black, fontWeight: '700', fontSize: 14, letterSpacing: -0.2 },
  feedDate:           { color: colors.muted, fontSize: 11, marginTop: 2 },
  feedKm:             { color: colors.accent, fontSize: 22, fontWeight: '900', marginLeft: 'auto', letterSpacing: -0.5 },
  feedStats:          { flexDirection: 'row', gap: 6, marginBottom: 10 },
  feedStat:           { color: colors.muted, fontSize: 12 },
  feedDot:            { color: colors.muted, fontSize: 12 },
  kudosRow:           { flexDirection: 'row', gap: 8, alignItems: 'center' },
  kudosBtn:           { backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  kudosEmoji:         { fontSize: 16 },
  kudosCount:         { color: colors.muted, fontSize: 12, marginLeft: 4 },
  // Streak section styles
  streakSection:      { marginBottom: 16 },
  });
  return _activityStyles;
}

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────
function fmtTime(secs) {
  if (!secs) return '–';
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function fmtPace(secsPerKm) {
  if (!secsPerKm) return '–';
  return `${Math.floor(secsPerKm / 60)}:${String(Math.round(secsPerKm % 60)).padStart(2,'0')}`;
}
function fmtDate(dateStr) {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  const days = ['Søn','Man','Tir','Ons','Tor','Fre','Lør'];
  const months = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
  return `${days[d.getDay()]} ${d.getDate()}. ${months[d.getMonth()]}`;
}
function fmtShortDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
  return `${d.getDate()}. ${months[d.getMonth()]}`;
}

// ─── EFFORT SCORE ─────────────────────────────────────────────────────────────
function computeEffortScore(run, allRuns) {
  if (!run.km || !run.pace_secs_per_km) return null;
  const recent = allRuns.filter(r => r.km > 0 && r.pace_secs_per_km > 0).slice(0, 20);
  if (recent.length < 3) return null;
  const avgKm = recent.reduce((s, r) => s + r.km, 0) / recent.length;
  const avgPace = recent.reduce((s, r) => s + r.pace_secs_per_km, 0) / recent.length;
  const kmScore = (run.km / avgKm) * 5;
  const paceScore = (avgPace / run.pace_secs_per_km) * 5;
  const score = Math.min(10, (kmScore * 0.6 + paceScore * 0.4));
  const label = score >= 8 ? 'Hård' : score >= 6 ? 'Moderat' : score >= 4 ? 'Let' : 'Rolig';
  const color = score >= 8 ? colors.accent : score >= 6 ? colors.yellow : score >= 4 ? colors.green : colors.blue;
  return { score, label, color };
}

// ─── PROGRESS SECTION ─────────────────────────────────────────────────────────
function ProgressSection({ runs }) {
  const [metric, setMetric] = useState('km');
  const recent = runs.filter(r => r.km > 0).slice(0, 10);
  const older = runs.filter(r => r.km > 0).slice(10, 20);
  const recentAvgKm = recent.length ? recent.reduce((s, r) => s + r.km, 0) / recent.length : 0;
  const olderAvgKm = older.length ? older.reduce((s, r) => s + r.km, 0) / older.length : 0;
  const recentAvgPace = recent.filter(r => r.pace_secs_per_km).length ? recent.filter(r => r.pace_secs_per_km).reduce((s, r) => s + r.pace_secs_per_km, 0) / recent.filter(r => r.pace_secs_per_km).length : 0;
  const olderAvgPace = older.filter(r => r.pace_secs_per_km).length ? older.filter(r => r.pace_secs_per_km).reduce((s, r) => s + r.pace_secs_per_km, 0) / older.filter(r => r.pace_secs_per_km).length : 0;
  const kmTrend = olderAvgKm > 0 ? ((recentAvgKm - olderAvgKm) / olderAvgKm * 100).toFixed(0) : null;
  const paceTrend = olderAvgPace > 0 ? ((olderAvgPace - recentAvgPace) / olderAvgPace * 100).toFixed(0) : null;
  const kmUp = kmTrend && parseFloat(kmTrend) > 0;
  const kmPct = kmTrend ? `${Math.abs(parseFloat(kmTrend))}%` : '';
  const paceImproved = paceTrend && parseFloat(paceTrend) > 0;
  const pacePct = paceTrend ? `${Math.abs(parseFloat(paceTrend))}%` : '';

  return (
    <View style={getActivityStyles().progressCard}>
      <Text style={getActivityStyles().sectionTitle}>FREMGANG</Text>
      <View style={getActivityStyles().metricPicker}>
        {[{ id: 'km', label: 'Distance' }, { id: 'pace', label: 'Pace' }].map(m => (
          <TouchableOpacity key={m.id} style={[getActivityStyles().metricBtn, metric === m.id && getActivityStyles().metricBtnActive]} onPress={() => setMetric(m.id)}>
            <Text style={[getActivityStyles().metricBtnText, metric === m.id && getActivityStyles().metricBtnTextActive]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {runs.filter(r => r.km > 0).length < 2 ? (
        <Text style={{ color: colors.dim, fontSize: 12, textAlign: 'center', paddingVertical: 20 }}>Løb mere for at se grafen</Text>
      ) : null}
      <View style={getActivityStyles().trendRow}>
        {kmTrend && (
          <View style={[getActivityStyles().trendBadge, { backgroundColor: kmUp ? colors.green + '20' : colors.red + '20' }]}>
            <Text style={getActivityStyles().trendIcon}>{kmUp ? '↑' : '↓'}</Text>
            <Text style={[getActivityStyles().trendText, { color: kmUp ? colors.green : colors.red }]}>{kmPct} distance {kmUp ? 'mere' : 'mindre'}</Text>
          </View>
        )}
        {paceTrend && (
          <View style={[getActivityStyles().trendBadge, { backgroundColor: paceImproved ? colors.green + '20' : colors.red + '20' }]}>
            <Text style={getActivityStyles().trendIcon}>{paceImproved ? '↑' : '↓'}</Text>
            <Text style={[getActivityStyles().trendText, { color: paceImproved ? colors.green : colors.red }]}>{pacePct} pace {paceImproved ? 'forbedring' : 'langsommere'}</Text>
          </View>
        )}
        {!kmTrend && !paceTrend && <Text style={{ color: colors.dim, fontSize: 12 }}>Løb mere for at se din fremgang</Text>}
      </View>
    </View>
  );
}

// ─── SHARE MODAL ──────────────────────────────────────────────────────────────
const sm = StyleSheet.create({
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  title:        { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  runPreview:   { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 16 },
  previewKm:    { color: colors.accent, fontSize: 28, fontWeight: '900', marginBottom: 4 },
  previewRow:   { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  previewStat:  { color: colors.dim, fontSize: 13 },
  previewDot:   { color: colors.muted, fontSize: 13 },
  previewDate:  { color: colors.muted, fontSize: 11, marginTop: 4 },
  urlBox:       { backgroundColor: colors.surface, borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  urlText:      { color: colors.dim, fontSize: 12 },
  shareBtn:     { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  shareBtnText: { color: colors.black, fontWeight: '800', fontSize: 15 },
  copyBtn:      { backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  copyBtnText:  { color: colors.text, fontWeight: '600', fontSize: 13 },
  closeBtn:     { alignItems: 'center', paddingVertical: 8 },
  closeBtnText: { color: colors.dim, fontSize: 14 },
});

function ShareModal({ run, visible, onClose }) {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const r = await fetch(`${SERVER}/runs/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ run_id: run.id, km: run.km, duration_secs: run.duration_secs, pace_secs_per_km: run.pace_secs_per_km, avg_hr: run.avg_hr }),
      });
      const data = await r.json();
      setShareUrl(`https://dist-lilac-zeta-14.vercel.app/shared/${data.shareId}`);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const copy = () => {
    if (Platform.OS === 'web') navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nativeShare = () => {
    if (Platform.OS === 'web' && navigator.share) {
      navigator.share({ title: 'Mit løb', text: `Jeg løb ${run.km?.toFixed(1)} km!`, url: shareUrl });
    } else { copy(); }
  };

  useEffect(() => { if (visible && !shareUrl) share(); }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sm.backdrop}>
        <View style={sm.sheet}>
          <Text style={sm.title}>Del dit løb</Text>
          <View style={sm.runPreview}>
            <Text style={sm.previewKm}>{run?.km?.toFixed(2)} km</Text>
            <View style={sm.previewRow}>
              <Text style={sm.previewStat}>{fmtPace(run?.pace_secs_per_km)}/km</Text>
              <Text style={sm.previewDot}>·</Text>
              <Text style={sm.previewStat}>{fmtTime(run?.duration_secs)}</Text>
              {run?.avg_hr ? <><Text style={sm.previewDot}>·</Text><Text style={sm.previewStat}>{run.avg_hr} bpm</Text></> : null}
            </View>
            <Text style={sm.previewDate}>{fmtDate(run?.date)}</Text>
          </View>
          {loading && <ActivityIndicator color={colors.accent} style={{ marginVertical: 20 }} />}
          {shareUrl && (
            <>
              <View style={sm.urlBox}><Text style={sm.urlText} numberOfLines={1}>{shareUrl}</Text></View>
              <TouchableOpacity style={sm.shareBtn} onPress={nativeShare}>
                <Text style={sm.shareBtnText}>{copied ? '✓ Kopieret!' : 'Del løbet'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={sm.copyBtn} onPress={copy}>
                <Text style={sm.copyBtnText}>{copied ? '✓ Kopieret!' : 'Kopier link'}</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={sm.closeBtn} onPress={onClose}>
            <Text style={sm.closeBtnText}>Luk</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── EFFORT SCORE STYLES ──────────────────────────────────────────────────────
const ef = StyleSheet.create({
  badge:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', backgroundColor: colors.surface },
  score:  { fontSize: 14, fontWeight: '900', letterSpacing: -0.5 },
  label:  { fontSize: 8, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 1 },
});

// ─── RUN CARD ─────────────────────────────────────────────────────────────────
function RunCard({ run, level, allRuns, onDelete }) {
  const [showShare, setShowShare] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const km = run.km?.toFixed(2) || '–';
  const pace = fmtPace(run.pace_secs_per_km);
  const time = fmtTime(run.duration_secs);
  const hr = run.avg_hr ? `${run.avg_hr} bpm` : '–';
  const splits = (() => { try { return run.splits ? JSON.parse(run.splits) : []; } catch { return []; } })();
  const metrics = level === 'beginner'
    ? [{ label: 'Pace', val: pace + '/km' }, { label: 'Tid', val: time }]
    : [{ label: 'Pace', val: pace + '/km' }, { label: 'Tid', val: time }, { label: 'Puls', val: hr }];

  const effort = computeEffortScore(run, allRuns);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = getAuthToken();
      await fetch(`${SERVER}/runs/${run.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      onDelete?.(run.id);
    } catch {}
    setDeleting(false);
    setConfirmDelete(false);
  };

  return (
    <>
      <View style={[getActivityStyles().card, { borderLeftColor: colors.accent, borderLeftWidth: 3 }]}>
        <View style={getActivityStyles().cardHeader}>
          <View>
            <Text style={getActivityStyles().runType}>Løb</Text>
            <Text style={getActivityStyles().runDate}>{fmtDate(run.date)}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {effort && (
              <View style={[ef.badge, { borderColor: effort.color + '60', backgroundColor: effort.color + '18' }]}>
                <Text style={[ef.score, { color: effort.color }]}>{effort.score.toFixed(1)}</Text>
                <Text style={[ef.label, { color: effort.color }]}>{effort.label}</Text>
              </View>
            )}
            <Text style={getActivityStyles().runKm}>{km} km</Text>
            <TouchableOpacity onPress={() => setShowShare(true)} style={getActivityStyles().shareIcon}>
              <Icon name="arrow_up" size={16} color={colors.muted}/>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setConfirmDelete(true)} style={{ padding: 6 }}>
              <Icon name='x' size={16} color={colors.muted}/>
            </TouchableOpacity>
          </View>
        </View>
        <View style={getActivityStyles().metrics}>
          {metrics.map(m => (
            <View key={m.label} style={getActivityStyles().metric}>
              <Text style={getActivityStyles().metricVal}>{m.val}</Text>
              <Text style={getActivityStyles().metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
        {splits.length > 0 && (
          <View style={getActivityStyles().splitsPreview}>
            {splits.slice(0, 6).map((sp, i) => (
              <View key={i} style={getActivityStyles().splitPill}>
                <Text style={getActivityStyles().splitPillKm}>{sp.km} km</Text>
                <Text style={getActivityStyles().splitPillPace}>{fmtPace(sp.pace_secs)}</Text>
              </View>
            ))}
            <Text style={getActivityStyles().splitsMore}>→</Text>
          </View>
        )}
      </View>

      {confirmDelete && (
        <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16, marginTop: -8, marginBottom: 8, borderWidth: 1, borderColor: colors.red + '40' }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 4 }}>Slet dette løb?</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}>Det forsvinder fra statistik og historik.</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => setConfirmDelete(false)} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: colors.dim, fontWeight: '600' }}>Annuller</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} disabled={deleting} style={{ flex: 1, backgroundColor: colors.red + '20', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.red }}>
              <Text style={{ color: colors.red, fontWeight: '700' }}>{deleting ? '...' : 'Slet løb'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ShareModal run={run} visible={showShare} onClose={() => setShowShare(false)} />
    </>
  );
}

// ─── WEEK PLAN CARD ───────────────────────────────────────────────────────────
function WeekPlanCard({ plan }) {
  return (
    <View style={getActivityStyles().weekWrap}>
      {plan.map((day, i) => (
        <View key={i} style={[getActivityStyles().dayRow, { borderLeftColor: day.color, borderLeftWidth: 3 }]}>
          <View style={getActivityStyles().dayLeft}>
            <Text style={getActivityStyles().dayName}>{day.day}</Text>
          </View>
          <View style={getActivityStyles().dayMid}>
            <Text style={getActivityStyles().dayWorkout}>{day.workout}</Text>
            {day.description ? <Text style={getActivityStyles().dayDesc}>{day.description}</Text> : null}
          </View>
          {day.km > 0 ? <Text style={[getActivityStyles().dayKm, { color: day.color }]}>{day.km} km</Text> : null}
        </View>
      ))}
    </View>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Activity({ level, profile, weekPlan, onSetWeekPlan, trainingPlan: propTrainingPlan, onTrainingPlanChange, runs: propRuns }) {
  const [runs, setRuns] = useState(propRuns || []);
  const [loading, setLoading] = useState(!propRuns);
  const [activeTab, setActiveTab] = useState('runs');
  const [trainingPlan, setTrainingPlan] = useState(propTrainingPlan || null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [feed, setFeed] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [friendMsg, setFriendMsg] = useState('');
  
  // NYE STATES TIL BADGES & STREAK
  const [newBadges, setNewBadges] = useState([]);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });

  useEffect(() => {
    if (propRuns) { setRuns(propRuns); setLoading(false); return; }
    loadRuns().then(r => { setRuns(r || []); setLoading(false); });
  }, [propRuns]);

  // Beregn streak når runs ændres
  useEffect(() => {
    if (runs.length > 0) {
      const s = calculateStreak(runs);
      setStreak(s);
    }
  }, [runs]);

  useEffect(() => { if (activeTab === 'friends' || activeTab === 'feed') loadFriends(); }, [activeTab]);
  useEffect(() => { if (propTrainingPlan) setTrainingPlan(propTrainingPlan); }, [propTrainingPlan]);

  const loadFriends = async () => {
    setLoadingFriends(true);
    const headers = { Authorization: `Bearer ${getAuthToken()}` };
    const [fr, fe] = await Promise.all([
      fetch(`${SERVER}/friends`, { headers }).then(r => r.json()),
      fetch(`${SERVER}/friends/feed`, { headers }).then(r => r.json()),
    ]);
    setFriends(fr.friends || []); setPending(fr.pending || []); setFeed(fe.feed || []);
    setLoadingFriends(false);
  };

  const respondFriend = async (id, accept) => {
    await fetch(`${SERVER}/friends/${id}/respond`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` }, body: JSON.stringify({ accept }) });
    loadFriends();
  };

  const deleteRun = (id) => {
    setRuns(prev => prev.filter(r => r.id !== id));
  };

  const totalKm = runs.reduce((a, r) => a + (r.km || 0), 0).toFixed(1);
  const bestPace = runs.reduce((b, r) => r.pace_secs_per_km && (!b || r.pace_secs_per_km < b) ? r.pace_secs_per_km : b, null);
  const validRuns = runs.filter(r => r.km > 0);
  const fmtPaceLocal = (s) => s ? `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}` : '–';

  // TABS MED NYE FEATURES
  const tabs = [
    { id: 'runs', label: 'Løbehistorik' },
    { id: 'plan', label: 'AI Plan' },
    { id: 'badges', label: 'Badges' },
    { id: 'feed', label: 'Feed' },
    { id: 'friends', label: 'Venner' },
  ];

  return (
    <ScrollView style={getActivityStyles().container} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <Text style={getActivityStyles().title}>MINE LØB</Text>
      
      {/* Summary cards med streak */}
      <View style={getActivityStyles().summaryRow}>
        <View style={getActivityStyles().summaryCard}>
          <Text style={getActivityStyles().summaryVal}>{totalKm}</Text>
          <Text style={getActivityStyles().summaryLabel}>Km i alt</Text>
        </View>
        <View style={getActivityStyles().summaryCard}>
          <Text style={getActivityStyles().summaryVal}>{validRuns.length}</Text>
          <Text style={getActivityStyles().summaryLabel}>Antal løb</Text>
        </View>
        <View style={getActivityStyles().summaryCard}>
          <Text style={getActivityStyles().summaryVal}>{bestPace ? fmtPaceLocal(bestPace) : '–'}</Text>
          <Text style={getActivityStyles().summaryLabel}>Bedste pace</Text>
        </View>
      </View>

      {/* Streak sektion */}
      <View style={getActivityStyles().streakSection}>
        <StreakCard runs={runs} />
      </View>

      {/* Tabs */}
      <View style={getActivityStyles().tabs}>
        {tabs.map(t => (
          <TouchableOpacity key={t.id} style={[getActivityStyles().tab, activeTab === t.id && getActivityStyles().tabActive]} onPress={() => setActiveTab(t.id)}>
            <Text style={[getActivityStyles().tabText, activeTab === t.id && getActivityStyles().tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* LØBEHISTORIK TAB */}
      {activeTab === 'runs' && (
        loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} />
        : runs.length === 0
          ? <View style={getActivityStyles().emptyWrap}><Icon name='run' size={48} color={colors.border2}/><Text style={getActivityStyles().emptyTitle}>Ingen løb endnu</Text><Text style={getActivityStyles().emptyDesc}>Gå til dashboard og start dit første løb.</Text></View>
          : <><ProgressSection runs={runs} />{runs.map(r => <RunCard key={r.id} run={r} level={level} allRuns={runs} onDelete={deleteRun} />)}</>
      )}

      {/* AI PLAN TAB */}
      {activeTab === 'plan' && (
        <>
          <View style={getActivityStyles().planHeader}>
            <View style={{ flex: 1 }}>
              <Text style={getActivityStyles().planTitle}>Ugentlig træningsplan</Text>
              {trainingPlan?.generated_at && <Text style={getActivityStyles().planDate}>Genereret {new Date(trainingPlan.generated_at).toLocaleDateString('da-DK')}</Text>}
            </View>
            <TouchableOpacity style={getActivityStyles().generateBtn} disabled={generatingPlan} onPress={async () => {
              setGeneratingPlan(true);
              const t = await generateTrainingPlan(profile, level, runs);
              if (t?.data) { setTrainingPlan(t); if (onTrainingPlanChange) onTrainingPlanChange(t); if (onSetWeekPlan) onSetWeekPlan(t.data); }
              setGeneratingPlan(false);
            }}>
              {generatingPlan ? <ActivityIndicator color={colors.card} size="small" /> : <Text style={getActivityStyles().generateBtnText}>✨ Generer ny</Text>}
            </TouchableOpacity>
          </View>
          {trainingPlan
            ? <WeekPlanCard plan={trainingPlan.data} />
            : <View style={getActivityStyles().emptyWrap}><Icon name='calendar' size={48} color={colors.border2}/><Text style={getActivityStyles().emptyTitle}>Ingen plan endnu</Text><Text style={getActivityStyles().emptyDesc}>Tryk "Generer ny" for en AI træningsplan.</Text></View>}
        </>
      )}

      {/* BADGES TAB - NY! */}
      {activeTab === 'badges' && (
        <Badges />
      )}

      {/* SOCIAL FEED TAB - NY! */}
      {activeTab === 'feed' && (
        <SocialFeed />
      )}

      {/* VENNER TAB */}
      {activeTab === 'friends' && (
        <>
          <View style={getActivityStyles().friendAddBox}>
            <Text style={getActivityStyles().friendAddTitle}>Tilføj ven</Text>
            <View style={getActivityStyles().friendAddRow}>
              <TextInput style={getActivityStyles().friendInput} placeholder="Email adresse..." placeholderTextColor={colors.muted} value={friendEmail} onChangeText={setFriendEmail} keyboardType="email-address" autoCapitalize="none" />
              <TouchableOpacity style={getActivityStyles().friendAddBtn} onPress={async () => {
                if (!friendEmail.trim()) return;
                const r = await fetch(`${SERVER}/friends/request`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` }, body: JSON.stringify({ email: friendEmail.trim() }) });
                const d = await r.json();
                setFriendMsg(d.ok ? '✓ Anmodning sendt!' : d.error || 'Fejl');
                if (d.ok) setFriendEmail('');
                setTimeout(() => setFriendMsg(''), 3000);
              }}><Text style={getActivityStyles().friendAddBtnText}>+</Text></TouchableOpacity>
            </View>
            {!!friendMsg && <Text style={getActivityStyles().friendAddMsg}>{friendMsg}</Text>}
          </View>
          {pending.length > 0 && (<>
            <Text style={getActivityStyles().friendSectionTitle}>VENNEANMODNINGER</Text>
            {pending.map(f => { const name = f.profile_data && JSON.parse(f.profile_data).name || f.email; return (
              <View key={f.id} style={getActivityStyles().friendCard}>
                <View style={getActivityStyles().friendAvatar}><Text style={getActivityStyles().friendAvatarText}>{name[0]?.toUpperCase()}</Text></View>
                <Text style={getActivityStyles().friendName}>{name}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginLeft: 'auto' }}>
                  <TouchableOpacity style={getActivityStyles().acceptBtn} onPress={() => respondFriend(f.id, true)}><Text style={{ color: colors.green, fontWeight: '700' }}>✓</Text></TouchableOpacity>
                  <TouchableOpacity style={getActivityStyles().rejectBtn} onPress={() => respondFriend(f.id, false)}><Text style={{ color: colors.muted, fontWeight: '700' }}>✕</Text></TouchableOpacity>
                </View>
              </View>
            );})}
          </>)}
          {loadingFriends ? <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
          : friends.filter(f => f.status === 'accepted').length === 0
            ? <View style={getActivityStyles().emptyWrap}><Text style={{ fontSize: 40, marginBottom: 12 }}>👥</Text><Text style={getActivityStyles().emptyTitle}>Ingen venner endnu</Text><Text style={getActivityStyles().emptyDesc}>Tilføj en ven med deres email.</Text></View>
            : (<>
                <Text style={getActivityStyles().friendSectionTitle}>VENNER</Text>
                {friends.filter(f => f.status === 'accepted').map(f => { const name = f.profile_data && JSON.parse(f.profile_data).name || f.email; return (
                  <View key={f.id} style={getActivityStyles().friendCard}>
                    <View style={getActivityStyles().friendAvatar}><Text style={getActivityStyles().friendAvatarText}>{name[0]?.toUpperCase()}</Text></View>
                    <View><Text style={getActivityStyles().friendName}>{name}</Text><Text style={getActivityStyles().friendEmail}>{f.email}</Text></View>
                  </View>
                );})}
              </>)
          }
        </>
      )}

      {/* Badge celebration modal */}
      {newBadges.length > 0 && (
        <NewBadgeCelebration 
          badges={newBadges}
          onDismiss={() => setNewBadges([])}
        />
      )}

    </ScrollView>
  );
}

// Eksporter også kalender og andre komponenter der måtte være nødvendige
// Eksporter RunCalendar fra separat fil
export { RunCalendar } from './components/RunCalendar';
