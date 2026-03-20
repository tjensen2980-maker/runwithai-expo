import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, getZoneForHR, assessProfile } from '../../data';

// ─── ZONE BAR (horizontal indicator) ──────────────────────────────────────────
export function ZoneBar({ hr, profile, showLabel = true }) {
  const zone = getZoneForHR(hr, profile);
  const assessment = assessProfile(profile);
  
  if (!assessment || !hr) {
    return (
      <View style={s.zoneBar}>
        <View style={s.zoneBarEmpty}>
          <Text style={s.zoneBarEmptyText}>Venter på puls...</Text>
        </View>
      </View>
    );
  }
  
  const { maxHr, restingHr } = assessment;
  const hrRange = maxHr - restingHr;
  const percentage = Math.min(100, Math.max(0, ((hr - restingHr) / hrRange) * 100));
  
  return (
    <View style={s.zoneBar}>
      <View style={s.zoneBarTrack}>
        <View style={[s.zoneSection, { flex: 20, backgroundColor: colors.zone1 }]} />
        <View style={[s.zoneSection, { flex: 20, backgroundColor: colors.zone2 }]} />
        <View style={[s.zoneSection, { flex: 20, backgroundColor: colors.zone3 }]} />
        <View style={[s.zoneSection, { flex: 20, backgroundColor: colors.zone4 }]} />
        <View style={[s.zoneSection, { flex: 20, backgroundColor: colors.zone5 }]} />
        <View style={[s.zoneIndicator, { left: `${percentage}%` }]}>
          <View style={s.zoneIndicatorDot} />
        </View>
      </View>
      {showLabel && (
        <View style={s.zoneBarInfo}>
          <Text style={[s.zoneBarLabel, { color: zone.color }]}>{zone.name}</Text>
          <Text style={s.zoneBarHr}>{hr} bpm</Text>
        </View>
      )}
    </View>
  );
}

// ─── ZONE CIRCLE (main display during run) ────────────────────────────────────
export function ZoneCircle({ hr, profile, size = 160 }) {
  const zone = getZoneForHR(hr, profile);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (hr && hr > 0) {
      const duration = Math.max(300, 60000 / hr);
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: duration * 0.3, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: duration * 0.7, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [hr]);
  
  if (!hr) {
    return (
      <View style={[s.zoneCircle, { width: size, height: size, borderRadius: size/2 }]}>
        <Text style={s.zoneCircleWaiting}>❤️</Text>
        <Text style={s.zoneCircleText}>Forbinder...</Text>
      </View>
    );
  }
  
  return (
    <Animated.View style={[
      s.zoneCircle,
      { 
        width: size, height: size, borderRadius: size/2,
        backgroundColor: zone.color + '20', borderColor: zone.color,
        transform: [{ scale: pulseAnim }]
      }
    ]}>
      <Text style={[s.zoneCircleHr, { color: zone.color }]}>{hr}</Text>
      <Text style={[s.zoneCircleBpm, { color: zone.color }]}>BPM</Text>
      <View style={[s.zoneCircleBadge, { backgroundColor: zone.color }]}>
        <Text style={s.zoneCircleBadgeText}>{zone.name}</Text>
      </View>
    </Animated.View>
  );
}

// ─── ZONE INFO CARD ───────────────────────────────────────────────────────────
export function ZoneInfoCard({ hr, profile }) {
  const zone = getZoneForHR(hr, profile);
  const assessment = assessProfile(profile);
  if (!assessment) return null;
  
  const zoneInfo = {
    0: { title: 'Hvile', desc: 'Din puls er i hvile', advice: 'Tid til at starte!' },
    1: { title: 'Zone 1 - Meget let', desc: 'Opvarmning og nedkøling', advice: 'God til restitution' },
    2: { title: 'Zone 2 - Aerob', desc: 'Fedtforbrænding og udholdenhed', advice: 'Perfekt til lange løb' },
    3: { title: 'Zone 3 - Moderat', desc: 'Forbedrer aerob kapacitet', advice: 'God træningsintensitet' },
    4: { title: 'Zone 4 - Hård', desc: 'Anaerob tærskel træning', advice: 'Øger hastighed' },
    5: { title: 'Zone 5 - Maksimal', desc: 'Sprint og maksimal indsats', advice: 'Brug sparsomt!' },
  };
  
  const info = zoneInfo[zone.zone] || zoneInfo[0];
  
  return (
    <View style={[s.zoneInfoCard, { borderLeftColor: zone.color }]}>
      <View style={s.zoneInfoHeader}>
        <Text style={[s.zoneInfoTitle, { color: zone.color }]}>{info.title}</Text>
        <Text style={s.zoneInfoHr}>{hr || '--'} bpm</Text>
      </View>
      <Text style={s.zoneInfoDesc}>{info.desc}</Text>
      <Text style={s.zoneInfoAdvice}>💡 {info.advice}</Text>
      <View style={s.zoneRange}>
        <Text style={s.zoneRangeText}>
          Zone {zone.zone}: {assessment.zones[`z${zone.zone}`]?.low || '--'} - {assessment.zones[`z${zone.zone}`]?.high || '--'} bpm
        </Text>
      </View>
    </View>
  );
}

// ─── ZONE SUMMARY (post-run) ──────────────────────────────────────────────────
export function ZoneSummary({ hrData, profile }) {
  const assessment = assessProfile(profile);
  if (!assessment || !hrData || hrData.length === 0) return null;
  
  const zoneTimes = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const sampleInterval = 1;
  
  hrData.forEach(hr => {
    const zone = getZoneForHR(hr, profile);
    if (zone.zone >= 1 && zone.zone <= 5) zoneTimes[zone.zone] += sampleInterval;
  });
  
  const totalTime = Object.values(zoneTimes).reduce((a, b) => a + b, 0);
  if (totalTime === 0) return null;
  
  const avgHr = Math.round(hrData.reduce((a, b) => a + b, 0) / hrData.length);
  const maxHr = Math.max(...hrData);
  
  return (
    <View style={s.zoneSummary}>
      <Text style={s.zoneSummaryTitle}>Pulszone fordeling</Text>
      <View style={s.hrStats}>
        <View style={s.hrStat}>
          <Text style={s.hrStatValue}>{avgHr}</Text>
          <Text style={s.hrStatLabel}>Gns. puls</Text>
        </View>
        <View style={s.hrStat}>
          <Text style={s.hrStatValue}>{maxHr}</Text>
          <Text style={s.hrStatLabel}>Max puls</Text>
        </View>
      </View>
      <View style={s.zoneBars}>
        {[5, 4, 3, 2, 1].map(z => {
          const percent = Math.round((zoneTimes[z] / totalTime) * 100);
          const mins = Math.floor(zoneTimes[z] / 60);
          const secs = zoneTimes[z] % 60;
          return (
            <View key={z} style={s.zoneRow}>
              <Text style={[s.zoneRowLabel, { color: colors[`zone${z}`] }]}>Z{z}</Text>
              <View style={s.zoneRowBarBg}>
                <View style={[s.zoneRowBarFill, { width: `${percent}%`, backgroundColor: colors[`zone${z}`] }]} />
              </View>
              <Text style={s.zoneRowTime}>{mins > 0 ? `${mins}m ${secs}s` : `${secs}s`}</Text>
              <Text style={s.zoneRowPercent}>{percent}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── ALL ZONES OVERVIEW ───────────────────────────────────────────────────────
export function ZonesOverview({ profile }) {
  const assessment = assessProfile(profile);
  
  if (!assessment) {
    return (
      <View style={s.zonesOverview}>
        <Text style={s.zonesTitle}>Dine pulszoner</Text>
        <Text style={s.zonesEmpty}>Tilføj din hvilepuls og max puls i profilen for at se dine zoner.</Text>
      </View>
    );
  }
  
  const zones = [
    { z: 1, name: 'Zone 1', desc: 'Meget let', color: colors.zone1, ...assessment.zones.z1 },
    { z: 2, name: 'Zone 2', desc: 'Aerob', color: colors.zone2, ...assessment.zones.z2 },
    { z: 3, name: 'Zone 3', desc: 'Moderat', color: colors.zone3, ...assessment.zones.z3 },
    { z: 4, name: 'Zone 4', desc: 'Hård', color: colors.zone4, ...assessment.zones.z4 },
    { z: 5, name: 'Zone 5', desc: 'Maksimal', color: colors.zone5, ...assessment.zones.z5 },
  ];
  
  return (
    <View style={s.zonesOverview}>
      <Text style={s.zonesTitle}>Dine pulszoner</Text>
      <Text style={s.zonesSubtitle}>Baseret på hvilepuls {assessment.restingHr} og max puls {assessment.maxHr}</Text>
      {zones.map(zone => (
        <View key={zone.z} style={[s.zoneOverviewRow, { borderLeftColor: zone.color }]}>
          <View style={s.zoneOverviewInfo}>
            <Text style={[s.zoneOverviewName, { color: zone.color }]}>{zone.name}</Text>
            <Text style={s.zoneOverviewDesc}>{zone.desc}</Text>
          </View>
          <Text style={s.zoneOverviewRange}>{zone.low} - {zone.high} bpm</Text>
        </View>
      ))}
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  zoneBar: { padding: 12 },
  zoneBarTrack: { height: 12, borderRadius: 6, flexDirection: 'row', overflow: 'hidden', position: 'relative' },
  zoneSection: { height: '100%' },
  zoneIndicator: { position: 'absolute', top: -4, marginLeft: -10 },
  zoneIndicatorDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.card, borderWidth: 3, borderColor: colors.black },
  zoneBarEmpty: { height: 12, backgroundColor: colors.surface, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  zoneBarEmptyText: { fontSize: 10, color: colors.muted },
  zoneBarInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  zoneBarLabel: { fontSize: 14, fontWeight: '600' },
  zoneBarHr: { fontSize: 14, color: colors.dim },
  
  zoneCircle: { alignItems: 'center', justifyContent: 'center', borderWidth: 4, backgroundColor: colors.surface },
  zoneCircleWaiting: { fontSize: 32 },
  zoneCircleText: { fontSize: 12, color: colors.muted, marginTop: 8 },
  zoneCircleHr: { fontSize: 48, fontWeight: '800' },
  zoneCircleBpm: { fontSize: 14, fontWeight: '600', marginTop: -4 },
  zoneCircleBadge: { position: 'absolute', bottom: 20, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  zoneCircleBadgeText: { fontSize: 12, fontWeight: '600', color: colors.card },
  
  zoneInfoCard: { backgroundColor: colors.card, padding: 16, borderLeftWidth: 4, borderRadius: 8, margin: 12 },
  zoneInfoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  zoneInfoTitle: { fontSize: 16, fontWeight: '600' },
  zoneInfoHr: { fontSize: 14, color: colors.dim },
  zoneInfoDesc: { fontSize: 14, color: colors.dim, marginBottom: 8 },
  zoneInfoAdvice: { fontSize: 13, color: colors.muted },
  zoneRange: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  zoneRangeText: { fontSize: 12, color: colors.muted },
  
  zoneSummary: { backgroundColor: colors.card, padding: 16, margin: 12, borderRadius: 12 },
  zoneSummaryTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 16 },
  hrStats: { flexDirection: 'row', marginBottom: 20, gap: 24 },
  hrStat: {},
  hrStatValue: { fontSize: 28, fontWeight: '700', color: colors.text },
  hrStatLabel: { fontSize: 12, color: colors.muted },
  zoneBars: { gap: 8 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoneRowLabel: { width: 24, fontSize: 12, fontWeight: '600' },
  zoneRowBarBg: { flex: 1, height: 20, backgroundColor: colors.surface, borderRadius: 10, overflow: 'hidden' },
  zoneRowBarFill: { height: '100%', borderRadius: 10 },
  zoneRowTime: { width: 60, fontSize: 12, color: colors.dim, textAlign: 'right' },
  zoneRowPercent: { width: 36, fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'right' },
  
  zonesOverview: { backgroundColor: colors.card, padding: 16, margin: 12, borderRadius: 12 },
  zonesTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  zonesSubtitle: { fontSize: 12, color: colors.muted, marginBottom: 16 },
  zonesEmpty: { fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 20 },
  zoneOverviewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingLeft: 12, borderLeftWidth: 4, marginBottom: 8, backgroundColor: colors.surface, borderRadius: 8 },
  zoneOverviewInfo: { flex: 1 },
  zoneOverviewName: { fontSize: 14, fontWeight: '600' },
  zoneOverviewDesc: { fontSize: 12, color: colors.muted },
  zoneOverviewRange: { fontSize: 14, fontWeight: '500', color: colors.text, marginRight: 12 },
});
