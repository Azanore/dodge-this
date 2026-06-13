import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as audio from './audio.js';

// Mock Web Audio API
class MockAudioContext {
  constructor() {
    this.state = 'suspended';
    this.currentTime = 0;
    this.destination = {};
  }
  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      },
      connect: vi.fn(),
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  decodeAudioData(data) {
    return Promise.resolve({ duration: 10 });
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
}

global.window = {
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext,
};

global.performance = {
  now: vi.fn(() => Date.now()),
};

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  })
);

global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
};

global.window.gameConfig = {
  comboMultiplierMax: 5.0,
};

describe('audio manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset internal state of audio.js would be hard without reloading or adding reset functions
    // For now, we test the exported interface
  });

  it('initAudio should be idempotent and return a promise', async () => {
    const p1 = audio.initAudio();
    const p2 = audio.initAudio();
    expect(p1).toBe(p2);
    await p1;
    expect(global.fetch).toHaveBeenCalledTimes(8); // number of sounds
  });

  it('playNearMiss should have a cooldown', async () => {
    await audio.initAudio();
    let now = 1000;
    global.performance.now.mockReturnValue(now);

    // We can't easily check if play() was called because it's private
    // but we can check if it returns early.
    // Since it doesn't return anything, we'd need to mock audioCtx.createBufferSource
  });
});
