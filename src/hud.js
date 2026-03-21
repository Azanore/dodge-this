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
const ZONE_COLOR = '#00ff88';
const PAD = 12;
const LINE_HEIGHT = 20;

// Renders score (primary), compact info row (time · multiplier · pending), and bonus countdowns
export function renderHUD(ctx, state) {
  ctx.save();
  ctx.textBaseline = 'top';

  // Score — top-left, large white
  ctx.font = SCORE_FONT;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 6;
  ctx.fillText(`${Math.floor(state.score)}`, PAD, PAD);

  // Info row — below score, compact single line
  ctx.font = TIMER_FONT;
  const seconds = (state.elapsed / 1000).toFixed(1);
  const isCombo = state.comboMultiplier > 1.0;

  if (isCombo) {
    // Time in grey
    ctx.fillStyle = '#aaaaaa';
    ctx.shadowColor = '#aaaaaa';
    ctx.shadowBlur = 0;
    ctx.fillText(`${seconds}s`, PAD, PAD + 26);

    // Multiplier + pending in green, right after time
    const timeWidth = ctx.measureText(`${seconds}s`).width;
    ctx.fillStyle = ZONE_COLOR;
    ctx.shadowColor = ZONE_COLOR;
    ctx.shadowBlur = 8;
    ctx.fillText(` · x${state.comboMultiplier.toFixed(1)} +${Math.floor(state.pendingScore)}`, PAD + timeWidth, PAD + 26);
  } else {
    ctx.fillStyle = '#aaaaaa';
    ctx.shadowColor = '#aaaaaa';
    ctx.shadowBlur = 0;
    ctx.fillText(`${seconds}s`, PAD, PAD + 26);
  }

  // Active bonus countdowns — below info row
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
