// Tests for achievements.js — property-based and unit tests.
// Related: achievements.js, stats.js, main.js
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { ACHIEVEMENTS, renderAchievementsOverlay, queueToasts, clearToastQueue } from './achievements.js';

describe('achievements', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="ach-list"></div><div id="toast-container"></div>';
  });

  // Feature: achievements, Property 7: Overlay renders all 30 achievements
  it('Property 7: renderAchievementsOverlay always renders all 30 achievements', () => {
    const allKeys = ACHIEVEMENTS.map(a => a.key);
    fc.assert(fc.property(
      fc.subarray(allKeys),
      (unlockedKeys) => {
        renderAchievementsOverlay(new Set(unlockedKeys));
        const items = document.querySelectorAll('#ach-list .htp-row');
        return items.length === 30;
      }
    ), { numRuns: 100 });
  });

  // Feature: achievements, Property 8: Render opacity matches unlock state
  it('Property 8: render opacity matches unlock state', () => {
    const allKeys = ACHIEVEMENTS.map(a => a.key);
    fc.assert(fc.property(
      fc.subarray(allKeys),
      (unlockedKeys) => {
        const unlockedSet = new Set(unlockedKeys);
        renderAchievementsOverlay(unlockedSet);
        const rows = [...document.querySelectorAll('#ach-list .htp-row')];
        return rows.every((row, i) => {
          const expected = unlockedSet.has(ACHIEVEMENTS[i].key) ? '1' : '0.35';
          return row.style.opacity === expected;
        });
      }
    ), { numRuns: 100 });
  });

  // Feature: achievements, Property 11: Toast queue processes sequentially
  it('Property 11: toast queue processes sequentially — at most 1 toast at a time', () => {
    const allKeys = ACHIEVEMENTS.map(a => a.key);
    fc.assert(fc.property(
      fc.subarray(allKeys, { minLength: 1 }),
      (keys) => {
        clearToastQueue();
        queueToasts(keys);
        const count = document.getElementById('toast-container').children.length;
        clearToastQueue();
        return count <= 1;
      }
    ), { numRuns: 100 });
  });

  // Feature: achievements, Property 10: clearToastQueue removes all pending toasts
  it('Property 10: clearToastQueue removes all pending toasts', () => {
    const allKeys = ACHIEVEMENTS.map(a => a.key);
    fc.assert(fc.property(
      fc.subarray(allKeys, { minLength: 0 }),
      (keys) => {
        clearToastQueue(); // reset state first
        if (keys.length > 0) queueToasts(keys);
        clearToastQueue();
        const container = document.getElementById('toast-container');
        return container.children.length === 0;
      }
    ), { numRuns: 100 });
  });
});
