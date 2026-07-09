// HUD rendering: score, survival timer, combo multiplier, and active bonus countdowns.
// Related: GameState.js, renderer.js, difficulty.js
// Does not handle game logic — pure canvas drawing from state.

const SCORE_FONT = '28px monospace';
const TIMER_FONT = '12px monospace';
const MULT_FONT = '14px monospace';
const ZONE_COLOR = '#00ff88';    // multiplier — matches score zone circle
const PENDING_SAFE = '#88ffcc';  // pending score — player inside zone or zone inactive
const PENDING_RISK = '#ffaa44';  // pending score — player outside active zone (draining)

const PILL_W = 130;  // fixed pill width — never changes as bar depletes
const PILL_H = 20;
const PILL_GAP = 6;
const PILL_RADIUS = 4;
const PILL_OFFSET_X = 90;  // distance right of center

import { playScoreBank } from '../services/audio.js'; // AUDIO
import { BONUS_COLORS } from './renderer.js';

// Score bump animation — longer, bolder, color flash on bank
const BUMP_DURATION = 380;
let bumpRemaining = 0;
export function triggerScoreBump() {
  bumpRemaining = BUMP_DURATION;
  playScoreBank(); // AUDIO
}

// Draws a single bonus pill: colored fill depletes left-to-right, label always visible
function drawBonusPill(ctx, type, effect, x, y) {
  const color = BONUS_COLORS[type] ?? '#ffffff';
  const cfg = gameConfig.bonusTypes[type];
  const fillRatio = cfg?.duration > 0 ? Math.max(0, effect.remaining / cfg.duration) : 1;

  ctx.save();

  // Dark background
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(x, y, PILL_W, PILL_H, PILL_RADIUS);
  ctx.fill();

  // Depleting color fill — clips to pill shape, shrinks left-to-right
  if (fillRatio > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, PILL_W * fillRatio, PILL_H, PILL_RADIUS);
    ctx.fillStyle = color + '55';
    ctx.fill();
  }

  // Label — always centered, always readable
  ctx.font = '11px monospace';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(type.toUpperCase(), x + PILL_W / 2, y + PILL_H / 2);
  ctx.restore();
}

// Draws a single ability slot. Charge fill shows progress toward cost.
// No shadowBlur on text — shadow = unreadable blur at canvas scale.
function drawSkillSlot(ctx, state, x, y, key, label, cost) {
  const battery = state.battery;
  const ready = battery >= cost;
  const now = performance.now();
  const CD_MS = 500;
  const onCooldown = (now - state.lastAbilityUsedAt) < CD_MS;

  const w = 82, h = 48;

  // Charge progress toward this ability's cost — used for border color only
  const chargeRatio = Math.min(1, battery / cost);

  // Colors: ready = cyan, charging = dimmed cyan, cooldown = blue
  const borderColor = ready
    ? (onCooldown ? '#0088aa' : '#00eeff')
    : chargeRatio > 0 ? '#005566' : '#1a1a1a';
  const keyColor = ready ? (onCooldown ? '#55aacc' : '#00eeff') : '#444';
  const labelColor = ready ? (onCooldown ? '#aaa' : '#ffffff') : '#555';

  ctx.save();

  // Border glow only when ready and not cooling down — no text shadow
  ctx.shadowColor = (ready && !onCooldown) ? '#00eeff' : 'transparent';
  ctx.shadowBlur = (ready && !onCooldown) ? 10 : 0;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = ready ? 2 : 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 5);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Background
  ctx.fillStyle = ready ? 'rgba(0,238,255,0.07)' : 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 5);
  ctx.fill();

  // Cooldown overlay — darkens slot, sweeps away as CD expires
  if (onCooldown && ready) {
    const cdProgress = (now - state.lastAbilityUsedAt) / CD_MS; // 0→1
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(x, y, w * (1 - cdProgress), h, 5);
    ctx.fill();
  }

  // Key number — top-left, no shadow
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = keyColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(key, x + 8, y + 8);

  // Ability name — center, no shadow; 11px to fit longer names in 82px slot
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = labelColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 4);

  // Cost badge — top-right; yellow when ready, dim otherwise
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = ready ? '#ffe600' : '#333';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(`${cost}`, x + w - 7, y + 8);

  ctx.restore();
}

function drawBattery(ctx, state, x, y) {
  const cfg = gameConfig.battery;
  const ratio = state.battery / cfg.max;
  const color = state.battery >= cfg.max ? '#ffe600' : '#00eeff';

  // Widen bar to match 3 slots (3×82 + 2×8 gap = 262)
  const w = 262, h = 16;

  ctx.save();

  // Label — no shadowBlur on text to keep it sharp
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'transparent';
  ctx.fillText(`KINETIC ENERGY  ${Math.floor(state.battery)}%`, x, y - 10);

  // Meter background
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 3);
  ctx.fill();

  // Fill
  if (ratio > 0) {
    const grd = ctx.createLinearGradient(x, 0, x + w, 0);
    grd.addColorStop(0, color);
    grd.addColorStop(1, '#ffffff');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.roundRect(x, y, w * ratio, h, 3);
    ctx.fill();

    // Shine
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, w * ratio, h / 2.5);
    ctx.globalAlpha = 1;
  }

  // Border
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 3);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Threshold ticks — mark unlock points for each ability on the bar
  const abilities = cfg.abilities;
  const thresholds = [
    { pct: abilities.cloak.cost, label: '1' },
    { pct: abilities.pulse.cost, label: '2' },
    { pct: abilities.chrono.cost, label: '3' },
  ];
  for (const t of thresholds) {
    const tx = x + (t.pct / cfg.max) * w;
    const unlocked = state.battery >= t.pct;
    const tickColor = unlocked ? '#00eeff' : '#334';

    // Tick line
    ctx.strokeStyle = tickColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, y - 1);
    ctx.lineTo(tx, y + h + 1);
    ctx.stroke();

    // Tick label below bar — no shadow
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = unlocked ? '#00eeff' : '#444';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(t.label, tx, y + h + 3);
  }

  // Ability slots — 3×82px + 8px gap = 262px total, aligns with bar
  const slotW = 82, gap = 8;
  const slotY = y + h + 22;
  drawSkillSlot(ctx, state, x, slotY, '1', 'PHASE CLOAK', abilities.cloak.cost);
  drawSkillSlot(ctx, state, x + slotW + gap, slotY, '2', 'KIN. PULSE', abilities.pulse.cost);
  drawSkillSlot(ctx, state, x + (slotW + gap) * 2, slotY, '3', 'TEMPORAL SHIFT', abilities.chrono.cost);

  ctx.restore();
}

// Renders score top-center, bonus pills top-right
export function renderHUD(ctx, state, delta) {
  const cw = ctx.canvas.width;
  const cx = cw / 2;

  ctx.save();

  bumpRemaining = Math.max(0, bumpRemaining - delta);
  const bumping = bumpRemaining > 0;
  const bumpT = bumpRemaining / BUMP_DURATION; // 1→0
  const bumpScale = bumping ? 1 + 0.35 * bumpT : 1;
  // Color flashes green on bank, fades back to white
  const scoreColor = bumping
    ? `rgb(${Math.round(255 * (1 - bumpT))}, 255, ${Math.round(255 * (1 - bumpT * 0.45))})`
    : '#ffffff';
  const scoreStr = `${Math.floor(state.score)}`;

  // Score — top-center, large; bold color flash + scale on bank
  ctx.save();
  ctx.font = SCORE_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = scoreColor;
  ctx.shadowColor = scoreColor;
  ctx.shadowBlur = bumping ? 28 : 8;
  if (bumpScale !== 1) {
    ctx.translate(cx, 12);
    ctx.scale(bumpScale, bumpScale);
    ctx.fillText(scoreStr, 0, 0);
  } else {
    ctx.fillText(scoreStr, cx, 12);
  }
  ctx.restore();

  // Multiplier + pending — centered below score
  const isCombo = state.comboMultiplier > 1.0;
  const multStr = `x${state.comboMultiplier.toFixed(1)}`;
  // POLISH: multiplier decay color — shifts green→amber→red as multiplier drops; remove the multColor lines and use ZONE_COLOR directly to revert
  const decayT = (state.comboMultiplier - 1.0) / (gameConfig.comboMultiplierMax - 1.0); // 1=max, 0=1x
  const multColor = isCombo
    ? decayT > 0.5
      ? ZONE_COLOR
      : decayT > 0.2
        ? '#ffaa44'
        : '#ff4444'
    : ZONE_COLOR;

  ctx.font = MULT_FONT;
  ctx.textBaseline = 'top';

  const zone = state.scoreZone;
  const playerOutsideActiveZone = zone?.active && (() => {
    const dx = state.player.x - zone.x, dy = state.player.y - zone.y;
    return dx * dx + dy * dy > zone.radius * zone.radius;
  })();
  const pendingColor = playerOutsideActiveZone ? PENDING_RISK : PENDING_SAFE;
  const pendingStr = isCombo ? ` +${Math.floor(state.pendingScore)}` : '';
  const multW = ctx.measureText(multStr).width;
  const pendingW = isCombo ? ctx.measureText(pendingStr).width : 0;
  const rowX = cx - (multW + pendingW) / 2;
  const rowY = 46;

  ctx.textAlign = 'left';
  ctx.fillStyle = multColor; // POLISH: multiplier decay color
  ctx.shadowColor = multColor; // POLISH: multiplier decay color
  ctx.shadowBlur = isCombo ? 8 : 0;
  ctx.globalAlpha = isCombo ? 1.0 : 0.35;
  ctx.fillText(multStr, rowX, rowY);

  if (isCombo) {
    ctx.fillStyle = pendingColor;
    ctx.shadowColor = pendingColor;
    ctx.shadowBlur = 8;
    ctx.globalAlpha = 1.0;
    ctx.fillText(pendingStr, rowX + multW, rowY);
  }
  ctx.globalAlpha = 1.0;

  // Timer — small grey, below multiplier row
  ctx.font = TIMER_FONT;
  ctx.fillStyle = '#666666';
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.fillText(`${(state.elapsed / 1000).toFixed(1)}s`, cx, 66);

  // Bonus pills — right of center, stacking downward, top-aligned with score
  const pillX = cx + PILL_OFFSET_X;
  let pillY = 14;
  const effects = Object.entries(state.activeEffects);
  for (const [type, effect] of effects) {
    drawBonusPill(ctx, type, effect, pillX, pillY);
    pillY += PILL_H + PILL_GAP;
  }

  // Battery & Skills — 18px bottom margin: slots(48) + slotGap(22) + bar(16) + label(~10) + margin(18) = 114 → anchor at height - 104
  drawBattery(ctx, state, cx - 131, ctx.canvas.height - 104);

  ctx.restore();
}
