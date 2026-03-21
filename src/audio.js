// Audio synthesis — all game sound effects via Web Audio API.
// Related: gameUpdate.js (death), bonuses.js (pickup), renderer.js (near miss), hud.js (score bank)
// Self-contained: delete this file and remove // AUDIO lines in callers to remove all audio.
// To remove: delete this file, remove import lines and call sites marked // AUDIO in callers.

const ctx = new (window.AudioContext || window.webkitAudioContext)();

// Resumes AudioContext on first user interaction (browser autoplay policy)
export function initAudio() {
  if (ctx.state === 'suspended') ctx.resume();
}

// Plays a tone: osc type, start freq, end freq, duration ms, gain
function tone(type, freqStart, freqEnd, duration, gain = 0.3) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration / 1000);
  amp.gain.setValueAtTime(gain, ctx.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration / 1000);
}

// Harsh descending buzz — death
export function playDeath() {
  tone('sawtooth', 320, 60, 400, 0.4);
}

// Short chime per bonus type
export function playBonus(type) {
  const freqs = {
    slowmo: [300, 220],
    invincibility: [520, 660],
    screenclear: [440, 880],
    shrink: [600, 480],
  };
  const [start, end] = freqs[type] ?? [440, 440];
  tone('sine', start, end, 180, 0.25);
}

// Quick high tick — near miss
export function playNearMiss() {
  tone('triangle', 900, 600, 80, 0.15);
}

// Bright blip — score bank
export function playScoreBank() {
  tone('sine', 440, 880, 120, 0.2);
}
