import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';

let HK = null;
if (Platform.OS === 'ios') {
    try { HK = require('@kingstinct/react-native-healthkit'); } catch (e) { HK = null; }
}

export function useHealthCalories() {
    const [calories, setCalories] = useState(0);
    const [authorized, setAuthorized] = useState(false);

  const requestAuth = useCallback(async () => {
        if (Platform.OS !== 'ios' || !HK) {
                Alert.alert('HK INIT', 'HealthKit module not available on this platform');
                return false;
        }
        try {
                const isAvailable = await HK.isHealthDataAvailableAsync();
                if (!isAvailable) {
                          Alert.alert('HK INIT', 'Health data not available on this device');
                          return false;
                }
                await HK.requestAuthorization(['HKQuantityTypeIdentifierActiveEnergyBurned'], []);
                setAuthorized(true);
                Alert.alert('HK INIT', 'Successfully initialized - authorized=true');
                return true;
        } catch (e) {
                Alert.alert('HK INIT Error', String(e?.message || e));
                return false;
        }
  }, []);

  const fetchTodayCalories = useCallback(async () => {
        if (Platform.OS !== 'ios' || !HK || !authorized) return 0;
        try {
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date();
                const samples = await HK.queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', {
                          from: startOfDay,
                          to: endOfDay,
                          unit: 'kcal',
                });
                const total = samples.reduce((sum, s) => sum + (s.quantity || 0), 0);
                setCalories(Math.round(total));
                return Math.round(total);
        } catch (e) {
                return 0;
        }
  }, [authorized]);

  useEffect(() => { requestAuth(); }, [requestAuth]);
    useEffect(() => {
          if (!authorized) return;
          fetchTodayCalories();
          const interval = setInterval(fetchTodayCalories, 60000);
          return () => clearInterval(interval);
    }, [authorized, fetchTodayCalories]);

  return { calories, authorized, refresh: fetchTodayCalories };
}
