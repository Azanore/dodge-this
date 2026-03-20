# Implementation Plan — DODGE

- [x] 1. Project scaffold and config





  - Create `index.html` with a single `<canvas>` element and script imports
  - Create `game.config.js` with all default values per the Config Shape in the design
  - Create `src/` directory with empty module files matching the architecture
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  - Run: `git add . ; git commit -m "task 1: project scaffold and config" ; git push origin master`

- [x] 2. Zone geometry






- [x] 2.1 Implement `zones.js` — Inner Zone and Outer Zone computation

  - Compute both zones as `{ x, y, width, height }` from viewport size and `outerZoneScale` config
  - Export `clampToInner(x, y)` that returns the nearest valid point inside the Inner Zone
  - Attach `window.resize` listener that recomputes zones and re-clamps player position
  - _Requirements: 1.1, 1.3, 1.4, 1.5_
  - Run: `git add . ; git commit -m "task 2.1: zones.js" ; git push origin master`

- [ ]* 2.2 Write property test for zone containment (Property 1)
  - **Feature: dodge-game, Property 1: Zone containment for any viewport**
  - **Validates: Requirements 1.1, 1.3, 1.4**
  - Run: `git add . ; git commit -m "task 2.2: property test - zone containment" ; git push origin master`

- [ ]* 2.3 Write property test for mouse clamping (Property 2)
  - **Feature: dodge-game, Property 2: Mouse clamping keeps player inside Inner Zone**
  - **Validates: Requirements 1.5, 2.2**
  - Run: `git add . ; git commit -m "task 2.3: property test - mouse clamping" ; git push origin master`

- [x] 3. Game state and game loop






- [x] 3.1 Implement `GameState.js` — central state object

  - Define and export the initial state shape per the design data model
  - Export a `resetState()` function that returns a fresh initial state
  - _Requirements: 6.1, 6.3_
  - Run: `git add . ; git commit -m "task 3.1: GameState.js" ; git push origin master`

- [x] 3.2 Implement `GameLoop.js` — requestAnimationFrame loop


  - Drive `update(delta)` → `render()` each frame
  - Cap delta at 100ms to handle tab-switch resume
  - Expose `start()` and `stop()` methods
  - _Requirements: 4.3_
  - Run: `git add . ; git commit -m "task 3.2: GameLoop.js" ; git push origin master`

- [x] 4. Player







- [ ] 4.1 Implement `player.js` — mouse tracking, clamping, hitbox
  - Track raw mouse position via `mousemove` listener
  - On each update, clamp position using `clampToInner`
  - Initialize at inner zone center when no mouse movement has occurred
  - Export `getHitbox()` returning `{ x, y, radius }` using config `playerHitboxRadius`
  - _Requirements: 2.1, 2.2, 2.3, 2.5_
  - Run: `git add . ; git commit -m "task 4.1: player.js" ; git push origin master`

- [x] 5. Obstacles





- [x] 5.1 Implement `obstacles.js` — spawning, movement, removal


  - Implement `spawnObstacle()`: pick weighted random enabled type, place in outer zone outside inner zone, assign velocity toward a random point in inner zone
  - Implement `updateObstacles(delta)`: move all obstacles by velocity * delta, remove those outside outer zone
  - Implement `clearAll()` for Screen Clear bonus
  - Enforce `maxObstaclesOnScreen` cap before each spawn
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.3_
  - Run: `git add . ; git commit -m "task 5.1: obstacles.js" ; git push origin master`

- [ ]* 5.2 Write property test for obstacle spawn position (Property 3)
  - **Feature: dodge-game, Property 3: Obstacle spawn position is in Outer Zone but not Inner Zone**
  - **Validates: Requirements 3.1**
  - Run: `git add . ; git commit -m "task 5.2: property test - obstacle spawn position" ; git push origin master`

- [ ]* 5.3 Write property test for obstacle velocity direction (Property 4)
  - **Feature: dodge-game, Property 4: Obstacle velocity points toward Inner Zone**
  - **Validates: Requirements 3.2**
  - Run: `git add . ; git commit -m "task 5.3: property test - obstacle velocity" ; git push origin master`

- [ ]* 5.4 Write property test for out-of-bounds removal (Property 5)
  - **Feature: dodge-game, Property 5: Out-of-bounds obstacles are removed**
  - **Validates: Requirements 3.5**
  - Run: `git add . ; git commit -m "task 5.4: property test - obstacle removal" ; git push origin master`

- [ ]* 5.5 Write property test for obstacle count cap (Property 13)
  - **Feature: dodge-game, Property 13: Obstacle count never exceeds configured maximum**
  - **Validates: Requirements 5.3**
  - Run: `git add . ; git commit -m "task 5.5: property test - obstacle count cap" ; git push origin master`

- [x] 6. Collision detection





- [x] 6.1 Implement `collision.js` — circle-circle intersection and game checks


  - Implement `circlesOverlap(a, b)`: true iff distance between centers < sum of radii
  - Implement `checkPlayerObstacles(state)`: iterate obstacles, trigger death if overlap and invincibility not active
  - Implement `checkPlayerBonusPickups(state)`: iterate field pickups, trigger collection on overlap
  - _Requirements: 4.1, 4.3, 4.4, 7.2_
  - Run: `git add . ; git commit -m "task 6.1: collision.js" ; git push origin master`

- [ ]* 6.2 Write property test for collision geometry (Property 6)
  - **Feature: dodge-game, Property 6: Collision detection is geometrically correct**
  - **Validates: Requirements 4.1**
  - Run: `git add . ; git commit -m "task 6.2: property test - collision geometry" ; git push origin master`

- [x] 7. Difficulty scaling






- [x] 7.1 Implement `difficulty.js` — speed multiplier and spawn interval curves

  - Implement `getCurrentSpeedMultiplier(elapsed)` using logarithmic formula, capped at `maxSpeedMultiplier`
  - Implement `getCurrentSpawnInterval(elapsed)` using exponential decay, floored at `spawnRateMin`
  - All formula constants sourced from config
  - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.6_
  - Run: `git add . ; git commit -m "task 7.1: difficulty.js" ; git push origin master`

- [ ]* 7.2 Write property test for monotonic speed increase (Property 7)
  - **Feature: dodge-game, Property 7: Difficulty speed multiplier is monotonically non-decreasing**
  - **Validates: Requirements 5.1**
  - Run: `git add . ; git commit -m "task 7.2: property test - monotonic speed" ; git push origin master`

- [ ]* 7.3 Write property test for difficulty bounds (Property 8)
  - **Feature: dodge-game, Property 8: Difficulty functions respect their configured bounds**
  - **Validates: Requirements 5.4, 5.5**
  - Run: `git add . ; git commit -m "task 7.3: property test - difficulty bounds" ; git push origin master`


- [x] 8. Checkpoint — ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.


- [x] 9. Bonus system





- [x] 9.1 Implement `bonuses.js` — pickup spawning, activation, expiry

  - Implement `trySpawnBonus()`: weighted random selection of enabled bonus types, place in inner zone
  - Implement `collectBonus(type, state)`: activate effect in `activeEffects`, start countdown
  - Implement `updateEffects(delta, state)`: tick down all active effects, trigger expiry cleanup
  - Apply each effect: Slow-mo sets speedMultiplier, Shrink sets player radius, Invincibility sets flag, Screen Clear calls `obstacles.clearAll()`
  - On expiry, restore all modified state values to pre-bonus values
  - Log console warning if all enabled bonus spawnWeights sum to zero
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12_
  - Run: `git add . ; git commit -m "task 9.1: bonuses.js" ; git push origin master`

- [ ]* 9.2 Write property test for bonus expiry round trip (Property 9)
  - **Feature: dodge-game, Property 9: Bonus expiry restores pre-bonus state (round trip)**
  - **Validates: Requirements 7.8, 7.10**
  - Run: `git add . ; git commit -m "task 9.2: property test - bonus expiry round trip" ; git push origin master`

- [ ]* 9.3 Write property test for bonus pickup removal (Property 10)
  - **Feature: dodge-game, Property 10: Collected bonus pickups are removed from the field**
  - **Validates: Requirements 7.2**
  - Run: `git add . ; git commit -m "task 9.3: property test - bonus pickup removal" ; git push origin master`

- [ ]* 9.4 Write property test for slow-mo speed reduction (Property 11)
  - **Feature: dodge-game, Property 11: Slow-mo reduces all obstacle speeds by 60%**
  - **Validates: Requirements 7.5**
  - Run: `git add . ; git commit -m "task 9.4: property test - slow-mo speed" ; git push origin master`


- [x] 10. Config loader with fallback




- [x] 10.1 Implement config validation and fallback in `main.js`


  - On startup, validate all required config keys are present and of correct type
  - For any missing or invalid key, substitute hardcoded default and log a console warning with the key name
  - _Requirements: 10.7_
  - Run: `git add . ; git commit -m "task 10.1: config validation and fallback" ; git push origin master`

- [ ]* 10.2 Write property test for config fallback (Property 12)
  - **Feature: dodge-game, Property 12: Config fallback for any missing key**
  - **Validates: Requirements 10.7**
  - Run: `git add . ; git commit -m "task 10.2: property test - config fallback" ; git push origin master`

- [-] 11. HUD

- [x] 11.1 Implement `hud.js` — timer and active bonus display




  - Render live survival timer as seconds in a canvas corner, updated every frame
  - Render each active bonus as a colored label with remaining time in seconds
  - Remove bonus entry from HUD immediately on expiry
  - _Requirements: 8.1, 8.2, 8.3_
  - Run: `git add . ; git commit -m "task 11.1: hud.js" ; git push origin master`

- [x] 12. Game Over screen





- [x] 12.1 Implement `gameOver.js` — death screen, personal best, restart, share


  - On death: read localStorage `dodge_pb` in try/catch, compare with current time, write new best if higher
  - Render Game Over overlay on canvas with current time and personal best
  - If localStorage unavailable, render without personal best, no exception thrown
  - Restart button: call `resetState()`, re-enter grace period, resume game loop
  - Share button: call `navigator.clipboard.writeText(...)` in try/catch; on failure, inject a DOM `<textarea>` with share text as fallback
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  - Run: `git add . ; git commit -m "task 12.1: gameOver.js" ; git push origin master`

- [x] 13. Renderer





- [x] 13.1 Implement `renderer.js` — all canvas drawing


  - Render in order: dark background → star field → outer zone (darker) → inner zone → obstacles (glowing) → bonus pickups (per-type color) → player (pulsing glow) → HUD
  - Star field: generate static point array at init, render as small glowing dots each frame
  - Use Canvas `shadowBlur` + `shadowColor` for glow effects on player, obstacles, and pickups
  - Render Invincibility Shield as a distinct glow color on the player shape
  - Render Shrink effect as visually reduced player size
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - Run: `git add . ; git commit -m "task 13.1: renderer.js" ; git push origin master`

- [x] 14. Wire everything together in `main.js`





  - Import all modules, initialize zones, player, game loop
  - Connect game loop update to: grace period tick, obstacle spawning (via difficulty interval), obstacle update, bonus update, collision checks, HUD update
  - Connect game loop render to renderer
  - On death state: stop game loop, call gameOver
  - On restart: reset state, restart game loop
  - _Requirements: 6.1, 6.2, 6.3_
  - Run: `git add . ; git commit -m "task 14: wire main.js" ; git push origin master`



- [x] 15. Dev Config Panel



- [x] 15.1 Implement `configPanel.js` — DOM overlay for runtime config tuning


  - Create a hidden `<div>` overlay toggled by the `P` key
  - Render checkboxes for each obstacle type `enabled` and each bonus type `enabled`
  - Render sliders for `gracePeriod`, `maxObstaclesOnScreen`, and `maxSpeedMultiplier` with min/max bounds and clamping
  - Pause the game loop when the panel opens during active play; resume on close without restart
  - "Restart with changes" button: write panel values to the runtime config object, call `resetState()`, close panel, begin new run
  - Discard unsaved changes on close without restart
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_
  - Run: `git add . ; git commit -m "task 15.1: configPanel.js" ; git push origin master`


- [-] 16. Final Checkpoint — ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.
  - Run: `git add . ; git commit -m "final: all tests passing" ; git push origin master`
