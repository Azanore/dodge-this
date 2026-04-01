// Player position tracking and mouse clamping.
// Related: zones.js (clampToInner, innerZone), GameState.js (state.player)
// Does not handle rendering or maintain internal position/radius state.

import { innerZone } from './zones.js';

// Raw mouse position in canvas (logical) space — updated on every mousemove
let rawX = null;
let rawY = null;

// Maps viewport mouse coords to logical 1600×900 canvas coords via the container's bounding rect
window.addEventListener('mousemove', e => {
  const rect = document.getElementById('canvas-container').getBoundingClientRect();
  const scale = rect.width / 1600;
  rawX = (e.clientX - rect.left) / scale;
  rawY = (e.clientY - rect.top) / scale;
});

// Called each frame — clamps latest mouse position into inner zone and writes to state.player
// Accounts for player radius so the visual ball never exits the boundary
export function update(state) {
  const r = state.player.radius;
  if (rawX === null) {
    state.player.x = innerZone.x + innerZone.width / 2;
    state.player.y = innerZone.y + innerZone.height / 2;
  } else {
    state.player.x = Math.max(innerZone.x + r, Math.min(innerZone.x + innerZone.width - r, rawX));
    state.player.y = Math.max(innerZone.y + r, Math.min(innerZone.y + innerZone.height - r, rawY));
  }
}
