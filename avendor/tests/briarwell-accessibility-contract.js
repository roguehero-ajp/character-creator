'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const avendorRoot = path.resolve(__dirname, '..');
const registryPath = path.join(avendorRoot, 'data/maps/briarwell-area-registry.json');
const enginePath = path.join(avendorRoot, 'js/map-engine.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadEngine() {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(enginePath, 'utf8'), context);
  return context.window.AvendorMapEngine;
}

function loadMap(area) {
  return JSON.parse(fs.readFileSync(path.join(avendorRoot, area.map), 'utf8'));
}

function buildReachability(map, start, step = 5) {
  const origin = [Math.round(start.x / step) * step, Math.round(start.y / step) * step];
  assert(map.isWalkable(origin[0], origin[1]), `Default spawn cannot seed accessibility audit: ${map.data.id}`);
  const queue = [origin];
  const seen = new Set([origin.join(',')]);
  const directions = [
    [step, 0], [-step, 0], [0, step], [0, -step],
    [step, step], [step, -step], [-step, step], [-step, -step]
  ];

  for (let head = 0; head < queue.length; head += 1) {
    const [x, y] = queue[head];
    directions.forEach(([dx, dy]) => {
      const next = [x + dx, y + dy];
      const key = next.join(',');
      if (!seen.has(key) && map.isWalkable(next[0], next[1])) {
        seen.add(key);
        queue.push(next);
      }
    });
  }
  return { step, seen };
}

function nearbyReachablePoints(reachability, target, radius) {
  const { step, seen } = reachability;
  const minX = Math.floor((target.x - radius) / step) * step;
  const maxX = Math.ceil((target.x + radius) / step) * step;
  const minY = Math.floor((target.y - radius) / step) * step;
  const maxY = Math.ceil((target.y + radius) / step) * step;
  const points = [];

  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      if (!seen.has(`${x},${y}`)) continue;
      const distance = Math.hypot(x - target.x, y - target.y);
      if (distance <= radius) points.push({ x, y, distance });
    }
  }

  return points.sort((left, right) => left.distance - right.distance);
}

function assertResolvableInteraction(map, reachability, feature, type) {
  const target = type === 'npc'
    ? { x: feature.interactionX ?? feature.x, y: feature.interactionY ?? feature.y }
    : { x: feature.x, y: feature.y };
  const radius = type === 'npc' ? feature.interactionRadius : feature.radius;

  assert(Number.isFinite(target.x) && Number.isFinite(target.y), `Interaction target is invalid: ${map.data.id}/${feature.id}`);
  assert(Number.isFinite(radius) && radius > 0, `Interaction radius is invalid: ${map.data.id}/${feature.id}`);

  const candidates = nearbyReachablePoints(reachability, target, radius);
  assert(candidates.length > 0, `No reachable standing point exists for ${type}: ${map.data.id}/${feature.id}`);

  const resolvingPoint = candidates.find((point) => {
    const result = map.getNearbyInteractable(point);
    return result?.id === feature.id && result?.type === (type === 'npc' ? 'npc' : 'feature');
  });

  assert(
    resolvingPoint,
    `Reachable ${type} is interaction-shadowed by another object: ${map.data.id}/${feature.id}`
  );
}

function assertPortalApproach(map, reachability, portal) {
  const xs = portal.points.map(([x]) => x);
  const ys = portal.points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const { step, seen } = reachability;
  let reachableTriggerPoint = null;

  for (let y = Math.floor(minY / step) * step; y <= Math.ceil(maxY / step) * step && !reachableTriggerPoint; y += step) {
    for (let x = Math.floor(minX / step) * step; x <= Math.ceil(maxX / step) * step; x += step) {
      if (!seen.has(`${x},${y}`)) continue;
      if (map.getTriggerAt({ x, y })?.id === portal.id) {
        reachableTriggerPoint = { x, y };
        break;
      }
    }
  }

  assert(reachableTriggerPoint, `Portal has no reachable trigger point: ${map.data.id}/${portal.id}`);
}

function assertAreaAccessibility(MapGeometry, area) {
  const data = loadMap(area);
  const map = new MapGeometry(data);
  const start = data.spawnPoints?.default;
  assert(start, `Playable area has no default spawn: ${area.id}`);
  const reachability = buildReachability(map, start);

  (data.interactables || []).forEach((feature) => assertResolvableInteraction(map, reachability, feature, 'feature'));
  (data.npcs || []).forEach((npc) => assertResolvableInteraction(map, reachability, npc, 'npc'));
  (data.portals || []).forEach((portal) => assertPortalApproach(map, reachability, portal));

  Object.entries(data.spawnPoints || {}).forEach(([spawnId, spawn]) => {
    const key = `${Math.round(spawn.x / reachability.step) * reachability.step},${Math.round(spawn.y / reachability.step) * reachability.step}`;
    assert(reachability.seen.has(key), `Named spawn is outside reachable play-space: ${area.id}/${spawnId}`);
  });
}

function run() {
  const engine = loadEngine();
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const playableAreas = registry.areas.filter((area) => area.status === 'playable');
  playableAreas.forEach((area) => assertAreaAccessibility(engine.MapGeometry, area));
  console.log(`Briarwell accessibility-contract checks passed for ${playableAreas.length} playable areas.`);
}

run();
