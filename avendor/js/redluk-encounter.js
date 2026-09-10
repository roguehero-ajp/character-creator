(() => {
  'use strict';

  const AREA_ID = 'briarwell-redluk';
  const LOCK_ID = 'redluk-orc-convergence';
  const VIEWPORT_WIDTH = 1448;

  function clamp(value, minimum = 0, maximum = 1) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function smoothstep(value) {
    const t = clamp(value);
    return t * t * (3 - (2 * t));
  }

  function interpolatePoint(start, end, progress) {
    const t = clamp(progress);
    return {
      x: start.x + ((end.x - start.x) * t),
      y: start.y + ((end.y - start.y) * t)
    };
  }

  function getPhase(config, elapsedMs) {
    const timing = config.timing;
    if (elapsedMs < timing.advanceMs) return 'emerging';
    if (elapsedMs < timing.stopMs) return 'closing-in';
    if (elapsedMs < timing.elderEntryMs) return 'stopped';
    if (elapsedMs < timing.completeMs) return 'elder-entering';
    return 'complete';
  }

  function getRankState(actor, config, elapsedMs) {
    const timing = config.timing;
    if (elapsedMs < timing.advanceMs) {
      const progress = smoothstep(elapsedMs / Math.max(1, timing.advanceMs));
      return {
        ...interpolatePoint({ x: actor.start.x, y: actor.start.y - 42 }, actor.start, progress),
        opacity: progress,
        moving: progress > 0 && progress < 1
      };
    }

    const progress = smoothstep(
      (elapsedMs - timing.advanceMs) / Math.max(1, timing.stopMs - timing.advanceMs)
    );
    return {
      ...interpolatePoint(actor.start, actor.halt, progress),
      opacity: 1,
      moving: elapsedMs < timing.stopMs
    };
  }

  function getElderState(config, elapsedMs) {
    const actor = config.elderOrc;
    if (elapsedMs < config.timing.elderEntryMs) {
      return { ...actor.start, opacity: 0, moving: false };
    }
    const progress = smoothstep(
      (elapsedMs - config.timing.elderEntryMs)
      / Math.max(1, config.timing.completeMs - config.timing.elderEntryMs)
    );
    return {
      ...interpolatePoint(actor.start, actor.halt, progress),
      opacity: progress,
      moving: progress < 1
    };
  }

  function getTimelineState(config, elapsedMs) {
    const elapsed = Math.max(0, Number(elapsedMs) || 0);
    const quietStop = config.beats.find((beat) => beat.id === 'quiet-stop');
    const showCaption = elapsed >= config.timing.stopMs
      && elapsed < config.timing.elderEntryMs + 900;

    return {
      elapsedMs: elapsed,
      phase: getPhase(config, elapsed),
      complete: elapsed >= config.timing.completeMs,
      caption: showCaption ? quietStop?.line || '' : '',
      ranks: config.actors.map((actor) => ({
        id: actor.id,
        scale: actor.scale,
        ...getRankState(actor, config, elapsed)
      })),
      elder: {
        id: config.elderOrc.id,
        scale: config.elderOrc.scale,
        ...getElderState(config, elapsed)
      }
    };
  }

  function crossedTrigger(config, previousX, nextX) {
    const boundary = config.trigger.x;
    if (!Number.isFinite(boundary) || !Number.isFinite(nextX)) return false;
    if (config.trigger.direction === 'west') {
      return nextX <= boundary && (!Number.isFinite(previousX) || previousX > boundary);
    }
    return nextX >= boundary && (!Number.isFinite(previousX) || previousX < boundary);
  }

  window.AvendorRedlukEncounter = Object.freeze({
    AREA_ID,
    getPhase,
    getRankState,
    getElderState,
    getTimelineState,
    crossedTrigger
  });

  if (typeof document === 'undefined' || !window.AvendorWalkTest) return;

  const stage = document.getElementById('walk-stage');
  const debugCanvas = document.getElementById('map-debug-layer');
  const geometryCanvas = document.getElementById('geometry-sketch-layer');
  if (!stage) return;

  const style = document.createElement('style');
  style.textContent = `
    .redluk-orc-placeholder {
      position: absolute;
      width: 5.25%;
      aspect-ratio: .58;
      transform: translate(-50%, -100%) scale(var(--redluk-actor-scale, 1));
      transform-origin: 50% 100%;
      clip-path: polygon(39% 0, 61% 0, 67% 9%, 78% 13%, 73% 21%, 92% 29%, 81% 44%, 74% 40%, 79% 100%, 56% 100%, 52% 67%, 48% 67%, 44% 100%, 21% 100%, 26% 40%, 19% 44%, 8% 29%, 27% 20%, 33% 9%);
      background:
        radial-gradient(circle at 50% 10%, #52604c 0 12%, #263229 13% 19%, transparent 20%),
        linear-gradient(90deg, #101512 0 16%, #394339 40% 60%, #101512 84% 100%);
      border-bottom: 4px solid rgba(6, 8, 7, .76);
      filter: drop-shadow(0 5px 3px rgba(0, 0, 0, .62));
      opacity: 0;
      pointer-events: none;
      user-select: none;
      will-change: left, top, transform, opacity;
    }
    .redluk-orc-placeholder[data-moving="true"] {
      filter: drop-shadow(0 6px 4px rgba(0, 0, 0, .66));
    }
    .redluk-elder-placeholder {
      width: 9.8%;
      aspect-ratio: .67;
      clip-path: polygon(40% 0, 60% 0, 67% 7%, 72% 15%, 86% 18%, 98% 31%, 88% 50%, 80% 43%, 79% 100%, 57% 100%, 53% 62%, 47% 62%, 43% 100%, 21% 100%, 22% 43%, 12% 50%, 2% 31%, 14% 18%, 28% 15%, 33% 7%);
      background:
        radial-gradient(circle at 50% 9%, #697064 0 10%, #30372f 11% 18%, transparent 19%),
        radial-gradient(ellipse at 50% 36%, #4a5548 0 27%, #1a211c 57%, transparent 59%),
        linear-gradient(90deg, #0b0d0c 0 10%, #343c33 32% 68%, #0b0d0c 90% 100%);
      filter: drop-shadow(0 8px 6px rgba(0, 0, 0, .75));
    }
    .redluk-encounter-caption {
      position: absolute;
      left: 50%;
      bottom: 15%;
      z-index: 5000;
      min-width: 10ch;
      margin: 0;
      transform: translateX(-50%);
      color: rgba(244, 235, 216, .94);
      font: italic 400 clamp(17px, 2vw, 34px)/1.2 Georgia, 'Times New Roman', serif;
      letter-spacing: .04em;
      text-align: center;
      text-shadow: 0 2px 5px #000, 0 0 16px rgba(0, 0, 0, .92);
      opacity: 0;
      transition: opacity .7s ease;
      pointer-events: none;
    }
    .redluk-encounter-caption.show { opacity: 1; }
    @media (prefers-reduced-motion: reduce) {
      .redluk-encounter-caption { transition: none; }
    }
  `;
  document.head.appendChild(style);

  const caption = document.createElement('p');
  caption.className = 'redluk-encounter-caption';
  caption.setAttribute('aria-live', 'polite');
  caption.setAttribute('aria-atomic', 'true');
  stage.appendChild(caption);

  let areaId = null;
  let sceneMap = null;
  let config = null;
  let rankRecords = [];
  let elderRecord = null;
  let previousHeroX = null;
  let startedAt = null;
  let encounterComplete = false;
  let movementLocked = false;

  function makeActorElement(actor, elder = false) {
    const element = document.createElement('div');
    element.className = elder
      ? 'redluk-orc-placeholder redluk-elder-placeholder'
      : 'redluk-orc-placeholder';
    element.dataset.actorId = actor.id;
    element.dataset.spriteStatus = actor.spriteStatus;
    element.setAttribute('aria-hidden', 'true');
    stage.insertBefore(element, debugCanvas || geometryCanvas || null);
    return { actor, element };
  }

  function releaseMovement() {
    if (!movementLocked) return;
    window.AvendorWalkTest.setMovementLock?.(LOCK_ID, false);
    movementLocked = false;
  }

  function clearActors() {
    releaseMovement();
    rankRecords.forEach((record) => record.element.remove());
    elderRecord?.element.remove();
    rankRecords = [];
    elderRecord = null;
    caption.textContent = '';
    caption.classList.remove('show');
    delete stage.dataset.redlukEncounter;
  }

  function mountEncounter(map) {
    clearActors();
    sceneMap = map;
    config = map.data.cinematicEncounter || null;
    previousHeroX = null;
    startedAt = null;
    encounterComplete = false;
    if (!config) return;
    rankRecords = config.actors.map((actor) => makeActorElement(actor));
    elderRecord = makeActorElement(config.elderOrc, true);
    stage.dataset.redlukEncounter = 'waiting';
  }

  function startEncounter(now) {
    if (!config || startedAt !== null || encounterComplete) return false;
    startedAt = now;
    if (config.locksMovement) {
      movementLocked = window.AvendorWalkTest.setMovementLock?.(LOCK_ID, true) === true;
    }
    return true;
  }

  function cameraOffset(map, heroPosition) {
    const runtimeOffset = window.AvendorKoboldRuntime?.getCameraX?.();
    if (Number.isFinite(runtimeOffset)) return runtimeOffset;
    return clamp(heroPosition.x - (VIEWPORT_WIDTH * .5), 0, map.width - VIEWPORT_WIDTH);
  }

  function positionActor(record, actorState, map, cameraX) {
    const screenX = actorState.x - cameraX;
    record.element.style.left = `${(screenX / VIEWPORT_WIDTH) * 100}%`;
    record.element.style.top = `${(actorState.y / map.height) * 100}%`;
    record.element.style.opacity = actorState.opacity.toFixed(3);
    record.element.style.setProperty(
      '--redluk-actor-scale',
      (map.getScale(actorState.y) * record.actor.scale).toFixed(4)
    );
    record.element.style.zIndex = String(map.getDepth(actorState.y));
    record.element.dataset.moving = String(actorState.moving);
  }

  function renderEncounter(now, heroPosition) {
    if (startedAt === null || !config || !sceneMap) return;
    const state = getTimelineState(config, now - startedAt);
    const cameraX = cameraOffset(sceneMap, heroPosition);
    stage.dataset.redlukEncounter = state.phase;
    rankRecords.forEach((record, index) => positionActor(record, state.ranks[index], sceneMap, cameraX));
    positionActor(elderRecord, state.elder, sceneMap, cameraX);

    caption.textContent = state.caption;
    caption.classList.toggle('show', Boolean(state.caption));

    if (state.complete && !encounterComplete) {
      encounterComplete = true;
      releaseMovement();
    }
  }

  function tick(now) {
    const nextArea = window.AvendorWalkTest.getArea?.();
    const nextMap = window.AvendorWalkTest.getMap?.();
    const nextAreaId = nextArea?.id || nextMap?.data?.id || null;

    if (nextAreaId !== areaId) {
      clearActors();
      areaId = nextAreaId;
      sceneMap = null;
      config = null;
      previousHeroX = null;
      startedAt = null;
      encounterComplete = false;
      if (areaId === AREA_ID && nextMap) mountEncounter(nextMap);
    }

    if (areaId === AREA_ID && sceneMap && config) {
      const heroPosition = window.AvendorWalkTest.getPosition();
      if (startedAt === null && crossedTrigger(config, previousHeroX, heroPosition.x)) {
        startEncounter(now);
      }
      previousHeroX = heroPosition.x;
      renderEncounter(now, heroPosition);
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  window.AvendorRedlukRuntime = Object.freeze({
    start: () => startEncounter(performance.now()),
    getState: () => ({
      areaId,
      phase: stage.dataset.redlukEncounter || null,
      triggered: startedAt !== null,
      complete: encounterComplete,
      rankCount: rankRecords.length,
      movementLocked
    })
  });
})();
