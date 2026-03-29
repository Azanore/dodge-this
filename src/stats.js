// In-run counter tracking, run record persistence, and all-time stats aggregation.
// Related: supabase.js, main.js, gameUpdate.js, bonuses.js
// Does not mutate GameState — counters are ephemeral module-level variables.

import { supabase } from './supabase.js';
import { ACHIEVEMENTS, getFiredMidRunKeys } from './achievements.js';

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

// Checks auth, inserts run record if authenticated and run lasted at least 5s — fire-and-forget, swallows errors
export async function insertRun(state) {
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return;
  if (state.elapsed < 5000) return;

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
// POLISH: player rank — also fetches current user's rank; remove playerRank from return to revert
export async function fetchLeaderboard(difficulty) {
  const { data, error } = await supabase.rpc('get_leaderboard', { diff: difficulty });
  if (error) throw error;

  // Fetch current user's rank for this difficulty (best score rank among all players)
  let playerRank = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: rankData } = await supabase.rpc('get_player_rank', { p_user_id: user.id, p_difficulty: difficulty });
      playerRank = rankData ?? null;
    }
  } catch (_) { /* rank is optional — silently skip */ }

  return { rows: data, playerRank };
}

// Calls get_user_stats RPC — server-side aggregation, returns single row — throws on error
export async function fetchAllTimeStats() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('get_user_stats', { p_user_id: user.id });
  if (error) throw error;

  // RPC returns an array with one row
  const r = data[0];
  return {
    totalRuns: Number(r.total_runs),
    bestScoreEasy: Number(r.best_score_easy),
    bestScoreNormal: Number(r.best_score_normal),
    bestScoreHard: Number(r.best_score_hard),
    avgScoreEasy: Number(r.avg_score_easy),
    avgScoreNormal: Number(r.avg_score_normal),
    avgScoreHard: Number(r.avg_score_hard),
    totalNearMisses: Number(r.total_near_misses),
    totalBonuses: Number(r.total_bonuses),
    bestComboScore: Number(r.best_combo_score),
    totalElapsedMs: Number(r.total_elapsed_ms),
    avgElapsedMs: Number(r.avg_elapsed_ms),
    hardRunsCount: Number(r.hard_runs_count),
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

    // Single-run achievements (post-run only — mid-run ones handled by checkMidRunAchievements)
    if (stats.totalRuns >= 1) earned.push('first_blood');

    // Include mid-run achievements that fired this run so they get persisted
    const midRunFired = new Set(getFiredMidRunKeys());
    for (const k of midRunFired) earned.push(k);

    const newKeys = earned.filter(k => !alreadyUnlocked.has(k));

    for (const key of newKeys) {
      try {
        await supabase.from('user_achievements').insert({ user_id: user.id, achievement_key: key });
      } catch (_) {
        // silently discard individual insert failures
      }
    }

    // Don't re-toast keys that already fired mid-run — they were shown in real-time
    return newKeys.filter(k => !midRunFired.has(k));
  } catch (_) {
    return [];
  }
}

// Deletes all user_achievements rows for the authenticated user — for testing only
export async function resetMyAchievements() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  try {
    await supabase.from('user_achievements').delete().eq('user_id', user.id);
  } catch (_) {
    // silently discard
  }
}
