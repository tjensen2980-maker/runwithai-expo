import React, { useState, useEffect } from 'react';
import { Icon } from '../components/Icons';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch, Platform, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, assessProfile, saveProfile, SERVER, getAuthToken, loadRuns } from '../data';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

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

function SexPicker({ value, onChange, t }) {
  const options = [
    { id: 'Mand', label: t('settings.sex.male') },
    { id: 'Kvinde', label: t('settings.sex.female') }
  ];
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{t('settings.fields.sex')}</Text>
      <View style={s.sexRow}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.id}
            style={[s.sexBtn, value === opt.id && { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}
            onPress={() => onChange(opt.id)}>
            <Text style={[s.sexBtnText, value === opt.id && { color: colors.accent }]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── SKO TRACKER ────────────────────────────────────────────────────────────
const SHOE_WARNING_KM = 700;
const SHOE_MAX_KM = 800;

function ShoesSection({ profile, onProfileChange, runs, t }) {
  const shoes = profile?.shoes || [];
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newStartKm, setNewStartKm] = useState('');

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
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <Icon name='shoe' size={16} color='#8c8c8c'/>
        <Text style={s.sectionTitle}>{t('settings.shoes.title')}</Text>
      </View>
      <View style={s.card}>
        {shoesWithKm.length === 0 ? (
          <Text style={st.empty}>{t('settings.shoes.empty')}</Text>
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
                      {isActive && <View style={st.activeBadge}><Text style={st.activeBadgeText}>{t('settings.shoes.active')}</Text></View>}
                      {isDead && <View style={st.deadBadge}><Text style={st.deadBadgeText}>{t('settings.shoes.worn')}</Text></View>}
                      {isWarn && !isDead && <View style={st.warnBadge}><Text style={st.warnBadgeText}>{t('settings.shoes.soonWorn')}</Text></View>}
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
                  <Text style={st.deadMsg}>{t('settings.shoes.wornMessage')}</Text>
                )}
                <View style={st.shoeActions}>
                  {!isActive && (
                    <TouchableOpacity style={st.actionBtn} onPress={() => setActive(shoe.id)}>
                      <Text style={st.actionBtnText}>{t('settings.shoes.useForNextRun')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={st.deleteBtn} onPress={() => {
                    if (Platform.OS === 'web' && window.confirm) {
                      if (window.confirm(`${t('settings.shoes.deleteConfirm')} ${shoe.name}?`)) deleteShoe(shoe.id);
                    } else {
                      deleteShoe(shoe.id);
                    }
                  }}>
                    <Text style={st.deleteBtnText}>{t('settings.shoes.delete')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        <TouchableOpacity style={st.addBtn} onPress={() => setShowAdd(!showAdd)}>
          <Text style={st.addBtnText}>{showAdd ? t('common.cancel') : t('settings.shoes.addShoe')}</Text>
        </TouchableOpacity>
        {showAdd && (
          <View style={st.addForm}>
            <TextInput
              style={st.input}
              placeholder={t('settings.shoes.namePlaceholder')}
              placeholderTextColor={colors.muted}
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={st.input}
              placeholder={t('settings.shoes.brandPlaceholder')}
              placeholderTextColor={colors.muted}
              value={newBrand}
              onChangeText={setNewBrand}
            />
            <TextInput
              style={st.input}
              placeholder={t('settings.shoes.kmPlaceholder')}
              placeholderTextColor={colors.muted}
              value={newStartKm}
              onChangeText={setNewStartKm}
              keyboardType="numeric"
            />
            <TouchableOpacity style={st.saveShoeBtn} onPress={addShoe}>
              <Text style={st.saveShoeBtnText}>{t('settings.shoes.saveShoe')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── LANGUAGE SELECTOR ──────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'da', flag: '🇩🇰', name: 'Dansk' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'it', flag: '🇮🇹', name: 'Italiano' },
  { code: 'pt', flag: '🇵🇹', name: 'Português' },
  { code: 'nl', flag: '🇳🇱', name: 'Nederlands' },
  { code: 'pl', flag: '🇵🇱', name: 'Polski' },
  { code: 'sv', flag: '🇸🇪', name: 'Svenska' },
  { code: 'fi', flag: '🇫🇮', name: 'Suomi' },
  { code: 'el', flag: '🇬🇷', name: 'Ελληνικά' },
  { code: 'cs', flag: '🇨🇿', name: 'Čeština' },
  { code: 'ro', flag: '🇷🇴', name: 'Română' },
  { code: 'hu', flag: '🇭🇺', name: 'Magyar' },
  { code: 'bg', flag: '🇧🇬', name: 'Български' },
  { code: 'hr', flag: '🇭🇷', name: 'Hrvatski' },
  { code: 'sk', flag: '🇸🇰', name: 'Slovenčina' },
  { code: 'sl', flag: '🇸🇮', name: 'Slovenščina' },
  { code: 'lt', flag: '🇱🇹', name: 'Lietuvių' },
  { code: 'lv', flag: '🇱🇻', name: 'Latviešu' },
  { code: 'et', flag: '🇪🇪', name: 'Eesti' },
  { code: 'ga', flag: '🇮🇪', name: 'Gaeilge' },
  { code: 'mt', flag: '🇲🇹', name: 'Malti' },
];

function LanguageSelector() {
  const [currentLang, setCurrentLang] = useState(i18n.language);

  const changeLanguage = async (code) => {
    await i18n.changeLanguage(code);
    await AsyncStorage.setItem('userLanguage', code);
    setCurrentLang(code);
  };

  return (
    <View>
      <Text style={s.sectionTitle}>LANGUAGE</Text>
      <View style={s.card}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {LANGUAGES.map(lang => {
              const isActive = currentLang === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    s.langBtn,
                    isActive && { borderColor: colors.accent, backgroundColor: colors.accent + '15' }
                  ]}
                  onPress={() => changeLanguage(lang.code)}>
                  <Text style={{ fontSize: 24 }}>{lang.flag}</Text>
                  <Text style={[s.langBtnText, isActive && { color: colors.accent }]}>{lang.code.toUpperCase()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

export default function Settings({ profile, level, onProfileChange, onLevelChange, onLogout, onBack }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(profile || {});
  const [saved, setSaved] = useState(false);
  const [runs, setRuns] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  
  useEffect(() => {
    const fetchSub = async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch(`${SERVER}/subscription`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setSubscription(data);
      } catch (e) { console.log(e); }
    };
    fetchSub();
  }, []);

  useEffect(() => { loadRuns().then(r => setRuns(r || [])); }, []);
  
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifTime, setNotifTime] = useState(profile?.notifTime || '07:00');
  const [notifDays, setNotifDays] = useState(profile?.notifDays || ['Man', 'Ons', 'Fre']);
  const days = t('settings.days', { returnObjects: true }) || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    setForm(profile || {});
    if (profile?.notifTime) setNotifTime(profile.notifTime);
    if (profile?.notifDays) setNotifDays(profile.notifDays);
  }, [profile]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
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
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      setNotifEnabled(false);
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setNotifEnabled(true);
      scheduleNotifications();
      new Notification('RunWithAI', { body: t('settings.notifications.enabled'), icon: '/favicon.ico' });
    }
  };

  const scheduleNotifications = () => {
    const now = new Date();
    const [h, m] = notifTime.split(':').map(Number);
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    if (target < now) target.setDate(target.getDate() + 1);
    const msUntil = target - now;
    setTimeout(() => {
      const todayDay = days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
      if (notifDays.includes(todayDay)) {
        new Notification('RunWithAI', { body: t('settings.notifications.reminder'), icon: '/favicon.ico' });
      }
    }, msUntil);
  };

  const toggleDay = (day) => {
    setNotifDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  // ─── SLET KONTO (APPLE KRAV) ────────────────────────────────────────────────
  const handleDeleteAccount = () => {
    const confirmDelete = async () => {
      setDeletingAccount(true);
      try {
        const token = getAuthToken();
        const res = await fetch(`${SERVER}/delete-account`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (res.ok) {
          await AsyncStorage.multiRemove(['token', 'onboardingCompleted', 'userLevel']);
          Alert.alert(
            t('settings.deleteAccount.deletedTitle'),
            t('settings.deleteAccount.deletedMessage'),
            [{ text: t('common.ok'), onPress: onLogout }]
          );
        } else {
          const data = await res.json();
          Alert.alert(t('common.error'), data.error || t('settings.deleteAccount.error'));
        }
      } catch (err) {
        console.error('Delete account error:', err);
        Alert.alert(t('common.error'), t('auth.errors.serverConnection'));
      } finally {
        setDeletingAccount(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('settings.deleteAccount.confirmMessage'))) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        t('settings.deleteAccount.title'),
        t('settings.deleteAccount.confirmMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('settings.deleteAccount.confirmButton'), style: 'destructive', onPress: confirmDelete }
        ]
      );
    }
  };

  const a = assessProfile(form);
  
  const lv = { 
    beginner: { label: t('settings.levels.beginner'), iconName: 'run' }, 
    intermediate: { label: t('settings.levels.intermediate'), iconName: 'activity' }, 
    advanced: { label: t('settings.levels.advanced'), iconName: 'zap' } 
  };
  
  const goals = [
    { id: 'fitness', label: t('settings.goals.fitness') },
    { id: '5k',      label: '5 km' },
    { id: '10k',     label: '10 km' },
    { id: 'half',    label: t('settings.goals.half') },
    { id: 'full',    label: t('settings.goals.full') },
    { id: 'weight',  label: t('settings.goals.weight') },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={{ marginRight: 12, padding: 4 }}>
              <Text style={{ fontSize: 22, color: colors.text }}>←</Text>
            </TouchableOpacity>
          )}
          <Text style={s.pageTitle}>{t('settings.pageTitle')}</Text>
        </View>

        {/* ── SPROG / LANGUAGE ── */}
        <LanguageSelector />

        {/* ── NIVEAU ── */}
        <Text style={s.sectionTitle}>{t('settings.sections.level')}</Text>
        <View style={s.levelRow}>
          {Object.entries(lv).map(([id, info]) => (
            <TouchableOpacity
              key={id}
              style={[s.levelBtn, level === id && { borderColor: colors.accent, backgroundColor: colors.accent + '15' }]}
              onPress={() => onLevelChange(id)}>
              <View style={s.levelIconWrap}>
                <Icon name={info.iconName} size={24} color={level === id ? colors.accent : colors.muted} />
              </View>
              <Text style={[s.levelLabel, level === id && { color: colors.accent }]}>{info.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── PERSONLIG INFO ── */}
        <Text style={s.sectionTitle}>{t('settings.sections.personalInfo')}</Text>
        <View style={s.card}>
          <Field label={t('settings.fields.name')} {...field('name')} placeholder="Thomas" />
          <Field label={t('settings.fields.age')} {...field('age')} keyboard="numeric" placeholder="32" />
          <SexPicker value={form.sex || 'Mand'} onChange={v => setForm(f => ({ ...f, sex: v }))} t={t} />
          <Field label={t('settings.fields.weight')} {...field('weight')} keyboard="numeric" placeholder="75" />
          <Field label={t('settings.fields.height')} {...field('height')} keyboard="numeric" placeholder="180" />
        </View>

        {/* ── LØB & MÅL ── */}
        <Text style={s.sectionTitle}>{t('settings.sections.runningGoals')}</Text>
        <View style={s.card}>
          <Field label={t('settings.fields.yearsRunning')} {...field('yearsRunning')} keyboard="numeric" placeholder="3" />
          <Text style={[s.label, { marginBottom: 8 }]}>{t('settings.fields.primaryGoal')}</Text>
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
            <Field label={t('settings.fields.raceDate')} {...field('raceDate')} placeholder="15. sep 2025" />
          )}
        </View>

        {/* ── PULS ── */}
        <Text style={s.sectionTitle}>{t('settings.sections.heartRateZones')}</Text>
        <View style={s.card}>
          <Field label={t('settings.fields.restingHr')} {...field('restingHr')} keyboard="numeric" placeholder="58" />
          <Field label={t('settings.fields.maxHr')} {...field('maxHr')} keyboard="numeric" placeholder="185" />
          <Field label={t('settings.fields.vo2max')} {...field('vo2max')} keyboard="numeric" placeholder="52" />
          {a && (
            <View style={s.zonesWrap}>
              <Text style={s.zonesTitle}>{t('settings.zones.calculated')}</Text>
              {[
                { label: t('settings.zones.z1'), z: a.zones.z1, color: '#64b5f6' },
                { label: t('settings.zones.z2'), z: a.zones.z2, color: '#81c784' },
                { label: t('settings.zones.z3'), z: a.zones.z3, color: '#ffb74d' },
                { label: t('settings.zones.z4'), z: a.zones.z4, color: '#ff8a65' },
                { label: t('settings.zones.z5'), z: a.zones.z5, color: '#ef5350' },
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
        <Text style={s.sectionTitle}>{t('settings.sections.injuries')}</Text>
        <View style={s.card}>
          <Field label={t('settings.fields.injuries')} {...field('injuries')} placeholder={t('settings.fields.injuriesPlaceholder')} />
        </View>

        {/* ── NOTIFIKATIONER ── */}
        <Text style={s.sectionTitle}>{t('settings.sections.reminders')}</Text>
        <View style={s.card}>
          <View style={s.notifRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.notifTitle}>{t('settings.notifications.push')}</Text>
              <Text style={s.notifSub}>{t('settings.notifications.pushSub')}</Text>
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
              <Field label={t('settings.notifications.time')} value={notifTime} onChange={setNotifTime} placeholder="07:00" />
              <Text style={[s.label, { marginBottom: 8, marginTop: 4 }]}>{t('settings.notifications.days')}</Text>
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
        <ShoesSection profile={form} onProfileChange={(updated) => { setForm(updated); onProfileChange(updated); }} runs={runs} t={t} />

        {/* ── ENHEDER & VISNING ── */}
        <Text style={s.sectionTitle}>{t('settings.sections.units')}</Text>
        <View style={s.card}>
          <Text style={[s.label, { marginBottom: 8 }]}>{t('settings.units.distance')}</Text>
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
          <Text style={[s.label, { marginBottom: 8 }]}>{t('settings.units.pace')}</Text>
          <View style={s.sexRow}>
            {[{ id: 'pace', label: 'min/km' }, { id: 'speed', label: 'km/h' }].map(opt => (
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
        <Text style={s.sectionTitle}>{t('settings.sections.weeklyGoals')}</Text>
        <View style={s.card}>
          <Field label={t('settings.fields.weeklyKm')} {...field('weeklyKm')} keyboard="numeric" placeholder="25" />
          <Field label={t('settings.fields.weeklyKmGoal')} value={form.weeklyKmGoal || ''} onChange={v => setForm(f => ({ ...f, weeklyKmGoal: v }))} keyboard="numeric" placeholder="30" />
          <Field label={t('settings.fields.weeklyRunsGoal')} value={form.weeklyRunsGoal || ''} onChange={v => setForm(f => ({ ...f, weeklyRunsGoal: v }))} keyboard="numeric" placeholder="3" />
          <Text style={[s.label, { marginBottom: 8 }]}>{t('settings.fields.preferredDays')}</Text>
          <View style={s.daysRow}>
            {days.map(day => {
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
        <Text style={s.sectionTitle}>{t('settings.sections.trainingTypes')}</Text>
        <View style={s.card}>
          <Text style={[s.label, { marginBottom: 10 }]}>{t('settings.fields.preferredTypes')}</Text>
          <View style={s.goalGrid}>
            {[
              { id: 'easy',     label: t('settings.runTypes.easy') },
              { id: 'interval', label: t('settings.runTypes.interval') },
              { id: 'tempo',    label: t('settings.runTypes.tempo') },
              { id: 'long',     label: t('settings.runTypes.long') },
              { id: 'trail',    label: t('settings.runTypes.trail') },
              { id: 'race',     label: t('settings.runTypes.race') },
            ].map(typ => {
              const active = (form.preferredTypes || []).includes(typ.id);
              return (
                <TouchableOpacity
                  key={typ.id}
                  style={[s.goalBtn, active && { borderColor: colors.accent, backgroundColor: colors.accent + '15' }]}
                  onPress={() => setForm(f => {
                    const types = f.preferredTypes || [];
                    return { ...f, preferredTypes: active ? types.filter(x => x !== typ.id) : [...types, typ.id] };
                  })}>
                  <Text style={[s.goalBtnText, active && { color: colors.accent }]}>{typ.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── PRIVATLIV ── */}
        <Text style={s.sectionTitle}>{t('settings.sections.privacy')}</Text>
        <View style={s.card}>
          {[
            { key: 'shareActivity', label: t('settings.privacy.shareActivity'), sub: t('settings.privacy.shareActivitySub') },
            { key: 'shareProfile',  label: t('settings.privacy.shareProfile'),  sub: t('settings.privacy.shareProfileSub') },
            { key: 'shareLocation', label: t('settings.privacy.shareLocation'), sub: t('settings.privacy.shareLocationSub') },
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
        <Text style={s.sectionTitle}>{t('settings.sections.data')}</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.exportBtn} onPress={() => {
            if (Platform.OS !== 'web') return;
            const token = getAuthToken();
            fetch(`${SERVER}/runs`, { headers: { Authorization: `Bearer ${token}` } })
              .then(r => r.json())
              .then(data => {
                const csv = ['Dato,Km,Pace,Tid,Puls']
                  .concat((data.runs || data || []).map(r => {
                    const pace = r.pace_secs_per_km ? `${Math.floor(r.pace_secs_per_km/60)}:${String(Math.round(r.pace_secs_per_km%60)).padStart(2,'0')}` : '';
                    const tid = r.duration_secs ? `${Math.floor(r.duration_secs/60)}min` : '';
                    return `${r.date || ''},${r.km || ''},${pace},${tid},${r.avg_hr || ''}`;
                  })).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'runwithai-runs.csv'; a.click();
              });
          }}>
            <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
              <Icon name='download' size={14} color={colors.accent}/>
              <Text style={s.exportBtnText}>{t('settings.data.export')}</Text>
            </View>
          </TouchableOpacity>
          <Text style={s.exportSub}>{t('settings.data.exportSub')}</Text>
        </View>

        {/* ── GEM ── */}
        <TouchableOpacity style={s.saveBtn} onPress={save}>
          <Text style={s.saveBtnText}>{saved ? t('settings.saved') : t('settings.saveChanges')}</Text>
        </TouchableOpacity>

        {/* ── LOG UD ── */}
        <TouchableOpacity style={s.logoutBtn} onPress={onLogout}>
          <Text style={s.logoutText}>{t('settings.logout')}</Text>
        </TouchableOpacity>

        {/* ── PRIVATLIVSPOLITIK ── */}
        <TouchableOpacity 
          style={s.privacyBtn}
          onPress={() => Linking.openURL('https://www.runwithai.app/privacy')}
        >
          <Text style={s.privacyText}>📜 {t('settings.privacyPolicy')}</Text>
        </TouchableOpacity>

        {/* ── SLET KONTO (APPLE KRAV) ── */}
        <View style={s.dangerZone}>
          <Text style={s.dangerZoneLabel}>{t('settings.dangerZone')}</Text>
          <TouchableOpacity 
            style={s.deleteAccountBtn} 
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
          >
            {deletingAccount ? (
              <ActivityIndicator size="small" color="#ff3b30" />
            ) : (
              <Text style={s.deleteAccountBtnText}>🗑️ {t('settings.deleteAccount.button')}</Text>
            )}
          </TouchableOpacity>
          <Text style={s.deleteAccountWarning}>{t('settings.deleteAccount.warning')}</Text>
        </View>

        {/* ── APP VERSION ── */}
        <View style={s.versionContainer}>
          <Text style={s.versionText}>RunWithAI v1.6.2</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.bg },
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
  levelBtn:     { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.card },
  levelIconWrap:{ marginBottom: 6 },
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
  logoutText:   { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  exportBtn:    { backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border2, marginBottom: 8 },
  exportBtnText:{ color: colors.accent, fontSize: 14, fontWeight: '700' },
  exportSub:    { color: colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 16 },
  privacyBtn:   { alignItems: 'center', marginTop: 12, padding: 8 },
  privacyText:  { color: colors.muted, fontSize: 14 },
  dangerZone:   { marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
  dangerZoneLabel: { fontSize: 11, color: colors.muted, letterSpacing: 2, fontWeight: '700', marginBottom: 16 },
  deleteAccountBtn: { backgroundColor: 'rgba(255, 59, 48, 0.1)', borderWidth: 1, borderColor: '#ff3b30', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center' },
  deleteAccountBtnText: { color: '#ff3b30', fontWeight: 'bold', fontSize: 15 },
  deleteAccountWarning: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 8 },
  versionContainer: { marginTop: 32, alignItems: 'center', paddingBottom: 16 },
  versionText: { color: colors.muted, fontSize: 11 },
  langBtn:      { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border2, backgroundColor: colors.surface },
  langBtnText:  { color: colors.dim, fontSize: 10, fontWeight: '600', marginTop: 4 },
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
  deadBadge:      { backgroundColor: '#ef444420', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#ef4444' },
  deadBadgeText:  { fontSize: 9, color: '#ef4444', fontWeight: '700', letterSpacing: 1 },
  barTrack:       { height: 8, backgroundColor: colors.border2, borderRadius: 4, overflow: 'hidden', position: 'relative', marginBottom: 4 },
  barFill:        { height: '100%', borderRadius: 4 },
  barWarnLine:    { position: 'absolute', left: '87.5%', top: 0, width: 2, height: '100%', backgroundColor: '#f59e0b60' },
  barLabels:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  barLabel:       { fontSize: 9, color: colors.muted },
  deadMsg:        { fontSize: 12, color: '#ef4444', marginBottom: 8, lineHeight: 18 },
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