// Property tests for difficulty curve functions.
// Related: difficulty.js
// Tests Properties 7 and 8 from design.md

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { getCurrentSpeedMultiplier, getCurrentSpawnInterval, getPreset } from './difficulty.js';

// Arbitrary: elapsed time from 0 to 10 minutes in ms
const arbElapsed = fc.integer({ min: 0, max: 600000 });
const arbDifficulty = fc.constantFrom('easy', 'normal', 'hard');

describe('difficulty', () => {
  /**
   * **Feature: dodge-game, Property 7: Difficulty speed multiplier is monotonically non-decreasing**
   * Validates: Requirements 5.1
   */
  it('Property 7: speed multiplier is monotonically non-decreasing over time', () => {
    fc.assert(
      fc.property(arbElapsed, arbElapsed, arbDifficulty, (t1, t2, diff) => {
        const earlier = Math.min(t1, t2);
        const later = Math.max(t1, t2);
        expect(getCurrentSpeedMultiplier(later, diff)).toBeGreaterThanOrEqual(
          getCurrentSpeedMultiplier(earlier, diff)
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
      fc.property(arbElapsed, arbDifficulty, (elapsed, diff) => {
        const preset = getPreset(diff);
        const spawnInterval = getCurrentSpawnInterval(elapsed, diff);
        const speedMult = getCurrentSpeedMultiplier(elapsed, diff);

        expect(spawnInterval).toBeGreaterThanOrEqual(preset.spawnRateMin);
        expect(speedMult).toBeLessThanOrEqual(preset.maxSpeedMultiplier);
      }),
      { numRuns: 100 }
    );
  });
});
