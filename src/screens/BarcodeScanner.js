import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { lookupBarcode } from '../services/NutritionAPI';

export default function BarcodeScanner({ onBack, onScanned }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {

      const result = await lookupBarcode(data);


      if (result && result.id) {
        if (onScanned) onScanned(result, data);
      } else {
        Alert.alert(
          'Ikke fundet',
          'Produktet blev ikke fundet i databasen. Vil du oprette det manuelt?',
          [
            { text: 'Scan igen', onPress: () => { setScanned(false); setLoading(false); } },
            {
              text: 'Opret manuelt',
              onPress: () => { if (onScanned) onScanned(null, data); },
            },
          ]
        );
      }
    } catch (err) {

      Alert.alert(
        'Fejl',
        'Kunne ikke slaa stregkoden op. Tjek din forbindelse.',
        [{ text: 'Proev igen', onPress: () => { setScanned(false); setLoading(false); } }]
      );
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.text}>Indlaeser kamera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Ingen adgang til kamera</Text>
        <Text style={styles.subtext}>Giv adgang for at scanne stregkoder</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Giv tilladelse</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#666', marginTop: 10 }]} onPress={onBack}>
          <Text style={styles.btnText}>Tilbage</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
        }}
      />

      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onBack} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>X</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Scan stregkode</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.scanArea}>
          <View style={styles.scanBox}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.hint}>Hold kameraet over stregkoden</Text>
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.text}>Slaar op...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 20 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { color: '#fff', fontSize: 24 },
  title: { color: '#fff', fontSize: 18, fontWeight: '600' },
  scanArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanBox: { width: 280, height: 180, position: 'relative' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#4CAF50' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  hint: { color: '#fff', marginTop: 30, fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  loadingBox: { padding: 30, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  text: { color: '#fff', fontSize: 16, marginTop: 10, textAlign: 'center' },
  subtext: { color: '#aaa', fontSize: 14, marginTop: 8, textAlign: 'center' },
  btn: { marginTop: 20, backgroundColor: '#4CAF50', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});