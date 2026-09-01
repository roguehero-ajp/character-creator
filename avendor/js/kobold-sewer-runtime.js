(() => {
  'use strict';

  const VIEWPORT_WIDTH = 1448;
  const FRAME_COUNT = 6;
  const WALK_FRAME_MS = 150;
  const ATTACK_DISTANCE = 112;

  const SHEETS = Object.freeze({
    regular: 'assets/sprites/creatures/kobolds/regular-walk-ew.webp',
    champion: 'assets/sprites/creatures/kobolds/champion-walk-ew.webp',
    wizard: 'assets/sprites/creatures/kobolds/wizard-walk-ew.webp',
    chieftain: 'assets/sprites/creatures/kobolds/chieftain-walk-ew.webp'
  });

  const SPEEDS = Object.freeze({ regular: 92, champion: 72, wizard: 64, chieftain: 60 });
  const DISPLAY_WIDTH = Object.freeze({ regular: 176, champion: 194, wizard: 180, chieftain: 214 });

  const stage = document.getElementById('walk-stage');
  const stageArt = stage?.querySelector('.stage-art');
  const player = document.getElementById('player');
  const mark = document.getElementById('confusion-mark');
  const debugCanvas = document.getElementById('map-debug-layer');
  const geometryCanvas = document.getElementById('geometry-sketch-layer');
  if (!stage || !stageArt || !player || !window.AvendorWalkTest) return;

  const style = document.createElement('style');
  style.textContent = `
    .kobold-runtime-sprite {
      position: absolute;
      aspect-ratio: 1 / 1;
      transform-origin: 50% 100%;
      transform: translate(-50%, -100%) scale(var(--kobold-scale, 1));
      background-repeat: no-repeat;
      background-size: 600% 100%;
      image-rendering: auto;
      filter: drop-shadow(0 5px 3px rgba(0,0,0,.42));
      pointer-events: none;
      user-select: none;
      will-change: left, top, background-position, transform;
    }
    .walk-stage[data-camera-scroll="true"] > .map-debug-layer,
    .walk-stage[data-camera-scroll="true"] > .geometry-sketch-layer {
      display: none !important;
    }
  `;
  document.head.appendChild(style);

  let currentAreaId = null;
  let kobolds = [];
  let lastNow = performance.now();
  let cameraX = 0;
  let encounterSerial = 0;

  function isSewerArea(areaId) {
    return /^briarwell-sewer-(?:0[1-9]|1[0-5])$/.test(areaId || '');
  }

  function isRoamingSewerArea(areaId) {
    return /^briarwell-sewer-(?:0[1-9]|1[0-4])$/.test(areaId || '');
  }

  function isSneaking() {
    const state = window.AvendorPlayerState?.load?.();
    return state?.sneaking === true || state?.conditions?.includes?.('sneaking');
  }

  function clearKobolds() {
    kobolds.forEach((record) => record.element.remove());
    kobolds = [];
  }

  function createSprite(definition) {
    const element = document.createElement('div');
    element.className = 'kobold-runtime-sprite';
    element.dataset.koboldId = definition.id;
    element.dataset.variant = definition.variant;
    element.setAttribute('aria-hidden', 'true');
    element.style.backgroundImage = `url("${SHEETS[definition.variant] || SHEETS.regular}")`;
    element.style.width = `${(DISPLAY_WIDTH[definition.variant] / VIEWPORT_WIDTH) * 100}%`;
    stage.insertBefore(element, debugCanvas || geometryCanvas || null);

    return {
      ...definition,
      element,
      facing: 'west',
      frame: 0,
      active: definition.active === true
    };
  }

  function addFixedArea15(sceneMap) {
    const groups = sceneMap.data.koboldEncounters?.groups || [];
    groups.forEach((group) => {
      group.members.forEach((member, index) => {
        kobolds.push(createSprite({
          id: `${group.id}-${index + 1}`,
          variant: member.variant || 'regular',
          x: member.x,
          y: member.y,
          detectionRadius: group.detectionRadius || 760,
          source: 'area15',
          groupId: group.id,
          active: false
        }));
      });
    });
  }

  function findRoamingSpawn(sceneMap, origin, index, direction) {
    const baseDistance = 330 + (index * 95);
    const yOffsets = [0, -82, 74, -142, 132];
    const preferredX = origin.x + (direction * baseDistance);
    const preferredY = Math.max(390, Math.min(sceneMap.height - 120, origin.y + yOffsets[index % yOffsets.length]));

    for (let radius = 0; radius <= 420; radius += 30) {
      for (const sign of [1, -1]) {
        const candidate = { x: preferredX + (radius * sign), y: preferredY };
        if (sceneMap.isWalkable(candidate.x, candidate.y) && !sceneMap.getTriggerAt(candidate)) return candidate;
      }
    }
    return { x: origin.x, y: origin.y };
  }

  function addRoamingEncounter(sceneMap, areaId) {
    const encounter = window.AvendorKoboldEncounters?.rollAreaEntry?.(areaId);
    if (!encounter || encounter.cleared) return;

    const heroPosition = window.AvendorWalkTest.getPosition();
    const direction = heroPosition.x > sceneMap.width / 2 ? -1 : 1;
    const variants = [
      ...Array(encounter.regular).fill('regular'),
      ...Array(encounter.champion).fill('champion')
    ];

    variants.forEach((variant, index) => {
      const spawn = findRoamingSpawn(sceneMap, heroPosition, index, direction);
      kobolds.push(createSprite({
        id: `roaming-${++encounterSerial}`,
        variant,
        x: spawn.x,
        y: spawn.y,
        detectionRadius: Infinity,
        source: 'roaming',
        active: true
      }));
    });
  }

  function handleAreaChange(sceneMap, area) {
    clearKobolds();
    currentAreaId = area?.id || sceneMap?.data?.id || null;
    if (!sceneMap || !isSewerArea(currentAreaId)) return;

    if (currentAreaId === 'briarwell-sewer-15') addFixedArea15(sceneMap);
    else if (isRoamingSewerArea(currentAreaId)) addRoamingEncounter(sceneMap, currentAreaId);
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function updateCamera(sceneMap, heroPosition) {
    const isWide = sceneMap.width > VIEWPORT_WIDTH;
    stage.dataset.cameraScroll = String(isWide);

    if (!isWide) {
      cameraX = 0;
      stageArt.style.left = '0';
      stageArt.style.width = '100%';
      stageArt.style.height = '100%';
      stage.style.setProperty('--stage-ratio', `${sceneMap.width} / ${sceneMap.height}`);
      return;
    }

    cameraX = clamp(heroPosition.x - (VIEWPORT_WIDTH * 0.5), 0, sceneMap.width - VIEWPORT_WIDTH);
    stage.style.setProperty('--stage-ratio', `${VIEWPORT_WIDTH} / ${sceneMap.height}`);
    stageArt.style.width = `${(sceneMap.width / VIEWPORT_WIDTH) * 100}%`;
    stageArt.style.height = '100%';
    stageArt.style.left = `${(-cameraX / VIEWPORT_WIDTH) * 100}%`;
    stageArt.style.top = '0';
  }

  function positionWorldElement(element, x, y, sceneMap, scale = 1) {
    const screenX = x - cameraX;
    element.style.left = `${(screenX / VIEWPORT_WIDTH) * 100}%`;
    element.style.top = `${(y / sceneMap.height) * 100}%`;
    element.style.setProperty('--kobold-scale', scale.toFixed(4));
    element.style.zIndex = String(sceneMap.getDepth(y));
  }

  function fixHeroScreenPosition(sceneMap, heroPosition) {
    if (sceneMap.width <= VIEWPORT_WIDTH) return;
    const screenX = heroPosition.x - cameraX;
    player.style.left = `${(screenX / VIEWPORT_WIDTH) * 100}%`;
    if (mark) {
      mark.style.left = `${(screenX / VIEWPORT_WIDTH) * 100}%`;
      mark.style.top = `${(Math.max(30, heroPosition.y - (190 * sceneMap.getScale(heroPosition.y))) / sceneMap.height) * 100}%`;
    }
  }

  function setFrame(record, moving, now) {
    const localFrame = moving ? Math.floor(now / WALK_FRAME_MS) % 3 : 0;
    const atlasFrame = record.facing === 'east' ? localFrame : localFrame + 3;
    record.frame = atlasFrame;
    record.element.style.backgroundPosition = `${(atlasFrame / (FRAME_COUNT - 1)) * 100}% 0`;
  }

  function updateKobold(record, sceneMap, heroPosition, dt, now) {
    const dx = heroPosition.x - record.x;
    const dy = heroPosition.y - record.y;
    const distance = Math.hypot(dx, dy);
    if (!record.active && distance <= record.detectionRadius) record.active = true;

    if (isSneaking()) {
      setFrame(record, false, now);
      positionWorldElement(record.element, record.x, record.y, sceneMap, sceneMap.getScale(record.y));
      return;
    }

    let moving = false;
    if (record.active && distance > ATTACK_DISTANCE) {
      const speed = SPEEDS[record.variant] || SPEEDS.regular;
      const magnitude = distance || 1;
      const step = Math.min(speed * dt, Math.max(0, distance - ATTACK_DISTANCE));
      const next = sceneMap.resolveMovement(
        { x: record.x, y: record.y },
        (dx / magnitude) * step,
        (dy / magnitude) * step
      );
      if (Math.hypot(next.x - record.x, next.y - record.y) > 0.01) {
        record.x = next.x;
        record.y = next.y;
        moving = true;
      }
    }

    record.facing = heroPosition.x >= record.x ? 'east' : 'west';
    setFrame(record, moving, now);
    positionWorldElement(record.element, record.x, record.y, sceneMap, sceneMap.getScale(record.y));
  }

  function tick(now) {
    const sceneMap = window.AvendorWalkTest.getMap();
    const area = window.AvendorWalkTest.getArea();

    if (sceneMap && area) {
      if (area.id !== currentAreaId) handleAreaChange(sceneMap, area);
      const heroPosition = window.AvendorWalkTest.getPosition();
      updateCamera(sceneMap, heroPosition);
      fixHeroScreenPosition(sceneMap, heroPosition);

      const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
      kobolds.forEach((record) => updateKobold(record, sceneMap, heroPosition, dt, now));
    }

    lastNow = now;
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  window.AvendorKoboldRuntime = Object.freeze({
    getKobolds: () => kobolds.map((record) => ({
      id: record.id,
      variant: record.variant,
      x: record.x,
      y: record.y,
      active: record.active,
      source: record.source
    })),
    getCameraX: () => cameraX
  });
})();
