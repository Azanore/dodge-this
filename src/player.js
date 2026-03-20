// Player position tracking and mouse clamping.
// Related: zones.js (clampToInner, innerZone), GameState.js (state.player)
// Does not handle rendering or maintain internal position/radius state.

import { clampToInner, innerZone } from './zones.js';

// Raw mouse position — updated on every mousemove
let rawX = null;
let rawY = null;

// Track mouse position as raw values; clamping happens in update()
window.addEventListener('mousemove', e => {
  rawX = e.clientX;
  rawY = e.clientY;
});

// Called each frame — clamps latest mouse position into inner zone and writes to state.player
export function update(state) {
  if (rawX === null) {
    state.player.x = innerZone.x + innerZone.width / 2;
    state.player.y = innerZone.y + innerZone.height / 2;
  } else {
    const clamped = clampToInner(rawX, rawY);
    state.player.x = clamped.x;
    state.player.y = clamped.y;
  }
}
