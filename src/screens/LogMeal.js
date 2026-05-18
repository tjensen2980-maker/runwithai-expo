// src/screens/LogMeal.js
// Søg efter mad, vælg, indtast graemmer, vælg meal_type og log.

import React, { useState, useEffect, useRef } from 'react';
import { getAvailableUnits, getDefaultUnit, convertToGrams, convertFromGrams, formatAmount } from '../utils/foodUnits';
import { computeHealthScore } from '../utils/healthScore';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Platform, FlatList,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../data';
import {
  searchFoods, logMeal, createCustomFood, buildMealPayload, parseTextToFoods
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

function SearchStep({ onPickFood, onCreateCustom, onScanBarcode, onPhotoAnalyze, onAiParse }) {
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
{onScanBarcode ? (
        <TouchableOpacity style={[s.customBtn, { backgroundColor: '#4CAF50', margin: 12 }]} onPress={onScanBarcode}>
          <Text style={[s.customBtnTxt, { color: '#fff' }]}>Scan stregkode</Text>
        </TouchableOpacity>
      ) : null}
{onPhotoAnalyze ? (
            <TouchableOpacity style={[s.customBtn, { backgroundColor: '#9C27B0', margin: 12, marginTop: 0 }]} onPress={onPhotoAnalyze}>
              <Text style={[s.customBtnTxt, { color: '#fff' }]}>Tag billede af mad (AI)</Text>
            </TouchableOpacity>
          ) : null}
          {onAiParse ? (
            <TouchableOpacity style={[s.customBtn, { backgroundColor: '#FF9800', margin: 12, marginTop: 0 }]} onPress={onAiParse}>
              <Text style={[s.customBtnTxt, { color: '#fff' }]}>✨ AI tolk: "krydderbolle med smør"</Text>
            </TouchableOpacity>
          ) : null}   
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
            Skriv navnet på en fødevare eller en del af det. Resultater vises automatisk.
            {'\n\n'}Tip: Du kan også oprette dine egne fødevarer.
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
  const initialUnit = getDefaultUnit(food);
  const servingG = Number(food && food.serving_size_g) > 0 ? Number(food.serving_size_g) : 100;
  const [unit, setUnit] = useState(initialUnit);
  const [amount, setAmount] = useState(initialUnit === 'g' ? String(servingG) : '1');
  const [mealType, setMealType] = useState(defaultMealType());
  const [saving, setSaving] = useState(false);

  const availableUnits = getAvailableUnits(food);
  const grams = convertToGrams(amount, unit, food);

  const onChangeUnit = (newUnit) => {
    // Konverter vist mængde fra nuværende enhed til ny
    const g = convertToGrams(amount, unit, food);
    setUnit(newUnit);
    const newAmount = convertFromGrams(g, newUnit, food);
    setAmount(formatAmount(newAmount));
  };

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
        <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>‹ Tilbage til Søgning</Text>
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

      <Text style={s.label}>{'Mængde'}</Text>
        <View style={s.gramsRow}>
          <TextInput
            style={s.gramsInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="1"
            placeholderTextColor={colors.muted}
          />
          <Text style={s.suffix}>{unit}</Text>
        </View>

        <Text style={s.label}>{'Enhed'}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {availableUnits.map(u => {
            const active = unit === u;
            return (
              <TouchableOpacity
                key={u}
                onPress={() => onChangeUnit(u)}
                style={[s.mealTypeBtn, active && s.mealTypeBtnActive]}>
                <Text style={[s.mealTypeTxt, active && s.mealTypeTxtActive]}>{u}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {unit !== 'g' ? (
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>
            {'≈ ' + Math.round(grams) + 'g'}
          </Text>
        ) : null}

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
      Alert.alert('Mangler navn', 'Indtast et navn på fødevaren.');
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

// ============================================================================
// Step: AI Parse Text - skriv hele måltidet i én sætning, AI tolker
// ============================================================================
function AiParseStep({ onBack, onLogged }) {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [items, setItems] = useState([]);
  const [hasParsed, setHasParsed] = useState(false);
  const [logging, setLogging] = useState(false);
  const [mealType, setMealType] = useState(defaultMealType());

  const doParse = async () => {
    if (!text.trim() || text.trim().length < 2) {
      Alert.alert('Skriv noget', 'Skriv hvad du har spist, fx "krydderbolle med smør"');
      return;
    }
    setParsing(true);
    try {
      const result = await parseTextToFoods(text.trim());
      const parsedItems = (result.items || []).map(it => ({
        ...it,
        grams: Number(it.estimated_grams) || 100,
        selected: true,
      }));
      setItems(parsedItems);
      setHasParsed(true);
    } catch (e) {
      Alert.alert('AI fejl', e.message || 'Kunne ikke tolke teksten');
    } finally {
      setParsing(false);
    }
  };

  const updateGrams = (idx, newGrams) => {
    const n = Number(newGrams);
    setItems(items.map((it, i) => i === idx ? { ...it, grams: isNaN(n) ? 0 : n } : it));
  };

  const toggleSelected = (idx) => {
    setItems(items.map((it, i) => i === idx ? { ...it, selected: !it.selected } : it));
  };

  const removeItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const totalKcal = items
    .filter(it => it.selected)
    .reduce((sum, it) => sum + (it.kcal_per_100g * it.grams / 100), 0);

  const doLogAll = async () => {
    const selected = items.filter(it => it.selected && it.grams > 0);
    if (selected.length === 0) {
      Alert.alert('Vælg mindst én', 'Vælg mindst én madvare at logge');
      return;
    }
    setLogging(true);
    try {
      for (const it of selected) {
        let foodId = it.food_id;
        // Hvis AI estimat uden DB-match, opret som custom food foerst
        if (!foodId) {
          const created = await createCustomFood({
            name: it.name,
            brand: it.brand || null,
            kcal_per_100g: Number(it.kcal_per_100g) || 0,
            protein_g: Number(it.protein_g) || 0,
            carbs_g: Number(it.carbs_g) || 0,
            fat_g: Number(it.fat_g) || 0,
            serving_size_g: 100,
          });
          foodId = created.id || created.food_id;
        }
        const food = {
          id: foodId,
          name: it.name,
          brand: it.brand || null,
          kcal_per_100g: Number(it.kcal_per_100g) || 0,
          protein_g: Number(it.protein_g) || 0,
          carbs_g: Number(it.carbs_g) || 0,
          fat_g: Number(it.fat_g) || 0,
        };
        const payload = buildMealPayload({ food, grams: it.grams, mealType });
        await logMeal(payload);
      }
      Alert.alert('Logget', selected.length + ' madvare(r) logget som ' + (MEAL_TYPES.find(m => m.id === mealType)?.label || ''));
      if (onLogged) onLogged();
    } catch (e) {
      Alert.alert('Fejl', e.message || 'Kunne ikke logge');
    } finally {
      setLogging(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Skriv hvad du har spist
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>
          Fx "krydderbolle med smør og pålægschokolade" eller "2 skiver rugbrød med ost"
        </Text>
        <TextInput
          style={[s.searchInput, { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }]}
          value={text}
          onChangeText={setText}
          placeholder="Skriv her..."
          placeholderTextColor={colors.muted}
          multiline
          autoCorrect
        />

        <TouchableOpacity
          style={[s.customBtn, { backgroundColor: '#FF9800', marginTop: 12 }]}
          onPress={doParse}
          disabled={parsing}
        >
          <Text style={[s.customBtnTxt, { color: '#fff' }]}>
            {parsing ? 'Tolker...' : '✨ Tolk med AI'}
          </Text>
        </TouchableOpacity>

        {hasParsed && items.length === 0 ? (
          <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 20 }}>
            AI fandt ingen madvarer. Prøv at omformulere.
          </Text>
        ) : null}

        {items.length > 0 ? (
          <View style={{ marginTop: 20 }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 10 }}>
              Fundne madvarer ({items.filter(it => it.selected).length} valgt):
            </Text>

            {items.map((it, idx) => { const hs = computeHealthScore(it); return (
              <View key={idx} style={{ borderLeftWidth: 4, borderLeftColor: hs.color, backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12, marginBottom: 10, opacity: it.selected ? 1 : 0.5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <TouchableOpacity onPress={() => toggleSelected(idx)} style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                      {hs.emoji} {it.selected ? '✓ ' : '○ '}{it.name}
                    </Text>
                    {it.from_db ? (
                      <Text style={{ color: '#4ade80', fontSize: 11, marginTop: 2 }}>● Fra database</Text>
                    ) : (
                      <Text style={{ color: '#FF9800', fontSize: 11, marginTop: 2 }}>● AI estimat</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeItem(idx)} style={{ padding: 4 }}>
                    <Text style={{ color: '#f87171', fontSize: 18 }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ color: colors.muted, fontSize: 13, marginRight: 8 }}>Mængde:</Text>
                  <TextInput
                    style={{ backgroundColor: '#0a0a0a', color: '#fff', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, width: 70, fontSize: 14 }}
                    value={String(it.grams)}
                    onChangeText={(v) => updateGrams(idx, v)}
                    keyboardType="numeric"
                  />
                  <Text style={{ color: colors.muted, fontSize: 13, marginLeft: 4 }}>g</Text>
                  <Text style={{ color: '#fff', fontSize: 13, marginLeft: 'auto' }}>
                    {Math.round(it.kcal_per_100g * it.grams / 100)} kcal
                  </Text>
                </View>
              </View>
            ); })}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginBottom: 12 }}>
              {MEAL_TYPES.map(mt => (
                <TouchableOpacity
                  key={mt.id}
                  onPress={() => setMealType(mt.id)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8,
                    backgroundColor: mealType === mt.id ? colors.accent : '#1a1a1a'
                  }}
                >
                  <Text style={{ color: mealType === mt.id ? '#fff' : '#ddd', fontSize: 13, fontWeight: '600' }}>
                    {mt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ backgroundColor: '#0a0a0a', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                Total: {Math.round(totalKcal)} kcal
              </Text>
            </View>

            <TouchableOpacity
              style={[s.customBtn, { backgroundColor: colors.accent }]}
              onPress={doLogAll}
              disabled={logging}
            >
              <Text style={[s.customBtnTxt, { color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' }]}>
                {logging ? 'Logger...' : 'Log ' + items.filter(it => it.selected).length + ' madvare(r)'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function LogMeal({ onBack, onDone, onScanBarcode, onPhotoAnalyze, scannedFood, onScanConsumed }) {
  const [step, setStep] = useState('search');  // 'search' | 'log' | 'custom' | 'aiparse'

  useEffect(() => {
    if (scannedFood && scannedFood.food) {
      setFood(scannedFood.food);
      setStep('log');
      if (onScanConsumed) onScanConsumed();
    }
  }, [scannedFood]);
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
            {step === 'search' ? 'Log måltid' : step === 'log' ? 'Mængde' : step === 'aiparse' ? '✨ AI tolk' : 'Ny fødevare'}
          </Text>
          <View style={{ width: 70 }} />
        </View>

        {step === 'search' ? (
          <SearchStep onPickFood={handlePickFood} onCreateCustom={handleCreateCustom} onScanBarcode={onScanBarcode} onPhotoAnalyze={onPhotoAnalyze} onAiParse={() => setStep('aiparse')} />
        ) : step === 'log' && food ? (
          <LogStep food={food} onBack={() => setStep('search')} onLogged={handleLogged} />
        ) : step === 'custom' ? (
          <CustomFoodStep onBack={() => setStep('search')} onCreated={handleCustomCreated} />
        ) : step === 'aiparse' ? (
          <AiParseStep onBack={() => setStep('search')} onLogged={handleLogged} />
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
