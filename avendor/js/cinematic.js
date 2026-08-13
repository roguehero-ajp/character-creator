(() => {
  'use strict';

  const IDLE_DELAY_MS = 10_000;
  const FADE_MS = 650;

  const stage = document.getElementById('avendor-title-stage');
  const cinematic = document.getElementById('avendor-cinematic');
  const sceneArt = document.getElementById('cinematic-art');
  const subtitle = document.getElementById('cinematic-subtitle');
  const snow = document.getElementById('cinematic-snow');
  const meteor = document.getElementById('cinematic-meteor');
  const button = document.getElementById('early-test');
  const audio = document.getElementById('avendor-music');
  const cinematicMusic = document.getElementById('cinematic-music');

  if (
    !stage ||
    !cinematic ||
    !sceneArt ||
    !subtitle ||
    !snow ||
    !meteor ||
    !button ||
    !audio ||
    !cinematicMusic
  ) {
    return;
  }

  audio.volume = 0.42;
  cinematicMusic.volume = 0.52;

  /*
   * Prototype 0.2 animatic timing pass.
   *
   * Subtitle cues deliberately begin earlier than the first draft so the
   * narration is already readable while the eye is settling into each shot.
   * Each cue owns its own lifetime. Older cues are never allowed to clear a
   * newer cue.
   */
  const scenes = [
    {
      id: 'moons',
      duration: 15_000,
      image: 'assets/cinematic/scene-01-moons.png',
      cameraClass: 'camera-moons',
      snowClass: '',
      meteorAt: 3_800,
      subtitles: [
        {
          at: 1_300,
          until: 5_900,
          text: 'A breeze starts in the far North...'
        },
        {
          at: 6_100,
          until: 14_500,
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
    }
  ];

  let idleTimer = null;
  let cinematicRunning = false;
  let sceneIndex = -1;
  let timers = [];
  let ignoreSkipUntil = 0;
  let subtitleGeneration = 0;

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

  function resetIdleTimer() {
    if (cinematicRunning) {
      return;
    }

    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(startCinematic, IDLE_DELAY_MS);
  }

  function stopTitleMusic() {
    audio.pause();
    audio.currentTime = 0;
  }

  function resumeTitleMusic() {
    if (
      sessionStorage.getItem('avendorMusicWanted') !== '1'
    ) {
      return;
    }

    audio.volume = 0.42;

    const started = audio.play();

    if (started?.catch) {
      started.catch(() => {});
    }
  }

  function startCinematicMusic() {
    cinematicMusic.currentTime = 0;
    const started = cinematicMusic.play();

    if (started?.catch) {
      started.catch(() => {});
    }
  }

  function stopCinematicMusic() {
    cinematicMusic.pause();
    cinematicMusic.currentTime = 0;
  }

  function tryMusic() {
    sessionStorage.setItem('avendorMusicWanted', '1');

    const started = audio.play();

    if (started?.catch) {
      started.catch(() => {});
    }
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
        if (
          cinematicRunning &&
          generation === subtitleGeneration
        ) {
          subtitle.classList.add('show');
        }
      });
    });
  }

  function scheduleSubtitle(cue) {
    rememberTimer(
      window.setTimeout(() => {
        if (!cinematicRunning) {
          return;
        }

        showSubtitle(cue.text);
      }, cue.at)
    );

    rememberTimer(
      window.setTimeout(() => {
        if (!cinematicRunning) {
          return;
        }

        hideSubtitle();
      }, cue.until)
    );
  }

  function showScene(scene) {
    clearTimers();
    hideSubtitle();

    sceneArt.className = 'cinematic-art';
    sceneArt.alt = '';
    sceneArt.src = scene.image;

    snow.className = 'cinematic-snow';

    if (scene.snowClass) {
      snow.classList.add(scene.snowClass);
    }

    meteor.classList.remove('run');

    const reveal = () => {
      if (!cinematicRunning) {
        return;
      }

      sceneArt.className =
        `cinematic-art scene-visible ${scene.cameraClass}`;

      for (const cue of scene.subtitles) {
        scheduleSubtitle(cue);
      }

      if (Number.isFinite(scene.meteorAt)) {
        rememberTimer(
          window.setTimeout(() => {
            if (!cinematicRunning) {
              return;
            }

            meteor.classList.remove('run');
            void meteor.offsetWidth;
            meteor.classList.add('run');
          }, scene.meteorAt)
        );
      }

      rememberTimer(
        window.setTimeout(nextScene, scene.duration)
      );
    };

    if (sceneArt.complete) {
      reveal();
    } else {
      sceneArt.addEventListener(
        'load',
        reveal,
        { once: true }
      );
    }
  }

  function nextScene() {
    if (!cinematicRunning) {
      return;
    }

    sceneIndex += 1;

    if (sceneIndex >= scenes.length) {
      finishCinematic();
      return;
    }

    showScene(scenes[sceneIndex]);
  }

  function startCinematic() {
    if (cinematicRunning) {
      return;
    }

    cinematicRunning = true;
    sceneIndex = -1;
    ignoreSkipUntil = performance.now() + 800;

    window.clearTimeout(idleTimer);
    clearTimers();

    stage.classList.add('cinematic-running');
    cinematic.classList.add('active');
    cinematic.setAttribute('aria-hidden', 'false');

    stopTitleMusic();
    startCinematicMusic();
    nextScene();
  }

  function finishCinematic() {
    if (!cinematicRunning) {
      return;
    }

    cinematicRunning = false;
    clearTimers();
    hideSubtitle();
    stopCinematicMusic();

    sceneArt.className = 'cinematic-art';
    snow.className = 'cinematic-snow';
    meteor.classList.remove('run');

    cinematic.classList.remove('active');
    cinematic.setAttribute('aria-hidden', 'true');

    window.setTimeout(() => {
      stage.classList.remove('cinematic-running');
      resumeTitleMusic();
      resetIdleTimer();
    }, FADE_MS);
  }

  function skipCinematic(event) {
    if (!cinematicRunning) {
      return;
    }

    if (performance.now() < ignoreSkipUntil) {
      return;
    }

    if (event?.cancelable) {
      event.preventDefault();
    }

    finishCinematic();
  }

  function startEarlyTest() {
    window.clearTimeout(idleTimer);
    tryMusic();

    document.body.style.transition =
      'filter .25s ease, opacity .25s ease';
    document.body.style.filter = 'brightness(.45)';
    document.body.style.opacity = '.75';

    window.setTimeout(() => {
      window.location.href = 'walk-test.html';
    }, 260);
  }

  button.addEventListener('click', startEarlyTest);

  const activityEvents = [
    'mousemove',
    'mousedown',
    'touchstart',
    'keydown'
  ];

  for (const eventName of activityEvents) {
    window.addEventListener(
      eventName,
      (event) => {
        if (cinematicRunning) {
          skipCinematic(event);
        } else {
          resetIdleTimer();
        }
      },
      { passive: eventName !== 'touchstart' }
    );
  }

  if (
    sessionStorage.getItem('avendorMusicWanted') === '1'
  ) {
    audio.play().catch(() => {});
  }

  resetIdleTimer();
})();
