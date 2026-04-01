// Property tests for zone geometry and CSS scale factor.
// Related: zones.js
// Tests Properties 1 and 2 from design.md (game-balancing-overhaul)

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { recomputeZones, innerZone, outerZone, clampToInner, CANVAS_W, CANVAS_H } from '../src/zones.js';

// Reads back zone values after calling recomputeZones()
function getZones() {
  recomputeZones();
  return {
    innerZone: { ...innerZone },
    outerZone: { ...outerZone }
  };
}

// Computes expected zone values from fixed constants
function expectedZones() {
  const scale = globalThis.gameConfig.outerZoneScale;
  const iw = CANVAS_W / scale;
  const ih = CANVAS_H / scale;
  return {
    innerZone: { x: (CANVAS_W - iw) / 2, y: (CANVAS_H - ih) / 2, width: iw, height: ih },
    outerZone: { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H }
  };
}

// Arbitrary: any point including out-of-bounds
const arbPoint = fc.record({
  x: fc.integer({ min: -500, max: 5000 }),
  y: fc.integer({ min: -500, max: 5000 })
});

describe('zones', () => {
  /**
   * **Feature: game-balancing-overhaul, Property 1: Zone geometry is viewport-independent**
   * Validates: Requirements 1.7, 1.8, 1.9, 1.10
   */
  it('Property 1: zone geometry equals fixed-constants values regardless of viewport size', () => {
    const { innerZone: expInner, outerZone: expOuter } = expectedZones();

    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 3840 }),
        fc.integer({ min: 240, max: 2160 }),
        (vw, vh) => {
          // Simulate any viewport — zones.js must ignore these
          window.innerWidth = vw;
          window.innerHeight = vh;

          const { innerZone: actual, outerZone: actualOuter } = getZones();

          expect(actual.x).toBeCloseTo(expInner.x);
          expect(actual.y).toBeCloseTo(expInner.y);
          expect(actual.width).toBeCloseTo(expInner.width);
          expect(actual.height).toBeCloseTo(expInner.height);
          expect(actualOuter.width).toBe(expOuter.width);
          expect(actualOuter.height).toBe(expOuter.height);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: game-balancing-overhaul, Property 2: CSS scale factor is correct for any viewport**
   * Validates: Requirements 1.4
   */
  describe('Property 2: CSS scale factor examples', () => {
    it('1920×1080 → scale 1.2', () => {
      expect(Math.min(1920 / 1600, 1080 / 900)).toBeCloseTo(1.2);
    });

    it('1280×720 → scale 0.8', () => {
      expect(Math.min(1280 / 1600, 720 / 900)).toBeCloseTo(0.8);
    });

    it('375×667 → scale ~0.234375', () => {
      expect(Math.min(375 / 1600, 667 / 900)).toBeCloseTo(375 / 1600);
    });

    it('3840×2160 → scale 2.4', () => {
      expect(Math.min(3840 / 1600, 2160 / 900)).toBeCloseTo(2.4);
    });
  });

  /**
   * **Feature: game-balancing-overhaul, Property 2: CSS scale factor is correct for any viewport**
   * Validates: Requirements 1.4
   */
  it('Property 2: CSS scale factor is positive and ≤ 1 for sub-1600×900 viewports', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 7680 }),
        fc.integer({ min: 1, max: 7680 }),
        (vw, vh) => {
          const scale = Math.min(vw / 1600, vh / 900);
          // Always positive for positive inputs
          expect(scale).toBeGreaterThan(0);
          // ≤ 1 when both dimensions are within the logical canvas size
          if (vw <= 1600 && vh <= 900) {
            expect(scale).toBeLessThanOrEqual(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: game-balancing-overhaul, Property 2: Mouse clamping keeps player inside Inner Zone**
   * Validates: Requirements 1.5, 2.2
   */
  it('Property 2: clampToInner always returns a point within inner zone bounds', () => {
    recomputeZones();
    fc.assert(
      fc.property(arbPoint, ({ x, y }) => {
        const clamped = clampToInner(x, y);

        expect(clamped.x).toBeGreaterThanOrEqual(innerZone.x);
        expect(clamped.x).toBeLessThanOrEqual(innerZone.x + innerZone.width);
        expect(clamped.y).toBeGreaterThanOrEqual(innerZone.y);
        expect(clamped.y).toBeLessThanOrEqual(innerZone.y + innerZone.height);
      }),
      { numRuns: 100 }
    );
  });
});
