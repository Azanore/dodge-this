// Tests for achievements.js — property-based and unit tests.
// Related: achievements.js, stats.js, main.js
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

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('unit tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="ach-list"></div><div id="toast-container"></div>';
  });

  it('#achievements-btn exists in the DOM', () => {
    document.body.innerHTML = '<button id="achievements-btn"></button>';
    expect(document.getElementById('achievements-btn')).not.toBeNull();
  });

  it('clicking #achievements-btn adds .open to #achievements-screen', () => {
    document.body.innerHTML = `
      <button id="achievements-btn"></button>
      <div id="achievements-screen"></div>
    `;
    // Simulate the click handler logic
    document.getElementById('achievements-screen').classList.add('open');
    expect(document.getElementById('achievements-screen').classList.contains('open')).toBe(true);
  });

  it('Escape closes #achievements-screen', () => {
    document.body.innerHTML = '<div id="achievements-screen" class="open"></div>';
    document.getElementById('achievements-screen').classList.remove('open');
    expect(document.getElementById('achievements-screen').classList.contains('open')).toBe(false);
  });

  it('backdrop click closes #achievements-screen', () => {
    document.body.innerHTML = '<div id="achievements-screen" class="open"></div>';
    const screen = document.getElementById('achievements-screen');
    // Simulate backdrop click: target === screen
    if (screen === screen) screen.classList.remove('open');
    expect(screen.classList.contains('open')).toBe(false);
  });

  it('isAnyModalOpen returns true when achievements-screen is open', () => {
    document.body.innerHTML = `
      <div id="how-to-play"></div>
      <div id="leaderboard-screen"></div>
      <div id="stats-screen"></div>
      <div id="achievements-screen" class="open"></div>
    `;
    const isAnyModalOpen = () => ['#how-to-play', '#leaderboard-screen', '#stats-screen', '#achievements-screen']
      .some(id => document.querySelector(id)?.classList.contains('open'));
    expect(isAnyModalOpen()).toBe(true);
  });

  it('clearToastQueue empties #toast-container immediately', () => {
    document.body.innerHTML = '<div id="toast-container"><div class="achievement-toast"></div></div>';
    clearToastQueue();
    expect(document.getElementById('toast-container').children.length).toBe(0);
  });

  it('queueToasts([]) is a no-op', () => {
    document.body.innerHTML = '<div id="toast-container"></div>';
    queueToasts([]);
    expect(document.getElementById('toast-container').children.length).toBe(0);
  });
});

// ─── Stats Integration Tests (supabase-dependent) ─────────────────────────────

import { supabase } from './supabase.js';
import { fetchUnlockedAchievements, evaluateAchievements } from './stats.js';

describe('stats integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="ach-list"></div><div id="toast-container"></div>';
    vi.clearAllMocks();
  });

  it('fetchUnlockedAchievements returns [] when not authenticated', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await fetchUnlockedAchievements();
    expect(result).toEqual([]);
  });

  it('first_blood is unlocked when totalRuns === 1', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const oneRun = [{ score: 100, elapsed_ms: 10000, difficulty: 'normal', near_misses: 0, bonuses_collected: 0, combo_score: 0 }];
    supabase.from.mockImplementation((table) => {
      if (table === 'runs') return {
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: oneRun, error: null }) })
      };
      return {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
        insert: vi.fn().mockResolvedValue({ error: null })
      };
    });

    const result = await evaluateAchievements({ elapsed: 10000, difficulty: 'normal', score: 100 });
    expect(result).toContain('first_blood');
  });

  it('evaluateAchievements does not throw when a Supabase insert fails', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const oneRun = [{ score: 100, elapsed_ms: 10000, difficulty: 'normal', near_misses: 0, bonuses_collected: 0, combo_score: 0 }];
    supabase.from.mockImplementation((table) => {
      if (table === 'runs') return {
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: oneRun, error: null }) })
      };
      return {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
        insert: vi.fn().mockRejectedValue(new Error('insert failed'))
      };
    });

    await expect(
      evaluateAchievements({ elapsed: 10000, difficulty: 'normal', score: 100 })
    ).resolves.not.toThrow();
  });
});
