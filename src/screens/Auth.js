// ═══════════════════════════════════════════════════════════════════════════
// AUTH.JS - RunWithAI Login & Registration (med PRO Upsell + Glemt Password + i18n)
// OPDATERET: Bruger RevenueCat + Terms/Privacy links for App Store compliance
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
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { colors } from '../data';

import { SERVER as API_URL } from '../config';

// ─── REVENUECAT SETUP ─────────────────────────────────────────────────────────
let Purchases = null;
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    Purchases = require('react-native-purchases').default;
  } catch (e) {
    console.log('RevenueCat not available');
  }
}
const REVENUECAT_IOS_KEY = 'appl_RSTGHBSwwJLczMzoqgBiNYDFDIb';
const REVENUECAT_ANDROID_KEY = 'goog_YOUR_REVENUECAT_ANDROID_KEY';

// Legal URLs - Required by Apple
const TERMS_OF_USE_URL = 'https://www.runwithai.app/terms';
const PRIVACY_POLICY_URL = 'https://www.runwithai.app/privacy';

// ─── APP LOGO COMPONENT ───────────────────────────────────────────────────────
const AppLogo = ({ size = 140 }) => (
  <Image 
    source={require('../../assets/icon.png')} 
    style={{ width: size, height: size }}
    resizeMode="contain"
  />
);

export default function Auth({ onAuth }) {
  const { t } = useTranslation();
  
  const [mode, setMode] = useState('login');
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

  // ─── LEVEL OPTIONS ──────────────────────────────────────────────────────────
  const LEVELS = [
    { id: 'beginner', label: t('auth.levels.beginner'), emoji: '🌱', desc: t('auth.levels.beginnerDesc') },
    { id: 'intermediate', label: t('auth.levels.intermediate'), emoji: '🏃', desc: t('auth.levels.intermediateDesc') },
    { id: 'advanced', label: t('auth.levels.advanced'), emoji: '🔥', desc: t('auth.levels.advancedDesc') },
  ];

  // ─── GOAL OPTIONS ───────────────────────────────────────────────────────────
  const GOALS = [
    { id: 'health', label: t('auth.goals.health'), emoji: '❤️' },
    { id: 'weight', label: t('auth.goals.weight'), emoji: '⚖️' },
    { id: 'distance', label: t('auth.goals.distance'), emoji: '📏' },
    { id: 'speed', label: t('auth.goals.speed'), emoji: '⚡' },
    { id: 'race', label: t('auth.goals.race'), emoji: '🏅' },
    { id: 'fun', label: t('auth.goals.fun'), emoji: '😊' },
  ];

  // ─── PRO FEATURES (hardcoded for reliability) ───────────────────────────────
  const PRO_FEATURES = [
    { emoji: '🤖', title: 'AI Coach', desc: 'Personlig træningsplan der tilpasser sig dig' },
    { emoji: '📊', title: 'Avanceret statistik', desc: 'Dybdegående analyse af din træning' },
    { emoji: '🎯', title: 'Ubegrænsede mål', desc: 'Sæt så mange mål du vil' },
    { emoji: '🗺️', title: 'Rutebibliotek', desc: 'Gem og del dine yndlingsruter' },
    { emoji: '💬', title: 'AI Chat', desc: 'Stil spørgsmål om løb og få svar' },
    { emoji: '📈', title: 'Fremskridtsrapporter', desc: 'Ugentlige og månedlige opsummeringer' },
  ];

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('auth.errors.fillEmailPassword'));
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
        setError(data.error || t('auth.errors.loginFailed'));
      }
    } catch (err) {
      setError(t('auth.errors.serverConnection'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError(t('auth.errors.enterEmail'));
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
        setSuccessMessage(t('auth.success.resetCodeSent'));
        setMode('reset_password');
      } else {
        setError(data.error || t('auth.errors.resetCodeFailed'));
      }
    } catch (err) {
      setError(t('auth.errors.serverConnection'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetCode || !newPassword) {
      setError(t('auth.errors.fillCodePassword'));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError(t('auth.errors.passwordMismatch'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('auth.errors.passwordTooShort'));
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
        setSuccessMessage(t('auth.success.passwordReset'));
        setMode('login');
        setResetCode('');
        setNewPassword('');
        setConfirmNewPassword('');
        setPassword('');
      } else {
        setError(data.error || t('auth.errors.resetFailed'));
      }
    } catch (err) {
      setError(t('auth.errors.serverConnection'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStep1 = async () => {
    if (!email || !password) {
      setError(t('auth.errors.fillEmailPassword'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.errors.passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.errors.passwordTooShort'));
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
        setPendingToken(data.token);
        setPendingUser(data.user);
        setMode('register_profile');
      } else {
        setError(data.error || t('auth.errors.registerFailed'));
      }
    } catch (err) {
      setError(t('auth.errors.serverConnection'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStep2 = async () => {
    if (!name.trim()) {
      setError(t('auth.errors.enterName'));
      return;
    }

    if (!level) {
      setError(t('auth.errors.selectLevel'));
      return;
    }

    setLoading(true);
    setError('');

    try {
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

      await AsyncStorage.setItem('onboardingCompleted', 'true');
      await AsyncStorage.setItem('userLevel', level);

      setPendingProfile(profileData);
      setMode('register_upsell');

    } catch (err) {
      console.log('Profile save error:', err);
      setMode('register_upsell');
    } finally {
      setLoading(false);
    }
  };

  // ─── REVENUECAT PURCHASE ────────────────────────────────────────────────────
  const handleStartTrial = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web' || !Purchases) {
        onAuth(pendingToken, { ...pendingUser, profile: pendingProfile });
        return;
      }

      const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
      if (!apiKey.includes('YOUR_REVENUECAT')) {
        try {
          await Purchases.configure({ apiKey });
          
          const offerings = await Purchases.getOfferings();
          if (offerings.current && offerings.current.availablePackages.length > 0) {
            const pkg = offerings.current.availablePackages[0];
            const { customerInfo } = await Purchases.purchasePackage(pkg);
            
            if (customerInfo.entitlements.active['pro']) {
              try {
                await fetch(`${API_URL}/subscription/activate`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pendingToken}`,
                  },
                  body: JSON.stringify({
                    revenueCatId: customerInfo.originalAppUserId,
                  }),
                });
              } catch (syncErr) {
                console.log('Server sync warning:', syncErr);
              }
              
              Alert.alert('🎉 Velkommen til Pro!', 'Du har nu adgang til alle funktioner.');
            }
          }
        } catch (purchaseErr) {
          if (!purchaseErr.userCancelled) {
            console.log('Purchase error:', purchaseErr);
          }
        }
      }
      
      onAuth(pendingToken, { ...pendingUser, profile: pendingProfile });

    } catch (err) {
      console.log('Trial error:', err);
      onAuth(pendingToken, { ...pendingUser, profile: pendingProfile });
    } finally {
      setLoading(false);
    }
  };

  // ─── RESTORE PURCHASES ──────────────────────────────────────────────────────
  const handleRestorePurchases = async () => {
    if (Platform.OS === 'web' || !Purchases) {
      Alert.alert('Gendan køb', 'Gendan køb er kun tilgængeligt i iOS og Android appen.');
      return;
    }

    setLoading(true);
    try {
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
      if (!apiKey.includes('YOUR_REVENUECAT')) {
        await Purchases.configure({ apiKey });
      }

      const customerInfo = await Purchases.restorePurchases();

      if (customerInfo.entitlements.active['pro']) {
        try {
          await fetch(`${API_URL}/subscription/activate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${pendingToken}`,
            },
            body: JSON.stringify({
              revenueCatId: customerInfo.originalAppUserId,
            }),
          });
        } catch (syncErr) {
          console.log('Server sync warning:', syncErr);
        }

        Alert.alert('✅ Køb gendannet!', 'Din Pro subscription er aktiveret.', [
          { text: 'Fortsæt', onPress: () => onAuth(pendingToken, { ...pendingUser, profile: pendingProfile }) }
        ]);
      } else {
        Alert.alert('Ingen køb fundet', 'Vi kunne ikke finde et aktivt abonnement.');
      }
    } catch (err) {
      console.error('Restore error:', err);
      Alert.alert('Fejl', 'Kunne ikke gendanne køb. Prøv igen.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipTrial = () => {
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
            <View style={styles.logoContainer}>
              <AppLogo size={160} />
              <Text style={styles.tagline}>{t('auth.tagline')}</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{t('auth.login')}</Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.email')}</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('auth.emailPlaceholder')}
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.password')}</Text>
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
                <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.black} />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('auth.login')}</Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.or')}</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => { setMode('register'); setError(''); setSuccessMessage(''); }}
              >
                <Text style={styles.secondaryButtonText}>{t('auth.createAccount')}</Text>
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
            <View style={styles.logoContainer}>
              <AppLogo size={140} />
              <Text style={styles.tagline}>{t('auth.resetPassword')}</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{t('auth.forgotPassword')}</Text>
              <Text style={styles.formSubtitle}>{t('auth.forgotPasswordDesc')}</Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.email')}</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('auth.emailPlaceholder')}
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
                  <Text style={styles.primaryButtonText}>{t('auth.sendResetCode')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => { setMode('login'); setError(''); }}
              >
                <Text style={styles.linkButtonText}>← {t('auth.backToLogin')}</Text>
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
            <View style={styles.logoContainer}>
              <AppLogo size={140} />
              <Text style={styles.tagline}>{t('auth.createNewPassword')}</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{t('auth.resetPassword')}</Text>
              <Text style={styles.formSubtitle}>{t('auth.checkEmail')}</Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.resetCode')}</Text>
                <TextInput
                  style={styles.input}
                  value={resetCode}
                  onChangeText={setResetCode}
                  placeholder={t('auth.resetCodePlaceholder')}
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus={true}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.newPassword')}</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t('auth.minChars')}
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.confirmNewPassword')}</Text>
                <TextInput
                  style={styles.input}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  placeholder={t('auth.repeatPassword')}
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
                  <Text style={styles.primaryButtonText}>{t('auth.resetPassword')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => { setMode('forgot_password'); setError(''); }}
              >
                <Text style={styles.linkButtonText}>{t('auth.resendCode')}</Text>
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
            <View style={styles.logoContainer}>
              <AppLogo size={140} />
              <Text style={styles.tagline}>{t('auth.getStarted')}</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{t('auth.createAccount')}</Text>
              <Text style={styles.stepIndicator}>{t('auth.step1of3')}</Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.email')}</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('auth.emailPlaceholder')}
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.password')}</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('auth.minChars')}
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.confirmPassword')}</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('auth.repeatPassword')}
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
                  <Text style={styles.primaryButtonText}>{t('auth.continue')} →</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => { setMode('login'); setError(''); }}
              >
                <Text style={styles.linkButtonText}>{t('auth.hasAccount')}</Text>
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
            <View style={styles.profileHeader}>
              <Text style={styles.profileTitle}>{t('auth.tellUsAboutYou')}</Text>
              <Text style={styles.stepIndicator}>{t('auth.step2of3')}</Text>
            </View>

            <View style={styles.profileForm}>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.name')} *</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('auth.yourName')}
                  placeholderTextColor={colors.muted}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroupSmall}>
                  <Text style={styles.inputLabel}>{t('auth.age')}</Text>
                  <TextInput
                    style={styles.input}
                    value={age}
                    onChangeText={setAge}
                    placeholder={t('auth.years')}
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={styles.inputGroupSmall}>
                  <Text style={styles.inputLabel}>{t('auth.weight')}</Text>
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
                  <Text style={styles.inputLabel}>{t('auth.height')}</Text>
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

              <View style={styles.sectionGroup}>
                <Text style={styles.sectionLabel}>{t('auth.runningLevel')} *</Text>
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

              <View style={styles.sectionGroup}>
                <Text style={styles.sectionLabel}>{t('auth.yourGoals')}</Text>
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

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('auth.weeklyGoalKm')}</Text>
                <TextInput
                  style={styles.input}
                  value={weeklyGoalKm}
                  onChangeText={setWeeklyGoalKm}
                  placeholder={t('auth.weeklyGoalExample')}
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleRegisterStep2}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.black} />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('auth.continue')} →</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── REGISTER STEP 3 - PRO UPSELL (with Terms/Privacy/Restore) ────────────
  if (mode === 'register_upsell') {
    return (
      <SafeAreaView style={styles.upsellContainer}>
        <ScrollView contentContainerStyle={styles.upsellContent} showsVerticalScrollIndicator={false}>
          <View style={styles.upsellHeader}>
            <AppLogo size={200} />
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>⭐ PRO</Text>
            </View>
            <Text style={styles.upsellTitle}>Lås op for fuld adgang</Text>
            <Text style={styles.upsellSubtitle}>Få adgang til alle funktioner og nå dine mål hurtigere</Text>
          </View>

          <View style={styles.featuresGrid}>
            {PRO_FEATURES.map((f, i) => (
              <View key={i} style={styles.featureCard}>
                <Text style={styles.featureEmoji}>{f.emoji}</Text>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>

          {/* Subscription Info */}
          <View style={styles.subscriptionInfo}>
            <Text style={styles.subscriptionTitle}>RunWithAI Pro</Text>
            <Text style={styles.subscriptionDetail}>Månedligt abonnement</Text>
          </View>

          <View style={styles.priceSection}>
            <Text style={styles.priceAmount}>49 kr</Text>
            <Text style={styles.priceUnit}>/måned</Text>
          </View>

          <Text style={styles.guarantee}>✓ Annuller når som helst • ✓ 7 dages gratis prøveperiode</Text>

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

          {/* Restore Purchases - Required by Apple */}
          <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases} disabled={loading}>
            <Text style={styles.restoreButtonText}>Gendan tidligere køb</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkipTrial}>
            <Text style={styles.skipButtonText}>Fortsæt med gratis version</Text>
          </TouchableOpacity>

          {/* Legal Text */}
          <Text style={styles.legalText}>
            Betaling opkræves via din App Store konto. Abonnement fornyes automatisk medmindre det annulleres mindst 24 timer før periodens udløb. Du kan administrere dit abonnement i dine App Store-indstillinger.
          </Text>

          {/* Terms & Privacy Links - REQUIRED by Apple */}
          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={() => Linking.openURL(TERMS_OF_USE_URL)}>
              <Text style={styles.legalLink}>Vilkår for brug</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>•</Text>
            <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
              <Text style={styles.legalLink}>Privatlivspolitik</Text>
            </TouchableOpacity>
          </View>
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
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 0,
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
    marginTop: 16,
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
  subscriptionInfo: {
    alignItems: 'center',
    marginBottom: 8,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  subscriptionDetail: {
    fontSize: 14,
    color: '#888',
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
  restoreButton: {
    paddingVertical: 12,
    marginBottom: 4,
  },
  restoreButtonText: {
    color: '#888',
    fontSize: 14,
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
  },
  legalText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    lineHeight: 14,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  legalLink: {
    fontSize: 12,
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 12,
    color: '#666',
  },
});
