# Implementation Plan: Achievements

## Overview

Implement the achievements system across four files: `src/achievements.js` (new — static definitions + overlay rendering), `src/stats.js` (evaluation + fetch), `index.html` (overlay + button), and `src/main.js` (wiring). Tests go in `src/achievements.test.js`.

## Tasks

- [-] 1. Add achievement definitions, overlay renderer, and toast system (`src/achievements.js`)
  - Create `src/achievements.js` exporting `ACHIEVEMENTS` array (30 items) with the shape: `{ key, group, name, description, type, icon, color }`
  - Include all 23 milestone tiers (veteran ×6, survivor ×5, collector ×4, ghost ×4, hard_boiled ×4) and 7 single-run achievements
  - Export `renderAchievementsOverlay(unlockedSet)` — populates `#ach-list` with two sections ("Milestones" / "Single Run"), full opacity for unlocked keys, `opacity: 0.35` for locked
  - Export `queueToasts(keys)` — enqueues achievements for sequential display; each toast slides in from right (300ms), stays 2500ms, slides out (300ms), 100ms gap before next
  - Export `clearToastQueue()` — immediately empties queue and removes any visible toast from `#toast-container`; cancels all pending timers
  - _Requirements: 2.2, 2.3, 2.4, 8.4, 8.5, 8.7, 8.8, 8.9_

  - [x] 1.1 Write property test for overlay renders all 30 achievements
    - **Property 7: Overlay renders all 30 achievements**
    - **Validates: Requirements 2.2**

  - [x] 1.2 Write property test for render opacity matches unlock state
    - **Property 8: Render opacity matches unlock state**
    - **Validates: Requirements 2.3, 2.4**

  - [x] 1.3 Write property test for clearToastQueue removes all pending toasts
    - **Property 10: clearToastQueue removes all pending toasts**
    - **Validates: Requirements 8.7, 8.8**

  - [-] 1.4 Write property test for toast queue processes sequentially
    - **Property 11: Toast queue processes sequentially**
    - **Validates: Requirements 8.5**

- [~] 2. Add `#achievements-screen` overlay, `#achievements-btn`, and `#toast-container` to `index.html`
  - Add `#achievements-btn` button after `#stats-btn`, before `#auth-btn`, with `visibility:hidden` default — same `.overlay-btn overlay-secondary-btn` style
  - Add `#achievements-screen` overlay div (`.overlay`, `rgba(0,0,0,0.75)` backdrop) with `.htp-panel` child containing `<h2>ACHIEVEMENTS</h2>`, `#ach-list` div, and hint text
  - Add `#toast-container` fixed div — `bottom: 72px, right: 24px`, z-index 50, NOT an overlay, no backdrop — always in DOM, empty when idle
  - Add CSS for `#toast-container`, `.achievement-toast`, `.achievement-toast.visible`, `.toast-icon`, `.toast-title`, `.toast-desc` — slide-in/out via `transform: translateX` transition
  - _Requirements: 1.1, 2.1, 2.8, 8.2, 8.3, 8.6, 8.10_

- [~] 3. Add `evaluateAchievements` and `fetchUnlockedAchievements` to `src/stats.js`
  - Export `fetchUnlockedAchievements()` — queries `user_achievements` for authenticated user, returns `string[]` of keys; returns `[]` if not authenticated or on error
  - Export `evaluateAchievements(state)` — guards on `elapsed < 5000` and unauthenticated (return `[]`); calls `insertRun(state)`, then `fetchAllTimeStats()`, then `fetchUnlockedAchievements()`; builds `newKeys[]` from all 30 conditions; inserts each new key to `user_achievements` individually in try/catch; returns `newKeys`
  - Import `ACHIEVEMENTS` from `./achievements.js` to drive condition evaluation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1–4.5, 5.1–5.7, 6.1, 6.2, 6.4, 7.1, 7.2_

  - [~] 3.1 Write property test for short-run guard
    - **Property 1: Short-run guard**
    - **Validates: Requirements 6.1, 6.4**

  - [~] 3.2 Write property test for unauthenticated guard
    - **Property 2: Unauthenticated guard**
    - **Validates: Requirements 3.2**

  - [~] 3.3 Write property test for already-unlocked dedup
    - **Property 3: Already-unlocked dedup**
    - **Validates: Requirements 3.4, 3.5**

  - [~] 3.4 Write property test for milestone threshold correctness
    - **Property 4: Milestone threshold correctness**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

  - [~] 3.5 Write property test for single-run achievement correctness
    - **Property 5: Single-run achievement correctness**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.6, 5.7**

- [~] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 5. Wire achievements into `src/main.js`
  - Import `evaluateAchievements`, `fetchUnlockedAchievements` from `./stats.js`; import `renderAchievementsOverlay`, `queueToasts`, `clearToastQueue` from `./achievements.js`
  - Replace `insertRun(state)` in the death handler with `await evaluateAchievements(state)` (make the setTimeout callback async), then call `queueToasts(newKeys)`
  - Add `'#achievements-screen'` to `isAnyModalOpen()` array
  - Add achievements-screen Escape handler at priority 4 (after stats-screen, before config guard) in `KeydownRegistry`
  - Add `#achievements-btn` visibility toggle in `onAuthStateChange` alongside `#stats-btn`
  - Wire `#achievements-btn` click: add `.open`, show loading after 150ms if still pending, `await fetchUnlockedAchievements()`, call `renderAchievementsOverlay(new Set(keys))`
  - Wire `#achievements-screen` backdrop click to remove `.open`
  - Add `clearToastQueue()` call at the start of `onRestart()` — before state reset
  - Add `clearToastQueue()` call at the start of `goToMenu()` — before state reset
  - _Requirements: 1.2, 1.3, 1.4, 2.5, 2.6, 2.7, 3.1, 8.1, 8.7, 8.8_

  - [~] 5.1 Write property test for achievement button visibility matches auth state
    - **Property 6: Achievement button visibility matches auth state**
    - **Validates: Requirements 1.2, 1.3**

  - [~] 5.2 Write property test for isAnyModalOpen includes achievements-screen
    - **Property 9: isAnyModalOpen includes achievements-screen**
    - **Validates: Requirements 2.7**

- [~] 6. Write unit tests in `src/achievements.test.js`
  - `#achievements-btn` exists in the DOM
  - Clicking `#achievements-btn` adds `.open` to `#achievements-screen`
  - Escape closes `#achievements-screen`
  - Backdrop click closes `#achievements-screen`
  - `isAnyModalOpen()` returns true when `#achievements-screen` is open
  - `fetchUnlockedAchievements()` returns `[]` when not authenticated
  - `first_blood` is unlocked when `totalRuns === 1`
  - `evaluateAchievements` does not throw when a Supabase insert fails
  - `clearToastQueue()` empties `#toast-container` immediately
  - `queueToasts([])` is a no-op — `#toast-container` remains empty
  - _Requirements: 1.1, 1.4, 2.5, 2.6, 2.7, 3.2, 5.1, 8.8, 8.9, 8.10_

- [~] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 8. Commit and push
  - Run: `git add . ; git commit -m "feat: achievements system" ; git push origin master`

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests use `fast-check` with `numRuns: 100` minimum, tagged with `// Feature: achievements, Property N: <text>`
- `evaluateAchievements` calls `insertRun` internally — the death handler no longer calls `insertRun` directly
- The `#achievements-btn` follows the `visibility:hidden/visible` pattern (not `display:none`) to avoid layout shift
- `#toast-container` is NOT an overlay — no `.overlay` class, no backdrop, no Escape handling
- Toast z-index 50 sits above all overlays; `bottom: 72px` clears the `?` help button (36px height + 24px bottom + 12px gap)
- `clearToastQueue()` must be called in both `onRestart()` and `goToMenu()` to prevent cross-run toast bleed
- Sound hook: `queueToasts` returns nothing now; when sound is added later, call the SFX inside `_processNext()` just before the slide-in
