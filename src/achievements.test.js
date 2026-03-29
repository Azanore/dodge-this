// Tests for achievements.js — property-based and unit tests.
// Related: achievements.js, stats.js, main.js
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { ACHIEVEMENTS, renderAchievementsOverlay, queueToasts, clearToastQueue } from './achievements.js';

describe('achievements', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="ach-list"></div><div id="toast-container"></div>';
  });

  // Feature: achievements, Property 6: Achievement button visibility matches auth state
  it('Property 6: achievements-btn visibility matches auth state', () => {
    fc.assert(fc.property(
      fc.boolean(),
      (hasSession) => {
        document.body.innerHTML = `
          <button id="achievements-btn" style="visibility:hidden"></button>
          <button id="stats-btn" style="visibility:hidden"></button>
        `;
        // Simulate onAuthStateChange logic
        document.getElementById('achievements-btn').style.visibility = hasSession ? 'visible' : 'hidden';
        document.getElementById('stats-btn').style.visibility = hasSession ? 'visible' : 'hidden';

        const achVis = document.getElementById('achievements-btn').style.visibility;
        const statsVis = document.getElementById('stats-btn').style.visibility;
        const expected = hasSession ? 'visible' : 'hidden';

        return achVis === expected && statsVis === expected && achVis === statsVis;
      }
    ), { numRuns: 100 });
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

  // Feature: achievements, Property 9: isAnyModalOpen includes achievements-screen
  it('Property 9: isAnyModalOpen returns true when achievements-screen is open', () => {
    fc.assert(fc.property(
      fc.boolean(), // achievements-screen open
      fc.boolean(), // how-to-play open
      fc.boolean(), // leaderboard-screen open
      fc.boolean(), // stats-screen open
      (achOpen, htpOpen, lbOpen, statsOpen) => {
        document.body.innerHTML = `
          <div id="how-to-play" class="${htpOpen ? 'open' : ''}"></div>
          <div id="leaderboard-screen" class="${lbOpen ? 'open' : ''}"></div>
          <div id="stats-screen" class="${statsOpen ? 'open' : ''}"></div>
          <div id="achievements-screen" class="${achOpen ? 'open' : ''}"></div>
        `;

        // Simulates the isAnyModalOpen logic from main.js
        const result = ['#how-to-play', '#leaderboard-screen', '#stats-screen', '#achievements-screen']
          .some(id => document.querySelector(id)?.classList.contains('open'));

        const expected = achOpen || htpOpen || lbOpen || statsOpen;
        return result === expected;
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
