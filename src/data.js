// ─── THEME ────────────────────────────────────────────────────────────────────
// Coach-hjerne: dagens personlige hilsen (genereres og caches paa serveren).
export async function loadCoachGreeting() {
  try {
    const res = await fetch(`${SERVER}/coach-greeting`, { headers: authHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return (data && data.greeting) || null;
  } catch (e) {
    return null;
  }
}

export const colors = {
  // Rebrand: dyb skovgroen + mint - moerkt, roligt, praecist
  black:     '#F4FBF8',
  surface:   '#10201A',
  card:      '#132720',
  card2:     '#182E26',
  border:    '#1E3A30',
  border2:   '#2A4A3E',
  accent:    '#19D392',
  accent2:   '#2EE6A8',
  blue:      '#4DA3FF',
  green:     '#2EE6A8',
  purple:    '#B18CFF',
  red:       '#FF5C7A',
  yellow:    '#FFC24D',
  muted:     '#7FA396',
  text:      '#F4FBF8',
  dim:       '#A9C4BA',
  secondary: '#19D392',
  bg:        '#0B1712',
  zone1:     '#4DA3FF',
  zone2:     '#2EE6A8',
  zone3:     '#FFD84D',
  zone4:     '#FF9950',
  zone5:     '#FF5C5C',
};

// ─── SERVER URL ───────────────────────────────────────────────────────────────
export const SERVER = 'https://runwithai-server-production.up.railway.app';

// ─── AUTH TOKEN ────────────────────────────────────────────────────────────────────────────
import AsyncStorageLib from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
const TOKEN_KEY = 'runwithai_token';
const LEGACY_TOKEN_KEYS = ['token', 'authToken', 'accessToken'];
const IOS_SECURE_STORE_OPTIONS = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};
let _token = null;

async function readLegacyNativeToken() {
  const keys = [TOKEN_KEY, ...LEGACY_TOKEN_KEYS];
  const entries = await AsyncStorageLib.multiGet(keys);
  return entries.find(([, value]) => Boolean(value))?.[1] || null;
}

// iOS keeps the session in Keychain so App Store updates cannot discard it.
// Existing AsyncStorage sessions are migrated automatically on first launch.
export async function initAuthToken() {
  try {
    if (Platform.OS === 'web') {
      _token = localStorage.getItem(TOKEN_KEY) || null;
    } else if (Platform.OS === 'ios') {
      _token = await SecureStore.getItemAsync(TOKEN_KEY, IOS_SECURE_STORE_OPTIONS);
      if (!_token) {
        _token = await readLegacyNativeToken();
        if (_token) {
          await SecureStore.setItemAsync(TOKEN_KEY, _token, IOS_SECURE_STORE_OPTIONS);
        }
      }
    } else {
      _token = await readLegacyNativeToken();
    }
  } catch (e) {
    // Keep compatibility with installations where Keychain is unavailable.
    try {
      _token = Platform.OS === 'web'
        ? localStorage.getItem(TOKEN_KEY) || null
        : await readLegacyNativeToken();
    } catch {
      _token = null;
    }
  }

  return _token;
}

export async function setAuthToken(token) {
  _token = token;
  try {
    if (Platform.OS === 'web') {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } else if (Platform.OS === 'ios') {
      if (token) {
        await SecureStore.setItemAsync(TOKEN_KEY, token, IOS_SECURE_STORE_OPTIONS);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY, IOS_SECURE_STORE_OPTIONS);
      }

      // Remove unencrypted and obsolete copies after migration/logout.
      await AsyncStorageLib.multiRemove([TOKEN_KEY, ...LEGACY_TOKEN_KEYS]);
    } else {
      if (token) await AsyncStorageLib.setItem(TOKEN_KEY, token);
      else await AsyncStorageLib.multiRemove([TOKEN_KEY, ...LEGACY_TOKEN_KEYS]);
    }
  } catch (e) {
    // If Keychain is temporarily unavailable, preserve the session in the
    // existing native store rather than forcing the user through sign-up.
    if (Platform.OS !== 'web') {
      try {
        if (token) await AsyncStorageLib.setItem(TOKEN_KEY, token);
        else await AsyncStorageLib.multiRemove([TOKEN_KEY, ...LEGACY_TOKEN_KEYS]);
      } catch {}
    }
  }
}
export function getAuthToken() { return _token; }
function authHeaders() {
  return { 'Content-Type': 'application/json', ...(_token ? { Authorization: `Bearer ${_token}` } : {}) };
}
// ─── LEVELS ───────────────────────────────────────────────────────────────────
export const LEVELS = {
  beginner: {
    id: 'beginner', label: 'Begynder', emoji: '🌱', color: '#2ecc71',
    desc: 'Ny til løb — enkle ord, ingen jargon',
    aiStyle: 'Forklar som til en nybegynder. Brug simple ord. Ingen forkortelser. Fokusér på: er det godt eller dårligt, og hvad skal jeg gøre.',
  },
  intermediate: {
    id: 'intermediate', label: 'Øvet', emoji: '🏃', color: '#ff6b35',
    desc: 'Løber regelmæssigt, kender grundlæggende begreber',
    aiStyle: 'Brug løbebegreber som tempo, zone 2, HRV. Forklar kort hvad tallene betyder. Giv konkrete anbefalinger.',
  },
  advanced: {
    id: 'advanced', label: 'Avanceret', emoji: '⚡', color: '#c8ff00',
    desc: 'Erfaren løber, forstår alle træningsdata',
    aiStyle: 'Brug fuld terminologi: ACWR, GCT, VO2max, HRV, asymmetri. Vær præcis og teknisk.',
  },
};

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

export async function logMealPlan(meals) {
  try {
    const results = [];
    for (const meal of meals) {
      const res = await fetch(SERVER + '/meal-plan/log', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ meal: meal, eaten_at: new Date().toISOString() }),
      });
      const rawText = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseErr) {
        throw new Error('Server returnerede ikke JSON. Status ' + res.status + ': ' + rawText.substring(0, 100));
      }
      if (!res.ok) {
        throw new Error(parsed.error || 'Server fejl');
      }
      results.push(parsed);
    }
    return { success: true, logged: results.length, results };
  } catch (e) {
    console.error('logMealPlan error:', e);
    throw e;
  }
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

// ─── AI CHAT ──────────────────────────────────────────────────────────────────
const AI_RESPONSE_LANGUAGES = {
  da: 'Danish', en: 'English', de: 'German', fr: 'French', es: 'Spanish',
  it: 'Italian', pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', sv: 'Swedish',
  fi: 'Finnish', el: 'Greek', cs: 'Czech', ro: 'Romanian', hu: 'Hungarian',
  bg: 'Bulgarian', hr: 'Croatian', sk: 'Slovak', sl: 'Slovenian',
  lt: 'Lithuanian', lv: 'Latvian', et: 'Estonian', ga: 'Irish', mt: 'Maltese',
};

export async function sendToAI({ messages, profile, level, weekPlan, nextWorkout, runs, language, fallbackError }) {
  console.log('=== SENDTOAI KALDES ===', new Date().toISOString());
  const languageCode = String(language || 'en').toLowerCase().split('-')[0];
  const responseLanguage = AI_RESPONSE_LANGUAGES[languageCode] || AI_RESPONSE_LANGUAGES.en;
  const a = assessProfile(profile);
  const lv = LEVELS[level] || LEVELS['intermediate'];
  const name = (profile?.name || 'Runner').split(' ')[0];
  const physique = [profile?.age && `${profile.age} years`, profile?.sex, profile?.weight && `${profile.weight} kg`].filter(Boolean).join(', ');
  const zones = a ? `Zone 2: ${a.zones.z2.low}–${a.zones.z2.high} bpm, Zone 4: ${a.zones.z4.low}–${a.zones.z4.high} bpm` : '';
  const planCtx = (weekPlan || []).map(d => `${d.day}: ${d.workout}${d.km > 0 ? ' ('+d.km+'km)' : ''}`).join(', ');

  const recentRuns = (runs || []).slice(0, 5);
  const totalKmWeek = recentRuns
    .filter(r => { const d = new Date(r.date||r.created_at); return Date.now() - d < 7*86400000; })
    .reduce((s, r) => s + (r.km||0), 0);
  const lastRunDaysAgo = recentRuns.length > 0
    ? Math.floor((Date.now() - new Date(recentRuns[0].date||recentRuns[0].created_at)) / 86400000)
    : null;
  const runsCtx = recentRuns.length > 0
    ? `Seneste løb: ${recentRuns.slice(0,3).map(r => `${r.km}km`).join(', ')}. Km denne uge: ${Math.round(totalKmWeek*10)/10}km. Sidst løbet: ${lastRunDaysAgo === 0 ? 'i dag' : lastRunDaysAgo === 1 ? 'i går' : `${lastRunDaysAgo} dage siden`}.`
    : 'Ingen løb endnu.';

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Byg medicinsk profil-sektion (kun hvis brugeren har en aktiv profil)
  let medicalProfileBlock = '';
  const bar = profile?.bariatricAIContext;
  const dia = profile?.diabetesAIContext;
  if (bar || dia) {
    const parts = ['', '═══ BRUGERENS MEDICINSKE PROFIL ═══'];
    if (bar) {
      parts.push('GASTRIC SLEEVE/BYPASS:');
      parts.push(bar.summary);
      parts.push('SIKKERHEDSREGLER (skal følges i ALLE svar):');
      bar.safetyRules.forEach(r => parts.push('- ' + r));
    }
    if (dia) {
      parts.push('DIABETES:');
      parts.push(dia.summary);
      parts.push('SIKKERHEDSREGLER (skal følges i ALLE svar):');
      dia.safetyRules.forEach(r => parts.push('- ' + r));
    }
    parts.push('VIGTIGT: Du er IKKE læge. Foreslå ALDRIG konkrete medicin-doser. Henvis til brugerens behandler ved tvivl.');
    parts.push('═══════════════════════════════════');
    medicalProfileBlock = parts.join('\n');
  }

  const nextWorkoutName = nextWorkout?.name?.[level] || nextWorkout?.name || '';
  const nextWorkoutKm = nextWorkout?.km || 0;
  const systemPrompt = `CRITICAL LANGUAGE RULE: Respond only in ${responseLanguage}. This applies to every visible sentence and to all names and descriptions inside JSON. Ignore the language used by this instruction, earlier messages, examples, and stored plans. Never fall back to Danish or English unless ${responseLanguage} is that language.

You are RunWithAI, an empathetic and proactive health, fitness and running coach. Help with running, strength training, nutrition and meal planning. When the user asks about food or nutrition, focus on that and do not mention running unless relevant.
User: ${name}. ${physique}. ${zones}. Level: ${level}. Coaching style: ${lv.aiStyle}
Current plan: ${planCtx || 'No plan yet'}. Next workout: ${nextWorkoutName} (${nextWorkoutKm} km).
Recent activity: ${runsCtx}
Today: ${todayStr}. Tomorrow: ${tomorrowStr}.

PLAN CHANGES: Understand requests in any language. When the user mentions fatigue, pain, lack of time, weather, or asks to move, shorten, reduce, increase, rest, add, walk, resume or otherwise change training, always return a concrete change inside <plan_update>. Do not ask permission; make the safe change and explain it briefly.

MEAL PLANS: Understand requests in any language. When the user asks for a meal plan, food suggestions, recipes, weight-loss nutrition, muscle-gain nutrition, calorie guidance or meal ideas, always return a concrete plan inside <meal_plan> so it can be logged with one tap.

Meal-plan format (only for meal-plan requests; translate all visible values into ${responseLanguage}):
<meal_plan>{"goal":"lose_fat|maintain|gain_muscle","totalKcal":2000,"meals":[{"meal_type":"breakfast","name":"Havregrød med bær","kcal":350,"protein_g":15,"carbs_g":55,"fat_g":8,"description":"60g havregryn, 200ml mælk, håndfuld bær"},{"meal_type":"lunch","name":"...","kcal":...,"protein_g":...,"carbs_g":...,"fat_g":...,"description":"..."}]}</meal_plan>
Create 4-5 meals. meal_type must remain one of: breakfast, lunch, dinner, snack.

Plan-change format (only when changing the plan; translate all visible values into ${responseLanguage}):
<plan_update>{"changeNote":"kort forklaring","nextWorkout":{"name":"navn","desc":"beskrivelse","km":9.0,"duration":"~50","targetPace":"5:00","targetHr":155},"weekPlan":[{"day":"Man","workout":"navn","km":9,"color":"#c8ff00","type":"run","description":"konkret beskrivelse"}]}</plan_update>
Every weekPlan item must contain a date in YYYY-MM-DD format. Use the actual dates from the current plan. Return at most 28 days and only the days that change. If training resumes after a break, use the correct new dates.

FINAL CHECK: Reply only in ${responseLanguage}, including explanations, workout names, descriptions, changeNote and meal-plan text. Keep the visible reply to 2-3 direct, concrete sentences.
${medicalProfileBlock}`;

console.log('[DEBUG] System prompt length:', systemPrompt.length);
  console.log('[DEBUG] Contains meal_plan:', systemPrompt.includes('<meal_plan>'));
  console.log('[DEBUG] Contains MADPLAN:', systemPrompt.includes('MADPLAN'));

  const res = await fetch(`${SERVER}/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      language: languageCode,
      responseLanguage,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
    }),
  });
  const data = await res.json();
  let text = data.content?.[0]?.text || fallbackError || 'Something went wrong — please try again.';

  let planUpdate = null;
  const match = text.match(/<plan_update>([\s\S]*?)<\/plan_update>/);
  if (match) {
    try {
      planUpdate = JSON.parse(match[1].trim());
      const dayMap = { 'Mandag':'Man','Tirsdag':'Tir','Onsdag':'Ons','Torsdag':'Tor','Fredag':'Fre','Lørdag':'Lør','Søndag':'Søn' };
      if (planUpdate?.weekPlan) {
        planUpdate.weekPlan = planUpdate.weekPlan.map(d => ({
          ...d, day: dayMap[d.day] || d.day
        }));
      }
    } catch {}
    text = text.replace(/<plan_update>[\s\S]*?<\/plan_update>/, '').trim();
  }
let mealPlan = null;
  const mpMatch = text.match(/<meal_plan>([\s\S]*?)<\/meal_plan>/);
  if (mpMatch) {
    try {
      mealPlan = JSON.parse(mpMatch[1].trim());
    } catch (e) {
      console.log('meal_plan parse error:', e.message);
    }
    text = text.replace(/<meal_plan>[\s\S]*?<\/meal_plan>/, '').trim();
  }
  const aiMsg = { role: 'assistant', text };
  const allMessages = [...messages, aiMsg].map(m => ({
    role: m.role === 'ai' ? 'assistant' : m.role,
    text: m.text,
  }));
  saveMessages(allMessages).catch(e => console.error('Kunne ikke gemme beskeder:', e));

  return { text, planUpdate, mealPlan };
}

// ─── RUNS API ─────────────────────────────────────────────────────────────────
export async function loadRuns() {
  try {
    const res = await fetch(`${SERVER}/runs`, { headers: authHeaders() });
    const runs = await res.json();
    const baseRuns = Array.isArray(runs) ? runs : [];
    let activities = [];
    try { activities = await loadActivities(); } catch (e) { activities = []; }
    const merged = [...baseRuns, ...activities];
    merged.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return merged;
  } catch { return []; }
}

// Henter cykel-/andre aktiviteter fra /activities og normaliserer dem til samme form som runs
export async function loadActivities() {
  try {
    const res = await fetch(`${SERVER}/activities`, { headers: authHeaders() });
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    return list.map((a) => {
            const distM = a.bike_distance_m != null ? a.bike_distance_m : (a.run_distance_m != null ? a.run_distance_m : a.distance_m);
      const km = distM != null ? distM / 1000 : (a.km || 0);
      const durationSec = a.duration_sec != null ? a.duration_sec : (a.duration || 0);
      const calories = a.calories_kcal != null ? a.calories_kcal : (a.calories || 0);
      const paceSec = a.avg_pace_sec_per_km != null ? a.avg_pace_sec_per_km
        : (km > 0 ? Math.round(durationSec / km) : 0);
      return {
        id: a.id,
        user_id: a.user_id,
        type: a.type || 'bike',
        date: a.started_at || a.date,
        km,
        duration: durationSec,
        pace: paceSec,
        calories,
        avg_speed_kmh: a.avg_speed_kmh != null ? a.avg_speed_kmh : null,
        max_speed_kmh: a.max_speed_kmh != null ? a.max_speed_kmh : null,
        heart_rate: a.avg_hr != null ? a.avg_hr : null,
        max_hr: a.max_hr != null ? a.max_hr : null,
        cadence: a.cadence_avg != null ? a.cadence_avg : null,
        total_ascent: a.total_ascent_m != null ? a.total_ascent_m : null,
        total_descent: a.total_descent_m != null ? a.total_descent_m : null,
        total_steps: a.total_steps != null ? a.total_steps : null,
                        route: (() => { const poly = a.bike_gps_polyline || a.run_gps_polyline || a.gps_polyline; try { return typeof poly === 'string' ? JSON.parse(poly) : (poly || a.route || null); } catch { return null; } })(),
        splits: a.splits || null,
        hr_samples: a.hr_samples || null,
        isActivity: true,
        notes: a.notes || null,
      };
    });
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

export async function generateTrainingPlan(profile, level, recentRuns, language) { try { global._planErr = null; } catch(_e){} const _ctrl = new AbortController(); const _to = setTimeout(function(){ _ctrl.abort(); }, 25000);
  try {
    const res = await fetch(`${SERVER}/trainingplan/generate`, { signal: _ctrl.signal,
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ profile, level, recentRuns, language }),
    }); if (!res.ok) { clearTimeout(_to); try { global._planErr = 'HTTP ' + res.status; } catch(_e){} return null; } clearTimeout(_to);
    return await res.json();
  } catch (e) { clearTimeout(_to); console.error('generatePlan fejl:', e); try { global._planErr = (e && ((e.name||'Error')+': '+(e.message||''))) || 'ukendt'; } catch(_e){} return null; }
}

// ── Plan -> kalender-datoer ──────────────────────────────────────────────
// AI'en genererer alle 28 dage som ET fladt weekPlan-array (verificeret
// live mod /trainingplan/generate: { summary, weekPlan: [28 x {day, title,
// workout, km, rest}] }). RunCalendar mapper udelukkende paa session.date
// ('YYYY-MM-DD') og forventer et ARRAY af uger med days. Derfor: dag i =
// mandag (denne uge) + i dage, delt i uger af 7. Hele kaeden er bevist
// ende-til-ende mod produktionsserveren inkl. RunCalendar-simulation.
function toIsoDate(d) {
  const p = x => String(x).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

export function expandPlanToWeeks(plan) {
  const days = Array.isArray(plan && plan.weekPlan) ? plan.weekPlan
    : (Array.isArray(plan) ? plan : null);
  if (!days || days.length === 0) return plan;
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weeks = [];
  for (let i = 0; i < days.length; i++) {
    const w = Math.floor(i / 7);
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    if (!weeks[w]) weeks[w] = { week: w + 1, days: [] };
    weeks[w].days.push({ ...days[i], date: toIsoDate(dt), week: w + 1 });
  }
  return weeks;
}

// Gemmer den genererede plan paa serveren (training_plan-tabellen, UPSERT),
// saa kalenderen/RunCalendar kan laese den via loadTrainingPlan.
// VIGTIGT: /trainingplan/save kraever auth (authMiddleware paa serveren) -
// derfor authHeaders(), praecis som loadTrainingPlan. Generate-endpointet er
// auth-frit, saa den oprindelige klon herfra manglede tokenet (tavs 401).
export async function saveTrainingPlan(plan) {
  try {
    const res = await fetch(`${SERVER}/trainingplan/save`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ data: expandPlanToWeeks(plan) }),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
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
