# Design Document — Achievements

## Overview

The achievements system adds a persistent progression layer to DODGE. Players earn 30 achievements by meeting conditions across runs (milestone/cumulative) or within a single run (single-run/binary). Achievements are stored in Supabase and only available to authenticated users.

Evaluation is triggered automatically on run end. Milestone conditions are checked against server-side aggregate stats (`fetchAllTimeStats()`), ensuring client-side counters cannot be used to fake progress. Single-run conditions are checked against `state` and `getRunStats()`. Both paths are gated by the existing 5s minimum run threshold.

When new achievements are unlocked, a toast queue displays them one at a time in the bottom-right corner — above the `?` help button — sliding in and out automatically. The queue is cleared immediately on restart or menu navigation so no toast from a previous run bleeds into an active game.

The overlay UI follows the established HTML overlay pattern: `.open` class toggle, `htp-panel` style, `rgba(0,0,0,0.75)` backdrop, Escape + backdrop-click to close.

---

## Architecture

The feature touches four files:

- **`src/stats.js`** — adds `evaluateAchievements(state)` and `fetchUnlockedAchievements()`. All DB interaction lives here, consistent with the existing `insertRun` / `fetchAllTimeStats` pattern.
- **`src/main.js`** — replaces the standalone `insertRun(state)` call in the death handler with `await evaluateAchievements(state)` (which calls `insertRun` internally). Adds achievements overlay wiring: button click, Escape handler, backdrop click, `isAnyModalOpen`, `onAuthStateChange` visibility. Calls `clearToastQueue()` in `onRestart()` and `goToMenu()`.
- **`index.html`** — adds `#achievements-screen` overlay, `#achievements-btn` button, and `#toast-container` fixed element.
- **`src/achievements.js`** *(new)* — exports the static achievement definitions array (`ACHIEVEMENTS`), the overlay rendering function (`renderAchievementsOverlay`), and the toast queue functions (`queueToasts`, `clearToastQueue`). Keeps `stats.js` focused on DB/evaluation logic.

No new DB tables or RPC functions are needed — `user_achievements` already exists with the correct schema and RLS.

### Data flow on run end

```
gameUpdate → 'dead'
  └─ setTimeout(450ms)
       └─ evaluateAchievements(state)          [stats.js]
            ├─ guard: elapsed < 5000 → return []
            ├─ guard: not authenticated → return []
            ├─ await insertRun(state)           [stats.js — existing]
            ├─ const stats = await fetchAllTimeStats()
            ├─ const unlocked = await fetchUnlockedAchievements()
            ├─ build newKeys[] from all 30 conditions
            ├─ filter out already-unlocked keys
            └─ insert each new key to user_achievements (fire-and-forget)
       └─ queueToasts(newKeys)                 [achievements.js]
            └─ processes queue sequentially, one toast at a time
       └─ showGameOver(state, onRestart)
       └─ populate run-stats-panel DOM
```

### Toast lifecycle

```
queueToasts(keys)
  └─ for each key: push achievement def onto _queue
  └─ if not already processing: _processNext()

_processNext()
  └─ if queue empty: return
  └─ build toast DOM element, append to #toast-container
  └─ requestAnimationFrame → add .visible class (slide-in, 300ms CSS transition)
  └─ setTimeout(2500ms) → remove .visible (slide-out, 300ms)
  └─ setTimeout(300ms after slide-out) → remove element, wait 100ms, _processNext()

clearToastQueue()  [called by onRestart() and goToMenu() in main.js]
  └─ _queue = []
  └─ remove all children from #toast-container immediately
  └─ cancel any pending timers
```

### Overlay open flow

```
#achievements-btn click
  └─ achScreen.classList.add('open')
  └─ show loading (after 150ms if still loading)
  └─ await fetchUnlockedAchievements()
  └─ renderAchievementsOverlay(unlockedSet)
```

---

## Components and Interfaces

### `src/stats.js` additions

```js
// Evaluates all 30 achievement conditions after a run. Calls insertRun internally.
// Returns array of newly-unlocked achievement keys (empty if none or not eligible).
export async function evaluateAchievements(state): Promise<string[]>

// Queries user_achievements for the authenticated user.
// Returns array of unlocked achievement_key strings, or [] if not authenticated.
export async function fetchUnlockedAchievements(): Promise<string[]>
```

### `src/achievements.js` (new)

```js
// Static achievement definitions — used by overlay rendering and evaluation logic.
export const ACHIEVEMENTS: Achievement[]

// Populates #ach-list with milestone and single-run sections.
// unlockedSet is a Set<string> of achievement keys.
export function renderAchievementsOverlay(unlockedSet: Set<string>): void

// Enqueues achievements for sequential toast display. Called with newly-unlocked keys.
export function queueToasts(keys: string[]): void

// Immediately clears the toast queue and removes any visible toast from the DOM.
// Called by onRestart() and goToMenu() in main.js.
export function clearToastQueue(): void
```

### Toast DOM structure

```html
<!-- Always present, empty when idle. NOT an overlay — no backdrop, no .overlay class. -->
<div id="toast-container"></div>

<!-- One toast element (created/destroyed per toast): -->
<div class="achievement-toast" style="border-color: {achievement.color}">
  <span class="toast-icon">{achievement.icon}</span>
  <div class="toast-body">
    <div class="toast-title" style="color: {achievement.color}">{achievement.name}</div>
    <div class="toast-desc">{achievement.description}</div>
  </div>
</div>
```

### Toast CSS

```css
#toast-container {
  position: fixed;
  bottom: 72px;   /* 24px help-btn + 12px gap + 36px btn height = clears help button */
  right: 24px;
  z-index: 50;    /* above all overlays including #how-to-play (30) */
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  pointer-events: none;
}

.achievement-toast {
  background: #0d0d1a;
  border: 1px solid;          /* color set inline per achievement */
  border-radius: 10px;
  padding: 10px 14px;
  width: 280px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: monospace;
  transform: translateX(320px);  /* off-screen right */
  transition: transform 0.3s ease;
  pointer-events: none;
}

.achievement-toast.visible {
  transform: translateX(0);
}

.toast-icon { font-size: 20px; flex-shrink: 0; }
.toast-title { font-size: 13px; font-weight: bold; }
.toast-desc { font-size: 11px; color: #888; margin-top: 2px; }
```

**z-index placement in context:**
- `#difficulty-screen`: 10
- `.overlay` base: 20
- `#help-btn`: 25
- `#how-to-play`: 30
- `#toast-container`: 50 ← above everything, always readable

### Achievement definition shape

```js
{
  key: string,          // e.g. 'veteran_1'
  group: string,        // e.g. 'veteran' — used to cluster milestone tiers
  name: string,         // e.g. 'Veteran I'
  description: string,  // e.g. 'Play 1 game'
  type: 'milestone' | 'single_run',
  icon: string,         // emoji
  color: string,        // neon hex from game palette
}
```

### `index.html` additions

`#achievements-btn` — placed after `#stats-btn`, before `#auth-btn` on the difficulty screen. `visibility:hidden` by default, toggled by `onAuthStateChange`.

`#achievements-screen` — standard `.overlay` div with `.htp-panel` child. `#ach-list` div populated by JS.

`#toast-container` — fixed-position div, `bottom: 72px, right: 24px`, z-index 50. Always in DOM, empty when idle. Not an overlay.

### `src/main.js` changes

- Death handler: `insertRun(state)` → `await evaluateAchievements(state)` (async callback), then `queueToasts(newKeys)`
- `isAnyModalOpen()`: add `'#achievements-screen'`
- Escape handler: add achievements-screen check at priority 4 (after stats-screen, before config guard)
- `onAuthStateChange`: add `#achievements-btn` visibility toggle alongside `#stats-btn`
- Wire `#achievements-btn` click, `#achievements-screen` backdrop click
- `onRestart()`: call `clearToastQueue()` before resetting state
- `goToMenu()`: call `clearToastQueue()` before resetting state

---

## Data Models

### `user_achievements` table (existing, no changes)

| Column | Type | Notes |
|---|---|---|
| `id` | bigint | auto |
| `user_id` | uuid | references profiles.id |
| `achievement_key` | text | references achievements.key |
| `unlocked_at` | timestamptz | |

Unique constraint on `(user_id, achievement_key)` — authoritative dedup guard.
RLS `with_check: auth.uid() = user_id` — prevents cross-user inserts.

### Achievement definitions (30 total)

**Milestone achievements (23 tiers across 5 groups):**

| Group | Keys | Thresholds | Stat |
|---|---|---|---|
| veteran | veteran_1…6 | 1/5/10/25/50/100 | totalRuns |
| survivor | survivor_1…5 | 300k/900k/1.8M/3.6M/7.2M ms | totalElapsedMs |
| collector | collector_1…4 | 10/50/150/300 | totalBonuses |
| ghost | ghost_1…4 | 25/100/300/750 | totalNearMisses |
| hard_boiled | hard_boiled_1…4 | 5/15/30/50 | hardRunsCount |

**Single-run achievements (7):**

| Key | Condition |
|---|---|
| first_blood | totalRuns ≥ 1 |
| minuteman | state.elapsed ≥ 60000 |
| untouchable | state.elapsed ≥ 30000 AND nearMisses === 0 |
| danger_zone | nearMisses ≥ 15 |
| hoarder | bonusesCollected ≥ 6 |
| hard_debut | state.difficulty === 'hard' AND state.elapsed ≥ 30000 |
| pacifist | state.elapsed ≥ 45000 AND bonusesCollected === 0 |


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Short-run guard

*For any* game state where `state.elapsed < 5000`, calling `evaluateAchievements(state)` should return an empty array without inserting any rows into `user_achievements`.

**Validates: Requirements 6.1, 6.4**

---

### Property 2: Unauthenticated guard

*For any* game state, calling `evaluateAchievements(state)` when no user is authenticated should return an empty array without performing any DB operations.

**Validates: Requirements 3.2**

---

### Property 3: Already-unlocked dedup

*For any* set of achievement keys already present in `user_achievements`, calling `evaluateAchievements(state)` should not attempt to insert any of those keys again — the returned new-unlocks array should contain only keys not already in the unlocked set.

**Validates: Requirements 3.4, 3.5**

---

### Property 4: Milestone threshold correctness

*For any* all-time stats object, the set of milestone achievement keys produced by the evaluation logic should be exactly the set of keys whose threshold is satisfied — no more, no fewer. Specifically:
- `veteran_N` is produced iff `totalRuns ≥` the Nth veteran threshold
- `survivor_N` is produced iff `totalElapsedMs ≥` the Nth survivor threshold
- `collector_N` is produced iff `totalBonuses ≥` the Nth collector threshold
- `ghost_N` is produced iff `totalNearMisses ≥` the Nth ghost threshold
- `hard_boiled_N` is produced iff `hardRunsCount ≥` the Nth hard_boiled threshold

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

---

### Property 5: Single-run achievement correctness

*For any* run state (with `elapsed ≥ 5000`) and run stats, the set of single-run achievement keys produced by the evaluation logic should be exactly the set of keys whose condition is satisfied:
- `minuteman` iff `elapsed ≥ 60000`
- `untouchable` iff `elapsed ≥ 30000` AND `nearMisses === 0`
- `danger_zone` iff `nearMisses ≥ 15`
- `hoarder` iff `bonusesCollected ≥ 6`
- `hard_debut` iff `difficulty === 'hard'` AND `elapsed ≥ 30000`
- `pacifist` iff `elapsed ≥ 45000` AND `bonusesCollected === 0`

**Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.6, 5.7**

---

### Property 6: Achievement button visibility matches auth state

*For any* auth state change event, `#achievements-btn` visibility should be `'visible'` when a session exists and `'hidden'` when no session exists — matching the `#stats-btn` pattern exactly.

**Validates: Requirements 1.2, 1.3**

---

### Property 7: Overlay renders all 30 achievements

*For any* set of unlocked achievement keys, calling `renderAchievementsOverlay` should produce exactly 30 rendered achievement items in `#ach-list` — one per defined achievement, regardless of unlock state.

**Validates: Requirements 2.2**

---

### Property 8: Render opacity matches unlock state

*For any* achievement key and any unlocked set, the rendered element for that achievement should have full opacity when the key is in the unlocked set, and reduced opacity (0.35) when it is not.

**Validates: Requirements 2.3, 2.4**

---

### Property 9: isAnyModalOpen includes achievements-screen

*For any* state of `#achievements-screen`, `isAnyModalOpen()` should return `true` if and only if `#achievements-screen` has the `.open` class (among the other modals it checks).

**Validates: Requirements 2.7**

---

### Property 10: clearToastQueue removes all pending toasts

*For any* state of the toast queue (empty, one item, or multiple items), calling `clearToastQueue()` should result in an empty `#toast-container` with no children and no pending timers that would add new toasts.

**Validates: Requirements 8.7, 8.8**

---

### Property 11: Toast queue processes sequentially

*For any* array of N achievement keys passed to `queueToasts`, the toasts should appear one at a time — at no point should more than one `.achievement-toast` element exist in `#toast-container` simultaneously.

**Validates: Requirements 8.5**

---

## Error Handling

- `evaluateAchievements`: if `fetchAllTimeStats()` throws, swallow the error and return `[]` — same fire-and-forget philosophy as `insertRun`. A failed evaluation on one run is not worth surfacing to the player.
- `evaluateAchievements`: each `user_achievements` insert is wrapped in try/catch individually — one failed insert does not block the others.
- `fetchUnlockedAchievements`: if the query fails, return `[]` — the overlay will render all achievements as locked, which is a safe degraded state.
- `renderAchievementsOverlay`: called only after `fetchUnlockedAchievements` resolves — no partial render states.
- `queueToasts`: if called with an empty array, no-ops immediately — no DOM changes, no timers.
- `clearToastQueue`: safe to call when queue is already empty or no toast is visible — no errors.

---

## Testing Strategy

### Dual approach

Unit tests cover specific examples, edge cases, and integration points. Property-based tests verify universal correctness across all inputs. Both are required.

**Unit tests** (`src/achievements.test.js`):
- `#achievements-btn` exists in the DOM
- Clicking `#achievements-btn` adds `.open` to `#achievements-screen`
- Escape closes `#achievements-screen`
- Backdrop click closes `#achievements-screen`
- `isAnyModalOpen()` returns true when `#achievements-screen` is open
- `fetchUnlockedAchievements()` returns `[]` when not authenticated
- `first_blood` is unlocked when `totalRuns === 1` (example: the boundary case)
- `evaluateAchievements` does not throw when a Supabase insert fails
- `clearToastQueue()` empties `#toast-container` immediately
- `queueToasts([])` is a no-op — no DOM changes
- Toast appears above `#help-btn` (bottom offset clears the button)

**Property-based tests** (`src/achievements.test.js`, using `fast-check`):

Each property test runs a minimum of 100 iterations.

```
// Feature: achievements, Property 1: short-run guard
// Feature: achievements, Property 2: unauthenticated guard
// Feature: achievements, Property 3: already-unlocked dedup
// Feature: achievements, Property 4: milestone threshold correctness
// Feature: achievements, Property 5: single-run achievement correctness
// Feature: achievements, Property 6: achievement button visibility matches auth state
// Feature: achievements, Property 7: overlay renders all 30 achievements
// Feature: achievements, Property 8: render opacity matches unlock state
// Feature: achievements, Property 9: isAnyModalOpen includes achievements-screen
// Feature: achievements, Property 10: clearToastQueue removes all pending toasts
// Feature: achievements, Property 11: toast queue processes sequentially
```

**Property-based testing library**: `fast-check` (already available in the JS ecosystem, consistent with the existing vitest setup).

Each property test must be tagged with a comment in the format:
`// Feature: achievements, Property N: <property_text>`
