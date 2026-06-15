// Achievement definitions, overlay rendering, toast queue, and mid-run checks.
// Related: stats.js (post-run evaluation), main.js (wiring), gameUpdate.js (mid-run hooks)
// Does not handle DB operations — evaluation and fetch live in stats.js.

import { playAchievement } from './audio.js';

export const ACHIEVEMENTS = [
  { "key": "veteran_1", "group": "veteran", "name": "Veteran I", "description": "Play 1 games", "type": "milestone", "icon": "gamepad-2", "rarity": "common", "threshold": 1, "color": "#ffffff", "ap": 10 },
  { "key": "veteran_2", "group": "veteran", "name": "Veteran II", "description": "Play 5 games", "type": "milestone", "icon": "gamepad-2", "rarity": "common", "threshold": 5, "color": "#ffffff", "ap": 10 },
  { "key": "veteran_3", "group": "veteran", "name": "Veteran III", "description": "Play 10 games", "type": "milestone", "icon": "gamepad-2", "rarity": "uncommon", "threshold": 10, "color": "#00eeff", "ap": 25 },
  { "key": "veteran_4", "group": "veteran", "name": "Veteran IV", "description": "Play 25 games", "type": "milestone", "icon": "gamepad-2", "rarity": "uncommon", "threshold": 25, "color": "#00eeff", "ap": 25 },
  { "key": "veteran_5", "group": "veteran", "name": "Veteran V", "description": "Play 50 games", "type": "milestone", "icon": "gamepad-2", "rarity": "rare", "threshold": 50, "color": "#00ff88", "ap": 50 },
  { "key": "veteran_6", "group": "veteran", "name": "Veteran VI", "description": "Play 100 games", "type": "milestone", "icon": "gamepad-2", "rarity": "rare", "threshold": 100, "color": "#00ff88", "ap": 50 },
  { "key": "veteran_7", "group": "veteran", "name": "Veteran VII", "description": "Play 250 games", "type": "milestone", "icon": "gamepad-2", "rarity": "epic", "threshold": 250, "color": "#cc44ff", "ap": 100 },
  { "key": "veteran_8", "group": "veteran", "name": "Veteran VIII", "description": "Play 500 games", "type": "milestone", "icon": "gamepad-2", "rarity": "legendary", "threshold": 500, "color": "#ffe600", "ap": 250 },
  { "key": "veteran_9", "group": "veteran", "name": "Veteran IX", "description": "Play 1000 games", "type": "milestone", "icon": "gamepad-2", "rarity": "mythic", "threshold": 1000, "color": "#ff4444", "ap": 500 },
  { "key": "survivor_1", "group": "survivor", "name": "Survivor I", "description": "Survive total 5 min", "type": "milestone", "icon": "clock", "rarity": "common", "threshold": 300000, "color": "#ffffff", "ap": 10 },
  { "key": "survivor_2", "group": "survivor", "name": "Survivor II", "description": "Survive total 15 min", "type": "milestone", "icon": "clock", "rarity": "common", "threshold": 900000, "color": "#ffffff", "ap": 10 },
  { "key": "survivor_3", "group": "survivor", "name": "Survivor III", "description": "Survive total 30 min", "type": "milestone", "icon": "clock", "rarity": "uncommon", "threshold": 1800000, "color": "#00eeff", "ap": 25 },
  { "key": "survivor_4", "group": "survivor", "name": "Survivor IV", "description": "Survive total 1 hour", "type": "milestone", "icon": "clock", "rarity": "uncommon", "threshold": 3600000, "color": "#00eeff", "ap": 25 },
  { "key": "survivor_5", "group": "survivor", "name": "Survivor V", "description": "Survive total 2 hours", "type": "milestone", "icon": "clock", "rarity": "rare", "threshold": 7200000, "color": "#00ff88", "ap": 50 },
  { "key": "survivor_6", "group": "survivor", "name": "Survivor VI", "description": "Survive total 5 hours", "type": "milestone", "icon": "clock", "rarity": "rare", "threshold": 18000000, "color": "#00ff88", "ap": 50 },
  { "key": "survivor_7", "group": "survivor", "name": "Survivor VII", "description": "Survive total 10 hours", "type": "milestone", "icon": "clock", "rarity": "epic", "threshold": 36000000, "color": "#cc44ff", "ap": 100 },
  { "key": "survivor_8", "group": "survivor", "name": "Survivor VIII", "description": "Survive total 24 hours", "type": "milestone", "icon": "clock", "rarity": "legendary", "threshold": 86400000, "color": "#ffe600", "ap": 250 },
  { "key": "collector_1", "group": "collector", "name": "Collector I", "description": "Collect 10 bonuses", "type": "milestone", "icon": "sparkles", "rarity": "common", "threshold": 10, "color": "#ffffff", "ap": 10 },
  { "key": "collector_2", "group": "collector", "name": "Collector II", "description": "Collect 50 bonuses", "type": "milestone", "icon": "sparkles", "rarity": "common", "threshold": 50, "color": "#ffffff", "ap": 10 },
  { "key": "collector_3", "group": "collector", "name": "Collector III", "description": "Collect 150 bonuses", "type": "milestone", "icon": "sparkles", "rarity": "uncommon", "threshold": 150, "color": "#00eeff", "ap": 25 },
  { "key": "collector_4", "group": "collector", "name": "Collector IV", "description": "Collect 300 bonuses", "type": "milestone", "icon": "sparkles", "rarity": "rare", "threshold": 300, "color": "#00ff88", "ap": 50 },
  { "key": "collector_5", "group": "collector", "name": "Collector V", "description": "Collect 750 bonuses", "type": "milestone", "icon": "sparkles", "rarity": "rare", "threshold": 750, "color": "#00ff88", "ap": 50 },
  { "key": "collector_6", "group": "collector", "name": "Collector VI", "description": "Collect 1500 bonuses", "type": "milestone", "icon": "sparkles", "rarity": "epic", "threshold": 1500, "color": "#cc44ff", "ap": 100 },
  { "key": "collector_7", "group": "collector", "name": "Collector VII", "description": "Collect 3000 bonuses", "type": "milestone", "icon": "sparkles", "rarity": "legendary", "threshold": 3000, "color": "#ffe600", "ap": 250 },
  { "key": "ghost_1", "group": "ghost", "name": "Ghost I", "description": "Get 25 near misses", "type": "milestone", "icon": "ghost", "rarity": "common", "threshold": 25, "color": "#ffffff", "ap": 10 },
  { "key": "ghost_2", "group": "ghost", "name": "Ghost II", "description": "Get 100 near misses", "type": "milestone", "icon": "ghost", "rarity": "common", "threshold": 100, "color": "#ffffff", "ap": 10 },
  { "key": "ghost_3", "group": "ghost", "name": "Ghost III", "description": "Get 300 near misses", "type": "milestone", "icon": "ghost", "rarity": "uncommon", "threshold": 300, "color": "#00eeff", "ap": 25 },
  { "key": "ghost_4", "group": "ghost", "name": "Ghost IV", "description": "Get 750 near misses", "type": "milestone", "icon": "ghost", "rarity": "rare", "threshold": 750, "color": "#00ff88", "ap": 50 },
  { "key": "ghost_5", "group": "ghost", "name": "Ghost V", "description": "Get 2000 near misses", "type": "milestone", "icon": "ghost", "rarity": "rare", "threshold": 2000, "color": "#00ff88", "ap": 50 },
  { "key": "ghost_6", "group": "ghost", "name": "Ghost VI", "description": "Get 5000 near misses", "type": "milestone", "icon": "ghost", "rarity": "epic", "threshold": 5000, "color": "#cc44ff", "ap": 100 },
  { "key": "ghost_7", "group": "ghost", "name": "Ghost VII", "description": "Get 10000 near misses", "type": "milestone", "icon": "ghost", "rarity": "legendary", "threshold": 10000, "color": "#ffe600", "ap": 250 },
  { "key": "hard_boiled_1", "group": "hard_boiled", "name": "Hard Boiled I", "description": "Play 5 hard runs", "type": "milestone", "icon": "flame", "rarity": "uncommon", "threshold": 5, "color": "#00eeff", "ap": 25 },
  { "key": "hard_boiled_2", "group": "hard_boiled", "name": "Hard Boiled II", "description": "Play 15 hard runs", "type": "milestone", "icon": "flame", "rarity": "uncommon", "threshold": 15, "color": "#00eeff", "ap": 25 },
  { "key": "hard_boiled_3", "group": "hard_boiled", "name": "Hard Boiled III", "description": "Play 30 hard runs", "type": "milestone", "icon": "flame", "rarity": "rare", "threshold": 30, "color": "#00ff88", "ap": 50 },
  { "key": "hard_boiled_4", "group": "hard_boiled", "name": "Hard Boiled IV", "description": "Play 50 hard runs", "type": "milestone", "icon": "flame", "rarity": "rare", "threshold": 50, "color": "#00ff88", "ap": 50 },
  { "key": "hard_boiled_5", "group": "hard_boiled", "name": "Hard Boiled V", "description": "Play 100 hard runs", "type": "milestone", "icon": "flame", "rarity": "epic", "threshold": 100, "color": "#cc44ff", "ap": 100 },
  { "key": "hard_boiled_6", "group": "hard_boiled", "name": "Hard Boiled VI", "description": "Play 250 hard runs", "type": "milestone", "icon": "flame", "rarity": "legendary", "threshold": 250, "color": "#ffe600", "ap": 250 },
  { "key": "wealthy_1", "group": "wealthy", "name": "Wealthy I", "description": "Accumulate 1000 total points", "type": "milestone", "icon": "coins", "rarity": "common", "threshold": 1000, "color": "#ffffff", "ap": 10 },
  { "key": "wealthy_2", "group": "wealthy", "name": "Wealthy II", "description": "Accumulate 5000 total points", "type": "milestone", "icon": "coins", "rarity": "common", "threshold": 5000, "color": "#ffffff", "ap": 10 },
  { "key": "wealthy_3", "group": "wealthy", "name": "Wealthy III", "description": "Accumulate 25000 total points", "type": "milestone", "icon": "coins", "rarity": "uncommon", "threshold": 25000, "color": "#00eeff", "ap": 25 },
  { "key": "wealthy_4", "group": "wealthy", "name": "Wealthy IV", "description": "Accumulate 100000 total points", "type": "milestone", "icon": "coins", "rarity": "uncommon", "threshold": 100000, "color": "#00eeff", "ap": 25 },
  { "key": "wealthy_5", "group": "wealthy", "name": "Wealthy V", "description": "Accumulate 500000 total points", "type": "milestone", "icon": "coins", "rarity": "rare", "threshold": 500000, "color": "#00ff88", "ap": 50 },
  { "key": "wealthy_6", "group": "wealthy", "name": "Wealthy VI", "description": "Accumulate 1000000 total points", "type": "milestone", "icon": "coins", "rarity": "rare", "threshold": 1000000, "color": "#00ff88", "ap": 50 },
  { "key": "wealthy_7", "group": "wealthy", "name": "Wealthy VII", "description": "Accumulate 5000000 total points", "type": "milestone", "icon": "coins", "rarity": "epic", "threshold": 5000000, "color": "#cc44ff", "ap": 100 },
  { "key": "wealthy_8", "group": "wealthy", "name": "Wealthy VIII", "description": "Accumulate 10000000 total points", "type": "milestone", "icon": "coins", "rarity": "legendary", "threshold": 10000000, "color": "#ffe600", "ap": 250 },
  { "key": "high_score_1", "group": "high_score", "name": "High Score I", "description": "Reach 100 points in one run", "type": "milestone", "icon": "trophy", "rarity": "common", "threshold": 100, "color": "#ffffff", "ap": 10 },
  { "key": "high_score_2", "group": "high_score", "name": "High Score II", "description": "Reach 500 points in one run", "type": "milestone", "icon": "trophy", "rarity": "uncommon", "threshold": 500, "color": "#00eeff", "ap": 25 },
  { "key": "high_score_3", "group": "high_score", "name": "High Score III", "description": "Reach 1000 points in one run", "type": "milestone", "icon": "trophy", "rarity": "rare", "threshold": 1000, "color": "#00ff88", "ap": 50 },
  { "key": "high_score_4", "group": "high_score", "name": "High Score IV", "description": "Reach 2500 points in one run", "type": "milestone", "icon": "trophy", "rarity": "rare", "threshold": 2500, "color": "#00ff88", "ap": 50 },
  { "key": "high_score_5", "group": "high_score", "name": "High Score V", "description": "Reach 5000 points in one run", "type": "milestone", "icon": "trophy", "rarity": "epic", "threshold": 5000, "color": "#cc44ff", "ap": 100 },
  { "key": "high_score_6", "group": "high_score", "name": "High Score VI", "description": "Reach 10000 points in one run", "type": "milestone", "icon": "trophy", "rarity": "legendary", "threshold": 10000, "color": "#ffe600", "ap": 250 },
  { "key": "first_blood", "group": "single", "name": "First Blood", "description": "Play your first game", "type": "single_run", "icon": "droplets", "rarity": "common", "color": "#ffffff", "ap": 10 },
  { "key": "minuteman", "group": "single", "name": "Minuteman", "description": "Survive 60s in one run", "type": "single_run", "icon": "zap", "rarity": "uncommon", "color": "#00eeff", "ap": 25 },
  { "key": "untouchable", "group": "single", "name": "Untouchable", "description": "Survive 30s with 0 near misses", "type": "single_run", "icon": "shield-check", "rarity": "rare", "color": "#00ff88", "ap": 50 },
  { "key": "danger_zone", "group": "single", "name": "Danger Zone", "description": "15+ near misses in one run", "type": "single_run", "icon": "alert-triangle", "rarity": "uncommon", "color": "#00eeff", "ap": 25 },
  { "key": "hoarder", "group": "single", "name": "Hoarder", "description": "Collect 6+ bonuses in one run", "type": "single_run", "icon": "briefcase", "rarity": "uncommon", "color": "#00eeff", "ap": 25 },
  { "key": "hard_debut", "group": "single", "name": "Hard Debut", "description": "Survive 30s on Hard difficulty", "type": "single_run", "icon": "skull", "rarity": "rare", "color": "#00ff88", "ap": 50 },
  { "key": "pacifist", "group": "single", "name": "Pacifist", "description": "Survive 45s collecting no bonuses", "type": "single_run", "icon": "heart", "rarity": "rare", "color": "#00ff88", "ap": 50 },
  { "key": "matrix", "group": "single", "name": "The Matrix", "description": "10 near misses in 5 seconds", "type": "single_run", "icon": "binary", "rarity": "epic", "color": "#cc44ff", "ap": 100 },
  { "key": "combo_king", "group": "single", "name": "Combo King", "description": "Bank 500+ points in one combo", "type": "single_run", "icon": "crown", "rarity": "epic", "color": "#cc44ff", "ap": 100 },
  { "key": "slowmo_junkie", "group": "single", "name": "Slow-mo Junkie", "description": "Collect 4 slow-mo bonuses in one run", "type": "single_run", "icon": "timer", "rarity": "rare", "color": "#00ff88", "ap": 50 },
  { "key": "shield_master", "group": "single", "name": "Shield Master", "description": "Collect 3 shield bonuses in one run", "type": "single_run", "icon": "shield", "rarity": "rare", "color": "#00ff88", "ap": 50 },
  { "key": "clean_slate", "group": "single", "name": "Clean Slate", "description": "Use 3 screenclears in one run", "type": "single_run", "icon": "eraser", "rarity": "rare", "color": "#00ff88", "ap": 50 },
  { "key": "tiny_but_mighty", "group": "single", "name": "Tiny but Mighty", "description": "Collect 3 shrink bonuses in one run", "type": "single_run", "icon": "minimize-2", "rarity": "rare", "color": "#00ff88", "ap": 50 },
  { "key": "jack_of_all_trades", "group": "single", "name": "Jack of All Trades", "description": "Collect all 4 bonus types in one run", "type": "single_run", "icon": "layers", "rarity": "epic", "color": "#cc44ff", "ap": 100 },
  { "key": "near_death", "group": "single", "name": "Near-Death Experience", "description": "Die with 1000+ score pending", "type": "single_run", "icon": "skull-2", "rarity": "rare", "secret": true, "color": "#00ff88", "ap": 50 },
    {'key': 'early_departure', 'group': 'single', 'name': 'Early Departure', 'description': 'Die within 10 seconds', 'type': 'single_run', 'icon': 'door-open', 'rarity': 'common', 'secret': true, 'color': "#ffffff", 'ap': 10 }
];

// Toast timing constants
const TOAST_SLIDE_MS = 150;
const TOAST_VISIBLE_MS = 3500;
const TOAST_GAP_MS = 80;

// Internal toast queue state
let _queue = [];
let _processing = false;
let _timerIds = [];

// Keys fired mid-run this session — cleared on resetMidRunTracking()
let _firedThisRun = new Set();

// Tracks a timer ID so clearToastQueue can cancel it
function _track(id) {
  _timerIds.push(id);
  return id;
}

// Processes the next toast in the queue — builds DOM, animates in/out, recurses
function _processNext() {
  if (_queue.length === 0) { _processing = false; return; }
  _processing = true;

  const ach = _queue.shift();
  const container = document.getElementById('toast-container');

  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.style.borderColor = ach.color;
  toast.innerHTML = `
    <span class="toast-icon"><i data-lucide="${ach.icon}"></i></span>
    <div class="toast-body">
      <div class="toast-title" style="color:${ach.color}">${ach.name}</div>
      <div class="toast-desc">${ach.description}</div>
    </div>
  `;
  container.appendChild(toast);

  if (window.lucide) window.lucide.createIcons({ props: { width: 20, height: 20 } });

  requestAnimationFrame(() => { toast.classList.add('visible'); });

  _track(setTimeout(() => {
    toast.classList.remove('visible');
    _track(setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      _track(setTimeout(_processNext, TOAST_GAP_MS));
    }, TOAST_SLIDE_MS));
  }, TOAST_VISIBLE_MS));
}

// Enqueues achievements by key for sequential toast display
export function queueToasts(keys) {
  if (!keys.length) return;
  playAchievement();
  for (const key of keys) {
    const ach = ACHIEVEMENTS.find(a => a.key === key);
    if (ach) _queue.push(ach);
  }
  if (!_processing) _processNext();
}

// Immediately empties the queue and removes any visible toast; cancels all pending timers
export function clearToastQueue() {
  _queue = [];
  for (const id of _timerIds) clearTimeout(id);
  _timerIds = [];
  _processing = false;
  const container = document.getElementById('toast-container');
  if (container) container.innerHTML = '';
}

// Resets the per-run fired-set — call on every restart so mid-run achievements can re-trigger
export function resetMidRunTracking() {
  _firedThisRun = new Set();
  _nearMissTimes = [];
}

// Returns keys that fired mid-run this session — used by evaluateAchievements to persist them
export function getFiredMidRunKeys() {
  return [..._firedThisRun];
}

let _nearMissTimes = [];

// Formats a raw stat value for display next to a milestone threshold
function _formatStat(group, value) {
  if (group === 'survivor') {
    const mins = value / 60000;
    if (mins < 60) return `${Math.floor(mins)}m`;
    const hours = mins / 60;
    return `${hours.toFixed(1)}h`;
  }
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
  return String(Math.floor(value));
}

// Checks mid-run single-run achievement conditions synchronously.
export function checkMidRunAchievements(state, runStats, unlockedSet) {
  const { nearMisses, bonusesCollected, bonusesByType, maxCombo, comboScore } = runStats;
  const candidates = [];

  if (state.elapsed >= 60000) candidates.push('minuteman');
  if (state.elapsed >= 30000 && nearMisses === 0) candidates.push('untouchable');
  if (nearMisses >= 15) candidates.push('danger_zone');
  if (bonusesCollected >= 6) candidates.push('hoarder');
  if (state.difficulty === 'hard' && state.elapsed >= 30000) candidates.push('hard_debut');
  if (state.elapsed >= 45000 && bonusesCollected === 0) candidates.push('pacifist');

  // Matrix: 10 near misses in 5 seconds
  // Need to track timestamps of near misses.
  // This function is called every frame, so we check if nearMisses count increased.
  if (nearMisses > _nearMissTimes.length) {
    for (let i = 0; i < nearMisses - _nearMissTimes.length; i++) {
        _nearMissTimes.push(performance.now());
    }
  }
  const now = performance.now();
  const recentNearMisses = _nearMissTimes.filter(t => now - t <= 5000).length;
  if (recentNearMisses >= 10) candidates.push('matrix');

  if (bonusesByType.slowmo >= 4) candidates.push('slowmo_junkie');
  if (bonusesByType.shield >= 3) candidates.push('shield_master');
  if (bonusesByType.clear >= 3) candidates.push('clean_slate');
  if (bonusesByType.shrink >= 3) candidates.push('tiny_but_mighty');
  if (Object.values(bonusesByType).every(count => count >= 1)) candidates.push('jack_of_all_trades');

  const newKeys = candidates.filter(k => !unlockedSet.has(k) && !_firedThisRun.has(k));
  for (const k of newKeys) _firedThisRun.add(k);
  return newKeys;
}

// Returns the current stat value for a milestone group — used for progress display
function _statForGroup(group, stats, runStats = null) {
  if (group === 'veteran') return stats.totalRuns ?? 0;
  if (group === 'survivor') return stats.totalElapsedMs ?? 0;
  if (group === 'collector') return stats.totalBonuses ?? 0;
  if (group === 'ghost') return stats.totalNearMisses ?? 0;
  if (group === 'hard_boiled') return stats.hardRunsCount ?? 0;
  if (group === 'wealthy') return stats.totalScore ?? 0;
  if (group === 'high_score') return runStats ? runStats.score : 0;
  return 0;
}

// Populates #ach-list with two sections: Milestones then Single Run
export function renderAchievementsOverlay(unlockedSet, stats) {
  const list = document.getElementById('ach-list');
  list.innerHTML = '';

  // Calculate total AP
  let totalAP = 0;
  for (const key of unlockedSet) {
    const ach = ACHIEVEMENTS.find(a => a.key === key);
    if (ach) totalAP += ach.ap;
  }

  const header = document.createElement('div');
  header.className = 'ach-header';
  header.innerHTML = `
    <div class="ach-total-ap">Total Achievement Points: <span class="ap-value">${totalAP}</span></div>
  `;
  list.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'ach-grid';
  list.appendChild(grid);

  for (const ach of ACHIEVEMENTS) {
    const unlocked = unlockedSet.has(ach.key);
    const card = document.createElement('div');
    card.className = `ach-card rarity-${ach.rarity} ${unlocked ? 'unlocked' : 'locked'}`;

    let icon = ach.icon;
    let name = ach.name;
    let desc = ach.description;

    if (!unlocked && ach.secret) {
        icon = 'help-circle';
        name = '???';
        desc = 'Secret achievement';
    }

    let progressHtml = '';
    if (ach.type === 'milestone') {
        const current = stats ? _statForGroup(ach.group, stats) : 0;
        const percent = Math.min(100, (current / ach.threshold) * 100);
        const curStr = _formatStat(ach.group, current);
        const thrStr = _formatStat(ach.group, ach.threshold);
        progressHtml = `
            <div class="ach-progress-container">
                <div class="ach-progress-bar" style="width: ${percent}%; background-color: ${ach.color}"></div>
            </div>
            <div class="ach-progress-text">${curStr} / ${thrStr}</div>
        `;
    }

    card.innerHTML = `
      <div class="ach-icon-box" style="color: ${ach.color}; filter: drop-shadow(0 0 5px ${ach.color})">
        <i data-lucide="${icon}"></i>
      </div>
      <div class="ach-info">
        <div class="ach-name" style="color: ${ach.color}">${name}</div>
        <div class="ach-desc">${desc}</div>
        ${progressHtml}
      </div>
      <div class="ach-ap">${ach.ap} AP</div>
    `;
    grid.appendChild(card);
  }

  if (window.lucide) window.lucide.createIcons();
}
