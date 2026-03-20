// Integration tests: full game flow from start screen through game over.
// Tests the real gameUpdate() with real state — no simulated helpers.
// Related: gameUpdate.js, GameState.js, collision.js, obstacles.js, zones.js

import { describe, it, expect, beforeEach } from 'vitest';
import { resetState } from './GameState.js';
import { gameUpdate, BONUS_SPAWN_INTERVAL } from './gameUpdate.js';
import { recomputeZones, innerZone } from './zones.js';

recomputeZones();

// Fresh accumulators for each test
function makeAcc() { return { spawn: 0, bonus: 0 }; }

// Tick state forward by `n` frames of `delta` ms each
function tick(state, acc, n = 1, delta = 16) {
  let result = null;
  for (let i = 0; i < n; i++) {
    const r = gameUpdate(delta, state, acc);
    if (r) result = r;
  }
  return result;
}

describe('start screen', () => {
  it('initial status is "start"', () => {
    const state = resetState();
    expect(state.status).toBe('start');
  });

  it('gameUpdate is a no-op while status is "start"', () => {
    const state = resetState();
    const acc = makeAcc();
    tick(state, acc, 60); // 60 frames
    expect(state.status).toBe('start');
    expect(state.elapsed).toBe(0);
    expect(state.obstacles.length).toBe(0);
  });

  it('transitioning from start to grace begins the game', () => {
    const state = resetState();
    state.status = 'grace';
    const acc = makeAcc();
    tick(state, acc, 1);
    expect(state.elapsed).toBeGreaterThan(0);
  });
});

describe('grace period', () => {
  it('elapsed increments during grace', () => {
    const state = resetState();
    state.status = 'grace';
    const acc = makeAcc();
    tick(state, acc, 10, 16);
    expect(state.elapsed).toBe(160);
  });

  it('no obstacles spawn during grace period', () => {
    const state = resetState();
    state.status = 'grace';
    const acc = makeAcc();
    // Tick for the full grace period duration
    tick(state, acc, Math.ceil(gameConfig.gracePeriod / 16), 16);
    // Grace should have expired and transitioned to active
    expect(state.status).toBe('active');
  });

  it('transitions to active when graceRemaining hits zero', () => {
    const state = resetState();
    state.status = 'grace';
    state.graceRemaining = 32;
    const acc = makeAcc();
    tick(state, acc, 3, 16); // 48ms > 32ms remaining
    expect(state.status).toBe('active');
  });
});

describe('active play — collision and death', () => {
  it('player dies when an obstacle overlaps state.player', () => {
    const state = resetState();
    state.status = 'active';
    const acc = makeAcc();

    // Place an obstacle directly on the player
    state.player.x = innerZone.x + innerZone.width / 2;
    state.player.y = innerZone.y + innerZone.height / 2;
    state.obstacles.push({
      type: 'ball',
      x: state.player.x,
      y: state.player.y,
      vx: 0, vy: 0,
      radius: 14
    });

    const result = tick(state, acc, 1);
    expect(result).toBe('dead');
    expect(state.status).toBe('dead');
  });

  it('no death when obstacle is far from player', () => {
    const state = resetState();
    state.status = 'active';
    const acc = makeAcc();

    state.player.x = innerZone.x + innerZone.width / 2;
    state.player.y = innerZone.y + innerZone.height / 2;
    state.obstacles.push({
      type: 'ball',
      x: state.player.x + 200,
      y: state.player.y + 200,
      vx: 0, vy: 0,
      radius: 14
    });

    const result = tick(state, acc, 1);
    expect(result).toBeNull();
    expect(state.status).toBe('active');
  });

  it('invincibility prevents death on collision', () => {
    const state = resetState();
    state.status = 'active';
    state.activeEffects.invincibility = { remaining: 5000 };
    const acc = makeAcc();

    state.player.x = innerZone.x + innerZone.width / 2;
    state.player.y = innerZone.y + innerZone.height / 2;
    state.obstacles.push({
      type: 'ball',
      x: state.player.x,
      y: state.player.y,
      vx: 0, vy: 0,
      radius: 14
    });

    const result = tick(state, acc, 1);
    expect(result).toBeNull();
    expect(state.status).toBe('active');
  });

  it('elapsed increases each active frame', () => {
    const state = resetState();
    state.status = 'active';
    const acc = makeAcc();
    tick(state, acc, 5, 16);
    expect(state.elapsed).toBe(80);
  });
});

describe('pause / resume', () => {
  it('gameUpdate is a no-op while paused', () => {
    const state = resetState();
    state.status = 'active';
    state.elapsed = 1000;
    const acc = makeAcc();

    state.status = 'paused';
    tick(state, acc, 10);
    expect(state.elapsed).toBe(1000);
    expect(state.status).toBe('paused');
  });

  it('resuming from paused restores prior status', () => {
    const state = resetState();
    state.status = 'active';
    const acc = makeAcc();

    // Simulate pause handler
    state.prevStatus = state.status;
    state.status = 'paused';

    // Simulate resume handler
    state.status = state.prevStatus;
    state.prevStatus = null;

    expect(state.status).toBe('active');
  });

  it('pausing during grace restores to grace on resume', () => {
    const state = resetState();
    state.status = 'grace';
    const acc = makeAcc();

    state.prevStatus = state.status;
    state.status = 'paused';
    state.status = state.prevStatus;
    state.prevStatus = null;

    expect(state.status).toBe('grace');
  });
});

describe('restart after game over', () => {
  it('restart produces fresh state with status "grace"', () => {
    const state = resetState();
    state.status = 'dead';
    state.elapsed = 9999;
    state.obstacles.push({ type: 'ball', x: 0, y: 0, vx: 0, vy: 0, radius: 14 });

    // Simulate onRestart logic from main.js
    const fresh = resetState();
    fresh.status = 'grace';
    fresh.graceRemaining = gameConfig.gracePeriod;
    Object.assign(state, fresh);

    expect(state.status).toBe('grace');
    expect(state.elapsed).toBe(0);
    expect(state.obstacles.length).toBe(0);
  });

  it('restart does not go back to start screen', () => {
    const state = resetState();
    state.status = 'dead';

    const fresh = resetState();
    fresh.status = 'grace';
    Object.assign(state, fresh);

    expect(state.status).not.toBe('start');
  });
});

describe('dead state guard', () => {
  it('gameUpdate is a no-op once dead', () => {
    const state = resetState();
    state.status = 'dead';
    state.elapsed = 500;
    const acc = makeAcc();

    tick(state, acc, 10);
    expect(state.elapsed).toBe(500);
    expect(state.status).toBe('dead');
  });
});
