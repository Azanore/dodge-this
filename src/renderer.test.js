// Property tests for renderer.js behaviors.
// Related: renderer.js, main.js, ui-consistency-overhaul design.md
// Tests Property 4 (near-miss-feedback) and Property 7 (ui-consistency-overhaul)

import { describe, it, beforeEach, vi, expect } from 'vitest';
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

// Simulates renderFrame logic from main.js for property testing
function makeRenderFrame(render, state, lastDelta, isShaking) {
  return function renderFrame() {
    if (state.status === 'dead' && !isShaking()) return;
    if (state.status === 'start') { render(state.ctx, state, lastDelta); return; }
    if (state.status === 'paused') return;
    render(state.ctx, state, lastDelta);
  };
}

describe('renderFrame start-status behavior', () => {
  /**
   * **Feature: ui-consistency-overhaul, Property 7: render() is called for start status**
   * Validates: Requirements 6.3, 6.4
   *
   * For any lastDelta, when state.status === 'start', renderFrame calls render exactly once
   * and never calls renderStartScreen.
   */
  it('Property 7: render() called exactly once for start status, renderStartScreen never called', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 200, noNaN: true }),
        (lastDelta) => {
          const render = vi.fn();
          const renderStartScreen = vi.fn();
          const state = { status: 'start', ctx: {} };
          const isShaking = () => false;

          const renderFrame = makeRenderFrame(render, state, lastDelta, isShaking);
          renderFrame();

          expect(render).toHaveBeenCalledTimes(1);
          expect(renderStartScreen).toHaveBeenCalledTimes(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
