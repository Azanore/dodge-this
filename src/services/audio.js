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

const MUSIC_FADE_TIME = 0.3; // seconds
const MUSIC_DUCK_VOLUME = 0.2;

// User preferences — persisted in localStorage
export let sfxEnabled = localStorage.getItem('dodge_sfx') !== 'false';
export let musicEnabled = localStorage.getItem('dodge_music') !== 'false';
export let sfxVolume = parseFloat(localStorage.getItem('dodge_sfx_vol') ?? '1.0');
export let musicVolume = parseFloat(localStorage.getItem('dodge_music_vol') ?? '1.0');

// Toggles SFX on/off
export function setSfx(enabled) {
  sfxEnabled = enabled;
  localStorage.setItem('dodge_sfx', enabled);
  updateSfxVolume();
}

// Sets SFX volume (0.0 to 1.0)
export function setSfxVolume(vol) {
  sfxVolume = vol;
  localStorage.setItem('dodge_sfx_vol', vol);
  updateSfxVolume();
}

function updateSfxVolume() {
  if (!sfxGain || !audioCtx) return;
  const target = sfxEnabled ? sfxVolume : 0;
  sfxGain.gain.cancelScheduledValues(audioCtx.currentTime);
  sfxGain.gain.setTargetAtTime(target, audioCtx.currentTime, 0.05);
}

// Toggles music on/off — fades out if playing, does not start (callers handle that)
export function setMusic(enabled) {
  musicEnabled = enabled;
  localStorage.setItem('dodge_music', enabled);
  if (!enabled) {
    stopMusic(true);
  } else {
    updateMusicVolume();
  }
}

// Sets music volume (0.0 to 1.0)
export function setMusicVolume(vol) {
  musicVolume = vol;
  localStorage.setItem('dodge_music_vol', vol);
  updateMusicVolume();
}

function updateMusicVolume() {
  if (!musicGain || !audioCtx) return;
  const target = musicEnabled ? musicVolume : 0;
  musicGain.gain.cancelScheduledValues(audioCtx.currentTime);
  musicGain.gain.setTargetAtTime(target, audioCtx.currentTime, 0.1);
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
        sfxGain.gain.value = sfxEnabled ? sfxVolume : 0;
        sfxGain.connect(masterGain);

        musicGain = audioCtx.createGain();
        musicGain.gain.value = musicEnabled ? musicVolume : 0;
        musicGain.connect(masterGain);
      }

      await Promise.all(
        Object.entries(SOUNDS).map(async ([key, path]) => {
          if (buffers[key]) return;
          try {
            const res = await fetch(path);
            if (!res.ok) {
              console.warn(`Failed to fetch sound: ${path} (status: ${res.status})`);
              return;
            }
            const contentType = res.headers ? res.headers.get('content-type') : null;
            if (contentType && contentType.includes('text/html')) {
              console.warn(`Skipping sound: ${path} (returned HTML instead of audio)`);
              return;
            }
            const arr = await res.arrayBuffer();
            buffers[key] = await audioCtx.decodeAudioData(arr);
          } catch (err) {
            console.warn(`Failed to decode sound: ${path}`, err);
            // Non-blocking: we continue loading other sounds
          }
        })
      );
    } catch (err) {
      console.error('Audio context initialization failed:', err);
      loadingPromise = null; // Allow retry on failure
      // We don't re-throw here to allow the game to start even if audio fails
    }
  })();

  return loadingPromise;
}

// Resumes AudioContext if suspended — call on user interaction
export function resumeAudioContext() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Plays a one-shot sound by key
function play(key) {
  if (!sfxEnabled || !audioCtx || !buffers[key]) return;
  resumeAudioContext();

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

  // Ensure gain is reset to current user preference if we were ducked or faded
  musicGain.gain.cancelScheduledValues(audioCtx.currentTime);
  musicGain.gain.setValueAtTime(musicEnabled ? musicVolume : 0, audioCtx.currentTime);

  musicSource.start();
  musicStartedAt = audioCtx.currentTime;
  musicOffset = 0;
}

// Professional ducking: Lower music volume when paused
export function pauseMusic() {
  if (!musicSource || !musicGain) return;
  const now = audioCtx.currentTime;
  musicGain.gain.cancelScheduledValues(now);
  // Duck relative to the user's volume preference
  musicGain.gain.setTargetAtTime(musicVolume * MUSIC_DUCK_VOLUME, now, 0.1);
}

// Professional unducking: Restore music volume when resuming
export function resumeMusic() {
  if (!musicEnabled || !audioCtx || !buffers.music) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  // If music was stopped while paused (e.g. toggled off then on), restart it
  if (!musicSource) {
    startMusic();
    return;
  }

  const now = audioCtx.currentTime;
  musicGain.gain.cancelScheduledValues(now);
  // Restore to full user-defined volume
  musicGain.gain.setTargetAtTime(musicVolume, now, 0.1);
}

// Stops music with an optional fade
export function stopMusic(fadeOut = false) {
  if (musicFadeTimer) { clearTimeout(musicFadeTimer); musicFadeTimer = null; }

  if (!musicSource) return;

  if (fadeOut) {
    const now = audioCtx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setTargetAtTime(0, now, MUSIC_FADE_TIME / 3); // Fast fade

    musicFadeTimer = setTimeout(() => {
      musicFadeTimer = null;
      actuallyStopMusic();
    }, MUSIC_FADE_TIME * 1000);
  } else {
    actuallyStopMusic();
  }
}

// Internal helper to stop source and reset gain
function actuallyStopMusic() {
  if (musicSource) {
    try {
      musicSource.stop();
      musicSource.disconnect();
    } catch (e) {}
    musicSource = null;
  }
  if (musicGain) {
    musicGain.gain.cancelScheduledValues(audioCtx.currentTime);
    musicGain.gain.value = musicEnabled ? musicVolume : 0;
  }
  musicOffset = 0;
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
