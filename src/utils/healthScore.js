// src/utils/healthScore.js
// Lifesum-style sundheds-score baseret paa makros pr. 100g.
// Returnerer { grade, score, color, emoji, labelKey }.

const GRADES = [
  { min: 75, grade: 'A', color: '#22c55e', emoji: '😊', labelKey: 'healthScore.A' },
  { min: 60, grade: 'B', color: '#84cc16', emoji: '🙂', labelKey: 'healthScore.B' },
  { min: 45, grade: 'C', color: '#eab308', emoji: '😐', labelKey: 'healthScore.C' },
  { min: 30, grade: 'D', color: '#f97316', emoji: '😟', labelKey: 'healthScore.D' },
  { min: 0,  grade: 'E', color: '#ef4444', emoji: '😩', labelKey: 'healthScore.E' },
];

function gradeFromScore(score) {
  for (const g of GRADES) {
    if (score >= g.min) return g;
  }
  return GRADES[GRADES.length - 1];
}

// Beregn score 0-100 ud fra makros pr. 100g.
export function computeHealthScore(per100g) {
  if (!per100g) return { grade: 'C', score: 50, color: '#eab308', emoji: '😐', labelKey: 'healthScore.C' };

  const kcal = Number(per100g.kcal_per_100g) || 0;
  const protein = Number(per100g.protein_g) || 0;
  const carbs = Number(per100g.carbs_g) || 0;
  const fat = Number(per100g.fat_g) || 0;
  const fiber = Number(per100g.fiber_g) || 0;

  let score = 50;

  // Protein bonus (op til +20)
  if (protein >= 20) score += 20;
  else if (protein >= 10) score += 12;
  else if (protein >= 5) score += 6;

  // Fiber bonus (op til +15)
  if (fiber >= 6) score += 15;
  else if (fiber >= 3) score += 8;

  // Kalorie-tæthed straf (op til -25)
  if (kcal >= 500) score -= 25;
  else if (kcal >= 350) score -= 15;
  else if (kcal >= 200) score -= 5;

  // Fedt straf (op til -20)
  if (fat >= 25) score -= 20;
  else if (fat >= 15) score -= 10;

  // Raffinerede kulhydrater straf (heuristik via lavt fiber-indhold + høje carbs)
  if (carbs >= 70 && fiber < 2) score -= 25;
  else if (carbs >= 50 && fiber < 3) score -= 15;

  // Bonus for lavkalorie + højt protein (æg, fisk, kødprodukter)
  if (kcal < 150 && protein >= 10) score += 5;

  // Clamp 0-100
  score = Math.max(0, Math.min(100, score));

  const info = gradeFromScore(score);
  return {
    score: Math.round(score),
    grade: info.grade,
    color: info.color,
    emoji: info.emoji,
    labelKey: info.labelKey,
  };
}

// Beregn aggregeret score for et dagsoversigt af måltider (vægtet efter kcal).
export function computeDailyHealthScore(meals) {
  if (!meals || meals.length === 0) return null;
  let totalKcal = 0;
  let weightedScore = 0;
  for (const m of meals) {
    const kcalTotal = Number(m.kcal_total) || Number(m.kcal) || 0;
    if (kcalTotal <= 0) continue;
    // Brug eksisterende health_score hvis allerede beregnet, ellers compute
    const per100 = {
      kcal_per_100g: Number(m.kcal_per_100g) || (kcalTotal / (Number(m.grams) || 100) * 100),
      protein_g: Number(m.protein_g_per_100g) || (Number(m.protein_g) ? Number(m.protein_g) / (Number(m.grams) || 100) * 100 : 0),
      carbs_g: Number(m.carbs_g_per_100g) || (Number(m.carbs_g) ? Number(m.carbs_g) / (Number(m.grams) || 100) * 100 : 0),
      fat_g: Number(m.fat_g_per_100g) || (Number(m.fat_g) ? Number(m.fat_g) / (Number(m.grams) || 100) * 100 : 0),
      fiber_g: Number(m.fiber_g_per_100g) || (Number(m.fiber_g) ? Number(m.fiber_g) / (Number(m.grams) || 100) * 100 : 0),
    };
    const hs = computeHealthScore(per100);
    weightedScore += hs.score * kcalTotal;
    totalKcal += kcalTotal;
  }
  if (totalKcal === 0) return null;
  const avgScore = weightedScore / totalKcal;
  const info = gradeFromScore(avgScore);
  return {
    score: Math.round(avgScore),
    grade: info.grade,
    color: info.color,
    emoji: info.emoji,
    labelKey: info.labelKey,
  };
}
