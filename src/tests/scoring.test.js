// Scoring logic tests: base tick, pending accumulation, banking, overcharge.
// Related: gameUpdate.js, combo.js, game.config.js
// Covers the fixed double-count bug and all pending/overcharge edge cases.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { gameUpdate } from '../core/gameUpdate.js';

// --- Mocks ---
// gameUpdate imports several modules with side effects — mock them all
vi.mock('../entities/player.js', () => ({ update: vi.fn() }));
vi.mock('../entities/obstacles.js', () => ({
  spawnObstacle: vi.fn(),
  updateObstacles: vi.fn(),
  clearAll: vi.fn()
}));
vi.mock('../entities/bonuses.js', () => ({
  trySpawnBonus: vi.fn(),
  updateEffects: vi.fn(),
  collectBonus: vi.fn()
}));
vi.mock('../core/collision.js', () => ({
  checkPlayerObstacles: vi.fn(),
  checkPlayerBonusPickups: vi.fn(),
  checkNearMisses: vi.fn()
}));
vi.mock('../ui/renderer.js', () => ({
  triggerNearMiss: vi.fn(),
  triggerScoreFloat: vi.fn()
}));
vi.mock('../services/stats.js', () => ({
  onNearMiss: vi.fn(),
  onComboBank: vi.fn(),
  getRunStats: vi.fn(() => ({})),
  onAbilityUsed: vi.fn(),
  onKUEarned: vi.fn()
}));
vi.mock('../ui/achievements.js', () => ({ checkMidRunAchievements: vi.fn(() => []) }));
vi.mock('../core/difficulty.js', () => ({
  getCurrentSpeedMultiplier: vi.fn(() => 1),
  getCurrentSpawnInterval: vi.fn(() => 99999) // never spawn in tests
}));
vi.mock('../systems/combo.js', () => ({ updateScoreZone: vi.fn() }));
vi.mock('../ui/hud.js', () => ({ triggerScoreBump: vi.fn() }));
vi.mock('../services/audio.js', () => ({
  playDeath: vi.fn(),
  playMultiplierMax: vi.fn(),
  playPickup: vi.fn()
}));
vi.mock('../entities/zones.js', () => ({
  innerZone: { x: 0, y: 0, width: 1600, height: 900 }
}));

import { triggerScoreFloat } from '../ui/renderer.js';
import { onComboBank } from '../services/stats.js';
import { triggerScoreBump } from '../ui/hud.js';

// --- Helpers ---

const DELTA = 1000; // 1 second — makes baseTick exactly 10
const BASE_TICK = (DELTA / 1000) * 10; // = 10

function makeState(overrides = {}) {
  return {
    status: 'active',
    elapsed: 0,
    obstacles: [],
    bonuses: [],
    activeEffects: {},
    slowmoMultiplier: 1,
    slowmoFadeRemaining: 0,
    player: { x: 800, y: 450, radius: 10 },
    score: 0,
    pendingScore: 0,
    comboMultiplier: 1.0,
    battery: 0,
    lastAbilityUsedAt: 0,
    abilityActive: null,
    chronoFadeRemaining: 0,
    phasedRemaining: 0,
    scoreZone: { active: false },
    deathCause: null,
    _unlockedAchievements: new Set(),
    ...overrides
  };
}

function makeAccumulators() {
  return { spawn: 0, bonus: 0, scoreZone: 0 };
}

let origConfig;

beforeEach(() => {
  origConfig = globalThis.gameConfig;
  globalThis.gameConfig = {
    ...origConfig,
    battery: {
      max: 100,
      chargeRates: { passivePerSec: 0 }, // no passive charge — keeps battery predictable
      overchargeMultiplierBonus: 1.0,
      abilities: {
        cloak: { cost: 40, params: { duration: 2000 } },
        pulse: { cost: 60, params: { pushForce: 1.2, duration: 1000, phasedDuration: 500 } },
        chrono: { cost: 90, params: { timeScale: 0.1, duration: 3000 } }
      }
    },
    comboMultiplierMax: 5.0,
    gracePeriod: 500,
    scoreZoneInterval: 99999,
    scoreZoneDuration: 5000,
    scoreZoneRadius: 90,
    scoreZoneWanderSpeed: 40,
    comboBuildRate: 1.5,
    comboDecayRate: 0.8,
    comboFastDecayRate: 1.6
  };
  vi.clearAllMocks();
});

afterEach(() => {
  globalThis.gameConfig = origConfig;
});

// --- Tests ---

describe('base score tick', () => {
  it('always adds baseTick to score each frame regardless of multiplier', () => {
    const state = makeState({ comboMultiplier: 3.0 });
    gameUpdate(DELTA, state, makeAccumulators());
    // score should be exactly BASE_TICK (10), not 30
    expect(state.score).toBeCloseTo(BASE_TICK, 5);
  });

  it('adds baseTick with no combo and no overcharge', () => {
    const state = makeState();
    gameUpdate(DELTA, state, makeAccumulators());
    expect(state.score).toBeCloseTo(BASE_TICK, 5);
  });

  it('adds baseTick even when overcharged', () => {
    const state = makeState({ battery: 100 });
    gameUpdate(DELTA, state, makeAccumulators());
    // score = baseTick only, overcharge goes to pending
    expect(state.score).toBeCloseTo(BASE_TICK, 5);
  });
});

describe('pending score accumulation', () => {
  it('accumulates bonus delta as pending when comboMultiplier > 1', () => {
    const state = makeState({ comboMultiplier: 2.0 });
    gameUpdate(DELTA, state, makeAccumulators());
    // bonusMultiplier = 2.0, pending = baseTick * (2.0 - 1) = 10
    expect(state.pendingScore).toBeCloseTo(BASE_TICK * 1.0, 5);
  });

  it('accumulates overcharge bonus as pending when battery = 100 and combo = 1', () => {
    const state = makeState({ battery: 100 });
    gameUpdate(DELTA, state, makeAccumulators());
    // bonusMultiplier = 1.0 + 1.0 = 2.0, pending = baseTick * 1.0 = 10
    expect(state.pendingScore).toBeCloseTo(BASE_TICK * 1.0, 5);
  });

  it('accumulates combined combo + overcharge bonus as pending', () => {
    const state = makeState({ comboMultiplier: 3.0, battery: 100 });
    gameUpdate(DELTA, state, makeAccumulators());
    // bonusMultiplier = 3.0 + 1.0 = 4.0, pending = baseTick * 3.0 = 30
    expect(state.pendingScore).toBeCloseTo(BASE_TICK * 3.0, 5);
  });

  it('does not accumulate pending when combo = 1 and no overcharge', () => {
    const state = makeState({ comboMultiplier: 1.0, battery: 0 });
    gameUpdate(DELTA, state, makeAccumulators());
    expect(state.pendingScore).toBe(0);
  });

  it('pending grows across multiple frames without banking prematurely', () => {
    const state = makeState({ comboMultiplier: 2.0 });
    gameUpdate(DELTA, state, makeAccumulators());
    gameUpdate(DELTA, state, makeAccumulators());
    gameUpdate(DELTA, state, makeAccumulators());
    // 3 frames of pending = 3 * baseTick * 1.0 = 30
    expect(state.pendingScore).toBeCloseTo(BASE_TICK * 3.0, 5);
    // score should only have 3 * baseTick = 30 (no double-count)
    expect(state.score).toBeCloseTo(BASE_TICK * 3.0, 5);
  });
});

describe('banking — no double-count', () => {
  it('banks pending into score exactly once when bonusMultiplier drops to 1', () => {
    // Accumulate pending with combo
    const state = makeState({ comboMultiplier: 2.0 });
    gameUpdate(DELTA, state, makeAccumulators());
    const pendingAfterFrame1 = state.pendingScore; // = 10
    const scoreAfterFrame1 = state.score;           // = 10

    // Drop multiplier to 1.0 — triggers bank
    state.comboMultiplier = 1.0;
    gameUpdate(DELTA, state, makeAccumulators());

    // Score = scoreAfterFrame1 + baseTick (frame2) + pendingAfterFrame1 (banked)
    const expected = scoreAfterFrame1 + BASE_TICK + pendingAfterFrame1;
    expect(state.score).toBeCloseTo(expected, 5);
    expect(state.pendingScore).toBe(0);
  });

  it('score never receives the bonus portion twice', () => {
    const state = makeState({ comboMultiplier: 3.0 });
    gameUpdate(DELTA, state, makeAccumulators()); // pending = 20, score = 10
    gameUpdate(DELTA, state, makeAccumulators()); // pending = 40, score = 20

    const scoreBeforeBank = state.score;
    const pendingBeforeBank = state.pendingScore;

    state.comboMultiplier = 1.0;
    gameUpdate(DELTA, state, makeAccumulators()); // banks pending

    // Total score = scoreBeforeBank + baseTick + pendingBeforeBank
    // NOT scoreBeforeBank + baseTick * 3 + pendingBeforeBank
    expect(state.score).toBeCloseTo(scoreBeforeBank + BASE_TICK + pendingBeforeBank, 5);
  });

  it('fires triggerScoreFloat, onComboBank, triggerScoreBump exactly once on bank', () => {
    const state = makeState({ comboMultiplier: 2.0, pendingScore: 50 });
    state.comboMultiplier = 1.0;
    gameUpdate(DELTA, state, makeAccumulators());

    expect(triggerScoreFloat).toHaveBeenCalledTimes(1);
    expect(onComboBank).toHaveBeenCalledTimes(1);
    expect(triggerScoreBump).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire bank callbacks when pending is 0 at x1', () => {
    const state = makeState({ comboMultiplier: 1.0, pendingScore: 0 });
    gameUpdate(DELTA, state, makeAccumulators());

    expect(triggerScoreFloat).not.toHaveBeenCalled();
    expect(onComboBank).not.toHaveBeenCalled();
    expect(triggerScoreBump).not.toHaveBeenCalled();
  });
});

describe('overcharge edge cases', () => {
  it('overcharge alone does not add directly to score', () => {
    const state = makeState({ battery: 100, comboMultiplier: 1.0 });
    gameUpdate(DELTA, state, makeAccumulators());
    // score must be exactly baseTick, not 2*baseTick
    expect(state.score).toBeCloseTo(BASE_TICK, 5);
  });

  it('overcharge pending banks when battery drops below max', () => {
    const state = makeState({ battery: 100, comboMultiplier: 1.0 });
    gameUpdate(DELTA, state, makeAccumulators()); // pending = 10, score = 10

    const pendingBeforeBank = state.pendingScore;
    const scoreBeforeBank = state.score;

    // Drop battery below max — overcharge bonus gone, bonusMultiplier = 1.0
    state.battery = 50;
    gameUpdate(DELTA, state, makeAccumulators());

    expect(state.score).toBeCloseTo(scoreBeforeBank + BASE_TICK + pendingBeforeBank, 5);
    expect(state.pendingScore).toBe(0);
  });

  it('overcharge pending does not bank while battery stays at max', () => {
    const state = makeState({ battery: 100, comboMultiplier: 1.0 });
    gameUpdate(DELTA, state, makeAccumulators());
    gameUpdate(DELTA, state, makeAccumulators());
    // Still at 100 (passive charge = 0 in test config), pending keeps growing
    expect(state.pendingScore).toBeCloseTo(BASE_TICK * 2.0, 5);
    expect(triggerScoreBump).not.toHaveBeenCalled();
  });

  it('overcharge + combo: pending = baseTick * (combo + overcharge - 1)', () => {
    const combo = 2.5;
    const state = makeState({ comboMultiplier: combo, battery: 100 });
    gameUpdate(DELTA, state, makeAccumulators());
    // bonusMultiplier = 2.5 + 1.0 = 3.5, pending = baseTick * 2.5
    expect(state.pendingScore).toBeCloseTo(BASE_TICK * (combo + 1.0 - 1.0), 5);
  });
});
