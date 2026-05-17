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
