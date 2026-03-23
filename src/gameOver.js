// Game Over screen — HTML overlay, no canvas drawing.
// Related: index.html (#game-over-screen), main.js, GameState.js
// Does not handle game logic or rendering.

const PB_KEY = 'dodge_pb';

// Reads PB from localStorage, migrates legacy numeric format
function readPB() {
  try {
    const raw = localStorage.getItem(PB_KEY);
    if (!raw) return { score: 0, elapsed: 0 };
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'number') return { score: parsed, elapsed: 0 };
    return parsed;
  } catch {
    return { score: 0, elapsed: 0 };
  }
}

// Writes PB to localStorage; ignores failures
function writePB(value) {
  try { localStorage.setItem(PB_KEY, JSON.stringify(value)); } catch { /* unavailable */ }
}

// Updates PB if score is higher, returns display PB
export function updatePB(score, elapsed) {
  const pb = readPB();
  if (score > pb.score) writePB({ score, elapsed });
  return score > pb.score ? { score, elapsed } : pb;
}

// Shows the game over HTML overlay, populates stats, wires restart
export function showGameOver(state, onRestart) {
  const prevPB = readPB();
  const displayPB = updatePB(state.score, state.elapsed);
  const isNewBest = state.score >= prevPB.score;

  const el = document.getElementById('game-over-screen');
  document.getElementById('go-score').textContent = `${Math.round(state.score)} pts`;
  document.getElementById('go-elapsed').textContent = `${(state.elapsed / 1000).toFixed(1)}s`;

  const pbEl = document.getElementById('go-pb');
  if (displayPB.score > 0) {
    pbEl.textContent = isNewBest
      ? 'New Best'
      : `Best  ${Math.round(displayPB.score)} pts  ${(displayPB.elapsed / 1000).toFixed(1)}s`;
    pbEl.className = `overlay-pb${isNewBest ? ' new-best' : ''}`;
  } else {
    pbEl.textContent = '';
  }

  el.classList.add('open');

  function cleanup() {
    el.classList.remove('open');
    document.getElementById('restart-btn').removeEventListener('click', onClickRestart);
    window.removeEventListener('keydown', onKey);
  }

  function onClickRestart() { cleanup(); onRestart(); }
  function onKey(e) { if (e.key === 'r' || e.key === 'R') { cleanup(); onRestart(); } }

  document.getElementById('restart-btn').addEventListener('click', onClickRestart);
  window.addEventListener('keydown', onKey);
}
