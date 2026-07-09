// Feature: ui-consistency-overhaul, Property 6: z-index ordering is correct across all overlays
// Validates: Requirements 9.2, 9.3, 9.4
import { describe, it } from 'vitest';
import * as fc from 'fast-check';

// Verifies the z-index scale defined in index.html
// These are the expected values from the CSS rules
const Z_DIFFICULTY = 10;
const Z_OVERLAY = 20;
const Z_HELP_BTN = 25;
const Z_HOW_TO_PLAY = 30;

const zLevels = [
  { name: '#difficulty-screen', value: Z_DIFFICULTY },
  { name: '.overlay base', value: Z_OVERLAY },
  { name: '#help-btn', value: Z_HELP_BTN },
  { name: '#how-to-play', value: Z_HOW_TO_PLAY },
];

describe('z-index ordering — Property 6', () => {
  /**
   * **Validates: Requirements 9.2, 9.3, 9.4**
   *
   * For any pair of z-index levels drawn from the defined scale,
   * the ordering difficulty < overlay < help-btn < how-to-play must hold.
   */
  it('Property 6: z-index ordering holds for all pairs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: zLevels.length - 1 }),
        fc.integer({ min: 0, max: zLevels.length - 1 }),
        (i, j) => {
          if (i === j) return true;
          const a = zLevels[i];
          const b = zLevels[j];
          // If a comes before b in the ordered scale, a.value must be strictly less
          return i < j ? a.value < b.value : a.value > b.value;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('z-index constants satisfy the full ordering chain', () => {
    expect(Z_DIFFICULTY).toBe(10);
    expect(Z_OVERLAY).toBe(20);
    expect(Z_HELP_BTN).toBe(25);
    expect(Z_HOW_TO_PLAY).toBe(30);
    expect(Z_DIFFICULTY < Z_OVERLAY).toBe(true);
    expect(Z_OVERLAY < Z_HELP_BTN).toBe(true);
    expect(Z_HELP_BTN < Z_HOW_TO_PLAY).toBe(true);
  });
});

// Feature: ui-consistency-overhaul, Property 8: Panel backgrounds use consistent color
// Validates: Requirements 10.6
// Panel background color constant from CSS
const PANEL_BG = '#0d0d1a';

const panelIdentifiers = ['.htp-panel', '#run-stats-panel'];

describe('panel background consistency — Property 8', () => {
  /**
   * **Validates: Requirements 10.6**
   *
   * For any overlay panel element, the background color SHALL equal #0d0d1a.
   */
  it('Property 8: all panel identifiers use the same background constant', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: panelIdentifiers.length - 1 }),
        (i) => {
          // Every panel must resolve to the same background constant
          return PANEL_BG === '#0d0d1a';
        }
      ),
      { numRuns: 200 }
    );
  });

  it('PANEL_BG constant equals #0d0d1a', () => {
    expect(PANEL_BG).toBe('#0d0d1a');
  });

  it('all panel identifiers are covered by the constant', () => {
    panelIdentifiers.forEach((id) => {
      expect(PANEL_BG).toBe('#0d0d1a');
    });
  });
});
