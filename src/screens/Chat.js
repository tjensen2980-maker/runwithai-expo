import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../components/Icons';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Keyboard, Dimensions
} from 'react-native';
import { colors, LEVELS, sendToAI, loadMessages, clearMessages } from '../data';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function Message({ msg }) {
  const isAI = msg.role === 'ai' || msg.role === 'assistant';
  return (
    <View style={[s.msgWrap, isAI ? s.msgAI : s.msgUser]}>
      {isAI && <Text style={s.msgSender}>RUNWITHAI</Text>}
      <View style={[s.bubble, isAI ? s.bubbleAI : s.bubbleUser]}>
        <Text style={[s.bubbleText, isAI ? s.bubbleTextAI : s.bubbleTextUser]}>{(msg.text || '').replace(/<plan_update>[\s\S]*?<\/plan_update>/g, '').trim()}</Text>
      </View>
      {msg.hasPlanUpdate && (
        <View style={s.planUpdateBadge}>
          <Text style={s.planUpdateBadgeText}>✓ Plan opdateret</Text>
        </View>
      )}
    </View>
  );
}

export default function Chat({ level, profile, weekPlan, nextWorkout, onPlanUpdate, runs }) {
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
        const name = (profile?.name || 'løber').split(' ')[0];
        setMessages([{ role: 'ai', text: `Hej ${name}! Jeg er din AI løbecoach. Hvad kan jeg hjælpe dig med i dag?` }]);
      }
      setLoadingHistory(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
    fetchHistory();
  }, []);

  const send = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', text: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const { text: aiText, planUpdate } = await sendToAI({
        messages: newMessages,
        profile, level, weekPlan, nextWorkout, runs,
      });
      const aiMsg = { role: 'ai', text: aiText, hasPlanUpdate: !!planUpdate };
      setMessages(prev => [...prev, aiMsg]);
      if (planUpdate) onPlanUpdate(planUpdate);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Beklager, jeg kunne ikke forbinde. Prøv igen.' }]);
    }
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleClear = async () => {
    await clearMessages();
    const name = (profile?.name || 'løber').split(' ')[0];
    setMessages([{ role: 'ai', text: `Samtale ryddet! Hvad kan jeg hjælpe dig med, ${name}?` }]);
  };

  if (loadingHistory) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.accent} />
      <Text style={{ color: colors.muted, marginTop: 10, fontSize: 12 }}>Henter samtale...</Text>
    </View>
  );

  // Beregn padding baseret på keyboard
  const bottomPadding = Platform.OS === 'ios' ? keyboardHeight : 0;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={[s.dot, { backgroundColor: lv.color }]} />
        <Text style={s.headerTitle}>AI COACH</Text>
        <TouchableOpacity onPress={handleClear} style={s.clearBtn}>
          <Text style={s.clearBtnText}>Ryd</Text>
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
        {messages.map((m, i) => <Message key={i} msg={m} />)}
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
          placeholder="Skriv til din coach..."
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
});
