/**
 * RunCamera.js — Camera button during runs
 * Stores photos locally, parent calls RunCamera.uploadPhotos(runId) after save.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Platform,
  Animated,
  TextInput,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { colors, SERVER, getAuthToken } from '../../data';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// ─── GLOBAL PHOTO STORE (accessible from parent) ────────────────────────────
let _pendingPhotos = [];

export function getPendingPhotos() {
  return _pendingPhotos;
}

export async function uploadPendingPhotos(runId) {
  if (!runId || _pendingPhotos.length === 0) return;
  const token = getAuthToken();
  for (const photo of _pendingPhotos) {
    try {
      await fetch(`${SERVER}/runs/${runId}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_base64: photo.image,
          latitude: photo.coords?.latitude || null,
          longitude: photo.coords?.longitude || null,
          timestamp: photo.time.toISOString(),
          caption: photo.caption || null,
        }),
      });
    } catch (err) {
      console.warn('[RunCamera] Upload error:', err);
    }
  }
  _pendingPhotos = [];
}

export function clearPendingPhotos() {
  _pendingPhotos = [];
}

// ─── CAMERA CAPTURE ──────────────────────────────────────────────────────────

async function capturePhoto() {
  if (isWeb) {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return reject(new Error('No file'));
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }
  // Native
  try {
    const ImagePicker = require('expo-image-picker');
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Kamera', 'Giv adgang til kameraet i Indstillinger');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
    });
    if (result.canceled) return null;
    return `data:image/jpeg;base64,${result.assets[0].base64}`;
  } catch (err) {
    console.warn('Camera error:', err);
    return null;
  }
}

function getCurrentPosition() {
  return new Promise((resolve) => {
    if (isWeb && navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else if (!isWeb) {
      try {
        const Loc = require('expo-location');
        Loc.getCurrentPositionAsync({ accuracy: Loc.Accuracy.High })
          .then((l) => resolve({ latitude: l.coords.latitude, longitude: l.coords.longitude }))
          .catch(() => resolve(null));
      } catch { resolve(null); }
    } else {
      resolve(null);
    }
  });
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function RunCamera({ isRunning }) {
  const [photos, setPhotos] = useState([]);
  const [capturing, setCapturing] = useState(false);
  const [showCaption, setShowCaption] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingCoords, setPendingCoords] = useState(null);
  const [captionText, setCaptionText] = useState('');
  const [showGallery, setShowGallery] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Sync local state to global store
  useEffect(() => {
    _pendingPhotos = photos;
  }, [photos]);

  // Clear photos when a new run starts
  useEffect(() => {
    if (isRunning) {
      setPhotos([]);
      _pendingPhotos = [];
    }
  }, [isRunning]);

  // Pulse animation
  useEffect(() => {
    if (isRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRunning]);

  const handleCapture = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const [imageData, coords] = await Promise.all([capturePhoto(), getCurrentPosition()]);
      if (!imageData) { setCapturing(false); return; }
      setPendingImage(imageData);
      setPendingCoords(coords);
      setShowCaption(true);
    } catch (err) {
      console.warn('Capture error:', err);
    } finally {
      setCapturing(false);
    }
  };

  const savePhoto = (withCaption) => {
    const caption = withCaption ? captionText.trim() : null;
    setShowCaption(false);
    setPhotos((prev) => [...prev, { image: pendingImage, coords: pendingCoords, caption, time: new Date() }]);
    setPendingImage(null);
    setPendingCoords(null);
    setCaptionText('');
  };

  if (!isRunning && photos.length === 0) return null;

  return (
    <View style={s.container}>
      {isRunning && (
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[s.cameraBtn, capturing && { opacity: 0.5 }]}
            onPress={handleCapture}
            disabled={capturing}
          >
            <Text style={{ fontSize: 24 }}>📸</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {photos.length > 0 && (
        <TouchableOpacity style={s.countBadge} onPress={() => setShowGallery(true)}>
          <Text style={s.countText}>{photos.length} 📷</Text>
        </TouchableOpacity>
      )}

      {photos.length > 0 && (
        <View style={s.thumbStrip}>
          {photos.slice(-4).map((p, i) => (
            <TouchableOpacity key={i} onPress={() => setShowGallery(true)}>
              <Image source={{ uri: p.image }} style={s.thumb} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Caption modal */}
      <Modal visible={showCaption} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            {pendingImage && <Image source={{ uri: pendingImage }} style={s.preview} />}
            <Text style={s.title}>Tilføj en billedtekst?</Text>
            <TextInput
              style={s.input}
              value={captionText}
              onChangeText={setCaptionText}
              placeholder="F.eks. Smuk udsigt..."
              placeholderTextColor={colors.muted}
              multiline
              maxLength={200}
            />
            <TouchableOpacity style={s.btnPrimary} onPress={() => savePhoto(true)}>
              <Text style={s.btnPrimaryText}>Gem med tekst</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnSecondary} onPress={() => savePhoto(false)}>
              <Text style={s.btnSecondaryText}>Gem uden tekst</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Gallery modal */}
      <Modal visible={showGallery} transparent animationType="slide">
        <View style={[s.overlay, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.title}>Fotos fra løbet ({photos.length})</Text>
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <View style={{ width: SCREEN_WIDTH - 40, alignItems: 'center' }}>
                  <Image source={{ uri: item.image }} style={{ width: SCREEN_WIDTH - 60, height: 300, borderRadius: 16 }} />
                  {item.caption && <Text style={{ fontSize: 15, color: colors.text, marginTop: 12, textAlign: 'center' }}>{item.caption}</Text>}
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 6 }}>
                    {item.time.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}
            />
            <TouchableOpacity style={s.btnSecondary} onPress={() => setShowGallery(false)}>
              <Text style={s.btnSecondaryText}>Luk</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { position: 'absolute', right: 16, bottom: 120, alignItems: 'flex-end', zIndex: 50 },
  cameraBtn: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 6,
    borderWidth: 2, borderColor: colors.accent,
  },
  countBadge: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  countText: { color: '#000', fontWeight: '700', fontSize: 12 },
  thumbStrip: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  thumb: { width: 40, height: 40, borderRadius: 8, borderWidth: 1.5, borderColor: '#fff' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg || '#0f0f1a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 16 },
  preview: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
  input: {
    backgroundColor: colors.surface || 'rgba(255,255,255,0.06)', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: colors.text, minHeight: 60,
  },
  btnPrimary: { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  btnPrimaryText: { fontSize: 16, fontWeight: '700', color: '#000' },
  btnSecondary: { alignItems: 'center', paddingVertical: 12 },
  btnSecondaryText: { fontSize: 15, color: colors.muted },
});
