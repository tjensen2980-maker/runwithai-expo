import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Linking, Modal
} from 'react-native';
import { 
  colors, SERVER, getAuthToken,
  connectGarmin, disconnectGarmin, syncGarminActivities,
  importAppleHealthData
} from '../../data';

// ─── GARMIN CONNECT ───────────────────────────────────────────────────────────
function GarminSection({ connected, onConnect, onDisconnect, onSync, syncing, lastSync }) {
  return (
    <View style={s.integrationCard}>
      <View style={s.integrationHeader}>
        <View style={s.integrationLogo}>
          <Text style={s.logoText}>⌚</Text>
        </View>
        <View style={s.integrationInfo}>
          <Text style={s.integrationName}>Garmin Connect</Text>
          <Text style={s.integrationStatus}>
            {connected ? '✓ Forbundet' : 'Ikke forbundet'}
          </Text>
        </View>
        <View style={[s.statusDot, { backgroundColor: connected ? colors.green : colors.muted }]} />
      </View>
      
      <Text style={s.integrationDesc}>
        Synkroniser automatisk dine Garmin-aktiviteter inklusiv puls, pace, kadence og mere.
      </Text>
      
      {connected ? (
        <View style={s.connectedActions}>
          <TouchableOpacity 
            style={s.syncBtn}
            onPress={onSync}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={s.syncBtnText}>↻ Synkroniser nu</Text>
            )}
          </TouchableOpacity>
          
          {lastSync && (
            <Text style={s.lastSyncText}>
              Sidst synkroniseret: {new Date(lastSync).toLocaleString('da-DK')}
            </Text>
          )}
          
          <TouchableOpacity 
            style={s.disconnectBtn}
            onPress={onDisconnect}
          >
            <Text style={s.disconnectBtnText}>Afbryd forbindelse</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={s.connectBtn}
          onPress={onConnect}
        >
          <Text style={s.connectBtnText}>Forbind Garmin</Text>
        </TouchableOpacity>
      )}
      
      {/* Features list */}
      <View style={s.featuresList}>
        <Text style={s.featuresTitle}>Hvad synkroniseres:</Text>
        <View style={s.featureRow}>
          <Text style={s.featureIcon}>❤️</Text>
          <Text style={s.featureText}>Pulsdata (live og gennemsnit)</Text>
        </View>
        <View style={s.featureRow}>
          <Text style={s.featureIcon}>🏃</Text>
          <Text style={s.featureText}>Distance, pace og kadence</Text>
        </View>
        <View style={s.featureRow}>
          <Text style={s.featureIcon}>📍</Text>
          <Text style={s.featureText}>GPS-rute og elevation</Text>
        </View>
        <View style={s.featureRow}>
          <Text style={s.featureIcon}>⏱️</Text>
          <Text style={s.featureText}>Splits og intervaller</Text>
        </View>
      </View>
    </View>
  );
}

// ─── APPLE HEALTH ─────────────────────────────────────────────────────────────
function AppleHealthSection({ connected, onConnect, onImport, importing }) {
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
  
  return (
    <View style={s.integrationCard}>
      <View style={s.integrationHeader}>
        <View style={[s.integrationLogo, { backgroundColor: '#ff3b30' }]}>
          <Text style={s.logoText}>♥️</Text>
        </View>
        <View style={s.integrationInfo}>
          <Text style={s.integrationName}>Apple Health</Text>
          <Text style={s.integrationStatus}>
            {connected ? '✓ Forbundet' : isIOS ? 'Ikke forbundet' : 'Kun iOS'}
          </Text>
        </View>
        <View style={[s.statusDot, { backgroundColor: connected ? colors.green : colors.muted }]} />
      </View>
      
      <Text style={s.integrationDesc}>
        Importer løbedata fra Apple Watch via Apple Health. Inkluderer puls, distance og kalorier.
      </Text>
      
      {!isIOS ? (
        <View style={s.notAvailable}>
          <Text style={s.notAvailableText}>
            Apple Health er kun tilgængelig på iOS enheder
          </Text>
        </View>
      ) : connected ? (
        <View style={s.connectedActions}>
          <TouchableOpacity 
            style={s.syncBtn}
            onPress={onImport}
            disabled={importing}
          >
            {importing ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={s.syncBtnText}>Importer nye aktiviteter</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={[s.connectBtn, { backgroundColor: '#ff3b30' }]}
          onPress={onConnect}
        >
          <Text style={s.connectBtnText}>Forbind Apple Health</Text>
        </TouchableOpacity>
      )}
      
      {/* Features list */}
      <View style={s.featuresList}>
        <Text style={s.featuresTitle}>Hvad importeres:</Text>
        <View style={s.featureRow}>
          <Text style={s.featureIcon}>🏃</Text>
          <Text style={s.featureText}>Løb og gåture</Text>
        </View>
        <View style={s.featureRow}>
          <Text style={s.featureIcon}>❤️</Text>
          <Text style={s.featureText}>Pulsdata fra Apple Watch</Text>
        </View>
        <View style={s.featureRow}>
          <Text style={s.featureIcon}>🔥</Text>
          <Text style={s.featureText}>Kalorier forbrændt</Text>
        </View>
      </View>
    </View>
  );
}

// ─── BLUETOOTH HR SENSOR ──────────────────────────────────────────────────────
function BluetoothHRSection({ connected, devices, onScan, onConnect, onDisconnect, scanning }) {
  return (
    <View style={s.integrationCard}>
      <View style={s.integrationHeader}>
        <View style={[s.integrationLogo, { backgroundColor: colors.blue }]}>
          <Text style={s.logoText}>📶</Text>
        </View>
        <View style={s.integrationInfo}>
          <Text style={s.integrationName}>Bluetooth pulsmåler</Text>
          <Text style={s.integrationStatus}>
            {connected ? '✓ Forbundet' : 'Ikke forbundet'}
          </Text>
        </View>
        <View style={[s.statusDot, { backgroundColor: connected ? colors.green : colors.muted }]} />
      </View>
      
      <Text style={s.integrationDesc}>
        Forbind en Bluetooth pulsmåler (brystrem eller armbånd) for live pulsdata under løb.
      </Text>
      
      {connected ? (
        <View style={s.connectedActions}>
          <View style={s.connectedDevice}>
            <Text style={s.connectedDeviceName}>Polar H10</Text>
            <Text style={s.connectedDeviceStatus}>Forbundet • 68 bpm</Text>
          </View>
          <TouchableOpacity 
            style={s.disconnectBtn}
            onPress={onDisconnect}
          >
            <Text style={s.disconnectBtnText}>Afbryd</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity 
            style={[s.connectBtn, { backgroundColor: colors.blue }]}
            onPress={onScan}
            disabled={scanning}
          >
            {scanning ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={s.connectBtnText}>Søg efter enheder</Text>
            )}
          </TouchableOpacity>
          
          {devices && devices.length > 0 && (
            <View style={s.deviceList}>
              <Text style={s.deviceListTitle}>Fundne enheder:</Text>
              {devices.map((device, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={s.deviceItem}
                  onPress={() => onConnect(device)}
                >
                  <Text style={s.deviceName}>{device.name || 'Ukendt enhed'}</Text>
                  <Text style={s.deviceConnect}>Forbind →</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
      
      {/* Supported devices */}
      <View style={s.supportedDevices}>
        <Text style={s.supportedTitle}>Understøttede enheder:</Text>
        <Text style={s.supportedText}>Polar H10, H9, OH1 • Garmin HRM-Pro, Dual • Wahoo TICKR • Og andre Bluetooth LE pulsmålere</Text>
      </View>
    </View>
  );
}

// ─── MAIN INTEGRATIONS COMPONENT ──────────────────────────────────────────────
export default function Integrations() {
  const [loading, setLoading] = useState(true);
  const [garminConnected, setGarminConnected] = useState(false);
  const [appleConnected, setAppleConnected] = useState(false);
  const [btConnected, setBtConnected] = useState(false);
  const [btDevices, setBtDevices] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  
  useEffect(() => {
    loadIntegrationStatus();
  }, []);
  
  async function loadIntegrationStatus() {
    try {
      const res = await fetch(`${SERVER}/integrations/status`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      const data = await res.json();
      setGarminConnected(data.garmin || false);
      setAppleConnected(data.appleHealth || false);
    } catch (e) {
      console.error('Kunne ikke hente integration status:', e);
    }
    setLoading(false);
  }
  
  // Garmin handlers
  async function handleGarminConnect() {
    // Garmin OAuth flow - åbn browser
    Alert.alert(
      'Forbind Garmin',
      'Du vil blive sendt til Garmin Connect for at godkende adgang til dine aktiviteter.',
      [
        { text: 'Annuller', style: 'cancel' },
        { 
          text: 'Fortsæt', 
          onPress: () => {
            // For web: Åbn OAuth URL
            // For native: Brug deep linking
            Alert.alert(
              'Garmin Partner Adgang',
              'Garmin Connect API kræver en partner-aftale med Garmin. Kontakt os for at aktivere denne funktion.',
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  }
  
  async function handleGarminDisconnect() {
    Alert.alert(
      'Afbryd Garmin',
      'Er du sikker på at du vil afbryde forbindelsen til Garmin Connect?',
      [
        { text: 'Annuller', style: 'cancel' },
        { 
          text: 'Afbryd', 
          style: 'destructive',
          onPress: async () => {
            const result = await disconnectGarmin();
            if (result.success) {
              setGarminConnected(false);
            }
          }
        }
      ]
    );
  }
  
  async function handleGarminSync() {
    setSyncing(true);
    const result = await syncGarminActivities();
    if (result.activities) {
      setLastSync(new Date().toISOString());
      Alert.alert('Synkroniseret', `${result.activities.length} nye aktiviteter importeret`);
    } else if (result.error) {
      Alert.alert('Fejl', result.error);
    }
    setSyncing(false);
  }
  
  // Apple Health handlers
  async function handleAppleConnect() {
    // iOS HealthKit permission request
    Alert.alert(
      'Apple Health Adgang',
      'RunWithAI vil bede om adgang til dine træningsdata i Apple Health.',
      [
        { text: 'Annuller', style: 'cancel' },
        { 
          text: 'Tillad', 
          onPress: () => {
            // I en rigtig app ville vi kalde HealthKit her
            setAppleConnected(true);
          }
        }
      ]
    );
  }
  
  async function handleAppleImport() {
    setImporting(true);
    // Mock import - i en rigtig app ville vi læse fra HealthKit
    setTimeout(() => {
      Alert.alert('Importeret', '3 nye løb importeret fra Apple Health');
      setImporting(false);
    }, 2000);
  }
  
  // Bluetooth handlers
  async function handleBTScan() {
    setScanning(true);
    // Mock Bluetooth scan
    setTimeout(() => {
      setBtDevices([
        { id: '1', name: 'Polar H10' },
        { id: '2', name: 'Garmin HRM-Pro' },
      ]);
      setScanning(false);
    }, 3000);
  }
  
  async function handleBTConnect(device) {
    // Mock connect
    Alert.alert('Forbinder...', `Forbinder til ${device.name}`);
    setTimeout(() => {
      setBtConnected(true);
      setBtDevices([]);
    }, 1500);
  }
  
  async function handleBTDisconnect() {
    setBtConnected(false);
  }
  
  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Integrationer</Text>
        <Text style={s.headerDesc}>
          Forbind dit ur eller pulsmåler for at få pulsdata og automatisk synkronisering.
        </Text>
      </View>
      
      {/* Garmin */}
      <GarminSection
        connected={garminConnected}
        onConnect={handleGarminConnect}
        onDisconnect={handleGarminDisconnect}
        onSync={handleGarminSync}
        syncing={syncing}
        lastSync={lastSync}
      />
      
      {/* Apple Health */}
      <AppleHealthSection
        connected={appleConnected}
        onConnect={handleAppleConnect}
        onImport={handleAppleImport}
        importing={importing}
      />
      
      {/* Bluetooth HR */}
      <BluetoothHRSection
        connected={btConnected}
        devices={btDevices}
        onScan={handleBTScan}
        onConnect={handleBTConnect}
        onDisconnect={handleBTDisconnect}
        scanning={scanning}
      />
      
      {/* Coming soon */}
      <View style={s.comingSoon}>
        <Text style={s.comingSoonTitle}>Kommer snart</Text>
        <View style={s.comingSoonList}>
          <Text style={s.comingSoonItem}>• Strava integration</Text>
          <Text style={s.comingSoonItem}>• Coros ure</Text>
          <Text style={s.comingSoonItem}>• Suunto ure</Text>
          <Text style={s.comingSoonItem}>• Fitbit</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── INTEGRATION STATUS BADGE (for settings/profile) ─────────────────────────
export function IntegrationStatusBadge() {
  const [status, setStatus] = useState({ garmin: false, appleHealth: false });
  
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${SERVER}/integrations/status`, {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          }
        });
        setStatus(await res.json());
      } catch {}
    }
    load();
  }, []);
  
  const connected = status.garmin || status.appleHealth;
  
  return (
    <View style={[s.statusBadge, { backgroundColor: connected ? colors.green + '20' : colors.surface }]}>
      <View style={[s.statusBadgeDot, { backgroundColor: connected ? colors.green : colors.muted }]} />
      <Text style={[s.statusBadgeText, { color: connected ? colors.green : colors.muted }]}>
        {connected ? 'Forbundet' : 'Ikke forbundet'}
      </Text>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
  headerDesc: { fontSize: 14, color: colors.dim, lineHeight: 20 },
  
  integrationCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 16 },
  integrationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  integrationLogo: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 24 },
  integrationInfo: { flex: 1, marginLeft: 12 },
  integrationName: { fontSize: 16, fontWeight: '600', color: colors.text },
  integrationStatus: { fontSize: 13, color: colors.muted, marginTop: 2 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  integrationDesc: { fontSize: 14, color: colors.dim, marginBottom: 16, lineHeight: 20 },
  
  connectBtn: { backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  connectBtnText: { fontSize: 15, fontWeight: '600', color: colors.card },
  
  connectedActions: { gap: 12 },
  syncBtn: { backgroundColor: colors.black, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  syncBtnText: { fontSize: 15, fontWeight: '600', color: colors.card },
  lastSyncText: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  disconnectBtn: { paddingVertical: 12, alignItems: 'center' },
  disconnectBtnText: { fontSize: 14, color: colors.red },
  
  connectedDevice: { backgroundColor: colors.surface, padding: 12, borderRadius: 8 },
  connectedDeviceName: { fontSize: 14, fontWeight: '600', color: colors.text },
  connectedDeviceStatus: { fontSize: 12, color: colors.green, marginTop: 2 },
  
  notAvailable: { backgroundColor: colors.surface, padding: 16, borderRadius: 12, alignItems: 'center' },
  notAvailableText: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  
  featuresList: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  featuresTitle: { fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  featureIcon: { fontSize: 14, width: 24 },
  featureText: { fontSize: 13, color: colors.dim },
  
  deviceList: { marginTop: 16 },
  deviceListTitle: { fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 8 },
  deviceItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, padding: 12, borderRadius: 8, marginBottom: 8 },
  deviceName: { fontSize: 14, fontWeight: '500', color: colors.text },
  deviceConnect: { fontSize: 13, color: colors.accent, fontWeight: '500' },
  
  supportedDevices: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  supportedTitle: { fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 4 },
  supportedText: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  
  comingSoon: { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginTop: 8 },
  comingSoonTitle: { fontSize: 14, fontWeight: '600', color: colors.muted, marginBottom: 12 },
  comingSoonList: { gap: 4 },
  comingSoonItem: { fontSize: 13, color: colors.dim },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6 },
  statusBadgeDot: { width: 8, height: 8, borderRadius: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '500' },
});
