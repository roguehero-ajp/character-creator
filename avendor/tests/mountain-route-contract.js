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
    version: '0.2.0',
    directions: ['east', 'west'],
    position: [0, -8]
  },
  'briarwell-rock-ledge-pass': {
    art: 'briarwell-rock-ledge-pass-v1.webp',
    directions: ['east', 'northwest'],
    position: [-1, -8],
    size: [2048, 944]
  },
  'briarwell-mountain-m6': {
    art: 'briarwell-mountain-m6-v1.webp',
    directions: ['southeast', 'southwest'],
    position: [-2, -9]
  },
  'briarwell-mountain-m7': {
    art: 'briarwell-mountain-m7-v1.webp',
    directions: ['northeast', 'west'],
    position: [-3, -8]
  },
  'briarwell-mountain-m8': {
    art: 'briarwell-mountain-m8-v1.webp',
    directions: ['east', 'west'],
    position: [-4, -8]
  },
  'briarwell-mountain-m9': {
    art: 'briarwell-mountain-m9-v1.webp',
    directions: ['east', 'west'],
    position: [-5, -8]
  },
  'briarwell-mountain-m10': {
    art: 'briarwell-mountain-m10-v1.webp',
    directions: ['east'],
    position: [-6, -8]
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
  assert(
    map?.id === areaId && map.version === (contract.version || '0.1.0'),
    `Map identity/version mismatch: ${areaId}`
  );
  const expectedSize = contract.size || [1448, 1086];
  assert(
    map.referenceSize.width === expectedSize[0] && map.referenceSize.height === expectedSize[1],
    `Map has the wrong screen size: ${areaId}`
  );
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
  'mountain-m5-rock-ledge-pass',
  { areaId: 'briarwell-mountain-m5', transitionId: 'west-path', direction: 'west' },
  { areaId: 'briarwell-rock-ledge-pass', transitionId: 'east-path', direction: 'east' }
);
assertConnection(
  'rock-ledge-pass-m6',
  { areaId: 'briarwell-rock-ledge-pass', transitionId: 'northwest-path', direction: 'northwest' },
  { areaId: 'briarwell-mountain-m6', transitionId: 'southeast-path', direction: 'southeast' }
);
assertConnection(
  'mountain-m6-m7',
  { areaId: 'briarwell-mountain-m6', transitionId: 'southwest-path', direction: 'southwest' },
  { areaId: 'briarwell-mountain-m7', transitionId: 'northeast-path', direction: 'northeast' }
);
assertConnection(
  'mountain-m7-m8',
  { areaId: 'briarwell-mountain-m7', transitionId: 'west-path', direction: 'west' },
  { areaId: 'briarwell-mountain-m8', transitionId: 'east-path', direction: 'east' }
);
assertConnection(
  'mountain-m8-m9',
  { areaId: 'briarwell-mountain-m8', transitionId: 'west-path', direction: 'west' },
  { areaId: 'briarwell-mountain-m9', transitionId: 'east-path', direction: 'east' }
);
assertConnection(
  'mountain-m9-m10',
  { areaId: 'briarwell-mountain-m9', transitionId: 'west-path', direction: 'west' },
  { areaId: 'briarwell-mountain-m10', transitionId: 'east-path', direction: 'east' }
);
assertConnection(
  'mountain-m4-dwarven-cave',
  { areaId: 'briarwell-mountain-m4', transitionId: 'east-path', direction: 'east' },
  { areaId: 'briarwell-mountain-dwarven-cave', transitionId: 'west-path', direction: 'west' }
);

const m5 = maps.get('briarwell-mountain-m5');
assert(
  m5.exits.length === 2
    && m5.exits.some((exit) => (
      exit.id === 'west-path'
        && exit.target?.areaId === 'briarwell-rock-ledge-pass'
        && exit.target?.spawnId === 'from-east'
    ))
    && !m5.futureConnections,
  'M5 must expose the completed westward route into Rock Ledge Pass.'
);
assert(
  m5.interactables.some((feature) => (
    feature.id === 'rock-ledge-approach'
      && feature.interactionText.includes('Rock Ledge Pass')
  )),
  'M5 must describe its active Rock Ledge approach.'
);

const rockLedge = maps.get('briarwell-rock-ledge-pass');
assert(
  rockLedge.hazards?.length === 3
    && rockLedge.hazards.map((hazard) => hazard.check?.multiplier).join(',') === '7,6,7'
    && rockLedge.hazards.every((hazard) => (
      hazard.check?.type === 'ledge-balance'
        && hazard.check?.skill === 'Climb'
        && hazard.check?.die === 100
        && hazard.check?.luckCheck?.die === 10
        && hazard.check?.failureTarget?.areaId === 'briarwell-waterfall'
        && hazard.check?.failureTarget?.spawnId === 'from-mountain-fall'
    )),
  'Rock Ledge Pass must preserve its ordered ×7, ×6, ×7 Agility-plus-Climb hazards and Waterfall consequence.'
);
const m10 = maps.get('briarwell-mountain-m10');
assert(
  m10.exits.length === 1
    && m10.futureConnections?.length === 1
    && m10.futureConnections[0].id === 'mountain-m10-m11'
    && m10.futureConnections[0].direction === 'south'
    && m10.futureConnections[0].status === 'art-only',
  'M10 must show an open southbound trail without exposing an unauthored M11 transition.'
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
const mountainAreaIds = new Set(Object.keys(mapContracts));
const mountainTopologyErrors = topology.errors.filter((error) => (
  [...mountainAreaIds].some((areaId) => error.includes(areaId))
));
assert(mountainTopologyErrors.length === 0, mountainTopologyErrors.join('\n'));

const rockLedgeGeometry = new MapGeometry(rockLedge);
[
  [505, 330, 'western-ledge-check'],
  [1060, 480, 'middle-ledge-check'],
  [1600, 590, 'eastern-ledge-check']
].forEach(([x, y, hazardId]) => {
  assert(
    rockLedgeGeometry.isWalkable(x, y)
      && rockLedgeGeometry.getHazardAt({ x, y })?.id === hazardId
      && rockLedgeGeometry.getTriggerAt({ x, y }) === null,
    `Rock Ledge checkpoint is not embedded cleanly in the traversable ledge: ${hazardId}`
  );
});
assert(
  !rockLedgeGeometry.getHazardAt(rockLedge.spawnPoints['from-east'])
    && !rockLedgeGeometry.getHazardAt(rockLedge.spawnPoints['from-northwest']),
  'A Rock Ledge arrival spawn overlaps a balance checkpoint.'
);

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
    open: [[45, 465], [190, 465], [800, 520], [1400, 460]],
    closed: [[720, 45], [720, 1040]]
  },
  'briarwell-rock-ledge-pass': {
    open: [[55, 60], [235, 165], [505, 330], [1060, 480], [1600, 590], [1995, 610]],
    closed: [[1000, 100], [1000, 850]]
  },
  'briarwell-mountain-m6': {
    open: [[45, 680], [710, 535], [1400, 690]],
    closed: [[720, 45], [720, 1040]]
  },
  'briarwell-mountain-m7': {
    open: [[45, 520], [720, 530], [1400, 130]],
    closed: [[720, 45], [720, 1040]]
  },
  'briarwell-mountain-m8': {
    open: [[45, 520], [720, 535], [1400, 520]],
    closed: [[720, 45], [720, 1040]]
  },
  'briarwell-mountain-m9': {
    open: [[45, 515], [720, 535], [1400, 515]],
    closed: [[720, 45], [720, 1040]]
  },
  'briarwell-mountain-m10': {
    open: [[1400, 515], [780, 565], [700, 1040]],
    closed: [[45, 500], [720, 45], [1400, 900]]
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
  ['briarwell-mountain-m5', 45, 465, 'west-path'],
  ['briarwell-rock-ledge-pass', 55, 60, 'northwest-path'],
  ['briarwell-rock-ledge-pass', 1995, 610, 'east-path'],
  ['briarwell-mountain-m6', 45, 680, 'southwest-path'],
  ['briarwell-mountain-m6', 1400, 690, 'southeast-path'],
  ['briarwell-mountain-m7', 1400, 130, 'northeast-path'],
  ['briarwell-mountain-m7', 45, 520, 'west-path'],
  ['briarwell-mountain-m8', 1400, 520, 'east-path'],
  ['briarwell-mountain-m8', 45, 520, 'west-path'],
  ['briarwell-mountain-m9', 1400, 515, 'east-path'],
  ['briarwell-mountain-m9', 45, 515, 'west-path'],
  ['briarwell-mountain-m10', 1400, 515, 'east-path'],
  ['briarwell-mountain-dwarven-cave', 45, 455, 'west-path']
];

triggerSamples.forEach(([areaId, x, y, transitionId]) => {
  const trigger = new MapGeometry(maps.get(areaId)).getTriggerAt({ x, y });
  assert(trigger?.id === transitionId, `Edge opening lacks its exact trigger: ${areaId}/${transitionId}`);
});

assert(
  new MapGeometry(m10).getTriggerAt({ x: 700, y: 1040 }) === null,
  'M10 exposes a transition on its reserved south edge.'
);
assert(
  new MapGeometry(dwarvenCave).getNearbyInteractable({ x: 1020, y: 350 })?.id === 'deeper-dwarven-cave',
  'The reachable dwarven descent does not resolve as an interactable landmark.'
);

console.log('Mountain M1-M10, Rock Ledge Pass and Dwarven Cave route contracts passed.');
