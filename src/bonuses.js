// Bonus pickup spawning, activation, and expiry management.
// Related: zones.js (innerZone), obstacles.js (clearAll), GameState.js, collision.js
// Does not handle rendering or collision detection.

import { innerZone } from './zones.js';
import { clearAll } from './obstacles.js';
import { triggerBonusFlash } from './renderer.js';
import { playPickup } from './audio.js'; // AUDIO

// Fixed hitbox radius for all bonus pickups
const PICKUP_RADIUS = 12;

// Per-type colors for rendering
const BONUS_COLORS = {
  slowmo: '#0088ff',
  invincibility: '#ffe600',
  screenclear: '#ff4dff',
  shrink: '#00ff99'
};

// Builds a weighted pool of enabled bonus type keys from config
function getEnabledPool() {
  const pool = [];
  for (const [key, cfg] of Object.entries(gameConfig.bonusTypes)) {
    if (cfg.enabled) {
      for (let i = 0; i < cfg.spawnWeight; i++) pool.push(key);
    }
  }
  return pool;
}

// Places a bonus pickup at a random position fully within the inner zone
export function trySpawnBonus(state) {
  const pool = getEnabledPool();

  if (pool.length === 0) {
    // Check if all enabled types have zero weight (vs all disabled)
    const anyEnabled = Object.values(gameConfig.bonusTypes).some(c => c.enabled);
    if (anyEnabled) console.warn('bonuses: all enabled bonus spawnWeights sum to zero — no bonuses will spawn');
    return;
  }

  const type = pool[Math.floor(Math.random() * pool.length)];
  const iz = innerZone;

  state.bonuses.push({
    type,
    x: iz.x + PICKUP_RADIUS + Math.random() * (iz.width - PICKUP_RADIUS * 2),
    y: iz.y + PICKUP_RADIUS + Math.random() * (iz.height - PICKUP_RADIUS * 2),
    radius: PICKUP_RADIUS,
    color: BONUS_COLORS[type]
  });
}

// Activates a bonus effect and records pre-bonus values for restoration on expiry
export function collectBonus(type, state, x = 0, y = 0) {
  const cfg = gameConfig.bonusTypes[type];
  triggerBonusFlash(x, y, BONUS_COLORS[type] ?? '#ffffff');
  playPickup(); // AUDIO

  if (type === 'slowmo') {
    const prev = state.slowmoMultiplier ?? 1;
    state.activeEffects.slowmo = { remaining: cfg.duration, prevMultiplier: prev };
    state.slowmoMultiplier = 0.4;

  } else if (type === 'invincibility') {
    state.activeEffects.invincibility = { remaining: cfg.duration };

  } else if (type === 'screenclear') {
    clearAll(state);
    // screenclear is instant — no duration to track

  } else if (type === 'shrink') {
    const prevRadius = state.player.radius;
    state.activeEffects.shrink = { remaining: cfg.duration, prevRadius };
    state.player.radius = Math.round(gameConfig.playerHitboxRadius * 0.45);
  }
}

// Ticks all active effects down by delta ms, cleans up expired ones, and advances slowmo fade-out
export function updateEffects(delta, state) {
  for (const [type, effect] of Object.entries(state.activeEffects)) {
    effect.remaining -= delta;

    if (effect.remaining <= 0) {
      if (type === 'slowmo') {
        // Start fade-out instead of snapping back
        state.slowmoFadeRemaining = gameConfig.slowmoFadeDuration;
      } else if (type === 'shrink') {
        state.player.radius = effect.prevRadius;
      }
      delete state.activeEffects[type];
    }
  }

  // Gradually ease slowmoMultiplier back to 1 after expiry
  if (state.slowmoFadeRemaining > 0) {
    state.slowmoFadeRemaining -= delta;
    const t = Math.max(0, state.slowmoFadeRemaining / gameConfig.slowmoFadeDuration);
    // t goes 1→0 as fade progresses; lerp from 0.4 to 1
    state.slowmoMultiplier = 1 - t * (1 - 0.4);
    if (state.slowmoFadeRemaining <= 0) state.slowmoMultiplier = 1;
  }
}
