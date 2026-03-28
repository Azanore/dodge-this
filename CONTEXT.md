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
- **Backend leaderboard** — now planned. Supabase makes this viable without a custom server.
- **Touch/mobile support** — the game is mouse-only by design. Adding touch would require rethinking the entire input model and zone layout.
- **Sound** — not ruled out, but adds asset management complexity. Worth a dedicated session if added.

### Pending / ideas for later
See the Backlog section below.

### Planned (next sessions, in order)
1. ~~Near-miss feedback~~ — done session 5
2. ~~Combo multiplier + Score Zone~~ — done session 6
3. ~~Value tuning~~ — done session 7
4. ~~**Difficulty presets**~~ — done session 14. Easy/normal/hard. Existing scores migrated to hard.
5. ~~Sound effects~~ — done session 8 & 13. Volume slider deliberately excluded — OS/browser controls are sufficient for a game this size.
6. ~~**Statistics + Auth**~~ — done sessions 15–17. Stats tracking, Google OAuth sign in/out, run persistence, all-time stats overlay.
7. ~~**Leaderboard**~~ — done session 18. Public per-difficulty top scores from the `runs` table.
8. **Achievements** — next. Conditions evaluate against the runs table.

---

## UI conventions

**Canvas vs HTML split — never mix these:**
- Canvas = game world only: obstacles, player, zones, particles, HUD during active play
- HTML/CSS = all menus and overlays: start screen, pause, game over, modals, stats, leaderboard, auth, achievements
- This was a deliberate migration in session 12. Every new UI surface must follow the HTML overlay pattern.

**HTML overlay pattern (follow exactly):**
- Structure matches existing overlays: `#pause-screen`, `#game-over-screen`, `#how-to-play`
- Dark semi-transparent backdrop, centered content box, monospace font, neon glow colors from game palette (`#00eeff`, `#00ff88`, `#ff4444`, `#ffe600`, etc.)
- Opened by adding `.open` class, closed by removing it — no `display` toggling directly

**Overlay backdrop scale (intentional, don't change without reason):**
- `#difficulty-screen` → `rgba(0,0,0,0.92)` — title screen, nearly opaque, canvas behind is irrelevant
- `#game-over-screen` → `rgba(0,0,0,0.78)` — game is over, heavy dim
- `#how-to-play`, `#stats-screen`, `#leaderboard-screen` → `rgba(0,0,0,0.75)` — informational panels, same treatment
- `#pause-screen` → `rgba(0,0,0,0.60)` — lightest, game world intentionally still visible behind it

**Backdrop click and Escape:**
- `#how-to-play`, `#stats-screen`, `#leaderboard-screen` — both backdrop click and Escape close them
- `#pause-screen`, `#game-over-screen`, `#difficulty-screen` — no backdrop click (accidental dismissal would have meaningful consequences); Escape handles pause/unpause only
- All Escape handling is in the single `KeydownRegistry` in `main.js` (priority order: how-to-play → leaderboard → stats → config guard → dead/start guard → Escape pause/unpause)

**Start screen key to begin:** Space only (not "any key" — too broad, caused Tab to accidentally dismiss modals and start the game)

**Interaction consistency:**
- Escape closes any open overlay (already wired globally in `KeydownRegistry` in main.js — new overlays must hook into this)
- Backdrop click closes informational modals only
- Keyboard shortcuts documented in the overlay itself where applicable
- No new global key listeners without checking for conflicts with existing ones (Escape, R, Space, ?)

**New overlays checklist:**
- Does Escape close it?
- Does backdrop click close it?
- Is the game loop paused while it's open if needed?
- Does it restore previous state correctly on close?

---

## Backend design (Supabase)

**Supabase project:** `dodge-this` — ref `akhizydlqrfeeevwyflp`, region EU Central, free tier
**Client file:** `src/supabase.js` — imports from CDN (`@supabase/supabase-js@2`), exports `supabase` client
**Anon key type:** publishable key (`sb_publishable_...`) — safe to expose in frontend, RLS enforces security
**Google OAuth:** configured in Supabase Auth → Providers. Redirect URI: `https://akhizydlqrfeeevwyflp.supabase.co/auth/v1/callback`.
**⚠️ BEFORE GOING LIVE:** Google OAuth is currently in test mode — only emails listed under "Audience → Test users" in [Google Auth Platform](https://console.cloud.google.com/auth) can log in. To allow all users: go to Google Auth Platform → "Audience" → click "Publish app" → confirm. No review required for basic OAuth. Do this before deploying to production.
**Profile trigger:** `handle_new_user()` fires on `auth.users` insert, creates `profiles` row with Google `full_name` and `avatar_url` from `raw_user_meta_data`. Confirmed working.
**Supabase CDN import pattern:** `import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'` — no build step, works in ES modules directly. Do not use npm import path in browser modules.
**RLS note:** all 4 tables have RLS enabled. Supabase dashboard always has full admin access regardless of RLS policies.

**Auth:** Google OAuth only. Guest play works without login — stats just don't persist. Players prompted to sign in after a run. Supabase links Google identity to a `profiles` row automatically via a DB trigger on `auth.users`.

**Database — 4 tables:**

`profiles` — one row per user, auto-created on first login
- `id` uuid (references auth.users.id)
- `username` text nullable (defaults to Google display name)
- `avatar_url` text nullable (from Google)
- `created_at` timestamptz

`runs` — one row per completed game (authenticated players only)
- `id` bigint
- `user_id` uuid (references profiles.id)
- `score` numeric
- `elapsed_ms` integer
- `difficulty` text ('easy' | 'normal' | 'hard')
- `near_misses` integer
- `max_combo` numeric
- `bonuses_collected` integer
- `played_at` timestamptz

`achievements` — static definitions, seeded once
- `id` integer
- `key` text unique (e.g. 'veteran', 'minuteman')
- `name` text
- `description` text

`user_achievements` — which user unlocked what
- `id` bigint
- `user_id` uuid (references profiles.id)
- `achievement_key` text (references achievements.key)
- `unlocked_at` timestamptz
- unique constraint on (user_id, achievement_key)

**RLS:** enabled on all tables. Users read/write own rows only. Leaderboard and profiles are public read. Supabase dashboard retains full admin access regardless of RLS.

**Stats:** derived from `runs` table via aggregate queries — no separate stats table needed.

**Leaderboard:** public read, all-time, per difficulty. Query: `SELECT * FROM runs ORDER BY score DESC LIMIT 20` filtered by difficulty.

**Guest → login:** no retroactive sync. Guest runs are local-only (localStorage PB preserved). Authenticated runs go to DB from login onwards.

**Offline during run:** write happens on run end only. If insert fails (offline), run is silently dropped — one lost run is acceptable for a game this size.

**Achievement evaluation:** client-side on run end. Checks conditions against aggregated stats, writes unlocked achievements to `user_achievements`. Not cheat-proof but acceptable for this game.

---

## Achievement definitions

**Milestone (cumulative, progress bar with tiers):**
- **Veteran** — Play 1 / 5 / 10 / 25 / 50 / 100 games
- **Survivor** — Accumulate 5 / 15 / 30 / 60 / 120 total minutes played
- **Collector** — Collect 10 / 50 / 150 / 300 total bonuses
- **Ghost** — Accumulate 25 / 100 / 300 / 750 total near-misses
- **Hard Boiled** — Complete 5 / 15 / 30 / 50 games on Hard
- **Combo Chaser** — Reach 3x / 4x / 5x multiplier (tracks personal best combo)

**Single-run (binary, unlock once):**
- **First Blood** — Complete your first run (survive at least 5s)
- **Minuteman** — Survive 60s in a single run
- **Untouchable** — Survive 30s without a single near-miss
- **Danger Zone** — Get 15 near-misses in a single run
- **Max Power** — Hit 5x combo multiplier in a single run
- **Hoarder** — Collect 6 bonuses in a single run
- **Hard Debut** — Survive 30s on Hard in a single run
- **Pacifist** — Survive 45s without collecting any bonus

---

## Backlog

Grouped by effort. All of these fit the current architecture without major rewrites.

### Quick wins (low effort, high impact)
- (none remaining)

### Medium effort (worth a dedicated session)
- ~~**Sound effects**~~ — done. Volume slider deliberately excluded — OS/browser controls are sufficient; a slider adds UI complexity for a problem that may not exist.
- **Difficulty presets** — easy/normal/hard. Defer until gameplay is stable. Per-difficulty PB keys: `dodge_pb_easy`, `dodge_pb_normal`, `dodge_pb_hard`. Migrate existing `dodge_pb` to normal on first load.
- **Achievements** — after statistics. Implement last when all metrics are stable. Conditions become simple reads against the stats store.

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

### Session 20 — Post-overhaul polish & consistency fixes
- Fixed Tab key accidentally dismissing modals and starting the game — `onStartAction` now uses allowlist (`e.key !== ' '`) instead of blocklist (`e.key === 'Escape'`)
- Updated hint text from "or press any key" to "or press Space"
- Added `rgba(0,0,0,0.75)` backdrop to `#stats-screen` and `#leaderboard-screen` — now consistent with `#how-to-play`
- Documented overlay backdrop scale and interaction rules in CONTEXT.md

### Session 19 — UI consistency overhaul
- Removed `renderStartScreen` dead code from `renderer.js` and `main.js`
- Exported `BONUS_COLORS` from `renderer.js`, removed duplicate from `hud.js`
- Fixed listener leak in `gameOver.js` — promoted listeners to module-level, exported `cleanup()`
- Extracted `isAnyModalOpen` helper in `main.js`
- Consolidated keydown listeners into single `KeydownRegistry` in `main.js`
- Formalized `syncHelpBtn` call sites
- Adopted `.open` class pattern for `run-stats-panel`
- Extracted inline styles to CSS classes in `index.html`
- Fixed z-index scale: `difficulty-screen: 10`, `overlay: 20`, `help-btn: 25`, `how-to-play: 30`
- Applied visual polish to overlay buttons (border, cyan primary glow, neon hover states)
- Added 8 property-based tests covering all correctness properties (Properties 1–8)

### Session 18 — Leaderboard
- `fetchLeaderboard(difficulty)` added to `src/stats.js` — initially queried top 10 runs joined with profiles, replaced with Supabase RPC `get_leaderboard(diff)` using `DISTINCT ON (user_id)` to show one entry per player (personal best only)
- `#leaderboard-btn` added to difficulty screen (public, no auth required)
- `#leaderboard-screen` overlay added — Easy/Normal/Hard tabs, each fetches and renders top 10 on click
- Rows show rank (gold/silver/bronze for top 3), username, score in pts, elapsed time
- Escape and backdrop click close the overlay; wired into existing Escape handler in `main.js`
- Fixed leaderboard tabs bleeding into difficulty selector — removed `.diff-btn` class from `.lb-tab`, tabs are now fully isolated
- Fixed loading flash — "Loading..." only shown after 150ms delay, cancelled if data arrives first
- Fixed stats-btn layout shift — switched from `display:none/inline-block` to `visibility:hidden/visible` so slot is always reserved
- Redesigned main menu: difficulty buttons now horizontal row, better vertical spacing, Leaderboard above Stats (both full-width stacked), auth at bottom

### Session 17 — Google OAuth auth + stats polish
- Added `#auth-btn` to difficulty screen — "Sign in with Google" / "Name — Sign out" toggle
- Wired `supabase.auth.signInWithOAuth({ provider: 'google' })` and `supabase.auth.signOut()`
- `onAuthStateChange` drives both `#stats-btn` visibility and `#auth-btn` label/color
- Fixed OAuth redirect loop: use `window.location.origin` as `redirectTo`, clean `access_token` hash via `history.replaceState` after callback
- Fixed `insertRun` 403: added `user_id: data.user.id` to insert payload (RLS requires it)
- Added 5s minimum run threshold to `insertRun` — runs under 5s are not recorded
- Persisted last selected difficulty to `localStorage` (`dodge_difficulty` key) — restored on page load
- Fixed stale config warnings: removed `maxSpeedMultiplier` and `difficulty` checks from `validateConfig` (moved to `difficultyPresets` in session 14)
- Fixed stale config panel crash: removed `difficulty.maxObstaclesOnScreen` and `maxSpeedMultiplier` sliders from `configPanel.js`
- Fixed stats counter leak: `resetRunStats()` now called in `goToMenu()` as well as `onRestart()`
- Stats overlay restyled to match how-to-play panel (`.htp-panel`, section headers, backdrop)
- `#stats-message` given fixed height to prevent layout shift on "no stats" message

### Session 16 — player-stats feature
- `src/stats.js` module added: `resetRunStats`, `onNearMiss`, `onBonusCollected`, `onComboUpdate`, `onComboBank`, `getRunStats`, `insertRun`, `fetchAllTimeStats`
- Per-run stats panel on game-over screen (`#run-stats-panel`, `#run-stats-toggle`) — collapsed by default, toggle expands/collapses
- All-time stats overlay (`#stats-screen`) for authenticated players — opens via `#stats-btn` on difficulty screen, closes on Escape or backdrop click
- `#stats-btn` visibility wired to `supabase.auth.onAuthStateChange` — shown only when logged in
- `insertRun(state)` called fire-and-forget on death; `resetRunStats()` called on restart
- Hooks wired: `onNearMiss` in `gameUpdate.js`, `onBonusCollected` in `bonuses.js`, `onComboUpdate`/`onComboBank` in `gameUpdate.js`
- 20 tests in `stats.test.js`: 7 PBT properties (Properties 1–5, 6, 7) + 13 unit tests — all passing

### Session 15 — Backend setup
- Created new Supabase project `dodge-this` (ref: `akhizydlqrfeeevwyflp`, EU Central)
- Created 4 tables: `profiles`, `runs`, `achievements`, `user_achievements` — all with RLS enabled
- Seeded 34 achievement rows (6 milestone groups × tiers + 8 single-run)
- Wired Google OAuth via Supabase Auth Providers — Client ID + Secret from Google Cloud Console
- DB trigger `handle_new_user()` auto-creates profile row on first Google login — confirmed working
- Created `src/supabase.js` — Supabase client using CDN import, publishable anon key
- Decided: Google-only auth, guest play local-only, no retroactive sync on login, fire-and-forget on offline run insert

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
- Score zone radius bumped from 60px to 110px (changelog previously said 90px — actual value in game.config.js is 110px)
- Score formula changed from `delta * multiplier` to `(delta/1000) * 10` — numbers now in hundreds not hundreds-of-thousands
- `scoreZoneRadius` moved to `game.config.js` (was already there, confirmed correct)

### Session 14
- Difficulty presets added: easy / normal / hard — same logarithmic curve shape, different ceiling and ramp
- `game.config.js`: `difficulty` block replaced with `difficultyPresets` object (easy/normal/hard)
- `difficulty.js`: `getPreset(difficulty)`, curve functions now take `difficulty` param
- `GameState.js`: `resetState(difficulty)` — difficulty stored on state
- `obstacles.js`: `spawnObstacle` reads `maxObstaclesOnScreen` from active preset via `state.difficulty`
- `gameUpdate.js`: passes `state.difficulty` to curve functions
- `gameOver.js`: per-difficulty PB keys (`dodge_pb_easy/normal/hard`), legacy `dodge_pb` migrated to `dodge_pb_hard`
- `index.html`: difficulty selector HTML overlay (consistent with existing overlay pattern), shown on load
- `main.js`: `activeDifficulty` var, difficulty buttons wired, PB display per difficulty, `resetState` uses active difficulty
- `renderer.js`: `renderStartScreen` simplified — title/PB/prompt moved to HTML overlay

### Session 13
- `drawObstacle()` if/else chain replaced with `OBSTACLE_DRAW` map lookup in `renderer.js`
- Slowmo bonus now also slows spawn rate — `accumulators.spawn` advances at `slowmoMultiplier` rate in `gameUpdate.js`
- Fixed double-shrink bug: `collectBonus` preserves original `prevRadius` on re-stack — `bonuses.js`
- Suppressed near-miss detection during invincibility — `collision.js`
- Near-miss sound global cooldown (300ms) — prevents stacking — `audio.js`
- Music toggle fades out over 300ms via GainNode — `audio.js`
- Fixed multiple music toggle/pause/resume state bugs — `audio.js`, `main.js`; `musicPaused` removed, logic now explicit: `pauseMusic` saves offset, `resumeMusic` restarts if enabled, `main.js` decides when to call each
- Volume slider deliberately excluded — OS/browser controls are sufficient

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
