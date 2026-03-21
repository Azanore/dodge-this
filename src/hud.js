// HUD rendering: score, survival timer, combo multiplier, and active bonus countdowns.
// Related: GameState.js, renderer.js, difficulty.js
// Does not handle game logic — pure canvas drawing from state.

// Per-type colors matching bonuses.js
const BONUS_COLORS = {
  slowmo: '#0088ff',
  invincibility: '#ffe600',
  screenclear: '#ff4dff',
  shrink: '#00ff99'
};

const FONT = '14px monospace';
const SCORE_FONT = '22px monospace';
const TIMER_FONT = '14px monospace';
const ZONE_COLOR = '#00ff88';   // multiplier — matches score zone circle
const PENDING_COLOR = '#88ffcc'; // pending bonus — lighter mint, same family
const PAD = 12;
const LINE_HEIGHT = 20;

// Score bump animation state — triggered when pending banks into real score
const BUMP_DURATION = 220;
let bumpRemaining = 0;
export function triggerScoreBump() { bumpRemaining = BUMP_DURATION; }

// Renders score (primary), multiplier + pending inline, timer below, bonus countdowns
export function renderHUD(ctx, state, delta) {
  ctx.save();
  ctx.textBaseline = 'top';

  // Score — top-left, large white; scales up briefly when pending banks
  bumpRemaining = Math.max(0, bumpRemaining - delta);
  const bumpScale = bumpRemaining > 0 ? 1 + 0.18 * (bumpRemaining / BUMP_DURATION) : 1;
  const scoreStr = `${Math.floor(state.score)}`;
  ctx.save();
  ctx.font = SCORE_FONT;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = bumpRemaining > 0 ? 18 : 6;
  if (bumpScale !== 1) {
    ctx.translate(PAD, PAD);
    ctx.scale(bumpScale, bumpScale);
    ctx.fillText(scoreStr, 0, 0);
  } else {
    ctx.fillText(scoreStr, PAD, PAD);
  }
  ctx.restore();

  // Multiplier — green, right after score
  ctx.font = SCORE_FONT;
  const scoreWidth = ctx.measureText(scoreStr).width * bumpScale;
  const isCombo = state.comboMultiplier > 1.0;
  ctx.font = TIMER_FONT;
  ctx.fillStyle = ZONE_COLOR;
  ctx.shadowColor = ZONE_COLOR;
  ctx.shadowBlur = isCombo ? 8 : 0;
  ctx.globalAlpha = isCombo ? 1.0 : 0.35;
  ctx.fillText(` x${state.comboMultiplier.toFixed(1)}`, PAD + scoreWidth, PAD + 4);

  // Pending — mint, right after multiplier, only when active
  if (isCombo) {
    const multWidth = ctx.measureText(` x${state.comboMultiplier.toFixed(1)}`).width;
    ctx.fillStyle = PENDING_COLOR;
    ctx.shadowColor = PENDING_COLOR;
    ctx.shadowBlur = 6;
    ctx.globalAlpha = 1.0;
    ctx.fillText(` +${Math.floor(state.pendingScore)}`, PAD + scoreWidth + multWidth, PAD + 4);
  }
  ctx.globalAlpha = 1.0;

  // Timer — below score, always grey
  ctx.font = TIMER_FONT;
  ctx.fillStyle = '#aaaaaa';
  ctx.shadowColor = '#aaaaaa';
  ctx.shadowBlur = 0;
  ctx.fillText(`${(state.elapsed / 1000).toFixed(1)}s`, PAD, PAD + 26);

  // Active bonus countdowns — below timer
  let offsetY = PAD + 26 + LINE_HEIGHT + 4;
  for (const [type, effect] of Object.entries(state.activeEffects)) {
    const remaining = (effect.remaining / 1000).toFixed(1);
    const color = BONUS_COLORS[type] ?? '#ffffff';
    ctx.font = FONT;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillText(`${type} ${remaining}s`, PAD, offsetY);
    offsetY += LINE_HEIGHT;
  }

  ctx.restore();
}
