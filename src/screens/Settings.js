import React, { useState, useEffect } from 'react';
import { Icon } from '../components/Icons';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch, Platform, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, assessProfile, saveProfile, SERVER, getAuthToken, loadRuns } from '../data';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import * as Notif from '../utils/notifications';
let DTP = null; try { DTP = require('@react-native-community/datetimepicker').default; } catch(e) {}

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

// âââ SKO TRACKER ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

// âââ LANGUAGE SELECTOR ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function LanguageSelector() {
  const { t } = useTranslation();
  const currentLang = i18n.language;
  const langNames = { da: 'Dansk', en: 'English', de: 'Deutsch', fr: 'FranÃ§ais', es: 'EspaÃ±ol', it: 'Italiano', pt: 'PortuguÃªs', nl: 'Nederlands', pl: 'Polski', sv: 'Svenska', fi: 'Suomi', el: 'ÎÎ»Î»Î·Î½Î¹ÎºÎ¬', cs: 'ÄeÅ¡tina', ro: 'RomÃ¢nÄ', hu: 'Magyar', bg: 'ÐÑÐ»Ð³Ð°ÑÑÐºÐ¸', hr: 'Hrvatski', sk: 'SlovenÄina', sl: 'SlovenÅ¡Äina', lt: 'LietuviÅ³', lv: 'LatvieÅ¡u', et: 'Eesti', ga: 'Gaeilge', mt: 'Malti' };

  return (
    <View>
      <Text style={s.sectionTitle}>{t('settings.sections.language') || 'LANGUAGE'}</Text>
      <View style={s.card}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 8 }}>
          {langNames[currentLang] || currentLang.toUpperCase()}
        </Text>
        <TouchableOpacity
          style={s.exportBtn}
          onPress={() => Linking.openSettings()}>
          <Text style={s.exportBtnText}>
            {t('settings.changeLanguageInSettings') || 'Change language in Settings'}
          </Text>
        </TouchableOpacity>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6, textAlign: 'center', lineHeight: 16 }}>
          {t('settings.languageHint') || 'Settings \u2192 RunWithAI \u2192 Language'}
        </Text>
      </View>
    </View>
  );
}



export default function Settings({ profile, level, onProfileChange, onLevelChange, onLogout, onBack, onNavigate, subscription: subscriptionProp, onShowPricing }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(profile || {});
  const [saved, setSaved] = useState(false);
  const [runs, setRuns] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  // âââ ERNÃRINGSPLAN STATE ââââââââââââââââââââââââââââââââââââââââââââââââ
  // Email change state
  const [userEmail, setUserEmail] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  
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

  // Hent brugerens email
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch(`${SERVER}/users/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data && data.email) setUserEmail(data.email);
      } catch (e) { console.log('fetchUser error:', e); }
    };
    fetchUser();
  }, []);

  useEffect(() => { loadRuns().then(r => setRuns(r || [])); }, []);

  // Hent eksisterende mÃ¥l sÃ¥ UI'et viser nuvÃ¦rende valg
  
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifTime, setNotifTime] = useState(profile?.notifTime || '07:00');
  const [notifDays, setNotifDays] = useState(profile?.notifDays || ['Man', 'Ons', 'Fre']);
  const [mealNotifEnabled, setMealNotifEnabled] = useState(false);
  const [mealNotifTime, setMealNotifTime] = useState(profile?.mealNotifTime || '18:00');
  const [mealNotifDays, setMealNotifDays] = useState(profile?.mealNotifDays || [0,1,2,3,4,5,6]);
  const [showPickerFor, setShowPickerFor] = useState(null);
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

const save = async () => {
    const fullForm = { ...form, notifTime, notifDays };
    onProfileChange(fullForm);
    try {
      const token = await getAuthToken();
      if (token && fullForm.weight && fullForm.height && fullForm.age) {
        const sexMap = { 'Mand': 'male', 'Kvinde': 'female' };
        const goalMap = { weight: 'lose_fat', fitness: 'maintain', '5k': 'maintain', '10k': 'maintain', half: 'maintain', full: 'maintain' };
        const body = {
          weight_kg: parseFloat(fullForm.weight),
          height_cm: parseFloat(fullForm.height),
          age: parseInt(fullForm.age),
          gender: sexMap[fullForm.sex] || 'male',
          activity_level: 'moderate',
          primary_goal: goalMap[fullForm.goal] || 'maintain',
          goal_pace: 'normal',
          plan_type: 'balanced'
        };
        const url = SERVER + '/goals/auto';
        const auth = 'Bearer ' + token;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': auth },
          body: JSON.stringify(body)
        });
        if (res.ok) {
          const data = await res.json();
          console.log('[Settings] Auto-calc OK:', data.target_kcal, 'kcal');
        } else {
          console.warn('[Settings] Auto-calc failed:', res.status);
        }
      }
    } catch (err) {
      console.warn('[Settings] Auto-calc error:', err);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleNotifications = async () => {
    try {
      if (!notifEnabled) {
        const r = await Notif.requestPermission();
        if (!r.granted) { setNotifEnabled(false); return; }
        setNotifEnabled(true);
        await syncAllNotifications(true, notifTime, notifDays, mealNotifEnabled, mealNotifTime, mealNotifDays);
      } else {
        setNotifEnabled(false);
        await syncAllNotifications(false, notifTime, notifDays, mealNotifEnabled, mealNotifTime, mealNotifDays);
      }
    } catch (e) { console.warn('toggleNotifications:', e); }
  };

  const toggleMealNotifications = async () => {
    try {
      if (!mealNotifEnabled) {
        const r = await Notif.requestPermission();
        if (!r.granted) { setMealNotifEnabled(false); return; }
        setMealNotifEnabled(true);
        await syncAllNotifications(notifEnabled, notifTime, notifDays, true, mealNotifTime, mealNotifDays);
      } else {
        setMealNotifEnabled(false);
        await syncAllNotifications(notifEnabled, notifTime, notifDays, false, mealNotifTime, mealNotifDays);
      }
    } catch (e) { console.warn('toggleMealNotifications:', e); }
  };

  const syncAllNotifications = async (wEn, wTime, wDays, mEn, mTime, mDays) => {
    try {
      await Notif.syncFromSettings({
        workoutEnabled: !!wEn,
        workoutTime: wTime || '07:00',
        workoutDays: Array.isArray(wDays) ? wDays : [1,3,5],
        mealEnabled: !!mEn,
        mealTime: mTime || '18:00',
        mealDays: Array.isArray(mDays) ? mDays : [0,1,2,3,4,5,6],
      });
    } catch (e) { console.warn('syncAllNotifications:', e); }
  };

  const toggleDay = (which, dayIdx) => {
    if (which === 'workout') {
      const next = notifDays.includes(dayIdx) ? notifDays.filter(d=>d!==dayIdx) : [...notifDays, dayIdx];
      setNotifDays(next);
      if (notifEnabled) syncAllNotifications(true, notifTime, next, mealNotifEnabled, mealNotifTime, mealNotifDays);
    } else {
      const next = mealNotifDays.includes(dayIdx) ? mealNotifDays.filter(d=>d!==dayIdx) : [...mealNotifDays, dayIdx];
      setMealNotifDays(next);
      if (mealNotifEnabled) syncAllNotifications(notifEnabled, notifTime, notifDays, true, mealNotifTime, next);
    }
  };

  const onTimePicked = (which, event, selected) => {
    setShowPickerFor(null);
    if (!selected) return;
    const hh = String(selected.getHours()).padStart(2,'0');
    const mm = String(selected.getMinutes()).padStart(2,'0');
    const timeStr = hh + ':' + mm;
    if (which === 'workout') {
      setNotifTime(timeStr);
      if (notifEnabled) syncAllNotifications(true, timeStr, notifDays, mealNotifEnabled, mealNotifTime, mealNotifDays);
    } else {
      setMealNotifTime(timeStr);
      if (mealNotifEnabled) syncAllNotifications(notifEnabled, notifTime, notifDays, true, timeStr, mealNotifDays);
    }
  };


  // âââ BEREGN KALORIEMÃL ââââââââââââââââââââââââââââââââââââââââââââââââââ

  // âââ SLET KONTO (APPLE KRAV) ââââââââââââââââââââââââââââââââââââââââââââââââ

  // Skift email handler
  const handleChangeEmail = async () => {
    if (!newEmail || !currentPassword) {
      Alert.alert('Fejl', 'Udfyld baade ny email og adgangskode');
      return;
    }
    setChangingEmail(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${SERVER}/users/me/email`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newEmail: newEmail.trim(), password: currentPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Fejl', data.error || 'Kunne ikke skifte email');
        return;
      }
      setUserEmail(data.email);
      setShowEmailModal(false);
      setNewEmail('');
      setCurrentPassword('');
      Alert.alert('Succes', 'Din email er nu opdateret');
    } catch (e) {
      Alert.alert('Fejl', 'Netvaerksfejl');
    } finally {
      setChangingEmail(false);
    }
  };

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
              <Text style={{ fontSize: 22, color: colors.text }}>â</Text>
            </TouchableOpacity>
          )}
          <Text style={s.pageTitle}>{t('settings.pageTitle')}</Text>
        </View>

        {/* ââ SPROG / LANGUAGE ââ */}
        <LanguageSelector />

        {/* ââ NIVEAU ââ */}
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

        {/* NOTIFIKATIONER */}
        <Text style={s.sectionTitle}>{t('settings.sections.reminders') || 'Paamindelser'}</Text>
        <View style={s.card}>
          {/* Traeningspaamindelse */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Traeningspaamindelse</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>Faa besked paa valgte dage og tidspunkt</Text>
            </View>
            <Switch value={notifEnabled} onValueChange={toggleNotifications} trackColor={{ false: colors.border2, true: colors.primary }} />
          </View>
          {notifEnabled && (
            <View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginBottom: 8 }}>
                {['Soen','Man','Tir','Ons','Tor','Fre','Loer'].map((lbl, idx) => (
                  <TouchableOpacity key={'wd'+idx} onPress={() => toggleDay('workout', idx)} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, marginRight: 6, marginBottom: 6, backgroundColor: notifDays.includes(idx) ? colors.primary : colors.card2 || colors.border2 }}>
                    <Text style={{ color: notifDays.includes(idx) ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>{lbl}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => setShowPickerFor('workout')} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.card2 || colors.border2, alignSelf: 'flex-start' }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{'Tidspunkt: ' + notifTime}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 1, backgroundColor: colors.border2, marginVertical: 14 }} />

          {/* Maaltidspaamindelse */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Maaltidspaamindelse</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>Husk at logge dine maaltider</Text>
            </View>
            <Switch value={mealNotifEnabled} onValueChange={toggleMealNotifications} trackColor={{ false: colors.border2, true: colors.primary }} />
          </View>
          {mealNotifEnabled && (
            <View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginBottom: 8 }}>
                {['Soen','Man','Tir','Ons','Tor','Fre','Loer'].map((lbl, idx) => (
                  <TouchableOpacity key={'md'+idx} onPress={() => toggleDay('meal', idx)} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, marginRight: 6, marginBottom: 6, backgroundColor: mealNotifDays.includes(idx) ? colors.primary : colors.card2 || colors.border2 }}>
                    <Text style={{ color: mealNotifDays.includes(idx) ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>{lbl}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => setShowPickerFor('meal')} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.card2 || colors.border2, alignSelf: 'flex-start' }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{'Tidspunkt: ' + mealNotifTime}</Text>
              </TouchableOpacity>
            </View>
          )}

          {showPickerFor && DTP && (
            <DTP
              value={(() => { const tStr = showPickerFor === 'workout' ? notifTime : mealNotifTime; const [h,m] = String(tStr||'07:00').split(':').map(Number); const d = new Date(); d.setHours(h||7, m||0, 0, 0); return d; })()}
              mode='time'
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(ev, sel) => onTimePicked(showPickerFor, ev, sel)}
            />
          )}
        </View>

        {/* ââ SKO TRACKER ââ */}
        <ShoesSection profile={form} onProfileChange={(updated) => { setForm(updated); onProfileChange(updated); }} runs={runs} t={t} />

        {/* ââ ENHEDER & VISNING ââ */}
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

{/* ââ KOSTPRÃFERENCER ââ */}
        <Text style={s.sectionTitle}>ð¥ KOSTPRÃFERENCER</Text>
        <View style={s.card}>
          {/* Kosttype */}
          <Text style={[s.label, { marginBottom: 8 }]}>KOSTTYPE</Text>
          <View style={s.goalGrid}>
            {[
              { id: 'none',         label: 'Ingen' },
              { id: 'vegetarian',   label: 'ð¥¬ Vegetar' },
              { id: 'vegan',        label: 'ð± Vegansk' },
              { id: 'pescatarian',  label: 'ð Pescetar' },
              { id: 'gluten_free',  label: 'ð¾ Glutenfri' },
              { id: 'lactose_free', label: 'ð¥ Laktosefri' },
              { id: 'keto',         label: 'ð¥ Keto' },
              { id: 'paleo',        label: 'ð Paleo' },
            ].map(d => (
              <TouchableOpacity
                key={d.id}
                style={[s.goalBtn, (form.dietType || 'none') === d.id && { borderColor: colors.accent, backgroundColor: colors.accent + '15' }]}
                onPress={() => setForm(f => ({ ...f, dietType: d.id }))}>
                <Text style={[s.goalBtnText, (form.dietType || 'none') === d.id && { color: colors.accent }]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Allergier */}
          <View style={{ marginTop: 8 }}>
            <Field
              label="ALLERGIER (komma-separeret)"
              value={form.allergies || ''}
              onChange={v => setForm(f => ({ ...f, allergies: v }))}
              placeholder="nÃ¸dder, skaldyr, Ã¦g"
            />
          </View>

          {/* Fravalg */}
          <Field
            label="FÃDEVARER JEG IKKE KAN LIDE"
            value={form.dislikes || ''}
            onChange={v => setForm(f => ({ ...f, dislikes: v }))}
            placeholder="broccoli, svampe, koriander"
          />
        </View>

{/* ââ PRIVATLIV ââ */}
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

        {/* ââ EKSPORT ââ */}
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
                const blÃ¸b = new Blob([csv], { type: 'text/csv' });
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

        {/* ââ GEM ââ */}
        <TouchableOpacity style={s.saveBtn} onPress={save}>
          <Text style={s.saveBtnText}>{saved ? t('settings.saved') : t('settings.saveChanges')}</Text>
        </TouchableOpacity>

        {/* === ABONNEMENT === */}
        <Text style={s.sectionTitle}>Abonnement</Text>
        <View style={s.subCard}>
          <View style={s.subRow}>
            <Text style={s.subLabel}>Type</Text>
            <Text style={s.subValue}>{(subscriptionProp && subscriptionProp.tier) ? (subscriptionProp.tier === 'pro' ? 'Pro' : subscriptionProp.tier === 'basic' ? 'Basic' : 'Free') : 'Free'}</Text>
          </View>
          <View style={s.subRow}>
            <Text style={s.subLabel}>Status</Text>
            <Text style={s.subValue}>{(subscriptionProp && subscriptionProp.status) || 'Inaktiv'}</Text>
          </View>
          {(!subscriptionProp || !subscriptionProp.tier || subscriptionProp.tier === 'free') ? (
            <TouchableOpacity style={s.upgradeBtn} onPress={onShowPricing}>
              <Text style={s.upgradeBtnText}>Opgrader</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}>
              <Text style={s.linkText}>Administrer i App Store</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* === EMAIL === */}
        <Text style={s.sectionTitle}>Email</Text>
        <View style={s.subCard}>
          <Text style={s.emailValue}>{userEmail || '-'}</Text>
          <TouchableOpacity onPress={() => setShowEmailModal(true)}>
            <Text style={s.linkText}>Skift email</Text>
          </TouchableOpacity>
        </View>

        {/* === EMAIL CHANGE MODAL === */}
        <Modal visible={showEmailModal} animationType='slide' transparent>
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Skift email</Text>
              <TextInput
                style={s.modalInput}
                placeholder='Ny email'
                placeholderTextColor={colors.muted}
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType='email-address'
                autoCapitalize='none'
              />
              <TextInput
                style={s.modalInput}
                placeholder='Nuvaerende adgangskode'
                placeholderTextColor={colors.muted}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
              />
              <View style={s.modalBtnRow}>
                <TouchableOpacity style={s.modalCancelBtn} onPress={() => { setShowEmailModal(false); setNewEmail(''); setCurrentPassword(''); }} disabled={changingEmail}>
                  <Text style={s.modalCancelText}>Annuller</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.modalConfirmBtn} onPress={handleChangeEmail} disabled={changingEmail}>
                  {changingEmail ? <ActivityIndicator color='#fff' /> : <Text style={s.modalConfirmText}>Gem</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>


        {/* ââ LOG UD ââ */}
        <TouchableOpacity style={s.logoutBtn} onPress={onLogout}>
          <Text style={s.logoutText}>{t('settings.logout')}</Text>
        </TouchableOpacity>

        {/* ââ PRIVATLIVSPOLITIK ââ */}
        <TouchableOpacity 
          style={s.privacyBtn}
          onPress={() => Linking.openURL('https://www.runwithai.app/privacy')}
        >
          <Text style={s.privacyText}>ð {t('settings.privacyPolicy')}</Text>
        </TouchableOpacity>

        {/* ââ SLET KONTO (APPLE KRAV) ââ */}
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
              <Text style={s.deleteAccountBtnText}>ðï¸ {t('settings.deleteAccount.button')}</Text>
            )}
          </TouchableOpacity>
          <Text style={s.deleteAccountWarning}>{t('settings.deleteAccount.warning')}</Text>
        </View>

        {/* ââ APP VERSION ââ */}
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
  // Subscription / Email styles
  subCard:        { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  subRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subLabel:       { color: colors.muted, fontSize: 13 },
  subValue:       { color: colors.text, fontSize: 14, fontWeight: '700' },
  emailValue:     { color: colors.text, fontSize: 15, marginBottom: 12 },
  upgradeBtn:     { backgroundColor: colors.accent, borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
  upgradeBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  linkText:       { color: colors.accent, fontSize: 14, fontWeight: '600', marginTop: 8 },
  // Modal styles
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard:      { backgroundColor: colors.card, borderRadius: 16, padding: 20 },
  modalTitle:     { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  modalInput:     { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text, fontSize: 15, marginBottom: 12 },
  modalBtnRow:    { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalCancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  modalCancelText:{ color: colors.muted, fontWeight: '600' },
  modalConfirmBtn:{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center' },
  modalConfirmText:{ color: '#fff', fontWeight: '800' },
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
