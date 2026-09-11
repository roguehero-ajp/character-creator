(() => {
  'use strict';

  const BATTLE_AREA_ID = 'briarwell-dwarven-cave-battle-chamber';
  const CLIFFSIDE_AREA_ID = 'briarwell-dwarven-cave-cliffside';
  const TREASURE_STORAGE_KEY = 'avendorDwarvenCaveTreasure.v1';
  const SCENIC_LOCK_ID = 'dwarven-cliffside-vista';
  const VIEWPORT_WIDTH = 1448;

  function randomInt(minimum, maximum) {
    const range = maximum - minimum + 1;
    if (window.crypto?.getRandomValues) {
      const bucket = new Uint32Array(1);
      window.crypto.getRandomValues(bucket);
      return minimum + (bucket[0] % range);
    }
    return minimum + Math.floor(Math.random() * range);
  }

  function rollTreasure(loot, roller = randomInt) {
    return {
      silver: roller(loot.silver.minimum, loot.silver.maximum),
      gold: roller(loot.gold.minimum, loot.gold.maximum)
    };
  }

  function pointInPolygon(point, polygon) {
    const [x, y] = point;
    let inside = false;
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
      const [x1, y1] = polygon[index];
      const [x2, y2] = polygon[previous];
      const crosses = ((y1 > y) !== (y2 > y))
        && (x < (((x2 - x1) * (y - y1)) / ((y2 - y1) || Number.EPSILON)) + x1);
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function readTreasureState() {
    try {
      const stored = JSON.parse(localStorage.getItem(TREASURE_STORAGE_KEY) || 'null');
      if (stored?.loot && Number.isInteger(stored.loot.silver) && Number.isInteger(stored.loot.gold)) {
        return { loot: stored.loot };
      }
    } catch (_) {
      // A corrupt development save simply restores the unopened chest.
    }
    return { loot: null };
  }

  function saveTreasureState(state) {
    localStorage.setItem(TREASURE_STORAGE_KEY, JSON.stringify(state));
    return state;
  }

  window.AvendorDwarvenCave = Object.freeze({
    BATTLE_AREA_ID,
    CLIFFSIDE_AREA_ID,
    TREASURE_STORAGE_KEY,
    pointInPolygon,
    rollTreasure,
    readTreasureState,
    saveTreasureState
  });

  if (typeof document === 'undefined' || !window.AvendorWalkTest) return;

  const stage = document.getElementById('walk-stage');
  const debugCanvas = document.getElementById('map-debug-layer');
  const geometryCanvas = document.getElementById('geometry-sketch-layer');
  if (!stage) return;

  const style = document.createElement('style');
  style.textContent = `
    .dwarven-goblin-placeholder {
      position: absolute;
      width: 5.1%;
      aspect-ratio: .58;
      transform: translate(-50%, -100%) scale(var(--dwarven-actor-scale, 1));
      transform-origin: 50% 100%;
      clip-path: polygon(38% 0, 62% 0, 69% 8%, 87% 14%, 76% 24%, 91% 39%, 76% 47%, 72% 100%, 53% 100%, 50% 67%, 47% 67%, 43% 100%, 24% 100%, 27% 47%, 9% 39%, 24% 23%, 13% 14%, 31% 8%);
      background:
        radial-gradient(circle at 50% 11%, #78845c 0 12%, #3d472f 13% 20%, transparent 21%),
        linear-gradient(90deg, #17150f 0 15%, #59482c 37% 63%, #17150f 85% 100%);
      border-bottom: 4px solid rgba(8, 7, 5, .75);
      filter: drop-shadow(0 6px 4px rgba(0, 0, 0, .7));
      pointer-events: none;
      user-select: none;
    }
    .dwarven-goblin-placeholder[data-variant="hobgoblin"] {
      width: 6.2%;
      background:
        radial-gradient(circle at 50% 11%, #8b6042 0 12%, #49301f 13% 20%, transparent 21%),
        linear-gradient(90deg, #17110d 0 13%, #66412a 35% 65%, #17110d 87% 100%);
    }
    .dwarven-goblin-placeholder[data-variant="chieftain"] {
      width: 8%;
      clip-path: polygon(40% 0, 60% 0, 66% 7%, 82% 11%, 94% 25%, 82% 40%, 76% 100%, 56% 100%, 52% 62%, 48% 62%, 44% 100%, 24% 100%, 18% 40%, 6% 25%, 18% 11%, 34% 7%);
      background:
        radial-gradient(circle at 50% 10%, #9b6540 0 11%, #4d2d1b 12% 19%, transparent 20%),
        radial-gradient(ellipse at 50% 36%, #745038 0 29%, #24170f 58%, transparent 60%),
        linear-gradient(90deg, #140d09 0 11%, #5d3824 33% 67%, #140d09 89% 100%);
    }
    .dwarven-scenic-view {
      position: absolute;
      inset: 0;
      z-index: 12000;
      display: grid;
      overflow: hidden;
      background: #080d15;
      opacity: 0;
      transition: opacity .7s ease;
      pointer-events: none;
    }
    .dwarven-scenic-view.show {
      opacity: 1;
      pointer-events: auto;
    }
    .dwarven-scenic-view[hidden] { display: none; }
    .dwarven-scenic-view img {
      grid-area: 1 / 1;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .dwarven-scenic-caption {
      grid-area: 1 / 1;
      align-self: end;
      z-index: 1;
      margin: 0;
      padding: 7% 18% 3.5%;
      color: #f2dfb3;
      font: italic 500 clamp(16px, 2.1vw, 34px)/1.3 Georgia, 'Times New Roman', serif;
      text-align: center;
      text-shadow: 0 2px 5px #000, 0 0 16px #000;
      background: linear-gradient(transparent, rgba(5, 8, 13, .78));
    }
    .dwarven-scenic-close {
      position: absolute;
      right: 2.2%;
      bottom: 2.2%;
      z-index: 2;
      padding: .55em .9em;
      border: 1px solid rgba(235, 211, 157, .75);
      border-radius: .25em;
      color: #f4dfaf;
      background: rgba(12, 15, 20, .82);
      font: 600 clamp(12px, 1.2vw, 18px)/1.2 Georgia, serif;
      cursor: pointer;
    }
    .dwarven-scenic-close:focus-visible { outline: 3px solid #fff0ad; outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) {
      .dwarven-scenic-view { transition: none; }
    }
  `;
  document.head.appendChild(style);

  const scenic = document.createElement('section');
  scenic.className = 'dwarven-scenic-view';
  scenic.hidden = true;
  scenic.setAttribute('role', 'dialog');
  scenic.setAttribute('aria-modal', 'true');
  scenic.setAttribute('aria-label', 'View of Briarwell from the Dwarven Cliffside');

  const scenicImage = document.createElement('img');
  scenicImage.alt = '';
  const scenicCaption = document.createElement('p');
  scenicCaption.className = 'dwarven-scenic-caption';
  const scenicClose = document.createElement('button');
  scenicClose.className = 'dwarven-scenic-close';
  scenicClose.type = 'button';
  scenicClose.textContent = 'Return to the cliff';
  scenic.append(scenicImage, scenicCaption, scenicClose);
  stage.appendChild(scenic);

  let areaId = null;
  let sceneMap = null;
  let actorRecords = [];
  let scenicConfig = null;
  let scenicOpen = false;
  let wasInsideScenicTrigger = false;

  function clearActors() {
    actorRecords.forEach((record) => record.element.remove());
    actorRecords = [];
    delete stage.dataset.dwarvenBattle;
  }

  function mountBattle(map) {
    const actors = map.data.goblinEncounter?.actors || [];
    actorRecords = actors.map((actor) => {
      const element = document.createElement('div');
      element.className = 'dwarven-goblin-placeholder';
      element.dataset.actorId = actor.id;
      element.dataset.variant = actor.variant;
      element.dataset.spriteStatus = actor.spriteStatus;
      element.setAttribute('aria-hidden', 'true');
      stage.insertBefore(element, debugCanvas || geometryCanvas || null);
      return { actor, element };
    });
    stage.dataset.dwarvenBattle = 'staged';
  }

  function positionActors(map) {
    if (!actorRecords.length) return;
    const cameraX = Number(window.AvendorKoboldRuntime?.getCameraX?.()) || 0;
    actorRecords.forEach(({ actor, element }) => {
      const screenX = actor.x - cameraX;
      element.style.left = `${(screenX / VIEWPORT_WIDTH) * 100}%`;
      element.style.top = `${(actor.y / map.height) * 100}%`;
      element.style.setProperty(
        '--dwarven-actor-scale',
        (map.getScale(actor.y) * actor.scale).toFixed(4)
      );
      element.style.zIndex = String(map.getDepth(actor.y));
    });
  }

  function closeScenic({ restoreFocus = true } = {}) {
    if (!scenicOpen) return;
    scenicOpen = false;
    scenic.classList.remove('show');
    stage.dataset.dwarvenScenicView = 'closed';
    window.AvendorWalkTest.setMovementLock?.(SCENIC_LOCK_ID, false);
    window.setTimeout(() => {
      if (!scenicOpen) scenic.hidden = true;
    }, 700);
    if (restoreFocus) stage.focus({ preventScroll: true });
  }

  function openScenic(config) {
    if (!config || scenicOpen) return false;
    scenicConfig = config;
    scenicImage.src = config.image;
    scenicImage.alt = config.alt || '';
    scenicCaption.textContent = config.caption || '';
    scenic.hidden = false;
    scenicOpen = true;
    stage.dataset.dwarvenScenicView = 'open';
    window.AvendorWalkTest.setMovementLock?.(SCENIC_LOCK_ID, true);
    window.requestAnimationFrame(() => scenic.classList.add('show'));
    scenicClose.focus({ preventScroll: true });
    return true;
  }

  scenicClose.addEventListener('click', () => closeScenic());
  window.addEventListener('keydown', (event) => {
    if (!scenicOpen || !['Escape', 'Enter', ' ', 'e', 'E'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    closeScenic();
  }, true);

  window.addEventListener('avendor:feature-interaction', (event) => {
    const feature = event.detail?.feature;
    if (feature?.action !== 'roll-dwarven-treasure') return;
    event.preventDefault();
    let state = readTreasureState();
    const firstOpening = !state.loot;
    if (firstOpening) {
      state = saveTreasureState({ loot: rollTreasure(feature.loot) });
    }
    const prefix = firstOpening
      ? 'The ancient lock yields. Inside you find'
      : 'The open chest contains';
    window.AvendorWalkTest.setNotice?.(
      `${prefix} ${state.loot.silver} silver pieces and ${state.loot.gold} gold pieces.`,
      5200
    );
    stage.dataset.dwarvenTreasure = 'opened';
  });

  function handleAreaChange(nextAreaId, nextMap) {
    clearActors();
    closeScenic({ restoreFocus: false });
    areaId = nextAreaId;
    sceneMap = nextMap;
    scenicConfig = nextMap?.data?.scenicView || null;
    wasInsideScenicTrigger = false;
    if (areaId === BATTLE_AREA_ID && nextMap) mountBattle(nextMap);
  }

  function tick() {
    const nextArea = window.AvendorWalkTest.getArea?.();
    const nextMap = window.AvendorWalkTest.getMap?.();
    const nextAreaId = nextArea?.id || nextMap?.data?.id || null;
    if (nextAreaId !== areaId) handleAreaChange(nextAreaId, nextMap);

    if (areaId === BATTLE_AREA_ID && sceneMap) positionActors(sceneMap);

    if (areaId === CLIFFSIDE_AREA_ID && sceneMap && scenicConfig) {
      const position = window.AvendorWalkTest.getPosition?.();
      const points = scenicConfig.trigger?.points || [];
      const inside = Boolean(position && points.length >= 3 && pointInPolygon([position.x, position.y], points));
      if (inside && !wasInsideScenicTrigger && !scenicOpen) openScenic(scenicConfig);
      wasInsideScenicTrigger = inside;
    }

    window.requestAnimationFrame(tick);
  }

  window.requestAnimationFrame(tick);

  window.AvendorDwarvenCaveRuntime = Object.freeze({
    closeScenic,
    openScenic: () => openScenic(scenicConfig),
    getActors: () => actorRecords.map(({ actor }) => ({ ...actor })),
    getState: () => ({
      areaId,
      actorCount: actorRecords.length,
      scenicOpen,
      treasure: readTreasureState()
    })
  });
})();
