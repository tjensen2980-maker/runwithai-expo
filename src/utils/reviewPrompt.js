import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Platform } from 'react-native';

const COMPLETED_WORKOUTS_KEY = '@runwithai/completed-workouts-for-review';
const REVIEW_REQUESTED_KEY = '@runwithai/review-requested';
const WORKOUTS_BEFORE_REVIEW = 3;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function recordCompletedWorkoutAndMaybeRequestReview() {
  if (Platform.OS === 'web') return false;

  try {
    const values = await AsyncStorage.multiGet([
      COMPLETED_WORKOUTS_KEY,
      REVIEW_REQUESTED_KEY,
    ]);
    const completedWorkouts = Number.parseInt(values[0][1] || '0', 10) + 1;
    const reviewAlreadyRequested = values[1][1] === 'true';

    await AsyncStorage.setItem(COMPLETED_WORKOUTS_KEY, String(completedWorkouts));

    if (reviewAlreadyRequested || completedWorkouts < WORKOUTS_BEFORE_REVIEW) {
      return false;
    }

    const reviewIsAvailable = await StoreReview.isAvailableAsync();
    if (!reviewIsAvailable) return false;

    // Mark it before opening the native prompt to avoid duplicate requests.
    await AsyncStorage.setItem(REVIEW_REQUESTED_KEY, 'true');
    await wait(750);
    await StoreReview.requestReview();
    return true;
  } catch (error) {
    console.warn('[ReviewPrompt] Could not request a store review:', error);
    return false;
  }
}
