// src/screens/LogMeal.js
// Søg efter mad, vaelg, indtast graemmer, vaelg meal_type og log.

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Platform, FlatList,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../data';
import {
  searchFoods, logMeal, createCustomFood, buildMealPayload
} from '../services/NutritionAPI';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Morgenmad' },
  { id: 'lunch',     label: 'Frokost' },
  { id: 'dinner',    label: 'Aftensmad' },
  { id: 'snack',     label: 'Snack' }
];

function defaultMealType() {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 14) return 'lunch';
  if (h < 17) return 'snack';
  if (h < 21) return 'dinner';
  return 'snack';
}

// ============================================================================
// Step 1: Search & pick food
// ============================================================================

function SearchStep({ onPickFood, onCreateCustom }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchFoods(query.trim());
        setResults(Array.isArray(data) ? data : []);
      } catch (e) {
        console.log('search error:', e.message);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <View style={{ flex: 1 }}>
      <View style={s.searchWrap}>
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Søg efter mad (fx havregryn, banan, kylling)"
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {searching ? <ActivityIndicator color={colors.accent} /> : null}
      </View>

      {query.length === 0 ? (
        <View style={s.tipBox}>
          <Text style={s.tipTitle}>Søg i fødevaredatabasen</Text>
          <Text style={s.tipTxt}>
            Skriv navnet pa en fødevare eller en del af det. Resultater vises automatisk.
            {'\n\n'}Tip: Du kan ogsa oprette dine egne fødevarer.
          </Text>
          <TouchableOpacity style={s.customBtn} onPress={onCreateCustom}>
            <Text style={s.customBtnTxt}>+ Opret egen fødevare</Text>
          </TouchableOpacity>
        </View>
      ) : results.length === 0 && !searching && query.length >= 2 ? (
        <View style={s.emptyBox}>
          <Text style={s.emptyTxt}>Ingen resultater for "{query}"</Text>
          <TouchableOpacity style={s.customBtn} onPress={onCreateCustom}>
            <Text style={s.customBtnTxt}>+ Opret som egen fødevare</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity style={s.foodCard} onPress={() => onPickFood(item)}>
              <View style={{ flex: 1 }}>
                <Text style={s.foodName} numberOfLines={2}>{item.name}</Text>
                {item.brand ? <Text style={s.foodBrand} numberOfLines={1}>{item.brand}</Text> : null}
                <Text style={s.foodMacros}>
                  {Math.round(Number(item.kcal_per_100g) || 0)} kcal/100g
                  {item.protein_g ? ' - P ' + Number(item.protein_g).toFixed(1) + 'g' : ''}
                  {item.carbs_g ? ' - K ' + Number(item.carbs_g).toFixed(1) + 'g' : ''}
                  {item.fat_g ? ' - F ' + Number(item.fat_g).toFixed(1) + 'g' : ''}
                </Text>
              </View>
              <Text style={{ fontSize: 22, color: colors.muted, marginLeft: 8 }}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// ============================================================================
// Step 2: Quantity + meal type + log
// ============================================================================

function LogStep({ food, onBack, onLogged }) {
  const [grams, setGrams] = useState(food.serving_size_g ? String(food.serving_size_g) : '100');
  const [mealType, setMealType] = useState(defaultMealType());
  const [saving, setSaving] = useState(false);

  const factor = (Number(grams) || 0) / 100;
  const kcal = (Number(food.kcal_per_100g) || 0) * factor;
  const protein = (Number(food.protein_g) || 0) * factor;
  const carbs = (Number(food.carbs_g) || 0) * factor;
  const fat = (Number(food.fat_g) || 0) * factor;

  const onSave = async () => {
    const g = Number(String(grams).replace(',', '.'));
    if (!g || g <= 0) {
      Alert.alert('Ugyldig vægt', 'Indtast antal gram (større end 0).');
      return;
    }
    setSaving(true);
    try {
      const payload = buildMealPayload({
        food,
        grams: g,
        mealType,
        eatenAt: new Date().toISOString()
      });
      await logMeal(payload);
      if (onLogged) onLogged();
    } catch (e) {
      Alert.alert('Fejl', 'Kunne ikke logge måltid: ' + e.message);
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={onBack} style={{ marginBottom: 12 }}>
        <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>‹ Tilbage til søgning</Text>
      </TouchableOpacity>

      <View style={s.card}>
        <Text style={s.foodName}>{food.name}</Text>
        {food.brand ? <Text style={s.foodBrand}>{food.brand}</Text> : null}
        <Text style={[s.foodMacros, { marginTop: 8 }]}>
          {Math.round(Number(food.kcal_per_100g) || 0)} kcal/100g
        </Text>
      </View>

      <Text style={s.label}>Måltidstype</Text>
      <View style={s.mealTypeRow}>
        {MEAL_TYPES.map(mt => {
          const active = mealType === mt.id;
          return (
            <TouchableOpacity
              key={mt.id}
              style={[s.mealTypeBtn, active && s.mealTypeBtnActive]}
              onPress={() => setMealType(mt.id)}>
              <Text style={[s.mealTypeTxt, active && s.mealTypeTxtActive]}>{mt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={s.label}>Antal gram</Text>
      <View style={s.gramsRow}>
        <TextInput
          style={s.gramsInput}
          value={grams}
          onChangeText={setGrams}
          keyboardType="numeric"
          placeholder="100"
          placeholderTextColor={colors.muted}
        />
        <Text style={s.suffix}>g</Text>
      </View>

      <View style={s.previewBox}>
        <Text style={s.previewTitle}>Du logger</Text>
        <View style={s.previewRow}>
          <View style={s.previewItem}>
            <Text style={s.previewVal}>{Math.round(kcal)}</Text>
            <Text style={s.previewLbl}>kcal</Text>
          </View>
          <View style={s.previewItem}>
            <Text style={s.previewVal}>{protein.toFixed(1)}</Text>
            <Text style={s.previewLbl}>protein</Text>
          </View>
          <View style={s.previewItem}>
            <Text style={s.previewVal}>{carbs.toFixed(1)}</Text>
            <Text style={s.previewLbl}>kulhydrat</Text>
          </View>
          <View style={s.previewItem}>
            <Text style={s.previewVal}>{fat.toFixed(1)}</Text>
            <Text style={s.previewLbl}>fedt</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[s.saveBtn, saving && { opacity: 0.5 }]}
        onPress={onSave}
        disabled={saving}>
        {saving
          ? <ActivityIndicator color={colors.card} />
          : <Text style={s.saveTxt}>Log måltid</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ============================================================================
// Step 3: Create custom food
// ============================================================================

function CustomFoodStep({ onBack, onCreated }) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saving, setSaving] = useState(false);

  const parseNum = (v) => {
    if (!v) return 0;
    const n = Number(String(v).replace(',', '.'));
    return isNaN(n) ? 0 : n;
  };

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('Mangler navn', 'Indtast et navn pa fødevaren.');
      return;
    }
    if (!kcal) {
      Alert.alert('Mangler kalorier', 'Indtast kalorier per 100g.');
      return;
    }
    setSaving(true);
    try {
      const food = await createCustomFood({
        name: name.trim(),
        brand: brand.trim() || null,
        kcal_per_100g: parseNum(kcal),
        protein_g: parseNum(protein),
        carbs_g: parseNum(carbs),
        fat_g: parseNum(fat)
      });
      if (onCreated) onCreated(food);
    } catch (e) {
      Alert.alert('Fejl', 'Kunne ikke oprette fødevare: ' + e.message);
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={onBack} style={{ marginBottom: 12 }}>
        <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>‹ Tilbage</Text>
      </TouchableOpacity>

      <Text style={s.title}>Ny fødevare</Text>
      <Text style={[s.foodMacros, { marginBottom: 16 }]}>Indtast nærings-info per 100g</Text>

      <Text style={s.label}>Navn *</Text>
      <TextInput style={s.input} value={name} onChangeText={setName} placeholder="fx Æble" placeholderTextColor={colors.muted} />

      <Text style={s.label}>Mærke (valgfri)</Text>
      <TextInput style={s.input} value={brand} onChangeText={setBrand} placeholder="fx Naturen" placeholderTextColor={colors.muted} />

      <Text style={s.label}>Kalorier per 100g *</Text>
      <View style={s.gramsRow}>
        <TextInput style={s.gramsInput} value={kcal} onChangeText={setKcal} keyboardType="numeric" placeholder="52" placeholderTextColor={colors.muted} />
        <Text style={s.suffix}>kcal</Text>
      </View>

      <Text style={s.label}>Protein per 100g</Text>
      <View style={s.gramsRow}>
        <TextInput style={s.gramsInput} value={protein} onChangeText={setProtein} keyboardType="numeric" placeholder="0.3" placeholderTextColor={colors.muted} />
        <Text style={s.suffix}>g</Text>
      </View>

      <Text style={s.label}>Kulhydrater per 100g</Text>
      <View style={s.gramsRow}>
        <TextInput style={s.gramsInput} value={carbs} onChangeText={setCarbs} keyboardType="numeric" placeholder="14" placeholderTextColor={colors.muted} />
        <Text style={s.suffix}>g</Text>
      </View>

      <Text style={s.label}>Fedt per 100g</Text>
      <View style={s.gramsRow}>
        <TextInput style={s.gramsInput} value={fat} onChangeText={setFat} keyboardType="numeric" placeholder="0.2" placeholderTextColor={colors.muted} />
        <Text style={s.suffix}>g</Text>
      </View>

      <TouchableOpacity
        style={[s.saveBtn, saving && { opacity: 0.5 }]}
        onPress={onSave}
        disabled={saving}>
        {saving
          ? <ActivityIndicator color={colors.card} />
          : <Text style={s.saveTxt}>Opret og log</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ============================================================================
// Main
// ============================================================================

export default function LogMeal({ onBack, onDone }) {
  const [step, setStep] = useState('search');  // 'search' | 'log' | 'custom'
  const [food, setFood] = useState(null);

  const handlePickFood = (f) => { setFood(f); setStep('log'); };
  const handleLogged = () => { if (onDone) onDone(); };
  const handleCreateCustom = () => setStep('custom');
  const handleCustomCreated = (f) => { setFood(f); setStep('log'); };

  const goBack = () => {
    if (step === 'log' || step === 'custom') {
      setStep('search');
      setFood(null);
    } else {
      if (onBack) onBack();
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={goBack} style={s.backBtn}>
            <Text style={s.backTxt}>{step === 'search' ? 'Annuller' : 'Tilbage'}</Text>
          </TouchableOpacity>
          <Text style={s.title}>
            {step === 'search' ? 'Log måltid' : step === 'log' ? 'Mængde' : 'Ny fødevare'}
          </Text>
          <View style={{ width: 70 }} />
        </View>

        {step === 'search' ? (
          <SearchStep onPickFood={handlePickFood} onCreateCustom={handleCreateCustom} />
        ) : step === 'log' && food ? (
          <LogStep food={food} onBack={() => setStep('search')} onLogged={handleLogged} />
        ) : step === 'custom' ? (
          <CustomFoodStep onBack={() => setStep('search')} onCreated={handleCustomCreated} />
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
    borderBottomColor: colors.border, backgroundColor: colors.card
  },
  backBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  backTxt: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border
  },
  searchInput: {
    flex: 1, fontSize: 16, color: colors.text, paddingVertical: 8,
    paddingHorizontal: 12, backgroundColor: colors.surface, borderRadius: 10
  },
  tipBox: { padding: 24, alignItems: 'center' },
  tipTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8 },
  tipTxt: { fontSize: 13, color: colors.dim, textAlign: 'center', lineHeight: 19, marginBottom: 16 },
  emptyBox: { padding: 24, alignItems: 'center' },
  emptyTxt: { color: colors.muted, fontSize: 14, marginBottom: 12 },
  customBtn: {
    paddingVertical: 12, paddingHorizontal: 20, backgroundColor: colors.card,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginTop: 8
  },
  customBtnTxt: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  foodCard: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    backgroundColor: colors.card, borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border
  },
  foodName: { fontSize: 15, fontWeight: '700', color: colors.text },
  foodBrand: { fontSize: 12, color: colors.muted, marginTop: 2 },
  foodMacros: { fontSize: 12, color: colors.dim, marginTop: 4 },
  card: {
    backgroundColor: colors.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginBottom: 16
  },
  label: { fontSize: 13, color: colors.muted, marginBottom: 6, marginTop: 12, fontWeight: '700' },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14, fontSize: 16, color: colors.text
  },
  gramsRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14
  },
  gramsInput: {
    flex: 1, fontSize: 18, color: colors.text, paddingVertical: Platform.OS === 'ios' ? 14 : 10
  },
  suffix: { fontSize: 14, color: colors.muted, marginLeft: 8, fontWeight: '700' },
  mealTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealTypeBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border
  },
  mealTypeBtnActive: { backgroundColor: colors.accent + '20', borderColor: colors.accent },
  mealTypeTxt: { fontSize: 14, color: colors.dim, fontWeight: '600' },
  mealTypeTxtActive: { color: colors.accent, fontWeight: '700' },
  previewBox: {
    backgroundColor: colors.black, borderRadius: 14, padding: 16, marginTop: 16
  },
  previewTitle: { fontSize: 11, color: colors.card, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  previewItem: { alignItems: 'center', flex: 1 },
  previewVal: { fontSize: 20, fontWeight: '900', color: colors.card },
  previewLbl: { fontSize: 10, color: colors.muted, marginTop: 2, fontWeight: '600' },
  saveBtn: {
    marginTop: 24, backgroundColor: colors.black, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center'
  },
  saveTxt: { color: colors.card, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }
});