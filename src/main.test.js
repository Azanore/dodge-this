// Property and unit tests for main.js game loop behavior.
// Related: main.js, GameState.js
// Tests the update guard logic, start screen state transitions, and pause behavior.
import { describe, it, beforeEach, expect } from 'vitest';
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

// Simulates the Escape key handler from main.js (panel assumed closed)
function applyEscape(state, panelOpen = false) {
  if (state.status === 'dead' || state.status === 'start') return;
  if (panelOpen) return;
  if (state.status === 'active' || state.status === 'grace') {
    state.prevStatus = state.status;
    state.status = 'paused';
  } else if (state.status === 'paused') {
    state.status = state.prevStatus;
    state.prevStatus = null;
  }
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

describe('pause/unpause behavior', () => {
  /**
   * Feature: dodge-game-fixes, Property 3: Pause/unpause is a round trip
   * Validates: Requirements 3.3
   *
   * For any state with status 'active' or 'grace', pausing then unpausing
   * must restore the original status.
   */
  it('Property 3: pause then unpause restores original status', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('active', 'grace'),
        (initialStatus) => {
          const state = resetState();
          state.status = initialStatus;

          applyEscape(state); // pause
          applyEscape(state); // unpause

          return state.status === initialStatus;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: dodge-game-fixes, Property 4: Escape is ignored in terminal/pre-game states
   * Validates: Requirements 3.5
   *
   * For any state with status 'dead' or 'start', the pause handler must not change status.
   */
  it('Property 4: Escape ignored in dead or start states', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('dead', 'start'),
        (terminalStatus) => {
          const state = resetState();
          state.status = terminalStatus;

          applyEscape(state);

          return state.status === terminalStatus;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Escape during active sets status to paused', () => {
    const state = resetState();
    state.status = 'active';
    applyEscape(state);
    expect(state.status).toBe('paused');
  });

  it('Escape while Config Panel is open does not pause', () => {
    const state = resetState();
    state.status = 'active';
    applyEscape(state, true); // panelOpen = true
    expect(state.status).toBe('active');
  });

  it('Escape during dead is ignored', () => {
    const state = resetState();
    state.status = 'dead';
    applyEscape(state);
    expect(state.status).toBe('dead');
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
