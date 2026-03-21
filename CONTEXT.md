# DODGE — Project Context

Read this at the start of every session. Update the changelog at the bottom when work is done.

Live: https://dodge-this.vercel.app | Repo: https://github.com/Azanore/dodge-this (master)

---

## Architecture decisions (the non-obvious ones)

**game.config.js is a classic script, never a module.**
It sets `window.gameConfig` synchronously before the ES module graph runs. Never add `export default`. Autofixers have broken this before. The `<script src="game.config.js">` in index.html has no `type="module"` — that's intentional.

**gameUpdate.js exists so logic is testable.**
`main.js` has DOM side effects and can't be imported in tests. Pure frame logic lives in `gameUpdate(delta, state, accumulators)` which returns `'dead'` or `null`. Integration tests call this directly.

**state.player is the only source of truth for position and radius.**
`player.js` writes to `state.player.x/y` every frame. `collision.js` reads `state.player` directly. There is no separate hitbox object. Bonus effects write to `state.player.radius` directly.

**Render order matters for overlays.**
`GameLoop.tick()` calls `update()` then `render()` in sequence. Death is detected in `update()` — `renderFrame()` must return early when `state.status === 'dead'` or the game over screen gets overwritten on the same tick.

**State machine:**
```
'start' → (click/key except Escape) → 'grace' → (grace expires) → 'active' → (collision) → 'dead'
                                                                                                ↓
                                                                              (R or Restart) → 'grace'
'active'/'grace' → (Escape) → 'paused' → (Escape) → restores prevStatus
```
Restart always goes to `'grace'`, never `'start'`. Escape is ignored in `'dead'` and `'start'`.

---

## Bugs fixed

| # | Bug | Root cause | Fix |
|---|-----|-----------|-----|
| 1 | Collision never triggered | `player.js` stored position internally; `state.player` was always `{0,0}` | `player.update(state)` now writes to `state.player.x/y` each frame |
| 2 | Game over screen immediately overwritten | `GameLoop` calls `render()` after `update()` on the same tick | `renderFrame()` returns early when `status === 'dead'` |
| 3 | Escape key starting the game | `onStartAction` fired on any keydown including Escape, then pause handler also fired | `onStartAction` now ignores Escape key |
| 4 | `game.config.js` broke on Vercel | Autofix added `export default`; classic script can't have exports | Removed export, added comment warning, `window.gameConfig` only |
| 5 | Player dot visible on start screen | Player rendered before overlay; glow bled through semi-transparent overlay | Player skipped in `render()` when `status === 'start'` |
| 6 | `slowmoMultiplier` undefined | Missing from `resetState()` | Added `slowmoMultiplier: 1` to `resetState()` |
| 7 | `getHitbox()` dual-state problem | `collision.js` called `getHitbox()` from `player.js` instead of reading `state.player` | Removed `getHitbox()`, `collision.js` reads `state.player` directly |

---

## Features: added, rejected, and pending

### Added
- Start screen with title, PB display, click/key to begin
- Pause screen (Escape to pause/resume), ignored in dead/start states
- Game over screen with time, PB, Restart button, R key shortcut
- Personal best stored in localStorage (`dodge_pb` key, value in ms)
- Dev config panel (P key) — toggle obstacle/bonus types, tune parameters at runtime
- 4 bonus types: slowmo, invincibility, screenclear, shrink
- 3 obstacle types: ball, bullet, shard — weighted spawn, difficulty ramp over time
- Vercel deployment (static, no build step, `vercel.json` rewrites to index.html)

### Deliberately not added
- **Share button** — removed. `navigator.clipboard` requires HTTPS + user gesture; the textarea fallback was janky. No real value for a solo survival game.
- **Backend leaderboard** — would require a server, auth, and moderation. Changes the game's nature. Local PB is enough.
- **Touch/mobile support** — the game is mouse-only by design. Adding touch would require rethinking the entire input model and zone layout.
- **Sound** — not ruled out, but adds asset management complexity. Worth a dedicated session if added.

### Pending / ideas for later
- Favicon (currently 404s on every load, harmless)
- Visual feedback on bonus collection (flash, particle, sound)
- Hide dev config panel in production (currently always accessible via P)
- Difficulty selector on start screen (easy/normal/hard presets)
- Obstacle that tracks the player instead of aiming at a fixed point
- Clean up: `GameState.js` exports an unused singleton `state` — only `resetState()` is used
- Clean up: `BONUS_COLORS` duplicated in `bonuses.js` and `renderer.js`

---

## Testing

Run: `npm test`

| File | What it covers |
|------|---------------|
| `collision.test.js` | Circle overlap math |
| `player.test.js` | Position sync property (for any x/y, state.player matches clampToInner) |
| `GameState.test.js` | resetState completeness |
| `obstacles.test.js` | Spawn and movement |
| `bonuses.test.js` | Collect and expire effects |
| `difficulty.test.js` | Speed and spawn interval curves |
| `zones.test.js` | Zone geometry |
| `config.test.js` | Validation and fallbacks |
| `main.test.js` | State guards using local helper functions (not real update()) |
| `integration.test.js` | Real `gameUpdate()` end-to-end: start→grace→active→death, pause/resume, restart |

**Known gap:** `main.test.js` uses local helper functions that simulate the logic rather than importing the real `update()`. DOM event wiring (click handlers, keydown listeners) is not tested.

---

## Changelog

### Session 1
- Fixed bugs 1–7 (see table above)
- Added start screen, pause screen, game over screen
- Extracted `gameUpdate.js` for testability
- Added integration tests (`src/integration.test.js`)
- Deployed to Vercel

### Session 2
- Removed Share button
- Added R-to-restart shortcut on game over screen
- Added PB display on start screen
- Reduced grace period from 2000ms to 500ms
- Fixed player dot visible on start screen (bug 5)
- Added `CONTEXT.md`
