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

// Returns a random spawn point on the canvas perimeter — center exactly on the edge
// Obstacles enter the screen from outside, giving maximum travel distance to the player area
function pickSpawnPoint() {
  const oz = outerZone;
  const perimeter = 2 * (oz.width + oz.height);
  const t = Math.random() * perimeter;

  if (t < oz.width)
    return { x: oz.x + t, y: oz.y };
  if (t < oz.width + oz.height)
    return { x: oz.x + oz.width, y: oz.y + (t - oz.width) };
  if (t < 2 * oz.width + oz.height)
    return { x: oz.x + oz.width - (t - oz.width - oz.height), y: oz.y + oz.height };
  return { x: oz.x, y: oz.y + oz.height - (t - 2 * oz.width - oz.height) };
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
    // Store intended speed to prevent permanent speed creep from Pulse/Ability force
    speed,
    // POLISH: tracker spawn warning — pending:true delays tracker activation 500ms; remove pending logic in obstacles.js, renderer.js to revert
    pending: type === 'tracker' ? 2000 : 0
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
        // Slowmo and Chrono should also affect turn rate
        const turnRate = gameConfig.obstacleTypes.tracker.turnRatePerMs * delta * slowmo;
        // Blend current direction toward player direction — delta-scaled and slowmo-aware
        const tx = (dx / dist) * obs.speed;
        const ty = (dy / dist) * obs.speed;
        obs.vx += (tx - obs.vx) * turnRate;
        obs.vy += (ty - obs.vy) * turnRate;
        // Renormalize to the stored intended speed to prevent speed creep from Pulse/force
        const currentSpeed = Math.sqrt(obs.vx * obs.vx + obs.vy * obs.vy);
        if (currentSpeed > 0) {
          obs.vx = (obs.vx / currentSpeed) * obs.speed;
          obs.vy = (obs.vy / currentSpeed) * obs.speed;
        }
      }
    }

    // Explicit clamp for outliers (sanity check)
    const currentVel = Math.sqrt(obs.vx * obs.vx + obs.vy * obs.vy);
    if (currentVel > 0.6) { // 0.6 is roughly 2x-3x normal speed
       obs.vx = (obs.vx / currentVel) * 0.6;
       obs.vy = (obs.vy / currentVel) * 0.6;
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
