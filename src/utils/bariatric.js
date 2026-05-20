// ─── BARIATRIC UTILITIES ────────────────────────────────────────────────────
// Hjælper med at beregne fase, mål og anbefalinger for brugere
// der har gennemgået gastric sleeve eller gastric bypass.
//
// VIGTIGT: Dette er IKKE medicinsk rådgivning. Følg altid din egen
// bariatriske ernæringsterapeut/klinik's anvisninger.

import AsyncStorage from '@react-native-async-storage/async-storage';

export const BARIATRIC_STORAGE_KEY = '@bariatric_profile';

export const SURGERY_TYPES = {
  NONE: 'none',
  SLEEVE: 'sleeve',
  BYPASS: 'bypass',
};

// Faser efter operation (baseret på ASMBS guidelines + danske retningslinjer)
export const PHASES = {
  CLEAR_LIQUID: 1,   // Uge 1: kun klare væsker
  FULL_LIQUID: 2,    // Uge 2: alle væsker inkl. protein shakes
  PUREED: 3,         // Uge 3-4: puréet mad
  SOFT: 4,           // Uge 5-6: blød mad
  REGULAR: 5,        // Uge 7+: normal mad (mindre portioner)
};

// Returnerer hvilken fase brugeren er i baseret på antal dage siden operation
export function getPhaseFromDays(daysSinceSurgery) {
  if (daysSinceSurgery < 0) return null; // operation endnu ikke sket
  if (daysSinceSurgery <= 7) return PHASES.CLEAR_LIQUID;
  if (daysSinceSurgery <= 14) return PHASES.FULL_LIQUID;
  if (daysSinceSurgery <= 28) return PHASES.PUREED;
  if (daysSinceSurgery <= 42) return PHASES.SOFT;
  return PHASES.REGULAR;
}

// Beregner dage siden operation
export function getDaysSinceSurgery(surgeryDate) {
  if (!surgeryDate) return null;
  const surgery = new Date(surgeryDate);
  if (isNaN(surgery.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - surgery.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Returnerer fase-info: navn, beskrivelse, varighed, regler
export function getPhaseInfo(phase) {
  switch (phase) {
    case PHASES.CLEAR_LIQUID:
      return {
        id: phase,
        nameKey: 'bariatric.phases.clearLiquid.name',
        nameDa: 'Uge 1: Klare væsker',
        descriptionKey: 'bariatric.phases.clearLiquid.description',
        descriptionDa: 'Kun klare væsker: vand, bouillon, sukkerfri saft, te. Små slurke hele dagen.',
        weekRange: [1, 1],
        portionSizeMl: 30,
        proteinTargetG: 40,
        fluidTargetMl: 1500,
        kcalTargetMin: 400,
        kcalTargetMax: 600,
      };
    case PHASES.FULL_LIQUID:
      return {
        id: phase,
        nameKey: 'bariatric.phases.fullLiquid.name',
        nameDa: 'Uge 2: Alle væsker',
        descriptionKey: 'bariatric.phases.fullLiquid.description',
        descriptionDa: 'Alle væsker inkl. protein shakes, suppe, yoghurt. Drik IKKE 30 min før/efter måltid.',
        weekRange: [2, 2],
        portionSizeMl: 60,
        proteinTargetG: 60,
        fluidTargetMl: 1500,
        kcalTargetMin: 500,
        kcalTargetMax: 700,
      };
    case PHASES.PUREED:
      return {
        id: phase,
        nameKey: 'bariatric.phases.pureed.name',
        nameDa: 'Uge 3-4: Puréet mad',
        descriptionKey: 'bariatric.phases.pureed.description',
        descriptionDa: 'Blendet/puréet mad: hytteost, fiskepuré, blendet kylling. Tygg grundigt selv om det er blødt.',
        weekRange: [3, 4],
        portionSizeMl: 90,
        proteinTargetG: 60,
        fluidTargetMl: 1800,
        kcalTargetMin: 600,
        kcalTargetMax: 800,
      };
    case PHASES.SOFT:
      return {
        id: phase,
        nameKey: 'bariatric.phases.soft.name',
        nameDa: 'Uge 5-6: Blød mad',
        descriptionKey: 'bariatric.phases.soft.description',
        descriptionDa: 'Blød mad: æggekage, fisk, kogt grønt, blød frugt. Stadig protein først, små bidder.',
        weekRange: [5, 6],
        portionSizeMl: 120,
        proteinTargetG: 70,
        fluidTargetMl: 2000,
        kcalTargetMin: 700,
        kcalTargetMax: 1000,
      };
    case PHASES.REGULAR:
      return {
        id: phase,
        nameKey: 'bariatric.phases.regular.name',
        nameDa: 'Uge 7+: Normal mad',
        descriptionKey: 'bariatric.phases.regular.description',
        descriptionDa: 'Normal mad i små portioner. Protein først, derefter grønt, sidst kulhydrater. Tygg grundigt.',
        weekRange: [7, 999],
        portionSizeMl: 150,
        proteinTargetG: 80,
        fluidTargetMl: 2000,
        kcalTargetMin: 800,
        kcalTargetMax: 1400,
      };
    default:
      return null;
  }
}

// Bypass kræver lidt mere protein end sleeve (pga. malabsorption)
export function getProteinTarget(surgeryType, phase) {
  const info = getPhaseInfo(phase);
  if (!info) return 60;
  const base = info.proteinTargetG;
  if (surgeryType === SURGERY_TYPES.BYPASS) return Math.round(base * 1.1);
  return base;
}

// Returnerer dage indtil næste fase (eller null hvis i sidste fase)
export function getDaysUntilNextPhase(daysSinceSurgery) {
  if (daysSinceSurgery == null || daysSinceSurgery < 0) return null;
  if (daysSinceSurgery <= 7) return 7 - daysSinceSurgery + 1;
  if (daysSinceSurgery <= 14) return 14 - daysSinceSurgery + 1;
  if (daysSinceSurgery <= 28) return 28 - daysSinceSurgery + 1;
  if (daysSinceSurgery <= 42) return 42 - daysSinceSurgery + 1;
  return null; // i sidste fase
}

// Returnerer en advarsel hvis brugeren burde få medicinsk tjek
export function getMedicalCheckReminder(daysSinceSurgery) {
  if (daysSinceSurgery == null) return null;
  // Typiske kontroller: 2 uger, 6 uger, 3 mdr, 6 mdr, 12 mdr
  const checkpoints = [14, 42, 90, 180, 365];
  for (const cp of checkpoints) {
    if (daysSinceSurgery >= cp - 3 && daysSinceSurgery <= cp + 3) {
      return { dayMark: cp, nameDa: cp + ' dages kontrol' };
    }
  }
  return null;
}

// Hjælper med at gemme/hente bariatrisk profil
export async function loadBariatricProfile() {
  try {
    const raw = await AsyncStorage.getItem(BARIATRIC_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export async function saveBariatricProfile(profile) {
  try {
    await AsyncStorage.setItem(BARIATRIC_STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch (e) {
    return false;
  }
}

export async function clearBariatricProfile() {
  try {
    await AsyncStorage.removeItem(BARIATRIC_STORAGE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

// Validerer profil-objekt
export function validateBariatricProfile(p) {
  if (!p) return { ok: false, error: 'missing' };
  if (!p.surgeryType || ![SURGERY_TYPES.SLEEVE, SURGERY_TYPES.BYPASS].includes(p.surgeryType)) {
    return { ok: false, error: 'invalid_surgery_type' };
  }
  if (!p.surgeryDate) return { ok: false, error: 'missing_date' };
  const d = new Date(p.surgeryDate);
  if (isNaN(d.getTime())) return { ok: false, error: 'invalid_date' };
  if (!p.disclaimerAccepted) return { ok: false, error: 'disclaimer_not_accepted' };
  return { ok: true };
}

// Returnerer dagens nøglemål for brugeren
export function getDailyTargets(bariatricProfile) {
  if (!bariatricProfile || !bariatricProfile.enabled) return null;
  const v = validateBariatricProfile(bariatricProfile);
  if (!v.ok) return null;
  const days = getDaysSinceSurgery(bariatricProfile.surgeryDate);
  const phase = getPhaseFromDays(days);
  const info = getPhaseInfo(phase);
  if (!info) return null;
  return {
    phase,
    daysSinceSurgery: days,
    phaseInfo: info,
    proteinTargetG: getProteinTarget(bariatricProfile.surgeryType, phase),
    fluidTargetMl: info.fluidTargetMl,
    kcalTargetMin: info.kcalTargetMin,
    kcalTargetMax: info.kcalTargetMax,
    portionSizeMl: info.portionSizeMl,
    daysUntilNext: getDaysUntilNextPhase(days),
    medicalCheck: getMedicalCheckReminder(days),
  };
}

// ============================================================
// Vitamins (ASMBS-baseret anbefaling)
// ============================================================
export const VITAMINS = [
  { key: 'multivitamin', frequency: 'daily', icon: '💊' },
  { key: 'calciumD', frequency: 'daily', icon: '🦴' },
  { key: 'iron', frequency: 'daily', icon: '🩸' },
  { key: 'b12', frequency: 'daily', icon: '⚡' },
  { key: 'omega3', frequency: 'daily', icon: '🐟', optional: true },
];

// For bypass: B12 often given as injection every 4 weeks
export function getVitaminsForProfile(profile) {
  if (!profile) return VITAMINS;
  // Bypass patients often need extra iron and B12
  return VITAMINS;
}

// ============================================================
// Daily log (vitamins + fluid intake per day)
// ============================================================
const LOG_KEY_PREFIX = '@bariatric_log_';

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

export async function loadDailyLog(dateKey) {
  try {
    const key = LOG_KEY_PREFIX + (dateKey || todayKey());
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return { vitamins: {}, fluidMl: 0 };
    const parsed = JSON.parse(raw);
    return {
      vitamins: parsed.vitamins || {},
      fluidMl: parsed.fluidMl || 0,
    };
  } catch (e) {
    return { vitamins: {}, fluidMl: 0 };
  }
}

export async function saveDailyLog(dateKey, data) {
  try {
    const key = LOG_KEY_PREFIX + (dateKey || todayKey());
    await AsyncStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export async function toggleVitamin(vitaminKey, dateKey) {
  const log = await loadDailyLog(dateKey);
  log.vitamins[vitaminKey] = !log.vitamins[vitaminKey];
  await saveDailyLog(dateKey, log);
  return log;
}

export async function addFluid(ml, dateKey) {
  const log = await loadDailyLog(dateKey);
  log.fluidMl = Math.max(0, (log.fluidMl || 0) + ml);
  await saveDailyLog(dateKey, log);
  return log;
}

export async function resetDailyLog(dateKey) {
  const log = { vitamins: {}, fluidMl: 0 };
  await saveDailyLog(dateKey, log);
  return log;
}

export function getTodayKey() {
  return todayKey();
}

// ============================================================
// Meal suggestions (per phase) - struktureret info
// ============================================================
export const MEAL_SUGGESTIONS = {
  1: [
    { key: 'water', kcal: 0, protein: 0, prep: 0, type: 'fluid' },
    { key: 'brothClear', kcal: 15, protein: 2, prep: 5, type: 'fluid' },
    { key: 'sugarFreeJuice', kcal: 5, protein: 0, prep: 1, type: 'fluid' },
    { key: 'herbalTea', kcal: 0, protein: 0, prep: 3, type: 'fluid' },
  ],
  2: [
    { key: 'proteinShake', kcal: 120, protein: 25, prep: 2, type: 'fluid' },
    { key: 'skimmedMilk', kcal: 80, protein: 8, prep: 1, type: 'fluid' },
    { key: 'thinSoup', kcal: 90, protein: 6, prep: 10, type: 'fluid' },
    { key: 'skyrThin', kcal: 100, protein: 18, prep: 2, type: 'fluid' },
  ],
  3: [
    { key: 'mashedFish', kcal: 130, protein: 22, prep: 15, type: 'puree' },
    { key: 'cottageCheese', kcal: 90, protein: 12, prep: 1, type: 'puree' },
    { key: 'eggPuree', kcal: 80, protein: 7, prep: 5, type: 'puree' },
    { key: 'pureedChicken', kcal: 140, protein: 25, prep: 20, type: 'puree' },
    { key: 'mashedTofu', kcal: 100, protein: 11, prep: 5, type: 'puree' },
  ],
  4: [
    { key: 'softFish', kcal: 150, protein: 24, prep: 15, type: 'soft' },
    { key: 'scrambledEgg', kcal: 90, protein: 7, prep: 5, type: 'soft' },
    { key: 'softChicken', kcal: 160, protein: 28, prep: 20, type: 'soft' },
    { key: 'cottageCheese', kcal: 90, protein: 12, prep: 1, type: 'soft' },
    { key: 'wellCookedVeggies', kcal: 60, protein: 3, prep: 15, type: 'soft' },
    { key: 'greekYogurt', kcal: 100, protein: 17, prep: 1, type: 'soft' },
  ],
  5: [
    { key: 'grilledChicken', kcal: 180, protein: 30, prep: 20, type: 'normal' },
    { key: 'salmonFillet', kcal: 200, protein: 25, prep: 15, type: 'normal' },
    { key: 'eggOmelette', kcal: 150, protein: 14, prep: 8, type: 'normal' },
    { key: 'lentilSoup', kcal: 180, protein: 12, prep: 25, type: 'normal' },
    { key: 'leanBeef', kcal: 200, protein: 28, prep: 20, type: 'normal' },
    { key: 'cottageCheese', kcal: 90, protein: 12, prep: 1, type: 'normal' },
  ],
};

export function getMealSuggestions(profile) {
  if (!profile || !profile.enabled) return [];
  const days = getDaysSinceSurgery(profile.surgeryDate);
  const phase = getPhaseFromDays(days);
  return MEAL_SUGGESTIONS[phase] || [];
}

// ============================================================
// Dumping syndrome risk (mainly for gastric bypass)
// ============================================================
export const DUMPING_THRESHOLDS = {
  sugarMediumG: 10,
  sugarHighG: 15,
  fatHighG: 20,
};

export function checkDumpingRisk(meal, profile) {
  // meal: { sugar?: number, fat?: number, kcal?: number, carbs?: number }
  if (!meal) return { risk: 'low', reasons: [] };
  const reasons = [];
  let level = 0; // 0=low 1=medium 2=high
  
  const isBypass = profile && profile.surgeryType === 'bypass';
  // Bypass patients are 3x more sensitive
  const sugarMedium = isBypass ? 7 : DUMPING_THRESHOLDS.sugarMediumG;
  const sugarHigh = isBypass ? 10 : DUMPING_THRESHOLDS.sugarHighG;
  
  if (typeof meal.sugar === 'number') {
    if (meal.sugar >= sugarHigh) {
      reasons.push('sugarHigh');
      level = Math.max(level, 2);
    } else if (meal.sugar >= sugarMedium) {
      reasons.push('sugarMedium');
      level = Math.max(level, 1);
    }
  }
  
  if (typeof meal.fat === 'number' && meal.fat >= DUMPING_THRESHOLDS.fatHighG) {
    reasons.push('fatHigh');
    level = Math.max(level, 1);
  }
  
  // High refined carbs without protein
  if (typeof meal.carbs === 'number' && meal.carbs >= 30 && (!meal.protein || meal.protein < 5)) {
    reasons.push('carbsNoProtein');
    level = Math.max(level, 1);
  }
  
  const risk = level === 2 ? 'high' : (level === 1 ? 'medium' : 'low');
  return { risk, reasons };
}

// Check entire day's meals for dumping risk
export function checkDailyDumpingRisk(meals, profile) {
  if (!meals || meals.length === 0) return { risk: 'low', reasons: [], flaggedCount: 0 };
  let highest = 'low';
  let flaggedCount = 0;
  const allReasons = new Set();
  for (const m of meals) {
    const r = checkDumpingRisk(m, profile);
    if (r.risk === 'high') { highest = 'high'; flaggedCount++; }
    else if (r.risk === 'medium' && highest !== 'high') { highest = 'medium'; flaggedCount++; }
    r.reasons.forEach(reason => allReasons.add(reason));
  }
  return { risk: highest, reasons: Array.from(allReasons), flaggedCount };
}

// ============================================================
// Meal reminders (per phase)
// ============================================================
export function getMealReminders(phase) {
  const common = ['proteinFirst', 'chew', 'noDrinking', 'stopWhenFull'];
  const phaseSpecific = {
    1: ['smallSips', 'noStraw'],
    2: ['smallSips', 'noStraw', 'slowly'],
    3: ['mashWell', 'newFoodOneAtATime'],
    4: ['chewExtra', 'newFoodOneAtATime'],
    5: ['mindfulEating', 'avoidEmptyCalories'],
  };
  return [...(phaseSpecific[phase] || []), ...common];
}

// ============================================================
// Dumping risk from daily summary (more practical since meals
// don't track sugar directly - we use carbs/protein ratio)
// ============================================================
export function checkDumpingFromSummary(summary, profile) {
  if (!summary) return { risk: 'low', reasons: [], flaggedCount: 0 };
  
  const isBypass = profile && profile.surgeryType === 'bypass';
  // Bypass patients are more sensitive - lower thresholds
  const carbsHigh = isBypass ? 80 : 130;     // grams of carbs flagged as high
  const carbsMedium = isBypass ? 50 : 80;    // moderate carbs concern
  const proteinMin = isBypass ? 50 : 60;     // minimum protein for the day (g)
  const fatHigh = isBypass ? 40 : 60;        // high fat per day (g)
  
  const carbs = Number(summary.carbs_g) || 0;
  const protein = Number(summary.protein_g) || 0;
  const fat = Number(summary.fat_g) || 0;
  const kcal = Number(summary.kcal_in) || 0;
  
  const reasons = [];
  let level = 0;
  
  // High carbs
  if (carbs >= carbsHigh) {
    reasons.push('carbsHigh');
    level = Math.max(level, 2);
  } else if (carbs >= carbsMedium) {
    reasons.push('carbsMedium');
    level = Math.max(level, 1);
  }
  
  // High carbs with low protein ratio
  if (carbs >= carbsMedium && protein < proteinMin) {
    reasons.push('carbsNoProtein');
    level = Math.max(level, 1);
  }
  
  // High fat
  if (fat >= fatHigh) {
    reasons.push('fatHigh');
    level = Math.max(level, 1);
  }
  
  // Very low protein for the day (only flag if any meals logged)
  if (kcal > 200 && protein < proteinMin * 0.5) {
    reasons.push('proteinLow');
    level = Math.max(level, 1);
  }
  
  const risk = level === 2 ? 'high' : (level === 1 ? 'medium' : 'low');
  const flaggedCount = reasons.length;
  return { risk, reasons, flaggedCount };
}

// ============================================================
// Training recommendations per phase (ASMBS / bariatric clinics guidelines)
// ============================================================
export const TRAINING_PHASES = {
  1: {
    // Week 0-2: Recovery
    daysFrom: 0,
    daysTo: 14,
    allowed: ['walkShort', 'breathing'],
    notRecommended: ['running', 'strength', 'highIntensity', 'cycling', 'swimming'],
    maxDurationMin: 10,
    maxHeartRatePct: 50, // % of max
    intensityLabel: 'veryLight',
    warnings: ['noLifting', 'staySoftMovements', 'avoidSwimmingUntilHealed'],
  },
  2: {
    // Week 2-4
    daysFrom: 14,
    daysTo: 28,
    allowed: ['walkShort', 'walkMedium', 'breathing', 'gentleStretch'],
    notRecommended: ['running', 'strength', 'highIntensity'],
    maxDurationMin: 20,
    maxHeartRatePct: 60,
    intensityLabel: 'light',
    warnings: ['noLifting', 'staySoftMovements'],
  },
  3: {
    // Week 4-6
    daysFrom: 28,
    daysTo: 42,
    allowed: ['walkMedium', 'walkLong', 'cycling', 'gentleStretch', 'swimming'],
    notRecommended: ['running', 'highIntensity', 'heavyLifting'],
    maxDurationMin: 30,
    maxHeartRatePct: 70,
    intensityLabel: 'moderate',
    warnings: ['lightWeightsOk'],
  },
  4: {
    // Week 6-8
    daysFrom: 42,
    daysTo: 56,
    allowed: ['walkLong', 'cycling', 'swimming', 'lightStrength', 'gentleStretch'],
    notRecommended: ['running', 'highIntensity', 'heavyLifting'],
    maxDurationMin: 45,
    maxHeartRatePct: 75,
    intensityLabel: 'moderate',
    warnings: ['startStrengthGradually'],
  },
  5: {
    // 8+ weeks: Normal training (still build up gradually)
    daysFrom: 56,
    daysTo: null,
    allowed: ['walkLong', 'jog', 'running', 'cycling', 'swimming', 'strength', 'lightStrength', 'gentleStretch'],
    notRecommended: ['extremeIntensity'],
    maxDurationMin: 60,
    maxHeartRatePct: 85,
    intensityLabel: 'normal',
    warnings: ['stillBuildGradually', 'hydration'],
  },
};

export function getTrainingPhaseFromDays(days) {
  if (days < 14) return 1;
  if (days < 28) return 2;
  if (days < 42) return 3;
  if (days < 56) return 4;
  return 5;
}

export function getTrainingRecommendation(profile) {
  if (!profile || !profile.enabled) return null;
  const days = getDaysSinceSurgery(profile.surgeryDate);
  const tphase = getTrainingPhaseFromDays(days);
  const tdata = TRAINING_PHASES[tphase];
  if (!tdata) return null;
  
  // Calculate days until next training phase
  let daysUntilNext = null;
  if (tdata.daysTo !== null) {
    daysUntilNext = tdata.daysTo - days;
  }
  
  return {
    phase: tphase,
    days,
    allowed: tdata.allowed,
    notRecommended: tdata.notRecommended,
    maxDurationMin: tdata.maxDurationMin,
    maxHeartRatePct: tdata.maxHeartRatePct,
    intensityLabel: tdata.intensityLabel,
    warnings: tdata.warnings,
    daysUntilNext,
  };
}

// Returns { safe, warning, severity } for a given activity
export function checkActivitySafety(activityType, durationMin, profile) {
  if (!profile || !profile.enabled) return { safe: true, warning: null, severity: 'none' };
  const rec = getTrainingRecommendation(profile);
  if (!rec) return { safe: true, warning: null, severity: 'none' };
  
  // Check if activity is in notRecommended
  if (rec.notRecommended.includes(activityType)) {
    return {
      safe: false,
      warning: 'activityNotRecommended',
      severity: 'high',
      details: { activityType, phase: rec.phase },
    };
  }
  
  // Check if duration exceeds recommended max
  if (durationMin && durationMin > rec.maxDurationMin) {
    return {
      safe: true,
      warning: 'durationTooLong',
      severity: 'medium',
      details: { durationMin, maxDurationMin: rec.maxDurationMin, phase: rec.phase },
    };
  }
  
  return { safe: true, warning: null, severity: 'none' };
}
// ============================================================
// AI Context (til Chat.js - injiceres i AI-prompt)
// ============================================================
export function buildAIContext(bariatricProfile) {
  if (!bariatricProfile || !bariatricProfile.enabled) return null;
  const v = validateBariatricProfile(bariatricProfile);
  if (!v.ok) return null;

  const surgeryLabel = {
    [SURGERY_TYPES.SLEEVE]: 'Gastric sleeve',
    [SURGERY_TYPES.BYPASS]: 'Gastric bypass',
  }[bariatricProfile.surgeryType] || 'Bariatrisk operation';

  const days = getDaysSinceSurgery(bariatricProfile.surgeryDate);
  const phase = getPhaseFromDays(days);
  const info = getPhaseInfo(phase);

  const lines = [
    'Operation: ' + surgeryLabel,
    'Dage siden operation: ' + (days != null ? days : 'ukendt'),
  ];
  if (info) {
    lines.push('Aktuel fase: ' + info.nameDa);
    lines.push('Portionsstoerrelse: max ' + info.portionSizeMl + ' ml/maaltid');
    lines.push('Protein-maal: ' + info.proteinTargetG + ' g/dag');
    lines.push('Vaeske-maal: ' + info.fluidTargetMl + ' ml/dag');
    lines.push('Kalorie-maal: ' + info.kcalTargetMin + '-' + info.kcalTargetMax + ' kcal/dag');
  }

  const rules = [
    'Anbefal smaa portioner (max ' + (info ? info.portionSizeMl : 120) + ' ml/maaltid for denne fase).',
    'Protein FOERST i hvert maaltid - foer kulhydrat og fedt.',
    'Ingen drikke 30 min foer og 30 min efter maaltider.',
    'Undgaa sukker, hvidt brod, sodavand, juice og fed mad (dumping syndrome-risiko).',
    'Tygg grundigt - mindst 20 gange pr. mundfuld.',
    'Foreslaa ALDRIG konkrete medicin-aendringer eller doser.',
    'Henvis altid til brugerens bariatriske team/ernaeringsterapeut ved tvivl.',
  ];
  if (phase && phase <= 2) {
    rules.push('Brugeren er i tidlig fase (vaesker kun) - foreslaa IKKE fast foede.');
  }
  if (phase === 3) {
    rules.push('Brugeren er i puree-fase - kun blendet/pureret mad.');
  }

  return {
    summary: lines.join('\n'),
    safetyRules: rules,
    surgeryType: bariatricProfile.surgeryType,
    phase: phase,
    daysSinceSurgery: days,
    portionSizeMl: info ? info.portionSizeMl : null,
    proteinTargetG: info ? info.proteinTargetG : null,
  };
}