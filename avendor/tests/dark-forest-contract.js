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

function assertConnection(connectionId, left, right) {
  const record = registry.connections.find((candidate) => candidate.id === connectionId);
  assert(record?.kind === 'road', `Dark-forest connection is not an outdoor route: ${connectionId}`);
  assert(record.visibility === 'public', `Dark-forest connection is not public: ${connectionId}`);
  assert(record.status === 'active', `Dark-forest connection is not active: ${connectionId}`);
  const endpoints = record.endpoints.map((endpoint) => (
    `${endpoint.areaId}/${endpoint.transitionId}/${endpoint.direction}`
  ));
  assert(endpoints.includes(left), `Connection has the wrong first endpoint: ${connectionId}`);
  assert(endpoints.includes(right), `Connection has the wrong second endpoint: ${connectionId}`);
}

const mapContracts = {
  'briarwell-forest-f16': {
    directions: ['north', 'south', 'west'],
    position: [-2, -2],
    art: 'briarwell-forest-f16-v1.webp'
  },
  'briarwell-forest-f17': {
    directions: ['south', 'west'],
    position: [-2, -3],
    art: 'briarwell-forest-f17-v1.webp'
  },
  'briarwell-forest-f18': {
    directions: ['east', 'north'],
    position: [-3, -1],
    art: 'briarwell-forest-f18-v1.webp'
  },
  'briarwell-forest-f19': {
    directions: ['east', 'south', 'west'],
    position: [-3, -2],
    art: 'briarwell-forest-f19-v1.webp'
  },
  'briarwell-forest-f20': {
    directions: ['east', 'north', 'west'],
    position: [-3, -3],
    art: 'briarwell-forest-f20-v2.webp',
    version: '0.2.0'
  },
  'briarwell-forest-f21': {
    directions: ['east', 'south'],
    position: [-4, -3],
    art: 'briarwell-forest-f21-v1.webp'
  },
  'briarwell-forest-f22': {
    directions: ['east', 'north'],
    position: [-4, -2],
    art: 'briarwell-forest-f22-v1.webp'
  }
};

const edgeSamples = {
  north: [720, 45],
  east: [1400, 510],
  south: [720, 1040],
  west: [45, 510]
};
const MapGeometry = loadMapEngine().MapGeometry;

Object.entries(mapContracts).forEach(([areaId, contract]) => {
  const area = areas.get(areaId);
  const map = maps.get(areaId);
  const directions = map?.exits.map((exit) => exit.direction).sort() || [];
  const expectedDirections = contract.directions.slice().sort();

  assert(area?.status === 'playable' && area.map, `Dark-forest area is not playable: ${areaId}`);
  assert(
    map?.id === areaId && map.version === (contract.version || '0.1.0'),
    `Dark-forest map identity/version mismatch: ${areaId}`
  );
  assert(map.art.background.endsWith(contract.art), `Canonical dark-forest art is not active: ${areaId}`);
  assert(map.art.alt.toLowerCase().includes('untracked'), `Dark-forest art contract does not forbid visible tracks: ${areaId}`);
  assert(
    area.planPosition?.column === contract.position[0]
      && area.planPosition?.row === contract.position[1],
    `Dark-forest plan position changed: ${areaId}`
  );
  assert(
    directions.join(',') === expectedDirections.join(','),
    `Dark-forest map exposes an erroneous edge: ${areaId}`
  );
  assert(
    new Set(directions).size === directions.length,
    `Dark-forest map exposes more than one clearing in a direction: ${areaId}`
  );
  assert(
    map.walkable.length === 1 && map.walkable[0].id === 'untracked-forest-glade',
    `Dark-forest movement must use one untracked glade rather than painted routes: ${areaId}`
  );
  assert(
    map.exits.every((exit) => exit.id.endsWith('-clearing') && exit.label.toLowerCase().includes('clearing')),
    `Dark-forest transitions must be described only as clearings: ${areaId}`
  );

  const geometry = new MapGeometry(map);
  Object.entries(edgeSamples).forEach(([direction, [x, y]]) => {
    const expectedOpen = contract.directions.includes(direction);
    assert(
      geometry.isWalkable(x, y) === expectedOpen,
      `${areaId} ${direction} edge disagrees with the approved clearing topology.`
    );
    const trigger = geometry.getTriggerAt({ x, y });
    if (expectedOpen) {
      assert(trigger?.direction === direction, `${areaId} ${direction} clearing has no matching trigger.`);
    } else {
      assert(!trigger, `${areaId} exposes an unlisted ${direction} transition.`);
    }
  });
});

[
  ['forest-f15-f16', 'briarwell-forest-f15/north-clearing/north', 'briarwell-forest-f16/south-clearing/south'],
  ['forest-f15-f18', 'briarwell-forest-f15/west-path/west', 'briarwell-forest-f18/east-clearing/east'],
  ['forest-f16-f17', 'briarwell-forest-f16/north-clearing/north', 'briarwell-forest-f17/south-clearing/south'],
  ['forest-f16-f19', 'briarwell-forest-f16/west-clearing/west', 'briarwell-forest-f19/east-clearing/east'],
  ['forest-f17-f20', 'briarwell-forest-f17/west-clearing/west', 'briarwell-forest-f20/east-clearing/east'],
  ['forest-f18-f19', 'briarwell-forest-f18/north-clearing/north', 'briarwell-forest-f19/south-clearing/south'],
  ['forest-f19-f22', 'briarwell-forest-f19/west-clearing/west', 'briarwell-forest-f22/east-clearing/east'],
  ['forest-f20-f21', 'briarwell-forest-f20/west-clearing/west', 'briarwell-forest-f21/east-clearing/east'],
  ['forest-f20-ogre-clearing', 'briarwell-forest-f20/north-clearing/north', 'briarwell-ogre-clearing/south-clearing/south'],
  ['forest-f21-f22', 'briarwell-forest-f21/south-clearing/south', 'briarwell-forest-f22/north-clearing/north']
].forEach(([connectionId, left, right]) => assertConnection(connectionId, left, right));

const ogreArea = areas.get('briarwell-ogre-clearing');
const ogre = maps.get('briarwell-ogre-clearing');
const ogreGeometry = new MapGeometry(ogre);
const boulder = ogre.interactables.find((feature) => feature.id === 'sealed-ogre-cave-boulder');

assert(
  ogreArea?.status === 'playable'
    && ogreArea.planPosition?.column === -3
    && ogreArea.planPosition?.row === -4,
  "The Ogre's Clearing must be a playable branch directly north of F20."
);
assert(
  ogre?.version === '0.1.0'
    && ogre.referenceSize.width === 2048
    && ogre.referenceSize.height === 944
    && ogre.art.background.endsWith('briarwell-ogre-clearing-v1.webp'),
  'The Ogre arena must retain its approved wide background and runtime dimensions.'
);
assert(
  ogre.referenceSize.width > 1448,
  'The Ogre arena must be wider than the horizontal camera viewport.'
);
assert(
  ogre.exits.length === 1
    && ogre.exits[0].id === 'south-clearing'
    && ogre.exits[0].target?.areaId === 'briarwell-forest-f20',
  'The Ogre arena must expose only its reciprocal south clearing to F20.'
);
assert(
  ogreGeometry.isWalkable(300, 560)
    && ogreGeometry.isWalkable(1748, 560)
    && ogreGeometry.isWalkable(1024, 520),
  'The Ogre arena floor must remain broad and open enough for scrolling boss combat.'
);
assert(
  ogreGeometry.getTriggerAt({ x: 1024, y: 900 })?.id === 'south-clearing'
    && !ogreGeometry.isWalkable(1024, 45),
  'The arena must open south while the northern cave remains physically sealed.'
);
assert(
  boulder?.interactionText.includes('Strength 8')
    && ogreGeometry.getNearbyInteractable({ x: 1024, y: 250 })?.id === boulder.id,
  'The sealed cave boulder must communicate and expose the authored Strength 8 interaction.'
);
assert(
  ogre.npcs.length === 0
    && ogre.bossEncounter?.id === 'ogre-boss'
    && ogre.bossEncounter.status === 'planned'
    && ogreGeometry.isWalkable(ogre.bossEncounter.anchor.x, ogre.bossEncounter.anchor.y),
  'The future ogre must have a legal planned sprite anchor without being spawned yet.'
);

const f15 = maps.get('briarwell-forest-f15');
const f15Geometry = new MapGeometry(f15);
assert(
  f15.version === '0.2.0'
    && f15.art.background.endsWith('briarwell-forest-f15-v2.webp')
    && f15.walkable.some((region) => region.id === 'north-forest-clearing'),
  'F15 must activate its v2 untracked north opening without replacing the established roads.'
);
assert(
  transition('briarwell-forest-f15', 'north-clearing')?.status === 'active'
    && transition('briarwell-forest-f15', 'north-clearing')?.target?.areaId === 'briarwell-forest-f16'
    && transition('briarwell-forest-f15', 'west-path')?.status === 'active'
    && transition('briarwell-forest-f15', 'west-path')?.target?.areaId === 'briarwell-forest-f18',
  'F15 must open both canonical entrances into the dark forest.'
);
assert(f15Geometry.isWalkable(720, 45), 'F15 north clearing into F16 is blocked.');

assert(
  !registry.connections.some((connection) => (
    connection.endpoints.some((endpoint) => endpoint.areaId === 'briarwell-forest-f19')
      && connection.endpoints.some((endpoint) => endpoint.areaId === 'briarwell-forest-f20')
  )),
  'F19 and F20 must not gain an invented connection.'
);

['briarwell-forest-f21', 'briarwell-forest-f22'].forEach((areaId) => {
  const map = maps.get(areaId);
  const geometry = new MapGeometry(map);
  assert(!geometry.isWalkable(45, 510), `${areaId} westernmost thorn boundary became traversable.`);
  assert(
    map.interactables.some((feature) => feature.id.includes('western')),
    `${areaId} must identify its impassable western boundary.`
  );
});

console.log("Dark-forest F16-F22 and Ogre's Clearing contracts passed.");
