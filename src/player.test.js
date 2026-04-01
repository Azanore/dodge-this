// Property tests for player.js position sync.
// Related: player.js, zones.js, GameState.js
import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { recomputeZones, innerZone } from './zones.js';
import { update } from './player.js';
import { resetState } from './GameState.js';

// Ensure zones are computed before tests run
recomputeZones();

// Mock canvas-container bounding rect so coordinate transform is a no-op (scale=1, offset=0)
const mockContainer = document.createElement('div');
mockContainer.id = 'canvas-container';
mockContainer.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1600, height: 900 });
document.body.appendChild(mockContainer);

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
