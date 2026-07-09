// Kinetic Battery active abilities: Blink Dash, Kinetic Pulse, Temporal Shift.
// Related: gameUpdate.js, GameState.js, renderer.js, collision.js, obstacles.js
// Modular registry — adding a new ability requires adding an entry here.

import { innerZone } from '../entities/zones.js';

export const ABILITIES = {
  cloak: {
    execute: (state) => {
      const cfg = gameConfig.battery.abilities.cloak.params;
      state.abilityActive = { type: 'cloak', remaining: cfg.duration };
      // Add cloak to activeEffects so it shows a pill and provides logic
      state.activeEffects.cloak = { remaining: cfg.duration };
      return { type: 'cloak', duration: cfg.duration };
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
