// In-run counter tracking, run record persistence, and all-time stats aggregation.
// Related: supabase.js, main.js, gameUpdate.js, bonuses.js
// Does not mutate GameState — counters are ephemeral module-level variables.

import { supabase } from './supabase.js';

let nearMisses = 0;
let bonusesCollected = 0;
let comboScore = 0;

// Resets all counters to initial values — call on every restart
export function resetRunStats() {
  nearMisses = 0;
  bonusesCollected = 0;
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

// Adds amount to comboScore
export function onComboBank(amount) {
  comboScore += amount;
}

// Returns current run counter values — used by main.js to populate the per-run panel
export function getRunStats() {
  return { nearMisses, bonusesCollected, comboScore };
}

// Checks auth, inserts run record if authenticated — fire-and-forget, swallows errors
export async function insertRun(state) {
  if (state.elapsed < 5000) return;
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return;

  const payload = {
    user_id: data.user.id,
    score: Math.round(state.score),
    elapsed_ms: Math.round(state.elapsed),
    difficulty: state.difficulty,
    near_misses: nearMisses,
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

// Fetches top 10 best scores per player for a given difficulty via RPC — throws on error
export async function fetchLeaderboard(difficulty) {
  const { data, error } = await supabase.rpc('get_leaderboard', { diff: difficulty });
  if (error) throw error;
  return data;
}

// Queries runs table and returns aggregate stats for the logged-in user — throws on fetch error
export async function fetchAllTimeStats() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('runs').select('*').eq('user_id', user.id);
  if (error) throw error;

  const runs = data;
  const totalRuns = runs.length;

  const scores = (diff) => runs.filter(r => r.difficulty === diff).map(r => r.score);
  const bestScoreEasy = Math.max(0, ...scores('easy'));
  const bestScoreNormal = Math.max(0, ...scores('normal'));
  const bestScoreHard = Math.max(0, ...scores('hard'));

  const totalNearMisses = runs.reduce((s, r) => s + (r.near_misses ?? 0), 0);
  const totalBonuses = runs.reduce((s, r) => s + (r.bonuses_collected ?? 0), 0);
  const bestComboScore = Math.max(0, ...runs.map(r => r.combo_score ?? 0));
  const avgScore = (diff) => {
    const diffRuns = runs.filter(r => r.difficulty === diff);
    return diffRuns.length ? diffRuns.reduce((s, r) => s + (r.score ?? 0), 0) / diffRuns.length : 0;
  };
  const avgScoreEasy = avgScore('easy');
  const avgScoreNormal = avgScore('normal');
  const avgScoreHard = avgScore('hard');
  const totalElapsedMs = runs.reduce((s, r) => s + (r.elapsed_ms ?? 0), 0);
  const avgElapsedMs = totalRuns ? totalElapsedMs / totalRuns : 0;

  return {
    totalRuns,
    bestScoreEasy,
    bestScoreNormal,
    bestScoreHard,
    avgScoreEasy,
    avgScoreNormal,
    avgScoreHard,
    totalNearMisses,
    totalBonuses,
    bestComboScore,
    totalElapsedMs,
    avgElapsedMs
  };
}
