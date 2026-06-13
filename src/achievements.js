// Achievement definitions, overlay rendering, toast queue, and mid-run checks.
// Related: stats.js (post-run evaluation), main.js (wiring), gameUpdate.js (mid-run hooks)
// Does not handle DB operations — evaluation and fetch live in stats.js.

export const ACHIEVEMENTS = [
  // --- MILESTONES (Persistent progress) ---
  { key: 'veteran_1', group: 'veteran', name: 'Novice Pilot', description: 'Play 5 games', type: 'milestone', icon: 'award', color: '#00eeff', threshold: 5 },
  { key: 'veteran_2', group: 'veteran', name: 'Veteran Pilot', description: 'Play 25 games', type: 'milestone', icon: 'award', color: '#00eeff', threshold: 25 },
  { key: 'veteran_3', group: 'veteran', name: 'Elite Pilot', description: 'Play 100 games', type: 'milestone', icon: 'award', color: '#00eeff', threshold: 100 },

  { key: 'survivor_1', group: 'survivor', name: 'Time Walker', description: 'Survive 15 min total', type: 'milestone', icon: 'timer', color: '#00ff88', threshold: 900000 },
  { key: 'survivor_2', group: 'survivor', name: 'Eternal Drifter', description: 'Survive 60 min total', type: 'milestone', icon: 'timer', color: '#00ff88', threshold: 3600000 },

  { key: 'collector_1', group: 'collector', name: 'Fragment Seeker', description: 'Collect 50 bonuses', type: 'milestone', icon: 'sparkles', color: '#ffe600', threshold: 50 },
  { key: 'collector_2', group: 'collector', name: 'Hoard Master', description: 'Collect 250 bonuses', type: 'milestone', icon: 'sparkles', color: '#ffe600', threshold: 250 },

  { key: 'ghost_1', group: 'ghost', name: 'Ghost', description: '100 near misses total', type: 'milestone', icon: 'ghost', color: '#cc44ff', threshold: 100 },
  { key: 'ghost_2', group: 'ghost', name: 'Wraith', description: '500 near misses total', type: 'milestone', icon: 'ghost', color: '#cc44ff', threshold: 500 },

  { key: 'hard_boiled_1', group: 'hard_boiled', name: 'Hardened', description: 'Play 20 hard runs', type: 'milestone', icon: 'flame', color: '#ff4444', threshold: 20 },

  // --- CHALLENGES (Single-run achievements) ---
  { key: 'first_blood', group: 'single', name: 'First Contact', description: 'Survive at least 5s', type: 'single_run', icon: 'play', color: '#ffffff' },
  { key: 'minuteman', group: 'single', name: 'Endurance', description: 'Survive 60s in one run', type: 'single_run', icon: 'clock', color: '#00ff88' },
  { key: 'untouchable', group: 'single', name: 'Untouchable', description: 'Survive 30s with 0 near misses', type: 'single_run', icon: 'shield-check', color: '#cc44ff' },
  { key: 'danger_zone', group: 'single', name: 'Edge Case', description: '20 near misses in one run', type: 'single_run', icon: 'zap', color: '#ff9900' },
  { key: 'hoarder', group: 'single', name: 'Collector', description: '10 bonuses in one run', type: 'single_run', icon: 'briefcase', color: '#ffe600' },
  { key: 'hard_debut', group: 'single', name: 'Trial by Fire', description: 'Survive 45s on Hard', type: 'single_run', icon: 'skull', color: '#ff4444' },
  { key: 'pacifist', group: 'single', name: 'Pacifist', description: 'Survive 60s with no bonuses', type: 'single_run', icon: 'heart', color: '#00eeff' },

  // NEW advanced achievements
  { key: 'close_call', group: 'single', name: 'Reflex Action', description: '3 near-misses in 1 second', type: 'single_run', icon: 'eye', color: '#ff00ff' },
  { key: 'surgical_strike', group: 'single', name: 'Surgical Strike', description: 'Clear 20+ obstacles at once', type: 'single_run', icon: 'target', color: '#ff4dff' },
  { key: 'risk_taker', group: 'single', name: 'Risk Taker', description: 'Stay in score zone for 8s', type: 'single_run', icon: 'trending-up', color: '#00ff88' },
  { key: 'speed_demon', group: 'single', name: 'Speed Demon', description: 'Survive 20s at 3.0x+ difficulty', type: 'single_run', icon: 'fast-forward', color: '#ff9900' },
  { key: 'perfectionist', group: 'single', name: 'Perfectionist', description: 'Bank 1000+ pts in one go', type: 'single_run', icon: 'diamond', color: '#ffe600' },
  { key: 'time_bender', group: 'single', name: 'Time Bender', description: 'Collect 4 Slowmo in one run', type: 'single_run', icon: 'hourglass', color: '#0088ff' },
  { key: 'immortal', group: 'single', name: 'Aegis', description: 'Collect 4 Shields in one run', type: 'single_run', icon: 'shield', color: '#ffe600' }
];

// Toast timing constants
const TOAST_SLIDE_MS = 150;
const TOAST_VISIBLE_MS = 3000;
const TOAST_GAP_MS = 80;

let _queue = [];
let _processing = false;
let _timerIds = [];
let _firedThisRun = new Set();

function _track(id) { _timerIds.push(id); return id; }

function _processNext() {
  if (_queue.length === 0) { _processing = false; return; }
  _processing = true;

  const ach = _queue.shift();
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.style.borderColor = ach.color;
  toast.innerHTML = `
    <div class="toast-icon" style="color:${ach.color}"><i data-lucide="${ach.icon}"></i></div>
    <div class="toast-body">
      <div class="toast-title" style="color:${ach.color}">${ach.name}</div>
      <div class="toast-desc">${ach.description}</div>
    </div>
  `;
  container.appendChild(toast);

  if (window.lucide) window.lucide.createIcons({ attrs: { class: 'lucide-toast-icon' } });

  requestAnimationFrame(() => { toast.classList.add('visible'); });

  _track(setTimeout(() => {
    toast.classList.remove('visible');
    _track(setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      _track(setTimeout(_processNext, TOAST_GAP_MS));
    }, TOAST_SLIDE_MS));
  }, TOAST_VISIBLE_MS));
}

export function queueToasts(keys) {
  if (!keys.length) return;
  for (const key of keys) {
    const ach = ACHIEVEMENTS.find(a => a.key === key);
    if (ach) _queue.push(ach);
  }
  if (!_processing) _processNext();
}

export function clearToastQueue() {
  _queue = [];
  for (const id of _timerIds) clearTimeout(id);
  _timerIds = [];
  _processing = false;
  const container = document.getElementById('toast-container');
  if (container) container.innerHTML = '';
}

export function resetMidRunTracking() { _firedThisRun = new Set(); }
export function getFiredMidRunKeys() { return [..._firedThisRun]; }

// Checks mid-run single-run achievement conditions.
// state: current game state, stats: in-run stats from getRunStats()
export function checkMidRunAchievements(state, stats, unlockedSet) {
  const candidates = [];

  if (state.elapsed >= 60000) candidates.push('minuteman');
  if (state.elapsed >= 30000 && stats.nearMisses === 0) candidates.push('untouchable');
  if (stats.nearMisses >= 20) candidates.push('danger_zone');
  if (stats.bonusesCollected >= 10) candidates.push('hoarder');
  if (state.difficulty === 'hard' && state.elapsed >= 45000) candidates.push('hard_debut');
  if (state.elapsed >= 60000 && stats.bonusesCollected === 0) candidates.push('pacifist');

  // Advanced New Checks
  if (stats.maxNearMissesInShortWindow >= 3) candidates.push('close_call');
  if (stats.maxScreenclearKill >= 20) candidates.push('surgical_strike');
  if (stats.maxZoneTimeContinuous >= 8000) candidates.push('risk_taker');
  if (state.elapsed >= 20000 && stats.minSpeedInLast20s >= 3.0) candidates.push('speed_demon');
  if (stats.maxPendingBanked >= 1000) candidates.push('perfectionist');
  if (stats.bonusCounts?.slowmo >= 4) candidates.push('time_bender');
  if (stats.bonusCounts?.invincibility >= 4) candidates.push('immortal');

  const newKeys = candidates.filter(k => !unlockedSet.has(k) && !_firedThisRun.has(k));
  for (const k of newKeys) _firedThisRun.add(k);
  return newKeys;
}

function _statForGroup(group, stats) {
  if (group === 'veteran') return stats.totalRuns ?? 0;
  if (group === 'survivor') return stats.totalElapsedMs ?? 0;
  if (group === 'collector') return stats.totalBonuses ?? 0;
  if (group === 'ghost') return stats.totalNearMisses ?? 0;
  if (group === 'hard_boiled') return stats.hardRunsCount ?? 0;
  return 0;
}

function _formatThreshold(group, threshold) {
  if (group === 'survivor') return `${threshold / 60000}m`;
  return String(threshold);
}

export function renderAchievementsOverlay(unlockedSet, stats) {
  const list = document.getElementById('ach-list');
  if (!list) return;
  list.innerHTML = '';

  const milestones = ACHIEVEMENTS.filter(a => a.type === 'milestone');
  const singleRuns = ACHIEVEMENTS.filter(a => a.type === 'single_run');

  _renderSection(list, 'Milestones', milestones, unlockedSet, stats);
  _renderSection(list, 'Single Run Challenges', singleRuns, unlockedSet, null);

  if (window.lucide) window.lucide.createIcons();
}

function _renderSection(container, label, achievements, unlockedSet, stats) {
  const heading = document.createElement('div');
  heading.className = 'htp-section';
  heading.textContent = label;
  container.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'ach-grid';
  container.appendChild(grid);

  for (const ach of achievements) {
    const unlocked = unlockedSet.has(ach.key);
    const card = document.createElement('div');
    card.className = `ach-card ${unlocked ? 'unlocked' : 'locked'}`;
    card.style.setProperty('--ach-color', ach.color);
    card.style.setProperty('--ach-color-dim', ach.color + '33');

    let progressHtml = '';
    if (!unlocked && stats && ach.type === 'milestone') {
      const current = _statForGroup(ach.group, stats);
      const percent = Math.min(100, Math.max(0, (current / ach.threshold) * 100));
      progressHtml = `
        <div class="ach-progress-container">
          <div class="ach-progress-bar" style="width: ${percent}%"></div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="ach-card-icon"><i data-lucide="${ach.icon}"></i></div>
      <div class="ach-card-name">${ach.name}</div>
      <div class="ach-card-desc">${ach.description}</div>
      ${progressHtml}
    `;
    grid.appendChild(card);
  }
}
