'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const avendorRoot = path.resolve(__dirname, '..');
const mapPath = path.join(avendorRoot, 'data/maps/briarwell-town-center.json');
const geometryPath = path.join(avendorRoot, 'data/maps/briarwell-town-center-geometry.json');
const enginePath = path.join(avendorRoot, 'js/map-engine.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const data = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const geometry = JSON.parse(fs.readFileSync(geometryPath, 'utf8'));
assert(geometry.areaId === data.id, 'Geometry sidecar is attached to the wrong area.');
assert(geometry.model === 'ground-contact-footprints', 'Town Center is not using the ground-contact model.');

const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(enginePath, 'utf8'), context);
const engine = context.window.AvendorMapEngine;
const merged = engine.applyGeometryOverrides(
  data,
  geometry,
  'data/maps/briarwell-town-center-geometry.json'
);
const map = new engine.MapGeometry(merged);

[
  [350, 470, 'behind the fruit canopy'],
  [400, 590, 'behind the fruit-stall beam'],
  [215, 760, 'behind the southwest fence'],
  [250, 850, 'behind the southwest fence rails'],
  [1180, 740, 'behind the southeast fence'],
  [1170, 918, 'beneath the hanging southeast lantern'],
  [1210, 820, 'beside the southeast lantern post'],
  [1205, 970, 'between the southeast fence and stone wall'],
  [1270, 870, 'in front of the southeast fence rails'],
  [1160, 952, 'near the southeast stone wall'],
  [900, 670, 'behind the well roof but outside the well footprint'],
  [1060, 540, 'through the General Store/Lodestone approach'],
  [1030, 560, 'along the Lodestone northeast foundation edge'],
  [1015, 520, 'inside the widened northeast passage']
].forEach(([x, y, label]) => {
  assert(map.isWalkable(x, y), `Expected walkable ground ${label} at ${x},${y}.`);
});

[
  [370, 630, 'fruit canopy right post'],
  [955, 740, 'well ring'],
  [390, 1015, 'direction signpost base'],
  [170, 1020, 'southwest gate base'],
  [1210, 1018, 'southeast fence footprint'],
  [1200, 1060, 'southeast stone wall footprint']
].forEach(([x, y, label]) => {
  assert(!map.isWalkable(x, y), `Expected physical footprint collision at ${label}.`);
});

Object.entries(data.spawnPoints).forEach(([id, spawn]) => {
  assert(map.isWalkable(spawn.x, spawn.y), `Spawn is blocked by footprint geometry: ${id}`);
});

const transitions = [...data.exits, ...data.portals];
transitions.forEach((transition) => {
  const x = transition.points.reduce((sum, point) => sum + point[0], 0) / transition.points.length;
  const y = transition.points.reduce((sum, point) => sum + point[1], 0) / transition.points.length;
  assert(map.isWalkable(x, y), `Transition center is blocked under footprint geometry: ${transition.id}`);
});

function canReach(start, target, step = 5) {
  const snap = (value) => Math.round(value / step) * step;
  const queue = [[snap(start.x), snap(start.y)]];
  const seen = new Set([queue[0].join(',')]);
  const directions = [
    [step, 0], [-step, 0], [0, step], [0, -step],
    [step, step], [step, -step], [-step, step], [-step, -step]
  ];

  for (let head = 0; head < queue.length; head += 1) {
    const [x, y] = queue[head];
    if (Math.hypot(x - target.x, y - target.y) <= step * 2) return true;

    directions.forEach(([dx, dy]) => {
      const next = [x + dx, y + dy];
      const key = next.join(',');
      if (!seen.has(key) && map.isWalkable(next[0], next[1])) {
        seen.add(key);
        queue.push(next);
      }
    });
  }

  return false;
}

const northeastExit = data.exits.find((exit) => exit.id === 'northeast-road');
const northeastTarget = {
  x: northeastExit.points.reduce((sum, point) => sum + point[0], 0) / northeastExit.points.length,
  y: northeastExit.points.reduce((sum, point) => sum + point[1], 0) / northeastExit.points.length
};
assert(
  canReach(data.spawnPoints.default, northeastTarget),
  'Northeast exit has no connected walkable route from the Town Center.'
);

function visibleActorEnvelopeFraction(x, y) {
  const scale = map.getScale(y);
  const activeOccluders = merged.depthOccluders.filter((region) => region.depthY > y);
  let visibleSamples = 0;
  let totalSamples = 0;

  for (let sampleY = y - (208 * scale); sampleY <= y - (17 * scale); sampleY += 3) {
    for (let sampleX = x - (37 * scale); sampleX <= x + (36 * scale); sampleX += 3) {
      totalSamples += 1;
      if (!activeOccluders.some((region) => engine.pointInPolygon([sampleX, sampleY], region.points))) {
        visibleSamples += 1;
      }
    }
  }

  return visibleSamples / totalSamples;
}

[
  [1015, 520, 'at the lower northeast pinch'],
  [1020, 500, 'beside the Lodestone east wall'],
  [1030, 470, 'midway up the northeast passage'],
  [1040, 450, 'under the northeast approach'],
  [1050, 430, 'near the northeast exit']
].forEach(([x, y, label]) => {
  const visibleFraction = visibleActorEnvelopeFraction(x, y);
  assert(
    visibleFraction >= 0.55,
    `Hero becomes effectively invisible ${label}: ${(visibleFraction * 100).toFixed(1)}% visible.`
  );
});

console.log('Briarwell Town Center ground-contact and northeast visibility checks passed.');
