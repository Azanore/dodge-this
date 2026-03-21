# Requirements Document

## Introduction

The combo multiplier adds a risk/reward scoring layer on top of survival time. Score accumulates continuously as elapsed time multiplied by the current combo multiplier. The multiplier builds when the player stays close to obstacles (near-miss zone) and decays when the player plays it safe. Score replaces elapsed time as the primary personal best metric. Timer remains visible as context. This creates two distinct play styles: passive survival for time, or aggressive threading for score.

## Glossary

- **Score**: The primary metric, accumulated each frame as `delta × comboMultiplier`, stored in `state.score`.
- **Combo Multiplier**: A floating-point value in `[1.0, maxComboMultiplier]` stored in `state.comboMultiplier`. Builds when near obstacles, decays when safe.
- **Near-miss zone**: The same threshold used by near-miss feedback (`gameConfig.nearMissThreshold`) — the gap between obstacle edge and player edge.
- **Build rate**: How fast the multiplier increases per second while in the near-miss zone, defined in `game.config.js`.
- **Decay rate**: How fast the multiplier decreases per second while not in the near-miss zone, defined in `game.config.js`.
- **Personal Best (PB)**: The highest score achieved, stored in localStorage under `dodge_pb` (replaces the previous time-based PB).
- **HUD**: The heads-up display rendered on the canvas during gameplay.
- **Game Over screen**: The overlay shown after death with final score and PB.
- **Start screen**: The overlay shown before the first run with PB display.

## Requirements

### Requirement 1

**User Story:** As a player, I want a score that rewards aggressive play, so that threading close to obstacles feels more meaningful than just surviving.

#### Acceptance Criteria

1. WHEN the game status is `active`, THE system SHALL accumulate `state.score` each frame by adding `delta × state.comboMultiplier`.
2. WHEN the game status transitions to `grace` or `start`, THE system SHALL initialise `state.score` to 0 and `state.comboMultiplier` to 1.0.
3. WHEN the game status is `active` and at least one obstacle edge is within `gameConfig.nearMissThreshold` pixels of the player edge, THE system SHALL increase `state.comboMultiplier` at the configured build rate per second, capped at `gameConfig.maxComboMultiplier`.
4. WHEN the game status is `active` and no obstacle edge is within `gameConfig.nearMissThreshold` pixels of the player edge, THE system SHALL decrease `state.comboMultiplier` at the configured decay rate per second, floored at 1.0.

### Requirement 2

**User Story:** As a player, I want to see my current score and multiplier during play, so that I can make informed risk decisions.

#### Acceptance Criteria

1. WHEN the game status is `active` or `grace`, THE system SHALL display `state.score` prominently in the top-left of the HUD, replacing the elapsed time display.
2. WHEN the game status is `active` or `grace`, THE system SHALL display the elapsed time as a smaller secondary label below the score.
3. WHEN `state.comboMultiplier` is greater than 1.0, THE system SHALL display the multiplier value in the top-right of the HUD, replacing the speed indicator.
4. WHEN `state.comboMultiplier` equals 1.0, THE system SHALL display nothing in the multiplier slot to avoid visual noise.

### Requirement 3

**User Story:** As a player, I want my personal best to reflect my highest score, so that I have a meaningful target to beat.

#### Acceptance Criteria

1. WHEN the game ends, THE system SHALL compare `state.score` against the stored PB and write the higher value to localStorage under `dodge_pb`.
2. WHEN the game over screen is displayed, THE system SHALL show the final score and the PB score in points (rounded to nearest integer).
3. WHEN the start screen is displayed, THE system SHALL show the PB score in points if a PB exists in localStorage.
4. IF localStorage is unavailable, THEN THE system SHALL display score and PB from in-memory state only, without throwing an error.
