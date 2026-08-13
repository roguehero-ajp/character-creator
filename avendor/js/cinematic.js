(() => {
  'use strict';

  const IDLE_DELAY_MS = 10_000;
  const FADE_MS = 650;
  const TITLE_VOLUME = 0.42;
  const CINEMATIC_VOLUME = 0.42;
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
  const titleMusic = document.getElementById('avendor-music');
  const cinematicMusic = document.getElementById('cinematic-music');
  const sceneOneWind = document.getElementById('scene-01-wind');

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
    !titleMusic ||
    !cinematicMusic ||
    !sceneOneWind
  ) {
    return;
  }

  const starContext = starCanvas.getContext('2d');
  const barrensGustContext = barrensGustCanvas.getContext('2d');
  if (!starContext || !barrensGustContext) return;

  titleMusic.volume = TITLE_VOLUME;
  cinematicMusic.volume = 0.012;
  sceneOneWind.volume = 0;

  /*
   * Prototype 0.2.2 production lock.
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
      image: 'assets/cinematic/scene-02-barrens.png',
      cameraClass: 'camera-barrens',
      snowClass: 'heavy',
      windClass: 'barrens',
      transitionAt: 10_050,
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
      image: 'assets/cinematic/scene-03-bruntide.png',
      cameraClass: 'camera-bruntide',
      snowClass: 'light',
      windClass: 'bruntide',
      transitionAt: 10_000,
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

  let idleTimer = null;
  let cinematicRunning = false;
  let sceneIndex = -1;
  let timers = [];
  let ignoreSkipUntil = 0;
  let subtitleGeneration = 0;
  let starAnimationFrame = 0;
  let musicFadeFrame = 0;
  let windFadeFrame = 0;
  let barrensGustFrame = 0;
  let starActive = false;
  let barrensGustActive = false;
  let replayGateTimer = null;
  let replayUnlocked = true;
  let lastTitleInteractionAt = performance.now();

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
    windFadeFrame = cancelFrame(windFadeFrame);
    sceneOneWind.pause();
    sceneOneWind.currentTime = 0;
    sceneOneWind.volume = 0;
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
    sceneArt.className = 'cinematic-art';
    cameraPan.className = 'cinematic-pan';
    cameraZoom.className = 'cinematic-zoom';
    snow.className = 'cinematic-snow';
    windLayer.className = 'cinematic-wind';
    meteor.classList.remove('run');
    stopBarrensEffects();

    if (scene.snowClass) snow.classList.add(scene.snowClass);
    if (scene.windClass) windLayer.classList.add(scene.windClass);

    if (scene.id !== 'moons') stopStarTwinkle();
  }

  function runMeteor() {
    meteor.classList.remove('run');
    void meteor.offsetWidth;
    meteor.classList.add('run');
  }

  function runWindTransition() {
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
          if (cinematicRunning) runWindTransition();
        }, scene.transitionAt));
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
    stopStarTwinkle();
    stopBarrensEffects();

    sceneArt.className = 'cinematic-art';
    cameraPan.className = 'cinematic-pan';
    cameraZoom.className = 'cinematic-zoom';
    snow.className = 'cinematic-snow';
    windLayer.className = 'cinematic-wind';
    meteor.classList.remove('run');
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

  if (sessionStorage.getItem('avendorMusicWanted') === '1') {
    resumeTitleMusic();
  }

  lastTitleInteractionAt = performance.now();
  resetIdleTimer();
})();
