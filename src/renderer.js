// All canvas drawing: background, star field, zones, obstacles, pickups, player, HUD.
// Related: zones.js (innerZone, outerZone), player.js (getHitbox), bonuses.js (BONUS_COLORS), hud.js (renderHUD)
// Does not contain game logic — pure visual output from state.

import { innerZone, outerZone } from './zones.js';
import { renderHUD } from './hud.js';

// Star field — generated once at init, rendered every frame
const STAR_COUNT = 120;
const stars = [];

// Per-type obstacle glow colors
const OBSTACLE_COLORS = {
  ball: '#ff4444',
  bullet: '#ffffff',
  shard: '#ff9900'
};

// Per-type bonus pickup colors (matches bonuses.js)
const BONUS_COLORS = {
  slowmo: '#00cfff',
  invincibility: '#ffe600',
  screenclear: '#ff4dff',
  shrink: '#00ff99'
};

// Pulse animation state
let pulseT = 0;

// Generates the static star field array using viewport dimensions
export function initRenderer() {
  stars.length = 0;
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 0.5 + Math.random() * 1.5,
      brightness: 0.3 + Math.random() * 0.7
    });
  }
}

// Draws a glowing circle at (x, y) with given radius, color, and blur amount
function glowCircle(ctx, x, y, radius, color, blur) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Renders the start screen overlay with title and prompt
export function renderStartScreen(ctx) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const cx = cw / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(0, 0, cw, ch);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 72px monospace';
  ctx.fillStyle = '#00eeff';
  ctx.shadowColor = '#00eeff';
  ctx.shadowBlur = 30;
  ctx.fillText('DODGE', cx, ch * 0.38);

  ctx.font = '20px monospace';
  ctx.fillStyle = '#cccccc';
  ctx.shadowColor = '#cccccc';
  ctx.shadowBlur = 8;
  ctx.fillText('Click or press any key to begin', cx, ch * 0.54);

  ctx.restore();
}

// Renders the pause screen overlay with label and resume prompt
export function renderPauseScreen(ctx) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const cx = cw / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, cw, ch);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 56px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 20;
  ctx.fillText('PAUSED', cx, ch * 0.42);

  ctx.font = '20px monospace';
  ctx.fillStyle = '#cccccc';
  ctx.shadowColor = '#cccccc';
  ctx.shadowBlur = 8;
  ctx.fillText('Press Esc to resume', cx, ch * 0.54);

  ctx.restore();
}

// Main render function — called every frame
export function render(ctx, state, delta) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;

  // Advance pulse timer
  pulseT += delta * 0.002;

  // 1. Dark background
  ctx.fillStyle = '#05050f';
  ctx.fillRect(0, 0, cw, ch);

  // 2. Star field
  for (const s of stars) {
    ctx.save();
    ctx.globalAlpha = s.brightness;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#aaaaff';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 3. Outer zone — slightly darker overlay
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 20, 0.35)';
  ctx.fillRect(outerZone.x, outerZone.y, outerZone.width, outerZone.height);
  // Cut out inner zone so it appears lighter
  ctx.clearRect(innerZone.x, innerZone.y, innerZone.width, innerZone.height);
  ctx.restore();

  // 4. Inner zone — subtle lighter fill
  ctx.save();
  ctx.fillStyle = 'rgba(10, 10, 40, 0.6)';
  ctx.fillRect(innerZone.x, innerZone.y, innerZone.width, innerZone.height);
  ctx.restore();

  // 5. Obstacles — glowing circles
  for (const obs of state.obstacles) {
    const color = OBSTACLE_COLORS[obs.type] ?? '#ffffff';
    glowCircle(ctx, obs.x, obs.y, obs.radius, color, 18);
  }

  // 6. Bonus pickups — per-type color with glow
  for (const pickup of state.bonuses) {
    const color = BONUS_COLORS[pickup.type] ?? '#ffffff';
    glowCircle(ctx, pickup.x, pickup.y, pickup.radius, color, 20);
    // Inner bright core
    glowCircle(ctx, pickup.x, pickup.y, pickup.radius * 0.5, '#ffffff', 8);
  }

  // 7. Player — pulsing glow; distinct shield glow when invincible
  const { x: px, y: py, radius: pr } = state.player;
  const pulse = 0.6 + 0.4 * Math.sin(pulseT);
  const isInvincible = !!state.activeEffects.invincibility;
  const playerColor = isInvincible ? '#ffe600' : '#00eeff';
  const playerBlur = isInvincible ? 28 + 12 * pulse : 14 + 10 * pulse;

  glowCircle(ctx, px, py, pr, playerColor, playerBlur);
  // Bright core dot
  glowCircle(ctx, px, py, pr * 0.4, '#ffffff', 6);

  // 8. HUD
  renderHUD(ctx, state);
}
