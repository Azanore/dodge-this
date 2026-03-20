# Implementation Plan — DODGE Bug Fixes & Missing Features

- [x] 1. Fix game.config.js loading (Fix 4)





  - Change `game.config.js` from ES module to classic script: replace `const gameConfig = {...}` with `window.gameConfig = {...}` and remove `export default`
  - Update `index.html` to load `game.config.js` as a classic `<script>` (no `type="module"`)
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 2. Fix GameState initialization (Fix 5)





  - Add `slowmoMultiplier: 1` and `prevStatus: null` to `resetState()` in `GameState.js`
  - Add `status: 'start'` as the initial status (was `'grace'`)
  - _Requirements: 5.1, 5.2_

- [x] 2.1 Write unit tests for resetState completeness


  - Verify `resetState()` includes `slowmoMultiplier: 1`
  - Verify `resetState()` sets `player.radius` to `gameConfig.playerHitboxRadius`
  - Verify initial `status` is `'start'`
  - _Requirements: 5.1, 5.2_

- [x] 3. Fix player hitbox sync (Fix 1)




  - Update `player.update()` to accept `state` as a parameter and write to `state.player.x` and `state.player.y` each frame
  - Remove internal `posX`, `posY`, `radius`, `setRadius`, `resetRadius` from `player.js` — read `state.player.radius` directly where needed
  - Remove `getHitbox()` export from `player.js`
  - Update `renderer.js` to read `state.player` directly instead of calling `getHitbox()`
  - Update `bonuses.js` to remove imports of `setRadius`/`resetRadius` — it already writes to `state.player.radius`, which is now the sole source of truth
  - Update all `updatePlayer()` call sites in `main.js` to pass `state`
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3.1 Write property test for player position sync (Property 1)


  - **Feature: dodge-game-fixes, Property 1: Player position always synced to state**
  - **Validates: Requirements 1.1**
  - For any mouse (x, y), after `player.update(state)`, `state.player.x/y` must equal `clampToInner(x, y)`
  - _Requirements: 1.1_

- [ ] 4. Add Start Screen (Fix 2)

  - Add `'start'` case to `main.js` update loop — skip all game logic when `state.status === 'start'`
  - Add `renderStartScreen(ctx)` to `renderer.js` — dark overlay with "DODGE" title and "Click or press any key to begin" prompt
  - Wire a one-shot click and keydown listener in `main.js` that transitions `state.status` from `'start'` to `'grace'` and calls `loop.start()`
  - Ensure `onRestart()` sets `state.status = 'grace'` directly (skips start screen)
  - Do NOT start the game loop on page load — start it only when the player triggers the start action
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 4.1 Write property test for no updates in start state (Property 2)
  - **Feature: dodge-game-fixes, Property 2: No game updates occur in start state**
  - **Validates: Requirements 2.4**
  - For any number of `update(delta)` calls with `state.status === 'start'`, obstacles and elapsed must remain unchanged
  - _Requirements: 2.4_

- [ ] 4.2 Write unit tests for start screen transitions
  - Verify initial `state.status` is `'start'` before start action
  - Verify start action transitions status to `'grace'`
  - Verify restart after Game Over sets status to `'grace'`, not `'start'`
  - _Requirements: 2.1, 2.3, 2.5_

- [ ] 5. Add Pause Screen (Fix 3)

  - Add `'paused'` case to `main.js` update loop — no-op when paused
  - Add `renderPauseScreen(ctx)` to `renderer.js` — semi-transparent overlay with "PAUSED" label and "Press Esc to resume" prompt
  - Wire `Escape` keydown listener in `main.js`: if status is `'active'` or `'grace'` and Config Panel is not open, save `prevStatus`, set `state.status = 'paused'`, call `loop.stop()`; if status is `'paused'`, restore `state.status = state.prevStatus`, call `loop.start()`
  - Ignore `Escape` when `state.status` is `'dead'` or `'start'`
  - Render the pause overlay once (not in the loop) when pausing, so the last frame stays visible under the overlay
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 5.1 Write property test for pause/unpause round trip (Property 3)
  - **Feature: dodge-game-fixes, Property 3: Pause/unpause is a round trip**
  - **Validates: Requirements 3.3**
  - For any state with status `'active'` or `'grace'`, pausing then unpausing must restore the original status
  - _Requirements: 3.3_

- [ ] 5.2 Write property test for Escape ignored in terminal states (Property 4)
  - **Feature: dodge-game-fixes, Property 4: Escape is ignored in terminal/pre-game states**
  - **Validates: Requirements 3.5**
  - For any state with status `'dead'` or `'start'`, the pause handler must not change status
  - _Requirements: 3.5_

- [ ] 5.3 Write unit tests for pause behavior
  - Verify Escape during `'active'` sets status to `'paused'`
  - Verify Escape while Config Panel is open does not pause
  - Verify Escape during `'dead'` is ignored
  - _Requirements: 3.1, 3.4, 3.5_

- [ ] 6. Final Checkpoint — ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.
