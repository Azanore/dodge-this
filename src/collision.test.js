// Property tests for circle-circle collision detection.
// Related: collision.js
// Tests Property 6 from design.md

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { circlesOverlap } from './collision.js';

// Arbitrary: a circle with position and radius (32-bit float bounds required by fast-check)
const arbCircle = fc.record({
  x: fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true }),
  y: fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true }),
  radius: fc.float({ min: Math.fround(0.1), max: Math.fround(200), noNaN: true })
});

describe('collision', () => {
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
});
