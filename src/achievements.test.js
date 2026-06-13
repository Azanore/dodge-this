// Tests for achievements.js — property-based and unit tests.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { ACHIEVEMENTS, renderAchievementsOverlay, queueToasts, clearToastQueue } from './achievements.js';

vi.mock('./supabase.js', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn()
  }
}));

describe('achievements', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="ach-list"></div><div id="toast-container"></div>';
  });

  it('Property 7: renderAchievementsOverlay always renders all achievements', () => {
    const allKeys = ACHIEVEMENTS.map(a => a.key);
    fc.assert(fc.property(
      fc.subarray(allKeys),
      (unlockedKeys) => {
        renderAchievementsOverlay(new Set(unlockedKeys));
        const items = document.querySelectorAll('#ach-list .ach-card');
        return items.length === ACHIEVEMENTS.length;
      }
    ), { numRuns: 100 });
  });

  it('Property 8: render status matches unlock state', () => {
    const allKeys = ACHIEVEMENTS.map(a => a.key);
    fc.assert(fc.property(
      fc.subarray(allKeys),
      (unlockedKeys) => {
        const unlockedSet = new Set(unlockedKeys);
        renderAchievementsOverlay(unlockedSet);
        const cards = [...document.querySelectorAll('#ach-list .ach-card')];
        return cards.every((card, i) => {
          const expected = unlockedSet.has(ACHIEVEMENTS[i].key) ? 'unlocked' : 'locked';
          return card.classList.contains(expected);
        });
      }
    ), { numRuns: 100 });
  });
});
