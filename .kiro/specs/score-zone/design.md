# Design Document — Score Zone

## Overview

The Score Zone replaces the obstacle-proximity combo trigger in `combo.js`. A circular zone spawns periodically inside the inner zone, wanders slowly, and drives three distinct multiplier behaviors: build (inside zone), fast decay (outside zone while active), normal decay (zone inactive). The zone is rendered as a pulsing green circle outline.

## Architecture

```
gameUpdate.js (active block)
  ├── updateScoreZone(delta, state, accumulators)  [replaces updateComboMultiplier, in combo.js]
  │     ├── advances accumulators.scoreZone timer
  │     ├── spawns/expires zone
  │     ├── wanders zone center within inner zone
  │     └── mutates state.comboMultiplier (build / fast decay / normal decay)
  └── state.score += delta * state.comboMultiplier  [unchanged]

renderer.js
  └── draws zone circle outline when state.scoreZone.active

GameState.js
  └── scoreZone: { active: false } added to resetState()

game.config.js
  └── scoreZoneInterval, scoreZoneDuration, scoreZoneRadius,
      scoreZoneWanderSpeed, comboFastDecayRate added
```

## Components and Interfaces

### combo.js — replace `updateComboMultiplier` with `updateScoreZone(delta, state, accumulators)`
- Advances `accumulators.scoreZone += delta`
- If zone inactive and `accumulators.scoreZone >= gameConfig.scoreZoneInterval`: spawn zone, reset accumulator
- If zone active: decrement `state.scoreZone.remaining -= delta`, expire if <= 0
- If zone active: wander center, clamp to inner zone bounds
- Determine player inside/outside zone via circle point test
- Mutate `state.comboMultiplier` accordingly

### renderer.js addition
- In `render()`, after bonus pickups: if `state.scoreZone.active`, draw pulsing circle outline at zone center with radius, color `#00ff88`, subtle glow

### GameState.js addition
- `scoreZone: { active: false }` in `resetState()`

### gameUpdate.js change
- Replace `updateComboMultiplier(delta, state)` call with `updateScoreZone(delta, state, accumulators)`
- Add `accumulators.scoreZone = 0` to accumulator init in `main.js`

### game.config.js additions
```js
scoreZoneInterval: 8000,     // ms between zone appearances
scoreZoneDuration: 5000,     // ms zone stays active
scoreZoneRadius: 60,         // px radius of the score zone
scoreZoneWanderSpeed: 40,    // px per second wander speed
comboFastDecayRate: 2.4,     // multiplier lost/sec when zone active, player outside (3x normal)
```

## Data Models

### state.scoreZone
```js
{
  active: false,      // is zone currently visible
  x: 0,              // center x
  y: 0,              // center y
  radius: 0,         // from config at spawn time
  remaining: 0,      // ms until expiry
  vx: 0,             // wander velocity x (px/ms)
  vy: 0              // wander velocity y (px/ms)
}
```

### accumulators addition
```js
accumulators.scoreZone = 0   // ms since last zone spawn
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: Zone spawns at configured interval
*For any* sequence of delta values that sum to at least `scoreZoneInterval` ms, `updateScoreZone` should transition `state.scoreZone.active` from false to true exactly once per interval.
**Validates: Requirements 1.1**

Property 2: Zone expires after configured duration
*For any* sequence of delta values that sum to at least `scoreZoneDuration` ms after spawn, `state.scoreZone.active` should become false.
**Validates: Requirements 1.2**

Property 3: Zone center always stays within inner zone bounds
*For any* wander step, the zone center `(x, y)` should always satisfy `innerZone.x <= x <= innerZone.x + innerZone.width` and `innerZone.y <= y <= innerZone.y + innerZone.height`.
**Validates: Requirements 1.3**

Property 4: Multiplier builds when player is inside active zone, capped at max
*For any* starting multiplier below `comboMultiplierMax` and any positive delta, with an active zone containing the player, `state.comboMultiplier` should increase and never exceed `comboMultiplierMax`.
**Validates: Requirements 2.1**

Property 5: Multiplier decays fast when zone active and player outside, floored at 1.0
*For any* starting multiplier above 1.0 and any positive delta, with an active zone not containing the player, `state.comboMultiplier` should decrease at `comboFastDecayRate` and never drop below 1.0.
**Validates: Requirements 2.2**

Property 6: Multiplier decays normally when zone inactive, floored at 1.0
*For any* starting multiplier above 1.0 and any positive delta, with no active zone, `state.comboMultiplier` should decrease at `comboDecayRate` and never drop below 1.0.
**Validates: Requirements 2.3**

## Error Handling

- Inner zone not yet computed at spawn time: `recomputeZones()` is called before game loop starts — safe.
- Zone wander clamping: velocity reversal on boundary contact prevents zone from escaping bounds.

## Testing Strategy

### Property-Based Testing
Using **fast-check**. Minimum 100 iterations per property. Tagged:
`// **Feature: score-zone, Property {N}: {property_text}**`

- **Property 1** — generate random delta sequences summing past interval, verify spawn
- **Property 2** — generate random delta sequences summing past duration, verify expiry
- **Property 3** — generate random positions/velocities, verify center stays in bounds after wander
- **Property 4** — generate random multiplier below max, player inside zone, verify increase + cap
- **Property 5** — generate random multiplier above 1.0, player outside active zone, verify fast decrease + floor
- **Property 6** — generate random multiplier above 1.0, no active zone, verify normal decrease + floor

### Unit Tests
- `resetState()` contains `scoreZone: { active: false }`
- Restart resets `scoreZone` and `accumulators.scoreZone`
- Zone expiry while player inside applies normal decay (edge case 2.4)
