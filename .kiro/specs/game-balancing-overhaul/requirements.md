# Requirements Document

## Introduction

This feature addresses two fairness and balance problems in the DODGE browser arcade game:

1. **Screen size unfairness** — the canvas currently uses `window.innerWidth × window.innerHeight`, giving players on larger monitors a bigger play area and an easier time dodging. This makes leaderboard scores incomparable across devices.

2. **Spawn curve plateau** — the difficulty decay rate floors too early (~3.5 min on normal), meaning the game stops getting harder. Survival should always require increasing skill; difficulty must never truly plateau.

The fix is a fixed logical canvas of 1600×900 CSS-scaled to fill the viewport, combined with steeper spawn decay rates that deliver meaningful pressure by t=60–90s on normal. No game logic, scoring, or mechanics change.

---

## Glossary

- **Canvas**: The HTML `<canvas>` element on which the game world is rendered.
- **Logical Canvas**: The fixed coordinate space (1600×900) in which all game geometry is computed.
- **CSS Scale**: A `transform: scale()` applied to the canvas element to fill the viewport while preserving aspect ratio.
- **Letterbox**: Empty bars (top/bottom or left/right) shown when the viewport aspect ratio differs from 1600×900.
- **Viewport**: The visible browser window area (`window.innerWidth × window.innerHeight`).
- **Inner Zone**: The rectangular play area inside which the player is constrained, derived from the Logical Canvas dimensions.
- **Outer Zone**: The full Logical Canvas rectangle from which obstacles spawn.
- **Spawn Interval**: The time in milliseconds between consecutive obstacle spawns, computed by the exponential decay formula in `difficulty.js`.
- **spawnRateDecayRate**: The exponential decay coefficient controlling how fast the Spawn Interval shrinks over time.
- **spawnRateMin**: The floor value (ms) below which the Spawn Interval cannot fall.
- **Reaction Floor**: The minimum time (500ms) an obstacle takes to travel from the Outer Zone edge to the Inner Zone edge, giving the player time to react.
- **Difficulty Preset**: One of three named configurations (`easy`, `normal`, `hard`) defined in `game.config.js`.
- **GameLoop**: The `requestAnimationFrame`-driven loop in `src/GameLoop.js` that calls `update(delta)` then `render()` each frame.
- **Zones**: The module `src/zones.js` that computes and exports `innerZone`, `outerZone`, and `clampToInner`.

---

## Requirements

### Requirement 1: Fixed Logical Canvas Resolution

**User Story:** As a player, I want the game to use the same play area regardless of my screen size, so that leaderboard scores are fair across all devices.

#### Acceptance Criteria

1. THE Canvas SHALL have a fixed logical resolution of 1600 pixels wide by 900 pixels tall.
2. THE Canvas SHALL be sized to exactly 1600×900 via its `width` and `height` attributes, not via CSS dimensions.
3. WHEN the page loads, THE Canvas SHALL be centered in the viewport.
4. WHEN the page loads, THE Canvas SHALL be scaled via CSS `transform: scale()` to fill the viewport as large as possible while maintaining the 1600×900 aspect ratio.
5. WHEN the viewport is wider than 16:9, THE Canvas SHALL be letterboxed with empty bars on the left and right.
6. WHEN the viewport is taller than 16:9, THE Canvas SHALL be letterboxed with empty bars on the top and bottom.
7. THE Zones module SHALL use the fixed constants 1600 (width) and 900 (height) in place of `window.innerWidth` and `window.innerHeight` when computing Inner Zone and Outer Zone geometry.
8. WHEN a resize event fires, THE Zones module SHALL recompute only the CSS scale applied to the Canvas, not the Inner Zone or Outer Zone geometry.
9. THE game geometry (Inner Zone position, Outer Zone position, obstacle spawn positions, player clamping) SHALL be identical on all devices and viewport sizes.
10. WHEN the browser zoom level changes, THE game geometry SHALL remain unchanged.

### Requirement 2: Spawn Decay Curve Steepness

**User Story:** As a player, I want difficulty to keep increasing throughout a run, so that survival always demands improving skill and long runs feel earned.

#### Acceptance Criteria

1. THE Difficulty_Preset for `easy` SHALL have a `spawnRateDecayRate` of 0.067.
2. THE Difficulty_Preset for `normal` SHALL have a `spawnRateDecayRate` of 0.09.
3. THE Difficulty_Preset for `hard` SHALL have a `spawnRateDecayRate` of 0.113.
4. THE `baseSpawnInterval` and `spawnRateMin` values for all three Difficulty_Presets SHALL remain unchanged from their current values.
5. WHEN elapsed time is 60 seconds on `normal`, THE Spawn Interval SHALL equal the `spawnRateMin` floor of 550ms — the floor is reached at approximately t=11s with the new decay rate.
6. WHEN elapsed time is 90 seconds on `normal`, THE Spawn Interval SHALL equal the `spawnRateMin` floor of 550ms.
7. THE decay formula in `src/difficulty.js` SHALL remain unchanged — only the `spawnRateDecayRate` config values change.

### Requirement 3: Reaction Floor Safety Constraint

**User Story:** As a player, I want obstacles to always give me enough time to react, so that deaths feel fair and skill-based rather than physically impossible to avoid.

#### Acceptance Criteria

1. FOR ALL difficulty presets and FOR ALL elapsed time values, THE Spawn Interval SHALL never fall below 500ms.
2. THE `spawnRateMin` floor for `easy` (700ms), `normal` (550ms), and `hard` (400ms) SHALL each be greater than or equal to 500ms, satisfying the Reaction Floor constraint by construction.
3. WHEN the `spawnRateDecayRate` is applied at any elapsed time on any Difficulty_Preset, THE computed Spawn Interval SHALL be bounded below by the preset's `spawnRateMin`, which is itself at or above 500ms.

### Requirement 4: Proportional Difficulty Spacing

**User Story:** As a player choosing a difficulty, I want easy to feel noticeably more forgiving than normal, and hard to feel noticeably more intense, so that difficulty selection is meaningful.

#### Acceptance Criteria

1. AT any given elapsed time, THE Spawn Interval on `easy` SHALL be greater than the Spawn Interval on `normal`.
2. AT any given elapsed time, THE Spawn Interval on `normal` SHALL be greater than the Spawn Interval on `hard`.
3. THE ratio of `spawnRateDecayRate` values across presets SHALL maintain proportional spacing: `easy` : `normal` : `hard` ≈ 0.067 : 0.09 : 0.113.

### Requirement 5: No Changes to Game Logic or Scoring

**User Story:** As a developer, I want the balancing overhaul to be purely a configuration and canvas normalization change, so that no existing game logic, scoring, or mechanics are affected.

#### Acceptance Criteria

1. THE `src/GameLoop.js` file SHALL require no modifications.
2. THE `src/difficulty.js` file SHALL require no modifications to its formulas or exports — only the config values it reads change.
3. THE scoring system, combo multiplier, near-miss detection, bonus effects, and obstacle behavior SHALL remain unchanged.
4. THE existing test suite SHALL continue to pass without modification to test logic.
5. IF the canvas CSS scale changes due to a resize event, THEN THE game state, obstacle positions, player position, and zone geometry SHALL remain unchanged.
