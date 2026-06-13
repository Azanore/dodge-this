// In-run counter tracking, run record persistence, and all-time stats aggregation.
// Related: supabase.js, main.js, gameUpdate.js, bonuses.js
// Does not mutate GameState — counters are ephemeral module-level variables.

import { supabase } from './supabase.js';
import { ACHIEVEMENTS, getFiredMidRunKeys } from './achievements.js';
import { getCurrentSpeedMultiplier } from './difficulty.js';

let nearMisses = 0;
let bonusesCollected = 0;
let maxCombo = 1.0;
let comboScore = 0;

// Tracking for new advanced achievements
let nearMissTimestamps = [];
let bonusCounts = { slowmo: 0, invincibility: 0, screenclear: 0, shrink: 0 };
let maxScreenclearKill = 0;
let zoneStayStartTime = null;
let maxZoneTimeContinuous = 0;
let maxPendingBanked = 0;
let speedHistory = []; // { time, speed }

// Resets all counters to initial values — call on every restart
export function resetRunStats() {
  nearMisses = 0;
  bonusesCollected = 0;
  maxCombo = 1.0;
  comboScore = 0;

  nearMissTimestamps = [];
  bonusCounts = { slowmo: 0, invincibility: 0, screenclear: 0, shrink: 0 };
  maxScreenclearKill = 0;
  zoneStayStartTime = null;
  maxZoneTimeContinuous = 0;
  maxPendingBanked = 0;
  speedHistory = [];
}

// Increments nearMisses by 1
export function onNearMiss() {
  nearMisses += 1;
  nearMissTimestamps.push(performance.now());
}

// Increments bonusesCollected by 1
export function onBonusCollected(type) {
  bonusesCollected += 1;
  if (type && bonusCounts[type] !== undefined) {
    bonusCounts[type]++;
  }
}

// Called by bonuses.js during screenclear
export function onScreenclear(count) {
  if (count > maxScreenclearKill) maxScreenclearKill = count;
}

// Updates maxCombo if multiplier exceeds current max
export function onComboUpdate(multiplier) {
  if (multiplier > maxCombo) maxCombo = multiplier;
}

// Adds amount to comboScore
export function onComboBank(amount) {
  comboScore += amount;
  if (amount > maxPendingBanked) maxPendingBanked = amount;
}

// Returns current run counter values — used by main.js and achievements.js
export function getRunStats(state) {
  const now = performance.now();

  // Update zone continuous time if currently in zone
  let currentZoneTime = 0;
  if (zoneStayStartTime !== null) {
    currentZoneTime = now - zoneStayStartTime;
  }
  const effectiveMaxZoneTime = Math.max(maxZoneTimeContinuous, currentZoneTime);

  // Near miss window: 3 in 1 second
  const windowMs = 1000;
  nearMissTimestamps = nearMissTimestamps.filter(t => now - t < 5000); // keep 5s for safety
  let maxShortWindow = 0;
  for (let i = 0; i < nearMissTimestamps.length; i++) {
    let count = 0;
    for (let j = i; j < nearMissTimestamps.length; j++) {
      if (nearMissTimestamps[j] - nearMissTimestamps[i] <= windowMs) count++;
      else break;
    }
    if (count > maxShortWindow) maxShortWindow = count;
  }

  // Speed history tracking
  if (state) {
    const speed = getCurrentSpeedMultiplier(state.elapsed, state.difficulty);
    speedHistory.push({ time: state.elapsed, speed });
    // prune history older than 20s
    speedHistory = speedHistory.filter(h => state.elapsed - h.time <= 20000);
  }

  let minSpeedInLast20s = 0;
  if (speedHistory.length > 0 && state && state.elapsed >= 20000) {
     // Check if the history actually covers 20s
     const duration = speedHistory[speedHistory.length - 1].time - speedHistory[0].time;
     if (duration >= 19000) { // close enough to 20s
        minSpeedInLast20s = Math.min(...speedHistory.map(h => h.speed));
     }
  }

  return {
    nearMisses,
    bonusesCollected,
    maxCombo,
    comboScore,
    maxNearMissesInShortWindow: maxShortWindow,
    maxScreenclearKill,
    maxZoneTimeContinuous: effectiveMaxZoneTime,
    maxPendingBanked,
    minSpeedInLast20s,
    bonusCounts
  };
}

// Track zone entry/exit
export function onZoneEntry() {
  if (zoneStayStartTime === null) zoneStayStartTime = performance.now();
}

export function onZoneExit() {
  if (zoneStayStartTime !== null) {
    const duration = performance.now() - zoneStayStartTime;
    if (duration > maxZoneTimeContinuous) maxZoneTimeContinuous = duration;
    zoneStayStartTime = null;
  }
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
export async function fetchLeaderboard(difficulty) {
  const { data, error } = await supabase.rpc('get_leaderboard', { diff: difficulty });
  if (error) throw error;

  let playerRank = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: rankData } = await supabase.rpc('get_player_rank', { p_user_id: user.id, p_difficulty: difficulty });
      playerRank = rankData ?? null;
    }
  } catch (_) { }

  return { rows: data, playerRank };
}

// Calls get_user_stats RPC — server-side aggregation, returns single row — throws on error
export async function fetchAllTimeStats() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('get_user_stats', { p_user_id: user.id });
  if (error) throw error;

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
    deathsBall: Number(r.deaths_ball),
    deathsBullet: Number(r.deaths_bullet),
    deathsShard: Number(r.deaths_shard),
    deathsTracker: Number(r.deaths_tracker),
  };
}

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
export async function evaluateAchievements(state) {
  if (state.elapsed < 5000) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    await insertRun(state);
    const stats = await fetchAllTimeStats();
    const alreadyUnlocked = new Set(await fetchUnlockedAchievements());
    const runStats = getRunStats(state);

    const earned = [];

    // Milestones
    const veteranThresholds = [5, 25, 100];
    veteranThresholds.forEach((t, i) => { if (stats.totalRuns >= t) earned.push(`veteran_${i + 1}`); });

    const survivorThresholds = [900000, 3600000];
    survivorThresholds.forEach((t, i) => { if (stats.totalElapsedMs >= t) earned.push(`survivor_${i + 1}`); });

    const collectorThresholds = [50, 250];
    collectorThresholds.forEach((t, i) => { if (stats.totalBonuses >= t) earned.push(`collector_${i + 1}`); });

    const ghostThresholds = [100, 500];
    ghostThresholds.forEach((t, i) => { if (stats.totalNearMisses >= t) earned.push(`ghost_${i + 1}`); });

    if (stats.hardRunsCount >= 20) earned.push(`hard_boiled_1`);

    // Single-run
    if (stats.totalRuns >= 1) earned.push('first_blood');

    const midRunFired = new Set(getFiredMidRunKeys());
    for (const k of midRunFired) earned.push(k);

    const newKeys = earned.filter(k => !alreadyUnlocked.has(k));

    for (const key of newKeys) {
      try {
        await supabase.from('user_achievements').insert({ user_id: user.id, achievement_key: key });
      } catch (_) { }
    }

    return newKeys.filter(k => !midRunFired.has(k));
  } catch (_) {
    return [];
  }
}

export async function updateUsername(name) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Username cannot be empty');
  if (trimmed.length < 2) throw new Error('Username must be at least 2 characters');
  if (trimmed.length > 30) throw new Error('Username must be 30 characters or fewer');
  const { error } = await supabase.from('profiles').update({ username: trimmed }).eq('id', user.id);
  if (error) {
    if (error.code === '23505') throw new Error('Username already taken');
    throw error;
  }
  return trimmed;
}

export async function resetMyAchievements() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  try {
    await supabase.from('user_achievements').delete().eq('user_id', user.id);
  } catch (_) { }
}
