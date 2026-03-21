// Pure game update logic — no side effects, no DOM, fully testable.
// Related: main.js (wires this), GameState.js, player.js, obstacles.js, bonuses.js, collision.js, difficulty.js
// Does not start/stop the loop or render anything.

import { update as updatePlayer } from './player.js';
import { spawnObstacle, updateObstacles } from './obstacles.js';
import { trySpawnBonus, updateEffects, collectBonus } from './bonuses.js';
import { checkPlayerObstacles, checkPlayerBonusPickups, checkNearMisses } from './collision.js';
import { triggerNearMiss } from './renderer.js';
import { getCurrentSpeedMultiplier, getCurrentSpawnInterval } from './difficulty.js';
import { updateScoreZone } from './combo.js';
import { triggerScoreBump } from './hud.js';
import { playDeath } from './audio.js'; // AUDIO

// ms between bonus spawn attempts
export const BONUS_SPAWN_INTERVAL = 8000;

// Called each frame — mutates state, returns 'dead' if player just died (so caller can react)
export function gameUpdate(delta, state, accumulators) {
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
  updateScoreZone(delta, state, accumulators);

  const baseTick = (delta / 1000) * 10;
  state.score += baseTick; // always ticks

  if (state.comboMultiplier > 1.0) {
    // Only the bonus delta accumulates as pending — lost on death, banked when multiplier returns to 1x
    state.pendingScore += baseTick * (state.comboMultiplier - 1);
  } else if (state.pendingScore > 0) {
    state.score += state.pendingScore;
    state.pendingScore = 0;
    triggerScoreBump();
  }

  const speedMult = getCurrentSpeedMultiplier(state.elapsed);
  const spawnInterval = getCurrentSpawnInterval(state.elapsed);

  accumulators.spawn += delta;
  while (accumulators.spawn >= spawnInterval) {
    spawnObstacle(state, speedMult);
    accumulators.spawn -= spawnInterval;
  }

  accumulators.bonus += delta;
  if (accumulators.bonus >= BONUS_SPAWN_INTERVAL) {
    trySpawnBonus(state);
    accumulators.bonus = 0;
  }

  updateObstacles(delta, state);
  updateEffects(delta, state);
  checkPlayerBonusPickups(state, collectBonus);
  checkPlayerObstacles(state);
  if (state.status !== 'dead') checkNearMisses(state, triggerNearMiss);
  if (state.status === 'dead') playDeath(); // AUDIO

  return state.status === 'dead' ? 'dead' : null;
}
