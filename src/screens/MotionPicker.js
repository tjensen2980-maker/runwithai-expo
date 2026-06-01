// ============================================
// MotionPicker.js
// Two-step picker for cardio activity
// Step 1: Pick activity type (run / walk / bike[soon])
// Step 2: Pick location (outdoor GPS / indoor treadmill)
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';

export default function MotionPicker({ onBack, onPick }) {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);

  function pickType(type) {
    setSelectedType(type);
    setStep(2);
  }

  function pickLocation(location) {
    if (onPick) onPick(selectedType, location);
  }

  function goBack() {
    if (step === 2) {
      setStep(1);
      setSelectedType(null);
    } else {
      if (onBack) onBack();
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>{step === 2 ? '←' : '✕'}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>
            {step === 1 ? 'Motion' : selectedType === 'walk' ? 'Gå' : selectedType === 'bike' ? 'Cykling' : 'Løb'}
          </Text>
          <Text style={styles.headerSub}>
            {step === 1 ? 'Hvad vil du lave?' : 'Hvor?'}
          </Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 1 ? (
          <View>
            <TouchableOpacity
              style={styles.bigCard}
              onPress={function () { pickType('run'); }}
            >
              <Text style={styles.cardEmoji}>🏃</Text>
              <Text style={styles.cardTitle}>Løb</Text>
              <Text style={styles.cardSub}>Udendørs eller løbebånd</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bigCard}
              onPress={function () { pickType('walk'); }}
            >
              <Text style={styles.cardEmoji}>🚶</Text>
              <Text style={styles.cardTitle}>Gå</Text>
              <Text style={styles.cardSub}>Udendørs eller løbebånd</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bigCard}
              onPress={function () { pickType('bike'); }}
            >
              <Text style={styles.cardEmoji}>🚴</Text>
              <Text style={styles.cardTitle}>Cykling</Text>
              <Text style={styles.cardSub}>Udendørs eller indendørs</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <TouchableOpacity
              style={styles.bigCard}
              onPress={function () { pickLocation('outdoor'); }}
            >
              <Text style={styles.cardEmoji}>📍</Text>
              <Text style={styles.cardTitle}>Udendørs</Text>
              <Text style={styles.cardSub}>GPS-tracking · ruter · tempo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bigCard}
              onPress={function () { pickLocation('treadmill'); }}
            >
              <Text style={styles.cardEmoji}>🏠</Text>
              <Text style={styles.cardTitle}>Indendørs</Text>
              <Text style={styles.cardSub}>Løbebånd · skridt-tæller · manuel km</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerBtn: {
    width: 60,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: { color: '#fff', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: '#888', fontSize: 12, marginTop: 2 },

  content: { padding: 16, paddingBottom: 40 },

  bigCard: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 24,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
    position: 'relative',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardEmoji: { fontSize: 48, marginBottom: 12 },
  cardTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 4 },
  cardTitleDisabled: { color: '#888' },
  cardSub: { color: '#888', fontSize: 13 },
  cardSubDisabled: { color: '#666' },

  soonBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fa3c00',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  soonBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});
