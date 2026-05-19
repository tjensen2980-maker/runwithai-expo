// src/screens/NutritionDashboard.js
// Dagens kalorie- og makro-balance med liste af måltider.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { colors, loadProfile, getAuthToken, SERVER } from '../data';
import { getDailySummary, getMeals, deleteMeal, getSummaryRange } from '../services/NutritionAPI';
import { useTranslation } from 'react-i18next';
import { loadBariatricProfile, getDailyTargets, VITAMINS, loadDailyLog, toggleVitamin, addFluid, getTodayKey, getMealSuggestions, checkDailyDumpingRisk, checkDumpingFromSummary, MEAL_SUGGESTIONS } from '../utils/bariatric';
import { computeDailyHealthScore } from '../utils/healthScore';

// ---- Helpers ----------------------------------------------------------------

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd;
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  } catch (e) { return ''; }
}

const MEAL_TYPE_LABELS = {
  breakfast: 'Morgenmad',
  lunch: 'Frokost',
  dinner: 'Aftensmad',
  snack: 'Snack'
};

// ---- Calorie ring (SVG) -----------------------------------------------------

function CalorieRing({ kcalIn, kcalOut, target }) {
  const size = 220;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const effectiveTarget = (target || 0) + (kcalOut || 0);
  const consumed = kcalIn || 0;
  const remaining = effectiveTarget - consumed;
  const pct = effectiveTarget > 0 ? Math.min(consumed / effectiveTarget, 1) : 0;
  const dashOffset = c * (1 - pct);

  const overshoot = consumed > effectiveTarget && effectiveTarget > 0;
  const ringColor = overshoot ? colors.red : colors.accent;

  return (
    <View style={{ alignItems: 'center', marginVertical: 8 }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={colors.border} strokeWidth={stroke} fill="none"
        />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={ringColor} strokeWidth={stroke} fill="none"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={'rotate(-90 ' + (size / 2) + ' ' + (size / 2) + ')'}
        />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 42, fontWeight: '900', color: colors.text }}>
          {Math.max(0, Math.round(remaining))}
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4, fontWeight: '600' }}>
          {remaining < 0 ? 'OVER MÅLET' : 'KCAL TILBAGE'}
        </Text>
        {kcalOut > 0 ? (
          <Text style={{ fontSize: 11, color: colors.green, marginTop: 6, fontWeight: '700' }}>
            +{Math.round(kcalOut)} kcal aktivitet
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ---- Macro bar --------------------------------------------------------------

function MacroBar({ label, value, target, color }) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{label}</Text>
        <Text style={{ fontSize: 13, color: colors.muted, fontWeight: '600' }}>
          {Math.round(value || 0)} / {target ? Math.round(target) : '-'} g
        </Text>
      </View>
      <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ width: (pct * 100) + '%', height: '100%', backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
}

// ---- Main screen ------------------------------------------------------------
// hkCalories sendes ned som prop fra App.js (HealthKit initialiseres ét sted)

export default function NutritionDashboard({
onBack, onLogMeal, onMealPlan, onBariatricSetup, hkCalories = 0, fetchDailyCalories, hkSupported, hkAvail, hkAuth, hkInit, hkError }) {
  const { t } = useTranslation();
  const [bariatricTargets, setBariatricTargets] = useState(null);
  const [bariatricProfile, setBariatricProfile] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const p = await loadBariatricProfile();
        if (p && p.enabled) {
          const targets = getDailyTargets(p);
          setBariatricTargets(targets);
          setBariatricProfile(p);
        } else {
          setBariatricTargets(null);
          setBariatricProfile(null);
        }
      } catch (e) { /* ignore */ }
    })();
  }, []);
  const [dailyLog, setDailyLog] = useState({ vitamins: {}, fluidMl: 0 });
  useEffect(() => {
    (async () => {
      try {
        const log = await loadDailyLog();
        setDailyLog(log);
      } catch (e) { /* ignore */ }
    })();
  }, []);
  const handleAddFluid = async (ml) => {
    try {
      const updated = await addFluid(ml);
      setDailyLog(updated);
    } catch (e) { /* ignore */ }
  };
  const handleToggleVitamin = async (key) => {
    try {
      const updated = await toggleVitamin(key);
      setDailyLog(updated);
    } catch (e) { /* ignore */ }
  };
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [meals, setMeals] = useState([]);
  const [error, setError] = useState(null);
  const [summaryRange, setSummaryRange] = useState(null);


  const load = useCallback(async () => {
    setError(null);
    try {
      try {
        const profile = await loadProfile();
        const token = await getAuthToken();
        if (profile && token && profile.weight && profile.height && profile.age) {
          const sexMap = { 'Mand': 'male', 'Kvinde': 'female' };
          const goalMap = { weight: 'lose_fat', fitness: 'maintain', '5k': 'maintain', '10k': 'maintain', half: 'maintain', full: 'maintain' };
          const body = {
            weight_kg: parseFloat(profile.weight),
            height_cm: parseFloat(profile.height),
            age: parseInt(profile.age),
            gender: sexMap[profile.sex] || 'male',
            activity_level: 'moderate',
            primary_goal: goalMap[profile.goal] || 'maintain',
            goal_pace: 'normal',
            plan_type: 'balanced'
          };
          await fetch(SERVER + '/goals/auto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(body)
          });
        }
      } catch (calcErr) {
        console.warn('[Nutrition] Auto-calc skipped:', calcErr);
      }

      const date = todayISO();
      const [s, m, sr] = await Promise.all([
        getDailySummary(date),
        getMeals(date),
        getSummaryRange(7).catch(() => null)
      ]);
      setSummary(s);
      setMeals(Array.isArray(m) ? m : []);
      setSummaryRange(Array.isArray(sr) ? sr : (sr && Array.isArray(sr.days) ? sr.days : null));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); if (fetchDailyCalories) fetchDailyCalories(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
    if (fetchDailyCalories) fetchDailyCalories();
  };

  const handleDelete = (mealId) => {
    Alert.alert(
      'Slet måltid',
      'Er du sikker på at du vil slette dette måltid?',
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Slet',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMeal(mealId);
              load();
            } catch (e) {
              Alert.alert('Fejl', e.message);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loaderWrap}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const sum = summary || {};
  const target = sum.target_kcal || 0;
  const kcalIn = sum.kcal_in || 0;
  const kcalOut = Math.max(sum.kcal_out_activity || 0, hkCalories || 0);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backTxt}>Tilbage</Text>
        </TouchableOpacity>
        <Text style={s.title}>Dagens kalorier</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>

        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorTxt}>Kunne ikke hente data: {error}</Text>
          </View>
        ) : null}

        {!target ? (
          <View style={s.warnBox}>
            <Text style={s.warnTxt}>
              Sæt dine kalorie-mål under "Mine kalorie-mål" for at se dagens balance.
            </Text>
          </View>
        ) : null}

        <CalorieRing kcalIn={kcalIn} kcalOut={kcalOut} target={target} />


        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>SPIST</Text>
            <Text style={s.statValue}>{Math.round(kcalIn)}</Text>
            <Text style={s.statUnit}>kcal</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>BRÆNDT</Text>
            <Text style={[s.statValue, { color: colors.green }]}>{Math.round(kcalOut)}</Text>
            <Text style={s.statUnit}>kcal</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>MÅL</Text>
            <Text style={s.statValue}>{Math.round(target)}</Text>
            <Text style={s.statUnit}>kcal</Text>
          </View>
        </View>
        {summaryRange && summaryRange.length >= 2 ? (() => {
          // Last two days are: [...range[N-2]=yesterday, range[N-1]=today]
          const today = summaryRange[summaryRange.length - 1] || { kcal_in: 0 };
          const yesterday = summaryRange[summaryRange.length - 2] || { kcal_in: 0 };
          const diff = (today.kcal_in || 0) - (yesterday.kcal_in || 0);
          const maxKcal = Math.max(target || 0, ...summaryRange.map(d => Number(d.kcal_in) || 0), 1);
          const dayNames = ['Son', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lor'];
          return (
            <View style={s.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <Text style={s.sectionTitle}>7 DAGES TREND</Text>
                {yesterday.kcal_in > 0 ? (
                  <Text style={{ fontSize: 12, fontWeight: '700', color: diff <= 0 ? colors.green : colors.red }}>
                    {diff > 0 ? '+' : ''}{Math.round(diff)} kcal vs. i gar
                  </Text>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 110, paddingHorizontal: 4 }}>
                {summaryRange.map((d, idx) => {
                  const v = Number(d.kcal_in) || 0;
                  const h = Math.max(2, Math.round((v / maxKcal) * 90));
                  const isToday = idx === summaryRange.length - 1;
                  const overTarget = target > 0 && v > target;
                  const dt = new Date(d.date + 'T00:00:00');
                  const dayLabel = dayNames[dt.getDay()] || '';
                  return (
                    <View key={d.date} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 9, color: colors.muted, marginBottom: 2 }}>{v > 0 ? Math.round(v) : ''}</Text>
                      <View style={{ width: '60%', height: h, backgroundColor: isToday ? colors.accent : (overTarget ? colors.red : colors.blue), borderRadius: 3, opacity: isToday ? 1 : 0.7 }} />
                      <Text style={{ fontSize: 10, color: isToday ? colors.text : colors.muted, fontWeight: isToday ? '700' : '500', marginTop: 4 }}>{dayLabel}</Text>
                    </View>
                  );
                })}
              </View>
              {target > 0 ? (
                <Text style={{ fontSize: 11, color: colors.muted, marginTop: 8, textAlign: 'center' }}>
                  Mal: {Math.round(target)} kcal/dag
                </Text>
              ) : null}
            </View>
          );
        })() : null}


{(() => {
          const dhs = computeDailyHealthScore(meals);
          if (!dhs) return null;
          return (
            <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 6, borderLeftColor: dhs.color, marginVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 40, marginRight: 14 }}>{dhs.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>{t('healthScore.todayLabel', 'Dagens sundhedsscore')}</Text>
                <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 4 }}>{dhs.grade} · {dhs.score}</Text>
                <Text style={{ color: dhs.color, fontSize: 13, fontWeight: '600', marginTop: 2 }}>{t(dhs.labelKey, dhs.grade)}</Text>
              </View>
            </View>
          );
        })()}

                {bariatricTargets && bariatricTargets.phaseInfo ? (
          <View style={s.card}>
            <Text style={s.sectionTitle}>{t('bariatric.dashboard.title', 'Bariatrisk støtte')}</Text>
            {onBariatricSetup ? (
              <TouchableOpacity onPress={onBariatricSetup} style={{ position: 'absolute', top: 12, right: 12, backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>{t('bariatric.dashboard.edit', 'Rediger')}</Text>
              </TouchableOpacity>
            ) : null}
            <View style={{ paddingVertical: 8 }}>
              <Text style={{ color: colors.accent, fontSize: 16, fontWeight: '700' }}>
                {t('bariatric.phases.' + (bariatricTargets.phase === 1 ? 'clearLiquid' : bariatricTargets.phase === 2 ? 'fullLiquid' : bariatricTargets.phase === 3 ? 'pureed' : bariatricTargets.phase === 4 ? 'soft' : 'regular') + '.name', bariatricTargets.phaseInfo.nameDa || '')}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                {bariatricTargets.daysSinceSurgery != null ? (t('bariatric.dashboard.daysSinceLabel', 'Dage siden operation') + ': ' + bariatricTargets.daysSinceSurgery) : ''}
              </Text>
              <Text style={{ color: colors.text, fontSize: 13, marginTop: 8, lineHeight: 18 }}>
                {t('bariatric.phases.' + (bariatricTargets.phase === 1 ? 'clearLiquid' : bariatricTargets.phase === 2 ? 'fullLiquid' : bariatricTargets.phase === 3 ? 'pureed' : bariatricTargets.phase === 4 ? 'soft' : 'regular') + '.description', bariatricTargets.phaseInfo.descriptionDa || '')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
              <View style={{ width: '50%', paddingVertical: 6 }}>
                <Text style={{ color: colors.muted, fontSize: 11 }}>{t('bariatric.dashboard.proteinToday', 'Protein i dag')}</Text>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{bariatricTargets.proteinTargetG}g</Text>
              </View>
              <View style={{ width: '50%', paddingVertical: 6 }}>
                <Text style={{ color: colors.muted, fontSize: 11 }}>{t('bariatric.dashboard.fluidToday', 'Væske i dag')}</Text>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{bariatricTargets.fluidTargetMl}ml</Text>
              </View>
              <View style={{ width: '50%', paddingVertical: 6 }}>
                <Text style={{ color: colors.muted, fontSize: 11 }}>{t('bariatric.dashboard.kcalRange', 'Kalorier (mål)')}</Text>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{bariatricTargets.kcalTargetMin}-{bariatricTargets.kcalTargetMax}</Text>
              </View>
              <View style={{ width: '50%', paddingVertical: 6 }}>
                <Text style={{ color: colors.muted, fontSize: 11 }}>{t('bariatric.dashboard.portionSize', 'Portion')}</Text>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{bariatricTargets.portionSizeMl}ml</Text>
              </View>
            </View>
            {bariatricTargets.proteinTargetG > 0 ? (() => {
              const actual = Number((summary && summary.protein_g) || 0);
              const target = bariatricTargets.proteinTargetG;
              const pct = Math.min(100, Math.round((actual / Math.max(1, target)) * 100));
              const reached = actual >= target;
              return (
                <View style={{ marginTop: 12, marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{t('bariatric.dashboard.proteinProgress', 'Protein i dag')}</Text>
                    <Text style={{ color: reached ? colors.accent : colors.text, fontSize: 12, fontWeight: '600' }}>{Math.round(actual)}g / {target}g ({pct}%)</Text>
                  </View>
                  <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{ width: pct + '%', height: '100%', backgroundColor: reached ? '#10b981' : colors.accent, borderRadius: 4 }} />
                  </View>
                </View>
              );
            })() : null}
            {bariatricTargets.daysUntilNext != null ? (
              <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
                <Text style={{ color: colors.accent, fontSize: 12 }}>
                  {t('bariatric.dashboard.daysUntilNext', '{{days}} dage til næste fase').replace('{{days}}', String(bariatricTargets.daysUntilNext))}
                </Text>
              </View>
            ) : null}
            {bariatricTargets.medicalCheck ? (
              <View style={{ marginTop: 6 }}>
                <Text style={{ color: '#ffaa00', fontSize: 12, fontWeight: '600' }}>
                  ⚠ {t('bariatric.dashboard.medicalCheckReminder', 'Husk din {{day}}-dages kontrol').replace('{{day}}', String(bariatricTargets.medicalCheck.dayMark))}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {bariatricTargets ? (
          <View style={s.card}>
            <Text style={s.sectionTitle}>{t('bariatric.fluid.title')}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 8 }}>{t('bariatric.fluid.subtitle')}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>{dailyLog.fluidMl} ml</Text>
              <Text style={{ color: colors.muted, fontSize: 14 }}>{t('bariatric.fluid.goal')}: {bariatricTargets.fluidTarget} ml</Text>
            </View>
            <View style={{ height: 10, backgroundColor: colors.border, borderRadius: 5, overflow: 'hidden', marginBottom: 10 }}>
              <View style={{ width: Math.min(100, Math.round((dailyLog.fluidMl / Math.max(1, bariatricTargets.fluidTarget)) * 100)) + '%', height: '100%', backgroundColor: colors.accent, borderRadius: 5 }} />
            </View>
            {dailyLog.fluidMl >= bariatricTargets.fluidTarget ? (
              <Text style={{ color: colors.accent, fontSize: 13, marginBottom: 8, fontWeight: '600' }}>{t('bariatric.fluid.goalReached')}</Text>
            ) : (
              <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>{t('bariatric.fluid.remaining')}: {Math.max(0, bariatricTargets.fluidTarget - dailyLog.fluidMl)} ml</Text>
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => handleAddFluid(250)} style={{ flex: 1, backgroundColor: colors.accent, paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>{t('bariatric.fluid.add250')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleAddFluid(500)} style={{ flex: 1, backgroundColor: colors.accent, paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>{t('bariatric.fluid.add500')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleAddFluid(-250)} style={{ width: 50, backgroundColor: colors.border, paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>-250</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8, fontStyle: 'italic' }}>{t('bariatric.fluid.warning')}</Text>
          </View>
        ) : null}

        {bariatricTargets ? (
          <View style={s.card}>
            <Text style={s.sectionTitle}>{t('bariatric.vitamins.title')}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>{t('bariatric.vitamins.subtitle')}</Text>
            {VITAMINS.map(v => {
              const taken = !!dailyLog.vitamins[v.key];
              return (
                <TouchableOpacity key={v.key} onPress={() => handleToggleVitamin(v.key)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ fontSize: 22, marginRight: 12 }}>{v.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('bariatric.vitamins.names.' + v.key)}</Text>
                    <Text style={{ color: taken ? colors.accent : colors.muted, fontSize: 12 }}>{taken ? t('bariatric.vitamins.taken') : t('bariatric.vitamins.notTaken')}</Text>
                  </View>
                  <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: taken ? colors.accent : colors.border, backgroundColor: taken ? colors.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {taken ? <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>✓</Text> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
            {VITAMINS.every(v => dailyLog.vitamins[v.key]) ? (
              <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600', marginTop: 12, textAlign: 'center' }}>{t('bariatric.vitamins.allDone')}</Text>
            ) : null}
          </View>
        ) : null}

        {bariatricProfile ? (() => {
          const dumpingRisk = checkDumpingFromSummary(summary, bariatricProfile);
          if (dumpingRisk.risk === 'low' || dumpingRisk.flaggedCount === 0) return null;
          const bgColor = dumpingRisk.risk === 'high' ? '#7f1d1d' : '#78350f';
          const borderColor = dumpingRisk.risk === 'high' ? '#ef4444' : '#f59e0b';
          const titleKey = 'bariatric.dumping.' + dumpingRisk.risk;
          const descKey = 'bariatric.dumping.' + dumpingRisk.risk + 'Desc';
          return (
            <View style={{ backgroundColor: bgColor, borderWidth: 1, borderColor, borderRadius: 12, padding: 14, marginVertical: 8 }}>
              <Text style={{ color: '#fbbf24', fontWeight: '700', fontSize: 15, marginBottom: 4 }}>⚠ {t(titleKey)}</Text>
              <Text style={{ color: '#fef3c7', fontSize: 13, lineHeight: 18 }}>{t(descKey)}</Text>
              {dumpingRisk.reasons.length > 0 ? (
                <View style={{ marginTop: 8 }}>
                  {dumpingRisk.reasons.map(r => (
                    <Text key={r} style={{ color: '#fde68a', fontSize: 12 }}>• {t('bariatric.dumping.reasons.' + r)}</Text>
                  ))}
                </View>
              ) : null}
              <Text style={{ color: '#fef3c7', fontSize: 11, marginTop: 10, fontStyle: 'italic', lineHeight: 16 }}>{t('bariatric.dumping.info')}</Text>
            </View>
          );
        })() : null}

        {bariatricProfile ? (() => {
          const suggestions = getMealSuggestions(bariatricProfile);
          if (!suggestions || suggestions.length === 0) return null;
          return (
            <View style={s.card}>
              <Text style={s.sectionTitle}>{t('bariatric.meals.title')}</Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>{t('bariatric.meals.subtitle')}</Text>
              {suggestions.map((sug, idx) => (
                <View key={sug.key + '_' + idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: idx < suggestions.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('bariatric.meals.items.' + sug.key)}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{sug.kcal} {t('bariatric.meals.kcal')} · {sug.protein} {t('bariatric.meals.protein')} · {sug.prep} {t('bariatric.meals.prep')}</Text>
                  </View>
                  <View style={{ backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>{t('bariatric.meals.types.' + sug.type)}</Text>
                  </View>
                </View>
              ))}
            </View>
          );
        })() : null}

        <View style={s.card}>
          <Text style={s.sectionTitle}>MAKROS</Text>
          <MacroBar label="Protein" value={sum.protein_g} target={sum.target_protein_g} color={colors.blue} />
          <MacroBar label="Kulhydrater" value={sum.carbs_g} target={sum.target_carbs_g} color={colors.yellow} />
          <MacroBar label="Fedt" value={sum.fat_g} target={sum.target_fat_g} color={colors.purple} />
        </View>

        <TouchableOpacity
          style={s.logBtn}
          onPress={() => onLogMeal ? onLogMeal() : Alert.alert('Kommer snart', 'Log måltid bygges i næste fase.')}>
          <Text style={s.logBtnTxt}>+ Log måltid</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.mealPlanBtn}
          onPress={() => onMealPlan ? onMealPlan() : Alert.alert('Kommer snart', 'Madplan bygges snart.')}>
          <Text style={s.mealPlanBtnTxt}>AI madplan</Text>
        </TouchableOpacity>

        <Text style={s.sectionTitle}>DAGENS MÅLTIDER</Text>
        {meals.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyTxt}>Ingen måltider logget i dag</Text>
          </View>
        ) : (
          meals.map(m => (
            <View key={m.id} style={s.mealCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.mealType}>
                  {MEAL_TYPE_LABELS[m.meal_type] || 'Måltid'} {m.eaten_at ? '- ' + formatTime(m.eaten_at) : ''}
                </Text>
                {(m.items || []).map((it, idx) => (
                  <Text key={idx} style={s.mealItem}>
                    {it.food_name || m.notes || 'Item'}{it.amount && it.unit ? ' · ' + it.amount + ' ' + it.unit + ' (' + Math.round(Number(it.amount_g) || 0) + 'g)' : it.amount_g ? ' · ' + Math.round(Number(it.amount_g)) + 'g' : ''} · {Math.round(it.kcal)} kcal
                  </Text>
                ))}
              </View>
              <TouchableOpacity onPress={() => handleDelete(m.id)} style={s.deleteBtn}>
                <Text style={s.deleteTxt}>X</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
    borderBottomColor: colors.border, backgroundColor: colors.card
  },
  backBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  backTxt: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  content: { padding: 16, paddingBottom: 40 },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginVertical: 12, gap: 8
  },
  statBox: {
    flex: 1, backgroundColor: colors.card, borderRadius: 12,
    padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border
  },
  statLabel: { fontSize: 10, color: colors.muted, fontWeight: '800', letterSpacing: 1 },
  statValue: { fontSize: 22, color: colors.text, fontWeight: '900', marginTop: 4 },
  statUnit: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  card: {
    backgroundColor: colors.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginVertical: 8
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 1,
    marginTop: 16, marginBottom: 8, textTransform: 'uppercase'
  },
  logBtn: {
    backgroundColor: colors.black, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 12
  },
  mealPlanBtn: {
    backgroundColor: '#4a9eff',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8
  },
  mealPlanBtnTxt: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  logBtnTxt: { color: colors.card, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  mealCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border, marginBottom: 8
  },
  mealType: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 4, textTransform: 'uppercase' },
  mealItem: { fontSize: 13, color: colors.dim, marginTop: 2 },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center'
  },
  deleteTxt: { fontSize: 14, color: colors.muted, fontWeight: '700' },
  emptyBox: {
    backgroundColor: colors.card, borderRadius: 12, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed'
  },
  emptyTxt: { color: colors.muted, fontSize: 14 },
  errorBox: {
    backgroundColor: colors.red + '15', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: colors.red, marginBottom: 12
  },
  errorTxt: { color: colors.red, fontSize: 13 },
  warnBox: {
    backgroundColor: colors.yellow + '20', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: colors.yellow, marginBottom: 12
  },
  warnTxt: { color: colors.text, fontSize: 13, lineHeight: 18 }
});
