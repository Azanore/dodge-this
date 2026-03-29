// Circle-circle intersection and all in-game collision checks.
// Related: player.js, obstacles.js, bonuses.js, GameState.js
// Does not handle rendering or state transitions beyond setting status/removing pickups.

// Returns true iff the Euclidean distance between circle centers is less than the sum of their radii
export function circlesOverlap(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy < (a.radius + b.radius) ** 2;
}

// Checks player vs all obstacles; triggers death if overlap and invincibility is not active
export function checkPlayerObstacles(state) {
  if (state.activeEffects.invincibility) return;
  const player = state.player;
  for (const obs of state.obstacles) {
    if (circlesOverlap(player, obs)) {
      state.status = 'dead';
      return;
    }
  }
}

const NEAR_MISS_COOLDOWN = 600; // ms — matches nearMissText duration

// Detects near-misses: obstacles within threshold gap but not overlapping the player.
// Fires onNearMiss(x, y) and stamps obs.lastNearMissAt to enforce per-obstacle cooldown.
// Suppressed during invincibility — no risk, no reward.
// now: current timestamp in ms (pass performance.now() from the game loop)
export function checkNearMisses(state, onNearMiss, now) {
  if (state.activeEffects.invincibility) return;
  const player = state.player;
  const threshold = gameConfig.nearMissThreshold;
  for (const obs of state.obstacles) {
    const dx = obs.x - player.x;
    const dy = obs.y - player.y;
    const gap = Math.sqrt(dx * dx + dy * dy) - obs.radius - player.radius;
    if (gap > 0 && gap <= threshold && now - obs.lastNearMissAt > NEAR_MISS_COOLDOWN) {
      onNearMiss(player.x, player.y);
      obs.lastNearMissAt = now;
    }
  }
}

// Checks player vs all field bonus pickups; collects any that overlap
export function checkPlayerBonusPickups(state, collectBonus) {
  const player = state.player;
  state.bonuses = state.bonuses.filter(pickup => {
    if (circlesOverlap(player, pickup)) {
      collectBonus(pickup.type, state, pickup.x, pickup.y);
      return false;
    }
    return true;
  });
}
