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
  music: 'sounds/music.mp3',
};

const buffers = {};
let audioCtx = null;
let musicSource = null;
let musicGain = null;
let musicOffset = 0;
let musicStartedAt = 0;

const MUSIC_FADE_OUT = 0.3; // seconds

// User preferences — persisted in localStorage
export let sfxEnabled = localStorage.getItem('dodge_sfx') !== 'false';
export let musicEnabled = localStorage.getItem('dodge_music') !== 'false';

// Toggles SFX on/off
export function setSfx(enabled) {
  sfxEnabled = enabled;
  localStorage.setItem('dodge_sfx', enabled);
}

// Toggles music on/off — fades out if playing, does not start (callers handle that)
export function setMusic(enabled) {
  musicEnabled = enabled;
  localStorage.setItem('dodge_music', enabled);
  if (!enabled) fadeOutMusic();
}

// Initializes AudioContext and loads all buffers — call on first user gesture
export async function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  await Promise.all(
    Object.entries(SOUNDS).map(async ([key, path]) => {
      const res = await fetch(path);
      const arr = await res.arrayBuffer();
      buffers[key] = await audioCtx.decodeAudioData(arr);
    })
  );
}

// Plays a one-shot sound by key
function play(key) {
  if (!sfxEnabled || !audioCtx || !buffers[key]) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buffers[key];
  src.connect(audioCtx.destination);
  src.start();
}

// Starts music looping from the beginning, routed through a GainNode for fade control
export function startMusic() {
  if (!musicEnabled || !audioCtx || !buffers.music) return;
  stopMusic();
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 1;
  musicGain.connect(audioCtx.destination);
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
    musicSource = null;
  }
}

// Resumes from saved offset if enabled, otherwise no-op
export function resumeMusic() {
  if (!musicEnabled || !audioCtx || !buffers.music) return;
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 1;
  musicGain.connect(audioCtx.destination);
  musicSource = audioCtx.createBufferSource();
  musicSource.buffer = buffers.music;
  musicSource.loop = true;
  musicSource.connect(musicGain);
  musicSource.start(0, musicOffset);
  musicStartedAt = audioCtx.currentTime - musicOffset;
}

// Stops music entirely
export function stopMusic() {
  if (!musicSource) return;
  musicSource.stop();
  musicSource = null;
  musicGain = null;
  musicOffset = 0;
}

// Fades music out over MUSIC_FADE_OUT seconds then stops — used when toggling music off
function fadeOutMusic() {
  if (!musicSource || !musicGain) return;
  musicGain.gain.setValueAtTime(musicGain.gain.value, audioCtx.currentTime);
  musicGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + MUSIC_FADE_OUT);
  setTimeout(stopMusic, MUSIC_FADE_OUT * 1000);
}

export function playDeath() { play('death'); }
export function playPickup() { play('pickup'); }
export function playScoreBank() { play('scoreBank'); }
export function playGameStart() { play('gameStart'); }

// Global near-miss cooldown — prevents stacking when multiple obstacles are close simultaneously
let nearMissCooldown = 0;
const NEAR_MISS_GLOBAL_COOLDOWN = 300; // ms

export function playNearMiss() {
  if (nearMissCooldown > 0) return;
  play('nearMiss');
  nearMissCooldown = NEAR_MISS_GLOBAL_COOLDOWN;
}

// Ticks the near-miss cooldown — call each frame with delta
export function tickNearMissCooldown(delta) { nearMissCooldown = Math.max(0, nearMissCooldown - delta); }
export function playZoneAppear() { play('zoneAppear'); }

// Guards against re-firing while multiplier stays at max or briefly dips below
let multiplierMaxFired = false;
let multiplierMaxCooldown = 0;
const MULTIPLIER_MAX_COOLDOWN = 2000; // ms before it can fire again after dropping below max

export function playMultiplierMax(currentMultiplier, delta) {
  if (multiplierMaxCooldown > 0) multiplierMaxCooldown -= delta;
  if (currentMultiplier >= gameConfig.comboMultiplierMax) {
    if (!multiplierMaxFired && multiplierMaxCooldown <= 0) {
      play('multiplierMax');
      multiplierMaxFired = true;
    }
  } else {
    if (multiplierMaxFired) multiplierMaxCooldown = MULTIPLIER_MAX_COOLDOWN;
    multiplierMaxFired = false;
  }
}
