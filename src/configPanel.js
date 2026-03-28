// Dev config panel: DOM overlay for runtime config tuning, toggled by P key.
// Related: main.js, game.config.js, GameLoop.js, renderer.js
// Does not contain game logic — only reads/writes gameConfig and delegates restart.

import { toggleHitboxes } from './renderer.js';

// Slider definitions: [key path, min, max, step]
const SLIDERS = [
  { label: 'Grace Period (ms)', path: ['gracePeriod'], min: 0, max: 10000, step: 100 },
];

// Read a nested config value by path array
function getPath(obj, path) {
  return path.reduce((o, k) => o[k], obj);
}

// Write a nested config value by path array
function setPath(obj, path, value) {
  const last = path[path.length - 1];
  const parent = path.slice(0, -1).reduce((o, k) => o[k], obj);
  parent[last] = value;
}

// Build and return the panel DOM element
function buildPanel() {
  const overlay = document.createElement('div');
  overlay.id = 'config-panel';
  Object.assign(overlay.style, {
    position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
    background: 'rgba(0,0,0,0.82)', color: '#e0e0e0',
    display: 'none', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', zIndex: '1000', fontFamily: 'monospace',
    fontSize: '14px', userSelect: 'none',
  });

  const box = document.createElement('div');
  Object.assign(box.style, {
    background: '#111', border: '1px solid #333', borderRadius: '8px',
    padding: '24px 32px', minWidth: '340px', maxHeight: '80vh',
    overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px',
  });

  const title = document.createElement('div');
  title.textContent = 'DEV CONFIG PANEL  [P to close]';
  Object.assign(title.style, { fontWeight: 'bold', fontSize: '16px', marginBottom: '4px', color: '#fff' });
  box.appendChild(title);

  // --- Obstacle type toggles ---
  const obsSection = document.createElement('div');
  obsSection.innerHTML = '<div style="color:#aaa;margin-bottom:6px">OBSTACLE TYPES</div>';
  for (const [name] of Object.entries(gameConfig.obstacleTypes)) {
    obsSection.appendChild(makeCheckbox(`obstacle-${name}`, name, gameConfig.obstacleTypes[name].enabled));
  }
  box.appendChild(obsSection);

  // --- Bonus type toggles ---
  const bonusSection = document.createElement('div');
  bonusSection.innerHTML = '<div style="color:#aaa;margin-bottom:6px">BONUS TYPES</div>';
  for (const [name] of Object.entries(gameConfig.bonusTypes)) {
    bonusSection.appendChild(makeCheckbox(`bonus-${name}`, name, gameConfig.bonusTypes[name].enabled));
  }
  box.appendChild(bonusSection);

  // --- Sliders ---
  const sliderSection = document.createElement('div');
  sliderSection.innerHTML = '<div style="color:#aaa;margin-bottom:6px">PARAMETERS</div>';
  for (const def of SLIDERS) {
    sliderSection.appendChild(makeSlider(def));
  }
  box.appendChild(sliderSection);

  // --- Debug ---
  const debugSection = document.createElement('div');
  debugSection.innerHTML = '<div style="color:#aaa;margin-bottom:6px">DEBUG</div>';
  const hitboxRow = makeCheckbox('debug-hitboxes', 'Show hitboxes', false);
  hitboxRow.querySelector('input').addEventListener('change', toggleHitboxes);
  debugSection.appendChild(hitboxRow);
  box.appendChild(debugSection);

  // --- Buttons ---
  const btnRow = document.createElement('div');
  Object.assign(btnRow.style, { display: 'flex', gap: '12px', marginTop: '8px' });

  const restartBtn = document.createElement('button');
  restartBtn.id = 'config-restart-btn';
  restartBtn.textContent = 'Restart with changes';
  styleButton(restartBtn, '#2a6');

  const closeBtn = document.createElement('button');
  closeBtn.id = 'config-close-btn';
  closeBtn.textContent = 'Close (discard)';
  styleButton(closeBtn, '#555');

  btnRow.appendChild(restartBtn);
  btnRow.appendChild(closeBtn);
  box.appendChild(btnRow);

  overlay.appendChild(box);
  return overlay;
}

function makeCheckbox(id, label, checked) {
  const row = document.createElement('label');
  Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '4px' });
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = id;
  cb.checked = checked;
  row.appendChild(cb);
  row.appendChild(document.createTextNode(label));
  return row;
}

function makeSlider(def) {
  const row = document.createElement('div');
  Object.assign(row.style, { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' });

  const labelRow = document.createElement('div');
  Object.assign(labelRow.style, { display: 'flex', justifyContent: 'space-between' });

  const labelEl = document.createElement('span');
  labelEl.textContent = def.label;

  const valueEl = document.createElement('span');
  valueEl.id = `slider-val-${def.path.join('-')}`;
  valueEl.textContent = getPath(gameConfig, def.path);

  labelRow.appendChild(labelEl);
  labelRow.appendChild(valueEl);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = `slider-${def.path.join('-')}`;
  slider.min = def.min;
  slider.max = def.max;
  slider.step = def.step;
  slider.value = Math.min(def.max, Math.max(def.min, getPath(gameConfig, def.path)));
  Object.assign(slider.style, { width: '100%' });

  slider.addEventListener('input', () => {
    // Clamp to valid range (Requirement 12.7)
    const clamped = Math.min(def.max, Math.max(def.min, parseFloat(slider.value)));
    slider.value = clamped;
    valueEl.textContent = clamped;
  });

  row.appendChild(labelRow);
  row.appendChild(slider);
  return row;
}

function styleButton(btn, bg) {
  Object.assign(btn.style, {
    background: bg, color: '#fff', border: 'none', borderRadius: '4px',
    padding: '8px 16px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '13px',
  });
}

// Reads current panel values into a plain object (does not mutate gameConfig yet)
function readPanelValues(panel) {
  const values = { obstacleTypes: {}, bonusTypes: {}, sliders: {} };

  for (const [name] of Object.entries(gameConfig.obstacleTypes)) {
    const cb = panel.querySelector(`#obstacle-${name}`);
    values.obstacleTypes[name] = cb ? cb.checked : gameConfig.obstacleTypes[name].enabled;
  }
  for (const [name] of Object.entries(gameConfig.bonusTypes)) {
    const cb = panel.querySelector(`#bonus-${name}`);
    values.bonusTypes[name] = cb ? cb.checked : gameConfig.bonusTypes[name].enabled;
  }
  for (const def of SLIDERS) {
    const slider = panel.querySelector(`#slider-${def.path.join('-')}`);
    const clamped = slider
      ? Math.min(def.max, Math.max(def.min, parseFloat(slider.value)))
      : getPath(gameConfig, def.path);
    values.sliders[def.path.join('-')] = { path: def.path, value: clamped };
  }
  return values;
}

// Applies panel values to the live gameConfig object (Requirement 12.4, 12.5)
function applyPanelValues(values) {
  for (const [name, enabled] of Object.entries(values.obstacleTypes)) {
    gameConfig.obstacleTypes[name].enabled = enabled;
  }
  for (const [name, enabled] of Object.entries(values.bonusTypes)) {
    gameConfig.bonusTypes[name].enabled = enabled;
  }
  for (const { path, value } of Object.values(values.sliders)) {
    setPath(gameConfig, path, value);
  }
}

// Resets panel inputs to reflect current gameConfig (used when discarding changes)
function syncPanelToConfig(panel) {
  for (const [name] of Object.entries(gameConfig.obstacleTypes)) {
    const cb = panel.querySelector(`#obstacle-${name}`);
    if (cb) cb.checked = gameConfig.obstacleTypes[name].enabled;
  }
  for (const [name] of Object.entries(gameConfig.bonusTypes)) {
    const cb = panel.querySelector(`#bonus-${name}`);
    if (cb) cb.checked = gameConfig.bonusTypes[name].enabled;
  }
  for (const def of SLIDERS) {
    const slider = panel.querySelector(`#slider-${def.path.join('-')}`);
    const valEl = panel.querySelector(`#slider-val-${def.path.join('-')}`);
    const current = getPath(gameConfig, def.path);
    if (slider) slider.value = current;
    if (valEl) valEl.textContent = current;
  }
}

// Initializes the config panel and wires keyboard + button events.
// loop: { start, stop } — the game loop instance
// onRestart: () => void — resets state and begins a new run
export function initConfigPanel(loop, onRestart, getStatus) {
  const panel = buildPanel();
  document.body.appendChild(panel);

  let pausedByPanel = false;

  function openPanel() {
    syncPanelToConfig(panel);
    panel.style.display = 'flex';
    // Pause only if actively playing (Requirement 12.3)
    if (getStatus() === 'active' || getStatus() === 'grace') {
      loop.stop();
      pausedByPanel = true;
    }
  }

  function closePanel(applyChanges) {
    panel.style.display = 'none';
    if (applyChanges) {
      const values = readPanelValues(panel);
      applyPanelValues(values);
      onRestart();
      pausedByPanel = false;
    } else {
      // Discard — resume if we paused (Requirement 12.6)
      if (pausedByPanel) {
        loop.start();
        pausedByPanel = false;
      }
    }
  }

  // Toggle on P key (Requirement 12.1)
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'p' && e.key !== 'P') return;
    if (panel.style.display === 'none') {
      openPanel();
    } else {
      closePanel(false);
    }
  });

  panel.querySelector('#config-restart-btn').addEventListener('click', () => closePanel(true));
  panel.querySelector('#config-close-btn').addEventListener('click', () => closePanel(false));
}
