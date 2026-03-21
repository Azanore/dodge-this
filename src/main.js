// Entry point — bootstraps and wires all game modules together.
// Imports: all src modules, game.config.js (global)
// Does NOT handle rendering or game logic directly.

import { validateConfig } from './config.js';
import { resetState } from './GameState.js';
import { createGameLoop } from './GameLoop.js';
import { recomputeZones } from './zones.js';
import { update as updatePlayer } from './player.js';
import { gameUpdate } from './gameUpdate.js';
import { render, renderStartScreen, renderPauseScreen, initRenderer, isShaking, triggerShake } from './renderer.js';
import { showGameOver } from './gameOver.js';
import { initConfigPanel } from './configPanel.js';
import { initAudio, startMusic, pauseMusic, resumeMusic, stopMusic, playGameStart } from './audio.js'; // AUDIO

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
    stopMusic(); // AUDIO
    setTimeout(() => {
      loop.stop();
      showGameOver(canvas, state, onRestart);
    }, 450);
  }
}

function renderFrame() {
  if (state.status === 'dead' && !isShaking()) return; // game over screen drawn by showGameOver; don't overwrite
  if (state.status === 'start') {
    render(ctx, state, lastDelta);
    renderStartScreen(ctx);
    return;
  }
  if (state.status === 'paused') return; // last frame stays visible; overlay drawn once on pause
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
  startMusic(); // AUDIO
  loop.start();
}

// One-shot start action: click or keydown (except Escape) transitions from 'start' → 'grace'
function onStartAction(e) {
  if (state.status !== 'start') return;
  if (e.type === 'keydown' && e.key === 'Escape') return;
  canvas.removeEventListener('click', onStartAction);
  window.removeEventListener('keydown', onStartAction);
  initAudio().then(() => { startMusic(); }); // AUDIO
  playGameStart(); // AUDIO
  state.status = 'grace';
  loop.start();
}

canvas.addEventListener('click', onStartAction);
window.addEventListener('keydown', onStartAction);

// Escape key: pause/unpause during active or grace; ignored in dead/start
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (state.status === 'dead' || state.status === 'start') return;
  const panel = document.getElementById('config-panel');
  if (panel && panel.style.display !== 'none') return;

  if (state.status === 'active' || state.status === 'grace') {
    state.prevStatus = state.status;
    state.status = 'paused';
    loop.stop();
    pauseMusic(); // AUDIO
    render(ctx, state, lastDelta);
    renderPauseScreen(ctx);
  } else if (state.status === 'paused') {
    state.status = state.prevStatus;
    state.prevStatus = null;
    resumeMusic(); // AUDIO
    loop.start();
  }
});

// Render the start screen before the loop begins
renderFrame();

// Init dev config panel — passes loop control and restart callback (Requirement 12.1–12.7)
initConfigPanel(loop, onRestart, () => state.status);
