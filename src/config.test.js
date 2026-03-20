// Property tests for config validation and fallback behavior.
// Related: config.js
// Tests Property 12 from design.md

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { validateConfig, DEFAULTS } from './config.js';

// Top-level scalar keys that must be present
const TOP_KEYS = ['gracePeriod', 'playerHitboxRadius', 'outerZoneScale', 'maxSpeedMultiplier'];

// Arbitrary: config with a random subset of top-level keys removed
const arbIncompleteConfig = fc.array(
  fc.constantFrom(...TOP_KEYS),
  { minLength: 1, maxLength: TOP_KEYS.length }
).map(keysToRemove => {
  const cfg = {
    gracePeriod: 2000,
    playerHitboxRadius: 14,
    outerZoneScale: 1.3,
    maxSpeedMultiplier: 4.0,
    difficulty: { ...DEFAULTS.difficulty },
    obstacleTypes: JSON.parse(JSON.stringify(DEFAULTS.obstacleTypes)),
    bonusTypes: JSON.parse(JSON.stringify(DEFAULTS.bonusTypes))
  };
  for (const key of keysToRemove) delete cfg[key];
  return { cfg, keysToRemove: [...new Set(keysToRemove)] };
});

describe('config', () => {
  /**
   * **Feature: dodge-game, Property 12: Config fallback for any missing key**
   * Validates: Requirements 10.7
   */
  it('Property 12: missing config keys are replaced with hardcoded defaults without throwing', () => {
    fc.assert(
      fc.property(arbIncompleteConfig, ({ cfg, keysToRemove }) => {
        let result;
        expect(() => { result = validateConfig(cfg); }).not.toThrow();

        for (const key of keysToRemove) {
          expect(result[key]).toBe(DEFAULTS[key]);
        }
      }),
      { numRuns: 100 }
    );
  });
});
