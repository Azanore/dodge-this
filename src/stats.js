// In-run counter tracking, run record persistence, and all-time stats aggregation.
// Related: supabase.js, main.js, gameUpdate.js, bonuses.js
// Does not mutate GameState — counters are ephemeral module-level variables.

import { supabase } from './supabase.js';
import { ACHIEVEMENTS, getFiredMidRunKeys } from './achievements.js';

let nearMisses = 0;
let bonusesCollected = 0;
let maxCombo = 1.0;
let comboScore = 0;
let maxSingleCombo = 0;
let bonusesByType = { slowmo: 0, shield: 0, clear: 0, shrink: 0 };

// Resets all counters to initial values — call on every restart
export function resetRunStats() {
  nearMisses = 0;
  bonusesCollected = 0;
  maxCombo = 1.0;
  comboScore = 0;
  maxSingleCombo = 0;
  bonusesByType = { slowmo: 0, shield: 0, clear: 0, shrink: 0 };
}

// Increments nearMisses by 1
export function onNearMiss() {
  nearMisses += 1;
}

// Increments bonusesCollected by 1 (and type-specific counter)
export function onBonusCollected(type) {
  bonusesCollected += 1;
  if (type && bonusesByType[type] !== undefined) {
    bonusesByType[type] += 1;
  }
}

// Updates maxCombo if multiplier exceeds current max
export function onComboUpdate(multiplier) {
  if (multiplier > maxCombo) maxCombo = multiplier;
}

// Adds amount to comboScore
export function onComboBank(amount) {
  comboScore += amount;
  if (amount > maxSingleCombo) maxSingleCombo = amount;
}

// Returns current run counter values — used by main.js to populate the per-run panel
export function getRunStats() {
  return { nearMisses, bonusesCollected, maxCombo, comboScore, maxSingleCombo, bonusesByType };
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
    played_at: new Date().toISOString(),
    death_cause: state.deathCause ?? null
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

// Fetches top 10 players by total achievement points — throws on error
export async function fetchAPLeaderboard() {
  const { data, error } = await supabase.rpc('get_ap_leaderboard');
  if (error) throw error;

  let playerRank = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: rankData } = await supabase.rpc('get_player_ap_rank', { p_user_id: user.id });
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
    totalScore: Number(r.total_score || 0),
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
    deathsBall: Number(r.deaths_ball),
    deathsBullet: Number(r.deaths_bullet),
    deathsShard: Number(r.deaths_shard),
    deathsTracker: Number(r.deaths_tracker),
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

// Evaluates all achievement conditions after a run. Calls insertRun internally.
// Returns array of newly-unlocked achievement keys, or [] if not eligible.
export async function evaluateAchievements(state) {
  if (state.elapsed < 5000) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    await insertRun(state);
    const stats = await fetchAllTimeStats();
    const alreadyUnlocked = new Set(await fetchUnlockedAchievements());
    const runStats = getRunStats();

    const earned = [];

    // Automatic Milestone evaluation
    for (const ach of ACHIEVEMENTS) {
      if (ach.type !== 'milestone') continue;

      let val = 0;
      if (ach.group === 'veteran') val = stats.totalRuns;
      else if (ach.group === 'survivor') val = stats.totalElapsedMs;
      else if (ach.group === 'collector') val = stats.totalBonuses;
      else if (ach.group === 'ghost') val = stats.totalNearMisses;
      else if (ach.group === 'hard_boiled') val = stats.hardRunsCount;
      else if (ach.group === 'wealthy') val = stats.totalScore;
      else if (ach.group === 'high_score') val = Math.round(state.score);

      if (val >= ach.threshold) earned.push(ach.key);
    }

    // Single-run post-game checks
    if (stats.totalRuns >= 1) earned.push('first_blood');
    if (runStats.maxSingleCombo >= 500) earned.push('combo_king');
    if (state.pendingScore >= 1000) earned.push('near_death');
    // If died before 10.5s (10s after grace)
    if (state.elapsed < 10500 && state.elapsed >= 5000) earned.push('early_departure');

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

// Updates the authenticated user's username in profiles — throws on error
export async function updateUsername(name) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Username cannot be empty');
  if (trimmed.length < 2) throw new Error('Username must be at least 2 characters');
  if (trimmed.length > 30) throw new Error('Username must be 30 characters or fewer');
  if (/[\x00-\x1F\x7F\u200B\u200C\u200D\uFEFF]/.test(trimmed)) throw new Error('Username contains invalid characters');
  const { error } = await supabase.from('profiles').update({ username: trimmed }).eq('id', user.id);
  if (error) {
    if (error.code === '23505') throw new Error('Username already taken');
    throw error;
  }
  return trimmed;
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
