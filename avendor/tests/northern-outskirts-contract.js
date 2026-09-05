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

function assertConnection(connectionId, status, left, right, kind = 'road') {
  const record = registry.connections.find((candidate) => candidate.id === connectionId);
  assert(record?.kind === kind && record.visibility === 'public', `Connection is not the expected public route: ${connectionId}`);
  assert(record.status === status, `Connection has the wrong status: ${connectionId}`);
  const endpoints = record.endpoints.map((endpoint) => (
    `${endpoint.areaId}/${endpoint.transitionId}/${endpoint.direction}`
  ));
  assert(endpoints.includes(left), `Connection has the wrong first endpoint: ${connectionId}`);
  assert(endpoints.includes(right), `Connection has the wrong second endpoint: ${connectionId}`);
}

const mapContracts = {
  'briarwell-forest-f15': {
    art: 'briarwell-forest-f15-v2.webp',
    directions: ['east', 'north', 'south', 'west'],
    version: '0.2.0',
    position: [-2, -1]
  },
  'briarwell-old-river-bridge': {
    art: 'briarwell-old-river-bridge-v1.webp',
    directions: ['east', 'west'],
    version: '0.1.0',
    position: [-1, -1]
  },
  'briarwell-northfield': {
    art: 'briarwell-northfield-v1.webp',
    directions: ['northeast', 'west'],
    version: '0.2.0',
    position: [0, -1]
  }
};

Object.entries(mapContracts).forEach(([areaId, contract]) => {
  const area = areas.get(areaId);
  const map = maps.get(areaId);
  assert(area?.status === 'playable' && area.map, `Northern-outskirts area is not playable: ${areaId}`);
  assert(map?.id === areaId && map.version === contract.version, `Northern-outskirts map identity/version mismatch: ${areaId}`);
  assert(map.art.background.endsWith(contract.art), `Canonical northern-outskirts art is not active: ${areaId}`);
  assert(
    map.exits.map((exit) => exit.direction).sort().join(',') === contract.directions.slice().sort().join(','),
    `Map exposes an erroneous route direction: ${areaId}`
  );
  assert(
    new Set(map.exits.map((exit) => exit.direction)).size === map.exits.length,
    `Map exposes more than one route for the same direction: ${areaId}`
  );
  assert(
    area.planPosition?.column === contract.position[0]
      && area.planPosition?.row === contract.position[1],
    `Northern-outskirts plan position changed: ${areaId}`
  );
});

assertConnection(
  'forest-f14-f15',
  'active',
  'briarwell-forest-f14/north-path/north',
  'briarwell-forest-f15/south-path/south'
);
assertConnection(
  'forest-f15-f16',
  'active',
  'briarwell-forest-f15/north-clearing/north',
  'briarwell-forest-f16/south-clearing/south'
);
assertConnection(
  'forest-f15-f18',
  'active',
  'briarwell-forest-f15/west-path/west',
  'briarwell-forest-f18/east-clearing/east'
);
assertConnection(
  'forest-f15-old-river-bridge',
  'active',
  'briarwell-forest-f15/east-path/east',
  'briarwell-old-river-bridge/west-road/west'
);
assertConnection(
  'old-river-bridge-northfield',
  'active',
  'briarwell-old-river-bridge/east-road/east',
  'briarwell-northfield/west-road/west'
);
assertConnection(
  'northfield-misty-forest-mf1',
  'active',
  'briarwell-northfield/northeast-path/northeast',
  'briarwell-misty-forest-mf1/southwest-path/southwest',
  'trail'
);

const f14North = transition('briarwell-forest-f14', 'north-path');
assert(
  maps.get('briarwell-forest-f14')?.version === '0.2.0'
    && f14North?.status === 'active'
    && f14North.target?.areaId === 'briarwell-forest-f15'
    && f14North.target?.returnTransitionId === 'south-path',
  'F14 north must load playable F15 through the historic road.'
);

const f15 = maps.get('briarwell-forest-f15');
const f15East = transition('briarwell-forest-f15', 'east-path');
const f15North = transition('briarwell-forest-f15', 'north-clearing');
const f15West = transition('briarwell-forest-f15', 'west-path');
const verticalSpan = (route) => Math.max(...route.points.map(([, y]) => y)) - Math.min(...route.points.map(([, y]) => y));
assert(
  f15.walkable.some((region) => region.id === 'south-old-wagon-road')
    && f15.walkable.some((region) => region.id === 'east-old-wagon-road')
    && f15.walkable.some((region) => region.id === 'west-walking-path')
    && f15.walkable.some((region) => region.id === 'north-forest-clearing'),
  'F15 must distinguish its old wagon road and walking path from the untracked north clearing.'
);
assert(
  f15East?.status === 'active'
    && f15East.target?.areaId === 'briarwell-old-river-bridge'
    && f15North?.status === 'active'
    && f15North.target?.areaId === 'briarwell-forest-f16'
    && f15West?.status === 'active'
    && f15West.target?.areaId === 'briarwell-forest-f18'
    && verticalSpan(f15West) < verticalSpan(f15East),
  'F15 must keep its eastern wagon road, western walking path and northern forest clearing active.'
);
assert(
  f15.interactables.some((feature) => (
    feature.id === 'old-road-junction'
      && feature.interactionText.includes('never more than a walking path')
  )),
  'F15 must explain the different history of its western path.'
);

assert(
  areas.get('briarwell-forest-f18')?.status === 'playable'
    && areas.get('briarwell-forest-f18')?.map === 'data/maps/briarwell-forest-f18.json'
    && areas.get('briarwell-forest-f18')?.planPosition?.column === -3
    && areas.get('briarwell-forest-f18')?.planPosition?.row === -1,
  'F18 must be the playable dark-forest threshold west of F15.'
);
assert(
  areas.get('briarwell-misty-forest-mf1')?.status === 'playable'
    && areas.get('briarwell-misty-forest-mf1')?.map === 'data/maps/briarwell-misty-forest-mf1.json'
    && areas.get('briarwell-misty-forest-mf1')?.planPosition?.column === 1
    && areas.get('briarwell-misty-forest-mf1')?.planPosition?.row === -2,
  'Misty Forest MF1 must be the playable destination northeast of Northfield.'
);

const bridge = maps.get('briarwell-old-river-bridge');
assert(
  bridge.walkable.length === 1
    && bridge.walkable[0].id === 'old-bridge-deck'
    && bridge.collisions.map((region) => region.id).sort().join(',') === 'north-stone-parapet,south-stone-parapet',
  'The Old River Bridge must permit crossing only along its protected deck.'
);
assert(
  bridge.art.alt.includes('rapid whitewater river')
    && bridge.interactables.some((feature) => (
      feature.id === 'briarwell-river'
        && feature.interactionText.includes('on its way toward Briarwell')
    )),
  'The rapid river must remain identified as the watercourse feeding Briarwell.'
);

const northfield = maps.get('briarwell-northfield');
assert(
  northfield.art.alt.includes('green upland field')
    && northfield.art.alt.includes('almost no trees')
    && northfield.collisions.length >= 5,
  'Northfield must remain a nearly treeless green field dominated by rock obstacles.'
);
assert(
  transition('briarwell-northfield', 'northeast-path')?.status === 'active'
    && transition('briarwell-northfield', 'northeast-path')?.target?.areaId === 'briarwell-misty-forest-mf1',
  'Northfield must expose only its canonical northeast walking route toward MF1.'
);

const MapGeometry = loadMapEngine().MapGeometry;
const f15Geometry = new MapGeometry(f15);
[
  [720, 1040, 'south wagon road'],
  [1400, 555, 'east wagon road'],
  [45, 495, 'west walking path'],
  [720, 45, 'north forest clearing']
].forEach(([x, y, label]) => {
  assert(f15Geometry.isWalkable(x, y), `F15 ${label} is not walkable.`);
});

const bridgeGeometry = new MapGeometry(bridge);
[
  [45, 560, 'west approach'],
  [720, 555, 'bridge deck'],
  [1400, 550, 'east approach']
].forEach(([x, y, label]) => {
  assert(bridgeGeometry.isWalkable(x, y), `Old River Bridge ${label} is not walkable.`);
});
[
  [720, 350, 'north river'],
  [720, 800, 'south river']
].forEach(([x, y, label]) => {
  assert(!bridgeGeometry.isWalkable(x, y), `The ${label} became walkable outside the bridge deck.`);
});

const northfieldGeometry = new MapGeometry(northfield);
[
  [45, 575, 'west approach'],
  [720, 660, 'open field'],
  [1180, 45, 'northeast walking path']
].forEach(([x, y, label]) => {
  assert(northfieldGeometry.isWalkable(x, y), `Northfield ${label} is not walkable.`);
});
[
  [720, 45, 'north'],
  [1400, 520, 'east'],
  [720, 1070, 'south']
].forEach(([x, y, direction]) => {
  assert(!northfieldGeometry.isWalkable(x, y), `Northfield exposes an erroneous ${direction} route.`);
});

console.log('F15, Old River Bridge, Northfield and the active MF1 approach contracts passed.');
