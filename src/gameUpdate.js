// Pure game update logic — no side effects, no DOM, fully testable.
// Related: main.js (wires this), GameState.js, player.js, obstacles.js, bonuses.js, collision.js, difficulty.js
// Does not start/stop the loop or render anything.

import { update as updatePlayer } from './player.js';
import { spawnObstacle, updateObstacles } from './obstacles.js';
import { trySpawnBonus, updateEffects, collectBonus } from './bonuses.js';
import { checkPlayerObstacles, checkPlayerBonusPickups } from './collision.js';
import { getCurrentSpeedMultiplier, getCurrentSpawnInterval } from './difficulty.js';

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

  return state.status === 'dead' ? 'dead' : null;
}
