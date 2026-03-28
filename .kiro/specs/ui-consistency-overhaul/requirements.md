# Requirements Document

## Introduction

DODGE is a browser-based arcade game using a canvas/HTML split architecture: the canvas renders the game world only, while all menus and overlays are HTML/CSS. This overhaul addresses accumulated code quality debt and UI inconsistencies across five in-scope files (`index.html`, `src/main.js`, `src/gameOver.js`, `src/renderer.js`, `src/hud.js`). No game logic, visual design colors, or canvas rendering behavior changes. The neon palette (`#00eeff`, `#00ff88`, `#ff4444`, `#ffe600`, `#cc44ff`) is preserved. The goal is a cleaner, more consistent codebase and a more polished overlay/button feel.

## Glossary

- **Overlay**: A full-screen HTML `div` that uses the `.open` class pattern to show/hide (`display:none` → `display:flex`). Examples: `#pause-screen`, `#game-over-screen`, `#how-to-play`.
- **KeydownRegistry**: The single consolidated `window.addEventListener('keydown', ...)` handler that replaces all scattered keydown listeners.
- **isAnyModalOpen**: A helper function that returns `true` if any overlay that should block game start is currently open.
- **Cleanup**: A function returned or exposed by a module that removes its own event listeners when the module's UI is dismissed.
- **syncHelpBtn**: The function that shows or hides the `?` help button based on game state.
- **BONUS_COLORS**: The constant mapping bonus type names to their hex color strings, defined once in `renderer.js` and imported by `hud.js`.
- **run-stats-panel**: The collapsible stats panel on the game-over screen, currently toggled via `display:none/block` directly.
- **renderStartScreen**: A dead function in `renderer.js` that draws a fully transparent rectangle and does nothing useful.
- **dead code**: Code that executes but has no observable effect, or code that is never called.

---

## Requirements

### Requirement 1: Consolidate Keydown Listeners

**User Story:** As a developer, I want all keyboard input handled in one place, so that I can reason about key conflicts and add new shortcuts without hunting across the codebase.

#### Acceptance Criteria

1. THE `KeydownRegistry` SHALL replace all five separate `window.addEventListener('keydown', ...)` calls in `src/main.js` with a single handler.
2. THE `KeydownRegistry` SHALL dispatch to the same logic currently handled by each individual listener (Escape for pause/unpause/close-overlay, R for restart, how-to-play Escape close, leaderboard Escape close).
3. WHEN a new keydown case is added, THE `KeydownRegistry` SHALL require changes in only one location in `src/main.js`.
4. THE `KeydownRegistry` SHALL preserve all existing key guard conditions (e.g. Escape ignored in `dead`/`start` states, R only active on game-over screen).

---

### Requirement 2: isAnyModalOpen Helper

**User Story:** As a developer, I want `onStartAction` to use a helper instead of manually checking overlay IDs, so that adding a new overlay never silently breaks the start guard.

#### Acceptance Criteria

1. THE `Main` module SHALL expose an `isAnyModalOpen()` function that returns `true` if any overlay that should block game start is currently open.
2. WHEN `onStartAction` is called, THE `Main` module SHALL call `isAnyModalOpen()` instead of the three individual `classList.contains('open')` checks.
3. THE `isAnyModalOpen` function SHALL check at minimum: `#how-to-play`, `#leaderboard-screen`, `#stats-screen`.
4. WHEN a new blocking overlay is added to the game, THE `isAnyModalOpen` function SHALL be the only place that requires updating.

---

### Requirement 3: Fix R Key Listener Leak in gameOver.js

**User Story:** As a developer, I want the game-over R key listener removed when the user navigates to the menu, so that stale listeners don't accumulate across sessions.

#### Acceptance Criteria

1. THE `gameOver` module SHALL expose a `cleanup()` function that removes the restart key listener and click listener added by `showGameOver`.
2. WHEN `goToMenu` is called in `src/main.js`, THE `Main` module SHALL call `gameOver.cleanup()` before resetting state.
3. WHEN `onRestart` fires via the Restart button or R key, THE `gameOver` module SHALL call its own cleanup internally (existing behavior preserved).
4. IF `cleanup()` is called when no listeners are active, THE `gameOver` module SHALL handle the call without error.

---

### Requirement 4: Drive syncHelpBtn from State Changes

**User Story:** As a developer, I want `syncHelpBtn` called automatically when state changes, so that I don't have to remember to call it manually in every code path.

#### Acceptance Criteria

1. THE `Main` module SHALL call `syncHelpBtn()` in every location where `state.status` is mutated (start, pause, resume, restart, go-to-menu, death).
2. THE `syncHelpBtn` function SHALL remain the single source of truth for help button visibility — no other code SHALL set `helpBtn.style.display` directly.
3. WHEN a new state transition is added, THE `syncHelpBtn` call pattern SHALL be self-evident from the existing code structure.

*Note: This requirement formalizes the existing call sites rather than introducing a reactive system. The six existing manual call sites are already correct; the requirement is that they remain the only mechanism and no direct `style.display` assignments bypass them.*

---

### Requirement 5: run-stats-panel Uses .open Class Pattern

**User Story:** As a developer, I want the run-stats-panel to follow the same `.open` class convention as all other overlays, so that the codebase is consistent and CSS controls visibility uniformly.

#### Acceptance Criteria

1. THE `run-stats-panel` element SHALL use the `.open` CSS class to control visibility, not `style.display` set directly from JavaScript.
2. WHEN the toggle button is clicked, THE `Main` module SHALL add or remove the `.open` class on `#run-stats-panel` instead of setting `panel.style.display`.
3. WHEN a new game-over screen opens, THE `Main` module SHALL remove the `.open` class from `#run-stats-panel` to collapse it (replacing the current `panel.style.display = 'none'` call).
4. THE `index.html` stylesheet SHALL define `#run-stats-panel` visibility via a CSS rule using the `.open` class, consistent with the `.overlay.open` pattern.

---

### Requirement 6: Remove renderStartScreen Dead Code

**User Story:** As a developer, I want dead code removed, so that the codebase is smaller and easier to understand.

#### Acceptance Criteria

1. THE `renderer.js` module SHALL NOT contain the `renderStartScreen` function after this change.
2. THE `main.js` module SHALL NOT import `renderStartScreen` from `renderer.js` after this change.
3. THE `renderFrame` function in `main.js` SHALL NOT call `renderStartScreen` after this change.
4. WHEN the start screen is active, THE game SHALL render identically to before (the HTML overlay handles all start-screen UI; the canvas renders the star field via the normal `render()` call).

---

### Requirement 7: Remove Duplicate BONUS_COLORS in hud.js

**User Story:** As a developer, I want `BONUS_COLORS` defined in one place, so that adding a new bonus type only requires one edit.

#### Acceptance Criteria

1. THE `hud.js` module SHALL NOT define its own `BONUS_COLORS` constant.
2. THE `hud.js` module SHALL import `BONUS_COLORS` from `renderer.js`.
3. THE `renderer.js` module SHALL export `BONUS_COLORS` so it is importable.
4. FOR ALL bonus types, the color values used by `hud.js` and `renderer.js` SHALL be identical after this change (round-trip: same source, same value).

---

### Requirement 8: Move Inline Styles to CSS Classes in index.html

**User Story:** As a developer, I want inline styles moved to CSS classes, so that the HTML is readable and styles are maintainable in one place.

#### Acceptance Criteria

1. THE `index.html` stylesheet SHALL define named CSS classes for all repeated or structurally significant inline style patterns currently on overlay elements.
2. WHEN an inline style is moved to a CSS class, THE visual appearance of the element SHALL be identical before and after the change.
3. THE `index.html` SHALL retain inline styles only for values that are unique to a single element and unlikely to be reused (e.g. a one-off color on a specific label).
4. THE `index.html` SHALL NOT use inline `style` attributes for layout properties (display, flex, gap, margin, padding, width) that are shared across two or more elements of the same logical group.

---

### Requirement 9: Fix z-index Consistency

**User Story:** As a developer, I want z-indexes declared in one consistent scale, so that overlay stacking is predictable and new overlays can be placed correctly.

#### Acceptance Criteria

1. THE `index.html` stylesheet SHALL define z-index values for all overlays using a consistent scale where higher z-index means "closer to the user".
2. THE `#difficulty-screen` overlay SHALL have a lower z-index than standard overlays (`#pause-screen`, `#game-over-screen`, `#stats-screen`, `#leaderboard-screen`).
3. THE `#how-to-play` overlay SHALL have the highest z-index among all overlays, as it can appear on top of the pause screen.
4. THE `#help-btn` SHALL have a z-index between the standard overlays and `#how-to-play`.
5. WHEN a new overlay is added, THE z-index scale SHALL make the correct placement self-evident from the existing values.

---

### Requirement 10: Overlay Visual Polish

**User Story:** As a player, I want the menus and overlays to feel consistently polished and cosmic/neon in style, so that the UI matches the game's visual identity.

#### Acceptance Criteria

1. THE `index.html` stylesheet SHALL define consistent button styles for `.overlay-btn` that include a visible border, neon-compatible hover state, and uniform padding.
2. THE `.overlay-btn.primary` style SHALL use a neon-accented appearance (e.g. cyan border/glow) rather than a plain blue fill, consistent with the game's `#00eeff` palette.
3. THE `.diff-btn` and `.lb-tab` selected states SHALL use the same visual treatment (cyan border + subtle cyan background tint).
4. THE `.htp-panel` (used by how-to-play, stats, leaderboard) SHALL have a consistent border, background, and padding across all three overlays.
5. WHEN any button in an overlay is hovered, THE button SHALL show a consistent neon-tinted highlight rather than a plain opacity change.
6. THE overlay panel backgrounds SHALL use a consistent dark value (`#0d0d1a` or equivalent) across all panels.
