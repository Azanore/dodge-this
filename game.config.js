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

  battery: {
    max: 100,
    chargeRates: {
      passivePerSec: 0.5,
      nearMiss: 3,
      zonePerSec: 5,
      bonus: 10
    },
    overchargeMultiplierBonus: 1.0,
    abilities: {
      cloak: {
        name: 'Phase Cloak',
        cost: 40,
        params: { duration: 2000 }
      },
      pulse: {
        name: 'Kinetic Pulse',
        cost: 60,
        params: { pushForce: 1.2, duration: 1000, phasedDuration: 500 }
      },
      chrono: {
        name: 'Temporal Shift',
        cost: 90,
        params: { timeScale: 0.1, duration: 3000 }
      }
    }
  },

  // Difficulty presets — same logarithmic curve shape, different ceiling and ramp rate
  // Rebalanced for longer sessions (flattened curves)
  difficultyPresets: {
    easy: {
      speedScaleFactor: 0.12,
      spawnRateDecayRate: 0.025,
      spawnRateMin: 800,
      baseSpawnInterval: 2200,
      maxObstaclesOnScreen: 12,
      maxSpeedMultiplier: 1.8,
      maxTrackers: 1,
    },
    normal: {
      speedScaleFactor: 0.16,
      spawnRateDecayRate: 0.035,
      spawnRateMin: 650,
      baseSpawnInterval: 1800,
      maxObstaclesOnScreen: 20,
      maxSpeedMultiplier: 2.4,
      maxTrackers: 3,
    },
    hard: {
      speedScaleFactor: 0.22,
      spawnRateDecayRate: 0.05,
      spawnRateMin: 500,
      baseSpawnInterval: 1500,
      maxObstaclesOnScreen: 35,
      maxSpeedMultiplier: 3.0,
      maxTrackers: 5,
    },
  },

  obstacleTypes: {
    ball: { enabled: true, baseSpeed: 0.22, spawnWeight: 5 },
    bullet: { enabled: true, baseSpeed: 0.30, spawnWeight: 3 },
    shard: { enabled: true, baseSpeed: 0.26, spawnWeight: 2 },
    tracker: { enabled: true, baseSpeed: 0.13, spawnWeight: 1, turnRatePerMs: 0.0015 }
  },

  bonusTypes: {
    slowmo: { enabled: true, duration: 5000, spawnWeight: 3 },
    invincibility: { enabled: true, duration: 4000, spawnWeight: 2 },
    screenclear: { enabled: true, duration: 0, spawnWeight: 1 },
    shrink: { enabled: true, duration: 6000, spawnWeight: 3 }
  }
};
