import React, { useState, useEffect } from 'react';
import { Icon } from '../components/Icons';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch, Platform, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, assessProfile, saveProfile, SERVER, getAuthToken, loadRuns } from '../data';

function Field({ label, value, onChange, keyboard, placeholder }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value || ''}
        onChangeText={onChange}
        keyboardType={keyboard || 'default'}
        placeholder={placeholder || ''}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

function SexPicker({ value, onChange }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>Køn</Text>
      <View style={s.sexRow}>
        {['Mand', 'Kvinde'].map(opt => (
          <TouchableOpacity
            key={opt}
            style={[s.sexBtn, value === opt && { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}
            onPress={() => onChange(opt)}>
            <Text style={[s.sexBtnText, value === opt && { color: colors.accent }]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}


// ─── SKO TRACKER ──────────────────────────────────────────────────────────────
const SHOE_WARNING_KM = 700;
const SHOE_MAX_KM = 800;

function ShoesSection({ profile, onProfileChange, runs }) {
  const shoes = profile?.shoes || [];
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newStartKm, setNewStartKm] = useState('');

  // Beregn km for hvert sko fra løbshistorik
  const shoesWithKm = shoes.map(shoe => {
    const km = runs
      .filter(r => r.shoe_id === shoe.id)
      .reduce((sum, r) => sum + (r.km || 0), 0);
    return { ...shoe, km: parseFloat(km.toFixed(1)) };
  });

  const addShoe = () => {
    if (!newName.trim()) return;
    const shoe = {
      id: Date.now().toString(),
      name: newName.trim(),
      brand: newBrand.trim(),
      addedAt: new Date().toISOString(),
      startKm: parseFloat(newStartKm) || 0,
    };
    const updated = { ...profile, shoes: [...shoes, shoe] };
    onProfileChange(updated);
    setNewName(''); setNewBrand(''); setNewStartKm('');
    setShowAdd(false);
  };

  const deleteShoe = (id) => {
    const updated = { ...profile, shoes: shoes.filter(s => s.id !== id) };
    onProfileChange(updated);
  };

  const setActive = (id) => {
    const updated = { ...profile, activeShoeId: id };
    onProfileChange(updated);
  };

  const totalKm = (shoe) => shoe.km + (shoe.startKm || 0);

  return (
    <View>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Icon name='shoe' size={16} color='#8c8c8c'/><Text style={s.sectionTitle}>SKO-TRACKER</Text></View>
      <View style={s.card}>
        {shoesWithKm.length === 0 ? (
          <Text style={st.empty}>Ingen sko tilføjet endnu. Tilføj dine løbesko og track km automatisk.</Text>
        ) : (
          shoesWithKm.map(shoe => {
            const kmTotal = totalKm(shoe);
            const pct = Math.min(kmTotal / SHOE_MAX_KM, 1);
            const isWarn = kmTotal >= SHOE_WARNING_KM;
            const isDead = kmTotal >= SHOE_MAX_KM;
            const isActive = profile?.activeShoeId === shoe.id;
            const barColor = isDead ? colors.secondary : isWarn ? '#f59e0b' : colors.green;
            return (
              <View key={shoe.id} style={[st.shoeCard, isActive && st.shoeCardActive]}>
                <View style={st.shoeTop}>
                  <View style={{ flex: 1 }}>
                    <View style={st.shoeNameRow}>
                      <Text style={st.shoeName}>{shoe.name}</Text>
                      {isActive && <View style={st.activeBadge}><Text style={st.activeBadgeText}>AKTIV</Text></View>}
                      {isDead && <View style={st.deadBadge}><Text style={st.deadBadgeText}>SLIDT</Text></View>}
                      {isWarn && !isDead && <View style={st.warnBadge}><Text style={st.warnBadgeText}>SNART SLIDT</Text></View>}
                    </View>
                    {shoe.brand ? <Text style={st.shoeBrand}>{shoe.brand}</Text> : null}
                  </View>
                  <Text style={[st.shoeKm, { color: isDead ? colors.secondary : isWarn ? '#f59e0b' : colors.accent }]}>
                    {kmTotal.toFixed(0)} km
                  </Text>
                </View>
                <View style={st.barTrack}>
                  <View style={[st.barFill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
                  <View style={st.barWarnLine} />
                </View>
                <View style={st.barLabels}>
                  <Text style={st.barLabel}>0</Text>
                  <Text style={[st.barLabel, { color: '#f59e0b' }]}>700km</Text>
                  <Text style={st.barLabel}>{SHOE_MAX_KM}km</Text>
                </View>
                {isDead && (
                  <Text style={st.deadMsg}>Disse sko har nået deres grænse og bør udskiftes for at undgå skader</Text>
                )}
                <View style={st.shoeActions}>
                  {!isActive && (
                    <TouchableOpacity style={st.actionBtn} onPress={() => setActive(shoe.id)}>
                      <Text style={st.actionBtnText}>Brug til næste løb</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={st.deleteBtn} onPress={() => {
                    if (window.confirm ? window.confirm(`Slet ${shoe.name}?`) : true) deleteShoe(shoe.id);
                  }}>
                    <Text style={st.deleteBtnText}>Slet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <TouchableOpacity style={st.addBtn} onPress={() => setShowAdd(!showAdd)}>
          <Text style={st.addBtnText}>{showAdd ? 'Annuller' : '+ Tilføj sko'}</Text>
        </TouchableOpacity>

        {showAdd && (
          <View style={st.addForm}>
            <TextInput
              style={st.input}
              placeholder="Navn på sko, f.eks. Pegasus 41"
              placeholderTextColor={colors.muted}
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={st.input}
              placeholder="Mærke, f.eks. Nike (valgfrit)"
              placeholderTextColor={colors.muted}
              value={newBrand}
              onChangeText={setNewBrand}
            />
            <TextInput
              style={st.input}
              placeholder="Km allerede løbet (valgfrit)"
              placeholderTextColor={colors.muted}
              value={newStartKm}
              onChangeText={setNewStartKm}
              keyboardType="numeric"
            />
            <TouchableOpacity style={st.saveShoeBtn} onPress={addShoe}>
              <Text style={st.saveShoeBtnText}>Gem sko</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

export default function Settings({ profile, level, onProfileChange, onLevelChange, onLogout, onBack }) {
  const [form, setForm] = useState(profile || {});
  const [saved, setSaved] = useState(false);
  const [runs, setRuns] = useState([]);
  useEffect(() => { loadRuns().then(r => setRuns(r || [])); }, []);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifTime, setNotifTime] = useState(profile?.notifTime || '07:00');
  const [notifDays, setNotifDays] = useState(profile?.notifDays || ['Man', 'Ons', 'Fre']);

  const days = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

  useEffect(() => {
    setForm(profile || {});
    if (profile?.notifTime) setNotifTime(profile.notifTime);
    if (profile?.notifDays) setNotifDays(profile.notifDays);
  }, [profile]);

  // Tjek om notifikationer allerede er aktiveret
  useEffect(() => {
    if (Platform.OS === 'web' && 'Notification' in window) {
      setNotifEnabled(Notification.permission === 'granted');
    }
  }, []);

  const field = (key) => ({
    value: form[key] || '',
    onChange: (v) => setForm(f => ({ ...f, [key]: v })),
  });

  const save = () => {
    const fullForm = { ...form, notifTime, notifDays };
    onProfileChange(fullForm);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleNotifications = async () => {
    if (Platform.OS !== 'web') return;
    if (!('Notification' in window)) return alert('Din browser understøtter ikke notifikationer');

    if (Notification.permission === 'granted') {
      setNotifEnabled(false);
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setNotifEnabled(true);
      scheduleNotifications();
      new Notification('RunWithAI', { body: 'Notifikationer er aktiveret! Vi minder dig om din træning.', icon: '/favicon.ico' });
    }
  };

  const scheduleNotifications = () => {
    // Web notifikationer kan ikke schedules permanent uden service worker
    // Vi sætter en daglig check med setInterval som en simpel løsning
    const now = new Date();
    const [h, m] = notifTime.split(':').map(Number);
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    if (target < now) target.setDate(target.getDate() + 1);
    const msUntil = target - now;
    setTimeout(() => {
      const todayDay = days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
      if (notifDays.includes(todayDay)) {
        new Notification('RunWithAI', { body: 'Husk din træning i dag! Din coach er klar.', icon: '/favicon.ico' });
      }
    }, msUntil);
  };

  const toggleDay = (day) => {
    setNotifDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const a = assessProfile(form);
  const lv = { beginner: { label: 'Begynder', icon: 'run' }, intermediate: { label: 'Øvet', icon: 'activity' }, advanced: { label: 'Avanceret', icon: 'zap' } };

  const goals = [
    { id: 'fitness', label: 'Generel fitness' },
    { id: '5k',      label: '5 km' },
    { id: '10k',     label: '10 km' },
    { id: 'half',    label: 'Halvmaraton' },
    { id: 'full',    label: 'Maraton' },
    { id: 'weight',  label: 'Vægttab' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={{ marginRight: 12, padding: 4 }}>
              <Text style={{ fontSize: 22, color: colors.black }}>←</Text>
            </TouchableOpacity>
          )}
          <Text style={s.pageTitle}>PROFIL & INDSTILLINGER</Text>
        </View>

        {/* ── NIVEAU ── */}
        <Text style={s.sectionTitle}>Niveau</Text>
        <View style={s.levelRow}>
          {Object.entries(lv).map(([id, info]) => (
            <TouchableOpacity
              key={id}
              style={[s.levelBtn, level === id && { borderColor: colors.accent, backgroundColor: colors.accent + '15' }]}
              onPress={() => onLevelChange(id)}>
              <Text style={s.levelEmoji}>{info.emoji}</Text>
              <Text style={[s.levelLabel, level === id && { color: colors.accent }]}>{info.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── PERSONLIG INFO ── */}
        <Text style={s.sectionTitle}>Personlig info</Text>
        <View style={s.card}>
          <Field label="Navn" {...field('name')} placeholder="Thomas" />
          <Field label="Alder" {...field('age')} keyboard="numeric" placeholder="32" />
          <SexPicker value={form.sex || 'Mand'} onChange={v => setForm(f => ({ ...f, sex: v }))} />
          <Field label="Vægt (kg)" {...field('weight')} keyboard="numeric" placeholder="75" />
          <Field label="Højde (cm)" {...field('height')} keyboard="numeric" placeholder="180" />
        </View>

        {/* ── LØB & MÅL ── */}
        <Text style={s.sectionTitle}>Løb & mål</Text>
        <View style={s.card}>
          <Field label="År med løb" {...field('yearsRunning')} keyboard="numeric" placeholder="3" />
          <Field label="Km om ugen" {...field('weeklyKm')} keyboard="numeric" placeholder="25" />
          <Text style={[s.label, { marginBottom: 8 }]}>Primært mål</Text>
          <View style={s.goalGrid}>
            {goals.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[s.goalBtn, form.goal === g.id && { borderColor: colors.accent, backgroundColor: colors.accent + '15' }]}
                onPress={() => setForm(f => ({ ...f, goal: g.id }))}>
                <Text style={[s.goalBtnText, form.goal === g.id && { color: colors.accent }]}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {['half','full','5k','10k'].includes(form.goal) && (
            <Field label="Race dato" {...field('raceDate')} placeholder="15. sep 2025" />
          )}
        </View>

        {/* ── PULS ── */}
        <Text style={s.sectionTitle}>Pulszoner</Text>
        <View style={s.card}>
          <Field label="Hvilepuls (bpm)" {...field('restingHr')} keyboard="numeric" placeholder="58" />
          <Field label="Maks puls (bpm)" {...field('maxHr')} keyboard="numeric" placeholder="185" />
          <Field label="VO2max (valgfrit)" {...field('vo2max')} keyboard="numeric" placeholder="52" />
          {a && (
            <View style={s.zonesWrap}>
              <Text style={s.zonesTitle}>Dine beregnede pulszoner</Text>
              {[
                { label: 'Z1 – Restitution', z: a.zones.z1, color: '#64b5f6' },
                { label: 'Z2 – Aerob base', z: a.zones.z2, color: '#81c784' },
                { label: 'Z3 – Aerob', z: a.zones.z3, color: '#ffb74d' },
                { label: 'Z4 – Tærskel', z: a.zones.z4, color: '#ff8a65' },
                { label: 'Z5 – VO2max', z: a.zones.z5, color: '#ef5350' },
              ].map(({ label, z, color }) => (
                <View key={label} style={s.zoneRow}>
                  <View style={[s.zoneDot, { backgroundColor: color }]} />
                  <Text style={s.zoneLabel}>{label}</Text>
                  <Text style={[s.zoneRange, { color }]}>{z.low}–{z.high} bpm</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── SKADER ── */}
        <Text style={s.sectionTitle}>Skader & noter</Text>
        <View style={s.card}>
          <Field label="Kendte skader eller begrænsninger" {...field('injuries')} placeholder="f.eks. knæ, akillessene" />
        </View>

        {/* ── NOTIFIKATIONER ── */}
        <Text style={s.sectionTitle}>Træningspåmindelser</Text>
        <View style={s.card}>
          <View style={s.notifRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.notifTitle}>Push notifikationer</Text>
              <Text style={s.notifSub}>Minder dig om din træning</Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: colors.border2, true: colors.accent + '80' }}
              thumbColor={notifEnabled ? colors.accent : colors.muted}
            />
          </View>

          {notifEnabled && (
            <>
              <Field label="Tidspunkt" value={notifTime} onChange={setNotifTime} placeholder="07:00" />
              <Text style={[s.label, { marginBottom: 8, marginTop: 4 }]}>Dage</Text>
              <View style={s.daysRow}>
                {days.map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[s.dayBtn, notifDays.includes(day) && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                    onPress={() => toggleDay(day)}>
                    <Text style={[s.dayBtnText, notifDays.includes(day) && { color: colors.black }]}>{day}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {/* ── SKO TRACKER ── */}
        <ShoesSection profile={form} onProfileChange={(updated) => { setForm(updated); onProfileChange(updated); }} runs={runs} />

        {/* ── ENHEDER & VISNING ── */}
        <Text style={s.sectionTitle}>Enheder & visning</Text>
        <View style={s.card}>
          <Text style={[s.label, { marginBottom: 8 }]}>Afstandsenhed</Text>
          <View style={s.sexRow}>
            {['km', 'miles'].map(unit => (
              <TouchableOpacity
                key={unit}
                style={[s.sexBtn, (form.unit || 'km') === unit && { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}
                onPress={() => setForm(f => ({ ...f, unit }))}>
                <Text style={[s.sexBtnText, (form.unit || 'km') === unit && { color: colors.accent }]}>{unit}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ height: 14 }} />
          <Text style={[s.label, { marginBottom: 8 }]}>Tempoformat</Text>
          <View style={s.sexRow}>
            {[{ id: 'pace', label: 'min/km' }, { id: 'speed', label: 'km/t' }].map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[s.sexBtn, (form.paceFormat || 'pace') === opt.id && { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}
                onPress={() => setForm(f => ({ ...f, paceFormat: opt.id }))}>
                <Text style={[s.sexBtnText, (form.paceFormat || 'pace') === opt.id && { color: colors.accent }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── UGENTLIGE MÅL ── */}
        <Text style={s.sectionTitle}>Ugentlige mål</Text>
        <View style={s.card}>
          <Field label="Km-mål per uge" value={form.weeklyKmGoal || ''} onChange={v => setForm(f => ({ ...f, weeklyKmGoal: v }))} keyboard="numeric" placeholder="20" />
          <Field label="Antal løb per uge" value={form.weeklyRunsGoal || ''} onChange={v => setForm(f => ({ ...f, weeklyRunsGoal: v }))} keyboard="numeric" placeholder="3" />
          <Text style={[s.label, { marginBottom: 8 }]}>Foretrukne løbedage</Text>
          <View style={s.daysRow}>
            {['Man','Tir','Ons','Tor','Fre','Lør','Søn'].map(day => {
              const active = (form.preferredDays || []).includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[s.dayBtn, active && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                  onPress={() => setForm(f => {
                    const days = f.preferredDays || [];
                    return { ...f, preferredDays: active ? days.filter(d => d !== day) : [...days, day] };
                  })}>
                  <Text style={[s.dayBtnText, active && { color: colors.black }]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── LØBETYPE PRÆFERENCER ── */}
        <Text style={s.sectionTitle}>Træningstyper</Text>
        <View style={s.card}>
          <Text style={[s.label, { marginBottom: 10 }]}>Hvilke typer løb foretrækker du?</Text>
          <View style={s.goalGrid}>
            {[
              { id: 'easy',     label: 'Roligt løb' },
              { id: 'interval', label: 'Intervaltræning' },
              { id: 'tempo',    label: 'Tempo' },
              { id: 'long',     label: 'Langtur' },
              { id: 'trail',    label: 'Trail' },
              { id: 'race',     label: 'Race/konkurrence' },
            ].map(t => {
              const active = (form.preferredTypes || []).includes(t.id);
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[s.goalBtn, active && { borderColor: colors.accent, backgroundColor: colors.accent + '15' }]}
                  onPress={() => setForm(f => {
                    const types = f.preferredTypes || [];
                    return { ...f, preferredTypes: active ? types.filter(x => x !== t.id) : [...types, t.id] };
                  })}>
                  <Text style={[s.goalBtnText, active && { color: colors.accent }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── PRIVATLIV ── */}
        <Text style={s.sectionTitle}>Privatliv</Text>
        <View style={s.card}>
          {[
            { key: 'shareActivity', label: 'Del løb med venner', sub: 'Venner kan se dine løb i feed' },
            { key: 'shareProfile',  label: 'Offentlig profil',    sub: 'Andre kan finde dig via email' },
            { key: 'shareLocation', label: 'Del ruter',           sub: 'Gem og del GPS-ruter offentligt' },
          ].map(({ key, label, sub }) => (
            <View key={key} style={[s.notifRow, { marginBottom: 14 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.notifTitle}>{label}</Text>
                <Text style={s.notifSub}>{sub}</Text>
              </View>
              <Switch
                value={form[key] !== false}
                onValueChange={v => setForm(f => ({ ...f, [key]: v }))}
                trackColor={{ false: colors.border2, true: colors.accent + '80' }}
                thumbColor={form[key] !== false ? colors.accent : colors.muted}
              />
            </View>
          ))}
        </View>

        {/* ── EKSPORT ── */}
        <Text style={s.sectionTitle}>Data</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.exportBtn} onPress={() => {
            const token = getAuthToken();
            fetch(`${SERVER}/runs`, { headers: { Authorization: `Bearer ${token}` } })
              .then(r => r.json())
              .then(data => {
                const csv = ['Dato,Km,Pace,Tid,Puls']
                  .concat((data.runs || []).map(r => {
                    const pace = r.pace_secs_per_km ? `${Math.floor(r.pace_secs_per_km/60)}:${String(Math.round(r.pace_secs_per_km%60)).padStart(2,'0')}` : '';
                    const tid = r.duration_secs ? `${Math.floor(r.duration_secs/60)}min` : '';
                    return `${r.date || ''},${r.km || ''},${pace},${tid},${r.avg_hr || ''}`;
                  })).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'runwithai-løb.csv'; a.click();
              });
          }}>
            <View style={{flexDirection:'row',alignItems:'center',gap:6}}><Icon name='download' size={14} color='#0a0a0a'/><Text style={s.exportBtnText}>Eksportér løb som CSV</Text></View>
          </TouchableOpacity>
          <Text style={s.exportSub}>Download alle dine løb til Excel eller Garmin Connect</Text>
        </View>

        {/* ── GEM ── */}
        <TouchableOpacity style={s.saveBtn} onPress={save}>
          <Text style={s.saveBtnText}>{saved ? 'Gemt ✓' : 'Gem ændringer'}</Text>
        </TouchableOpacity>

        {/* ── LOG UD ── */}
        <TouchableOpacity style={s.logoutBtn} onPress={onLogout}>
          <Text style={s.logoutText}>Log ud</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.black },
  scroll:       { padding: 16 },
  pageTitle:    { fontSize: 11, color: colors.muted, letterSpacing: 2, fontWeight: '600', marginBottom: 20, marginTop: 8 },
  sectionTitle: { fontSize: 11, color: colors.muted, letterSpacing: 1.5, fontWeight: '600', marginBottom: 10, marginTop: 20, textTransform: 'uppercase' },
  card:         { backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 4 },
  fieldWrap:    { marginBottom: 14 },
  label:        { color: colors.dim, fontSize: 11, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:        { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border2, borderRadius: 12, padding: 13, color: colors.text, fontSize: 15 },
  sexRow:       { flexDirection: 'row', gap: 8 },
  sexBtn:       { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border2, alignItems: 'center', backgroundColor: colors.surface },
  sexBtnText:   { color: colors.dim, fontWeight: '600' },
  levelRow:     { flexDirection: 'row', gap: 8, marginBottom: 4 },
  levelBtn:     { flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.card },
  levelEmoji:   { fontSize: 20, marginBottom: 4 },
  levelLabel:   { color: colors.dim, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  goalGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  goalBtn:      { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.border2, backgroundColor: colors.surface },
  goalBtnText:  { color: colors.dim, fontSize: 12, fontWeight: '600' },
  zonesWrap:    { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  zonesTitle:   { color: colors.dim, fontSize: 11, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  zoneRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  zoneDot:      { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  zoneLabel:    { flex: 1, color: colors.text, fontSize: 13 },
  zoneRange:    { fontSize: 13, fontWeight: '700' },
  notifRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  notifTitle:   { color: colors.text, fontWeight: '700', fontSize: 15 },
  notifSub:     { color: colors.dim, fontSize: 12, marginTop: 2 },
  daysRow:      { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayBtn:       { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border2, backgroundColor: colors.surface },
  dayBtnText:   { color: colors.dim, fontSize: 12, fontWeight: '600' },
  saveBtn:      { backgroundColor: colors.accent, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText:  { color: colors.black, fontWeight: '800', fontSize: 16 },
  logoutBtn:    { alignItems: 'center', marginTop: 16, padding: 12 },
  logoutText:   { color: colors.red, fontSize: 14, fontWeight: '600' },
  exportBtn:    { backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border2, marginBottom: 8 },
  exportBtnText:{ color: colors.accent, fontSize: 14, fontWeight: '700' },
  exportSub:    { color: colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 16 },
});

const st = StyleSheet.create({
  empty:          { color: colors.dim, fontSize: 13, lineHeight: 20, marginBottom: 4 },
  shoeCard:       { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border2 },
  shoeCardActive: { borderColor: colors.accent, backgroundColor: colors.accent + '08' },
  shoeTop:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  shoeNameRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 },
  shoeName:       { fontSize: 15, fontWeight: '700', color: colors.text },
  shoeBrand:      { fontSize: 12, color: colors.dim },
  shoeKm:         { fontSize: 22, fontWeight: '900', marginLeft: 8 },
  activeBadge:    { backgroundColor: colors.accent + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: colors.accent },
  activeBadgeText:{ fontSize: 9, color: colors.accent, fontWeight: '700', letterSpacing: 1 },
  warnBadge:      { backgroundColor: '#f59e0b20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#f59e0b' },
  warnBadgeText:  { fontSize: 9, color: '#f59e0b', fontWeight: '700' },
  deadBadge:      { backgroundColor: colors.secondary + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: colors.secondary },
  deadBadgeText:  { fontSize: 9, color: colors.secondary, fontWeight: '700', letterSpacing: 1 },
  barTrack:       { height: 8, backgroundColor: colors.border2, borderRadius: 4, overflow: 'hidden', position: 'relative', marginBottom: 4 },
  barFill:        { height: '100%', borderRadius: 4 },
  barWarnLine:    { position: 'absolute', left: '87.5%', top: 0, width: 2, height: '100%', backgroundColor: '#f59e0b60' },
  barLabels:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  barLabel:       { fontSize: 9, color: colors.muted },
  deadMsg:        { fontSize: 12, color: colors.secondary, marginBottom: 8, lineHeight: 18 },
  shoeActions:    { flexDirection: 'row', gap: 8 },
  actionBtn:      { flex: 1, backgroundColor: colors.accent + '15', borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.accent + '40' },
  actionBtnText:  { color: colors.accent, fontSize: 12, fontWeight: '600' },
  deleteBtn:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border2 },
  deleteBtnText:  { color: colors.dim, fontSize: 12 },
  addBtn:         { alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border2, marginTop: 4 },
  addBtnText:     { color: colors.accent, fontSize: 13, fontWeight: '600' },
  addForm:        { marginTop: 12, gap: 8 },
  input:          { backgroundColor: colors.surface, borderRadius: 10, padding: 12, color: colors.text, fontSize: 14, borderWidth: 1, borderColor: colors.border2 },
  saveShoeBtn:    { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveShoeBtnText:{ color: colors.black, fontWeight: '700', fontSize: 14 },
});
