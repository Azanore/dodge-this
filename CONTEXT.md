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
- Dev config panel (P key) — toggle obstacle/bonus types, tune parameters at runtime; includes hitbox debug toggle
- 4 bonus types: slowmo, invincibility, screenclear, shrink
- 4 obstacle types: ball, bullet, shard, tracker — distinct shapes, weighted spawn, difficulty ramp over time
- Tracker obstacle — homing diamond that permanently hunts the player, only removed by screenclear bonus
- Vercel deployment (static, no build step, `vercel.json` rewrites to index.html)

### Deliberately not added
- **Share button** — removed. `navigator.clipboard` requires HTTPS + user gesture; the textarea fallback was janky. No real value for a solo survival game.
- **Backend leaderboard** — would require a server, auth, and moderation. Changes the game's nature. Local PB is enough.
- **Touch/mobile support** — the game is mouse-only by design. Adding touch would require rethinking the entire input model and zone layout.
- **Sound** — not ruled out, but adds asset management complexity. Worth a dedicated session if added.

### Pending / ideas for later
See the Backlog section below.

### Planned (next sessions, in order)
1. **Near-miss feedback** — ring + "CLOSE!" text when an obstacle passes within threshold. Per-obstacle cooldown stamp prevents spam. Prereq for combo multiplier.
2. **Combo multiplier** — score = elapsed × multiplier. Multiplier builds when near obstacles, decays when safe. Score replaces PB as primary metric. Timer becomes context.
3. **Difficulty presets** — easy/normal/hard, only after gameplay is stable.
4. **Sound effects** — death sting, bonus chime, ambient hum.
5. **Achievements** — depends on near-miss count, combo streaks, survival milestones all being stable first.

---

## Backlog

Grouped by effort. All of these fit the current architecture without major rewrites.

### Quick wins (low effort, high impact)
- (none remaining)

### Medium effort (worth a dedicated session)
- **Sound effects** — death sting, bonus collect chime, background ambient hum. Needs a decision on asset format (Web Audio API synth vs. audio files).
- **Difficulty presets** — easy/normal/hard. Defer until gameplay is stable — tuning 3 presets while mechanics are still changing is wasted effort. Per-difficulty PB keys: `dodge_pb_easy`, `dodge_pb_normal`, `dodge_pb_hard`. Migrate existing `dodge_pb` to normal on first load.
- **Near-miss feedback** — ring + "CLOSE!" text when obstacle passes within threshold. Per-obstacle `lastNearMissAt` cooldown (~600ms) prevents spam. Prereq for combo multiplier.
- **Combo multiplier** — score = elapsed × multiplier, accumulated continuously. Multiplier builds in near-miss zone, decays when safe. Score is primary PB metric; timer is context. HUD shows score prominently, multiplier in existing indicator slot.
- **Achievements** — near-miss count, combo streaks, survival milestones. Implement last when all metrics are stable.

### Larger scope (plan carefully before starting)
- **Touch/mobile** — the game is mouse-only by design. Adding touch requires rethinking input, zone sizing for small screens, and the entire feel. Not a small change.
- **Global leaderboard** — requires a backend, auth, and anti-cheat. Changes the game's social nature entirely. Only worth it if the game gets real traffic.
- **Obstacle patterns / waves** — scripted formations instead of pure random spawning. High design effort, risk of breaking the emergent feel of the current system.

### Deliberately out of scope (don't revisit without a strong reason)
- **Multiplayer** — different architecture entirely.
- **Level system** — endless survival is the identity of the game. Levels would break the format.
- **Share button** — removed in session 2. `navigator.clipboard` requires HTTPS + user gesture; no real value for a solo game.

---

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

### Session 5
- Added near-miss feedback: white expanding ring + "CLOSE!" fading text when an obstacle passes within 40px of the player edge
- Per-obstacle `lastNearMissAt` cooldown (600ms) prevents spam when an obstacle lingers in the zone
- `checkNearMisses(state, onNearMiss)` added to `collision.js`, wired in `gameUpdate.js` after death check
- `triggerNearMiss(x, y)` added to `renderer.js`, reuses existing `flashes[]` system
- `nearMissThreshold: 40` added to `game.config.js`
- `lastNearMissAt: 0` added to each spawned obstacle in `obstacles.js`
- 4 property-based tests added covering: threshold detection, cooldown suppression, multi-obstacle rings, text reset

### Session 4
- Distinct obstacle shapes: bullet = capsule, shard = triangle, ball = circle, tracker = spinning diamond
- Added hitbox debug toggle to config panel (DEBUG section, yellow wireframe circles)
- Added tracker obstacle: homing diamond, `turnRate: 0.08`, `baseSpeed: 0.13`, permanent until screenclear
- Updated backlog: removed completed items, tracker and visual distinction marked done

### Session 3
- Added SVG favicon (inline data URI, cyan glowing dot)
- Added screen shake on death (400ms decaying jitter, `triggerShake()` in renderer.js)
- Added bonus collection flash (expanding ring at pickup location, `triggerBonusFlash()` in renderer.js)
- Added speed multiplier indicator to HUD (top-right, subtle grey, live from `getCurrentSpeedMultiplier`)
- Updated backlog: removed completed quick wins, added obstacle visual distinction item

### Session 2
- Removed Share button
- Added R-to-restart shortcut on game over screen
- Added PB display on start screen
- Reduced grace period from 2000ms to 500ms
- Fixed player dot visible on start screen (bug 5)
- Added `CONTEXT.md`
