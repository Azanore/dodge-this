// Unit tests for resetState() completeness.
// Related: GameState.js, game.config.js
import { resetState } from './GameState.js';

describe('resetState', () => {
  it('includes slowmoMultiplier: 1', () => {
    expect(resetState().slowmoMultiplier).toBe(1);
  });

  it('sets player.radius from gameConfig.playerHitboxRadius', () => {
    expect(resetState().player.radius).toBe(gameConfig.playerHitboxRadius);
  });

  it('sets initial status to "start"', () => {
    expect(resetState().status).toBe('start');
  });
});
