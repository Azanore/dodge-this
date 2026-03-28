# Implementation Plan: player-stats

## Overview

Implement a two-layer stats system: a `src/stats.js` module tracking four in-run counters, a per-run panel on the game over screen, and an all-time stats overlay for authenticated players. Hooks into existing `gameUpdate.js`, `bonuses.js`, and `main.js` with minimal changes.

## Tasks

- [x] 1. Create `src/stats.js` with counter state and exported interface
  - Define module-level `nearMisses`, `bonusesCollected`, `maxCombo`, `comboScore` variables
  - Implement `resetRunStats()`, `onNearMiss()`, `onBonusCollected()`, `onComboUpdate(multiplier)`, `onComboBank(amount)`
  - Implement `insertRun(state)`: call `supabase.auth.getUser()`, skip if no user, insert run record, swallow errors
  - Implement `fetchAllTimeStats()`: select all runs (RLS filters by user), compute aggregates client-side, throw on fetch error
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 6.1–6.8_

  - [x] 1.1 Write property tests for counter functions (Properties 1–5)
    - **Property 1: nearMisses increments by exactly 1** — `fc.integer({ min: 0, max: 50 })` call count, verify final value
    - **Property 2: bonusesCollected increments by exactly 1** — same pattern
    - **Property 3: maxCombo tracks the running maximum** — `fc.array(fc.float({ min: 1.0, max: 5.0 }), { minLength: 1 })`, verify equals `Math.max(...arr)`
    - **Property 4: comboScore accumulates the sum** — `fc.array(fc.float({ min: 0, max: 1000 }), { minLength: 1 })`, verify equals sum
    - **Property 5: resetRunStats zeroes all counters** — arbitrary call sequence then reset, verify all at initial values
    - _Requirements: 1.1–1.6_

  - [x] 1.2 Write unit tests for `insertRun` and `fetchAllTimeStats`
    - Mock `supabase` — authenticated user triggers insert with correct payload shape
    - Mock `supabase` — guest (null user) skips insert
    - Mock `supabase` — insert rejects, verify no throw
    - Mock `supabase` — `fetchAllTimeStats` with rows, verify aggregate computation
    - Mock `supabase` — `fetchAllTimeStats` fetch throws, verify error propagates
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [-] 2. Wire `stats.js` hooks into `gameUpdate.js` and `bonuses.js`
  - In `gameUpdate.js`: import `onNearMiss`, `onComboUpdate`, `onComboBank` from `stats.js`
  - Pass `onNearMiss` alongside `triggerNearMiss` in the `checkNearMisses` call (wrap both in a single callback)
  - Call `onComboUpdate(state.comboMultiplier)` each frame when `comboMultiplier > 1.0` (at the same site as the existing check)
  - Call `onComboBank(banked)` at the same site as `triggerScoreFloat` in the bank block
  - In `bonuses.js`: import `onBonusCollected` from `stats.js`; call it inside `collectBonus()`
  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [~] 3. Add per-run stats panel HTML/CSS to `index.html` and wire toggle in `main.js`
  - Append toggle button `#run-stats-toggle` and collapsible `#run-stats-panel` inside `#game-over-screen .overlay-panel`
  - Panel displays: score, time survived, difficulty, near-misses, bonuses collected, max combo, combo score
  - Panel collapsed (`display:none`) by default; toggle button shows `▶ Run Stats` / `▼ Run Stats`
  - Style follows existing overlay pattern: monospace, neon colors, dark background
  - In `main.js`: populate panel values inside `showGameOver` timeout (after `insertRun`); wire toggle click handler
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [~] 3.1 Write unit tests for per-run panel toggle behavior (Property 7)
    - **Property 7: Per-run panel toggle is a round-trip** — arbitrary initial state, toggle twice, verify same state
    - Panel collapsed by default when game-over screen opens
    - Toggle expands panel; second toggle collapses it
    - _Requirements: 3.2, 3.3, 3.4_

- [~] 4. Checkpoint — ensure all tests pass
  - Run `npm test` and confirm no regressions; ask the user if questions arise.

- [~] 5. Add all-time stats overlay HTML/CSS to `index.html` and Stats button to difficulty screen
  - Add `#stats-screen` overlay (`.overlay` pattern) with `#stats-panel` content box
  - Overlay displays all aggregate fields from `fetchAllTimeStats()` return shape
  - Add `#stats-btn` button inside `#difficulty-screen .overlay-panel`, hidden by default (`display:none`)
  - Style follows existing overlay pattern
  - _Requirements: 4.1, 4.8, 5.1_

- [~] 6. Wire all-time overlay open/close and Stats button auth visibility in `main.js`
  - Import `fetchAllTimeStats` and `supabase` in `main.js`
  - Wire `supabase.auth.onAuthStateChange`: show/hide `#stats-btn` based on session presence
  - Wire `#stats-btn` click: open `#stats-screen`, call `fetchAllTimeStats()`, populate fields; show "no stats" if empty; show error message if fetch throws
  - Wire Escape key to close `#stats-screen` (hook into existing Escape handler)
  - Wire backdrop click on `#stats-screen` to close it
  - Call `resetRunStats()` in `onRestart()`
  - Call `insertRun(state)` inside the death timeout in `main.js` (fire-and-forget)
  - _Requirements: 2.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3_

  - [~] 6.1 Write unit tests for all-time overlay and Stats button (Property 6)
    - **Property 6: Stats button visibility matches auth state** — `fc.boolean()` for isAuthenticated, verify `display` matches
    - All-time overlay opens on Stats button click
    - Overlay closes on Escape; closes on backdrop click
    - Shows "no stats" message when rows empty
    - Shows error message when fetch fails
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3_

- [~] 7. Final checkpoint — ensure all tests pass
  - Run `npm test` and confirm no regressions; ask the user if questions arise.
