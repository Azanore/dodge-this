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
const BONUS_COLORS = {
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

// Spawns a flash ring at (x, y) with the bonus color
export function triggerBonusFlash(x, y, color) {
  flashes.push({ x, y, color, remaining: FLASH_DURATION });
}

// Spawns a near-miss white ring and resets the "CLOSE!" text timer
export function triggerNearMiss(x, y) {
  flashes.push({ x, y, color: '#ffffff', remaining: NEAR_MISS_FLASH_DURATION });
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

// Draws a ball obstacle — filled glowing circle
function drawBall(ctx, obs, color) {
  glowCircle(ctx, obs.x, obs.y, obs.radius, color, 18);
}

// Draws a bullet obstacle — elongated capsule oriented along velocity
function drawBullet(ctx, obs, color) {
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
function drawShard(ctx, obs, color) {
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
function drawTracker(ctx, obs, color) {
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

// Dispatches to the correct draw function per obstacle type
function drawObstacle(ctx, obs) {
  const color = OBSTACLE_COLORS[obs.type] ?? '#ffffff';
  if (obs.type === 'bullet') drawBullet(ctx, obs, color);
  else if (obs.type === 'shard') drawShard(ctx, obs, color);
  else if (obs.type === 'tracker') drawTracker(ctx, obs, color);
  else drawBall(ctx, obs, color);
}

// Renders the start screen overlay with title, prompt, personal best, and ? button.
// Returns the hit area of the ? button for click handling in main.js.
export function renderStartScreen(ctx) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const cx = cw / 2;

  const rawPB = localStorage.getItem('dodge_pb');
  let pb = null;
  if (rawPB) {
    try {
      const parsed = JSON.parse(rawPB);
      pb = typeof parsed === 'number' ? { score: parsed, elapsed: 0 } : parsed;
    } catch { pb = null; }
  }

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
  ctx.fillRect(0, 0, cw, ch);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 72px monospace';
  ctx.fillStyle = '#00eeff';
  ctx.shadowColor = '#00eeff';
  ctx.shadowBlur = 30;
  ctx.fillText('DODGE', cx, ch * 0.38);

  if (pb && pb.score > 0) {
    ctx.font = '16px monospace';
    ctx.fillStyle = '#888888';
    ctx.shadowBlur = 0;
    const elapsedStr = pb.elapsed > 0 ? `  ${(pb.elapsed / 1000).toFixed(1)}s` : '';
    ctx.fillText(`Best: ${Math.round(pb.score)} pts${elapsedStr}`, cx, ch * 0.48);
  }

  ctx.font = '20px monospace';
  ctx.fillStyle = '#cccccc';
  ctx.shadowColor = '#cccccc';
  ctx.shadowBlur = 8;
  const promptY = pb && pb.score > 0 ? ch * 0.56 : ch * 0.54;
  ctx.fillText('Click or press any key to begin', cx, promptY);

  // ? button — sits just below the prompt, centered
  const btnR = 14;
  const btnX = cx;
  const btnY = promptY + 36;
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.arc(btnX, btnY, btnR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(btnX, btnY, btnR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = '13px monospace';
  ctx.fillStyle = '#888888';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', btnX, btnY);

  ctx.restore();

  return { x: btnX - btnR, y: btnY - btnR, w: btnR * 2, h: btnR * 2 };
}

// Renders the how-to-play modal over the start screen.
// Uses actual in-game draw functions at a fixed icon radius for visual consistency.
export function renderHowToPlay(ctx) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const cx = cw / 2;

  const ICON_R = 10;           // consistent icon radius — bullet uses smaller to avoid overflow
  const MODAL_W = Math.min(480, cw - 60);
  const MODAL_H = 480;
  const mx = cx - MODAL_W / 2;
  const my = ch / 2 - MODAL_H / 2;
  const COL_ICON = mx + 36;    // icon center x
  const COL_TEXT = mx + 60;    // text start x
  const ROW_H = 32;

  // Dim everything behind modal
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, cw, ch);

  // Modal panel
  ctx.fillStyle = '#0d0d1a';
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(mx, my, MODAL_W, MODAL_H, 12);
  ctx.fill();
  ctx.stroke();

  // Title
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 8;
  ctx.fillText('HOW TO PLAY', cx, my + 28);
  ctx.shadowBlur = 0;

  // Helpers
  function sectionLabel(label, y) {
    ctx.font = '10px monospace';
    ctx.fillStyle = '#333344';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.toUpperCase(), COL_TEXT, y);
  }

  function row(iconFn, y, label, desc) {
    iconFn(y);
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#cccccc';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, COL_TEXT, y);
    const labelW = ctx.measureText(label).width;
    ctx.font = '13px monospace';
    ctx.fillStyle = '#555566';
    ctx.fillText(`  ${desc}`, COL_TEXT + labelW, y);
  }

  let y = my + 54;

  // ── YOU ──
  sectionLabel('YOU', y);
  y += 18;
  row(() => {
    glowCircle(ctx, COL_ICON, y, ICON_R * 0.8, '#00eeff', 12);
    glowCircle(ctx, COL_ICON, y, ICON_R * 0.3, '#ffffff', 5);
  }, y, 'Your ship', 'move with your mouse — don\'t get hit');
  y += ROW_H + 6;

  // ── OBSTACLES ──
  sectionLabel('OBSTACLES — AVOID ALL OF THEM', y);
  y += 18;

  row(() => drawBall(ctx, { x: COL_ICON, y, radius: ICON_R }, OBSTACLE_COLORS.ball),
    y, 'Ball', 'steady, predictable');
  y += ROW_H;

  // Bullet uses smaller radius so capsule doesn't overflow the icon column
  row(() => drawBullet(ctx, { x: COL_ICON, y, radius: 6, vx: 1, vy: 0 }, OBSTACLE_COLORS.bullet),
    y, 'Bullet', 'fast and straight');
  y += ROW_H;

  row(() => drawShard(ctx, { x: COL_ICON, y, radius: ICON_R, vx: 1, vy: 0 }, OBSTACLE_COLORS.shard),
    y, 'Shard', 'unpredictable angle');
  y += ROW_H;

  row(() => drawTracker(ctx, { x: COL_ICON, y, radius: ICON_R }, OBSTACLE_COLORS.tracker),
    y, 'Tracker', 'hunts you — only screenclear removes it');
  y += ROW_H + 6;

  // ── SCORE ZONE ──
  sectionLabel('SCORE ZONE', y);
  y += 18;
  row(() => {
    ctx.save();
    ctx.strokeStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(COL_ICON, y, ICON_R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }, y, 'Green zone', 'enter to build multiplier — score banks at x1');
  y += ROW_H + 6;

  // ── POWER-UPS ──
  sectionLabel('POWER-UPS — COLLECT THEM', y);
  y += 18;

  const bonuses = [
    { color: '#0088ff', label: 'Slow-mo', desc: 'slows all obstacles' },
    { color: '#ffe600', label: 'Shield', desc: 'temporary invincibility' },
    { color: '#ff4dff', label: 'Clear', desc: 'removes all obstacles instantly' },
    { color: '#00ff99', label: 'Shrink', desc: 'smaller hitbox' },
  ];
  for (const b of bonuses) {
    const br = ICON_R * 0.7;
    row(() => {
      glowCircle(ctx, COL_ICON, y, br, b.color, 12);
      glowCircle(ctx, COL_ICON, y, br * 0.45, '#ffffff', 5);
    }, y, b.label, b.desc);
    y += ROW_H;
  }

  // Dismiss hint
  ctx.font = '11px monospace';
  ctx.fillStyle = '#333344';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('click anywhere or press any key to close', cx, my + MODAL_H - 16);

  ctx.restore();
}


// Returns hit areas for sfx and music toggles so main.js can handle clicks.
export function renderPauseScreen(ctx, sfxOn, musicOn) {
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
  ctx.fillText('PAUSED', cx, ch * 0.38);

  ctx.font = '20px monospace';
  ctx.fillStyle = '#cccccc';
  ctx.shadowColor = '#cccccc';
  ctx.shadowBlur = 8;
  ctx.fillText('Press Esc to resume', cx, ch * 0.50);

  // Audio toggles — two pill buttons centered below resume hint
  const btnW = 160, btnH = 36, gap = 16;
  const totalW = btnW * 2 + gap;
  const btnY = ch * 0.62;
  const sfxX = cx - totalW / 2;
  const musicX = sfxX + btnW + gap;

  ctx.shadowBlur = 0;
  ctx.font = '14px monospace';
  ctx.textBaseline = 'middle';

  // SFX button
  ctx.fillStyle = sfxOn ? '#00ff88' : '#333';
  ctx.beginPath();
  ctx.roundRect(sfxX, btnY - btnH / 2, btnW, btnH, 6);
  ctx.fill();
  ctx.fillStyle = sfxOn ? '#000' : '#888';
  ctx.fillText(`SFX: ${sfxOn ? 'ON' : 'OFF'}`, sfxX + btnW / 2, btnY);

  // Music button
  ctx.fillStyle = musicOn ? '#00ff88' : '#333';
  ctx.beginPath();
  ctx.roundRect(musicX, btnY - btnH / 2, btnW, btnH, 6);
  ctx.fill();
  ctx.fillStyle = musicOn ? '#000' : '#888';
  ctx.fillText(`MUSIC: ${musicOn ? 'ON' : 'OFF'}`, musicX + btnW / 2, btnY);

  // How to play link
  const helpY = btnY + btnH / 2 + 24;
  ctx.font = '13px monospace';
  ctx.fillStyle = '#444455';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('? How to play', cx, helpY);

  ctx.restore();

  return {
    sfx: { x: sfxX, y: btnY - btnH / 2, w: btnW, h: btnH },
    music: { x: musicX, y: btnY - btnH / 2, w: btnW, h: btnH },
    help: { x: cx - 60, y: helpY - 10, w: 120, h: 20 },
  };
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

  // 4. Inner zone — subtle lighter fill
  ctx.save();
  ctx.fillStyle = 'rgba(10, 10, 40, 0.6)';
  ctx.fillRect(innerZone.x, innerZone.y, innerZone.width, innerZone.height);
  ctx.restore();

  // 5. Obstacles — per-type shapes with glow
  for (const obs of state.obstacles) {
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

  // 6b. Score zone — pulsing circle outline with green glow
  if (state.scoreZone?.active) {
    const pulse = 0.5 + 0.5 * Math.sin(pulseT * 3);
    ctx.save();
    ctx.strokeStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10 + 10 * pulse;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6 + 0.4 * pulse;
    ctx.beginPath();
    ctx.arc(state.scoreZone.x, state.scoreZone.y, state.scoreZone.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 6c. Bonus collection flashes — expanding fading rings
  for (let i = flashes.length - 1; i >= 0; i--) {
    const f = flashes[i];
    f.remaining -= delta;
    if (f.remaining <= 0) { flashes.splice(i, 1); continue; }
    const t = 1 - f.remaining / FLASH_DURATION; // 0→1 as flash ages
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

  // 9. HUD
  renderHUD(ctx, state, delta);

  ctx.restore();
}
