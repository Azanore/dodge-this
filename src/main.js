// Entry point — bootstraps and wires all game modules together.
// Imports: all src modules, game.config.js (global)
// Does NOT handle rendering or game logic directly.

import { validateConfig } from './config.js';
import { resetState } from './GameState.js';
import { createGameLoop } from './GameLoop.js';
import { recomputeZones } from './zones.js';
import { update as updatePlayer } from './player.js';
import { gameUpdate } from './gameUpdate.js';
import { render, renderStartScreen, renderHowToPlay, renderPauseScreen, initRenderer, isShaking, triggerShake } from './renderer.js';
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
      showGameOver(canvas, state, onRestart);
    }, 450);
  }
}

// Tracks pause screen audio button hit areas for click handling
let pauseHitAreas = null;

// Tracks ? button hit area and modal open state for start screen
let howToPlayOpen = false;
let helpBtnArea = null;

// Draws pause screen and stores hit areas
function drawPauseScreen() {
  pauseHitAreas = renderPauseScreen(ctx, sfxEnabled, musicEnabled);
}

function renderFrame() {
  if (state.status === 'dead' && !isShaking()) return;
  if (state.status === 'start') {
    render(ctx, state, lastDelta);
    helpBtnArea = renderStartScreen(ctx);
    if (howToPlayOpen) renderHowToPlay(ctx);
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
  loop.start();
}

// One-shot start action: click or keydown (except Escape) transitions from 'start' → 'grace'
function onStartAction(e) {
  if (state.status !== 'start') return;
  if (e.type === 'keydown' && e.key === 'Escape') return;
  // If modal is open, any key/click closes it instead of starting
  if (howToPlayOpen) {
    howToPlayOpen = false;
    renderFrame();
    return;
  }
  // Block start if click landed on the ? button
  if (e.type === 'click' && helpBtnArea) {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const { x, y, w, h } = helpBtnArea;
    if (px >= x && px <= x + w && py >= y && py <= y + h) return;
  }
  canvas.removeEventListener('click', onStartAction);
  window.removeEventListener('keydown', onStartAction);
  initAudio().then(() => { startMusic(); }); // AUDIO
  playGameStart(); // AUDIO
  state.status = 'grace';
  loop.start();
}

canvas.addEventListener('click', onStartAction);
window.addEventListener('keydown', onStartAction);

// ? button click — toggles how-to-play modal on start screen
canvas.addEventListener('click', (e) => {
  if (state.status !== 'start' || !helpBtnArea) return;
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const { x, y, w, h } = helpBtnArea;
  if (px >= x && px <= x + w && py >= y && py <= y + h) {
    howToPlayOpen = !howToPlayOpen;
    renderFrame();
  }
});

// Escape key: pause/unpause during active or grace; ignored in dead/start
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (state.status === 'dead' || state.status === 'start') return;
  const panel = document.getElementById('config-panel');
  if (panel && panel.style.display !== 'none') return;

  // Close how-to-play modal first if open
  if (howToPlayOpen) {
    howToPlayOpen = false;
    if (state.status === 'paused') { render(ctx, state, lastDelta); drawPauseScreen(); }
    return;
  }

  if (state.status === 'active' || state.status === 'grace') {
    state.prevStatus = state.status;
    state.status = 'paused';
    loop.stop();
    pauseMusic(); // AUDIO
    render(ctx, state, lastDelta);
    drawPauseScreen();
  } else if (state.status === 'paused') {
    state.status = state.prevStatus;
    state.prevStatus = null;
    pauseHitAreas = null;
    resumeMusic(); // AUDIO
    loop.start();
  }
});

// Click handler for pause screen audio toggles and how-to-play link
canvas.addEventListener('click', (e) => {
  if (state.status !== 'paused' || !pauseHitAreas) return;
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;

  // If modal is open, any click closes it
  if (howToPlayOpen) {
    howToPlayOpen = false;
    render(ctx, state, lastDelta);
    drawPauseScreen();
    return;
  }

  const { sfx, music, help } = pauseHitAreas;
  if (px >= sfx.x && px <= sfx.x + sfx.w && py >= sfx.y && py <= sfx.y + sfx.h) {
    setSfx(!sfxEnabled); // AUDIO
    render(ctx, state, lastDelta);
    drawPauseScreen();
  } else if (px >= music.x && px <= music.x + music.w && py >= music.y && py <= music.y + music.h) {
    setMusic(!musicEnabled); // AUDIO
    render(ctx, state, lastDelta);
    drawPauseScreen();
  } else if (help && px >= help.x && px <= help.x + help.w && py >= help.y && py <= help.y + help.h) {
    howToPlayOpen = true;
    render(ctx, state, lastDelta);
    drawPauseScreen();
    renderHowToPlay(ctx);
  }
});

// Render the start screen before the loop begins
renderFrame();

// Init dev config panel — passes loop control and restart callback (Requirement 12.1–12.7)
initConfigPanel(loop, onRestart, () => state.status);
