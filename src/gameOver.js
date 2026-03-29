// Game Over screen — HTML overlay, no canvas drawing.
// Related: index.html (#game-over-screen), main.js, GameState.js
// Does not handle game logic or rendering.

const LEGACY_KEY = 'dodge_pb';

// Migrates legacy dodge_pb → dodge_pb_hard once, then removes the old key
function migrateLegacyPB() {
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (!legacy) return;
  if (!localStorage.getItem('dodge_pb_hard')) {
    localStorage.setItem('dodge_pb_hard', legacy);
  }
  localStorage.removeItem(LEGACY_KEY);
}
migrateLegacyPB();

function pbKey(difficulty) { return `dodge_pb_${difficulty}`; }

// Reads PB for a given difficulty, migrates legacy numeric format
function readPB(difficulty) {
  try {
    const raw = localStorage.getItem(pbKey(difficulty));
    if (!raw) return { score: 0, elapsed: 0 };
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'number') return { score: parsed, elapsed: 0 };
    return parsed;
  } catch {
    return { score: 0, elapsed: 0 };
  }
}

function writePB(difficulty, value) {
  try { localStorage.setItem(pbKey(difficulty), JSON.stringify(value)); } catch { /* unavailable */ }
}

// Updates PB if score is higher, returns { pb, isNewBest }
export function updatePB(score, elapsed, difficulty) {
  const pb = readPB(difficulty);
  if (score > pb.score) {
    writePB(difficulty, { score, elapsed });
    return { pb: { score, elapsed }, isNewBest: true };
  }
  return { pb, isNewBest: false };
}

// Reads PB for a given difficulty — used by start screen
export function getPB(difficulty) { return readPB(difficulty); }

let _onClickRestart = null;
let _onKey = null;

// Shows the game over HTML overlay, populates stats, wires restart
export function showGameOver(state, onRestart) {
  const { pb, isNewBest } = updatePB(state.score, state.elapsed, state.difficulty);

  const el = document.getElementById('game-over-screen');
  document.getElementById('go-score').textContent = `${Math.round(state.score)} pts`;
  document.getElementById('go-elapsed').textContent = `${(state.elapsed / 1000).toFixed(1)}s`;

  const pbEl = document.getElementById('go-pb');
  if (pb.score > 0) {
    // POLISH: score delta — replace the ternary body with just isNewBest label to revert
    const deltaStr = !isNewBest ? `  −${Math.round(pb.score - state.score)} pts from best` : '';
    pbEl.textContent = isNewBest
      ? 'New Best'
      : `Best  ${Math.round(pb.score)} pts  ${(pb.elapsed / 1000).toFixed(1)}s${deltaStr}`;
    pbEl.className = `overlay-pb${isNewBest ? ' new-best' : ''}`;
  } else {
    pbEl.textContent = '';
  }

  el.classList.add('open');

  _onClickRestart = () => { el.classList.remove('open'); cleanup(); onRestart(); };
  _onKey = (e) => { if (e.key === 'r' || e.key === 'R') { el.classList.remove('open'); cleanup(); onRestart(); } };

  document.getElementById('restart-btn').addEventListener('click', _onClickRestart);
  window.addEventListener('keydown', _onKey);
}

// Removes registered listeners — safe to call multiple times
export function cleanup() {
  if (_onClickRestart) {
    document.getElementById('restart-btn').removeEventListener('click', _onClickRestart);
    _onClickRestart = null;
  }
  if (_onKey) {
    window.removeEventListener('keydown', _onKey);
    _onKey = null;
  }
}
