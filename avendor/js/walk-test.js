(() => {
  'use strict';

  const stage = document.getElementById('walk-stage');
  const player = document.getElementById('player');
  const playerCanvas = document.getElementById('player-canvas');
  const mark = document.getElementById('confusion-mark');
  const help = document.getElementById('walk-help');
  const audio = document.getElementById('avendor-music');
  const status = document.getElementById('rig-status');

  const keys = new Set();
  let x = 0.42;
  let y = 0.70;
  let last = performance.now();
  let wrapping = false;
  let musicStarted = false;
  let lastDirection = 'south';

  const WALK_SPEED_X = 0.19;
  const WALK_SPEED_Y = 0.17;
  const MIN_X = 0.055;
  const MAX_X = 0.94;
  const MIN_Y = 0.18;
  const MAX_Y = 0.735;
  const NORTH_MIN_X = 0.43;
  const NORTH_MAX_X = 0.63;
  const FAR_SCALE = 0.52;
  const NEAR_SCALE = 1.00;

  const Sprite = window.AvendorSpriteEngine?.LayeredSprite;
  if (!Sprite) {
    throw new Error('Avendor sprite engine was not loaded before walk-test.js.');
  }

  const hero = new Sprite(playerCanvas, { body: 'male' });

  audio.volume = 0.42;

  function startMusic() {
    if (musicStarted) return;
    musicStarted = true;
    sessionStorage.setItem('avendorMusicWanted', '1');
    const p = audio.play();
    if (p?.catch) p.catch(() => { musicStarted = false; });
  }

  if (sessionStorage.getItem('avendorMusicWanted') === '1') {
    startMusic();
  }

  const controls = new Set(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright']);

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (!controls.has(key)) return;
    event.preventDefault();
    keys.add(key);
    startMusic();
  });

  window.addEventListener('keyup', (event) => {
    keys.delete(event.key.toLowerCase());
  });

  window.addEventListener('blur', () => keys.clear());

  stage.addEventListener('pointerdown', () => {
    stage.focus({ preventScroll: true });
    startMusic();
  });

  function perspectiveScale() {
    const t = Math.max(0, Math.min(1, (y - MIN_Y) / (MAX_Y - MIN_Y)));
    return FAR_SCALE + (NEAR_SCALE - FAR_SCALE) * t;
  }

  function setPosition() {
    const scale = perspectiveScale();
    player.style.left = `${x * 100}%`;
    player.style.top = `${y * 100}%`;
    player.style.setProperty('--perspective-scale', scale.toFixed(4));
    player.style.zIndex = String(30 + Math.round(y * 100));

    mark.style.left = `${x * 100}%`;
    mark.style.top = `${Math.max(.08, y - (.17 * scale)) * 100}%`;
  }

  function directionFromVector(dx, dy) {
    if (dy < 0) {
      if (dx < 0) return 'northwest';
      if (dx > 0) return 'northeast';
      return 'north';
    }
    if (dy > 0) {
      if (dx < 0) return 'southwest';
      if (dx > 0) return 'southeast';
      return 'south';
    }
    if (dx < 0) return 'west';
    if (dx > 0) return 'east';
    return lastDirection;
  }

  function updateRigStatus() {
    if (!status) return;
    const s = hero.getStatus();
    status.textContent = `HERO VISUAL 0.4.1 · DEFAULT ${s.body.toUpperCase()} · ${s.direction.toUpperCase()} · ${s.state.toUpperCase()} ${s.state === 'walk' ? s.frame + 1 : ''}`;
  }

  function confused() {
    player.classList.remove('confused');
    mark.classList.remove('show');
    void player.offsetWidth;
    player.classList.add('confused');
    mark.classList.add('show');
    help.textContent = 'That was... odd.';
    window.setTimeout(() => {
      help.textContent = 'WASD or arrow keys to walk. Try heading north again and watch the perspective scale.';
      player.classList.remove('confused');
      mark.classList.remove('show');
      wrapping = false;
    }, 1500);
  }

  function northWrap() {
    if (wrapping) return;
    wrapping = true;
    x = 0.42;
    y = 0.705;
    lastDirection = 'south';
    hero.setMotion('idle', lastDirection);
    hero.draw();
    setPosition();
    confused();
  }


  async function applyDefaultBody() {
    try {
      sessionStorage.setItem('avendorHeroBody', 'male');
      await hero.setBody('male');
      updateRigStatus();
    } catch (error) {
      console.error(error);
      if (status) status.textContent = 'HERO VISUAL ASSET LOAD ERROR';
    }
  }

  function tick(now) {
    const dt = Math.min(.045, (now - last) / 1000);
    last = now;

    let dx = 0;
    let dy = 0;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;
    if (keys.has('w') || keys.has('arrowup')) dy -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dy += 1;

    const moving = dx !== 0 || dy !== 0;

    if (moving && !wrapping) {
      lastDirection = directionFromVector(dx, dy);
      hero.setMotion('walk', lastDirection);

      const mag = Math.hypot(dx, dy) || 1;
      dx /= mag;
      dy /= mag;
      x += dx * WALK_SPEED_X * dt;
      y += dy * WALK_SPEED_Y * dt;

      x = Math.max(MIN_X, Math.min(MAX_X, x));
      y = Math.min(MAX_Y, y);

      if (y < MIN_Y) {
        if (x >= NORTH_MIN_X && x <= NORTH_MAX_X) {
          northWrap();
        } else {
          y = MIN_Y;
        }
      }
      setPosition();
    } else if (!wrapping) {
      hero.setMotion('idle', lastDirection);
    }

    hero.update(now);
    updateRigStatus();
    requestAnimationFrame(tick);
  }

  applyDefaultBody().finally(() => {
    hero.setMotion('idle', lastDirection);
    hero.draw();
  });
  setPosition();
  requestAnimationFrame(tick);
  stage.focus({ preventScroll: true });

  window.AvendorWalkTest = Object.freeze({
    hero,
    getPosition: () => ({ x, y, scale: perspectiveScale() }),
    setBody: (body = 'male') => hero.setBody(body === 'female' ? 'female' : 'male')
  });
})();
