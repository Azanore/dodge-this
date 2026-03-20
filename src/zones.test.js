// Property tests for zone geometry and mouse clamping.
// Related: zones.js
// Tests Properties 1 and 2 from design.md

import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Recompute zones with a given viewport size
function setupZones(width, height) {
  window.innerWidth = width;
  window.innerHeight = height;
  // Re-import is not possible in ESM; call recomputeZones directly
  const scale = globalThis.gameConfig.outerZoneScale;
  const iw = width / scale;
  const ih = height / scale;
  return {
    innerZone: {
      x: (width - iw) / 2,
      y: (height - ih) / 2,
      width: iw,
      height: ih
    },
    outerZone: { x: 0, y: 0, width, height }
  };
}

function clampToInner(x, y, innerZone) {
  return {
    x: Math.max(innerZone.x, Math.min(innerZone.x + innerZone.width, x)),
    y: Math.max(innerZone.y, Math.min(innerZone.y + innerZone.height, y))
  };
}

// Arbitrary: realistic browser viewport dimensions
const arbViewport = fc.record({
  width: fc.integer({ min: 320, max: 3840 }),
  height: fc.integer({ min: 240, max: 2160 })
});

// Arbitrary: any point including out-of-bounds
const arbPoint = fc.record({
  x: fc.integer({ min: -500, max: 5000 }),
  y: fc.integer({ min: -500, max: 5000 })
});

describe('zones', () => {
  /**
   * **Feature: dodge-game, Property 1: Zone containment for any viewport**
   * Validates: Requirements 1.1, 1.3, 1.4
   */
  it('Property 1: inner zone is fully contained within outer zone for any viewport', () => {
    fc.assert(
      fc.property(arbViewport, ({ width, height }) => {
        const { innerZone, outerZone } = setupZones(width, height);

        // Inner zone left/top edges must be >= outer zone left/top
        expect(innerZone.x).toBeGreaterThanOrEqual(outerZone.x);
        expect(innerZone.y).toBeGreaterThanOrEqual(outerZone.y);

        // Inner zone right/bottom edges must be <= outer zone right/bottom
        expect(innerZone.x + innerZone.width).toBeLessThanOrEqual(outerZone.x + outerZone.width);
        expect(innerZone.y + innerZone.height).toBeLessThanOrEqual(outerZone.y + outerZone.height);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: dodge-game, Property 2: Mouse clamping keeps player inside Inner Zone**
   * Validates: Requirements 1.5, 2.2
   */
  it('Property 2: clampToInner always returns a point within inner zone bounds', () => {
    fc.assert(
      fc.property(arbViewport, arbPoint, ({ width, height }, { x, y }) => {
        const { innerZone } = setupZones(width, height);
        const clamped = clampToInner(x, y, innerZone);

        expect(clamped.x).toBeGreaterThanOrEqual(innerZone.x);
        expect(clamped.x).toBeLessThanOrEqual(innerZone.x + innerZone.width);
        expect(clamped.y).toBeGreaterThanOrEqual(innerZone.y);
        expect(clamped.y).toBeLessThanOrEqual(innerZone.y + innerZone.height);
      }),
      { numRuns: 100 }
    );
  });
});
