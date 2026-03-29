// Achievement definitions, overlay rendering, toast queue, and mid-run checks.
// Related: stats.js (post-run evaluation), main.js (wiring), gameUpdate.js (mid-run hooks)
// Does not handle DB operations — evaluation and fetch live in stats.js.

export const ACHIEVEMENTS = [
  // Veteran — total runs
  { key: 'veteran_1', group: 'veteran', name: 'Veteran I', description: 'Play 1 game', type: 'milestone', icon: '🎮', color: '#00eeff', threshold: 1 },
  { key: 'veteran_2', group: 'veteran', name: 'Veteran II', description: 'Play 5 games', type: 'milestone', icon: '🎮', color: '#00eeff', threshold: 5 },
  { key: 'veteran_3', group: 'veteran', name: 'Veteran III', description: 'Play 10 games', type: 'milestone', icon: '🎮', color: '#00eeff', threshold: 10 },
  { key: 'veteran_4', group: 'veteran', name: 'Veteran IV', description: 'Play 25 games', type: 'milestone', icon: '🎮', color: '#00eeff', threshold: 25 },
  { key: 'veteran_5', group: 'veteran', name: 'Veteran V', description: 'Play 50 games', type: 'milestone', icon: '🎮', color: '#00eeff', threshold: 50 },
  { key: 'veteran_6', group: 'veteran', name: 'Veteran VI', description: 'Play 100 games', type: 'milestone', icon: '🎮', color: '#00eeff', threshold: 100 },

  // Survivor — total elapsed ms (threshold stored in ms, displayed as minutes)
  { key: 'survivor_1', group: 'survivor', name: 'Survivor I', description: 'Survive 5 min total', type: 'milestone', icon: '⏱️', color: '#00ff88', threshold: 300000 },
  { key: 'survivor_2', group: 'survivor', name: 'Survivor II', description: 'Survive 15 min total', type: 'milestone', icon: '⏱️', color: '#00ff88', threshold: 900000 },
  { key: 'survivor_3', group: 'survivor', name: 'Survivor III', description: 'Survive 30 min total', type: 'milestone', icon: '⏱️', color: '#00ff88', threshold: 1800000 },
  { key: 'survivor_4', group: 'survivor', name: 'Survivor IV', description: 'Survive 60 min total', type: 'milestone', icon: '⏱️', color: '#00ff88', threshold: 3600000 },
  { key: 'survivor_5', group: 'survivor', name: 'Survivor V', description: 'Survive 120 min total', type: 'milestone', icon: '⏱️', color: '#00ff88', threshold: 7200000 },

  // Collector — total bonuses
  { key: 'collector_1', group: 'collector', name: 'Collector I', description: 'Collect 10 bonuses', type: 'milestone', icon: '✨', color: '#ffe600', threshold: 10 },
  { key: 'collector_2', group: 'collector', name: 'Collector II', description: 'Collect 50 bonuses', type: 'milestone', icon: '✨', color: '#ffe600', threshold: 50 },
  { key: 'collector_3', group: 'collector', name: 'Collector III', description: 'Collect 150 bonuses', type: 'milestone', icon: '✨', color: '#ffe600', threshold: 150 },
  { key: 'collector_4', group: 'collector', name: 'Collector IV', description: 'Collect 300 bonuses', type: 'milestone', icon: '✨', color: '#ffe600', threshold: 300 },

  // Ghost — total near misses
  { key: 'ghost_1', group: 'ghost', name: 'Ghost I', description: '25 near misses total', type: 'milestone', icon: '👻', color: '#cc44ff', threshold: 25 },
  { key: 'ghost_2', group: 'ghost', name: 'Ghost II', description: '100 near misses total', type: 'milestone', icon: '👻', color: '#cc44ff', threshold: 100 },
  { key: 'ghost_3', group: 'ghost', name: 'Ghost III', description: '300 near misses total', type: 'milestone', icon: '👻', color: '#cc44ff', threshold: 300 },
  { key: 'ghost_4', group: 'ghost', name: 'Ghost IV', description: '750 near misses total', type: 'milestone', icon: '👻', color: '#cc44ff', threshold: 750 },

  // Hard Boiled — hard runs
  { key: 'hard_boiled_1', group: 'hard_boiled', name: 'Hard Boiled I', description: 'Play 5 hard runs', type: 'milestone', icon: '🔥', color: '#ff4444', threshold: 5 },
  { key: 'hard_boiled_2', group: 'hard_boiled', name: 'Hard Boiled II', description: 'Play 15 hard runs', type: 'milestone', icon: '🔥', color: '#ff4444', threshold: 15 },
  { key: 'hard_boiled_3', group: 'hard_boiled', name: 'Hard Boiled III', description: 'Play 30 hard runs', type: 'milestone', icon: '🔥', color: '#ff4444', threshold: 30 },
  { key: 'hard_boiled_4', group: 'hard_boiled', name: 'Hard Boiled IV', description: 'Play 50 hard runs', type: 'milestone', icon: '🔥', color: '#ff4444', threshold: 50 },

  // Single-run achievements
  { key: 'first_blood', group: 'single', name: 'First Blood', description: 'Play your first game', type: 'single_run', icon: '🩸', color: '#ff4444' },
  { key: 'minuteman', group: 'single', name: 'Minuteman', description: 'Survive 60s in one run', type: 'single_run', icon: '⚡', color: '#00ff88' },
  { key: 'untouchable', group: 'single', name: 'Untouchable', description: 'Survive 30s with 0 near misses', type: 'single_run', icon: '🛡️', color: '#cc44ff' },
  { key: 'danger_zone', group: 'single', name: 'Danger Zone', description: '15+ near misses in one run', type: 'single_run', icon: '⚠️', color: '#ff9900' },
  { key: 'hoarder', group: 'single', name: 'Hoarder', description: 'Collect 6+ bonuses in one run', type: 'single_run', icon: '💰', color: '#ffe600' },
  { key: 'hard_debut', group: 'single', name: 'Hard Debut', description: 'Survive 30s on Hard difficulty', type: 'single_run', icon: '💀', color: '#ff4444' },
  { key: 'pacifist', group: 'single', name: 'Pacifist', description: 'Survive 45s collecting no bonuses', type: 'single_run', icon: '☮️', color: '#00eeff' },
];

// Toast timing constants
const TOAST_SLIDE_MS = 150;
const TOAST_VISIBLE_MS = 2500;
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
    <span class="toast-icon">${ach.icon}</span>
    <div class="toast-body">
      <div class="toast-title" style="color:${ach.color}">${ach.name}</div>
      <div class="toast-desc">${ach.description}</div>
    </div>
  `;
  container.appendChild(toast);

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
}

// Returns keys that fired mid-run this session — used by evaluateAchievements to persist them
export function getFiredMidRunKeys() {
  return [..._firedThisRun];
}

// Checks mid-run single-run achievement conditions synchronously.
// Returns newly-triggered keys not already in unlockedSet or fired this run.
// state: { elapsed, difficulty }, nearMisses: number, bonusesCollected: number
// unlockedSet: Set<string> of already-unlocked keys (cached at run start)
export function checkMidRunAchievements(state, nearMisses, bonusesCollected, unlockedSet) {
  const candidates = [];

  if (state.elapsed >= 60000) candidates.push('minuteman');
  if (state.elapsed >= 30000 && nearMisses === 0) candidates.push('untouchable');
  if (nearMisses >= 15) candidates.push('danger_zone');
  if (bonusesCollected >= 6) candidates.push('hoarder');
  if (state.difficulty === 'hard' && state.elapsed >= 30000) candidates.push('hard_debut');
  if (state.elapsed >= 45000 && bonusesCollected === 0) candidates.push('pacifist');

  const newKeys = candidates.filter(k => !unlockedSet.has(k) && !_firedThisRun.has(k));
  for (const k of newKeys) _firedThisRun.add(k);
  return newKeys;
}

// Returns the current stat value for a milestone group — used for progress display
// stats: object from fetchAllTimeStats()
function _statForGroup(group, stats) {
  if (group === 'veteran') return stats.totalRuns ?? 0;
  if (group === 'survivor') return stats.totalElapsedMs ?? 0;
  if (group === 'collector') return stats.totalBonuses ?? 0;
  if (group === 'ghost') return stats.totalNearMisses ?? 0;
  if (group === 'hard_boiled') return stats.hardRunsCount ?? 0;
  return 0;
}

// Formats a raw stat value for display next to a milestone threshold
// survivor uses minutes, all others are plain counts
function _formatStat(group, value) {
  if (group === 'survivor') return `${Math.floor(value / 60000)}min`;
  return String(value);
}

function _formatThreshold(group, threshold) {
  if (group === 'survivor') return `${threshold / 60000}min`;
  return String(threshold);
}

// Populates #ach-list with two sections: Milestones then Single Run
// unlockedSet: Set<string>, stats: object from fetchAllTimeStats() or null
export function renderAchievementsOverlay(unlockedSet, stats) {
  const list = document.getElementById('ach-list');
  list.innerHTML = '';

  const milestones = ACHIEVEMENTS.filter(a => a.type === 'milestone');
  const singleRuns = ACHIEVEMENTS.filter(a => a.type === 'single_run');

  _renderSection(list, 'Milestones', milestones, unlockedSet, stats);
  _renderSection(list, 'Single Run', singleRuns, unlockedSet, null);
}

// Renders a labeled section of achievements into the given container element
function _renderSection(container, label, achievements, unlockedSet, stats) {
  const heading = document.createElement('div');
  heading.className = 'htp-section';
  heading.textContent = label;
  container.appendChild(heading);

  for (const ach of achievements) {
    const unlocked = unlockedSet.has(ach.key);
    const row = document.createElement('div');
    row.className = 'htp-row';
    row.style.opacity = unlocked ? '1' : '0.35';

    // Progress counter for locked milestones when stats are available
    let progressHtml = '';
    if (!unlocked && stats && ach.type === 'milestone') {
      const current = _statForGroup(ach.group, stats);
      const cur = _formatStat(ach.group, current);
      const thr = _formatThreshold(ach.group, ach.threshold);
      progressHtml = `<span class="ach-progress" style="color:${ach.color}">${cur} / ${thr}</span>`;
    }

    row.innerHTML = `
      <span style="font-size:20px;flex-shrink:0">${ach.icon}</span>
      <div style="flex:1;min-width:0">
        <div class="htp-label" style="color:${ach.color}">${ach.name}</div>
        <div class="htp-desc">${ach.description}${progressHtml}</div>
      </div>
    `;
    container.appendChild(row);
  }
}
