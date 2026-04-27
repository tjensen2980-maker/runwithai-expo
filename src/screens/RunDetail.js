import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors } from '../data';

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
  const km = run.km ? run.km.toFixed(2).replace('.', ',') : '0,00';
  const duration = fmtTime(run.duration_secs || run.duration || 0);
  const pace = fmtPace(run.pace_secs_per_km || run.pace || 0);
  const avgHr = run.avg_hr || run.heart_rate || 0;
  const calories = run.calories || 0;

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
      ) : (
        <View style={[s.mapContainer, s.mapPlaceholder]}>
          <Text style={{ color: colors.muted }}>Ingen rute tilgaengelig</Text>
        </View>
      )}

      <View style={s.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{fmtDate(run.date)}</Text>
        </View>
        <Text style={s.title}>{run.type ? run.type.charAt(0).toUpperCase() + run.type.slice(1) : 'Lob'}</Text>
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

export default function RunDetail({ run, onBack }) {
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
        <Text style={s.headerTitle}>Lob</Text>
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
      {activeTab === 'statistik' && <PlaceholderTab label='Statistik' />}
      {activeTab === 'omgange' && <PlaceholderTab label='Omgange' />}
      {activeTab === 'grafik' && <PlaceholderTab label='Grafik' />}
      {activeTab === 'udstyr' && <PlaceholderTab label='Udstyr' />}
    </View>
  );
}

const s = StyleSheet.create({
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
