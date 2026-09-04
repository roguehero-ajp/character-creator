'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const avendorRoot = path.resolve(__dirname, '..');
const registry = JSON.parse(
  fs.readFileSync(path.join(avendorRoot, 'data/maps/briarwell-area-registry.json'), 'utf8')
);
const areas = new Map(registry.areas.map((area) => [area.id, area]));
const maps = new Map(registry.areas
  .filter((area) => area.map)
  .map((area) => [
    area.id,
    JSON.parse(fs.readFileSync(path.join(avendorRoot, area.map), 'utf8'))
  ]));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadMapEngine() {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(avendorRoot, 'js/map-engine.js'), 'utf8'),
    context
  );
  return context.window.AvendorMapEngine;
}

function transition(areaId, transitionId) {
  const map = maps.get(areaId);
  return [...(map?.exits || []), ...(map?.portals || [])]
    .find((candidate) => candidate.id === transitionId);
}

function connection(connectionId) {
  return registry.connections.find((candidate) => candidate.id === connectionId);
}

function assertConnection(connectionId, status, left, right) {
  const record = connection(connectionId);
  assert(record?.kind === 'road' && record.visibility === 'public', `Connection is not a public road: ${connectionId}`);
  assert(record.status === status, `Connection has the wrong status: ${connectionId}`);
  const endpoints = record.endpoints.map((endpoint) => (
    `${endpoint.areaId}/${endpoint.transitionId}/${endpoint.direction}`
  ));
  assert(endpoints.includes(left), `Connection has the wrong first endpoint: ${connectionId}`);
  assert(endpoints.includes(right), `Connection has the wrong second endpoint: ${connectionId}`);
}

const mapContracts = {
  'briarwell-forest-f11': {
    art: 'briarwell-forest-f11-v1.webp',
    directions: ['north', 'south', 'west'],
    position: [-2, 3]
  },
  'briarwell-donson-farm': {
    art: 'briarwell-donson-farm-v1.webp',
    directions: ['east'],
    position: [-3, 3]
  },
  'briarwell-forest-f12': {
    art: 'briarwell-forest-f12-v1.webp',
    directions: ['north', 'south', 'west'],
    position: [-2, 2]
  },
  'briarwell-bayard-ranch': {
    art: 'briarwell-bayard-ranch-v1.webp',
    directions: ['east'],
    position: [-3, 2]
  },
  'briarwell-forest-f13': {
    art: 'briarwell-forest-f13-v1.webp',
    directions: ['east', 'north', 'south', 'west'],
    position: [-2, 1]
  },
  'briarwell-allwood-gardens': {
    art: 'briarwell-allwood-gardens-v1.webp',
    directions: ['east'],
    position: [-3, 1]
  },
  'briarwell-forest-f14': {
    art: 'briarwell-forest-f14-v1.webp',
    directions: ['north', 'south'],
    position: [-2, 0]
  }
};

Object.entries(mapContracts).forEach(([areaId, contract]) => {
  const area = areas.get(areaId);
  const map = maps.get(areaId);
  assert(area?.status === 'playable' && area.map, `West-outskirts area is not playable: ${areaId}`);
  assert(map?.id === areaId && map.version === '0.1.0', `West-outskirts map identity/version mismatch: ${areaId}`);
  assert(map.art.background.endsWith(contract.art), `Canonical west-outskirts art is not active: ${areaId}`);
  assert(
    map.exits.map((exit) => exit.direction).sort().join(',') === contract.directions.slice().sort().join(','),
    `Map exposes an erroneous road direction: ${areaId}`
  );
  assert(
    new Set(map.exits.map((exit) => exit.direction)).size === map.exits.length,
    `Map exposes more than one road for the same direction: ${areaId}`
  );
  assert(
    area.planPosition?.column === contract.position[0]
      && area.planPosition?.row === contract.position[1],
    `West-outskirts plan position changed: ${areaId}`
  );
});

assertConnection(
  'forest-f8-f11',
  'active',
  'briarwell-forest-f8/north-path/north',
  'briarwell-forest-f11/south-path/south'
);
assertConnection(
  'forest-f11-f12',
  'active',
  'briarwell-forest-f11/north-path/north',
  'briarwell-forest-f12/south-path/south'
);
assertConnection(
  'forest-f11-donson-farm',
  'active',
  'briarwell-forest-f11/west-path/west',
  'briarwell-donson-farm/east-road/east'
);
assertConnection(
  'forest-f12-f13',
  'active',
  'briarwell-forest-f12/north-path/north',
  'briarwell-forest-f13/south-path/south'
);
assertConnection(
  'forest-f12-bayard-ranch',
  'active',
  'briarwell-forest-f12/west-path/west',
  'briarwell-bayard-ranch/east-road/east'
);
assertConnection(
  'forest-f13-f14',
  'active',
  'briarwell-forest-f13/north-path/north',
  'briarwell-forest-f14/south-path/south'
);
assertConnection(
  'forest-f13-allwood-gardens',
  'active',
  'briarwell-forest-f13/west-path/west',
  'briarwell-allwood-gardens/east-road/east'
);
assertConnection(
  'west-road-junction-forest-f13',
  'active',
  'briarwell-west-road-junction/west-road/west',
  'briarwell-forest-f13/east-path/east'
);
assertConnection(
  'forest-f14-f15',
  'planned',
  'briarwell-forest-f14/north-path/north',
  'briarwell-forest-f15/south-path/south'
);

const f8North = transition('briarwell-forest-f8', 'north-path');
assert(
  f8North?.status === 'active'
    && f8North.target?.areaId === 'briarwell-forest-f11'
    && f8North.target?.returnTransitionId === 'south-path',
  'F8 north must now load playable F11.'
);

const junctionWest = transition('briarwell-west-road-junction', 'west-road');
assert(
  maps.get('briarwell-west-road-junction')?.version === '0.2.0'
    && junctionWest?.status === 'active'
    && junctionWest.target?.areaId === 'briarwell-forest-f13'
    && junctionWest.target?.returnTransitionId === 'east-path',
  'Briarwell west-road junction must now load F13.'
);
assert(
  !registry.cityExits.some((cityExit) => (
    cityExit.areaId === 'briarwell-west-road-junction'
      && cityExit.transitionId === 'west-road'
  )),
  'The active F13 road must no longer be registered as an unassigned city exit.'
);

const f15 = areas.get('briarwell-forest-f15');
const f14North = transition('briarwell-forest-f14', 'north-path');
assert(
  areas.get('briarwell-henson-homestead')?.planPosition?.column === -1
    && areas.get('briarwell-henson-homestead')?.planPosition?.row === 0,
  'Henson Homestead must stay north of the west-road junction without overlapping F14.'
);
assert(
  f15?.status === 'planned'
    && f15.map === null
    && f15.planPosition?.column === -2
    && f15.planPosition?.row === -1,
  'F15 must remain the planned destination north of F14.'
);
assert(
  f14North?.status === 'planned'
    && f14North.target?.areaId === 'briarwell-forest-f15'
    && f14North.unavailableText.includes('old mountain road'),
  'F14 north must reserve the quieter historic mountain road to F15.'
);
assert(
  maps.get('briarwell-forest-f14').interactables.some((feature) => (
    feature.id === 'old-mountain-road'
      && feature.interactionText.includes('once carried far more traffic')
  )),
  'F14 must preserve the former importance of the mountain route.'
);

const MapGeometry = loadMapEngine().MapGeometry;
const closedBoundaryChecks = {
  'briarwell-forest-f11': [[1380, 520, 'east']],
  'briarwell-forest-f12': [[1380, 520, 'east']],
  'briarwell-donson-farm': [[60, 560, 'west'], [720, 1040, 'south']],
  'briarwell-bayard-ranch': [[60, 560, 'west'], [720, 1040, 'south']],
  'briarwell-allwood-gardens': [[60, 560, 'west'], [720, 1040, 'south']],
  'briarwell-forest-f14': [[80, 540, 'west'], [1370, 540, 'east']]
};
Object.entries(closedBoundaryChecks).forEach(([areaId, points]) => {
  const geometry = new MapGeometry(maps.get(areaId));
  points.forEach(([x, y, direction]) => {
    assert(!geometry.isWalkable(x, y), `${areaId} exposes an accidental ${direction} route.`);
  });
});

const f13Geometry = new MapGeometry(maps.get('briarwell-forest-f13'));
[
  [720, 45, 'north'],
  [720, 1040, 'south'],
  [45, 530, 'west'],
  [1400, 530, 'east']
].forEach(([x, y, direction]) => {
  assert(f13Geometry.isWalkable(x, y), `F13 ${direction} wagon road is not walkable.`);
});

console.log('West-outskirts roads, farms and historic F14 route checks passed.');
