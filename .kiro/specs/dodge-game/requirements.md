# Requirements Document

## Introduction

DODGE is a browser-based, mouse-driven survival game with a cosmic/space aesthetic. The player controls a glowing shape confined to an inner play zone and must survive as long as possible against an endless wave of obstacles that spawn and travel through an outer zone. The game has no levels or story — only endurance, reflexes, and a clean score. This document covers all functional requirements from both the player and developer perspective.

## Glossary

- **Inner Zone**: The centered rectangle where the player shape is confined and gameplay takes place. This is the primary visual focus.
- **Outer Zone**: The larger rectangle surrounding the Inner Zone where obstacles spawn and travel. Slightly darker than the Inner Zone.
- **Player Shape**: The glowing abstract form controlled by the player's mouse cursor, confined to the Inner Zone.
- **Hitbox**: The circular collision boundary used for detecting contact between the Player Shape and obstacles or pickups.
- **Obstacle**: A moving entity that spawns in the Outer Zone and travels toward and through the Inner Zone. Contact with the Player Shape causes instant death.
- **Bonus Pickup**: A glowing collectible that spawns inside the Inner Zone and grants a temporary beneficial effect when collected by the Player Shape.
- **HUD**: Heads-Up Display. The minimal on-screen UI shown during active gameplay.
- **Game Over Screen**: The screen displayed immediately after the player dies.
- **Config**: The single `game.config.js` file that controls tunable game parameters.
- **Grace Period**: A brief delay at the start of each run before the first obstacle spawns.
- **Difficulty Curve**: The mathematical formula that increases obstacle speed and spawn rate over time.
- **Personal Best**: The player's highest survival time, stored in the browser's localStorage.
- **Session**: A single continuous run from game start to death.

---

## Requirements

### Requirement 1 — Dual Zone Layout

**User Story:** As a player, I want a clearly defined play area with a visible outer buffer zone, so that I can see obstacles approaching before they reach me and never get hit by an obstacle I couldn't see coming.

#### Acceptance Criteria

1. THE System SHALL render two centered rectangles on the canvas: an Inner Zone and an Outer Zone, where the Outer Zone fully contains the Inner Zone.
2. THE System SHALL render the Outer Zone with a visibly darker background than the Inner Zone to direct visual focus toward the Inner Zone.
3. WHEN the game canvas is initialized, THE System SHALL size both zones relative to the viewport so the layout is consistent across common screen sizes.
4. IF the browser window is resized, THEN THE System SHALL recompute and re-render both zone boundaries to maintain correct proportions.
5. THE System SHALL confine all Player Shape movement strictly within the boundaries of the Inner Zone.

---

### Requirement 2 — Player Shape and Mouse Control

**User Story:** As a player, I want my character to follow my mouse cursor precisely within the play area, so that my skill and reflexes are the only factors determining survival.

#### Acceptance Criteria

1. WHEN the player moves the mouse, THE System SHALL update the Player Shape position to match the cursor position on every animation frame.
2. WHEN the cursor position would place the Player Shape outside the Inner Zone boundary, THE System SHALL clamp the Player Shape position to the nearest valid point on the Inner Zone boundary.
3. WHEN the game initializes and no mouse movement has occurred, THE System SHALL place the Player Shape at the center of the Inner Zone.
4. THE System SHALL render the Player Shape as a glowing abstract form with a soft pulsing animation.
5. THE System SHALL use a circular Hitbox for the Player Shape whose radius matches the visible rendered size of the shape.

---

### Requirement 3 — Obstacles

**User Story:** As a player, I want a variety of obstacles that spawn from the Outer Zone and move toward me, so that each run feels different and requires active attention.

#### Acceptance Criteria

1. WHEN a new obstacle is spawned, THE System SHALL place it at a random position within the Outer Zone but outside the Inner Zone boundary.
2. WHEN an obstacle is spawned, THE System SHALL assign it a direction vector aimed generally toward the Inner Zone.
3. THE System SHALL support multiple obstacle types, each defined in the Config with its own visual size and base speed.
4. WHERE an obstacle type has `enabled: false` in the Config, THE System SHALL exclude that obstacle type from all spawn logic.
5. WHEN an obstacle travels beyond the boundaries of the Outer Zone, THE System SHALL remove it from the active obstacle list.
6. THE System SHALL assign each obstacle a circular Hitbox with radius derived from its rendered visual size.
7. WHEN a new run begins, THE System SHALL use a randomly generated seed to determine obstacle size and speed variation for that session.

---

### Requirement 4 — Collision Detection and Death

**User Story:** As a player, I want instant, unambiguous death on any obstacle contact, so that the game feels fair and the rules are always clear.

#### Acceptance Criteria

1. WHEN the Player Shape Hitbox overlaps with any obstacle Hitbox, THE System SHALL immediately trigger the death state.
2. WHEN the death state is triggered, THE System SHALL halt all game loop updates and transition to the Game Over Screen.
3. THE System SHALL perform collision checks on every animation frame while the game is in the active play state.
4. IF the Invincibility Shield bonus is active, THEN THE System SHALL suppress the death trigger for the duration of the bonus, even when Hitbox overlap occurs.

---

### Requirement 5 — Difficulty Scaling

**User Story:** As a player, I want the game to get progressively harder the longer I survive, so that there is always a meaningful challenge and no run feels like it plateaus too early.

#### Acceptance Criteria

1. WHILE the game is in the active play state, THE System SHALL increase obstacle movement speed over time according to the Difficulty Curve defined in the Config.
2. WHILE the game is in the active play state, THE System SHALL decrease the interval between obstacle spawns over time according to the Difficulty Curve defined in the Config.
3. THE System SHALL enforce a maximum obstacle count on screen at any time, defined by `maxObstaclesOnScreen` in the Config.
4. THE System SHALL enforce a minimum spawn interval floor defined by `spawnRateMin` in the Config, so the spawn rate never drops below a survivable threshold.
5. THE System SHALL enforce a maximum obstacle speed cap defined in the Config, so the game reaches a survivable plateau rather than becoming physically unwinnable.
6. WHERE the Config defines `speedScaleFactor`, `spawnRateDecayRate`, and `maxObstaclesOnScreen`, THE System SHALL apply those values to the Difficulty Curve without requiring changes to game logic code.

---

### Requirement 6 — Grace Period

**User Story:** As a player, I want a brief moment at the start of each run before obstacles appear, so that I can orient myself without being immediately overwhelmed.

#### Acceptance Criteria

1. WHEN a new run begins, THE System SHALL delay the first obstacle spawn by the duration defined by `gracePeriod` in the Config.
2. WHILE the Grace Period is active, THE System SHALL allow full Player Shape movement and render the game zones normally.
3. THE System SHALL start the survival timer at zero when the run begins, including during the Grace Period.

---

### Requirement 7 — Bonus Pickups

**User Story:** As a player, I want bonus pickups to appear during a run that give me temporary advantages, so that there are moments of excitement and strategic opportunity beyond pure dodging.

#### Acceptance Criteria

1. WHEN a Bonus Pickup spawns, THE System SHALL place it at a random position fully within the Inner Zone.
2. WHEN the Player Shape Hitbox overlaps with a Bonus Pickup Hitbox, THE System SHALL activate that bonus effect and remove the pickup from the field.
3. THE System SHALL support the following bonus types: Slow-mo, Invincibility Shield, Screen Clear, and Shrink.
4. WHERE a bonus type has `enabled: false` in the Config, THE System SHALL exclude that bonus type from all spawn logic.
5. WHEN Slow-mo is active, THE System SHALL reduce all obstacle movement speeds by 60% for the duration defined in the Config.
6. WHEN Invincibility Shield is active, THE System SHALL prevent the death trigger for the duration defined in the Config and render a visually distinct glow on the Player Shape.
7. WHEN Screen Clear is activated, THE System SHALL immediately remove all active obstacles from the field.
8. WHEN Shrink is active, THE System SHALL reduce the Player Shape Hitbox radius and visual size for the duration defined in the Config, then restore both to their original values.
9. WHEN multiple bonuses are active simultaneously, THE System SHALL apply all active effects independently without one cancelling another.
10. WHEN a bonus expires, THE System SHALL restore all affected values to their pre-bonus state.
11. THE System SHALL select which bonus type to spawn using a weighted random selection based on each bonus type's `spawnWeight` value in the Config.
12. IF all enabled bonus types have a combined `spawnWeight` of zero, THEN THE System SHALL not spawn any bonus pickups and SHALL log a warning to the browser console.

---

### Requirement 8 — HUD

**User Story:** As a player, I want a minimal HUD that shows only what I need during play, so that nothing distracts me from the game.

#### Acceptance Criteria

1. WHILE the game is in the active play state, THE System SHALL display a live survival timer in seconds, updated every animation frame, in a corner of the screen.
2. WHILE one or more bonuses are active, THE System SHALL display each active bonus as a labeled countdown timer on the HUD.
3. WHEN a bonus expires, THE System SHALL remove its entry from the HUD immediately.

---

### Requirement 9 — Game Over Screen

**User Story:** As a player, I want a clear Game Over screen that shows my result and lets me restart instantly, so that I can process my run and jump back in without friction.

#### Acceptance Criteria

1. WHEN the death state is triggered, THE System SHALL display the Game Over Screen showing the survival time for the current run.
2. THE System SHALL retrieve the Personal Best from localStorage and display it on the Game Over Screen.
3. IF the current run's survival time exceeds the stored Personal Best, THEN THE System SHALL update the Personal Best in localStorage before displaying the Game Over Screen.
4. IF localStorage is unavailable or throws an error, THEN THE System SHALL display the Game Over Screen without the Personal Best value and SHALL NOT throw an unhandled exception.
5. WHEN the player activates the Restart button, THE System SHALL reset all game state and begin a new run immediately, including a new Grace Period.
6. THE System SHALL display a Share button that, when activated, copies a text string containing the player's survival time to the clipboard.
7. IF the Clipboard API is unavailable, THEN THE System SHALL display the share text in a selectable text field as a fallback.

---

### Requirement 10 — Config-Driven Tuning

**User Story:** As a developer, I want a single config file that controls all tunable game parameters, so that I can adjust game feel without touching game logic code.

#### Acceptance Criteria

1. THE System SHALL read all tunable parameters from a single `game.config.js` file at startup.
2. THE Config SHALL define obstacle types, each with: `enabled`, `baseSpeed`, and `spawnWeight`.
3. THE Config SHALL define bonus types, each with: `enabled`, `duration`, and `spawnWeight`.
4. THE Config SHALL define difficulty curve parameters: `speedScaleFactor`, `spawnRateMin`, `spawnRateDecayRate`, `maxObstaclesOnScreen`, and a speed cap value.
5. THE Config SHALL define `gracePeriod` in milliseconds.
6. THE Config SHALL define the Player Shape's base Hitbox radius.
7. IF any required Config value is missing or invalid, THEN THE System SHALL fall back to a hardcoded default value and SHALL log a warning to the browser console identifying the missing key.

---

### Requirement 11 — Visual Aesthetic

**User Story:** As a player, I want the game to feel like deep space, so that the atmosphere enhances immersion and makes the experience visually distinct.

#### Acceptance Criteria

1. THE System SHALL render a dark background with a subtle star-field or cosmic particle effect.
2. THE System SHALL render obstacles with high-contrast glowing colors (e.g. white, red, orange).
3. THE System SHALL render each Bonus Pickup type in a distinct, consistent color that differs from obstacle colors.
4. THE System SHALL render the Player Shape with a soft continuous pulse animation.
5. WHEN the Invincibility Shield is active, THE System SHALL render a visually distinct glow effect on the Player Shape that differs from the default pulse.

---

### Requirement 12 — Dev Config Panel

**User Story:** As a developer, I want an in-browser config panel I can open at any time to toggle and tune game parameters, so that I can playtest different configurations without editing files or reloading the page.

#### Acceptance Criteria

1. WHEN the developer presses the `P` key, THE System SHALL toggle the visibility of the Config Panel overlay without interrupting the current game state.
2. THE Config Panel SHALL display controls for all togglable parameters: each obstacle type (`enabled`), each bonus type (`enabled`), `gracePeriod`, `maxObstaclesOnScreen`, and `maxSpeedMultiplier`.
3. WHEN the Config Panel is open and the game is in the active play state, THE System SHALL pause the game loop so the player is not penalized while adjusting settings.
4. WHEN the developer clicks the "Restart with changes" button in the Config Panel, THE System SHALL write all current panel values to the runtime config object and begin a new run immediately.
5. THE System SHALL NOT apply Config Panel changes to an in-progress run — changes take effect only on the next restart triggered from the panel.
6. WHEN the Config Panel is closed without clicking "Restart with changes", THE System SHALL discard any unsaved panel changes and resume the game from its paused state.
7. IF a slider value is set outside the valid range for its parameter, THEN THE System SHALL clamp the value to the nearest valid bound and display the clamped value in the panel.
