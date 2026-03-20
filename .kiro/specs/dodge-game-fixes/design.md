# Design Document — DODGE Bug Fixes & Missing Features

## Overview

This document covers five targeted fixes to the existing DODGE codebase. The changes are surgical — no module is rewritten beyond what's needed to fix the identified issue.

**Issues addressed:**
1. Player hitbox never synced to `state.player` — collisions and pickups never trigger
2. Missing Start Screen — game drops player into grace period immediately on load
3. Missing Pause Screen — no way to pause during a run
4. `game.config.js` loaded as ES module — `gameConfig` global unreliable across module graph
5. `resetState()` missing `slowmoMultiplier` field — modules rely on nullish fallback

---

## Architecture

No new files are introduced. Changes are confined to:

```
index.html              # Fix 4: change game.config.js to classic script
game.config.js          # Fix 4: remove module export, keep window assignment
src/GameState.js        # Fix 5: add slowmoMultiplier to resetState()
src/player.js           # Fix 1: accept state param, write x/y to state.player
src/main.js             # Fix 1+2+3: sync player→state, add start/pause states
src/renderer.js         # Fix 2+3: render start screen and pause overlay
```

---

## Components and Interfaces

### Fix 1 — Player Hitbox Sync

**Problem:** `player.js` stores position in module-local `posX/posY`. `collision.js` reads `state.player.{x,y}`. These are never connected — `state.player` stays at `{x:0, y:0, radius:14}` forever.

**Solution:** `player.update()` receives `state` as a parameter and writes directly to `state.player.x` and `state.player.y` each frame. `player.js` no longer maintains a separate radius variable — it reads `state.player.radius` for clamping and rendering. `getHitbox()` is removed; `collision.js` uses `state.player` directly.

`setRadius` / `resetRadius` in `player.js` are removed. `bonuses.js` already writes to `state.player.radius` — that remains the single source of truth.

```js
// player.js — updated signature
export function update(state) {
  if (rawX === null) {
    state.player.x = innerZone.x + innerZone.width / 2;
    state.player.y = innerZone.y + innerZone.height / 2;
  } else {
    const clamped = clampToInner(rawX, rawY);
    state.player.x = clamped.x;
    state.player.y = clamped.y;
  }
}
```

`renderer.js` reads `state.player` directly instead of calling `getHitbox()`.

### Fix 2 — Start Screen

**Problem:** Game loop starts immediately on page load. Player is dropped into grace period with no warning.

**Solution:** Add a `'start'` status to `GameState`. On page load, `state.status = 'start'` and the game loop does not start. `renderer.js` renders a start overlay when status is `'start'`. A click or keypress on the canvas transitions to `'grace'` and starts the loop. Restart after Game Over sets status to `'grace'` directly (skips start screen).

New status flow:
```
'start' → (click/key) → 'grace' → (grace expires) → 'active' → (death) → 'dead'
                                                                         ↓
                                                              (restart) → 'grace'
```

### Fix 3 — Pause Screen

**Problem:** No way to pause during a run.

**Solution:** Add a `'paused'` status. `Escape` key during `'active'` or `'grace'` stops the loop and sets `state.status = 'paused'`. `Escape` again resumes. `renderer.js` renders a pause overlay when status is `'paused'`. Mutually exclusive with Config Panel (Config Panel already stops the loop; Escape is ignored when panel is open).

A `prevStatus` field is stored on state when pausing so resume restores the correct prior status (`'grace'` or `'active'`).

### Fix 4 — Config Global Scope

**Problem:** `game.config.js` is loaded as `type="module"`. ES modules have their own scope — `const gameConfig` is not on `window` until the module executes. The `window.gameConfig = gameConfig` line at the bottom of the module runs asynchronously with the rest of the module graph, creating a race condition.

**Solution:** Load `game.config.js` as a classic (non-module) `<script>` tag. `const` in a classic script at top level is block-scoped to the script but `var` or a direct `window` assignment makes it global. Change `const gameConfig = {...}` to `window.gameConfig = {...}` directly, removing the `export default`. This guarantees `window.gameConfig` is set synchronously before any module in the graph runs.

```html
<!-- index.html -->
<script src="game.config.js"></script>  <!-- classic, not module -->
<script type="module" src="src/main.js"></script>
```

```js
// game.config.js — no const, no export
window.gameConfig = {
  gracePeriod: 2000,
  // ...
};
```

### Fix 5 — GameState Initialization

**Problem:** `resetState()` does not include `slowmoMultiplier`. Modules use `state.slowmoMultiplier ?? 1` as a fallback, which works but is inconsistent and fragile.

**Solution:** Add `slowmoMultiplier: 1` to `resetState()`. No other changes needed.

---

## Data Models

### Updated GameState shape
```js
{
  status: 'start' | 'grace' | 'active' | 'paused' | 'dead',
  prevStatus: null | 'grace' | 'active',  // used to restore state after unpause
  elapsed: 0,
  graceRemaining: 0,
  obstacles: [],
  bonuses: [],
  activeEffects: {},
  slowmoMultiplier: 1,           // NEW — was missing from resetState()
  player: { x, y, radius },
  personalBest: 0
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

**Property Reflection (redundancy check):**
- 1.1 (player position synced to state) is a universal property over all mouse positions — kept.
- 2.4 (no updates in start state) is a universal property over any number of ticks — kept.
- 3.3 (pause/unpause round trip) is a round-trip property — kept.
- 3.5 (Escape ignored in dead/start states) is a property over those states — kept.
- 2.1, 2.3, 2.5, 3.1, 3.4, 5.1, 5.2 are specific examples — kept as unit test examples, not properties.
- 1.2, 1.3, 4.x are architectural constraints — not separately testable beyond existing properties.

---

**Property 1: Player position always synced to state**
*For any* mouse (x, y) position, after calling `player.update(state)`, `state.player.x` and `state.player.y` must equal the result of `clampToInner(x, y)`.
**Validates: Requirements 1.1**

---

**Property 2: No game updates occur in start state**
*For any* number of `update(delta)` calls while `state.status === 'start'`, `state.obstacles.length` must remain 0 and `state.elapsed` must remain 0.
**Validates: Requirements 2.4**

---

**Property 3: Pause/unpause is a round trip**
*For any* game state snapshot where `status` is `'active'` or `'grace'`, pausing then immediately unpausing must restore `state.status` to its original value and leave all other state fields unchanged.
**Validates: Requirements 3.3**

---

**Property 4: Escape is ignored in terminal/pre-game states**
*For any* game state where `status` is `'dead'` or `'start'`, dispatching an Escape keydown event must not change `state.status`.
**Validates: Requirements 3.5**

---

## Error Handling

| Scenario | Behavior |
|---|---|
| `gameConfig` undefined at module load | Fixed by loading as classic script — cannot occur after fix |
| `state.slowmoMultiplier` undefined | Fixed by adding field to `resetState()` |
| Escape pressed while Config Panel open | Escape handler checks panel visibility before acting |
| Pause pressed during dead state | Ignored — no status change |
| Start screen click during dead state | Cannot occur — start screen only shown in 'start' status |

---

## Testing Strategy

### Framework
- **Unit + Property tests**: `fast-check` (existing)
- **Test runner**: Vitest (existing)
- Minimum 100 iterations per property test

### Unit Tests (examples)
- Initial status is `'start'` on page load
- Clicking/pressing key on start screen transitions to `'grace'`
- Restart after Game Over goes to `'grace'`, not `'start'`
- Escape during `'active'` sets status to `'paused'`
- Escape while Config Panel open does not pause
- `resetState()` includes `slowmoMultiplier: 1`
- `resetState()` sets `player.radius` to `gameConfig.playerHitboxRadius`

### Property-Based Tests

Tag format: `**Feature: dodge-game-fixes, Property {N}: {property_text}**`

| Property | Test file | Generator |
|---|---|---|
| Property 1: player position synced | `player.test.js` | `arbPoint` (any x/y including OOB) |
| Property 2: no updates in start state | `main.test.js` | `fc.integer({min:1, max:200})` for tick count |
| Property 3: pause/unpause round trip | `main.test.js` | `fc.constantFrom('active','grace')` for status |
| Property 4: Escape ignored in terminal states | `main.test.js` | `fc.constantFrom('dead','start')` for status |

### Test File Structure
```
src/
├── player.test.js     # NEW — Property 1
├── main.test.js       # NEW — Properties 2, 3, 4 + unit examples
└── (existing tests unchanged)
```
