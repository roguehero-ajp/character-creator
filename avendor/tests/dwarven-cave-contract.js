'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const avendorRoot = path.resolve(__dirname, '..');
const registryData = JSON.parse(
  fs.readFileSync(path.join(avendorRoot, 'data/maps/briarwell-area-registry.json'), 'utf8')
);
const registeredAreas = new Map(registryData.areas.map((area) => [area.id, area]));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadMap(areaId) {
  const area = registeredAreas.get(areaId);
  assert(area?.status === 'playable' && area.map, `Cave area is not playable: ${areaId}`);
  return JSON.parse(fs.readFileSync(path.join(avendorRoot, area.map), 'utf8'));
}

function loadEngines() {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(avendorRoot, 'js/world-map.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(avendorRoot, 'js/map-engine.js'), 'utf8'), context);
  return {
    AreaRegistry: context.window.AvendorWorldMap.AreaRegistry,
    MapGeometry: context.window.AvendorMapEngine.MapGeometry
  };
}

function readWebpDimensions(filePath) {
  const bytes = fs.readFileSync(filePath);
  assert(
    bytes.subarray(0, 4).toString('ascii') === 'RIFF'
      && bytes.subarray(8, 12).toString('ascii') === 'WEBP',
    `Cave art is not a WebP image: ${filePath}`
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
  throw new Error(`Unsupported cave WebP encoding: ${filePath}/${chunk}`);
}

function transition(map, transitionId) {
  return [...map.exits, ...map.portals].find((candidate) => candidate.id === transitionId);
}

const caveRoomIds = Array.from(
  { length: 16 },
  (_, index) => `briarwell-dwarven-cave-c${String(index + 1).padStart(2, '0')}`
);
const specialAreaIds = [
  'briarwell-dwarven-cave-secret',
  'briarwell-dwarven-cave-battle-chamber',
  'briarwell-dwarven-cave-cliffside'
];
const caveAreaIds = [...caveRoomIds, ...specialAreaIds];
const mapIds = ['briarwell-mountain-dwarven-cave', ...caveAreaIds];
const maps = new Map(mapIds.map((areaId) => [areaId, loadMap(areaId)]));
const { AreaRegistry, MapGeometry } = loadEngines();
const registry = new AreaRegistry(registryData);

assert(registryData.version === '0.33.1', 'The public Library Quarter road correction requires registry version 0.33.1.');
assert(caveRoomIds.every((areaId, index) => (
  registeredAreas.get(areaId)?.kind === 'interior'
    && registeredAreas.get(areaId)?.caveAreaNumber === index + 1
)), 'C1-C16 must be registered as the complete numbered cave interior.');
assert(
  registeredAreas.get('briarwell-dwarven-cave-secret')?.kind === 'interior'
    && registeredAreas.get('briarwell-dwarven-cave-battle-chamber')?.kind === 'interior'
    && registeredAreas.get('briarwell-dwarven-cave-cliffside')?.kind === 'outdoor',
  'The secret armoury, battle chamber and outdoor cliffside have the wrong area kinds.'
);

caveAreaIds.forEach((areaId) => {
  const map = maps.get(areaId);
  const area = registeredAreas.get(areaId);
  const geometry = new MapGeometry(map);
  assert(map.id === areaId && map.version === '0.1.0', `Cave map identity/version mismatch: ${areaId}`);
  assert(map.art.background.includes('/dwarven-cave/interior/background/'), `Cave art path escaped its canonical directory: ${areaId}`);
  const dimensions = readWebpDimensions(path.join(avendorRoot, map.art.background));
  assert(
    dimensions.width === map.referenceSize.width && dimensions.height === map.referenceSize.height,
    `Cave art dimensions disagree with map geometry: ${areaId}`
  );
  assert(area.title === map.title, `Registry/map cave title mismatch: ${areaId}`);
  Object.entries(map.spawnPoints).forEach(([spawnId, spawn]) => {
    assert(geometry.isWalkable(spawn.x, spawn.y), `Cave spawn is not walkable: ${areaId}/${spawnId}`);
    assert(!geometry.getTriggerAt(spawn), `Cave spawn overlaps an automatic trigger: ${areaId}/${spawnId}`);
    assert(!geometry.getHazardAt(spawn), `Cave spawn overlaps a hazard: ${areaId}/${spawnId}`);
  });
  [...map.exits, ...map.portals].forEach((route) => {
    assert(route.status === 'active', `Cave transition is not active: ${areaId}/${route.id}`);
    assert(maps.get(route.target.areaId)?.spawnPoints[route.target.spawnId], `Cave transition names a missing target spawn: ${areaId}/${route.id}`);
    if (route.activation === 'interact') {
      assert(
        geometry.getNearbyInteractable(route.interactionTarget)?.id === route.id,
        `Interactive cave route cannot be reached: ${areaId}/${route.id}`
      );
    } else {
      const center = route.points.reduce(
        (sum, [x, y]) => ({ x: sum.x + (x / route.points.length), y: sum.y + (y / route.points.length) }),
        { x: 0, y: 0 }
      );
      assert(geometry.getTriggerAt(center)?.id === route.id, `Cave route lacks its trigger: ${areaId}/${route.id}`);
    }
  });
});

const routes = [
  ['dwarven-forecourt-c01', 'cave-passage', 'public', 'briarwell-mountain-dwarven-cave', 'dwarven-cave-descent', null, 'briarwell-dwarven-cave-c01', 'west-passage', 'west'],
  ['dwarven-c01-c02', 'cave-passage', 'public', 'briarwell-dwarven-cave-c01', 'east-passage', 'east', 'briarwell-dwarven-cave-c02', 'west-passage', 'west'],
  ['dwarven-c01-c03', 'cave-passage', 'public', 'briarwell-dwarven-cave-c01', 'south-passage', 'south', 'briarwell-dwarven-cave-c03', 'north-passage', 'north'],
  ['dwarven-c02-c04', 'cave-passage', 'public', 'briarwell-dwarven-cave-c02', 'east-passage', 'east', 'briarwell-dwarven-cave-c04', 'west-passage', 'west'],
  ['dwarven-c02-c10', 'cave-passage', 'public', 'briarwell-dwarven-cave-c02', 'south-passage', 'south', 'briarwell-dwarven-cave-c10', 'north-passage', 'north'],
  ['dwarven-c04-c05', 'cave-passage', 'public', 'briarwell-dwarven-cave-c04', 'north-passage', 'north', 'briarwell-dwarven-cave-c05', 'south-passage', 'south'],
  ['dwarven-c04-c07', 'cave-passage', 'public', 'briarwell-dwarven-cave-c04', 'east-passage', 'east', 'briarwell-dwarven-cave-c07', 'west-passage', 'west'],
  ['dwarven-c05-c06', 'cave-passage', 'public', 'briarwell-dwarven-cave-c05', 'east-passage', 'east', 'briarwell-dwarven-cave-c06', 'west-passage', 'west'],
  ['dwarven-c06-c07', 'cave-passage', 'public', 'briarwell-dwarven-cave-c06', 'south-passage', 'south', 'briarwell-dwarven-cave-c07', 'north-passage', 'north'],
  ['dwarven-c06-secret', 'secret-passage', 'hidden', 'briarwell-dwarven-cave-c06', 'secret-door', 'east', 'briarwell-dwarven-cave-secret', 'west-passage', 'west'],
  ['dwarven-c07-c08', 'cave-passage', 'public', 'briarwell-dwarven-cave-c07', 'south-passage', 'south', 'briarwell-dwarven-cave-c08', 'north-passage', 'north'],
  ['dwarven-c08-c09', 'cave-passage', 'public', 'briarwell-dwarven-cave-c08', 'south-passage', 'south', 'briarwell-dwarven-cave-c09', 'north-passage', 'north'],
  ['dwarven-c09-c12', 'cave-passage', 'public', 'briarwell-dwarven-cave-c09', 'west-passage', 'west', 'briarwell-dwarven-cave-c12', 'east-passage', 'east'],
  ['dwarven-c09-cliffside', 'cave-passage', 'public', 'briarwell-dwarven-cave-c09', 'southeast-passage', 'southeast', 'briarwell-dwarven-cave-cliffside', 'northwest-passage', 'northwest'],
  ['dwarven-c10-c11', 'cave-passage', 'public', 'briarwell-dwarven-cave-c10', 'south-passage', 'south', 'briarwell-dwarven-cave-c11', 'north-passage', 'north'],
  ['dwarven-c11-c12', 'cave-passage', 'public', 'briarwell-dwarven-cave-c11', 'east-passage', 'east', 'briarwell-dwarven-cave-c12', 'west-passage', 'west'],
  ['dwarven-c03-c13', 'cave-passage', 'public', 'briarwell-dwarven-cave-c03', 'south-passage', 'south', 'briarwell-dwarven-cave-c13', 'north-passage', 'north'],
  ['dwarven-c13-c14', 'cave-passage', 'public', 'briarwell-dwarven-cave-c13', 'west-passage', 'west', 'briarwell-dwarven-cave-c14', 'east-passage', 'east'],
  ['dwarven-c14-c15', 'cave-passage', 'public', 'briarwell-dwarven-cave-c14', 'south-passage', 'south', 'briarwell-dwarven-cave-c15', 'north-passage', 'north'],
  ['dwarven-c15-c16', 'cave-passage', 'public', 'briarwell-dwarven-cave-c15', 'east-passage', 'east', 'briarwell-dwarven-cave-c16', 'west-passage', 'west'],
  ['dwarven-c16-battle-chamber', 'cave-passage', 'public', 'briarwell-dwarven-cave-c16', 'east-passage', 'east', 'briarwell-dwarven-cave-battle-chamber', 'west-passage', 'west']
];

assert(routes.length === 21, 'The approved cave graph must contain exactly 21 links.');
routes.forEach(([id, kind, visibility, leftArea, leftId, leftDirection, rightArea, rightId, rightDirection]) => {
  const connection = registry.getConnection(id);
  const expectedLeft = { areaId: leftArea, transitionId: leftId };
  const expectedRight = { areaId: rightArea, transitionId: rightId };
  if (leftDirection) expectedLeft.direction = leftDirection;
  if (rightDirection) expectedRight.direction = rightDirection;
  assert(connection?.kind === kind && connection.visibility === visibility && connection.status === 'active', `Cave connection metadata is wrong: ${id}`);
  assert(JSON.stringify(connection.endpoints) === JSON.stringify([expectedLeft, expectedRight]), `Cave connection endpoints are wrong: ${id}`);
  const left = transition(maps.get(leftArea), leftId);
  const right = transition(maps.get(rightArea), rightId);
  assert(left?.target.areaId === rightArea && left.target.returnTransitionId === rightId, `Forward cave route is not reciprocal: ${id}`);
  assert(right?.target.areaId === leftArea && right.target.returnTransitionId === leftId, `Return cave route is not reciprocal: ${id}`);
});

const c06 = maps.get('briarwell-dwarven-cave-c06');
const secretDoor = transition(c06, 'secret-door');
assert(
  secretDoor?.activation === 'interact'
    && secretDoor.check?.type === 'skill'
    && secretDoor.check.skill === 'Search'
    && secretDoor.check.divisor === 2
    && secretDoor.check.die === 100
    && secretDoor.check.discoveryId === 'briarwell-dwarven-cave-c06-secret-door',
  'C6 must hide its mechanism behind 1d100 <= Search / 2 and remember a successful discovery.'
);
assert(
  !c06.walkable.some((region) => region.id === 'east-approach'),
  'C6 must not expose an ordinary east corridor through the concealed wall.'
);

const secret = maps.get('briarwell-dwarven-cave-secret');
const secretFeatures = new Map(secret.interactables.map((feature) => [feature.id, feature]));
assert(
  [...secretFeatures.keys()].sort().join('|') === [
    'dwarven-mace',
    'dwarven-plate-mail',
    'dwarven-treasure-chest',
    'dwarven-two-handed-sword'
  ].join('|'),
  'The secret armoury must contain exactly the approved chest, plate mail, two-handed sword and mace.'
);
const treasure = secretFeatures.get('dwarven-treasure-chest');
assert(
  treasure.action === 'roll-dwarven-treasure'
    && treasure.loot.once === true
    && treasure.loot.silver.minimum === 1
    && treasure.loot.silver.maximum === 100
    && treasure.loot.gold.minimum === 1
    && treasure.loot.gold.maximum === 100,
  'The secret chest must make one persistent 1-100 roll for both silver and gold.'
);
assert(secretFeatures.get('dwarven-plate-mail').item.type === 'armour', 'The armour rack must hold plate mail.');
assert(secretFeatures.get('dwarven-two-handed-sword').item.type === 'weapon', 'The leaning two-handed sword must remain a weapon pickup.');
assert(secretFeatures.get('dwarven-mace').item.type === 'weapon', 'The mace rack must remain a weapon pickup.');

const battle = maps.get('briarwell-dwarven-cave-battle-chamber');
const actors = battle.goblinEncounter.actors;
const actorCounts = actors.reduce((counts, actor) => {
  counts[actor.variant] = (counts[actor.variant] || 0) + 1;
  return counts;
}, {});
const battleGeometry = new MapGeometry(battle);
assert(battle.referenceSize.width === 3072, 'The goblin battle chamber must be a very large scrolling area.');
assert(
  actors.length === 8 && actorCounts.goblin === 5 && actorCounts.hobgoblin === 2 && actorCounts.chieftain === 1,
  'The battle scaffold must stage five goblins, two hobgoblins and one hobgoblin chieftain.'
);
assert(actors.every((actor) => actor.spriteStatus === 'placeholder'), 'The battle force must remain explicit placeholder art until final sprites exist.');
assert(actors.every((actor) => battleGeometry.isWalkable(actor.x, actor.y)), 'Every staged cave opponent must stand on walkable ground.');

const cliffside = maps.get('briarwell-dwarven-cave-cliffside');
const scenic = cliffside.scenicView;
const scenicDimensions = readWebpDimensions(path.join(avendorRoot, scenic.image));
assert(
  scenic.trigger.type === 'enter-polygon'
    && scenic.imageSize.width === 2048
    && scenic.imageSize.height === 1152
    && scenicDimensions.width === 2048
    && scenicDimensions.height === 1152
    && scenic.alt.includes('Briarwell on the left')
    && scenic.alt.includes('exactly two islands'),
  'The cliff edge must open the approved mirrored Briarwell-left, two-island scenic image.'
);
const scenicCenter = scenic.trigger.points.reduce(
  (sum, [x, y]) => ({ x: sum.x + (x / scenic.trigger.points.length), y: sum.y + (y / scenic.trigger.points.length) }),
  { x: 0, y: 0 }
);
assert(new MapGeometry(cliffside).isWalkable(scenicCenter.x, scenicCenter.y), 'The scenic trigger must be reachable at the cliff edge.');

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
vm.runInContext(fs.readFileSync(path.join(avendorRoot, 'js/dwarven-cave-runtime.js'), 'utf8'), runtimeContext);
const runtime = runtimeContext.window.AvendorDwarvenCave;
assert(runtime, 'The Dwarven Cave runtime did not expose its testable API.');
assert(runtime.pointInPolygon([scenicCenter.x, scenicCenter.y], scenic.trigger.points), 'The scenic polygon helper rejected the trigger center.');
assert(!runtime.pointInPolygon([100, 100], scenic.trigger.points), 'The scenic polygon helper accepted distant cave ground.');
assert(
  JSON.stringify(runtime.rollTreasure(treasure.loot, (minimum) => minimum)) === JSON.stringify({ silver: 1, gold: 1 })
    && JSON.stringify(runtime.rollTreasure(treasure.loot, (_, maximum) => maximum)) === JSON.stringify({ silver: 100, gold: 100 }),
  'The persistent treasure roller must preserve both approved bounds.'
);
runtime.saveTreasureState({ loot: { silver: 37, gold: 82 } });
assert(
  JSON.stringify(runtime.readTreasureState()) === JSON.stringify({ loot: { silver: 37, gold: 82 } }),
  'The secret chest must preserve its first rolled result.'
);

const html = fs.readFileSync(path.join(avendorRoot, 'walk-test.html'), 'utf8');
assert(html.includes('<script src="js/dwarven-cave-runtime.js"></script>'), 'The walk test does not load the Dwarven Cave runtime.');

console.log('Dwarven Cave C1-C16, secret armoury, goblin chamber and cliffside vista contracts passed.');
