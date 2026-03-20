import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Animated
} from 'react-native';
import { colors, loadStreak, calculateStreak } from '../../data';

// ─── STREAK FLAME ANIMATION ───────────────────────────────────────────────────
function StreakFlame({ active, size = 40 }) {
  const flickerAnim = React.useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (active) {
      const flicker = Animated.loop(
        Animated.sequence([
          Animated.timing(flickerAnim, { toValue: 1.1, duration: 300, useNativeDriver: true }),
          Animated.timing(flickerAnim, { toValue: 0.95, duration: 200, useNativeDriver: true }),
          Animated.timing(flickerAnim, { toValue: 1.05, duration: 250, useNativeDriver: true }),
          Animated.timing(flickerAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ])
      );
      flicker.start();
      return () => flicker.stop();
    }
  }, [active]);
  
  return (
    <Animated.View style={{ transform: [{ scale: flickerAnim }] }}>
      <Text style={{ fontSize: size, opacity: active ? 1 : 0.3 }}>
        🔥
      </Text>
    </Animated.View>
  );
}

// ─── STREAK CARD (for dashboard) ──────────────────────────────────────────────
export function StreakCard({ runs }) {
  const streak = calculateStreak(runs || []);
  
  return (
    <View style={s.streakCard}>
      <StreakFlame active={streak.current > 0} size={32} />
      <View style={s.streakInfo}>
        <Text style={s.streakCount}>{streak.current}</Text>
        <Text style={s.streakLabel}>DAGES STREAK</Text>
      </View>
      {streak.current > 0 && streak.current === streak.longest && (
        <View style={s.recordBadge}>
          <Text style={s.recordText}>REKORD!</Text>
        </View>
      )}
    </View>
  );
}

// ─── STREAK WIDGET (compact for header) ───────────────────────────────────────
export function StreakWidget({ runs, onPress }) {
  const streak = calculateStreak(runs || []);
  
  if (streak.current === 0) return null;
  
  return (
    <View style={s.streakWidget} onTouchEnd={onPress}>
      <Text style={s.widgetFlame}>🔥</Text>
      <Text style={s.widgetCount}>{streak.current}</Text>
    </View>
  );
}

// ─── STREAK CALENDAR (visual week view) ───────────────────────────────────────
export function StreakCalendar({ runs }) {
  const today = new Date();
  const days = [];
  
  // Få de sidste 7 dage
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  
  // Check hvilke dage der har løb
  const runDates = new Set((runs || []).map(r => {
    const d = new Date(r.date || r.created_at);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }));
  
  const dayNames = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
  
  return (
    <View style={s.calendarContainer}>
      <Text style={s.calendarTitle}>Denne uge</Text>
      <View style={s.calendarRow}>
        {days.map((d, i) => {
          const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const hasRun = runDates.has(dateStr);
          const isToday = i === 6;
          
          return (
            <View key={i} style={s.calendarDay}>
              <Text style={[s.dayName, isToday && s.dayNameToday]}>
                {dayNames[d.getDay()]}
              </Text>
              <View style={[
                s.dayCircle,
                hasRun && s.dayCircleActive,
                isToday && !hasRun && s.dayCircleToday,
              ]}>
                {hasRun ? (
                  <Text style={s.dayCheck}>✓</Text>
                ) : (
                  <Text style={[s.dayNumber, isToday && s.dayNumberToday]}>
                    {d.getDate()}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── MAIN STREAK COMPONENT (full view) ────────────────────────────────────────
export default function Streak({ runs }) {
  const [loading, setLoading] = useState(true);
  const [serverStreak, setServerStreak] = useState(null);
  
  useEffect(() => {
    async function load() {
      const data = await loadStreak();
      setServerStreak(data);
      setLoading(false);
    }
    load();
  }, []);
  
  // Beregn streak lokalt som fallback
  const localStreak = calculateStreak(runs || []);
  const streak = serverStreak || localStreak;
  
  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  
  const current = streak.currentStreak ?? streak.current ?? 0;
  const longest = streak.longestStreak ?? streak.longest ?? 0;
  
  return (
    <View style={s.container}>
      {/* Main streak display */}
      <View style={s.mainStreak}>
        <StreakFlame active={current > 0} size={60} />
        <Text style={s.mainCount}>{current}</Text>
        <Text style={s.mainLabel}>DAGES STREAK</Text>
        
        {current > 0 && (
          <Text style={s.motivationText}>
            {current >= 30 ? '🏆 Fantastisk! Du er en legende!' :
             current >= 14 ? '💪 Imponerende dedication!' :
             current >= 7 ? '🔥 En hel uge! Bliv ved!' :
             current >= 3 ? '✨ Godt gået! Hold momentum!' :
             '🌟 God start! Fortsæt i morgen!'}
          </Text>
        )}
        
        {current === 0 && (
          <Text style={s.motivationText}>
            Start en ny streak i dag! 🏃
          </Text>
        )}
      </View>
      
      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={s.statValue}>{longest}</Text>
          <Text style={s.statLabel}>Længste streak</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statBox}>
          <Text style={s.statValue}>{streak.ranToday ? '✓' : '○'}</Text>
          <Text style={s.statLabel}>Løbet i dag</Text>
        </View>
      </View>
      
      {/* Calendar */}
      <StreakCalendar runs={runs} />
      
      {/* Tips */}
      <View style={s.tipsSection}>
        <Text style={s.tipsTitle}>💡 Streak tips</Text>
        <Text style={s.tipText}>• Et kort løb tæller også som en dag</Text>
        <Text style={s.tipText}>• Løb på samme tid hver dag for at skabe vane</Text>
        <Text style={s.tipText}>• Del din streak med venner for motivation</Text>
      </View>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  // Main streak
  mainStreak: { alignItems: 'center', paddingVertical: 40, backgroundColor: colors.card },
  mainCount: { fontSize: 72, fontWeight: '800', color: colors.text, marginTop: 8 },
  mainLabel: { fontSize: 14, fontWeight: '600', color: colors.muted, letterSpacing: 2, marginTop: 4 },
  motivationText: { fontSize: 16, color: colors.dim, marginTop: 16, textAlign: 'center', paddingHorizontal: 32 },
  
  // Stats row
  statsRow: { flexDirection: 'row', backgroundColor: colors.card, marginTop: 1, paddingVertical: 20 },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700', color: colors.accent },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: colors.border },
  
  // Streak card (dashboard)
  streakCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.card, borderRadius: 16 },
  streakInfo: { marginLeft: 12 },
  streakCount: { fontSize: 28, fontWeight: '700', color: colors.text },
  streakLabel: { fontSize: 10, fontWeight: '600', color: colors.muted, letterSpacing: 1 },
  recordBadge: { marginLeft: 'auto', backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  recordText: { fontSize: 10, fontWeight: '700', color: colors.card },
  
  // Streak widget (compact)
  streakWidget: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accent + '20', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  widgetFlame: { fontSize: 16 },
  widgetCount: { fontSize: 14, fontWeight: '700', color: colors.accent, marginLeft: 4 },
  
  // Calendar
  calendarContainer: { padding: 20, backgroundColor: colors.card, marginTop: 12 },
  calendarTitle: { fontSize: 14, fontWeight: '600', color: colors.dim, marginBottom: 16 },
  calendarRow: { flexDirection: 'row', justifyContent: 'space-between' },
  calendarDay: { alignItems: 'center' },
  dayName: { fontSize: 11, color: colors.muted, marginBottom: 8 },
  dayNameToday: { color: colors.accent, fontWeight: '600' },
  dayCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  dayCircleActive: { backgroundColor: colors.accent },
  dayCircleToday: { borderWidth: 2, borderColor: colors.accent },
  dayCheck: { fontSize: 18, color: colors.card, fontWeight: '700' },
  dayNumber: { fontSize: 14, color: colors.dim },
  dayNumberToday: { color: colors.accent, fontWeight: '600' },
  
  // Tips
  tipsSection: { padding: 20, marginTop: 12 },
  tipsTitle: { fontSize: 14, fontWeight: '600', color: colors.dim, marginBottom: 12 },
  tipText: { fontSize: 13, color: colors.muted, marginBottom: 8 },
});
