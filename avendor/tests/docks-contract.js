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

assert(baseMapData.version === '0.5.0', 'Docks base map must include the active Sewer Area 7 access.');
assert(mapData.geometry.version === '0.4.2', 'Docks geometry sidecar is not on the authored visibility pass.');
assert(mapData.geometry.model === 'user-traced-smooth-slide-visibility-authored',
  'Docks is not using the authored traced movement + visibility model.');
assert(mapData.movement.resolver === 'smooth-slide', 'Docks is not using Movement Engine 0.6 smooth sliding.');
assert(mapData.movement.footRadiusX === 10 && mapData.movement.footRadiusY === 6,
  'Docks foot ellipse drifted from the approved Movement Engine 0.6 prototype.');

assert(map.walkable.length === 3, 'Docks should keep exactly three user-traced walkable regions.');
assert(map.collisions.length === 0, 'Docks should not retain the obsolete southern-pier collision.');
assert(map.walkable.some((region) => region.id === 'future-lake-ferry-boat-deck'),
  'Future lake ferry deck walkable region is missing.');

assert(Array.isArray(geometryData.depthOccluders), 'Docks geometry sidecar does not author visibility occluders.');
assert(mapData.depthOccluders.length === 41, 'Docks should load all 41 user-traced visibility occluders.');
assert(new Set(mapData.depthOccluders.map((entry) => entry.id)).size === 41,
  'Docks traced visibility occluder ids are not unique.');
mapData.depthOccluders.forEach((entry) => {
  assert(Array.isArray(entry.points) && entry.points.length >= 3, `Occluder polygon is invalid: ${entry.id}.`);
  const maxY = Math.max(...entry.points.map(([, y]) => y));
  assert(entry.depthY === maxY, `Occluder depth line does not match its traced base: ${entry.id}.`);
});
assert(baseMapData.depthOccluders.length > 0,
  'The contract no longer proves the sidecar replaces the legacy Docks depth masks.');

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

console.log('Briarwell Docks authored movement and visibility contract checks passed.');
