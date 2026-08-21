'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const avendorRoot = path.resolve(__dirname, '..');
const registryPath = path.join(avendorRoot, 'data/maps/briarwell-area-registry.json');
const worldMapPath = path.join(avendorRoot, 'js/world-map.js');
const mapEnginePath = path.join(avendorRoot, 'js/map-engine.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadEngines() {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(worldMapPath, 'utf8'), context);
  vm.runInContext(fs.readFileSync(mapEnginePath, 'utf8'), context);
  return {
    worldMap: context.window.AvendorWorldMap,
    mapEngine: context.window.AvendorMapEngine
  };
}

function loadRegisteredMaps(registryData) {
  return Object.fromEntries(
    registryData.areas
      .filter((area) => area.status === 'playable')
      .map((area) => [
        area.id,
        JSON.parse(fs.readFileSync(path.join(avendorRoot, area.map), 'utf8'))
      ])
  );
}

function assertPlayableMapGeometry(MapGeometry, areaId, data) {
  const geometry = new MapGeometry(data);
  const transitions = [...data.exits, ...data.portals];

  Object.entries(data.spawnPoints).forEach(([spawnId, spawn]) => {
    assert(geometry.isWalkable(spawn.x, spawn.y), `Spawn is blocked: ${areaId}/${spawnId}`);
    assert(!geometry.getTriggerAt(spawn), `Spawn overlaps a transition: ${areaId}/${spawnId}`);
  });

  transitions.forEach((transition) => {
    const fallback = geometry.getExactSpawn(transition.fallbackSpawn);
    assert(fallback, `Fallback spawn is missing: ${areaId}/${transition.id}`);
    assert(!geometry.getTriggerAt(fallback), `Fallback overlaps a transition: ${areaId}/${transition.id}`);

    const center = {
      x: transition.points.reduce((total, point) => total + point[0], 0) / transition.points.length,
      y: transition.points.reduce((total, point) => total + point[1], 0) / transition.points.length
    };
    assert(geometry.isWalkable(center.x, center.y), `Transition is blocked: ${areaId}/${transition.id}`);
    assert(
      geometry.getTriggerAt(center)?.id === transition.id,
      `Transition trigger resolves incorrectly: ${areaId}/${transition.id}`
    );
  });

  const step = 5;
  const start = data.spawnPoints.default;
  assert(start, `Default spawn is missing: ${areaId}`);
  const queue = [[start.x, start.y]];
  const seen = new Set([queue[0].join(',')]);
  const found = new Set();
  const directions = [
    [step, 0], [-step, 0], [0, step], [0, -step],
    [step, step], [step, -step], [-step, step], [-step, -step]
  ];

  for (let head = 0; head < queue.length; head += 1) {
    const [x, y] = queue[head];
    const trigger = geometry.getTriggerAt({ x, y });
    if (trigger) found.add(trigger.id);

    directions.forEach(([dx, dy]) => {
      const next = [x + dx, y + dy];
      const key = next.join(',');
      if (!seen.has(key) && geometry.isWalkable(next[0], next[1])) {
        seen.add(key);
        queue.push(next);
      }
    });
  }

  transitions.forEach((transition) => {
    assert(found.has(transition.id), `Transition is disconnected: ${areaId}/${transition.id}`);
  });
}

function assertBriarwellRegistry(engine, MapGeometry) {
  const registryData = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const registry = new engine.AreaRegistry(registryData);
  const maps = loadRegisteredMaps(registryData);
  const topology = engine.auditTopology(registry, maps);

  assert(topology.errors.length === 0, topology.errors.join('\n'));
  assert(topology.warnings.length === 7, 'Every currently unavailable Town Center transition should be explicit.');
  Object.entries(maps).forEach(([areaId, data]) => {
    assertPlayableMapGeometry(MapGeometry, areaId, data);
  });
  assert(registry.getStart().area.id === 'briarwell-town-center', 'Town Center is not the Briarwell start area.');

  const townCenter = maps['briarwell-town-center'];
  const northwest = townCenter.exits.find((exit) => exit.id === 'northwest-road');
  assert(northwest?.direction === 'northwest', 'Town Center northwest travel direction is missing.');
  assert(
    northwest?.target?.areaId === 'briarwell-northwest-workshops',
    'Town Center northwest road does not target the Workshops.'
  );
  assert(
    northwest?.target?.spawnId === 'from-south'
      && northwest?.target?.returnTransitionId === 'south-road',
    'The Workshops link does not enter and return through its south road.'
  );
  assert(
    northwest?.fallbackSpawn === 'from-northwest',
    'An unavailable Workshops link should back out to the nearby Town Center road.'
  );
  assert(
    registry.getArea('briarwell-northwest-workshops')?.status === 'planned',
    'The Northwest Workshops should be registered as planned.'
  );
  assert(
    townCenter.exits.filter((exit) => exit.status === 'unassigned' && exit.target === null).length === 4,
    'Undefined outdoor roads must remain visibly unassigned and target-free.'
  );

  const plannedResolution = registry.resolveTransition(northwest);
  assert(
    plannedResolution.state === 'unavailable' && plannedResolution.reason === 'planned',
    'A planned area must not be treated as playable.'
  );
  const unassignedResolution = registry.resolveTransition(
    townCenter.exits.find((exit) => exit.status === 'unassigned')
  );
  assert(
    unassignedResolution.state === 'unavailable'
      && unassignedResolution.reason === 'unassigned'
      && unassignedResolution.area === null,
    'An undefined road must stay unavailable without inventing an area identity.'
  );
}

function makeTwoAreaFixture() {
  const registry = {
    schemaVersion: 1,
    id: 'test-town',
    title: 'Test Town',
    version: '1.0.0',
    start: { areaId: 'square', spawnId: 'default' },
    areas: [
      {
        id: 'square', areaNumber: 1, title: 'Square', kind: 'outdoor',
        status: 'playable', map: 'square.json'
      },
      {
        id: 'workshops', areaNumber: 2, title: 'Workshops', kind: 'outdoor',
        status: 'playable', map: 'workshops.json'
      }
    ]
  };
  const maps = {
    square: {
      schemaVersion: 2,
      id: 'square',
      title: 'Square',
      spawnPoints: {
        default: { x: 50, y: 50 },
        'from-northwest': { x: 20, y: 20 }
      },
      exits: [{
        id: 'northwest-road',
        direction: 'northwest',
        status: 'active',
        fallbackSpawn: 'default',
        target: {
          areaId: 'workshops',
          spawnId: 'from-south',
          returnTransitionId: 'south-road'
        }
      }],
      portals: []
    },
    workshops: {
      schemaVersion: 2,
      id: 'workshops',
      title: 'Workshops',
      spawnPoints: {
        default: { x: 50, y: 50 },
        'from-south': { x: 50, y: 90 }
      },
      exits: [{
        id: 'south-road',
        direction: 'south',
        status: 'active',
        fallbackSpawn: 'default',
        target: {
          areaId: 'square',
          spawnId: 'from-northwest',
          returnTransitionId: 'northwest-road'
        }
      }],
      portals: []
    }
  };
  return { registry, maps };
}

function assertTransitionContract(engine) {
  const fixture = makeTwoAreaFixture();
  const registry = new engine.AreaRegistry(fixture.registry);
  const topology = engine.auditTopology(registry, fixture.maps);

  assert(topology.errors.length === 0, topology.errors.join('\n'));
  assert(registry.getAreaByNumber(2)?.id === 'workshops', 'Area-number lookup is not stable.');

  const resolution = registry.resolveTransition(fixture.maps.square.exits[0]);
  assert(
    resolution.state === 'ready'
      && resolution.targetAreaId === 'workshops'
      && resolution.spawnId === 'from-south',
    'A playable transition did not resolve to its exact entry spawn.'
  );
  const provisionalTarget = registry.resolveTransition({
    status: 'unassigned',
    target: { areaId: 'workshops' }
  });
  assert(
    provisionalTarget.state === 'invalid' && provisionalTarget.reason === 'unassigned-has-target',
    'An unassigned road was allowed to invent a provisional area target.'
  );

  const brokenMaps = JSON.parse(JSON.stringify(fixture.maps));
  delete brokenMaps.square.exits[0].target.returnTransitionId;
  const broken = engine.auditTopology(registry, brokenMaps);
  assert(
    broken.errors.some((error) => error.includes('no returnTransitionId')),
    'Topology validation did not catch a one-way active exit.'
  );

  const duplicateNumber = JSON.parse(JSON.stringify(fixture.registry));
  duplicateNumber.areas[1].areaNumber = 1;
  assert(
    (() => {
      try {
        new engine.AreaRegistry(duplicateNumber);
        return false;
      } catch (error) {
        return error.message.includes('Duplicate areaNumber');
      }
    })(),
    'Duplicate planning numbers were not rejected.'
  );

  const plannedWithMap = JSON.parse(JSON.stringify(fixture.registry));
  plannedWithMap.areas[1].status = 'planned';
  assert(
    (() => {
      try {
        new engine.AreaRegistry(plannedWithMap);
        return false;
      } catch (error) {
        return error.message.includes('cannot provide a map path');
      }
    })(),
    'A non-playable area was allowed to publish a runtime map path.'
  );
}

(() => {
  const { worldMap, mapEngine } = loadEngines();
  assertBriarwellRegistry(worldMap, mapEngine.MapGeometry);
  assertTransitionContract(worldMap);
  console.log('Briarwell area registry and transition topology checks passed.');
})();
