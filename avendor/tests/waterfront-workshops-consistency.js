'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const avendorRoot = path.resolve(__dirname, '..');
const enginePath = path.join(avendorRoot, 'js/map-engine.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadEngine() {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(enginePath, 'utf8'), context);
  return context.window.AvendorMapEngine;
}

function loadMap(id, engine) {
  const data = JSON.parse(fs.readFileSync(path.join(avendorRoot, `data/maps/${id}.json`), 'utf8'));
  return { data, map: new engine.MapGeometry(data) };
}

function assertWalkablePoints(map, areaId, points) {
  points.forEach(([x, y, label]) => {
    assert(map.isWalkable(x, y), `${areaId} movement is pinched ${label} at ${x},${y}.`);
  });
}

function assertBlockedPoints(map, areaId, points) {
  points.forEach(([x, y, label]) => {
    assert(!map.isWalkable(x, y), `${areaId} lost collision at ${label} (${x},${y}).`);
  });
}

function assertTransition(map, data, id, safePoint, triggerPoint) {
  const transition = [...data.exits, ...data.portals].find((candidate) => candidate.id === id);
  assert(transition, `Missing transition: ${data.id}/${id}`);
  assert(map.isWalkable(safePoint.x, safePoint.y), `Safe approach is blocked: ${data.id}/${id}`);
  assert(!map.getTriggerAt(safePoint), `Transition fires too early: ${data.id}/${id}`);
  assert(map.isWalkable(triggerPoint.x, triggerPoint.y), `Committed trigger point is blocked: ${data.id}/${id}`);
  assert(map.getTriggerAt(triggerPoint)?.id === id, `Committed transition does not fire: ${data.id}/${id}`);
}

function assertWorkshops(engine) {
  const { data, map } = loadMap('briarwell-northwest-workshops', engine);

  assertWalkablePoints(map, data.id, [
    [560, 640, 'at the blacksmith return position'],
    [520, 650, 'in front of the smithy work area'],
    [610, 650, 'between the smithy and cooper frontage'],
    [930, 640, 'at the cooper return position'],
    [820, 790, 'through the central workshop square'],
    [1290, 565, 'on the east-road return approach'],
    [820, 950, 'on the Town Center return approach']
  ]);

  assertBlockedPoints(map, data.id, [
    [455, 555, 'the blacksmith anvil base'],
    [590, 525, 'the blacksmith fuel/forge base'],
    [820, 520, 'the cooper work frontage'],
    [1400, 840, 'the southeast wall base']
  ]);

  assertTransition(map, data, 'southwest-road', { x: 620, y: 955 }, { x: 600, y: 1045 });
  assertTransition(map, data, 'east-road', { x: 1290, y: 565 }, { x: 1410, y: 625 });

  const smith = map.getNearbyInteractable({ x: 560, y: 640 });
  assert(smith?.id === 'blacksmith-forge', 'Blacksmith forge is not naturally reachable from its return position.');
  const cooper = map.getNearbyInteractable({ x: 930, y: 640 });
  assert(cooper?.id === 'cooper-workshop', 'Cooper workshop is not naturally reachable from its return position.');
}

function assertDocks(engine) {
  const { data, map } = loadMap('briarwell-docks', engine);

  assertWalkablePoints(map, data.id, [
    [575, 330, 'on the north-road return approach'],
    [145, 500, 'on the South Gate return approach'],
    [560, 500, 'through the harbor loading square'],
    [500, 650, 'at the main-pier throat'],
    [520, 700, 'onto the main harbor pier'],
    [610, 760, 'at the main-pier anchor'],
    [430, 760, 'on the west pier apron']
  ]);

  assertBlockedPoints(map, data.id, [
    [900, 700, 'the central fishing boat'],
    [280, 860, 'the west moored boat'],
    [480, 880, 'the main-pier lantern base'],
    [800, 1000, 'the foreground pier cargo']
  ]);

  assertTransition(map, data, 'north-road', { x: 575, y: 330 }, { x: 560, y: 260 });
  assertTransition(map, data, 'west-road', { x: 145, y: 500 }, { x: 50, y: 500 });

  const piers = map.getNearbyInteractable({ x: 610, y: 760 });
  assert(piers?.id === 'harbor-piers', 'Harbor piers are not reachable from the main-pier anchor.');
}

function assertWaterfrontApproaches(engine) {
  const tannery = loadMap('briarwell-tannery-warehouses', engine);
  const southGate = loadMap('briarwell-south-gate', engine);

  assertTransition(tannery.map, tannery.data, 'south-road', { x: 650, y: 950 }, { x: 650, y: 1045 });
  assertTransition(southGate.map, southGate.data, 'east-road', { x: 1320, y: 520 }, { x: 1405, y: 520 });
}

function run() {
  const engine = loadEngine();
  assertWorkshops(engine);
  assertDocks(engine);
  assertWaterfrontApproaches(engine);
  console.log('Briarwell workshops and waterfront consistency checks passed.');
}

run();
