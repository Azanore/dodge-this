// Inner/Outer zone geometry computation and resize handling.
// Exports: innerZone, outerZone, clampToInner(x, y), recomputeZones()
// Related: player.js, obstacles.js, renderer.js
// Does not handle rendering or player state directly.

// Mutable zone objects updated in place on resize
export const innerZone = { x: 0, y: 0, width: 0, height: 0 };
export const outerZone = { x: 0, y: 0, width: 0, height: 0 };

// Recomputes both zones from current viewport and config
export function recomputeZones() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = gameConfig.outerZoneScale;

  // Inner zone: 70% of viewport, centered
  const iw = vw / scale;
  const ih = vh / scale;
  innerZone.x = (vw - iw) / 2;
  innerZone.y = (vh - ih) / 2;
  innerZone.width = iw;
  innerZone.height = ih;

  // Outer zone: full viewport, centered at origin
  outerZone.x = 0;
  outerZone.y = 0;
  outerZone.width = vw;
  outerZone.height = vh;
}

// Returns nearest point inside Inner Zone for given (x, y)
export function clampToInner(x, y) {
  return {
    x: Math.max(innerZone.x, Math.min(innerZone.x + innerZone.width, x)),
    y: Math.max(innerZone.y, Math.min(innerZone.y + innerZone.height, y))
  };
}

// Initialize on load and recompute on resize
recomputeZones();
window.addEventListener('resize', recomputeZones);
