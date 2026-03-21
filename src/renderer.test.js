// Property tests for near-miss feedback rendering state in renderer.js.
// Related: renderer.js, near-miss-feedback design.md
// Tests Property 4 from near-miss-feedback design.md

import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { triggerNearMiss, nearMissText } from './renderer.js';

describe('renderer near-miss text state', () => {
  beforeEach(() => {
    // Reset state before each test
    nearMissText.remaining = 0;
  });

  /**
   * **Feature: near-miss-feedback, Property 4: Near-miss text resets on repeat, never stacks**
   * Validates: Requirements 1.3, 2.3
   */
  it('Property 4: nearMissText.remaining is always 600 after last trigger, regardless of call count', () => {
    fc.assert(
      fc.property(
        // Number of times triggerNearMiss is called in sequence (1 to 20)
        fc.integer({ min: 1, max: 20 }),
        // Arbitrary x, y positions
        fc.float({ min: -1000, max: 1000, noNaN: true }),
        fc.float({ min: -1000, max: 1000, noNaN: true }),
        (n, x, y) => {
          nearMissText.remaining = 0;
          for (let i = 0; i < n; i++) {
            triggerNearMiss(x, y);
          }
          // After any number of triggers, remaining must be exactly 600 — never accumulated
          expect(nearMissText.remaining).toBe(600);
        }
      ),
      { numRuns: 100 }
    );
  });
});
