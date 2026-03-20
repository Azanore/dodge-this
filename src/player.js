// Player position tracking, mouse clamping, and hitbox.
// Related: zones.js (clampToInner), collision.js (getHitbox), renderer.js
// Does not handle rendering or game state directly.

import { clampToInner, innerZone } from './zones.js';

// Raw mouse position — updated on every mousemove
let rawX = null;
let rawY = null;

// Clamped player position — updated each frame via update()
let posX = 0;
let posY = 0;

// Current hitbox radius — may be modified by Shrink bonus
let radius = gameConfig.playerHitboxRadius;

// Track mouse position as raw values; clamping happens in update()
window.addEventListener('mousemove', e => {
  rawX = e.clientX;
  rawY = e.clientY;
});

// Called each frame — clamps latest mouse position into inner zone
export function update() {
  if (rawX === null) {
    // No mouse movement yet — stay at inner zone center
    posX = innerZone.x + innerZone.width / 2;
    posY = innerZone.y + innerZone.height / 2;
  } else {
    const clamped = clampToInner(rawX, rawY);
    posX = clamped.x;
    posY = clamped.y;
  }
}

// Returns circular hitbox used for collision detection
export function getHitbox() {
  return { x: posX, y: posY, radius };
}

// Sets hitbox radius — used by Shrink bonus
export function setRadius(r) {
  radius = r;
}

// Resets radius to config default — called on bonus expiry or game reset
export function resetRadius() {
  radius = gameConfig.playerHitboxRadius;
}
