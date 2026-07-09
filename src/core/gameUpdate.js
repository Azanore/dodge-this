// Pure game update logic — no side effects, no DOM, fully testable.
// Related: main.js (wires this), GameState.js, player.js, obstacles.js, bonuses.js, collision.js, difficulty.js
// Does not start/stop the loop or render anything.

import { update as updatePlayer } from '../entities/player.js';
import { spawnObstacle, updateObstacles, clearAll } from '../entities/obstacles.js';
import { trySpawnBonus, updateEffects, collectBonus } from '../entities/bonuses.js';
import { checkPlayerObstacles, checkPlayerBonusPickups, checkNearMisses } from './collision.js';
import { triggerNearMiss, triggerScoreFloat } from '../ui/renderer.js';
import { onNearMiss, onComboBank, getRunStats, onAbilityUsed, onKUEarned } from '../services/stats.js';
import { checkMidRunAchievements } from '../ui/achievements.js';
import { getCurrentSpeedMultiplier, getCurrentSpawnInterval } from './difficulty.js';
import { updateScoreZone } from '../systems/combo.js';
import { triggerScoreBump } from '../ui/hud.js';
import { ABILITIES } from '../systems/abilities.js';

import { playDeath, playMultiplierMax, playPickup } from '../services/audio.js'; // AUDIO

// ms between bonus spawn attempts
export const BONUS_SPAWN_INTERVAL = 8000;

// Dispatches a specific ability by key
export function executeAbility(state, abilityKey, mousePos) {
  const cfg = gameConfig.battery.abilities[abilityKey];
  if (!cfg || state.battery < cfg.cost) return null;

  // Global cooldown: 500ms
  const now = performance.now();
  if (now - state.lastAbilityUsedAt < 500) return null;

  state.battery -= cfg.cost;
  state.lastAbilityUsedAt = now;
  onAbilityUsed(abilityKey);

  const ability = ABILITIES[abilityKey];
  if (!ability) return null;

  return ability.execute(state, mousePos);
}

// Called each frame — mutates state, returns 'dead' if player just died (so caller can react)
// onAchievement(keys): optional callback fired when mid-run achievements trigger
export function gameUpdate(delta, state, accumulators, onAchievement) {
  if (state.status === 'dead') return null;
  if (state.status === 'start') return null;
  if (state.status === 'paused') return null;

  updatePlayer(state);

  if (state.status === 'grace') {
    state.graceRemaining -= delta;
    state.elapsed += delta;
    if (state.graceRemaining <= 0) {
      state.status = 'active';
      state.graceRemaining = 0;
    }
    checkPlayerBonusPickups(state, collectBonus);
    updateEffects(delta, state);
    return null;
  }

  // active
  state.elapsed += delta;

  // Mid-run achievement check — pure, synchronous, no DB
  if (onAchievement) {
    const runStats = getRunStats();
    const keys = checkMidRunAchievements(state, runStats, state._unlockedAchievements ?? new Set());
    if (keys.length) onAchievement(keys);
  }

  updateScoreZone(delta, state, accumulators);

  // Update Ability effects
  if (state.abilityActive) {
    state.abilityActive.remaining -= delta;
    if (state.abilityActive.remaining <= 0) {
      if (state.abilityActive.type === 'chrono') {
        state.chronoFadeRemaining = 1000; // 1s fade out
      }
      state.abilityActive = null;
    }
  }
  if (state.chronoFadeRemaining > 0) state.chronoFadeRemaining -= delta;
  if (state.phasedRemaining > 0) state.phasedRemaining -= delta;

  // Update Battery
  const batCfg = gameConfig.battery;
  const charge = (batCfg.chargeRates.passivePerSec * delta) / 1000;
  state.battery = Math.min(batCfg.max, state.battery + charge);
  onKUEarned(charge);

  const baseTick = (delta / 1000) * 10;
  let multiplierBonus = 0;
  if (state.battery >= batCfg.max) multiplierBonus = batCfg.overchargeMultiplierBonus;

  // Base score ticks every frame — guaranteed, never at risk
  state.score += baseTick;

  // Everything above x1 (combo + overcharge) is pending — at risk, banked as lump sum
  const bonusMultiplier = state.comboMultiplier + multiplierBonus;
  if (bonusMultiplier > 1.0) {
    state.pendingScore += baseTick * (bonusMultiplier - 1);
  } else if (state.pendingScore > 0) {
    const banked = state.pendingScore;
    state.score += banked;
    state.pendingScore = 0;
    const floatX = state.scoreZone?.x ?? state.player.x;
    const floatY = state.scoreZone?.y ?? state.player.y;
    triggerScoreFloat(banked, floatX, floatY);
    onComboBank(banked);
    triggerScoreBump();
  }

  const speedMult = getCurrentSpeedMultiplier(state.elapsed, state.difficulty);
  const spawnInterval = getCurrentSpawnInterval(state.elapsed, state.difficulty);

  // Chrono effect also slows time for obstacles
  let chronoMult = 1.0;
  if (state.abilityActive?.type === 'chrono') {
    chronoMult = gameConfig.battery.abilities.chrono.params.timeScale;
  } else if (state.chronoFadeRemaining > 0) {
    const t = state.chronoFadeRemaining / 1000; // 1 -> 0
    // Lerp from chrono scale back to 1
    chronoMult = gameConfig.battery.abilities.chrono.params.timeScale + (1 - t) * (1 - gameConfig.battery.abilities.chrono.params.timeScale);
  }

  accumulators.spawn += delta * state.slowmoMultiplier * chronoMult; // slowmo stretches spawn intervals too
  while (accumulators.spawn >= spawnInterval) {
    spawnObstacle(state, speedMult);
    accumulators.spawn -= spawnInterval;
  }

  accumulators.bonus += delta;
  if (accumulators.bonus >= BONUS_SPAWN_INTERVAL) {
    trySpawnBonus(state);
    accumulators.bonus = 0;
  }

  // Update obstacles with chrono scale
  const originalSlowmo = state.slowmoMultiplier;
  state.slowmoMultiplier *= chronoMult;
  updateObstacles(delta, state);
  state.slowmoMultiplier = originalSlowmo;
  updateEffects(delta, state);
  checkPlayerBonusPickups(state, collectBonus);
  checkPlayerObstacles(state);
  if (state.status !== 'dead') {
    checkNearMisses(state, (x, y) => { triggerNearMiss(x, y); onNearMiss(); }, performance.now());
    playMultiplierMax(state.comboMultiplier); // AUDIO
  } else {
    playDeath(); // AUDIO
  }

  return state.status === 'dead' ? 'dead' : null;
}
