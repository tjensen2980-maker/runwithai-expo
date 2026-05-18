// src/utils/foodUnits.js
// Enhedsdefinitioner + omregning til gram for madlogning.

export const UNIT_DEFS = [
  { key: 'g',       type: 'mass',    toGrams: 1 },
  { key: 'kg',      type: 'mass',    toGrams: 1000 },
  { key: 'ml',      type: 'volume',  toGrams: 1 },
  { key: 'dl',      type: 'volume',  toGrams: 100 },
  { key: 'l',       type: 'volume',  toGrams: 1000 },
  { key: 'tsk',     type: 'volume',  toGrams: 5 },
  { key: 'spsk',    type: 'volume',  toGrams: 15 },
  { key: 'stk',     type: 'serving', toGrams: null },
  { key: 'skive',   type: 'serving', toGrams: null },
  { key: 'portion', type: 'serving', toGrams: null },
];

const SKIVE_DEFAULT_G = 25;

export function isLiquid(food) {
  if (!food) return false;
  const name = String(food.name || '').toLowerCase();
  const liquidWords = ['mælk', 'milk', 'juice', 'saft', 'vand', 'water', 'kaffe', 'coffee', 'te ', 'cola', 'sodavand', 'soda', 'øl', 'beer', 'vin', 'wine', 'smoothie', 'shake', 'yoghurt', 'yogurt', 'suppe', 'soup'];
  return liquidWords.some(w => name.includes(w));
}

export function getAvailableUnits(food) {
  const hasServing = food && Number(food.serving_size_g) > 0;
  const liquid = isLiquid(food);
  const units = ['g', 'kg'];
  if (liquid) { units.push('ml'); units.push('dl'); units.push('l'); }
  units.push('tsk');
  units.push('spsk');
  if (hasServing) { units.push('stk'); units.push('portion'); }
  units.push('skive');
  return units;
}

export function getDefaultUnit(food) {
  if (!food) return 'g';
  if (Number(food.serving_size_g) > 0) return 'stk';
  if (isLiquid(food)) return 'ml';
  return 'g';
}

export function convertToGrams(amount, unit, food) {
  const n = Number(String(amount).replace(',', '.'));
  if (isNaN(n) || n <= 0) return 0;
  const def = UNIT_DEFS.find(u => u.key === unit);
  if (!def) return n;
  if (def.type === 'mass' || def.type === 'volume') return n * def.toGrams;
  const servingG = Number(food && food.serving_size_g) || (unit === 'skive' ? SKIVE_DEFAULT_G : 100);
  return n * servingG;
}

export function convertFromGrams(grams, unit, food) {
  const g = Number(grams) || 0;
  if (g <= 0) return 0;
  const def = UNIT_DEFS.find(u => u.key === unit);
  if (!def) return g;
  if (def.type === 'mass' || def.type === 'volume') return g / def.toGrams;
  const servingG = Number(food && food.serving_size_g) || (unit === 'skive' ? SKIVE_DEFAULT_G : 100);
  return servingG > 0 ? g / servingG : 0;
}

export function formatAmount(n) {
  const num = Number(n) || 0;
  if (num === 0) return '0';
  if (num % 1 === 0) return String(num);
  return num.toFixed(num < 1 ? 2 : 1);
}
