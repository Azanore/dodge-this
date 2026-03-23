// Entry point — bootstraps and wires all game modules together.
// Imports: all src modules, game.config.js (global)
// Does NOT handle rendering or game logic directly.

import { validateConfig } from './config.js';
import { resetState } from './GameState.js';
import { createGameLoop } from './GameLoop.js';
import { recomputeZones } from './zones.js';
import { update as updatePlayer } from './player.js';
import { gameUpdate } from './gameUpdate.js';
import { render, renderStartScreen, renderPauseScreen, initRenderer, isShaking, triggerShake, glowCircle, drawBall, drawBullet, drawShard, drawTracker } from './renderer.js';
import { showGameOver } from './gameOver.js';
import { initConfigPanel } from './configPanel.js';
import { initAudio, startMusic, pauseMusic, resumeMusic, playGameStart, sfxEnabled, musicEnabled, setSfx, setMusic } from './audio.js'; // AUDIO

// Apply config validation with fallbacks (Requirement 10.7)
validateConfig(gameConfig);

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game state
let state = resetState();
state.graceRemaining = gameConfig.gracePeriod;

// Last delta for render (updated each update call)
let lastDelta = 16;

// Spawn/bonus accumulators passed into gameUpdate
const accumulators = { spawn: 0, bonus: 0, scoreZone: 0 };

// Initialize renderer star field
initRenderer();
recomputeZones();

// Center player at inner zone on first frame
updatePlayer(state);

function update(delta) {
  lastDelta = delta;
  const result = gameUpdate(delta, state, accumulators);
  if (result === 'dead') {
    triggerShake();
    setTimeout(() => {
      loop.stop();
      syncHelpBtn();
      showGameOver(canvas, state, onRestart);
    }, 450);
  }
}

// Tracks pause screen audio button hit areas for click handling
let pauseHitAreas = null;

// Draws pause screen and stores hit areas
function drawPauseScreen() {
  pauseHitAreas = renderPauseScreen(ctx, sfxEnabled, musicEnabled);
}

function renderFrame() {
  if (state.status === 'dead' && !isShaking()) return;
  if (state.status === 'start') {
    render(ctx, state, lastDelta);
    renderStartScreen(ctx);
    return;
  }
  if (state.status === 'paused') return;
  render(ctx, state, lastDelta);
}

const loop = createGameLoop(update, renderFrame);

function onRestart() {
  state = resetState();
  state.status = 'grace';
  state.graceRemaining = gameConfig.gracePeriod;
  accumulators.spawn = 0;
  accumulators.bonus = 0;
  accumulators.scoreZone = 0;
  initRenderer();
  recomputeZones();
  updatePlayer(state);
  syncHelpBtn();
  loop.start();
}

// One-shot start action: click or keydown (except Escape) transitions from 'start' → 'grace'
function onStartAction(e) {
  if (state.status !== 'start') return;
  if (e.type === 'keydown' && e.key === 'Escape') return;
  if (howToPlayEl.classList.contains('open')) return; // modal intercepts input
  canvas.removeEventListener('click', onStartAction);
  window.removeEventListener('keydown', onStartAction);
  initAudio().then(() => { startMusic(); }); // AUDIO
  playGameStart(); // AUDIO
  state.status = 'grace';
  syncHelpBtn();
  loop.start();
}

canvas.addEventListener('click', onStartAction);
window.addEventListener('keydown', onStartAction);

// Escape key: pause/unpause during active or grace; ignored in dead/start
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (state.status === 'dead' || state.status === 'start') return;
  if (howToPlayEl.classList.contains('open')) return; // modal handles its own Escape
  const panel = document.getElementById('config-panel');
  if (panel && panel.style.display !== 'none') return;

  if (state.status === 'active' || state.status === 'grace') {
    state.prevStatus = state.status;
    state.status = 'paused';
    loop.stop();
    pauseMusic(); // AUDIO
    render(ctx, state, lastDelta);
    drawPauseScreen();
    syncHelpBtn();
  } else if (state.status === 'paused') {
    state.status = state.prevStatus;
    state.prevStatus = null;
    pauseHitAreas = null;
    resumeMusic(); // AUDIO
    syncHelpBtn();
    loop.start();
  }
});

// Click handler for pause screen audio toggles
canvas.addEventListener('click', (e) => {
  if (state.status !== 'paused' || !pauseHitAreas) return;
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const { sfx, music } = pauseHitAreas;
  if (px >= sfx.x && px <= sfx.x + sfx.w && py >= sfx.y && py <= sfx.y + sfx.h) {
    setSfx(!sfxEnabled); // AUDIO
    render(ctx, state, lastDelta);
    drawPauseScreen();
  } else if (px >= music.x && px <= music.x + music.w && py >= music.y && py <= music.y + music.h) {
    setMusic(!musicEnabled); // AUDIO
    render(ctx, state, lastDelta);
    drawPauseScreen();
  }
});

// HTML how-to-play modal — show/hide button based on game status, draw shape icons once on open
const helpBtn = document.getElementById('help-btn');
const howToPlayEl = document.getElementById('how-to-play');

// Draws all shape icons into their inline canvases
function drawHtpIcons() {
  const C = (id) => document.getElementById(id);
  const cx2d = (id) => C(id).getContext('2d');
  const cx = 16, cy = 16; // center of each 32x32 canvas

  const pc = cx2d('htp-player');
  glowCircle(pc, cx, cy, 9, '#00eeff', 12);
  glowCircle(pc, cx, cy, 3, '#ffffff', 5);

  drawBall(cx2d('htp-ball'), { x: cx, y: cy, radius: 10 }, '#ff4444');
  drawBullet(cx2d('htp-bullet'), { x: cx, y: cy, radius: 5, vx: 1, vy: 0 }, '#ffffff');
  drawShard(cx2d('htp-shard'), { x: cx, y: cy, radius: 10, vx: 1, vy: 0 }, '#ff9900');
  drawTracker(cx2d('htp-tracker'), { x: cx, y: cy, radius: 9 }, '#cc44ff');

  const zc = cx2d('htp-zone');
  zc.strokeStyle = '#00ff88';
  zc.shadowColor = '#00ff88';
  zc.shadowBlur = 8;
  zc.lineWidth = 2;
  zc.beginPath();
  zc.arc(cx, cy, 11, 0, Math.PI * 2);
  zc.stroke();

  const bonusIcons = [
    ['htp-slowmo', '#0088ff'], ['htp-shield', '#ffe600'],
    ['htp-clear', '#ff4dff'], ['htp-shrink', '#00ff99'],
  ];
  for (const [id, color] of bonusIcons) {
    const bc = cx2d(id);
    glowCircle(bc, cx, cy, 8, color, 12);
    glowCircle(bc, cx, cy, 4, '#ffffff', 5);
  }
}

// Updates help button visibility based on current game status
function syncHelpBtn() {
  const visible = state.status === 'start' || state.status === 'paused';
  helpBtn.style.display = visible ? 'block' : 'none';
}

helpBtn.addEventListener('click', () => {
  drawHtpIcons();
  howToPlayEl.classList.add('open');
});

howToPlayEl.addEventListener('click', (e) => {
  if (e.target === howToPlayEl) howToPlayEl.classList.remove('open');
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && howToPlayEl.classList.contains('open')) {
    howToPlayEl.classList.remove('open');
  }
});

// Render the start screen before the loop begins
renderFrame();
syncHelpBtn();

// Init dev config panel — passes loop control and restart callback (Requirement 12.1–12.7)
initConfigPanel(loop, onRestart, () => state.status);
