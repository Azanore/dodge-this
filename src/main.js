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
import { showGameOver, getPB } from './gameOver.js';
import { resetRunStats, insertRun, getRunStats } from './stats.js';
import { initConfigPanel } from './configPanel.js';
import { initAudio, startMusic, stopMusic, pauseMusic, resumeMusic, playGameStart, sfxEnabled, musicEnabled, setSfx, setMusic } from './audio.js'; // AUDIO

validateConfig(gameConfig);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let activeDifficulty = 'normal';

let state = resetState(activeDifficulty);
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
      insertRun(state);
      const { nearMisses, bonusesCollected, maxCombo, comboScore } = getRunStats();
      document.getElementById('rs-score').textContent = `${Math.round(state.score)} pts`;
      document.getElementById('rs-time').textContent = `${(state.elapsed / 1000).toFixed(1)}s`;
      document.getElementById('rs-difficulty').textContent = state.difficulty;
      document.getElementById('rs-near-misses').textContent = nearMisses;
      document.getElementById('rs-bonuses').textContent = bonusesCollected;
      document.getElementById('rs-max-combo').textContent = `x${maxCombo.toFixed(1)}`;
      document.getElementById('rs-combo-score').textContent = Math.round(comboScore);
      // Collapse panel on each new game-over open
      const panel = document.getElementById('run-stats-panel');
      const toggle = document.getElementById('run-stats-toggle');
      panel.style.display = 'none';
      toggle.textContent = '▶ Run Stats';
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
  resetRunStats();
  state = resetState(activeDifficulty);
  state.status = 'grace';
  state.graceRemaining = gameConfig.gracePeriod;
  accumulators.spawn = 0;
  accumulators.bonus = 0;
  accumulators.scoreZone = 0;
  initRenderer();
  recomputeZones();
  updatePlayer(state);
  syncHelpBtn();
  startMusic(); // AUDIO — restart music from beginning on each new game
  loop.start();
}

// Difficulty selector — shown on load, hidden once game starts
const diffScreenEl = document.getElementById('difficulty-screen');
const diffPbEl = document.getElementById('diff-pb');

function updateDiffPB() {
  const pb = getPB(activeDifficulty);
  if (pb.score > 0) {
    diffPbEl.textContent = `Best: ${Math.round(pb.score)} pts  ${(pb.elapsed / 1000).toFixed(1)}s`;
    diffPbEl.style.visibility = 'visible';
  } else {
    diffPbEl.textContent = '\u00a0'; // non-breaking space — preserves height
    diffPbEl.style.visibility = 'hidden';
  }
}
updateDiffPB();

// Preload audio on first difficulty button interaction — buffers ready before Play is clicked
let audioPreloaded = false;
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    if (!audioPreloaded) { initAudio(); audioPreloaded = true; }
    activeDifficulty = e.currentTarget.dataset.diff;
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.toggle('selected', b === e.currentTarget));
    state = resetState(activeDifficulty);
    state.graceRemaining = gameConfig.gracePeriod;
    updateDiffPB();
  });
});

// Start action — Play button or any key (except Escape) from 'start' state
function onStartAction(e) {
  if (state.status !== 'start') return;
  if (e.type === 'keydown' && e.key === 'Escape') return;
  if (howToPlayEl.classList.contains('open')) return;
  document.getElementById('play-btn').removeEventListener('click', onStartAction);
  window.removeEventListener('keydown', onStartAction);
  diffScreenEl.classList.remove('open');
  initAudio().then(() => { startMusic(); playGameStart(); }); // AUDIO
  state.status = 'grace';
  syncHelpBtn();
  loop.start();
}

document.getElementById('play-btn').addEventListener('click', onStartAction);
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

// Returns to difficulty screen — resets state, stops loop and music, re-shows selector
function goToMenu() {
  loop.stop();
  stopMusic(); // AUDIO
  pauseScreenEl.classList.remove('open');
  document.getElementById('game-over-screen').classList.remove('open');
  state = resetState(activeDifficulty);
  state.graceRemaining = gameConfig.gracePeriod;
  accumulators.spawn = 0;
  accumulators.bonus = 0;
  accumulators.scoreZone = 0;
  initRenderer();
  recomputeZones();
  updatePlayer(state);
  updateDiffPB();
  document.getElementById('play-btn').addEventListener('click', onStartAction);
  window.addEventListener('keydown', onStartAction);
  diffScreenEl.classList.add('open');
  syncHelpBtn();
  renderFrame();
}

document.getElementById('resume-btn').addEventListener('click', resumeGame);
document.getElementById('pause-menu-btn').addEventListener('click', goToMenu);
document.getElementById('go-menu-btn').addEventListener('click', goToMenu);

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
  if (musicEnabled) {
    if (state.status === 'paused') resumeMusic();
    else if (state.status === 'active' || state.status === 'grace') startMusic();
  }
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

// Per-run stats panel toggle
document.getElementById('run-stats-toggle').addEventListener('click', () => {
  const panel = document.getElementById('run-stats-panel');
  const toggle = document.getElementById('run-stats-toggle');
  const expanded = panel.style.display !== 'none';
  panel.style.display = expanded ? 'none' : 'block';
  toggle.textContent = expanded ? '▶ Run Stats' : '▼ Run Stats';
});

initConfigPanel(loop, onRestart, () => state.status);
