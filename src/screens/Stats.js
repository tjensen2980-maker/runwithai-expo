import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { colors } from '../data';
import { Icon } from '../components/Icons';

const W = Dimensions.get('window').width;

// ─── HJÆLPE-FUNKTIONER ───────────────────────────────────────────────────────
const fmtPace = (s) => s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '–';
const fmtDur  = (s) => s ? `${Math.floor(s / 3600) > 0 ? Math.floor(s / 3600) + 't ' : ''}${Math.floor((s % 3600) / 60)}m` : '–';

function getRingPath(pct, r = 44) {
  const circ = 2 * Math.PI * r;
  return circ * Math.min(pct, 1);
}

// ─── RING KOMPONENT ──────────────────────────────────────────────────────────
function Ring({ pct, size = 110, color = colors.accent, label, value, sub }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * Math.min(pct, 1);
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={colors.surface} strokeWidth={10} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
            strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" />
        </svg>
        <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, letterSpacing: -0.5 }}>{value}</Text>
          {sub && <Text style={{ fontSize: 9, color: colors.muted, fontWeight: '600', letterSpacing: 0.5 }}>{sub}</Text>}
        </View>
      </View>
      {label && <Text style={{ fontSize: 10, color: colors.muted, fontWeight: '700', letterSpacing: 1, marginTop: 6, textTransform: 'uppercase' }}>{label}</Text>}
    </View>
  );
}

// ─── MINI BAR CHART ──────────────────────────────────────────────────────────
function BarChart({ data, color = colors.accent, labelKey = 'label', valueKey = 'value', unit = '' }) {
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 70 }}>
      {data.map((d, i) => {
        const h = Math.max(4, ((d[valueKey] || 0) / max) * 60);
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 8, color: colors.muted, fontWeight: '600' }}>{d[valueKey] > 0 ? `${d[valueKey]}${unit}` : ''}</Text>
            <View style={{ width: '100%', height: h, backgroundColor: color, borderRadius: 4, opacity: i === data.length - 1 ? 1 : 0.5 }} />
            <Text style={{ fontSize: 8, color: colors.muted }}>{d[labelKey]}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── STAT KORT ───────────────────────────────────────────────────────────────
function StatCard({ title, children, accent }) {
  return (
    <View style={[st.card, accent && { borderLeftWidth: 3, borderLeftColor: colors.accent }]}>
      <Text style={st.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function BigStat({ value, label, color }) {
  return (
    <View style={st.bigStatWrap}>
      <Text style={[st.bigStatVal, color && { color }]}>{value}</Text>
      <Text style={st.bigStatLabel}>{label}</Text>
    </View>
  );
}

// ─── HOVED KOMPONENT ─────────────────────────────────────────────────────────
export default function Stats({ runs = [], profile, level }) {
  const [period, setPeriod] = useState('all'); // '4w' | '3m' | 'all'

  const now = new Date();
  const filtered = useMemo(() => {
    if (period === '4w') {
      const cutoff = new Date(now - 28 * 86400000);
      return runs.filter(r => r.date && new Date(r.date) >= cutoff);
    }
    if (period === '3m') {
      const cutoff = new Date(now - 90 * 86400000);
      return runs.filter(r => r.date && new Date(r.date) >= cutoff);
    }
    return runs;
  }, [runs, period]);

  const validRuns = filtered.filter(r => r.km > 0);
  const totalKm   = validRuns.reduce((a, r) => a + (r.km || 0), 0);
  const totalTime = validRuns.reduce((a, r) => a + (r.duration_secs || 0), 0);
  const avgKm     = validRuns.length > 0 ? totalKm / validRuns.length : 0;
  const bestPace  = validRuns.reduce((b, r) => r.pace_secs_per_km && (!b || r.pace_secs_per_km < b) ? r.pace_secs_per_km : b, null);
  const avgPace   = validRuns.length > 0 ? validRuns.reduce((a, r) => a + (r.pace_secs_per_km || 0), 0) / validRuns.filter(r => r.pace_secs_per_km).length : null;
  const longestRun = validRuns.reduce((b, r) => r.km > (b?.km || 0) ? r : b, null);

  // Ugentlige km — seneste 8 uger
  const weeklyData = useMemo(() => {
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now - i * 7 * 86400000);
      weekStart.setHours(0,0,0,0);
      const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
      const weekRuns = runs.filter(r => r.date && new Date(r.date) >= weekStart && new Date(r.date) < weekEnd);
      const km = weekRuns.reduce((a, r) => a + (r.km || 0), 0);
      const label = i === 0 ? 'Nu' : `${i}u`;
      weeks.push({ label, value: Math.round(km * 10) / 10 });
    }
    return weeks;
  }, [runs]);

  // Månedlig fordeling
  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthRuns = runs.filter(r => {
        if (!r.date) return false;
        const rd = new Date(r.date);
        return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
      });
      const km = monthRuns.reduce((a, r) => a + (r.km || 0), 0);
      months.push({ label: d.toLocaleString('da-DK', { month: 'short' }), value: Math.round(km * 10) / 10 });
    }
    return months;
  }, [runs]);

  // Streak
  const streak = useMemo(() => {
    if (runs.length === 0) return 0;
    const sorted = [...runs].filter(r => r.date).sort((a, b) => new Date(b.date) - new Date(a.date));
    let count = 0;
    let check = new Date(); check.setHours(0,0,0,0);
    for (const r of sorted) {
      const d = new Date(r.date); d.setHours(0,0,0,0);
      const diff = Math.round((check - d) / 86400000);
      if (diff <= 1) { if (diff === 0 || diff === 1) { count++; check = d; } else break; }
      else break;
    }
    return count;
  }, [runs]);

  // Mål-fremskridt (50km milepæl)
  const milestones = [50, 100, 200, 500, 1000];
  const totalAllTime = runs.reduce((a, r) => a + (r.km || 0), 0);
  const nextMilestone = milestones.find(m => m > totalAllTime) || milestones[milestones.length - 1];
  const milestonePct = totalAllTime / nextMilestone;

  // Løbetype fordeling
  const runTypes = useMemo(() => {
    const map = {};
    validRuns.forEach(r => {
      const type = r.type || 'Løb';
      map[type] = (map[type] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [validRuns]);

  // Ugedag fordeling
  const dayDist = useMemo(() => {
    const days = ['Man','Tir','Ons','Tor','Fre','Lør','Søn'];
    const counts = Array(7).fill(0);
    validRuns.forEach(r => {
      if (!r.date) return;
      const d = new Date(r.date);
      counts[(d.getDay() + 6) % 7]++;
    });
    return days.map((label, i) => ({ label, value: counts[i] }));
  }, [validRuns]);

  const goalKmWeek = profile?.weeklyGoal || 20;
  const thisWeekKm = weeklyData[weeklyData.length - 1]?.value || 0;

  if (runs.length === 0) return (
    <ScrollView style={st.container} contentContainerStyle={{ padding: 20, alignItems: 'center', paddingTop: 60 }}>
      <Text style={{ fontSize: 48 }}>📊</Text>
      <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 16 }}>Ingen statistik endnu</Text>
      <Text style={{ fontSize: 14, color: colors.muted, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>Start dit første løb for at se dine data her.</Text>
    </ScrollView>
  );

  return (
    <ScrollView style={st.container} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

      {/* Periode-vælger */}
      <View style={st.periodRow}>
        {[['4w','4 uger'],['3m','3 mdr'],['all','Alt tid']].map(([id, label]) => (
          <TouchableOpacity key={id} style={[st.periodBtn, period === id && st.periodBtnActive]} onPress={() => setPeriod(id)}>
            <Text style={[st.periodBtnText, period === id && st.periodBtnTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Top stats */}
      <View style={st.topRow}>
        <BigStat value={`${Math.round(totalKm * 10) / 10}`} label="KM I ALT" color={colors.accent} />
        <View style={st.topDivider} />
        <BigStat value={`${validRuns.length}`} label="LØB" />
        <View style={st.topDivider} />
        <BigStat value={fmtPace(bestPace)} label="BEDSTE PACE" color={colors.green} />
        <View style={st.topDivider} />
        <BigStat value={`${streak}`} label="DAGES STREAK" color={colors.purple} />
      </View>

      {/* Ugentlig mål-ring */}
      <StatCard title="UGENS MÅL" accent>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <Ring
            pct={thisWeekKm / goalKmWeek}
            value={`${Math.round(thisWeekKm * 10) / 10}`}
            sub="KM"
            color={thisWeekKm >= goalKmWeek ? colors.green : colors.accent}
            size={110}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -1 }}>{Math.round(thisWeekKm * 10) / 10} km</Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>af {goalKmWeek} km mål</Text>
            <View style={{ height: 6, backgroundColor: colors.surface, borderRadius: 3, marginTop: 10 }}>
              <View style={{ height: 6, width: `${Math.min(100, (thisWeekKm / goalKmWeek) * 100)}%`, backgroundColor: thisWeekKm >= goalKmWeek ? colors.green : colors.accent, borderRadius: 3 }} />
            </View>
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 6 }}>
              {thisWeekKm >= goalKmWeek ? '🎉 Mål nået!' : `${Math.round((goalKmWeek - thisWeekKm) * 10) / 10} km tilbage`}
            </Text>
          </View>
        </View>
      </StatCard>

      {/* Milepæl */}
      <StatCard title="MILEPÆL">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{Math.round(totalAllTime * 10) / 10} km</Text>
              <Text style={{ fontSize: 13, color: colors.muted }}>{nextMilestone} km</Text>
            </View>
            <View style={{ height: 8, backgroundColor: colors.surface, borderRadius: 4 }}>
              <View style={{ height: 8, width: `${Math.min(100, milestonePct * 100)}%`, backgroundColor: colors.accent, borderRadius: 4 }} />
            </View>
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 6 }}>
              {Math.round((nextMilestone - totalAllTime) * 10) / 10} km til {nextMilestone} km
            </Text>
          </View>
          <Text style={{ fontSize: 36 }}>🏅</Text>
        </View>
      </StatCard>

      {/* Km pr uge — søjlediagram */}
      <StatCard title="KM PR UGE">
        <BarChart data={weeklyData} color={colors.accent} unit="" />
      </StatCard>

      {/* Km pr måned */}
      <StatCard title="KM PR MÅNED">
        <BarChart data={monthlyData} color={colors.blue} unit="" />
      </StatCard>

      {/* Pace + distance */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <StatCard title="GNSN PACE">
            <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -1 }}>{fmtPace(avgPace)}</Text>
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>min/km</Text>
          </StatCard>
        </View>
        <View style={{ flex: 1 }}>
          <StatCard title="GNSN DISTANCE">
            <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -1 }}>{avgKm > 0 ? `${Math.round(avgKm * 10) / 10}` : '–'}</Text>
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>km pr løb</Text>
          </StatCard>
        </View>
      </View>

      {/* Tid + længste løb */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <StatCard title="TOTAL TID">
            <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, letterSpacing: -1 }}>{fmtDur(totalTime)}</Text>
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>i bevægelse</Text>
          </StatCard>
        </View>
        <View style={{ flex: 1 }}>
          <StatCard title="LÆNGSTE LØB">
            <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, letterSpacing: -1 }}>{longestRun ? `${longestRun.km} km` : '–'}</Text>
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{longestRun?.date ? new Date(longestRun.date).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }) : ''}</Text>
          </StatCard>
        </View>
      </View>

      {/* Favorit ugedag */}
      <StatCard title="LØB PR UGEDAG">
        <BarChart data={dayDist} color={colors.purple} unit="" />
      </StatCard>

      {/* Tre ringe — goals-stil */}
      <StatCard title="AKTIVITETSRINGE">
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 }}>
          <Ring pct={thisWeekKm / goalKmWeek} value={`${Math.round((thisWeekKm/goalKmWeek)*100)}%`} sub="KM MÅL" label="Distance" color={colors.accent} size={90} />
          <Ring pct={validRuns.length / 4} value={`${validRuns.length}`} sub="LØB" label="Aktivitet" color={colors.green} size={90} />
          <Ring pct={streak / 7} value={`${streak}`} sub="DAGE" label="Streak" color={colors.purple} size={90} />
        </View>
      </StatCard>

      {/* Løbetype */}
      {runTypes.length > 0 && (
        <StatCard title="AKTIVITETSTYPER">
          {runTypes.map(([type, count]) => (
            <View key={type} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600', flex: 1 }}>{type}</Text>
              <View style={{ flex: 2, height: 6, backgroundColor: colors.surface, borderRadius: 3, marginRight: 10 }}>
                <View style={{ height: 6, width: `${(count / validRuns.length) * 100}%`, backgroundColor: colors.accent, borderRadius: 3 }} />
              </View>
              <Text style={{ fontSize: 12, color: colors.muted, width: 30, textAlign: 'right' }}>{count}x</Text>
            </View>
          ))}
        </StatCard>
      )}

    </ScrollView>
  );
}

const st = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.bg },
  periodRow:        { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodBtn:        { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  periodBtnActive:  { backgroundColor: colors.black, borderColor: colors.black },
  periodBtnText:    { fontSize: 12, fontWeight: '600', color: colors.muted },
  periodBtnTextActive: { color: colors.card, fontWeight: '800' },
  topRow:           { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  topDivider:       { width: 1, backgroundColor: colors.border, marginHorizontal: 4 },
  bigStatWrap:      { flex: 1, alignItems: 'center' },
  bigStatVal:       { fontSize: 18, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  bigStatLabel:     { fontSize: 8, color: colors.muted, fontWeight: '700', letterSpacing: 0.8, marginTop: 2, textTransform: 'uppercase' },
  card:             { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardTitle:        { fontSize: 9, color: colors.muted, fontWeight: '700', letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' },
});
