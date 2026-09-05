'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const avendorRoot = path.resolve(__dirname, '..');
const registryData = JSON.parse(
  fs.readFileSync(path.join(avendorRoot, 'data/maps/briarwell-area-registry.json'), 'utf8')
);
const areas = new Map(registryData.areas.map((area) => [area.id, area]));
const maps = new Map(registryData.areas
  .filter((area) => area.map)
  .map((area) => [
    area.id,
    JSON.parse(fs.readFileSync(path.join(avendorRoot, area.map), 'utf8'))
  ]));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadEngines() {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(avendorRoot, 'js/world-map.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(avendorRoot, 'js/map-engine.js'), 'utf8'), context);
  return {
    AreaRegistry: context.window.AvendorWorldMap.AreaRegistry,
    auditTopology: context.window.AvendorWorldMap.auditTopology,
    MapGeometry: context.window.AvendorMapEngine.MapGeometry
  };
}

function transition(areaId, transitionId) {
  const map = maps.get(areaId);
  return [...(map?.exits || []), ...(map?.portals || [])]
    .find((candidate) => candidate.id === transitionId);
}

function assertConnection(connectionId, kind, left, right, oneWay = false) {
  const connection = registryData.connections.find((candidate) => candidate.id === connectionId);
  assert(connection?.kind === kind, `Connection has the wrong kind: ${connectionId}`);
  assert(connection.visibility === 'public' && connection.status === 'active', `Connection is not active and public: ${connectionId}`);
  assert(Boolean(connection.oneWay) === oneWay, `Connection has the wrong directionality: ${connectionId}`);
  assert(JSON.stringify(connection.endpoints[0]) === JSON.stringify(left), `Connection has the wrong source endpoint: ${connectionId}`);
  assert(JSON.stringify(connection.endpoints[1]) === JSON.stringify(right), `Connection has the wrong destination endpoint: ${connectionId}`);
}

const mapContracts = {
  'briarwell-misty-forest-mf1': {
    art: 'briarwell-misty-forest-mf1-v1.webp',
    directions: ['north', 'southwest'],
    position: [1, -2]
  },
  'briarwell-misty-forest-mf2': {
    art: 'briarwell-misty-forest-mf2-v1.webp',
    directions: ['north', 'south'],
    position: [1, -3]
  },
  'briarwell-misty-forest-mf3': {
    art: 'briarwell-misty-forest-mf3-v1.webp',
    directions: ['south', 'west'],
    position: [1, -4]
  },
  'briarwell-swimmable': {
    art: 'briarwell-swimmable-v2.webp',
    version: '0.2.0',
    directions: ['east'],
    position: [0, -4]
  },
  'briarwell-waterfall': {
    art: 'briarwell-waterfall-v2.webp',
    version: '0.2.0',
    directions: ['southeast'],
    position: [-1, -5]
  }
};

Object.entries(mapContracts).forEach(([areaId, contract]) => {
  const area = areas.get(areaId);
  const map = maps.get(areaId);
  const directions = map?.exits.map((exit) => exit.direction).sort() || [];

  assert(area?.status === 'playable' && area.map, `Area is not playable: ${areaId}`);
  assert(
    map?.id === areaId && map.version === (contract.version || '0.1.0'),
    `Map identity/version mismatch: ${areaId}`
  );
  assert(map.referenceSize.width === 1448 && map.referenceSize.height === 1086, `Map is not standard screen size: ${areaId}`);
  assert(map.art.background.endsWith(contract.art), `Canonical background is not active: ${areaId}`);
  assert(
    area.planPosition?.column === contract.position[0]
      && area.planPosition?.row === contract.position[1],
    `Plan position changed: ${areaId}`
  );
  assert(
    directions.join(',') === contract.directions.slice().sort().join(','),
    `Map exposes an erroneous direction: ${areaId}`
  );
  assert(new Set(directions).size === directions.length, `Map has duplicate directional exits: ${areaId}`);
});

assertConnection(
  'northfield-misty-forest-mf1',
  'trail',
  { areaId: 'briarwell-northfield', transitionId: 'northeast-path', direction: 'northeast' },
  { areaId: 'briarwell-misty-forest-mf1', transitionId: 'southwest-path', direction: 'southwest' }
);
assertConnection(
  'misty-forest-mf1-mf2',
  'trail',
  { areaId: 'briarwell-misty-forest-mf1', transitionId: 'north-path', direction: 'north' },
  { areaId: 'briarwell-misty-forest-mf2', transitionId: 'south-path', direction: 'south' }
);
assertConnection(
  'misty-forest-mf2-mf3',
  'trail',
  { areaId: 'briarwell-misty-forest-mf2', transitionId: 'north-path', direction: 'north' },
  { areaId: 'briarwell-misty-forest-mf3', transitionId: 'south-path', direction: 'south' }
);
assertConnection(
  'misty-forest-mf3-swimmable',
  'trail',
  { areaId: 'briarwell-misty-forest-mf3', transitionId: 'west-path', direction: 'west' },
  { areaId: 'briarwell-swimmable', transitionId: 'east-path', direction: 'east' }
);
assertConnection(
  'waterfall-swimmable',
  'river-escape',
  { areaId: 'briarwell-waterfall', transitionId: 'southeast-current', direction: 'southeast' },
  { areaId: 'briarwell-swimmable', spawnId: 'from-waterfall', direction: 'northwest' },
  true
);

const mf3 = maps.get('briarwell-misty-forest-mf3');
assert(
  !mf3.exits.some((exit) => exit.direction === 'north')
    && mf3.futureConnections?.length === 1
    && mf3.futureConnections[0].id === 'misty-forest-mf3-mountain-m1'
    && mf3.futureConnections[0].status === 'art-only',
  'MF3 must show the future M1 climb without exposing a north transition.'
);
assert(
  mf3.interactables.some((feature) => (
    feature.id === 'future-mountain-trail'
      && feature.interactionText.includes('impassable for now')
  )),
  'MF3 must explain why its visible mountain route cannot yet be climbed.'
);

const swimmable = maps.get('briarwell-swimmable');
const waterfall = maps.get('briarwell-waterfall');
const waterfallExit = transition('briarwell-waterfall', 'southeast-current');
assert(
  swimmable.waterTraversal?.status === 'animation-planned'
    && swimmable.waterTraversal?.mode === 'shoreline-only'
    && swimmable.waterTraversal?.arrivalSpawn === 'from-waterfall'
    && swimmable.waterTraversal?.southOutflow?.direction === 'south'
    && swimmable.waterTraversal?.southOutflow?.status === 'visual-only'
    && swimmable.waterTraversal?.southOutflow?.transition === null,
  'Swimmable must reserve deep-water movement until swimming animation exists.'
);
assert(
  swimmable.exits.length === 1
    && swimmable.exits[0].target?.areaId === 'briarwell-misty-forest-mf3'
    && !swimmable.exits.some((exit) => exit.target?.areaId === 'briarwell-waterfall')
    && !swimmable.exits.some((exit) => exit.direction === 'south'),
  'Swimmable must not expose a return route up the Waterfall current or a premature south-water transition.'
);
assert(
  waterfall.forcedEntry?.status === 'reserved'
    && waterfall.forcedEntry?.spawnId === 'from-mountain-fall'
    && waterfall.waterTraversal?.status === 'animation-planned',
  'Waterfall must reserve the future mountain knockback entry and swimming animation handoff.'
);
assert(
  waterfallExit?.status === 'active'
    && waterfallExit.target?.areaId === 'briarwell-swimmable'
    && waterfallExit.target?.spawnId === 'from-waterfall'
    && waterfallExit.target?.returnTransitionId === undefined,
  'Waterfall must escape one way into Swimmable without naming a reciprocal transition.'
);

const { AreaRegistry, auditTopology, MapGeometry } = loadEngines();
const registry = new AreaRegistry(registryData);
const waterfallResolution = registry.resolveTransition(waterfallExit);
assert(
  waterfallResolution.state === 'ready'
    && waterfallResolution.targetAreaId === 'briarwell-swimmable'
    && waterfallResolution.spawnId === 'from-waterfall'
    && waterfallResolution.returnTransitionId === null,
  'The one-way Waterfall escape does not resolve to Swimmable safely.'
);
assert(
  registry.getConnectionForTransition('briarwell-waterfall', 'southeast-current')?.oneWay === true
    && registry.getConnectionForTransition('briarwell-swimmable', 'from-waterfall') === null,
  'The river arrival spawn was incorrectly registered as a reverse transition.'
);

const riverWithoutDirectionality = JSON.parse(JSON.stringify(registryData));
delete riverWithoutDirectionality.connections
  .find((connection) => connection.id === 'waterfall-swimmable').oneWay;
assert(
  (() => {
    try {
      new AreaRegistry(riverWithoutDirectionality);
      return false;
    } catch (error) {
      return error.message.includes('must be one-way');
    }
  })(),
  'A river escape was allowed to lose its explicit one-way contract.'
);

const mapsWithFalseReturn = new Map([...maps].map(([areaId, map]) => (
  [areaId, JSON.parse(JSON.stringify(map))]
)));
mapsWithFalseReturn.get('briarwell-waterfall').exits[0].target.returnTransitionId = 'east-path';
assert(
  auditTopology(registry, mapsWithFalseReturn).errors.some((error) => (
    error.includes('One-way transition names a returnTransitionId')
  )),
  'Topology validation did not reject a false return route from Swimmable to Waterfall.'
);

const geometrySamples = {
  'briarwell-misty-forest-mf1': {
    open: [[790, 45], [600, 600], [120, 1035]],
    closed: [[45, 500], [1400, 500], [1400, 1040]]
  },
  'briarwell-misty-forest-mf2': {
    open: [[775, 45], [690, 600], [540, 1040]],
    closed: [[45, 500], [1400, 500]]
  },
  'briarwell-misty-forest-mf3': {
    open: [[45, 510], [740, 620], [740, 1040], [785, 260]],
    closed: [[740, 45], [1400, 510]]
  },
  'briarwell-swimmable': {
    open: [[1400, 590], [1100, 720], [1040, 720]],
    closed: [[45, 590], [600, 600], [820, 780], [720, 45], [720, 1070]]
  },
  'briarwell-waterfall': {
    open: [[720, 850], [1380, 980]],
    closed: [[45, 590], [720, 45], [720, 500]]
  }
};

Object.entries(geometrySamples).forEach(([areaId, samples]) => {
  const geometry = new MapGeometry(maps.get(areaId));
  samples.open.forEach(([x, y]) => {
    assert(geometry.isWalkable(x, y), `${areaId} blocks approved ground at ${x},${y}.`);
  });
  samples.closed.forEach(([x, y]) => {
    assert(!geometry.isWalkable(x, y), `${areaId} exposes unapproved ground at ${x},${y}.`);
  });
});

assert(
  new MapGeometry(maps.get('briarwell-misty-forest-mf1')).getTriggerAt({ x: 790, y: 45 })?.id === 'north-path'
    && new MapGeometry(mf3).getTriggerAt({ x: 45, y: 510 })?.id === 'west-path'
    && new MapGeometry(swimmable).getTriggerAt({ x: 1400, y: 590 })?.id === 'east-path'
    && new MapGeometry(waterfall).getTriggerAt({ x: 1380, y: 980 })?.id === 'southeast-current',
  'One or more edge openings lack their exact authored transition trigger.'
);

console.log('Misty Forest MF1-MF3, Swimmable and one-way Waterfall escape contracts passed.');
