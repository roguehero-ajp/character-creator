'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const registryData = JSON.parse(fs.readFileSync(path.join(root, 'data/maps/briarwell-area-registry.json')));
const context = { window: {}, console };
vm.createContext(context);
['map-engine.js', 'world-map.js'].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), context);
});
const { MapGeometry, pointInPolygon } = context.window.AvendorMapEngine;
const { AreaRegistry, auditTopology } = context.window.AvendorWorldMap;
const registry = new AreaRegistry(registryData);
const allMaps = new Map(registryData.areas.filter((area) => area.status === 'playable').map((area) => [
  area.id, JSON.parse(fs.readFileSync(path.join(root, area.map)))
]));
assert.deepEqual(Array.from(auditTopology(registry, allMaps).errors), [], 'The world registry has invalid routes.');

// Jay's five-screen plan: docks — homes — market, with Elder Broo north and the well south.
const expectedRoads = {
  docks: { west: null, east: 'little-homes' },
  'little-homes': { west: 'docks', east: 'market' },
  market: { west: 'little-homes', north: 'elder-broo-house', south: 'village-well' },
  'elder-broo-house': { south: 'market' },
  'village-well': { north: 'market' }
};
const opposite = { west: 'east', east: 'west', north: 'south', south: 'north' };
const newAreas = registryData.areas.filter((area) => area.id.startsWith('tookskoot-'));
assert.equal(newAreas.length, 5, 'Tookskoot must have exactly five outdoor screens.');

function webpSize(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  const format = bytes.toString('ascii', 12, 16);
  if (format === 'VP8X') return [1 + bytes.readUIntLE(24, 3), 1 + bytes.readUIntLE(27, 3)];
  if (format === 'VP8 ') return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
  if (format === 'VP8L') return [1 + bytes[21] + ((bytes[22] & 0x3f) << 8), 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10)];
  throw new Error(`Unknown WebP encoding: ${format}`);
}

function checkPolygons(map) {
  const orientation = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  for (const collection of ['walkable', 'collisions', 'depthOccluders', 'exits']) {
    const ids = new Set();
    for (const region of map[collection]) {
      assert(!ids.has(region.id), `Duplicate ${collection} id: ${map.id}/${region.id}`);
      ids.add(region.id);
      const points = region.points;
      assert(points.length >= 3);
      assert(points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x <= 1448 && y <= 1086));
      for (let a = 0; a < points.length; a += 1) {
        for (let b = a + 2; b < points.length; b += 1) {
          if (a === 0 && b === points.length - 1) continue;
          const [p, q, r, s] = [points[a], points[(a + 1) % points.length], points[b], points[(b + 1) % points.length]];
          const crossing = orientation(p, q, r) * orientation(p, q, s) < 0 && orientation(r, s, p) * orientation(r, s, q) < 0;
          assert(!crossing, `Self-intersecting polygon: ${map.id}/${region.id}`);
        }
      }
    }
  }
}

// Flood-fill the actual hero footprint. This detects disconnected pier stairs, unreachable stalls,
// and spawns/exits that look connected in metadata but cannot be reached by walking.
function reachableGeometry(geometry) {
  const step = 8;
  const start = geometry.getSpawn();
  const queue = [[start.x, start.y]];
  const seen = new Set([queue[0].join(',')]);
  const exits = new Set();
  const features = new Set();
  const reachedSpawns = new Set();
  for (let i = 0; i < queue.length; i += 1) {
    const [x, y] = queue[i];
    const trigger = geometry.getTriggerAt({ x, y });
    if (trigger) exits.add(trigger.id);
    const nearby = geometry.getNearbyInteractable({ x, y });
    if (nearby) features.add(nearby.id);
    for (const [id, spawn] of Object.entries(geometry.data.spawnPoints)) {
      if (Math.hypot(spawn.x - x, spawn.y - y) < step) reachedSpawns.add(id);
    }
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const next = [x + dx, y + dy];
      const key = next.join(',');
      if (!seen.has(key) && geometry.isWalkable(...next)) {
        seen.add(key);
        queue.push(next);
      }
    }
  }
  return { exits, features, reachedSpawns };
}

for (const [key, expected] of Object.entries(expectedRoads)) {
  const id = `tookskoot-${key}`;
  const map = allMaps.get(id);
  const area = registry.getArea(id);
  assert(area && area.kind === 'outdoor' && area.status === 'playable');
  assert.equal(map.title, area.title);
  assert.deepEqual(map.referenceSize, { width: 1448, height: 1086 });
  assert.deepEqual(webpSize(fs.readFileSync(path.join(root, map.art.background))), [1448, 1086], `Full-resolution artwork missing: ${id}`);
  assert.deepEqual(map.exits.map((road) => road.direction).sort(), Object.keys(expected).sort(), `Extra or missing road: ${id}`);
  assert.equal(map.portals.length, 0, 'This request defines exteriors only.');
  assert.equal(map.npcs.length, 0, 'Do not invent village residents.');
  checkPolygons(map);
  const geometry = new MapGeometry(map);
  for (const [spawnId, spawn] of Object.entries(map.spawnPoints)) {
    assert(geometry.isWalkable(spawn.x, spawn.y), `Blocked spawn: ${id}/${spawnId}`);
    assert(!geometry.getTriggerAt(spawn), `Arrival immediately retriggers: ${id}/${spawnId}`);
  }
  for (const road of map.exits) {
    const target = expected[road.direction];
    if (target === null) {
      assert.equal(road.status, 'unassigned');
      assert.equal(road.target, null, 'The western endpoint was not supplied; do not guess a ferry or neighbouring map.');
      assert.equal(registry.getCityExitForTransition(id, road.id).target, null);
      continue;
    }
    assert.equal(road.status, 'active');
    assert.equal(road.target.areaId, `tookskoot-${target}`);
    const destination = allMaps.get(road.target.areaId);
    const returnRoad = destination.exits.find((candidate) => candidate.id === road.target.returnTransitionId);
    assert(returnRoad && returnRoad.target.areaId === id && returnRoad.direction === opposite[road.direction], `Broken return route: ${id}/${road.id}`);
    assert(destination.spawnPoints[road.target.spawnId], `Missing arrival: ${id}/${road.id}`);
    assert.equal(registry.resolveTransition(road).state, 'ready');
  }
  const reached = reachableGeometry(geometry);
  map.exits.forEach((road) => assert(reached.exits.has(road.id), `Unwalkable road: ${id}/${road.id}`));
  map.interactables.forEach((feature) => assert(reached.features.has(feature.id), `Unreachable interaction: ${id}/${feature.id}`));
  Object.keys(map.spawnPoints).forEach((spawnId) => assert(reached.reachedSpawns.has(spawnId), `Disconnected spawn: ${id}/${spawnId}`));
  for (let coordinate = 20; coordinate < 1440; coordinate += 12) {
    for (const [direction, x, y] of [['north', coordinate, 10], ['south', coordinate, 1076], ['west', 10, coordinate], ['east', 1438, coordinate]]) {
      if (x > 1448 || y > 1086 || !geometry.isWalkable(x, y)) continue;
      assert(direction in expected, `Walking leaks through a closed ${direction} edge: ${id}`);
      assert(geometry.getTriggerAt({ x, y }), `Painted road edge misses its trigger: ${id}/${direction} at ${x},${y}`);
    }
  }
}

const well = new MapGeometry(allMaps.get('tookskoot-village-well'));
assert(!well.isWalkable(710, 570), 'The hero can walk into the well.');
[[720,455],[950,570],[720,710],[470,570]].forEach(([x,y]) => assert(well.isWalkable(x,y), 'The well must be approachable on every side.'));
assert(well.data.depthOccluders.some((region) => pointInPolygon([710,380],region.points) && region.depthY > 600), 'The well roof must hide a hero walking behind it.');
const docks = new MapGeometry(allMaps.get('tookskoot-docks'));
[[500,925],[1080,980],[350,800]].forEach(([x,y]) => assert(!docks.isWalkable(x,y), 'Lake water or boat hull became walkable.'));
assert(docks.isWalkable(705,755), 'The pier must remain reachable.');
console.log('Tookskoot: five full-resolution scenes, eight reciprocal passages, safe western fallback, reachable interactions and traced geometry passed.');
