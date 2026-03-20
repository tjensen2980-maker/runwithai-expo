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
};

// ─── SERVER URL ───────────────────────────────────────────────────────────────
export const SERVER = 'https://runwithai-server-production.up.railway.app';

// ─── AUTH TOKEN ───────────────────────────────────────────────────────────────
const TOKEN_KEY = 'runwithai_token';
let _token = null;

// Hent gemt token ved opstart
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
};

// ─── DATABASE API ─────────────────────────────────────────────────────────────
export async function loadProfile() {
  try {
    const res = await fetch(`${SERVER}/profile`, { headers: authHeaders() });
    const data = await res.json();
    return Object.keys(data).length > 0 ? data : null;
  } catch { return null; }
}

export async function saveProfile(profile) {
  try {
    await fetch(`${SERVER}/profile`, {
      method: 'POST',
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

// GEM BESKEDER TIL DATABASE
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
    const data = await res.json();
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
    zones: { z1: zone(.50,.60), z2: zone(.60,.70), z3: zone(.70,.80), z4: zone(.80,.90), z5: zone(.90,1.00) },
    suggestedLevel: (parseInt(p.yearsRunning)>=4 && parseInt(p.weeklyKm)>=50) ? 'advanced'
      : (parseInt(p.yearsRunning)>=2 && parseInt(p.weeklyKm)>=30) ? 'intermediate' : 'beginner',
  };
}

// ─── AI CHAT ──────────────────────────────────────────────────────────────────
export async function sendToAI({ messages, profile, level, weekPlan, nextWorkout, runs }) {
  const a = assessProfile(profile);
  const lv = LEVELS[level] || LEVELS['intermediate'];
  const name = (profile.name || 'Løber').split(' ')[0];
  const physique = [profile.age && `${profile.age} år`, profile.sex, profile.weight && `${profile.weight} kg`].filter(Boolean).join(', ');
  const zones = a ? `Zone 2: ${a.zones.z2.low}–${a.zones.z2.high} bpm, Zone 4: ${a.zones.z4.low}–${a.zones.z4.high} bpm` : '';
  const planCtx = weekPlan.map(d => `${d.day}: ${d.workout}${d.km > 0 ? ' ('+d.km+'km)' : ''}`).join(', ');

  // Løbskontekst
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

  // Dagens dato for kalender-operationer
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const systemPrompt = `Du er RunWithAI — en empatisk, proaktiv AI løbecoach. Bruger: ${name}. ${physique}. ${zones}. Niveau: ${level}. ${lv.aiStyle}
Nuværende plan: ${planCtx}. Næste træning: ${nextWorkout.name[level]} (${nextWorkout.km}km).
${runsCtx}
I dag er: ${todayStr}. I morgen er: ${tomorrowStr}.

VIGTIG REGEL: Når brugeren nævner træthed, smerter, tidsmangel, vejr eller ønsker ændring — lav ALTID konkret planændring med <plan_update>. Spørg ikke om lov, bare gør det og forklar kort.
Trigger-ord: "træt", "ondt", "kort", "flyt", "skift", "reducer", "øg", "frisk", "tid", "i morgen", "hvile", "tilføj", "gå", "gang", "gåtur".

Når brugeren vil TILFØJE en ny aktivitet (f.eks. "tilføj 20km gåtur i morgen"):
- Tilføj den til weekPlan med type:"walk" eller type:"run"
- Brug dato-feltet hvis relevant

Format til planændring (inkludér kun ved ændring):
<plan_update>{"changeNote":"kort forklaring","nextWorkout":{"name":"navn","desc":"beskrivelse","km":9.0,"duration":"~50","targetPace":"5:00","targetHr":155},"weekPlan":[{"day":"Man","workout":"navn","km":9,"color":"#c8ff00","type":"run","description":"konkret beskrivelse"},{"day":"Søn","workout":"20km gåtur","km":20,"color":"#3a7bd5","type":"walk","date":"${tomorrowStr}"}]}</plan_update>
Svar på dansk, max 2-3 sætninger. Vær direkte og konkret.`;

  const res = await fetch(`${SERVER}/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
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
      // Normaliser dagnavne til korte format
      const dayMap = { 'Mandag':'Man','Tirsdag':'Tir','Onsdag':'Ons','Torsdag':'Tor','Fredag':'Fre','Lørdag':'Lør','Søndag':'Søn' };
      if (planUpdate?.weekPlan) {
        planUpdate.weekPlan = planUpdate.weekPlan.map(d => ({
          ...d, day: dayMap[d.day] || d.day
        }));
      }
    } catch {}
    text = text.replace(/<plan_update>[\s\S]*?<\/plan_update>/, '').trim();
  }

  // GEM SAMTALEN TIL DATABASE EFTER HVERT SVAR
  const aiMsg = { role: 'assistant', text };
  const allMessages = [...messages, aiMsg].map(m => ({
    role: m.role === 'ai' ? 'assistant' : m.role,
    text: m.text,
  }));
  
  // Gem i baggrunden (ikke await for at undgå at blokere UI)
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

// ─── TRAINING PLAN API ────────────────────────────────────────────────────────
export async function loadTrainingPlan() {
  try {
    const res = await fetch(`${SERVER}/trainingplan`, { headers: authHeaders() });
    return await res.json();
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
