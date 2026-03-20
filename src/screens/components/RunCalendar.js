import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../data';

// ─── LØBE-KALENDER ────────────────────────────────────────────────────────────
const DAY_NAMES = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
const MONTH_NAMES = ['Januar','Februar','Marts','April','Maj','Juni','Juli','August','September','Oktober','November','December'];

export function RunCalendar({ runs, weekPlan, trainingPlan }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(null);

  // Byg et map: 'YYYY-MM-DD' → løb
  const runMap = {};
  (runs || []).forEach(r => {
    if (!r.km) return;
    const d = new Date(r.date || r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!runMap[key]) runMap[key] = [];
    runMap[key].push(r);
  });

  // Byg trainingPlan map: 'YYYY-MM-DD' → { workout, km, description, color }
  const tpMap = {};
  if (trainingPlan?.data) {
    const weeks = Array.isArray(trainingPlan.data) ? trainingPlan.data : [];
    weeks.forEach(week => {
      (week.days || week.sessions || []).forEach(session => {
        if (session.date) {
          tpMap[session.date] = session;
        }
      });
    });
  }

  // Beregn dage i måneden
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) { cells.push(null); continue; }
    const key = `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
    const dayRuns = runMap[key] || [];
    const isToday = year === today.getFullYear() && month === today.getMonth() && dayNum === today.getDate();
    cells.push({ dayNum, key, runs: dayRuns, isToday });
  }

  // Find ugentlig plan for en dato (weekPlan er template: 0=Man..6=Søn)
  const getWeekPlanned = (dayNum) => {
    if (!weekPlan) return null;
    const d = new Date(year, month, dayNum);
    const dow = (d.getDay() + 6) % 7;
    const plan = weekPlan[dow];
    if (!plan || plan.type === 'rest' || plan.km === 0) return null;
    return plan;
  };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); setSelected(null); };
  const nextMonth = () => { if (month === 11) { setMonth(0);  setYear(y => y+1); } else setMonth(m => m+1); setSelected(null); };
  const canGoNext = year < today.getFullYear() || (year === today.getFullYear() && month <= today.getMonth());

  const selectedCell = selected ? cells.find(c => c?.key === selected) : null;
  const selectedRuns = selectedCell?.runs || [];
  const selectedPlanned = selectedCell ? (tpMap[selectedCell.key] || getWeekPlanned(selectedCell.dayNum)) : null;

  const monthRuns = (runs || []).filter(r => {
    const d = new Date(r.date || r.created_at);
    return d.getFullYear() === year && d.getMonth() === month && r.km > 0;
  });
  const monthKm = monthRuns.reduce((s, r) => s + r.km, 0);

  // Kortere træningsnavn til celle
  const shortName = (name) => {
    if (!name) return '';
    if (name.length <= 10) return name;
    const words = name.split(' ');
    if (words.length >= 2) return words[0];
    return name.slice(0, 9) + '…';
  };

  return (
    <View style={cal.wrap}>
      {/* Måneds-header */}
      <View style={cal.header}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
          <Text style={cal.navText}>‹</Text>
        </TouchableOpacity>
        <View style={cal.headerCenter}>
          <Text style={cal.monthTitle}>{MONTH_NAMES[month]} {year}</Text>
          {monthKm > 0 && (
            <Text style={cal.monthSub}>{monthRuns.length} løb · {Math.round(monthKm*10)/10} km</Text>
          )}
        </View>
        <TouchableOpacity onPress={nextMonth} style={[cal.navBtn, !canGoNext && { opacity: 0.2 }]} disabled={!canGoNext}>
          <Text style={cal.navText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Ugedage-header */}
      <View style={cal.dayRow}>
        {DAY_NAMES.map(d => (
          <Text key={d} style={cal.dayName}>{d}</Text>
        ))}
      </View>

      {/* Gitter */}
      <View style={cal.grid}>
        {cells.map((cell, i) => {
          if (!cell) return <View key={i} style={cal.emptyCell} />;
          const hasRun   = cell.runs.length > 0;
          const planned  = tpMap[cell.key] || getWeekPlanned(cell.dayNum);
          const isSelected = selected === cell.key;
          const isFuture = new Date(year, month, cell.dayNum) > today;
          const totalKm  = cell.runs.reduce((s, r) => s + (r.km||0), 0);
          const planName = planned?.workout || planned?.name || planned?.type || '';
          const planKm   = planned?.km || planned?.distance || 0;
          const missedPlan = planned && !hasRun && !isFuture;

          return (
            <TouchableOpacity
              key={cell.key}
              style={[
                cal.cell,
                cell.isToday && cal.cellToday,
                isSelected && cal.cellSelected,
                hasRun && !isSelected && cal.cellHasRun,
                missedPlan && !isSelected && cal.cellMissed,
              ]}
              onPress={() => setSelected(isSelected ? null : cell.key)}
              activeOpacity={0.7}
            >
              <Text style={[
                cal.cellDay,
                cell.isToday && cal.cellDayToday,
                isSelected && { color: colors.card, fontWeight: '800' },
                hasRun && !isSelected && { color: colors.accent, fontWeight: '800' },
              ]}>
                {cell.dayNum}
              </Text>

              {/* Vis km hvis løb gennemført */}
              {hasRun && totalKm > 0 && (
                <Text style={[cal.cellKm, isSelected && { color: colors.card }]}>{totalKm.toFixed(0)}k</Text>
              )}

              {/* Vis træningsnavn hvis planlagt og ingen løb */}
              {!hasRun && planName ? (
                <Text style={[
                  cal.cellPlan,
                  isFuture ? { color: colors.accent } : { color: colors.muted },
                ]} numberOfLines={1}>
                  {planKm > 0 ? `${planKm}k` : shortName(planName)}
                </Text>
              ) : null}

              {/* Dot */}
              {hasRun && <View style={[cal.runDot, isSelected && { backgroundColor: colors.card }]} />}
              {!hasRun && planned && isFuture && <View style={cal.planDot} />}
              {missedPlan && <View style={cal.missedDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Forklaring */}
      <View style={cal.legend}>
        <View style={cal.legendItem}><View style={[cal.legendDot, { backgroundColor: colors.accent }]} /><Text style={cal.legendText}>Gennemført</Text></View>
        <View style={cal.legendItem}><View style={[cal.legendDot, { backgroundColor: colors.accent, opacity: 0.3 }]} /><Text style={cal.legendText}>Planlagt</Text></View>
        <View style={cal.legendItem}><View style={[cal.legendDot, { backgroundColor: '#e0e0e0' }]} /><Text style={cal.legendText}>Misset</Text></View>
      </View>

      {/* Detail-panel */}
      {selectedCell && (
        <View style={cal.detail}>
          <Text style={cal.detailDate}>
            {DAY_NAMES[(new Date(year, month, selectedCell.dayNum).getDay() + 6) % 7]} {selectedCell.dayNum}. {MONTH_NAMES[month].toLowerCase()}
          </Text>

          {selectedRuns.length > 0 ? (
            selectedRuns.map((r, i) => (
              <View key={i} style={cal.detailRun}>
                <View style={cal.detailRunLeft}>
                  <Text style={cal.detailRunKm}>{r.km?.toFixed(2)} km</Text>
                  <Text style={cal.detailRunMeta}>
                    {r.duration_secs ? `${Math.floor(r.duration_secs/60)} min` : ''}
                    {r.pace_secs_per_km ? `  ·  ${Math.floor(r.pace_secs_per_km/60)}:${String(Math.round(r.pace_secs_per_km%60)).padStart(2,'0')}/km` : ''}
                    {r.avg_hr ? `  ·  ${r.avg_hr} bpm` : ''}
                  </Text>
                </View>
                <View style={cal.detailRunBadge}>
                  <Text style={cal.detailRunBadgeText}>✓ Gennemført</Text>
                </View>
              </View>
            ))
          ) : selectedPlanned ? (
            <View style={cal.detailPlanned}>
              <Text style={cal.detailPlannedName}>
                {selectedPlanned.workout || selectedPlanned.name || selectedPlanned.type}
              </Text>
              {(selectedPlanned.km || selectedPlanned.distance) > 0 &&
                <Text style={cal.detailPlannedSub}>{selectedPlanned.km || selectedPlanned.distance} km planlagt</Text>}
              {selectedPlanned.description && <Text style={cal.detailPlannedDesc}>{selectedPlanned.description}</Text>}
            </View>
          ) : (
            <Text style={cal.detailEmpty}>Ingen løb eller planlagt træning denne dag</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ─── KALENDER STYLES ──────────────────────────────────────────────────────────
const cal = StyleSheet.create({
  wrap:               { marginBottom: 8 },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerCenter:       { alignItems: 'center' },
  monthTitle:         { fontSize: 18, fontWeight: '800', color: colors.black, letterSpacing: -0.5 },
  monthSub:           { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: '600' },
  navBtn:             { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 18 },
  navText:            { fontSize: 20, color: colors.black, lineHeight: 24 },
  dayRow:             { flexDirection: 'row', marginBottom: 6 },
  dayName:            { flex: 1, textAlign: 'center', fontSize: 10, color: colors.muted, fontWeight: '700', letterSpacing: 0.5 },
  grid:               { flexDirection: 'row', flexWrap: 'wrap' },
  cell:               { width: '14.28%', minHeight: 52, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 6, borderRadius: 10, marginBottom: 3, position: 'relative' },
  cellToday:          { backgroundColor: '#f5f5f5', borderWidth: 1.5, borderColor: colors.accent },
  cellSelected:       { backgroundColor: colors.black },
  cellHasRun:         { backgroundColor: colors.accent + '12' },
  cellMissed:         { backgroundColor: '#fafafa' },
  emptyCell:          { width: '14.28%', minHeight: 52 },
  cellDay:            { fontSize: 13, fontWeight: '600', color: colors.dim },
  cellDayToday:       { color: colors.accent, fontWeight: '900' },
  cellKm:             { fontSize: 9, color: colors.accent, fontWeight: '800', marginTop: 1 },
  cellPlan:           { fontSize: 8, fontWeight: '700', marginTop: 1, letterSpacing: 0.2, textAlign: 'center', paddingHorizontal: 1 },
  runDot:             { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent, marginTop: 2 },
  planDot:            { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent, opacity: 0.4, marginTop: 2 },
  missedDot:          { width: 4, height: 4, borderRadius: 2, backgroundColor: '#cccccc', marginTop: 2 },
  legend:             { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 10, marginBottom: 16 },
  legendItem:         { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:          { width: 7, height: 7, borderRadius: 4 },
  legendText:         { fontSize: 10, color: colors.muted, fontWeight: '600' },
  detail:             { backgroundColor: colors.card, borderRadius: 16, padding: 18, marginTop: 4, shadowColor: '#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.05, shadowRadius:6, elevation:1 },
  detailDate:         { fontSize: 11, color: colors.muted, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 },
  detailRun:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  detailRunLeft:      { flex: 1 },
  detailRunKm:        { fontSize: 26, fontWeight: '900', color: colors.black, letterSpacing: -1 },
  detailRunMeta:      { fontSize: 12, color: colors.muted, marginTop: 3 },
  detailRunBadge:     { backgroundColor: colors.accent + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  detailRunBadgeText: { fontSize: 11, fontWeight: '700', color: colors.accent },
  detailPlanned:      { gap: 6 },
  detailPlannedName:  { fontSize: 18, fontWeight: '900', color: colors.black, letterSpacing: -0.3 },
  detailPlannedSub:   { fontSize: 13, color: colors.muted, fontWeight: '600' },
  detailPlannedDesc:  { fontSize: 13, color: colors.dim, marginTop: 4, lineHeight: 20 },
  detailEmpty:        { fontSize: 13, color: colors.muted, fontStyle: 'italic' },
});

export default RunCalendar;
