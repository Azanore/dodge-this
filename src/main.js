// Entry point — bootstraps and wires all game modules together.
// Imports: all src modules, game.config.js (global)
// Does NOT handle rendering or game logic directly.

import gameConfig from '../game.config.js';

// Hardcoded defaults for all required config keys (Requirement 10.7)
const DEFAULTS = {
  gracePeriod: 2000,
  playerHitboxRadius: 14,
  outerZoneScale: 1.3,
  maxSpeedMultiplier: 4.0,
  difficulty: {
    speedScaleFactor: 0.6,
    spawnRateDecayRate: 0.04,
    spawnRateMin: 400,
    baseSpawnInterval: 1800,
    maxObstaclesOnScreen: 25
  },
  obstacleTypes: {
    ball: { enabled: true, baseSpeed: 0.18, spawnWeight: 5 },
    bullet: { enabled: true, baseSpeed: 0.32, spawnWeight: 3 },
    shard: { enabled: true, baseSpeed: 0.22, spawnWeight: 2 }
  },
  bonusTypes: {
    slowmo: { enabled: true, duration: 5000, spawnWeight: 3 },
    invincibility: { enabled: true, duration: 4000, spawnWeight: 2 },
    screenclear: { enabled: true, duration: 0, spawnWeight: 1 },
    shrink: { enabled: true, duration: 6000, spawnWeight: 3 }
  }
};

// Validate a single scalar value — returns true if present and matches expected type
function isValid(value, type) {
  return value !== undefined && value !== null && typeof value === type;
}

// Validate and apply fallback for a flat key on the config object
function validateKey(cfg, key, type) {
  if (!isValid(cfg[key], type)) {
    console.warn(`[config] Missing or invalid key "${key}" — using default: ${DEFAULTS[key]}`);
    cfg[key] = DEFAULTS[key];
  }
}

// Validate nested difficulty object keys
function validateDifficulty(cfg) {
  if (!cfg.difficulty || typeof cfg.difficulty !== 'object') {
    console.warn('[config] Missing or invalid "difficulty" block — using defaults');
    cfg.difficulty = { ...DEFAULTS.difficulty };
    return;
  }
  for (const key of Object.keys(DEFAULTS.difficulty)) {
    if (!isValid(cfg.difficulty[key], 'number')) {
      console.warn(`[config] Missing or invalid key "difficulty.${key}" — using default: ${DEFAULTS.difficulty[key]}`);
      cfg.difficulty[key] = DEFAULTS.difficulty[key];
    }
  }
}

// Validate each obstacle type entry
function validateObstacleTypes(cfg) {
  if (!cfg.obstacleTypes || typeof cfg.obstacleTypes !== 'object') {
    console.warn('[config] Missing or invalid "obstacleTypes" — using defaults');
    cfg.obstacleTypes = { ...DEFAULTS.obstacleTypes };
    return;
  }
  for (const [name, defaults] of Object.entries(DEFAULTS.obstacleTypes)) {
    if (!cfg.obstacleTypes[name] || typeof cfg.obstacleTypes[name] !== 'object') {
      console.warn(`[config] Missing obstacle type "${name}" — using defaults`);
      cfg.obstacleTypes[name] = { ...defaults };
      continue;
    }
    const t = cfg.obstacleTypes[name];
    if (!isValid(t.enabled, 'boolean')) { console.warn(`[config] obstacleTypes.${name}.enabled invalid — using default`); t.enabled = defaults.enabled; }
    if (!isValid(t.baseSpeed, 'number')) { console.warn(`[config] obstacleTypes.${name}.baseSpeed invalid — using default`); t.baseSpeed = defaults.baseSpeed; }
    if (!isValid(t.spawnWeight, 'number')) { console.warn(`[config] obstacleTypes.${name}.spawnWeight invalid — using default`); t.spawnWeight = defaults.spawnWeight; }
  }
}

// Validate each bonus type entry
function validateBonusTypes(cfg) {
  if (!cfg.bonusTypes || typeof cfg.bonusTypes !== 'object') {
    console.warn('[config] Missing or invalid "bonusTypes" — using defaults');
    cfg.bonusTypes = { ...DEFAULTS.bonusTypes };
    return;
  }
  for (const [name, defaults] of Object.entries(DEFAULTS.bonusTypes)) {
    if (!cfg.bonusTypes[name] || typeof cfg.bonusTypes[name] !== 'object') {
      console.warn(`[config] Missing bonus type "${name}" — using defaults`);
      cfg.bonusTypes[name] = { ...defaults };
      continue;
    }
    const b = cfg.bonusTypes[name];
    if (!isValid(b.enabled, 'boolean')) { console.warn(`[config] bonusTypes.${name}.enabled invalid — using default`); b.enabled = defaults.enabled; }
    if (!isValid(b.duration, 'number')) { console.warn(`[config] bonusTypes.${name}.duration invalid — using default`); b.duration = defaults.duration; }
    if (!isValid(b.spawnWeight, 'number')) { console.warn(`[config] bonusTypes.${name}.spawnWeight invalid — using default`); b.spawnWeight = defaults.spawnWeight; }
  }
}

// Validate the full config object, mutating it in-place with fallbacks where needed
export function validateConfig(cfg) {
  validateKey(cfg, 'gracePeriod', 'number');
  validateKey(cfg, 'playerHitboxRadius', 'number');
  validateKey(cfg, 'outerZoneScale', 'number');
  validateKey(cfg, 'maxSpeedMultiplier', 'number');
  validateDifficulty(cfg);
  validateObstacleTypes(cfg);
  validateBonusTypes(cfg);
  return cfg;
}

// Apply validation to the imported config at startup
validateConfig(gameConfig);

export const config = gameConfig;
