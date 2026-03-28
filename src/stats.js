// In-run counter tracking, run record persistence, and all-time stats aggregation.
// Related: supabase.js, main.js, gameUpdate.js, bonuses.js
// Does not mutate GameState — counters are ephemeral module-level variables.

import { supabase } from './supabase.js';

let nearMisses = 0;
let bonusesCollected = 0;
let maxCombo = 1.0;
let comboScore = 0;

// Resets all four counters to initial values — call on every restart
export function resetRunStats() {
  nearMisses = 0;
  bonusesCollected = 0;
  maxCombo = 1.0;
  comboScore = 0;
}

// Increments nearMisses by 1
export function onNearMiss() {
  nearMisses += 1;
}

// Increments bonusesCollected by 1
export function onBonusCollected() {
  bonusesCollected += 1;
}

// Updates maxCombo if multiplier exceeds current value
export function onComboUpdate(multiplier) {
  if (multiplier > maxCombo) maxCombo = multiplier;
}

// Adds amount to comboScore
export function onComboBank(amount) {
  comboScore += amount;
}

// Checks auth, inserts run record if authenticated — fire-and-forget, swallows errors
export async function insertRun(state) {
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return;

  const payload = {
    score: Math.round(state.score),
    elapsed_ms: Math.round(state.elapsed),
    difficulty: state.difficulty,
    near_misses: nearMisses,
    max_combo: maxCombo,
    combo_score: Math.round(comboScore),
    bonuses_collected: bonusesCollected,
    played_at: new Date().toISOString()
  };

  try {
    await supabase.from('runs').insert(payload);
  } catch (_) {
    // silently discard
  }
}

// Queries runs table and returns aggregate stats — throws on fetch error
export async function fetchAllTimeStats() {
  const { data, error } = await supabase.from('runs').select('*');
  if (error) throw error;

  const runs = data;
  const totalRuns = runs.length;

  const scores = (diff) => runs.filter(r => r.difficulty === diff).map(r => r.score);
  const bestScoreEasy = Math.max(0, ...scores('easy'));
  const bestScoreNormal = Math.max(0, ...scores('normal'));
  const bestScoreHard = Math.max(0, ...scores('hard'));

  const totalNearMisses = runs.reduce((s, r) => s + (r.near_misses ?? 0), 0);
  const totalBonuses = runs.reduce((s, r) => s + (r.bonuses_collected ?? 0), 0);
  const highestCombo = Math.max(0, ...runs.map(r => r.max_combo ?? 0));
  const bestComboScore = Math.max(0, ...runs.map(r => r.combo_score ?? 0));
  const totalElapsedMs = runs.reduce((s, r) => s + (r.elapsed_ms ?? 0), 0);
  const avgScore = totalRuns ? runs.reduce((s, r) => s + (r.score ?? 0), 0) / totalRuns : 0;
  const avgElapsedMs = totalRuns ? totalElapsedMs / totalRuns : 0;

  return {
    totalRuns,
    bestScoreEasy,
    bestScoreNormal,
    bestScoreHard,
    totalNearMisses,
    totalBonuses,
    highestCombo,
    bestComboScore,
    totalElapsedMs,
    avgScore,
    avgElapsedMs
  };
}
