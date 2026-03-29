// Central config — all tunable game parameters live here.
// Edit this file to adjust game feel without touching game logic.
// Loaded as a classic script — window.gameConfig is set synchronously before any module runs.
window.gameConfig = {
  gracePeriod: 500,            // ms before first obstacle spawns
  playerHitboxRadius: 10,      // base player hitbox radius in pixels
  outerZoneScale: 1.3,         // outer zone is this multiple of inner zone on each axis

  nearMissThreshold: 26,       // px gap between edges that counts as a near-miss

  comboMultiplierMax: 5.0,     // hard cap on combo multiplier
  comboBuildRate: 1.5,         // multiplier units gained per second while inside score zone
  comboDecayRate: 0.8,         // multiplier units lost per second when zone inactive
  comboFastDecayRate: 1.6,     // multiplier units lost per second when zone active, player outside

  scoreZoneInterval: 10000,    // ms between zone appearances
  scoreZoneDuration: 7000,     // ms zone stays active
  scoreZoneRadius: 90,         // px radius of the score zone
  scoreZoneWanderSpeed: 40,    // px per second wander speed

  slowmoFadeDuration: 1500,    // ms to ease slowmoMultiplier back to 1 after expiry

  // Difficulty presets — same logarithmic curve shape, different ceiling and ramp rate
  // Existing scores (dodge_pb) are migrated to 'hard' on first load
  difficultyPresets: {
    easy: {
      speedScaleFactor: 0.3,
      spawnRateDecayRate: 0.03,
      spawnRateMin: 700,
      baseSpawnInterval: 1800,
      maxObstaclesOnScreen: 12,
      maxSpeedMultiplier: 2.0,
      maxTrackers: 1,
    },
    normal: {
      speedScaleFactor: 0.4,
      spawnRateDecayRate: 0.04,
      spawnRateMin: 550,
      baseSpawnInterval: 1500,
      maxObstaclesOnScreen: 18,
      maxSpeedMultiplier: 2.8,
      maxTrackers: 3,
    },
    hard: {
      speedScaleFactor: 0.5,
      spawnRateDecayRate: 0.05,
      spawnRateMin: 400,
      baseSpawnInterval: 1200,
      maxObstaclesOnScreen: 25,
      maxSpeedMultiplier: 3.5,
      maxTrackers: 5,
    },
  },

  obstacleTypes: {
    ball: { enabled: true, baseSpeed: 0.22, spawnWeight: 5 },
    bullet: { enabled: true, baseSpeed: 0.30, spawnWeight: 3 },
    shard: { enabled: true, baseSpeed: 0.26, spawnWeight: 2 },
    tracker: { enabled: true, baseSpeed: 0.13, spawnWeight: 1, turnRate: 0.025 }
  },

  bonusTypes: {
    slowmo: { enabled: true, duration: 5000, spawnWeight: 3 },
    invincibility: { enabled: true, duration: 4000, spawnWeight: 2 },
    screenclear: { enabled: true, duration: 0, spawnWeight: 1 },
    shrink: { enabled: true, duration: 6000, spawnWeight: 3 }
  }
};
