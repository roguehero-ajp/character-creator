'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const avendorRoot = path.resolve(__dirname, '..');
const mapData = JSON.parse(fs.readFileSync(path.join(avendorRoot, 'data/maps/briarwell-docks.json'), 'utf8'));
const engineSource = fs.readFileSync(path.join(avendorRoot, 'js/map-engine.js'), 'utf8');
const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(engineSource, context);

const MapGeometry = context.window.AvendorMapEngine.MapGeometry;
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

const reachability = gridReachability(mapData.spawnPoints.default);

assert(mapData.version === '0.3.0', 'Docks map version is not the Movement Engine 0.6 test pass.');
assert(mapData.movement.resolver === 'smooth-slide', 'Docks is not opted into the smooth-slide resolver.');
assert(mapData.movement.footRadiusX === 10, 'Docks horizontal foot radius drifted from the 0.6 prototype.');
assert(mapData.movement.footRadiusY === 6, 'Docks vertical foot radius drifted from the 0.6 prototype.');
assert(Array.isArray(mapData.movement.slideAngles) && mapData.movement.slideAngles.length >= 6,
  'Docks smooth-slide angle probes are missing.');
assert(mapData.exits.length === 2, 'Docks should keep exactly two road exits.');
assert(mapData.exits.some((exit) => exit.id === 'north-road'), 'Docks north road is missing.');
assert(mapData.exits.some((exit) => exit.id === 'west-road'), 'Docks west road is missing.');

[
  ['quay stairs', { x: 710, y: 620 }],
  ['main pier', { x: 610, y: 760 }],
  ['west berth', { x: 470, y: 810 }],
  ['right fishery deck', { x: 1100, y: 820 }],
  ['sewer approach', { x: 1115, y: 710 }]
].forEach(([label, point]) => {
  assert(map.isWalkable(point.x, point.y), `${label} is not walkable.`);
  assert(isReachable(reachability, point), `${label} is disconnected from the harbor square.`);
});

[
  ['west water basin', { x: 95, y: 850 }],
  ['central water channel', { x: 1100, y: 940 }],
  ['east water basin', { x: 1320, y: 950 }],
  ['west boat hull', { x: 280, y: 860 }],
  ['central boat hull', { x: 930, y: 710 }]
].forEach(([label, point]) => {
  assert(!map.isWalkable(point.x, point.y), `${label} unexpectedly became walkable.`);
});

Object.values(mapData.spawnPoints).forEach((spawn) => {
  assert(map.isWalkable(spawn.x, spawn.y), `Named Docks spawn is blocked at ${spawn.x},${spawn.y}.`);
  assert(isReachable(reachability, spawn), `Named Docks spawn is isolated at ${spawn.x},${spawn.y}.`);
});

mapData.exits.forEach((exit) => {
  const center = transitionCenter(exit);
  assert(map.isWalkable(center.x, center.y), `Docks exit center is blocked: ${exit.id}`);
  assert(isReachable(reachability, center), `Docks exit is disconnected: ${exit.id}`);
  assert(map.getTriggerAt(center)?.id === exit.id, `Docks exit resolves incorrectly: ${exit.id}`);
});

const depthIds = new Set(mapData.depthOccluders.map((entry) => entry.id));
assert(depthIds.has('west-moored-boat'), 'West boat depth occluder is missing.');
assert(depthIds.has('central-fishing-boat'), 'Central boat depth occluder is missing.');

const hiddenDebugOccluders = new Set(
  mapData.depthOccluders.filter((entry) => entry.debug === false).map((entry) => entry.id)
);
[
  'central-fishing-boat',
  'west-moored-boat',
  'main-pier-lantern',
  'foreground-pier-cargo-left',
  'foreground-pier-cargo-right',
  'east-dock-cargo-and-posts'
].forEach((id) => assert(hiddenDebugOccluders.has(id), `Lower Docks debug occluder should be hidden: ${id}`));
assert(engineSource.includes('.filter((region) => region.debug !== false)'),
  'Map debugger does not respect per-occluder debug visibility.');

const featureIds = new Set(mapData.interactables.map((entry) => entry.id));
assert(featureIds.has('west-moored-boat'), 'West boat interaction anchor is missing.');
assert(featureIds.has('central-fishing-boat'), 'Central boat interaction anchor is missing.');
assert(featureIds.has('dockside-sewer-access'), 'Dockside sewer interaction anchor is missing.');

console.log('Briarwell Docks Movement Engine 0.6 and harbor contract checks passed.');
