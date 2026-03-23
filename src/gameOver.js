// Game Over screen: personal best, restart, and share functionality.
// Related: GameState.js, main.js, renderer.js
// Does not handle game logic — pure canvas drawing and DOM interaction.

const PB_KEY = 'dodge_pb';

const OVERLAY_COLOR = 'rgba(0, 0, 0, 0.78)';
const TITLE_FONT = 'bold 48px monospace';
const LABEL_FONT = '20px monospace';
const SMALL_FONT = '14px monospace';
const BTN_W = 180;
const BTN_H = 44;
const BTN_RADIUS = 8;

// Reads personal best from localStorage; returns { score: 0, elapsed: 0 } on any failure
function readPB() {
  try {
    const raw = localStorage.getItem(PB_KEY);
    if (!raw) return { score: 0, elapsed: 0 };
    const parsed = JSON.parse(raw);
    // Migrate legacy numeric PB (score only, no elapsed)
    if (typeof parsed === 'number') return { score: parsed, elapsed: 0 };
    return parsed;
  } catch {
    return { score: 0, elapsed: 0 };
  }
}

// Writes personal best to localStorage; silently ignores failures
function writePB(value) {
  try {
    localStorage.setItem(PB_KEY, JSON.stringify(value));
  } catch {
    // localStorage unavailable — no-op per Requirement 3.4
  }
}

// Reads current PB, updates it if score is higher, returns the new display PB
export function updatePB(score, elapsed) {
  const pb = readPB();
  if (score > pb.score) writePB({ score, elapsed });
  return score > pb.score ? { score, elapsed } : pb;
}

// Draws a rounded rectangle button and returns its bounding box
function drawButton(ctx, label, cx, cy, color) {
  const x = cx - BTN_W / 2;
  const y = cy - BTN_H / 2;
  ctx.beginPath();
  ctx.roundRect(x, y, BTN_W, BTN_H, BTN_RADIUS);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.font = LABEL_FONT;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = 0;
  ctx.fillText(label, cx, cy);
  return { x, y, w: BTN_W, h: BTN_H };
}

// Returns true if (px, py) is inside the button bounding box
function hitBtn(btn, px, py) {
  return px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h;
}

// Shows the Game Over overlay and wires the restart button.
// onRestart: callback to reset state and resume the game loop.
// Returns a cleanup function to remove event listeners.
export function showGameOver(canvas, state, onRestart) {
  const ctx = canvas.getContext('2d');
  const cw = canvas.width;
  const ch = canvas.height;
  const cx = cw / 2;

  // Personal best logic (Requirements 3.1, 3.2)
  const prevPB = readPB();
  const displayPB = updatePB(state.score, state.elapsed);
  const isNewBest = state.score >= prevPB.score;

  const points = Math.round(state.score);
  const elapsed = (state.elapsed / 1000).toFixed(1);
  const pbPoints = Math.round(displayPB.score);
  const pbElapsed = (displayPB.elapsed / 1000).toFixed(1);
  const hasPB = displayPB.score > 0;

  // Layout anchors
  const titleY = ch * 0.28;
  const timeY = ch * 0.42;
  const pbY = ch * 0.50;
  const restartY = ch * 0.62;
  const hintY = ch * 0.62 + BTN_H + 14;

  // Draw overlay
  ctx.save();
  ctx.fillStyle = OVERLAY_COLOR;
  ctx.fillRect(0, 0, cw, ch);

  // Title
  ctx.font = TITLE_FONT;
  ctx.fillStyle = '#ff4444';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff4444';
  ctx.shadowBlur = 20;
  ctx.fillText('GAME OVER', cx, titleY);

  // Final score + elapsed
  ctx.font = LABEL_FONT;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 8;
  ctx.fillText(`Score: ${points}  •  ${elapsed}s`, cx, timeY);

  // Personal best (omit if localStorage was unavailable and pb is 0)
  if (hasPB) {
    ctx.font = SMALL_FONT;
    ctx.fillStyle = '#aaaaaa';
    ctx.shadowBlur = 0;
    const pbLabel = isNewBest ? 'New Best: ' : 'Best: ';
    ctx.fillText(`${pbLabel}${pbPoints} pts  •  ${pbElapsed}s`, cx, pbY);
  }

  ctx.shadowBlur = 0;

  // Restart button
  const restartBtn = drawButton(ctx, 'Restart', cx, restartY, '#2255cc');

  // Keyboard hint
  ctx.font = SMALL_FONT;
  ctx.fillStyle = '#666666';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('or press R', cx, hintY);

  ctx.restore();

  function cleanup() {
    canvas.removeEventListener('click', onClick);
    window.removeEventListener('keydown', onKey);
  }

  // Click handler
  function onClick(e) {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (hitBtn(restartBtn, px, py)) {
      cleanup();
      onRestart();
    }
  }

  // R key handler
  function onKey(e) {
    if (e.key === 'r' || e.key === 'R') {
      cleanup();
      onRestart();
    }
  }

  canvas.addEventListener('click', onClick);
  window.addEventListener('keydown', onKey);

  return cleanup;
}
