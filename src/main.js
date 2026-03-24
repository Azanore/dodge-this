// Entry point — bootstraps and wires all game modules together.
// Imports: all src modules, game.config.js (global)
// Does NOT handle rendering or game logic directly.

import { validateConfig } from './config.js';
import { resetState } from './GameState.js';
import { createGameLoop } from './GameLoop.js';
import { recomputeZones } from './zones.js';
import { update as updatePlayer } from './player.js';
import { gameUpdate } from './gameUpdate.js';
import { render, renderStartScreen, initRenderer, isShaking, triggerShake, glowCircle, drawBall, drawBullet, drawShard, drawTracker } from './renderer.js';
import { showGameOver } from './gameOver.js';
import { initConfigPanel } from './configPanel.js';
import { initAudio, startMusic, pauseMusic, resumeMusic, playGameStart, sfxEnabled, musicEnabled, setSfx, setMusic } from './audio.js'; // AUDIO

validateConfig(gameConfig);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let state = resetState();
state.graceRemaining = gameConfig.gracePeriod;
let lastDelta = 16;
const accumulators = { spawn: 0, bonus: 0, scoreZone: 0 };

initRenderer();
recomputeZones();
updatePlayer(state);

function update(delta) {
  lastDelta = delta;
  const result = gameUpdate(delta, state, accumulators);
  if (result === 'dead') {
    triggerShake();
    setTimeout(() => {
      loop.stop();
      syncHelpBtn();
      showGameOver(state, onRestart);
    }, 450);
  }
}

function renderFrame() {
  if (state.status === 'dead' && !isShaking()) return;
  if (state.status === 'start') { render(ctx, state, lastDelta); renderStartScreen(ctx); return; }
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

// Start action — click or any key (except Escape) from 'start' state
function onStartAction(e) {
  if (state.status !== 'start') return;
  if (e.type === 'keydown' && e.key === 'Escape') return;
  if (howToPlayEl.classList.contains('open')) return;
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

// Pause / unpause via Escape
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (state.status === 'dead' || state.status === 'start') return;
  if (howToPlayEl.classList.contains('open')) return;
  const panel = document.getElementById('config-panel');
  if (panel && panel.style.display !== 'none') return;

  if (state.status === 'active' || state.status === 'grace') {
    state.prevStatus = state.status;
    state.status = 'paused';
    loop.stop();
    pauseMusic(); // AUDIO
    pauseScreenEl.classList.add('open');
    syncHelpBtn();
  } else if (state.status === 'paused') {
    resumeGame();
  }
});

function resumeGame() {
  state.status = state.prevStatus;
  state.prevStatus = null;
  pauseScreenEl.classList.remove('open');
  resumeMusic(); // AUDIO
  syncHelpBtn();
  loop.start();
}

// Pause screen — audio toggle buttons
const pauseScreenEl = document.getElementById('pause-screen');
const sfxBtn = document.getElementById('sfx-btn');
const musicBtn = document.getElementById('music-btn');

document.getElementById('resume-btn').addEventListener('click', resumeGame);

// Syncs toggle button appearance to current enabled state
function syncAudioBtns() {
  sfxBtn.textContent = `SFX: ${sfxEnabled ? 'ON' : 'OFF'}`;
  sfxBtn.className = `toggle-btn ${sfxEnabled ? 'on' : 'off'}`;
  musicBtn.textContent = `MUSIC: ${musicEnabled ? 'ON' : 'OFF'}`;
  musicBtn.className = `toggle-btn ${musicEnabled ? 'on' : 'off'}`;
}
syncAudioBtns();

sfxBtn.addEventListener('click', () => { setSfx(!sfxEnabled); syncAudioBtns(); }); // AUDIO
musicBtn.addEventListener('click', () => {
  setMusic(!musicEnabled);
  if (musicEnabled && state.status !== 'paused') startMusic(); // re-enable during active play
  syncAudioBtns();
}); // AUDIO

// How-to-play modal
const helpBtn = document.getElementById('help-btn');
const howToPlayEl = document.getElementById('how-to-play');

// Draws all shape icons into their inline canvases — clears first to prevent glow accumulation
function drawHtpIcons() {
  const ids = ['htp-player', 'htp-ball', 'htp-bullet', 'htp-shard', 'htp-tracker', 'htp-zone', 'htp-slowmo', 'htp-shield', 'htp-clear', 'htp-shrink'];
  const cx2d = (id) => document.getElementById(id).getContext('2d');
  const cx = 16, cy = 16;
  for (const id of ids) { const c = cx2d(id); c.clearRect(0, 0, 32, 32); }

  const pc = cx2d('htp-player');
  glowCircle(pc, cx, cy, 9, '#00eeff', 12);
  glowCircle(pc, cx, cy, 3, '#ffffff', 5);

  drawBall(cx2d('htp-ball'), { x: cx, y: cy, radius: 10 }, '#ff4444');
  drawBullet(cx2d('htp-bullet'), { x: cx, y: cy, radius: 5, vx: 1, vy: 0 }, '#ffffff');
  drawShard(cx2d('htp-shard'), { x: cx, y: cy, radius: 10, vx: 1, vy: 0 }, '#ff9900');
  drawTracker(cx2d('htp-tracker'), { x: cx, y: cy, radius: 9 }, '#cc44ff');

  const zc = cx2d('htp-zone');
  zc.strokeStyle = '#00ff88'; zc.shadowColor = '#00ff88'; zc.shadowBlur = 8; zc.lineWidth = 2;
  zc.beginPath(); zc.arc(cx, cy, 11, 0, Math.PI * 2); zc.stroke();

  for (const [id, color] of [['htp-slowmo', '#0088ff'], ['htp-shield', '#ffe600'], ['htp-clear', '#ff4dff'], ['htp-shrink', '#00ff99']]) {
    const bc = cx2d(id);
    glowCircle(bc, cx, cy, 8, color, 12);
    glowCircle(bc, cx, cy, 4, '#ffffff', 5);
  }
}

function syncHelpBtn() {
  const visible = state.status === 'start' || state.status === 'paused';
  helpBtn.style.display = visible ? 'block' : 'none';
}

helpBtn.addEventListener('click', () => { drawHtpIcons(); howToPlayEl.classList.add('open'); });
howToPlayEl.addEventListener('click', (e) => { if (e.target === howToPlayEl) howToPlayEl.classList.remove('open'); });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && howToPlayEl.classList.contains('open')) howToPlayEl.classList.remove('open');
});

renderFrame();
syncHelpBtn();

initConfigPanel(loop, onRestart, () => state.status);
