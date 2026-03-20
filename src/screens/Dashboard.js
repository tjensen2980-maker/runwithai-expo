import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../components/Icons';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { colors, LEVELS, DEFAULT_WEEK_PLAN, SERVER, getAuthToken } from '../data';

// ─── VEJR + TRÆTHED ANBEFALING ────────────────────────────────────────────────
function WeatherAdvice({ runs, nextWorkout, level, profile }) {
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [weatherData, setWeatherData] = useState(null);

  // Beregn træthedsniveau fra seneste løb
  const fatigue = useCallback(() => {
    if (!runs || runs.length === 0) return { score: 0, label: 'Udhvilet', icon: 'zap' };
    const now = Date.now();
    const last48h = runs.filter(r => {
      const d = new Date(r.created_at || r.date || 0);
      return (now - d.getTime()) < 48 * 3600 * 1000;
    });
    const last7d = runs.filter(r => {
      const d = new Date(r.created_at || r.date || 0);
      return (now - d.getTime()) < 7 * 24 * 3600 * 1000;
    });
    const kmLast48h = last48h.reduce((s, r) => s + (r.km || 0), 0);
    const kmLast7d  = last7d.reduce((s, r) => s + (r.km || 0), 0);
    const score = Math.min(10, kmLast48h * 0.8 + kmLast7d * 0.15);
    if (score >= 7) return { score, label: 'Meget træt', icon: 'frown' };
    if (score >= 4) return { score, label: 'Let træt', icon: 'meh' };
    if (score >= 2) return { score, label: 'OK', icon: 'smile' };
    return { score, label: 'Udhvilet', icon: 'zap' };
  }, [runs]);

  // Hent vejr fra Open-Meteo (gratis, ingen API-nøgle)
  const fetchWeather = useCallback(async () => {
    setLoading(true);
    try {
      // Brug brugerens position hvis tilgængelig, ellers Aarhus som default
      let lat = 56.15, lon = 10.21;
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
        );
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch {}

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,windspeed_10m,weathercode&timezone=auto`;
      const resp = await fetch(url);
      const data = await resp.json();
      const c = data.current;

      // Vejrkode til emoji + beskrivelse
      const wCode = c.weathercode;
      let weatherDesc, weatherEmoji;
      if (wCode === 0)                        { weatherDesc = 'Klar himmel'; weatherEmoji = 'sun'; }
      else if (wCode <= 3)                    { weatherDesc = 'Let skyet'; weatherEmoji = 'cloud'; }
      else if (wCode <= 49)                   { weatherDesc = 'Tåge/dis'; weatherEmoji = 'wind'; }
      else if (wCode <= 67)                   { weatherDesc = 'Regn'; weatherEmoji = 'rain'; }
      else if (wCode <= 77)                   { weatherDesc = 'Sne'; weatherEmoji = 'snow'; }
      else if (wCode <= 82)                   { weatherDesc = 'Byger'; weatherEmoji = 'rain'; }
      else                                    { weatherDesc = 'Tordenvejr'; weatherEmoji = 'rain'; }

      const weather = {
        temp: Math.round(c.temperature_2m),
        precip: c.precipitation,
        wind: Math.round(c.windspeed_10m),
        desc: weatherDesc,
        emoji: weatherEmoji,
        bad: c.precipitation > 3 || c.windspeed_10m > 40 || wCode >= 80,
        cold: c.temperature_2m < 2,
        hot: c.temperature_2m > 28,
      };
      setWeatherData(weather);

      // Hent AI-anbefaling
      const fat = fatigue();
      const workoutName = typeof nextWorkout?.name === 'object'
        ? nextWorkout.name[level] || nextWorkout.name.intermediate
        : nextWorkout?.name || 'løb';
      const workoutKm = nextWorkout?.km || '?';

      const token = getAuthToken();
      const aiResp = await fetch(`${SERVER}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          message: `Vejr: ${weather.temp}°C, ${weather.desc}, ${weather.precip}mm regn, vind ${weather.wind} km/t.
Træthedsniveau: ${fat.label} (score ${fat.score.toFixed(1)}/10).
Planlagt træning: "${workoutName}" (${workoutKm} km).
Løber-niveau: ${level}.

Giv en KORT vejr- og træthedstilpasset anbefaling på 2-3 sætninger. Foreslå om de skal gennemføre som planlagt, justere distance (angiv konkret km), eller udskyde. Vær direkte og specifik.`,
          profile,
          level,
        }),
      });
      const aiData = await aiResp.json();
      setAdvice(aiData.reply || aiData.message || 'Ingen anbefaling tilgængelig');
    } catch (e) {
      setAdvice('Kunne ikke hente vejrdata — prøv igen.');
    }
    setLoading(false);
  }, [runs, nextWorkout, level, profile, fatigue]);

  // Hent vejr automatisk ved mount
  useEffect(() => { fetchWeather(); }, []);

  const fat = fatigue();
  const wColors = {
    'sun': '#f59e0b', 'cloud': '#94a3b8', 'rain': '#5b9bff',
    'snow': '#a5f3fc', 'wind': '#9ca3af',
  };
  const accentColor = weatherData ? (wColors[weatherData.emoji] || colors.accent) : colors.accent;

  return (
    <TouchableOpacity
      onPress={() => setExpanded(e => !e)}
      style={[s.weatherCard, { borderColor: accentColor + '60' }]}
      activeOpacity={0.8}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name={weatherData?.emoji || 'sun'} size={22} color={wColors[weatherData?.emoji] || '#f59e0b'}/>
          <View>
            <Text style={[s.weatherTitle, { color: accentColor }]}>VEJR & FORM</Text>
            {weatherData && (
              <Text style={s.weatherSub}>
                {weatherData.temp}°C · {weatherData.desc} · Vind {weatherData.wind} km/t
              </Text>
            )}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 16 }}>{fat.emoji}</Text>
          <Text style={s.fatigueLabel}>{fat.label}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </View>

      {/* Expanded anbefaling */}
      {expanded && (
        <View style={s.weatherAdviceBox}>
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={accentColor} />
              <Text style={{ color: colors.dim, fontSize: 13 }}>Analyserer vejr og form...</Text>
            </View>
          ) : (
            <>
              <Text style={s.weatherAdviceText}>{advice}</Text>
              <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); fetchWeather(); }} style={s.refreshBtn}>
                <Text style={[s.refreshBtnText, { color: accentColor }]}>↻ Opdater</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── STREAK & STATS BEREGNING ─────────────────────────────────────────────────
function computeStats(runs) {
  if (!runs || runs.length === 0) return { kmThisWeek: 0, streak: 0, runsThisWeek: 0, streakContext: null, monthContext: null };

  const now = new Date();
  const dayKey = d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  const monday = new Date(now);
  monday.setHours(0,0,0,0);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  const kmThisWeek = runs.filter(r => new Date(r.date) >= monday && r.km > 0).reduce((s,r) => s + r.km, 0);
  const runsThisWeek = runs.filter(r => new Date(r.date) >= monday && r.km > 0).length;

  // Streak
  const runDays = new Set(runs.filter(r => r.km > 0).map(r => dayKey(new Date(r.date))));
  let streak = 0;
  const checkDate = new Date(); checkDate.setHours(0,0,0,0);
  if (!runDays.has(dayKey(checkDate))) checkDate.setDate(checkDate.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    if (runDays.has(dayKey(checkDate))) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
    else break;
  }

  // ── STREAK KONTEKST ──
  // Find bedste streak nogensinde
  const sortedDays = [...runDays].sort();
  let bestStreak = 0, curStreak = 0, prevDate = null;
  for (const dk of sortedDays) {
    const d = new Date(dk.replace(/-/g, '/'));
    if (prevDate) {
      const diff = Math.round((d - prevDate) / 86400000);
      if (diff === 1) curStreak++;
      else curStreak = 1;
    } else { curStreak = 1; }
    if (curStreak > bestStreak) bestStreak = curStreak;
    prevDate = d;
  }

  // Løb denne måned vs. rekord
  const thisMonth = now.getMonth(), thisYear = now.getFullYear();
  const runsThisMonth = runs.filter(r => {
    const d = new Date(r.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear && r.km > 0;
  }).length;

  // Find bedste måned nogensinde
  const monthCounts = {};
  runs.filter(r => r.km > 0).forEach(r => {
    const d = new Date(r.date);
    const mk = `${d.getFullYear()}-${d.getMonth()}`;
    monthCounts[mk] = (monthCounts[mk] || 0) + 1;
  });
  const bestMonthCount = Math.max(0, ...Object.values(monthCounts));
  const bestMonthKey = Object.entries(monthCounts).sort((a,b) => b[1]-a[1])[0]?.[0];
  const currentMonthKey = `${thisYear}-${thisMonth}`;
  const isBestMonth = bestMonthKey === currentMonthKey;
  const toRecord = bestMonthCount - runsThisMonth;

  // Km denne måned
  const kmThisMonth = runs.filter(r => {
    const d = new Date(r.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear && r.km > 0;
  }).reduce((s,r) => s+r.km, 0);

  // Bedste km-måned
  const monthKm = {};
  runs.filter(r => r.km > 0).forEach(r => {
    const d = new Date(r.date);
    const mk = `${d.getFullYear()}-${d.getMonth()}`;
    monthKm[mk] = (monthKm[mk] || 0) + r.km;
  });
  const bestMonthKm = Math.max(0, ...Object.values(monthKm));

  // Streak kontekst-tekst
  let streakContext = null;
  if (streak > 0) {
    if (streak >= bestStreak && bestStreak > 1) streakContext = { text: `Personlig rekord`, hot: true };
    else if (streak >= bestStreak * 0.8 && bestStreak > 2) streakContext = { text: `${bestStreak - streak} fra din rekord`, hot: true };
    else if (streak >= 7) streakContext = { text: `Over 1 uge i træk`, hot: true };
    else if (streak >= 3) streakContext = { text: `Holder momentum`, hot: false };
    else streakContext = { text: `${streak === 1 ? 'Start på noget godt' : 'Fortsæt!'}`, hot: false };
  } else {
    streakContext = { text: 'Start en streak i dag', hot: false };
  }

  // Måned kontekst-tekst
  let monthContext = null;
  const monthNames = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
  if (isBestMonth && runsThisMonth > 0) {
    monthContext = { text: `Bedste ${monthNames[thisMonth]} nogensinde`, record: true };
  } else if (toRecord === 1) {
    monthContext = { text: `1 løb fra din bedste måned!`, record: false };
  } else if (toRecord <= 3 && toRecord > 0) {
    monthContext = { text: `${toRecord} løb fra rekord`, record: false };
  } else if (runsThisMonth > 0) {
    monthContext = { text: `${runsThisMonth} løb i ${monthNames[thisMonth]}`, record: false };
  }

  return {
    kmThisWeek: Math.round(kmThisWeek * 10) / 10,
    streak, runsThisWeek, bestStreak,
    runsThisMonth, bestMonthCount, toRecord,
    kmThisMonth: Math.round(kmThisMonth * 10) / 10, bestMonthKm: Math.round(bestMonthKm * 10) / 10,
    streakContext, monthContext,
  };
}

// ─── STATS PILLS ──────────────────────────────────────────────────────────────
function StatsRow({ runs, profile }) {
  const stats = computeStats(runs);
  const { kmThisWeek, streak, runsThisWeek, streakContext, monthContext, runsThisMonth, kmThisMonth, bestMonthKm } = stats;
  const weeklyGoal = profile?.weeklyKmGoal ? parseFloat(profile.weeklyKmGoal) : 20;
  const goalPct = Math.min(100, Math.round((kmThisWeek / weeklyGoal) * 100));
  const monthKmPct = bestMonthKm > 0 ? Math.min(100, Math.round((kmThisMonth / bestMonthKm) * 100)) : 0;

  return (
    <View style={s.pillRow}>
      {/* KM denne uge */}
      <View style={[s.pill, { borderColor: colors.accent + '50' }]}>
        <Text style={[s.pillVal, { color: colors.accent }]}>{kmThisWeek}</Text>
        <Text style={s.pillLabel}>KM DENNE UGE</Text>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: goalPct + '%', backgroundColor: colors.accent }]} />
        </View>
        <Text style={s.pillSub}>{goalPct}% af {weeklyGoal}km</Text>
      </View>

      {/* Streak med kontekst */}
      <View style={[s.pill, { borderColor: streak > 0 ? colors.secondary + '60' : colors.border }]}>
        <Text style={[s.pillVal, { color: streak > 0 ? colors.secondary : colors.muted }]}>
          {streak > 0 ? streak : '–'}{streak > 0 ? '' : ''}
        </Text>
        <Text style={s.pillLabel}>DAGE I TRÆK</Text>
        {streakContext && (
          <Text style={[s.pillContext, { color: streakContext.hot ? colors.secondary : colors.muted }]}>
            {streakContext.text}
          </Text>
        )}
      </View>

      {/* Måneds-løb med kontekst */}
      <View style={[s.pill, { borderColor: monthContext?.record ? colors.yellow + '60' : colors.blue + '40' }]}>
        <Text style={[s.pillVal, { color: monthContext?.record ? colors.yellow : colors.blue }]}>
          {runsThisMonth}
        </Text>
        <Text style={s.pillLabel}>LØB I MND.</Text>
        {monthContext && (
          <Text style={[s.pillContext, { color: monthContext.record ? colors.yellow : colors.muted }]}>
            {monthContext.text}
          </Text>
        )}
        {bestMonthKm > 0 && (
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: monthKmPct + '%', backgroundColor: monthContext?.record ? colors.yellow : colors.blue }]} />
          </View>
        )}
      </View>
    </View>
  );
}

// ─── WORKOUT CARD ─────────────────────────────────────────────────────────────
function WorkoutCard({ workout, level, onNavigate, onStartActivity }) {
  const lv = LEVELS[level] || LEVELS['intermediate'];
  return (
    <View style={[s.workoutCard, { borderColor: colors.accent + '35' }]}>
      <View style={s.workoutAccentLine} />
      <View style={s.workoutHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.workoutLabel}>NÆSTE TRÆNING</Text>
          <Text style={s.workoutName}>{workout.name[level]}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: colors.accent + '12', borderColor: colors.accent + '35' }]}>
          <Text style={[s.badgeText, { color: colors.accent }]}>I DAG</Text>
        </View>
      </View>

      <Text style={s.workoutDesc}>{workout.desc[level]}</Text>

      <View style={s.workoutStats}>
        <View style={s.workoutStat}>
          <Text style={s.workoutStatVal}>{workout.km} km</Text>
          <Text style={s.workoutStatLabel}>Distance</Text>
        </View>
        <View style={s.workoutStat}>
          <Text style={s.workoutStatVal}>~{workout.duration} min</Text>
          <Text style={s.workoutStatLabel}>Tid</Text>
        </View>
        {level !== 'beginner' && (
          <View style={s.workoutStat}>
            <Text style={s.workoutStatVal}>{workout.targetPace}/km</Text>
            <Text style={s.workoutStatLabel}>Mål-pace</Text>
          </View>
        )}
        {level !== 'beginner' && (
          <View style={s.workoutStat}>
            <Text style={s.workoutStatVal}>{workout.targetHr} bpm</Text>
            <Text style={s.workoutStatLabel}>Mål-puls</Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity style={s.startBtn} onPress={() => onStartActivity ? onStartActivity('run') : onNavigate && onNavigate('tracker')}>
          <Text style={s.startBtnText}>▶  Løb</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.walkBtn} onPress={() => onStartActivity ? onStartActivity('walk') : onNavigate && onNavigate('tracker')}>
          <Text style={s.walkBtnText}>Gå</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── UGE PLAN ─────────────────────────────────────────────────────────────────
function WeekPlan({ weekPlan }) {
  return (
    <View style={s.weekCard}>
      <Text style={s.sectionTitle}>DENNE UGE</Text>
      {weekPlan.map((d, i) => (
        <View key={d.day} style={[s.weekRow, i < weekPlan.length - 1 && s.weekRowBorder]}>
          <View style={[s.dayDot, { backgroundColor: d.today ? d.color : 'transparent', borderColor: d.color }]} />
          <Text style={[s.dayLabel, d.today && { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>{d.day}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.dayWorkout, { color: d.rest ? colors.muted : colors.text }]}>{d.workout}</Text>
            {d.description && !d.rest ? (
              <Text style={s.dayDesc} numberOfLines={1}>{d.description}</Text>
            ) : null}
          </View>
          {d.km > 0 && <Text style={[s.dayKm, { color: d.color }]}>{d.km}km</Text>}
        </View>
      ))}
    </View>
  );
}

// ─── HOVED KOMPONENT ──────────────────────────────────────────────────────────

// ─── NÆSTE MILEPÆL WIDGET ─────────────────────────────────────────────────────
const MILESTONES = [50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000];

function MilestoneWidget({ runs }) {
  const totalKm = (runs || []).reduce((s, r) => s + (r.km || 0), 0);
  const rounded = Math.round(totalKm * 10) / 10;

  const next = MILESTONES.find(m => m > rounded);
  if (!next) return null;

  const prev = MILESTONES[MILESTONES.indexOf(next) - 1] || 0;
  const pct = Math.min(1, (rounded - prev) / (next - prev));
  const kmLeft = Math.round((next - rounded) * 10) / 10;

  // Beregn momentum — løber hurtigere end normalt mod milepælen?
  const last4Weeks = (runs || []).filter(r => Date.now() - new Date(r.date) < 28*86400000);
  const recentKm = last4Weeks.reduce((s, r) => s + (r.km||0), 0);
  const weeklyRate = recentKm / 4; // km/uge
  const weeksToMilestone = weeklyRate > 0 ? kmLeft / weeklyRate : null;

  const contexts = {
    50:   { text: 'Første 50 km', sub: null },
    100:  { text: 'Første 100 km', sub: null },
    200:  { text: 'Solide ben', sub: null },
    300:  { text: '300 km-klubben', sub: null },
    500:  { text: 'Halvvejs til 1.000 km', sub: null },
    750:  { text: '750 km — eliteläufer', sub: null },
    1000: { text: '1.000 km — legendarisk', sub: null },
    1500: { text: 'Over 1.000 km', sub: null },
    2000: { text: 'Mod 2.000 km', sub: null },
    3000: { text: 'Ultra-territorium', sub: null },
    5000: { text: 'Mod 5.000 km', sub: null },
  };

  const ctx = contexts[next];
  const etaText = weeksToMilestone !== null
    ? weeksToMilestone < 1 ? 'Denne uge!'
    : weeksToMilestone < 2 ? 'Ca. 1-2 uger'
    : `Ca. ${Math.round(weeksToMilestone)} uger`
    : null;

  // Farve baseret på progress — tæt på = mere intens
  const accentColor = pct > 0.85 ? colors.secondary : pct > 0.6 ? colors.accent : colors.accent;

  return (
    <View style={[s.milestoneCard, pct > 0.85 && { borderColor: colors.secondary + '50' }]}>
      {pct > 0.85 && <View style={[s.workoutAccentLine, { backgroundColor: colors.secondary }]} />}
      <View style={s.milestoneTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.milestoneLabel}>NÆSTE MILEPÆL</Text>
          <Text style={[s.milestoneTarget, { color: pct > 0.85 ? colors.secondary : colors.text }]}>{next} km</Text>
          <Text style={s.milestoneContext}>{ctx.text}</Text>
        </View>
        <View style={s.milestoneRight}>
          <Text style={[s.milestoneKmLeft, { color: accentColor }]}>{kmLeft}</Text>
          <Text style={s.milestoneKmLeftLabel}>km tilbage</Text>
          {etaText && <Text style={[s.milestoneEta, { color: pct > 0.85 ? colors.secondary : colors.muted }]}>{etaText}</Text>}
        </View>
      </View>
      <View style={s.milestoneBarTrack}>
        <View style={[s.milestoneBarFill, { width: `${pct * 100}%`, backgroundColor: accentColor }]} />
        <View style={[s.milestoneDot, { left: `${pct * 100}%`, backgroundColor: accentColor, borderColor: colors.card }]} />
      </View>
      <View style={s.milestoneLabelRow}>
        <Text style={s.milestonePrev}>{rounded.toFixed(0)} km total</Text>
        <Text style={[s.milestoneNext, { color: accentColor }]}>{next} km</Text>
      </View>
    </View>
  );
}

// ─── LØBE-DAGBOG (seneste løb) ────────────────────────────────────────────────
function RunDiary({ runs, onRunUpdated }) {
  const recent = (runs || []).slice(0, 5); // vis de 5 seneste
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draftText, setDraftText] = useState('');
  const [saving, setSaving] = useState(false);
  const [localNotes, setLocalNotes] = useState({});

  if (recent.length === 0) return null;

  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const days = ['Søn','Man','Tir','Ons','Tor','Fre','Lør'];
    const months = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
    return `${days[dt.getDay()]} ${dt.getDate()}. ${months[dt.getMonth()]}`;
  };

  const fmtPace = (s) => {
    if (!s) return null;
    return `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}/km`;
  };

  const saveNote = async (runId) => {
    setSaving(true);
    try {
      const token = getAuthToken();
      await fetch(`${SERVER}/runs/${runId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ diary: draftText }),
      });
      setLocalNotes(n => ({ ...n, [runId]: draftText }));
      setEditingId(null);
      if (onRunUpdated) onRunUpdated(runId, draftText);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const moodEmojis = ['–', '○', '◐', '●', '★'];

  return (
    <View style={s.diaryCard}>
      <TouchableOpacity style={s.diaryHeader} onPress={() => setExpanded(e => !e)}>
        <View>
          <Text style={s.sectionTitle}>LØBE-DAGBOG</Text>
          <Text style={s.diarySub}>Skriv noter til dine løb — AI'en lærer af det</Text>
        </View>
        <Text style={s.diaryChevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={s.diaryBody}>
          {recent.map((run, idx) => {
            const note = localNotes[run.id] ?? run.diary ?? '';
            const isEditing = editingId === run.id;
            return (
              <View key={run.id} style={[s.diaryEntry, idx < recent.length - 1 && s.diaryEntryBorder]}>
                {/* Løb-info */}
                <View style={s.diaryEntryTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.diaryDate}>{fmtDate(run.date || run.created_at)}</Text>
                    <View style={s.diaryStats}>
                      <Text style={s.diaryKm}>{run.km} km</Text>
                      {fmtPace(run.pace_secs_per_km) && (
                        <Text style={s.diaryPace}> · {fmtPace(run.pace_secs_per_km)}</Text>
                      )}
                    </View>
                  </View>
                  {!isEditing && (
                    <TouchableOpacity
                      style={s.diaryEditBtn}
                      onPress={() => { setEditingId(run.id); setDraftText(note); }}>
                      <Text style={s.diaryEditBtnText}>{note ? '✎' : '+ Note'}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Eksisterende note */}
                {note && !isEditing && (
                  <View style={s.diaryNoteWrap}>
                    <Text style={s.diaryNoteText}>"{note}"</Text>
                  </View>
                )}

                {/* Redigering */}
                {isEditing && (
                  <View style={s.diaryEditWrap}>
                    {/* Hurtig stemning */}
                    <View style={s.moodRow}>
                      <Text style={s.moodLabel}>Stemning:</Text>
                      {moodEmojis.map(em => (
                        <TouchableOpacity
                          key={em}
                          style={[s.moodBtn, draftText.startsWith(em) && s.moodBtnActive]}
                          onPress={() => {
                            const rest = draftText.replace(/^[–○◐●★]\s*/, '');
                            setDraftText(em + ' ' + rest);
                          }}>
                          <Text style={s.moodEmoji}>{em}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput
                      style={s.diaryInput}
                      value={draftText}
                      onChangeText={setDraftText}
                      placeholder="Hvordan gik det? Ben tunge? God dag? Ny rute?"
                      placeholderTextColor={colors.muted}
                      multiline
                      autoFocus
                    />
                    <View style={s.diaryEditActions}>
                      <TouchableOpacity
                        style={s.diaryCancelBtn}
                        onPress={() => setEditingId(null)}>
                        <Text style={s.diaryCancelBtnText}>Annuller</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.diarySaveBtn}
                        onPress={() => saveNote(run.id)}
                        disabled={saving}>
                        <Text style={s.diarySaveBtnText}>{saving ? '...' : 'Gem'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── INJURY RISK SCORE ────────────────────────────────────────────────────────
function InjuryRisk({ runs, profile, level }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState(null);

  // Beregn en lokal risiko-score baseret på data (uden AI)
  const localRisk = React.useMemo(() => {
    if (!runs || runs.length < 2) return null;
    const now = Date.now();
    const last7  = runs.filter(r => now - new Date(r.date||r.created_at) < 7*86400000);
    const prev7  = runs.filter(r => {
      const age = now - new Date(r.date||r.created_at);
      return age >= 7*86400000 && age < 14*86400000;
    });
    const km7  = last7.reduce((s,r)  => s + (r.km||0), 0);
    const kmPrev = prev7.reduce((s,r) => s + (r.km||0), 0);
    const riseRatio = kmPrev > 0 ? km7 / kmPrev : 1;
    const runs3d = runs.filter(r => now - new Date(r.date||r.created_at) < 3*86400000).length;
    const restDays = (() => {
      if (runs.length === 0) return 99;
      const last = new Date(runs[0].date||runs[0].created_at);
      return Math.floor((now - last) / 86400000);
    })();

    let score = 1;
    if (riseRatio > 1.3) score += 3;
    else if (riseRatio > 1.1) score += 1;
    if (runs3d >= 3) score += 3;
    else if (runs3d >= 2) score += 1;
    if (restDays === 0) score += 1;
    if (restDays >= 2) score -= 1;
    score = Math.max(1, Math.min(10, score));

    const signals = [];
    if (riseRatio > 1.3) signals.push(`Km steget ${Math.round((riseRatio-1)*100)}% ift. forrige uge`);
    if (runs3d >= 2) signals.push(`${runs3d} løb de seneste 3 dage`);
    if (restDays === 0) signals.push('Ingen hviledag i dag');
    if (restDays >= 2) signals.push(`${restDays} dage siden sidste løb — frisk`);
    return { score, signals, km7: Math.round(km7*10)/10, riseRatio };
  }, [runs]);

  const analyze = async () => {
    if (!runs || runs.length < 2) return;
    setLoading(true);
    setExpanded(true);
    try {
      const token = getAuthToken();
      const last10 = runs.slice(0, 10).map(r => ({
        km: r.km, pace: r.pace_secs_per_km,
        date: r.date || r.created_at, hr: r.avg_hr,
      }));
      const res = await fetch(`${SERVER}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: `Du er en løbeskade-ekspert. Analyser brugerens løbsdata og giv en skaderisiko-score fra 1-10 (1=meget lav, 10=meget høj). Svar KUN i dette JSON-format uden markdown:
{"score":4,"level":"Moderat","color":"#ffd600","summary":"1-2 sætninger om den primære risikofaktor","tips":["konkret tip 1","konkret tip 2"]}`,
          messages: [{ role: 'user', content: `Bruger: ${profile?.name||''}, ${profile?.age||''} år, niveau: ${level}. Løbsdata seneste 10 løb: ${JSON.stringify(last10)}. Lokal score: ${localRisk?.score}/10. Signaler: ${localRisk?.signals?.join(', ')||'ingen'}` }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      const parsed = JSON.parse(text.trim());
      setResult(parsed);
      setLastAnalyzed(new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }));
    } catch { setResult(localRisk ? {
      score: localRisk.score,
      level: localRisk.score <= 3 ? 'Lav' : localRisk.score <= 6 ? 'Moderat' : 'Høj',
      color: localRisk.score <= 3 ? colors.green : localRisk.score <= 6 ? colors.yellow : colors.red,
      summary: localRisk.signals.join('. ') || 'Ingen specielle risikofaktorer.',
      tips: ['Husk hviledag efter hårde løb', 'Øg ikke km med mere end 10% per uge'],
    } : null); }
    setLoading(false);
  };

  if (!localRisk) return null;

  const displayScore = result?.score ?? localRisk.score;
  const displayColor = result?.color ?? (displayScore <= 3 ? colors.green : displayScore <= 6 ? colors.yellow : colors.red);
  const displayLevel = result?.level ?? (displayScore <= 3 ? 'Lav' : displayScore <= 6 ? 'Moderat' : 'Høj');

  return (
    <View style={s.injuryCard}>
      <TouchableOpacity style={s.injuryHeader} onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
        <View style={s.injuryLeft}>
          <Text style={s.sectionTitle}>SKADERISIKO</Text>
          <View style={s.injuryScoreRow}>
            <Text style={[s.injuryScore, { color: displayColor }]}>{displayScore}</Text>
            <Text style={s.injuryScoreDenom}>/10</Text>
            <View style={[s.injuryLevelBadge, { backgroundColor: displayColor + '20', borderColor: displayColor + '60' }]}>
              <Text style={[s.injuryLevelText, { color: displayColor }]}>{displayLevel}</Text>
            </View>
          </View>
        </View>
        <View style={s.injuryRight}>
          {/* Mini-gauge */}
          <View style={s.injuryGaugeWrap}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <View key={n} style={[s.injuryGaugeBar, {
                backgroundColor: n <= displayScore
                  ? (n <= 3 ? colors.green : n <= 6 ? colors.yellow : colors.red)
                  : colors.border,
              }]} />
            ))}
          </View>
          <Text style={s.injuryChevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={s.injuryBody}>
          {/* Signaler */}
          {localRisk.signals.length > 0 && (
            <View style={s.injurySignals}>
              {localRisk.signals.map((sig, i) => (
                <View key={i} style={s.injurySignalRow}>
                  <Text style={[s.injurySignalDot, { color: displayColor }]}>●</Text>
                  <Text style={s.injurySignalText}>{sig}</Text>
                </View>
              ))}
            </View>
          )}

          {/* AI analyse */}
          {result ? (
            <View style={s.injuryAnalysis}>
              <Text style={s.injurySummary}>{result.summary}</Text>
              {result.tips?.map((tip, i) => (
                <View key={i} style={s.injuryTipRow}>
                  <Text style={s.injuryTipIcon}>→</Text>
                  <Text style={s.injuryTipText}>{tip}</Text>
                </View>
              ))}
              {lastAnalyzed && <Text style={s.injuryTimestamp}>Analyseret {lastAnalyzed}</Text>}
            </View>
          ) : (
            <TouchableOpacity style={s.injuryAnalyzeBtn} onPress={analyze} disabled={loading}>
              {loading
                ? <ActivityIndicator size="small" color={colors.accent} />
                : <View style={{flexDirection:'row',alignItems:'center',gap:6}}><Icon name='brain' size={14} color='#ffffff'/><Text style={s.injuryAnalyzeBtnText}>AI-analyse</Text></View>
              }
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function RacePredictor({ runs, profile, level }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const validRuns = (runs || []).filter(r => r.km > 0 && r.pace_secs_per_km > 0);

  const predict = async () => {
    if (validRuns.length === 0) return;
    setLoading(true);
    setExpanded(true);
    try {
      const token = getAuthToken();
      const recentRuns = validRuns
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10)
        .map(r => ({ km: r.km.toFixed(2), pace: `${Math.floor(r.pace_secs_per_km/60)}:${String(Math.round(r.pace_secs_per_km%60)).padStart(2,'0')}/km`, date: r.date }));

      const r = await fetch(`${SERVER}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: `Baseret på mine seneste løb, beregn mine forventede race-tider. Returner KUN et JSON objekt med denne struktur (ingen tekst før eller efter):
{
  "5k": "MM:SS",
  "10k": "MM:SS", 
  "halfMarathon": "T:MM:SS",
  "confidence": "lav|medium|høj",
  "tip": "En kort sætning om hvad jeg skal fokusere på for at forbedre mine tider (max 15 ord)"
}

Mine løb: ${JSON.stringify(recentRuns)}
Fitness niveau: ${level || 'beginner'}
${profile?.age ? `Alder: ${profile.age}` : ''}` }),
      });
      const data = await r.json();
      const text = data.reply || data.message || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setResult(parsed);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const confidenceColor = result?.confidence === 'høj' ? colors.green : result?.confidence === 'medium' ? colors.accent : colors.dim;

  return (
    <View style={rp.card}>
      <TouchableOpacity style={rp.header} onPress={() => { setExpanded(!expanded); if (!result && !loading) predict(); }}>
        <View style={rp.headerLeft}>
          <Icon name='trophy' size={32} color='#f5a623'/>
          <View>
            <Text style={rp.title}>Race Predictor</Text>
            <Text style={rp.subtitle}>Se dine forventede race-tider</Text>
          </View>
        </View>
        <Text style={rp.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={rp.body}>
          {validRuns.length === 0 ? (
            <Text style={rp.noData}>Du skal have mindst ét løb for at få en race-forudsigelse.</Text>
          ) : loading ? (
            <View style={rp.loadingWrap}>
              <ActivityIndicator color={colors.accent} />
              <Text style={rp.loadingText}>AI analyserer dine løb...</Text>
            </View>
          ) : result ? (
            <>
              <View style={rp.racesRow}>
                {[
                  { label: '5 km', val: result['5k'] },
                  { label: '10 km', val: result['10k'] },
                  { label: 'Halvmaraton', val: result.halfMarathon },
                ].map(r => (
                  <View key={r.label} style={rp.raceCard}>
                    <Text style={rp.raceLabel}>{r.label}</Text>
                    <Text style={rp.raceTime}>{r.val}</Text>
                  </View>
                ))}
              </View>
              <View style={rp.footer}>
                <View style={[rp.confidenceBadge, { backgroundColor: confidenceColor + '20', borderColor: confidenceColor }]}>
                  <Text style={[rp.confidenceText, { color: confidenceColor }]}>
                    {result.confidence === 'høj' ? '✓' : result.confidence === 'medium' ? '~' : '?'} {result.confidence} sikkerhed
                  </Text>
                </View>
                <TouchableOpacity onPress={predict} style={rp.refreshBtn}>
                  <Text style={rp.refreshText}>↻ Opdater</Text>
                </TouchableOpacity>
              </View>
              {result.tip && (
                <View style={rp.tipBox}>
                  <Text style={rp.tipText}>{result.tip}</Text>
                </View>
              )}
            </>
          ) : null}
        </View>
      )}
    </View>
  );
}

export default function Dashboard({ level, nextWorkout, weekPlan, planChanges, profile, runs, onNavigate, onStartActivity }) {
  const name = (profile?.name || 'LØBER').split(' ')[0].toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 10 ? 'GOD MORGEN,' : hour < 17 ? 'GOD DAG,' : 'GOD AFTEN,';
  const dayName = new Date().toLocaleDateString('da-DK', { weekday: 'long' }).toUpperCase();

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{greeting}</Text>
          <Text style={s.greetingName}>
            <Text style={s.greetingAccent}>{name?.charAt(0)}</Text>
            <Text>{name?.slice(1)}</Text>
          </Text>
        </View>
        <View style={s.dateBadge}>
          <Text style={s.dateText}>{dayName}</Text>
        </View>
      </View>

      {/* Stats fra rigtige løb */}
      <StatsRow runs={runs || []} profile={profile} />

      {/* Næste milepæl */}
      <MilestoneWidget runs={runs || []} />

      {/* Plan update log */}
      {planChanges.length > 0 && (
        <View style={s.changeLog}>
          <Text style={s.changeLogTitle}>PLAN OPDATERET</Text>
          {planChanges.slice(-2).map((c, i) => (
            <Text key={i} style={s.changeLogItem}>· {c.note} ({c.time})</Text>
          ))}
        </View>
      )}

      {/* Sko-advarsel */}
      {(() => {
        const shoes = profile?.shoes || [];
        const activeId = profile?.activeShoeId;
        const active = shoes.find(sh => sh.id === activeId);
        if (!active) return null;
        const km = (runs || []).filter(r => r.shoe_id === activeId).reduce((s, r) => s + (r.km || 0), 0) + (active.startKm || 0);
        if (km < 700) return null;
        const isDead = km >= 800;
        return (
          <View style={[s.shoeAlert, { borderColor: isDead ? '#ef4444' : '#f59e0b', backgroundColor: (isDead ? '#ef4444' : '#f59e0b') + '12' }]}>
            <Icon name='warning' size={18} color={isDead ? colors.red : colors.yellow}/>
            <View style={{ flex: 1 }}>
              <Text style={[s.shoeAlertTitle, { color: isDead ? '#ef4444' : '#f59e0b' }]}>
                {isDead ? 'Sko slidt op!' : 'Sko snart slidt!'}
              </Text>
              <Text style={s.shoeAlertSub}>{active.name} — {km.toFixed(0)} km / 800 km max</Text>
            </View>
          </View>
        );
      })()}

      {/* Vejr & Form anbefaling */}
      <WeatherAdvice runs={runs} nextWorkout={nextWorkout} level={level} profile={profile} />

      {/* Next workout */}
      <WorkoutCard workout={nextWorkout} level={level} onNavigate={onNavigate} onStartActivity={onStartActivity} />

      {/* Week plan */}
      <WeekPlan weekPlan={weekPlan} />

      {/* Løbe-dagbog */}
      <RunDiary runs={runs} />

      {/* Skaderisiko */}
      <InjuryRisk runs={runs} profile={profile} level={level} />

      {/* Race Predictor */}
      <RacePredictor runs={runs} profile={profile} level={level} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.bg },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, marginTop: 4 },
  greeting:         { fontSize: 11, color: colors.muted, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 },
  greetingName:     { fontSize: 36, fontWeight: '900', color: colors.black, letterSpacing: -1.5, lineHeight: 38 },
  greetingAccent:   { color: colors.accent },
  dateBadge:        { backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  dateText:         { fontSize: 10, color: colors.muted, letterSpacing: 1.5, fontWeight: '600' },

  // Injury Risk
  injuryCard:         { backgroundColor: colors.card, borderRadius: 18, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:8, elevation:2 },
  injuryHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  injuryLeft:         { flex: 1 },
  injuryScoreRow:     { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
  injuryScore:        { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  injuryScoreDenom:   { fontSize: 16, color: colors.muted, fontWeight: '600' },
  injuryLevelBadge:   { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 6 },
  injuryLevelText:    { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  injuryRight:        { alignItems: 'flex-end', gap: 8 },
  injuryGaugeWrap:    { flexDirection: 'row', gap: 3 },
  injuryGaugeBar:     { width: 8, height: 20, borderRadius: 2 },
  injuryChevron:      { color: colors.muted, fontSize: 11 },
  injuryBody:         { paddingHorizontal: 18, paddingBottom: 18 },
  injurySignals:      { marginBottom: 12 },
  injurySignalRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 5 },
  injurySignalDot:    { fontSize: 8, marginTop: 4 },
  injurySignalText:   { flex: 1, fontSize: 13, color: colors.dim, lineHeight: 19 },
  injuryAnalysis:     { backgroundColor: colors.surface, borderRadius: 12, padding: 14 },
  injurySummary:      { fontSize: 13, color: colors.text, lineHeight: 20, marginBottom: 10 },
  injuryTipRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  injuryTipIcon:      { color: colors.accent, fontSize: 13, fontWeight: '700', marginTop: 1 },
  injuryTipText:      { flex: 1, fontSize: 12, color: colors.dim, lineHeight: 18 },
  injuryTimestamp:    { fontSize: 10, color: colors.muted, marginTop: 8, textAlign: 'right' },
  injuryAnalyzeBtn:   { backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  injuryAnalyzeBtnText: { color: colors.accent, fontSize: 14, fontWeight: '700' },

  milestoneCard:        { backgroundColor: colors.card, borderRadius: 18, padding: 20, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:8, elevation:2 },
  milestoneTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  milestoneLabel:       { fontSize: 9, color: colors.muted, letterSpacing: 2, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  milestoneTarget:      { fontSize: 30, fontWeight: '900', color: colors.black, letterSpacing: -1 },
  milestoneContext:     { fontSize: 12, color: colors.muted, marginTop: 2 },
  milestoneRight:       { alignItems: 'flex-end' },
  milestoneKmLeft:      { fontSize: 34, fontWeight: '900', color: colors.accent, letterSpacing: -1 },
  milestoneKmLeftLabel: { fontSize: 10, color: colors.muted, letterSpacing: 0.5, fontWeight: '600', textAlign: 'right' },
  milestoneEta:         { fontSize: 10, color: colors.muted, fontWeight: '700', textAlign: 'right', marginTop: 3 },
  milestoneBarTrack:    { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'visible', position: 'relative', marginBottom: 8 },
  milestoneBarFill:     { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },
  milestoneDot:         { position: 'absolute', top: -5, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.accent, marginLeft: -7, borderWidth: 2, borderColor: colors.card },
  milestoneLabelRow:    { flexDirection: 'row', justifyContent: 'space-between' },
  milestonePrev:        { fontSize: 10, color: colors.muted, fontWeight: '600' },
  milestoneNext:        { fontSize: 10, color: colors.accent, fontWeight: '700' },

  // Løbe-dagbog
  diaryCard:          { backgroundColor: colors.card, borderRadius: 18, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:8, elevation:2 },
  diaryHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  diarySub:           { fontSize: 11, color: colors.muted, marginTop: 2 },
  diaryChevron:       { color: colors.muted, fontSize: 11 },
  diaryBody:          { paddingHorizontal: 18, paddingBottom: 18 },
  diaryEntry:         { paddingVertical: 14 },
  diaryEntryBorder:   { borderBottomWidth: 1, borderBottomColor: colors.border },
  diaryEntryTop:      { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  diaryDate:          { fontSize: 11, color: colors.muted, fontWeight: '600', letterSpacing: 0.3 },
  diaryStats:         { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  diaryKm:            { fontSize: 16, fontWeight: '900', color: colors.accent, letterSpacing: -0.5 },
  diaryPace:          { fontSize: 13, color: colors.dim, fontWeight: '500' },
  diaryEditBtn:       { backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  diaryEditBtnText:   { color: colors.accent, fontSize: 12, fontWeight: '700' },
  diaryNoteWrap:      { backgroundColor: colors.surface, borderRadius: 10, padding: 10, borderLeftWidth: 2, borderLeftColor: colors.accent + '80' },
  diaryNoteText:      { color: colors.dim, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  diaryEditWrap:      { marginTop: 8 },
  moodRow:            { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  moodLabel:          { fontSize: 11, color: colors.muted, fontWeight: '600', marginRight: 4 },
  moodBtn:            { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  moodBtnActive:      { backgroundColor: colors.accent + '15' },
  moodEmoji:          { fontSize: 18 },
  diaryInput:         { backgroundColor: colors.surface, borderRadius: 12, padding: 12, color: colors.text, fontSize: 14, minHeight: 70, textAlignVertical: 'top', lineHeight: 20 },
  diaryEditActions:   { flexDirection: 'row', gap: 8, marginTop: 8 },
  diaryCancelBtn:     { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: colors.surface },
  diaryCancelBtnText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  diarySaveBtn:       { flex: 2, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: colors.black },
  diarySaveBtnText:   { color: colors.card, fontSize: 13, fontWeight: '800' },

  pillRow:          { flexDirection: 'row', gap: 8, marginBottom: 16 },
  pill:             { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.05, shadowRadius:6, elevation:1 },
  pillVal:          { fontSize: 20, fontWeight: '900', marginBottom: 2, letterSpacing: -0.5, color: colors.black },
  pillLabel:        { fontSize: 9, color: colors.muted, textAlign: 'center', letterSpacing: 1, fontWeight: '600', textTransform: 'uppercase' },
  pillSub:          { fontSize: 9, color: colors.muted, textAlign: 'center', marginTop: 4 },
  pillContext:      { fontSize: 10, textAlign: 'center', marginTop: 4, fontWeight: '700', lineHeight: 13 },
  progressBar:      { width: '100%', height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  progressFill:     { height: '100%', borderRadius: 2 },

  changeLog:        { backgroundColor: colors.accent + '08', borderRadius: 12, padding: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: colors.accent },
  changeLogTitle:   { fontSize: 10, color: colors.accent, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' },
  changeLogItem:    { fontSize: 12, color: colors.dim, marginTop: 2 },

  weatherCard:      { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.05, shadowRadius:6, elevation:1 },
  weatherTitle:     { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: colors.black },
  weatherSub:       { fontSize: 12, color: colors.dim, marginTop: 2 },
  fatigueLabel:     { fontSize: 12, color: colors.dim, fontWeight: '500' },
  weatherAdviceBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  weatherAdviceText:{ fontSize: 13, color: colors.text, lineHeight: 21 },
  refreshBtn:       { marginTop: 10, alignSelf: 'flex-end' },
  refreshBtnText:   { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },

  workoutCard:      { backgroundColor: colors.card, borderRadius: 20, padding: 22, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.08, shadowRadius:12, elevation:3 },
  workoutAccentLine:{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.accent },
  workoutHeader:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  workoutLabel:     { fontSize: 9, color: colors.muted, letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase', fontWeight: '700' },
  workoutName:      { fontSize: 22, fontWeight: '900', color: colors.black, lineHeight: 27, letterSpacing: -0.5 },
  badge:            { borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: colors.surface },
  badgeText:        { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', color: colors.muted },
  workoutDesc:      { fontSize: 13, color: colors.dim, lineHeight: 20, marginBottom: 18 },
  workoutStats:     { flexDirection: 'row', gap: 8, marginBottom: 20 },
  workoutStat:      { flex: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 12, alignItems: 'center' },
  workoutStatVal:   { fontSize: 15, fontWeight: '900', color: colors.black, marginBottom: 2, letterSpacing: -0.3 },
  workoutStatLabel: { fontSize: 9, color: colors.muted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600' },
  startBtn:         { flex: 1, backgroundColor: colors.black, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  startBtnText:     { fontSize: 14, fontWeight: '900', color: colors.card, letterSpacing: 0.5 },
  walkBtn:          { flex: 1, backgroundColor: colors.black, borderRadius: 14, paddingVertical: 16, alignItems: 'center', opacity: 0.75 },
  walkBtnText:      { fontSize: 14, fontWeight: '700', color: colors.card, letterSpacing: 0.5 },
  coachBtn:         { flex: 1, backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  coachBtnText:     { fontSize: 13, fontWeight: '600', color: colors.dim },

  weekCard:         { backgroundColor: colors.card, borderRadius: 18, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.05, shadowRadius:8, elevation:1 },
  shoeAlert:        { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 14, backgroundColor: colors.card, shadowColor: '#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.05, shadowRadius:6, elevation:1 },
  shoeAlertTitle:   { fontSize: 13, fontWeight: '700', marginBottom: 2, color: colors.black },
  shoeAlertSub:     { fontSize: 12, color: colors.dim },
  sectionTitle:     { fontSize: 9, color: colors.muted, letterSpacing: 2, marginBottom: 16, fontWeight: '700', textTransform: 'uppercase' },
  weekRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  weekRowBorder:    { borderBottomWidth: 1, borderBottomColor: colors.border },
  dayDot:           { width: 7, height: 7, borderRadius: 3.5, borderWidth: 1.5 },
  dayLabel:         { fontSize: 12, color: colors.muted, width: 36, fontWeight: '600', letterSpacing: 0.5 },
  dayWorkout:       { fontSize: 13, color: colors.black, fontWeight: '600' },
  dayDesc:          { fontSize: 11, color: colors.muted, marginTop: 1 },
  dayKm:            { fontSize: 12, fontWeight: '700', marginLeft: 'auto', color: colors.black },
});

const rp = StyleSheet.create({
  card:            { backgroundColor: colors.card, borderRadius: 18, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:8, elevation:2 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  headerLeft:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon:            { fontSize: 22 },
  title:           { fontSize: 14, fontWeight: '700', color: colors.black, letterSpacing: -0.2 },
  subtitle:        { fontSize: 11, color: colors.muted, marginTop: 2 },
  chevron:         { color: colors.muted, fontSize: 11 },
  body:            { paddingHorizontal: 18, paddingBottom: 18 },
  noData:          { color: colors.muted, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  loadingWrap:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, justifyContent: 'center' },
  loadingText:     { color: colors.muted, fontSize: 13 },
  racesRow:        { flexDirection: 'row', gap: 8, marginBottom: 12 },
  raceCard:        { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12, alignItems: 'center' },
  raceLabel:       { fontSize: 9, color: colors.muted, marginBottom: 6, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  raceTime:        { fontSize: 17, fontWeight: '900', color: colors.accent, letterSpacing: -0.5 },
  footer:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  confidenceBadge: { backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  confidenceText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: colors.muted },
  refreshBtn:      { marginLeft: 'auto', padding: 6 },
  refreshText:     { color: colors.muted, fontSize: 11 },
  tipBox:          { backgroundColor: colors.surface, borderRadius: 10, padding: 12 },
  tipText:         { color: colors.dim, fontSize: 12, lineHeight: 18 },
});
