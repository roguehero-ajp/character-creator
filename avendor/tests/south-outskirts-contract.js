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

function assertPlannedConnection(connectionId, left, right) {
  const connection = getConnection(connectionId);
  assert(connection?.status === 'planned', `South-outskirts connection is not planned: ${connectionId}`);
  assert(connection.kind === 'road' && connection.visibility === 'public', `Planned south-outskirts connection must be a public road: ${connectionId}`);
  const endpointKeys = connection.endpoints.map((endpoint) => (
    `${endpoint.areaId}/${endpoint.transitionId}/${endpoint.direction}`
  ));
  assert(endpointKeys.includes(left), `Planned south-outskirts connection has the wrong first endpoint: ${connectionId}`);
  assert(endpointKeys.includes(right), `Planned south-outskirts connection has the wrong second endpoint: ${connectionId}`);
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
  'briarwell-forest-f5',
  'briarwell-forest-f6',
  'briarwell-forest-f7',
  'briarwell-forest-f8',
  'briarwell-forest-f9',
  'briarwell-forest-f10',
  'briarwell-broken-bridge'
];
const expectedVersions = {
  'briarwell-forest-f1': '0.2.0',
  'briarwell-graveyard': '0.1.0',
  'briarwell-forest-f2': '0.3.0',
  'briarwell-forest-f3': '0.2.0',
  'briarwell-forest-f4': '0.2.0',
  'briarwell-forest-f5': '0.2.0',
  'briarwell-forest-f6': '0.1.0',
  'briarwell-forest-f7': '0.1.0',
  'briarwell-forest-f8': '0.2.0',
  'briarwell-forest-f9': '0.2.0',
  'briarwell-forest-f10': '0.2.0',
  'briarwell-broken-bridge': '0.2.0'
};
southAreaIds.forEach((areaId) => {
  const area = getArea(areaId);
  const map = mapByArea.get(areaId);
  assert(area?.status === 'playable' && area.kind === 'outdoor', `South-outskirts area is not playable: ${areaId}`);
  assert(map?.id === areaId && map.version === expectedVersions[areaId], `South-outskirts map identity/version mismatch: ${areaId}`);
});

const wagonRoadContracts = {
  'briarwell-forest-f1': { artVersion: '-v2.png', directions: ['north', 'south', 'west'] },
  'briarwell-forest-f2': { artVersion: '-v2.png', directions: ['north', 'southeast', 'southwest'] },
  'briarwell-forest-f3': { artVersion: '-v2.png', directions: ['northwest', 'south'] },
  'briarwell-forest-f4': { artVersion: '-v2.png', directions: ['east', 'north'] },
  'briarwell-forest-f5': { artVersion: '-v2.png', directions: ['northeast', 'west'] },
  'briarwell-forest-f6': { artVersion: '-v1.png', directions: ['south', 'west'] },
  'briarwell-forest-f7': { artVersion: '-v1.png', directions: ['east', 'north', 'west'] },
  'briarwell-forest-f8': { artVersion: '-v2.webp', directions: ['east', 'north', 'south'] },
  'briarwell-forest-f9': { artVersion: '-v1.png', directions: ['east', 'north', 'south', 'west'] },
  'briarwell-forest-f10': { artVersion: '-v1.png', directions: ['north', 'west'] },
  'briarwell-broken-bridge': { artVersion: '-v2.png', directions: ['east', 'west'] }
};
Object.entries(wagonRoadContracts).forEach(([areaId, contract]) => {
  const map = mapByArea.get(areaId);
  assert(map.art.background.endsWith(contract.artVersion), `Approved wagon-road art is not active: ${areaId}`);
  assert(
    map.exits.map((exit) => exit.direction).sort().join(',') === contract.directions.slice().sort().join(','),
    `Wagon-road map must expose exactly one transition per approved direction: ${areaId}`
  );
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
  'forest-f2-f5',
  'briarwell-forest-f2/southwest-path/southwest',
  'briarwell-forest-f5/northeast-path/northeast'
);
assertConnection(
  'forest-f5-f7',
  'briarwell-forest-f5/west-path/west',
  'briarwell-forest-f7/east-path/east'
);
assertConnection(
  'forest-f6-f7',
  'briarwell-forest-f6/south-path/south',
  'briarwell-forest-f7/north-path/north'
);
assertConnection(
  'forest-f6-f8',
  'briarwell-forest-f6/west-path/west',
  'briarwell-forest-f8/east-path/east'
);
assertConnection(
  'forest-f7-f9',
  'briarwell-forest-f7/west-path/west',
  'briarwell-forest-f9/east-path/east'
);
assertConnection(
  'forest-f8-f9',
  'briarwell-forest-f8/south-path/south',
  'briarwell-forest-f9/north-path/north'
);
assertConnection(
  'forest-f8-f11',
  'briarwell-forest-f8/north-path/north',
  'briarwell-forest-f11/south-path/south'
);
assertConnection(
  'forest-f9-f10',
  'briarwell-forest-f9/south-path/south',
  'briarwell-forest-f10/north-path/north'
);
assertConnection(
  'forest-f9-witchwood-w1',
  'briarwell-forest-f9/west-path/west',
  'briarwell-witchwood-w1/east-path/east'
);
assertConnection(
  'forest-f10-witchwood-w2',
  'briarwell-forest-f10/west-path/west',
  'briarwell-witchwood-w2/east-path/east'
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
const f2 = getArea('briarwell-forest-f2').planPosition;
const f5 = getArea('briarwell-forest-f5').planPosition;
assert(graveyard.column < f1.column && graveyard.row === f1.row, 'The graveyard must remain directly west of F1.');
assert(bridge.column > f4.column && bridge.row === f4.row, 'The broken bridge must remain directly east of F4.');
assert(f5.column < f2.column && f5.row > f2.row, 'F5 must remain southwest of F2.');
const expectedForestPlan = {
  'briarwell-forest-f6': [-1, 4],
  'briarwell-forest-f7': [-1, 5],
  'briarwell-forest-f8': [-2, 4],
  'briarwell-forest-f11': [-2, 3],
  'briarwell-forest-f9': [-2, 5],
  'briarwell-forest-f10': [-2, 6],
  'briarwell-witchwood-w1': [-3, 5],
  'briarwell-witchwood-w2': [-3, 6]
};
Object.entries(expectedForestPlan).forEach(([areaId, [column, row]]) => {
  const area = getArea(areaId);
  assert(
    area?.planPosition?.column === column && area.planPosition.row === row,
    `Forest plan position changed: ${areaId}`
  );
});
assert(
  getArea('briarwell-forest-f11')?.status === 'playable'
    && getArea('briarwell-forest-f11').map === 'data/maps/briarwell-forest-f11.json',
  'F11 must be the playable destination of the visible F8 north road.'
);
['briarwell-witchwood-w1', 'briarwell-witchwood-w2'].forEach((areaId) => {
  const area = getArea(areaId);
  assert(area.status === 'playable' && area.map, `Witchwood screen must be playable: ${areaId}`);
});

const graveyardMap = mapByArea.get('briarwell-graveyard');
assert(
  graveyardMap.exits.length === 1
    && graveyardMap.exits[0].id === 'east-path'
    && graveyardMap.exits[0].direction === 'east',
  'The graveyard must have only its east return path to F1.'
);

const f2Map = mapByArea.get('briarwell-forest-f2');
assert(
  f2Map.version === '0.3.0'
    && f2Map.exits.map((exit) => exit.direction).sort().join(',') === 'north,southeast,southwest',
  'F2 must expose its active F1, F3 and F5 routes.'
);
const f2Southwest = getTransition('briarwell-forest-f2', 'southwest-path');
assert(
  f2Southwest?.status === 'active'
    && f2Southwest.target?.areaId === 'briarwell-forest-f5'
    && f2Southwest.target?.returnTransitionId === 'northeast-path',
  'F2 southwest must load F5 through its northeast path.'
);

const f5Map = mapByArea.get('briarwell-forest-f5');
const f5Northeast = getTransition('briarwell-forest-f5', 'northeast-path');
const f5West = getTransition('briarwell-forest-f5', 'west-path');
const f5F7Connection = getConnection('forest-f5-f7');
assert(
  f5Map.exits.length === 2
    && f5Northeast?.status === 'active'
    && f5Northeast.target?.areaId === 'briarwell-forest-f2'
    && f5West?.status === 'active'
    && f5West.target?.areaId === 'briarwell-forest-f7',
  'F5 must connect northeast to F2 and west to F7.'
);
assert(
  f5F7Connection?.status === 'active'
    && f5F7Connection.endpoints.some((endpoint) => endpoint.direction === 'west')
    && f5F7Connection.endpoints.some((endpoint) => endpoint.direction === 'east'),
  'The F5-F7 connection must remain a reciprocal active west/east road.'
);

const f9West = getTransition('briarwell-forest-f9', 'west-path');
const f10West = getTransition('briarwell-forest-f10', 'west-path');
assert(
  f9West?.status === 'active'
    && f9West.target?.areaId === 'briarwell-witchwood-w1'
    && f9West.target?.returnTransitionId === 'east-path',
  'F9 west must load Witchwood W1 through its reciprocal east path.'
);
assert(
  f10West?.status === 'active'
    && f10West.target?.areaId === 'briarwell-witchwood-w2'
    && f10West.target?.returnTransitionId === 'east-path',
  'F10 west must load Witchwood W2 through its reciprocal east path.'
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
const closedBoundaryChecks = {
  'briarwell-forest-f5': [[720, 900, 'south']],
  'briarwell-forest-f6': [[720, 100, 'north'], [1350, 500, 'east']],
  'briarwell-forest-f7': [[720, 900, 'south']],
  'briarwell-forest-f8': [[100, 500, 'west']],
  'briarwell-forest-f9': [[120, 120, 'northwest corner']],
  'briarwell-forest-f10': [[1350, 500, 'east'], [720, 900, 'south']]
};
Object.entries(closedBoundaryChecks).forEach(([areaId, points]) => {
  const geometry = new MapGeometry(mapByArea.get(areaId));
  points.forEach(([x, y, label]) => {
    assert(!geometry.isWalkable(x, y), `${areaId} must not expose an accidental ${label} route.`);
  });
});

const walkTestSource = fs.readFileSync(path.join(avendorRoot, 'js/walk-test.js'), 'utf8');
assert(count(walkTestSource, "window.addEventListener('keydown'") === 1, 'The walk runtime must register one keydown listener.');
assert(count(walkTestSource, "window.addEventListener('keyup'") === 1, 'The walk runtime must register one keyup listener.');
assert(count(walkTestSource, "window.addEventListener('blur'") === 1, 'The walk runtime must register one blur listener.');
assert(count(walkTestSource, 'requestAnimationFrame(tick);') === 2, 'The walk runtime must keep one animation-loop bootstrap and one self-schedule.');
assert(count(walkTestSource, 'noticeTimer = window.setTimeout') === 1, 'The walk runtime must own only one notice timer.');
assert(count(walkTestSource, 'window.clearTimeout(noticeTimer)') === 1, 'The notice timer must be cleared before replacement.');
assert(walkTestSource.includes('trigger.unavailableText'), 'Unavailable world boundaries must support authored messages.');

console.log('South-outskirts topology and runtime-singleton checks passed.');
