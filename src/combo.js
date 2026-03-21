// Score Zone logic — spawns a wandering zone, drives multiplier build/decay.
// Related: gameUpdate.js, GameState.js, game.config.js, zones.js
// Does not handle rendering or scoring — pure state mutation only.

import { innerZone } from './zones.js';
import { playZoneAppear } from './audio.js'; // AUDIO

// Picks a random spawn position inside the inner zone
function randomZoneSpawn() {
  const { x, y, width, height } = innerZone;
  return {
    x: x + Math.random() * width,
    y: y + Math.random() * height
  };
}

// Picks a random unit-length wander velocity
function randomVelocity(speed) {
  const angle = Math.random() * Math.PI * 2;
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

// Returns true if point (px, py) is within circle at (cx, cy) with radius r
function insideCircle(px, py, cx, cy, r) {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

// Advances the score zone state and mutates state.comboMultiplier.
// accumulators.scoreZone tracks ms since last zone spawn.
export function updateScoreZone(delta, state, accumulators) {
  const cfg = gameConfig;
  const ds = delta / 1000;
  const zone = state.scoreZone;

  if (!zone.active) {
    accumulators.scoreZone += delta;
    if (accumulators.scoreZone >= cfg.scoreZoneInterval) {
      accumulators.scoreZone = 0;
      const pos = randomZoneSpawn();
      const vel = randomVelocity(cfg.scoreZoneWanderSpeed / 1000); // px/ms
      state.scoreZone = {
        active: true,
        x: pos.x,
        y: pos.y,
        radius: cfg.scoreZoneRadius,
        remaining: cfg.scoreZoneDuration,
        vx: vel.vx,
        vy: vel.vy
      };
      playZoneAppear(); // AUDIO
    }
    // Normal decay while zone inactive
    state.comboMultiplier = Math.max(
      state.comboMultiplier - cfg.comboDecayRate * ds,
      1.0
    );
    return;
  }

  // Zone is active — decrement remaining
  zone.remaining -= delta;
  if (zone.remaining <= 0) {
    state.scoreZone = { active: false };
    // Zone just disappeared — apply normal decay (req 2.4)
    state.comboMultiplier = Math.max(
      state.comboMultiplier - cfg.comboDecayRate * ds,
      1.0
    );
    return;
  }

  // Wander: move center, reverse velocity on boundary contact
  zone.x += zone.vx * delta;
  zone.y += zone.vy * delta;

  const { x: ix, y: iy, width: iw, height: ih } = innerZone;
  if (zone.x < ix || zone.x > ix + iw) {
    zone.vx = -zone.vx;
    zone.x = Math.max(ix, Math.min(ix + iw, zone.x));
  }
  if (zone.y < iy || zone.y > iy + ih) {
    zone.vy = -zone.vy;
    zone.y = Math.max(iy, Math.min(iy + ih, zone.y));
  }

  // Multiplier: build inside, fast decay outside
  const { player } = state;
  if (insideCircle(player.x, player.y, zone.x, zone.y, zone.radius)) {
    state.comboMultiplier = Math.min(
      state.comboMultiplier + cfg.comboBuildRate * ds,
      cfg.comboMultiplierMax
    );
  } else {
    state.comboMultiplier = Math.max(
      state.comboMultiplier - cfg.comboFastDecayRate * ds,
      1.0
    );
  }
}
