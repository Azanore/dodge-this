// Property tests for bonus pickup collection, effects, and expiry.
// Related: bonuses.js, collision.js
// Tests Properties 9, 10, 11 from design.md

import { describe, it, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';

vi.mock('./supabase.js', () => ({
  supabase: { auth: { getUser: vi.fn() }, from: vi.fn() }
}));

import { collectBonus, updateEffects, trySpawnBonus } from './bonuses.js';
import { checkPlayerBonusPickups } from './collision.js';
import { recomputeZones } from './zones.js';

function makeState(overrides = {}) {
  return {
    status: 'active',
    elapsed: 0,
    obstacles: [],
    bonuses: [],
    activeEffects: {},
    slowmoMultiplier: 1,
    player: { x: 400, y: 300, radius: gameConfig.playerHitboxRadius },
    ...overrides
  };
}

beforeEach(() => {
  window.innerWidth = 1280;
  window.innerHeight = 720;
  recomputeZones();
});

describe('bonuses', () => {
  /**
   * **Feature: dodge-game, Property 9: Bonus expiry restores pre-bonus state (round trip)**
   * Validates: Requirements 7.8, 7.10
   */
  it('Property 9: activating then expiring a bonus restores pre-bonus state values', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('slowmo', 'shrink', 'invincibility'),
        type => {
          const state = makeState();
          const preRadius = state.player.radius;
          const preSlowmo = state.slowmoMultiplier;

          collectBonus(type, state);

          // Advance time past the bonus duration to trigger expiry
          const duration = gameConfig.bonusTypes[type].duration || 1;
          updateEffects(duration + 1, state);

          // State should be restored
          if (type === 'slowmo') {
            expect(state.slowmoMultiplier).toBe(preSlowmo);
            expect(state.activeEffects.slowmo).toBeUndefined();
          } else if (type === 'shrink') {
            expect(state.player.radius).toBe(preRadius);
            expect(state.activeEffects.shrink).toBeUndefined();
          } else if (type === 'invincibility') {
            expect(state.activeEffects.invincibility).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: dodge-game, Property 10: Collected bonus pickups are removed from the field**
   * Validates: Requirements 7.2
   */
  it('Property 10: bonus pickup overlapping player is removed from field after collision check', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), count => {
        const state = makeState();
        // Place pickups directly on the player position so they always overlap
        for (let i = 0; i < count; i++) {
          state.bonuses.push({
            type: 'slowmo',
            x: state.player.x,
            y: state.player.y,
            radius: 12,
            color: '#00cfff'
          });
        }

        checkPlayerBonusPickups(state, collectBonus);

        // All overlapping pickups must be removed
        expect(state.bonuses.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: dodge-game, Property 11: Slow-mo reduces all obstacle speeds by 60%**
   * Validates: Requirements 7.5
   */
  it('Property 11: slow-mo sets slowmoMultiplier to 0.4 (40% of original speed)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.5, max: 3.0, noNaN: true }),
        preMultiplier => {
          const state = makeState({ slowmoMultiplier: preMultiplier });
          collectBonus('slowmo', state);
          // Slow-mo should set multiplier to 0.4 regardless of prior value
          expect(state.slowmoMultiplier).toBeCloseTo(0.4, 5);
        }
      ),
      { numRuns: 100 }
    );
  });
});
