// src/services/NutritionAPI.js
// Centralt API-lag for nutrition + activity endpoints.
// Bruger automatisk staging eller production via src/config.js.

import { SERVER } from '../config';
import { getAuthToken } from '../data';

// ---- Helpers ----------------------------------------------------------------

async function authHeaders() {
  const token = await getAuthToken();
  return {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json; charset=utf-8'
  };
}

async function handle(res, label) {
  if (!res.ok) {
    let msg = 'HTTP ' + res.status;
    try {
      const j = await res.json();
      if (j && j.error) msg = j.error;
    } catch (e) {}
    throw new Error('[' + label + '] ' + msg);
  }
  return res.json();
}

// ---- Goals ------------------------------------------------------------------

export async function getGoals() {
  const headers = await authHeaders();
  const res = await fetch(SERVER + '/goals', { headers });
  return handle(res, 'getGoals');
}

export async function updateGoals(goals) {
  const headers = await authHeaders();
  const res = await fetch(SERVER + '/goals', {
    method: 'PUT',
    headers,
    body: JSON.stringify(goals)
  });
  return handle(res, 'updateGoals');
}

// ---- Daily summary ----------------------------------------------------------

export async function getDailySummary(date) {
  const headers = await authHeaders();
  const url = date
    ? SERVER + '/daily-summary?date=' + encodeURIComponent(date)
    : SERVER + '/daily-summary';
  const res = await fetch(url, { headers });
  return handle(res, 'getDailySummary');
}

// ---- Meals ------------------------------------------------------------------

export async function getMeals(date) {
  const headers = await authHeaders();
  const url = date
    ? SERVER + '/meals?date=' + encodeURIComponent(date)
    : SERVER + '/meals';
  const res = await fetch(url, { headers });
  return handle(res, 'getMeals');
}

export async function logMeal(meal) {
  const headers = await authHeaders();
  const res = await fetch(SERVER + '/meals', {
    method: 'POST',
    headers,
    body: JSON.stringify(meal)
  });
  return handle(res, 'logMeal');
}

export async function deleteMeal(id) {
  const headers = await authHeaders();
  const res = await fetch(SERVER + '/meals/' + encodeURIComponent(id), {
    method: 'DELETE',
    headers
  });
  return handle(res, 'deleteMeal');
}

// ---- Foods ------------------------------------------------------------------

export async function searchFoods(query) {
  const headers = await authHeaders();
  const res = await fetch(SERVER + '/foods/search?q=' + encodeURIComponent(query), { headers });
  return handle(res, 'searchFoods');
}

export async function lookupBarcode(ean) {
  const headers = await authHeaders();
  const res = await fetch(SERVER + '/foods/barcode/' + encodeURIComponent(ean), { headers });
  return handle(res, 'lookupBarcode');
}

export async function createCustomFood(food) {
  const headers = await authHeaders();
  const res = await fetch(SERVER + '/foods/custom', {
    method: 'POST',
    headers,
    body: JSON.stringify(food)
  });
  return handle(res, 'createCustomFood');
}

// ---- Activities -------------------------------------------------------------

export async function logActivity(activity) {
  const headers = await authHeaders();
  const res = await fetch(SERVER + '/activities', {
    method: 'POST',
    headers,
    body: JSON.stringify(activity)
  });
  return handle(res, 'logActivity');
}

// ---- Utility: build meal payload from food + grams --------------------------

export function buildMealPayload({ food, grams, mealType, eatenAt, notes }) {
  const factor = grams / 100;
  const round1 = (n) => Math.round((Number(n) || 0) * factor * 10) / 10;

  return {
    eaten_at: eatenAt || new Date().toISOString(),
    meal_type: mealType || 'snack',
    notes: notes || null,
    items: [{
      food_id: food.id,
      amount_g: grams,
      kcal: round1(food.kcal_per_100g),
      protein_g: round1(food.protein_g),
      carbs_g: round1(food.carbs_g),
      fat_g: round1(food.fat_g)
    }]
  };
}