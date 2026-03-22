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
let musicPaused = false;
let musicOffset = 0;
let musicStartedAt = 0;

// User preferences — persisted in localStorage
export let sfxEnabled = localStorage.getItem('dodge_sfx') !== 'false';
export let musicEnabled = localStorage.getItem('dodge_music') !== 'false';

// Toggles — called from config panel, take effect immediately
export function setSfx(enabled) {
  sfxEnabled = enabled;
  localStorage.setItem('dodge_sfx', enabled);
}

export function setMusic(enabled) {
  musicEnabled = enabled;
  localStorage.setItem('dodge_music', enabled);
  if (!enabled) stopMusic();
  else if (audioCtx && !musicSource) startMusic();
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

// Starts music looping from the beginning
export function startMusic() {
  if (!musicEnabled || !audioCtx || !buffers.music) return;
  stopMusic();
  musicSource = audioCtx.createBufferSource();
  musicSource.buffer = buffers.music;
  musicSource.loop = true;
  musicSource.connect(audioCtx.destination);
  musicSource.start();
  musicStartedAt = audioCtx.currentTime;
  musicOffset = 0;
  musicPaused = false;
}

// Pauses music by stopping and recording offset
export function pauseMusic() {
  if (!musicSource || musicPaused) return;
  musicOffset = (audioCtx.currentTime - musicStartedAt) % buffers.music.duration;
  musicSource.stop();
  musicSource = null;
  musicPaused = true;
}

// Resumes music from where it paused
export function resumeMusic() {
  if (!audioCtx || !buffers.music || !musicPaused) return;
  musicSource = audioCtx.createBufferSource();
  musicSource.buffer = buffers.music;
  musicSource.loop = true;
  musicSource.connect(audioCtx.destination);
  musicSource.start(0, musicOffset);
  musicStartedAt = audioCtx.currentTime - musicOffset;
  musicPaused = false;
}

// Stops music entirely
export function stopMusic() {
  if (!musicSource) return;
  musicSource.stop();
  musicSource = null;
  musicPaused = false;
  musicOffset = 0;
}

export function playDeath() { play('death'); }
export function playPickup() { play('pickup'); }
export function playScoreBank() { play('scoreBank'); }
export function playGameStart() { play('gameStart'); }
export function playNearMiss() { play('nearMiss'); }
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
