// Property tests for score zone logic.
// Related: combo.js, gameUpdate.js, game.config.js, GameState.js, zones.js
// Tests Properties 1–6 from score-zone design.md

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { updateScoreZone } from './combo.js';
import { innerZone } from './zones.js';

// These are isolated test values — not the real game.config.js values.
// gameConfig is overridden in beforeEach so tests are self-consistent.
const TEST_INTERVAL = 8000;
const TEST_DURATION = 5000;
const TEST_RADIUS = 60;
const TEST_WANDER = 40;
const TEST_BUILD = 1.5;
const TEST_DECAY = 0.8;
const TEST_FAST_DECAY = 2.4;
const TEST_MAX = 5.0;

// Minimal config used in all tests
const TEST_CONFIG = {
  scoreZoneInterval: TEST_INTERVAL,
  scoreZoneDuration: TEST_DURATION,
  scoreZoneRadius: TEST_RADIUS,
  scoreZoneWanderSpeed: TEST_WANDER,
  comboBuildRate: TEST_BUILD,
  comboDecayRate: TEST_DECAY,
  comboFastDecayRate: TEST_FAST_DECAY,
  comboMultiplierMax: TEST_MAX
};

// Sets innerZone to a fixed 800x600 area for deterministic bounds tests
function setInnerZone() {
  innerZone.x = 100;
  innerZone.y = 100;
  innerZone.width = 800;
  innerZone.height = 600;
}

// Returns a state with no active zone and player at zone center (safe default)
function makeState(multiplier = 1.0) {
  return {
    player: { x: 500, y: 400, radius: 14 },
    comboMultiplier: multiplier,
    scoreZone: { active: false }
  };
}

// Returns a state with an active zone, player placed inside or outside based on flag
function makeActiveState(multiplier, playerInside) {
  const zx = 500, zy = 400;
  const px = playerInside ? zx : zx + TEST_RADIUS + 50;
  return {
    player: { x: px, y: zy, radius: 14 },
    comboMultiplier: multiplier,
    scoreZone: {
      active: true,
      x: zx,
      y: zy,
      radius: TEST_RADIUS,
      remaining: TEST_DURATION,
      vx: 0,
      vy: 0
    }
  };
}

describe('score-zone combo', () => {
  let origConfig;

  beforeEach(() => {
    origConfig = globalThis.gameConfig;
    globalThis.gameConfig = { ...TEST_CONFIG };
    setInnerZone();
  });

  afterEach(() => {
    globalThis.gameConfig = origConfig;
  });

  /**
   * **Feature: score-zone, Property 1: Zone spawns at configured interval**
   * Validates: Requirements 1.1
   */
  it('Property 1: zone spawns at configured interval', () => {
    fc.assert(
      fc.property(
        // sequence of deltas that sum to at least INTERVAL
        fc.array(fc.integer({ min: 100, max: 1000 }), { minLength: 1, maxLength: 100 }),
        (deltas) => {
          const state = makeState();
          const accumulators = { scoreZone: 0 };
          let spawned = false;

          // Pad deltas so they definitely exceed the interval
          const totalNeeded = TEST_INTERVAL + 1000;
          let sum = 0;
          const paddedDeltas = [...deltas];
          for (const d of deltas) sum += d;
          if (sum < totalNeeded) paddedDeltas.push(totalNeeded - sum);

          for (const d of paddedDeltas) {
            updateScoreZone(d, state, accumulators);
            if (state.scoreZone.active) { spawned = true; break; }
          }

          expect(spawned).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: score-zone, Property 2: Zone expires after configured duration**
   * Validates: Requirements 1.2
   */
  it('Property 2: zone expires after configured duration', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 100, max: 1000 }), { minLength: 1, maxLength: 100 }),
        (deltas) => {
          // Start with an already-active zone
          const state = makeActiveState(1.0, true);
          const accumulators = { scoreZone: 0 };

          const totalNeeded = TEST_DURATION + 1000;
          let sum = 0;
          const paddedDeltas = [...deltas];
          for (const d of deltas) sum += d;
          if (sum < totalNeeded) paddedDeltas.push(totalNeeded - sum);

          for (const d of paddedDeltas) {
            updateScoreZone(d, state, accumulators);
            if (!state.scoreZone.active) break;
          }

          expect(state.scoreZone.active).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: score-zone, Property 3: Zone center always stays within inner zone bounds**
   * Validates: Requirements 1.3
   */
  it('Property 3: zone center always stays within inner zone bounds', () => {
    fc.assert(
      fc.property(
        // random starting position within inner zone
        fc.float({ min: 100, max: 900, noNaN: true }),
        fc.float({ min: 100, max: 700, noNaN: true }),
        // random velocity direction (angle in radians)
        fc.float({ min: 0, max: Math.fround(Math.PI * 2), noNaN: true }),
        // number of steps
        fc.integer({ min: 1, max: 200 }),
        (startX, startY, angle, steps) => {
          const speed = TEST_WANDER / 1000; // px/ms
          const state = {
            player: { x: startX, y: startY, radius: 14 },
            comboMultiplier: 1.0,
            scoreZone: {
              active: true,
              x: startX,
              y: startY,
              radius: TEST_RADIUS,
              remaining: steps * 100 + 1000,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed
            }
          };
          const accumulators = { scoreZone: 0 };

          for (let i = 0; i < steps; i++) {
            updateScoreZone(100, state, accumulators);
            if (!state.scoreZone.active) break;
            const { x, y } = state.scoreZone;
            expect(x).toBeGreaterThanOrEqual(innerZone.x);
            expect(x).toBeLessThanOrEqual(innerZone.x + innerZone.width);
            expect(y).toBeGreaterThanOrEqual(innerZone.y);
            expect(y).toBeLessThanOrEqual(innerZone.y + innerZone.height);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: score-zone, Property 4: Multiplier builds when player is inside active zone, capped at max**
   * Validates: Requirements 2.1
   */
  it('Property 4: multiplier builds inside active zone, capped at max', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1.0, max: Math.fround(TEST_MAX - 0.01), noNaN: true }),
        fc.integer({ min: 1, max: 2000 }),
        (startMultiplier, delta) => {
          const state = makeActiveState(startMultiplier, true);
          const before = state.comboMultiplier;
          const accumulators = { scoreZone: 0 };
          updateScoreZone(delta, state, accumulators);
          expect(state.comboMultiplier).toBeGreaterThan(before);
          expect(state.comboMultiplier).toBeLessThanOrEqual(TEST_MAX);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: score-zone, Property 5: Multiplier decays fast when zone active and player outside, floored at 1.0**
   * Validates: Requirements 2.2
   */
  it('Property 5: multiplier fast decays outside active zone, floored at 1.0', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(1.01), max: Math.fround(TEST_MAX), noNaN: true }),
        fc.integer({ min: 1, max: 2000 }),
        (startMultiplier, delta) => {
          const state = makeActiveState(startMultiplier, false);
          const before = state.comboMultiplier;
          const accumulators = { scoreZone: 0 };
          updateScoreZone(delta, state, accumulators);
          expect(state.comboMultiplier).toBeLessThan(before);
          expect(state.comboMultiplier).toBeGreaterThanOrEqual(1.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: score-zone, Property 6: Multiplier decays normally when zone inactive, floored at 1.0**
   * Validates: Requirements 2.3
   */
  it('Property 6: multiplier decays normally when zone inactive, floored at 1.0', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(1.01), max: Math.fround(TEST_MAX), noNaN: true }),
        fc.integer({ min: 1, max: 2000 }),
        (startMultiplier, delta) => {
          const state = makeState(startMultiplier);
          const before = state.comboMultiplier;
          const accumulators = { scoreZone: 0 };
          updateScoreZone(delta, state, accumulators);
          expect(state.comboMultiplier).toBeLessThan(before);
          expect(state.comboMultiplier).toBeGreaterThanOrEqual(1.0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
