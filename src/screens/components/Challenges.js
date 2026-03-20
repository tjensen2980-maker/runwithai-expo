/**
 * Challenges.js — RunWithAI Social Challenges & Streaks
 *
 * Features:
 *   - View active challenges with leaderboard
 *   - Create new challenges (streak, distance, frequency)
 *   - Join challenges via invite code
 *   - See friends' streaks and progress
 *
 * Place in: src/screens/components/Challenges.js
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
  Dimensions,
} from 'react-native';
import { colors, SERVER, getAuthToken } from '../../data';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── API HELPERS ────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const token = getAuthToken();
  const res = await fetch(`${SERVER}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API fejl');
  return data;
}

// ─── CHALLENGE TYPE CONFIG ──────────────────────────────────────────────────

const CHALLENGE_TYPES = {
  streak: { emoji: '🔥', label: 'Streak', unit: 'dage', description: 'Løb X dage i træk' },
  distance: { emoji: '📏', label: 'Distance', unit: 'km', description: 'Løb X km i alt' },
  frequency: { emoji: '📅', label: 'Frekvens', unit: 'løb/uge', description: 'Løb X gange om ugen' },
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function Challenges() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  const loadChallenges = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/challenges');
      setChallenges(data);
    } catch (err) {
      console.warn('Load challenges error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadChallenges(); }, [loadChallenges]);

  // ─── SHARE INVITE CODE ──────────────────────────────────────────────────

  const shareChallenge = async (challenge) => {
    try {
      await Share.share({
        message: `Vil du være med i "${challenge.title}" på RunWithAI? 🏃‍♂️🔥\n\nBrug invite-kode: ${challenge.invite_code}\n\nDownload RunWithAI og join!`,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  // ─── CHALLENGE CARD ─────────────────────────────────────────────────────

  const ChallengeCard = ({ item }) => {
    const typeConfig = CHALLENGE_TYPES[item.type] || CHALLENGE_TYPES.streak;
    const leaderboard = item.leaderboard || [];
    const myRank = leaderboard.findIndex(p => p.current_streak >= (item.current_streak || 0)) + 1;

    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => setSelectedChallenge(item)}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={s.cardHeader}>
          <Text style={s.cardEmoji}>{typeConfig.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{item.title}</Text>
            <Text style={s.cardMeta}>
              {item.participant_count} deltager{item.participant_count !== 1 ? 'e' : ''} · {typeConfig.label}
            </Text>
          </View>
          <TouchableOpacity onPress={() => shareChallenge(item)} style={s.shareBtn}>
            <Text style={s.shareBtnText}>📤</Text>
          </TouchableOpacity>
        </View>

        {/* My streak */}
        <View style={s.streakRow}>
          <View style={s.streakBig}>
            <Text style={s.streakNumber}>{item.current_streak || 0}</Text>
            <Text style={s.streakLabel}>
              {item.type === 'streak' ? 'dages streak' :
               item.type === 'distance' ? 'km total' : 'løb denne uge'}
            </Text>
          </View>
          <View style={s.streakSmall}>
            <Text style={s.streakSmallNumber}>{item.best_streak || 0}</Text>
            <Text style={s.streakSmallLabel}>bedste</Text>
          </View>
          <View style={s.streakSmall}>
            <Text style={s.streakSmallNumber}>{parseFloat(item.total_km || 0).toFixed(1)}</Text>
            <Text style={s.streakSmallLabel}>km</Text>
          </View>
        </View>

        {/* Mini leaderboard (top 3) */}
        {leaderboard.length > 1 && (
          <View style={s.miniLeaderboard}>
            {leaderboard.slice(0, 3).map((p, i) => (
              <View key={i} style={s.miniLeaderboardRow}>
                <Text style={s.miniRank}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                </Text>
                <Text style={s.miniName} numberOfLines={1}>
                  {p.name || 'Anonym'}
                </Text>
                <Text style={s.miniValue}>
                  {item.type === 'streak' ? `${p.current_streak}d` :
                   item.type === 'distance' ? `${parseFloat(p.total_km || 0).toFixed(1)}km` :
                   `${p.total_runs} løb`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Invite code */}
        <View style={s.inviteRow}>
          <Text style={s.inviteLabel}>Kode:</Text>
          <Text style={s.inviteCode}>{item.invite_code}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── EMPTY STATE ────────────────────────────────────────────────────────

  const EmptyState = () => (
    <View style={s.empty}>
      <Text style={s.emptyEmoji}>🏃‍♂️</Text>
      <Text style={s.emptyTitle}>Ingen aktive challenges</Text>
      <Text style={s.emptySubtitle}>
        Opret en challenge og invitér venner til at løbe med!
      </Text>
    </View>
  );

  // ─── MAIN RENDER ────────────────────────────────────────────────────────

  return (
    <View style={s.container}>
      {/* Action buttons */}
      <View style={s.actions}>
        <TouchableOpacity style={s.actionBtn} onPress={() => setShowCreate(true)}>
          <Text style={s.actionBtnText}>+ Opret challenge</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, s.actionBtnSecondary]} onPress={() => setShowJoin(true)}>
          <Text style={[s.actionBtnText, s.actionBtnTextSecondary]}>🔗 Join med kode</Text>
        </TouchableOpacity>
      </View>

      {/* Challenge list */}
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={challenges}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ChallengeCard item={item} />}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create modal */}
      <CreateChallengeModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); loadChallenges(); }}
      />

      {/* Join modal */}
      <JoinChallengeModal
        visible={showJoin}
        onClose={() => setShowJoin(false)}
        onJoined={() => { setShowJoin(false); loadChallenges(); }}
      />

      {/* Detail modal */}
      {selectedChallenge && (
        <ChallengeDetailModal
          challenge={selectedChallenge}
          onClose={() => setSelectedChallenge(null)}
          onUpdate={loadChallenges}
        />
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE CHALLENGE MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function CreateChallengeModal({ visible, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('streak');
  const [targetValue, setTargetValue] = useState('7');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      setLoading(true);
      await apiFetch('/challenges', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          type,
          target_value: parseFloat(targetValue),
          description: `${CHALLENGE_TYPES[type].emoji} ${title.trim()}`,
        }),
      });
      setTitle('');
      setTargetValue('7');
      onCreated();
    } catch (err) {
      Alert.alert('Fejl', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Opret challenge</Text>

          <Text style={s.inputLabel}>Titel</Text>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={setTitle}
            placeholder="F.eks. 30-dages streak"
            placeholderTextColor={colors.muted}
          />

          <Text style={s.inputLabel}>Type</Text>
          <View style={s.typeRow}>
            {Object.entries(CHALLENGE_TYPES).map(([key, config]) => (
              <TouchableOpacity
                key={key}
                style={[s.typeBtn, type === key && s.typeBtnActive]}
                onPress={() => setType(key)}
              >
                <Text style={s.typeBtnEmoji}>{config.emoji}</Text>
                <Text style={[s.typeBtnText, type === key && s.typeBtnTextActive]}>
                  {config.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.inputLabel}>Mål ({CHALLENGE_TYPES[type].unit})</Text>
          <TextInput
            style={s.input}
            value={targetValue}
            onChangeText={setTargetValue}
            keyboardType="numeric"
            placeholder="7"
            placeholderTextColor={colors.muted}
          />

          <TouchableOpacity
            style={[s.createBtn, loading && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={loading}
          >
            <Text style={s.createBtnText}>
              {loading ? 'Opretter...' : '🔥 Opret challenge'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelBtnText}>Annuller</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOIN CHALLENGE MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function JoinChallengeModal({ visible, onClose, onJoined }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) return;
    try {
      setLoading(true);
      await apiFetch('/challenges/join', {
        method: 'POST',
        body: JSON.stringify({ invite_code: code.trim() }),
      });
      setCode('');
      onJoined();
    } catch (err) {
      Alert.alert('Fejl', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Join challenge</Text>
          <Text style={s.modalSubtitle}>
            Indtast invite-koden du har fået fra en ven
          </Text>

          <TextInput
            style={[s.input, s.codeInput]}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="F.eks. ABC123"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            maxLength={6}
          />

          <TouchableOpacity
            style={[s.createBtn, loading && { opacity: 0.6 }]}
            onPress={handleJoin}
            disabled={loading}
          >
            <Text style={s.createBtnText}>
              {loading ? 'Joiner...' : '🏃 Join challenge'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelBtnText}>Annuller</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHALLENGE DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function ChallengeDetailModal({ challenge, onClose, onUpdate }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/challenges/${challenge.id}`);
        setDetail(data);
      } catch (err) {
        console.warn('Load detail error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [challenge.id]);

  const handleLeave = async () => {
    Alert.alert(
      'Forlad challenge?',
      'Er du sikker på du vil forlade denne challenge?',
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Forlad',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/challenges/${challenge.id}/leave`, { method: 'DELETE' });
              onClose();
              onUpdate();
            } catch (err) {
              Alert.alert('Fejl', err.message);
            }
          },
        },
      ]
    );
  };

  const typeConfig = CHALLENGE_TYPES[challenge.type] || CHALLENGE_TYPES.streak;

  return (
    <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalSheet, { maxHeight: '85%' }]}>
          <View style={s.modalHandle} />

          {/* Header */}
          <View style={s.detailHeader}>
            <Text style={s.detailEmoji}>{typeConfig.emoji}</Text>
            <Text style={s.detailTitle}>{challenge.title}</Text>
            <Text style={s.detailMeta}>
              Mål: {challenge.target_value} {typeConfig.unit}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginVertical: 32 }} />
          ) : detail ? (
            <FlatList
              data={detail.participants || []}
              keyExtractor={(item, i) => String(i)}
              renderItem={({ item, index }) => (
                <View style={s.leaderboardRow}>
                  <Text style={s.lbRank}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.lbName}>{item.name || 'Anonym'}</Text>
                    <Text style={s.lbStats}>
                      {parseFloat(item.total_km || 0).toFixed(1)} km · {item.total_runs || 0} løb
                    </Text>
                  </View>
                  <View style={s.lbStreakBox}>
                    <Text style={s.lbStreakNumber}>{item.current_streak || 0}</Text>
                    <Text style={s.lbStreakLabel}>streak</Text>
                  </View>
                </View>
              )}
              ListHeaderComponent={
                <Text style={s.sectionTitle}>Leaderboard</Text>
              }
              ListFooterComponent={
                <View style={{ paddingBottom: 20 }}>
                  {/* Recent activity */}
                  {detail.recent_activity?.length > 0 && (
                    <>
                      <Text style={[s.sectionTitle, { marginTop: 16 }]}>Seneste aktivitet</Text>
                      {detail.recent_activity.slice(0, 10).map((a, i) => (
                        <View key={i} style={s.activityRow}>
                          <Text style={s.activityName}>{a.name || 'Anonym'}</Text>
                          <Text style={s.activityDetail}>
                            {parseFloat(a.km || 0).toFixed(1)} km · {a.log_date}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}

                  {/* Leave button */}
                  <TouchableOpacity style={s.leaveBtn} onPress={handleLeave}>
                    <Text style={s.leaveBtnText}>Forlad challenge</Text>
                  </TouchableOpacity>
                </View>
              }
              contentContainerStyle={{ paddingHorizontal: 20 }}
            />
          ) : null}

          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelBtnText}>Luk</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  container: { flex: 1 },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  actionBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  actionBtnTextSecondary: {
    color: colors.accent,
  },

  // Card
  card: {
    backgroundColor: colors.card || '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  shareBtn: {
    padding: 8,
  },
  shareBtnText: {
    fontSize: 20,
  },

  // Streak display
  streakRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 16,
  },
  streakBig: {
    flex: 1,
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.accent,
    lineHeight: 52,
  },
  streakLabel: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  streakSmall: {
    alignItems: 'center',
  },
  streakSmallNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  streakSmallLabel: {
    fontSize: 11,
    color: colors.muted,
  },

  // Mini leaderboard
  miniLeaderboard: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 10,
    marginBottom: 8,
  },
  miniLeaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  miniRank: {
    fontSize: 14,
    width: 28,
  },
  miniName: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  miniValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },

  // Invite
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inviteLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  inviteCode: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 2,
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.bg || '#0f0f1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 20,
  },

  // Form
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.surface || 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 6,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    backgroundColor: colors.surface || 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  typeBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '15',
  },
  typeBtnEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  typeBtnTextActive: {
    color: colors.accent,
  },

  // Buttons
  createBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelBtnText: {
    fontSize: 15,
    color: colors.muted,
  },

  // Detail
  detailHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  detailEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  detailMeta: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },

  // Leaderboard
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  lbRank: {
    fontSize: 16,
    width: 32,
  },
  lbName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  lbStats: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  lbStreakBox: {
    alignItems: 'center',
    backgroundColor: colors.accent + '20',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  lbStreakNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.accent,
  },
  lbStreakLabel: {
    fontSize: 10,
    color: colors.accent,
  },

  // Activity
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  activityName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  activityDetail: {
    fontSize: 13,
    color: colors.muted,
  },

  // Leave
  leaveBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 20,
  },
  leaveBtnText: {
    fontSize: 14,
    color: '#ef4444',
  },
});
