// Obstacle pool: spawning, movement, and removal.
// Related: zones.js, difficulty.js, game.config.js, GameState.js
// Does not handle rendering or collision detection.

import { innerZone, outerZone } from './zones.js';

// Obstacle visual radii per type (pixels)
const TYPE_RADIUS = { ball: 14, bullet: 7, shard: 10, tracker: 11 };

// Builds a weighted list of enabled obstacle type keys from config
function getEnabledTypes() {
  const types = [];
  for (const [key, cfg] of Object.entries(gameConfig.obstacleTypes)) {
    if (cfg.enabled) {
      for (let i = 0; i < cfg.spawnWeight; i++) types.push(key);
    }
  }
  return types;
}

// Returns a random spawn point in the outer zone but outside the inner zone
function pickSpawnPoint() {
  const oz = outerZone;
  const iz = innerZone;

  // Pick a random edge of the outer zone (0=top, 1=right, 2=bottom, 3=left)
  const edge = Math.floor(Math.random() * 4);
  let x, y;

  if (edge === 0) {
    x = oz.x + Math.random() * oz.width;
    y = oz.y + Math.random() * (iz.y - oz.y);
  } else if (edge === 1) {
    x = iz.x + iz.width + Math.random() * (oz.x + oz.width - iz.x - iz.width);
    y = oz.y + Math.random() * oz.height;
  } else if (edge === 2) {
    x = oz.x + Math.random() * oz.width;
    y = iz.y + iz.height + Math.random() * (oz.y + oz.height - iz.y - iz.height);
  } else {
    x = oz.x + Math.random() * (iz.x - oz.x);
    y = oz.y + Math.random() * oz.height;
  }

  return { x, y };
}

// Returns a velocity vector aimed at a random point inside the inner zone
function velocityTowardInner(fromX, fromY, speed) {
  const targetX = innerZone.x + Math.random() * innerZone.width;
  const targetY = innerZone.y + Math.random() * innerZone.height;
  const dx = targetX - fromX;
  const dy = targetY - fromY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return { vx: (dx / dist) * speed, vy: (dy / dist) * speed };
}

// Spawns one obstacle into the state obstacles array if under the cap
// speedMultiplier comes from difficulty.js getCurrentSpeedMultiplier(elapsed)
export function spawnObstacle(state, speedMultiplier = 1) {
  const preset = gameConfig.difficultyPresets[state.difficulty] ?? gameConfig.difficultyPresets.normal;
  if (state.obstacles.length >= preset.maxObstaclesOnScreen) return;

  const pool = getEnabledTypes();
  if (pool.length === 0) return;

  const type = pool[Math.floor(Math.random() * pool.length)];

  // Trackers have their own cap — prevents them filling the screen and crowding out other types
  if (type === 'tracker') {
    const trackerCount = state.obstacles.filter(o => o.type === 'tracker').length;
    if (trackerCount >= preset.maxTrackers) return;
  }
  const cfg = gameConfig.obstacleTypes[type];

  // Per-spawn variance: random float in [0.85, 1.15]
  const variance = 0.85 + Math.random() * 0.3;
  const speed = cfg.baseSpeed * speedMultiplier * variance;

  const { x, y } = pickSpawnPoint();
  const { vx, vy } = velocityTowardInner(x, y, speed);

  state.obstacles.push({
    type,
    x,
    y,
    vx,
    vy,
    radius: TYPE_RADIUS[type] ?? 10,
    lastNearMissAt: 0,
    // POLISH: tracker spawn warning — pending:true delays tracker activation 500ms; remove pending logic in obstacles.js, renderer.js to revert
    pending: type === 'tracker' ? 500 : 0
  });
}

// Moves all obstacles and removes those outside the outer zone
// state.slowmoMultiplier is set by the slow-mo bonus (default 1.0)
export function updateObstacles(delta, state) {
  const oz = outerZone;
  const slowmo = state.slowmoMultiplier ?? 1;

  state.obstacles = state.obstacles.filter(obs => {
    // POLISH: tracker spawn warning — tick down pending timer; skip movement/removal while pending
    if (obs.pending > 0) {
      obs.pending -= delta * slowmo;
      return true;
    }

    // Tracker: steer velocity toward current player position each frame
    if (obs.type === 'tracker') {
      const dx = state.player.x - obs.x;
      const dy = state.player.y - obs.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const turnRate = gameConfig.obstacleTypes.tracker.turnRate;
        const speed = Math.sqrt(obs.vx * obs.vx + obs.vy * obs.vy);
        // Blend current direction toward player direction by turnRate
        const tx = (dx / dist) * speed;
        const ty = (dy / dist) * speed;
        obs.vx += (tx - obs.vx) * turnRate;
        obs.vy += (ty - obs.vy) * turnRate;
        // Renormalize to preserve speed
        const newSpeed = Math.sqrt(obs.vx * obs.vx + obs.vy * obs.vy);
        obs.vx = (obs.vx / newSpeed) * speed;
        obs.vy = (obs.vy / newSpeed) * speed;
      }
    }

    obs.x += obs.vx * delta * slowmo;
    obs.y += obs.vy * delta * slowmo;

    // Trackers ignore out-of-bounds — only removed by screenclear bonus
    if (obs.type === 'tracker') return true;

    return (
      obs.x + obs.radius > oz.x &&
      obs.x - obs.radius < oz.x + oz.width &&
      obs.y + obs.radius > oz.y &&
      obs.y - obs.radius < oz.y + oz.height
    );
  });
}

// Removes all active obstacles — used by Screen Clear bonus
export function clearAll(state) {
  state.obstacles = [];
}
