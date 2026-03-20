// Difficulty curve calculations: speed multiplier and spawn interval over time.
// Related: obstacles.js, GameLoop.js, game.config.js
// Does not manage state — pure functions of elapsed time and config.

// Returns speed multiplier at a given elapsed time (ms).
// Logarithmic ramp, capped at maxSpeedMultiplier.
export function getCurrentSpeedMultiplier(elapsed) {
  const raw = 1 + gameConfig.difficulty.speedScaleFactor * Math.log(1 + elapsed / 1000);
  return Math.min(raw, gameConfig.maxSpeedMultiplier);
}

// Returns spawn interval (ms) at a given elapsed time.
// Exponential decay, floored at spawnRateMin.
export function getCurrentSpawnInterval(elapsed) {
  const { baseSpawnInterval, spawnRateDecayRate, spawnRateMin } = gameConfig.difficulty;
  const raw = baseSpawnInterval * Math.exp(-spawnRateDecayRate * elapsed / 1000);
  return Math.max(raw, spawnRateMin);
}
