// Central state object shared across all game modules.
// Related: main.js, GameLoop.js, player.js, obstacles.js, bonuses.js, collision.js
// Does not contain any logic — pure data only.

// Returns a fresh initial game state — difficulty is set by main.js before first run
export function resetState(difficulty = 'normal') {
  return {
    status: 'start',
    prevStatus: null,
    difficulty,
    elapsed: 0,
    graceRemaining: gameConfig.gracePeriod,
    obstacles: [],
    bonuses: [],
    activeEffects: {},
    slowmoMultiplier: 1,
    slowmoFadeRemaining: 0,
    player: {
      x: 0,
      y: 0,
      radius: gameConfig.playerHitboxRadius
    },
    personalBest: 0,
    score: 0,
    pendingScore: 0,
    comboMultiplier: 1.0,
    scoreZone: { active: false }
  };
}

