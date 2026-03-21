# Design Document — Combo Multiplier

## Overview

Score accumulates each frame as `delta × comboMultiplier`. The multiplier floats between 1.0 and a configured max, building when the player is in the near-miss zone and decaying when safe. Score replaces elapsed time as the PB metric. The HUD shows score prominently, time as secondary, and multiplier top-right only when above 1.0.

## Architecture

Purely additive. No existing logic is removed.

```
gameUpdate.js (active block)
  ├── updateComboMultiplier(delta, state)   [new, in combo.js]
  │     └── checks near-miss zone via same gap math as collision.js
  │     └── mutates state.comboMultiplier
  └── state.score += delta * state.comboMultiplier

gameOver.js
  └── reads/writes state.score as PB (replaces state.elapsed)

hud.js
  └── renders score (primary), elapsed (secondary), multiplier (top-right, hidden at 1.0)

renderer.js / renderStartScreen
  └── reads dodge_pb as score points

GameState.js
  └── score: 0, comboMultiplier: 1.0 added to resetState()

game.config.js
  └── comboMultiplierMax, comboBuildRate, comboDecayRate added
```

## Components and Interfaces

### combo.js (new file)
- `updateComboMultiplier(delta, state)` — checks all obstacles for near-miss gap, builds or decays multiplier accordingly, mutates `state.comboMultiplier`
- No imports from renderer — pure logic, fully testable

### gameUpdate.js changes
- Import `updateComboMultiplier` from `combo.js`
- In active block: call `updateComboMultiplier(delta, state)`, then `state.score += delta * state.comboMultiplier`

### GameState.js changes
- Add `score: 0` and `comboMultiplier: 1.0` to `resetState()`

### hud.js changes
- Primary display (top-left, large): score as integer points
- Secondary display (below score, small): elapsed time in seconds
- Top-right: multiplier value only when `> 1.0`, hidden otherwise

### gameOver.js changes
- PB read/write uses `state.score` instead of `state.elapsed`
- Display shows score in points (rounded), PB in points

### renderer.js — renderStartScreen changes
- PB display reads `dodge_pb` and shows as integer points (was seconds)

### game.config.js additions
```js
comboMultiplierMax: 5.0,   // hard cap on combo multiplier
comboBuildRate: 1.5,       // multiplier units gained per second while near obstacle
comboDecayRate: 0.8,       // multiplier units lost per second while safe
```

## Data Models

### State additions
```js
score: 0,             // accumulated score points (float, display as integer)
comboMultiplier: 1.0  // current multiplier, range [1.0, comboMultiplierMax]
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: Score accumulates proportionally to multiplier
*For any* sequence of frames with known delta values and a fixed comboMultiplier, the total score accumulated should equal the sum of `delta × comboMultiplier` across all frames.
**Validates: Requirements 1.1**

Property 2: Multiplier builds when near obstacle, capped at max
*For any* starting multiplier below `comboMultiplierMax` and any positive delta, after one frame with an obstacle in the near-miss zone, `state.comboMultiplier` should be strictly greater than before, and never exceed `comboMultiplierMax`.
**Validates: Requirements 1.3**

Property 3: Multiplier decays when safe, floored at 1.0
*For any* starting multiplier above 1.0 and any positive delta, after one frame with no obstacle in the near-miss zone, `state.comboMultiplier` should be strictly less than before, and never drop below 1.0.
**Validates: Requirements 1.4**

Property 4: PB write always stores the higher of score and existing PB
*For any* final score and any existing PB value, after game over the stored PB should equal `Math.max(score, existingPB)`.
**Validates: Requirements 3.1**

## Error Handling

- localStorage unavailable: `readPB`/`writePB` already have try/catch — no changes needed.
- `state.obstacles` empty: `updateComboMultiplier` iterates zero times, multiplier decays normally — correct behavior.

## Testing Strategy

### Property-Based Testing
Using **fast-check** (already in the project).

Each property test runs minimum 100 iterations. Tagged with:
`// **Feature: combo-multiplier, Property {N}: {property_text}**`

- **Property 1** — generate random arrays of `{delta, multiplier}` pairs, verify accumulated score matches sum
- **Property 2** — generate random starting multiplier in `[1.0, max)` and delta, place obstacle in near-miss zone, verify multiplier increases and stays ≤ max
- **Property 3** — generate random starting multiplier in `(1.0, max]` and delta, no obstacles, verify multiplier decreases and stays ≥ 1.0
- **Property 4** — generate random score and PB pairs, verify stored value equals max of both

### Unit Tests
- `resetState()` includes `score: 0` and `comboMultiplier: 1.0`
- HUD renders score as primary, time as secondary, multiplier hidden at 1.0
- Game over screen shows score in points, not seconds
