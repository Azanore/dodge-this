// Central state object shared across all game modules.
// Related: main.js, GameLoop.js, player.js, obstacles.js, bonuses.js, collision.js
// Does not contain any logic — pure data only.

// Returns a fresh initial game state
export function resetState() {
  return {
    status: 'start',          // 'start' | 'grace' | 'active' | 'paused' | 'dead'
    prevStatus: null,         // used to restore status after unpause
    elapsed: 0,               // ms survived (starts counting from run begin)
    graceRemaining: gameConfig.gracePeriod,
    obstacles: [],
    bonuses: [],              // bonus pickups currently on the field
    activeEffects: {},        // { slowmo: {remaining}, shrink: {remaining}, invincibility: {remaining} }
    slowmoMultiplier: 1,      // speed reduction factor during slow-mo bonus
    player: {
      x: 0,
      y: 0,
      radius: gameConfig.playerHitboxRadius
    },
    personalBest: 0,
    score: 0,
    pendingScore: 0,          // score accumulated during active multiplier — lost on death, banked at x1
    comboMultiplier: 1.0,
    scoreZone: { active: false }
  };
}

export const state = resetState();
