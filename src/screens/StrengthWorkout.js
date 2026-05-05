// ============================================
// StrengthWorkout.js
// Shred/BetterMe-style strength training screen
// - Add exercises from library
// - Log sets (reps + weight)
// - Live volume + calorie estimate
// - "Last time" hint per exercise
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';

const API_URL =
  (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_URL) ||
  'https://runwithai-server-staging.up.railway.app';

export default function StrengthWorkout({ token, onClose, onSaved }) {
  const [exercises, setExercises] = useState([]); // selected exercises with sets
  const [library, setLibrary] = useState([]);     // all exercises from /exercises
  const [loading, setLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [startedAt] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [lastByExerciseId, setLastByExerciseId] = useState({});

  // ---------- Load exercise library ----------
  useEffect(function () {
    async function loadLibrary() {
      try {
        const res = await fetch(API_URL + '/exercises', {
          headers: { Authorization: 'Bearer ' + token },
        });
        const data = await res.json();
        if (Array.isArray(data)) setLibrary(data);
      } catch (e) {
        console.warn('Failed to load exercises', e);
      } finally {
        setLoading(false);
      }
    }
    loadLibrary();
  }, [token]);

  // ---------- Filtered library for picker ----------
  const filteredLibrary = useMemo(function () {
    const q = (search || '').toLowerCase().trim();
    return library.filter(function (ex) {
      if (activeFilter !== 'all' && ex.category !== activeFilter) return false;
      if (q && !(ex.name || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [library, search, activeFilter]);

  const categories = useMemo(function () {
    const set = new Set();
    library.forEach(function (e) { if (e.category) set.add(e.category); });
    return Array.from(set);
  }, [library]);

  // ---------- Add exercise ----------
  async function addExercise(ex) {
    setExercises(function (prev) {
      return prev.concat([{
        exercise_id: ex.id,
        name: ex.name,
        muscle_groups: ex.muscle_groups || [],
        category: ex.category,
        sets: [{ reps: '', weight_kg: '' }],
      }]);
    });
    setPickerVisible(false);
    setSearch('');

    // Fetch "last time" for this exercise
    try {
      const res = await fetch(API_URL + '/exercises/' + ex.id + '/last', {
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await res.json();
      if (data && Array.isArray(data.sets) && data.sets.length > 0) {
        setLastByExerciseId(function (prev) {
          const copy = Object.assign({}, prev);
          copy[ex.id] = data;
          return copy;
        });
      }
    } catch (e) {
      // silent
    }
  }

  function removeExercise(idx) {
    setExercises(function (prev) {
      return prev.filter(function (_, i) { return i !== idx; });
    });
  }

  function addSet(exIdx) {
    setExercises(function (prev) {
      return prev.map(function (ex, i) {
        if (i !== exIdx) return ex;
        const lastSet = ex.sets[ex.sets.length - 1] || { reps: '', weight_kg: '' };
        const newSet = { reps: lastSet.reps, weight_kg: lastSet.weight_kg };
        return Object.assign({}, ex, { sets: ex.sets.concat([newSet]) });
      });
    });
  }

  function removeSet(exIdx, setIdx) {
    setExercises(function (prev) {
      return prev.map(function (ex, i) {
        if (i !== exIdx) return ex;
        return Object.assign({}, ex, {
          sets: ex.sets.filter(function (_, j) { return j !== setIdx; }),
        });
      });
    });
  }

  function updateSet(exIdx, setIdx, field, value) {
    setExercises(function (prev) {
      return prev.map(function (ex, i) {
        if (i !== exIdx) return ex;
        const newSets = ex.sets.map(function (s, j) {
          if (j !== setIdx) return s;
          const copy = Object.assign({}, s);
          copy[field] = value;
          return copy;
        });
        return Object.assign({}, ex, { sets: newSets });
      });
    });
  }

  // ---------- Live totals ----------
  const totals = useMemo(function () {
    let setCount = 0;
    let volume = 0;
    exercises.forEach(function (ex) {
      ex.sets.forEach(function (s) {
        const reps = parseFloat(s.reps) || 0;
        const wt = parseFloat(s.weight_kg) || 0;
        if (reps > 0) setCount += 1;
        volume += reps * wt;
      });
    });
    const durationMin = Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60000));
    const intensityFactor = 0.7 + (7 / 14); // RPE 7
    const setBased = Math.round(setCount * 8 * intensityFactor);
    const met = 5.0 * (0.5 + (7 / 10));
    const userWeight = 75;
    const timeBased = Math.round(met * userWeight * (durationMin / 60));
    const calories = Math.max(setBased, timeBased);
    return { setCount: setCount, volume: volume, durationMin: durationMin, calories: calories };
  }, [exercises, startedAt]);

  // ---------- Save session ----------
  async function saveSession() {
    if (exercises.length === 0) {
      Alert.alert('Tom session', 'Tilføj mindst én øvelse før du gemmer.');
      return;
    }
    const flatSets = [];
    exercises.forEach(function (ex) {
      ex.sets.forEach(function (s, idx) {
        const reps = parseInt(s.reps, 10) || 0;
        const wt = parseFloat(s.weight_kg) || 0;
        if (reps > 0) {
          flatSets.push({
            exercise_id: ex.exercise_id,
            set_number: idx + 1,
            reps: reps,
            weight_kg: wt,
          });
        }
      });
    });

    if (flatSets.length === 0) {
      Alert.alert('Ingen sæt', 'Indtast mindst ét sæt med reps før du gemmer.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(API_URL + '/strength-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          started_at: startedAt.toISOString(),
          ended_at: new Date().toISOString(),
          duration_minutes: totals.durationMin,
          rpe: 7,
          sets: flatSets,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      Alert.alert('Gemt! 💪', 'Din styrkesession er logget. Forbrændte ca. ' + totals.calories + ' kcal.');
      if (onSaved) onSaved(data);
      if (onClose) onClose();
    } catch (e) {
      Alert.alert('Fejl', e.message || 'Kunne ikke gemme session');
    } finally {
      setSaving(false);
    }
  }

// ---------- Render ----------
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>💪 Styrketræning</Text>
            <Text style={styles.headerSub}>{totals.durationMin} min</Text>
          </View>
          <TouchableOpacity
            onPress={saveSession}
            style={[styles.headerBtn, styles.saveBtn]}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Gem</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Live totals bar */}
        <View style={styles.totalsBar}>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{totals.setCount}</Text>
            <Text style={styles.totalLabel}>sæt</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{Math.round(totals.volume)}</Text>
            <Text style={styles.totalLabel}>kg volume</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{totals.calories}</Text>
            <Text style={styles.totalLabel}>kcal</Text>
          </View>
        </View>

        {/* Exercise list */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🏋️</Text>
              <Text style={styles.emptyTitle}>Ingen øvelser endnu</Text>
              <Text style={styles.emptySub}>Tryk på knappen nedenfor for at tilføje din første øvelse</Text>
            </View>
          ) : (
            exercises.map(function (ex, exIdx) {
              const last = lastByExerciseId[ex.exercise_id];
              return (
                <View key={'ex-' + exIdx} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exerciseName}>{ex.name}</Text>
                      {ex.muscle_groups && ex.muscle_groups.length > 0 ? (
                        <Text style={styles.muscleGroups}>
                          {ex.muscle_groups.join(' · ')}
                        </Text>
                      ) : null}
                      {last && last.sets && last.sets.length > 0 ? (
                        <Text style={styles.lastTime}>
                          Sidste gang: {last.sets.length} sæt · {last.sets[0].reps} reps · {last.sets[0].weight_kg} kg
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={function () { removeExercise(exIdx); }}
                      style={styles.removeBtn}
                    >
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Set rows header */}
                  <View style={styles.setsHeader}>
                    <Text style={[styles.setsHeaderCell, { flex: 0.5 }]}>SÆT</Text>
                    <Text style={[styles.setsHeaderCell, { flex: 1 }]}>REPS</Text>
                    <Text style={[styles.setsHeaderCell, { flex: 1 }]}>KG</Text>
                    <Text style={[styles.setsHeaderCell, { flex: 0.5 }]}> </Text>
                  </View>

                  {/* Set rows */}
                  {ex.sets.map(function (s, setIdx) {
                    return (
                      <View key={'set-' + setIdx} style={styles.setRow}>
                        <Text style={[styles.setCell, { flex: 0.5 }]}>{setIdx + 1}</Text>
                        <TextInput
                          style={[styles.setInput, { flex: 1 }]}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor="#888"
                          value={String(s.reps || '')}
                          onChangeText={function (v) { updateSet(exIdx, setIdx, 'reps', v); }}
                        />
                        <TextInput
                          style={[styles.setInput, { flex: 1 }]}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor="#888"
                          value={String(s.weight_kg || '')}
                          onChangeText={function (v) { updateSet(exIdx, setIdx, 'weight_kg', v); }}
                        />
                        <TouchableOpacity
                          onPress={function () { removeSet(exIdx, setIdx); }}
                          style={[styles.removeSetBtn, { flex: 0.5 }]}
                        >
                          <Text style={styles.removeSetBtnText}>−</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  <TouchableOpacity
                    onPress={function () { addSet(exIdx); }}
                    style={styles.addSetBtn}
                  >
                    <Text style={styles.addSetBtnText}>+ Tilføj sæt</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          {/* Add exercise button */}
          <TouchableOpacity
            onPress={function () { setPickerVisible(true); }}
            style={styles.addExerciseBtn}
          >
            <Text style={styles.addExerciseBtnText}>+ Tilføj øvelse</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Exercise picker modal */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        onRequestClose={function () { setPickerVisible(false); }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={function () { setPickerVisible(false); }}>
              <Text style={styles.modalClose}>Luk</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Vælg øvelse</Text>
            <View style={{ width: 50 }} />
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Søg efter øvelse..."
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
            contentContainerStyle={{ paddingHorizontal: 12 }}
          >
            <TouchableOpacity
              onPress={function () { setActiveFilter('all'); }}
              style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>Alle</Text>
            </TouchableOpacity>
            {categories.map(function (cat) {
              return (
                <TouchableOpacity
                  key={'cat-' + cat}
                  onPress={function () { setActiveFilter(cat); }}
                  style={[styles.filterChip, activeFilter === cat && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, activeFilter === cat && styles.filterChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {loading ? (
            <ActivityIndicator size="large" color="#fa3c00" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={filteredLibrary}
              keyExtractor={function (item) { return String(item.id); }}
              renderItem={function (info) {
                const item = info.item;
                return (
                  <TouchableOpacity
                    style={styles.libraryItem}
                    onPress={function () { addExercise(item); }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.libraryItemName}>{item.name}</Text>
                      {item.muscle_groups && item.muscle_groups.length > 0 ? (
                        <Text style={styles.libraryItemMuscles}>
                          {item.muscle_groups.join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.libraryItemAdd}>+</Text>
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={function () { return <View style={styles.separator} />; }}
              ListEmptyComponent={
                <Text style={styles.emptyList}>Ingen øvelser fundet</Text>
              }
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
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
  saveBtn: {
    backgroundColor: '#fa3c00',
    borderRadius: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: '#888', fontSize: 12, marginTop: 2 },

  totalsBar: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  totalItem: { flex: 1, alignItems: 'center' },
  totalDivider: { width: 1, backgroundColor: '#2a2a2a' },
  totalValue: { color: '#fa3c00', fontSize: 22, fontWeight: '800' },
  totalLabel: { color: '#888', fontSize: 11, marginTop: 2 },

  scrollContent: { padding: 12, paddingBottom: 60 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  emptySub: { color: '#888', fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },

  exerciseCard: {
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  exerciseName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  muscleGroups: { color: '#fa3c00', fontSize: 11, marginTop: 2, textTransform: 'uppercase' },
  lastTime: { color: '#888', fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  removeBtn: { padding: 6 },
  removeBtnText: { color: '#666', fontSize: 18 },

  setsHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  setsHeaderCell: { color: '#666', fontSize: 11, fontWeight: '600', textAlign: 'center' },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  setCell: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  setInput: {
    backgroundColor: '#0a0a0a',
    color: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginHorizontal: 4,
    textAlign: 'center',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  removeSetBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  removeSetBtnText: { color: '#666', fontSize: 22 },

  addSetBtn: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#1f1f1f',
  },
  addSetBtnText: { color: '#fa3c00', fontWeight: '600', fontSize: 13 },

  addExerciseBtn: {
    marginTop: 8,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#fa3c00',
  },
  addExerciseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  modalContainer: { flex: 1, backgroundColor: '#0a0a0a' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  modalClose: { color: '#fa3c00', fontSize: 15, fontWeight: '600' },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },

  searchInput: {
    margin: 12,
    padding: 12,
    backgroundColor: '#161616',
    borderRadius: 10,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },

  filterRow: { maxHeight: 44, marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#161616',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  filterChipActive: { backgroundColor: '#fa3c00', borderColor: '#fa3c00' },
  filterChipText: { color: '#aaa', fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },

  libraryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  libraryItemName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  libraryItemMuscles: { color: '#888', fontSize: 12, marginTop: 2 },
  libraryItemAdd: { color: '#fa3c00', fontSize: 24, fontWeight: '300', paddingLeft: 12 },
  separator: { height: 1, backgroundColor: '#1a1a1a', marginHorizontal: 16 },
  emptyList: { color: '#888', textAlign: 'center', marginTop: 40, fontSize: 14 },
});