# Requirements Document

## Introduction

This document covers bug fixes and missing features identified in the current DODGE implementation. The issues fall into three categories: a critical collision bug (player hitbox never synced to game state), a missing start/pause screen, and several secondary bugs around module scoping, state initialization, and dual radius tracking. The goal is a fully playable, correctly wired game.

## Glossary

- **GameState**: The central plain object (`state`) passed to all game modules containing player position, obstacles, bonuses, and active effects.
- **Player Hitbox**: The circular collision boundary at `state.player.{x, y, radius}` used by `collision.js`.
- **Player Module**: `player.js` — tracks raw mouse position and computes the clamped player position each frame.
- **Start Screen**: A canvas overlay shown before the first run begins, displaying the game title and a prompt to start.
- **Pause Screen**: A canvas overlay shown when the player manually pauses during an active run.
- **Config Panel**: The existing dev overlay toggled by the `P` key.
- **Grace Period**: The brief delay at the start of each run before the first obstacle spawns.
- **slowmoMultiplier**: A numeric field on GameState controlling obstacle speed reduction during the Slow-mo bonus.
- **Module Scope**: The ES module scope — `const` declarations in one module are not accessible in another unless explicitly exported/imported.

---

## Requirements

### Requirement 1 — Player Hitbox Sync

**User Story:** As a player, I want my character's collision boundary to match where I see it on screen, so that hits and pickups feel accurate and fair.

#### Acceptance Criteria

1. WHEN `player.js` computes a new clamped position each frame, THE System SHALL write that position to `state.player.x` and `state.player.y` so that `collision.js` reads the correct location.
2. WHEN the Shrink bonus activates or expires, THE System SHALL update `state.player.radius` as the single source of truth for hitbox radius, and `player.js` SHALL read radius from `state.player.radius` rather than maintaining a separate internal radius variable.
3. WHEN `collision.js` performs overlap checks, THE System SHALL use `state.player` directly without calling `getHitbox()` from `player.js`, eliminating the dual-state problem.

---

### Requirement 2 — Start Screen

**User Story:** As a player, I want a start screen when I first open the game, so that I can orient myself and choose when to begin rather than being dropped into an active grace period immediately.

#### Acceptance Criteria

1. WHEN the game page loads, THE System SHALL display a Start Screen on the canvas before any game loop update or obstacle logic runs.
2. THE Start Screen SHALL display the game title and a clear prompt indicating how to begin (e.g. clicking or pressing a key).
3. WHEN the player activates the start action on the Start Screen, THE System SHALL transition to the grace period and begin the game loop.
4. WHEN the game is in the Start Screen state, THE System SHALL NOT spawn obstacles, update elapsed time, or run collision checks.
5. WHEN the player restarts after a Game Over, THE System SHALL skip the Start Screen and go directly to the grace period, consistent with the existing restart flow.

---

### Requirement 3 — Pause Screen

**User Story:** As a player, I want to be able to pause the game during an active run, so that I can step away without dying.

#### Acceptance Criteria

1. WHEN the player presses the `Escape` key during an active run or grace period, THE System SHALL pause the game loop and display a Pause Screen overlay on the canvas.
2. THE Pause Screen SHALL display a "Paused" label and a prompt to resume.
3. WHEN the player presses `Escape` again while paused, THE System SHALL resume the game loop from the exact state it was in when paused.
4. WHEN the Config Panel is open, THE System SHALL NOT also show the Pause Screen — the two overlays are mutually exclusive.
5. WHEN the game is in the dead or start-screen state, THE System SHALL ignore the `Escape` key pause action.

---

### Requirement 4 — GameConfig Global Scope Fix

**User Story:** As a developer, I want the game config to be reliably accessible across all ES modules, so that no module silently reads `undefined` for config values.

#### Acceptance Criteria

1. THE System SHALL load `game.config.js` such that `gameConfig` is accessible as a reliable global (`window.gameConfig`) before any game module executes.
2. WHEN any game module reads `gameConfig`, THE System SHALL guarantee the object is fully initialized and validated before first use.
3. THE `index.html` SHALL load `game.config.js` as a non-module classic script so that `gameConfig` is assigned to `window` before the module graph executes.

---

### Requirement 5 — GameState Initialization Completeness

**User Story:** As a developer, I want the initial game state to include all fields that game modules read, so that no module encounters `undefined` on first access.

#### Acceptance Criteria

1. THE `resetState()` function SHALL include `slowmoMultiplier: 1` in the returned state object so that `updateObstacles` and `collectBonus` never rely on a nullish fallback.
2. THE `resetState()` function SHALL initialize `player.radius` from `gameConfig.playerHitboxRadius` so the hitbox is correct from frame zero.
