import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../data';
import { connectStrava, disconnectStrava, getIntegrationStatus, syncExistingRuns } from '../../services/StravaService';

function Status({ connected, label }) {
  return (
    <View style={s.statusRow}>
      <View style={[s.statusDot, { backgroundColor: connected ? colors.green : colors.muted }]} />
      <Text style={[s.statusText, connected && { color: colors.green }]}>{label}</Text>
    </View>
  );
}

export default function Integrations({ healthSync }) {
  const { t } = useTranslation();
  const [strava, setStrava] = useState({ connected: false, configured: true });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await getIntegrationStatus();
      setStrava(data.strava || { connected: false, configured: false });
    } catch (error) {
      console.warn('[Integrations] status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleConnect = async () => {
    setWorking(true);
    try {
      const result = await connectStrava();
      if (result.connected) await loadStatus();
    } catch (error) {
      const message = error.code === 'strava_not_configured'
        ? t('integrations.notConfigured')
        : t('integrations.connectFailed');
      Alert.alert(t('common.error'), message);
    } finally {
      setWorking(false);
    }
  };

  const handleDisconnect = () => Alert.alert(
    t('integrations.disconnectTitle'),
    t('integrations.disconnectConfirm'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('integrations.disconnect'),
        style: 'destructive',
        onPress: async () => {
          setWorking(true);
          try { await disconnectStrava(); await loadStatus(); }
          catch (_) { Alert.alert(t('common.error'), t('integrations.connectFailed')); }
          finally { setWorking(false); }
        },
      },
    ]
  );

  const handleSync = async () => {
    setWorking(true);
    try {
      const result = await syncExistingRuns();
      Alert.alert(t('integrations.syncedTitle'), t('integrations.syncedCount', { count: result.synced || 0 }));
      await loadStatus();
    } catch (_) {
      Alert.alert(t('common.error'), t('integrations.syncFailed'));
    } finally {
      setWorking(false);
    }
  };

  const healthName = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';
  const healthConnected = Boolean(healthSync?.isAuthorized);

  return (
    <View>
      <Text style={s.sectionTitle}>{t('integrations.title')}</Text>

      <View style={s.card}>
        <View style={s.header}>
          <Text style={s.icon}>{Platform.OS === 'ios' ? '♥' : '✚'}</Text>
          <View style={s.headerText}>
            <Text style={s.name}>{healthName}</Text>
            <Status connected={healthConnected} label={healthConnected ? t('integrations.connected') : t('integrations.notConnected')} />
          </View>
        </View>
        <Text style={s.description}>{t('integrations.healthDescription', { service: healthName })}</Text>
        {!healthConnected && healthSync?.isSupported && (
          <TouchableOpacity style={s.primaryButton} onPress={healthSync.requestAuthorization}>
            <Text style={s.primaryButtonText}>{t('integrations.allowHealth')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.card}>
        <View style={s.header}>
          <View style={s.stravaLogo}><Text style={s.stravaLogoText}>S</Text></View>
          <View style={s.headerText}>
            <Text style={s.name}>Strava</Text>
            <Status connected={strava.connected} label={strava.connected ? t('integrations.connectedAs', { name: strava.athleteName || 'Strava' }) : t('integrations.notConnected')} />
          </View>
          {(loading || working) && <ActivityIndicator color={colors.accent} />}
        </View>
        <Text style={s.description}>{t('integrations.stravaDescription')}</Text>
        {!loading && (strava.connected ? (
          <View style={s.actions}>
            <TouchableOpacity style={s.primaryButton} onPress={handleSync} disabled={working}>
              <Text style={s.primaryButtonText}>{t('integrations.syncExisting')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.secondaryButton} onPress={handleDisconnect} disabled={working}>
              <Text style={s.disconnectText}>{t('integrations.disconnect')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.stravaButton} onPress={handleConnect} disabled={working}>
            <Text style={s.primaryButtonText}>{t('integrations.connectStrava')}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  sectionTitle: { fontSize: 11, color: colors.muted, letterSpacing: 1.5, fontWeight: '600', marginBottom: 10, marginTop: 20, textTransform: 'uppercase' },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerText: { flex: 1, marginLeft: 12 },
  icon: { width: 42, height: 42, borderRadius: 12, textAlign: 'center', textAlignVertical: 'center', paddingTop: Platform.OS === 'ios' ? 8 : 7, color: '#fff', backgroundColor: '#ef4444', fontSize: 22, fontWeight: '800' },
  stravaLogo: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FC4C02' },
  stravaLogoText: { color: '#fff', fontSize: 23, fontWeight: '900' },
  name: { color: colors.text, fontSize: 16, fontWeight: '800' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  statusText: { color: colors.muted, fontSize: 12 },
  description: { color: colors.dim, fontSize: 13, lineHeight: 19, marginTop: 14, marginBottom: 14 },
  actions: { gap: 8 },
  primaryButton: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  stravaButton: { backgroundColor: '#FC4C02', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  primaryButtonText: { color: '#07120e', fontSize: 14, fontWeight: '800' },
  secondaryButton: { paddingVertical: 10, alignItems: 'center' },
  disconnectText: { color: colors.red, fontSize: 13, fontWeight: '700' },
});
