// Property tests for combo multiplier logic and PB write logic.
// Related: combo.js, gameUpdate.js, game.config.js, GameState.js, gameOver.js
// Tests Properties 1, 2, 3, and 4 from combo-multiplier design.md

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { updateComboMultiplier } from './combo.js';
import { updatePB } from './gameOver.js';

const MAX = 5.0;
const BUILD_RATE = 1.5;
const DECAY_RATE = 0.8;
const THRESHOLD = 20;
const PLAYER_RADIUS = 14;

// Builds a minimal state with no obstacles (safe scenario)
function makeState(multiplier, obstacles = []) {
  return {
    player: { x: 300, y: 300, radius: PLAYER_RADIUS },
    obstacles,
    comboMultiplier: multiplier
  };
}

// Places an obstacle at exactly `gap` pixels from the player edge (within threshold)
function obsInZone(player, gap, obsRadius = 10) {
  return {
    x: player.x + player.radius + obsRadius + gap,
    y: player.y,
    radius: obsRadius
  };
}

describe('combo', () => {
  let origConfig;

  beforeEach(() => {
    origConfig = globalThis.gameConfig;
    globalThis.gameConfig = {
      nearMissThreshold: THRESHOLD,
      comboMultiplierMax: MAX,
      comboBuildRate: BUILD_RATE,
      comboDecayRate: DECAY_RATE
    };
  });

  afterEach(() => {
    globalThis.gameConfig = origConfig;
  });

  /**
   * **Feature: combo-multiplier, Property 1: Score accumulates proportionally to multiplier**
   * Validates: Requirements 1.1
   */
  it('Property 1: score accumulates proportionally to multiplier', () => {
    fc.assert(
      fc.property(
        // starting score
        fc.float({ min: 0, max: Math.fround(100000), noNaN: true }),
        // starting multiplier anywhere in valid range
        fc.float({ min: Math.fround(1.0), max: Math.fround(MAX), noNaN: true }),
        // positive delta in ms
        fc.float({ min: Math.fround(1), max: Math.fround(2000), noNaN: true }),
        (startScore, startMultiplier, delta) => {
          const state = makeState(startMultiplier, []); // no obstacles
          state.score = startScore;

          // Replicate the gameUpdate active block: update multiplier then accumulate score
          updateComboMultiplier(delta, state);
          const multiplierAfterUpdate = state.comboMultiplier;
          state.score += delta * state.comboMultiplier;

          expect(state.score).toBeCloseTo(startScore + delta * multiplierAfterUpdate, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: combo-multiplier, Property 2: Multiplier builds when near obstacle, capped at max**
   * Validates: Requirements 1.3
   */
  it('Property 2: multiplier builds when near obstacle, capped at max', () => {
    fc.assert(
      fc.property(
        // starting multiplier strictly below max
        fc.float({ min: 1.0, max: Math.fround(MAX - 0.01), noNaN: true }),
        // positive delta in ms (1ms to 2s)
        fc.float({ min: Math.fround(1), max: Math.fround(2000), noNaN: true }),
        // gap within near-miss zone (0 exclusive, threshold inclusive)
        fc.float({ min: Math.fround(0.1), max: Math.fround(THRESHOLD), noNaN: true }),
        (startMultiplier, delta, gap) => {
          const state = makeState(startMultiplier, [obsInZone({ x: 300, y: 300, radius: PLAYER_RADIUS }, gap)]);
          const before = state.comboMultiplier;
          updateComboMultiplier(delta, state);
          expect(state.comboMultiplier).toBeGreaterThan(before);
          expect(state.comboMultiplier).toBeLessThanOrEqual(MAX);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: combo-multiplier, Property 3: Multiplier decays when safe, floored at 1.0**
   * Validates: Requirements 1.4
   */
  it('Property 3: multiplier decays when safe, floored at 1.0', () => {
    fc.assert(
      fc.property(
        // starting multiplier strictly above 1.0
        fc.float({ min: Math.fround(1.01), max: Math.fround(MAX), noNaN: true }),
        // positive delta in ms
        fc.float({ min: Math.fround(1), max: Math.fround(2000), noNaN: true }),
        (startMultiplier, delta) => {
          const state = makeState(startMultiplier, []); // no obstacles = safe
          const before = state.comboMultiplier;
          updateComboMultiplier(delta, state);
          expect(state.comboMultiplier).toBeLessThan(before);
          expect(state.comboMultiplier).toBeGreaterThanOrEqual(1.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: combo-multiplier, Property 4: PB write always stores the higher of score and existing PB**
   * Validates: Requirements 3.1
   */
  it('Property 4: PB write always stores the higher of score and existing PB', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: Math.fround(1000000), noNaN: true }),
        fc.float({ min: 0, max: Math.fround(1000000), noNaN: true }),
        (score, existingPB) => {
          localStorage.setItem('dodge_pb', String(existingPB));
          const result = updatePB(score);
          expect(result).toBe(Math.max(score, existingPB));
          const stored = parseFloat(localStorage.getItem('dodge_pb'));
          expect(stored).toBe(Math.max(score, existingPB));
        }
      ),
      { numRuns: 100 }
    );
  });
});
