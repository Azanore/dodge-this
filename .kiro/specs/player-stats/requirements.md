# Requirements Document

## Introduction

The player-stats feature adds a two-layer statistics system to DODGE. After each run, a per-run stats panel is shown on the game over screen. Authenticated players also get persistent all-time stats accessible from the main menu. Guest players see per-run stats only — no data is written to the database. Stats are stored in the existing `runs` table in Supabase. Four new counters (near-misses, bonuses collected, max combo, combo score) are tracked during each run and surfaced in both layers.

## Glossary

- **Stats_Tracker**: The `src/stats.js` module responsible for tracking in-run counters, inserting run records, and fetching all-time stats.
- **Run_Record**: A single row inserted into the `runs` table at the end of an authenticated player's run.
- **Per_Run_Panel**: The expandable stats panel shown on the game over screen after every run.
- **All_Time_Overlay**: The HTML overlay accessible from the main menu showing aggregate stats for authenticated players.
- **Guest_Player**: A user who is not authenticated via Google OAuth.
- **Authenticated_Player**: A user who has signed in via Google OAuth.
- **Near_Miss**: An event where an obstacle passes within `gameConfig.nearMissThreshold` pixels of the player edge without causing death.
- **Max_Combo**: The highest `state.comboMultiplier` value reached during a single run. Stored for achievement evaluation.
- **Combo_Score**: The total bonus points banked from the multiplier system during a single run — sum of all `pendingScore` bank events. Reflects how effectively the player used score zones.
- **Run_State**: The `state` object from `GameState.js` at the moment the player dies.

---

## Requirements

### Requirement 1: In-Run Counter Tracking

**User Story:** As a player, I want the game to track my near-misses, bonuses collected, and peak combo during a run, so that meaningful stats are available at the end.

#### Acceptance Criteria

1. THE Stats_Tracker SHALL maintain a `nearMisses` counter, a `bonusesCollected` counter, a `maxCombo` value, and a `comboScore` accumulator for the current run.
2. WHEN a near-miss event is detected by `collision.js`, THE Stats_Tracker SHALL increment the `nearMisses` counter by 1.
3. WHEN a bonus is collected by the player, THE Stats_Tracker SHALL increment the `bonusesCollected` counter by 1.
4. WHEN `state.comboMultiplier` exceeds the current `maxCombo` value, THE Stats_Tracker SHALL update `maxCombo` to the new value.
5. WHEN a pending score bank event fires (i.e. `triggerScoreFloat` is called), THE Stats_Tracker SHALL add the banked amount to `comboScore`.
6. WHEN a new run begins, THE Stats_Tracker SHALL reset all four counters to zero.

---

### Requirement 2: Run Record Persistence

**User Story:** As an authenticated player, I want my run data saved to the database after each run, so that my history and all-time stats are preserved.

#### Acceptance Criteria

1. WHEN an Authenticated_Player's run ends, THE Stats_Tracker SHALL insert one Run_Record into the `runs` table containing: `score`, `elapsed_ms`, `difficulty`, `near_misses`, `max_combo`, `combo_score`, `bonuses_collected`, and `played_at`.
2. IF the Supabase insert fails for any reason, THEN THE Stats_Tracker SHALL silently discard the error and not retry.
3. WHEN a Guest_Player's run ends, THE Stats_Tracker SHALL NOT attempt a database insert.
4. THE Stats_Tracker SHALL determine authentication state by calling `supabase.auth.getUser()` before attempting an insert.

---

### Requirement 3: Per-Run Stats Panel

**User Story:** As a player, I want to see my stats for the run I just completed on the game over screen, so that I can review my performance immediately.

#### Acceptance Criteria

1. THE Per_Run_Panel SHALL display the following values from the completed run: score, time survived, difficulty, near-misses, bonuses collected, max combo multiplier, and combo score (bonus points earned from multiplier).
2. THE Per_Run_Panel SHALL be collapsed by default when the game over screen opens.
3. WHEN the player activates the stats toggle button, THE Per_Run_Panel SHALL expand to show all run stats.
4. WHEN the player activates the stats toggle button while the panel is expanded, THE Per_Run_Panel SHALL collapse.
5. THE Per_Run_Panel SHALL be visible to both Guest_Players and Authenticated_Players.
6. THE Per_Run_Panel SHALL follow the existing HTML overlay visual style: monospace font, neon colors, dark background.

---

### Requirement 4: All-Time Stats Overlay

**User Story:** As an authenticated player, I want to view my cumulative stats from the main menu, so that I can track my long-term progress.

#### Acceptance Criteria

1. THE All_Time_Overlay SHALL display the following aggregate values computed from the authenticated player's `runs` table rows: total runs played, best score per difficulty (easy / normal / hard), total near-misses, total bonuses collected, highest combo ever reached, best combo score in a single run, total time played (sum of `elapsed_ms`), average score per run, and average survival time per run.
2. WHEN the player clicks the "Stats" button on the main menu, THE All_Time_Overlay SHALL open and fetch the latest aggregate stats from Supabase.
3. WHEN the All_Time_Overlay is open and the player presses Escape, THE All_Time_Overlay SHALL close.
4. WHEN the player clicks the backdrop of the All_Time_Overlay, THE All_Time_Overlay SHALL close.
5. IF the authenticated player has no recorded runs, THEN THE All_Time_Overlay SHALL display a message indicating no stats are available yet.
6. IF the Supabase fetch fails, THEN THE All_Time_Overlay SHALL display an error message and remain open.
7. WHERE the player is a Guest_Player, THE All_Time_Overlay SHALL NOT be accessible — the "Stats" button SHALL NOT be shown on the main menu.
8. THE All_Time_Overlay SHALL follow the existing HTML overlay visual style: dark semi-transparent backdrop, centered content box, monospace font, neon colors.

---

### Requirement 5: Stats Button on Main Menu

**User Story:** As an authenticated player, I want a Stats button on the main menu, so that I can access my all-time stats without starting a run.

#### Acceptance Criteria

1. WHEN an Authenticated_Player is on the main menu (difficulty selection screen), THE Stats_Tracker SHALL display a "Stats" button.
2. WHEN a Guest_Player is on the main menu, THE Stats_Tracker SHALL NOT display the "Stats" button.
3. WHEN the authentication state changes (login or logout), THE Stats_Tracker SHALL update the visibility of the "Stats" button accordingly.

---

### Requirement 6: Stats Module Interface

**User Story:** As a developer, I want a clean stats module interface, so that stats tracking integrates with minimal changes to existing files.

#### Acceptance Criteria

1. THE Stats_Tracker SHALL expose a `resetRunStats()` function that zeroes all in-run counters.
2. THE Stats_Tracker SHALL expose an `onNearMiss()` function that increments the near-miss counter.
3. THE Stats_Tracker SHALL expose an `onBonusCollected()` function that increments the bonus counter.
4. THE Stats_Tracker SHALL expose an `onComboUpdate(multiplier)` function that updates `maxCombo` if the given value exceeds the current maximum.
5. THE Stats_Tracker SHALL expose an `onComboBank(amount)` function that adds the banked amount to `comboScore`.
6. THE Stats_Tracker SHALL expose an `insertRun(state)` function that reads counters and run state, checks auth, and performs the conditional Supabase insert.
7. THE Stats_Tracker SHALL expose a `fetchAllTimeStats()` function that queries the `runs` table and returns the aggregate stats object.
8. THE Stats_Tracker SHALL be implemented as `src/stats.js` using ES module syntax with CDN-only imports.
