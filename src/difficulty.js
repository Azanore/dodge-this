// Difficulty curve calculations: speed multiplier and spawn interval over time.
// Related: obstacles.js, GameLoop.js, game.config.js (difficultyPresets)
// Does not manage state — pure functions of elapsed time and active preset.

// Returns the active difficulty preset object
export function getPreset(difficulty) {
  return gameConfig.difficultyPresets[difficulty] ?? gameConfig.difficultyPresets.normal;
}

// Returns speed multiplier at a given elapsed time (ms) — logarithmic ramp, capped per preset
export function getCurrentSpeedMultiplier(elapsed, difficulty) {
  const p = getPreset(difficulty);
  const raw = 1 + p.speedScaleFactor * Math.log(1 + elapsed / 1000);
  return Math.min(raw, p.maxSpeedMultiplier);
}

// Returns spawn interval (ms) at a given elapsed time — exponential decay, floored per preset
export function getCurrentSpawnInterval(elapsed, difficulty) {
  const p = getPreset(difficulty);
  const raw = p.baseSpawnInterval * Math.exp(-p.spawnRateDecayRate * elapsed / 1000);
  return Math.max(raw, p.spawnRateMin);
}
