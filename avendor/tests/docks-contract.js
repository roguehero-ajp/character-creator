'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const avendorRoot = path.resolve(__dirname, '..');
const baseMapData = JSON.parse(fs.readFileSync(path.join(avendorRoot, 'data/maps/briarwell-docks.json'), 'utf8'));
const geometryData = JSON.parse(fs.readFileSync(path.join(avendorRoot, 'data/maps/briarwell-docks-geometry.json'), 'utf8'));
const engineSource = fs.readFileSync(path.join(avendorRoot, 'js/map-engine.js'), 'utf8');
const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(engineSource, context);

const { MapGeometry, applyGeometryOverrides } = context.window.AvendorMapEngine;
const mapData = applyGeometryOverrides(baseMapData, geometryData, 'briarwell-docks-geometry.json');
const map = new MapGeometry(mapData);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function gridReachability(start, step = 5) {
  const origin = [Math.round(start.x / step) * step, Math.round(start.y / step) * step];
  const queue = [origin];
  const seen = new Set([origin.join(',')]);
  const directions = [
    [step, 0], [-step, 0], [0, step], [0, -step],
    [step, step], [step, -step], [-step, step], [-step, -step]
  ];

  assert(map.isWalkable(origin[0], origin[1]), 'Docks reachability origin is blocked.');

  for (let head = 0; head < queue.length; head += 1) {
    const [x, y] = queue[head];
    directions.forEach(([dx, dy]) => {
      const next = [x + dx, y + dy];
      const key = next.join(',');
      if (!seen.has(key) && map.isWalkable(next[0], next[1])) {
        seen.add(key);
        queue.push(next);
      }
    });
  }
  return { step, seen };
}

function isReachable(reachability, point, tolerance = 18) {
  const { step, seen } = reachability;
  const x = Math.round(point.x / step) * step;
  const y = Math.round(point.y / step) * step;
  const cells = Math.ceil(tolerance / step);
  for (let dy = -cells; dy <= cells; dy += 1) {
    for (let dx = -cells; dx <= cells; dx += 1) {
      if (seen.has(`${x + (dx * step)},${y + (dy * step)}`)) return true;
    }
  }
  return false;
}

function transitionCenter(transition) {
  return {
    x: transition.points.reduce((sum, [x]) => sum + x, 0) / transition.points.length,
    y: transition.points.reduce((sum, [, y]) => sum + y, 0) / transition.points.length
  };
}

assert(baseMapData.version === '0.4.0', 'Docks base map version drifted from the user-traced 0.4 pass.');
assert(mapData.geometry.version === '0.4.1', 'Docks geometry sidecar is not on the traced visibility pass.');
assert(mapData.geometry.model === 'user-traced-smooth-slide-visibility',
  'Docks is not using the traced movement + visibility geometry model.');
assert(mapData.movement.resolver === 'smooth-slide', 'Docks is not using Movement Engine 0.6 smooth sliding.');
assert(mapData.movement.footRadiusX === 10 && mapData.movement.footRadiusY === 6,
  'Docks foot ellipse drifted from the approved Movement Engine 0.6 prototype.');

assert(map.walkable.length === 3, 'Docks should use exactly three user-traced walkable regions.');
assert(map.collisions.length === 1, 'Docks traced geometry should need only the pier-lantern collision.');
assert(map.collisions[0].id === 'main-pier-lantern-base', 'Unexpected collision survived the traced Docks cleanup.');
assert(map.walkable.some((region) => region.id === 'future-lake-ferry-boat-deck'),
  'Future lake ferry deck walkable region is missing.');
assert(Array.isArray(geometryData.depthOccluders), 'Docks geometry sidecar does not explicitly author visibility occluders.');
assert(mapData.depthOccluders.length === 0,
  'Legacy Docks depth occluders should not hide the hero once traced visibility authoring is active.');
assert(baseMapData.depthOccluders.length > 0,
  'The contract no longer proves that the sidecar replaces legacy depth occluders.');

const syntheticOccluder = {
  id: 'visibility-probe',
  depthY: 640,
  points: [[500,520],[620,520],[620,640],[500,640]]
};
const visibilityProbe = applyGeometryOverrides(baseMapData, {
  ...geometryData,
  depthOccluders: [syntheticOccluder]
}, 'visibility-probe.json');
assert(visibilityProbe.depthOccluders.length === 1,
  'A traced visibility occluder did not replace the legacy occluder set.');
assert(visibilityProbe.depthOccluders[0].id === 'visibility-probe',
  'A traced visibility occluder lost its authored id.');
assert(visibilityProbe.depthOccluders[0].depthY === 640,
  'A traced visibility occluder lost its authored depth line.');

const reachability = gridReachability(baseMapData.spawnPoints.default);

Object.entries(baseMapData.spawnPoints).forEach(([id, spawn]) => {
  assert(map.isWalkable(spawn.x, spawn.y), `Named Docks spawn is blocked: ${id} at ${spawn.x},${spawn.y}.`);
  assert(isReachable(reachability, spawn), `Named Docks spawn is isolated: ${id}.`);
});

assert(baseMapData.exits.length === 2, 'Docks should keep exactly two road exits.');
baseMapData.exits.forEach((exit) => {
  const center = transitionCenter(exit);
  assert(map.isWalkable(center.x, center.y), `Docks exit center is blocked: ${exit.id}.`);
  assert(isReachable(reachability, center), `Docks exit is disconnected: ${exit.id}.`);
  assert(map.getTriggerAt(center)?.id === exit.id, `Docks exit resolves incorrectly: ${exit.id}.`);
});

[
  ['west water basin', { x: 95, y: 850 }],
  ['central water channel', { x: 1100, y: 940 }],
  ['east water basin', { x: 1320, y: 950 }],
  ['central fishing boat', { x: 930, y: 710 }]
].forEach(([label, point]) => {
  assert(!map.isWalkable(point.x, point.y), `${label} unexpectedly became walkable.`);
});

const ferryDeck = { x: 300, y: 860 };
assert(map.isWalkable(ferryDeck.x, ferryDeck.y), 'Future lake ferry deck should be locally walkable.');
assert(!isReachable(reachability, ferryDeck),
  'Future lake ferry deck should remain disconnected from ordinary walking until boarding logic exists.');

const ferry = baseMapData.interactables.find((entry) => entry.id === 'west-moored-boat');
assert(ferry?.state === 'future-lake-ferry', 'West moored boat is not tagged for the future lake ferry system.');
assert(engineSource.includes("Object.prototype.hasOwnProperty.call(geometry, 'depthOccluders')"),
  'Map engine cannot replace legacy occlusion with geometry-sidecar authored occluders.');
assert(engineSource.includes('validateDepthOccluder'),
  'Map engine does not validate traced visibility occluders.');

console.log('Briarwell Docks traced movement and visibility contract checks passed.');
