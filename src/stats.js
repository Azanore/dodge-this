// In-run counter tracking, run record persistence, and all-time stats aggregation.
// Related: supabase.js, main.js, gameUpdate.js, bonuses.js
// Does not mutate GameState — counters are ephemeral module-level variables.

import { supabase } from './supabase.js';
import { ACHIEVEMENTS } from './achievements.js';

let nearMisses = 0;
let bonusesCollected = 0;
let maxCombo = 1.0;
let comboScore = 0;

// Resets all counters to initial values — call on every restart
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

// Updates maxCombo if multiplier exceeds current max
export function onComboUpdate(multiplier) {
  if (multiplier > maxCombo) maxCombo = multiplier;
}

// Adds amount to comboScore
export function onComboBank(amount) {
  comboScore += amount;
}

// Returns current run counter values — used by main.js to populate the per-run panel
export function getRunStats() {
  return { nearMisses, bonusesCollected, maxCombo, comboScore };
}

// Checks auth, inserts run record if authenticated — fire-and-forget, swallows errors
export async function insertRun(state) {
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return;

  const payload = {
    user_id: data.user.id,
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

  const byDiff = (diff) => runs.filter(r => r.difficulty === diff);
  const scores = (diff) => byDiff(diff).map(r => r.score);
  const bestScoreEasy = Math.max(0, ...scores('easy'));
  const bestScoreNormal = Math.max(0, ...scores('normal'));
  const bestScoreHard = Math.max(0, ...scores('hard'));
  const hardRunsCount = byDiff('hard').length;

  const totalNearMisses = runs.reduce((s, r) => s + (r.near_misses ?? 0), 0);
  const totalBonuses = runs.reduce((s, r) => s + (r.bonuses_collected ?? 0), 0);
  const bestComboScore = Math.max(0, ...runs.map(r => r.combo_score ?? 0));
  const avgScore = (diff) => {
    const diffRuns = byDiff(diff);
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
    avgElapsedMs,
    hardRunsCount
  };
}

// Queries user_achievements for the authenticated user — returns array of unlocked keys, or [] if not authenticated/error
export async function fetchUnlockedAchievements() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  try {
    const { data, error } = await supabase.from('user_achievements').select('achievement_key').eq('user_id', user.id);
    if (error) return [];
    return (data ?? []).map(r => r.achievement_key);
  } catch (_) {
    return [];
  }
}

// Evaluates all 30 achievement conditions after a run. Calls insertRun internally.
// Returns array of newly-unlocked achievement keys, or [] if not eligible.
export async function evaluateAchievements(state) {
  if (state.elapsed < 5000) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    await insertRun(state);
    const stats = await fetchAllTimeStats();
    const alreadyUnlocked = new Set(await fetchUnlockedAchievements());
    const { nearMisses, bonusesCollected } = getRunStats();

    const earned = [];

    // Milestone: veteran (totalRuns)
    const veteranThresholds = [1, 5, 10, 25, 50, 100];
    veteranThresholds.forEach((t, i) => {
      if (stats.totalRuns >= t) earned.push(`veteran_${i + 1}`);
    });

    // Milestone: survivor (totalElapsedMs)
    const survivorThresholds = [300000, 900000, 1800000, 3600000, 7200000];
    survivorThresholds.forEach((t, i) => {
      if (stats.totalElapsedMs >= t) earned.push(`survivor_${i + 1}`);
    });

    // Milestone: collector (totalBonuses)
    const collectorThresholds = [10, 50, 150, 300];
    collectorThresholds.forEach((t, i) => {
      if (stats.totalBonuses >= t) earned.push(`collector_${i + 1}`);
    });

    // Milestone: ghost (totalNearMisses)
    const ghostThresholds = [25, 100, 300, 750];
    ghostThresholds.forEach((t, i) => {
      if (stats.totalNearMisses >= t) earned.push(`ghost_${i + 1}`);
    });

    // Milestone: hard_boiled (hardRunsCount)
    const hardBoiledThresholds = [5, 15, 30, 50];
    hardBoiledThresholds.forEach((t, i) => {
      if (stats.hardRunsCount >= t) earned.push(`hard_boiled_${i + 1}`);
    });

    // Single-run achievements
    if (stats.totalRuns >= 1) earned.push('first_blood');
    if (state.elapsed >= 60000) earned.push('minuteman');
    if (state.elapsed >= 30000 && nearMisses === 0) earned.push('untouchable');
    if (nearMisses >= 15) earned.push('danger_zone');
    if (bonusesCollected >= 6) earned.push('hoarder');
    if (state.difficulty === 'hard' && state.elapsed >= 30000) earned.push('hard_debut');
    if (state.elapsed >= 45000 && bonusesCollected === 0) earned.push('pacifist');

    const newKeys = earned.filter(k => !alreadyUnlocked.has(k));

    for (const key of newKeys) {
      try {
        await supabase.from('user_achievements').insert({ user_id: user.id, achievement_key: key });
      } catch (_) {
        // silently discard individual insert failures
      }
    }

    return newKeys;
  } catch (_) {
    return [];
  }
}
