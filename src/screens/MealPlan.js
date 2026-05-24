// ============================================
// MealPlan.js
// AI-generated daily meal plan
// - Setup modal (meals per day, allergies, preferences)
// - Generate plan via /meal-plan/generate
// - Log individual meals via /meal-plan/log
// - Edit portions before logging
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { SERVER as API_URL } from '../config';

const MEAL_TYPE_LABELS = {
  breakfast: 'Morgenmad',
  lunch: 'Frokost',
  dinner: 'Aftensmad',
  snack: 'Snack',
};

const MEAL_TYPE_EMOJI = {
  breakfast: '🥣',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍎',
};

export default function MealPlan({ token, onBack, onLogged, profile, onProfileChange }) {
  // Map dietType to readable preferences string
  const dietTypeLabels = {
    vegetarian: 'vegetar',
    vegan: 'vegansk',
    pescatarian: 'pescetar',
    gluten_free: 'glutenfri',
    lactose_free: 'laktosefri',
    keto: 'keto',
    paleo: 'paleo',
  };
  // Prefer free-text preferencesText (set from this screen). Fall back to legacy dietType chip mapping.
  const initialPreferences = (profile && profile.preferencesText)
    ? profile.preferencesText
    : (profile && profile.dietType && dietTypeLabels[profile.dietType])
      ? dietTypeLabels[profile.dietType]
      : '';

  const [setupVisible, setSetupVisible] = useState(true);
  const [savedDefaults, setSavedDefaults] = useState(false);
  const [mealsPerDay, setMealsPerDay] = useState(4);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [allergies, setAllergies] = useState((profile && profile.allergies) || '');
  const [dislikes, setDislikes] = useState((profile && profile.dislikes) || '');

  const savePreferencesAsDefault = () => {
    if (onProfileChange) {
      onProfileChange({ preferencesText: preferences, allergies, dislikes });
    }
    setSavedDefaults(true);
    setTimeout(() => setSavedDefaults(false), 1800);
  };

  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState(null);
  const [loggedMealIndices, setLoggedMealIndices] = useState({});
  const [editingMealIdx, setEditingMealIdx] = useState(null);
  const [editKcal, setEditKcal] = useState('');
  const [editProtein, setEditProtein] = useState('');
  const [editCarbs, setEditCarbs] = useState('');
  const [editFat, setEditFat] = useState('');

  // ---------- Generate ----------
  async function generatePlan() {
    setSetupVisible(false);
    setGenerating(true);
    setPlan(null);
    try {
      const res = await fetch(API_URL + '/meal-plan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          meals_per_day: mealsPerDay,
          preferences: preferences,
          allergies: allergies,
          dislikes: dislikes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setPlan(data);
      setLoggedMealIndices({});
    } catch (e) {
      Alert.alert('Fejl', e.message || 'Kunne ikke generere madplan');
      setSetupVisible(true);
    } finally {
      setGenerating(false);
    }
  }

  function regenerateFromSetup() {
    setSetupVisible(true);
  }

  // ---------- Log meal ----------
  async function logMeal(meal, idx, overrides) {
    const final = Object.assign({}, meal, overrides || {});
    try {
      const res = await fetch(API_URL + '/meal-plan/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          meal: final,
          eaten_at: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      setLoggedMealIndices(function (prev) {
        const copy = Object.assign({}, prev);
        copy[idx] = true;
        return copy;
      });

      if (onLogged) onLogged();
      Alert.alert('Logget!', final.name + ' er tilføjet til dagens måltider');
    } catch (e) {
      Alert.alert('Fejl', e.message || 'Kunne ikke logge måltid');
    }
  }

  function openEdit(meal, idx) {
    setEditingMealIdx(idx);
    setEditKcal(String(Math.round(parseFloat(meal.kcal) || 0)));
    setEditProtein(String(Math.round(parseFloat(meal.protein_g) || 0)));
    setEditCarbs(String(Math.round(parseFloat(meal.carbs_g) || 0)));
    setEditFat(String(Math.round(parseFloat(meal.fat_g) || 0)));
  }

  function saveEdit() {
    if (editingMealIdx === null || !plan) return;
    const meal = plan.meals[editingMealIdx];
    const overrides = {
      kcal: parseFloat(editKcal) || 0,
      protein_g: parseFloat(editProtein) || 0,
      carbs_g: parseFloat(editCarbs) || 0,
      fat_g: parseFloat(editFat) || 0,
    };
    setEditingMealIdx(null);
    logMeal(meal, editingMealIdx, overrides);
  }

  function cancelEdit() {
    setEditingMealIdx(null);
  }

// ---------- Render ----------
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>🤖 AI Madplan</Text>
          <Text style={styles.headerSub}>Personligt tilpasset dit mål</Text>
        </View>
        {plan ? (
          <TouchableOpacity onPress={regenerateFromSetup} style={styles.headerBtn}>
            <Text style={styles.headerBtnAction}>Ny</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {generating ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#fa3c00" />
          <Text style={styles.loadingTitle}>AI'en laver din madplan...</Text>
          <Text style={styles.loadingSub}>Det tager 10-20 sekunder</Text>
        </View>
      ) : plan ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Targets summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>DAGENS MÅL</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{plan.totals.kcal}</Text>
                <Text style={styles.summaryLabel}>/ {plan.targets.kcal} kcal</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{plan.totals.protein_g}g</Text>
                <Text style={styles.summaryLabel}>/ {plan.targets.protein_g}g P</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{plan.totals.carbs_g}g</Text>
                <Text style={styles.summaryLabel}>/ {plan.targets.carbs_g}g K</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{plan.totals.fat_g}g</Text>
                <Text style={styles.summaryLabel}>/ {plan.targets.fat_g}g F</Text>
              </View>
            </View>
          </View>

          {/* Meals */}
          {plan.meals.map(function (m, idx) {
            const isLogged = !!loggedMealIndices[idx];
            const emoji = MEAL_TYPE_EMOJI[m.meal_type] || '🍴';
            const label = MEAL_TYPE_LABELS[m.meal_type] || 'Måltid';
            return (
              <View key={'meal-' + idx} style={styles.mealCard}>
                <View style={styles.mealHeader}>
                  <Text style={styles.mealEmoji}>{emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mealType}>{label.toUpperCase()}</Text>
                    <Text style={styles.mealName}>{m.name}</Text>
                  </View>
                  <View style={styles.mealKcalBox}>
                    <Text style={styles.mealKcal}>{Math.round(parseFloat(m.kcal) || 0)}</Text>
                    <Text style={styles.mealKcalLabel}>kcal</Text>
                  </View>
                </View>

                {m.description ? (
                  <Text style={styles.mealDesc}>{m.description}</Text>
                ) : null}

                <View style={styles.macroRow}>
                  <Text style={styles.macroText}>P {Math.round(parseFloat(m.protein_g) || 0)}g</Text>
                  <Text style={styles.macroText}>K {Math.round(parseFloat(m.carbs_g) || 0)}g</Text>
                  <Text style={styles.macroText}>F {Math.round(parseFloat(m.fat_g) || 0)}g</Text>
                </View>

                {Array.isArray(m.ingredients) && m.ingredients.length > 0 ? (
                  <View style={styles.ingredientsBox}>
                    <Text style={styles.ingredientsTitle}>INGREDIENSER</Text>
                    {m.ingredients.map(function (ing, i) {
                      return (
                        <Text key={'ing-' + i} style={styles.ingredient}>• {ing}</Text>
                      );
                    })}
                  </View>
                ) : null}

                {isLogged ? (
                  <View style={styles.loggedBadge}>
                    <Text style={styles.loggedBadgeText}>✓ Logget</Text>
                  </View>
                ) : (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.editBtn]}
                      onPress={function () { openEdit(m, idx); }}
                    >
                      <Text style={styles.editBtnText}>Rediger</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.logBtn]}
                      onPress={function () { logMeal(m, idx); }}
                    >
                      <Text style={styles.logBtnText}>Log måltid</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          <Text style={styles.disclaimer}>
            🤖 AI-genereret. Tjek altid ingredienser hvis du har allergier.
          </Text>
        </ScrollView>
      ) : null}

      {/* Setup modal */}
      <Modal
        visible={setupVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={onBack}
      >
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.header}>
              <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>✕</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={styles.headerTitle}>Tilpas madplan</Text>
              </View>
              <View style={styles.headerBtn} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.label}>ANTAL MÅLTIDER OM DAGEN</Text>
              <View style={styles.mealsCountRow}>
                {[3, 4, 5].map(function (n) {
                  return (
                    <TouchableOpacity
                      key={'count-' + n}
                      style={[styles.countBtn, mealsPerDay === n && styles.countBtnActive]}
                      onPress={function () { setMealsPerDay(n); }}
                    >
                      <Text style={[styles.countBtnText, mealsPerDay === n && styles.countBtnTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>PRÆFERENCER</Text>
              <Text style={styles.hint}>Fx vegetar, vegansk, low-carb, høj protein</Text>
              <TextInput
                style={styles.input}
                placeholder="Fx 'høj protein, vegetar'"
                placeholderTextColor="#666"
                value={preferences}
                onChangeText={setPreferences}
              />

              <Text style={styles.label}>ALLERGIER</Text>
              <Text style={styles.hint}>Ingredienser AI'en SKAL undgå</Text>
              <TextInput
                style={styles.input}
                placeholder="Fx 'gluten, mælk, nødder'"
                placeholderTextColor="#666"
                value={allergies}
                onChangeText={setAllergies}
              />

              <Text style={styles.label}>KAN IKKE LIDE</Text>
              <Text style={styles.hint}>AI'en undgår disse hvis muligt</Text>
              <TextInput
                style={styles.input}
                placeholder="Fx 'fisk, oliven'"
                placeholderTextColor="#666"
                value={dislikes}
                onChangeText={setDislikes}
              />

              <TouchableOpacity
                style={[styles.generateBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#888', marginBottom: 8 }]}
                onPress={savePreferencesAsDefault}
              >
                <Text style={[styles.generateBtnText, { color: '#fff' }]}>
                  {savedDefaults ? '\u2713 Gemt som standard' : '\ud83d\udcbe Gem som standard'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.generateBtn}
                onPress={generatePlan}
              >
                <Text style={styles.generateBtnText}>🤖 Generer madplan</Text>
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                AI'en bruger dit kalorimål, makro-fordeling og dit primære mål (fra Goals).
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Edit modal */}
      <Modal
        visible={editingMealIdx !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={cancelEdit}
      >
        <View style={styles.editOverlay}>
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>Justér portionsstørrelse</Text>

            <View style={styles.editRow}>
              <Text style={styles.editLabel}>Kcal</Text>
              <TextInput
                style={styles.editInput}
                keyboardType="numeric"
                value={editKcal}
                onChangeText={setEditKcal}
              />
            </View>
            <View style={styles.editRow}>
              <Text style={styles.editLabel}>Protein (g)</Text>
              <TextInput
                style={styles.editInput}
                keyboardType="numeric"
                value={editProtein}
                onChangeText={setEditProtein}
              />
            </View>
            <View style={styles.editRow}>
              <Text style={styles.editLabel}>Kulhydrater (g)</Text>
              <TextInput
                style={styles.editInput}
                keyboardType="numeric"
                value={editCarbs}
                onChangeText={setEditCarbs}
              />
            </View>
            <View style={styles.editRow}>
              <Text style={styles.editLabel}>Fedt (g)</Text>
              <TextInput
                style={styles.editInput}
                keyboardType="numeric"
                value={editFat}
                onChangeText={setEditFat}
              />
            </View>

            <View style={styles.editButtons}>
              <TouchableOpacity
                style={[styles.editBtnAction, styles.editCancel]}
                onPress={cancelEdit}
              >
                <Text style={styles.editBtnActionText}>Annuller</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editBtnAction, styles.editSave]}
                onPress={saveEdit}
              >
                <Text style={[styles.editBtnActionText, { color: '#fff' }]}>Log med ændringer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  headerBtnAction: { color: '#fa3c00', fontSize: 14, fontWeight: '700' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSub: { color: '#888', fontSize: 12, marginTop: 2 },

  content: { padding: 16, paddingBottom: 40 },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 16 },
  loadingSub: { color: '#888', fontSize: 13, marginTop: 4 },

  summaryCard: {
    backgroundColor: '#161616',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  summaryTitle: { color: '#888', fontSize: 11, letterSpacing: 2, fontWeight: '700', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: '#2a2a2a', height: 30 },
  summaryValue: { color: '#fa3c00', fontSize: 16, fontWeight: '900' },
  summaryLabel: { color: '#888', fontSize: 10, marginTop: 2 },

  mealCard: {
    backgroundColor: '#161616',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  mealHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  mealEmoji: { fontSize: 32, marginRight: 10 },
  mealType: { color: '#fa3c00', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  mealName: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 2 },
  mealKcalBox: { alignItems: 'flex-end' },
  mealKcal: { color: '#fff', fontSize: 22, fontWeight: '900' },
  mealKcalLabel: { color: '#888', fontSize: 11 },

  mealDesc: { color: '#aaa', fontSize: 13, lineHeight: 19, marginBottom: 8 },

  macroRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    marginBottom: 10,
  },
  macroText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  ingredientsBox: {
    backgroundColor: '#0a0a0a',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  ingredientsTitle: { color: '#888', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  ingredient: { color: '#ccc', fontSize: 13, lineHeight: 19 },

  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  editBtn: { backgroundColor: '#2a2a2a' },
  editBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  logBtn: { backgroundColor: '#fa3c00' },
  logBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  loggedBadge: {
    backgroundColor: '#1f3a1f',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  loggedBadgeText: { color: '#22c55e', fontSize: 13, fontWeight: '700' },

  disclaimer: { color: '#666', fontSize: 11, textAlign: 'center', marginTop: 16, fontStyle: 'italic' },

  label: { color: '#888', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 16, marginBottom: 4 },
  hint: { color: '#666', fontSize: 12, marginBottom: 8 },
  input: {
    backgroundColor: '#161616',
    color: '#fff',
    fontSize: 15,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },

  mealsCountRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  countBtn: {
    flex: 1,
    paddingVertical: 18,
    backgroundColor: '#161616',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a2a2a',
  },
  countBtnActive: { backgroundColor: '#fa3c00', borderColor: '#fa3c00' },
  countBtnText: { color: '#888', fontSize: 22, fontWeight: '900' },
  countBtnTextActive: { color: '#fff' },

  generateBtn: {
    backgroundColor: '#fa3c00',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },

  editOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  editCard: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  editTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 14 },
  editRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  editLabel: { color: '#aaa', fontSize: 14, flex: 1 },
  editInput: {
    backgroundColor: '#0a0a0a',
    color: '#fff',
    fontSize: 15,
    padding: 10,
    borderRadius: 8,
    minWidth: 100,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  editButtons: { flexDirection: 'row', gap: 10, marginTop: 14 },
  editBtnAction: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  editBtnActionText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  editCancel: { backgroundColor: '#2a2a2a' },
  editSave: { backgroundColor: '#fa3c00' },
});
