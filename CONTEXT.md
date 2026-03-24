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
| 8 | Double-shrink permanently shrinks player | Re-stacking shrink overwrote `prevRadius` with already-shrunk value | `collectBonus` now preserves original `prevRadius` on re-stack via `activeEffects.shrink?.prevRadius` |

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
1. ~~Near-miss feedback~~ — done session 5
2. ~~Combo multiplier + Score Zone~~ — done session 6
3. ~~Value tuning~~ — done session 7
4. **Difficulty presets** — easy/normal/hard, only after gameplay is stable.
5. **Sound effects** — death sting, bonus chime, ambient hum.
6. **Achievements** — depends on near-miss count, combo streaks, survival milestones all being stable first.

---

## Backlog

Grouped by effort. All of these fit the current architecture without major rewrites.

### Quick wins (low effort, high impact)
- (none remaining)

### Medium effort (worth a dedicated session)
- **Sound effects** — death sting, bonus collect chime, background ambient hum. Needs a decision on asset format (Web Audio API synth vs. audio files).
- **Difficulty presets** — easy/normal/hard. Defer until gameplay is stable. Per-difficulty PB keys: `dodge_pb_easy`, `dodge_pb_normal`, `dodge_pb_hard`. Migrate existing `dodge_pb` to normal on first load.
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

| `combo.test.js` | Score zone spawn/expiry/wander bounds, multiplier build/decay (6 property tests) |

**Known gap:** `main.test.js` uses local helper functions that simulate the logic rather than importing the real `update()`. DOM event wiring (click handlers, keydown listeners) is not tested.

---

## Changelog

### Session 1
- Fixed bugs 1–7 (see table above)
- Added start screen, pause screen, game over screen
- Extracted `gameUpdate.js` for testability
- Added integration tests (`src/integration.test.js`)
- Deployed to Vercel

### Session 11
- Migrated how-to-play modal from canvas to HTML/CSS — proper scroll, contrast, and text rendering
- `?` button is now an HTML `<button>` (fixed bottom-right), shown only on start/pause screens
- Shape icons in modal are inline `<canvas>` elements drawn once on open using exported draw functions
- `renderHowToPlay()` deleted from renderer.js; `?` button and help link removed from canvas screens
- `glowCircle`, `drawBall`, `drawBullet`, `drawShard`, `drawTracker` exported from renderer.js
- Modal closes on backdrop click or Escape; Escape no longer unpauses while modal is open
- Blast radius: `index.html`, `src/renderer.js`, `src/main.js`

### Session 10
- Difficulty tuning: `baseSpawnInterval` 1800 → 1200ms (pressure from second 1), base speeds bumped (ball 0.18→0.22, bullet 0.26→0.30, shard 0.22→0.26, tracker 0.11→0.13)
- PB now stores `{ score, elapsed }` as JSON — legacy numeric values auto-migrated on read
- Game over screen shows `Score: X  •  Ys` and `Best: X pts  •  Ys`
- Start screen shows `Best: X pts  •  Ys`

### Session 9
- Difficulty curve tuned to hit full chaos at ~75s (Option A)
- `speedScaleFactor` 0.35 → 0.5 (hits ~3.2x at 75s, ~3.26x at 90s)
- `spawnRateDecayRate` 0.04 → 0.05 (spawn floor reached at ~30s instead of ~38s)
- `maxSpeedMultiplier` 4.0 → 3.5 (cap feels intense but survivable)

### Session 8
- Added `src/audio.js` — self-contained audio module, removable via `// AUDIO` markers in callers
- 7 sound files in `/sounds`: `death`, `pickup`, `score-bank`, `multiplier-max`, `game-start`, `near-miss`, `zone-appear`, `music`
- Music loops continuously — survives death and restart, only pauses on Escape, resumes from exact position
- Sound triggers: death SFX on death, pickup on bonus collect, score-bank on pending score bank, multiplier-max on hitting 5x, near-miss on close call, zone-appear on score zone spawn, game-start on first play
- `playMultiplierMax` has 2s cooldown to prevent double-fire when briefly dipping below 5x and returning
- All other sounds are event-driven one-shots with no double-fire risk
- Audio toggles (SFX / Music) added to pause screen as canvas buttons — instant effect, persisted in localStorage
- Audio removed from dev config panel (P key) — belongs with player settings, not dev config

### Session 7
- Score math fixed: `state.score` always ticks at base rate; `state.pendingScore` accumulates only the bonus delta `baseTick * (multiplier - 1)` while multiplier > 1x
- Pending score lost on death, banked into real score when multiplier returns to 1x
- `triggerScoreBump()` fires on bank — score number scales up 18% with brighter glow for 220ms
- HUD redesigned: score large white, `x2.3` green inline, `+47` mint inline — all on one line; timer below
- Multiplier always visible: dimmed at x1.0, full glow when active
- Score zone radius bumped from 60px to 90px
- Score formula changed from `delta * multiplier` to `(delta/1000) * 10` — numbers now in hundreds not hundreds-of-thousands
- `scoreZoneRadius` moved to `game.config.js` (was already there, confirmed correct)

### Session 13
- `drawObstacle()` if/else chain replaced with `OBSTACLE_DRAW` map lookup in `renderer.js`
- Slowmo bonus now also slows spawn rate — `accumulators.spawn` advances at `slowmoMultiplier` rate in `gameUpdate.js`; fade-out already handles smooth recovery

### Session 12
- Score zone "inside" feedback: subtle green fill + brighter/thicker outline when player is inside zone (`renderer.js`)
- Multiplier label floats above zone circle — self-teaches the mechanic to new players
- Pending score color: mint when safe, amber (`#ffaa44`) when draining (player outside active zone) — `hud.js`
- HUD redesign: score top-center (28px), bank pulse flashes green + scales 35% over 380ms, timer dimmed
- Bonus pills moved top-right-of-center, fixed width, depleting color fill left-to-right — `hud.js`
- Floating `+X` banked score text spawns at score zone position, floats up and fades over 800ms — `renderer.js`, `gameUpdate.js`
- Inner zone wall contact pulse: cyan line segment spreads along wall from hit point, once per contact — `renderer.js`
- Pause screen and game over screen migrated from canvas to HTML/CSS overlays — consistent with how-to-play modal pattern
- `renderPauseScreen()` deleted from `renderer.js`; `gameOver.js` rewritten as HTML-driven module
- Manual canvas hit-area detection for pause buttons removed from `main.js`; replaced with real HTML button listeners
- Fixed: player radius not accounted for in zone clamping — ball no longer visually exits inner zone — `player.js`
- Fixed: score zone spawn/wander didn't account for zone radius — zone could bleed outside inner zone — `combo.js`

### Session 6
- Added combo multiplier system: `state.score` (delta × comboMultiplier), `state.comboMultiplier` in `[1.0, 5.0]`
- Score replaces elapsed time as PB metric — `dodge_pb` now stores score points, not ms
- Added Score Zone: circular wandering zone inside inner zone, appears every 8s for 5s
- Zone drives multiplier: build inside (1.5/s), fast decay outside active zone (2.4/s), normal decay inactive (0.8/s)
- `combo.js` created with `updateScoreZone(delta, state, accumulators)`
- `accumulators.scoreZone` added to `main.js`, reset on restart
- HUD updated: score primary (top-left large), elapsed secondary (small below), multiplier top-right hidden at 1.0
- Game over and start screen updated to show score in points
- `nearMissThreshold` reduced from 40px to 20px for tighter near-miss detection
- 6 property-based tests in `combo.test.js`, 4 in `collision.test.js`
- Values to watch: `scoreZoneInterval`, `scoreZoneDuration`, `comboFastDecayRate` — may need tuning after play-testing with tracker

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
