// Entry point — bootstraps and wires all game modules together.
// Imports: all src modules, game.config.js (global)
// Does NOT handle rendering or game logic directly.

import { validateConfig } from './config.js';
import { resetState } from './GameState.js';
import { createGameLoop } from './GameLoop.js';
import { recomputeZones } from './zones.js';
import { update as updatePlayer } from './player.js';
import { spawnObstacle, updateObstacles } from './obstacles.js';
import { trySpawnBonus, updateEffects, collectBonus } from './bonuses.js';
import { checkPlayerObstacles, checkPlayerBonusPickups } from './collision.js';
import { getCurrentSpeedMultiplier, getCurrentSpawnInterval } from './difficulty.js';
import { render, initRenderer } from './renderer.js';
import { showGameOver } from './gameOver.js';
import { initConfigPanel } from './configPanel.js';

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

// Spawn timer accumulator
let spawnAccumulator = 0;

// Bonus spawn timer
const BONUS_SPAWN_INTERVAL = 8000; // ms between bonus spawn attempts
let bonusAccumulator = 0;

// Initialize renderer star field
initRenderer();
recomputeZones();

// Center player at inner zone on first frame
updatePlayer();

function update(delta) {
  lastDelta = delta;
  if (state.status === 'dead') return;

  // Update player position from mouse
  updatePlayer();

  // Grace period tick (Requirement 6.1, 6.3)
  if (state.status === 'grace') {
    state.graceRemaining -= delta;
    state.elapsed += delta;
    if (state.graceRemaining <= 0) {
      state.status = 'active';
      state.graceRemaining = 0;
    }
    // Bonus collection works during grace
    checkPlayerBonusPickups(state, collectBonus);
    updateEffects(delta, state);
    return;
  }

  // Active play
  state.elapsed += delta;

  // Obstacle spawning via difficulty interval (Requirement 5.1, 5.2)
  const speedMult = getCurrentSpeedMultiplier(state.elapsed);
  const spawnInterval = getCurrentSpawnInterval(state.elapsed);

  spawnAccumulator += delta;
  while (spawnAccumulator >= spawnInterval) {
    spawnObstacle(state, speedMult);
    spawnAccumulator -= spawnInterval;
  }

  // Bonus spawn attempts
  bonusAccumulator += delta;
  if (bonusAccumulator >= BONUS_SPAWN_INTERVAL) {
    trySpawnBonus(state);
    bonusAccumulator = 0;
  }

  // Update obstacle positions and remove out-of-bounds
  updateObstacles(delta, state);

  // Update active bonus effects
  updateEffects(delta, state);

  // Collision checks
  checkPlayerBonusPickups(state, collectBonus);
  checkPlayerObstacles(state);

  // Transition to dead
  if (state.status === 'dead') {
    loop.stop();
    showGameOver(canvas, state, onRestart);
  }
}

function renderFrame() {
  render(ctx, state, lastDelta);
}

const loop = createGameLoop(update, renderFrame);

function onRestart() {
  state = resetState();
  state.graceRemaining = gameConfig.gracePeriod;
  spawnAccumulator = 0;
  bonusAccumulator = 0;
  initRenderer();
  recomputeZones();
  updatePlayer();
  loop.start();
}

loop.start();

// Init dev config panel — passes loop control and restart callback (Requirement 12.1–12.7)
initConfigPanel(loop, onRestart, () => state.status);
