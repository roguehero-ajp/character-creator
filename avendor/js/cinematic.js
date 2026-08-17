(() => {
  'use strict';

  const IDLE_DELAY_MS = 10_000;
  const FADE_MS = 650;
  const TITLE_VOLUME = 0.42;
  const CINEMATIC_VOLUME = 0.42;
  const BARRENS_AMBIENCE_VOLUME = 0.12;
  const TITLE_LOOP_FALLBACK_MS = 79_000;
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

  const stage = document.getElementById('avendor-title-stage');
  const cinematic = document.getElementById('avendor-cinematic');
  const sceneArt = document.getElementById('cinematic-art');
  const cameraPan = document.getElementById('cinematic-pan');
  const cameraZoom = document.getElementById('cinematic-zoom');
  const starCanvas = document.getElementById('cinematic-stars');
  const subtitle = document.getElementById('cinematic-subtitle');
  const windLayer = document.getElementById('cinematic-wind');
  const snow = document.getElementById('cinematic-snow');
  const meteor = document.getElementById('cinematic-meteor');
  const transitionWind = document.getElementById('cinematic-transition-wind');
  const barrensFx = document.getElementById('cinematic-barrens-fx');
  const barrensGustCanvas = document.getElementById('cinematic-barrens-gusts');
  const button = document.getElementById('early-test');
  const introductionButton = document.getElementById('play-introduction');
  const titleMusic = document.getElementById('avendor-music');
  const cinematicMusic = document.getElementById('cinematic-music');
  const sceneOneWind = document.getElementById('scene-01-wind');
  const barrensAmbience = document.getElementById('scene-02-barrens-ambience');

  if (
    !stage ||
    !cinematic ||
    !sceneArt ||
    !cameraPan ||
    !cameraZoom ||
    !starCanvas ||
    !subtitle ||
    !windLayer ||
    !snow ||
    !meteor ||
    !transitionWind ||
    !barrensFx ||
    !barrensGustCanvas ||
    !button ||
    !introductionButton ||
    !titleMusic ||
    !cinematicMusic
  ) {
    return;
  }

  const starContext = starCanvas.getContext('2d');
  const barrensGustContext = barrensGustCanvas.getContext('2d');
  if (!starContext || !barrensGustContext) return;

  titleMusic.volume = TITLE_VOLUME;
  cinematicMusic.volume = 0.012;
  if (sceneOneWind) sceneOneWind.volume = 0;
  if (barrensAmbience) barrensAmbience.volume = 0;

  /*
   * Prototype 0.2.6 production lock.
   *
   * Scene 1 is now the template shot: camera pan, camera zoom, twinkles,
   * meteor, subtitle timing, environmental audio and transition effects are
   * independent systems. This lets later scenes become richer without
   * coupling artwork scale to typography or spawning overlapping timers.
   */
  const scenes = [
    {
      id: 'moons',
      duration: 15_000,
      image: 'assets/cinematic/scene-01-moons-master.png',
      snowClass: '',
      windClass: 'whisper',
      meteorAt: 4_050,
      transitionAt: 13_150,
      transitionDirection: 'south',
      subtitles: [
        {
          at: 1_450,
          until: 5_650,
          text: 'A breeze starts in the far North...'
        },
        {
          at: 6_250,
          until: 13_650,
          text:
            "...high in the Barrens, where there's nothing but cold, ice, rocks and snow."
        }
      ]
    },
    {
      id: 'barrens',
      duration: 12_000,
      image: 'assets/cinematic/scene-02-barrens-final.png',
      cameraClass: 'camera-barrens',
      snowClass: 'heavy',
      windClass: 'barrens',
      transitionAt: 10_050,
      transitionDirection: 'southeast',
      subtitles: [
        {
          at: 650,
          until: 11_300,
          text:
            'Even the secret and magical warm spots hidden within those deep mountain crags bow to the power of mother nature.'
        }
      ]
    },
    {
      id: 'bruntide',
      duration: 12_000,
      image: 'assets/cinematic/scene-03-bruntide-final.png',
      cameraClass: 'camera-bruntide',
      snowClass: 'light',
      windClass: 'bruntide',
      transitionAt: 10_000,
      transitionDirection: 'south',
      subtitles: [
        {
          at: 450,
          until: 5_450,
          text:
            'Over the snowy tundra and into Bruntide, with its stoic and strong men and women...'
        },
        {
          at: 5_650,
          until: 11_550,
          text:
            '...great warriors of the north, keeping the monsters at bay.'
        }
      ]
    },
    {
      id: 'numynor',
      duration: 12_000,
      image: 'assets/cinematic/scene-04-numynor.png',
      cameraClass: 'camera-numynor',
      snowClass: '',
      windClass: 'numynor',
      transitionAt: 10_050,
      transitionDirection: 'southwest',
      subtitles: [
        {
          at: 450,
          until: 5_250,
          text: 'Through the barbarian fiefdoms of Numynor...'
        },
        {
          at: 5_500,
          until: 11_500,
          text:
            '...full of its ramshackle huts and villages of people willing to fight for pennies, food, or fun...'
        }
      ]
    },
    {
      id: 'stouthome',
      duration: 12_000,
      image: 'assets/cinematic/scene-05-stouthome.png',
      cameraClass: 'camera-stouthome',
      snowClass: '',
      windClass: 'stouthome',
      transitionAt: 10_100,
      transitionDirection: 'east',
      subtitles: [
        {
          at: 450,
          until: 5_400,
          text:
            'Through the great mountains of Stouthome, where the dwarves run their kingdom...'
        },
        {
          at: 5_650,
          until: 11_450,
          text:
            '...guarding one of the entrances to the secret underworld below...'
        }
      ]
    },
    {
      id: 'theland-briarwell',
      duration: 12_000,
      image: 'assets/cinematic/scene-06-theland-briarwell.png',
      cameraClass: 'camera-theland',
      snowClass: 'light',
      windClass: 'theland',
      subtitles: [
        {
          at: 400,
          until: 5_500,
          text:
            'Toward the coastal lands of Theland... calmly tucked away from the strife and turmoil of the world.'
        },
        {
          at: 5_750,
          until: 11_650,
          text:
            'Hints of the cold come with the wind, as it brings the first few flakes of snow seen in many years. The signs of another great change hang in the air...'
        }
      ]
    }
  ];


  const transitionVectors = Object.freeze({
    west: {
      startX: '72%', startY: '-2%', midX: '-8%', midY: '1%', endX: '-72%', endY: '3%', rotate: '0deg', skew: '-8deg'
    },
    east: {
      startX: '-72%', startY: '-2%', midX: '8%', midY: '1%', endX: '72%', endY: '3%', rotate: '0deg', skew: '8deg'
    },
    south: {
      startX: '0%', startY: '-78%', midX: '0%', midY: '-2%', endX: '0%', endY: '82%', rotate: '90deg', skew: '0deg'
    },
    southeast: {
      startX: '-62%', startY: '-54%', midX: '2%', midY: '-3%', endX: '68%', endY: '58%', rotate: '42deg', skew: '0deg'
    },
    southwest: {
      startX: '62%', startY: '-54%', midX: '-2%', midY: '-3%', endX: '-68%', endY: '58%', rotate: '-42deg', skew: '0deg'
    }
  });


  /*
   * Prototype 0.3.4: preserve the dramatic final-100ms travel impulse, but
   * move the visible scene in the SAME direction as the journey. Although the
   * inverse motion is physically camera-correct, direct motion reads more
   * naturally for Avendor's stylized wind-driven world-map transitions.
   *
   * Individual `translate` / `scale` properties layer over the existing scene
   * transform animations instead of replacing them.
   */
  const cameraTravelVectors = Object.freeze({
    west:      { xVw: -15, yVh:   0 },
    east:      { xVw:  15, yVh:   0 },
    south:     { xVw:   0, yVh:  14 },
    southeast: { xVw:  12, yVh:  12 },
    southwest: { xVw: -12, yVh:  12 }
  });

  let cameraTravelAnimation = null;

  function cancelCameraTravel() {
    if (cameraTravelAnimation) {
      cameraTravelAnimation.cancel();
      cameraTravelAnimation = null;
    }
  }

  function runCameraTravel(direction) {
    if (REDUCED_MOTION.matches || typeof cameraPan.animate !== 'function') return;

    cancelCameraTravel();
    const vector = cameraTravelVectors[direction] || cameraTravelVectors.west;

    cameraTravelAnimation = cameraPan.animate(
      [
        { translate: '0vw 0vh', scale: '1', offset: 0 },
        { translate: `${vector.xVw * 0.18}vw ${vector.yVh * 0.18}vh`, scale: '1.03', offset: 0.18 },
        { translate: `${vector.xVw}vw ${vector.yVh}vh`, scale: '1.34', offset: 1 }
      ],
      {
        duration: 100,
        easing: 'cubic-bezier(.42,0,.92,.24)',
        fill: 'forwards'
      }
    );
  }

  function setTransitionDirection(direction) {
    const vector = transitionVectors[direction] || transitionVectors.west;
    transitionWind.style.setProperty('--wind-wipe-start-x', vector.startX);
    transitionWind.style.setProperty('--wind-wipe-start-y', vector.startY);
    transitionWind.style.setProperty('--wind-wipe-mid-x', vector.midX);
    transitionWind.style.setProperty('--wind-wipe-mid-y', vector.midY);
    transitionWind.style.setProperty('--wind-wipe-end-x', vector.endX);
    transitionWind.style.setProperty('--wind-wipe-end-y', vector.endY);
    transitionWind.style.setProperty('--wind-wipe-rotate', vector.rotate);
    transitionWind.style.setProperty('--wind-wipe-skew', vector.skew);
  }

  let idleTimer = null;
  let cinematicRunning = false;
  let sceneIndex = -1;
  let timers = [];
  let ignoreSkipUntil = 0;
  let subtitleGeneration = 0;
  let starAnimationFrame = 0;
  let musicFadeFrame = 0;
  let windFadeFrame = 0;
  let barrensAmbienceFrame = 0;
  let barrensGustFrame = 0;
  let bruntideFxFrame = 0;
  let bruntideFxActive = false;
  let starActive = false;
  let barrensGustActive = false;
  let replayGateTimer = null;
  let replayUnlocked = true;
  let lastTitleInteractionAt = performance.now();


  /*
   * Prototype 0.3.10 - Bruntide visual FX.
   *
   * Bruntide deliberately owns its own overlay. It does not reuse the Barrens
   * cave/glow canvas, so the two scenes cannot hide, reset, or reposition one
   * another. The overlay lives beside the scene artwork inside cameraZoom and
   * copies the artwork's live CSS transform each frame.
   */
  const bruntideFx = createBruntideFxLayer();

  function createBruntideFxLayer() {
    const root = document.createElement('div');
    root.id = 'cinematic-bruntide-fx';
    root.setAttribute('aria-hidden', 'true');
    Object.assign(root.style, {
      position: 'absolute',
      inset: '0',
      zIndex: '4',
      pointerEvents: 'none',
      opacity: '0',
      overflow: 'visible',
      willChange: 'transform, opacity',
      transformOrigin: '50% 50%'
    });

    const torchField = document.createElement('div');
    Object.assign(torchField.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      mixBlendMode: 'screen',
      opacity: '0'
    });

    const breath = document.createElement('div');
    Object.assign(breath.style, {
      position: 'absolute',
      pointerEvents: 'none',
      borderRadius: '999px',
      mixBlendMode: 'screen',
      filter: 'blur(4px)',
      opacity: '0',
      background:
        'radial-gradient(ellipse at 68% 48%, ' +
        'rgba(248,252,255,.96) 0%, ' +
        'rgba(224,237,249,.80) 24%, ' +
        'rgba(190,211,230,.44) 50%, ' +
        'rgba(160,187,210,.16) 66%, ' +
        'rgba(160,187,210,0) 78%)',
      willChange: 'left, top, width, height, opacity, transform'
    });

    const glint = document.createElement('div');
    Object.assign(glint.style, {
      position: 'absolute',
      width: '22px',
      height: '22px',
      marginLeft: '-11px',
      marginTop: '-11px',
      pointerEvents: 'none',
      mixBlendMode: 'screen',
      opacity: '0',
      borderRadius: '50%',
      background:
        'radial-gradient(circle, rgba(255,242,190,.98) 0%, rgba(255,196,92,.88) 22%, rgba(255,132,44,.24) 50%, rgba(255,132,44,0) 74%)',
      boxShadow: '0 0 12px rgba(255,186,94,.65)',
      willChange: 'opacity, transform'
    });

    root.append(torchField, breath, glint);
    cameraZoom.appendChild(root);

    return { root, torchField, breath, glint };
  }

  const bruntideTorchAnchors = [
    // Gate pair: deliberately strongest and easiest to read.
    { x: 43.7, y: 66.3, radius: 58, strength: 1.00, phase: 0.25 },
    { x: 46.3, y: 66.3, radius: 58, strength: 1.00, phase: 1.35 },

    // Upper walls / towers.
    { x: 40.1, y: 48.3, radius: 30, strength: 0.70, phase: 2.05 },
    { x: 42.5, y: 52.3, radius: 30, strength: 0.68, phase: 2.85 },
    { x: 48.4, y: 41.7, radius: 34, strength: 0.62, phase: 3.55 },
    { x: 83.8, y: 59.8, radius: 34, strength: 0.64, phase: 4.15 }
  ];

  function updateBruntideTransform() {
    const artStyle = window.getComputedStyle(sceneArt);
    bruntideFx.root.style.transform = artStyle.transform === 'none'
      ? 'none'
      : artStyle.transform;
    bruntideFx.root.style.transformOrigin = artStyle.transformOrigin || '50% 50%';
  }

  function updateBruntideTorches(time) {
    const layers = [];

    for (const torch of bruntideTorchAnchors) {
      const slow = Math.sin(time * 0.0034 + torch.phase);
      const quick = Math.sin(time * 0.0108 + torch.phase * 2.8);
      const jitter = Math.sin(time * 0.021 + torch.phase * 5.2);
      const pulse = Math.max(
        0.38,
        0.72 + slow * 0.18 + quick * 0.11 + jitter * 0.07
      ) * torch.strength;

      const r = torch.radius * (0.82 + pulse * 0.40);
      const core = Math.max(4, Math.round(r * 0.13));
      const warm = Math.max(core + 4, Math.round(r * 0.34));
      const halo = Math.max(warm + 5, Math.round(r * 0.70));

      layers.push(
        `radial-gradient(circle at ${torch.x}% ${torch.y}%, ` +
        `rgba(255,246,207,${Math.min(.98, .70 * pulse).toFixed(3)}) 0 ${core}px, ` +
        `rgba(255,202,115,${Math.min(.86, .55 * pulse).toFixed(3)}) ${core + 1}px ${warm}px, ` +
        `rgba(244,133,49,${Math.min(.56, .28 * pulse).toFixed(3)}) ${warm + 1}px ${halo}px, ` +
        `rgba(225,95,24,0) ${Math.round(r)}px)`
      );
    }

    bruntideFx.torchField.style.backgroundImage = layers.join(',');
    bruntideFx.torchField.style.opacity = '1';
  }

  function updateBruntideBreath(time) {
    // Roughly three clear exhales during the twelve-second Bruntide shot.
    const cycle = (time + 450) % 3650;
    const visibleFor = 1650;

    if (cycle >= visibleFor) {
      bruntideFx.breath.style.opacity = '0';
      return;
    }

    const p = cycle / visibleFor;
    const fadeIn = Math.min(1, p / 0.18);
    const fadeOut = Math.min(1, (1 - p) / 0.36);
    const alpha = Math.min(fadeIn, fadeOut) * 0.82;

    // Troll mouth in the approved scene-03-bruntide-final.png.
    const mouthX = 61.0;
    const mouthY = 51.4;

    const w = 6.0 + p * 10.5;
    const h = 3.2 + p * 5.4;

    // The troll faces toward the soldiers, so the vapour drifts left and rises.
    const left = mouthX - w * 0.82 - p * 4.2;
    const startDrop = 2.4 * (1 - p);
    const top = mouthY - h * 0.46 - p * 1.7 + startDrop;

    Object.assign(bruntideFx.breath.style, {
      left: `${left}%`,
      top: `${top}%`,
      width: `${w}%`,
      height: `${h}%`,
      opacity: `${alpha}`,
      transform: `skewX(10deg) scale(${0.88 + p * 0.38}, ${0.86 + p * 0.26})`
    });
  }

  function updateBruntideGlint(time) {
    const cycle = (time + 900) % 4100;
    const p = cycle / 4100;
    const spike = Math.max(0, 1 - Math.abs(p - 0.50) / 0.032);

    if (spike <= 0) {
      bruntideFx.glint.style.opacity = '0';
      return;
    }

    bruntideFx.glint.style.left = '55.8%';
    bruntideFx.glint.style.top = '78.7%';
    bruntideFx.glint.style.opacity = `${spike * .90}`;
    bruntideFx.glint.style.transform = `scale(${0.55 + spike * 0.85}) rotate(45deg)`;
  }

  function drawBruntideFx(time) {
    if (!bruntideFxActive || !cinematicRunning || sceneIndex !== 2) return;

    updateBruntideTransform();
    updateBruntideTorches(time);
    updateBruntideBreath(time);
    updateBruntideGlint(time);

    bruntideFxFrame = requestAnimationFrame(drawBruntideFx);
  }

  function startBruntideEffects() {
    stopBruntideEffects();

    bruntideFxActive = true;
    bruntideFx.root.style.opacity = '1';

    // Run once synchronously so Scene 3 cannot display a dead first frame.
    drawBruntideFx(performance.now());
  }

  function stopBruntideEffects() {
    bruntideFxActive = false;
    bruntideFxFrame = cancelFrame(bruntideFxFrame);
    bruntideFx.root.style.opacity = '0';
    bruntideFx.root.style.transform = 'none';
    bruntideFx.torchField.style.opacity = '0';
    bruntideFx.torchField.style.backgroundImage = 'none';
    bruntideFx.breath.style.opacity = '0';
    bruntideFx.glint.style.opacity = '0';
  }

  const twinkleStars = createTwinkleStars(44);

  function createTwinkleStars(count) {
    let seed = 0x4a56454e;

    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const stars = [];
    while (stars.length < count) {
      const x = 0.035 + random() * 0.93;
      const y = 0.035 + random() * 0.52;

      // Leave the moon faces clean. The twinkles belong to the sky behind them.
      if (x > 0.64 && x < 0.89 && y > 0.07 && y < 0.34) continue;

      stars.push({
        x,
        y,
        phase: random() * Math.PI * 2,
        speed: 0.00045 + random() * 0.00055,
        size: 0.55 + random() * 1.15,
        strength: 0.24 + random() * 0.34
      });
    }

    return stars;
  }

  function rememberTimer(timer) {
    timers.push(timer);
    return timer;
  }

  function clearTimers() {
    for (const timer of timers) {
      window.clearTimeout(timer);
    }
    timers = [];
  }

  function cancelFrame(id) {
    if (id) window.cancelAnimationFrame(id);
    return 0;
  }

  function resetIdleTimer() {
    if (cinematicRunning || !replayUnlocked) return;

    window.clearTimeout(idleTimer);
    const idleFor = Math.max(0, performance.now() - lastTitleInteractionAt);
    const remaining = Math.max(0, IDLE_DELAY_MS - idleFor);
    idleTimer = window.setTimeout(startCinematic, remaining);
  }

  function markTitleInteraction() {
    lastTitleInteractionAt = performance.now();
    if (!cinematicRunning && replayUnlocked) resetIdleTimer();
  }

  function clearReplayGate() {
    window.clearTimeout(replayGateTimer);
    replayGateTimer = null;
  }

  function titleLoopDurationMs() {
    const seconds = Number(titleMusic.duration);
    if (Number.isFinite(seconds) && seconds > 20) {
      return Math.ceil(seconds * 1000);
    }
    return TITLE_LOOP_FALLBACK_MS;
  }

  function beginFullTitleLoopGate() {
    clearReplayGate();
    replayUnlocked = false;
    window.clearTimeout(idleTimer);

    // Restart Bruckner from the beginning so the player receives one complete
    // title-screen statement before the cinematic is eligible to return.
    try {
      titleMusic.currentTime = 0;
    } catch (_) {}
    resumeTitleMusic();

    const armGate = () => {
      clearReplayGate();
      replayGateTimer = window.setTimeout(() => {
        replayGateTimer = null;
        replayUnlocked = true;
        resetIdleTimer();
      }, titleLoopDurationMs());
    };

    if (titleMusic.readyState >= 1) {
      armGate();
    } else {
      titleMusic.addEventListener('loadedmetadata', armGate, { once: true });
      replayGateTimer = window.setTimeout(() => {
        replayGateTimer = null;
        replayUnlocked = true;
        resetIdleTimer();
      }, TITLE_LOOP_FALLBACK_MS);
    }
  }

  function pauseTitleMusic() {
    titleMusic.pause();
  }

  function resumeTitleMusic() {
    if (sessionStorage.getItem('avendorMusicWanted') !== '1') return;

    titleMusic.volume = TITLE_VOLUME;
    const started = titleMusic.play();
    if (started?.catch) started.catch(() => {});
  }

  function ensureTitleMusic() {
    sessionStorage.setItem('avendorMusicWanted', '1');
    resumeTitleMusic();
  }

  function startCinematicMusic() {
    musicFadeFrame = cancelFrame(musicFadeFrame);
    cinematicMusic.currentTime = 0;
    cinematicMusic.volume = 0.012;

    const started = cinematicMusic.play();
    if (started?.catch) started.catch(() => {});

    const beganAt = performance.now();
    const fadeDuration = 4_400;

    const fadeIn = (now) => {
      if (!cinematicRunning) return;

      const progress = Math.min(1, (now - beganAt) / fadeDuration);
      const eased = progress * progress * (3 - 2 * progress);
      cinematicMusic.volume = 0.012 + (CINEMATIC_VOLUME - 0.012) * eased;

      if (progress < 1) {
        musicFadeFrame = requestAnimationFrame(fadeIn);
      } else {
        musicFadeFrame = 0;
      }
    };

    musicFadeFrame = requestAnimationFrame(fadeIn);
  }

  function stopCinematicMusic() {
    musicFadeFrame = cancelFrame(musicFadeFrame);
    cinematicMusic.pause();
    cinematicMusic.currentTime = 0;
    cinematicMusic.volume = 0.012;
  }

  function startSceneOneWind() {
    if (!sceneOneWind) return;
    windFadeFrame = cancelFrame(windFadeFrame);
    sceneOneWind.currentTime = 0;
    sceneOneWind.volume = 0.014;

    const started = sceneOneWind.play();
    if (started?.catch) started.catch(() => {});

    const beganAt = performance.now();
    const duration = 15_000;

    const swell = (now) => {
      if (!cinematicRunning || sceneIndex !== 0) return;

      const elapsed = Math.max(0, now - beganAt);
      let target;

      if (elapsed < 10_800) {
        target = 0.014 + (elapsed / 10_800) * 0.070;
      } else {
        const finalPush = Math.min(1, (elapsed - 10_800) / (duration - 10_800));
        target = 0.084 + finalPush * 0.172;
      }

      sceneOneWind.volume = Math.min(0.256, target);
      windFadeFrame = requestAnimationFrame(swell);
    };

    windFadeFrame = requestAnimationFrame(swell);
  }

  function fadeOutSceneOneWind(duration = 1_200) {
    if (!sceneOneWind) return;
    windFadeFrame = cancelFrame(windFadeFrame);

    if (sceneOneWind.paused) return;

    const from = sceneOneWind.volume;
    const beganAt = performance.now();

    const fade = (now) => {
      if (!cinematicRunning) return;

      const progress = Math.min(1, (now - beganAt) / duration);
      sceneOneWind.volume = Math.max(0, from * (1 - progress));

      if (progress < 1) {
        windFadeFrame = requestAnimationFrame(fade);
      } else {
        sceneOneWind.pause();
        sceneOneWind.currentTime = 0;
        sceneOneWind.volume = 0;
        windFadeFrame = 0;
      }
    };

    windFadeFrame = requestAnimationFrame(fade);
  }

  function stopSceneOneWind() {
    if (!sceneOneWind) return;
    windFadeFrame = cancelFrame(windFadeFrame);
    sceneOneWind.pause();
    sceneOneWind.currentTime = 0;
    sceneOneWind.volume = 0;
  }

  function startBarrensAmbience() {
    if (!barrensAmbience) return;
    barrensAmbienceFrame = cancelFrame(barrensAmbienceFrame);
    barrensAmbience.currentTime = 0;
    barrensAmbience.volume = 0.0064;

    const started = barrensAmbience.play();
    if (started?.catch) started.catch(() => {});

    const beganAt = performance.now();
    const fadeInDuration = 1_700;
    const swellEnd = 9_300;

    const swell = (now) => {
      if (!cinematicRunning || sceneIndex !== 1) return;

      const elapsed = Math.max(0, now - beganAt);
      let target;

      if (elapsed < fadeInDuration) {
        const progress = Math.min(1, elapsed / fadeInDuration);
        const eased = progress * progress * (3 - 2 * progress);
        target = 0.0064 + (BARRENS_AMBIENCE_VOLUME * 0.82 - 0.0064) * eased;
      } else {
        const progress = Math.min(1, (elapsed - fadeInDuration) / (swellEnd - fadeInDuration));
        target = BARRENS_AMBIENCE_VOLUME * (0.82 + progress * 0.18);
      }

      barrensAmbience.volume = Math.min(BARRENS_AMBIENCE_VOLUME, target);
      barrensAmbienceFrame = requestAnimationFrame(swell);
    };

    barrensAmbienceFrame = requestAnimationFrame(swell);
  }

  function fadeOutBarrensAmbience(duration = 1_650) {
    if (!barrensAmbience) return;
    barrensAmbienceFrame = cancelFrame(barrensAmbienceFrame);
    if (barrensAmbience.paused) return;

    const from = barrensAmbience.volume;
    const beganAt = performance.now();

    const fade = (now) => {
      if (!cinematicRunning) return;

      const progress = Math.min(1, (now - beganAt) / duration);
      const eased = progress * progress * (3 - 2 * progress);
      barrensAmbience.volume = Math.max(0, from * (1 - eased));

      if (progress < 1) {
        barrensAmbienceFrame = requestAnimationFrame(fade);
      } else {
        barrensAmbience.pause();
        barrensAmbience.currentTime = 0;
        barrensAmbience.volume = 0;
        barrensAmbienceFrame = 0;
      }
    };

    barrensAmbienceFrame = requestAnimationFrame(fade);
  }

  function stopBarrensAmbience() {
    if (!barrensAmbience) return;
    barrensAmbienceFrame = cancelFrame(barrensAmbienceFrame);
    barrensAmbience.pause();
    barrensAmbience.currentTime = 0;
    barrensAmbience.volume = 0;
  }

  function resizeStarCanvas() {
    const width = Math.max(1, cinematic.clientWidth);
    const height = Math.max(1, cinematic.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    starCanvas.width = Math.floor(width * ratio);
    starCanvas.height = Math.floor(height * ratio);
    starCanvas.style.width = `${width}px`;
    starCanvas.style.height = `${height}px`;
    starContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function drawTwinkles(time) {
    if (!starActive || !cinematicRunning) return;

    const width = cinematic.clientWidth;
    const height = cinematic.clientHeight;
    starContext.clearRect(0, 0, width, height);

    for (const star of twinkleStars) {
      const wave = Math.sin(time * star.speed + star.phase);
      const pulse = Math.max(0, (wave - 0.64) / 0.36);
      if (pulse <= 0) continue;

      const x = star.x * width;
      const y = star.y * height;
      const alpha = pulse * star.strength;
      const radius = star.size * (0.8 + pulse * 0.8);

      starContext.beginPath();
      starContext.fillStyle = `rgba(235,244,255,${alpha})`;
      starContext.arc(x, y, radius, 0, Math.PI * 2);
      starContext.fill();

      if (pulse > 0.55 && star.size > 1) {
        starContext.strokeStyle = `rgba(211,229,255,${alpha * 0.55})`;
        starContext.lineWidth = 0.65;
        starContext.beginPath();
        starContext.moveTo(x - radius * 3.2, y);
        starContext.lineTo(x + radius * 3.2, y);
        starContext.moveTo(x, y - radius * 3.2);
        starContext.lineTo(x, y + radius * 3.2);
        starContext.stroke();
      }
    }

    starAnimationFrame = requestAnimationFrame(drawTwinkles);
  }

  function startStarTwinkle() {
    stopStarTwinkle();
    if (REDUCED_MOTION.matches) return;

    resizeStarCanvas();
    starCanvas.classList.add('active');
    starActive = true;
    starAnimationFrame = requestAnimationFrame(drawTwinkles);
  }

  function stopStarTwinkle() {
    starActive = false;
    starAnimationFrame = cancelFrame(starAnimationFrame);
    starCanvas.classList.remove('active');
    starContext.clearRect(0, 0, cinematic.clientWidth, cinematic.clientHeight);
  }

  const barrensGusts = [
    { y: .18, period: 3300, offset: 130, length: .20, bend: -8, strength: .32, width: 1.05 },
    { y: .29, period: 4700, offset: 1700, length: .15, bend: 10, strength: .22, width: .8 },
    { y: .42, period: 3900, offset: 820, length: .24, bend: -12, strength: .28, width: 1.25 },
    { y: .55, period: 5200, offset: 3100, length: .18, bend: 7, strength: .18, width: .75 },
    { y: .68, period: 3600, offset: 2200, length: .22, bend: -6, strength: .27, width: 1.1 },
    { y: .77, period: 4400, offset: 600, length: .16, bend: 9, strength: .20, width: .85 }
  ];

  function resizeBarrensGustCanvas() {
    const width = Math.max(1, cinematic.clientWidth);
    const height = Math.max(1, cinematic.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    barrensGustCanvas.width = Math.floor(width * ratio);
    barrensGustCanvas.height = Math.floor(height * ratio);
    barrensGustCanvas.style.width = `${width}px`;
    barrensGustCanvas.style.height = `${height}px`;
    barrensGustContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function drawBarrensGusts(time) {
    if (!barrensGustActive || !cinematicRunning || sceneIndex !== 1) return;

    const width = cinematic.clientWidth;
    const height = cinematic.clientHeight;
    barrensGustContext.clearRect(0, 0, width, height);
    barrensGustContext.lineCap = 'round';

    for (const gust of barrensGusts) {
      const progress = ((time + gust.offset) % gust.period) / gust.period;
      const x = width * (1.16 - progress * 1.52);
      const y = height * gust.y;
      const length = width * gust.length;
      const visibility = Math.sin(Math.PI * progress);
      const alpha = Math.max(0, visibility * visibility * gust.strength);

      if (alpha < .01) continue;

      const gradient = barrensGustContext.createLinearGradient(x, y, x + length, y);
      gradient.addColorStop(0, `rgba(235,246,255,0)`);
      gradient.addColorStop(.30, `rgba(235,246,255,${alpha * .55})`);
      gradient.addColorStop(.68, `rgba(245,250,255,${alpha})`);
      gradient.addColorStop(1, `rgba(235,246,255,0)`);

      barrensGustContext.strokeStyle = gradient;
      barrensGustContext.lineWidth = gust.width;
      barrensGustContext.beginPath();
      barrensGustContext.moveTo(x, y);
      barrensGustContext.bezierCurveTo(
        x + length * .28,
        y + gust.bend,
        x + length * .62,
        y - gust.bend * .65,
        x + length,
        y + gust.bend * .18
      );
      barrensGustContext.stroke();

      barrensGustContext.strokeStyle = `rgba(220,237,250,${alpha * .32})`;
      barrensGustContext.lineWidth = Math.max(.45, gust.width * .55);
      barrensGustContext.beginPath();
      barrensGustContext.moveTo(x + length * .08, y + 5);
      barrensGustContext.bezierCurveTo(
        x + length * .34,
        y + gust.bend * .55 + 6,
        x + length * .70,
        y - gust.bend * .32 + 3,
        x + length * .92,
        y + 5
      );
      barrensGustContext.stroke();
    }

    barrensGustFrame = requestAnimationFrame(drawBarrensGusts);
  }

  function startBarrensEffects() {
    stopBarrensEffects();
    barrensFx.classList.add('active', 'camera-barrens');
    if (REDUCED_MOTION.matches) return;

    resizeBarrensGustCanvas();
    barrensGustCanvas.classList.add('active');
    barrensGustActive = true;
    barrensGustFrame = requestAnimationFrame(drawBarrensGusts);
  }

  function stopBarrensEffects() {
    barrensGustActive = false;
    barrensGustFrame = cancelFrame(barrensGustFrame);
    barrensGustCanvas.classList.remove('active');
    barrensFx.className = 'cinematic-barrens-fx';
    barrensGustContext.clearRect(0, 0, cinematic.clientWidth, cinematic.clientHeight);
  }

  function hideSubtitle() {
    subtitleGeneration += 1;
    subtitle.classList.remove('show');

    window.setTimeout(() => {
      if (!subtitle.classList.contains('show')) {
        subtitle.textContent = '';
      }
    }, 260);
  }

  function showSubtitle(text) {
    subtitleGeneration += 1;
    const generation = subtitleGeneration;

    subtitle.classList.remove('show');
    subtitle.textContent = text;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cinematicRunning && generation === subtitleGeneration) {
          subtitle.classList.add('show');
        }
      });
    });
  }

  function scheduleSubtitle(cue) {
    rememberTimer(
      window.setTimeout(() => {
        if (cinematicRunning) showSubtitle(cue.text);
      }, cue.at)
    );

    rememberTimer(
      window.setTimeout(() => {
        if (cinematicRunning) hideSubtitle();
      }, cue.until)
    );
  }

  function resetSceneLayers(scene) {
    cancelCameraTravel();
    sceneArt.className = 'cinematic-art';
    cameraPan.className = 'cinematic-pan';
    cameraZoom.className = 'cinematic-zoom';
    snow.className = 'cinematic-snow';
    windLayer.className = 'cinematic-wind';
    meteor.classList.remove('run');
    stopBarrensEffects();
    stopBruntideEffects();

    if (scene.snowClass) snow.classList.add(scene.snowClass);
    if (scene.windClass) windLayer.classList.add(scene.windClass);

    if (scene.id !== 'moons') stopStarTwinkle();
  }

  function runMeteor() {
    meteor.classList.remove('run');
    void meteor.offsetWidth;
    meteor.classList.add('run');
  }

  function runWindTransition(direction = 'west') {
    setTransitionDirection(direction);
    transitionWind.classList.remove('run');
    void transitionWind.offsetWidth;
    transitionWind.classList.add('run');
    cinematic.classList.add('wind-transitioning');
  }

  function settleWindTransition() {
    if (!transitionWind.classList.contains('run')) return;

    rememberTimer(
      window.setTimeout(() => {
        transitionWind.classList.remove('run');
        cinematic.classList.remove('wind-transitioning');
      }, 900)
    );
  }

  function showScene(scene) {
    clearTimers();
    hideSubtitle();
    resetSceneLayers(scene);

    sceneArt.alt = '';
    sceneArt.src = scene.image;

    const reveal = () => {
      if (!cinematicRunning) return;

      if (scene.id === 'moons') {
        sceneArt.className = 'cinematic-art scene-visible';
        cameraPan.className = 'cinematic-pan camera-moons-pan';
        cameraZoom.className = 'cinematic-zoom camera-moons-zoom';
        startStarTwinkle();
        startSceneOneWind();
      } else {
        sceneArt.className = `cinematic-art scene-visible ${scene.cameraClass || ''}`.trim();

        if (scene.id === 'barrens') {
          fadeOutSceneOneWind(1_350);
          startBarrensEffects();
          startBarrensAmbience();
          rememberTimer(window.setTimeout(() => {
            if (cinematicRunning && sceneIndex === 1) {
              fadeOutBarrensAmbience(1_650);
            }
          }, 9_850));
        } else {
          stopBarrensAmbience();
        }

        if (scene.id === 'bruntide') {
          startBruntideEffects();
        }

        // Every regional cut may arrive through the same wind veil. Clear the
        // previous wipe shortly after the new scene appears so it can be
        // reused cleanly on the next transition.
        settleWindTransition();
      }

      for (const cue of scene.subtitles) scheduleSubtitle(cue);

      if (Number.isFinite(scene.meteorAt)) {
        rememberTimer(window.setTimeout(() => {
          if (cinematicRunning) runMeteor();
        }, scene.meteorAt));
      }

      if (Number.isFinite(scene.transitionAt)) {
        rememberTimer(window.setTimeout(() => {
          if (cinematicRunning) runWindTransition(scene.transitionDirection);
        }, scene.transitionAt));
      }

      if (scene.transitionDirection) {
        rememberTimer(window.setTimeout(() => {
          if (cinematicRunning) runCameraTravel(scene.transitionDirection);
        }, Math.max(0, scene.duration - 100)));
      }

      rememberTimer(window.setTimeout(nextScene, scene.duration));
    };

    if (sceneArt.complete) {
      reveal();
    } else {
      sceneArt.addEventListener('load', reveal, { once: true });
      sceneArt.addEventListener('error', reveal, { once: true });
    }
  }

  function nextScene() {
    if (!cinematicRunning) return;

    sceneIndex += 1;

    if (sceneIndex >= scenes.length) {
      finishCinematic();
      return;
    }

    showScene(scenes[sceneIndex]);
  }

  function startCinematic() {
    if (cinematicRunning) return;

    cinematicRunning = true;
    sceneIndex = -1;
    ignoreSkipUntil = performance.now() + 800;

    window.clearTimeout(idleTimer);
    clearReplayGate();
    clearTimers();

    stage.classList.add('cinematic-running');
    cinematic.classList.add('active');
    cinematic.setAttribute('aria-hidden', 'false');

    pauseTitleMusic();
    startCinematicMusic();
    nextScene();
  }

  function finishCinematic() {
    if (!cinematicRunning) return;

    cinematicRunning = false;
    clearTimers();
    hideSubtitle();
    stopCinematicMusic();
    stopSceneOneWind();
    stopBarrensAmbience();
    stopStarTwinkle();
    stopBarrensEffects();
    stopBruntideEffects();
    cancelCameraTravel();

    sceneArt.className = 'cinematic-art';
    cameraPan.className = 'cinematic-pan';
    cameraZoom.className = 'cinematic-zoom';
    snow.className = 'cinematic-snow';
    windLayer.className = 'cinematic-wind';
    meteor.classList.remove('run');
    setTransitionDirection('west');
    transitionWind.classList.remove('run');
    cinematic.classList.remove('wind-transitioning');

    cinematic.classList.remove('active');
    cinematic.setAttribute('aria-hidden', 'true');

    window.setTimeout(() => {
      stage.classList.remove('cinematic-running');
      lastTitleInteractionAt = performance.now();
      beginFullTitleLoopGate();
    }, FADE_MS);
  }

  function skipCinematic(event) {
    if (!cinematicRunning || performance.now() < ignoreSkipUntil) return;

    if (event?.cancelable) event.preventDefault();
    finishCinematic();
  }

  function startIntroductionPreview() {
    // Manual test control: deliberately bypasses the automatic replay gate.
    // A real click also gives the browser a trusted gesture for audio playback.
    sessionStorage.setItem('avendorMusicWanted', '1');
    window.clearTimeout(idleTimer);
    clearReplayGate();
    startCinematic();
  }

  function startEarlyTest() {
    window.clearTimeout(idleTimer);
    ensureTitleMusic();

    document.body.style.transition = 'filter .25s ease, opacity .25s ease';
    document.body.style.filter = 'brightness(.45)';
    document.body.style.opacity = '.75';

    window.setTimeout(() => {
      window.location.href = 'walk-test.html';
    }, 260);
  }

  button.addEventListener('click', startEarlyTest);
  introductionButton.addEventListener('click', startIntroductionPreview);

  // Pointer movement keeps the title awake, but does not accidentally skip
  // a cinematic. Actual click/touch/key interaction remains the skip gesture.
  window.addEventListener('mousemove', () => {
    if (!cinematicRunning) markTitleInteraction();
  }, { passive: true });

  window.addEventListener('mousedown', (event) => {
    if (cinematicRunning) {
      skipCinematic(event);
    } else {
      markTitleInteraction();
    }
  });

  window.addEventListener('touchstart', (event) => {
    if (cinematicRunning) {
      skipCinematic(event);
    } else {
      markTitleInteraction();
    }
  }, { passive: false });

  window.addEventListener('keydown', (event) => {
    if (cinematicRunning) {
      skipCinematic(event);
    } else {
      markTitleInteraction();
    }
  });

  window.addEventListener('resize', () => {
    if (starActive) resizeStarCanvas();
    if (barrensGustActive) resizeBarrensGustCanvas();
  }, { passive: true });

  // Title audio resilience: the homepage secret entrance sets avendorMusicWanted,
  // but a stale/missing flag must not prevent us from attempting the Bruckner loop.
  // Browsers may still block audible autoplay; the first trusted gesture retries it.
  function requestTitleMusic() {
    if (cinematicRunning) return;
    sessionStorage.setItem('avendorMusicWanted', '1');
    resumeTitleMusic();
  }

  requestTitleMusic();

  window.addEventListener('pointerdown', requestTitleMusic, { passive: true });
  window.addEventListener('touchstart', requestTitleMusic, { passive: true });
  window.addEventListener('keydown', requestTitleMusic);

  // Small public health hook for future smoke tests. No gameplay code depends on it.
  window.AvendorTitleController = Object.freeze({
    healthy: true,
    startEarlyTest,
    startIntroduction: startIntroductionPreview,
    requestTitleMusic,
    bruntideFxVersion: '0.3.10',
    bruntideFxStatus: () => ({
      active: bruntideFxActive,
      sceneIndex,
      rootOpacity: bruntideFx.root.style.opacity,
      breathOpacity: bruntideFx.breath.style.opacity,
      torchLayers: bruntideFx.torchField.style.backgroundImage ? 'present' : 'none',
      prefersReducedMotion: REDUCED_MOTION.matches
    })
  });

  lastTitleInteractionAt = performance.now();
  resetIdleTimer();
})();
