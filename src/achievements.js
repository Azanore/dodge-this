// Achievement definitions, overlay rendering, and toast notification queue.
// Related: stats.js (evaluation), main.js (wiring), index.html (#achievements-screen, #toast-container)
// Does not handle DB operations — evaluation and fetch live in stats.js.

export const ACHIEVEMENTS = [
  // Veteran — total runs
  { key: 'veteran_1', group: 'veteran', name: 'Veteran I', description: 'Play 1 game', type: 'milestone', icon: '🎮', color: '#00eeff' },
  { key: 'veteran_2', group: 'veteran', name: 'Veteran II', description: 'Play 5 games', type: 'milestone', icon: '🎮', color: '#00eeff' },
  { key: 'veteran_3', group: 'veteran', name: 'Veteran III', description: 'Play 10 games', type: 'milestone', icon: '🎮', color: '#00eeff' },
  { key: 'veteran_4', group: 'veteran', name: 'Veteran IV', description: 'Play 25 games', type: 'milestone', icon: '🎮', color: '#00eeff' },
  { key: 'veteran_5', group: 'veteran', name: 'Veteran V', description: 'Play 50 games', type: 'milestone', icon: '🎮', color: '#00eeff' },
  { key: 'veteran_6', group: 'veteran', name: 'Veteran VI', description: 'Play 100 games', type: 'milestone', icon: '🎮', color: '#00eeff' },

  // Survivor — total elapsed ms
  { key: 'survivor_1', group: 'survivor', name: 'Survivor I', description: 'Survive 5 minutes total', type: 'milestone', icon: '⏱️', color: '#00ff88' },
  { key: 'survivor_2', group: 'survivor', name: 'Survivor II', description: 'Survive 15 minutes total', type: 'milestone', icon: '⏱️', color: '#00ff88' },
  { key: 'survivor_3', group: 'survivor', name: 'Survivor III', description: 'Survive 30 minutes total', type: 'milestone', icon: '⏱️', color: '#00ff88' },
  { key: 'survivor_4', group: 'survivor', name: 'Survivor IV', description: 'Survive 60 minutes total', type: 'milestone', icon: '⏱️', color: '#00ff88' },
  { key: 'survivor_5', group: 'survivor', name: 'Survivor V', description: 'Survive 120 minutes total', type: 'milestone', icon: '⏱️', color: '#00ff88' },

  // Collector — total bonuses
  { key: 'collector_1', group: 'collector', name: 'Collector I', description: 'Collect 10 bonuses', type: 'milestone', icon: '✨', color: '#ffe600' },
  { key: 'collector_2', group: 'collector', name: 'Collector II', description: 'Collect 50 bonuses', type: 'milestone', icon: '✨', color: '#ffe600' },
  { key: 'collector_3', group: 'collector', name: 'Collector III', description: 'Collect 150 bonuses', type: 'milestone', icon: '✨', color: '#ffe600' },
  { key: 'collector_4', group: 'collector', name: 'Collector IV', description: 'Collect 300 bonuses', type: 'milestone', icon: '✨', color: '#ffe600' },

  // Ghost — total near misses
  { key: 'ghost_1', group: 'ghost', name: 'Ghost I', description: '25 near misses total', type: 'milestone', icon: '👻', color: '#cc44ff' },
  { key: 'ghost_2', group: 'ghost', name: 'Ghost II', description: '100 near misses total', type: 'milestone', icon: '👻', color: '#cc44ff' },
  { key: 'ghost_3', group: 'ghost', name: 'Ghost III', description: '300 near misses total', type: 'milestone', icon: '👻', color: '#cc44ff' },
  { key: 'ghost_4', group: 'ghost', name: 'Ghost IV', description: '750 near misses total', type: 'milestone', icon: '👻', color: '#cc44ff' },

  // Hard Boiled — hard runs
  { key: 'hard_boiled_1', group: 'hard_boiled', name: 'Hard Boiled I', description: 'Play 5 hard runs', type: 'milestone', icon: '🔥', color: '#ff4444' },
  { key: 'hard_boiled_2', group: 'hard_boiled', name: 'Hard Boiled II', description: 'Play 15 hard runs', type: 'milestone', icon: '🔥', color: '#ff4444' },
  { key: 'hard_boiled_3', group: 'hard_boiled', name: 'Hard Boiled III', description: 'Play 30 hard runs', type: 'milestone', icon: '🔥', color: '#ff4444' },
  { key: 'hard_boiled_4', group: 'hard_boiled', name: 'Hard Boiled IV', description: 'Play 50 hard runs', type: 'milestone', icon: '🔥', color: '#ff4444' },

  // Single-run achievements
  { key: 'first_blood', group: 'single', name: 'First Blood', description: 'Play your first game', type: 'single_run', icon: '🩸', color: '#ff4444' },
  { key: 'minuteman', group: 'single', name: 'Minuteman', description: 'Survive 60 seconds in one run', type: 'single_run', icon: '⚡', color: '#00ff88' },
  { key: 'untouchable', group: 'single', name: 'Untouchable', description: 'Survive 30s with 0 near misses', type: 'single_run', icon: '🛡️', color: '#cc44ff' },
  { key: 'danger_zone', group: 'single', name: 'Danger Zone', description: '15+ near misses in one run', type: 'single_run', icon: '⚠️', color: '#ff9900' },
  { key: 'hoarder', group: 'single', name: 'Hoarder', description: 'Collect 6+ bonuses in one run', type: 'single_run', icon: '💰', color: '#ffe600' },
  { key: 'hard_debut', group: 'single', name: 'Hard Debut', description: 'Survive 30s on Hard difficulty', type: 'single_run', icon: '💀', color: '#ff4444' },
  { key: 'pacifist', group: 'single', name: 'Pacifist', description: 'Survive 45s collecting no bonuses', type: 'single_run', icon: '☮️', color: '#00eeff' },
];

// Internal toast queue state
let _queue = [];
let _processing = false;
let _timerIds = [];

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

  // Trigger slide-in on next frame
  requestAnimationFrame(() => { toast.classList.add('visible'); });

  // Slide out after 2500ms
  _track(setTimeout(() => {
    toast.classList.remove('visible');
    // Remove element after slide-out (300ms), then gap (100ms) before next
    _track(setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      _track(setTimeout(_processNext, 100));
    }, 300));
  }, 2500));
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

// Populates #ach-list with two sections: Milestones then Single Run
// unlockedSet is a Set<string> of achievement keys
export function renderAchievementsOverlay(unlockedSet) {
  const list = document.getElementById('ach-list');
  list.innerHTML = '';

  const milestones = ACHIEVEMENTS.filter(a => a.type === 'milestone');
  const singleRuns = ACHIEVEMENTS.filter(a => a.type === 'single_run');

  _renderSection(list, 'Milestones', milestones, unlockedSet);
  _renderSection(list, 'Single Run', singleRuns, unlockedSet);
}

// Renders a labeled section of achievements into the given container element
function _renderSection(container, label, achievements, unlockedSet) {
  const heading = document.createElement('div');
  heading.className = 'htp-section';
  heading.textContent = label;
  container.appendChild(heading);

  for (const ach of achievements) {
    const unlocked = unlockedSet.has(ach.key);
    const row = document.createElement('div');
    row.className = 'htp-row';
    row.style.opacity = unlocked ? '1' : '0.35';
    row.innerHTML = `
      <span style="font-size:20px;flex-shrink:0">${ach.icon}</span>
      <div>
        <div class="htp-label" style="color:${ach.color}">${ach.name}</div>
        <div class="htp-desc">${ach.description}</div>
      </div>
    `;
    container.appendChild(row);
  }
}
