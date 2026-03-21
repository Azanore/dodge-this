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
const MULTIPLIER_FONT = '18px monospace';
const PAD = 12;
const LINE_HEIGHT = 20;

// Renders score (primary), elapsed time (secondary), combo multiplier (top-right), and bonus countdowns
export function renderHUD(ctx, state) {
  ctx.save();
  ctx.textBaseline = 'top';

  // Score — top-left, large
  ctx.font = SCORE_FONT;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 6;
  ctx.fillText(`${Math.floor(state.score)}`, PAD, PAD);

  // Elapsed time — below score, small
  const seconds = (state.elapsed / 1000).toFixed(1);
  ctx.font = TIMER_FONT;
  ctx.fillStyle = '#aaaaaa';
  ctx.shadowColor = '#aaaaaa';
  ctx.shadowBlur = 4;
  ctx.fillText(`${seconds}s`, PAD, PAD + 26);

  // Combo multiplier — top-right, only when > 1.0
  if (state.comboMultiplier > 1.0) {
    ctx.font = MULTIPLIER_FONT;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffcc00';
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 8;
    ctx.fillText(`${state.comboMultiplier.toFixed(1)}x`, ctx.canvas.width - PAD, PAD + 2);
    ctx.textAlign = 'left';
  }

  // Active bonus countdowns — below the timer
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
