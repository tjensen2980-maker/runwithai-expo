import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { analyzePhoto, logMeal, buildMealPayload, createCustomFood } from '../services/NutritionAPI';

export default function PhotoAnalyze({ onBack, onDone }) {
  const [imageUri, setImageUri] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [items, setItems] = useState([]);
  const [logging, setLogging] = useState(false);
  const [mealType, setMealType] = useState('lunch');

  const pickImage = async (source) => {
    try {
      let result;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Ingen adgang', 'Giv adgang til kameraet i indstillinger');
          return;
        }
        result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: false });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Ingen adgang', 'Giv adgang til galleri i indstillinger');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: false });
      }

      if (result.canceled || !result.assets || !result.assets[0]) return;
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setItems([]);
      analyzeImage(asset.uri);
    } catch (e) {
      Alert.alert('Fejl', 'Kunne ikke hente billede');
    }
  };

  const analyzeImage = async (uri) => {
    setAnalyzing(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const result = await analyzePhoto(base64, 'image/jpeg');
      console.log('[PhotoAnalyze] Raw result:', JSON.stringify(result));
      if (result && Array.isArray(result.items)) {
        setItems(result.items.map(it => ({ ...it, _grams: String(it.estimated_grams || 100) })));
      } else {
        setItems([]);
        Alert.alert('Ingen mad fundet', 'AI kunne ikke identificere mad i billedet. Proev et andet billede.');
      }
    } catch (e) {
      Alert.alert('Fejl', 'Foto-analyse fejlede: ' + e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const updateGrams = (idx, val) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, _grams: val } : it));
  };

  const logItem = async (item) => {
    const grams = parseFloat(item._grams);
    if (!grams || grams <= 0) {
      Alert.alert('Ugyldig maengde', 'Indtast et tal stoerre end 0');
      return;
    }
    setLogging(true);
    try {
      const food = await createCustomFood({
        name: item.name,
        kcal_per_100g: item.kcal_per_100g,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
      });
      const payload = buildMealPayload({ food, grams, mealType });
      await logMeal(payload);
      Alert.alert('Logget!', item.name + ' (' + grams + 'g) er tilfoejet', [
        { text: 'OK', onPress: () => { if (onDone) onDone(); } }
      ]);
    } catch (e) {
      Alert.alert('Fejl', 'Kunne ikke logge: ' + e.message);
    } finally {
      setLogging(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.back}>Tilbage</Text></TouchableOpacity>
        <Text style={styles.title}>AI Foto-analyse</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {!imageUri && (
          <View style={styles.intro}>
            <Text style={styles.introTitle}>Tag billede af din mad</Text>
            <Text style={styles.introTxt}>AI identificerer maden og estimerer kalorier og makroer.</Text>
            <TouchableOpacity style={styles.bigBtn} onPress={() => pickImage('camera')}>
              <Text style={styles.bigBtnTxt}>Tag billede</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.bigBtn, styles.bigBtnAlt]} onPress={() => pickImage('gallery')}>
              <Text style={styles.bigBtnAltTxt}>Vaelg fra galleri</Text>
            </TouchableOpacity>
          </View>
        )}

        {imageUri && (
          <View>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
            <TouchableOpacity style={styles.retakeBtn} onPress={() => { setImageUri(null); setItems([]); }}>
              <Text style={styles.retakeTxt}>Tag nyt billede</Text>
            </TouchableOpacity>
          </View>
        )}

        {analyzing && (
          <View style={{ alignItems: 'center', padding: 30 }}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={{ marginTop: 12, color: '#666' }}>AI analyserer billedet...</Text>
          </View>
        )}

        {items.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>Maaltidstype</Text>
            <View style={styles.mealRow}>
              {[['breakfast','Morgen'],['lunch','Frokost'],['dinner','Aften'],['snack','Snack']].map(([id, label]) => (
                <TouchableOpacity key={id}
                  style={[styles.mealBtn, mealType === id && styles.mealBtnActive]}
                  onPress={() => setMealType(id)}>
                  <Text style={[styles.mealBtnTxt, mealType === id && styles.mealBtnTxtActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>AI fandt {items.length} ting</Text>
            {items.map((item, idx) => {
              const grams = parseFloat(item._grams) || 0;
              const kcal = Math.round((item.kcal_per_100g || 0) * grams / 100);
              const protein = Math.round((item.protein_g || 0) * grams / 100);
              const carbs = Math.round((item.carbs_g || 0) * grams / 100);
              const fat = Math.round((item.fat_g || 0) * grams / 100);
              return (
                <View key={idx} style={styles.itemCard}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.confidence !== undefined && (
                    <Text style={styles.confidence}>Sikkerhed: {Math.round((item.confidence || 0) * 100)}%</Text>
                  )}
                  <View style={styles.gramsRow}>
                    <Text style={styles.label}>Maengde (g):</Text>
                    <TextInput
                      style={styles.gramInput}
                      value={item._grams}
                      onChangeText={(v) => updateGrams(idx, v)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.macroRow}>
                    <Text style={styles.macro}>{kcal} kcal</Text>
                    <Text style={styles.macro}>P: {protein}g</Text>
                    <Text style={styles.macro}>K: {carbs}g</Text>
                    <Text style={styles.macro}>F: {fat}g</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.logBtn}
                    onPress={() => logItem(item)}
                    disabled={logging}>
                    <Text style={styles.logBtnTxt}>{logging ? 'Logger...' : 'Log dette'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  back: { color: '#4CAF50', fontSize: 15, fontWeight: '600', width: 60 },
  title: { fontSize: 17, fontWeight: '700' },
  intro: { alignItems: 'center', padding: 20 },
  introTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  introTxt: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30, lineHeight: 20 },
  bigBtn: { backgroundColor: '#4CAF50', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 14, marginBottom: 12, width: '100%', alignItems: 'center' },
  bigBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bigBtnAlt: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#4CAF50' },
  bigBtnAltTxt: { color: '#4CAF50', fontSize: 16, fontWeight: '700' },
  preview: { width: '100%', height: 250, borderRadius: 14, backgroundColor: '#000' },
  retakeBtn: { alignSelf: 'center', marginTop: 10, padding: 8 },
  retakeTxt: { color: '#4CAF50', fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  mealRow: { flexDirection: 'row', gap: 8 },
  mealBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  mealBtnActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  mealBtnTxt: { color: '#666', fontWeight: '600', fontSize: 13 },
  mealBtnTxtActive: { color: '#fff' },
  itemCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e0e0e0' },
  itemName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  confidence: { fontSize: 11, color: '#999', marginBottom: 10 },
  gramsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 14, color: '#666', marginRight: 10 },
  gramInput: { flex: 1, backgroundColor: '#f5f5f7', borderRadius: 8, padding: 10, fontSize: 15, borderWidth: 1, borderColor: '#ddd' },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f5f5f7', padding: 10, borderRadius: 8, marginBottom: 10 },
  macro: { fontSize: 13, fontWeight: '600', color: '#333' },
  logBtn: { backgroundColor: '#4CAF50', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  logBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});