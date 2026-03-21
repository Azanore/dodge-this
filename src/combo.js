// Combo multiplier logic — builds when near obstacles, decays when safe.
// Related: gameUpdate.js, GameState.js, game.config.js, collision.js
// Does not handle rendering or scoring — pure multiplier mutation only.

// Updates state.comboMultiplier based on proximity to obstacles.
// Mirrors the gap math from collision.js checkNearMisses.
export function updateComboMultiplier(delta, state) {
  const { player, obstacles } = state;
  const threshold = gameConfig.nearMissThreshold;
  const deltaSeconds = delta / 1000;

  let nearObs = false;
  for (const obs of obstacles) {
    const dx = obs.x - player.x;
    const dy = obs.y - player.y;
    const gap = Math.sqrt(dx * dx + dy * dy) - obs.radius - player.radius;
    if (gap > 0 && gap <= threshold) {
      nearObs = true;
      break;
    }
  }

  if (nearObs) {
    state.comboMultiplier = Math.min(
      state.comboMultiplier + gameConfig.comboBuildRate * deltaSeconds,
      gameConfig.comboMultiplierMax
    );
  } else {
    state.comboMultiplier = Math.max(
      state.comboMultiplier - gameConfig.comboDecayRate * deltaSeconds,
      1.0
    );
  }
}
