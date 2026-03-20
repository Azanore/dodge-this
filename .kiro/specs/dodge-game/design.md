# Design Document — DODGE

## Overview

DODGE is a single-page browser game built with vanilla JavaScript and the HTML5 Canvas API. No frameworks, no build tools — just a single HTML file, a JS game engine, and a config file. The architecture is a classic game loop: update state, then render. All game logic is separated from rendering, and all tunable values live in the config.

The dual-zone layout (Inner Zone + Outer Zone) is the core spatial model. The player is confined to the Inner Zone. Obstacles live in the Outer Zone and pass through the Inner Zone. This separation solves the spawn-on-player problem and gives the player visual warning before contact is possible.

---

## Architecture

```
index.html
├── game.config.js         # All tunable parameters
└── src/
    ├── main.js            # Entry point, bootstraps game
    ├── GameLoop.js        # requestAnimationFrame loop, delta time
    ├── GameState.js       # Central state object (active, dead, paused)
    ├── zones.js           # Inner/Outer zone geometry, resize handling
    ├── player.js          # Player position, hitbox, clamping, rendering
    ├── obstacles.js       # Obstacle pool, spawning, movement, removal
    ├── bonuses.js         # Bonus pickup spawning, activation, expiry
    ├── collision.js       # Circle-circle intersection, all collision checks
    ├── difficulty.js      # Difficulty curve calculations
    ├── hud.js             # Timer, active bonus display
    ├── gameOver.js        # Game Over screen, localStorage, share
    └── renderer.js        # Background, star field, zone rendering
```

The game loop calls `update(delta)` then `render()` on every frame. Each module exposes a clean interface. No module reaches into another module's internals — they communicate through the central `GameState` object.

---

## Components and Interfaces

### GameLoop
- Drives `requestAnimationFrame`
- Computes delta time between frames (capped at 100ms to prevent spiral-of-death on tab switch)
- Calls `update(delta)` → `render()` each frame

### GameState
Central plain object passed by reference to all modules:
```js
{
  status: 'grace' | 'active' | 'dead',
  elapsed: 0,           // ms survived
  graceRemaining: 0,    // ms left in grace period
  obstacles: [],
  bonuses: [],          // active bonus pickups on field
  activeEffects: {},    // { slowmo: {remaining}, shrink: {remaining}, invincibility: {remaining} }
  player: { x, y, radius },
  personalBest: 0
}
```

### zones.js
- Computes `innerZone` and `outerZone` as `{ x, y, width, height }` from viewport size
- Outer zone is 30% larger than inner zone on each axis (configurable)
- Listens to `window.resize`, recomputes, re-renders
- Exports `clampToInner(x, y)` used by player.js

### player.js
- Tracks raw mouse position via `mousemove` listener
- On each update, clamps position to inner zone using `clampToInner`
- Initializes at inner zone center
- Exports `getHitbox()` → `{ x, y, radius }`
- Radius sourced from config, modified by Shrink effect

### obstacles.js
- Maintains an array of active obstacle objects: `{ x, y, vx, vy, radius, type }`
- `spawnObstacle()`: picks a random enabled type by weight, places it in outer zone outside inner zone, assigns velocity toward a random point in the inner zone
- `updateObstacles(delta)`: moves all obstacles, removes those outside outer zone bounds
- Speed of each obstacle = `baseSpeed * currentSpeedMultiplier * sessionVariance`
- `sessionVariance` is a per-run random float in range [0.85, 1.15] per obstacle

### bonuses.js
- Maintains field pickups and active effects separately
- `trySpawnBonus()`: called on a timer; picks weighted random enabled bonus type, places in inner zone
- `collectBonus(type)`: activates effect, starts countdown in `activeEffects`
- `updateEffects(delta)`: ticks down all active effects, triggers expiry cleanup
- Slow-mo: sets a `speedMultiplier` on GameState read by obstacles.js
- Shrink: sets `player.radius` to `shrinkRadius` from config
- Invincibility: sets `activeEffects.invincibility`; collision.js checks this before triggering death
- Screen Clear: calls `obstacles.clearAll()`

### collision.js
- `circlesOverlap(a, b)`: returns true if distance between centers < sum of radii
- `checkPlayerObstacles(state)`: iterates obstacles, calls circlesOverlap with player hitbox
- `checkPlayerBonusPickups(state)`: iterates field pickups, triggers collection on overlap
- Called every frame during `active` and `grace` states (bonus collection works during grace)

### difficulty.js
- `getCurrentSpeedMultiplier(elapsed)`: `1 + speedScaleFactor * log(1 + elapsed / 1000)` — logarithmic ramp
- `getCurrentSpawnInterval(elapsed)`: `max(spawnRateMin, baseInterval * e^(-spawnRateDecayRate * elapsed/1000))`
- Both formulas use config values exclusively
- Speed multiplier is capped at `config.maxSpeedMultiplier`

### hud.js
- Renders timer as `Math.floor(elapsed / 1000)` seconds
- Renders active effects as colored labels with remaining time
- All rendering is Canvas 2D text/shapes, no DOM elements during gameplay

### gameOver.js
- On death: reads localStorage `dodge_pb`, compares, writes if new best
- Wraps all localStorage calls in try/catch
- Renders Game Over overlay on canvas
- Restart button: resets GameState, re-enters grace period
- Share button: calls `navigator.clipboard.writeText(...)`, falls back to rendering a selectable `<textarea>` in DOM if unavailable

### renderer.js
- Renders in order: background → star field → outer zone → inner zone → obstacles → bonus pickups → player → HUD
- Star field: array of static points generated once at init, rendered as small glowing dots
- Glow effects: Canvas `shadowBlur` + `shadowColor` on relevant draw calls

---

## Data Models

### Obstacle
```js
{
  type: string,        // key from config obstacle types
  x: number,
  y: number,
  vx: number,         // pixels per ms
  vy: number,
  radius: number,     // derived from config visual size
}
```

### BonusPickup (on field)
```js
{
  type: 'slowmo' | 'invincibility' | 'screenclear' | 'shrink',
  x: number,
  y: number,
  radius: number,     // fixed pickup hitbox size
  color: string       // from config, per type
}
```

### ActiveEffect
```js
{
  remaining: number   // ms remaining
}
```

### Config Shape
```js
{
  gracePeriod: 2000,
  playerHitboxRadius: 14,
  outerZoneScale: 1.3,
  maxSpeedMultiplier: 4.0,
  difficulty: {
    speedScaleFactor: 0.6,
    spawnRateDecayRate: 0.04,
    spawnRateMin: 400,
    baseSpawnInterval: 1800,
    maxObstaclesOnScreen: 25
  },
  obstacleTypes: {
    ball:   { enabled: true, baseSpeed: 0.18, spawnWeight: 5 },
    bullet: { enabled: true, baseSpeed: 0.32, spawnWeight: 3 },
    shard:  { enabled: true, baseSpeed: 0.22, spawnWeight: 2 }
  },
  bonusTypes: {
    slowmo:         { enabled: true, duration: 5000, spawnWeight: 3 },
    invincibility:  { enabled: true, duration: 4000, spawnWeight: 2 },
    screenclear:    { enabled: true, duration: 0,    spawnWeight: 1 },
    shrink:         { enabled: true, duration: 6000, spawnWeight: 3 }
  }
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

**Property Reflection (redundancy check before listing):**
- 1.3 (zones scale with viewport) and 1.4 (zones recompute on resize) both test zone geometry computation — merged into Property 1.
- 5.4 (spawn interval floor) and 5.5 (speed cap) are both upper/lower bound properties on difficulty functions — kept separate as they test different functions.
- 7.8 (shrink round trip) and 7.10 (bonus expiry restores state) overlap — 7.10 is the general case that subsumes 7.8. Merged into Property 9.
- 3.1 (spawn position in outer, not inner) is the core spawn invariant. 3.2 (velocity toward inner) is a separate directional property — both kept.

---

**Property 1: Zone containment for any viewport**
*For any* viewport width and height, the computed Inner Zone must be fully contained within the Outer Zone (outerZone.x ≤ innerZone.x, outerZone.y ≤ innerZone.y, and the right/bottom edges of inner are within outer).
**Validates: Requirements 1.1, 1.3, 1.4**

---

**Property 2: Mouse clamping keeps player inside Inner Zone**
*For any* mouse (x, y) position — including positions outside the canvas, at negative coordinates, or beyond viewport bounds — `clampToInner(x, y)` must return a point that lies within or on the boundary of the Inner Zone.
**Validates: Requirements 1.5, 2.2**

---

**Property 3: Obstacle spawn position is in Outer Zone but not Inner Zone**
*For any* call to `spawnObstacle()`, the resulting obstacle's (x, y) position must satisfy: inside outer zone bounds AND outside inner zone bounds.
**Validates: Requirements 3.1**

---

**Property 4: Obstacle velocity points toward Inner Zone**
*For any* spawned obstacle, the dot product of its velocity vector (vx, vy) with the vector from its spawn position to the inner zone center must be positive (i.e. it is moving toward the inner zone).
**Validates: Requirements 3.2**

---

**Property 5: Out-of-bounds obstacles are removed**
*For any* obstacle whose position has moved outside the Outer Zone boundaries, after calling `updateObstacles(delta)`, that obstacle must not appear in the active obstacles array.
**Validates: Requirements 3.5**

---

**Property 6: Collision detection is geometrically correct**
*For any* two circles A and B, `circlesOverlap(A, B)` must return true if and only if the Euclidean distance between their centers is strictly less than the sum of their radii.
**Validates: Requirements 4.1**

---

**Property 7: Difficulty speed multiplier is monotonically non-decreasing**
*For any* two elapsed times t1 and t2 where t2 > t1 ≥ 0, `getCurrentSpeedMultiplier(t2)` must be greater than or equal to `getCurrentSpeedMultiplier(t1)`.
**Validates: Requirements 5.1**

---

**Property 8: Difficulty functions respect their configured bounds**
*For any* elapsed time value, `getCurrentSpawnInterval(elapsed)` must be greater than or equal to `config.difficulty.spawnRateMin`, and `getCurrentSpeedMultiplier(elapsed)` must be less than or equal to `config.maxSpeedMultiplier`.
**Validates: Requirements 5.4, 5.5**

---

**Property 9: Bonus expiry restores pre-bonus state (round trip)**
*For any* bonus type, activating the bonus and then advancing time past its duration must result in all game state values modified by that bonus (player radius, speed multiplier, etc.) returning to their exact pre-activation values.
**Validates: Requirements 7.8, 7.10**

---

**Property 10: Collected bonus pickups are removed from the field**
*For any* bonus pickup on the field, after `checkPlayerBonusPickups` detects an overlap with the player hitbox, that pickup must not appear in the field pickups array.
**Validates: Requirements 7.2**

---

**Property 11: Slow-mo reduces all obstacle speeds by 60%**
*For any* set of obstacles with any base speeds, when the slow-mo effect is active, each obstacle's effective speed must equal 40% (±1%) of its pre-slow-mo speed.
**Validates: Requirements 7.5**

---

**Property 12: Config fallback for any missing key**
*For any* config object with one or more required keys removed, the system's config loader must return the hardcoded default for each missing key and must not throw an exception.
**Validates: Requirements 10.7**

---

**Property 13: Obstacle count never exceeds configured maximum**
*For any* game state after any number of update ticks, `gameState.obstacles.length` must be less than or equal to `config.difficulty.maxObstaclesOnScreen`.
**Validates: Requirements 5.3**

---

## Error Handling

| Scenario | Behavior |
|---|---|
| localStorage unavailable | try/catch around all reads/writes; game over screen renders without personal best |
| Clipboard API unavailable | fallback to DOM `<textarea>` with share text pre-selected |
| All obstacle types disabled | no obstacles spawn; console warning logged |
| All bonus types disabled | no bonuses spawn; no error |
| Bonus spawnWeights all zero | no bonuses spawn; console warning logged |
| Missing config key | hardcoded default used; console warning with key name |
| Tab loses focus (blur) | delta time capped at 100ms on resume to prevent spiral-of-death |
| Canvas resize during active play | zones recomputed; player position re-clamped to new inner zone |

---

## Testing Strategy

### Framework

- **Unit + Property tests**: [fast-check](https://github.com/dubzzz/fast-check) (JavaScript property-based testing library)
- **Test runner**: [Vitest](https://vitest.dev/) — zero-config, fast, works with vanilla JS modules
- Each property-based test runs a minimum of **100 iterations**

### Unit Tests

Unit tests cover specific examples and edge cases:
- Player initializes at inner zone center
- Invincibility suppresses death on collision
- Grace period prevents obstacle spawning
- Personal best updates correctly in localStorage
- Multiple bonuses active simultaneously apply all effects
- localStorage failure does not throw

### Property-Based Tests

Each correctness property from the design is implemented as a single property-based test using fast-check. Tests are tagged with the property they implement.

Tag format: `**Feature: dodge-game, Property {N}: {property_text}**`

Generators to implement:
- `arbViewport`: generates `{ width, height }` with realistic browser dimensions (320–3840 x 240–2160)
- `arbPoint`: generates `{ x, y }` across a wide range including out-of-bounds values
- `arbObstacle`: generates obstacle objects with random position, velocity, radius
- `arbElapsed`: generates elapsed time values from 0 to 600,000ms (10 minutes)
- `arbConfig`: generates config objects with random subsets of keys removed

### Test File Structure

```
src/
├── collision.test.js       # Property 6
├── zones.test.js           # Properties 1, 2
├── obstacles.test.js       # Properties 3, 4, 5, 13
├── difficulty.test.js      # Properties 7, 8
├── bonuses.test.js         # Properties 9, 10, 11
└── config.test.js          # Property 12
```
