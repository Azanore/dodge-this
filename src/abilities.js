// Kinetic Battery active abilities: Blink Dash, Kinetic Pulse, Temporal Shift.
// Related: gameUpdate.js, GameState.js, renderer.js, collision.js, obstacles.js
// Modular registry — adding a new ability requires adding an entry here.

import { innerZone } from './zones.js';

export const ABILITIES = {
  dash: {
    execute: (state, mousePos) => {
      const cfg = gameConfig.battery.abilities.dash.params;
      const { x: px, y: py } = state.player;

      // Calculate direction to mouse
      const dx = mousePos.x - px;
      const dy = mousePos.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let tx = px, ty = py;
      if (dist > 0) {
        const moveDist = Math.min(dist, cfg.dist);
        tx += (dx / dist) * moveDist;
        ty += (dy / dist) * moveDist;
      }

      // Clamp to inner zone with radius margin
      const r = state.player.radius;
      state.player.x = Math.max(innerZone.x + r, Math.min(innerZone.x + innerZone.width - r, tx));
      state.player.y = Math.max(innerZone.y + r, Math.min(innerZone.y + innerZone.height - r, ty));

      // Kinetic Nova: Destroy obstacles at destination
      state.obstacles = state.obstacles.filter(obs => {
        const ddx = obs.x - state.player.x;
        const ddy = obs.y - state.player.y;
        return (ddx * ddx + ddy * ddy) > (cfg.novaRadius + obs.radius) ** 2;
      });

      return { type: 'dash', x: px, y: py, tx: state.player.x, ty: state.player.y };
    }
  },

  pulse: {
    execute: (state) => {
      const cfg = gameConfig.battery.abilities.pulse.params;
      const { x: px, y: py } = state.player;

      state.obstacles.forEach(obs => {
        const dx = obs.x - px;
        const dy = obs.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          // Add repulsive force to velocity
          obs.vx += (dx / dist) * cfg.pushForce;
          obs.vy += (dy / dist) * cfg.pushForce;
        }
      });

      state.abilityActive = { type: 'pulse', remaining: cfg.duration };
      state.phasedRemaining = cfg.phasedDuration; // Invincibility briefly during push

      return { type: 'pulse', x: px, y: py };
    }
  },

  chrono: {
    execute: (state) => {
      const cfg = gameConfig.battery.abilities.chrono.params;
      state.abilityActive = { type: 'chrono', remaining: cfg.duration };
      return { type: 'chrono' };
    }
  }
};
