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

import { playScoreBank } from './audio.js'; // AUDIO
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
  ctx.fillStyle = ZONE_COLOR;
  ctx.shadowColor = ZONE_COLOR;
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

  // Difficulty — top-left, same style as timer
  ctx.font = TIMER_FONT;
  ctx.fillStyle = '#555555';
  ctx.textAlign = 'left';
  ctx.fillText(state.difficulty.toUpperCase(), 14, 14);

  // Bonus pills — right of center, stacking downward, top-aligned with score
  const effects = Object.entries(state.activeEffects);
  if (effects.length > 0) {
    const pillX = cx + PILL_OFFSET_X;
    let pillY = 14;
    for (const [type, effect] of effects) {
      drawBonusPill(ctx, type, effect, pillX, pillY);
      pillY += PILL_H + PILL_GAP;
    }
  }

  ctx.restore();
}
