# Requirements Document

## Introduction

Near-miss feedback adds a visual and textual response when an obstacle passes close to the player without hitting. It rewards skilled play by acknowledging dangerous moments, and serves as the foundation for the combo multiplier system. The feature must feel responsive without being noisy — successive near-misses should not spam the screen.

## Glossary

- **Near-miss**: An obstacle that passes within the near-miss threshold distance of the player edge without triggering a collision.
- **Near-miss threshold**: The configurable pixel gap between obstacle edge and player edge that qualifies as a near-miss.
- **Per-obstacle cooldown**: A timestamp stamped on each obstacle preventing it from triggering more than one near-miss event within a cooldown window.
- **Flash ring**: An expanding, fading circle rendered around the player, reusing the existing `flashes` array in `renderer.js`.
- **Near-miss text**: A short string ("CLOSE!") rendered near the player that fades out over a short duration.
- **Player**: The cyan dot controlled by mouse, represented by `state.player` with `x`, `y`, and `radius`.
- **Obstacle**: Any active obstacle object in `state.obstacles` with `x`, `y`, `radius`, and `lastNearMissAt`.

## Requirements

### Requirement 1

**User Story:** As a player, I want visual and textual feedback when an obstacle barely misses me, so that I feel rewarded for skillful dodging.

#### Acceptance Criteria

1. WHEN the gap between an obstacle edge and the player edge is greater than 0 and less than or equal to the near-miss threshold, THEN the system SHALL trigger a near-miss event for that obstacle.
2. WHEN a near-miss event is triggered, THEN the system SHALL render an expanding white ring centered on the player position.
3. WHEN a near-miss event is triggered, THEN the system SHALL render a "CLOSE!" text label near the player that fades out within 600ms.
4. WHEN a near-miss event is triggered during an active invincibility effect, THEN the system SHALL still trigger the near-miss feedback.

### Requirement 2

**User Story:** As a player, I want near-miss feedback to stay readable even when multiple obstacles pass close simultaneously, so that the screen does not become cluttered.

#### Acceptance Criteria

1. WHEN a near-miss event fires for an obstacle, THEN the system SHALL stamp that obstacle with the current timestamp and SHALL NOT fire another near-miss event for that same obstacle until the cooldown window (600ms) has elapsed.
2. WHEN multiple obstacles trigger near-miss events in the same frame, THEN the system SHALL render one ring and one text label per event, each independently animated.
3. WHEN a near-miss text label is already visible and a new near-miss occurs, THEN the system SHALL reset the text label timer rather than stacking duplicate labels.

### Requirement 3

**User Story:** As a developer, I want near-miss detection to reuse existing collision infrastructure, so that the feature adds minimal complexity.

#### Acceptance Criteria

1. WHEN near-miss detection runs each frame, THEN the system SHALL compute distance using the same circle-distance math already used in `collision.js`.
2. WHEN a near-miss ring is rendered, THEN the system SHALL reuse the existing `flashes` array and animation system in `renderer.js`.
3. THE near-miss threshold SHALL be defined as a named constant in `game.config.js` alongside other tunable parameters.
