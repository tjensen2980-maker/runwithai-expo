// --- BLOOD SUGAR TRACKING ---
// Logging and statistics for diabetes blood glucose readings.
// Follows the same pattern as diabetes.js / bariatric.js utilities.
//
// VIGTIGT: Dette er IKKE medicinsk raadgivning. Tallene er kun til
// brugerens egen reference og deling med laege/diabetesteam.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTargetsForType, DEFAULT_TARGETS } from './diabetes';

export const BLOOD_SUGAR_STORAGE_KEY = '@blood_sugar_log';

export const READING_CONTEXTS = {
  FASTING: 'fasting',
  PRE_MEAL: 'preMeal',
  POST_MEAL: 'postMeal',
  BEDTIME: 'bedtime',
  PRE_EXERCISE: 'preExercise',
  POST_EXERCISE: 'postExercise',
  RANDOM: 'random',
};

export const CONTEXT_LABELS = {
  [READING_CONTEXTS.FASTING]: 'Fastende',
  [READING_CONTEXTS.PRE_MEAL]: 'Foer maaltid',
  [READING_CONTEXTS.POST_MEAL]: 'Efter maaltid',
  [READING_CONTEXTS.BEDTIME]: 'Sengetid',
  [READING_CONTEXTS.PRE_EXERCISE]: 'Foer motion',
  [READING_CONTEXTS.POST_EXERCISE]: 'Efter motion',
  [READING_CONTEXTS.RANDOM]: 'Tilfaeldig',
};

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function loadReadings() {
  try {
    const raw = await AsyncStorage.getItem(BLOOD_SUGAR_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch (e) {
    return [];
  }
}

export async function saveReading(reading) {
  try {
    const list = await loadReadings();
    const entry = {
      id: reading.id || makeId(),
      timestamp: reading.timestamp || new Date().toISOString(),
      valueMmolL: Number(reading.valueMmolL),
      context: reading.context || READING_CONTEXTS.RANDOM,
      note: reading.note || '',
    };
    if (!isFinite(entry.valueMmolL) || entry.valueMmolL <= 0) {
      return { ok: false, error: 'invalid_value' };
    }
    list.push(entry);
    list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    await AsyncStorage.setItem(BLOOD_SUGAR_STORAGE_KEY, JSON.stringify(list));
    return { ok: true, entry };
  } catch (e) {
    return { ok: false, error: 'storage_error' };
  }
}

export async function deleteReading(id) {
  try {
    const list = await loadReadings();
    const next = list.filter(r => r.id !== id);
    await AsyncStorage.setItem(BLOOD_SUGAR_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch (e) {
    return false;
  }
}

export async function clearAllReadings() {
  try {
    await AsyncStorage.removeItem(BLOOD_SUGAR_STORAGE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

export function categorizeReading(valueMmolL, context, targets) {
  const t = targets || DEFAULT_TARGETS;
  if (valueMmolL == null || isNaN(valueMmolL)) return 'unknown';
  if (valueMmolL < t.hypoThreshold) return 'low';
  if (valueMmolL >= t.hyperThreshold) return 'high';
  if (context === READING_CONTEXTS.POST_MEAL) {
    if (valueMmolL > t.postMealMax) return 'aboveTarget';
    return 'inRange';
  }
  if (context === READING_CONTEXTS.FASTING || context === READING_CONTEXTS.PRE_MEAL || context === READING_CONTEXTS.BEDTIME) {
    if (valueMmolL < t.fastingMin) return 'belowTarget';
    if (valueMmolL > t.fastingMax) return 'aboveTarget';
    return 'inRange';
  }
  if (valueMmolL < t.fastingMin) return 'belowTarget';
  if (valueMmolL > t.hyperThreshold * 0.85) return 'aboveTarget';
  return 'inRange';
}

export function filterByDays(readings, days) {
  if (!Array.isArray(readings)) return [];
  if (!days || days <= 0) return readings;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return readings.filter(r => {
    const ts = new Date(r.timestamp).getTime();
    return ts >= cutoff;
  });
}

export function computeStats(readings, profile) {
  const targets = profile ? getTargetsForType(profile.diabetesType) : DEFAULT_TARGETS;
  if (!Array.isArray(readings) || readings.length === 0) {
    return {
      count: 0,
      avg: null,
      min: null,
      max: null,
      inRangePct: null,
      lowPct: null,
      highPct: null,
      targets,
    };
  }
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let inRange = 0;
  let low = 0;
  let high = 0;
  for (const r of readings) {
    const v = Number(r.valueMmolL);
    if (!isFinite(v)) continue;
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
    const cat = categorizeReading(v, r.context, targets);
    if (cat === 'low' || cat === 'belowTarget') low += 1;
    else if (cat === 'high' || cat === 'aboveTarget') high += 1;
    else if (cat === 'inRange') inRange += 1;
  }
  const count = readings.length;
  return {
    count,
    avg: Math.round((sum / count) * 10) / 10,
    min: min === Infinity ? null : Math.round(min * 10) / 10,
    max: max === -Infinity ? null : Math.round(max * 10) / 10,
    inRangePct: Math.round((inRange / count) * 100),
    lowPct: Math.round((low / count) * 100),
    highPct: Math.round((high / count) * 100),
    targets,
  };
}

export function buildAIBloodSugarContext(readings, profile, days) {
  if (!Array.isArray(readings) || readings.length === 0) return null;
  const win = filterByDays(readings, days || 7);
  if (win.length === 0) return null;
  const stats = computeStats(win, profile);
  const lines = [
    'Blodsukker (sidste ' + (days || 7) + ' dage): ' + stats.count + ' maalinger',
    'Gennemsnit: ' + (stats.avg != null ? stats.avg + ' mmol/L' : 'n/a'),
    'Min/Max: ' + (stats.min != null ? stats.min : 'n/a') + ' / ' + (stats.max != null ? stats.max : 'n/a') + ' mmol/L',
    'Tid i maal: ' + (stats.inRangePct != null ? stats.inRangePct + '%' : 'n/a'),
    'Lave: ' + stats.lowPct + '% | Hoeje: ' + stats.highPct + '%',
  ];
  return {
    summary: lines.join('\n'),
    stats,
  };
}
