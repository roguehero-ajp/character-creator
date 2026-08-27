(() => {
  'use strict';

  const BPM = 76;
  const BEAT = 60 / BPM;
  const BAR = BEAT * 4;
  const SCHEDULE_AHEAD = 1.4;
  const SCHEDULER_MS = 240;
  const DEFAULT_VOLUME = 0.16;

  const NOTE_INDEX = Object.freeze({
    C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5,
    'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11
  });

  const HARMONY = Object.freeze([
    ['G3', 'B3', 'D4'], ['F#3', 'A3', 'D4'], ['E3', 'G3', 'B3'], ['C3', 'G3', 'E4'],
    ['B2', 'G3', 'D4'], ['A2', 'E3', 'C4'], ['D3', 'A3', 'F#4'], ['D3', 'A3', 'F#4'],
    ['G3', 'B3', 'D4'], ['B2', 'F#3', 'D4'], ['C3', 'G3', 'E4'], ['D3', 'G3', 'B3'],
    ['E3', 'B3', 'G4'], ['A2', 'E3', 'C4'], ['D3', 'A3', 'F#4'], ['G3', 'B3', 'D4'],
    ['C3', 'G3', 'E4'], ['B2', 'G3', 'D4'], ['A2', 'E3', 'C4'], ['D3', 'A3', 'F#4'],
    ['G3', 'B3', 'D4'], ['E3', 'G3', 'B3'], ['C3', 'G3', 'E4'], ['G3', 'B3', 'D4']
  ]);

  const MELODY = Object.freeze({
    4: [['B4', 1], ['D5', 1], ['G5', 1.5], ['F#5', .5]],
    5: [['E5', 1], ['D5', 1], ['C5', 1], ['A4', 1]],
    6: [['A4', .5], ['B4', .5], ['D5', 1], ['F#5', 1], ['E5', 1]],
    7: [['D5', 2], ['A4', 1], ['D5', 1]],
    8: [['B4', 1], ['D5', 1], ['G5', 1], ['A5', 1]],
    9: [['F#5', 1.5], ['E5', .5], ['D5', 1], ['B4', 1]],
    10: [['C5', 1], ['E5', 1], ['G5', 1], ['E5', 1]],
    11: [['D5', 2], ['B4', 1], ['A4', 1]],
    12: [['G4', 1], ['B4', 1], ['E5', 1], ['G5', 1]],
    13: [['E5', 1], ['C5', 1], ['B4', 1], ['A4', 1]],
    14: [['A4', .5], ['D5', .5], ['F#5', 1], ['A5', 1], ['F#5', 1]],
    15: [['G5', 2], ['D5', 1], ['B4', 1]],
    20: [['B4', 1], ['D5', 1], ['G5', 2]],
    21: [['G5', 1], ['E5', 1], ['B4', 2]],
    22: [['C5', 1], ['E5', 1], ['D5', 1], ['C5', 1]],
    23: [['B4', 1], ['A4', 1], ['G4', 2]]
  });

  const COUNTER = Object.freeze({
    8: [['G4', 1], ['A4', 1], ['B4', 2]],
    9: [['D5', 1], ['B4', 1], ['A4', 2]],
    10: [['G4', 1], ['C5', 1], ['B4', 1], ['G4', 1]],
    11: [['A4', 2], ['F#4', 1], ['A4', 1]],
    16: [['E4', 1], ['G4', 1], ['C5', 2]],
    17: [['B4', 1], ['D5', 1], ['B4', 2]],
    18: [['C5', 1], ['B4', 1], ['A4', 1], ['E4', 1]],
    19: [['F#4', 1], ['A4', 1], ['D5', 2]]
  });

  let context = null;
  let master = null;
  let dryBus = null;
  let wetBus = null;
  let convolver = null;
  let schedulerId = 0;
  let nextBar = 0;
  let nextBarAt = 0;
  let started = false;
  let requestedVolume = DEFAULT_VOLUME;

  function frequency(noteName) {
    const match = /^([A-G](?:#)?)(-?\d)$/.exec(noteName);
    if (!match) throw new Error(`Unknown town-music note: ${noteName}`);
    const midi = ((Number(match[2]) + 1) * 12) + NOTE_INDEX[match[1]];
    return 440 * (2 ** ((midi - 69) / 12));
  }

  function makeReverbImpulse(audioContext) {
    const seconds = 2.15;
    const length = Math.floor(audioContext.sampleRate * seconds);
    const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        const decay = (1 - (index / length)) ** 3.15;
        data[index] = ((Math.random() * 2) - 1) * decay * 0.38;
      }
    }
    return impulse;
  }

  function ensureAudioGraph() {
    if (context) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0;

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 3;
    compressor.attack.value = .03;
    compressor.release.value = .28;

    dryBus = context.createGain();
    dryBus.gain.value = .88;
    wetBus = context.createGain();
    wetBus.gain.value = .22;
    convolver = context.createConvolver();
    convolver.buffer = makeReverbImpulse(context);

    dryBus.connect(master);
    wetBus.connect(convolver);
    convolver.connect(master);
    master.connect(compressor);
    compressor.connect(context.destination);
  }

  function envelope(gainNode, start, duration, peak, attack, release) {
    const end = start + duration;
    const releaseStart = Math.max(start + attack, end - release);
    gainNode.gain.cancelScheduledValues(start);
    gainNode.gain.setValueAtTime(.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), start + attack);
    gainNode.gain.setValueAtTime(Math.max(.0002, peak * .88), releaseStart);
    gainNode.gain.exponentialRampToValueAtTime(.0001, end);
  }

  function connectVoice(source, filter, gain) {
    source.connect(filter);
    filter.connect(gain);
    gain.connect(dryBus);
    gain.connect(wetBus);
  }

  function scheduleString(note, start, duration, level = .05) {
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2050, start);
    filter.Q.value = .7;
    const gain = context.createGain();
    envelope(gain, start, duration, level, .22, .34);

    const fundamental = context.createOscillator();
    fundamental.type = 'triangle';
    fundamental.frequency.value = frequency(note);
    connectVoice(fundamental, filter, gain);

    const warmthGain = context.createGain();
    warmthGain.gain.value = .16;
    const warmth = context.createOscillator();
    warmth.type = 'sine';
    warmth.frequency.value = frequency(note) * 2;
    warmth.connect(warmthGain);
    warmthGain.connect(filter);

    fundamental.start(start);
    warmth.start(start);
    fundamental.stop(start + duration + .05);
    warmth.stop(start + duration + .05);
  }

  function scheduleCello(note, start, duration, level = .045) {
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 760;
    const gain = context.createGain();
    envelope(gain, start, duration, level, .12, .3);
    const osc = context.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = frequency(note) / 2;
    connectVoice(osc, filter, gain);
    osc.start(start);
    osc.stop(start + duration + .05);
  }

  function scheduleHarp(note, start, level = .04) {
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3600;
    const gain = context.createGain();
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, start + .46);
    const osc = context.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = frequency(note);
    connectVoice(osc, filter, gain);
    osc.start(start);
    osc.stop(start + .5);
  }

  function scheduleWoodwind(note, start, duration, level = .055, counter = false) {
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = counter ? 2350 : 3100;
    filter.Q.value = .9;
    const gain = context.createGain();
    envelope(gain, start, duration, level, .055, .14);

    const osc = context.createOscillator();
    osc.type = counter ? 'triangle' : 'sine';
    osc.frequency.value = frequency(note);

    const harmonicGain = context.createGain();
    harmonicGain.gain.value = counter ? .12 : .08;
    const harmonic = context.createOscillator();
    harmonic.type = 'triangle';
    harmonic.frequency.value = frequency(note) * (counter ? 3 : 2);
    harmonic.connect(harmonicGain);
    harmonicGain.connect(filter);

    const vibrato = context.createOscillator();
    const vibratoGain = context.createGain();
    vibrato.frequency.value = counter ? 4.3 : 5.0;
    vibratoGain.gain.value = counter ? 1.3 : 1.8;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.detune);

    connectVoice(osc, filter, gain);
    osc.start(start);
    harmonic.start(start);
    vibrato.start(start);
    osc.stop(start + duration + .04);
    harmonic.stop(start + duration + .04);
    vibrato.stop(start + duration + .04);
  }

  function schedulePhrase(sequence, start, voice, level) {
    if (!sequence) return;
    let cursor = start;
    for (const [note, beats] of sequence) {
      const duration = beats * BEAT;
      if (note) voice(note, cursor, duration * .91, level);
      cursor += duration;
    }
  }

  function scheduleBar(barIndex, start) {
    const chord = HARMONY[barIndex];
    const quiet = barIndex < 4 || barIndex >= 20;
    const stringLevel = quiet ? .033 : .043;

    chord.forEach((note, index) => {
      scheduleString(note, start + (index * .025), BAR * .98, stringLevel);
    });

    scheduleCello(chord[0], start, BEAT * 1.9, quiet ? .029 : .036);
    scheduleCello(chord[1], start + (BEAT * 2), BEAT * 1.9, quiet ? .025 : .032);

    const pattern = [0, 1, 2, 1, 0, 1, 2, 1];
    pattern.forEach((chordIndex, step) => {
      scheduleHarp(chord[chordIndex], start + (step * BEAT * .5), quiet ? .021 : .028);
    });

    schedulePhrase(MELODY[barIndex], start, scheduleWoodwind, quiet ? .041 : .052);
    if (COUNTER[barIndex]) {
      schedulePhrase(
        COUNTER[barIndex],
        start + .018,
        (note, when, duration, level) => scheduleWoodwind(note, when, duration, level, true),
        .032
      );
    }

    if (barIndex === 0) scheduleWoodwind('D5', start + (BEAT * .5), BEAT * .7, .024);
  }

  function pumpScheduler() {
    if (!started || !context) return;
    const horizon = context.currentTime + SCHEDULE_AHEAD;
    while (nextBarAt < horizon) {
      scheduleBar(nextBar, nextBarAt);
      nextBar = (nextBar + 1) % HARMONY.length;
      nextBarAt += BAR;
    }
  }

  async function start(options = {}) {
    requestedVolume = Number.isFinite(options.volume)
      ? Math.max(0, Math.min(1, options.volume))
      : requestedVolume;

    ensureAudioGraph();
    if (!context || !master) return false;
    if (context.state === 'suspended') await context.resume();

    if (!started) {
      started = true;
      nextBar = 0;
      nextBarAt = context.currentTime + .08;
      pumpScheduler();
      schedulerId = window.setInterval(pumpScheduler, SCHEDULER_MS);
    }

    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setValueAtTime(Math.max(.0001, master.gain.value), context.currentTime);
    master.gain.linearRampToValueAtTime(requestedVolume, context.currentTime + .85);
    return true;
  }

  function setVolume(volume) {
    requestedVolume = Math.max(0, Math.min(1, Number(volume) || 0));
    if (!context || !master) return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.linearRampToValueAtTime(requestedVolume, context.currentTime + .18);
  }

  function stop() {
    if (!context || !master) return;
    started = false;
    window.clearInterval(schedulerId);
    schedulerId = 0;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setValueAtTime(master.gain.value, context.currentTime);
    master.gain.linearRampToValueAtTime(0, context.currentTime + .45);
  }

  let activationBound = false;

  function unbindActivation() {
    if (!activationBound) return;
    activationBound = false;
    window.removeEventListener('keydown', activateFromGesture, true);
    window.removeEventListener('pointerdown', activateFromGesture, true);
  }

  function activateFromGesture() {
    void start({ volume: DEFAULT_VOLUME })
      .then((didStart) => {
        if (didStart) unbindActivation();
      })
      .catch((error) => {
        console.warn('Could not start Briarwell town music.', error);
      });
  }

  function bindTownAudio() {
    const wind = document.getElementById('avendor-music');
    if (wind) wind.volume = 0.045; // 25% of the previous 0.18 level.

    if (!activationBound) {
      activationBound = true;
      window.addEventListener('keydown', activateFromGesture, true);
      window.addEventListener('pointerdown', activateFromGesture, true);
    }
  }

  window.AvendorTownMusic = Object.freeze({
    title: 'Briarwell - Open Roads',
    bpm: BPM,
    key: 'G major',
    start,
    stop,
    setVolume
  });

  bindTownAudio();
  window.addEventListener('pagehide', stop, { once: true });
})();
