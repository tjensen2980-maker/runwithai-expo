import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Animated
} from 'react-native';
import { colors, BADGES, loadBadges } from '../../data';

// ─── BADGE CARD ───────────────────────────────────────────────────────────────
function BadgeCard({ badge, earned, earnedAt, onPress }) {
  const opacity = earned ? 1 : 0.4;
  
  return (
    <TouchableOpacity 
      style={[s.badgeCard, { opacity }]} 
      onPress={() => onPress(badge)}
      activeOpacity={0.7}
    >
      <View style={[s.badgeIcon, earned && s.badgeIconEarned]}>
        <Text style={s.badgeEmoji}>{badge.emoji}</Text>
      </View>
      <Text style={s.badgeName} numberOfLines={1}>{badge.name}</Text>
      {earned && earnedAt && (
        <Text style={s.badgeDate}>
          {new Date(earnedAt).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── BADGE DETAIL MODAL ───────────────────────────────────────────────────────
function BadgeModal({ badge, earned, earnedAt, visible, onClose }) {
  if (!badge) return null;
  
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={s.modalContent}>
          <View style={[s.modalBadgeIcon, earned && s.badgeIconEarned]}>
            <Text style={s.modalBadgeEmoji}>{badge.emoji}</Text>
          </View>
          <Text style={s.modalBadgeName}>{badge.name}</Text>
          <Text style={s.modalBadgeDesc}>{badge.desc}</Text>
          
          {earned ? (
            <View style={s.earnedBadge}>
              <Text style={s.earnedText}>✓ Optjent</Text>
              <Text style={s.earnedDate}>
                {new Date(earnedAt).toLocaleDateString('da-DK', { 
                  day: 'numeric', month: 'long', year: 'numeric' 
                })}
              </Text>
            </View>
          ) : (
            <View style={s.lockedBadge}>
              <Text style={s.lockedText}>🔒 Ikke optjent endnu</Text>
            </View>
          )}
          
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Text style={s.closeBtnText}>Luk</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── NEW BADGE CELEBRATION ────────────────────────────────────────────────────
export function NewBadgeCelebration({ badges, onDismiss }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (badges && badges.length > 0) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [badges, currentIndex]);
  
  if (!badges || badges.length === 0) return null;
  
  const badge = BADGES[badges[currentIndex]];
  if (!badge) return null;
  
  const handleNext = () => {
    if (currentIndex < badges.length - 1) {
      setCurrentIndex(currentIndex + 1);
      scaleAnim.setValue(0);
    } else {
      onDismiss();
    }
  };
  
  return (
    <Modal visible transparent animationType="fade">
      <View style={s.celebrationOverlay}>
        <Animated.View style={[s.celebrationContent, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={s.celebrationTitle}>🎉 Ny badge!</Text>
          
          <View style={s.celebrationBadge}>
            <Text style={s.celebrationEmoji}>{badge.emoji}</Text>
          </View>
          
          <Text style={s.celebrationName}>{badge.name}</Text>
          <Text style={s.celebrationDesc}>{badge.desc}</Text>
          
          <TouchableOpacity style={s.celebrationBtn} onPress={handleNext}>
            <Text style={s.celebrationBtnText}>
              {currentIndex < badges.length - 1 ? 'Næste →' : 'Fedt!'}
            </Text>
          </TouchableOpacity>
          
          {badges.length > 1 && (
            <Text style={s.celebrationCounter}>
              {currentIndex + 1} / {badges.length}
            </Text>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── MAIN BADGES COMPONENT ────────────────────────────────────────────────────
export default function Badges() {
  const [loading, setLoading] = useState(true);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  
  useEffect(() => {
    async function load() {
      const data = await loadBadges();
      setEarnedBadges(data.earned || []);
      setLoading(false);
    }
    load();
  }, []);
  
  const earnedMap = {};
  earnedBadges.forEach(b => { earnedMap[b.id] = b.earnedAt; });
  
  const categories = [
    { id: 'all', label: 'Alle' },
    { id: 'distance', label: 'Distance' },
    { id: 'single_run', label: 'Løb' },
    { id: 'streak', label: 'Streak' },
    { id: 'speed', label: 'Fart' },
    { id: 'social', label: 'Social' },
  ];
  
  const filteredBadges = Object.values(BADGES).filter(b => 
    activeCategory === 'all' || b.category === activeCategory
  );
  
  const earnedCount = Object.keys(earnedMap).length;
  const totalCount = Object.keys(BADGES).length;
  const progress = Math.round((earnedCount / totalCount) * 100);
  
  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  
  return (
    <View style={s.container}>
      {/* Progress header */}
      <View style={s.progressHeader}>
        <Text style={s.progressTitle}>Dine badges</Text>
        <View style={s.progressStats}>
          <Text style={s.progressCount}>{earnedCount}/{totalCount}</Text>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      </View>
      
      {/* Category tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={s.categoryTabs}
      >
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[s.categoryTab, activeCategory === cat.id && s.categoryTabActive]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Text style={[s.categoryTabText, activeCategory === cat.id && s.categoryTabTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Badges grid */}
      <ScrollView contentContainerStyle={s.badgesGrid}>
        {filteredBadges.map(badge => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            earned={!!earnedMap[badge.id]}
            earnedAt={earnedMap[badge.id]}
            onPress={setSelectedBadge}
          />
        ))}
      </ScrollView>
      
      {/* Badge detail modal */}
      <BadgeModal
        badge={selectedBadge}
        earned={selectedBadge ? !!earnedMap[selectedBadge.id] : false}
        earnedAt={selectedBadge ? earnedMap[selectedBadge.id] : null}
        visible={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  // Progress header
  progressHeader: { padding: 20, backgroundColor: colors.card },
  progressTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 12 },
  progressStats: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressCount: { fontSize: 16, fontWeight: '600', color: colors.accent },
  progressBar: { flex: 1, height: 8, backgroundColor: colors.surface, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },
  
  // Category tabs
  categoryTabs: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  categoryTab: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.surface, borderRadius: 20 },
  categoryTabActive: { backgroundColor: colors.black },
  categoryTabText: { fontSize: 13, color: colors.dim, fontWeight: '500' },
  categoryTabTextActive: { color: colors.card },
  
  // Badges grid
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  badgeCard: { width: '30%', alignItems: 'center', padding: 12, backgroundColor: colors.card, borderRadius: 16 },
  badgeIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  badgeIconEarned: { backgroundColor: colors.accent + '20', borderWidth: 2, borderColor: colors.accent },
  badgeEmoji: { fontSize: 28 },
  badgeName: { fontSize: 11, fontWeight: '600', color: colors.text, textAlign: 'center' },
  badgeDate: { fontSize: 9, color: colors.muted, marginTop: 4 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  modalContent: { width: '80%', backgroundColor: colors.card, borderRadius: 24, padding: 24, alignItems: 'center' },
  modalBadgeIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalBadgeEmoji: { fontSize: 40 },
  modalBadgeName: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 },
  modalBadgeDesc: { fontSize: 14, color: colors.dim, textAlign: 'center', marginBottom: 16 },
  earnedBadge: { alignItems: 'center', marginBottom: 16 },
  earnedText: { fontSize: 14, fontWeight: '600', color: colors.green },
  earnedDate: { fontSize: 12, color: colors.muted, marginTop: 4 },
  lockedBadge: { marginBottom: 16 },
  lockedText: { fontSize: 14, color: colors.muted },
  closeBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.black, borderRadius: 12 },
  closeBtnText: { fontSize: 14, fontWeight: '600', color: colors.card },
  
  // Celebration
  celebrationOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center' },
  celebrationContent: { width: '85%', backgroundColor: colors.card, borderRadius: 24, padding: 32, alignItems: 'center' },
  celebrationTitle: { fontSize: 24, fontWeight: '700', color: colors.accent, marginBottom: 24 },
  celebrationBadge: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.accent + '20', borderWidth: 3, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  celebrationEmoji: { fontSize: 50 },
  celebrationName: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
  celebrationDesc: { fontSize: 15, color: colors.dim, textAlign: 'center', marginBottom: 24 },
  celebrationBtn: { paddingHorizontal: 32, paddingVertical: 14, backgroundColor: colors.accent, borderRadius: 12 },
  celebrationBtnText: { fontSize: 16, fontWeight: '700', color: colors.card },
  celebrationCounter: { fontSize: 12, color: colors.muted, marginTop: 12 },
});
