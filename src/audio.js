// Audio manager — loads and plays all game sounds.
// Related: main.js (init, music control), gameUpdate.js (death, multiplier-max), bonuses.js (pickup), hud.js (score-bank)
// Self-contained: delete this file and remove // AUDIO lines in callers to remove all audio.

const SOUNDS = {
  death: 'sounds/death.wav',
  pickup: 'sounds/pickup.wav',
  scoreBank: 'sounds/score-bank.wav',
  multiplierMax: 'sounds/multiplier-max.wav',
  gameStart: 'sounds/game-start.ogg',
  nearMiss: 'sounds/near-miss.wav',
  zoneAppear: 'sounds/zone-appear.wav',
  achievement: 'sounds/achievement.wav',
  music: 'sounds/music.mp3',
};

const buffers = {};
let audioCtx = null;
let masterGain = null;
let sfxGain = null;
let musicGain = null;

let musicSource = null;
let musicOffset = 0;
let musicStartedAt = 0;
let musicFadeTimer = null;

const MUSIC_FADE_OUT = 0.3; // seconds

// User preferences — persisted in localStorage
export let sfxEnabled = localStorage.getItem('dodge_sfx') !== 'false';
export let musicEnabled = localStorage.getItem('dodge_music') !== 'false';

// Toggles SFX on/off
export function setSfx(enabled) {
  sfxEnabled = enabled;
  localStorage.setItem('dodge_sfx', enabled);
  if (sfxGain) sfxGain.gain.value = enabled ? 1 : 0;
}

// Toggles music on/off — fades out if playing, does not start (callers handle that)
export function setMusic(enabled) {
  musicEnabled = enabled;
  localStorage.setItem('dodge_music', enabled);
  if (!enabled) {
    fadeOutMusic();
  } else {
    if (musicGain) musicGain.gain.value = 1;
  }
}

let loadingPromise = null;

// Initializes AudioContext and loads all buffers — call on first user gesture; no-op if already initialized
export function initAudio() {
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        masterGain = audioCtx.createGain();
        masterGain.connect(audioCtx.destination);

        sfxGain = audioCtx.createGain();
        sfxGain.gain.value = sfxEnabled ? 1 : 0;
        sfxGain.connect(masterGain);

        musicGain = audioCtx.createGain();
        musicGain.gain.value = musicEnabled ? 1 : 0;
        musicGain.connect(masterGain);
      }

      await Promise.all(
        Object.entries(SOUNDS).map(async ([key, path]) => {
          if (buffers[key]) return;
          const res = await fetch(path);
          if (!res.ok) throw new Error(`Failed to load sound: ${path}`);
          const arr = await res.arrayBuffer();
          buffers[key] = await audioCtx.decodeAudioData(arr);
        })
      );
    } catch (err) {
      console.error('Audio initialization failed:', err);
      loadingPromise = null; // Allow retry on failure
      throw err;
    }
  })();

  return loadingPromise;
}

// Plays a one-shot sound by key
function play(key) {
  if (!sfxEnabled || !audioCtx || !buffers[key]) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const src = audioCtx.createBufferSource();
  src.buffer = buffers[key];
  src.connect(sfxGain);
  src.start();
}

// Starts music looping from the beginning
export function startMusic() {
  if (!musicEnabled || !audioCtx || !buffers.music) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  stopMusic();

  musicSource = audioCtx.createBufferSource();
  musicSource.buffer = buffers.music;
  musicSource.loop = true;
  musicSource.connect(musicGain);
  musicSource.start();
  musicStartedAt = audioCtx.currentTime;
  musicOffset = 0;
}

// Records pause offset and stops source — always called on game pause
export function pauseMusic() {
  if (musicSource) {
    musicOffset = (audioCtx.currentTime - musicStartedAt) % buffers.music.duration;
    musicSource.stop();
    musicSource.disconnect();
    musicSource = null;
  }
}

// Resumes from saved offset if enabled, otherwise no-op
export function resumeMusic() {
  if (!musicEnabled || !audioCtx || !buffers.music || musicSource) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  musicSource = audioCtx.createBufferSource();
  musicSource.buffer = buffers.music;
  musicSource.loop = true;
  musicSource.connect(musicGain);
  musicSource.start(0, musicOffset);
  musicStartedAt = audioCtx.currentTime - musicOffset;
}

// Stops music entirely — cancels any in-flight fade
export function stopMusic() {
  if (musicFadeTimer) { clearTimeout(musicFadeTimer); musicFadeTimer = null; }
  if (musicGain) {
    musicGain.gain.cancelScheduledValues(audioCtx.currentTime);
    musicGain.gain.value = musicEnabled ? 1 : 0;
  }
  if (!musicSource) return;
  try {
    musicSource.stop();
    musicSource.disconnect();
  } catch (e) {
    // Already stopped or other issue
  }
  musicSource = null;
  musicOffset = 0;
}

// Fades music out over MUSIC_FADE_OUT seconds then stops — used when toggling music off
function fadeOutMusic() {
  if (!musicSource || !musicGain || musicFadeTimer) return;

  const now = audioCtx.currentTime;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setValueAtTime(musicGain.gain.value, now);
  // exponentialRampToValueAtTime cannot ramp to 0, use a very small value instead
  musicGain.gain.exponentialRampToValueAtTime(0.0001, now + MUSIC_FADE_OUT);

  musicFadeTimer = setTimeout(() => {
    musicFadeTimer = null;
    stopMusic();
  }, MUSIC_FADE_OUT * 1000);
}

export function playDeath() { play('death'); }
export function playPickup() { play('pickup'); }
export function playScoreBank() { play('scoreBank'); }
export function playGameStart() { play('gameStart'); }

// Internal near-miss logic — manages its own cooldown using performance.now()
let lastNearMissAt = 0;
const NEAR_MISS_GLOBAL_COOLDOWN = 300; // ms

export function playNearMiss() {
  const now = performance.now();
  if (now - lastNearMissAt < NEAR_MISS_GLOBAL_COOLDOWN) return;
  play('nearMiss');
  lastNearMissAt = now;
}

// Deprecated: Cooldown is now internalized. Kept for backward compatibility until call sites are updated.
export function tickNearMissCooldown() {}

export function playZoneAppear() { play('zoneAppear'); }
export function playAchievement() { play('achievement'); }

// Internal multiplier-max logic — manages its own state and cooldown
let multiplierMaxFired = false;
let lastMultiplierMaxBelowAt = 0;
const MULTIPLIER_MAX_COOLDOWN = 2000; // ms before it can fire again after dropping below max

export function playMultiplierMax(currentMultiplier) {
  const now = performance.now();
  const max = window.gameConfig?.comboMultiplierMax ?? 5.0;

  if (currentMultiplier >= max) {
    if (!multiplierMaxFired && (now - lastMultiplierMaxBelowAt > MULTIPLIER_MAX_COOLDOWN)) {
      play('multiplierMax');
      multiplierMaxFired = true;
    }
  } else {
    if (multiplierMaxFired) {
      lastMultiplierMaxBelowAt = now;
    }
    multiplierMaxFired = false;
  }
}
