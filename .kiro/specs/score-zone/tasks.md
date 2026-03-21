# Implementation Plan

- [x] 1. Add score zone config values to game.config.js





  - Add `scoreZoneInterval: 8000`, `scoreZoneDuration: 5000`, `scoreZoneRadius: 60`, `scoreZoneWanderSpeed: 40`, `comboFastDecayRate: 2.4`
  - _Requirements: 1.1, 1.2, 1.3, 2.2_


- [x] 2. Add scoreZone to GameState.js




  - Add `scoreZone: { active: false }` to `resetState()`
  - _Requirements: 3.1_

- [-] 3. Replace updateComboMultiplier with updateScoreZone in combo.js




  - [x] 3.1 Rewrite `combo.js` — replace `updateComboMultiplier` with `updateScoreZone(delta, state, accumulators)`

    - Advance `accumulators.scoreZone`, spawn zone when interval reached
    - Decrement `state.scoreZone.remaining`, expire zone when done
    - Wander zone center, clamp to inner zone bounds on boundary contact
    - Player inside zone: build multiplier; outside active zone: fast decay; no zone: normal decay
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4_
  - [x] 3.2 Write property test: zone spawns at configured interval (Property 1)


    - **Property 1: Zone spawns at configured interval**
    - **Validates: Requirements 1.1**
  - [x] 3.3 Write property test: zone expires after configured duration (Property 2)

    - **Property 2: Zone expires after configured duration**
    - **Validates: Requirements 1.2**
  - [x] 3.4 Write property test: zone center always stays within inner zone bounds (Property 3)

    - **Property 3: Zone center always stays within inner zone bounds**
    - **Validates: Requirements 1.3**
  - [x] 3.5 Write property test: multiplier builds inside active zone, capped at max (Property 4)

    - **Property 4: Multiplier builds when player is inside active zone, capped at max**
    - **Validates: Requirements 2.1**

  - [x] 3.6 Write property test: multiplier fast decays outside active zone, floored at 1.0 (Property 5)

    - **Property 5: Multiplier decays fast when zone active and player outside, floored at 1.0**
    - **Validates: Requirements 2.2**
  - [x] 3.7 Write property test: multiplier normal decays when zone inactive, floored at 1.0 (Property 6)


    - **Property 6: Multiplier decays normally when zone inactive, floored at 1.0**
    - **Validates: Requirements 2.3**


- [x] 4. Update gameUpdate.js to use updateScoreZone




  - Replace `updateComboMultiplier(delta, state)` with `updateScoreZone(delta, state, accumulators)`
  - _Requirements: 3.3_

- [x] 5. Add accumulators.scoreZone to main.js





  - Add `scoreZone: 0` to the accumulators object
  - Add `accumulators.scoreZone = 0` to `onRestart()`
  - _Requirements: 3.2, 3.3_



- [x] 6. Render score zone in renderer.js



  - In `render()`, after bonus pickups: if `state.scoreZone.active`, draw pulsing circle outline at zone center, color `#00ff88`, subtle glow
  - _Requirements: 1.4_


- [x] 7. Checkpoint — ensure all tests pass, ask the user if questions arise.




