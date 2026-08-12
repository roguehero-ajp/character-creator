(() => {
  'use strict';

  const HOVER_MS = 2000;
  const DESTINATION = '/avendor/test.html';
  const AUDIO_SRC = '/avendor/assets/avendor-theme.mp3';
  const STYLE_ID = 'avendor-easter-egg-style';

  let hoverTimer = null;
  let awakened = false;
  let snowStarted = false;
  let animationFrame = 0;
  let flakes = [];
  let canvas = null;
  let ctx = null;
  let audio = null;
  let secretLetter = null;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #avendor-secret-a {
        position: relative;
        z-index: 2147483645;
        cursor: default;
        text-decoration: none;
        color: inherit;
        transition: color .45s ease, text-shadow .45s ease, transform .18s ease;
        display: inline-block;
        border-radius: 2px;
      }
      #avendor-secret-a:focus-visible {
        outline: 1px dotted currentColor;
        outline-offset: 2px;
      }
      #avendor-secret-a.avendor-awake {
        cursor: pointer;
        color: #f2e7c4;
        text-shadow: 0 0 7px rgba(220,235,255,.75), 0 0 16px rgba(180,205,255,.45);
      }
      #avendor-secret-a.avendor-nudge {
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
      #avendor-darkness.avendor-awake { opacity: .72; }
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
      #avendor-snow.avendor-awake { opacity: 1; }
      body.avendor-entering #avendor-darkness { opacity: 1; transition-duration: .6s; }
      body.avendor-entering #avendor-snow { opacity: 1; }
      @keyframes avendor-nudge {
        0%,100% { transform: translateY(0); }
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
    const darkness = document.createElement('div');
    darkness.id = 'avendor-darkness';
    document.body.appendChild(darkness);

    canvas = document.createElement('canvas');
    canvas.id = 'avendor-snow';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');

    audio = document.createElement('audio');
    audio.src = AUDIO_SRC;
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0.42;
    audio.setAttribute('aria-hidden', 'true');
    document.body.appendChild(audio);

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
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    const dt = 1 / 60;

    for (const f of flakes) {
      f.y += f.vy * dt;
      f.x += (f.vx + Math.sin(time / 900 + f.phase) * f.wobble) * dt;
      if (f.y > h + 8) { f.y = -8; f.x = Math.random() * w; }
      if (f.x < -10) f.x = w + 8;
      if (f.x > w + 10) f.x = -8;
      ctx.beginPath();
      ctx.fillStyle = `rgba(242,248,255,${f.alpha})`;
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    animationFrame = requestAnimationFrame(drawSnow);
  }

  function tryMusic() {
    if (!audio) return;
    const promise = audio.play();
    if (promise && typeof promise.catch === 'function') {
      promise.catch(() => {
        // Modern browsers may block audio that begins from hover alone.
        // A later click or keypress on the Avendor pages will retry it.
        sessionStorage.setItem('avendorMusicWanted', '1');
      });
    }
  }

  function awaken() {
    if (awakened) return;
    awakened = true;
    secretLetter?.classList.add('avendor-awake');
    document.getElementById('avendor-darkness')?.classList.add('avendor-awake');
    canvas?.classList.add('avendor-awake');
    if (!snowStarted && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      snowStarted = true;
      animationFrame = requestAnimationFrame(drawSnow);
    }
    sessionStorage.setItem('avendorMusicWanted', '1');
    tryMusic();
  }

  function sleep() {
    clearTimeout(hoverTimer);
    hoverTimer = null;
    if (!awakened || document.body.classList.contains('avendor-entering')) return;
    awakened = false;
    secretLetter?.classList.remove('avendor-awake');
    document.getElementById('avendor-darkness')?.classList.remove('avendor-awake');
    canvas?.classList.remove('avendor-awake');
    if (audio && !audio.paused) {
      const start = audio.volume;
      const started = performance.now();
      const fade = (now) => {
        if (!audio || awakened) return;
        const p = Math.min(1, (now - started) / 650);
        audio.volume = Math.max(0, start * (1 - p));
        if (p < 1) requestAnimationFrame(fade);
        else { audio.pause(); audio.currentTime = 0; audio.volume = 0.42; }
      };
      requestAnimationFrame(fade);
    }
  }

  function beginHover() {
    clearTimeout(hoverTimer);
    if (awakened) return;
    hoverTimer = window.setTimeout(awaken, HOVER_MS);
  }

  function cancelBeforeAwake() {
    if (!awakened) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  }

  function enterAvendor(event) {
    event.preventDefault();
    if (!awakened) {
      secretLetter?.classList.remove('avendor-nudge');
      void secretLetter?.offsetWidth;
      secretLetter?.classList.add('avendor-nudge');
      return;
    }
    sessionStorage.setItem('avendorMusicWanted', '1');
    document.body.classList.add('avendor-entering');
    tryMusic();
    window.setTimeout(() => { window.location.href = DESTINATION; }, 620);
  }

  function wrapSecretLetter() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ['SCRIPT','STYLE','NOSCRIPT','TEXTAREA'].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return /everything\s+you\s+need\s+to\s+play[,.]?\s+all\s+in\s+one\s+place/i.test(node.nodeValue || '')
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });

    const node = walker.nextNode();
    if (!node) return false;
    const text = node.nodeValue || '';
    const lower = text.toLowerCase();
    const playIndex = lower.indexOf('play');
    if (playIndex < 0) return false;
    const aIndex = playIndex + 2;

    const frag = document.createDocumentFragment();
    frag.appendChild(document.createTextNode(text.slice(0, aIndex)));
    const span = document.createElement('span');
    span.id = 'avendor-secret-a';
    span.textContent = text[aIndex];
    span.tabIndex = 0;
    span.setAttribute('role', 'link');
    span.setAttribute('aria-label', 'A hidden path');
    span.setAttribute('title', '');
    frag.appendChild(span);
    frag.appendChild(document.createTextNode(text.slice(aIndex + 1)));
    node.parentNode.replaceChild(frag, node);
    secretLetter = span;

    span.addEventListener('pointerenter', beginHover);
    span.addEventListener('pointerleave', () => {
      cancelBeforeAwake();
      if (awakened) window.setTimeout(sleep, 180);
    });
    span.addEventListener('focus', beginHover);
    span.addEventListener('blur', () => {
      cancelBeforeAwake();
      if (awakened) window.setTimeout(sleep, 180);
    });
    span.addEventListener('click', enterAvendor);
    span.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') enterAvendor(event);
    });
    return true;
  }

  function init() {
    injectStyles();
    createEffects();
    wrapSecretLetter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
