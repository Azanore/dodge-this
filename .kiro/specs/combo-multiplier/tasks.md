# Implementation Plan

- [x] 1. Add combo config values to game.config.js





  - Add `comboMultiplierMax: 5.0`, `comboBuildRate: 1.5`, `comboDecayRate: 0.8`
  - _Requirements: 1.3, 1.4_

- [x] 2. Add score and comboMultiplier to GameState.js





  - Add `score: 0` and `comboMultiplier: 1.0` to `resetState()`
  - _Requirements: 1.2_

- [x] 3. Implement combo.js





  - [x] 3.1 Create `src/combo.js` with `updateComboMultiplier(delta, state)`


    - Iterate obstacles, compute edge gap (same math as collision.js)
    - If any gap is within threshold: build multiplier, else decay
    - Clamp to `[1.0, gameConfig.comboMultiplierMax]`
    - _Requirements: 1.3, 1.4_
  - [x] 3.2 Write property test: multiplier builds near obstacle, capped at max (Property 2)


    - **Property 2: Multiplier builds when near obstacle, capped at max**
    - **Validates: Requirements 1.3**
  - [x] 3.3 Write property test: multiplier decays when safe, floored at 1.0 (Property 3)


    - **Property 3: Multiplier decays when safe, floored at 1.0**
    - **Validates: Requirements 1.4**


- [x] 4. Wire score accumulation into gameUpdate.js




  - Import `updateComboMultiplier` from `combo.js`
  - In active block: call `updateComboMultiplier(delta, state)`, then `state.score += delta * state.comboMultiplier`
  - _Requirements: 1.1_
  - [x] 4.1 Write property test: score accumulates proportionally to multiplier (Property 1)


    - **Property 1: Score accumulates proportionally to multiplier**
    - **Validates: Requirements 1.1**


- [x] 5. Update hud.js to display score, time, and multiplier




  - Primary top-left: score as integer points (large font)
  - Secondary below score: elapsed time in seconds (small font)
  - Top-right: multiplier value only when `> 1.0`, hidden at 1.0
  - _Requirements: 2.1, 2.2, 2.3, 2.4_


- [x] 6. Update gameOver.js to use score as PB




  - Replace `state.elapsed` with `state.score` in PB read/write logic
  - Display final score in points (rounded integer) and PB in points
  - _Requirements: 3.1, 3.2_
  - [x] 6.1 Write property test: PB write stores higher of score and existing PB (Property 4)


    - **Property 4: PB write always stores the higher of score and existing PB**
    - **Validates: Requirements 3.1**

- [x] 7. Update renderer.js renderStartScreen to show PB as points





  - Read `dodge_pb` and display as integer points (was seconds)
  - _Requirements: 3.3_


- [x] 8. Checkpoint — ensure all tests pass, ask the user if questions arise.




