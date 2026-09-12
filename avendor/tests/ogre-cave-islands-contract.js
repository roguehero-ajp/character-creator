'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const avendorRoot = path.resolve(__dirname, '..');
const registryData = JSON.parse(
  fs.readFileSync(path.join(avendorRoot, 'data/maps/briarwell-area-registry.json'), 'utf8')
);
const areas = new Map(registryData.areas.map((area) => [area.id, area]));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadMap(areaId) {
  const area = areas.get(areaId);
  assert(area?.status === 'playable' && area.map, `New area is not playable: ${areaId}`);
  return JSON.parse(fs.readFileSync(path.join(avendorRoot, area.map), 'utf8'));
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

function readWebpDimensions(filePath) {
  const bytes = fs.readFileSync(filePath);
  assert(
    bytes.subarray(0, 4).toString('ascii') === 'RIFF'
      && bytes.subarray(8, 12).toString('ascii') === 'WEBP',
    `Canonical scene is not a WebP image: ${filePath}`
  );
  const chunk = bytes.subarray(12, 16).toString('ascii');
  if (chunk === 'VP8X') {
    return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  }
  if (chunk === 'VP8 ') {
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    return {
      width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
      height: 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10)
    };
  }
  throw new Error(`Unsupported WebP encoding: ${filePath}/${chunk}`);
}

function transition(map, transitionId) {
  return [...(map.exits || []), ...(map.portals || [])]
    .find((candidate) => candidate.id === transitionId);
}

function assertReciprocal(leftMap, leftId, rightMap, rightId) {
  const left = transition(leftMap, leftId);
  const right = transition(rightMap, rightId);
  assert(left?.status === 'active' && right?.status === 'active', `Route is not active: ${leftId}/${rightId}`);
  assert(
    left.target?.areaId === rightMap.id
      && left.target.returnTransitionId === rightId
      && right.target?.areaId === leftMap.id
      && right.target.returnTransitionId === leftId,
    `Route is not reciprocal: ${leftMap.id}/${leftId} <-> ${rightMap.id}/${rightId}`
  );
  assert(rightMap.spawnPoints[left.target.spawnId], `Forward route names a missing spawn: ${leftId}`);
  assert(leftMap.spawnPoints[right.target.spawnId], `Return route names a missing spawn: ${rightId}`);
}

const newAreaIds = [
  'briarwell-ogre-cave',
  'briarwell-haunted-island-landing',
  'briarwell-haunted-island-house',
  'briarwell-little-island',
  'briarwell-little-island-treasure'
];
const maps = new Map(newAreaIds.map((areaId) => [areaId, loadMap(areaId)]));
const { AreaRegistry, auditTopology, MapGeometry } = loadEngines();
const registry = new AreaRegistry(registryData);

assert(registryData.version === '0.33.0', 'The Ogre Cave and lake islands require registry version 0.33.0.');
newAreaIds.forEach((areaId) => {
  const area = areas.get(areaId);
  const map = maps.get(areaId);
  const artPath = path.join(avendorRoot, map.art.background);
  assert(map.id === areaId && map.title === area.title, `Registry/map identity mismatch: ${areaId}`);
  assert(map.version === '0.1.0', `New map version changed unexpectedly: ${areaId}`);
  assert(map.referenceSize.width === 1448 && map.referenceSize.height === 1086, `Map canvas is not full resolution: ${areaId}`);
  assert(!map.art.background.toLowerCase().endsWith('.svg'), `Runtime art cannot be an SVG wrapper: ${areaId}`);
  assert(fs.statSync(artPath).size >= 200000, `Runtime art is suspiciously small: ${areaId}`);
  assert(
    JSON.stringify(readWebpDimensions(artPath)) === JSON.stringify(map.referenceSize),
    `Runtime art dimensions disagree with map geometry: ${areaId}`
  );

  const geometry = new MapGeometry(map);
  Object.entries(map.spawnPoints).forEach(([spawnId, spawn]) => {
    assert(geometry.isWalkable(spawn.x, spawn.y), `Spawn is not walkable: ${areaId}/${spawnId}`);
    assert(!geometry.getTriggerAt(spawn), `Spawn immediately retriggers a transition: ${areaId}/${spawnId}`);
    assert(!geometry.getHazardAt(spawn), `Spawn overlaps a hazard: ${areaId}/${spawnId}`);
  });
});

const allLoadedMaps = new Map(registryData.areas
  .filter((area) => area.status === 'playable')
  .map((area) => [
    area.id,
    JSON.parse(fs.readFileSync(path.join(avendorRoot, area.map), 'utf8'))
  ]));
const topology = auditTopology(registry, allLoadedMaps);
const touchedAreaIds = [...newAreaIds, 'briarwell-ogre-clearing'];
const touchedTopologyErrors = topology.errors.filter((error) => (
  touchedAreaIds.some((areaId) => error.includes(areaId))
));
assert(
  touchedTopologyErrors.length === 0,
  `New topology errors:\n${touchedTopologyErrors.join('\n')}`
);

const clearing = loadMap('briarwell-ogre-clearing');
const cave = maps.get('briarwell-ogre-cave');
const boulder = transition(clearing, 'ogre-cave-boulder');
const caveExit = transition(cave, 'south-cave-mouth');
assertReciprocal(clearing, 'ogre-cave-boulder', cave, 'south-cave-mouth');
assert(
  boulder.activation === 'interact'
    && boulder.check?.type === 'stat-minimum'
    && boulder.check.stat === 'strength'
    && boulder.check.minimum === 8
    && boulder.check.discoveryId === 'ogre-cave-boulder-moved',
  'The Ogre Cave boulder must use the persistent Strength 8 gate.'
);
assert(
  caveExit.direction === 'south'
    && new MapGeometry(clearing).getNearbyInteractable({ x: 1024, y: 300 })?.id === boulder.id,
  'The cave entrance or return route cannot be reached.'
);

const caveFeatures = new Map(cave.interactables.map((feature) => [feature.id, feature]));
assert(
  [...caveFeatures.keys()].sort().join('|') === [
    'ogre-frost-longsword',
    'ogre-metal-shield',
    'ogre-treasure-chest'
  ].join('|'),
  'The Ogre Cave must contain exactly the approved chest, sword and shield.'
);
const chest = caveFeatures.get('ogre-treasure-chest');
assert(
  chest.action === 'claim-ogre-cave-chest'
    && chest.loot.once === true
    && chest.loot.currency.gold === 30
    && chest.loot.currency.silver === 40
    && JSON.stringify(chest.loot.gems) === JSON.stringify([
      { id: 'emerald', quantity: 1 },
      { id: 'sapphire', quantity: 1 },
      { id: 'ruby', quantity: 1 }
    ]),
  'The Ogre Cave chest contents do not match the approved fixed loot.'
);
const sword = caveFeatures.get('ogre-frost-longsword');
assert(
  sword.action === 'claim-ogre-frost-longsword'
    && sword.item.type === 'weapon'
    && sword.item.weaponClass === 'longsword'
    && sword.item.magical === true
    && sword.item.damageBonus.amount === 2
    && sword.item.damageBonus.type === 'frost'
    && sword.item.onHitEffects.length === 1
    && sword.item.onHitEffects[0].type === 'slow',
  'The magic longsword must add 2 frost damage and inflict Slow.'
);
const shield = caveFeatures.get('ogre-metal-shield');
assert(
  shield.action === 'claim-ogre-metal-shield'
    && shield.item.type === 'shield'
    && shield.item.material === 'metal',
  'The Ogre Cave must contain the approved metal shield.'
);

const storage = new Map();
const runtimeContext = {
  console,
  localStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value)
  },
  window: {}
};
vm.createContext(runtimeContext);
vm.runInContext(fs.readFileSync(path.join(avendorRoot, 'js/ogre-cave-runtime.js'), 'utf8'), runtimeContext);
const lootRuntime = runtimeContext.window.AvendorOgreCave;
assert(lootRuntime, 'The Ogre Cave loot runtime did not expose its testable API.');
let lootState = lootRuntime.defaultState();
['claim-ogre-cave-chest', 'claim-ogre-frost-longsword', 'claim-ogre-metal-shield'].forEach((action) => {
  const first = lootRuntime.claim(action, lootState);
  assert(first.handled && first.firstClaim, `First persistent pickup failed: ${action}`);
  lootState = first.state;
  const repeat = lootRuntime.claim(action, lootState);
  assert(repeat.handled && !repeat.firstClaim, `Repeat pickup was not blocked: ${action}`);
});
lootRuntime.saveState(lootState);
assert(
  JSON.stringify(lootRuntime.readState()) === JSON.stringify({
    chestOpened: true,
    swordClaimed: true,
    shieldClaimed: true
  }),
  'Ogre Cave pickup state did not persist.'
);
assert(
  lootRuntime.noticeFor('claim-ogre-cave-chest', true).includes('30 gold pieces')
    && lootRuntime.noticeFor('claim-ogre-cave-chest', true).includes('40 silver pieces')
    && lootRuntime.noticeFor('claim-ogre-frost-longsword', true).includes('2 frost damage')
    && lootRuntime.noticeFor('claim-ogre-frost-longsword', true).includes('Slow'),
  'Ogre Cave pickup notices lost approved mechanical details.'
);

const hauntedLanding = maps.get('briarwell-haunted-island-landing');
const hauntedHouse = maps.get('briarwell-haunted-island-house');
const littleIsland = maps.get('briarwell-little-island');
const littleTreasure = maps.get('briarwell-little-island-treasure');
assertReciprocal(hauntedLanding, 'north-path', hauntedHouse, 'south-path');
assertReciprocal(littleIsland, 'north-path', littleTreasure, 'south-path');

const islandConnectionContracts = [
  ['haunted-island-landing-house', 'briarwell-haunted-island-landing', 'north-path', 'briarwell-haunted-island-house', 'south-path'],
  ['little-island-treasure-path', 'briarwell-little-island', 'north-path', 'briarwell-little-island-treasure', 'south-path']
];
islandConnectionContracts.forEach(([id, leftArea, leftId, rightArea, rightId]) => {
  const connection = registry.getConnection(id);
  assert(connection?.kind === 'trail' && connection.status === 'active', `Island path metadata is wrong: ${id}`);
  assert(
    JSON.stringify(connection.endpoints.map((endpoint) => [endpoint.areaId, endpoint.transitionId]))
      === JSON.stringify([[leftArea, leftId], [rightArea, rightId]]),
    `Island path endpoints are wrong: ${id}`
  );
});

[hauntedLanding, littleIsland].forEach((landing) => {
  assert(
    landing.boatAccess?.status === 'story-locked'
      && landing.boatAccess.unlockCondition === 'lake-ferry-story-event'
      && landing.boatAccess.sourceAreaId === 'briarwell-docks'
      && landing.boatAccess.sourceFeatureId === 'west-moored-boat',
    `Island boat access must remain plot-gated: ${landing.id}`
  );
});
const docks = loadMap('briarwell-docks');
const ferry = docks.interactables.find((feature) => feature.id === 'west-moored-boat');
assert(
  ferry?.state === 'future-lake-ferry'
    && ferry.unlockCondition === 'lake-ferry-story-event'
    && JSON.stringify(ferry.destinations) === JSON.stringify([
      { areaId: 'briarwell-haunted-island-landing', spawnId: 'from-boat' },
      { areaId: 'briarwell-little-island', spawnId: 'from-boat' }
    ]),
  'The docks ferry must reserve both approved island arrivals.'
);

const hauntedDoor = hauntedHouse.interactables.find((feature) => feature.id === 'haunted-house-front-door');
assert(
  hauntedDoor?.state === 'future-haunted-house-interior',
  'The haunted-house exterior must reserve its future interior without inventing a route.'
);
const buriedCache = littleTreasure.interactables.find((feature) => feature.id === 'little-island-buried-cache');
assert(
  littleTreasure.treasureStatus === 'reward-definition-pending'
    && buriedCache?.state === 'buried-treasure-reward-pending'
    && buriedCache.loot === undefined,
  'The buried cache must remain visibly complete without inventing unspecified loot.'
);

const hauntedIds = new Set(['briarwell-haunted-island-landing', 'briarwell-haunted-island-house']);
const littleIds = new Set(['briarwell-little-island', 'briarwell-little-island-treasure']);
assert(
  !registryData.connections.some((connection) => {
    const endpointIds = connection.endpoints.map((endpoint) => endpoint.areaId);
    return endpointIds.some((areaId) => hauntedIds.has(areaId))
      && endpointIds.some((areaId) => littleIds.has(areaId));
  }),
  'The separate lake islands cannot have a direct walking or swimming connection.'
);

const walkTestHtml = fs.readFileSync(path.join(avendorRoot, 'walk-test.html'), 'utf8');
assert(
  walkTestHtml.includes('js/ogre-cave-runtime.js'),
  'The walk-test runtime does not load Ogre Cave pickup persistence.'
);
const walkTestSource = fs.readFileSync(path.join(avendorRoot, 'js/walk-test.js'), 'utf8');
assert(
  walkTestSource.includes("check.type === 'stat-minimum'")
    && walkTestSource.includes('statValue >= minimum'),
  'The walk runtime does not support deterministic minimum-stat gates.'
);

console.log('Ogre Cave and lake-island contract checks passed.');
