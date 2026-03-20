import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, RefreshControl, Image, Modal
} from 'react-native';
import { colors, loadFeed, giveKudos, addComment, shareRun } from '../../data';

// ─── KUDOS EMOJIS ─────────────────────────────────────────────────────────────
const KUDOS_OPTIONS = ['🔥', '💪', '👏', '⚡', '🏃', '❤️', '🎉', '👊'];

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────────
function formatPace(secsPerKm) {
  if (!secsPerKm) return '-';
  const mins = Math.floor(secsPerKm / 60);
  const secs = Math.round(secsPerKm % 60);
  return `${mins}:${String(secs).padStart(2, '0')}/km`;
}

function formatDuration(secs) {
  if (!secs) return '-';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Lige nu';
  if (diffMins < 60) return `${diffMins} min siden`;
  if (diffHours < 24) return `${diffHours} timer siden`;
  if (diffDays === 1) return 'I går';
  if (diffDays < 7) return `${diffDays} dage siden`;
  return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

// ─── KUDOS PICKER ─────────────────────────────────────────────────────────────
function KudosPicker({ visible, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.pickerOverlay} activeOpacity={1} onPress={onClose}>
        <View style={s.pickerContent}>
          <Text style={s.pickerTitle}>Giv kudos</Text>
          <View style={s.pickerGrid}>
            {KUDOS_OPTIONS.map(emoji => (
              <TouchableOpacity 
                key={emoji} 
                style={s.pickerEmoji}
                onPress={() => { onSelect(emoji); onClose(); }}
              >
                <Text style={s.pickerEmojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── COMMENT INPUT ────────────────────────────────────────────────────────────
function CommentInput({ shareId, onCommentAdded }) {
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  
  const handleSend = async () => {
    if (!comment.trim() || sending) return;
    setSending(true);
    const result = await addComment(shareId, comment.trim());
    if (result && !result.error) {
      setComment('');
      onCommentAdded(result.comments);
    }
    setSending(false);
  };
  
  return (
    <View style={s.commentInput}>
      <TextInput
        style={s.commentTextInput}
        value={comment}
        onChangeText={setComment}
        placeholder="Skriv en kommentar..."
        placeholderTextColor={colors.muted}
        multiline
        maxLength={280}
      />
      <TouchableOpacity 
        style={[s.commentSendBtn, { opacity: comment.trim() ? 1 : 0.4 }]}
        onPress={handleSend}
        disabled={!comment.trim() || sending}
      >
        {sending ? (
          <ActivityIndicator size="small" color={colors.card} />
        ) : (
          <Text style={s.commentSendText}>→</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── FEED POST ────────────────────────────────────────────────────────────────
function FeedPost({ post, onKudos }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post.recentComments || []);
  const [showKudosPicker, setShowKudosPicker] = useState(false);
  
  const handleKudos = async (emoji) => {
    const result = await giveKudos(post.id, emoji);
    if (result && onKudos) onKudos(post.id, result.kudos);
  };
  
  const handleCommentAdded = (newComments) => {
    setComments(newComments.slice(-3));
  };
  
  return (
    <View style={s.post}>
      {/* Header */}
      <View style={s.postHeader}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{(post.name || 'L')[0].toUpperCase()}</Text>
        </View>
        <View style={s.postHeaderInfo}>
          <Text style={s.posterName}>{post.name || 'Løber'}</Text>
          <Text style={s.postTime}>{timeAgo(post.created_at)}</Text>
        </View>
      </View>
      
      {/* Run stats */}
      <View style={s.runStats}>
        <View style={s.runStatMain}>
          <Text style={s.runDistance}>{post.km?.toFixed(2)} km</Text>
        </View>
        <View style={s.runStatRow}>
          <View style={s.runStat}>
            <Text style={s.runStatValue}>{formatDuration(post.duration_secs)}</Text>
            <Text style={s.runStatLabel}>Tid</Text>
          </View>
          <View style={s.runStat}>
            <Text style={s.runStatValue}>{formatPace(post.pace_secs_per_km)}</Text>
            <Text style={s.runStatLabel}>Pace</Text>
          </View>
          {post.avg_hr && (
            <View style={s.runStat}>
              <Text style={s.runStatValue}>{post.avg_hr}</Text>
              <Text style={s.runStatLabel}>Puls</Text>
            </View>
          )}
        </View>
      </View>
      
      {/* AI comment if present */}
      {post.ai_comment && (
        <View style={s.aiComment}>
          <Text style={s.aiCommentText}>{post.ai_comment}</Text>
        </View>
      )}
      
      {/* Actions */}
      <View style={s.postActions}>
        <TouchableOpacity 
          style={[s.actionBtn, post.my_kudos && s.actionBtnActive]}
          onPress={() => post.my_kudos ? null : setShowKudosPicker(true)}
        >
          <Text style={s.actionEmoji}>{post.my_kudos || '🔥'}</Text>
          <Text style={[s.actionText, post.my_kudos && s.actionTextActive]}>
            {post.kudos_count || 0} kudos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={s.actionBtn}
          onPress={() => setShowComments(!showComments)}
        >
          <Text style={s.actionEmoji}>💬</Text>
          <Text style={s.actionText}>
            {post.comment_count || comments.length || 0} kommentarer
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Comments section */}
      {showComments && (
        <View style={s.commentsSection}>
          {comments.length > 0 && (
            <View style={s.commentsList}>
              {comments.map((c, i) => (
                <View key={i} style={s.commentItem}>
                  <Text style={s.commentAuthor}>{c.userName}</Text>
                  <Text style={s.commentText}>{c.comment}</Text>
                  <Text style={s.commentTime}>{timeAgo(c.createdAt)}</Text>
                </View>
              ))}
            </View>
          )}
          <CommentInput shareId={post.id} onCommentAdded={handleCommentAdded} />
        </View>
      )}
      
      {/* Kudos picker */}
      <KudosPicker 
        visible={showKudosPicker} 
        onSelect={handleKudos}
        onClose={() => setShowKudosPicker(false)}
      />
    </View>
  );
}

// ─── SHARE RUN BUTTON ─────────────────────────────────────────────────────────
export function ShareRunButton({ run, onShared }) {
  const [sharing, setSharing] = useState(false);
  
  const handleShare = async () => {
    setSharing(true);
    const result = await shareRun(run);
    if (result && result.shareId) {
      onShared && onShared(result);
    }
    setSharing(false);
  };
  
  return (
    <TouchableOpacity 
      style={s.shareBtn}
      onPress={handleShare}
      disabled={sharing}
    >
      {sharing ? (
        <ActivityIndicator size="small" color={colors.card} />
      ) : (
        <>
          <Text style={s.shareBtnIcon}>📢</Text>
          <Text style={s.shareBtnText}>Del løb</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── MAIN SOCIAL FEED ─────────────────────────────────────────────────────────
export default function SocialFeed() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feed, setFeed] = useState([]);
  
  const fetchFeed = useCallback(async () => {
    const data = await loadFeed();
    setFeed(data.feed || []);
    setLoading(false);
    setRefreshing(false);
  }, []);
  
  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchFeed();
  };
  
  const handleKudosUpdate = (postId, kudos) => {
    setFeed(prev => prev.map(p => 
      p.id === postId ? { ...p, kudos_count: kudos.reduce((s, k) => s + parseInt(k.count), 0), my_kudos: kudos.find(k => k.from_user_id)?.emoji } : p
    ));
  };
  
  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={colors.accent} />
        <Text style={s.loadingText}>Henter feed...</Text>
      </View>
    );
  }
  
  if (feed.length === 0) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyEmoji}>👥</Text>
        <Text style={s.emptyTitle}>Ingen aktivitet endnu</Text>
        <Text style={s.emptyText}>
          Tilføj venner for at se deres løb her, eller del dit eget løb!
        </Text>
      </View>
    );
  }
  
  return (
    <ScrollView
      style={s.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.accent]}
          tintColor={colors.accent}
        />
      }
    >
      {feed.map(post => (
        <FeedPost key={post.id} post={post} onKudos={handleKudosUpdate} />
      ))}
      <View style={s.feedEnd}>
        <Text style={s.feedEndText}>• Du har set alt •</Text>
      </View>
    </ScrollView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.muted, marginTop: 12, fontSize: 13 },
  
  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  
  // Post
  post: { backgroundColor: colors.card, marginBottom: 8 },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.card },
  postHeaderInfo: { marginLeft: 12 },
  posterName: { fontSize: 15, fontWeight: '600', color: colors.text },
  postTime: { fontSize: 12, color: colors.muted, marginTop: 2 },
  
  // Run stats
  runStats: { paddingHorizontal: 16, paddingBottom: 16 },
  runStatMain: { marginBottom: 12 },
  runDistance: { fontSize: 36, fontWeight: '800', color: colors.text },
  runStatRow: { flexDirection: 'row', gap: 24 },
  runStat: {},
  runStatValue: { fontSize: 18, fontWeight: '600', color: colors.text },
  runStatLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  
  // AI comment
  aiComment: { paddingHorizontal: 16, paddingBottom: 16 },
  aiCommentText: { fontSize: 14, color: colors.dim, fontStyle: 'italic' },
  
  // Actions
  postActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  actionBtnActive: { backgroundColor: colors.accent + '10' },
  actionEmoji: { fontSize: 18 },
  actionText: { fontSize: 13, color: colors.dim },
  actionTextActive: { color: colors.accent, fontWeight: '500' },
  
  // Comments
  commentsSection: { borderTopWidth: 1, borderTopColor: colors.border, padding: 16 },
  commentsList: { marginBottom: 12 },
  commentItem: { marginBottom: 12 },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: colors.text },
  commentText: { fontSize: 14, color: colors.dim, marginTop: 2 },
  commentTime: { fontSize: 11, color: colors.muted, marginTop: 4 },
  
  // Comment input
  commentInput: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  commentTextInput: { flex: 1, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: colors.text, maxHeight: 80 },
  commentSendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  commentSendText: { fontSize: 18, color: colors.card, fontWeight: '600' },
  
  // Kudos picker
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContent: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  pickerTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 20, textAlign: 'center' },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  pickerEmoji: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  pickerEmojiText: { fontSize: 28 },
  
  // Share button
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8 },
  shareBtnIcon: { fontSize: 16 },
  shareBtnText: { fontSize: 14, fontWeight: '600', color: colors.card },
  
  // Feed end
  feedEnd: { padding: 24, alignItems: 'center' },
  feedEndText: { fontSize: 12, color: colors.muted },
});
