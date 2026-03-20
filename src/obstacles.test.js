// Property tests for obstacle spawning, movement, and removal.
// Related: obstacles.js, zones.js
// Tests Properties 3, 4, 5, 13 from design.md

import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { spawnObstacle, updateObstacles, clearAll } from './obstacles.js';
import { innerZone, outerZone, recomputeZones } from './zones.js';

function makeState() {
  return {
    status: 'active',
    obstacles: [],
    bonuses: [],
    activeEffects: {},
    slowmoMultiplier: 1,
    player: { x: 0, y: 0, radius: 14 }
  };
}

beforeEach(() => {
  // Use a fixed 1280x720 viewport for all obstacle tests
  window.innerWidth = 1280;
  window.innerHeight = 720;
  recomputeZones();
});

describe('obstacles', () => {
  /**
   * **Feature: dodge-game, Property 3: Obstacle spawn position is in Outer Zone but not Inner Zone**
   * Validates: Requirements 3.1
   */
  it('Property 3: spawned obstacle is inside outer zone and outside inner zone', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), count => {
        const state = makeState();
        for (let i = 0; i < count; i++) spawnObstacle(state, 1);

        for (const obs of state.obstacles) {
          // Must be inside outer zone
          expect(obs.x).toBeGreaterThanOrEqual(outerZone.x);
          expect(obs.x).toBeLessThanOrEqual(outerZone.x + outerZone.width);
          expect(obs.y).toBeGreaterThanOrEqual(outerZone.y);
          expect(obs.y).toBeLessThanOrEqual(outerZone.y + outerZone.height);

          // Must be outside inner zone (at least one axis out of bounds)
          const inInnerX = obs.x >= innerZone.x && obs.x <= innerZone.x + innerZone.width;
          const inInnerY = obs.y >= innerZone.y && obs.y <= innerZone.y + innerZone.height;
          expect(inInnerX && inInnerY).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: dodge-game, Property 4: Obstacle velocity points toward Inner Zone**
   * Validates: Requirements 3.2
   */
  it('Property 4: spawned obstacle velocity has positive dot product toward nearest inner zone point', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const state = makeState();
        spawnObstacle(state, 1);
        if (state.obstacles.length === 0) return; // cap hit

        const obs = state.obstacles[0];

        // Nearest point on inner zone boundary to the spawn position
        const nearestX = Math.max(innerZone.x, Math.min(innerZone.x + innerZone.width, obs.x));
        const nearestY = Math.max(innerZone.y, Math.min(innerZone.y + innerZone.height, obs.y));

        // Vector from spawn to nearest inner zone point
        const towardX = nearestX - obs.x;
        const towardY = nearestY - obs.y;

        // Dot product of velocity with toward-inner-zone vector must be positive
        const dot = obs.vx * towardX + obs.vy * towardY;
        expect(dot).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: dodge-game, Property 5: Out-of-bounds obstacles are removed**
   * Validates: Requirements 3.5
   */
  it('Property 5: obstacles outside outer zone are removed after updateObstacles', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            x: fc.oneof(
              fc.float({ min: -2000, max: -100, noNaN: true }),
              fc.float({ min: outerZone.x + outerZone.width + 100, max: 5000, noNaN: true })
            ),
            y: fc.float({ min: 0, max: 720, noNaN: true }),
            vx: fc.float({ min: -1, max: 1, noNaN: true }),
            vy: fc.float({ min: -1, max: 1, noNaN: true }),
            radius: fc.float({ min: 1, max: 20, noNaN: true }),
            type: fc.constant('ball')
          }),
          { minLength: 1, maxLength: 10 }
        ),
        obstacles => {
          const state = makeState();
          state.obstacles = obstacles.map(o => ({ ...o }));
          updateObstacles(0, state); // delta=0 so positions don't change

          for (const obs of state.obstacles) {
            const inOuter =
              obs.x + obs.radius > outerZone.x &&
              obs.x - obs.radius < outerZone.x + outerZone.width &&
              obs.y + obs.radius > outerZone.y &&
              obs.y - obs.radius < outerZone.y + outerZone.height;
            expect(inOuter).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: dodge-game, Property 13: Obstacle count never exceeds configured maximum**
   * Validates: Requirements 5.3
   */
  it('Property 13: obstacle count never exceeds maxObstaclesOnScreen after any number of spawns', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), spawnCount => {
        const state = makeState();
        for (let i = 0; i < spawnCount; i++) spawnObstacle(state, 1);
        expect(state.obstacles.length).toBeLessThanOrEqual(
          gameConfig.difficulty.maxObstaclesOnScreen
        );
      }),
      { numRuns: 100 }
    );
  });
});
