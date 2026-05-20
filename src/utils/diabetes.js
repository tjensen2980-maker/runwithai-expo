// --- DIABETES UTILITIES ---
// Diabetes-tilpasset kost, blodsukker og motion.
// Foelger samme moenster som bariatric.js.
//
// VIGTIGT: Dette er IKKE medicinsk raadgivning. App'en foreslaar ALDRIG
// konkrete insulin-doser. Foelg altid din laeges/diabetesteams anvisninger.

import AsyncStorage from '@react-native-async-storage/async-storage';

export const DIABETES_STORAGE_KEY = '@diabetes_profile';

export const DIABETES_TYPES = {
  NONE: 'none',
  TYPE1: 'type1',
  TYPE2: 'type2',
  PREDIABETES: 'prediabetes',
  GESTATIONAL: 'gestational',
};

export const TREATMENTS = {
  NONE: 'none',
  DIET: 'diet',
  METFORMIN: 'metformin',
  ORAL_OTHER: 'oral_other',
  GLP1: 'glp1',
  BASAL_INSULIN: 'basal_insulin',
  BOLUS_INSULIN: 'bolus_insulin',
  PUMP: 'pump',
};

export const DEFAULT_TARGETS = {
  fastingMin: 4.0,
  fastingMax: 7.0,
  postMealMax: 10.0,
  hypoThreshold: 4.0,
  hyperThreshold: 13.9,
  preExerciseMin: 6.0,
};

export const PREDIABETES_TARGETS = {
  fastingMin: 4.0,
  fastingMax: 6.0,
  postMealMax: 7.8,
  hypoThreshold: 4.0,
  hyperThreshold: 11.0,
  preExerciseMin: 5.0,
};

export function getTargetsForType(diabetesType) {
  if (diabetesType === DIABETES_TYPES.PREDIABETES) return PREDIABETES_TARGETS;
  return DEFAULT_TARGETS;
}

export async function loadDiabetesProfile() {
  try {
    const raw = await AsyncStorage.getItem(DIABETES_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export async function saveDiabetesProfile(profile) {
  try {
    await AsyncStorage.setItem(DIABETES_STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch (e) {
    return false;
  }
}

export async function clearDiabetesProfile() {
  try {
    await AsyncStorage.removeItem(DIABETES_STORAGE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

export function validateDiabetesProfile(p) {
  if (!p) return { ok: false, error: 'missing' };
  const validTypes = [
    DIABETES_TYPES.TYPE1,
    DIABETES_TYPES.TYPE2,
    DIABETES_TYPES.PREDIABETES,
    DIABETES_TYPES.GESTATIONAL,
  ];
  if (!p.diabetesType || !validTypes.includes(p.diabetesType)) {
    return { ok: false, error: 'invalid_type' };
  }
  if (!p.disclaimerAccepted) return { ok: false, error: 'disclaimer_not_accepted' };
  return { ok: true };
}

export function usesInsulin(profile) {
  if (!profile || !profile.treatment) return false;
  return [
    TREATMENTS.BASAL_INSULIN,
    TREATMENTS.BOLUS_INSULIN,
    TREATMENTS.PUMP,
  ].includes(profile.treatment);
}

export function getCarbGuidancePerMeal(profile) {
  if (!profile || !profile.enabled) return null;
  const type = profile.diabetesType;
  if (type === DIABETES_TYPES.TYPE1) {
    return { soft: 60, hard: 90, mustCount: true };
  }
  if (type === DIABETES_TYPES.TYPE2) {
    return { soft: 45, hard: 60, mustCount: false };
  }
  if (type === DIABETES_TYPES.PREDIABETES) {
    return { soft: 40, hard: 55, mustCount: false };
  }
  if (type === DIABETES_TYPES.GESTATIONAL) {
    return { soft: 30, hard: 45, mustCount: true };
  }
  return null;
}

export const GI_CATEGORIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

export function categorizeGI(gi) {
  if (gi == null) return null;
  if (gi <= 55) return GI_CATEGORIES.LOW;
  if (gi <= 69) return GI_CATEGORIES.MEDIUM;
  return GI_CATEGORIES.HIGH;
}

export function checkMealRisk(meal, profile) {
  if (!profile || !profile.enabled) return { risk: 'low', reasons: [] };
  if (!meal) return { risk: 'low', reasons: [] };

  const reasons = [];
  let level = 0;

  const guidance = getCarbGuidancePerMeal(profile);
  const carbs = Number(meal.carbs_g) || Number(meal.carbs) || 0;
  const protein = Number(meal.protein_g) || Number(meal.protein) || 0;
  const fiber = Number(meal.fiber_g) || Number(meal.fiber) || 0;
  const sugar = Number(meal.sugar_g) || Number(meal.sugar) || 0;

  if (guidance) {
    if (carbs >= guidance.hard) {
      reasons.push('carbsHigh');
      level = Math.max(level, 2);
    } else if (carbs >= guidance.soft) {
      reasons.push('carbsMedium');
      level = Math.max(level, 1);
    }
  }

  if (sugar >= 25) {
    reasons.push('sugarHigh');
    level = Math.max(level, 2);
  } else if (sugar >= 15) {
    reasons.push('sugarMedium');
    level = Math.max(level, 1);
  }

  if (carbs >= 30 && protein < 10) {
    reasons.push('carbsNoProtein');
    level = Math.max(level, 1);
  }

  if (carbs >= 40 && fiber < 3) {
    reasons.push('lowFiber');
    level = Math.max(level, 1);
  }

  const risk = level === 2 ? 'high' : level === 1 ? 'medium' : 'low';
  return { risk, reasons };
}

export function checkDailyRiskFromSummary(summary, profile) {
  if (!summary || !profile || !profile.enabled) {
    return { risk: 'low', reasons: [], flaggedCount: 0 };
  }
  const reasons = [];
  let level = 0;

  const carbs = Number(summary.carbs_g) || 0;
  const protein = Number(summary.protein_g) || 0;
  const fiber = Number(summary.fiber_g) || 0;
  const kcal = Number(summary.kcal_in) || 0;
  const guidance = getCarbGuidancePerMeal(profile);
  const dailySoft = guidance ? guidance.soft * 4 : 180;
  const dailyHard = guidance ? guidance.hard * 4 : 240;

  if (carbs >= dailyHard) {
    reasons.push('carbsHigh');
    level = Math.max(level, 2);
  } else if (carbs >= dailySoft) {
    reasons.push('carbsMedium');
    level = Math.max(level, 1);
  }

  if (kcal > 600 && fiber < 15) {
    reasons.push('lowFiber');
    level = Math.max(level, 1);
  }

  if (kcal > 600 && protein < 50) {
    reasons.push('proteinLow');
    level = Math.max(level, 1);
  }

  const risk = level === 2 ? 'high' : level === 1 ? 'medium' : 'low';
  return { risk, reasons, flaggedCount: reasons.length };
}

export function getPreExerciseAdvice(bloodGlucose, profile) {
  if (!profile || !profile.enabled) return null;
  const t = getTargetsForType(profile.diabetesType);
  const insulin = usesInsulin(profile);

  if (bloodGlucose == null || isNaN(bloodGlucose)) {
    return { severity: 'info', key: 'noReading', advice: 'measureBeforeExercise' };
  }

  if (bloodGlucose < t.hypoThreshold) {
    return {
      severity: 'danger',
      key: 'hypoBeforeExercise',
      advice: 'eatFastCarbsWait',
      doNotExercise: true,
    };
  }

  if (bloodGlucose < t.preExerciseMin) {
    return {
      severity: 'warning',
      key: 'lowBeforeExercise',
      advice: 'eatSmallSnackBeforeExercise',
    };
  }

  if (bloodGlucose >= t.hyperThreshold) {
    return {
      severity: 'warning',
      key: 'highBeforeExercise',
      advice: insulin ? 'consultTeamHighBG' : 'hydrateAndLightActivity',
      doNotExercise: insulin,
    };
  }

  return { severity: 'ok', key: 'safeToExercise', advice: 'enjoyTraining' };
}

export function getPostExerciseReminders(profile, durationMin) {
  if (!profile || !profile.enabled) return [];
  const reminders = [];
  const insulin = usesInsulin(profile);
  if (insulin) {
    reminders.push('checkBgAfterExercise');
    if (durationMin >= 45) {
      reminders.push('lateOnsetHypoWarning');
    }
  }
  reminders.push('hydrate');
  reminders.push('refuelWithProteinCarb');
  return reminders;
}

export const RECOMMENDED_VITAMINS = [
  { key: 'vitaminD', frequency: 'daily', icon: 'sun', optional: false },
  { key: 'magnesium', frequency: 'daily', icon: 'mineral', optional: true },
  { key: 'b12', frequency: 'daily', icon: 'b12', conditional: 'metformin' },
];

export function getVitaminsForProfile(profile) {
  if (!profile || !profile.enabled) return RECOMMENDED_VITAMINS;
  return RECOMMENDED_VITAMINS;
}

export const PREFERRED_FOODS = {
  goodCarbs: [
    'rolledOats', 'lentils', 'beans', 'chickpeas',
    'wholeGrainRye', 'quinoa', 'sweetPotato', 'berries',
    'apple', 'pear', 'broccoli', 'spinach',
  ],
  goodProteins: [
    'chicken', 'fish', 'eggs', 'tofu',
    'greekYogurt', 'cottageCheese', 'lentils',
  ],
  limitOrAvoid: [
    'whiteBread', 'sugaryDrinks', 'candy', 'cake',
    'whiteRice', 'fruitJuice', 'processedSnacks',
  ],
};

export function calculateInsulinUnitsForCarbs(carbs, profile) {
  if (!profile || !profile.enabled) return null;
  if (!usesInsulin(profile)) return null;
  const ratio = parseFloat(profile.insulinCarbRatio);
  if (!ratio || ratio <= 0) return null;
  const units = carbs / ratio;
  return {
    units: Math.round(units * 10) / 10,
    ratio,
    informationalOnly: true,
    disclaimer: 'consultTeamForDosing',
  };
}

export function buildAIContext(profile) {
  if (!profile || !profile.enabled) return null;
  const v = validateDiabetesProfile(profile);
  if (!v.ok) return null;

  const typeLabel = {
    [DIABETES_TYPES.TYPE1]: 'Type 1 diabetes',
    [DIABETES_TYPES.TYPE2]: 'Type 2 diabetes',
    [DIABETES_TYPES.PREDIABETES]: 'Praediabetes',
    [DIABETES_TYPES.GESTATIONAL]: 'Graviditetsdiabetes',
  }[profile.diabetesType] || 'Diabetes';

  const treatmentLabel = {
    [TREATMENTS.NONE]: 'Ingen medicin',
    [TREATMENTS.DIET]: 'Kun kost/livsstil',
    [TREATMENTS.METFORMIN]: 'Metformin',
    [TREATMENTS.ORAL_OTHER]: 'Andre tabletter',
    [TREATMENTS.GLP1]: 'GLP-1 (Ozempic/Wegovy/Mounjaro)',
    [TREATMENTS.BASAL_INSULIN]: 'Basal insulin',
    [TREATMENTS.BOLUS_INSULIN]: 'Basal + bolus insulin',
    [TREATMENTS.PUMP]: 'Insulinpumpe',
  }[profile.treatment] || 'Ukendt behandling';

  const lines = [
    'Diabetes: ' + typeLabel,
    'Behandling: ' + treatmentLabel,
  ];
  if (profile.hba1c) lines.push('HbA1c: ' + profile.hba1c + ' mmol/mol');
  if (profile.diagnosisDate) lines.push('Diagnose: ' + profile.diagnosisDate);

  const rules = [
    'Anbefal lavt glykaemisk indeks-kulhydrater (fuldkorn, baelgfrugter, frugt med skraal).',
    'Foretraek fiber- og protein-rige maaltider; undgaa hurtige sukkerstoffer.',
    'Foreslaa ALDRIG konkrete insulin-doser eller medicin-aendringer.',
    'Henvis altid til brugerens laege/diabetesteam ved tvivl om medicin.',
    'Ved motion: naevn at brugeren selv boer tjekke blodsukker foer/under/efter.',
  ];
  if (usesInsulin(profile)) {
    rules.push('Brugeren er paa insulin - vaer saerligt forsigtig ift. hypoglykaemi-risiko ved motion.');
  }

  return {
    summary: lines.join('\n'),
    safetyRules: rules,
    diabetesType: profile.diabetesType,
    treatment: profile.treatment,
    usesInsulin: usesInsulin(profile),
  };
}

export function hasActiveProfile(profile) {
  return !!(profile && profile.enabled && profile.disclaimerAccepted);
}
