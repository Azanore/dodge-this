// Property tests for difficulty curve functions.
// Related: difficulty.js
// Tests Properties 7 and 8 from design.md

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { getCurrentSpeedMultiplier, getCurrentSpawnInterval } from './difficulty.js';

// Arbitrary: elapsed time from 0 to 10 minutes in ms
const arbElapsed = fc.integer({ min: 0, max: 600000 });

describe('difficulty', () => {
  /**
   * **Feature: dodge-game, Property 7: Difficulty speed multiplier is monotonically non-decreasing**
   * Validates: Requirements 5.1
   */
  it('Property 7: speed multiplier is monotonically non-decreasing over time', () => {
    fc.assert(
      fc.property(arbElapsed, arbElapsed, (t1, t2) => {
        const earlier = Math.min(t1, t2);
        const later = Math.max(t1, t2);
        expect(getCurrentSpeedMultiplier(later)).toBeGreaterThanOrEqual(
          getCurrentSpeedMultiplier(earlier)
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: dodge-game, Property 8: Difficulty functions respect their configured bounds**
   * Validates: Requirements 5.4, 5.5
   */
  it('Property 8: spawn interval >= spawnRateMin and speed multiplier <= maxSpeedMultiplier', () => {
    fc.assert(
      fc.property(arbElapsed, elapsed => {
        const spawnInterval = getCurrentSpawnInterval(elapsed);
        const speedMult = getCurrentSpeedMultiplier(elapsed);

        expect(spawnInterval).toBeGreaterThanOrEqual(gameConfig.difficulty.spawnRateMin);
        expect(speedMult).toBeLessThanOrEqual(gameConfig.maxSpeedMultiplier);
      }),
      { numRuns: 100 }
    );
  });
});
