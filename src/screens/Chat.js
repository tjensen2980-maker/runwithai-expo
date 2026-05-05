import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../components/Icons';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Keyboard, Dimensions, Alert
} from 'react-native';
import { colors, LEVELS, sendToAI, loadMessages, clearMessages, logMealPlan } from '../data';
import { useTranslation } from 'react-i18next';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function Message({ msg, t, onLogMealPlan }) {
  const isAI = msg.role === 'ai' || msg.role === 'assistant';
  const cleanText = (msg.text || '')
    .replace(/<plan_update>[\s\S]*?<\/plan_update>/g, '')
    .replace(/<meal_plan>[\s\S]*?<\/meal_plan>/g, '')
    .trim();

  return (
    <View style={[s.msgWrap, isAI ? s.msgAI : s.msgUser]}>
      {isAI && <Text style={s.msgSender}>RUNWITHAI</Text>}
      {cleanText ? (
        <View style={[s.bubble, isAI ? s.bubbleAI : s.bubbleUser]}>
          <Text style={[s.bubbleText, isAI ? s.bubbleTextAI : s.bubbleTextUser]}>{cleanText}</Text>
        </View>
      ) : null}

      {msg.hasPlanUpdate && (
        <View style={s.planUpdateBadge}>
          <Text style={s.planUpdateBadgeText}>{'OK ' + t('chat.planUpdated')}</Text>
        </View>
      )}

      {msg.mealPlan && (
        <View style={s.mealPlanCard}>
          <Text style={s.mealPlanTitle}>Madplan</Text>
          <Text style={s.mealPlanSubtitle}>
            {msg.mealPlan.totalKcal ? msg.mealPlan.totalKcal + ' kcal i alt' : ''}
          </Text>
          {(msg.mealPlan.meals || []).map((m, i) => (
            <View key={i} style={s.mealItem}>
              <Text style={s.mealName}>{m.name}</Text>
              <Text style={s.mealMacros}>
                {m.kcal} kcal  -  P{m.protein_g}g  K{m.carbs_g}g  F{m.fat_g}g
              </Text>
              {m.description ? <Text style={s.mealDesc}>{m.description}</Text> : null}
            </View>
          ))}
          {!msg.mealPlanLogged ? (
            <TouchableOpacity
              style={s.logAllBtn}
              onPress={() => onLogMealPlan(msg)}>
              <Text style={s.logAllBtnText}>Log alle maaltider</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.loggedBadge}>
              <Text style={s.loggedBadgeText}>Logget</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function Chat({ level, profile, weekPlan, nextWorkout, onPlanUpdate, runs }) {
  const { t } = useTranslation();
  const lv = LEVELS[level] || LEVELS['intermediate'];
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef(null);

  // Lyt til keyboard events
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Hent samtalehistorik fra database ved opstart
  useEffect(() => {
    async function fetchHistory() {
      const history = await loadMessages();
      if (history && history.length > 0) {
        const converted = history.map(m => ({
          role: m.role === 'assistant' ? 'ai' : m.role,
          text: m.text,
        }));
        setMessages(converted);
      } else {
        const name = (profile?.name || t('chat.defaultRunner')).split(' ')[0];
        setMessages([{ role: 'ai', text: t('chat.greeting', { name }) }]);
      }
      setLoadingHistory(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
    fetchHistory();
  }, [t]);

  const send = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', text: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const { text: aiText, planUpdate, mealPlan } = await sendToAI({
        messages: newMessages,
        profile, level, weekPlan, nextWorkout, runs,
      });
      const aiMsg = {
        role: 'ai',
        text: aiText,
        hasPlanUpdate: !!planUpdate,
        mealPlan: mealPlan || null,
        mealPlanLogged: false,
      };
      setMessages(prev => [...prev, aiMsg]);
      if (planUpdate) onPlanUpdate(planUpdate);
    } catch (err) {
      console.log('[Chat.js] sendToAI ERROR:', err?.message, err?.stack, err);
      setMessages(prev => [...prev, { role: 'ai', text: t('chat.connectionError') }]);
    }
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleClear = async () => {
    await clearMessages();
    const name = (profile?.name || t('chat.defaultRunner')).split(' ')[0];
    setMessages([{ role: 'ai', text: t('chat.clearedGreeting', { name }) }]);
  };

  const handleLogMealPlan = async (msg) => {
    if (!msg.mealPlan || !msg.mealPlan.meals) return;
    try {
      await logMealPlan(msg.mealPlan.meals);
      setMessages(prev => prev.map(m => m === msg ? { ...m, mealPlanLogged: true } : m));
      Alert.alert('Logget', 'Madplanen er logget i dag.');
    } catch (e) {
      Alert.alert('Fejl', 'Kunne ikke logge madplan: ' + e.message);
    }
  };

  if (loadingHistory) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.accent} />
      <Text style={{ color: colors.muted, marginTop: 10, fontSize: 12 }}>{t('chat.loadingHistory')}</Text>
    </View>
  );

  // Beregn padding baseret på keyboard
  const bottomPadding = Platform.OS === 'ios' ? keyboardHeight : 0;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={[s.dot, { backgroundColor: lv.color }]} />
        <Text style={s.headerTitle}>{t('chat.title')}</Text>
        <TouchableOpacity onPress={handleClear} style={s.clearBtn}>
          <Text style={s.clearBtnText}>{t('chat.clear')}</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={s.messages}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {messages.map((m, i) => <Message key={i} msg={m} t={t} onLogMealPlan={handleLogMealPlan} />)}
        {loading && (
          <View style={[s.msgWrap, s.msgAI]}>
            <Text style={s.msgSender}>RUNWITHAI</Text>
            <View style={[s.bubble, s.bubbleAI, { paddingHorizontal: 16, paddingVertical: 12 }]}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input - med dynamisk padding for keyboard */}
      <View style={[s.inputRow, { marginBottom: bottomPadding }]}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder={t('chat.placeholder')}
          placeholderTextColor={colors.muted}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity style={[s.sendBtn, { opacity: input.trim() ? 1 : 0.4 }]} onPress={() => send(input)}>
          <Text style={s.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:           { flex: 1, backgroundColor: colors.bg },
  header:              { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  dot:                 { width: 8, height: 8, borderRadius: 4 },
  headerTitle:         { flex: 1, fontSize: 12, color: colors.muted, letterSpacing: 2, fontWeight: '600' },
  clearBtn:            { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.surface, borderRadius: 8 },
  clearBtnText:        { fontSize: 11, color: colors.muted },
  messages:            { flex: 1, backgroundColor: colors.bg },
  msgWrap:             { marginBottom: 14 },
  msgAI:               { alignItems: 'flex-start' },
  msgUser:             { alignItems: 'flex-end' },
  msgSender:           { fontSize: 9, color: colors.muted, letterSpacing: 1.5, marginBottom: 5, marginLeft: 4 },
  bubble:              { maxWidth: '85%', borderRadius: 18, padding: 14 },
  bubbleAI:            { backgroundColor: colors.card, borderTopLeftRadius: 4, shadowColor: '#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:6, elevation:1 },
  bubbleUser:          { backgroundColor: colors.black, borderTopRightRadius: 4 },
  bubbleText:          { fontSize: 14, lineHeight: 21 },
  bubbleTextAI:        { color: colors.black },
  bubbleTextUser:      { color: colors.card },
  inputRow:            { flexDirection: 'row', gap: 10, padding: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center', backgroundColor: colors.card },
  input:               { flex: 1, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: colors.text, height: 44 },
  sendBtn:             { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  sendBtnText:         { fontSize: 20, fontWeight: '700', color: colors.card },
  planUpdateBadge:     { flexDirection: 'row', alignItems: 'center', marginTop: 6, backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  planUpdateBadgeText: { fontSize: 11, color: colors.accent, fontWeight: '700' },
  mealPlanCard:        { marginTop: 8, backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, alignSelf: 'stretch' },
  mealPlanTitle:       { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  mealPlanSubtitle:    { fontSize: 12, color: colors.muted, marginBottom: 10 },
  mealItem:            { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  mealName:            { fontSize: 14, fontWeight: '600', color: colors.text },
  mealMacros:          { fontSize: 11, color: colors.muted, marginTop: 2 },
  mealDesc:            { fontSize: 12, color: colors.text, marginTop: 4, lineHeight: 17 },
  logAllBtn:           { backgroundColor: '#4a9eff', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  logAllBtnText:       { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  loggedBadge:         { backgroundColor: colors.surface, padding: 10, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  loggedBadgeText:     { color: colors.accent, fontSize: 13, fontWeight: '700' },
});