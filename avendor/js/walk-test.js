(() => {
  'use strict';

  const stage = document.getElementById('walk-stage');
  const player = document.getElementById('player');
  const mark = document.getElementById('confusion-mark');
  const help = document.getElementById('walk-help');
  const audio = document.getElementById('avendor-music');

  const keys = new Set();
  let x = 0.42;
  let y = 0.70;
  let last = performance.now();
  let wrapping = false;
  let musicStarted = false;

  const WALK_SPEED_X = 0.19;
  const WALK_SPEED_Y = 0.17;
  const MIN_X = 0.055;
  const MAX_X = 0.94;
  const MIN_Y = 0.18;
  const MAX_Y = 0.735;
  const NORTH_MIN_X = 0.43;
  const NORTH_MAX_X = 0.63;

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

  stage.addEventListener('pointerdown', () => {
    stage.focus({ preventScroll: true });
    startMusic();
  });

  function setPosition() {
    player.style.left = `${x * 100}%`;
    player.style.top = `${y * 100}%`;
    mark.style.left = `${x * 100}%`;
    mark.style.top = `${Math.max(.08, y - .17) * 100}%`;
  }

  function confused() {
    player.classList.remove('confused');
    mark.classList.remove('show');
    void player.offsetWidth;
    player.classList.add('confused');
    mark.classList.add('show');
    help.textContent = 'That was... odd.';
    window.setTimeout(() => {
      help.textContent = 'WASD or arrow keys to walk. Try heading north again.';
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
    setPosition();
    confused();
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
    player.classList.toggle('walking', moving && !wrapping);

    if (moving && !wrapping) {
      const mag = Math.hypot(dx, dy) || 1;
      dx /= mag;
      dy /= mag;
      x += dx * WALK_SPEED_X * dt;
      y += dy * WALK_SPEED_Y * dt;
      if (dx < 0) player.style.setProperty('--facing', '-1');
      if (dx > 0) player.style.setProperty('--facing', '1');

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
    }

    requestAnimationFrame(tick);
  }

  setPosition();
  requestAnimationFrame(tick);
  stage.focus({ preventScroll: true });
})();
