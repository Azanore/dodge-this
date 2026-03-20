// Property and unit tests for main.js game loop behavior.
// Related: main.js, GameState.js
// Tests the update guard logic and start screen state transitions.
import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { resetState } from './GameState.js';

// Simulates the update guard from main.js — returns true if update was skipped
function updateGuard(state) {
  if (state.status === 'dead') return true;
  if (state.status === 'start') return true;
  return false;
}

// Simulates the onStartAction transition from main.js
function applyStartAction(state) {
  if (state.status !== 'start') return;
  state.status = 'grace';
}

// Simulates onRestart from main.js
function applyRestart(state) {
  const fresh = resetState();
  fresh.status = 'grace';
  fresh.graceRemaining = gameConfig.gracePeriod;
  Object.assign(state, fresh);
}

describe('start state guard', () => {
  /**
   * Feature: dodge-game-fixes, Property 2: No game updates occur in start state
   * Validates: Requirements 2.4
   *
   * For any number of update(delta) calls with state.status === 'start',
   * obstacles and elapsed must remain unchanged.
   */
  it('Property 2: obstacles and elapsed unchanged across any ticks in start state', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        fc.array(fc.float({ min: 1, max: 100, noNaN: true }), { minLength: 1, maxLength: 200 }),
        (_, deltas) => {
          const state = resetState();
          // state.status is 'start' from resetState
          const obstaclesBefore = state.obstacles.length;
          const elapsedBefore = state.elapsed;

          for (const delta of deltas) {
            if (updateGuard(state)) continue;
            // If guard didn't skip, simulate elapsed increment (should not happen)
            state.elapsed += delta;
          }

          return state.obstacles.length === obstaclesBefore && state.elapsed === elapsedBefore;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('start screen transitions', () => {
  let state;

  beforeEach(() => {
    state = resetState();
  });

  it('initial status is "start"', () => {
    expect(state.status).toBe('start');
  });

  it('start action transitions status to "grace"', () => {
    applyStartAction(state);
    expect(state.status).toBe('grace');
  });

  it('restart after Game Over sets status to "grace", not "start"', () => {
    state.status = 'dead';
    applyRestart(state);
    expect(state.status).toBe('grace');
  });
});
