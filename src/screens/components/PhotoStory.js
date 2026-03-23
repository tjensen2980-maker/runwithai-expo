/**
 * PhotoStory.js — AI-generated run story with photos on route
 *
 * Shows after a run is complete:
 *   - Photos placed on a map route
 *   - AI-generated narrative about the run
 *   - Share to friends feed
 *
 * Place in: src/screens/components/PhotoStory.js
 *
 * Usage:
 *   import PhotoStory from './components/PhotoStory';
 *   <PhotoStory runId={123} visible={true} onClose={() => {}} />
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  ScrollView,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import { colors, SERVER, getAuthToken } from '../../data';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// ─── API HELPERS ─────────────────────────────────────────────────────────────

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

// ─── MAP COMPONENT (Leaflet for web) ─────────────────────────────────────────

function StoryMap({ photos, route }) {
  const mapRef = React.useRef(null);

  useEffect(() => {
    if (!isWeb || !mapRef.current || !route?.length) return;

    // Load Leaflet
    const loadLeaflet = () => {
      if (window.L) return Promise.resolve();
      return new Promise((resolve) => {
        if (!document.querySelector('link[href*="leaflet"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
          document.head.appendChild(link);
        }
        if (!document.querySelector('script[src*="leaflet"]')) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
          script.onload = resolve;
          document.head.appendChild(script);
        } else {
          const poll = setInterval(() => { if (window.L) { clearInterval(poll); resolve(); } }, 100);
        }
      });
    };

    loadLeaflet().then(() => {
      const L = window.L;
      if (mapRef.current._leaflet_id) return; // already initialized

      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

      // Draw route
      const latlngs = route.map(p => [p.lat || p.latitude, p.lng || p.longitude]);
      const polyline = L.polyline(latlngs, { color: colors.accent, weight: 4, opacity: 0.9 }).addTo(map);
      map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

      // Add photo markers
      photos.forEach((photo, i) => {
        if (!photo.latitude || !photo.longitude) return;

        const icon = L.divIcon({
          html: `<div style="
            width:36px;height:36px;border-radius:50%;border:3px solid ${colors.accent};
            background:url(${photo.image_base64}) center/cover;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
          "></div>`,
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([photo.latitude, photo.longitude], { icon }).addTo(map);
        marker.bindPopup(
          `<div style="text-align:center;max-width:200px">
            <img src="${photo.image_base64}" style="width:100%;border-radius:8px;margin-bottom:4px"/>
            ${photo.caption ? `<p style="margin:4px 0;font-size:12px">${photo.caption}</p>` : ''}
            <small style="color:#888">${new Date(photo.taken_at).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}</small>
          </div>`,
          { maxWidth: 220 }
        );
      });

      // Start/end markers
      if (latlngs.length >= 2) {
        const startIcon = L.divIcon({
          html: '<div style="background:#2ecc71;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
          className: '', iconSize: [14, 14], iconAnchor: [7, 7],
        });
        const endIcon = L.divIcon({
          html: '<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
          className: '', iconSize: [14, 14], iconAnchor: [7, 7],
        });
        L.marker(latlngs[0], { icon: startIcon }).addTo(map).bindPopup('Start');
        L.marker(latlngs[latlngs.length - 1], { icon: endIcon }).addTo(map).bindPopup('Slut');
      }
    });
  }, [photos, route]);

  if (!isWeb) {
    // Native: just show photo grid for now
    return (
      <View style={s.photoGrid}>
        {photos.map((p, i) => (
          <Image key={i} source={{ uri: p.image_base64 }} style={s.gridPhoto} />
        ))}
      </View>
    );
  }

  return <div ref={mapRef} style={{ width: '100%', height: 260, borderRadius: 16, overflow: 'hidden' }} />;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function PhotoStory({ runId, visible, onClose, route }) {
  const [story, setStory] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [runInfo, setRunInfo] = useState(null);

  // Load existing story + photos
  useEffect(() => {
    if (!visible || !runId) return;
    loadStory();
  }, [visible, runId]);

  const loadStory = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/runs/${runId}/story`);
      setStory(data.story);
      setPhotos(data.photos || []);
    } catch {
      // No story yet — try to load just photos
      try {
        const photoData = await apiFetch(`/runs/${runId}/photos`);
        setPhotos(photoData);
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  // Generate AI story
  const generateStory = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const data = await apiFetch(`/runs/${runId}/story`, { method: 'POST' });
      setStory(data.story);
      setPhotos(data.photos || []);
      setRunInfo(data.run);
    } catch (err) {
      Alert.alert('Fejl', err.message || 'Kunne ikke generere story');
    } finally {
      setGenerating(false);
    }
  };

  // Share story
  const shareStory = async () => {
    setSharing(true);
    try {
      await apiFetch(`/runs/${runId}/story/share`, { method: 'POST' });

      // Also share via system share
      await Share.share({
        message: `🏃‍♂️📸 Min løbe-story fra RunWithAI:\n\n${story?.story_text?.substring(0, 200)}...\n\nSe hele historien på RunWithAI!`,
      });

      Alert.alert('Delt!', 'Din story er nu synlig for dine venner');
    } catch (err) {
      console.warn('Share error:', err);
    } finally {
      setSharing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={s.header}>
              <Text style={s.headerEmoji}>📸</Text>
              <Text style={s.headerTitle}>Løbe-story</Text>
              {runInfo && (
                <Text style={s.headerMeta}>
                  {runInfo.km} km · {runInfo.duration}
                </Text>
              )}
            </View>

            {loading ? (
              <ActivityIndicator color={colors.accent} style={{ marginVertical: 40 }} />
            ) : (
              <>
                {/* Map with photos */}
                {photos.length > 0 && (
                  <View style={s.mapContainer}>
                    <StoryMap photos={photos} route={route || []} />
                  </View>
                )}

                {/* Photo count */}
                {photos.length > 0 && (
                  <Text style={s.photoCount}>
                    📷 {photos.length} foto{photos.length !== 1 ? 's' : ''} undervejs
                  </Text>
                )}

                {/* Photo strip */}
                {photos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.photoScroll}>
                    {photos.map((p, i) => (
                      <View key={i} style={s.photoCard}>
                        <Image source={{ uri: p.image_base64 }} style={s.photoImage} />
                        {p.caption && (
                          <Text style={s.photoCaption} numberOfLines={2}>{p.caption}</Text>
                        )}
                        <Text style={s.photoTime}>
                          {new Date(p.taken_at).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                )}

                {/* Story text */}
                {story ? (
                  <View style={s.storyBox}>
                    <Text style={s.storyLabel}>AI STORY</Text>
                    <Text style={s.storyText}>{story.story_text}</Text>
                  </View>
                ) : (
                  <View style={s.generateBox}>
                    <Text style={s.generateEmoji}>✨</Text>
                    <Text style={s.generateTitle}>
                      {photos.length > 0
                        ? 'Generer en AI-story baseret på dit løb og dine fotos!'
                        : 'Generer en AI-story baseret på dit løb!'}
                    </Text>
                    <TouchableOpacity
                      style={[s.generateBtn, generating && { opacity: 0.6 }]}
                      onPress={generateStory}
                      disabled={generating}
                    >
                      <Text style={s.generateBtnText}>
                        {generating ? 'Genererer...' : '✨ Generer story'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Share button */}
                {story && (
                  <TouchableOpacity
                    style={[s.shareBtn, sharing && { opacity: 0.6 }]}
                    onPress={shareStory}
                    disabled={sharing}
                  >
                    <Text style={s.shareBtnText}>
                      {sharing ? 'Deler...' : '📤 Del med venner'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Regenerate */}
                {story && (
                  <TouchableOpacity style={s.regenBtn} onPress={generateStory} disabled={generating}>
                    <Text style={s.regenBtnText}>
                      {generating ? 'Genererer...' : '🔄 Generer ny story'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>

          {/* Close button */}
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Text style={s.closeBtnText}>Luk</Text>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg || '#0f0f1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '92%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerEmoji: { fontSize: 40, marginBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  headerMeta: { fontSize: 14, color: colors.muted, marginTop: 4 },

  // Map
  mapContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },

  // Photo count
  photoCount: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
    marginBottom: 8,
  },

  // Photo scroll
  photoScroll: {
    marginBottom: 20,
  },
  photoCard: {
    width: 140,
    marginRight: 10,
  },
  photoImage: {
    width: 140,
    height: 100,
    borderRadius: 12,
  },
  photoCaption: {
    fontSize: 12,
    color: colors.text,
    marginTop: 4,
  },
  photoTime: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },

  // Photo grid (native)
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  gridPhoto: {
    width: (SCREEN_WIDTH - 56) / 3,
    height: (SCREEN_WIDTH - 56) / 3,
    borderRadius: 12,
  },

  // Story
  storyBox: {
    backgroundColor: colors.surface || 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  storyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1,
    marginBottom: 10,
  },
  storyText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
  },

  // Generate
  generateBox: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  generateEmoji: { fontSize: 40, marginBottom: 12 },
  generateTitle: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  generateBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  generateBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },

  // Share
  shareBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },

  // Regenerate
  regenBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  regenBtnText: {
    fontSize: 14,
    color: colors.muted,
  },

  // Close
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  closeBtnText: {
    fontSize: 15,
    color: colors.muted,
  },
});
