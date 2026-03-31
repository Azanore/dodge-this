// All canvas drawing: background, star field, zones, obstacles, pickups, player, HUD.
// Related: zones.js (innerZone, outerZone), player.js (getHitbox), bonuses.js (BONUS_COLORS), hud.js (renderHUD)
// Does not contain game logic — pure visual output from state.

import { innerZone, outerZone } from './zones.js';
import { renderHUD } from './hud.js';
import { playNearMiss } from './audio.js'; // AUDIO

// Star field — generated once at init, rendered every frame
const STAR_COUNT = 120;
const stars = [];

// Per-type obstacle glow colors
const OBSTACLE_COLORS = {
  ball: '#ff4444',
  bullet: '#ffffff',
  shard: '#ff9900',
  tracker: '#cc44ff'
};

// Per-type bonus pickup colors (matches bonuses.js)
export const BONUS_COLORS = {
  slowmo: '#0088ff',
  invincibility: '#ffe600',
  screenclear: '#ff4dff',
  shrink: '#00ff99'
};

// Pulse animation state
let pulseT = 0;

// Debug flag — draws hitbox circles over all entities when enabled
let showHitboxes = false;
export function toggleHitboxes() { showHitboxes = !showHitboxes; }

// Draws a wireframe hitbox circle (debug only)
function drawHitbox(ctx, x, y, radius) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 0, 0.75)';
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// Screen shake state — triggered externally via triggerShake(), decays over SHAKE_DURATION ms
const SHAKE_DURATION = 400;
const SHAKE_MAGNITUDE = 10;
let shakeRemaining = 0;

// Tracks which walls the player was touching last frame — prevents re-firing while held
let wallContact = { top: false, right: false, bottom: false, left: false };

// Wall contact pulses — arc segments that spread along the wall from hit point
const WALL_PULSE_DURATION = 300;
const wallPulses = [];

// Starts a screen shake — call this when death is detected
export function triggerShake() { shakeRemaining = SHAKE_DURATION; }

// Returns true while a shake is still playing
export function isShaking() { return shakeRemaining > 0; }

// Active bonus collection flashes — expanding rings that fade out
const flashes = [];
const FLASH_DURATION = 350;
const NEAR_MISS_FLASH_DURATION = 220;

// Near-miss text state — single label, reset on each trigger, never stacked
export let nearMissText = { remaining: 0 };

// Floating banked score texts — spawned at score zone position, float up and fade
const FLOAT_DURATION = 800;
const scoreFloats = [];

// Spawns a floating "+X" label at (x, y) — call when pending score banks
export function triggerScoreFloat(amount, x, y) {
  scoreFloats.push({ amount: Math.round(amount), x, y, remaining: FLOAT_DURATION });
}

// Spawns a flash ring at (x, y) with the bonus color
export function triggerBonusFlash(x, y, color) {
  flashes.push({ x, y, color, remaining: FLASH_DURATION, duration: FLASH_DURATION });
}

// Spawns a near-miss white ring and resets the "CLOSE!" text timer
export function triggerNearMiss(x, y) {
  flashes.push({ x, y, color: '#ffffff', remaining: NEAR_MISS_FLASH_DURATION, duration: NEAR_MISS_FLASH_DURATION });
  nearMissText.remaining = 600;
  playNearMiss(); // AUDIO
}

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
export function glowCircle(ctx, x, y, radius, color, blur) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Draws a ball obstacle — filled glowing circle
export function drawBall(ctx, obs, color) {
  glowCircle(ctx, obs.x, obs.y, obs.radius, color, 18);
}

// Draws a bullet obstacle — elongated capsule oriented along velocity
export function drawBullet(ctx, obs, color) {
  const angle = Math.atan2(obs.vy, obs.vx);
  const len = obs.radius * 3.5;
  const hw = obs.radius * 0.7; // half-width of capsule
  ctx.save();
  ctx.translate(obs.x, obs.y);
  ctx.rotate(angle);
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.fillStyle = color;
  // Rounded rectangle: rect body + two semicircles
  ctx.beginPath();
  ctx.arc(len / 2, 0, hw, -Math.PI / 2, Math.PI / 2);
  ctx.arc(-len / 2, 0, hw, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Draws a shard obstacle — sharp triangle oriented along velocity
export function drawShard(ctx, obs, color) {
  const angle = Math.atan2(obs.vy, obs.vx);
  const r = obs.radius;
  ctx.save();
  ctx.translate(obs.x, obs.y);
  ctx.rotate(angle);
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(r * 1.6, 0);          // sharp tip pointing forward
  ctx.lineTo(-r * 0.9, r * 0.85);  // back-left
  ctx.lineTo(-r * 0.9, -r * 0.85); // back-right
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Draws a tracker obstacle — pulsing spinning diamond that hunts the player
export function drawTracker(ctx, obs, color) {
  const r = obs.radius * 1.3;
  ctx.save();
  ctx.translate(obs.x, obs.y);
  ctx.rotate(pulseT * 1.5);
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.45);
  ctx.lineTo(r * 0.45, 0);
  ctx.lineTo(0, r * 0.45);
  ctx.lineTo(-r * 0.45, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Maps obstacle type to its draw function — add new types here
const OBSTACLE_DRAW = {
  bullet: drawBullet,
  shard: drawShard,
  tracker: drawTracker,
  ball: drawBall,
};

// Dispatches to the correct draw function per obstacle type
function drawObstacle(ctx, obs) {
  const color = OBSTACLE_COLORS[obs.type] ?? '#ffffff';
  (OBSTACLE_DRAW[obs.type] ?? drawBall)(ctx, obs, color);
}

export function render(ctx, state, delta) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;

  // Advance pulse timer
  pulseT += delta * 0.002;

  // Compute shake offset — decays linearly to zero
  let shakeX = 0, shakeY = 0;
  if (shakeRemaining > 0) {
    shakeRemaining = Math.max(0, shakeRemaining - delta);
    const intensity = (shakeRemaining / SHAKE_DURATION) * SHAKE_MAGNITUDE;
    shakeX = (Math.random() * 2 - 1) * intensity;
    shakeY = (Math.random() * 2 - 1) * intensity;
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);

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

  // 4. Inner zone — subtle fill; wall pulse spawned once per contact at hit point
  ctx.save();
  ctx.fillStyle = 'rgba(10, 10, 40, 0.6)';
  ctx.fillRect(innerZone.x, innerZone.y, innerZone.width, innerZone.height);
  ctx.restore();

  // Detect wall contact edges, fire a pulse ring at the hit point on first touch only
  const { x: px, y: py, radius: pr } = state.player;
  const { x: iz_x, y: iz_y, width: iz_w, height: iz_h } = innerZone;
  const hitting = {
    left: px - pr <= iz_x,
    right: px + pr >= iz_x + iz_w,
    top: py - pr <= iz_y,
    bottom: py + pr >= iz_y + iz_h,
  };
  if (hitting.left && !wallContact.left) wallPulses.push({ x: iz_x, y: py, axis: 'v', remaining: WALL_PULSE_DURATION });
  if (hitting.right && !wallContact.right) wallPulses.push({ x: iz_x + iz_w, y: py, axis: 'v', remaining: WALL_PULSE_DURATION });
  if (hitting.top && !wallContact.top) wallPulses.push({ x: px, y: iz_y, axis: 'h', remaining: WALL_PULSE_DURATION });
  if (hitting.bottom && !wallContact.bottom) wallPulses.push({ x: px, y: iz_y + iz_h, axis: 'h', remaining: WALL_PULSE_DURATION });
  wallContact = hitting;

  // 5. Obstacles — per-type shapes with glow
  for (const obs of state.obstacles) {
    // POLISH: tracker spawn warning — draw pending trackers as a pulsing ring, skip normal draw
    if (obs.pending > 0) {
      const TRACKER_PENDING = 2000;
      const t = obs.pending / TRACKER_PENDING; // 1→0 as it materializes
      const pulse = 0.5 + 0.5 * Math.sin(pulseT * 8);
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.3 + pulse * 0.4;
      ctx.strokeStyle = '#cc44ff';
      ctx.shadowColor = '#cc44ff';
      ctx.shadowBlur = 20;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(obs.x, obs.y, obs.radius * 1.8 * (1 + t * 0.5), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      continue;
    }
    drawObstacle(ctx, obs);
    if (showHitboxes) drawHitbox(ctx, obs.x, obs.y, obs.radius);
  }

  // 6. Bonus pickups — per-type color with glow
  for (const pickup of state.bonuses) {
    const color = BONUS_COLORS[pickup.type] ?? '#ffffff';
    glowCircle(ctx, pickup.x, pickup.y, pickup.radius, color, 20);
    // Inner bright core
    glowCircle(ctx, pickup.x, pickup.y, pickup.radius * 0.5, '#ffffff', 8);
    if (showHitboxes) drawHitbox(ctx, pickup.x, pickup.y, pickup.radius);
  }

  // 6b. Score zone — outline + fill/label when player is inside; teaches the mechanic visually
  if (state.scoreZone?.active) {
    const pulse = 0.5 + 0.5 * Math.sin(pulseT * 3);
    const { x: zx, y: zy, radius: zr } = state.scoreZone;
    const { x: px, y: py } = state.player;
    const dx = px - zx, dy = py - zy;
    const playerInside = dx * dx + dy * dy <= zr * zr;

    ctx.save();

    // Subtle fill — stronger when player is inside
    ctx.beginPath();
    ctx.arc(zx, zy, zr, 0, Math.PI * 2);
    ctx.fillStyle = playerInside ? 'rgba(0, 255, 136, 0.10)' : 'rgba(0, 255, 136, 0.03)';
    ctx.fill();

    // Outline — brighter and thicker when player is inside
    ctx.strokeStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = playerInside ? 18 + 8 * pulse : 10 + 10 * pulse;
    ctx.lineWidth = playerInside ? 2.5 : 1.5;
    ctx.globalAlpha = playerInside ? 1.0 : 0.6 + 0.4 * pulse;
    ctx.beginPath();
    ctx.arc(zx, zy, zr, 0, Math.PI * 2);
    ctx.stroke();

    // Multiplier label inside zone — self-teaches the mechanic
    ctx.globalAlpha = playerInside ? 0.9 : 0.35;
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#00ff88';
    ctx.shadowBlur = playerInside ? 10 : 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`x${state.comboMultiplier.toFixed(1)}`, zx, zy - zr - 6);

    ctx.restore();
  }

  // 6c. Bonus collection flashes — expanding fading rings
  for (let i = flashes.length - 1; i >= 0; i--) {
    const f = flashes[i];
    f.remaining -= delta;
    if (f.remaining <= 0) { flashes.splice(i, 1); continue; }
    const t = 1 - f.remaining / f.duration; // 0→1 as flash ages
    const radius = 12 + t * 40;
    const alpha = (1 - t) * 0.8;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = f.color;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 6d. Wall contact pulses — line segments spreading along the wall from hit point, clamped to zone
  const { x: iz_x2, y: iz_y2, width: iz_w2, height: iz_h2 } = innerZone;
  for (let i = wallPulses.length - 1; i >= 0; i--) {
    const w = wallPulses[i];
    w.remaining -= delta;
    if (w.remaining <= 0) { wallPulses.splice(i, 1); continue; }
    const t = 1 - w.remaining / WALL_PULSE_DURATION; // 0→1
    const spread = t * 80;
    const alpha = (1 - t) * 1.0;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#00eeff';
    ctx.shadowColor = '#00eeff';
    ctx.shadowBlur = 16 * (1 - t);
    ctx.lineWidth = 3 - t * 2;
    ctx.beginPath();
    if (w.axis === 'h') {
      ctx.moveTo(Math.max(iz_x2, w.x - spread), w.y);
      ctx.lineTo(Math.min(iz_x2 + iz_w2, w.x + spread), w.y);
    } else {
      ctx.moveTo(w.x, Math.max(iz_y2, w.y - spread));
      ctx.lineTo(w.x, Math.min(iz_y2 + iz_h2, w.y + spread));
    }
    ctx.stroke();
    ctx.restore();
  }

  // 7. Player — pulsing glow; distinct shield glow when invincible (hidden on start screen)
  if (state.status !== 'start') {
    const { x: px, y: py, radius: pr } = state.player;
    const pulse = 0.6 + 0.4 * Math.sin(pulseT);
    const isInvincible = !!state.activeEffects.invincibility;
    const playerColor = isInvincible ? '#ffe600' : '#00eeff';
    const playerBlur = isInvincible ? 28 + 12 * pulse : 14 + 10 * pulse;

    glowCircle(ctx, px, py, pr, playerColor, playerBlur);
    // Bright core dot
    glowCircle(ctx, px, py, pr * 0.4, '#ffffff', 6);
    if (showHitboxes) drawHitbox(ctx, px, py, pr);

    // POLISH: grace period ring — fading cyan ring around player during grace; remove this block to revert
    if (state.status === 'grace' && state.graceRemaining > 0) {
      const graceT = state.graceRemaining / gameConfig.gracePeriod; // 1→0
      ctx.save();
      ctx.globalAlpha = graceT * 0.7;
      ctx.strokeStyle = '#00eeff';
      ctx.shadowColor = '#00eeff';
      ctx.shadowBlur = 16;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, pr + 8 + (1 - graceT) * 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 8. Near-miss "CLOSE!" text — fades out over 600ms above player
  if (nearMissText.remaining > 0 && state.status !== 'start') {
    const alpha = nearMissText.remaining / 600;
    const { x: px, y: py } = state.player;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('CLOSE!', px, py - 24);
    ctx.restore();
    nearMissText.remaining = Math.max(0, nearMissText.remaining - delta);
  }

  // 8b. Floating banked score — rises and fades at score zone position
  for (let i = scoreFloats.length - 1; i >= 0; i--) {
    const f = scoreFloats[i];
    f.remaining -= delta;
    if (f.remaining <= 0) { scoreFloats.splice(i, 1); continue; }
    const t = 1 - f.remaining / FLOAT_DURATION; // 0→1 as it ages
    const alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4; // hold then fade
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 12;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`+${f.amount}`, f.x, f.y - 20 - t * 40); // floats upward 40px
    ctx.restore();
  }

  // 9. HUD
  renderHUD(ctx, state, delta);

  ctx.restore();
}
