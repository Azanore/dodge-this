# Design Document — Near-Miss Feedback

## Overview

Near-miss feedback detects when an obstacle passes close to the player without hitting and responds with a white expanding ring (reusing the existing flash system) and a short "CLOSE!" text label. A per-obstacle cooldown stamp prevents spam when an obstacle lingers in the near-miss zone across multiple frames.

## Architecture

The feature is purely additive — no existing logic is removed or restructured.

```
gameUpdate.js
  └── calls checkNearMisses(state, triggerNearMiss) [new, in collision.js]
        └── for each obstacle: compute gap, check cooldown, stamp lastNearMissAt
              └── calls triggerNearMiss(x, y) [new export, renderer.js]
                    └── pushes to existing flashes[] with near-miss style
                    └── resets nearMissText timer [new module-level state, renderer.js]
```

## Components and Interfaces

### collision.js — `checkNearMisses(state, onNearMiss)`
- Iterates `state.obstacles`
- Computes gap: `sqrt(dx²+dy²) - obs.radius - player.radius`
- If `0 < gap <= nearMissThreshold` and `now - obs.lastNearMissAt > NEAR_MISS_COOLDOWN`: fires `onNearMiss(player.x, player.y)`, stamps `obs.lastNearMissAt = now`
- Skips dead/start/paused states (caller guards this via gameUpdate)

### renderer.js — `triggerNearMiss(x, y)`
- Pushes a near-miss ring into `flashes[]`: white, shorter duration (220ms), smaller max radius
- Resets `nearMissText = { remaining: 600 }` — single object, no stacking

### renderer.js — render loop addition
- If `nearMissText.remaining > 0`: draw "CLOSE!" above player, alpha = remaining/600, decrement each frame

### game.config.js additions
```js
nearMissThreshold: 40,   // px gap between edges that counts as near-miss
```

### gameUpdate.js addition
- Import `triggerNearMiss` from renderer
- Call `checkNearMisses(state, triggerNearMiss)` in the `active` block

## Data Models

### Obstacle (addition)
```js
{ ...existing, lastNearMissAt: 0 }  // timestamp ms, 0 = never triggered
```

### renderer.js module state (addition)
```js
let nearMissText = { remaining: 0 };  // single label, reset on each near-miss
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property Reflection:**
- 1.1 (gap threshold triggers event) and 2.1 (cooldown prevents re-trigger) are distinct — one tests the trigger condition, one tests the suppression condition. Both kept.
- 1.2 (ring pushed to flashes) and 2.2 (multiple obstacles = multiple rings) — 2.2 subsumes 1.2 since if multiple works, single works. Consolidate into one property.
- 1.3 and 2.3 both test nearMissText state — consolidate: one property covers "text is set on trigger and reset on repeat".

---

Property 1: Near-miss fires within threshold, not outside
*For any* obstacle and player position where the edge gap is within `(0, nearMissThreshold]`, `checkNearMisses` should trigger the callback. *For any* gap outside that range (≤0 is collision, >threshold is safe), it should not trigger.
**Validates: Requirements 1.1**

Property 2: Per-obstacle cooldown suppresses re-trigger
*For any* obstacle that just triggered a near-miss (stamped `lastNearMissAt = now`), calling `checkNearMisses` again immediately should not fire the callback. After the cooldown window elapses, it should fire again.
**Validates: Requirements 2.1**

Property 3: Each near-miss pushes exactly one ring to flashes, multiple obstacles push independently
*For any* set of N obstacles all within near-miss range (and past cooldown), calling `checkNearMisses` should result in exactly N new entries in the flashes array.
**Validates: Requirements 1.2, 2.2**

Property 4: Near-miss text resets on repeat, never stacks
*For any* sequence of near-miss triggers, `nearMissText.remaining` should always equal 600 immediately after the last trigger — never accumulate beyond 600, never produce more than one text entry.
**Validates: Requirements 1.3, 2.3**

---

## Error Handling

- If `localStorage` is unavailable, near-miss is purely in-memory — no persistence needed, no error handling required.
- If `state.obstacles` is empty, `checkNearMisses` iterates zero times — no-op, no error.

## Testing Strategy

### Property-Based Testing
Using **fast-check** (already available in the project via vitest).

Each property test runs a minimum of 100 iterations with randomly generated inputs.

Each property-based test is tagged with:
`// **Feature: near-miss-feedback, Property {N}: {property_text}**`

- **Property 1** — generate random obstacle/player positions, compute expected gap, assert trigger/no-trigger
- **Property 2** — generate obstacle with `lastNearMissAt = Date.now()`, assert no re-trigger; advance time past cooldown, assert triggers
- **Property 3** — generate N obstacles all in near-miss range, assert flashes grows by N
- **Property 4** — call triggerNearMiss twice, assert `nearMissText.remaining === 600` and no duplicate entries

### Unit Tests
- Gap exactly at threshold boundary (0 and nearMissThreshold) — edge cases
- Invincibility active — near-miss still fires (Requirement 1.4)
