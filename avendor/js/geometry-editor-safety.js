(() => {
  'use strict';

  const stage = document.getElementById('walk-stage');
  const help = document.getElementById('walk-help');
  const sceneStatus = document.getElementById('scene-status');
  const walkTest = window.AvendorWalkTest;

  if (!stage || !walkTest) return;

  const TEMP_SPAWN_ID = '__geometry-editor-safe-position';
  let wasEditing = stage.classList.contains('geometry-sketch-active');
  let recoveryRunning = false;

  function isSafe(map, point) {
    return Boolean(
      map
      && point
      && Number.isFinite(point.x)
      && Number.isFinite(point.y)
      && map.isWalkable(point.x, point.y)
      && !map.getTriggerAt(point)
    );
  }

  function findNearestSafePoint(map, origin) {
    if (isSafe(map, origin)) return { x: origin.x, y: origin.y };

    const maxRadius = Math.ceil(Math.hypot(map.width, map.height));
    const radiusStep = 8;

    for (let radius = radiusStep; radius <= maxRadius; radius += radiusStep) {
      const samples = Math.max(24, Math.min(160, Math.ceil((Math.PI * 2 * radius) / 12)));
      for (let index = 0; index < samples; index += 1) {
        const angle = (Math.PI * 2 * index) / samples;
        const candidate = {
          x: Math.round(origin.x + (Math.cos(angle) * radius)),
          y: Math.round(origin.y + (Math.sin(angle) * radius))
        };
        if (
          candidate.x < 0 || candidate.x > map.width
          || candidate.y < 0 || candidate.y > map.height
        ) continue;
        if (isSafe(map, candidate)) return candidate;
      }
    }

    return Object.values(map.data.spawnPoints || {})
      .filter((spawn) => isSafe(map, spawn))
      .sort((left, right) => (
        Math.hypot(left.x - origin.x, left.y - origin.y)
        - Math.hypot(right.x - origin.x, right.y - origin.y)
      ))[0] || null;
  }

  function announce(message) {
    if (help) help.textContent = message;
    if (sceneStatus) sceneStatus.textContent = message;
  }

  async function recoverHeroIfNeeded() {
    if (recoveryRunning) return;
    const map = walkTest.getMap?.();
    const area = walkTest.getArea?.();
    const current = walkTest.getPosition?.();
    if (!map || !area || !current || isSafe(map, current)) return;

    const safePoint = findNearestSafePoint(map, current);
    if (!safePoint) {
      announce('No valid walk area remains. Reopen Geometry Sketch and restore or redraw a walk area.');
      return;
    }

    recoveryRunning = true;
    const spawnPoints = map.data.spawnPoints || (map.data.spawnPoints = {});
    const previousTemporarySpawn = spawnPoints[TEMP_SPAWN_ID];
    const facing = walkTest.hero?.getStatus?.().direction || 'south';
    spawnPoints[TEMP_SPAWN_ID] = { x: safePoint.x, y: safePoint.y, facing };

    try {
      await walkTest.loadArea(area.id, TEMP_SPAWN_ID);
      announce('Hero repositioned to the nearest safe walk point after geometry editing.');
    } catch (error) {
      console.error('Geometry editor safe-position recovery failed.', error);
      announce('Hero could not be repositioned automatically. Reopen Geometry Sketch and restore a valid walk area.');
    } finally {
      const activeMap = walkTest.getMap?.();
      if (activeMap?.data?.spawnPoints) {
        if (previousTemporarySpawn === undefined) delete activeMap.data.spawnPoints[TEMP_SPAWN_ID];
        else activeMap.data.spawnPoints[TEMP_SPAWN_ID] = previousTemporarySpawn;
      }
      recoveryRunning = false;
    }
  }

  new MutationObserver(() => {
    const editing = stage.classList.contains('geometry-sketch-active');
    if (wasEditing && !editing) void recoverHeroIfNeeded();
    wasEditing = editing;
  }).observe(stage, { attributes: true, attributeFilter: ['class'] });

  window.AvendorGeometryEditorSafety = Object.freeze({
    recoverHeroIfNeeded
  });
})();
