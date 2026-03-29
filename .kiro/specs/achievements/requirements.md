# Requirements Document

## Introduction

An achievements system for the DODGE game. Players earn achievements by meeting specific conditions across runs (milestone/cumulative) or within a single run (single-run/binary). Achievements are stored in Supabase and only available to authenticated users. The UI follows the existing overlay pattern (`.open` class, `htp-panel` style, `rgba(0,0,0,0.75)` backdrop). Evaluation happens on run end using server-side aggregate data for milestone achievements and per-run state for single-run achievements. Anti-cheat is enforced by the existing 5s minimum run threshold, RLS `with_check: auth.uid() = user_id`, and the unique constraint on `(user_id, achievement_key)`.

When new achievements are unlocked, a toast notification system displays them sequentially in the bottom-right corner, above the `?` help button.

## Glossary

- **Achievement_System**: The client-side module responsible for evaluating and unlocking achievements.
- **Achievements_Overlay**: The HTML overlay (`#achievements-screen`) that displays unlocked and locked achievements.
- **Milestone_Achievement**: An achievement with multiple tiers that unlock as cumulative all-time stats cross thresholds (e.g. veteran_1 through veteran_6).
- **Single_Run_Achievement**: A binary achievement that unlocks once when a specific condition is met within a single run.
- **Achievement_Key**: A unique string identifier for each achievement tier (e.g. `veteran_1`, `minuteman`).
- **All_Time_Stats**: Aggregate statistics fetched from the `runs` table for the authenticated user via `fetchAllTimeStats()`.
- **Run_Stats**: Per-run counters returned by `getRunStats()` — `nearMisses`, `bonusesCollected`, `comboScore`.
- **User_Achievements**: The `user_achievements` Supabase table storing `(user_id, achievement_key, unlocked_at)` rows.
- **Unlock**: The act of inserting a row into `user_achievements` for a given `achievement_key`.
- **Toast**: A transient notification panel that slides in from the right, displays one unlocked achievement, then slides out automatically.
- **Toast_Queue**: An ordered list of achievements waiting to be displayed as toasts, processed one at a time.

---

## Requirements

### Requirement 1: Achievements Button on Difficulty Screen

**User Story:** As an authenticated player, I want an Achievements button on the main menu, so that I can view my progress at any time.

#### Acceptance Criteria

1. THE Achievements_System SHALL render an `#achievements-btn` button on the difficulty screen alongside the Leaderboard and Stats buttons.
2. WHEN the user is not authenticated, THE Achievements_System SHALL hide `#achievements-btn` (matching the `stats-btn` visibility pattern).
3. WHEN the user authenticates, THE Achievements_System SHALL show `#achievements-btn`.
4. WHEN `#achievements-btn` is clicked, THE Achievements_System SHALL open the Achievements_Overlay.

---

### Requirement 2: Achievements Overlay UI

**User Story:** As a player, I want to see all achievements in a clear overlay, so that I know what I've unlocked and what I'm working toward.

#### Acceptance Criteria

1. THE Achievements_Overlay SHALL use the `htp-panel` style with `rgba(0,0,0,0.75)` backdrop, consistent with `#stats-screen` and `#leaderboard-screen`.
2. THE Achievements_Overlay SHALL display all 30 achievements grouped into two sections: "Milestones" and "Single Run".
3. WHEN an achievement is unlocked, THE Achievements_Overlay SHALL render it with full color and its name and description visible.
4. WHEN an achievement is locked, THE Achievements_Overlay SHALL render it dimmed (reduced opacity) with its name and description still visible.
5. WHEN the user presses Escape while the Achievements_Overlay is open, THE Achievements_System SHALL close the overlay.
6. WHEN the user clicks the backdrop of the Achievements_Overlay, THE Achievements_System SHALL close the overlay.
7. THE Achievements_Overlay SHALL be included in `isAnyModalOpen()` so that Escape and start-action guards work correctly.
8. THE Achievements_Overlay SHALL use z-index consistent with the existing overlay scale (z-index: 20 for `.overlay`, backdrop `rgba(0,0,0,0.75)`).

---

### Requirement 3: Achievement Evaluation on Run End

**User Story:** As a player, I want my achievements evaluated automatically after each run, so that I don't have to do anything to earn them.

#### Acceptance Criteria

1. WHEN a run ends (state transitions to `dead`), THE Achievement_System SHALL call `evaluateAchievements(state)` after `insertRun(state)` completes.
2. WHEN the user is not authenticated, THE Achievement_System SHALL skip evaluation entirely.
3. THE Achievement_System SHALL fetch `fetchAllTimeStats()` once per evaluation to obtain current cumulative totals — it SHALL NOT rely solely on client-side counters for milestone achievements.
4. THE Achievement_System SHALL fetch the user's already-unlocked achievements from `user_achievements` before evaluating, to avoid re-inserting duplicates (defense in depth beyond the unique constraint).
5. WHEN one or more new achievements are unlocked, THE Achievement_System SHALL insert each new `(user_id, achievement_key)` row into `user_achievements`.
6. IF the Supabase insert fails, THE Achievement_System SHALL silently discard the error (matching the `insertRun` fire-and-forget pattern).

---

### Requirement 4: Milestone Achievement Conditions

**User Story:** As a player, I want milestone achievements to reflect my cumulative progress, so that long-term play is rewarded.

#### Acceptance Criteria

1. WHEN `totalRuns` from All_Time_Stats is ≥ 1 / 5 / 10 / 25 / 50 / 100, THE Achievement_System SHALL unlock `veteran_1` / `veteran_2` / `veteran_3` / `veteran_4` / `veteran_5` / `veteran_6` respectively.
2. WHEN `totalElapsedMs` from All_Time_Stats is ≥ 300000 / 900000 / 1800000 / 3600000 / 7200000 ms (5 / 15 / 30 / 60 / 120 minutes), THE Achievement_System SHALL unlock `survivor_1` / `survivor_2` / `survivor_3` / `survivor_4` / `survivor_5` respectively.
3. WHEN `totalBonuses` from All_Time_Stats is ≥ 10 / 50 / 150 / 300, THE Achievement_System SHALL unlock `collector_1` / `collector_2` / `collector_3` / `collector_4` respectively.
4. WHEN `totalNearMisses` from All_Time_Stats is ≥ 25 / 100 / 300 / 750, THE Achievement_System SHALL unlock `ghost_1` / `ghost_2` / `ghost_3` / `ghost_4` respectively.
5. WHEN `hardRunsCount` from All_Time_Stats is ≥ 5 / 15 / 30 / 50, THE Achievement_System SHALL unlock `hard_boiled_1` / `hard_boiled_2` / `hard_boiled_3` / `hard_boiled_4` respectively.

---

### Requirement 5: Single-Run Achievement Conditions

**User Story:** As a player, I want single-run achievements to reward specific in-run feats, so that skilled or creative play is recognized.

#### Acceptance Criteria

1. WHEN `totalRuns` from All_Time_Stats is ≥ 1 (i.e. the just-completed run was inserted), THE Achievement_System SHALL unlock `first_blood`.
2. WHEN `state.elapsed` is ≥ 60000 ms, THE Achievement_System SHALL unlock `minuteman`.
3. WHEN `state.elapsed` is ≥ 30000 ms AND `nearMisses` from Run_Stats is 0, THE Achievement_System SHALL unlock `untouchable`.
4. WHEN `nearMisses` from Run_Stats is ≥ 15, THE Achievement_System SHALL unlock `danger_zone`.
5. WHEN `bonusesCollected` from Run_Stats is ≥ 6, THE Achievement_System SHALL unlock `hoarder`.
6. WHEN `state.difficulty` is `'hard'` AND `state.elapsed` is ≥ 30000 ms, THE Achievement_System SHALL unlock `hard_debut`.
7. WHEN `state.elapsed` is ≥ 45000 ms AND `bonusesCollected` from Run_Stats is 0, THE Achievement_System SHALL unlock `pacifist`.

---

### Requirement 6: Anti-Cheat Constraints

**User Story:** As a game operator, I want achievements to be resistant to trivial manipulation, so that the achievement system has integrity.

#### Acceptance Criteria

1. THE Achievement_System SHALL only evaluate achievements for runs where `state.elapsed` ≥ 5000 ms, consistent with the `insertRun` minimum threshold — runs under 5s produce no achievement progress.
2. THE Achievement_System SHALL use `fetchAllTimeStats()` (server-side aggregate from the `runs` table) for all milestone thresholds — client-side counters alone SHALL NOT be sufficient to unlock milestone achievements.
3. THE Achievement_System SHALL rely on Supabase RLS (`with_check: auth.uid() = user_id`) and the unique constraint on `(user_id, achievement_key)` as the authoritative server-side guards against duplicate or cross-user unlocks.
4. WHEN `state.elapsed` is < 5000 ms, THE Achievement_System SHALL return without evaluating any achievement conditions.

---

### Requirement 7: Fetch Unlocked Achievements

**User Story:** As a player, I want the overlay to accurately reflect which achievements I've already earned, so that I can track my progress.

#### Acceptance Criteria

1. THE Achievement_System SHALL export a `fetchUnlockedAchievements()` function that queries `user_achievements` for the authenticated user and returns an array of unlocked `achievement_key` strings.
2. WHEN the user is not authenticated, `fetchUnlockedAchievements` SHALL return an empty array.
3. THE Achievements_Overlay SHALL call `fetchUnlockedAchievements()` each time it is opened to display current unlock state.
4. THE Achievements_Overlay SHALL show a loading state while `fetchUnlockedAchievements()` is in flight, consistent with the leaderboard loading pattern (150ms delay before showing "Loading...").

---

### Requirement 8: Achievement Toast Notifications

**User Story:** As a player, I want to see a notification when I unlock an achievement, so that I know my progress is being recognized.

#### Acceptance Criteria

1. WHEN `evaluateAchievements` returns one or more newly-unlocked keys, THE Achievement_System SHALL enqueue a Toast for each unlocked achievement and begin processing the Toast_Queue.
2. THE Toast SHALL display in the bottom-right corner of the screen, positioned above the `?` help button — `bottom: 72px, right: 24px` — so the help button is never obscured.
3. THE Toast SHALL show the achievement icon, name, and description in a dark panel (`#0d0d1a` background) with a thin neon border in the achievement's color, consistent with the game palette.
4. THE Toast SHALL slide in from the right over 300ms, remain visible for 2500ms, then slide out to the right over 300ms.
5. WHEN multiple achievements are unlocked simultaneously, THE Achievement_System SHALL display them one at a time in sequence — the next toast begins 100ms after the previous one finishes sliding out.
6. THE Toast SHALL use z-index 50, above all overlays including `#how-to-play` (z-index 30), so it is always readable regardless of which screen is visible.
7. WHEN `onRestart()` is called while toasts are queued or displaying, THE Achievement_System SHALL immediately clear the Toast_Queue and remove any visible toast — no toast from a previous run SHALL appear during an active game.
8. WHEN `goToMenu()` is called while toasts are queued or displaying, THE Achievement_System SHALL immediately clear the Toast_Queue and remove any visible toast.
9. THE Toast SHALL NOT require any user interaction to dismiss — it auto-dismisses after its display duration.
10. THE Toast container (`#toast-container`) SHALL be a fixed-position element always present in the DOM, empty when idle — it is NOT an overlay and SHALL NOT use the `.overlay` class or backdrop.
