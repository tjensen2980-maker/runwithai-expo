/**
 * MusicMatcher.js — RunWithAI Music Tempo Matcher UI
 *
 * A bottom-sheet component that shows:
 *   - Current cadence & target BPM
 *   - Now-playing track (if Spotify connected)
 *   - Tempo-matched track suggestions
 *   - Running playlist recommendations
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import useCadence from '../../hooks/useCadence';
import useSpotifyMusic from '../../hooks/useSpotifyMusic';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SPOTIFY_GREEN = '#1DB954';

export default function MusicMatcher({
  visible,
  onClose,
  currentPaceSecondsPerKm,
  isRunning,
  activityType,
}) {
  const { cadence, bpmRange, source } = useCadence({
    currentPaceSecondsPerKm,
    isRunning,
    activityType: activityType || 'run',
  });

  const {
    isConnected,
    isLoading,
    tracks,
    playlists,
    currentTrack,
    error,
    connect,
    disconnect,
    playTrack,
    openPlaylist,
    pause,
    skip,
  } = useSpotifyMusic({ bpmRange, isRunning });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const getSourceLabel = () => {
    switch (source) {
      case 'accelerometer': return 'Live step detection';
      case 'pace': return 'Estimated from pace';
      case 'default': return isRunning ? 'Default BPM — bevæg dig for bedre match' : 'Klar til at matche';
      default: return isRunning ? 'Beregner...' : 'Start et løb for at matche musik';
    }
  };

  const getSourceColor = () => {
    switch (source) {
      case 'accelerometer': return SPOTIFY_GREEN;
      case 'pace': return SPOTIFY_GREEN;
      case 'default': return '#F59E0B';
      default: return '#888';
    }
  };

  const openSpotifyApp = () => {
    Linking.openURL('spotify://').catch(() => {
      Linking.openURL('https://open.spotify.com');
    });
  };

  // ---------------------------------------------------------------------------
  // Subcomponents
  // ---------------------------------------------------------------------------

  const StatsBar = () => (
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Kadence</Text>
        <Text style={styles.statValue}>
          {cadence || '--'}
          <Text style={styles.statUnit}> spm</Text>
        </Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Target BPM</Text>
        <Text style={styles.statValue}>{bpmRange.target || '--'}</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Range</Text>
        <Text style={styles.statValue}>
          {bpmRange.min && bpmRange.max
            ? `${bpmRange.min}–${bpmRange.max}`
            : '--'}
        </Text>
      </View>
    </View>
  );

  const SpotifyHint = () => (
    <View style={styles.hintBox}>
      <Text style={styles.hintIcon}>💡</Text>
      <Text style={styles.hintText}>
        Tryk på en sang eller playlist nedenfor for at åbne den i Spotify. Musikken spiller i baggrunden mens du løber.
      </Text>
    </View>
  );

  const NowPlaying = () => {
    if (!currentTrack) return null;
    return (
      <View style={styles.nowPlaying}>
        {currentTrack.albumArt && (
          <Image source={{ uri: currentTrack.albumArt }} style={styles.albumArt} />
        )}
        <View style={styles.nowPlayingInfo}>
          <Text style={styles.nowPlayingTitle} numberOfLines={1}>{currentTrack.name}</Text>
          <Text style={styles.nowPlayingArtist} numberOfLines={1}>{currentTrack.artist}</Text>
        </View>
        <View style={styles.nowPlayingControls}>
          <TouchableOpacity
            onPress={currentTrack.isPlaying ? pause : () => playTrack(currentTrack)}
            style={styles.controlBtn}
          >
            <Text style={styles.controlIcon}>{currentTrack.isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={skip} style={styles.controlBtn}>
            <Text style={styles.controlIcon}>⏭</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const TrackItem = ({ item }) => (
    <TouchableOpacity style={styles.trackRow} onPress={() => playTrack(item)}>
      {item.albumArt ? (
        <Image source={{ uri: item.albumArt }} style={styles.trackArt} />
      ) : (
        <View style={[styles.trackArt, styles.trackArtPlaceholder]}>
          <Text style={styles.trackArtIcon}>♪</Text>
        </View>
      )}
      <View style={styles.trackInfo}>
        <Text style={styles.trackName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
      </View>
      <View style={styles.bpmBadge}>
        <Text style={styles.bpmBadgeText}>{item.bpm}</Text>
      </View>
    </TouchableOpacity>
  );

  const PlaylistItem = ({ item }) => (
    <TouchableOpacity style={styles.playlistCard} onPress={() => openPlaylist(item)}>
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.playlistImage} />
      )}
      <Text style={styles.playlistName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.playlistMeta}>{item.trackCount} tracks</Text>
    </TouchableOpacity>
  );

  const SpotifyConnect = () => (
    <View style={styles.connectContainer}>
      <Text style={styles.connectEmoji}>🎵</Text>
      <Text style={styles.connectTitle}>Forbind Spotify</Text>
      <Text style={styles.connectSubtitle}>
        Match musikken til dit løbetempo automatisk
      </Text>
      <TouchableOpacity style={styles.spotifyBtn} onPress={connect}>
        <Text style={styles.spotifyBtnText}>Forbind med Spotify</Text>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <Text style={styles.headerTitle}>🎵 Musik Tempo</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Source indicator */}
          <View style={styles.sourceRow}>
            <View style={[styles.sourceDot, { backgroundColor: getSourceColor() }]} />
            <Text style={styles.sourceText}>{getSourceLabel()}</Text>
          </View>

          <StatsBar />

          {isConnected ? (
            <FlatList
              data={tracks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <TrackItem item={item} />}
              ListHeaderComponent={
                <>
                  <NowPlaying />
                  {!currentTrack && <SpotifyHint />}
                  {isLoading && (
                    <ActivityIndicator color={SPOTIFY_GREEN} style={{ marginVertical: 12 }} />
                  )}
                  {tracks.length > 0 && (
                    <Text style={styles.sectionTitle}>Tempo-matchede tracks</Text>
                  )}
                </>
              }
              ListFooterComponent={
                playlists.length > 0 ? (
                  <View>
                    <Text style={styles.sectionTitle}>Løbe-playlister</Text>
                    <FlatList
                      data={playlists}
                      horizontal
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => <PlaylistItem item={item} />}
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingHorizontal: 16 }}
                    />
                    <TouchableOpacity style={styles.disconnectBtn} onPress={disconnect}>
                      <Text style={styles.disconnectText}>Afbryd Spotify</Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                !isLoading ? (
                  <Text style={styles.emptyText}>
                    {bpmRange.target > 0
                      ? 'Søger tracks der matcher dit tempo...'
                      : 'Start et løb for at få tempo-matchede forslag'}
                  </Text>
                ) : null
              }
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          ) : (
            <SpotifyConnect />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.75,
    minHeight: 300,
  },
  handleRow: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#DDD' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111' },
  closeBtn: { fontSize: 18, color: '#999', padding: 4 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sourceDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  sourceText: { fontSize: 13, color: '#888' },

  // Stats
  statsRow: {
    flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#F5F5F5',
    borderRadius: 12, padding: 14, marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#E0E0E0', marginVertical: 2 },
  statLabel: { fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 18, fontWeight: '600', color: '#222' },
  statUnit: { fontSize: 12, fontWeight: '400', color: '#888' },

  // Hint box
  hintBox: {
    marginHorizontal: 20, backgroundColor: '#FFF8E1', borderRadius: 12,
    padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
  },
  hintIcon: { fontSize: 16, marginRight: 8 },
  hintText: { flex: 1, fontSize: 12, color: '#6D5D00', lineHeight: 18 },
  hintBtn: {
    backgroundColor: SPOTIFY_GREEN, borderRadius: 16, paddingHorizontal: 14,
    paddingVertical: 6, marginTop: 8,
  },
  hintBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Now playing
  nowPlaying: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20,
    backgroundColor: '#111', borderRadius: 12, padding: 12, marginBottom: 16,
  },
  albumArt: { width: 44, height: 44, borderRadius: 6, marginRight: 12 },
  nowPlayingInfo: { flex: 1 },
  nowPlayingTitle: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  nowPlayingArtist: { color: '#AAA', fontSize: 12, marginTop: 2 },
  nowPlayingControls: { flexDirection: 'row', gap: 8 },
  controlBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: SPOTIFY_GREEN,
    alignItems: 'center', justifyContent: 'center',
  },
  controlIcon: { color: '#FFF', fontSize: 14 },

  // Tracks
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#555', paddingHorizontal: 20, marginBottom: 8, marginTop: 4 },
  trackRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  trackArt: { width: 40, height: 40, borderRadius: 6, marginRight: 12 },
  trackArtPlaceholder: { backgroundColor: '#E8E8E8', alignItems: 'center', justifyContent: 'center' },
  trackArtIcon: { fontSize: 18, color: '#BBB' },
  trackInfo: { flex: 1 },
  trackName: { fontSize: 14, fontWeight: '500', color: '#222' },
  trackArtist: { fontSize: 12, color: '#888', marginTop: 2 },
  bpmBadge: { backgroundColor: SPOTIFY_GREEN + '20', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  bpmBadgeText: { fontSize: 12, fontWeight: '600', color: SPOTIFY_GREEN },

  // Playlists
  playlistCard: { width: 130, marginRight: 12, marginBottom: 16 },
  playlistImage: { width: 130, height: 130, borderRadius: 8, marginBottom: 6 },
  playlistName: { fontSize: 13, fontWeight: '500', color: '#222' },
  playlistMeta: { fontSize: 11, color: '#999', marginTop: 2 },

  // Connect
  connectContainer: { alignItems: 'center', padding: 32 },
  connectEmoji: { fontSize: 48, marginBottom: 12 },
  connectTitle: { fontSize: 18, fontWeight: '600', color: '#222', marginBottom: 8 },
  connectSubtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24 },
  spotifyBtn: { backgroundColor: SPOTIFY_GREEN, borderRadius: 24, paddingHorizontal: 28, paddingVertical: 14 },
  spotifyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  errorText: { color: '#EF4444', fontSize: 13, marginTop: 12 },

  // Misc
  disconnectBtn: { alignItems: 'center', padding: 16, marginTop: 8 },
  disconnectText: { color: '#999', fontSize: 13 },
  emptyText: { textAlign: 'center', color: '#AAA', fontSize: 14, paddingVertical: 32, paddingHorizontal: 20 },
});