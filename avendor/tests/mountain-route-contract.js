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

function assertConnection(connectionId, left, right) {
  const connection = registryData.connections.find((candidate) => candidate.id === connectionId);
  assert(connection?.kind === 'trail', `Connection is not a trail: ${connectionId}`);
  assert(
    connection.visibility === 'public' && connection.status === 'active' && !connection.oneWay,
    `Connection is not active, public and reciprocal: ${connectionId}`
  );
  assert(
    JSON.stringify(connection.endpoints[0]) === JSON.stringify(left),
    `Connection has the wrong first endpoint: ${connectionId}`
  );
  assert(
    JSON.stringify(connection.endpoints[1]) === JSON.stringify(right),
    `Connection has the wrong second endpoint: ${connectionId}`
  );
}

const mapContracts = {
  'briarwell-mountain-m1': {
    art: 'briarwell-mountain-m1-v1.webp',
    directions: ['north', 'south'],
    position: [1, -5]
  },
  'briarwell-mountain-m2': {
    art: 'briarwell-mountain-m2-v1.webp',
    directions: ['north', 'south'],
    position: [1, -6]
  },
  'briarwell-mountain-m3': {
    art: 'briarwell-mountain-m3-v1.webp',
    directions: ['north', 'south'],
    position: [1, -7]
  },
  'briarwell-mountain-m4': {
    art: 'briarwell-mountain-m4-v1.webp',
    directions: ['east', 'south', 'west'],
    position: [1, -8]
  },
  'briarwell-mountain-m5': {
    art: 'briarwell-mountain-m5-v1.webp',
    directions: ['east'],
    position: [0, -8]
  },
  'briarwell-mountain-dwarven-cave': {
    art: 'briarwell-dwarven-cave-v1.webp',
    directions: ['west'],
    position: [2, -8]
  }
};

Object.entries(mapContracts).forEach(([areaId, contract]) => {
  const area = areas.get(areaId);
  const map = maps.get(areaId);
  const directions = map?.exits.map((exit) => exit.direction).sort() || [];

  assert(area?.status === 'playable' && area.kind === 'outdoor' && area.map, `Area is not a playable outdoor map: ${areaId}`);
  assert(map?.id === areaId && map.version === '0.1.0', `Map identity/version mismatch: ${areaId}`);
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
  assert(map.exits.every((exit) => exit.status === 'active'), `Map contains a non-active live exit: ${areaId}`);
});

assertConnection(
  'misty-forest-mf3-mountain-m1',
  { areaId: 'briarwell-misty-forest-mf3', transitionId: 'north-path', direction: 'north' },
  { areaId: 'briarwell-mountain-m1', transitionId: 'south-path', direction: 'south' }
);
assertConnection(
  'mountain-m1-m2',
  { areaId: 'briarwell-mountain-m1', transitionId: 'north-path', direction: 'north' },
  { areaId: 'briarwell-mountain-m2', transitionId: 'south-path', direction: 'south' }
);
assertConnection(
  'mountain-m2-m3',
  { areaId: 'briarwell-mountain-m2', transitionId: 'north-path', direction: 'north' },
  { areaId: 'briarwell-mountain-m3', transitionId: 'south-path', direction: 'south' }
);
assertConnection(
  'mountain-m3-m4',
  { areaId: 'briarwell-mountain-m3', transitionId: 'north-path', direction: 'north' },
  { areaId: 'briarwell-mountain-m4', transitionId: 'south-path', direction: 'south' }
);
assertConnection(
  'mountain-m4-m5',
  { areaId: 'briarwell-mountain-m4', transitionId: 'west-path', direction: 'west' },
  { areaId: 'briarwell-mountain-m5', transitionId: 'east-path', direction: 'east' }
);
assertConnection(
  'mountain-m4-dwarven-cave',
  { areaId: 'briarwell-mountain-m4', transitionId: 'east-path', direction: 'east' },
  { areaId: 'briarwell-mountain-dwarven-cave', transitionId: 'west-path', direction: 'west' }
);

const m5 = maps.get('briarwell-mountain-m5');
assert(
  m5.exits.length === 1
    && !m5.exits.some((exit) => exit.direction === 'west')
    && m5.futureConnections?.length === 1
    && m5.futureConnections[0].id === 'mountain-m5-western-region'
    && m5.futureConnections[0].direction === 'west'
    && m5.futureConnections[0].status === 'art-only',
  'M5 must show but not expose the future westward mountain route.'
);
assert(
  m5.interactables.some((feature) => (
    feature.id === 'future-western-route'
      && feature.interactionText.includes('not yet been charted')
  )),
  'M5 must explain its reserved western route.'
);

const dwarvenCave = maps.get('briarwell-mountain-dwarven-cave');
assert(
  dwarvenCave.exits.length === 1
    && dwarvenCave.portals.length === 0
    && dwarvenCave.futureConnections?.length === 1
    && dwarvenCave.futureConnections[0].id === 'dwarven-cave-descent'
    && dwarvenCave.futureConnections[0].direction === 'down'
    && dwarvenCave.futureConnections[0].status === 'art-only',
  'The Dwarven Cave forecourt must not expose the unauthored interior as a portal.'
);
assert(
  dwarvenCave.interactables.some((feature) => (
    feature.id === 'deeper-dwarven-cave'
      && feature.interactionText.includes('not yet been charted')
  )),
  'The cave entrance must identify the reserved deeper halls.'
);

const { AreaRegistry, auditTopology, MapGeometry } = loadEngines();
const registry = new AreaRegistry(registryData);
const topology = auditTopology(registry, maps);
assert(topology.errors.length === 0, topology.errors.join('\n'));

Object.keys(mapContracts).forEach((areaId) => {
  const map = maps.get(areaId);
  map.exits.forEach((exit) => {
    const resolution = registry.resolveTransition(exit);
    assert(
      resolution.state === 'ready'
        && resolution.targetAreaId === exit.target.areaId
        && resolution.spawnId === exit.target.spawnId,
      `Mountain transition does not resolve safely: ${areaId}/${exit.id}`
    );
  });
});

const geometrySamples = {
  'briarwell-mountain-m1': {
    open: [[730, 45], [730, 650], [725, 1040]],
    closed: [[45, 500], [1400, 500]]
  },
  'briarwell-mountain-m2': {
    open: [[730, 45], [720, 620], [715, 1040]],
    closed: [[45, 500], [1400, 500]]
  },
  'briarwell-mountain-m3': {
    open: [[730, 45], [720, 620], [715, 1040]],
    closed: [[45, 500], [1400, 500]]
  },
  'briarwell-mountain-m4': {
    open: [[45, 450], [720, 530], [720, 1040], [1400, 450]],
    closed: [[720, 45], [45, 900], [1400, 900]]
  },
  'briarwell-mountain-m5': {
    open: [[190, 465], [800, 520], [1400, 460]],
    closed: [[20, 465], [720, 45], [720, 1040]]
  },
  'briarwell-mountain-dwarven-cave': {
    open: [[45, 455], [720, 560], [1020, 350]],
    closed: [[1400, 455], [720, 45], [720, 1040]]
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

const triggerSamples = [
  ['briarwell-mountain-m1', 730, 45, 'north-path'],
  ['briarwell-mountain-m1', 725, 1040, 'south-path'],
  ['briarwell-mountain-m2', 730, 45, 'north-path'],
  ['briarwell-mountain-m2', 715, 1040, 'south-path'],
  ['briarwell-mountain-m3', 730, 45, 'north-path'],
  ['briarwell-mountain-m3', 715, 1040, 'south-path'],
  ['briarwell-mountain-m4', 45, 450, 'west-path'],
  ['briarwell-mountain-m4', 720, 1040, 'south-path'],
  ['briarwell-mountain-m4', 1400, 450, 'east-path'],
  ['briarwell-mountain-m5', 1400, 460, 'east-path'],
  ['briarwell-mountain-dwarven-cave', 45, 455, 'west-path']
];

triggerSamples.forEach(([areaId, x, y, transitionId]) => {
  const trigger = new MapGeometry(maps.get(areaId)).getTriggerAt({ x, y });
  assert(trigger?.id === transitionId, `Edge opening lacks its exact trigger: ${areaId}/${transitionId}`);
});

assert(
  new MapGeometry(m5).getTriggerAt({ x: 20, y: 465 }) === null,
  'M5 exposes a transition on its reserved west edge.'
);
assert(
  new MapGeometry(dwarvenCave).getNearbyInteractable({ x: 1020, y: 350 })?.id === 'deeper-dwarven-cave',
  'The reachable dwarven descent does not resolve as an interactable landmark.'
);

console.log('Mountain M1-M5 and Dwarven Cave route contracts passed.');
