import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getActivities } from '../services/NutritionAPI';

const TYPE_META = {
  strength: { emoji: '\uD83D\uDCAA', label: 'Styrke',     color: '#f59e0b' },
  mobility: { emoji: '\uD83E\uDDD8', label: 'Mobility',   color: '#8b5cf6' },
  bike:     { emoji: '\uD83D\uDEB4', label: 'Cykel',      color: '#3b82f6' },
  walk:     { emoji: '\uD83D\uDEB6', label: 'Gaatur',     color: '#10b981' },
  run:      { emoji: '\uD83C\uDFC3', label: 'Loeb',       color: '#ef4444' },
  other:    { emoji: '\u26A1',       label: 'Anden',      color: '#6b7280' },
};

function fmtDuration(sec) {
  if (!sec) return '-';
  const m = Math.round(sec / 60);
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? h + 't' : (h + 't ' + r + 'm');
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return 'I dag';
  if (sameDay(d, yest)) return 'I gaar';
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

export default function RecentActivities({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getActivities({ limit: 10 });
      // Filtrer kun manuelle (ikke GPS-loeb der ligger i 'runs')
      const manual = (list || []).filter(a => a.type !== 'run' || a.source === 'manual');
      setItems(manual);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading) {
    return (
      <View style={s.card}>
        <Text style={s.title}>Seneste traeninger</Text>
        <ActivityIndicator color="#60a5fa" style={{ marginVertical: 16 }} />
      </View>
    );
  }

  if (items.length === 0) return null;

  const visible = expanded ? items : items.slice(0, 3);

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Text style={s.title}>Seneste traeninger</Text>
        <Text style={s.count}>{items.length}</Text>
      </View>
      {visible.map((a) => {
        const meta = TYPE_META[a.type] || TYPE_META.other;
        return (
          <View key={a.id} style={s.row}>
            <View style={[s.iconWrap, { backgroundColor: meta.color + '22' }]}>
              <Text style={s.icon}>{meta.emoji}</Text>
            </View>
            <View style={s.info}>
              <Text style={s.label}>{meta.label}</Text>
              <Text style={s.meta}>{fmtDate(a.started_at)} {String.fromCharCode(0x2022)} {fmtDuration(a.duration_sec)}{a.calories_kcal ? '  ' + String.fromCharCode(0x2022) + '  ' + a.calories_kcal + ' kcal' : ''}</Text>
            </View>
            {a.perceived_effort ? (
              <View style={[s.rpeBadge, { borderColor: meta.color }]}>
                <Text style={[s.rpeTxt, { color: meta.color }]}>RPE {a.perceived_effort}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
      {items.length > 3 ? (
        <TouchableOpacity onPress={() => setExpanded(e => !e)} style={s.expandBtn}>
          <Text style={s.expandTxt}>{expanded ? 'Vis faerre' : ('Vis alle (' + items.length + ')')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginTop: 12, marginHorizontal: 16, borderWidth: 1, borderColor: '#334155' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' },
  count: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#334155' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  label: { color: '#fff', fontSize: 15, fontWeight: '600' },
  meta: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  rpeBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  rpeTxt: { fontSize: 11, fontWeight: '700' },
  expandBtn: { paddingTop: 12, paddingBottom: 4, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#334155', marginTop: 4 },
  expandTxt: { color: '#60a5fa', fontSize: 13, fontWeight: '600' },
});