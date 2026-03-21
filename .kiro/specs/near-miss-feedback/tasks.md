# Implementation Plan

- [x] 1. Add near-miss threshold to game.config.js





  - Add `nearMissThreshold: 40` to `window.gameConfig`
  - _Requirements: 3.3_


- [x] 2. Add `lastNearMissAt` to obstacle spawn




  - In `obstacles.js`, add `lastNearMissAt: 0` to each spawned obstacle object
  - _Requirements: 2.1_


- [x] 3. Implement `checkNearMisses` in collision.js



  - [x] 3.1 Write `checkNearMisses(state, onNearMiss)` function


    - Compute edge gap for each obstacle: `sqrt(dx²+dy²) - obs.radius - player.radius`
    - Fire `onNearMiss(player.x, player.y)` if `0 < gap <= gameConfig.nearMissThreshold` and cooldown elapsed
    - Stamp `obs.lastNearMissAt = Date.now()`
    - Export the function
    - _Requirements: 1.1, 2.1, 3.1_
  - [x] 3.2 Write property test for near-miss threshold (Property 1)


    - **Property 1: Near-miss fires within threshold, not outside**
    - **Validates: Requirements 1.1**
  - [x] 3.3 Write property test for per-obstacle cooldown (Property 2)

    - **Property 2: Per-obstacle cooldown suppresses re-trigger**
    - **Validates: Requirements 2.1**
  - [x] 3.4 Write property test for multiple obstacles (Property 3)


    - **Property 3: Each near-miss pushes exactly one ring to flashes, multiple obstacles push independently**
    - **Validates: Requirements 1.2, 2.2**

- [x] 4. Add `triggerNearMiss` and text state to renderer.js





  - [x] 4.1 Add `nearMissText = { remaining: 0 }` module-level state


    - _Requirements: 1.3, 2.3_

  - [x] 4.2 Export `triggerNearMiss(x, y)`

    - Push white ring into `flashes[]` with duration 220ms
    - Reset `nearMissText.remaining = 600`
    - _Requirements: 1.2, 3.2_
  - [x] 4.3 Render "CLOSE!" text in the `render()` function


    - Draw above player position, alpha = `nearMissText.remaining / 600`, decrement each frame
    - Only render when `nearMissText.remaining > 0` and `state.status !== 'start'`
    - _Requirements: 1.3_
  - [x] 4.4 Write property test for text reset behavior (Property 4)


    - **Property 4: Near-miss text resets on repeat, never stacks**
    - **Validates: Requirements 1.3, 2.3**

- [x] 5. Wire `checkNearMisses` into gameUpdate.js





  - Import `triggerNearMiss` from `renderer.js`
  - Import `checkNearMisses` from `collision.js`
  - Call `checkNearMisses(state, triggerNearMiss)` in the `active` block after `checkPlayerObstacles`
  - _Requirements: 1.1, 3.1_


- [x] 6. Checkpoint — ensure all tests pass, ask the user if questions arise.




