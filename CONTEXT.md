# DODGE — Project Context

This file is a living log for AI-assisted development sessions. Read it at the start of every session to avoid re-covering ground already discussed.

---

## What this game is

A browser-based survival game. The player controls a glowing dot with the mouse, confined to an inner zone. Obstacles spawn from the outer zone and move toward the inner zone. The goal is to survive as long as possible. Bonuses spawn periodically and grant temporary effects.

Deployed at: https://dodge-this.vercel.app
Repo: https://github.com/Azanore/dodge-this (branch: master)

---

## Architecture

### Key constraint: game.config.js is a classic script, not a module

`game.config.js` sets `window.gameConfig` and is loaded as a plain `<script>` in `index.html` — NOT `type="module"`. This is intentional. It must execute synchronously before the ES module graph runs so that `gameConfig` is available globally when modules like `GameState.js` and `obstacles.js` initialize. Never add `export default` to this file. Autofixers (like Kiro's autofix) have broken this before by adding an export.

### Module structure

```
index.html              — loads game.config.js (classic), then src/main.js (module)
game.config.js          — global config, window.gameConfig, classic script
src/main.js             — entry point, wires everything, handles DOM/events
src/gameUpdate.js       — pure game logic per frame, no DOM, fully testable
src/GameState.js        — resetState() returns fresh state object
src/GameLoop.js         — requestAnimationFrame loop, calls update() then render()
src/player.js           — tracks mouse, writes clamped position to state.player each frame
src/zones.js            — innerZone / outerZone geometry, recomputed on resize
src/obstacles.js        — spawn, move, remove obstacles
src/bonuses.js          — spawn, collect, expire bonus effects
src/collision.js        — circle-circle overlap, player vs obstacles/bonuses
src/difficulty.js       — speed multiplier and spawn interval curves (pure functions)
src/renderer.js         — all canvas drawing, reads state, no logic
src/hud.js              — timer and active bonus countdowns on canvas
src/gameOver.js         — game over overlay, PB logic, restart/R-key wiring
src/configPanel.js      — dev panel toggled by P key, runtime config tuning
```

### State machine

```
'start' → (click or any key except Escape) → 'grace' → (grace expires) → 'active' → (collision) → 'dead'
                                                                                                        ↓
                                                                                          (R or Restart button) → 'grace'
'active' or 'grace' → (Escape) → 'paused' → (Escape) → restores prior status
```

- `prevStatus` on state stores the pre-pause status so resume is exact.
- Restart after game over goes directly to `'grace'`, never back to `'start'`.
- Escape is ignored in `'dead'` and `'start'` states.
- The P key opens the dev config panel. While the panel is open, Escape does not pause.

### Why gameUpdate.js exists

`main.js` has DOM side effects (canvas, event listeners) so it can't be imported in tests. The pure frame logic was extracted into `gameUpdate.js` which takes `(delta, state, accumulators)` and returns `'dead'` or `null`. This is what integration tests call directly.

### Player position

`player.js` listens to `mousemove` and stores raw coordinates. Each frame, `update(state)` clamps them to `innerZone` and writes to `state.player.x/y`. This is the single source of truth for position. `collision.js` reads `state.player` directly — there is no separate hitbox object.

### Render order (important)

`GameLoop.tick()` calls `update(delta)` then `render()` in sequence. When death is detected in `update`, `loop.stop()` and `showGameOver()` are called — but `render()` still runs on the same tick. To prevent the game over screen from being overwritten, `renderFrame()` returns early when `state.status === 'dead'`.

### Overlay opacity logic

- Start screen: `rgba(0,0,0,0.92)` — nearly opaque, player dot is hidden (not rendered in `'start'` status)
- Pause screen: `rgba(0,0,0,0.6)` — semi-transparent, frozen game frame intentionally visible underneath
- Game over: `rgba(0,0,0,0.78)` — drawn once by `showGameOver()`, loop is stopped, nothing overwrites it

### Personal best

Stored in `localStorage` under key `dodge_pb` as a float (ms). Read and displayed on both the start screen and game over screen. Written on death if current run beats the stored value.

---

## Bugs fixed (do not re-investigate)

### 1. Collision never triggered (player always at 0,0)
`player.js` was storing position in module-local variables. `collision.js` was reading `state.player` which was never updated. Fixed by making `player.update(state)` write directly to `state.player.x/y` each frame.

### 2. Game over screen immediately overwritten
`GameLoop.tick()` calls `update()` then `render()`. Death was detected in `update()`, game over screen drawn, then `render()` ran on the same tick and painted over it. Fixed by guarding `renderFrame()` with `if (state.status === 'dead') return`.

### 3. Escape key starting the game
`onStartAction` listened on `window keydown` for any key including Escape. Pressing Escape would start the game and immediately trigger the pause handler in the same event. Fixed by skipping Escape in `onStartAction`.

### 4. game.config.js export breaking on Vercel
Kiro's autofix added `export default` to `game.config.js`. Since it's loaded as a classic script, the browser threw `Unexpected token 'export'`. The file must never have an export. The comment at the top of the file now explicitly states this.

### 5. Player dot visible on start screen
The player was rendered before the start screen overlay was drawn. Since the overlay is semi-transparent, the glowing dot bled through. Fixed by skipping player rendering when `state.status === 'start'`.

### 6. resetState() missing slowmoMultiplier
Modules were using `state.slowmoMultiplier ?? 1` as a fallback. Fixed by adding `slowmoMultiplier: 1` to `resetState()`.

### 7. getHitbox() dual-state problem
`player.js` had a separate `getHitbox()` export that returned internal `posX/posY`. `collision.js` was calling it instead of reading `state.player`. Removed entirely — `state.player` is the only source of truth.

---

## Testing

- Framework: Vitest + fast-check (property-based testing)
- Run: `npm test` (runs `vitest --run`)
- Test files mirror source files: `src/foo.test.js` tests `src/foo.js`
- `src/integration.test.js` tests the full game flow using the real `gameUpdate()` with real state
- `src/test.setup.js` loads `game.config.js` to provide `window.gameConfig` in the test environment

### What is tested
- `collision.js` — circle overlap math
- `player.js` — position sync to state (property: for any mouse x/y, state.player matches clampToInner)
- `GameState.js` — resetState completeness
- `obstacles.js` — spawn and movement
- `bonuses.js` — collect and expire effects
- `difficulty.js` — speed and spawn interval curves
- `zones.js` — zone geometry
- `config.js` — validation and fallbacks
- `main.test.js` — start/pause/dead state guards (uses local helper functions, not real update())
- `integration.test.js` — real gameUpdate() end-to-end: start → grace → active → death, pause/resume, restart

### Known test gap
`main.test.js` simulates the logic with local helper functions (`applyEscape`, `updateGuard`) rather than importing the real `update()`. These helpers can drift from the real implementation. The integration tests cover the real logic, but `main.js` event wiring (click handlers, keydown listeners) is not tested.

---

## Deployment

- Platform: Vercel (static, no build step)
- `vercel.json` rewrites all routes to `index.html`
- Framework preset: Other, root directory: `./`, no build command
- Auto-deploys on push to `master`
- `node_modules` is gitignored and not deployed

---

## Known gaps and future ideas

### Gameplay
- No mobile/touch support — player position is mouse-only
- No sound effects or music
- Obstacles always aim at a random point in the inner zone — they never track the player directly
- No high score leaderboard (PB is local only)
- No difficulty selection before starting

### UX
- No favicon (404 on every load, harmless but noisy)
- No visual feedback when a bonus is collected (just the HUD countdown appearing)
- The dev config panel (P key) is visible in production — could be hidden behind a flag

### Code
- `src/GameState.js` exports both `resetState()` and a singleton `state` — the singleton is unused, only `resetState()` is used
- `BONUS_COLORS` is defined in both `bonuses.js` and `renderer.js` — minor duplication
- `configPanel.js` is large and could be split, but it works and is self-contained
