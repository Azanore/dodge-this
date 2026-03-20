// Drives the requestAnimationFrame loop with capped delta time.
// Calls update(delta) then render() each frame.
// Related: main.js, GameState.js

const MAX_DELTA = 100; // ms — cap to prevent spiral-of-death on tab resume

export function createGameLoop(update, render) {
  let rafId = null;
  let lastTime = null;

  function tick(timestamp) {
    if (lastTime === null) lastTime = timestamp;
    const delta = Math.min(timestamp - lastTime, MAX_DELTA);
    lastTime = timestamp;

    update(delta);
    render();

    rafId = requestAnimationFrame(tick);
  }

  return {
    start() {
      if (rafId !== null) return;
      lastTime = null;
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      if (rafId === null) return;
      cancelAnimationFrame(rafId);
      rafId = null;
      lastTime = null;
    }
  };
}
