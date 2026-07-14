# DODGE — Project Context

Read this at the start of every session. Update it when work is done — and when you do, verify claims against the actual code first. This file was rewritten from a full source audit because the previous version had drifted significantly from reality (undocumented systems, wrong line counts, stale test counts, phantom modules). Don't let that happen again: a changelog entry is a claim, not a fact, until someone checks the code.

Live: https://dodge-this.vercel.app | Repo: https://github.com/Azanore/dodge-this (master)

---

## What the game actually is (verified against source, July 2026)

A browser-based, cursor-controlled survival game with a cosmic/neon aesthetic. Endless waves of obstacles, no levels. Significantly more mechanically complex than the original design doc (`game design.txt`) describes — treat that file as a historical starting spec, not current documentation.

**Core loop:** dodge obstacles, survive, bank score via a combo/score-zone system, spend a charge resource (Kinetic Battery) on active abilities, chase achievements and leaderboard rank.

### Systems, verified file-by-file

**Player** (`src/entities/player.js`, 30 lines) — follows cursor exactly, position written to `state.player.x/y` every frame. Coordinate mapping accounts for CSS scale via `getBoundingClientRect()` (fixed logical canvas is 1600×900, scaled via CSS transform, not by changing geometry).

**Obstacles** (`src/entities/obstacles.js`) — 4 types: `ball`, `bullet`, `shard`, `tracker`. Config-driven (`enabled`, `baseSpeed`, `spawnWeight` per type). Trackers home in on the player (`turnRatePerMs`), have their own concurrent cap per difficulty (`maxTrackers`), ignore the outer-zone despawn boundary, and only die to Screen Clear. All obstacles have a velocity clamp (0.6) as an outlier safety net. Trackers get a 2000ms `pending` delay after spawn (a visible warning period) before they start moving/homing.

**Bonuses** (`src/entities/bonuses.js`) — 4 active types: `slowmo`, `invincibility`, `screenclear`, `shrink`. Config-driven the same way as obstacles. `slowmo` and `shrink` restore their pre-effect values on expiry (`prevMultiplier`/`prevRadius`), with fade-out easing for slowmo rather than a hard snap back to 1x.

**Difficulty** (`src/core/difficulty.js`, `game.config.js`) — 3 presets (easy/normal/hard), each with its own `speedScaleFactor`, `spawnRateDecayRate`, `spawnRateMin`, `baseSpawnInterval`, `maxObstaclesOnScreen`, `maxSpeedMultiplier`, `maxTrackers`. Curve shape is logarithmic across all three; presets differ in ceiling/ramp only.

**Combo / Score Zone** (`src/systems/combo.js`, scoring logic in `src/core/gameUpdate.js`) — a wandering circular zone appears periodically inside the inner zone. Standing inside it builds a combo multiplier (up to `comboMultiplierMax`); leaving while it's active drains it fast, leaving while inactive drains it slow. Score above the base tick (i.e. from combo multiplier, or from being fully-charged) accumulates as `pendingScore` — at risk, lost on death, banked as a lump sum when the multiplier drops back to 1x.

**Kinetic Battery + Abilities** (`src/systems/abilities.js`, `game.config.js: battery`) — this system did not exist in any prior documentation and was found only by reading the code. A battery (0-100) charges passively over time, plus bonus charge from near-misses, time spent in the score zone, and bonus pickups. At full charge it grants an `overchargeMultiplierBonus` added to the combo multiplier. The battery is spent on 3 abilities, each with its own cost and a shared 500ms global cooldown:
- Phase Cloak (`cloak`, cost 40) — temporary invincibility-like state, visually distinct (white glow, priority over shield color)
- Kinetic Pulse (`pulse`, cost 60) — repels all obstacles on screen away from the player, brief invincibility during the push
- Temporal Shift (`chrono`, cost 90) — slows obstacle time (`timeScale`) for a duration, with a 1s fade back to normal speed afterward

Keybinds: 1/Q/A = cloak, 2/W/Z = pulse, 3/E = chrono. Right-click also triggers cloak.

Note: `game.config.js` previously had a second, dead `cloak` bonus pickup type (`bonusTypes.cloak`, `enabled: false, spawnWeight: 0`) — a leftover duplicate of the real ability. Removed during the July 2026 cleanup pass; it could never spawn and nothing referenced it as a bonus.

**Achievements** (`src/ui/achievements.js`, 312 lines) — 40+ achievements across rarity tiers (common through mythic), split into milestone groups (`veteran`, `survivor`, `collector`, `ghost`, `hard_boiled`, `wealthy`, and others — check the file, this list is not guaranteed exhaustive) and single-run achievements. Each has an `ap` (achievement points) value feeding a separate AP leaderboard (`fetchAPLeaderboard` in `stats.js`), distinct from the per-difficulty score leaderboard. Toast notifications on unlock, unseen-count badge on the achievements button, localStorage caching for instant reopen.

**Stats / backend** (`src/services/stats.js`, `src/services/supabase.js`) — Supabase backend, Google OAuth only, guest play works without persistence. Per-run stats (near misses, bonuses collected, combo score, KU earned, deaths by obstacle type) and all-time aggregate stats. KU = the passive/event-based charge accumulated toward the battery over a run, tracked separately in stats even though the battery itself is capped at 100 in real time.

**Audio** (`src/services/audio.js`) — Web Audio API based, self-contained module (deletable via `// AUDIO` marker convention in callers). SFX + music independently toggleable and volume-controlled, persisted in localStorage. Music fades on death/pause via GainNode, resumes from saved offset.

Known bug, found during audit: `audio.js` references `sounds/achievement.wav` in its `SOUNDS` map, but no such file exists in `/sounds`. This will silently fail or throw depending on how `play()` handles a missing buffer — not yet traced further. Needs fixing as part of, or before, the sound overhaul.

### Directory structure (current, post-reorg)

```
src/
  core/       GameLoop, GameState, collision, config, difficulty, gameUpdate
  entities/   bonuses, obstacles, player, zones
  systems/    abilities, combo
  services/   audio, stats, supabase
  ui/         achievements, gameOver, hud, renderer
  tests/      18 test files, 138 tests, all passing (verified by running `npm test`)
main.js       677 lines — entry point, DOM wiring, all overlay logic
```

The reorg from a flat `src/` into these subfolders happened in commit `c04360e`. Older changelog entries below (pre-reorg) reference flat paths like `combo.js`, `bonuses.js` — read those as `src/systems/combo.js`, `src/entities/bonuses.js`, etc.

---

## Architecture decisions (the non-obvious ones)

**game.config.js is a classic script, never a module.**
It sets `window.gameConfig` synchronously before the ES module graph runs. Never add `export default`. Autofixers have broken this before. The `<script src="game.config.js">` in index.html has no `type="module"` — that's intentional.

**gameUpdate.js exists so logic is testable.**
`main.js` has DOM side effects and can't be imported in tests. Pure frame logic lives in `gameUpdate(delta, state, accumulators, onAchievement)` which returns `'dead'` or `null`. Integration tests call this directly.

**state.player is the only source of truth for position and radius.**
`player.js` writes to `state.player.x/y` every frame. `collision.js` reads `state.player` directly. There is no separate hitbox object. Bonus effects write to `state.player.radius` directly.

**Render order matters for overlays.**
`GameLoop.tick()` calls `update()` then `render()` in sequence. Death is detected in `update()` — `renderFrame()` must return early when `state.status === 'dead'` or the game over screen gets overwritten on the same tick.

**Fixed logical canvas, CSS-only scaling.**
Game geometry is always 1600x900. `updateScale()` in `main.js` computes `Math.min(vw/1600, vh/900)` and applies it as a CSS `transform: scale()` on `#canvas-container`. Never resize the actual canvas or recompute zones on window resize — that was a past bug (star field and mouse coordinates both broke this way before the fix).

**State machine:**
```
'start' -> (click/key except Escape) -> 'grace' -> (grace expires) -> 'active' -> (collision) -> 'dead'
                                                                                                ->
                                                                              (R or Restart) -> 'grace'
'active'/'grace' -> (Escape) -> 'paused' -> (Escape) -> restores prevStatus
```
Restart always goes to `'grace'`, never `'start'`. Escape is ignored in `'dead'` and `'start'`.

---

## UI conventions

**Canvas vs HTML split — never mix these:**
- Canvas = game world only: obstacles, player, zones, particles, HUD during active play
- HTML/CSS = all menus and overlays: start screen (difficulty select), pause, game over, how-to-play, stats, leaderboard, achievements, auth, rename
- Every new UI surface must follow the HTML overlay pattern.

**HTML overlay pattern (follow exactly):**
- Dark semi-transparent backdrop, centered content box, monospace font, neon glow colors from game palette (`#00eeff`, `#00ff88`, `#ff4444`, `#ffe600`, `#cc44ff`, etc.)
- Opened by adding `.open` class, closed by removing it — no `display` toggling directly

**Escape handling** is centralized in a single keydown listener in `main.js`, priority order: how-to-play -> leaderboard -> stats -> achievements -> rename -> dead/start guard -> pause/unpause. Any new modal must be added into this chain.

**Start screen key to begin:** Space only (not "any key" — avoids accidental dismissal of modals via Tab etc).

---

## Backend design (Supabase)

Not independently re-verified this session (no DB access from this environment) — carried over from prior documentation, treat as likely-accurate but unconfirmed.

**Client file:** `src/services/supabase.js` — CDN import (`@supabase/supabase-js@2`), no npm import in browser modules.
**Auth:** Google OAuth only. Guest play works without login — stats just don't persist.
**Tables (as previously documented):** `profiles`, `runs`, `achievements`, `user_achievements` — all RLS-enabled.

If backend work is ever picked up again, re-verify the schema directly against Supabase before trusting this section.

---

## Testing

Run: `npm test`

18 test files, 138 tests, all passing as of this audit (July 2026). File list not reproduced here — read `src/tests/` directly rather than trusting a table that will drift again.

Known gap: DOM event wiring (click handlers, keydown listeners in `main.js`) has limited direct test coverage.

---

## Backlog

Cleared. The previous backlog listed features and tech debt without verifying against current code; several items were stale or already done under different names. Rebuilding it properly is future work — don't assume anything below is complete or incomplete without checking the code first.

**Current priority (agreed, July 2026):** stabilize and document before adding anything new. In order:
1. Dead code removal — done this session (removed: unused `bonusTypes.cloak` dead pickup entry, unreachable hitbox-debug drawing code and its `toggleHitboxes` export, an empty no-op `tickNearMissCooldown` export)
2. This CONTEXT.md rewrite — done this session
3. Sound overhaul — next. See `SOUND_DESIGN.md` (once created) for the research-backed approach and rules to follow when generating new SFX/music. Also fix the missing `sounds/achievement.wav` file as part of this pass.

No other backlog items are being tracked right now. Add new ones deliberately, not by inheriting an old list.

---

## Changelog

### Session — dead code cleanup + CONTEXT.md rewrite (July 2026)
- Full source audit: read every file in `src/`, ran the test suite, cross-checked DOM IDs, checked exports for actual usage
- Found and corrected multiple stale claims in the previous CONTEXT.md: undocumented Kinetic Battery/abilities system (added across several commits after the doc's last update), wrong `main.js` line count (677 vs claimed ~350), wrong test count (138/18 vs claimed 121/16), missing directory reorg documentation, missing AP leaderboard/achievement rarity system
- Removed dead `bonusTypes.cloak` entry from `game.config.js` (spawnWeight 0, enabled false, unreachable — distinct from the real, actively-used `battery.abilities.cloak`)
- Removed unreachable hitbox-debug rendering code from `src/ui/renderer.js` (`showHitboxes`, `toggleHitboxes`, `drawHitbox`, and 3 call sites) — its only toggle was deleted with the dev config panel in a prior session and was never reconnected
- Removed empty no-op `tickNearMissCooldown` export from `src/services/audio.js` — explicitly marked deprecated, confirmed zero call sites
- Found (not yet fixed): `audio.js` references `sounds/achievement.wav`, which does not exist in `/sounds` — flagged for the sound overhaul
- All 138 tests still pass after cleanup

### Earlier history (pre-audit, not independently re-verified)
Prior sessions' changelog entries existed here describing the original design doc implementation, session-by-session bug fixes, the combo/score-zone system, sound effects, backend/auth setup, achievements v1, difficulty presets, and a "production readiness" pass. That content was removed in this rewrite because several of its claims (main.js size, test counts, "production-ready" status) were found to be inaccurate by the time of this audit, and keeping unverified history risked being read as continued ground truth. If historical detail is needed, it's still recoverable from git log / GitHub history rather than from this file.
