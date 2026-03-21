# Requirements Document

## Introduction

The Score Zone replaces the proximity-to-obstacle combo trigger with a player-controlled spatial mechanic. A circular zone periodically appears inside the inner play zone, wanders slowly, and rewards the player for staying inside it with a building combo multiplier. Leaving the zone while it is active causes faster multiplier decay. When the zone is inactive, multiplier decays at the normal rate. This gives the player a deliberate risk/reward decision every cycle: chase the zone for score, or prioritize survival.

## Glossary

- **Score Zone**: A circular area that appears periodically inside the inner zone, wanders slowly, and builds the combo multiplier while the player is inside it.
- **Zone active**: The period during which the Score Zone is visible and affects the multiplier.
- **Zone inactive**: The period between Score Zone appearances — no zone is visible, multiplier decays normally.
- **Inner zone**: The existing rectangular play area defined in `zones.js` where the player can move.
- **Combo multiplier**: `state.comboMultiplier`, a float in `[1.0, comboMultiplierMax]` that scales score accumulation.
- **Build rate**: Multiplier units gained per second while the player is inside the Score Zone.
- **Normal decay rate**: Multiplier units lost per second when the zone is inactive or the zone just disappeared.
- **Fast decay rate**: Multiplier units lost per second when the zone is active but the player is outside it. Faster than normal decay.
- **Wander**: Slow continuous movement of the Score Zone center within the inner zone bounds.

## Requirements

### Requirement 1

**User Story:** As a player, I want a visible zone to appear periodically that I can enter to build my multiplier, so that I have a deliberate scoring decision to make.

#### Acceptance Criteria

1. WHEN the game status is `active`, THE system SHALL spawn a Score Zone inside the inner zone every `gameConfig.scoreZoneInterval` milliseconds.
2. WHEN a Score Zone spawns, THE system SHALL keep it active for `gameConfig.scoreZoneDuration` milliseconds, then remove it.
3. WHEN a Score Zone is active, THE system SHALL move its center slowly within the inner zone bounds at `gameConfig.scoreZoneWanderSpeed` pixels per second, reversing direction when it would exit the inner zone.
4. WHEN a Score Zone is active, THE system SHALL render it as a pulsing circle outline with a distinct color that does not conflict with obstacles or bonus pickups.

### Requirement 2

**User Story:** As a player, I want the multiplier to respond differently depending on whether I am inside or outside the zone, so that my position has clear consequences.

#### Acceptance Criteria

1. WHEN a Score Zone is active and the player center is within the Score Zone radius, THE system SHALL increase `state.comboMultiplier` at `gameConfig.comboBuildRate` per second, capped at `gameConfig.comboMultiplierMax`.
2. WHEN a Score Zone is active and the player center is outside the Score Zone radius, THE system SHALL decrease `state.comboMultiplier` at `gameConfig.comboFastDecayRate` per second, floored at 1.0.
3. WHEN no Score Zone is active, THE system SHALL decrease `state.comboMultiplier` at `gameConfig.comboDecayRate` per second, floored at 1.0.
4. WHEN a Score Zone disappears while the player is inside it, THE system SHALL apply normal decay rate, not fast decay rate.

### Requirement 3

**User Story:** As a developer, I want the Score Zone to integrate cleanly with the existing state and game loop, so that it adds minimal complexity.

#### Acceptance Criteria

1. THE system SHALL store Score Zone state in `state.scoreZone` as `{ active: bool, x, y, radius, remaining, vx, vy }`, initialised to `{ active: false }` in `resetState()`.
2. WHEN the game status transitions to `grace`, THE system SHALL reset `state.scoreZone` to `{ active: false }` and reset the spawn accumulator.
3. THE Score Zone spawn interval SHALL be tracked via a dedicated accumulator in `gameUpdate.js`, consistent with the existing spawn/bonus accumulator pattern.
