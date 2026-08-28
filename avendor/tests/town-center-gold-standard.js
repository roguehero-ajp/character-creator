'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const avendorRoot = path.resolve(__dirname, '..');
const mapPath = path.join(avendorRoot, 'data/maps/briarwell-town-center.json');
const enginePath = path.join(avendorRoot, 'js/map-engine.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadTownCenter() {
  const data = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(enginePath, 'utf8'), context);
  const engine = context.window.AvendorMapEngine;
  return {
    data,
    map: new engine.MapGeometry(data),
    pointInPolygon: engine.pointInPolygon
  };
}

function polygonCenter(points) {
  return {
    x: points.reduce((sum, point) => sum + point[0], 0) / points.length,
    y: points.reduce((sum, point) => sum + point[1], 0) / points.length
  };
}

function assertTransitionContract(map, data) {
  const commitmentPoints = {
    'northwest-road': { safe: { x: 405, y: 500 }, trigger: { x: 358, y: 355 } },
    'northeast-road': { safe: { x: 1060, y: 500 }, trigger: { x: 1068, y: 420 } },
    'west-road': { safe: { x: 120, y: 720 }, trigger: { x: 52, y: 718 } },
    'east-road': { safe: { x: 1330, y: 710 }, trigger: { x: 1396, y: 705 } },
    'south-road': { safe: { x: 724, y: 990 }, trigger: { x: 798, y: 1039 } },
    'lodestone-tavern-door': { safe: { x: 724, y: 628 }, trigger: { x: 726, y: 576 } },
    'general-store-door': { safe: { x: 1236, y: 656 }, trigger: { x: 1231, y: 623 } }
  };

  [...data.exits, ...data.portals].forEach((transition) => {
    const contract = commitmentPoints[transition.id];
    assert(contract, `Gold-standard commitment point missing: ${transition.id}`);
    assert(map.isWalkable(contract.safe.x, contract.safe.y), `Safe approach is blocked: ${transition.id}`);
    assert(!map.getTriggerAt(contract.safe), `Transition fires before the hero commits: ${transition.id}`);
    assert(map.isWalkable(contract.trigger.x, contract.trigger.y), `Trigger point is blocked: ${transition.id}`);
    assert(map.getTriggerAt(contract.trigger)?.id === transition.id, `Committed transition does not fire: ${transition.id}`);

    const fallback = map.getExactSpawn(transition.fallbackSpawn);
    assert(fallback, `Missing fallback spawn: ${transition.id}`);
    assert(map.isWalkable(fallback.x, fallback.y), `Fallback spawn is blocked: ${transition.id}`);
    assert(!map.getTriggerAt(fallback), `Fallback spawn immediately retriggers: ${transition.id}`);
  });
}

function assertNorthRoadDiagonalClearance(map) {
  const anchors = [
    { x: 405, y: 500, label: 'northwest lower approach' },
    { x: 400, y: 430, label: 'northwest upper approach' },
    { x: 1055, y: 470, label: 'northeast upper approach' },
    { x: 1060, y: 500, label: 'northeast lower approach' }
  ];
  const diagonalOffsets = [
    [5, 5], [5, -5], [-5, 5], [-5, -5]
  ];

  anchors.forEach(({ x, y, label }) => {
    assert(map.isWalkable(x, y), `Gold-standard anchor is blocked: ${label}`);
    const clearDiagonals = diagonalOffsets.filter(([dx, dy]) => map.isWalkable(x + dx, y + dy));
    assert(clearDiagonals.length >= 3, `Diagonal movement is pinched at ${label}.`);
  });
}

function assertExitGeometry(map, data) {
  data.exits.forEach((exit) => {
    const center = polygonCenter(exit.points);
    assert(map.isWalkable(center.x, center.y), `Exit center is not walkable: ${exit.id}`);
    assert(map.getTriggerAt(center)?.id === exit.id, `Exit center resolves incorrectly: ${exit.id}`);

    const xs = exit.points.map((point) => point[0]);
    const ys = exit.points.map((point) => point[1]);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    assert(width >= 40 || height >= 40, `Exit trigger is too small to enter reliably: ${exit.id}`);
  });
}

function assertPerspectiveStandard(map, data) {
  const stops = data.perspective?.stops || [];
  assert(stops.length >= 4, 'Town Center needs at least four perspective reference stops.');
  for (let index = 1; index < stops.length; index += 1) {
    assert(stops[index].y > stops[index - 1].y, 'Perspective stops must progress down-screen.');
    assert(stops[index].scale > stops[index - 1].scale, 'Hero scale must grow toward the foreground.');
  }

  for (let y = stops[0].y; y <= stops[stops.length - 1].y; y += 10) {
    const scale = map.getScale(y);
    assert(Number.isFinite(scale) && scale > 0, `Perspective scale is invalid at y=${y}.`);
  }
}

function run() {
  const { data, map } = loadTownCenter();

  assert(data.id === 'briarwell-town-center', 'Gold-standard test loaded the wrong map.');
  assertTransitionContract(map, data);
  assertNorthRoadDiagonalClearance(map);
  assertExitGeometry(map, data);
  assertPerspectiveStandard(map, data);

  console.log('Briarwell Town Center gold-standard checks passed.');
}

run();
