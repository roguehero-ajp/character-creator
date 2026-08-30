(() => {
  'use strict';

  const REGISTRY_URL = 'data/maps/briarwell-area-registry.json';
  const DISCOVERY_STORAGE_KEY = 'avendorDiscoveries.v1';
  const DEFAULT_HELP = 'WASD or arrow keys to walk. E or Space interacts with nearby people and features. F2 shows the authored map geometry.';
  const TRANSITION_FADE_MS = 180;

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
  const AreaRegistry = window.AvendorWorldMap?.AreaRegistry;
  const Sprite = window.AvendorSpriteEngine?.LayeredSprite;
  const WALK_STEP_SECONDS = (window.AvendorSpriteEngine?.WALK_FRAME_MS || 110) / 1000;
  if (!MapGeometry || !AreaRegistry || !Sprite) {
    throw new Error('The map, world-map and sprite engines must load before walk-test.js.');
  }

  const hero = new Sprite(playerCanvas, { body: 'male' });
  const npcSprites = new Map();
  const areaMapCache = new Map();
  const keys = new Set();
  const movementControls = new Set([
    'w', 'a', 's', 'd',
    'arrowup', 'arrowleft', 'arrowdown', 'arrowright'
  ]);

  let registry = null;
  let currentArea = null;
  let map = null;
  let position = { x: 724, y: 900 };
  let lastSafePosition = { ...position, facing: 'north' };
  let lastDirection = 'north';
  let transitionLock = false;
  let activeTriggerId = null;
  let musicStarted = false;
  let debugVisible = false;
  let nearbyId = null;
  let noticeTimer = 0;
  let lastStatusText = '';
  let areaLoadRequestId = 0;

  audio.volume = 0.18;

  function delay(duration) {
    return new Promise((resolve) => window.setTimeout(resolve, duration));
  }

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
      help.textContent = DEFAULT_HELP;
    }, duration);
  }

  function readDiscoveries() {
    try {
      const stored = JSON.parse(localStorage.getItem(DISCOVERY_STORAGE_KEY) || '[]');
      return new Set(Array.isArray(stored) ? stored : []);
    } catch (_) {
      return new Set();
    }
  }

  function isDiscovered(discoveryId) {
    return Boolean(discoveryId && readDiscoveries().has(discoveryId));
  }

  function rememberDiscovery(discoveryId) {
    if (!discoveryId) return;
    const discoveries = readDiscoveries();
    discoveries.add(discoveryId);
    localStorage.setItem(DISCOVERY_STORAGE_KEY, JSON.stringify([...discoveries].sort()));
  }

  function randomInt(minimum, maximum) {
    const range = maximum - minimum + 1;
    if (window.crypto?.getRandomValues) {
      const bucket = new Uint32Array(1);
      window.crypto.getRandomValues(bucket);
      return minimum + (bucket[0] % range);
    }
    return minimum + Math.floor(Math.random() * range);
  }

  function runTransitionCheck(transition) {
    const check = transition.check;
    if (!check || isDiscovered(check.discoveryId)) return true;
    if (check.type !== 'stat') return false;

    const state = window.AvendorPlayerState?.load?.();
    const statValue = Number(state?.stats?.[check.stat]) || 5;
    const roll = randomInt(1, 10);
    const total = statValue + roll;
    if (total >= check.target) {
      rememberDiscovery(check.discoveryId);
      setNotice(`${check.successText} Perception test: ${total}/${check.target}.`, 4200);
      updateInteractionPrompt();
      return false;
    }

    setNotice(`${check.failureText} Perception test: ${total}/${check.target}.`, 3600);
    return false;
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

  function getAreaStatusName() {
    const title = currentArea?.title || map?.data?.title || 'Map';
    return title
      .replace(/^Briarwell\s*-\s*/i, '')
      .replace(/\s*\(unassigned\)$/i, '')
      .toUpperCase();
  }

  function updateRigStatus() {
    if (!map) return;
    const spriteStatus = hero.getStatus();
    const frame = spriteStatus.state === 'walk' ? ` ${spriteStatus.frame + 1}` : '';
    const nextText = [
      `${getAreaStatusName()} MAP ${map.data.version}`,
      `HERO ART ${spriteStatus.artVersion}`,
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
      prompt.setAttribute('aria-hidden', 'true');
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
      let verb = nearby.type === 'npc' ? 'Talk to' : 'Inspect';
      if (nearby.type === 'transition') {
        verb = nearby.check && !isDiscovered(nearby.check.discoveryId) ? 'Inspect' : 'Use';
      }
      prompt.textContent = `E  ${verb} ${nearby.label}`;
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

    if (nearby.type === 'npc') {
      setNotice(nearby.interactionText || `${nearby.label} has nothing to say just now.`, 3200);
      return;
    }

    if (nearby.type === 'transition') {
      if (!runTransitionCheck(nearby)) return;
      void handleTrigger(nearby);
      return;
    }

    const developmentNotes = {
      'town-well': 'Town well interaction registered. The future sewer entrance is sealed in this map state.',
      'direction-signpost': 'Road sign interaction registered: Northgate, Stonefield, Elderwood and Riverrun.',
      'fruit-stall': 'Fanny Allwood keeps the fruit stall stocked and ready for customers.',
      'lodestone-tavern-sign': 'Lodestone Tavern interaction anchor registered.',
      'general-store-front': 'General Store interaction anchor registered.'
    };
    setNotice(
      nearby.interactionText
      || developmentNotes[nearby.id]
      || `${nearby.label} interaction registered.`
    );
  }

  function triggerConfusion(message) {
    player.classList.remove('confused');
    mark.classList.remove('show');
    void player.offsetWidth;
    player.classList.add('confused');
    mark.classList.add('show');
    setNotice(message, 1800);
  }

  function preloadMapArt(sceneMap) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        if (image.naturalWidth !== sceneMap.width || image.naturalHeight !== sceneMap.height) {
          reject(new Error(
            `Map art dimensions do not match ${sceneMap.data.id}: `
            + `${image.naturalWidth}x${image.naturalHeight} instead of ${sceneMap.width}x${sceneMap.height}.`
          ));
          return;
        }
        resolve(image);
      };
      image.onerror = () => reject(new Error(`Could not load map art: ${sceneMap.data.art.background}`));
      image.src = sceneMap.data.art.background;
    });
  }

  function getAreaMap(area) {
    if (!areaMapCache.has(area.id)) {
      const loading = MapGeometry.load(area.map).catch((error) => {
        areaMapCache.delete(area.id);
        throw error;
      });
      areaMapCache.set(area.id, loading);
    }
    return areaMapCache.get(area.id);
  }

  function createOccluders(sceneMap, areaId) {
    const occluders = sceneMap.data.depthOccluders || [];
    const groups = new Map();
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const safeAreaId = areaId.replace(/[^a-z0-9-]/gi, '-');

    occluders.forEach((definition) => {
      const group = groups.get(definition.depthY) || [];
      group.push(definition);
      groups.set(definition.depthY, group);
    });

    return [...groups.entries()]
      .sort(([leftDepth], [rightDepth]) => leftDepth - rightDepth)
      .map(([depthY, definitions], index) => {
        const layer = document.createElementNS(svgNamespace, 'svg');
        const clipId = `${safeAreaId}-occlusion-${index}`;
        layer.classList.add('scene-occluder');
        layer.dataset.occluderDepth = String(depthY);
        layer.dataset.occluderIds = definitions.map((definition) => definition.id).join(',');
        layer.setAttribute('viewBox', `0 0 ${sceneMap.width} ${sceneMap.height}`);
        layer.setAttribute('preserveAspectRatio', 'none');
        layer.setAttribute('aria-hidden', 'true');
        layer.style.zIndex = String(sceneMap.getDepth(depthY));

        const defs = document.createElementNS(svgNamespace, 'defs');
        const clipPath = document.createElementNS(svgNamespace, 'clipPath');
        clipPath.id = clipId;
        clipPath.setAttribute('clipPathUnits', 'userSpaceOnUse');
        definitions.forEach((definition) => {
          const polygon = document.createElementNS(svgNamespace, 'polygon');
          polygon.dataset.occluderId = definition.id;
          polygon.setAttribute(
            'points',
            definition.points.map((point) => point.join(',')).join(' ')
          );
          clipPath.appendChild(polygon);
        });
        defs.appendChild(clipPath);
        layer.appendChild(defs);

        const image = document.createElementNS(svgNamespace, 'image');
        image.setAttribute('href', sceneMap.data.art.background);
        image.setAttribute('x', '0');
        image.setAttribute('y', '0');
        image.setAttribute('width', String(sceneMap.width));
        image.setAttribute('height', String(sceneMap.height));
        image.setAttribute('preserveAspectRatio', 'none');
        image.setAttribute('clip-path', `url(#${clipId})`);
        layer.appendChild(image);
        return layer;
      });
  }

  async function prepareNpcs(sceneMap) {
    return Promise.all(sceneMap.npcs.map(async (definition) => {
      const element = document.createElement('div');
      element.className = 'map-npc';
      element.dataset.npcId = definition.id;
      element.setAttribute('aria-hidden', 'true');
      element.style.left = `${(definition.x / sceneMap.width) * 100}%`;
      element.style.top = `${(definition.y / sceneMap.height) * 100}%`;
      element.style.setProperty('--perspective-scale', sceneMap.getScale(definition.y).toFixed(4));
      element.style.zIndex = String(sceneMap.getDepth(definition.y));

      const canvas = document.createElement('canvas');
      canvas.className = 'map-npc-canvas';
      canvas.width = window.AvendorSpriteEngine.FRAME_W;
      canvas.height = window.AvendorSpriteEngine.FRAME_H;
      element.appendChild(canvas);

      const sprite = new Sprite(canvas);
      await sprite.setLayers([{
        id: 'body',
        idle: definition.sprite.idle,
        coverage: 'full-body'
      }]);
      sprite.setMotion('idle', definition.facing);
      sprite.draw();
      return { definition, element, sprite };
    }));
  }

  function mountPreparedScene(occluders, residents) {
    stage.querySelectorAll('.scene-occluder, .map-npc').forEach((element) => element.remove());
    npcSprites.clear();

    occluders.forEach((element) => stage.insertBefore(element, debugCanvas));
    residents.forEach((record) => {
      npcSprites.set(record.definition.id, record);
      stage.insertBefore(record.element, debugCanvas);
    });
  }

  async function loadArea(areaId, spawnId = 'default') {
    const requestId = ++areaLoadRequestId;
    if (!registry) throw new Error('The Briarwell area registry is not loaded.');
    const area = registry.getArea(areaId);
    if (!area) throw new Error(`Unknown Briarwell area: ${areaId}`);
    if (area.status !== 'playable' || !area.map) {
      throw new Error(`Briarwell area is not playable yet: ${areaId}`);
    }

    const nextMap = await getAreaMap(area);
    if (nextMap.data.id !== area.id) {
      throw new Error(`Registry/map id mismatch: ${area.id} -> ${nextMap.data.id}`);
    }

    const spawn = nextMap.getExactSpawn(spawnId);
    if (!spawn) throw new Error(`Spawn does not exist: ${area.id}/${spawnId}`);
    if (!nextMap.isWalkable(spawn.x, spawn.y)) {
      throw new Error(`Spawn is blocked: ${area.id}/${spawnId}`);
    }
    if (nextMap.getTriggerAt(spawn)) {
      throw new Error(`Spawn overlaps a transition trigger: ${area.id}/${spawnId}`);
    }

    const [, residents] = await Promise.all([
      preloadMapArt(nextMap),
      prepareNpcs(nextMap)
    ]);
    if (requestId !== areaLoadRequestId) {
      throw new Error(`Area load was superseded: ${areaId}`);
    }
    const occluders = createOccluders(nextMap, area.id);

    mountPreparedScene(occluders, residents);
    map = nextMap;
    currentArea = area;
    position = { x: spawn.x, y: spawn.y };
    lastDirection = spawn.facing || lastDirection;
    lastSafePosition = { ...position, facing: lastDirection };
    activeTriggerId = null;
    nearbyId = null;
    lastStatusText = '';

    stage.style.setProperty('--stage-ratio', `${map.width} / ${map.height}`);
    stage.dataset.areaId = area.id;
    stage.setAttribute(
      'aria-label',
      `${area.title} gameplay map. Use W A S D or arrow keys to move.`
    );
    stageArt.src = map.data.art.background;
    stageArt.alt = map.data.art.alt || area.title;
    window.AvendorMapEngine.drawDebugMap(debugCanvas, map);
    hero.setMotion('idle', lastDirection);
    hero.draw();
    setPosition();
    updateInteractionPrompt();
    return map;
  }

  function isSafePosition(candidate) {
    return Boolean(
      candidate
      && map.isWalkable(candidate.x, candidate.y)
      && !map.getTriggerAt(candidate)
    );
  }

  function findSafeFallback(trigger) {
    const candidates = [
      map.getExactSpawn(trigger.fallbackSpawn),
      lastSafePosition,
      map.getExactSpawn('default')
    ];
    const authored = candidates.find(isSafePosition);
    if (authored) return authored;

    for (let radius = 24; radius <= 480; radius += 24) {
      for (let index = 0; index < 16; index += 1) {
        const angle = (Math.PI * 2 * index) / 16;
        const candidate = {
          x: position.x + (Math.cos(angle) * radius),
          y: position.y + (Math.sin(angle) * radius),
          facing: lastDirection
        };
        if (isSafePosition(candidate)) return candidate;
      }
    }
    return null;
  }

  function returnToSafePosition(trigger) {
    const fallback = findSafeFallback(trigger);
    if (!fallback) {
      throw new Error(`No safe fallback is available for ${map.data.id}/${trigger.id}.`);
    }
    position = { x: fallback.x, y: fallback.y };
    lastDirection = fallback.facing || lastDirection;
    lastSafePosition = { ...position, facing: lastDirection };
    setPosition();
  }

  function unavailableTransitionMessage(trigger, resolution) {
    if (resolution.reason === 'unassigned') {
      return `${trigger.label} is waiting for the numbered town layout. The hero returned safely.`;
    }
    return `${trigger.label} leads to ${resolution.area.title}, which is planned but not playable yet.`;
  }

  async function handleTrigger(trigger) {
    if (!map || !registry || transitionLock || activeTriggerId === trigger.id) return;
    transitionLock = true;
    activeTriggerId = trigger.id;
    keys.clear();
    hero.setMotion('idle', lastDirection);
    updateInteractionPrompt();

    const sourceMap = map;
    const resolution = registry.resolveTransition(trigger);

    try {
      if (resolution.state !== 'ready') {
        returnToSafePosition(trigger);
        const message = resolution.state === 'unavailable'
          ? unavailableTransitionMessage(trigger, resolution)
          : `${trigger.label} has an incomplete map link. The hero returned safely.`;
        triggerConfusion(message);
        await delay(1800);
        return;
      }

      stage.classList.add('map-transitioning');
      setNotice(`Travelling to ${resolution.area.title}...`, 2200);
      await delay(TRANSITION_FADE_MS);

      try {
        await loadArea(resolution.targetAreaId, resolution.spawnId);
        setNotice(`${resolution.area.title} loaded.`, 1800);
      } catch (error) {
        console.error(error);
        if (map === sourceMap) returnToSafePosition(trigger);
        triggerConfusion(`${trigger.label} could not be loaded. The hero returned safely.`);
      } finally {
        stage.classList.remove('map-transitioning');
        await delay(TRANSITION_FADE_MS);
      }
    } catch (error) {
      console.error(error);
      setNotice('This transition has no safe return point. Check the map data.', 3200);
    } finally {
      player.classList.remove('confused');
      mark.classList.remove('show');
      transitionLock = false;
      activeTriggerId = null;
      setPosition();
      updateInteractionPrompt();
    }
  }

  function setDebug(visible) {
    debugVisible = Boolean(visible);
    debugCanvas.classList.toggle('show', debugVisible);
    debugButton.classList.toggle('selected', debugVisible);
    debugButton.setAttribute('aria-pressed', String(debugVisible));
    debugButton.textContent = `Map debug: ${debugVisible ? 'on' : 'off'}`;
    if (debugVisible && map) {
      setNotice('Map debug: green is walkable, red is solid, blue is an outdoor exit, purple is a door, gold dashed shapes are depth occluders and gold dots are resident positions.', 3600);
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
    if (map && !transitionLock) {
      let { dx, dy } = readMovementVector();
      const requestedMovement = dx !== 0 || dy !== 0;

      if (requestedMovement) {
        lastDirection = directionFromVector(dx, dy);
        const magnitude = Math.hypot(dx, dy) || 1;
        dx /= magnitude;
        dy /= magnitude;

        hero.setMotion('walk', lastDirection);
        const advancedFrames = hero.update(now);

        if (advancedFrames > 0) {
          const next = map.resolveMovement(
            position,
            dx * map.data.movement.speedX * WALK_STEP_SECONDS,
            dy * map.data.movement.speedY * WALK_STEP_SECONDS
          );
          const moved = Math.hypot(next.x - position.x, next.y - position.y) > 0.01;

          if (moved) {
            position = next;
            setPosition();

            const trigger = map.getTriggerAt(position);
            if (trigger) {
              void handleTrigger(trigger);
            } else {
              activeTriggerId = null;
              lastSafePosition = { ...position, facing: lastDirection };
            }
          }
        }
      } else {
        hero.setMotion('idle', lastDirection);
        hero.update(now);
      }

      updateInteractionPrompt();
    } else {
      hero.setMotion('idle', lastDirection);
      hero.update(now);
    }

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
      registry = await AreaRegistry.load(REGISTRY_URL);
      const storedBody = sessionStorage.getItem('avendorHeroBody');
      await setBody(storedBody === 'female' ? 'female' : 'male');

      const start = registry.getStart();
      const params = new URLSearchParams(window.location.search);
      const requestedAreaId = params.get('area');
      const requestedArea = requestedAreaId ? registry.getArea(requestedAreaId) : null;
      const directEntry = requestedArea?.status === 'playable'
        ? {
          areaId: requestedArea.id,
          spawnId: params.get('spawn') || 'default'
        }
        : start;

      try {
        await loadArea(directEntry.areaId, directEntry.spawnId);
      } catch (directEntryError) {
        if (directEntry.areaId === start.areaId && directEntry.spawnId === start.spawnId) {
          throw directEntryError;
        }
        console.warn(directEntryError);
        await loadArea(start.areaId, start.spawnId);
      }

      hero.setMotion('idle', lastDirection);
      hero.draw();
      setPosition();
      updateInteractionPrompt();
      const directEntryWarning = requestedAreaId && requestedArea?.status !== 'playable'
        ? ` Requested area ${requestedAreaId} is not playable, so the registry start was used.`
        : '';
      setNotice(
        `${currentArea.title} map data loaded. ${map.data.collisions.length} foot-level collision regions, `
        + `${map.data.exits.length} outdoor exits, ${map.data.portals.length} building portals and `
        + `${map.npcs.length} residents are active.${directEntryWarning}`,
        3600
      );
    } catch (error) {
      console.error(error);
      status.textContent = 'BRIARWELL MAP LOAD ERROR';
      sceneStatus.textContent = 'The Briarwell map registry could not be loaded.';
      help.textContent = 'Map load failed. Open the browser console for details.';
    }
  }

  if (sessionStorage.getItem('avendorMusicWanted') === '1') startMusic();
  boot();
  requestAnimationFrame(tick);
  stage.focus({ preventScroll: true });

  window.AvendorWalkTest = Object.freeze({
    hero,
    getNpcs: () => [...npcSprites.values()],
    getMap: () => map,
    getArea: () => currentArea,
    getRegistry: () => registry,
    getPosition: () => ({
      ...position,
      scale: map ? map.getScale(position.y) : 1
    }),
    loadArea,
    setBody,
    setDebug
  });
})();
