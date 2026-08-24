(() => {
  'use strict';

  const WIND_LEVEL = 0.012;

  let context = null;
  let windGain = null;
  let activationBound = false;
  let started = false;

  function muteLegacyAmbience() {
    const legacy = document.getElementById('avendor-music');
    if (!legacy) return;
    legacy.volume = 0;
    legacy.muted = true;
  }

  function makeWindBuffer(audioContext) {
    const seconds = 3;
    const length = Math.floor(audioContext.sampleRate * seconds);
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    let smoothed = 0;

    for (let index = 0; index < length; index += 1) {
      const white = (Math.random() * 2) - 1;
      smoothed = (smoothed * 0.965) + (white * 0.035);
      data[index] = smoothed;
    }

    return buffer;
  }

  function ensureWindGraph() {
    if (context) return true;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;

    context = new AudioContext();

    const source = context.createBufferSource();
    source.buffer = makeWindBuffer(context);
    source.loop = true;

    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 130;

    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 820;
    lowpass.Q.value = 0.35;

    windGain = context.createGain();
    windGain.gain.value = 0;

    const movement = context.createOscillator();
    movement.type = 'sine';
    movement.frequency.value = 0.085;

    const movementDepth = context.createGain();
    movementDepth.gain.value = WIND_LEVEL * 0.22;

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(windGain);
    windGain.connect(context.destination);

    movement.connect(movementDepth);
    movementDepth.connect(windGain.gain);

    source.start();
    movement.start();
    return true;
  }

  async function startWind() {
    if (started) return true;
    if (!ensureWindGraph()) return false;
    if (context.state === 'suspended') await context.resume();

    const now = context.currentTime;
    windGain.gain.cancelScheduledValues(now);
    windGain.gain.setValueAtTime(0, now);
    windGain.gain.linearRampToValueAtTime(WIND_LEVEL, now + 1.8);
    started = true;
    return true;
  }

  function unbindActivation() {
    if (!activationBound) return;
    activationBound = false;
    window.removeEventListener('keydown', activateFromGesture, true);
    window.removeEventListener('pointerdown', activateFromGesture, true);
  }

  function activateFromGesture() {
    void startWind()
      .then((didStart) => {
        if (didStart) unbindActivation();
      })
      .catch((error) => {
        console.warn('Could not start faint Briarwell wind.', error);
      });
  }

  function stopWind() {
    unbindActivation();
    if (!context || !windGain) return;
    const now = context.currentTime;
    windGain.gain.cancelScheduledValues(now);
    windGain.gain.setValueAtTime(windGain.gain.value, now);
    windGain.gain.linearRampToValueAtTime(0, now + 0.35);
  }

  muteLegacyAmbience();
  activationBound = true;
  window.addEventListener('keydown', activateFromGesture, true);
  window.addEventListener('pointerdown', activateFromGesture, true);
  window.addEventListener('pagehide', stopWind, { once: true });

  window.AvendorTownWind = Object.freeze({
    level: WIND_LEVEL,
    start: startWind,
    stop: stopWind
  });
})();
