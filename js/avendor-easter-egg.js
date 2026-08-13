(() => {
  'use strict';

  const HOVER_MS = 2000;
  const DESTINATION = '/avendor/test.html';
  const AUDIO_SRC = '/avendor/assets/avendor-theme.mp3';
  const STYLE_ID = 'avendor-easter-egg-style';

  let hoverTimer = null;
  let sleepTimer = null;
  let awakened = false;
  let snowStarted = false;
  let animationFrame = 0;
  let effectFallbackTimer = null;
  let flakes = [];
  let canvas = null;
  let ctx = null;
  let audio = null;
  let triggers = [];

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .avendor-secret-trigger {
        cursor: default;
        text-decoration: none;
        color: inherit;
      }

      #avendor-secret-desktop-a {
        position: absolute;
        z-index: 9;
        left: 55.10%;
        top: 19.10%;
        width: 1.65%;
        height: 1.85%;
        display: block;
        border: 0;
        border-radius: 3px;
        background: transparent;
        box-shadow: none;
        outline: none;
      }

      #avendor-secret-desktop-a:focus-visible {
        outline: 1px dotted rgba(255,255,255,.8);
        outline-offset: 2px;
      }

      #avendor-secret-desktop-a.avendor-awake {
        cursor: pointer;
        background: radial-gradient(circle, rgba(224,236,255,.12), rgba(224,236,255,0) 72%);
        box-shadow: 0 0 12px rgba(206,226,255,.16);
      }

      #avendor-secret-mobile-a {
        position: relative;
        z-index: 2147483645;
        display: inline-block;
        border-radius: 2px;
        transition: color .45s ease, text-shadow .45s ease, transform .18s ease;
      }

      #avendor-secret-mobile-a:focus-visible {
        outline: 1px dotted currentColor;
        outline-offset: 2px;
      }

      #avendor-secret-mobile-a.avendor-awake {
        cursor: pointer;
        color: #f2e7c4;
        text-shadow: 0 0 7px rgba(220,235,255,.75), 0 0 16px rgba(180,205,255,.45);
      }

      .avendor-secret-trigger.avendor-nudge {
        animation: avendor-nudge .32s ease;
      }

      #avendor-darkness {
        position: fixed;
        inset: 0;
        z-index: 2147483600;
        pointer-events: none;
        opacity: 0;
        background:
          radial-gradient(circle at 50% 30%, rgba(20,33,48,.08), rgba(3,9,18,.62) 72%),
          rgba(4,10,20,.28);
        transition: opacity 1.8s ease;
      }

      #avendor-darkness.avendor-awake {
        opacity: .72;
      }

      #avendor-snow {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        z-index: 2147483620;
        pointer-events: none;
        opacity: 0;
        transition: opacity 1.25s ease;
      }

      #avendor-snow.avendor-awake {
        opacity: 1;
      }

      body.avendor-entering #avendor-darkness {
        opacity: 1;
        transition-duration: .6s;
      }

      body.avendor-entering #avendor-snow {
        opacity: 1;
      }

      @keyframes avendor-nudge {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-2px); }
      }

      @media (prefers-reduced-motion: reduce) {
        #avendor-snow { display: none; }
        #avendor-darkness { transition-duration: .25s; }
      }
    `;

    document.head.appendChild(style);
  }

  function createEffects() {
    if (!document.getElementById('avendor-darkness')) {
      const darkness = document.createElement('div');
      darkness.id = 'avendor-darkness';
      darkness.setAttribute('aria-hidden', 'true');
      document.body.appendChild(darkness);
    }

    canvas = document.getElementById('avendor-snow');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'avendor-snow';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.appendChild(canvas);
    }
    ctx = canvas.getContext('2d');

    audio = document.getElementById('avendor-easter-egg-audio');
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = 'avendor-easter-egg-audio';
      audio.src = AUDIO_SRC;
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = 0.42;
      audio.setAttribute('aria-hidden', 'true');
      document.body.appendChild(audio);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });
  }

  function resizeCanvas() {
    if (!canvas || !ctx) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(window.innerWidth * ratio));
    canvas.height = Math.max(1, Math.floor(window.innerHeight * ratio));
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    resetFlakes();
  }

  function resetFlakes() {
    const count = Math.max(75, Math.min(190, Math.floor(window.innerWidth / 8)));

    flakes = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 0.7 + Math.random() * 2.35,
      vy: 17 + Math.random() * 42,
      vx: -10 + Math.random() * 15,
      phase: Math.random() * Math.PI * 2,
      wobble: 5 + Math.random() * 14,
      alpha: 0.38 + Math.random() * 0.58
    }));
  }

  function drawSnow(time) {
    if (!ctx || !canvas || !snowStarted) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const dt = 1 / 60;

    ctx.clearRect(0, 0, width, height);

    for (const flake of flakes) {
      flake.y += flake.vy * dt;
      flake.x += (
        flake.vx +
        Math.sin(time / 900 + flake.phase) * flake.wobble
      ) * dt;

      if (flake.y > height + 8) {
        flake.y = -8;
        flake.x = Math.random() * width;
      }
      if (flake.x < -10) flake.x = width + 8;
      if (flake.x > width + 10) flake.x = -8;

      ctx.beginPath();
      ctx.fillStyle = `rgba(242,248,255,${flake.alpha})`;
      ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
      ctx.fill();
    }

    animationFrame = requestAnimationFrame(drawSnow);
  }

  function startSnow() {
    if (
      snowStarted ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    snowStarted = true;
    animationFrame = requestAnimationFrame(drawSnow);
  }

  function stopSnow() {
    snowStarted = false;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
    if (ctx) {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  function activateAwakeningEffects() {
    clearTimeout(effectFallbackTimer);
    effectFallbackTimer = null;

    document
      .getElementById('avendor-darkness')
      ?.classList.add('avendor-awake');

    canvas?.classList.add('avendor-awake');
    startSnow();
  }

  function tryMusic({ syncEffects = false } = {}) {
    if (!audio) {
      if (syncEffects) {
        activateAwakeningEffects();
      }
      return;
    }

    sessionStorage.setItem('avendorMusicWanted', '1');

    let effectsStarted = false;

    const startSyncedEffects = () => {
      if (!syncEffects || effectsStarted || !awakened) {
        return;
      }

      effectsStarted = true;
      activateAwakeningEffects();
    };

    if (syncEffects) {
      /*
       * When Chrome allows hover-triggered playback, the snowfall begins from
       * the media element's real "playing" event so picture and sound wake up
       * together.
       *
       * Hover does not always grant user activation. If Chrome blocks audible
       * playback, we still reveal the secret visually after a short fallback
       * delay rather than making the Easter egg appear broken.
       */
      audio.addEventListener(
        'playing',
        startSyncedEffects,
        { once: true }
      );

      clearTimeout(effectFallbackTimer);
      effectFallbackTimer = window.setTimeout(
        startSyncedEffects,
        220
      );
    }

    const promise = audio.play();

    if (promise && typeof promise.then === 'function') {
      promise
        .then(() => {
          startSyncedEffects();
        })
        .catch(() => {
          /*
           * Chrome may reject audible playback when the only trigger was a
           * hover/timer. The click that enters Avendor retries playback using
           * a genuine user activation.
           */
          sessionStorage.setItem('avendorMusicWanted', '1');
        });
    }
  }

  function awaken() {
    clearTimeout(hoverTimer);
    hoverTimer = null;

    if (awakened) return;

    awakened = true;
    triggers.forEach(
      (trigger) => trigger.classList.add('avendor-awake')
    );

    /*
     * Ask for music and visual awakening as one event. If playback is
     * permitted, snow/darkness start from the real "playing" event. If Chrome
     * blocks hover audio, a tiny fallback keeps the snowfall discoverable.
     */
    tryMusic({ syncEffects: true });
  }

  function sleep() {
    clearTimeout(hoverTimer);
    clearTimeout(sleepTimer);
    clearTimeout(effectFallbackTimer);
    hoverTimer = null;
    sleepTimer = null;
    effectFallbackTimer = null;

    if (!awakened || document.body.classList.contains('avendor-entering')) return;

    awakened = false;
    triggers.forEach((trigger) => trigger.classList.remove('avendor-awake'));
    document.getElementById('avendor-darkness')?.classList.remove('avendor-awake');
    canvas?.classList.remove('avendor-awake');
    stopSnow();

    if (audio && !audio.paused) {
      const startVolume = audio.volume;
      const startedAt = performance.now();

      const fade = (now) => {
        if (!audio || awakened) return;

        const progress = Math.min(1, (now - startedAt) / 650);
        audio.volume = Math.max(0, startVolume * (1 - progress));

        if (progress < 1) {
          requestAnimationFrame(fade);
        } else {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 0.42;
        }
      };

      requestAnimationFrame(fade);
    }
  }

  function beginHover() {
    clearTimeout(sleepTimer);
    clearTimeout(hoverTimer);
    sleepTimer = null;

    if (awakened) return;
    hoverTimer = window.setTimeout(awaken, HOVER_MS);
  }

  function leaveTrigger() {
    if (!awakened) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
      return;
    }

    clearTimeout(sleepTimer);
    sleepTimer = window.setTimeout(sleep, 180);
  }

  function enterAvendor(event) {
    event.preventDefault();

    const trigger = event.currentTarget;

    if (!awakened) {
      trigger.classList.remove('avendor-nudge');
      void trigger.offsetWidth;
      trigger.classList.add('avendor-nudge');
      return;
    }

    sessionStorage.setItem('avendorMusicWanted', '1');
    document.body.classList.add('avendor-entering');
    tryMusic({ syncEffects: false });

    window.setTimeout(() => {
      window.location.href = DESTINATION;
    }, 620);
  }

  function registerTrigger(trigger) {
    if (!trigger) return;

    triggers.push(trigger);

    trigger.addEventListener('pointerenter', beginHover);
    trigger.addEventListener('pointerleave', leaveTrigger);
    trigger.addEventListener('focus', beginHover);
    trigger.addEventListener('blur', leaveTrigger);
    trigger.addEventListener('click', enterAvendor);
    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        enterAvendor(event);
      }
    });

    // Touchscreens have no true hover. Holding the secret letter for two
    // seconds provides an equivalent discovery path without changing desktop.
    trigger.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse') beginHover();
    });
    trigger.addEventListener('pointerup', (event) => {
      if (event.pointerType !== 'mouse' && !awakened) leaveTrigger();
    });
    trigger.addEventListener('pointercancel', leaveTrigger);
  }

  function createDesktopHotspot() {
    const artboard = document.querySelector('.artboard');
    if (!artboard) return null;

    const existing = document.getElementById('avendor-secret-desktop-a');
    if (existing) return existing;

    const hotspot = document.createElement('span');
    hotspot.id = 'avendor-secret-desktop-a';
    hotspot.className = 'avendor-secret-trigger';
    hotspot.tabIndex = 0;
    hotspot.setAttribute('role', 'link');
    hotspot.setAttribute('aria-label', 'A hidden path');
    hotspot.setAttribute('title', '');
    artboard.appendChild(hotspot);

    return hotspot;
  }

  function wrapMobileSecretLetter() {
    if (document.getElementById('avendor-secret-mobile-a')) {
      return document.getElementById('avendor-secret-mobile-a');
    }

    const mobileHome = document.querySelector('.mobile-home');
    if (!mobileHome) return null;

    const walker = document.createTreeWalker(
      mobileHome,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (
            !parent ||
            ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'].includes(parent.tagName)
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          return /everything\s+you\s+need\s+to\s+play[,.]?\s+all\s+in\s+one\s+place/i.test(
            node.nodeValue || ''
          )
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      }
    );

    const node = walker.nextNode();
    if (!node) return null;

    const text = node.nodeValue || '';
    const playIndex = text.toLowerCase().indexOf('play');
    if (playIndex < 0) return null;

    const aIndex = playIndex + 2;
    const fragment = document.createDocumentFragment();

    fragment.appendChild(document.createTextNode(text.slice(0, aIndex)));

    const span = document.createElement('span');
    span.id = 'avendor-secret-mobile-a';
    span.className = 'avendor-secret-trigger';
    span.textContent = text[aIndex];
    span.tabIndex = 0;
    span.setAttribute('role', 'link');
    span.setAttribute('aria-label', 'A hidden path');
    span.setAttribute('title', '');

    fragment.appendChild(span);
    fragment.appendChild(document.createTextNode(text.slice(aIndex + 1)));
    node.parentNode.replaceChild(fragment, node);

    return span;
  }

  function init() {
    injectStyles();
    createEffects();

    const desktopTrigger = createDesktopHotspot();
    const mobileTrigger = wrapMobileSecretLetter();

    registerTrigger(desktopTrigger);
    registerTrigger(mobileTrigger);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
