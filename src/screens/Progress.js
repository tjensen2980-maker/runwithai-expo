// Progress.js - Fremgang-fanen (rebrand): graf + grupperet aktivitetsliste.
// Kortet vises FOERST i detaljevisningen, naar man trykker paa en aktivitet.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Platform, Dimensions, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, deleteRun } from '../data';
import FreeTierBanner from '../components/FreeTierBanner';

// Kort kun paa native - webben klarer sig uden
let MapView = null, Polyline = null;
if (Platform.OS !== 'web') {
  try { const M = require('react-native-maps'); MapView = M.default; Polyline = M.Polyline; } catch (e) {}
}

function typeInfo(run, t) {
  const type = String(run.type || '').toLowerCase();
  if (type.includes('walk') || type.includes('gå') || type.includes('gaa')) return { emoji: '🚶', label: t('progress.activityTypes.walk') };
  if (type.includes('cyc') || type.includes('bike') || type.includes('cykl')) return { emoji: '🚴', label: t('progress.activityTypes.cycling') };
  return { emoji: '🏃', label: t('progress.activityTypes.run') };
}

function fmtDur(sek) {
  const s = Math.max(0, Math.round(Number(sek) || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h + ':' + String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}

function fmtKm(km) {
  const v = Number(km) || 0;
  return (Math.round(v * 100) / 100).toFixed(2).replace('.', ',').replace(/,?0+$/, '') || '0';
}

function fmtPace(p) {
  const v = Number(p) || 0;
  if (!v || !isFinite(v)) return '-';
  const m = Math.floor(v), s = Math.round((v - m) * 60);
  return m + ':' + String(s).padStart(2, '0');
}

function isCycling(run) {
  const type = String(run?.type || '').toLowerCase();
  return type.includes('cyc') || type.includes('bike') || type.includes('cykl');
}

function fmtSpeed(run) {
  const km = Number(run?.km) || 0;
  const seconds = Number(run?.duration) || 0;
  if (km <= 0 || seconds <= 0) return '-';
  return ((km * 3600) / seconds).toFixed(1).replace('.', ',');
}

function isoUge(d) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dag = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dag);
  const nytaar = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil((((dt - nytaar) / 86400000) + 1) / 7);
}

function periodeNoegle(d, mode) {
  if (mode === 'weeks') return d.getFullYear() + '-U' + String(isoUge(d)).padStart(2, '0');
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function periodeLabel(noegle, mode, t, locale) {
  if (mode === 'weeks') { const [aar, u] = noegle.split('-U'); return t('progress.weekLabel', { week: Number(u), year: aar }); }
  const [aar, m] = noegle.split('-');
  const month = new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2020, Number(m) - 1, 1));
  return month + ' ' + aar;
}

function ruteKoordinater(run) {
  let r = run.route || run.polyline;
  for (let i = 0; i < 4 && typeof r === 'string'; i += 1) {
    try { r = JSON.parse(r); } catch (e) { return null; }
  }
  if (!Array.isArray(r) || r.length < 2) return null;
  const pts = r.map(p => ({ latitude: Number(p.latitude != null ? p.latitude : p.lat), longitude: Number(p.longitude != null ? p.longitude : (p.lng != null ? p.lng : p.lon)) })).filter(p => isFinite(p.latitude) && isFinite(p.longitude));
  return pts.length >= 2 ? pts : null;
}

export default function Progress({ runs, onRunDeleted, isPro }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language || 'en';
  const [mode, setMode] = useState('months');
  const [valgt, setValgt] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const alle = Array.isArray(runs) ? runs.filter(r => r && r.date) : [];

  // Grupper aktiviteter pr. periode (nyeste foerst)
  const grupper = useMemo(() => {
    const g = {};
    alle.forEach(r => {
      const d = new Date(r.date);
      if (isNaN(d)) return;
      const k = periodeNoegle(d, mode);
      if (!g[k]) g[k] = [];
      g[k].push(r);
    });
    return Object.keys(g).sort().reverse().map(k => ({
      noegle: k,
      label: periodeLabel(k, mode, t, locale),
      runs: g[k].sort((a, b) => new Date(b.date) - new Date(a.date)),
    }));
  }, [alle, mode, locale, t]);

  // Graf: de seneste 8 perioder, inkl. tomme
  const graf = useMemo(() => {
    const ud = [];
    const nu = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(nu);
      if (mode === 'weeks') d.setDate(nu.getDate() - i * 7); else d.setMonth(nu.getMonth() - i, 1);
      const k = periodeNoegle(d, mode);
      const antal = (grupper.find(x => x.noegle === k) || { runs: [] }).runs.length;
      const label = mode === 'weeks'
        ? t('progress.weekShort', { week: isoUge(d) })
        : new Intl.DateTimeFormat(locale, { month: 'short' }).format(d);
      ud.push({ label, antal });
    }
    return ud;
  }, [grupper, mode, locale, t]);
  const maxAntal = Math.max(1, ...graf.map(x => x.antal));

  const koordinater = valgt ? ruteKoordinater(valgt) : null;
  const removeSelectedRun = async () => {
    if (!valgt || deleting) return;
    setDeleting(true);
    const deleted = await deleteRun(valgt);
    setDeleting(false);
    if (!deleted) {
      Alert.alert(t('common.error'), t('common.retry'));
      return;
    }
    const removed = valgt;
    setValgt(null);
    onRunDeleted?.(removed);
  };
  const confirmDelete = () => {
    if (!valgt || deleting) return;
    Alert.alert(
      t('common.delete'),
      t('alerts.deleteRun'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: removeSelectedRun },
      ],
    );
  };
  let region = null;
  if (koordinater) {
    const lats = koordinater.map(p => p.latitude), lngs = koordinater.map(p => p.longitude);
    const minLa = Math.min(...lats), maxLa = Math.max(...lats), minLo = Math.min(...lngs), maxLo = Math.max(...lngs);
    region = {
      latitude: (minLa + maxLa) / 2,
      longitude: (minLo + maxLo) / 2,
      latitudeDelta: Math.max(0.004, (maxLa - minLa) * 1.5),
      longitudeDelta: Math.max(0.004, (maxLo - minLo) * 1.5),
    };
  }

  return (
    <View style={s.safe}>
      {/* Uger / Maaneder-toggle */}
      <View style={s.toggleRow}>
        <View style={s.toggle}>
          {[['weeks', t('progress.weeks')], ['months', t('progress.months')]].map(([id, label]) => (
            <TouchableOpacity key={id} style={[s.toggleBtn, mode === id && s.toggleBtnAktiv]} onPress={() => setMode(id)}>
              <Text style={[s.toggleTekst, mode === id && s.toggleTekstAktiv]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Graf-kort */}
        <View style={s.grafKort}>
          <View style={s.grafRaekke}>
            {graf.map((p, i) => (
              <View key={i} style={s.grafKolonne}>
                <Text style={s.grafVaerdi}>{p.antal > 0 ? p.antal : '0'}</Text>
                <View style={[s.grafSoejle, { height: Math.max(4, Math.round((p.antal / maxAntal) * 150)), opacity: p.antal > 0 ? 1 : 0.15 }]} />
                <Text style={s.grafLabel}>{p.label}</Text>
              </View>
            ))}
          </View>
          <Text style={s.grafTitel}>{t('progress.activities')}</Text>
        </View>

        <FreeTierBanner isPro={isPro} placement="progress" />

        {/* Grupperet liste */}
        {grupper.length === 0 && (
          <Text style={s.tom}>{t('progress.empty')} 🌱</Text>
        )}
        {grupper.map(g => {
          const tid = g.runs.reduce((a, r) => a + (Number(r.duration) || 0), 0);
          const km = g.runs.reduce((a, r) => a + (Number(r.km) || 0), 0);
          const kal = g.runs.reduce((a, r) => a + (Number(r.calories) || 0), 0);
          return (
            <View key={g.noegle}>
              <View style={s.gruppeHeader}>
                <Text style={s.gruppeTitel}>{g.label}</Text>
                <Text style={s.gruppeStats}>{'⏱ ' + fmtDur(tid) + '   📍 ' + fmtKm(km) + ' km   🔥 ' + Math.round(kal) + ' ' + t('progress.caloriesShort')}</Text>
              </View>
              <View style={s.gruppeKort}>
                {g.runs.map((r, i) => {
                  const info = typeInfo(r, t);
                  return (
                    <TouchableOpacity key={r.id || i} style={[s.raekke, i > 0 && s.raekkeStreg]} onPress={() => setValgt(r)}>
                      <View style={s.ikonCirkel}><Text style={s.ikonTekst}>{info.emoji}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.raekkeTitel}>{fmtKm(r.km)} km</Text>
                        <Text style={s.raekkeType}>{info.label}</Text>
                        <Text style={s.raekkeStats}>{fmtDur(r.duration) + '   ' + fmtKm(r.km) + ' km   ' + Math.round(Number(r.calories) || 0) + ' ' + t('progress.caloriesShort')}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.raekkeDato}>{new Date(r.date).toLocaleDateString(locale)}</Text>
                        <Text style={s.chevron}>{'›'}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Detalje: kortet aabner FOERST her */}
      <Modal visible={!!valgt} animationType="slide" onRequestClose={() => setValgt(null)}>
        {valgt && (() => {
          const info = typeInfo(valgt, t);
          return (
            <View style={s.detSafe}>
              <View style={s.detHeader}>
                <TouchableOpacity style={s.detTilbage} onPress={() => setValgt(null)}>
                  <Text style={s.detTilbageTekst}>{'‹'}</Text>
                </TouchableOpacity>
                <Text style={s.detDato}>{new Date(valgt.date).toLocaleDateString(locale)}</Text>
                <View style={{ width: 44 }} />
              </View>
              {MapView && koordinater ? (
                <MapView style={s.detKort} initialRegion={region} userInterfaceStyle="dark">
                  {Polyline && <Polyline coordinates={koordinater} strokeColor={colors.accent2} strokeWidth={4} />}
                </MapView>
              ) : (
                <View style={[s.detKort, s.detKortTom]}><Text style={s.detKortTomTekst}>{t('progress.noRoute')}</Text></View>
              )}
              <Text style={s.detTitel}>{info.label + ' ' + fmtKm(valgt.km) + ' km'}</Text>
              <Text style={s.detUnder}>{valgt.notes || t('progress.standardTraining')}</Text>
              <View style={s.detGrid}>
                {[
                  ['👣', valgt.total_steps ? String(valgt.total_steps) : '-', t('progress.steps')],
                  ['⏱', fmtDur(valgt.duration), t('progress.duration')],
                  ['❤️', valgt.heart_rate ? String(Math.round(valgt.heart_rate)) : '-', 'bpm'],
                  ['📍', fmtKm(valgt.km), 'km'],
                  ['🔥', String(Math.round(Number(valgt.calories) || 0)), t('progress.caloriesShort')],
                  ['⏲', isCycling(valgt) ? fmtSpeed(valgt) : fmtPace(valgt.pace), isCycling(valgt) ? 'km/t' : 'min/km'],
                ].map(([emoji, vaerdi, label], i) => (
                  <View key={i} style={s.detCelle}>
                    <Text style={s.detVaerdi}>{vaerdi}</Text>
                    <Text style={s.detLabel}>{emoji + ' ' + label}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('common.delete')}
                disabled={deleting}
                onPress={confirmDelete}
                style={[s.deleteBtn, deleting && { opacity: 0.6 }]}
              >
                {deleting
                  ? <ActivityIndicator color={colors.red} />
                  : <Text style={s.deleteBtnText}>{t('common.delete')}</Text>}
              </TouchableOpacity>
            </View>
          );
        })()}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: colors.bg, paddingTop: 60 },
  toggleRow:       { alignItems: 'center', marginBottom: 12 },
  toggle:          { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 22, padding: 4 },
  toggleBtn:       { paddingVertical: 8, paddingHorizontal: 22, borderRadius: 18 },
  toggleBtnAktiv:  { backgroundColor: colors.card2 },
  toggleTekst:     { color: colors.muted, fontWeight: '700', fontSize: 15 },
  toggleTekstAktiv:{ color: colors.text },
  grafKort:        { backgroundColor: colors.card, borderRadius: 24, marginHorizontal: 16, padding: 18, marginBottom: 18 },
  grafRaekke:      { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 200 },
  grafKolonne:     { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  grafSoejle:      { width: 22, borderRadius: 11, backgroundColor: colors.accent2, marginTop: 6 },
  grafVaerdi:      { color: colors.accent2, fontSize: 12, fontWeight: '700' },
  grafLabel:       { color: colors.muted, fontSize: 12, marginTop: 8 },
  grafTitel:       { color: colors.text, textAlign: 'center', fontWeight: '800', marginTop: 12 },
  tom:             { color: colors.muted, textAlign: 'center', marginTop: 30, fontSize: 15 },
  gruppeHeader:    { paddingHorizontal: 20, marginTop: 10, marginBottom: 8 },
  gruppeTitel:     { color: colors.text, fontSize: 22, fontWeight: '800' },
  gruppeStats:     { color: colors.muted, fontSize: 14, marginTop: 4 },
  gruppeKort:      { backgroundColor: colors.card, borderRadius: 24, marginHorizontal: 12, marginBottom: 10, overflow: 'hidden' },
  raekke:          { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  raekkeStreg:     { borderTopWidth: 1, borderTopColor: colors.border },
  ikonCirkel:      { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  ikonTekst:       { fontSize: 20 },
  raekkeTitel:     { color: colors.text, fontSize: 19, fontWeight: '800' },
  raekkeType:      { color: colors.text, fontSize: 15, marginTop: 1 },
  raekkeStats:     { color: colors.muted, fontSize: 13, marginTop: 4 },
  raekkeDato:      { color: colors.muted, fontSize: 13 },
  chevron:         { color: colors.muted, fontSize: 22, marginTop: 6 },
  detSafe:         { flex: 1, backgroundColor: colors.bg, paddingTop: 56 },
  detHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 10 },
  detTilbage:      { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  detTilbageTekst: { color: colors.text, fontSize: 26, marginTop: -3 },
  detDato:         { color: colors.text, fontSize: 17, fontWeight: '700' },
  detKort:         { height: Math.round(Dimensions.get('window').height * 0.42), width: '100%' },
  detKortTom:      { backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  detKortTomTekst: { color: colors.muted },
  detTitel:        { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center', marginTop: 18 },
  detUnder:        { color: colors.muted, fontSize: 16, textAlign: 'center', marginTop: 4, marginBottom: 14 },
  detGrid:         { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  detCelle:        { width: '33.33%', alignItems: 'center', paddingVertical: 14 },
  detVaerdi:       { color: colors.text, fontSize: 22, fontWeight: '800' },
  detLabel:        { color: colors.muted, fontSize: 13, marginTop: 4 },
  deleteBtn:       { alignSelf: 'center', minWidth: 180, marginTop: 8, paddingVertical: 13, paddingHorizontal: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.red },
  deleteBtnText:   { color: colors.red, fontSize: 15, fontWeight: '800', textAlign: 'center' },
});
