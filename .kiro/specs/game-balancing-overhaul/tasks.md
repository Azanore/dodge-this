# Implementation Plan: game-balancing-overhaul

## Overview

Three targeted file changes: fix zone geometry to use fixed constants (zones.js → index.html → main.js), update three decay rate values in game.config.js, then update the property tests to reflect the new invariants.

## Tasks

- [x] 1. Fix zones.js to use fixed canvas constants
  - Export `CANVAS_W = 1600` and `CANVAS_H = 900` constants at the top of `src/zones.js`
  - Replace `window.innerWidth` / `window.innerHeight` reads in `recomputeZones()` with `CANVAS_W` / `CANVAS_H`
  - Remove the `window.addEventListener('resize', recomputeZones)` line at the bottom of the file
  - _Requirements: 1.7, 1.8, 1.9, 1.10_

- [-] 2. Update index.html canvas wrapper and CSS
  - Wrap `<canvas id="gameCanvas">` in `<div id="canvas-container">`
  - Add `width="1600" height="900"` attributes to the canvas element
  - Add `#canvas-container` CSS rule: `position: relative; width: 1600px; height: 900px; transform-origin: center center;`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [~] 3. Replace resizeCanvas with updateScale in main.js
  - Remove the `resizeCanvas` function and its `window.addEventListener('resize', resizeCanvas)` call
  - Add `const container = document.getElementById('canvas-container')` near the top (after canvas is retrieved)
  - Add `updateScale()` function: computes `Math.min(window.innerWidth / 1600, window.innerHeight / 900)` and applies `container.style.transform = \`scale(${scale})\``
  - Call `updateScale()` once on load and register it on `window resize`
  - _Requirements: 1.3, 1.4, 1.5, 1.6, 5.5_

- [~] 4. Update spawn decay rates in game.config.js
  - Change `easy.spawnRateDecayRate` from `0.03` to `0.067`
  - Change `normal.spawnRateDecayRate` from `0.04` to `0.09`
  - Change `hard.spawnRateDecayRate` from `0.05` to `0.113`
  - All other config values remain unchanged
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3_

- [~] 5. Checkpoint — ensure all existing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 6. Update zones.test.js for fixed-canvas invariants
  - [~] 6.1 Rewrite Property 1 to assert viewport-independence
    - Replace the old `setupZones(width, height)` helper with one that calls the real `recomputeZones()` from `src/zones.js` and reads back `innerZone` / `outerZone`
    - The property: for any viewport size, `innerZone` and `outerZone` values equal those derived from `CANVAS_W=1600` / `CANVAS_H=900` (not from the viewport arguments)
    - Tag: `Feature: game-balancing-overhaul, Property 1: Zone geometry is viewport-independent`
    - _Requirements: 1.7, 1.8, 1.9, 1.10_

  - [~] 6.2 Write property test for Property 1 (zone geometry viewport-independence)
    - **Property 1: Zone geometry is viewport-independent**
    - **Validates: Requirements 1.7, 1.8, 1.9, 1.10**

  - [~] 6.3 Add example tests for CSS scale factor correctness
    - For a set of representative viewports (e.g. 1920×1080, 1280×720, 375×667, 3840×2160), assert that `Math.min(vw / 1600, vh / 900)` equals the expected scale value
    - Tag: `Feature: game-balancing-overhaul, Property 2: CSS scale factor is correct for any viewport`
    - _Requirements: 1.4_

  - [~] 6.4 Write property test for Property 2 (CSS scale factor)
    - **Property 2: CSS scale factor is correct for any viewport**
    - **Validates: Requirements 1.4**

- [~] 7. Update difficulty.test.js for new decay rates and floor invariants
  - [~] 7.1 Add example tests for new decay rate config values
    - Assert `getPreset('easy').spawnRateDecayRate === 0.067`
    - Assert `getPreset('normal').spawnRateDecayRate === 0.09`
    - Assert `getPreset('hard').spawnRateDecayRate === 0.113`
    - Assert `getCurrentSpawnInterval(60000, 'normal')` equals `550` (floor reached well before t=60s)
    - Assert `getCurrentSpawnInterval(90000, 'normal')` equals `550` (floor sustained)
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

  - [~] 7.2 Write property test for Property 3 (spawnRateMin floor)
    - For any elapsed time and any difficulty, `getCurrentSpawnInterval` ≥ preset's `spawnRateMin`
    - **Property 3: 500ms reaction floor holds for all presets at all times**
    - **Validates: Requirements 3.1, 3.3**

  - [~] 7.3 Write property test for Property 4 (proportional difficulty ordering)
    - For any elapsed time, `easy interval ≥ normal interval ≥ hard interval`
    - **Property 4: Proportional difficulty ordering at all times**
    - **Validates: Requirements 4.1, 4.2**

- [~] 8. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Task 5 is a checkpoint after the four code changes — run `vitest --run` to confirm no regressions before touching tests
- Property 3 tests the weaker floor (≥ `spawnRateMin`) not the 500ms claim, because `hard.spawnRateMin = 400ms` — see design.md note on requirements inconsistency
- `recomputeZones()` calls in `onRestart` and `goToMenu` in `main.js` are intentionally left in place — they become no-ops but removing them is out of scope
