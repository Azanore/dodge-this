// Central config — all tunable game parameters live here.
// Edit this file to adjust game feel without touching game logic.
// Loaded as a classic script — window.gameConfig is set synchronously before any module runs.
window.gameConfig = {
  gracePeriod: 500,            // ms before first obstacle spawns
  playerHitboxRadius: 14,      // base player hitbox radius in pixels
  outerZoneScale: 1.3,         // outer zone is this multiple of inner zone on each axis

  maxSpeedMultiplier: 4.0,     // hard cap on obstacle speed multiplier

  difficulty: {
    speedScaleFactor: 0.6,     // controls how fast speed ramps up (logarithmic)
    spawnRateDecayRate: 0.04,  // controls how fast spawn interval shrinks (exponential)
    spawnRateMin: 400,         // ms — spawn interval never drops below this
    baseSpawnInterval: 1800,   // ms — starting spawn interval
    maxObstaclesOnScreen: 25   // hard cap on simultaneous obstacles
  },

  obstacleTypes: {
    ball: { enabled: true, baseSpeed: 0.18, spawnWeight: 5 },
    bullet: { enabled: true, baseSpeed: 0.32, spawnWeight: 3 },
    shard: { enabled: true, baseSpeed: 0.22, spawnWeight: 2 },
    tracker: { enabled: true, baseSpeed: 0.14, spawnWeight: 2, turnRate: 0.04 }
  },

  bonusTypes: {
    slowmo: { enabled: true, duration: 5000, spawnWeight: 3 },
    invincibility: { enabled: true, duration: 4000, spawnWeight: 2 },
    screenclear: { enabled: true, duration: 0, spawnWeight: 1 },
    shrink: { enabled: true, duration: 6000, spawnWeight: 3 }
  }
};
