(() => {
  'use strict';

  const engine = window.AvendorMapEngine;
  const MapGeometry = engine?.MapGeometry;
  if (!MapGeometry || MapGeometry.__navigationSidecarPatched) return;

  const originalLoad = MapGeometry.load.bind(MapGeometry);
  const SPAWN_NUDGE_STEP = 12;
  const SPAWN_NUDGE_LIMIT = 120;
  const FACING_VECTORS = Object.freeze({
    north: [0, -1],
    northeast: [Math.SQRT1_2, -Math.SQRT1_2],
    east: [1, 0],
    southeast: [Math.SQRT1_2, Math.SQRT1_2],
    south: [0, 1],
    southwest: [-Math.SQRT1_2, Math.SQRT1_2],
    west: [-1, 0],
    northwest: [-Math.SQRT1_2, -Math.SQRT1_2]
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function geometrySidecarUrl(url) {
    const match = String(url).match(/^(.*)\.json(\?.*)?$/i);
    return match ? `${match[1]}-geometry.json${match[2] || ''}` : null;
  }

  async function readNavigationOverrides(url, expectedAreaId) {
    const sidecarUrl = geometrySidecarUrl(url);
    if (!sidecarUrl) return null;

    let response;
    try {
      response = await fetch(sidecarUrl, { cache: 'no-store' });
    } catch (_) {
      return null;
    }

    if (!response.ok) return null;
    const geometry = await response.json();
    if (geometry.areaId && geometry.areaId !== expectedAreaId) {
      throw new Error(`Navigation sidecar area mismatch: ${geometry.areaId} != ${expectedAreaId}`);
    }
    return geometry;
  }

  function isSafeSpawn(sceneMap, spawn) {
    return Boolean(
      spawn
      && sceneMap.isWalkable(spawn.x, spawn.y)
      && !sceneMap.getTriggerAt(spawn)
    );
  }

  function repairTriggerOverlap(sceneMap, spawn) {
    if (!spawn || !sceneMap.getTriggerAt(spawn)) return spawn;

    const [dx, dy] = FACING_VECTORS[spawn.facing] || [0, 0];
    if (!dx && !dy) return spawn;

    for (let distance = SPAWN_NUDGE_STEP; distance <= SPAWN_NUDGE_LIMIT; distance += SPAWN_NUDGE_STEP) {
      const candidate = {
        ...spawn,
        x: spawn.x + (dx * distance),
        y: spawn.y + (dy * distance)
      };
      if (isSafeSpawn(sceneMap, candidate)) return candidate;
    }

    return spawn;
  }

  function repairSpawnPoints(sceneMap) {
    const spawnPoints = sceneMap.data.spawnPoints || {};
    const repaired = Object.fromEntries(Object.entries(spawnPoints).map(([id, spawn]) => (
      [id, repairTriggerOverlap(sceneMap, spawn)]
    )));
    sceneMap.data.spawnPoints = repaired;
    sceneMap.spawnPoints = repaired;
  }

  function applyNavigationOverrides(sceneMap, geometry) {
    if (!geometry) return sceneMap;

    if (Object.prototype.hasOwnProperty.call(geometry, 'exits')) {
      if (!Array.isArray(geometry.exits)) throw new TypeError('Geometry exits must be an array.');
      sceneMap.data.exits = clone(geometry.exits);
      sceneMap.exits = sceneMap.data.exits;
    }

    if (Object.prototype.hasOwnProperty.call(geometry, 'portals')) {
      if (!Array.isArray(geometry.portals)) throw new TypeError('Geometry portals must be an array.');
      sceneMap.data.portals = clone(geometry.portals);
      sceneMap.portals = sceneMap.data.portals;
    }

    if (Object.prototype.hasOwnProperty.call(geometry, 'spawnPoints')) {
      if (!geometry.spawnPoints || typeof geometry.spawnPoints !== 'object' || Array.isArray(geometry.spawnPoints)) {
        throw new TypeError('Geometry spawnPoints must be an object.');
      }
      sceneMap.data.spawnPoints = clone(geometry.spawnPoints);
      sceneMap.spawnPoints = sceneMap.data.spawnPoints;
    }

    repairSpawnPoints(sceneMap);
    return sceneMap;
  }

  MapGeometry.load = async function loadWithNavigationSidecar(url) {
    const sceneMap = await originalLoad(url);
    const geometry = await readNavigationOverrides(url, sceneMap.data.id);
    return applyNavigationOverrides(sceneMap, geometry);
  };

  Object.defineProperty(MapGeometry, '__navigationSidecarPatched', {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false
  });
})();
