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

function gridReachability(map, start, step = 5) {
  const origin = [Math.round(start.x / step) * step, Math.round(start.y / step) * step];
  const queue = [origin];
  const seen = new Set([origin.join(',')]);
  const directions = [[step, 0], [-step, 0], [0, step], [0, -step], [step, step], [step, -step], [-step, step], [-step, -step]];

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

function isReachable(reachability, point, tolerance = 12) {
  const { step, seen } = reachability;
  const snappedX = Math.round(point.x / step) * step;
  const snappedY = Math.round(point.y / step) * step;
  const cells = Math.ceil(tolerance / step);
  for (let dy = -cells; dy <= cells; dy += 1) {
    for (let dx = -cells; dx <= cells; dx += 1) {
      if (seen.has(`${snappedX + (dx * step)},${snappedY + (dy * step)}`)) return true;
    }
  }
  return false;
}

function hasReachableInteractionPoint(map, reachability, feature) {
  const target = feature.interactionTarget || feature;
  const radius = feature.radius || feature.interactionRadius || 0;
  const sampleRadii = [Math.max(12, radius * 0.45), Math.max(18, radius * 0.75), radius];
  if (map.isWalkable(target.x, target.y) && isReachable(reachability, target)) return true;

  return sampleRadii.some((sampleRadius) => {
    for (let index = 0; index < 24; index += 1) {
      const angle = (Math.PI * 2 * index) / 24;
      const point = { x: target.x + (Math.cos(angle) * sampleRadius), y: target.y + (Math.sin(angle) * sampleRadius) };
      if (map.isWalkable(point.x, point.y) && isReachable(reachability, point)) return true;
    }
    return false;
  });
}

function assertPerspective(data) {
  const stops = data.perspective?.stops || [];
  assert(stops.length >= 4, `Perspective needs four or more stops: ${data.id}`);
  for (let index = 1; index < stops.length; index += 1) {
    assert(stops[index].y > stops[index - 1].y, `Perspective y order is invalid: ${data.id}`);
    assert(stops[index].scale > stops[index - 1].scale, `Perspective scale order is invalid: ${data.id}`);
  }
  assert(stops.at(-1).scale === 1, `Foreground scale must resolve to 1.0: ${data.id}`);
}

function assertTransitionUsability(map, data, reachability) {
  [...data.exits, ...data.portals].forEach((transition) => {
    const xs = transition.points.map(([x]) => x);
    const ys = transition.points.map(([, y]) => y);
    const center = { x: xs.reduce((sum, x) => sum + x, 0) / xs.length, y: ys.reduce((sum, y) => sum + y, 0) / ys.length };
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);

    assert(width >= 40 || height >= 40, `Transition target is too fiddly: ${data.id}/${transition.id}`);
    const fallback = map.getExactSpawn(transition.fallbackSpawn);
    assert(fallback, `Fallback spawn is missing: ${data.id}/${transition.id}`);
    assert(map.isWalkable(fallback.x, fallback.y), `Fallback spawn is blocked: ${data.id}/${transition.id}`);
    assert(!map.getTriggerAt(fallback), `Fallback spawn immediately retriggers: ${data.id}/${transition.id}`);

    if (transition.activation === 'interact') {
      assert(
        map.getNearbyInteractable(fallback)?.id === transition.id,
        `Interacted transition has no reachable approach: ${data.id}/${transition.id}`
      );
      return;
    }

    assert(map.isWalkable(center.x, center.y), `Transition center is blocked: ${data.id}/${transition.id}`);
    assert(isReachable(reachability, center, 18), `Transition is outside the main play-space: ${data.id}/${transition.id}`);
    assert(map.getTriggerAt(center)?.id === transition.id, `Transition center resolves incorrectly: ${data.id}/${transition.id}`);

  });
}

function assertMapConsistency(MapGeometry, data) {
  const map = new MapGeometry(data);
  const start = data.spawnPoints.default;
  assert(start && map.isWalkable(start.x, start.y), `Default spawn is unusable: ${data.id}`);
  const reachability = gridReachability(map, start);

  assert(data.movement?.speedX === 275, `Briarwell horizontal movement drifted: ${data.id}`);
  assert(data.movement?.speedY === 205, `Briarwell vertical movement drifted: ${data.id}`);
  assert(data.movement?.footRadius === 12, `Briarwell foot radius drifted: ${data.id}`);
  assert(data.movement?.maxStep === 6, `Briarwell movement subdivision drifted: ${data.id}`);
  assertPerspective(data);

  Object.entries(data.spawnPoints).forEach(([spawnId, spawn]) => {
    assert(map.isWalkable(spawn.x, spawn.y), `Named spawn is blocked: ${data.id}/${spawnId}`);
    assert(isReachable(reachability, spawn, 18), `Named spawn is isolated from the main play-space: ${data.id}/${spawnId}`);
  });

  assertTransitionUsability(map, data, reachability);

  data.interactables.forEach((feature) => {
    assert(hasReachableInteractionPoint(map, reachability, feature), `Interactable has no reachable approach: ${data.id}/${feature.id}`);
  });

  data.npcs.forEach((npc) => {
    assert(hasReachableInteractionPoint(map, reachability, {
      ...npc,
      radius: npc.interactionRadius,
      interactionTarget: { x: npc.interactionX ?? npc.x, y: npc.interactionY ?? npc.y }
    }), `NPC has no reachable approach: ${data.id}/${npc.id}`);
  });
}

function run() {
  const engine = loadEngine();
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const outdoorAreas = registry.areas.filter((area) => area.status === 'playable' && area.kind === 'outdoor');
  outdoorAreas.forEach((area) => assertMapConsistency(engine.MapGeometry, loadMap(area)));
  console.log(`Briarwell map-consistency checks passed for ${outdoorAreas.length} outdoor areas.`);
}

run();
