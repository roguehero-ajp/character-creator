(() => {
  'use strict';

  const stage = document.getElementById('walk-stage');
  const stageArt = stage.querySelector('.stage-art');
  const player = document.getElementById('player');
  const playerCanvas = document.getElementById('player-canvas');
  const mark = document.getElementById('confusion-mark');
  const help = document.getElementById('walk-help');
  const audio = document.getElementById('avendor-music');
  const status = document.getElementById('rig-status');
  const sceneStatus = document.getElementById('scene-status');
  const prompt = document.getElementById('interaction-prompt');
  const debugCanvas = document.getElementById('map-debug-layer');
  const debugButton = document.getElementById('map-debug-toggle');
  const maleButton = document.getElementById('body-male');
  const femaleButton = document.getElementById('body-female');

  const MapGeometry = window.AvendorMapEngine?.MapGeometry;
  const Sprite = window.AvendorSpriteEngine?.LayeredSprite;
  if (!MapGeometry || !Sprite) {
    throw new Error('The map and sprite engines must load before walk-test.js.');
  }

  const hero = new Sprite(playerCanvas, { body: 'male' });
  const keys = new Set();
  const movementControls = new Set([
    'w', 'a', 's', 'd',
    'arrowup', 'arrowleft', 'arrowdown', 'arrowright'
  ]);

  let map = null;
  let position = { x: 724, y: 900 };
  let last = performance.now();
  let lastDirection = 'north';
  let transitionLock = false;
  let activeTriggerId = null;
  let musicStarted = false;
  let debugVisible = false;
  let nearbyId = null;
  let noticeTimer = 0;
  let lastStatusText = '';

  audio.volume = 0.18;

  function startMusic() {
    if (musicStarted) return;
    musicStarted = true;
    sessionStorage.setItem('avendorMusicWanted', '1');
    const playAttempt = audio.play();
    if (playAttempt?.catch) {
      playAttempt.catch(() => { musicStarted = false; });
    }
  }

  function setNotice(message, duration = 2200) {
    window.clearTimeout(noticeTimer);
    help.textContent = message;
    sceneStatus.textContent = message;
    noticeTimer = window.setTimeout(() => {
      help.textContent = 'WASD or arrow keys to walk. E or Space inspects nearby features. F2 shows the authored map geometry.';
    }, duration);
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
    if (!map) return;
    const spriteStatus = hero.getStatus();
    const frame = spriteStatus.state === 'walk' ? ` ${spriteStatus.frame + 1}` : '';
    const nextText = [
      'TOWN CENTER MAP 0.5.1',
      spriteStatus.body.toUpperCase(),
      spriteStatus.direction.toUpperCase(),
      `${spriteStatus.state.toUpperCase()}${frame}`,
      `${Math.round(position.x)},${Math.round(position.y)}`,
      `${map.getScale(position.y).toFixed(2)}x`
    ].join(' · ');

    if (nextText !== lastStatusText) {
      status.textContent = nextText;
      lastStatusText = nextText;
    }
  }

  function setPosition() {
    if (!map) return;
    const scale = map.getScale(position.y);
    player.style.left = `${(position.x / map.width) * 100}%`;
    player.style.top = `${(position.y / map.height) * 100}%`;
    player.style.setProperty('--perspective-scale', scale.toFixed(4));
    player.style.zIndex = String(map.getDepth(position.y));

    mark.style.left = `${(position.x / map.width) * 100}%`;
    mark.style.top = `${(Math.max(30, position.y - (190 * scale)) / map.height) * 100}%`;
    updateRigStatus();
  }

  function updateInteractionPrompt() {
    if (!map || transitionLock) {
      prompt.classList.remove('show');
      nearbyId = null;
      return;
    }

    const nearby = map.getNearbyInteractable(position);
    if (!nearby) {
      prompt.classList.remove('show');
      prompt.setAttribute('aria-hidden', 'true');
      nearbyId = null;
      return;
    }

    if (nearby.id !== nearbyId) {
      prompt.textContent = `E  Inspect ${nearby.label}`;
      nearbyId = nearby.id;
    }
    prompt.classList.add('show');
    prompt.setAttribute('aria-hidden', 'false');
  }

  function inspectNearby() {
    if (!map || transitionLock) return;
    const nearby = map.getNearbyInteractable(position);
    if (!nearby) {
      setNotice('There is nothing close enough to inspect.');
      return;
    }

    const developmentNotes = {
      'town-well': 'Town well interaction registered. The future sewer entrance is sealed in this map state.',
      'direction-signpost': 'Road sign interaction registered: Northgate, Stonefield, Elderwood and Riverrun.',
      'fruit-stall': 'Fruit vendor interaction anchor registered.',
      'lodestone-tavern-sign': 'Lodestone Tavern interaction anchor registered.',
      'general-store-front': 'General Store interaction anchor registered.'
    };
    setNotice(developmentNotes[nearby.id] || `${nearby.label} interaction registered.`);
  }

  function triggerConfusion(message) {
    player.classList.remove('confused');
    mark.classList.remove('show');
    void player.offsetWidth;
    player.classList.add('confused');
    mark.classList.add('show');
    setNotice(message, 1500);
  }

  function handleTrigger(trigger) {
    if (!map || transitionLock || activeTriggerId === trigger.id) return;
    transitionLock = true;
    activeTriggerId = trigger.id;
    keys.clear();
    hero.setMotion('idle', lastDirection);

    const fallback = map.getSpawn(trigger.fallbackSpawn);
    if (fallback) {
      position = { x: fallback.x, y: fallback.y };
      lastDirection = fallback.facing || lastDirection;
    }
    setPosition();

    if (trigger.preserveNorthWrap) {
      triggerConfusion(`${trigger.label} exit registered. Until its destination map exists, the north-wrap test returns the hero to the south.`);
    } else {
      const kind = trigger.type === 'portal' ? 'portal' : 'exit';
      setNotice(`${trigger.label} ${kind} registered -> ${trigger.destination}.`, 1500);
    }

    window.setTimeout(() => {
      player.classList.remove('confused');
      mark.classList.remove('show');
      transitionLock = false;
      activeTriggerId = null;
      setPosition();
    }, 1500);
  }

  function buildOccluders() {
    const { polygonToCss } = window.AvendorMapEngine;
    const occluders = map.data.depthOccluders || [];

    occluders.forEach((definition) => {
      const layer = document.createElement('div');
      layer.className = 'scene-occluder';
      layer.dataset.occluderId = definition.id;
      layer.style.backgroundImage = `url("${map.data.art.background}")`;
      layer.style.clipPath = polygonToCss(definition.points, map.width, map.height);
      layer.style.zIndex = String(map.getDepth(definition.depthY));
      stage.insertBefore(layer, debugCanvas);
    });
  }

  function setDebug(visible) {
    debugVisible = Boolean(visible);
    debugCanvas.classList.toggle('show', debugVisible);
    debugButton.classList.toggle('selected', debugVisible);
    debugButton.setAttribute('aria-pressed', String(debugVisible));
    debugButton.textContent = `Map debug: ${debugVisible ? 'on' : 'off'}`;
    if (debugVisible && map) {
      setNotice('Map debug: green is walkable, red is solid, blue is an outdoor exit, purple is a door, gold dashed shapes are depth occluders and gold dots are NPC anchors.', 3600);
    }
  }

  async function setBody(body) {
    const resolved = body === 'female' ? 'female' : 'male';
    await hero.setBody(resolved);
    maleButton.classList.toggle('selected', resolved === 'male');
    femaleButton.classList.toggle('selected', resolved === 'female');
    maleButton.setAttribute('aria-pressed', String(resolved === 'male'));
    femaleButton.setAttribute('aria-pressed', String(resolved === 'female'));
    updateRigStatus();
  }

  function readMovementVector() {
    let dx = 0;
    let dy = 0;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;
    if (keys.has('w') || keys.has('arrowup')) dy -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dy += 1;
    return { dx, dy };
  }

  function tick(now) {
    const dt = Math.min(0.045, (now - last) / 1000);
    last = now;

    if (map && !transitionLock) {
      let { dx, dy } = readMovementVector();
      const requestedMovement = dx !== 0 || dy !== 0;

      if (requestedMovement) {
        lastDirection = directionFromVector(dx, dy);
        const magnitude = Math.hypot(dx, dy) || 1;
        dx /= magnitude;
        dy /= magnitude;

        const next = map.resolveMovement(
          position,
          dx * map.data.movement.speedX * dt,
          dy * map.data.movement.speedY * dt
        );
        const moved = Math.hypot(next.x - position.x, next.y - position.y) > 0.01;
        position = next;
        hero.setMotion(moved ? 'walk' : 'idle', lastDirection);
        setPosition();

        const trigger = map.getTriggerAt(position);
        if (trigger) handleTrigger(trigger);
        else activeTriggerId = null;
      } else {
        hero.setMotion('idle', lastDirection);
      }

      updateInteractionPrompt();
    } else {
      hero.setMotion('idle', lastDirection);
    }

    hero.update(now);
    updateRigStatus();
    requestAnimationFrame(tick);
  }

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (movementControls.has(key)) {
      event.preventDefault();
      keys.add(key);
      startMusic();
      return;
    }

    if ((key === 'e' || key === ' ') && !event.repeat) {
      event.preventDefault();
      startMusic();
      inspectNearby();
    } else if (key === 'f2' && !event.repeat) {
      event.preventDefault();
      setDebug(!debugVisible);
    }
  });

  window.addEventListener('keyup', (event) => {
    keys.delete(event.key.toLowerCase());
  });

  window.addEventListener('blur', () => keys.clear());

  stage.addEventListener('pointerdown', () => {
    stage.focus({ preventScroll: true });
    startMusic();
  });

  debugButton.addEventListener('click', () => setDebug(!debugVisible));
  maleButton.addEventListener('click', () => setBody('male'));
  femaleButton.addEventListener('click', () => setBody('female'));

  async function boot() {
    try {
      map = await MapGeometry.load('data/maps/briarwell-town-center.json');
      stage.style.setProperty('--stage-ratio', `${map.width} / ${map.height}`);
      stageArt.src = map.data.art.background;
      window.AvendorMapEngine.drawDebugMap(debugCanvas, map);
      buildOccluders();

      const spawn = map.getSpawn('default');
      position = { x: spawn.x, y: spawn.y };
      lastDirection = spawn.facing;
      sessionStorage.setItem('avendorHeroBody', 'male');
      await setBody('male');
      hero.setMotion('idle', lastDirection);
      hero.draw();
      setPosition();
      updateInteractionPrompt();
      setNotice(`Briarwell - Town Center map data loaded. ${map.data.collisions.length} foot-level collision regions, ${map.data.exits.length} outdoor exits, ${map.data.portals.length} building portals and ${map.data.npcAnchors.length} NPC anchors are active.`, 3200);
    } catch (error) {
      console.error(error);
      status.textContent = 'TOWN CENTER MAP LOAD ERROR';
      sceneStatus.textContent = 'The Town Center map could not be loaded.';
      help.textContent = 'Map load failed. Open the browser console for details.';
    }
  }

  if (sessionStorage.getItem('avendorMusicWanted') === '1') startMusic();
  boot();
  requestAnimationFrame(tick);
  stage.focus({ preventScroll: true });

  window.AvendorWalkTest = Object.freeze({
    hero,
    getMap: () => map,
    getPosition: () => ({
      ...position,
      scale: map ? map.getScale(position.y) : 1
    }),
    setBody,
    setDebug
  });
})();
