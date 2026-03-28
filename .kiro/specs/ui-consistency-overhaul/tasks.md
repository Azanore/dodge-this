# Implementation Plan: UI Consistency Overhaul

## Overview

Structural cleanup across `index.html`, `src/main.js`, `src/gameOver.js`, `src/renderer.js`, and `src/hud.js`. No game logic changes. Tasks are ordered safest-first: dead code removal → isolated module fixes → JS consolidation → CSS/HTML cleanup → visual polish → tests.

## Tasks

- [x] 1. Remove renderStartScreen dead code
  - Delete `renderStartScreen` from `src/renderer.js`
  - Remove `renderStartScreen` from the named import in `src/main.js`
  - Update `renderFrame` in `src/main.js`: remove the `renderStartScreen(ctx)` call, keep `render(ctx, state, lastDelta)` for `status === 'start'`
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 1.1 Write property test for renderFrame start-status behavior
    - **Property 7: render() is called for start status**
    - **Validates: Requirements 6.3, 6.4**

- [-] 2. Deduplicate BONUS_COLORS
  - Add `export` to the `BONUS_COLORS` const in `src/renderer.js`
  - In `src/hud.js`, remove the local `BONUS_COLORS` const and add `import { BONUS_COLORS } from './renderer.js'`
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [~] 2.1 Write property test for BONUS_COLORS identity
    - **Property 4: BONUS_COLORS identity across modules**
    - **Validates: Requirements 7.4**

- [~] 3. Fix listener leak in gameOver.js
  - Promote `_onClickRestart` and `_onKey` to module-level variables (initialized to `null`)
  - Rewrite `showGameOver` to assign those variables and register listeners using them
  - Export a `cleanup()` function that removes both listeners and nulls the variables; guard with null checks so double-call is safe
  - In `src/main.js`, import `cleanup` from `./gameOver.js` and call it at the top of `goToMenu()` before resetting state
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [~] 3.1 Write property test for cleanup() idempotency
    - **Property 2: cleanup() removes all listeners and is safe to call repeatedly**
    - **Validates: Requirements 3.1, 3.3, 3.4**

- [~] 4. Extract isAnyModalOpen helper
  - Add `function isAnyModalOpen()` in `src/main.js` that checks `.open` on `#how-to-play`, `#leaderboard-screen`, and `#stats-screen`
  - Replace the three individual `classList.contains('open')` checks in `onStartAction` with a single `isAnyModalOpen()` call
  - Preserve the `e.key === 'Escape'` early return in `onStartAction` as a separate guard — do not fold it into `isAnyModalOpen()`
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [~] 4.1 Write property test for isAnyModalOpen
    - **Property 1: isAnyModalOpen reflects all overlay states**
    - **Validates: Requirements 2.1, 2.3**

- [~] 5. Consolidate keydown listeners into KeydownRegistry
  - Replace the four separate `window.addEventListener('keydown', ...)` calls in `src/main.js` (how-to-play close, leaderboard close, stats close, pause/unpause) with a single handler following the priority order in the design: how-to-play → leaderboard → stats → config-panel guard → dead/start guard → Escape pause/unpause → R restart
  - The `onStartAction` keydown listener remains separate (added/removed dynamically)
  - How-to-play Escape was previously an unconditional independent listener — priority 1 in the registry must replicate this: it fires before any state guards, regardless of `state.status`
  - Remove the now-redundant individual keydown listeners
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [~] 5.1 Write property test for key guard conditions
    - **Property 5: Key guard conditions preserved**
    - **Validates: Requirements 1.4**

- [~] 6. Formalize syncHelpBtn call sites
  - Audit all locations in `src/main.js` where `state.status` is mutated; confirm `syncHelpBtn()` is called at each one (start, pause, resume, restart, go-to-menu, death)
  - Remove any direct `helpBtn.style.display` assignments that exist outside `syncHelpBtn`
  - _Requirements: 4.1, 4.2, 4.3_

- [~] 7. Checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 8. Adopt .open class pattern for run-stats-panel
  - In `index.html`, add CSS rules: `#run-stats-panel { display: none; }` and `#run-stats-panel.open { display: block; }`
  - Remove the `style="display:none"` inline attribute from `#run-stats-panel` in `index.html`
  - In `src/main.js`, replace the toggle handler's `panel.style.display` assignments with `panel.classList.toggle('open')` and update the toggle text to read from `panel.classList.contains('open')`
  - In the `update` function's death handler, replace `panel.style.display = 'none'` with `panel.classList.remove('open')`
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [~] 8.1 Write property test for run-stats-panel toggle
    - **Property 3: run-stats-panel toggle uses .open class exclusively**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [~] 9. Extract inline styles to CSS classes in index.html
  - Add `.overlay-secondary-btn` class (`background:#222`) and apply it to Leaderboard, Stats, Menu, and Go-to-menu buttons (replacing `style="background:#222"`)
  - Add `.diff-btn-row` class (`display:flex;gap:8px;margin-bottom:8px`) and apply it to the difficulty button container (replacing the inline `style` on that `.btn-row`)
  - Add `.auth-link` class with the full inline style from `#auth-btn` and apply it (removing the inline `style` attribute)
  - Add `.screen-title` class for shared title properties; keep per-screen color/shadow as inline styles (they are unique per element)
  - Move `#run-stats-panel` layout styles (background, border, border-radius, padding, font, color, min-width) to a CSS rule in the stylesheet; remove them from the inline `style` attribute
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [~] 10. Fix z-index scale
  - In `index.html` stylesheet, set explicit z-index values: `#difficulty-screen` → 10, `.overlay` base → 20, `#help-btn` → 25, `#how-to-play` → 30
  - Verify no other overlay has a conflicting z-index that breaks the ordering
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [~] 10.1 Write property test for z-index ordering
    - **Property 6: z-index ordering is correct across all overlays**
    - **Validates: Requirements 9.2, 9.3, 9.4**

- [~] 11. Visual polish — buttons, panels, hover states
  - Update `.overlay-btn` in `index.html` to add a visible border (`border: 1px solid rgba(255,255,255,0.15)`) and consistent hover state (neon-tinted background instead of plain opacity)
  - Update `.overlay-btn.primary` to use cyan border/glow (`border-color: #00eeff; box-shadow: 0 0 8px rgba(0,238,255,0.3)`) instead of plain `#2255cc` fill
  - Verify `.diff-btn.selected` and `.lb-tab.selected` use the same treatment (cyan border + `rgba(0,238,255,0.08)` background) — already present, confirm no divergence
  - Verify all `.htp-panel` instances share the same background (`#0d0d1a`), border, and padding — already present in the shared class, confirm `#run-stats-panel` matches after task 9
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [~] 11.1 Write property test for panel background consistency
    - **Property 8: Panel backgrounds use consistent color**
    - **Validates: Requirements 10.6**

- [~] 12. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Tasks 1–2 are pure deletions/deduplication — zero behavior risk
- Tasks 3–6 are isolated JS changes; each can be verified independently
- Tasks 8–11 are HTML/CSS only — no JS logic changes
- Property tests use fast-check with Vitest (already in the project)
- Each property test must include the tag: `// Feature: ui-consistency-overhaul, Property N: <text>`
