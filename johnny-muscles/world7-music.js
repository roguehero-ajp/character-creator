(() => {
'use strict';

const BPM = 172;
const STEP = 60 / BPM / 4;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;
const MASTER_LEVEL = 0.22;

let ctx = null;
let master = null;
let compressor = null;
let delay = null;
let feedback = null;
let noiseBuffer = null;
let timer = null;
let nextStepTime = 0;
let stepIndex = 0;
let playing = false;
let muted = false;

const midi = n => 440 * Math.pow(2, (n - 69) / 12);

// Original World 7 progression and motifs. Inspired by classic SID-era space music,
// but intentionally not based on the melody or arrangement of any existing track.
const roots = [45, 50, 52, 48];
const chords = [
  [57, 60, 64, 69],
  [62, 65, 69, 74],
  [64, 68, 71, 76],
  [60, 64, 67, 72]
];

const leadPattern = [
  76,null,79,81,null,79,76,72, 74,null,76,79,null,83,81,null,
  79,76,null,72,74,null,76,69, 72,null,74,76,79,null,76,null,
  81,null,83,84,null,83,79,76, 77,null,81,79,null,76,74,null,
  72,74,null,76,69,72,null,74, 76,null,79,76,74,null,72,null
];

const sparklePattern = [84,88,91,88,86,89,93,89];

function ensureAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0;
  compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -19;
  compressor.knee.value = 14;
  compressor.ratio.value = 4.5;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.16;
  delay = ctx.createDelay(0.75);
  delay.delayTime.value = STEP * 3;
  feedback = ctx.createGain();
  feedback.gain.value = 0.29;
  delay.connect(feedback).connect(delay);
  delay.connect(master);
  master.connect(compressor).connect(ctx.destination);
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

function connect(node, send = 0) {
  node.connect(master);
  if (send > 0) {
    const g = ctx.createGain();
    g.gain.value = send;
    node.connect(g).connect(delay);
  }
}

function voice(note, time, duration, { type = 'square', volume = 0.04, filter = 2600, detune = 0, send = 0, attack = 0.005 } = {}) {
  const osc = ctx.createOscillator();
  const filt = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(midi(note), time);
  osc.detune.setValueAtTime(detune, time);
  filt.type = 'lowpass';
  filt.frequency.setValueAtTime(filter, time);
  filt.Q.value = 2.7;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(volume, time + attack);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.38), time + duration * 0.64);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(filt).connect(gain);
  connect(gain, send);
  osc.start(time);
  osc.stop(time + duration + 0.03);
}

function pulsePair(note, time, duration, volume, filter, send = 0) {
  voice(note, time, duration, { type: 'square', volume, filter, detune: -5, send });
  voice(note, time, duration * .94, { type: 'square', volume: volume * .62, filter: filter * 1.14, detune: 6, send: send * .7 });
}

function noiseHit(time, duration, volume, highpass) {
  const src = ctx.createBufferSource();
  const hp = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = noiseBuffer;
  hp.type = 'highpass';
  hp.frequency.value = highpass;
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  src.connect(hp).connect(gain).connect(master);
  src.start(time);
  src.stop(time + duration);
}

function kick(time) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(118, time);
  osc.frequency.exponentialRampToValueAtTime(43, time + .11);
  gain.gain.setValueAtTime(.16, time);
  gain.gain.exponentialRampToValueAtTime(.0001, time + .15);
  osc.connect(gain).connect(master);
  osc.start(time);
  osc.stop(time + .17);
}

function snare(time) {
  noiseHit(time, .105, .055, 1500);
  voice(54, time, .07, { type: 'triangle', volume: .025, filter: 800 });
}

function hat(time, open = false) {
  noiseHit(time, open ? .095 : .03, open ? .022 : .014, 6200);
}

function bass(note, time, accent = false) {
  pulsePair(note, time, STEP * 1.7, accent ? .065 : .048, 700, .04);
  voice(note - 12, time, STEP * 1.55, { type: 'triangle', volume: .026, filter: 430 });
}

function arp(note, time, accent = false) {
  pulsePair(note, time, STEP * .74, accent ? .028 : .020, 3300, .17);
}

function lead(note, time, accent = false) {
  pulsePair(note, time, STEP * 1.35, accent ? .052 : .038, 3900, .28);
  voice(note + 12, time, STEP * .55, { type: 'triangle', volume: .010, filter: 5000, send: .22 });
}

function sparkle(note, time) {
  voice(note, time, STEP * .55, { type: 'triangle', volume: .014, filter: 5600, send: .42 });
}

function sidSweep(time, upward = true) {
  const osc = ctx.createOscillator();
  const filt = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'square';
  filt.type = 'bandpass';
  filt.frequency.value = 1900;
  filt.Q.value = 5.5;
  const a = upward ? 340 : 1220;
  const b = upward ? 1320 : 310;
  osc.frequency.setValueAtTime(a, time);
  osc.frequency.exponentialRampToValueAtTime(b, time + .11);
  gain.gain.setValueAtTime(.023, time);
  gain.gain.exponentialRampToValueAtTime(.0001, time + .12);
  osc.connect(filt).connect(gain);
  connect(gain, .34);
  osc.start(time);
  osc.stop(time + .13);
}

function scheduleStep(step, time) {
  const local = step % 64;
  const bar = Math.floor(local / 16);
  const s = local % 16;
  if (s === 0 || s === 8) kick(time);
  if (s === 4 || s === 12) snare(time);
  if (s % 2 === 0) hat(time, s === 14);
  else if (bar >= 2 && (s === 7 || s === 15)) hat(time, false);
  const root = roots[bar];
  if ([0, 2, 6, 8, 10, 14].includes(s)) {
    const octave = (s === 6 || s === 14) ? 12 : (s === 10 ? 7 : 0);
    bass(root + octave, time, s === 0 || s === 8);
  }
  const chord = chords[bar];
  if (s % 2 === 1) {
    const index = Math.floor(s / 2) % chord.length;
    arp(chord[index], time, s === 1 || s === 9);
  }
  const note = leadPattern[local];
  if (note != null) lead(note, time, s === 0 || s === 4 || s === 8 || s === 12);
  if ((bar === 1 || bar === 3) && s % 4 === 3) {
    sparkle(sparklePattern[(bar * 4 + Math.floor(s / 4)) % sparklePattern.length], time);
  }
  if (local === 15 || local === 47) sidSweep(time, true);
  if (local === 31 || local === 63) sidSweep(time, false);
}

function scheduler() {
  if (!ctx || !playing) return;
  while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD) {
    scheduleStep(stepIndex, nextStepTime);
    stepIndex = (stepIndex + 1) % 64;
    nextStepTime += STEP;
  }
}

function setMaster(target, seconds = .08) {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(Math.max(.0001, master.gain.value), now);
  master.gain.exponentialRampToValueAtTime(Math.max(.0001, target), now + seconds);
}

async function startMusic() {
  ensureAudio();
  try { if (ctx.state === 'suspended') await ctx.resume(); } catch {}
  if (!playing) {
    playing = true;
    stepIndex = 0;
    nextStepTime = ctx.currentTime + .06;
    timer = window.setInterval(scheduler, LOOKAHEAD_MS);
    scheduler();
  }
  setMaster(muted ? .0001 : MASTER_LEVEL, .12);
}

function toggleMute() {
  muted = !muted;
  if (ctx) setMaster(muted ? .0001 : MASTER_LEVEL, .06);
}

function softenMusic() {
  if (ctx && playing) setMaster(muted ? .0001 : MASTER_LEVEL * .40, .20);
}

function restoreMusic() {
  if (ctx && playing) setMaster(muted ? .0001 : MASTER_LEVEL, .12);
}

const start = document.getElementById('start');
const restart = document.getElementById('restart');
const replay = document.getElementById('replay');
const mute = document.getElementById('mute');
const gameOver = document.getElementById('game-over');
const missionComplete = document.getElementById('mission-complete');

start?.addEventListener('click', startMusic);
restart?.addEventListener('click', () => { startMusic(); restoreMusic(); });
replay?.addEventListener('click', () => { startMusic(); restoreMusic(); });
mute?.addEventListener('click', toggleMute);

const observer = new MutationObserver(() => {
  const ending = gameOver?.classList.contains('visible') || missionComplete?.classList.contains('visible');
  if (ending) softenMusic();
  else restoreMusic();
});
if (gameOver) observer.observe(gameOver, { attributes: true, attributeFilter: ['class'] });
if (missionComplete) observer.observe(missionComplete, { attributes: true, attributeFilter: ['class'] });

window.addEventListener('pagehide', () => {
  if (timer) window.clearInterval(timer);
  timer = null;
  playing = false;
  try { ctx?.close(); } catch {}
}, { once: true });
})();