// ═══════════════════════════════════════════════════════════════════════════
// AUTH.JS - RunWithAI Login & Registration (med PRO Upsell + Glemt Password)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../data';

const API_URL = 'https://runwithai-server-production.up.railway.app';

// Web-specifik text stroke for "WITH"
const logoWithStyle = Platform.OS === 'web'
  ? {
      color: '#ffffff',
      fontWeight: '700',
      letterSpacing: 2,
      WebkitTextStroke: '1px #000000',
      textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
    }
  : {
      color: '#ffffff',
      fontWeight: '700',
      letterSpacing: 2,
      textShadowColor: '#000',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 1,
    };

// ─── LEVEL OPTIONS ──────────────────────────────────────────────────────────
const LEVELS = [
  { id: 'beginner', label: 'Begynder', emoji: '🌱', desc: 'Ny til løb eller starter igen' },
  { id: 'intermediate', label: 'Øvet', emoji: '🏃', desc: 'Løber regelmæssigt, 5-20 km/uge' },
  { id: 'advanced', label: 'Erfaren', emoji: '🔥', desc: 'Seriøs løber, 20+ km/uge' },
];

// ─── GOAL OPTIONS ───────────────────────────────────────────────────────────
const GOALS = [
  { id: 'health', label: 'Sundhed', emoji: '❤️' },
  { id: 'weight', label: 'Vægttab', emoji: '⚖️' },
  { id: 'distance', label: 'Løbe længere', emoji: '📏' },
  { id: 'speed', label: 'Blive hurtigere', emoji: '⚡' },
  { id: 'race', label: 'Løb et løb', emoji: '🏅' },
  { id: 'fun', label: 'Hygge', emoji: '😊' },
];

// ─── PRO FEATURES ───────────────────────────────────────────────────────────
const PRO_FEATURES = [
  { emoji: '🤖', title: 'AI Coach', desc: 'Personlig træningsplan' },
  { emoji: '📊', title: 'Statistik', desc: 'Dybdegående analyse' },
  { emoji: '🎯', title: 'Mål', desc: 'Ubegrænsede mål' },
  { emoji: '🗺️', title: 'Ruter', desc: 'Gem yndlingsruter' },
  { emoji: '💬', title: 'AI Chat', desc: 'Spørg om alt' },
  { emoji: '📈', title: 'Rapporter', desc: 'Ugentlige opsummeringer' },
];

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'register_profile' | 'register_upsell' | 'forgot_password' | 'reset_password'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Login/Register fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Reset password fields
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Profile fields (step 2 of registration)
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [level, setLevel] = useState('');
  const [goals, setGoals] = useState([]);
  const [weeklyGoalKm, setWeeklyGoalKm] = useState('');

  // Temp storage for auth data between steps
  const [pendingToken, setPendingToken] = useState(null);
  const [pendingUser, setPendingUser] = useState(null);
  const [pendingProfile, setPendingProfile] = useState(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Udfyld email og adgangskode');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        onAuth(data.token, data.user);
      } else {
        setError(data.error || 'Login fejlede');
      }
    } catch (err) {
      setError('Kunne ikke forbinde til server');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Indtast din email');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('Vi har sendt en nulstillingskode til din email');
        setMode('reset_password');
      } else {
        setError(data.error || 'Kunne ikke sende nulstillingskode');
      }
    } catch (err) {
      setError('Kunne ikke forbinde til server');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetCode || !newPassword) {
      setError('Udfyld kode og ny adgangskode');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Adgangskoder matcher ikke');
      return;
    }

    if (newPassword.length < 6) {
      setError('Adgangskode skal være mindst 6 tegn');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCode, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('Adgangskode nulstillet! Du kan nu logge ind.');
        setMode('login');
        setResetCode('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        setError(data.error || 'Kunne ikke nulstille adgangskode');
      }
    } catch (err) {
      setError('Kunne ikke forbinde til server');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStep1 = async () => {
    if (!email || !password) {
      setError('Udfyld email og adgangskode');
      return;
    }

    if (password !== confirmPassword) {
      setError('Adgangskoder matcher ikke');
      return;
    }

    if (password.length < 6) {
      setError('Adgangskode skal være mindst 6 tegn');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        // Gem token midlertidigt og gå til profil-step
        setPendingToken(data.token);
        setPendingUser(data.user);
        setMode('register_profile');
      } else {
        setError(data.error || 'Oprettelse fejlede');
      }
    } catch (err) {
      setError('Kunne ikke forbinde til server');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStep2 = async () => {
    if (!name.trim()) {
      setError('Indtast dit navn');
      return;
    }

    if (!level) {
      setError('Vælg dit niveau');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Gem profil til server
      const profileData = {
        name: name.trim(),
        age: age ? parseInt(age) : null,
        weight: weight ? parseInt(weight) : null,
        height: height ? parseInt(height) : null,
        level,
        goals,
        weeklyGoalKm: weeklyGoalKm ? parseInt(weeklyGoalKm) : 20,
      };

      const res = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pendingToken}`,
        },
        body: JSON.stringify(profileData),
      });

      if (!res.ok) {
        console.log('Profile save failed, continuing anyway');
      }

      // Gem onboarding status lokalt
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      await AsyncStorage.setItem('userLevel', level);

      // Gem profil data til næste step
      setPendingProfile(profileData);

      // Gå til PRO upsell step
      setMode('register_upsell');

    } catch (err) {
      console.log('Profile save error:', err);
      // Fortsæt alligevel til upsell
      setMode('register_upsell');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pendingToken}`,
        },
        body: JSON.stringify({ priceId: 'price_1TBU4s5DwJ9LegdIxUvhaTJu' }),
      });

      const data = await res.json();

      if (data.url) {
        if (Platform.OS === 'web') {
          window.open(data.url, '_blank');
        } else {
          Linking.openURL(data.url);
        }
      }

      // Fuldfør login efter checkout åbnes
      onAuth(pendingToken, { ...pendingUser, profile: pendingProfile });

    } catch (err) {
      console.log('Checkout error:', err);
      // Fortsæt alligevel
      onAuth(pendingToken, { ...pendingUser, profile: pendingProfile });
    } finally {
      setLoading(false);
    }
  };

  const handleSkipTrial = () => {
    // Fuldfør login uden PRO
    onAuth(pendingToken, { ...pendingUser, profile: pendingProfile });
  };

  const toggleGoal = (goalId) => {
    setGoals(prev =>
      prev.includes(goalId)
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    );
  };

  // ─── LOGIN SCREEN ─────────────────────────────────────────────────────────
  if (mode === 'login') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>
                <Text style={styles.logoRun}>RUN</Text>
                <Text style={logoWithStyle}>WITH</Text>
                <Text style={styles.logoAI}>AI</Text>
              </Text>
              <Text style={styles.tagline}>Din personlige AI løbecoach</Text>
            </View>

            {/* Form */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Log ind</Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="din@email.dk"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Adgangskode</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={styles.forgotPasswordLink}
                onPress={() => { setMode('forgot_password'); setError(''); setSuccessMessage(''); }}
              >
                <Text style={styles.forgotPasswordText}>Glemt adgangskode?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.black} />
                ) : (
                  <Text style={styles.primaryButtonText}>Log ind</Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>eller</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => { setMode('register'); setError(''); setSuccessMessage(''); }}
              >
                <Text style={styles.secondaryButtonText}>Opret ny konto</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── FORGOT PASSWORD SCREEN ───────────────────────────────────────────────
  if (mode === 'forgot_password') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>
                <Text style={styles.logoRun}>RUN</Text>
                <Text style={logoWithStyle}>WITH</Text>
                <Text style={styles.logoAI}>AI</Text>
              </Text>
              <Text style={styles.tagline}>Nulstil din adgangskode</Text>
            </View>

            {/* Form */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Glemt adgangskode</Text>
              <Text style={styles.formSubtitle}>Indtast din email, så sender vi en nulstillingskode</Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="din@email.dk"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleForgotPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.black} />
                ) : (
                  <Text style={styles.primaryButtonText}>Send nulstillingskode</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => { setMode('login'); setError(''); }}
              >
                <Text style={styles.linkButtonText}>← Tilbage til login</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── RESET PASSWORD SCREEN ────────────────────────────────────────────────
  if (mode === 'reset_password') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>
                <Text style={styles.logoRun}>RUN</Text>
                <Text style={logoWithStyle}>WITH</Text>
                <Text style={styles.logoAI}>AI</Text>
              </Text>
              <Text style={styles.tagline}>Opret ny adgangskode</Text>
            </View>

            {/* Form */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Nulstil adgangskode</Text>
              <Text style={styles.formSubtitle}>Tjek din email for koden</Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nulstillingskode</Text>
                <TextInput
                  style={styles.input}
                  value={resetCode}
                  onChangeText={setResetCode}
                  placeholder="6-cifret kode"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ny adgangskode</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Mindst 6 tegn"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bekræft ny adgangskode</Text>
                <TextInput
                  style={styles.input}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  placeholder="Gentag adgangskode"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.black} />
                ) : (
                  <Text style={styles.primaryButtonText}>Nulstil adgangskode</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => { setMode('forgot_password'); setError(''); }}
              >
                <Text style={styles.linkButtonText}>Fik du ikke koden? Send igen</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── REGISTER STEP 1 - EMAIL & PASSWORD ───────────────────────────────────
  if (mode === 'register') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>
                <Text style={styles.logoRun}>RUN</Text>
                <Text style={logoWithStyle}>WITH</Text>
                <Text style={styles.logoAI}>AI</Text>
              </Text>
              <Text style={styles.tagline}>Kom i gang på 2 minutter</Text>
            </View>

            {/* Form */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Opret konto</Text>
              <Text style={styles.stepIndicator}>Trin 1 af 3</Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="din@email.dk"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Adgangskode</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mindst 6 tegn"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bekræft adgangskode</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Gentag adgangskode"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleRegisterStep1}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.black} />
                ) : (
                  <Text style={styles.primaryButtonText}>Fortsæt →</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => { setMode('login'); setError(''); }}
              >
                <Text style={styles.linkButtonText}>Har allerede en konto? Log ind</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── REGISTER STEP 2 - PROFILE INFO ───────────────────────────────────────
  if (mode === 'register_profile') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.profileHeader}>
              <Text style={styles.profileTitle}>Fortæl os om dig selv</Text>
              <Text style={styles.stepIndicator}>Trin 2 af 3</Text>
            </View>

            {/* Form */}
            <View style={styles.profileForm}>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Navn *</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Dit navn"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="words"
                />
              </View>

              {/* Age, Weight, Height in row */}
              <View style={styles.inputRow}>
                <View style={styles.inputGroupSmall}>
                  <Text style={styles.inputLabel}>Alder</Text>
                  <TextInput
                    style={styles.input}
                    value={age}
                    onChangeText={setAge}
                    placeholder="År"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={styles.inputGroupSmall}>
                  <Text style={styles.inputLabel}>Vægt</Text>
                  <TextInput
                    style={styles.input}
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="Kg"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>
                <View style={styles.inputGroupSmall}>
                  <Text style={styles.inputLabel}>Højde</Text>
                  <TextInput
                    style={styles.input}
                    value={height}
                    onChangeText={setHeight}
                    placeholder="Cm"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>
              </View>

              {/* Level Selection */}
              <View style={styles.sectionGroup}>
                <Text style={styles.sectionLabel}>Dit løbeniveau *</Text>
                <View style={styles.levelOptions}>
                  {LEVELS.map(l => (
                    <TouchableOpacity
                      key={l.id}
                      style={[styles.levelCard, level === l.id && styles.levelCardSelected]}
                      onPress={() => setLevel(l.id)}
                    >
                      <Text style={styles.levelEmoji}>{l.emoji}</Text>
                      <Text style={[styles.levelLabel, level === l.id && styles.levelLabelSelected]}>{l.label}</Text>
                      <Text style={styles.levelDesc}>{l.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Goals */}
              <View style={styles.sectionGroup}>
                <Text style={styles.sectionLabel}>Hvad er dine mål? (vælg gerne flere)</Text>
                <View style={styles.goalsGrid}>
                  {GOALS.map(g => (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.goalChip, goals.includes(g.id) && styles.goalChipSelected]}
                      onPress={() => toggleGoal(g.id)}
                    >
                      <Text style={styles.goalEmoji}>{g.emoji}</Text>
                      <Text style={[styles.goalLabel, goals.includes(g.id) && styles.goalLabelSelected]}>{g.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Weekly Goal */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ugentligt km mål</Text>
                <TextInput
                  style={styles.input}
                  value={weeklyGoalKm}
                  onChangeText={setWeeklyGoalKm}
                  placeholder="F.eks. 20"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleRegisterStep2}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.black} />
                ) : (
                  <Text style={styles.primaryButtonText}>Fortsæt →</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── REGISTER STEP 3 - PRO UPSELL ─────────────────────────────────────────
  if (mode === 'register_upsell') {
    return (
      <SafeAreaView style={styles.upsellContainer}>
        <ScrollView contentContainerStyle={styles.upsellContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.upsellHeader}>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>⭐ PRO</Text>
            </View>
            <Text style={styles.upsellTitle}>Lås op for fuld kraft</Text>
            <Text style={styles.upsellSubtitle}>Få adgang til alle funktioner og nå dine mål hurtigere</Text>
          </View>

          {/* Features Grid */}
          <View style={styles.featuresGrid}>
            {PRO_FEATURES.map((f, i) => (
              <View key={i} style={styles.featureCard}>
                <Text style={styles.featureEmoji}>{f.emoji}</Text>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>

          {/* Price */}
          <View style={styles.priceSection}>
            <Text style={styles.priceAmount}>49 kr</Text>
            <Text style={styles.priceUnit}>/måned</Text>
          </View>

          <Text style={styles.guarantee}>✓ Annuller når som helst • ✓ 7 dages gratis prøveperiode</Text>

          {/* CTA Buttons */}
          <TouchableOpacity
            style={[styles.upsellButton, loading && styles.buttonDisabled]}
            onPress={handleStartTrial}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.upsellButtonText}>🚀 Start gratis prøveperiode</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkipTrial}>
            <Text style={styles.skipButtonText}>Fortsæt med gratis version</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

// ─── STYLES ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 36,
    letterSpacing: -1,
  },
  logoRun: {
    color: colors.accent,
    fontWeight: '900',
  },
  logoWithBase: {
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 2,
  },
  logoAI: {
    color: colors.accent,
    fontWeight: '900',
  },
  tagline: {
    fontSize: 16,
    color: colors.muted,
    marginTop: 8,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 20,
  },
  stepIndicator: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 20,
  },
  errorText: {
    color: colors.red,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    color: colors.green,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputGroupSmall: {
    flex: 1,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -8,
  },
  forgotPasswordText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: colors.black,
    fontSize: 17,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 0,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.muted,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkButtonText: {
    color: colors.muted,
    fontSize: 14,
  },
  // Profile step styles
  profileHeader: {
    marginBottom: 24,
  },
  profileTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.card,
    marginBottom: 4,
  },
  profileForm: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
  },
  sectionGroup: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  levelOptions: {
    gap: 10,
  },
  levelCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  levelCardSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(250, 60, 0, 0.1)',
  },
  levelEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  levelLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  levelLabelSelected: {
    color: colors.accent,
  },
  levelDesc: {
    fontSize: 13,
    color: colors.muted,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: colors.border,
    gap: 6,
  },
  goalChipSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(250, 60, 0, 0.1)',
  },
  goalEmoji: {
    fontSize: 16,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  goalLabelSelected: {
    color: colors.accent,
  },
  // ─── PRO UPSELL STYLES ────────────────────────────────────────────────────
  upsellContainer: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  upsellContent: {
    padding: 24,
    paddingBottom: 48,
    alignItems: 'center',
  },
  upsellHeader: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 20,
  },
  proBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  proBadgeText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  upsellTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  upsellSubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    maxWidth: 300,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 28,
    maxWidth: 500,
  },
  featureCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 16,
    width: '47%',
    minWidth: 140,
    alignItems: 'center',
  },
  featureEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.accent,
  },
  priceUnit: {
    fontSize: 18,
    color: '#888',
    marginLeft: 4,
  },
  guarantee: {
    fontSize: 12,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  upsellButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 12,
    width: '100%',
    maxWidth: 320,
  },
  upsellButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
  },
});
