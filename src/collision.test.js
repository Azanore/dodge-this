// Property tests for circle-circle collision detection and near-miss detection.
// Related: collision.js
// Tests Property 6 from dodge-game design.md; Properties 1-3 from near-miss-feedback design.md

import { describe, it, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { circlesOverlap, checkNearMisses } from './collision.js';

// Arbitrary: a circle with position and radius (32-bit float bounds required by fast-check)
const arbCircle = fc.record({
  x: fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true }),
  y: fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true }),
  radius: fc.float({ min: Math.fround(0.1), max: Math.fround(200), noNaN: true })
});

const THRESHOLD = 40;
const COOLDOWN = 600;

// Builds a minimal state object for checkNearMisses
function makeState(player, obstacles) {
  return { player, obstacles, activeEffects: {} };
}

// Builds an obstacle at a specific edge gap from the player
function obsAtGap(player, gap, radius = 10) {
  // Place obstacle directly to the right of the player at the desired gap
  return {
    x: player.x + player.radius + radius + gap,
    y: player.y,
    radius,
    lastNearMissAt: 0
  };
}

describe('collision', () => {
  let origConfig;

  beforeEach(() => {
    origConfig = globalThis.gameConfig;
    globalThis.gameConfig = { nearMissThreshold: THRESHOLD };
  });

  afterEach(() => {
    globalThis.gameConfig = origConfig;
  });

  /**
   * **Feature: dodge-game, Property 6: Collision detection is geometrically correct**
   * Validates: Requirements 4.1
   */
  it('Property 6: circlesOverlap returns true iff distance between centers < sum of radii', () => {
    fc.assert(
      fc.property(arbCircle, arbCircle, (a, b) => {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const sumRadii = a.radius + b.radius;
        const expected = dist < sumRadii;
        expect(circlesOverlap(a, b)).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: near-miss-feedback, Property 1: Near-miss fires within threshold, not outside**
   * Validates: Requirements 1.1
   */
  it('Property 1: checkNearMisses fires callback iff gap is in (0, threshold]', () => {
    const player = { x: 200, y: 200, radius: 14 };

    // Gaps strictly inside (0, THRESHOLD] should trigger
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(THRESHOLD), noNaN: true }),
        (gap) => {
          const obs = obsAtGap(player, gap);
          let fired = 0;
          checkNearMisses(makeState(player, [obs]), () => fired++, performance.now());
          expect(fired).toBe(1);
        }
      ),
      { numRuns: 100 }
    );

    // Gaps above threshold should NOT trigger
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(THRESHOLD + 0.01), max: Math.fround(500), noNaN: true }),
        (gap) => {
          const obs = obsAtGap(player, gap);
          let fired = 0;
          checkNearMisses(makeState(player, [obs]), () => fired++, performance.now());
          expect(fired).toBe(0);
        }
      ),
      { numRuns: 100 }
    );

    // Gap <= 0 (overlap/collision) should NOT trigger
    // Constrain to [-player.radius - obs.radius, 0] so the obstacle genuinely overlaps
    const obsRadius = 10;
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-(player.radius + obsRadius)), max: Math.fround(0), noNaN: true }),
        (gap) => {
          const obs = obsAtGap(player, gap, obsRadius);
          let fired = 0;
          checkNearMisses(makeState(player, [obs]), () => fired++, performance.now());
          expect(fired).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: near-miss-feedback, Property 2: Per-obstacle cooldown suppresses re-trigger**
   * Validates: Requirements 2.1
   */
  it('Property 2: obstacle stamped with recent lastNearMissAt does not re-trigger', () => {
    const player = { x: 200, y: 200, radius: 14 };

    fc.assert(
      fc.property(
        // gap within threshold
        fc.float({ min: 1, max: THRESHOLD - 1, noNaN: true }),
        // time since last trigger: 0 to COOLDOWN (should suppress)
        fc.integer({ min: 0, max: COOLDOWN - 1 }),
        (gap, elapsed) => {
          const obs = obsAtGap(player, gap);
          const now = performance.now();
          obs.lastNearMissAt = now - elapsed;
          let fired = 0;
          checkNearMisses(makeState(player, [obs]), () => fired++, now);
          expect(fired).toBe(0);
        }
      ),
      { numRuns: 100 }
    );

    // After cooldown elapses it should fire again
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: THRESHOLD - 1, noNaN: true }),
        fc.integer({ min: COOLDOWN + 1, max: COOLDOWN + 5000 }),
        (gap, elapsed) => {
          const obs = obsAtGap(player, gap);
          const now = performance.now();
          obs.lastNearMissAt = now - elapsed;
          let fired = 0;
          checkNearMisses(makeState(player, [obs]), () => fired++, now);
          expect(fired).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: near-miss-feedback, Property 3: Each near-miss pushes exactly one ring to flashes, multiple obstacles push independently**
   * Validates: Requirements 1.2, 2.2
   */
  it('Property 3: N obstacles in near-miss range each trigger exactly one callback', () => {
    const player = { x: 300, y: 300, radius: 14 };

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (n) => {
          // Place N obstacles at distinct angles, all within threshold
          const obstacles = Array.from({ length: n }, (_, i) => {
            const angle = (2 * Math.PI * i) / n;
            const gap = 5; // well within threshold
            const obsRadius = 10;
            const dist = player.radius + obsRadius + gap;
            return {
              x: player.x + Math.cos(angle) * dist,
              y: player.y + Math.sin(angle) * dist,
              radius: obsRadius,
              lastNearMissAt: 0
            };
          });
          let fired = 0;
          checkNearMisses(makeState(player, obstacles), () => fired++, performance.now());
          expect(fired).toBe(n);
        }
      ),
      { numRuns: 100 }
    );
  });
});
