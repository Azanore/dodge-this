// Central state object shared across all game modules.
// Related: main.js, GameLoop.js, player.js, obstacles.js, bonuses.js, collision.js
// Does not contain any logic — pure data only.

// Returns a fresh initial game state
export function resetState() {
  return {
    status: 'grace',          // 'grace' | 'active' | 'dead'
    elapsed: 0,               // ms survived (starts counting from run begin)
    graceRemaining: gameConfig.gracePeriod,
    obstacles: [],
    bonuses: [],              // bonus pickups currently on the field
    activeEffects: {},        // { slowmo: {remaining}, shrink: {remaining}, invincibility: {remaining} }
    player: {
      x: 0,
      y: 0,
      radius: gameConfig.playerHitboxRadius
    },
    personalBest: 0
  };
}

export const state = resetState();
