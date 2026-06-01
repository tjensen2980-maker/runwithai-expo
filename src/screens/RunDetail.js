import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { colors, getZoneForHR } from '../data';
import Svg, { Path, Line, Text as SvgText, Rect, Circle } from 'react-native-svg';
import { ZoneBar } from './components/PulseZone';

let MapView, Marker, Polyline, PROVIDER_GOOGLE;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    Polyline = Maps.Polyline;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  } catch (e) {}
}

const TABS = [
  { id: 'oversigt', label: 'Oversigt' },
  { id: 'statistik', label: 'Statistik' },
  { id: 'omgange', label: 'Omgange' },
  { id: 'grafik', label: 'Grafik' },
  { id: 'udstyr', label: 'Udstyr' },
];

function fmtTime(secs) {
  if (!secs || secs < 0) return '0:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  return m + ':' + String(s).padStart(2, '0');
}

function fmtPace(paceSecs) {
  if (!paceSecs || paceSecs <= 0) return '--:--';
  const m = Math.floor(paceSecs / 60);
  const s = Math.round(paceSecs % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const days = ['Sondag','Mandag','Tirsdag','Onsdag','Torsdag','Fredag','Lordag'];
    const months = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return day + '. ' + month + '. ' + year + ' @ ' + hh + ':' + mm;
  } catch { return dateStr; }
}

function getRoute(run) {
  if (!run || !run.route) return [];
  try {
    const parsed = typeof run.route === 'string' ? JSON.parse(run.route) : run.route;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(p => ({
      latitude: parseFloat(p.lat || p.latitude),
      longitude: parseFloat(p.lng || p.lon || p.longitude),
    })).filter(c => !isNaN(c.latitude) && !isNaN(c.longitude));
  } catch { return []; }
}

function MetricBox({ value, unit, label }) {
  return (
    <View style={s.metricBox}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={s.metricValue}>{value}</Text>
        {unit ? <Text style={s.metricUnit}> {unit}</Text> : null}
      </View>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

function OversigtTab({ run }) {
  const route = getRoute(run);
  const km = run.km ? parseFloat(run.km).toFixed(2).replace('.', ',') : '0,00';
  const duration = fmtTime(run.duration_secs || run.duration || 0);
  const pace = (run.km && run.km >= 0.1) ? fmtPace(run.pace_secs_per_km || run.pace || 0) : '--:--';
  const avgHr = run.avg_hr || run.heart_rate || 0;
  const calories = run.calories ? Math.round(run.calories) : 0;

  return (
    <ScrollView style={{ flex: 1 }}>
      {route.length >= 2 && MapView ? (
        <View style={s.mapContainer}>
          <MapView
            style={{ flex: 1 }}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={{
              latitude: route[Math.floor(route.length / 2)].latitude,
              longitude: route[Math.floor(route.length / 2)].longitude,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Polyline coordinates={route} strokeColor={colors.accent} strokeWidth={4} />
            <Marker coordinate={route[0]} pinColor='green' />
            <Marker coordinate={route[route.length - 1]} pinColor='red' />
          </MapView>
        </View>
      ) : null}

      <View style={s.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{fmtDate(run.date)}</Text>
        </View>
        <Text style={s.title}>{run.type === 'walk' ? 'Gang' : run.type === 'run' ? 'Løb' : run.type === 'mixed' ? 'Blandet' : 'Løb'}</Text>
        {run.notes ? (
          <Text style={s.notes}>{run.notes}</Text>
        ) : (
          <Text style={s.addNotes}>Tilfoj noter</Text>
        )}

        <View style={s.bigStat}>
          <Text style={s.bigStatValue}>{km}</Text>
          <Text style={s.bigStatUnit}>km</Text>
        </View>
        <Text style={s.bigStatLabel}>Distance</Text>

        <View style={s.metricsGrid}>
          <View style={s.metricRow}>
            <MetricBox value={avgHr > 0 ? avgHr : '--'} unit='bpm' label='Gennemsnitlig puls' />
            <MetricBox value={pace} unit='/km' label='Gennemsnitstempo' />
          </View>
          <View style={s.metricRow}>
            <MetricBox value={duration} label='Samlet tid' />
            <MetricBox value={calories > 0 ? calories : '--'} label='Kalorier i alt' />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function PlaceholderTab({ label }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center' }}>
        {label} kommer snart{String.fromCharCode(46).repeat(3)}
      </Text>
    </View>
  );
}

export default function RunDetail({ run, profile, onBack }) {
  const [activeTab, setActiveTab] = useState('oversigt');

  if (!run) {
    return (
      <View style={s.container}>
        <Text style={{ color: colors.text, padding: 20 }}>Intet lob valgt</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>{String.fromCharCode(60)}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Løb</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsBar} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id} onPress={() => setActiveTab(t.id)} style={[s.tab, activeTab === t.id && s.tabActive]}>
            <Text style={[s.tabLabel, activeTab === t.id && s.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {activeTab === 'oversigt' && <OversigtTab run={run} />}
      {activeTab === 'statistik' && <StatistikTab run={run} profile={profile} />}
      {activeTab === 'omgange' && <OmgangeTab run={run} />}
      {activeTab === 'grafik' && <GrafikTab run={run} profile={profile} />}
      {activeTab === 'udstyr' && <PlaceholderTab label='Udstyr' />}
    </View>
  );
}

const s = StyleSheet.create({
  statSection: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border || '#222' },
  statLabel: { color: colors.muted, fontSize: 14 },
  statValue: { color: colors.text, fontSize: 14, fontWeight: '600' },
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: 50, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.accent, fontSize: 28, fontWeight: '300' },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  tabsBar: { backgroundColor: colors.bg, maxHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { paddingHorizontal: 14, paddingVertical: 12, marginRight: 4 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.text },
  tabLabel: { color: colors.muted, fontSize: 14 },
  tabLabelActive: { color: colors.text, fontWeight: '700' },
  mapContainer: { height: 300, backgroundColor: colors.surface },
  mapPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  section: { padding: 16 },
  title: { color: colors.text, fontSize: 26, fontWeight: '700', marginBottom: 6 },
  notes: { color: colors.muted, fontSize: 13, marginBottom: 16 },
  addNotes: { color: colors.accent, fontSize: 13, marginBottom: 16 },
  bigStat: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  bigStatValue: { color: colors.text, fontSize: 50, fontWeight: '700' },
  bigStatUnit: { color: colors.text, fontSize: 18, marginLeft: 6 },
  bigStatLabel: { color: colors.muted, fontSize: 13, marginBottom: 18 },
  metricsGrid: { borderTopWidth: 1, borderTopColor: colors.border },
  metricRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  metricBox: { flex: 1, padding: 14, borderRightWidth: 1, borderRightColor: colors.border },
  metricValue: { color: colors.text, fontSize: 26, fontWeight: '700' },
  metricUnit: { color: colors.text, fontSize: 13 },
  metricLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
});


function StatistikTab({ run, profile }) {
  const km = parseFloat(run.km) || 0;
  const duration = parseInt(run.duration) || 0;
  const avgHr = run.heart_rate != null ? parseInt(run.heart_rate) : 0;
  const calories = run.calories != null ? parseInt(run.calories) : 0;
  const runningKm = parseFloat(run.running_km) || 0;
  const walkingKm = parseFloat(run.walking_km) || 0;
  const hasMixed = runningKm > 0 && walkingKm > 0;

  const fmtTime = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const ss = sec % 60;
    return h > 0 ? h + 't ' + m + 'm ' + ss + 's' : m + 'm ' + ss + 's';
  };

  const fmtPace = (p) => {
    if (p == null) return '-';
    if (typeof p === 'string' && p.includes(':')) return p;
    const totalSec = typeof p === 'number' ? p : parseFloat(p);
    if (!totalSec || isNaN(totalSec)) return '-';
    let secPerKm = totalSec;
    if (totalSec < 30) secPerKm = totalSec * 60;
    const m = Math.floor(secPerKm / 60);
    const ss = Math.round(secPerKm % 60);
    return m + ':' + (ss < 10 ? '0' + ss : ss);
  };

  const pace = fmtPace(run.pace);
  const calPerKm = km > 0 && calories > 0 ? Math.round(calories / km) : 0;
  const startDate = run.date ? new Date(run.date) : null;
  const dayName = startDate ? startDate.toLocaleDateString('da-DK', { weekday: 'long' }) : '-';
  const startTime = startDate ? startDate.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }) : '-';
  const typeLabel = run.type === 'walk' ? 'Gang' : run.type === 'run' ? 'Løb' : run.type === 'mixed' ? 'Blandet' : 'Løb';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
      <Text style={s.statSection}>Tempo & distance</Text>
      <View style={s.statRow}><Text style={s.statLabel}>Type</Text><Text style={s.statValue}>{typeLabel}</Text></View>
      <View style={s.statRow}><Text style={s.statLabel}>Distance</Text><Text style={s.statValue}>{km.toFixed(2)} km</Text></View>
      <View style={s.statRow}><Text style={s.statLabel}>Samlet tid</Text><Text style={s.statValue}>{fmtTime(duration)}</Text></View>
      <View style={s.statRow}><Text style={s.statLabel}>Gennemsnitstempo</Text><Text style={s.statValue}>{pace} /km</Text></View>
      {hasMixed && (
        <>
          <View style={s.statRow}><Text style={s.statLabel}>Løbet</Text><Text style={s.statValue}>{runningKm.toFixed(2)} km</Text></View>
          <View style={s.statRow}><Text style={s.statLabel}>Gået</Text><Text style={s.statValue}>{walkingKm.toFixed(2)} km</Text></View>
        </>
      )}

      <Text style={s.statSection}>Puls</Text>
      {avgHr > 0 ? (
        <>
          <View style={s.statRow}><Text style={s.statLabel}>Gennemsnitlig puls</Text><Text style={s.statValue}>{avgHr} bpm</Text></View>
          {profile && (
            <View style={{ marginTop: 8, marginBottom: 8 }}>
              <ZoneBar hr={avgHr} profile={profile} />
            </View>
          )}
        </>
      ) : (
        <View style={s.statRow}><Text style={s.statLabel}>Puls</Text><Text style={s.statValue}>Ingen data</Text></View>
      )}

      <Text style={s.statSection}>Energi</Text>
      {calories > 0 ? (
        <>
          <View style={s.statRow}><Text style={s.statLabel}>Kalorier i alt</Text><Text style={s.statValue}>{calories} kcal</Text></View>
          <View style={s.statRow}><Text style={s.statLabel}>Kalorier pr. km</Text><Text style={s.statValue}>{calPerKm} kcal/km</Text></View>
        </>
      ) : (
        <View style={s.statRow}><Text style={s.statLabel}>Kalorier</Text><Text style={s.statValue}>Ingen data</Text></View>
      )}

      <Text style={s.statSection}>Tidspunkt</Text>
      <View style={s.statRow}><Text style={s.statLabel}>Dag</Text><Text style={s.statValue}>{dayName}</Text></View>
      <View style={s.statRow}><Text style={s.statLabel}>Starttid</Text><Text style={s.statValue}>{startTime}</Text></View>
    </ScrollView>
  );
}


function GrafikTab({ run, profile }) {
  const screenWidth = Dimensions.get('window').width - 32;
  const chartHeight = 220;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };

  // Parse hr_samples
  let hrSamples = [];
  try {
    if (typeof run.hr_samples === 'string' && run.hr_samples.length > 2) {
      hrSamples = JSON.parse(run.hr_samples);
    } else if (Array.isArray(run.hr_samples)) {
      hrSamples = run.hr_samples;
    }
  } catch (e) {}

  if (!hrSamples || hrSamples.length < 2) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 40 }}>
          Ingen pulsdata tilgængelig for dette løb.{'\n'}
          Lav et nyt løb med uret for at se grafer.
        </Text>
      </View>
    );
  }

  // Konverter tidsstempler til sekunder fra start
  const startMs = new Date(hrSamples[0].t).getTime();
  const points = hrSamples.map(s => ({
    secs: (new Date(s.t).getTime() - startMs) / 1000,
    bpm: s.bpm
  }));

  const totalSecs = points[points.length - 1].secs;
  const minBpm = Math.min(...points.map(p => p.bpm));
  const maxBpm = Math.max(...points.map(p => p.bpm));
  const yMin = Math.max(40, Math.floor(minBpm / 10) * 10 - 10);
  const yMax = Math.ceil(maxBpm / 10) * 10 + 10;

  const plotW = screenWidth - padding.left - padding.right;
  const plotH = chartHeight - padding.top - padding.bottom;

  const xScale = (s) => padding.left + (s / totalSecs) * plotW;
  const yScale = (b) => padding.top + plotH - ((b - yMin) / (yMax - yMin)) * plotH;

  // Pulszone-farver
  
const zoneColor = (bpm) => {
    const z = getZoneForHR(Math.round(bpm), profile);
    if (!z || z.zone === 0) return colors.zone1 || '#3498db';
    return z.color;
  };

  // Byg path
  const pathD = points.map((p, i) => {
    const x = xScale(p.secs);
    const y = yScale(p.bpm);
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');

  // Format tid
  const fmtMin = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  };

  // Y-akse labels
  const yLabels = [];
  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const v = yMin + ((yMax - yMin) * i / ySteps);
    yLabels.push({ v: Math.round(v), y: yScale(v) });
  }

  // X-akse labels (5 punkter)
  const xLabels = [];
  for (let i = 0; i <= 4; i++) {
    const s = (totalSecs * i / 4);
    xLabels.push({ label: fmtMin(s), x: xScale(s) });
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
        Pulskurve
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}>
        {hrSamples.length} målinger over {fmtMin(totalSecs)} min
      </Text>

      <Svg width={screenWidth} height={chartHeight}>
        {/* Grid lines */}
        {yLabels.map((l, i) => (
          <Line
            key={'gy' + i}
            x1={padding.left}
            y1={l.y}
            x2={padding.left + plotW}
            y2={l.y}
            stroke="#333"
            strokeWidth="0.5"
          />
        ))}

        {/* Y-akse labels */}
        {yLabels.map((l, i) => (
          <SvgText
            key={'yl' + i}
            x={padding.left - 6}
            y={l.y + 4}
            fill={colors.muted}
            fontSize="10"
            textAnchor="end"
          >
            {l.v}
          </SvgText>
        ))}

        {/* X-akse labels */}
        {xLabels.map((l, i) => (
          <SvgText
            key={'xl' + i}
            x={l.x}
            y={chartHeight - padding.bottom + 14}
            fill={colors.muted}
            fontSize="10"
            textAnchor="middle"
          >
            {l.label}
          </SvgText>
        ))}

        {/* Pulslinje - segmenter med farver per zone */}
        {points.slice(1).map((p, i) => {
          const prev = points[i];
          return (
            <Line
              key={'seg' + i}
              x1={xScale(prev.secs)}
              y1={yScale(prev.bpm)}
              x2={xScale(p.secs)}
              y2={yScale(p.bpm)}
              stroke={zoneColor((prev.bpm + p.bpm) / 2)}
              strokeWidth="2"
            />
          );
        })}
      </Svg>

      {/* Statistik under grafen */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>Min</Text>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{minBpm}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>Gennemsnit</Text>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>
            {Math.round(points.reduce((a, p) => a + p.bpm, 0) / points.length)}
          </Text>
        </View>
<View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>Max</Text>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{maxBpm}</Text>
        </View>
      </View>

      {/* Tempo-graf */}
      <TempoGraph run={run} />

      {/* Højde-graf */}
      <AltitudeGraph run={run} />
    </ScrollView>
  );
}

function TempoGraph({ run }) {
  const screenWidth = Dimensions.get('window').width - 32;
  const chartHeight = 220;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };

  // Parse route
  let route = [];
  try {
    if (typeof run.route === 'string' && run.route.length > 2) {
      const parsed = JSON.parse(run.route);
      if (Array.isArray(parsed)) route = parsed;
    } else if (Array.isArray(run.route)) {
      route = run.route;
    }
  } catch (e) {}

  if (!Array.isArray(route)) route = [];

  // Filtrer kun punkter med timestamp
  const pts = route
    .map(p => ({
      lat: parseFloat(p.lat || p.latitude),
      lng: parseFloat(p.lng || p.lon || p.longitude),
      t: p.t || p.timestamp || p.time
    }))
    .filter(p => !isNaN(p.lat) && !isNaN(p.lng) && p.t);

  if (pts.length < 4) {
    return (
      <View style={{ marginTop: 30 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Tempo
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Ikke nok GPS-data til tempo-graf.
        </Text>
      </View>
    );
  }

  // Haversine afstand i meter
  const dist = (a, b) => {
    const R = 6371000;
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const x = Math.sin(dLat/2)**2 + Math.sin(dLng/2)**2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.sqrt(x));
  };

  // Konverter timestamps til sekunder fra start
  const startMs = new Date(pts[0].t).getTime();
  const enriched = pts.map(p => ({
    ...p,
    secs: (new Date(p.t).getTime() - startMs) / 1000
  }));

  // Beregn pace i ~30 sek vinduer
  const windowSec = 30;
  const totalSecs = enriched[enriched.length - 1].secs;
  const paces = [];
  let i = 0;
  while (i < enriched.length - 1) {
    const startIdx = i;
    const startTime = enriched[i].secs;
    let j = i + 1;
    let d = 0;
    while (j < enriched.length && enriched[j].secs - startTime < windowSec) {
      d += dist(enriched[j-1], enriched[j]);
      j++;
    }
    if (j >= enriched.length) {
      d += enriched[j-1] && enriched[startIdx] ? 0 : 0;
      // tag sidste segment med
      if (j - 1 > startIdx) {
        const dt = enriched[j-1].secs - startTime;
        if (d > 5 && dt > 5) {
          const pacePerKm = (dt / d) * 1000;
          paces.push({ secs: (startTime + enriched[j-1].secs) / 2, pace: pacePerKm });
        }
      }
      break;
    }
    const dt = enriched[j].secs - startTime;
    if (d > 5 && dt > 0) {
      const pacePerKm = (dt / d) * 1000;
      paces.push({ secs: (startTime + enriched[j].secs) / 2, pace: pacePerKm });
    }
    i = j;
  }

  if (paces.length < 2) {
    return (
      <View style={{ marginTop: 30 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Tempo
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Ikke nok bevægelse til tempo-graf.
        </Text>
      </View>
    );
  }

  // 3-punkts glidende gennemsnit
  const smoothed = paces.map((p, idx) => {
    const a = paces[Math.max(0, idx-1)].pace;
    const b = p.pace;
    const c = paces[Math.min(paces.length-1, idx+1)].pace;
    return { secs: p.secs, pace: (a + b + c) / 3 };
  });

  // Filtrer urealistiske pace-værdier (over 30 min/km eller under 2 min/km)
  const valid = smoothed.filter(p => p.pace > 120 && p.pace < 1800);
  if (valid.length < 2) {
    return (
      <View style={{ marginTop: 30 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Tempo
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Tempo-data uden for normalt interval.
        </Text>
      </View>
    );
  }

  const minPace = Math.min(...valid.map(p => p.pace));
  const maxPace = Math.max(...valid.map(p => p.pace));
  const yMin = Math.floor(minPace / 30) * 30;
  const yMax = Math.ceil(maxPace / 30) * 30;

  const plotW = screenWidth - padding.left - padding.right;
  const plotH = chartHeight - padding.top - padding.bottom;

  // Vendt y-akse: lav pace (hurtig) øverst
  const xScale = (s) => padding.left + (s / totalSecs) * plotW;
  const yScale = (p) => padding.top + ((p - yMin) / (yMax - yMin)) * plotH;

  const pathD = valid.map((p, i) => {
    const x = xScale(p.secs);
    const y = yScale(p.pace);
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');

  const fmtMin = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  };

  const fmtPace = (sec) => {
    const m = Math.floor(sec / 60);
    const ss = Math.round(sec % 60);
    return m + ':' + (ss < 10 ? '0' + ss : ss);
  };

  // Y-akse labels (4 punkter)
  const yLabels = [];
  for (let k = 0; k <= 4; k++) {
    const v = yMin + ((yMax - yMin) * k / 4);
    yLabels.push({ v: fmtPace(v), y: yScale(v) });
  }

  // X-akse labels
  const xLabels = [];
  for (let k = 0; k <= 4; k++) {
    const sx = (totalSecs * k / 4);
    xLabels.push({ label: fmtMin(sx), x: xScale(sx) });
  }

  const avgPace = valid.reduce((a, p) => a + p.pace, 0) / valid.length;

  return (
    <View style={{ marginTop: 30 }}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
        Tempo
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}>
        min/km over tid
      </Text>

      <Svg width={screenWidth} height={chartHeight}>
        {yLabels.map((l, i) => (
          <Line key={'tgy' + i} x1={padding.left} y1={l.y} x2={padding.left + plotW} y2={l.y} stroke="#333" strokeWidth="0.5" />
        ))}
        {yLabels.map((l, i) => (
          <SvgText key={'tyl' + i} x={padding.left - 6} y={l.y + 4} fill={colors.muted} fontSize="10" textAnchor="end">
            {l.v}
          </SvgText>
        ))}
        {xLabels.map((l, i) => (
          <SvgText key={'txl' + i} x={l.x} y={chartHeight - padding.bottom + 14} fill={colors.muted} fontSize="10" textAnchor="middle">
            {l.label}
          </SvgText>
        ))}
        <Path d={pathD} stroke={colors.accent} strokeWidth="2" fill="none" />
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>Hurtigst</Text>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{fmtPace(minPace)}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>Gennemsnit</Text>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{fmtPace(avgPace)}</Text>
        </View>
       <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>Langsomst</Text>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{fmtPace(maxPace)}</Text>
        </View>
      </View>
    </View>
  );
}

function AltitudeGraph({ run }) {
  const screenWidth = Dimensions.get('window').width - 32;
  const chartHeight = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };

  let route = [];
  try {
    if (typeof run.route === 'string' && run.route.length > 2) {
      const parsed = JSON.parse(run.route);
      if (Array.isArray(parsed)) route = parsed;
    } else if (Array.isArray(run.route)) {
      route = run.route;
    }
  } catch (e) {}
  if (!Array.isArray(route)) route = [];

  // Filtrer punkter med altitude
  const pts = route
    .map(p => ({
      lat: parseFloat(p.lat || p.latitude),
      lng: parseFloat(p.lng || p.lon || p.longitude),
      alt: parseFloat(p.alt || p.altitude)
    }))
    .filter(p => !isNaN(p.lat) && !isNaN(p.lng) && !isNaN(p.alt));

  if (pts.length < 4) {
    return (
      <View style={{ marginTop: 30 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Højde
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Ingen højdedata for dette løb.
        </Text>
      </View>
    );
  }

  // Haversine
  const dist = (a, b) => {
    const R = 6371000;
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const x = Math.sin(dLat/2)**2 + Math.sin(dLng/2)**2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.sqrt(x));
  };

  // Beregn kumulativ distance per punkt
  let cum = 0;
  const enriched = pts.map((p, i) => {
    if (i > 0) cum += dist(pts[i-1], p);
    return { km: cum / 1000, alt: p.alt };
  });

  // Glat altitude med 5-punkts glidende gennemsnit
  const smoothed = enriched.map((p, i) => {
    let sum = 0, n = 0;
    for (let k = -2; k <= 2; k++) {
      const idx = i + k;
      if (idx >= 0 && idx < enriched.length) {
        sum += enriched[idx].alt;
        n++;
      }
    }
    return { km: p.km, alt: sum / n };
  });

  const totalKm = smoothed[smoothed.length - 1].km;
  if (totalKm < 0.05) {
    return (
      <View style={{ marginTop: 30 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Højde
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          For kort distance til højdeprofil.
        </Text>
      </View>
    );
  }

  const minAlt = Math.min(...smoothed.map(p => p.alt));
  const maxAlt = Math.max(...smoothed.map(p => p.alt));
  const altRange = Math.max(5, maxAlt - minAlt);
  const yMin = Math.floor((minAlt - altRange * 0.1) / 5) * 5;
  const yMax = Math.ceil((maxAlt + altRange * 0.1) / 5) * 5;

  // Beregn samlet stigning
  let totalGain = 0;
  for (let i = 1; i < smoothed.length; i++) {
    const d = smoothed[i].alt - smoothed[i-1].alt;
    if (d > 0) totalGain += d;
  }

  const plotW = screenWidth - padding.left - padding.right;
  const plotH = chartHeight - padding.top - padding.bottom;
  const xScale = (k) => padding.left + (k / totalKm) * plotW;
  const yScale = (a) => padding.top + plotH - ((a - yMin) / (yMax - yMin)) * plotH;

  // Path til linje
  const pathD = smoothed.map((p, i) => {
    const x = xScale(p.km);
    const y = yScale(p.alt);
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');

  // Path til fyld (tilbage til bunden)
  const fillD = pathD +
    ' L' + xScale(totalKm).toFixed(1) + ',' + (padding.top + plotH).toFixed(1) +
    ' L' + xScale(0).toFixed(1) + ',' + (padding.top + plotH).toFixed(1) + ' Z';

  // Y-akse labels
  const yLabels = [];
  for (let k = 0; k <= 4; k++) {
    const v = yMin + ((yMax - yMin) * k / 4);
    yLabels.push({ v: Math.round(v), y: yScale(v) });
  }

  // X-akse labels
  const xLabels = [];
  for (let k = 0; k <= 4; k++) {
    const kx = (totalKm * k / 4);
    xLabels.push({ label: kx.toFixed(1), x: xScale(kx) });
  }

  return (
    <View style={{ marginTop: 30 }}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
        Højde
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}>
        meter over havet, per km
      </Text>

      <Svg width={screenWidth} height={chartHeight}>
        {yLabels.map((l, i) => (
          <Line key={'agy' + i} x1={padding.left} y1={l.y} x2={padding.left + plotW} y2={l.y} stroke="#333" strokeWidth="0.5" />
        ))}
        {yLabels.map((l, i) => (
          <SvgText key={'ayl' + i} x={padding.left - 6} y={l.y + 4} fill={colors.muted} fontSize="10" textAnchor="end">
            {l.v}
          </SvgText>
        ))}
        {xLabels.map((l, i) => (
          <SvgText key={'axl' + i} x={l.x} y={chartHeight - padding.bottom + 14} fill={colors.muted} fontSize="10" textAnchor="middle">
            {l.label}
          </SvgText>
        ))}
        <Path d={fillD} fill="rgba(46, 204, 113, 0.2)" stroke="none" />
        <Path d={pathD} stroke="#2ecc71" strokeWidth="2" fill="none" />
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>Min</Text>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{Math.round(minAlt)} m</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>Max</Text>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{Math.round(maxAlt)} m</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>Stigning</Text>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>+{Math.round(totalGain)} m</Text>
        </View>
      </View>
    </View>
  );
}


function OmgangeTab({ run }) {
  let route = [];
  try {
    if (typeof run.route === 'string' && run.route.length > 2) {
      const parsed = JSON.parse(run.route);
      if (Array.isArray(parsed)) route = parsed;
    } else if (Array.isArray(run.route)) {
      route = run.route;
    }
  } catch (e) {}
  if (!Array.isArray(route)) route = [];

  let hrSamples = [];
  try {
    if (typeof run.hr_samples === 'string' && run.hr_samples.length > 2) {
      const parsed = JSON.parse(run.hr_samples);
      if (Array.isArray(parsed)) hrSamples = parsed;
    } else if (Array.isArray(run.hr_samples)) {
      hrSamples = run.hr_samples;
    }
  } catch (e) {}

  const pts = route.map(p => ({
    lat: parseFloat(p.lat || p.latitude),
    lng: parseFloat(p.lng || p.lon || p.longitude),
    alt: parseFloat(p.alt || p.altitude),
    t: p.t || p.timestamp || p.time
  })).filter(p => !isNaN(p.lat) && !isNaN(p.lng) && p.t);

  if (pts.length < 4) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 40 }}>
          Ingen omgangsdata. Lav et nyt løb med uret.
        </Text>
      </View>
    );
  }

  const dist = (a, b) => {
    const R = 6371000;
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const x = Math.sin(dLat/2)**2 + Math.sin(dLng/2)**2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.sqrt(x));
  };

  const enriched = pts.map(p => ({ ...p, secs: (new Date(p.t).getTime() - new Date(pts[0].t).getTime()) / 1000, ms: new Date(p.t).getTime() }));
  let totalM = 0; const cum = [0];
  for (let i = 1; i < enriched.length; i++) { totalM += dist(enriched[i-1], enriched[i]); cum.push(totalM); }
  const totalKm = totalM / 1000;
  if (totalKm < 0.1) return (<View style={{ padding: 20 }}><Text style={{ color: colors.muted, textAlign: 'center', marginTop: 40 }}>For kort distance.</Text></View>);

  const hrEnriched = hrSamples.map(s => ({ ms: new Date(s.t).getTime(), bpm: s.bpm })).filter(h => !isNaN(h.ms) && h.bpm);
  const hrInRange = (msStart, msEnd) => {
    const inR = hrEnriched.filter(h => h.ms >= msStart && h.ms <= msEnd);
    if (inR.length === 0) return { avg: null, max: null };
    return { avg: Math.round(inR.reduce((a, h) => a + h.bpm, 0) / inR.length), max: Math.max(...inR.map(h => h.bpm)) };
  };

  const splitDistM = totalKm >= 1 ? 1000 : 500;
  const numSplits = Math.floor(totalM / splitDistM);
  const laps = [];
  for (let sp = 0; sp < numSplits; sp++) {
    const startD = sp * splitDistM; const endD = (sp + 1) * splitDistM;
    let startT = null, endT = null, startMs = null, endMs = null, gain = 0, lastAlt = null;
    for (let i = 1; i < cum.length; i++) {
      if (startT === null && cum[i] >= startD) {
        const r = (startD - cum[i-1]) / (cum[i] - cum[i-1]);
        startT = enriched[i-1].secs + r * (enriched[i].secs - enriched[i-1].secs);
        startMs = enriched[i-1].ms + r * (enriched[i].ms - enriched[i-1].ms);
        if (!isNaN(enriched[i-1].alt)) lastAlt = enriched[i-1].alt;
      }
      if (startT !== null && cum[i] <= endD && !isNaN(enriched[i].alt)) {
        if (lastAlt !== null) { const d = enriched[i].alt - lastAlt; if (d > 0) gain += d; }
        lastAlt = enriched[i].alt;
      }
      if (endT === null && cum[i] >= endD) {
        const r = (endD - cum[i-1]) / (cum[i] - cum[i-1]);
        endT = enriched[i-1].secs + r * (enriched[i].secs - enriched[i-1].secs);
        endMs = enriched[i-1].ms + r * (enriched[i].ms - enriched[i-1].ms);
        break;
      }
    }
    if (startT !== null && endT !== null && endT > startT) {
      const dt = endT - startT;
      const pacePerKm = (dt / splitDistM) * 1000;
      const hr = hrInRange(startMs, endMs);
      laps.push({ num: sp + 1, distKm: splitDistM / 1000, durationSec: dt, pace: pacePerKm, avgHr: hr.avg, maxHr: hr.max, gain: Math.round(gain), partial: false });
    }
  }

  const remaining = totalM - numSplits * splitDistM;
  if (remaining > splitDistM * 0.05) {
    const startD = numSplits * splitDistM;
    let startT = null, startMs = null, gain = 0, lastAlt = null;
    for (let i = 1; i < cum.length; i++) {
      if (startT === null && cum[i] >= startD) {
        const r = (startD - cum[i-1]) / (cum[i] - cum[i-1]);
        startT = enriched[i-1].secs + r * (enriched[i].secs - enriched[i-1].secs);
        startMs = enriched[i-1].ms + r * (enriched[i].ms - enriched[i-1].ms);
        lastAlt = enriched[i-1].alt;
      }
      if (startT !== null && !isNaN(enriched[i].alt) && !isNaN(lastAlt)) {
        const d = enriched[i].alt - lastAlt; if (d > 0) gain += d; lastAlt = enriched[i].alt;
      }
    }
    const endT = enriched[enriched.length - 1].secs;
    const endMs = enriched[enriched.length - 1].ms;
    if (startT !== null && endT > startT) {
      const dt = endT - startT;
      const pacePerKm = (dt / remaining) * 1000;
      const hr = hrInRange(startMs, endMs);
      laps.push({ num: numSplits + 1, distKm: remaining / 1000, durationSec: dt, pace: pacePerKm, avgHr: hr.avg, maxHr: hr.max, gain: Math.round(gain), partial: true });
    }
  }

  if (laps.length === 0) return (<View style={{ padding: 20 }}><Text style={{ color: colors.muted, textAlign: 'center', marginTop: 40 }}>Kunne ikke beregne omgange.</Text></View>);

  const fmtTime = (sec) => { const m = Math.floor(sec / 60); const ss = Math.round(sec % 60); return m + ':' + (ss < 10 ? '0' + ss : ss); };
  const fmtPace = (sec) => { const m = Math.floor(sec / 60); const ss = Math.round(sec % 60); return m + ':' + (ss < 10 ? '0' + ss : ss); };
  const hasHr = laps.some(l => l.avgHr !== null);
  const hasAlt = laps.some(l => l.gain > 0);

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
          Omgange ({(splitDistM / 1000).toFixed(splitDistM === 500 ? 1 : 0)} km)
        </Text>
        <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={[so.head, { flex: 0.6 }]}>#</Text>
          <Text style={[so.head, { flex: 1.2 }]}>Distance</Text>
          <Text style={[so.head, { flex: 1 }]}>Tid</Text>
          <Text style={[so.head, { flex: 1.2 }]}>Tempo</Text>
          {hasHr && <Text style={[so.head, { flex: 1 }]}>Puls</Text>}
          {hasAlt && <Text style={[so.head, { flex: 1, textAlign: 'right' }]}>Stign.</Text>}
        </View>
        {laps.map((l, i) => (
          <View key={'lap' + i} style={{ flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, opacity: l.partial ? 0.7 : 1 }}>
            <Text style={[so.cell, { flex: 0.6 }]}>{l.num}</Text>
            <Text style={[so.cell, { flex: 1.2 }]}>{l.distKm.toFixed(2)} km</Text>
            <Text style={[so.cell, { flex: 1 }]}>{fmtTime(l.durationSec)}</Text>
            <Text style={[so.cell, { flex: 1.2 }]}>{fmtPace(l.pace)} /km</Text>
            {hasHr && <Text style={[so.cell, { flex: 1 }]}>{l.avgHr ? l.avgHr : '-'}</Text>}
            {hasAlt && <Text style={[so.cell, { flex: 1, textAlign: 'right' }]}>{l.gain > 0 ? '+' + l.gain + 'm' : '-'}</Text>}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const so = StyleSheet.create({
  head: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  cell: { color: colors.text, fontSize: 13 }
});
