// Property tests for player.js position sync.
// Related: player.js, zones.js, GameState.js
import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { recomputeZones, innerZone } from './zones.js';
import { update } from './player.js';
import { resetState } from './GameState.js';

// Ensure zones are computed before tests run
recomputeZones();

describe('player position sync', () => {
  let state;

  beforeEach(() => {
    state = resetState();
  });

  /**
   * Feature: dodge-game-fixes, Property 1: Player position always synced to state
   * Validates: Requirements 1.1
   *
   * For any mouse (x, y), after player.update(state), state.player.x/y must be
   * clamped to the inner zone inset by the player radius (so the ball never exits visually).
   */
  it('Property 1: state.player.x/y is clamped to inner zone (radius-inset) after update', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -2000, max: 4000, noNaN: true }),
        fc.float({ min: -2000, max: 4000, noNaN: true }),
        (x, y) => {
          // Simulate a mousemove event so rawX/rawY are set
          window.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y }));

          update(state);

          const r = state.player.radius;
          const minX = innerZone.x + r;
          const maxX = innerZone.x + innerZone.width - r;
          const minY = innerZone.y + r;
          const maxY = innerZone.y + innerZone.height - r;

          const expectedX = Math.max(minX, Math.min(maxX, x));
          const expectedY = Math.max(minY, Math.min(maxY, y));

          return state.player.x === expectedX && state.player.y === expectedY;
        }
      ),
      { numRuns: 100 }
    );
  });
});
