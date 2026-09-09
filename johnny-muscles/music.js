(() => {
  'use strict';

  const BPM = 164;
  const STEP = 60 / BPM / 4;
  const LOOKAHEAD_MS = 25;
  const SCHEDULE_AHEAD = 0.12;
  const MASTER_LEVEL = 0.23;

  let ctx = null;
  let master = null;
  let compressor = null;
  let delay = null;
  let delayFeedback = null;
  let noiseBuffer = null;
  let timer = null;
  let nextStepTime = 0;
  let stepIndex = 0;
  let playing = false;
  let muted = false;

  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  const roots = [45, 48, 50, 40];
  const chordTones = [
    [57, 60, 64, 67],
    [60, 64, 67, 71],
    [62, 65, 69, 72],
    [64, 68, 71, 74]
  ];

  const leadPattern = [
    null, 72, null, 76, 79, null, 76, 74,
    null, 72, 69, null, 74, null, 67, null,
    72, null, 74, 76, null, 81, null, 79,
    76, null, 74, null, 72, 69, null, 67,
    null, 74, 77, null, 81, 77, null, 74,
    72, null, 69, 72, null, 76, 74, null,
    71, null, 76, 80, null, 83, 80, null,
    76, 74, null, 71, 68, null, 64, null
  ];

  function ensureAudio() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.18;
    delay = ctx.createDelay(0.5);
    delay.delayTime.value = STEP * 3;
    delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.22;
    delay.connect(delayFeedback).connect(delay);
    delay.connect(master);
    master.connect(compressor).connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  function connectWithOptionalDelay(node, send = 0) {
    node.connect(master);
    if (send > 0) {
      const sendGain = ctx.createGain();
      sendGain.gain.value = send;
      node.connect(sendGain).connect(delay);
    }
  }

  function synth(freq, time, duration, { type = 'square', volume = 0.05, detune = 0, filter = 2200, send = 0 } = {}) {
    const osc = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    osc.detune.setValueAtTime(detune, time);
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(filter, time);
    filt.Q.value = 2.2;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.45), time + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(filt).connect(gain);
    connectWithOptionalDelay(gain, send);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  function kick(time) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(132, time);
    osc.frequency.exponentialRampToValueAtTime(44, time + 0.105);
    gain.gain.setValueAtTime(0.22, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    osc.connect(gain).connect(master);
    osc.start(time);
    osc.stop(time + 0.18);
  }

  function noiseHit(time, duration, volume, highpass, bandpass = null) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = highpass;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    src.connect(hp);
    if (bandpass) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = bandpass;
      bp.Q.value = 0.8;
      hp.connect(bp).connect(gain);
    } else {
      hp.connect(gain);
    }
    gain.connect(master);
    src.start(time);
    src.stop(time + duration);
  }

  function snare(time) {
    noiseHit(time, 0.12, 0.075, 1200, 2400);
    synth(185, time, 0.08, { type: 'triangle', volume: 0.032, filter: 900 });
  }

  function hat(time, open = false) {
    noiseHit(time, open ? 0.10 : 0.035, open ? 0.026 : 0.018, 6500);
  }

  function bass(note, time, accent = false) {
    const freq = midi(note);
    synth(freq, time, STEP * 1.75, { type: 'square', volume: accent ? 0.075 : 0.055, filter: 720 });
    synth(freq * 0.5, time, STEP * 1.6, { type: 'sawtooth', volume: 0.025, filter: 430 });
  }

  function lead(note, time, accent = false) {
    const freq = midi(note);
    synth(freq, time, STEP * 1.45, { type: 'square', volume: accent ? 0.055 : 0.040, filter: 3100, send: 0.30 });
    synth(freq * 2, time, STEP * 0.75, { type: 'triangle', volume: 0.012, filter: 4200, send: 0.18 });
  }

  function arp(note, time) {
    synth(midi(note), time, STEP * 0.72, { type: 'triangle', volume: 0.018, filter: 2600, send: 0.16 });
  }

  function robotChirp(time, up = true) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    osc.type = 'square';
    filt.type = 'bandpass';
    filt.frequency.value = 1700;
    filt.Q.value = 5;
    const a = up ? 520 : 980;
    const b = up ? 1120 : 430;
    osc.frequency.setValueAtTime(a, time);
    osc.frequency.exponentialRampToValueAtTime(b, time + 0.07);
    gain.gain.setValueAtTime(0.026, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.085);
    osc.connect(filt).connect(gain);
    connectWithOptionalDelay(gain, 0.22);
    osc.start(time);
    osc.stop(time + 0.09);
  }

  function scheduleStep(step, time) {
    const local = step % 64;
    const bar = Math.floor(local / 16);
    const beatStep = local % 16;
    if (beatStep % 4 === 0) kick(time);
    if (beatStep === 4 || beatStep === 12) snare(time);
    if (beatStep % 2 === 0) hat(time, beatStep === 14);
    else if (bar >= 2 && beatStep % 4 === 3) hat(time, false);

    if ([0, 3, 6, 8, 11, 14].includes(beatStep)) {
      const root = roots[bar];
      const jumps = { 0: 0, 3: 0, 6: 7, 8: 0, 11: 12, 14: 7 };
      bass(root + jumps[beatStep], time, beatStep === 0 || beatStep === 8);
    }

    if (beatStep % 2 === 1) {
      const chord = chordTones[bar];
      const idx = ((beatStep - 1) / 2) % chord.length;
      arp(chord[idx], time);
    }

    const note = leadPattern[local];
    if (note != null) lead(note, time, beatStep === 0 || beatStep === 4 || beatStep === 8 || beatStep === 12);
    if (local === 15 || local === 47) robotChirp(time, true);
    if (local === 31 || local === 63) robotChirp(time, false);
  }

  function scheduler() {
    if (!ctx || !playing) return;
    while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD) {
      scheduleStep(stepIndex, nextStepTime);
      stepIndex = (stepIndex + 1) % 64;
      nextStepTime += STEP;
    }
  }

  function setMaster(target, seconds = 0.08) {
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now);
    master.gain.exponentialRampToValueAtTime(Math.max(0.0001, target), now + seconds);
  }

  async function startMusic() {
    ensureAudio();
    try { if (ctx.state === 'suspended') await ctx.resume(); } catch (_) {}
    if (!playing) {
      playing = true;
      stepIndex = 0;
      nextStepTime = ctx.currentTime + 0.06;
      timer = window.setInterval(scheduler, LOOKAHEAD_MS);
      scheduler();
    }
    setMaster(muted ? 0.0001 : MASTER_LEVEL, 0.12);
  }

  function toggleMute() {
    muted = !muted;
    if (ctx) setMaster(muted ? 0.0001 : MASTER_LEVEL, 0.06);
  }

  function softenMusic() {
    if (ctx && playing) setMaster(muted ? 0.0001 : MASTER_LEVEL * 0.42, 0.22);
  }

  function restoreMusic() {
    if (ctx && playing) setMaster(muted ? 0.0001 : MASTER_LEVEL, 0.12);
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
    try { ctx?.close(); } catch (_) {}
  }, { once: true });
})();