'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const avendorRoot = path.resolve(__dirname, '..');
const registryData = JSON.parse(
  fs.readFileSync(path.join(avendorRoot, 'data/maps/briarwell-area-registry.json'), 'utf8')
);
const mapByArea = new Map(registryData.areas
  .filter((area) => area.map)
  .map((area) => [
    area.id,
    JSON.parse(fs.readFileSync(path.join(avendorRoot, area.map), 'utf8'))
  ]));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function getArea(areaId) {
  return registryData.areas.find((area) => area.id === areaId);
}

function getTransition(areaId, transitionId) {
  const map = mapByArea.get(areaId);
  return [...(map?.exits || []), ...(map?.portals || [])]
    .find((transition) => transition.id === transitionId);
}

function getConnection(connectionId) {
  return registryData.connections.find((connection) => connection.id === connectionId);
}

function assertConnection(connectionId, left, right) {
  const connection = getConnection(connectionId);
  assert(connection?.status === 'active', `South-outskirts connection is not active: ${connectionId}`);
  assert(connection.kind === 'road' && connection.visibility === 'public', `South-outskirts connection must be a public road: ${connectionId}`);
  const endpointKeys = connection.endpoints.map((endpoint) => (
    `${endpoint.areaId}/${endpoint.transitionId}/${endpoint.direction}`
  ));
  assert(endpointKeys.includes(left), `South-outskirts connection has the wrong first endpoint: ${connectionId}`);
  assert(endpointKeys.includes(right), `South-outskirts connection has the wrong second endpoint: ${connectionId}`);
}

function count(source, token) {
  return source.split(token).length - 1;
}

function loadMapEngine() {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(avendorRoot, 'js/map-engine.js'), 'utf8'), context);
  return context.window.AvendorMapEngine;
}

const southAreaIds = [
  'briarwell-forest-f1',
  'briarwell-graveyard',
  'briarwell-forest-f2',
  'briarwell-forest-f3',
  'briarwell-forest-f4',
  'briarwell-broken-bridge'
];
southAreaIds.forEach((areaId) => {
  const area = getArea(areaId);
  const map = mapByArea.get(areaId);
  assert(area?.status === 'playable' && area.kind === 'outdoor', `South-outskirts area is not playable: ${areaId}`);
  assert(map?.id === areaId && map.version === '0.1.0', `South-outskirts map identity/version mismatch: ${areaId}`);
});

const southGate = getTransition('briarwell-south-gate', 'south-road');
assert(
  southGate?.status === 'active'
    && southGate.target?.areaId === 'briarwell-forest-f1'
    && southGate.target?.returnTransitionId === 'north-road',
  'The Briarwell South Gate must open directly into F1.'
);

assertConnection(
  'south-gate-forest-f1',
  'briarwell-south-gate/south-road/south',
  'briarwell-forest-f1/north-road/north'
);
assertConnection(
  'forest-f1-graveyard',
  'briarwell-forest-f1/west-path/west',
  'briarwell-graveyard/east-path/east'
);
assertConnection(
  'forest-f1-f2',
  'briarwell-forest-f1/south-path/south',
  'briarwell-forest-f2/north-path/north'
);
assertConnection(
  'forest-f2-f3',
  'briarwell-forest-f2/southeast-path/southeast',
  'briarwell-forest-f3/northwest-path/northwest'
);
assertConnection(
  'forest-f3-f4',
  'briarwell-forest-f3/south-path/south',
  'briarwell-forest-f4/north-path/north'
);
assertConnection(
  'forest-f4-broken-bridge',
  'briarwell-forest-f4/east-path/east',
  'briarwell-broken-bridge/west-path/west'
);

const f1 = getArea('briarwell-forest-f1').planPosition;
const graveyard = getArea('briarwell-graveyard').planPosition;
const f4 = getArea('briarwell-forest-f4').planPosition;
const bridge = getArea('briarwell-broken-bridge').planPosition;
assert(graveyard.column < f1.column && graveyard.row === f1.row, 'The graveyard must remain directly west of F1.');
assert(bridge.column > f4.column && bridge.row === f4.row, 'The broken bridge must remain directly east of F4.');

const graveyardMap = mapByArea.get('briarwell-graveyard');
assert(
  graveyardMap.exits.length === 1
    && graveyardMap.exits[0].id === 'east-path'
    && graveyardMap.exits[0].direction === 'east',
  'The graveyard must have only its east return path to F1.'
);

const f2Map = mapByArea.get('briarwell-forest-f2');
assert(
  f2Map.exits.map((exit) => exit.direction).sort().join(',') === 'north,southeast',
  'F2 must expose the F1 and F3 routes while reserving the southwest F5 trail.'
);

const brokenBridgeMap = mapByArea.get('briarwell-broken-bridge');
const bushavicRoad = getTransition('briarwell-broken-bridge', 'east-road');
const bridgeBoundary = registryData.cityExits.find((cityExit) => (
  cityExit.areaId === 'briarwell-broken-bridge' && cityExit.transitionId === 'east-road'
));
assert(
  bushavicRoad?.status === 'unassigned'
    && bushavicRoad.target === null
    && bushavicRoad.unavailableText.includes('bridge is destroyed'),
  'The bridge gap must block the east road with a location-specific explanation.'
);
assert(
  bridgeBoundary?.id === 'broken-bridge-road-to-bushavic'
    && bridgeBoundary.status === 'unassigned',
  'The road toward Bushavic must remain an approved but unavailable world boundary.'
);

const MapGeometry = loadMapEngine().MapGeometry;
const bridgeGeometry = new MapGeometry(brokenBridgeMap);
assert(!bridgeGeometry.isWalkable(1100, 540), 'The far bank must not be reachable across the destroyed span.');

const walkTestSource = fs.readFileSync(path.join(avendorRoot, 'js/walk-test.js'), 'utf8');
assert(count(walkTestSource, "window.addEventListener('keydown'") === 1, 'The walk runtime must register one keydown listener.');
assert(count(walkTestSource, "window.addEventListener('keyup'") === 1, 'The walk runtime must register one keyup listener.');
assert(count(walkTestSource, "window.addEventListener('blur'") === 1, 'The walk runtime must register one blur listener.');
assert(count(walkTestSource, 'requestAnimationFrame(tick);') === 2, 'The walk runtime must keep one animation-loop bootstrap and one self-schedule.');
assert(count(walkTestSource, 'noticeTimer = window.setTimeout') === 1, 'The walk runtime must own only one notice timer.');
assert(count(walkTestSource, 'window.clearTimeout(noticeTimer)') === 1, 'The notice timer must be cleared before replacement.');
assert(walkTestSource.includes('trigger.unavailableText'), 'Unavailable world boundaries must support authored messages.');

console.log('South-outskirts topology and runtime-singleton checks passed.');
