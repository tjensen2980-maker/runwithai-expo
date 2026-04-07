// ─── THEME ────────────────────────────────────────────────────────────────────
export const colors = {
  // Nike Run Club inspired — hvid, sort, præcis rød
  black:     '#0a0a0a',
  surface:   '#f5f5f5',
  card:      '#ffffff',
  card2:     '#f0f0f0',
  border:    '#e8e8e8',
  border2:   '#d0d0d0',
  accent:    '#fa3c00',   // Nike rød-orange
  accent2:   '#ff6b00',
  blue:      '#0066cc',
  green:     '#00a550',
  purple:    '#7c3aed',
  red:       '#e8001c',
  yellow:    '#f5a623',
  muted:     '#8c8c8c',
  text:      '#0a0a0a',
  dim:       '#555555',
  secondary: '#fa3c00',
  bg:        '#fafafa',
  // Puls-zoner
  zone1:     '#3498db',  // Blå - let
  zone2:     '#2ecc71',  // Grøn - moderat
  zone3:     '#f1c40f',  // Gul - hård
  zone4:     '#e67e22',  // Orange - meget hård
  zone5:     '#e74c3c',  // Rød - maksimal
};

// ─── SERVER URL ───────────────────────────────────────────────────────────────
export const SERVER = 'https://runwithai-server-production.up.railway.app';

// ─── AUTH TOKEN ───────────────────────────────────────────────────────────────
const TOKEN_KEY = 'runwithai_token';
let _token = null;

try {
  _token = (typeof localStorage !== 'undefined' && localStorage.getItem(TOKEN_KEY)) || null;
} catch {}

export function setAuthToken(token) {
  _token = token;
  try {
    if (typeof localStorage !== 'undefined') {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    }
  } catch {}
}
export function getAuthToken() { return _token; }
function authHeaders() {
  return { 'Content-Type': 'application/json', ...(_token ? { Authorization: `Bearer ${_token}` } : {}) };
}

// ─── LEVELS (med niveau-begrænsninger) ────────────────────────────────────────
export const LEVELS = {
  beginner: {
    id: 'beginner', label: 'Begynder', emoji: '🌱', color: '#2ecc71',
    desc: 'Ny til løb — enkle ord, ingen jargon',
    aiStyle: 'Forklar som til en nybegynder. Brug simple ord. Ingen forkortelser. Fokusér på: er det godt eller dårligt, og hvad skal jeg gøre.',
    maxKmPerRun: 5,
    maxKmPerWeek: 20,
    minRestDays: 3,
    paceRange: '7:00-8:00',
  },
  intermediate: {
    id: 'intermediate', label: 'Øvet', emoji: '🏃', color: '#ff6b35',
    desc: 'Løber regelmæssigt, kender grundlæggende begreber',
    aiStyle: 'Brug løbebegreber som tempo, zone 2, HRV. Forklar kort hvad tallene betyder. Giv konkrete anbefalinger.',
    maxKmPerRun: 15,
    maxKmPerWeek: 50,
    minRestDays: 2,
    paceRange: '5:30-6:30',
  },
  advanced: {
    id: 'advanced', label: 'Avanceret', emoji: '⚡', color: '#c8ff00',
    desc: 'Erfaren løber, forstår alle træningsdata',
    aiStyle: 'Brug fuld terminologi: ACWR, GCT, VO2max, HRV, asymmetri. Vær præcis og teknisk.',
    maxKmPerRun: 30,
    maxKmPerWeek: 100,
    minRestDays: 1,
    paceRange: '4:00-5:30',
  },
};

// ─── DAY MAPPING ──────────────────────────────────────────────────────────────
const DAY_NAMES = {
  'monday': 'Man', 'tuesday': 'Tir', 'wednesday': 'Ons', 'thursday': 'Tor',
  'friday': 'Fre', 'saturday': 'Lør', 'sunday': 'Søn',
  'mon': 'Man', 'tue': 'Tir', 'wed': 'Ons', 'thu': 'Tor',
  'fri': 'Fre', 'sat': 'Lør', 'sun': 'Søn',
  'Mandag': 'Man', 'Tirsdag': 'Tir', 'Onsdag': 'Ons', 'Torsdag': 'Tor',
  'Fredag': 'Fre', 'Lørdag': 'Lør', 'Søndag': 'Søn',
};

function normalizeDay(day) {
  if (!day) return day;
  const lower = day.toLowerCase();
  return DAY_NAMES[lower] || DAY_NAMES[day] || day;
}

// ─── BADGES DEFINITION ───────────────────────────────────────────────────────
export const BADGES = {
  // Distance badges
  first_run:      { id: 'first_run', name: 'Første skridt', emoji: '👟', desc: 'Gennemfør dit første løb', category: 'milestone' },
  km_10:          { id: 'km_10', name: '10 km klubben', emoji: '🔟', desc: 'Løb 10 km i alt', category: 'distance' },
  km_50:          { id: 'km_50', name: 'Halvtreds', emoji: '5️⃣', desc: 'Løb 50 km i alt', category: 'distance' },
  km_100:         { id: 'km_100', name: 'Hundred', emoji: '💯', desc: 'Løb 100 km i alt', category: 'distance' },
  km_500:         { id: 'km_500', name: 'Halvt tusind', emoji: '🏅', desc: 'Løb 500 km i alt', category: 'distance' },
  km_1000:        { id: 'km_1000', name: 'Tusind kilometer', emoji: '🏆', desc: 'Løb 1000 km i alt', category: 'distance' },
  
  // Single run badges
  run_5k:         { id: 'run_5k', name: '5K finisher', emoji: '🎯', desc: 'Gennemfør et 5 km løb', category: 'single_run' },
  run_10k:        { id: 'run_10k', name: '10K warrior', emoji: '⚔️', desc: 'Gennemfør et 10 km løb', category: 'single_run' },
  run_half:       { id: 'run_half', name: 'Halvmaraton', emoji: '🥈', desc: 'Gennemfør 21.1 km', category: 'single_run' },
  run_marathon:   { id: 'run_marathon', name: 'Maratonløber', emoji: '🥇', desc: 'Gennemfør 42.2 km', category: 'single_run' },
  
  // Streak badges
  streak_3:       { id: 'streak_3', name: '3-dages streak', emoji: '🔥', desc: 'Løb 3 dage i træk', category: 'streak' },
  streak_7:       { id: 'streak_7', name: 'Ugentlig warrior', emoji: '🔥🔥', desc: 'Løb 7 dage i træk', category: 'streak' },
  streak_14:      { id: 'streak_14', name: 'To uger i træk', emoji: '🔥🔥🔥', desc: 'Løb 14 dage i træk', category: 'streak' },
  streak_30:      { id: 'streak_30', name: 'Månedens løber', emoji: '👑', desc: 'Løb 30 dage i træk', category: 'streak' },
  
  // Speed badges
  pace_sub6:      { id: 'pace_sub6', name: 'Under 6 min/km', emoji: '⚡', desc: 'Løb med pace under 6:00/km', category: 'speed' },
  pace_sub5:      { id: 'pace_sub5', name: 'Under 5 min/km', emoji: '💨', desc: 'Løb med pace under 5:00/km', category: 'speed' },
  pace_sub4:      { id: 'pace_sub4', name: 'Under 4 min/km', emoji: '🚀', desc: 'Løb med pace under 4:00/km', category: 'speed' },
  
  // Time badges
  early_bird:     { id: 'early_bird', name: 'Tidlig fugl', emoji: '🌅', desc: 'Løb før kl. 6', category: 'time' },
  night_owl:      { id: 'night_owl', name: 'Natløber', emoji: '🌙', desc: 'Løb efter kl. 21', category: 'time' },
  weekend_warrior:{ id: 'weekend_warrior', name: 'Weekend warrior', emoji: '🏖️', desc: 'Løb hver weekend i en måned', category: 'time' },
  
  // Social badges
  first_share:    { id: 'first_share', name: 'Social løber', emoji: '📢', desc: 'Del dit første løb', category: 'social' },
  kudos_10:       { id: 'kudos_10', name: 'Populær', emoji: '👏', desc: 'Modtag 10 kudos', category: 'social' },
  kudos_100:      { id: 'kudos_100', name: 'Superstjerne', emoji: '⭐', desc: 'Modtag 100 kudos', category: 'social' },
  friend_5:       { id: 'friend_5', name: 'Løbefællesskab', emoji: '👥', desc: 'Tilføj 5 venner', category: 'social' },
  
  // Special badges
  comeback:       { id: 'comeback', name: 'Comeback kid', emoji: '💪', desc: 'Løb igen efter 2 ugers pause', category: 'special' },
  consistent:     { id: 'consistent', name: 'Konsistent', emoji: '📊', desc: 'Løb mindst 3x/uge i en måned', category: 'special' },
  explorer:       { id: 'explorer', name: 'Opdagelsesrejsende', emoji: '🗺️', desc: 'Løb 10 forskellige ruter', category: 'special' },
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
export const RUNS = [
  { id:1, date:'Man 3. Mar',  type:'Interval', color:'#c8ff00', km:9.2,  pace:'4:52', hr:164, cadence:176, gct:218, asymmetry:2.1 },
  { id:2, date:'Tor 27. Feb', type:'Roligt',   color:'#2ecc71', km:12.4, pace:'5:52', hr:138, cadence:171, gct:232, asymmetry:2.8 },
  { id:3, date:'Tir 25. Feb', type:'Tempo',    color:'#ff6b35', km:8.0,  pace:'5:05', hr:163, cadence:174, gct:224, asymmetry:3.1 },
  { id:4, date:'Søn 23. Feb', type:'Langtur',  color:'#3a7bd5', km:18.6, pace:'6:10', hr:142, cadence:170, gct:240, asymmetry:4.2 },
];

export const DEFAULT_WEEK_PLAN = [
  { day:'Man', workout:'Fartleg 5×800m', km:9.2,  color:'#c8ff00', today:true,  type:'run' },
  { day:'Tir', workout:'Hvile',          km:0,    color:'#2a2a2f', today:false, rest:true },
  { day:'Ons', workout:'Roligt løb',     km:10,   color:'#2ecc71', today:false, type:'run' },
  { day:'Tor', workout:'Styrke 30 min',  km:0,    color:'#a855f7', today:false, type:'cross' },
  { day:'Fre', workout:'Tempoløb',       km:7,    color:'#ff6b35', today:false, type:'run' },
  { day:'Lør', workout:'Hvile',          km:0,    color:'#2a2a2f', today:false, rest:true },
  { day:'Søn', workout:'Langtur',        km:19,   color:'#3a7bd5', today:false, type:'run' },
];

export const DEFAULT_NEXT_WORKOUT = {
  name: { beginner:'Hurtigt løb med pauser', intermediate:'Interval 5×800m', advanced:'Interval 5×800m' },
  desc: {
    beginner: 'Løb hurtigt i 3 minutter, gå i 2 minutter — gentag 5 gange. AI ser at du er udhvilet og klar i dag! 💪',
    intermediate: '5 intervaller à 800m tæt på din anaerobe tærskel. HRV og restitution ser gode ud.',
    advanced: '5×800m @ 4:45/km. HRV 62ms (+13% baseline), ACWR 0.95, Z4-andel mål 71%.',
  },
  km: 9.2, duration: '~52', targetHr: 158, targetPace: '4:45',
};

export const DEFAULT_PROFILE = {
  name: '', age: '', weight: '', height: '',
  sex: 'Mand', yearsRunning: '', weeklyKm: '',
  restingHr: '', maxHr: '', vo2max: '', injuries: '',
  garminConnected: false, appleHealthConnected: false,
};

// ═══════════════════════════════════════════════════════════════════════════════
// AVANCEREDE STATISTIK BEREGNINGER (NY!)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Beregn kalorier forbrændt under løb
 * Baseret på MET (Metabolic Equivalent of Task) metoden
 */
export function calculateCalories(weightKg, distanceKm, durationMins, paceMinPerKm) {
  if (!weightKg || !distanceKm || !durationMins || durationMins <= 0) return null;
  
  // MET værdier baseret på pace (min/km)
  let met;
  if (paceMinPerKm >= 9.0) met = 6.0;
  else if (paceMinPerKm >= 7.5) met = 8.3;
  else if (paceMinPerKm >= 6.5) met = 9.8;
  else if (paceMinPerKm >= 5.5) met = 11.0;
  else if (paceMinPerKm >= 5.0) met = 11.8;
  else if (paceMinPerKm >= 4.5) met = 12.8;
  else if (paceMinPerKm >= 4.0) met = 14.5;
  else met = 16.0;
  
  const calories = met * weightKg * (durationMins / 60);
  return Math.round(calories);
}

/**
 * Beregn ACWR (Acute:Chronic Workload Ratio)
 * Optimal zone: 0.8-1.3, over 1.5 = høj skadesrisiko
 */
export function calculateACWR(runs) {
  if (!runs || runs.length === 0) return null;
  
  const now = Date.now();
  const day = 86400000;
  
  const acute7Days = runs.filter(r => {
    const d = new Date(r.date || r.created_at);
    return (now - d) <= 7 * day;
  });
  const acuteLoad = acute7Days.reduce((sum, r) => sum + (r.km || 0), 0);
  
  const chronic28Days = runs.filter(r => {
    const d = new Date(r.date || r.created_at);
    return (now - d) <= 28 * day;
  });
  const chronicTotalKm = chronic28Days.reduce((sum, r) => sum + (r.km || 0), 0);
  const chronicLoad = chronicTotalKm / 4;
  
  const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;
  
  let riskLevel, riskColor, riskText;
  if (acwr < 0.5) {
    riskLevel = 'undertrained'; riskColor = '#3498db'; riskText = 'Undertrænet - øg gradvist';
  } else if (acwr < 0.8) {
    riskLevel = 'low'; riskColor = '#2ecc71'; riskText = 'Lav belastning - kan øges';
  } else if (acwr <= 1.3) {
    riskLevel = 'optimal'; riskColor = '#27ae60'; riskText = 'Optimal zone - perfekt!';
  } else if (acwr <= 1.5) {
    riskLevel = 'elevated'; riskColor = '#f39c12'; riskText = 'Forhøjet - vær forsigtig';
  } else {
    riskLevel = 'high'; riskColor = '#e74c3c'; riskText = 'Høj risiko - reducer!';
  }
  
  return {
    acwr: Math.round(acwr * 100) / 100,
    acuteLoad: Math.round(acuteLoad * 10) / 10,
    chronicLoad: Math.round(chronicLoad * 10) / 10,
    riskLevel, riskColor, riskText,
  };
}

/**
 * Estimér VO2max fra løbedata
 */
export function estimateVO2max(runs, profile) {
  if (!runs || runs.length === 0) return null;
  
  const validRuns = runs.filter(r => r.km >= 1 && r.pace > 0);
  if (validRuns.length === 0) return null;
  
  const bestPace = Math.min(...validRuns.map(r => r.pace));
  const speedKmH = 60 / bestPace;
  const vo2max = Math.round(speedKmH * 3.5);
  
  const age = profile?.age ? parseInt(profile.age) : 30;
  const sex = profile?.sex?.toLowerCase();
  
  let fitnessLevel, percentile;
  if (sex === 'kvinde' || sex === 'female' || sex === 'f') {
    if (vo2max >= 50) { fitnessLevel = 'Eliteløber'; percentile = 99; }
    else if (vo2max >= 45) { fitnessLevel = 'Fremragende'; percentile = 95; }
    else if (vo2max >= 40) { fitnessLevel = 'Meget god'; percentile = 85; }
    else if (vo2max >= 35) { fitnessLevel = 'God'; percentile = 70; }
    else if (vo2max >= 30) { fitnessLevel = 'Gennemsnitlig'; percentile = 50; }
    else if (vo2max >= 25) { fitnessLevel = 'Under gennemsnit'; percentile = 30; }
    else { fitnessLevel = 'Brug for forbedring'; percentile = 15; }
  } else {
    if (vo2max >= 60) { fitnessLevel = 'Eliteløber'; percentile = 99; }
    else if (vo2max >= 52) { fitnessLevel = 'Fremragende'; percentile = 95; }
    else if (vo2max >= 46) { fitnessLevel = 'Meget god'; percentile = 85; }
    else if (vo2max >= 42) { fitnessLevel = 'God'; percentile = 70; }
    else if (vo2max >= 36) { fitnessLevel = 'Gennemsnitlig'; percentile = 50; }
    else if (vo2max >= 30) { fitnessLevel = 'Under gennemsnit'; percentile = 30; }
    else { fitnessLevel = 'Brug for forbedring'; percentile = 15; }
  }
  
  const ageAdjustedVo2max = vo2max + Math.max(0, (age - 30) * 0.5);
  
  return {
    vo2max, ageAdjustedVo2max: Math.round(ageAdjustedVo2max),
    fitnessLevel, percentile,
    bestPace: Math.round(bestPace * 100) / 100,
  };
}

/**
 * Beregn træningsbelastning (TSS-lignende)
 */
export function calculateTrainingLoad(runs) {
  if (!runs || runs.length === 0) return null;
  
  const now = Date.now();
  const day = 86400000;
  
  const thisWeek = runs.filter(r => {
    const d = new Date(r.date || r.created_at);
    return (now - d) <= 7 * day;
  });
  
  const lastWeek = runs.filter(r => {
    const d = new Date(r.date || r.created_at);
    return (now - d) > 7 * day && (now - d) <= 14 * day;
  });
  
  const calcLoad = (runList) => {
    return runList.reduce((sum, r) => {
      const km = r.km || 0;
      const pace = r.pace || 7;
      const intensityFactor = Math.max(0.5, Math.min(2.0, 1 + (7 - pace) * 0.25));
      return sum + (km * intensityFactor);
    }, 0);
  };
  
  const thisWeekLoad = calcLoad(thisWeek);
  const lastWeekLoad = calcLoad(lastWeek);
  
  let trend, trendColor;
  const pctChange = lastWeekLoad > 0 ? ((thisWeekLoad - lastWeekLoad) / lastWeekLoad) * 100 : 0;
  
  if (pctChange > 15) { trend = '↑↑ Stor stigning'; trendColor = '#e74c3c'; }
  else if (pctChange > 5) { trend = '↑ Øget'; trendColor = '#f39c12'; }
  else if (pctChange >= -5) { trend = '→ Stabil'; trendColor = '#27ae60'; }
  else if (pctChange >= -15) { trend = '↓ Reduceret'; trendColor = '#3498db'; }
  else { trend = '↓↓ Stor reduktion'; trendColor = '#9b59b6'; }
  
  return {
    weeklyLoad: Math.round(thisWeekLoad * 10) / 10,
    lastWeekLoad: Math.round(lastWeekLoad * 10) / 10,
    weeklyRuns: thisWeek.length,
    weeklyKm: Math.round(thisWeek.reduce((s, r) => s + (r.km || 0), 0) * 10) / 10,
    trend, trendColor,
    pctChange: Math.round(pctChange),
  };
}

/**
 * Beregn løbe:gang ratio
 */
export function calculateRunWalkRatio(runningKm, walkingKm) {
  const total = (runningKm || 0) + (walkingKm || 0);
  if (total === 0) return null;
  
  const runPct = Math.round((runningKm / total) * 100);
  return {
    runPct, walkPct: 100 - runPct,
    runningKm: Math.round(runningKm * 100) / 100,
    walkingKm: Math.round(walkingKm * 100) / 100,
    ratio: walkingKm > 0 ? `${Math.round(runningKm / walkingKm * 10) / 10}:1` : 'Kun løb',
  };
}

/**
 * Generer avanceret statistik-sammenfatning til AI coach
 */
export function generateAdvancedStats(runs, profile, level) {
  if (level !== 'advanced' || !runs || runs.length < 3) return '';
  
  const acwr = calculateACWR(runs);
  const vo2max = estimateVO2max(runs, profile);
  const load = calculateTrainingLoad(runs);
  
  if (!acwr && !vo2max && !load) return '';
  
  let stats = '\n═══ AVANCEREDE STATISTIKKER ═══\n';
  
  if (acwr) {
    stats += `ACWR: ${acwr.acwr} (${acwr.riskText})\n`;
    stats += `  - Akut belastning (7d): ${acwr.acuteLoad} km\n`;
    stats += `  - Kronisk gns. (28d/uge): ${acwr.chronicLoad} km\n`;
  }
  
  if (vo2max) {
    stats += `VO2max estimat: ${vo2max.vo2max} ml/kg/min (${vo2max.fitnessLevel})\n`;
    stats += `  - Baseret på bedste pace: ${vo2max.bestPace} min/km\n`;
    stats += `  - Percentil for alder/køn: top ${100 - vo2max.percentile}%\n`;
  }
  
  if (load) {
    stats += `Træningsbelastning denne uge: ${load.weeklyLoad} (${load.trend})\n`;
    stats += `  - Km denne uge: ${load.weeklyKm} km over ${load.weeklyRuns} løb\n`;
    stats += `  - Ændring vs. sidste uge: ${load.pctChange > 0 ? '+' : ''}${load.pctChange}%\n`;
  }
  
  return stats;
}

// ─── DATABASE API ─────────────────────────────────────────────────────────────

// FIX 1: loadProfile — håndter dobbelt-JSON-encoded string fra serveren
export async function loadProfile() {
  try {
    const res = await fetch(`${SERVER}/profile`, { headers: authHeaders() });
    let data = await res.json();
    // Serveren returnerer profil som JSON-string — parse den ekstra gang
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch(e) {}
    }
    return data && typeof data === 'object' && Object.keys(data).length > 0 ? data : null;
  } catch { return null; }
}

// FIX 2: saveProfile — brug PUT (serveren har kun PUT /profile, ikke POST)
export async function saveProfile(profile) {
  try {
    await fetch(`${SERVER}/profile`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(profile),
    });
  } catch (e) { console.error('saveProfile fejl:', e); }
}

export async function loadMessages() {
  try {
    const res = await fetch(`${SERVER}/messages`, { headers: authHeaders() });
    return await res.json();
  } catch { return []; }
}

export async function saveMessages(messages) {
  try {
    await fetch(`${SERVER}/messages`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ messages }),
    });
  } catch (e) { console.error('saveMessages fejl:', e); }
}

export async function clearMessages() {
  try {
    await fetch(`${SERVER}/messages`, { method: 'DELETE', headers: authHeaders() });
  } catch {}
}

export async function loadWeekPlan() {
  try {
    const res = await fetch(`${SERVER}/weekplan`, { headers: authHeaders() });
    let data = await res.json();
    // FIX: håndter dobbelt-JSON-encoded string ligesom profil
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch(e) {}
    }
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch(e) {}
    }
    return data || null;
  } catch { return null; }
}

export async function saveWeekPlan(plan) {
  try {
    await fetch(`${SERVER}/weekplan`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(plan),
    });
  } catch (e) { console.error('saveWeekPlan fejl:', e); }
}

// ─── AI PROFILE ASSESSMENT ────────────────────────────────────────────────────
export function assessProfile(p) {
  if (!p || !p.age) return null;
  const age = parseInt(p.age) || 30;
  const weight = parseFloat(p.weight) || 75;
  const height = parseFloat(p.height) || 175;
  const bmi = weight / ((height / 100) ** 2);
  const restingHr = parseInt(p.restingHr) || 60;
  const maxHr = p.maxHr ? parseInt(p.maxHr) : Math.round(208 - 0.7 * age);
  const hrr = maxHr - restingHr;
  const zone = (lo, hi) => ({ low: Math.round(restingHr + hrr * lo), high: Math.round(restingHr + hrr * hi) });
  return {
    maxHr, restingHr, hrr, bmi: bmi.toFixed(1),
    vo2maxEst: p.vo2max ? parseInt(p.vo2max) : Math.round(15 * (maxHr / restingHr)),
    zones: { 
      z1: zone(.50,.60), 
      z2: zone(.60,.70), 
      z3: zone(.70,.80), 
      z4: zone(.80,.90), 
      z5: zone(.90,1.00) 
    },
    suggestedLevel: (parseInt(p.yearsRunning)>=4 && parseInt(p.weeklyKm)>=50) ? 'advanced'
      : (parseInt(p.yearsRunning)>=2 && parseInt(p.weeklyKm)>=30) ? 'intermediate' : 'beginner',
  };
}

// ─── PULSE ZONE HELPERS ───────────────────────────────────────────────────────
export function getZoneForHR(hr, profile) {
  const assessment = assessProfile(profile);
  if (!assessment) return { zone: 0, name: 'Ukendt', color: colors.muted };
  
  const { zones } = assessment;
  if (hr < zones.z1.low) return { zone: 0, name: 'Hvile', color: colors.muted };
  if (hr <= zones.z1.high) return { zone: 1, name: 'Zone 1', color: colors.zone1, desc: 'Meget let' };
  if (hr <= zones.z2.high) return { zone: 2, name: 'Zone 2', color: colors.zone2, desc: 'Let/Aerob' };
  if (hr <= zones.z3.high) return { zone: 3, name: 'Zone 3', color: colors.zone3, desc: 'Moderat' };
  if (hr <= zones.z4.high) return { zone: 4, name: 'Zone 4', color: colors.zone4, desc: 'Hård/Anaerob' };
  return { zone: 5, name: 'Zone 5', color: colors.zone5, desc: 'Maksimal' };
}

export function getZoneColor(zone) {
  const zoneColors = {
    0: colors.muted,
    1: colors.zone1,
    2: colors.zone2,
    3: colors.zone3,
    4: colors.zone4,
    5: colors.zone5,
  };
  return zoneColors[zone] || colors.muted;
}

// ─── AI CHAT (OPDATERET MED AVANCEREDE STATISTIKKER) ──────────────────────────
export async function sendToAI({ messages, profile, level, weekPlan, nextWorkout, runs }) {
  const a = assessProfile(profile);
  const lv = LEVELS[level] || LEVELS['intermediate'];
  const name = (profile?.name || 'Løber').split(' ')[0];
  const physique = [profile?.age && `${profile.age} år`, profile?.sex, profile?.weight && `${profile.weight} kg`].filter(Boolean).join(', ');
  const zones = a ? `Zone 2: ${a.zones.z2.low}–${a.zones.z2.high} bpm, Zone 4: ${a.zones.z4.low}–${a.zones.z4.high} bpm` : '';
  
  // Bruger præferencer
  const runDays = profile?.preferredDays || profile?.runDays || [];
  const normalizedRunDays = runDays.map(d => normalizeDay(d));
  const runDaysStr = normalizedRunDays.length > 0 ? normalizedRunDays.join(', ') : 'ikke valgt (brug Man, Ons, Fre som default)';
  const runsPerWeek = profile?.weeklyRunsGoal ? parseInt(profile.weeklyRunsGoal) : (runDays.length || 3);
  
  // Niveau-begrænsninger
  const levelLimits = `
VIGTIGE BEGRÆNSNINGER FOR ${level.toUpperCase()}:
- Max km per løb: ${lv.maxKmPerRun} km
- Max km per uge: ${lv.maxKmPerWeek} km
- Minimum hviledage: ${lv.minRestDays} per uge
- Forventet pace: ${lv.paceRange} min/km
${level === 'beginner' ? `
BEGYNDER-REGLER (SKAL FØLGES):
- ALDRIG over 5 km per løb!
- Start med gå/løb intervaller (fx løb 2 min, gå 1 min)
- Fokus på tid, ikke distance
- Langsom opbygning: max 10% stigning per uge
` : ''}`;

  // Plan kontekst
  const planCtx = weekPlan && weekPlan.length > 0
    ? weekPlan.map(d => `${d.day}: ${d.workout}${d.km > 0 ? ' ('+d.km+'km)' : ''}`).join(', ')
    : 'Ingen plan endnu';

  // Løb historik
  const recentRuns = (runs || []).slice(0, 10);
  const totalKmWeek = recentRuns
    .filter(r => { const d = new Date(r.date||r.created_at); return Date.now() - d < 7*86400000; })
    .reduce((s, r) => s + (r.km||0), 0);
  const avgKmPerRun = recentRuns.length > 0
    ? (recentRuns.reduce((s, r) => s + (r.km||0), 0) / recentRuns.length).toFixed(1)
    : 0;
  const lastRunDaysAgo = recentRuns.length > 0
    ? Math.floor((Date.now() - new Date(recentRuns[0].date||recentRuns[0].created_at)) / 86400000)
    : null;
  
  const runsCtx = recentRuns.length > 0
    ? `Seneste løb: ${recentRuns.slice(0,3).map(r => `${r.km}km`).join(', ')}. Gns. per løb: ${avgKmPerRun}km. Km denne uge: ${Math.round(totalKmWeek*10)/10}km. Sidst løbet: ${lastRunDaysAgo === 0 ? 'i dag' : lastRunDaysAgo === 1 ? 'i går' : `${lastRunDaysAgo} dage siden`}.`
    : 'Ingen løb endnu — ny løber!';

  // Kalorieberegning for seneste løb
  let caloriesCtx = '';
  if (profile?.weight && recentRuns.length > 0) {
    const lastRun = recentRuns[0];
    const durationMins = (lastRun.duration || 0) / 60;
    if (durationMins > 0) {
      const cals = calculateCalories(
        parseFloat(profile.weight),
        lastRun.km || 0,
        durationMins,
        lastRun.pace || 7
      );
      if (cals) {
        caloriesCtx = `\nSeneste løb forbrændte ca. ${cals} kalorier.`;
      }
    }
  }

  // Avancerede statistikker (kun for advanced niveau)
  const advancedStats = generateAdvancedStats(runs, profile, level);

  // Dato kontekst
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dayNames = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
  const todayDayName = dayNames[today.getDay()];
  
  // Næste træning (niveau-tilpasset)
  const nextKm = typeof nextWorkout.km === 'object' ? nextWorkout.km[level] : nextWorkout.km;
  const nextName = typeof nextWorkout.name === 'object' ? nextWorkout.name[level] : nextWorkout.name;

  const systemPrompt = `Du er RunWithAI — en empatisk, proaktiv AI løbecoach.

═══ BRUGER INFO ═══
Navn: ${name}
Fysik: ${physique || 'ikke oplyst'}
Pulszoner: ${zones || 'ikke beregnet'}
Niveau: ${level} (${lv.label})
Kommunikationsstil: ${lv.aiStyle}

═══ BRUGERENS PRÆFERENCER ═══
Ønskede løbedage: ${runDaysStr}
Antal løb per uge: ${runsPerWeek}

${levelLimits}

═══ NUVÆRENDE STATUS ═══
Eksisterende ugeplan: ${planCtx}
Næste planlagte træning: ${nextName} (${nextKm}km)
${runsCtx}${caloriesCtx}
${advancedStats}

═══ I DAG ═══
Dato: ${todayStr} (${todayDayName})

═══ REGLER FOR PLANLÆGNING ═══
1. RESPEKTER ALTID brugerens valgte løbedage (${runDaysStr})
2. Læg KUN løb på de dage brugeren har valgt
3. Andre dage skal være "Hvile" eller "Styrke/Mobilitet"
4. Hold dig ALTID inden for niveau-begrænsningerne

═══ FARVE-KODER TIL PLAN ═══
- Roligt løb: #2ecc71 (grøn)
- Interval/Fartleg: #c8ff00 (lime)
- Tempo: #ff6b35 (orange)
- Langtur: #3a7bd5 (blå)
- Hvile: #2a2a2f (mørk)
- Styrke/Cross: #a855f7 (lilla)

═══ TRIGGER-ORD FOR PLANÆNDRING ═══
Når brugeren nævner: "træt", "ondt", "kort", "flyt", "skift", "reducer", "øg", "frisk", "tid", "i morgen", "hvile", "tilføj", "lav en plan", "ny plan", "opdater plan", "ændr plan"
→ Lav ALTID konkret planændring med <plan_update>. Spørg IKKE om lov.

═══ FORMAT TIL PLANÆNDRING ═══
<plan_update>
{
  "changeNote": "kort forklaring af ændringen",
  "nextWorkout": {
    "name": "Træningsnavn",
    "desc": "Beskrivelse tilpasset niveau",
    "km": 4.0,
    "duration": "~30",
    "targetPace": "7:00",
    "targetHr": 140
  },
  "weekPlan": [
    {"day": "Man", "workout": "Roligt løb", "km": 3, "color": "#2ecc71", "type": "run", "description": "Let løb i samtaletempo"},
    {"day": "Tir", "workout": "Hvile", "km": 0, "color": "#2a2a2f", "type": "rest", "rest": true},
    {"day": "Ons", "workout": "Interval", "km": 4, "color": "#c8ff00", "type": "run", "description": "5x2 min hurtigt med 1 min pause"},
    {"day": "Tor", "workout": "Hvile", "km": 0, "color": "#2a2a2f", "type": "rest", "rest": true},
    {"day": "Fre", "workout": "Roligt løb", "km": 3, "color": "#2ecc71", "type": "run", "description": "Afslappet løb"},
    {"day": "Lør", "workout": "Hvile", "km": 0, "color": "#2a2a2f", "type": "rest", "rest": true},
    {"day": "Søn", "workout": "Langtur", "km": 5, "color": "#3a7bd5", "type": "run", "description": "Ugens længste løb, roligt tempo"}
  ]
}
</plan_update>

VIGTIGT: weekPlan SKAL have alle 7 dage (Man-Søn)!
Brug KORTE dagnavne: Man, Tir, Ons, Tor, Fre, Lør, Søn

═══ KOMMUNIKATION ═══
- Svar på dansk
- Max 2-3 sætninger (brugeren vil have action, ikke lange forklaringer)
- Vær direkte og konkret
${level === 'advanced' ? `
═══ AVANCERET NIVEAU KOMMUNIKATION ═══
- Brug teknisk terminologi frit: ACWR, VO2max, TSS, HRV, GCT
- Kommenter på ACWR hvis det er uden for optimal zone (0.8-1.3)
- Referer til VO2max og fitnessniveau når relevant
` : ''}`;

  const res = await fetch(`${SERVER}/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
    }),
  });
  const data = await res.json();
  let text = data.content?.[0]?.text || 'Fejl — prøv igen.';

  let planUpdate = null;
  const match = text.match(/<plan_update>([\s\S]*?)<\/plan_update>/);
  if (match) {
    try {
      planUpdate = JSON.parse(match[1].trim());
      if (planUpdate?.weekPlan) {
        planUpdate.weekPlan = planUpdate.weekPlan.map(d => ({
          ...d,
          day: normalizeDay(d.day),
          rest: d.rest || d.type === 'rest' || d.workout === 'Hvile',
        }));
      }
    } catch (e) {
      console.error('Kunne ikke parse plan_update:', e);
    }
    text = text.replace(/<plan_update>[\s\S]*?<\/plan_update>/, '').trim();
  }

  const aiMsg = { role: 'assistant', text };
  const allMessages = [...messages, aiMsg].map(m => ({
    role: m.role === 'ai' ? 'assistant' : m.role,
    text: m.text,
  }));
  saveMessages(allMessages).catch(e => console.error('Kunne ikke gemme beskeder:', e));

  return { text, planUpdate };
}

// ─── RUNS API ─────────────────────────────────────────────────────────────────
export async function loadRuns() {
  try {
    const res = await fetch(`${SERVER}/runs`, { headers: authHeaders() });
    return await res.json();
  } catch { return []; }
}

export async function saveRun(run) {
  try {
    const res = await fetch(`${SERVER}/runs`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(run),
    });
    return await res.json();
  } catch (e) { console.error('saveRun fejl:', e); return null; }
}

export async function deleteRun(runId) {
  try {
    await fetch(`${SERVER}/runs/${runId}`, { method: 'DELETE', headers: authHeaders() });
    return true;
  } catch { return false; }
}

// ─── TRAINING PLAN API ────────────────────────────────────────────────────────
export async function loadTrainingPlan() {
  try {
    const res = await fetch(`${SERVER}/trainingplan`, { headers: authHeaders() });
    const plan = await res.json();
    if (!plan) return null;
    // FIX: parse dobbelt-JSON-encoded data felt
    if (plan.data && typeof plan.data === 'string') {
      try { plan.data = JSON.parse(plan.data); } catch {}
    }
    if (plan.data && typeof plan.data === 'string') {
      try { plan.data = JSON.parse(plan.data); } catch {}
    }
    return plan;
  } catch { return null; }
}

export async function generateTrainingPlan(profile, level, recentRuns) {
  try {
    const res = await fetch(`${SERVER}/trainingplan/generate`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ profile, level, recentRuns }),
    });
    return await res.json();
  } catch (e) { console.error('generatePlan fejl:', e); return null; }
}

// ─── BADGES & ACHIEVEMENTS API ────────────────────────────────────────────────
export async function loadBadges() {
  try {
    const res = await fetch(`${SERVER}/badges`, { headers: authHeaders() });
    return await res.json();
  } catch { return { earned: [], progress: {} }; }
}

export async function checkAndAwardBadges(runs) {
  try {
    const res = await fetch(`${SERVER}/badges/check`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ runs }),
    });
    return await res.json();
  } catch { return { newBadges: [] }; }
}

// ─── STREAK API ───────────────────────────────────────────────────────────────
export async function loadStreak() {
  try {
    const res = await fetch(`${SERVER}/streak`, { headers: authHeaders() });
    return await res.json();
  } catch { return { currentStreak: 0, longestStreak: 0, lastRunDate: null }; }
}

export function calculateStreak(runs) {
  if (!runs || runs.length === 0) return { current: 0, longest: 0 };
  
  // Sorter løb efter dato (nyeste først)
  const sortedRuns = [...runs].sort((a, b) => 
    new Date(b.date || b.created_at) - new Date(a.date || a.created_at)
  );
  
  // Få unikke datoer
  const runDates = [...new Set(sortedRuns.map(r => {
    const d = new Date(r.date || r.created_at);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }))].sort().reverse();
  
  if (runDates.length === 0) return { current: 0, longest: 0 };
  
  // Check om der er løbet i dag eller i går
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;
  
  // Tæl nuværende streak
  if (runDates[0] === todayStr || runDates[0] === yesterdayStr) {
    currentStreak = 1;
    let checkDate = new Date(runDates[0]);
    
    for (let i = 1; i < runDates.length; i++) {
      checkDate.setDate(checkDate.getDate() - 1);
      const checkStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth()+1).padStart(2,'0')}-${String(checkDate.getDate()).padStart(2,'0')}`;
      
      if (runDates[i] === checkStr) {
        currentStreak++;
      } else {
        break;
      }
    }
  }
  
  // Find længste streak
  for (let i = 1; i < runDates.length; i++) {
    const prevDate = new Date(runDates[i-1]);
    const currDate = new Date(runDates[i]);
    const diffDays = Math.round((prevDate - currDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak);
  
  return { current: currentStreak, longest: longestStreak };
}

// ─── SOCIAL FEED API ──────────────────────────────────────────────────────────
export async function loadFeed() {
  try {
    const res = await fetch(`${SERVER}/friends/feed`, { headers: authHeaders() });
    return await res.json();
  } catch { return { feed: [] }; }
}

// FIX 3: shareRun — brug Server.js feltnavne (duration, pace, heart_rate)
export async function shareRun(run, comment = '') {
  try {
    const res = await fetch(`${SERVER}/runs/share`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({
        run_id: run.id,
        km: run.km,
        duration: run.duration || run.duration_secs,
        pace: run.pace || run.pace_secs_per_km,
        heart_rate: run.heart_rate || run.avg_hr,
        ai_comment: comment,
      }),
    });
    return await res.json();
  } catch { return null; }
}

export async function addComment(shareId, comment) {
  try {
    const res = await fetch(`${SERVER}/shared/${shareId}/comment`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ comment }),
    });
    return await res.json();
  } catch { return null; }
}

export async function giveKudos(shareId, emoji = '🔥') {
  try {
    const res = await fetch(`${SERVER}/shared/${shareId}/kudos`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ emoji }),
    });
    return await res.json();
  } catch { return null; }
}

export async function loadFriends() {
  try {
    const res = await fetch(`${SERVER}/friends`, { headers: authHeaders() });
    return await res.json();
  } catch { return { friends: [], pending: [] }; }
}

export async function addFriend(email) {
  try {
    const res = await fetch(`${SERVER}/friends/request`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ email }),
    });
    return await res.json();
  } catch { return { error: 'Fejl' }; }
}

export async function respondToFriendRequest(userId, accept) {
  try {
    const res = await fetch(`${SERVER}/friends/${userId}/respond`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ accept }),
    });
    return await res.json();
  } catch { return { error: 'Fejl' }; }
}

// ─── GARMIN CONNECT API ───────────────────────────────────────────────────────
export async function connectGarmin(authCode) {
  try {
    const res = await fetch(`${SERVER}/integrations/garmin/connect`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ authCode }),
    });
    return await res.json();
  } catch { return { error: 'Kunne ikke forbinde til Garmin' }; }
}

export async function disconnectGarmin() {
  try {
    const res = await fetch(`${SERVER}/integrations/garmin/disconnect`, {
      method: 'POST', headers: authHeaders(),
    });
    return await res.json();
  } catch { return { error: 'Fejl' }; }
}

export async function syncGarminActivities() {
  try {
    const res = await fetch(`${SERVER}/integrations/garmin/sync`, {
      method: 'POST', headers: authHeaders(),
    });
    return await res.json();
  } catch { return { error: 'Sync fejlede', activities: [] }; }
}

export function getGarminConnectUrl() {
  const clientId = 'GARMIN_CLIENT_ID'; // Skal erstattes med rigtig client ID
  const redirectUri = encodeURIComponent(`${SERVER}/integrations/garmin/callback`);
  return `https://connect.garmin.com/oauthConfirm?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=activity_export`;
}

// ─── APPLE HEALTH (via webhook/manuel upload) ─────────────────────────────────
export async function importAppleHealthData(workouts) {
  try {
    const res = await fetch(`${SERVER}/integrations/apple-health/import`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ workouts }),
    });
    return await res.json();
  } catch { return { error: 'Import fejlede' }; }
}

// ─── OFFLINE SUPPORT ──────────────────────────────────────────────────────────
const OFFLINE_RUNS_KEY = 'runwithai_offline_runs';
const OFFLINE_QUEUE_KEY = 'runwithai_sync_queue';

export function saveRunOffline(run) {
  try {
    const offlineRuns = JSON.parse(localStorage.getItem(OFFLINE_RUNS_KEY) || '[]');
    offlineRuns.push({ ...run, offlineId: Date.now(), synced: false });
    localStorage.setItem(OFFLINE_RUNS_KEY, JSON.stringify(offlineRuns));
    
    // Tilføj til sync-kø
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    queue.push({ type: 'run', data: run, timestamp: Date.now() });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    
    return true;
  } catch { return false; }
}

export function getOfflineRuns() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_RUNS_KEY) || '[]');
  } catch { return []; }
}

export async function syncOfflineData() {
  try {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    if (queue.length === 0) return { synced: 0 };
    
    let synced = 0;
    const remaining = [];
    
    for (const item of queue) {
      try {
        if (item.type === 'run') {
          await saveRun(item.data);
          synced++;
        }
      } catch {
        remaining.push(item);
      }
    }
    
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    
    // Marker offline løb som synced
    if (synced > 0) {
      const offlineRuns = getOfflineRuns();
      const updated = offlineRuns.map(r => ({ ...r, synced: true }));
      localStorage.setItem(OFFLINE_RUNS_KEY, JSON.stringify(updated));
    }
    
    return { synced, remaining: remaining.length };
  } catch { return { synced: 0, error: 'Sync fejlede' }; }
}

export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// ─── CACHE HELPERS ────────────────────────────────────────────────────────────
const CACHE_PREFIX = 'runwithai_cache_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutter

export function setCache(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {}
}

export function getCache(key) {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_PREFIX + key));
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
  } catch {}
  return null;
}

export function clearCache() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_PREFIX))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}
