import PricingPage, { useSubscription, Paywall } from './components/Pricing';
import React, { useState, useEffect } from 'react';
import { Icon } from './src/components/Icons';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Image, ScrollView, Modal, Alert, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  colors, DEFAULT_WEEK_PLAN, DEFAULT_NEXT_WORKOUT, DEFAULT_PROFILE,
  loadProfile, saveProfile, loadWeekPlan, saveWeekPlan, setAuthToken, generateTrainingPlan, getAuthToken, loadTrainingPlan, loadRuns,
} from './src/data';
import Auth from './src/screens/Auth';
import Onboarding from './src/screens/Onboarding';
import Dashboard from './src/screens/Dashboard';
import Chat from './src/screens/Chat';
import Activity, { RunCalendar } from './src/screens/Activity';
import Settings from './src/screens/Settings';
import RunTracker from './src/screens/RunTracker';
import Stats from './src/screens/Stats';
import { RoutesTab as RoutesTabComponent } from './src/screens/RoutesTab';

// ─── TAB IKONER (Feather outline SVG) ───────────────────────────────────────
const makeIcon = (svgPath) => ({ active }) => {
  const color = active ? '%230a0a0a' : '%23b0b0b0';
  const uri = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${color}' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'>${svgPath}</svg>`;
  return <Image source={{ uri }} style={{ width: 24, height: 24 }} />;
};

const IconPlan     = makeIcon("<path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/><polyline points='9 22 9 12 15 12 15 22'/>");
const IconProgress = makeIcon("<polyline points='22 12 18 12 15 21 9 3 6 12 2 12'/>");
const IconStats    = makeIcon("<line x1='18' y1='20' x2='18' y2='10'/><line x1='12' y1='20' x2='12' y2='4'/><line x1='6' y1='20' x2='6' y2='14'/>");
const IconCalendar = makeIcon("<rect x='3' y='4' width='18' height='18' rx='2' ry='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/>");

const TABS = [
  { id: 'dashboard', label: 'Plan',      Icon: IconPlan     },
  { id: 'activity',  label: 'Fremskridt',Icon: IconProgress },
  { id: 'run',       label: '',          Icon: null         },
  { id: 'stats',     label: 'Statistik', Icon: IconStats    },
  { id: 'calendar',  label: 'Kalender',  Icon: IconCalendar },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PRO FEATURE LOCK COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function ProFeatureLock({ feature, description, onUpgrade }) {
  return (
    <View style={proLockStyles.container}>
      <View style={proLockStyles.card}>
        <Text style={proLockStyles.icon}>🔒</Text>
        <Text style={proLockStyles.title}>{feature}</Text>
        <Text style={proLockStyles.description}>{description}</Text>
        <TouchableOpacity style={proLockStyles.button} onPress={onUpgrade}>
          <Text style={proLockStyles.buttonText}>Opgrader til Pro →</Text>
        </TouchableOpacity>
        <Text style={proLockStyles.price}>Fra kun 49 kr/md</Text>
      </View>
    </View>
  );
}

const proLockStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: colors.bg },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 32, alignItems: 'center', maxWidth: 320, borderWidth: 1, borderColor: colors.border },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  description: { fontSize: 15, color: colors.muted, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  button: { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, marginBottom: 12 },
  buttonText: { color: colors.black, fontWeight: 'bold', fontSize: 16 },
  price: { color: colors.muted, fontSize: 13 },
});

// ─── RUN TAB — med Pro-låst Ruter ───────────────────────────────────────────
function RunTab({ nextWorkout, onStartActivity, runs, profile, isPro, onShowPricing }) {
  const [activeTab, setActiveTab] = useState('start');
  const lastRun = runs && runs.length > 0 ? [...runs].sort((a,b) => new Date(b.date||0) - new Date(a.date||0))[0] : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Sub-tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 10 }}>
        {[['start','Start løb'],['routes','AI Ruter']].map(([id, label]) => (
          <TouchableOpacity key={id}
            style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: activeTab === id ? colors.black : colors.surface, borderWidth: 2, borderColor: activeTab === id ? colors.black : colors.border2 }}
            onPress={() => setActiveTab(id)}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: activeTab === id ? colors.card : colors.muted }}>
              {label}
              {id === 'routes' && !isPro && ' 🔒'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'start' ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Løb knap */}
          <TouchableOpacity onPress={() => onStartActivity('run')}
            style={{ backgroundColor: colors.black, borderRadius: 20, padding: 28, marginBottom: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>🏃</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: colors.card, letterSpacing: -0.5 }}>Løb</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>GPS tracking · Pace · Distance</Text>
          </TouchableOpacity>

          {/* Gå knap */}
          <TouchableOpacity onPress={() => onStartActivity('walk')}
            style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 28, marginBottom: 20, alignItems: 'center', borderWidth: 2, borderColor: colors.border2 }}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>🚶</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: colors.black, letterSpacing: -0.5 }}>Gå</Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>GPS tracking · Skridt · Distance</Text>
          </TouchableOpacity>

          {/* Næste træning */}
          {nextWorkout && (
            <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 10, color: colors.muted, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>NÆSTE TRÆNING</Text>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 4 }}>{typeof nextWorkout?.name === 'object' ? (nextWorkout.name.intermediate || Object.values(nextWorkout.name)[0]) : (nextWorkout?.name || '')}</Text>
              {nextWorkout.description && <Text style={{ fontSize: 13, color: colors.dim, lineHeight: 18 }}>{typeof nextWorkout.description === 'object' ? (nextWorkout.description.intermediate || Object.values(nextWorkout.description)[0]) : nextWorkout.description}</Text>}
              <TouchableOpacity onPress={() => onStartActivity('run')}
                style={{ backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 14 }}>
                <Text style={{ color: colors.black, fontWeight: '800', fontSize: 14 }}>▶  Start denne træning</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Seneste løb */}
          {lastRun && (
            <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 10, color: colors.muted, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>SENESTE AKTIVITET</Text>
              <View style={{ flexDirection: 'row', gap: 20 }}>
                <View><Text style={{ fontSize: 22, fontWeight: '900', color: colors.accent }}>{lastRun.km || '–'}</Text><Text style={{ fontSize: 10, color: colors.muted, fontWeight: '600' }}>KM</Text></View>
                <View><Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>{lastRun.duration || '–'}</Text><Text style={{ fontSize: 10, color: colors.muted, fontWeight: '600' }}>TID</Text></View>
                <View><Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>{lastRun.pace || '–'}</Text><Text style={{ fontSize: 10, color: colors.muted, fontWeight: '600' }}>PACE</Text></View>
              </View>
            </View>
          )}

          {/* Free bruger teaser */}
          {!isPro && (
            <TouchableOpacity 
              style={{ backgroundColor: 'rgba(200, 255, 0, 0.1)', borderRadius: 16, padding: 18, marginTop: 12, borderWidth: 1, borderColor: colors.accent }}
              onPress={onShowPricing}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 32 }}>⭐</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Opgrader til Pro</Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>AI Coach · AI Ruter · Ubegrænset løb</Text>
                </View>
                <Text style={{ color: colors.accent, fontWeight: 'bold' }}>→</Text>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        // AI Ruter - Pro only
        isPro ? (
          <RoutesTabWrapper profile={profile} runs={runs} />
        ) : (
          <ProFeatureLock 
            feature="AI Ruteforslag"
            description="Få personlige ruteforslag baseret på din lokation, distance og præferencer. AI'en lærer dine favoritter!"
            onUpgrade={onShowPricing}
          />
        )
      )}
    </View>
  );
}

// ─── CALENDAR TAB — Pro only ────────────────────────────────────────────────
function CalendarTab({ runs, weekPlan, trainingPlan, isPro, onShowPricing }) {
  if (!isPro) {
    return (
      <ProFeatureLock 
        feature="Træningskalender"
        description="Se hele din træningsplan i en overskuelig kalender. Planlæg fremad og hold styr på dine løb."
        onUpgrade={onShowPricing}
      />
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <Text style={{ fontSize: 11, color: colors.muted, letterSpacing: 2, fontWeight: '700', marginBottom: 16 }}>KALENDER</Text>
      <RunCalendar runs={runs} weekPlan={weekPlan} trainingPlan={trainingPlan} />
    </ScrollView>
  );
}

// ─── STATS TAB — Basis for Free, Avanceret for Pro ──────────────────────────
function StatsTab({ runs, profile, level, isPro, onShowPricing }) {
  // Free brugere får kun basis statistik
  if (!isPro) {
    const totalKm = runs.reduce((sum, r) => sum + (parseFloat(r.km) || 0), 0);
    const totalRuns = runs.length;
    
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 11, color: colors.muted, letterSpacing: 2, fontWeight: '700', marginBottom: 16 }}>BASIS STATISTIK</Text>
        
        {/* Basis stats */}
        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 32, fontWeight: '900', color: colors.accent }}>{totalRuns}</Text>
              <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '600' }}>LØBETURE</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 32, fontWeight: '900', color: colors.text }}>{totalKm.toFixed(1)}</Text>
              <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '600' }}>TOTAL KM</Text>
            </View>
          </View>
        </View>

        {/* Pro features teaser */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, borderWidth: 2, borderColor: colors.border2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 24, marginRight: 12 }}>🔒</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Pro Statistik</Text>
          </View>
          
          <View style={{ gap: 12 }}>
            {[
              '📊 Pace udvikling over tid',
              '❤️ Puls zone analyse',
              '🏆 Personlige rekorder',
              '📈 Ugentlige/månedlige grafer',
              '🎯 Målsætning & fremskridt',
              '👟 Sko statistik',
            ].map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', opacity: 0.6 }}>
                <Text style={{ fontSize: 14, color: colors.muted }}>{item}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity 
            style={{ backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 }}
            onPress={onShowPricing}
          >
            <Text style={{ color: colors.black, fontWeight: 'bold', fontSize: 15 }}>Lås op for Pro Statistik →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Pro brugere får fuld Stats komponent
  return <Stats runs={runs} profile={profile} level={level} />;
}

// ─── PLAN TAB — med Coach låst for Free ─────────────────────────────────────
function PlanTab({ level, nextWorkout, weekPlan, planChanges, profile, runs, onNavigate, onStartActivity, trainingPlan, onPlanUpdate, isPro, onShowPricing }) {
  const [activeTab, setActiveTab] = useState('plan');
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 10, backgroundColor: colors.bg }}>
        {[['plan','Plan'],['coach','AI Coach']].map(([id, label]) => (
          <TouchableOpacity key={id}
            style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: activeTab === id ? colors.black : colors.surface, borderWidth: 2, borderColor: activeTab === id ? colors.black : colors.border2 }}
            onPress={() => setActiveTab(id)}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: activeTab === id ? colors.card : colors.muted }}>
              {label}
              {id === 'coach' && !isPro && ' 🔒'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        {activeTab === 'plan'
          ? <Dashboard level={level} nextWorkout={nextWorkout} weekPlan={weekPlan} planChanges={planChanges} profile={profile} runs={runs} onNavigate={onNavigate} onStartActivity={onStartActivity} />
          : isPro 
            ? <Chat level={level} profile={profile} weekPlan={weekPlan} nextWorkout={nextWorkout} onPlanUpdate={onPlanUpdate} runs={runs} />
            : (
              <ProFeatureLock 
                feature="AI Løbecoach"
                description="Få personlig AI træningscoach der tilpasser din plan baseret på dine mål, fremskridt og hvordan du har det."
                onUpgrade={onShowPricing}
              />
            )
        }
      </View>
    </View>
  );
}

function RoutesTabWrapper({ profile, runs }) {
  return <RoutesTabComponent profile={profile} runs={runs} />;
}

export default function App() {
  // Al state samlet ét sted
  const [user, setUser]                       = useState(null);
  const [showOnboarding, setShowOnboarding]   = useState(true);
  const [level, setLevel]                     = useState(null);
  const [tab, setTab]                         = useState('dashboard');
  const [profile, setProfileState]            = useState(DEFAULT_PROFILE);
  const [weekPlan, setWeekPlanState]          = useState(DEFAULT_WEEK_PLAN);
  const [nextWorkout, setNextWorkout]         = useState(DEFAULT_NEXT_WORKOUT);
  const [planChanges, setPlanChanges]         = useState([]);
  const [trainingPlan, setTrainingPlan]       = useState(null);
  const [runs, setRuns]                       = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [activityType, setActivityType]       = useState('run');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [showPricing, setShowPricing] = useState(false);
  
  // Hent subscription status via hook
  const token = getAuthToken();
  const { subscription, isPro, canTrackRun, refresh: refreshSubscription } = useSubscription(token);

  // Håndter deep links fra Stripe checkout (kun på native)
  useEffect(() => {
    // På web tjekker vi URL parameteren direkte
    if (Platform.OS === 'web') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('subscription') === 'success') {
        Alert.alert('🎉 Velkommen til Pro!', 'Dit abonnement er nu aktivt. Nyd alle Pro features!');
        refreshSubscription();
        // Fjern query parameter fra URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Hent data fra database
  const loadData = async () => {
    setLoading(true);
    
    // Tjek først om onboarding er completed lokalt
    try {
      const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
      const savedLevel = await AsyncStorage.getItem('userLevel');
      if (onboardingCompleted === 'true' && savedLevel) {
        setLevel(savedLevel);
        setShowOnboarding(false);
      }
    } catch (e) {
      console.log('AsyncStorage read error:', e);
    }
    
    const [savedProfile, savedPlan, savedTrainingPlan, savedRuns] = await Promise.all([
      loadProfile(),
      loadWeekPlan(),
      loadTrainingPlan(),
      loadRuns(),
    ]);
    if (savedRuns) setRuns(savedRuns);
    if (savedTrainingPlan) {
      setTrainingPlan(savedTrainingPlan);
      if (savedTrainingPlan.data && savedTrainingPlan.data.length > 0) {
        const todayShort = ['Søn','Man','Tir','Ons','Tor','Fre','Lør'][new Date().getDay()];
        const synced = savedTrainingPlan.data.map(d => ({
          ...d,
          today: d.day === todayShort,
        }));
        setWeekPlanState(synced);
      }
    } else if (savedPlan) {
      setWeekPlanState(savedPlan);
    }
    
    if (savedProfile) {
      setProfileState(savedProfile);
      if (savedProfile.level) {
        setLevel(savedProfile.level);
        setShowOnboarding(false);
      }
    }
    
    setLoading(false);
  };

  // Tjek om token allerede er gemt fra forrige session
  useEffect(() => {
    const savedToken = getAuthToken();
    if (savedToken) {
      fetch('https://runwithai-server-production.up.railway.app/profile', {
        headers: { Authorization: `Bearer ${savedToken}`, 'Content-Type': 'application/json' }
      }).then(r => {
        if (r.ok) {
          setAuthToken(savedToken);
          setUser({ token: savedToken });
        } else {
          setAuthToken(null);
          setLoading(false);
        }
      }).catch(() => {
        setAuthToken(null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    setShowOnboarding(true);
    setTab('dashboard');
  };

  const setProfile = (updater) => {
    setProfileState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveProfile(next);
      return next;
    });
  };

  const setWeekPlan = (updater) => {
    setWeekPlanState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveWeekPlan(next);
      return next;
    });
  };

  const handlePlanUpdate = (update) => {
    if (!update) return;
    if (update.nextWorkout) {
      setNextWorkout(prev => ({
        ...prev,
        ...update.nextWorkout,
        name: typeof update.nextWorkout.name === 'string'
          ? { beginner: update.nextWorkout.name, intermediate: update.nextWorkout.name, advanced: update.nextWorkout.name }
          : update.nextWorkout.name || prev.name,
        desc: typeof update.nextWorkout.desc === 'string'
          ? { beginner: update.nextWorkout.desc, intermediate: update.nextWorkout.desc, advanced: update.nextWorkout.desc }
          : update.nextWorkout.desc || prev.desc,
      }));
    }
    if (update.weekPlan) {
      const todayShort = ['Søn','Man','Tir','Ons','Tor','Fre','Lør'][new Date().getDay()];
      const planData = update.weekPlan.map(d => ({
        day: d.day,
        workout: d.workout || d.name || 'Træning',
        km: d.km || 0,
        color: d.color || '#c8ff00',
        type: d.type || 'run',
        description: d.description || d.desc || '',
        rest: d.type === 'rest' || (d.km === 0 && !d.type),
        today: d.day === todayShort,
      }));

      setWeekPlan(planData);
      setTrainingPlan({ data: planData, generated_at: new Date().toISOString() });

      const token = getAuthToken();
      if (token) {
        fetch('https://runwithai-server-production.up.railway.app/trainingplan/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ data: planData }),
        }).catch(() => {});
      }
    }
    if (update.changeNote) {
      const time = new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
      setPlanChanges(prev => [...prev.slice(-4), { note: update.changeNote, time }]);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // START ACTIVITY MED SUBSCRIPTION CHECK
  // ═══════════════════════════════════════════════════════════════════════════
  const handleStartActivity = (type) => {
    // Tjek om free bruger har nået grænsen (10 løb/måned)
    if (!canTrackRun && !isPro) {
      Alert.alert(
        '🏃 Løbegrænse nået',
        'Du har brugt dine 10 gratis løb denne måned. Opgrader til Pro for ubegrænset tracking!',
        [
          { text: 'Annuller', style: 'cancel' },
          { text: 'Se Pro planer', onPress: () => setShowPricing(true) }
        ]
      );
      return;
    }
    setActivityType(type);
    setTab('tracker');
  };

  // Vis auth skærm hvis ikke logget ind
  if (!user) return (
    <SafeAreaProvider>
      <Auth onAuth={(token, userData) => {
        setAuthToken(token);
        setUser(userData);
        setLoading(true);
        loadData();
      }} />
    </SafeAreaProvider>
  );

  if (loading) return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      <View style={{ flex:1, backgroundColor: colors.black, alignItems:'center', justifyContent:'center' }}>
        <Text style={{ fontSize: 32, fontWeight: '900', color: colors.accent, letterSpacing: 2 }}>RUN</Text>
        <Text style={{ fontSize: 32, fontWeight: '900', color: colors.text, letterSpacing: 2 }}>WITH</Text>
        <Text style={{ fontSize: 32, fontWeight: '900', color: colors.accent, letterSpacing: 2 }}>AI</Text>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
      </View>
    </SafeAreaProvider>
  );

  // Run Tracker
  if (tab === 'tracker') {
    if (!RunTracker) return <SafeAreaProvider><View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text>RunTracker mangler</Text></View></SafeAreaProvider>;
    return (
      <SafeAreaProvider>
        <RunTracker
          profile={profile}
          level={level}
          weekPlan={weekPlan}
          nextWorkout={nextWorkout}
          runs={runs}
          activityType={activityType}
          onBack={() => setTab('dashboard')}
        />
      </SafeAreaProvider>
    );
  }

  // Onboarding
  if (showOnboarding) return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      <Onboarding onDone={async (chosenLevel, goalInfo) => {
        setLevel(chosenLevel);
        const merged = { ...profile, ...(goalInfo || {}), level: chosenLevel };
        
        // Gem lokalt FØRST så vi undgår loop selv hvis server fejler
        try {
          await AsyncStorage.setItem('onboardingCompleted', 'true');
          await AsyncStorage.setItem('userLevel', chosenLevel);
        } catch (e) {
          console.log('AsyncStorage write error:', e);
        }
        
        // Gem profil til server
        setProfileState(merged);
        await saveProfile(merged);
        
        if (goalInfo && Object.values(goalInfo).some(v => v)) {
          generateTrainingPlan(merged, chosenLevel, []);
        }
        
        // Sæt onboarding til false EFTER alt er gemt
        setShowOnboarding(false);
      }} />
    </SafeAreaProvider>
  );

  const renderScreen = () => {
    switch (tab) {
      case 'dashboard': 
        return <PlanTab level={level} nextWorkout={nextWorkout} weekPlan={weekPlan} planChanges={planChanges} profile={profile} runs={runs} onNavigate={setTab} onStartActivity={handleStartActivity} trainingPlan={trainingPlan} onPlanUpdate={handlePlanUpdate} isPro={isPro} onShowPricing={() => setShowPricing(true)} />;
      case 'activity':  
        return <Activity level={level} profile={profile} weekPlan={weekPlan} onSetWeekPlan={(plan) => setWeekPlan(plan)} trainingPlan={trainingPlan} onTrainingPlanChange={setTrainingPlan} runs={runs} />;
      case 'run':       
        return <RunTab nextWorkout={nextWorkout} onStartActivity={handleStartActivity} runs={runs} profile={profile} isPro={isPro} onShowPricing={() => setShowPricing(true)} />;
      case 'stats':     
        return <StatsTab runs={runs} profile={profile} level={level} isPro={isPro} onShowPricing={() => setShowPricing(true)} />;
      case 'calendar':  
        return <CalendarTab runs={runs} weekPlan={weekPlan} trainingPlan={trainingPlan} isPro={isPro} onShowPricing={() => setShowPricing(true)} />;
      case 'chat':      
        return <Chat level={level} profile={profile} weekPlan={weekPlan} nextWorkout={nextWorkout} onPlanUpdate={handlePlanUpdate} runs={runs} />;
      case 'settings':  
        return <Settings level={level || 'intermediate'} onLevelChange={(lv) => { setLevel(lv); setProfile(p => ({ ...p, level: lv })); }} profile={profile} onProfileChange={setProfile} onLogout={handleLogout} onBack={() => setTab('dashboard')} subscription={subscription} onShowPricing={() => setShowPricing(true)} />;
      default:          
        return null;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.card} />
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* Top bar */}
        <View style={s.topBar}>
          <Text style={s.logoText}>
            <Text style={s.logoRun}>RUN</Text>
            <Text style={s.logoWith}>WITH</Text>
            <Text style={s.logoAI}>AI</Text>
          </Text>
          <View style={s.topRight}>
            {/* Pro Badge eller Upgrade knap */}
            {isPro ? (
              <View style={s.proBadge}>
                <Text style={s.proBadgeText}>PRO ⭐</Text>
              </View>
            ) : (
              <TouchableOpacity style={s.upgradeButton} onPress={() => setShowPricing(true)}>
                <Text style={s.upgradeButtonText}>Pro →</Text>
              </TouchableOpacity>
            )}
            {planChanges.length > 0 && (
              <View style={s.updateDot}><Icon name='edit' size={10} color='#ffffff'/></View>
            )}
            <TouchableOpacity style={s.menuBtn} onPress={() => setTab('settings')}>
              <View style={s.menuLine} />
              <View style={s.menuLine} />
              <View style={s.menuLine} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Aktiv skærm */}
        <View style={{ flex: 1 }}>{renderScreen()}</View>

        {/* Bottom tab bar */}
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.card }}>
          <View style={s.tabBar}>
            {TABS.map(t => {
              const active = tab === t.id;
              const TabIcon = t.Icon;
              if (t.id === 'run') {
                return (
                  <TouchableOpacity key={t.id} style={s.tabItemRun} onPress={() => setTab(t.id)}>
                    <View style={s.runBtnContainer}>
                      <View style={[s.runBtn, active && s.runBtnActive]}>
                        <Image source={{ uri: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwb2x5Z29uIHBvaW50cz0iMTMgMiAzIDE0IDEyIDE0IDExIDIyIDIxIDEwIDEyIDEwIDEzIDIiLz48L3N2Zz4=' }} style={{ width: 22, height: 22 }} />
                      </View>
                    </View>
                    <Text style={s.tabLabel}>Start</Text>
                    <View style={[s.tabActiveDot, { opacity: active ? 1 : 0 }]} />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity key={t.id} style={s.tabItem} onPress={() => setTab(t.id)}>
                  <View style={s.tabIconWrap}>
                    <TabIcon active={active} />
                  </View>
                  <Text style={[s.tabLabel, active && s.tabLabelActive]}>{t.label}</Text>
                  <View style={[s.tabActiveDot, { opacity: active ? 1 : 0 }]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </SafeAreaView>

        {/* ═══════════════════════════════════════════════════════════════════
            PRICING MODAL
        ═══════════════════════════════════════════════════════════════════ */}
        <Modal
          visible={showPricing}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <PricingPage
            token={token}
            onClose={() => {
              setShowPricing(false);
              refreshSubscription();
            }}
            currentTier={subscription?.tier || 'free'}
          />
        </Modal>

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: colors.bg },
  topBar:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 16, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  logoText:        { fontSize: 17, letterSpacing: -0.5 },
  logoRun:         { color: colors.black, fontWeight: '900' },
  logoWith:        { color: colors.muted, fontWeight: '300', letterSpacing: 2 },
  logoAI:          { color: colors.accent, fontWeight: '900' },
  topRight:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuBtn:         { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', gap: 5 },
  menuLine:        { width: 20, height: 2, backgroundColor: colors.black, borderRadius: 1 },
  levelPill:       { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  levelPillText:   { fontSize: 15 },
  updateDot:       { backgroundColor: colors.accent + '15', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  updateDotText:   { fontSize: 12 },
  tabBar:          { flexDirection: 'row', height: 65, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  tabItem:         { flex: 1, alignItems: 'center' },
  tabItemRun:      { flex: 1, alignItems: 'center' },
  tabActiveDot:    { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent, marginTop: 4 },
  runBtnContainer: { height: 24, justifyContent: 'flex-end', alignItems: 'center' },
  runBtn:          { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8, position: 'absolute', top: -35 },
  runBtnActive:    { backgroundColor: '#e03500' },
  tabIconWrap:     { width: 44, height: 24, alignItems: 'center', justifyContent: 'center' },
  tabIcon:         { fontSize: 20, opacity: 0.3 },
  tabIconActive:   { opacity: 1 },
  tabLabel:        { fontSize: 10, color: colors.muted, letterSpacing: 0.3, fontWeight: '500', marginTop: 4 },
  tabLabelActive:  { color: colors.black, fontWeight: '700' },
  // ═══════════════════════════════════════════════════════════════════════════
  // PRO / UPGRADE STYLES
  // ═══════════════════════════════════════════════════════════════════════════
  proBadge: {
    backgroundColor: 'rgba(200, 255, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  proBadgeText: {
    color: colors.accent,
    fontWeight: 'bold',
    fontSize: 11,
  },
  upgradeButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  upgradeButtonText: {
    color: colors.black,
    fontWeight: 'bold',
    fontSize: 12,
  },
});
