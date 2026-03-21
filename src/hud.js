// HUD rendering: survival timer, speed indicator, and active bonus countdowns.
// Related: GameState.js, renderer.js, difficulty.js
// Does not handle game logic — pure canvas drawing from state.

import { getCurrentSpeedMultiplier } from './difficulty.js';

// Per-type colors matching bonuses.js
const BONUS_COLORS = {
  slowmo: '#00cfff',
  invincibility: '#ffe600',
  screenclear: '#ff4dff',
  shrink: '#00ff99'
};

const FONT = '14px monospace';
const TIMER_FONT = '18px monospace';
const PAD = 12;
const LINE_HEIGHT = 20;

// Renders the survival timer, speed indicator, and active bonus labels onto the canvas
export function renderHUD(ctx, state) {
  ctx.save();
  ctx.textBaseline = 'top';

  // Survival timer — top-left corner
  const seconds = (state.elapsed / 1000).toFixed(1);
  ctx.font = TIMER_FONT;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 6;
  ctx.fillText(`${seconds}s`, PAD, PAD);

  // Speed indicator — top-right corner
  const speed = getCurrentSpeedMultiplier(state.elapsed).toFixed(2);
  ctx.font = FONT;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#aaaaaa';
  ctx.shadowColor = '#aaaaaa';
  ctx.shadowBlur = 4;
  ctx.fillText(`${speed}x`, ctx.canvas.width - PAD, PAD + 2);
  ctx.textAlign = 'left';

  // Active bonus countdowns — below the timer
  let offsetY = PAD + LINE_HEIGHT + 6;
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
