// Tests for stats.js: property-based counter invariants and unit tests for insertRun/fetchAllTimeStats.
// Related: stats.js, supabase.js
// Properties 1–5 validate in-run counter behavior; unit tests cover Supabase integration.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';

vi.mock('./supabase.js', () => {
  const supabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn()
  };
  return { supabase };
});

import { supabase } from './supabase.js';
import {
  resetRunStats,
  onNearMiss,
  onBonusCollected,
  onComboUpdate,
  onComboBank,
  insertRun,
  fetchAllTimeStats
} from './stats.js';

// Expose internal counter values for testing via re-import trick — we read them
// indirectly by calling the functions and checking side effects through insertRun payload.
// For property tests we use a helper that reads state via a mock insert capture.

// Helper: capture the payload passed to supabase insert
function captureInsertPayload() {
  const insertMock = vi.fn().mockResolvedValue({ error: null });
  supabase.from.mockReturnValue({ insert: insertMock });
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  return insertMock;
}

// Helper: read current counter values by triggering insertRun with a dummy state
async function readCounters() {
  const insertMock = captureInsertPayload();
  await insertRun({ score: 0, elapsed: 0, difficulty: 'normal' });
  const payload = insertMock.mock.calls[0][0];
  return {
    nearMisses: payload.near_misses,
    bonusesCollected: payload.bonuses_collected,
    maxCombo: payload.max_combo,
    comboScore: payload.combo_score
  };
}

beforeEach(() => {
  resetRunStats();
  vi.clearAllMocks();
});

// ─── Property Tests ───────────────────────────────────────────────────────────

describe('property tests', () => {
  /**
   * **Feature: player-stats, Property 1: nearMisses increments by exactly 1**
   * Validates: Requirements 1.2
   */
  it('Property 1: nearMisses increments by exactly 1', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 50 }),
        async (count) => {
          resetRunStats();
          for (let i = 0; i < count; i++) onNearMiss();
          const { nearMisses } = await readCounters();
          expect(nearMisses).toBe(count);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: player-stats, Property 2: bonusesCollected increments by exactly 1**
   * Validates: Requirements 1.3
   */
  it('Property 2: bonusesCollected increments by exactly 1', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 50 }),
        async (count) => {
          resetRunStats();
          for (let i = 0; i < count; i++) onBonusCollected();
          const { bonusesCollected } = await readCounters();
          expect(bonusesCollected).toBe(count);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: player-stats, Property 3: maxCombo tracks the running maximum**
   * Validates: Requirements 1.4
   */
  it('Property 3: maxCombo tracks the running maximum', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.float({ min: 1.0, max: 5.0, noNaN: true }), { minLength: 1 }),
        async (multipliers) => {
          resetRunStats();
          for (const m of multipliers) onComboUpdate(m);
          const { maxCombo } = await readCounters();
          expect(maxCombo).toBeCloseTo(Math.max(...multipliers), 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: player-stats, Property 4: comboScore accumulates the sum**
   * Validates: Requirements 1.5
   */
  it('Property 4: comboScore accumulates the sum', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.float({ min: 0, max: 1000, noNaN: true }), { minLength: 1 }),
        async (amounts) => {
          resetRunStats();
          for (const a of amounts) onComboBank(a);
          const { comboScore } = await readCounters();
          const expected = Math.round(amounts.reduce((s, a) => s + a, 0));
          expect(comboScore).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: player-stats, Property 5: resetRunStats zeroes all counters**
   * Validates: Requirements 1.6
   */
  it('Property 5: resetRunStats zeroes all counters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        fc.array(fc.float({ min: 1.0, max: 5.0, noNaN: true }), { minLength: 1 }),
        fc.array(fc.float({ min: 0, max: 1000, noNaN: true }), { minLength: 1 }),
        async (misses, bonuses, multipliers, amounts) => {
          resetRunStats();
          for (let i = 0; i < misses; i++) onNearMiss();
          for (let i = 0; i < bonuses; i++) onBonusCollected();
          for (const m of multipliers) onComboUpdate(m);
          for (const a of amounts) onComboBank(a);

          resetRunStats();
          const counters = await readCounters();

          expect(counters.nearMisses).toBe(0);
          expect(counters.bonusesCollected).toBe(0);
          expect(counters.maxCombo).toBe(1.0);
          expect(counters.comboScore).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('insertRun', () => {
  it('authenticated user triggers insert with correct payload shape', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    supabase.from.mockReturnValue({ insert: insertMock });

    onNearMiss();
    onBonusCollected();
    onComboUpdate(3.5);
    onComboBank(200);

    const state = { score: 1234.7, elapsed: 45678.9, difficulty: 'hard' };
    await insertRun(state);

    expect(supabase.from).toHaveBeenCalledWith('runs');
    const payload = insertMock.mock.calls[0][0];
    expect(payload.score).toBe(1235);
    expect(payload.elapsed_ms).toBe(45679);
    expect(payload.difficulty).toBe('hard');
    expect(payload.near_misses).toBe(1);
    expect(payload.bonuses_collected).toBe(1);
    expect(payload.max_combo).toBe(3.5);
    expect(payload.combo_score).toBe(200);
    expect(typeof payload.played_at).toBe('string');
  });

  it('guest (null user) skips insert', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await insertRun({ score: 100, elapsed: 1000, difficulty: 'normal' });

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('insert rejects — no throw', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    supabase.from.mockReturnValue({ insert: vi.fn().mockRejectedValue(new Error('network')) });

    await expect(insertRun({ score: 0, elapsed: 0, difficulty: 'normal' })).resolves.toBeUndefined();
  });
});

describe('fetchAllTimeStats', () => {
  it('computes aggregates correctly from rows', async () => {
    const rows = [
      { score: 500, elapsed_ms: 10000, difficulty: 'easy', near_misses: 2, bonuses_collected: 3, max_combo: 2.5, combo_score: 100 },
      { score: 800, elapsed_ms: 20000, difficulty: 'normal', near_misses: 1, bonuses_collected: 1, max_combo: 4.0, combo_score: 300 },
      { score: 1200, elapsed_ms: 30000, difficulty: 'hard', near_misses: 5, bonuses_collected: 0, max_combo: 5.0, combo_score: 500 }
    ];
    supabase.from.mockReturnValue({ select: vi.fn().mockResolvedValue({ data: rows, error: null }) });

    const stats = await fetchAllTimeStats();

    expect(stats.totalRuns).toBe(3);
    expect(stats.bestScoreEasy).toBe(500);
    expect(stats.bestScoreNormal).toBe(800);
    expect(stats.bestScoreHard).toBe(1200);
    expect(stats.totalNearMisses).toBe(8);
    expect(stats.totalBonuses).toBe(4);
    expect(stats.highestCombo).toBe(5.0);
    expect(stats.bestComboScore).toBe(500);
    expect(stats.totalElapsedMs).toBe(60000);
    expect(stats.avgScore).toBeCloseTo(833.33, 1);
    expect(stats.avgElapsedMs).toBe(20000);
  });

  it('fetch throws — error propagates', async () => {
    const err = new Error('fetch failed');
    supabase.from.mockReturnValue({ select: vi.fn().mockResolvedValue({ data: null, error: err }) });

    await expect(fetchAllTimeStats()).rejects.toThrow('fetch failed');
  });
});
