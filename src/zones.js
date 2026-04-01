// Inner/Outer zone geometry computation using fixed logical canvas constants.
// Exports: CANVAS_W, CANVAS_H, innerZone, outerZone, clampToInner(x, y), recomputeZones()
// Related: player.js, obstacles.js, renderer.js
// Does not handle rendering, player state, or CSS scaling (that lives in main.js).

export const CANVAS_W = 1600;
export const CANVAS_H = 900;

// Mutable zone objects updated in place on recompute
export const innerZone = { x: 0, y: 0, width: 0, height: 0 };
export const outerZone = { x: 0, y: 0, width: 0, height: 0 };

// Recomputes both zones from fixed canvas constants and config
export function recomputeZones() {
  const scale = gameConfig.outerZoneScale;
  const iw = CANVAS_W / scale;
  const ih = CANVAS_H / scale;
  innerZone.x = (CANVAS_W - iw) / 2;
  innerZone.y = (CANVAS_H - ih) / 2;
  innerZone.width = iw;
  innerZone.height = ih;
  outerZone.x = 0;
  outerZone.y = 0;
  outerZone.width = CANVAS_W;
  outerZone.height = CANVAS_H;
}

// Returns nearest point inside Inner Zone for given (x, y)
export function clampToInner(x, y) {
  return {
    x: Math.max(innerZone.x, Math.min(innerZone.x + innerZone.width, x)),
    y: Math.max(innerZone.y, Math.min(innerZone.y + innerZone.height, y))
  };
}

// Initialize on load — geometry is fixed, no resize listener needed
recomputeZones();
