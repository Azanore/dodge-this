// Feature: ui-consistency-overhaul, Property 2: cleanup() removes all listeners and is safe to call repeatedly
// Tests that cleanup() removes all listeners and is idempotent.
// Related: gameOver.js, requirements 3.1, 3.3, 3.4

import { describe, it, beforeEach, expect } from 'vitest';
import * as fc from 'fast-check';
import { showGameOver, cleanup } from './gameOver.js';

// Minimal DOM setup required by gameOver.js
function setupDOM() {
  document.body.innerHTML = `
    <div id="game-over-screen"></div>
    <button id="restart-btn"></button>
    <span id="go-score"></span>
    <span id="go-elapsed"></span>
    <span id="go-pb"></span>
  `;
}

const baseState = { score: 0, elapsed: 0, difficulty: 'normal' };

beforeEach(() => {
  setupDOM();
  cleanup(); // reset module state between tests
});

describe('cleanup() idempotency — Property 2', () => {
  /**
   * **Validates: Requirements 3.1, 3.3, 3.4**
   *
   * For any onRestart callback, after cleanup() is called, neither a button click
   * nor an R keydown event should invoke the callback.
   */
  it('Property 2: onRestart is never called after cleanup(), for any callback', () => {
    fc.assert(
      fc.property(
        fc.func(fc.constant(undefined)),
        (onRestart) => {
          setupDOM();
          let callCount = 0;
          const tracked = () => { callCount++; onRestart(); };

          showGameOver(baseState, tracked);
          cleanup();

          // Simulate button click — should not fire
          document.getElementById('restart-btn').click();

          // Simulate R keydown — should not fire
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'R' }));
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));

          expect(callCount).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('cleanup() called before showGameOver does not throw', () => {
    expect(() => cleanup()).not.toThrow();
  });

  it('cleanup() called twice after showGameOver does not throw', () => {
    let called = 0;
    showGameOver(baseState, () => { called++; });
    expect(() => {
      cleanup();
      cleanup();
    }).not.toThrow();
    expect(called).toBe(0);
  });
});
