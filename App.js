import './src/i18n';
import { useTranslation } from 'react-i18next';
import PricingPage, { useSubscription, Paywall } from './components/Pricing';
import React, { useState, useEffect } from 'react';
import { Icon } from './src/components/Icons';
import { SERVER } from './src/config';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, ScrollView, Modal, Alert, Platform, Image } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Line, Rect, Polyline, Polygon } from 'react-native-svg';
import {
  colors, DEFAULT_WEEK_PLAN, DEFAULT_NEXT_WORKOUT, DEFAULT_PROFILE,
  loadProfile, saveProfile, loadWeekPlan, saveWeekPlan, setAuthToken, generateTrainingPlan, getAuthToken, loadTrainingPlan, loadRuns, initAuthToken,
} from './src/data';
import { useWatch } from './src/hooks/useWatch'
import useHealthKit from './src/hooks/useHealthKit'
import { useHealthConnect } from './src/hooks/useHealthConnect'
import { syncAuthToWatch } from './src/services/WatchSync';
import Auth from './src/screens/Auth';
import Onboarding from './src/screens/Onboarding';
import OnboardingCarousel from './src/components/OnboardingCarousel';
import Dashboard from './src/screens/Dashboard';
import Chat from './src/screens/Chat';
import Activity, { RunCalendar } from './src/screens/Activity';
import Settings from './src/screens/Settings';
import Profile from './src/screens/Profile';
import Goals from './src/screens/Goals';
import RunTracker from './src/screens/RunTracker';
import CycleTracker from './src/screens/CycleTracker';
import Stats from './src/screens/Stats';
import RunDetail from './src/screens/RunDetail';
import { RoutesTab as RoutesTabComponent } from './src/screens/RoutesTab';
import Privacy from './src/screens/Privacy';
import GoalsSetup from './src/screens/GoalsSetup';
import { initNotifications, loadSettings as loadNotifSettings, syncFromSettings } from './src/utils/notifications';
import LogActivity from './src/screens/LogActivity';
import ActivityTypePicker from './src/screens/ActivityTypePicker';
import MotionPicker from './src/screens/MotionPicker';
import TreadmillTracker from './src/screens/TreadmillTracker';
import * as WebBrowser from 'expo-web-browser';
import Home from './src/screens/Home';
import More from './src/screens/More';
import { expandPlanToWeeks } from './src/data'; // levende plan: udrulning med datoer
WebBrowser.maybeCompleteAuthSession();

// ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ TAB IKONER (React Native SVG) ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢â¬Å¡ÃÂ¬Ãâ¦ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Â¦ÃâÃÂ¡ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¬
const IconPlan = ({ active }) => {
  const color = active ? '#0a0a0a' : '#b0b0b0';
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Polyline points="9 22 9 12 15 12 15 22" />
    </Svg>
  );
};
const IconProgress = ({ active }) => {
  const color = active ? '#0a0a0a' : '#b0b0b0';
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </Svg>
  );
};
const IconStats = ({ active }) => {
  const color = active ? '#0a0a0a' : '#b0b0b0';
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="18" y1="20" x2="18" y2="10" />
      <Line x1="12" y1="20" x2="12" y2="4" />
      <Line x1="6" y1="20" x2="6" y2="14" />
    </Svg>
  );
};
const IconCalendar = ({ active }) => {
  const color = active ? '#0a0a0a' : '#b0b0b0';
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
  );
};

const IconZap = ({ color = '#ffffff' }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill={color}>
    <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </Svg>
);
const AppLogo = ({ size = 50 }) => (
  <Image
    source={require('./assets/icon.png')}
    style={{ width: size, height: size, borderRadius: size * 0.18, marginVertical: -30 }}
    resizeMode="contain"
  />
);

function ProFeatureLock({ feature, description, onUpgrade }) {
  const { t } = useTranslation();
  return (
    <View style={proLockStyles.container}>
      <View style={proLockStyles.card}>
        <Text style={proLockStyles.icon}>ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ°ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¦ÃÆÃ¢â¬Å¡ÃâÃÂ¸ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¾ÃâÃÂ¢</Text>
        <Text style={proLockStyles.title}>{feature}</Text>
        <Text style={proLockStyles.description}>{description}</Text>
        <TouchableOpacity style={proLockStyles.button} onPress={onUpgrade}>
          <Text style={proLockStyles.buttonText}>{t('pro.upgradeToPro')} ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ¢ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Å¡ÃâÃÂ ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¾ÃâÃÂ¢</Text>
        </TouchableOpacity>
        <Text style={proLockStyles.price}>{t('pro.fromOnly')}</Text>
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

function RunTab({ nextWorkout, onStartActivity, runs, profile, isPro, isFree, onShowPricing }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('start');
  const lastRun = runs && runs.length > 0 ? [...runs].sort((a,b) => new Date(b.date||0) - new Date(a.date||0))[0] : null;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 10 }}>
        {[['start', t('run.startRun')],['routes', t('run.aiRoutes')]].map(([id, label]) => (
          <TouchableOpacity key={id}
            style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: activeTab === id ? colors.black : colors.surface, borderWidth: 2, borderColor: activeTab === id ? colors.black : colors.border2 }}
            onPress={() => setActiveTab(id)}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: activeTab === id ? colors.card : colors.muted }}>
              {label}{id === 'routes' && isFree && ' ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ°ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¦ÃÆÃ¢â¬Å¡ÃâÃÂ¸ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¾ÃâÃÂ¢'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {activeTab === 'start' ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <TouchableOpacity onPress={() => onStartActivity('motion')}
            style={{ backgroundColor: colors.black, borderRadius: 20, padding: 28, marginBottom: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>🏃</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: colors.card, letterSpacing: -0.5 }}>Motion</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Løb · Gå · Cykling</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onStartActivity('pick')}
            style={{ backgroundColor: '#f59e0b', borderRadius: 20, padding: 28, marginBottom: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>💪</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>Træning</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>Styrke, mobility m.m.</Text>
          </TouchableOpacity>
          {lastRun && (
            <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 10, color: colors.muted, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>{t('run.lastActivity')}</Text>
              <View style={{ flexDirection: 'row', gap: 20 }}>
                <View><Text style={{ fontSize: 22, fontWeight: '900', color: colors.accent }}>{lastRun.km != null ? Number(lastRun.km).toFixed(2).replace('.', ',') : 'â'}</Text><Text style={{ fontSize: 10, color: colors.muted, fontWeight: '600' }}>{t('run.km')}</Text></View>
                <View><Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>{lastRun.duration ? (Math.floor(Number(lastRun.duration)/60) + ':' + String(Math.floor(Number(lastRun.duration)%60)).padStart(2,'0')) : 'â'}</Text><Text style={{ fontSize: 10, color: colors.muted, fontWeight: '600' }}>{t('run.time')}</Text></View>
                <View><Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>{lastRun.pace ? (Math.floor(Number(lastRun.pace)/60) + ':' + String(Math.round(Number(lastRun.pace)%60)).padStart(2,'0')) : 'â'}</Text><Text style={{ fontSize: 10, color: colors.muted, fontWeight: '600' }}>{t('run.pace')}</Text></View>
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        !isFree ? <RoutesTabWrapper profile={profile} runs={runs} /> : <ProFeatureLock feature={t('pro.aiRoutes.title')} description={t('pro.aiRoutes.description')} onUpgrade={onShowPricing} />
      )}
    </View>
  );
}
function CalendarTab({ runs, weekPlan, trainingPlan, isPro, onShowPricing }) {
  const { t } = useTranslation();
  if (!isPro) return <ProFeatureLock feature={t('pro.calendar.title')} description={t('pro.calendar.description')} onUpgrade={onShowPricing} />;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <Text style={{ fontSize: 11, color: colors.muted, letterSpacing: 2, fontWeight: '700', marginBottom: 16 }}>{t('tabs.calendar').toUpperCase()}</Text>
      <RunCalendar runs={runs} weekPlan={weekPlan} trainingPlan={trainingPlan} />
    </ScrollView>
  );
}
function StatsTab({ runs, profile, level, isPro, onShowPricing }) {
  const { t } = useTranslation();
  if (!isPro) {
    const totalKm = runs.reduce((sum, r) => sum + (parseFloat(r.km) || 0), 0);
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 32, fontWeight: '900', color: colors.accent }}>{runs.length}</Text><Text style={{ fontSize: 12, color: colors.muted }}>{t('stats.runs')}</Text></View>
            <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 32, fontWeight: '900', color: colors.text }}>{totalKm.toFixed(1)}</Text><Text style={{ fontSize: 12, color: colors.muted }}>{t('stats.totalKm')}</Text></View>
          </View>
        </View>
        <TouchableOpacity style={{ backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }} onPress={onShowPricing}>
          <Text style={{ color: colors.black, fontWeight: 'bold', fontSize: 15 }}>{t('pro.stats.unlock')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }
  return <Stats runs={runs} profile={profile} level={level} />;
}
function PlanTab({ level, nextWorkout, weekPlan, planChanges, profile, runs, onNavigate, onStartActivity, trainingPlan, onPlanUpdate, isPro, isFree, onShowPricing }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('plan');
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 10, backgroundColor: colors.bg }}>
        {[['plan', t('tabs.plan')],['kalender','Kalender'],['coach','AI Coach']].map(([id, label]) => (
          <TouchableOpacity key={id}
            style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: activeTab === id ? colors.black : colors.surface, borderWidth: 2, borderColor: activeTab === id ? colors.black : colors.border2 }}
            onPress={() => setActiveTab(id)}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: activeTab === id ? colors.card : colors.muted }}>
              {label}{id === 'coach' && isFree && ' ÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Å¡ÃâÃÂ°ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¦ÃÆÃ¢â¬Å¡ÃâÃÂ¸ÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃ¢â¬Å¡ÃâÃÂÃÆÃâÃâÃÂ¢ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¡ÃâÃÂ¬ÃÆÃÂ¢ÃÂ¢Ã¢âÂ¬ÃÂ¾ÃâÃÂ¢'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        {activeTab === 'plan' ? (
          <Dashboard level={level} nextWorkout={nextWorkout} weekPlan={weekPlan} planChanges={planChanges} profile={profile} runs={runs} onNavigate={onNavigate} onStartActivity={onStartActivity} />
        ) : activeTab === 'kalender' ? (
          !isFree
            ? <CalendarTab runs={runs} weekPlan={weekPlan} trainingPlan={trainingPlan} isPro={isPro} onShowPricing={onShowPricing} />
            : <ProFeatureLock feature={t('pro.calendar.title')} description={t('pro.calendar.description')} onUpgrade={onShowPricing} />
        ) : (
          !isFree
            ? <Chat level={level} profile={profile} weekPlan={weekPlan} nextWorkout={nextWorkout} onPlanUpdate={onPlanUpdate} runs={runs} />
            : <ProFeatureLock feature={t('pro.coach.title')} description={t('pro.coach.description')} onUpgrade={onShowPricing} />
        )
        }
      </View>
    </View>
  );
}

function RoutesTabWrapper({ profile, runs }) {
  return <RoutesTabComponent profile={profile} runs={runs} />;
}

function TabBar({ tab, setTab, isPro }) {
  const { t } = useTranslation();
  const TABS = [
    { id: 'home',      label: 'Hjem',             Icon: IconPlan      },
    { id: 'activity',  label: t('tabs.progress'), Icon: IconProgress  },
    { id: 'run',       label: '',                 Icon: null          },
  { id: 'calendar',  label: 'Kalender',         Icon: IconCalendar  },
    { id: 'more',      label: 'Mere',             Icon: IconStats     },
  ];
  return (
    <View style={s.tabBar}>
      {TABS.map(t_item => {
        const active = tab === t_item.id;
        const TabIcon = t_item.Icon;
        if (t_item.id === 'run') {
          return (
            <TouchableOpacity key={t_item.id} style={s.tabItemRun} onPress={() => setTab(t_item.id)}>
              <View style={s.runBtnContainer}>
                <View style={[s.runBtn, active && s.runBtnActive]}>
                  <IconZap color="#ffffff" />
                </View>
              </View>
              <Text style={s.tabLabel}>{t('tabs.start')}</Text>
              <View style={[s.tabActiveDot, { opacity: active ? 1 : 0 }]} />
            </TouchableOpacity>
          );
        }
        return (
          <TouchableOpacity key={t_item.id} style={s.tabItem} onPress={() => setTab(t_item.id)}>
            <View style={s.tabIconWrap}>
              <TabIcon active={active} />
            </View>
            <Text style={[s.tabLabel, active && s.tabLabelActive]}>{t_item.label}</Text>
            <View style={[s.tabActiveDot, { opacity: active ? 1 : 0 }]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: 'red', fontSize: 16, marginBottom: 10 }}>App Error:</Text>
          <Text style={{ color: '#fff', fontSize: 12 }}>{String(this.state.error)}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { t } = useTranslation();
  const [chatDraft, setChatDraft] = useState('');

  const [user, setUser] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [level, setLevel]                   = useState(null);
  const [tab, setTab]                       = useState('home');
  const [profile, setProfileState]          = useState(DEFAULT_PROFILE);
  const [weekPlan, setWeekPlanState]        = useState(DEFAULT_WEEK_PLAN);
  const [nextWorkout, setNextWorkout]       = useState(DEFAULT_NEXT_WORKOUT);
  const [planChanges, setPlanChanges]       = useState([]);
  const [trainingPlan, setTrainingPlan]     = useState(null);

  // Naar den gemte AI-plan findes, saettes dagens traening fra den - saa Home,
  // PlanTab og RunTab viser den rigtige plan i stedet for den statiske skabelon.
  // (Samme dato-opslag som RunCalendar: session.date === dags dato.)
  useEffect(() => {
    try {
      if (!trainingPlan || !Array.isArray(trainingPlan.data)) return;
      const p = x => String(x).padStart(2, '0');
      const d = new Date();
      const iso = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
      let session = null;
      trainingPlan.data.forEach(week => (week.days || []).forEach(s => { if (s.date === iso) session = s; }));
      if (!session) return;
      const navn = session.title || session.workout || (session.rest ? 'Hvile' : '');
      const besk = session.workout || session.title || '';
      setNextWorkout(prev => ({
        ...prev,
        name: { beginner: navn, intermediate: navn, advanced: navn },
        desc: { beginner: besk, intermediate: besk, advanced: besk },
        fromPlan: true,
      }));
    } catch (e) {}
  }, [trainingPlan]);
  const [runs, setRuns]                     = useState([]);
  const [loading, setLoading]               = useState(true);
  const [activityType, setActivityType]     = useState('run');
  const [showPricing, setShowPricing]       = useState(false);
  const [showTierCarousel, setShowTierCarousel] = useState(false);
  const [selectedRun, setSelectedRun]       = useState(null);
// Watch sync - modtager run fra ur og marker dagens trÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¦ning som completed
  const trainingPlanRef = React.useRef(null);
  const { sendTodayTraining } = useWatch({
    onCommand: () => {},
    onWorkoutComplete: (run, saved) => {
      const days = ['SÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¸n','Man','Tir','Ons','Tor','Fre','LÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¸r'];
      const todayShort = days[new Date().getDay()];
      const plan = trainingPlanRef.current;
      if (!plan || !plan.data) return;
      const planData = Array.isArray(plan.data) ? plan.data : [];
      let changed = false;
      const updated = planData.map(d => {
        if (d.day === todayShort && !d.completed) {
          changed = true;
          return { ...d, completed: true, completedAt: new Date().toISOString() };
        }
        return d;
      });
      if (!changed) return;
      setWeekPlan(updated);
      setTrainingPlan({ data: updated, generated_at: new Date().toISOString() });
      const tok = getAuthToken();
      if (tok) {
        fetch(`${SERVER}/trainingplan/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
          body: JSON.stringify({ data: updated }),
        }).catch(() => {});
      }
    },
  });

  const token = getAuthToken();
  const { subscription, tier, isPro, isBasic, isFree, canUseAICoach, canUseAllActivities, weeklyActivityLimit, canTrackRun, refresh: refreshSubscription } = useSubscription(token);
  const { calories: hkCalories, fetchDailyCalories, isSupported: hkSupported, isAvailable: hkAvail, isAuthorized: hkAuth, isInitializing: hkInit, error: hkError } = useHealthKit();
  // Android: Health Connect parallel til iOS HealthKit. PÃ¥ modsat platform returnerer hooken bare 0.
  const { calories: hcCalories, fetchDailyCalories: hcFetchDailyCalories, isAuthorized: hcAuth } = useHealthConnect();
  // Kombineret kalorie-vÃ¦rdi: kun Ã©n af dem er > 0 pÃ¥ en given platform.
  const combinedHealthCalories = (hkCalories || 0) + (hcCalories || 0);
  const combinedFetchDailyCalories = async () => {
    if (fetchDailyCalories) await fetchDailyCalories();
    if (hcFetchDailyCalories) await hcFetchDailyCalories();
  };
  const combinedAuth = hkAuth || hcAuth;

  useEffect(() => { trainingPlanRef.current = trainingPlan; }, [trainingPlan]);

  // Etape 10.2: Init notifications + sync naar weekPlan aendres
  useEffect(() => {
    initNotifications();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const ns = await loadNotifSettings();
        if (ns.mealReminderEnabled || ns.workoutReminderEnabled) {
          await syncFromSettings(ns, weekPlan);
        }
      } catch (e) { /* ignore */ }
    })();
  }, [weekPlan]);

  // HealthKit auto-sync til Railway fjernet - vi lÃ¦ser direkte i
  // Watch auto-sync: send today's training when weekPlan loads
  useEffect(() => {
    if (weekPlan && weekPlan.length > 0 && sendTodayTraining) {
      const daysDa = ['SÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¸n','Man','Tir','Ons','Tor','Fre','LÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¸r'];
      const todayShortDa = daysDa[new Date().getDay()];
      const todayPlan = weekPlan.find(p => p.day === todayShortDa) || weekPlan[0];
      if (todayPlan) {
        sendTodayTraining(todayPlan, weekPlan).catch(err => console.warn('[App] auto send:', err));
      }
    }
  }, [weekPlan]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('subscription') === 'success') {
        Alert.alert(t('alerts.welcomePro.title'), t('alerts.welcomePro.message'));
        refreshSubscription();
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
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
    setLoading(false); // vis UI straks fra lokal cache; server-data hentes i baggrunden
    const [savedProfile, savedPlan, savedTrainingPlan, savedRuns] = await Promise.all([
      loadProfile(), loadWeekPlan(), loadTrainingPlan(), loadRuns(),
    ]);
    if (savedRuns) setRuns(savedRuns);
    if (savedTrainingPlan) {
      if (savedTrainingPlan.data && typeof savedTrainingPlan.data === 'string') {
        try { savedTrainingPlan.data = JSON.parse(savedTrainingPlan.data); } catch {}
      }
      setTrainingPlan(savedTrainingPlan);
      if (Array.isArray(savedTrainingPlan.data) && savedTrainingPlan.data.length > 0) {
        const todayShort = ['SÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¸n','Man','Tir','Ons','Tor','Fre','LÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¸r'][new Date().getDay()];
        const synced = savedTrainingPlan.data.map(d => ({ ...d, today: d.day === todayShort }));
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
  };

  // Init token from AsyncStorage before loading data
useEffect(() => {
  initAuthToken().then(() => {
    const savedToken = getAuthToken();
    if (savedToken) {
      setAuthToken(savedToken);
      setUser({ token: savedToken });
      syncAuthToWatch(savedToken, 'user');
      setLoading(false);
      fetch(`${SERVER}/profile`, {
        headers: { Authorization: `Bearer ${savedToken}`, 'Content-Type': 'application/json' }
      }).then(r => {
        if (r.status === 401 || r.status === 403) {
          setAuthToken(null);
          setUser(null);
        }
      }).catch(() => {});
    } else {
      setLoading(false);
    }
  }).catch(() => {
    setLoading(false);
  });
}, []);

  useEffect(() => { if (user) loadData(); }, [user]);

  const handleLogout = () => {
    setAuthToken(null); setUser(null); setShowOnboarding(true); setTab('home');
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
        ...prev, ...update.nextWorkout,
        name: typeof update.nextWorkout.name === 'string'
          ? { beginner: update.nextWorkout.name, intermediate: update.nextWorkout.name, advanced: update.nextWorkout.name }
          : update.nextWorkout.name || prev.name,
        desc: typeof update.nextWorkout.desc === 'string'
          ? { beginner: update.nextWorkout.desc, intermediate: update.nextWorkout.desc, advanced: update.nextWorkout.desc }
          : update.nextWorkout.desc || prev.desc,
      }));
    }
    if (update.weekPlan) {
      const todayShort = ['SÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¸n','Man','Tir','Ons','Tor','Fre','LÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¸r'][new Date().getDay()];
      const planData = update.weekPlan.map(d => ({
        day: d.day, workout: d.workout || d.name || 'TrÃÆÃâÃâ Ã¢â¬â¢ÃÆÃ¢â¬Â ÃÂ¢Ã¢âÂ¬Ã¢âÂ¢ÃÆÃâÃÂ¢Ã¢âÂ¬ÃÂ¡ÃÆÃ¢â¬Å¡ÃâÃÂ¦ning', km: d.km || 0,
        color: d.color || '#c8ff00', type: d.type || 'run',
        description: d.description || d.desc || '',
        rest: d.type === 'rest' || (d.km === 0 && !d.type), today: d.day === todayShort,
      }));
      // Coach-hjernen har opdateret ugeplanen: udrul den med rigtige datoer
      // (samme format som onboarding-planen) og flet den ind i den gemte plan,
      // saa kommende uger bevares og kalenderen forstaar resultatet.
      let mergedPlan = null;
      try {
        const expanded = expandPlanToWeeks({ weekPlan: planData.map(d => ({
          day: d.day,
          title: d.workout,
          workout: d.description || d.workout,
          km: d.km || 0,
          rest: !!d.rest,
        })) });
        const byDate = {};
        (expanded || []).forEach(w => (w.days || []).forEach(s => { if (s.date) byDate[s.date] = s; }));
        if (trainingPlan && Array.isArray(trainingPlan.data) && trainingPlan.data[0] && trainingPlan.data[0].days) {
          mergedPlan = trainingPlan.data.map(w => ({
            ...w,
            days: (w.days || []).map(s => (s.date && byDate[s.date]) ? { ...byDate[s.date], week: w.week } : s),
          }));
        } else {
          mergedPlan = expanded;
        }
      } catch (e) { mergedPlan = null; }
      setWeekPlan(planData);
      if (mergedPlan) setTrainingPlan({ data: mergedPlan, generated_at: new Date().toISOString() });
      const token = getAuthToken();
      if (token) {
        fetch(`${SERVER}/trainingplan/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ data: mergedPlan || planData }),
        }).catch(() => {});
      }
    }
    if (update.changeNote) {
      const time = new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
      setPlanChanges(prev => [...prev.slice(-4), { note: update.changeNote, time }]);
    }
  };

  const handleStartActivity = (type) => {
    if (!canTrackRun && isFree) {
      Alert.alert(t('pro.limit.title'), t('pro.limit.message'), [
        { text: t('pro.limit.cancel'), style: 'cancel' },
        { text: t('pro.limit.seePlans'), onPress: () => setShowTierCarousel(true) }
      ]);
      return;
    }
if (type === 'pick') {
      setTab('activityPicker');
      return;
    }
    if (type === 'motion') {
      setTab('motionPicker');
      return;
    }
    setActivityType(type);
    if (type === 'bike') {
      setTab('cycleTracker');
    } else if (type === 'mobility' || type === 'other') {
      setTab('logActivity');
    } else {
      setTab('tracker');
    }
  };

  if (loading) return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      <View style={{ flex:1, backgroundColor: colors.black, alignItems:'center', justifyContent:'center' }}>
        <AppLogo size={200} />
        <ActivityIndicator color={colors.accent} style={{ marginTop: 2 }} />
      </View>
    </SafeAreaProvider>
  );

  if (!user) return (
    <SafeAreaProvider>
      <Auth onAuth={(token, userData, isNewUser) => {
        // Ny bruger: ryd enhedens gamle onboarding-flag (enheds-globalt spoegelse!)
        // og aabn den rigtige Onboarding-skaerm.
        if (isNewUser) {
          try { AsyncStorage.removeItem('onboardingCompleted'); } catch (e) {}
          setShowOnboarding(true);
        }
        setAuthToken(token); setUser(userData); syncAuthToWatch(token, (userData && (userData.email || userData.id || userData._id)) || 'user'); setLoading(true); loadData();
      }} />
    </SafeAreaProvider>
  );

  if (tab === 'tracker') {
    if (!RunTracker) return <SafeAreaProvider><View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text>RunTracker mangler</Text></View></SafeAreaProvider>;
    return (
      <SafeAreaProvider>
        <RunTracker profile={profile} level={level} weekPlan={weekPlan} nextWorkout={nextWorkout}
          runs={runs} activityType={activityType} onBack={() => setTab('dashboard')} onShowPricing={() => setShowTierCarousel(true)} />
      </SafeAreaProvider>
    );
  }

if (tab === 'cycleTracker') {
    if (!CycleTracker) return <SafeAreaProvider><View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text>CycleTracker mangler</Text></View></SafeAreaProvider>;
    return (
      <SafeAreaProvider>
        <CycleTracker profile={profile} level={level} weekPlan={weekPlan} nextWorkout={nextWorkout}
          runs={runs} onBack={() => { setActivityType(null); setTab('dashboard'); loadData(); }} onShowPricing={() => setShowTierCarousel(true)} />
      </SafeAreaProvider>
    );
  }

  if (tab === 'treadmillTracker') {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <TreadmillTracker
          token={getAuthToken()}
          profile={profile}
          mode={activityType}
          onClose={() => { setActivityType(null); setTab('dashboard'); }}
          onSaved={() => { loadData(); }}
        />
      </SafeAreaProvider>
    );
  }

  if (showOnboarding) return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      <Onboarding onDone={async (chosenLevel, goalInfo) => {
        setLevel(chosenLevel);
        const merged = { ...profile, ...(goalInfo || {}), level: chosenLevel };
        try {
          await AsyncStorage.setItem('onboardingCompleted', 'true');
          await AsyncStorage.setItem('userLevel', chosenLevel);
        } catch (e) { console.log('AsyncStorage write error:', e); }
        setProfileState(merged);
        await saveProfile(merged);
        // Genindlaes traeningsplanen fra serveren saa kalenderen viser praecis
        // den plan brugeren lige fik i onboarding (gemt i goToPlan). Uden dette
        // staar trainingPlan-staten tilbage fra app-boot (foer planen fandtes).
        try { const tp = await loadTrainingPlan(); if (tp) setTrainingPlan(tp); } catch (e) {}
        // Opdater Pro-status straks - koebet kan vaere sket paa trial-skaermen i onboardingen
        // (upgrade-modalen goer allerede det samme; uden dette kraevede det logout/login).
        try { refreshSubscription && refreshSubscription(); } catch (e) {}
        setShowOnboarding(false);
      }} />
    </SafeAreaProvider>
  );

  const renderScreen = () => {
    switch (tab) {
      case 'home':
      return <Home level={level} profile={profile} weekPlan={weekPlan} nextWorkout={nextWorkout} runs={runs} onNavigate={setTab} onStartActivity={handleStartActivity} onOpenChat={(draft) => { setChatDraft(draft || ''); setTab('chat'); }} isPro={isPro} isFree={isFree} onShowPricing={() => setShowTierCarousel(true)} />;
    case 'dashboard':
        return <PlanTab level={level} nextWorkout={nextWorkout} weekPlan={weekPlan} planChanges={planChanges} profile={profile} runs={runs} onNavigate={setTab} onStartActivity={handleStartActivity} trainingPlan={trainingPlan} onPlanUpdate={handlePlanUpdate} isPro={isPro} isFree={isFree} onShowPricing={() => setShowTierCarousel(true)} />;
      case 'activity':
        return <Activity level={level} profile={profile} weekPlan={weekPlan} onSetWeekPlan={(plan) => setWeekPlan(plan)} trainingPlan={trainingPlan} onTrainingPlanChange={setTrainingPlan} runs={runs} onSelectRun={setSelectedRun} />;
      case 'run':
        return <RunTab nextWorkout={nextWorkout} onStartActivity={handleStartActivity} runs={runs} profile={profile} isPro={isPro} isFree={isFree} onShowPricing={() => setShowTierCarousel(true)} />;
      case 'stats':
        return <StatsTab runs={runs} profile={profile} level={level} isPro={isPro} onShowPricing={() => setShowTierCarousel(true)} />;
      case 'calendar':
        return <CalendarTab runs={runs} weekPlan={weekPlan} trainingPlan={trainingPlan} isPro={isPro} onShowPricing={() => setShowTierCarousel(true)} />;
      case 'chat':
        return !isFree ? <Chat level={level} profile={profile} weekPlan={weekPlan} nextWorkout={nextWorkout} onPlanUpdate={handlePlanUpdate} runs={runs} initialMessage={chatDraft} onInitialMessageConsumed={() => setChatDraft('')} /> : <ProFeatureLock feature={t('pro.coach.title')} description={t('pro.coach.description')} onUpgrade={() => setShowTierCarousel(true)} />;
      case 'more':
      return <More onNavigate={setTab} profile={profile} isPro={isPro} isFree={isFree} onShowPricing={() => setShowTierCarousel(true)} />;
    case 'settings':
        return <Settings onNavigate={setTab} level={level || 'intermediate'} onLevelChange={(lv) => { setLevel(lv); setProfile(p => ({ ...p, level: lv })); }} profile={profile} onProfileChange={setProfile} onLogout={handleLogout} onBack={() => setTab('dashboard')} subscription={subscription} onShowPricing={() => setShowTierCarousel(true)} />;
      case 'profile':
        return <Profile profile={profile} onProfileChange={(form) => setProfile(form)} onBack={() => setTab('more')} />;
      case 'goalsScreen':
        return <Goals profile={profile} onProfileChange={(form) => setProfile(form)} onBack={() => setTab('more')} />;
      case 'privacy':
        return <Privacy onBack={() => setTab('settings')} />;
      case 'goals':
        return <GoalsSetup onBack={() => setTab('settings')} />;
      case 'activityPicker':
        return <ActivityTypePicker onBack={() => setTab('dashboard')} onPick={(type) => handleStartActivity(type)} />;
      case 'motionPicker':
        return <MotionPicker onBack={() => setTab('dashboard')} onPick={(type, location) => {
          setActivityType(type);
          if (location === 'treadmill') {
            setTab('treadmillTracker');
          } else if (type === 'bike') {
            setTab('cycleTracker');
          } else {
            setTab('tracker');
          }
        }} />;

        case 'logActivity':
        return <LogActivity activityType={activityType} onBack={() => setTab('dashboard')} onDone={() => { setActivityType(null); setTab('dashboard'); loadData(); }} />;
      default:
        return null;
    }
  };

  if (selectedRun) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" backgroundColor={colors.card} />
          <RunDetail run={selectedRun} profile={profile} onBack={() => setSelectedRun(null)} />
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  return (
<ErrorBoundary>
        <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.card} />
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.topBar}>
          <AppLogo size={90} />
          <View style={s.topRight}>
            {isPro ? (
              <View style={s.proBadge}>
                <Text style={s.proBadgeText}>{t('pro.badge')}</Text>
              </View>
            ) : (
              <TouchableOpacity style={s.upgradeButton} onPress={() => setShowTierCarousel(true)}>
                <Text style={s.upgradeButtonText}>{t('pro.upgrade')}</Text>
              </TouchableOpacity>
            )}
            {planChanges.length > 0 && (
              <View style={s.updateDot}><Icon name='edit' size={10} color='#ffffff'/></View>
            )}
          </View>
        </View>
        <View style={{ flex: 1 }}>{renderScreen()}</View>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.card }}>
          <TabBar tab={tab} setTab={setTab} isPro={isPro} />
        </SafeAreaView>
        <Modal visible={showPricing} animationType="slide" presentationStyle="pageSheet">
          <PricingPage
            token={token}
            onClose={() => { setShowPricing(false); refreshSubscription(); }}
            currentTier={subscription?.tier || 'free'}
          />
        </Modal>
        <OnboardingCarousel
          visible={showTierCarousel}
          isOnboarding={false}
          onClose={() => setShowTierCarousel(false)}
          onComplete={(tier) => { setShowTierCarousel(false); refreshSubscription && refreshSubscription(); }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: colors.bg },
  topBar:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 35, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
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
  proBadge:        { backgroundColor: 'rgba(255, 255, 0, 0.64)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: colors.accent },
  proBadgeText:    { color: colors.accent, fontWeight: 'bold', fontSize: 15 },
  upgradeButton:   { backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  upgradeButtonText: { color: colors.black, fontWeight: 'bold', fontSize: 15 },
  logoText:        { fontSize: 17, letterSpacing: -0.5 },
  logoRun:         { color: colors.black, fontWeight: '900' },
  logoWith:        { color: colors.muted, fontWeight: '300', letterSpacing: 2 },
  logoAI:          { color: colors.accent, fontWeight: '900' },
});
