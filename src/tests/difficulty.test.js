// Property tests for difficulty curve functions.
// Related: difficulty.js
// Tests Properties 7 and 8 from design.md

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { getCurrentSpeedMultiplier, getCurrentSpawnInterval, getPreset } from '../core/difficulty.js';

// Arbitrary: elapsed time from 0 to 10 minutes in ms
const arbElapsed = fc.integer({ min: 0, max: 600000 });
const arbDifficulty = fc.constantFrom('easy', 'normal', 'hard');

describe('difficulty — rebalanced curves (Longer Sessions)', () => {
  it('easy preset has spawnRateDecayRate 0.025', () => {
    expect(getPreset('easy').spawnRateDecayRate).toBe(0.025);
  });

  it('normal preset has spawnRateDecayRate 0.035', () => {
    expect(getPreset('normal').spawnRateDecayRate).toBe(0.035);
  });

  it('hard preset has spawnRateDecayRate 0.05', () => {
    expect(getPreset('hard').spawnRateDecayRate).toBe(0.05);
  });

  it('normal interval at t=300s equals spawnRateMin (floor reached)', () => {
    // base (1800) * exp(-0.035 * 300) = tiny, so floor at 650
    expect(getCurrentSpawnInterval(300000, 'normal')).toBe(650);
  });
});

describe('difficulty', () => {
  /**
   * **Feature: game-balancing-overhaul, Property 3: 500ms reaction floor holds for all presets at all times**
   * Validates: Requirements 3.1, 3.3
   */
  it('Property 3: spawn interval >= preset spawnRateMin at all times', () => {
    fc.assert(
      fc.property(arbElapsed, arbDifficulty, (elapsed, diff) => {
        const preset = getPreset(diff);
        expect(getCurrentSpawnInterval(elapsed, diff)).toBeGreaterThanOrEqual(preset.spawnRateMin);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: game-balancing-overhaul, Property 4: Proportional difficulty ordering at all times**
   * Validates: Requirements 4.1, 4.2
   */
  it('Property 4: easy interval >= normal interval >= hard interval at all times', () => {
    fc.assert(
      fc.property(arbElapsed, (elapsed) => {
        const easy = getCurrentSpawnInterval(elapsed, 'easy');
        const normal = getCurrentSpawnInterval(elapsed, 'normal');
        const hard = getCurrentSpawnInterval(elapsed, 'hard');
        expect(easy).toBeGreaterThanOrEqual(normal);
        expect(normal).toBeGreaterThanOrEqual(hard);
      }),
      { numRuns: 100 }
    );
  });

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
