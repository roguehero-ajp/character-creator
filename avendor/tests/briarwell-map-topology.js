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

function assertSimplePolygon(areaId, collectionName, region) {
  const orientation = (a, b, c) => Math.sign(
    ((b[0] - a[0]) * (c[1] - a[1]))
      - ((b[1] - a[1]) * (c[0] - a[0]))
  );
  const edgesCross = (a, b, c, d) => (
    orientation(a, b, c) !== orientation(a, b, d)
      && orientation(c, d, a) !== orientation(c, d, b)
  );
  const count = region.points.length;

  for (let left = 0; left < count; left += 1) {
    for (let right = left + 1; right < count; right += 1) {
      if (right === (left + 1) % count || left === (right + 1) % count) continue;
      assert(
        !edgesCross(
          region.points[left],
          region.points[(left + 1) % count],
          region.points[right],
          region.points[(right + 1) % count]
        ),
        `Polygon crosses itself: ${areaId}/${collectionName}/${region.id}`
      );
    }
  }
}

function assertRegionGeometry(areaId, data, collectionName) {
  const regions = data[collectionName];
  assert(Array.isArray(regions), `Map collection is missing: ${areaId}/${collectionName}`);
  assert(
    new Set(regions.map((region) => region.id)).size === regions.length,
    `Map collection contains duplicate ids: ${areaId}/${collectionName}`
  );

  regions.forEach((region) => {
    assert(region.points.length >= 3, `Polygon has too few points: ${areaId}/${collectionName}/${region.id}`);
    assertSimplePolygon(areaId, collectionName, region);
    region.points.forEach(([x, y]) => {
      assert(
        Number.isFinite(x) && Number.isFinite(y)
          && x >= 0 && x <= data.referenceSize.width
          && y >= 0 && y <= data.referenceSize.height,
        `Polygon point is outside the map: ${areaId}/${collectionName}/${region.id}`
      );
    });
    const twiceArea = Math.abs(region.points.reduce((area, [x, y], index) => {
      const [nextX, nextY] = region.points[(index + 1) % region.points.length];
      return area + (x * nextY) - (nextX * y);
    }, 0));
    assert(twiceArea >= 8, `Polygon has no usable area: ${areaId}/${collectionName}/${region.id}`);
  });
}

function readPngDimensions(filePath) {
  const bytes = fs.readFileSync(filePath);
  assert(
    bytes.length >= 24 && bytes.subarray(1, 4).toString('ascii') === 'PNG',
    `Map art is not a readable PNG: ${filePath}`
  );
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20)
  };
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
  const artPath = path.join(avendorRoot, data.art.background);
  const artSize = readPngDimensions(artPath);

  assert(
    artSize.width === data.referenceSize.width && artSize.height === data.referenceSize.height,
    `Map art dimensions disagree with runtime geometry: ${areaId}`
  );
  ['walkable', 'collisions', 'exits', 'portals', 'depthOccluders'].forEach((collectionName) => {
    assertRegionGeometry(areaId, data, collectionName);
  });
  data.depthOccluders.forEach((region) => {
    assert(
      Number.isFinite(region.depthY)
        && region.depthY >= 0 && region.depthY <= data.referenceSize.height,
      `Occluder depth is outside the map: ${areaId}/${region.id}`
    );
  });

  Object.entries(data.spawnPoints).forEach(([spawnId, spawn]) => {
    assert(geometry.isWalkable(spawn.x, spawn.y), `Spawn is blocked: ${areaId}/${spawnId}`);
    assert(!geometry.getTriggerAt(spawn), `Spawn overlaps a transition: ${areaId}/${spawnId}`);
  });

  transitions.forEach((transition) => {
    const fallback = geometry.getExactSpawn(transition.fallbackSpawn);
    assert(fallback, `Fallback spawn is missing: ${areaId}/${transition.id}`);
    assert(!geometry.getTriggerAt(fallback), `Fallback overlaps a transition: ${areaId}/${transition.id}`);

    if (transition.activation === 'interact') {
      const target = transition.interactionTarget;
      assert(target, `Interaction target is missing: ${areaId}/${transition.id}`);
      assert(!geometry.getTriggerAt(fallback), `Interactive portal became an automatic trigger: ${areaId}/${transition.id}`);
      assert(
        geometry.getNearbyInteractable(fallback)?.id === transition.id,
        `Interactive portal resolves incorrectly: ${areaId}/${transition.id}`
      );
      return;
    }

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
    if (transition.activation !== 'interact') {
      assert(found.has(transition.id), `Transition is disconnected: ${areaId}/${transition.id}`);
    }
  });
}

function collectReachableAreas(registry, startAreaId, includeHidden) {
  const seen = new Set([startAreaId]);
  const queue = [startAreaId];

  for (let head = 0; head < queue.length; head += 1) {
    const areaId = queue[head];
    registry.getConnectionsForArea(areaId, { includeHidden }).forEach((connection) => {
      connection.endpoints.forEach((endpoint) => {
        if (seen.has(endpoint.areaId)) return;
        seen.add(endpoint.areaId);
        queue.push(endpoint.areaId);
      });
    });
  }

  return seen;
}

function assertBriarwellRegistry(engine, MapGeometry) {
  const registryData = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const registry = new engine.AreaRegistry(registryData);
  const maps = loadRegisteredMaps(registryData);
  const topology = engine.auditTopology(registry, maps);

  assert(registryData.schemaVersion === 2, 'Briarwell must use the route-graph registry schema.');
  assert(registryData.version === '0.21.0', 'The Forest F5-F10 expansion requires registry version 0.21.0.');
  assert(registryData.areas.length === 45, 'Briarwell must register every town, sewer, support, F1-F10, graveyard, bridge and planned Witchwood area.');
  assert(registryData.connections.length === 54, 'Briarwell must preserve all 54 approved internal connections.');
  assert(registryData.cityExits.length === 2, 'Briarwell must preserve both roads out of town.');
  assert(
    Object.keys(maps).length === 43,
    'Briarwell must load every town, sewer, support-interior and south-outskirts map.'
  );
  assert(topology.errors.length === 0, topology.errors.join('\n'));
  const unavailableTransitionCount = Object.values(maps)
    .flatMap((map) => [...map.exits, ...map.portals])
    .filter((transition) => transition.status !== 'active')
    .length;
  assert(
    topology.warnings.length === unavailableTransitionCount,
    'Every currently unavailable transition should produce one explicit topology warning.'
  );
  assert(
    topology.warnings.every((warning) => (
      warning.includes('targets planned area') || warning.includes('has no approved target area yet')
    )),
    'Playable maps should warn only about approved planned destinations or explicit city exits.'
  );
  Object.entries(maps).forEach(([areaId, data]) => {
    assertPlayableMapGeometry(MapGeometry, areaId, data);
  });
  assert(registry.getStart().area.id === 'briarwell-town-center', 'Town Center is not the Briarwell start area.');

  const numberedAreas = registryData.areas
    .filter((area) => area.areaNumber !== null)
    .sort((left, right) => left.areaNumber - right.areaNumber);
  assert(numberedAreas.length === 12, 'The approved town plan must contain exactly 12 numbered areas.');
  assert(
    numberedAreas.every((area, index) => area.areaNumber === index + 1),
    'Briarwell planning numbers must remain the complete range 1 through 12.'
  );
  assert(
    numberedAreas.every((area) => area.kind === 'outdoor'),
    'All 12 numbered town screens must remain outdoor areas.'
  );
  assert(
    numberedAreas.every((area) => area.status === 'playable' && area.map),
    'All 12 numbered town screens must remain playable and mapped.'
  );
  assert(registry.getAreaByNumber(1)?.id === 'briarwell-town-center', 'Area 1 must remain Town Center.');
  assert(
    registry.getAreaByNumber(2)?.id === 'briarwell-northwest-workshops',
    'Area 2 must remain the Blacksmith and Cooper screen.'
  );
  assert(
    registry.getAreaByNumber(7)?.id === 'briarwell-ainsley-church'
      && registry.getAreaByNumber(11)?.id === 'briarwell-blight-orphanage',
    "Ainsley's and Ms. Blight's orphanages must remain separate areas."
  );

  const townCenter = maps['briarwell-town-center'];
  const expectedTownRoads = {
    'northwest-road': ['northwest', 'briarwell-northwest-workshops', 'from-southwest', 'southwest-road'],
    'northeast-road': ['northeast', 'briarwell-library-quarter', 'from-southwest', 'southwest-road'],
    'west-road': ['west', 'briarwell-western-homes', 'from-east', 'east-road'],
    'east-road': ['east', 'briarwell-tannery-warehouses', 'from-west', 'west-road'],
    'south-road': ['south', 'briarwell-south-gate', 'from-north', 'north-road']
  };
  assert(townCenter.exits.length === 5, 'Town Center must keep exactly five surface roads.');
  const activeTownRoads = new Set([
    'northwest-road', 'northeast-road', 'west-road', 'east-road', 'south-road'
  ]);
  townCenter.exits.forEach((exit) => {
    const expected = expectedTownRoads[exit.id];
    assert(expected, `Town Center contains an unexpected road: ${exit.id}`);
    assert(exit.direction === expected[0], `Town Center road has the wrong direction: ${exit.id}`);
    const expectedStatus = activeTownRoads.has(exit.id) ? 'active' : 'planned';
    assert(exit.status === expectedStatus, `Town Center road has the wrong status: ${exit.id}`);
    assert(exit.target?.areaId === expected[1], `Town Center road has the wrong target: ${exit.id}`);
    assert(exit.target?.spawnId === expected[2], `Town Center road has the wrong target spawn: ${exit.id}`);
    assert(
      exit.target?.returnTransitionId === expected[3],
      `Town Center road has the wrong reciprocal transition: ${exit.id}`
    );
    const resolution = registry.resolveTransition(exit);
    if (activeTownRoads.has(exit.id)) {
      assert(
        resolution.state === 'ready' && resolution.targetAreaId === exit.target.areaId,
        `Town Center must be able to load its playable destination: ${exit.id}`
      );
    } else {
      assert(
        resolution.state === 'unavailable' && resolution.reason === 'planned',
        `A planned Town Center destination became playable unexpectedly: ${exit.id}`
      );
    }
  });
  assert(
    townCenter.portals.every((portal) => portal.status === 'active' && portal.target?.areaId),
    'Town Center doorways must load their approved playable interiors.'
  );

  const kindCounts = registryData.connections.reduce((counts, connection) => {
    counts[connection.kind] = (counts[connection.kind] || 0) + 1;
    return counts;
  }, {});
  assert(kindCounts.road === 28, 'Briarwell must preserve 13 town roads and fifteen south-outskirts road connections.');
  assert(kindCounts.alley === 1, 'Briarwell must preserve the Ainsley alley connection.');
  assert(kindCounts.doorway === 2, 'Briarwell must preserve the two Town Center doorways.');
  assert(kindCounts['secret-passage'] === 2, 'Briarwell must preserve the open-window and dwarven secret passages.');
  assert(kindCounts['sewer-access'] === 4, 'Briarwell must preserve all four sewer entrances.');
  assert(kindCounts['sewer-tunnel'] === 17, 'Briarwell must preserve all 17 internal sewer tunnels.');
  assert(
    registryData.connections.filter((connection) => connection.visibility === 'hidden').length === 6,
    'Only the open-window route, four sewer entrances and dwarven chamber should be hidden.'
  );

  const libraryPublic = registry.getConnectionsForArea('briarwell-library-quarter');
  const libraryAll = registry.getConnectionsForArea(
    'briarwell-library-quarter',
    { includeHidden: true }
  );
  assert(libraryPublic.length === 2, 'Area 4 must publicly connect to Town Center and Area 3.');
  assert(libraryAll.length === 3, 'Area 4 must also retain its hidden window route.');

  const secret = registry.getConnection('library-quarter-blight-open-window');
  assert(secret?.visibility === 'hidden', "Ms. Blight's window route must not appear in public navigation.");
  assert(
    secret.endpoints.map((endpoint) => endpoint.areaId).sort().join('|')
      === ['briarwell-blight-orphanage', 'briarwell-library-quarter'].sort().join('|'),
    "The open window must connect Area 4 directly to Ms. Blight's Area 11."
  );

  const sewerSurfaceNumbers = registryData.connections
    .filter((connection) => connection.kind === 'sewer-access')
    .map((connection) => connection.endpoints.find((endpoint) => !endpoint.areaId.startsWith('briarwell-sewer-')))
    .map((endpoint) => registry.getArea(endpoint.areaId).areaNumber)
    .sort((left, right) => left - right);
  assert(
    sewerSurfaceNumbers.join(',') === '1,7,9,11',
    "The sewer network must surface only at the well, Ainsley's alley, docks and Ms. Blight's cave."
  );

  const publicReachable = collectReachableAreas(registry, 'briarwell-town-center', false);
  const allReachable = collectReachableAreas(registry, 'briarwell-town-center', true);
  assert(publicReachable.size === 28, 'The public route graph must connect the town, twelve playable outskirts areas and planned Witchwood W1/W2.');
  assert(
    ![...publicReachable].some((areaId) => areaId.startsWith('briarwell-sewer-')),
    'The sewers must not appear in public navigation.'
  );
  assert(
    !publicReachable.has('briarwell-blight-orphanage'),
    "Ms. Blight's isolated grounds must not appear in public navigation."
  );
  assert(allReachable.size === registryData.areas.length, 'Hidden routes must complete the full town graph.');

  const westExit = registry.getCityExitForTransition('briarwell-west-road-junction', 'west-road');
  const bridgeExit = registry.getCityExitForTransition('briarwell-broken-bridge', 'east-road');
  assert(westExit?.status === 'unassigned' && westExit.target === null, 'The west city exit must stay unassigned.');
  assert(bridgeExit?.status === 'unassigned' && bridgeExit.target === null, 'The Bushavic road must stay blocked at the broken bridge.');

  const workshops = maps['briarwell-northwest-workshops'];
  assert(workshops, 'Area 2 must load as a playable runtime map.');
  assert(workshops.version === '0.2.0', 'Area 2 must expose the corrected workshop road geometry.');
  assert(workshops.exits.length === 2, 'Area 2 must expose only its southwest and east roads.');
  const workshopSouth = workshops.exits.find((exit) => exit.id === 'southwest-road');
  const workshopEast = workshops.exits.find((exit) => exit.id === 'east-road');
  assert(
    workshopSouth?.status === 'active'
      && workshopSouth.target?.areaId === 'briarwell-town-center'
      && workshopSouth.target?.spawnId === 'from-northwest'
      && workshopSouth.target?.returnTransitionId === 'northwest-road',
    'Area 2 southwest road must return precisely to Town Center northwest.'
  );
  assert(
    workshopEast?.status === 'active'
      && workshopEast.target?.areaId === 'briarwell-brewmaster-row'
      && workshopEast.target?.spawnId === 'from-west'
      && workshopEast.target?.returnTransitionId === 'west-road',
    'Area 2 east road must load Area 3 through its west road.'
  );
  const workshopGeometry = new MapGeometry(workshops);
  [
    [820, 790, 'open center'],
    [820, 950, 'south approach'],
    [1290, 565, 'east approach'],
    [560, 640, 'Blacksmith forecourt'],
    [930, 640, 'Cooper forecourt']
  ].forEach(([x, y, label]) => {
    assert(workshopGeometry.isWalkable(x, y), `Area 2 ${label} is not walkable.`);
  });
  [
    [450, 550, 'Blacksmith anvil'],
    [850, 520, 'Cooper workbench'],
    [210, 700, 'upper house'],
    [270, 930, 'lower house'],
    [1390, 820, 'southeast wall']
  ].forEach(([x, y, label]) => {
    assert(!workshopGeometry.isWalkable(x, y), `Area 2 ${label} does not block at its visible base.`);
  });

  const brewmasterRow = maps['briarwell-brewmaster-row'];
  assert(brewmasterRow, 'Area 3 must load as a playable runtime map.');
  assert(brewmasterRow.version === '0.1.0', 'Area 3 must start at runtime map version 0.1.0.');
  assert(brewmasterRow.exits.length === 3, 'Area 3 must expose only west, east and north roads.');
  const rowWest = brewmasterRow.exits.find((exit) => exit.id === 'west-road');
  const rowEast = brewmasterRow.exits.find((exit) => exit.id === 'east-road');
  const rowNorth = brewmasterRow.exits.find((exit) => exit.id === 'north-road');
  assert(
    rowWest?.status === 'active'
      && rowWest.target?.areaId === 'briarwell-northwest-workshops'
      && rowWest.target?.spawnId === 'from-east'
      && rowWest.target?.returnTransitionId === 'east-road',
    'Area 3 west road must return precisely to Area 2.'
  );
  assert(
    rowEast?.status === 'active'
      && rowEast.target?.areaId === 'briarwell-library-quarter'
      && rowEast.target?.returnTransitionId === 'west-road',
    'Area 3 east road must load Area 4 through its west road.'
  );
  assert(
    rowNorth?.status === 'active'
      && rowNorth.target?.areaId === 'briarwell-mayors-hill'
      && rowNorth.target?.spawnId === 'from-south'
      && rowNorth.target?.returnTransitionId === 'south-road',
    "Area 3 north road must load Mayor's Hill through its south road."
  );
  const rowGeometry = new MapGeometry(brewmasterRow);
  [
    [820, 700, 'open junction'],
    [145, 455, 'west approach'],
    [1315, 500, 'east approach'],
    [775, 340, 'north approach'],
    [650, 850, 'Brewmaster forecourt']
  ].forEach(([x, y, label]) => {
    assert(rowGeometry.isWalkable(x, y), `Area 3 ${label} is not walkable.`);
  });
  [
    [520, 420, 'northwest house'],
    [1080, 420, 'northeast house'],
    [300, 860, 'Brewmaster equipment'],
    [800, 1045, 'south wall'],
    [1380, 830, 'southeast trees']
  ].forEach(([x, y, label]) => {
    assert(!rowGeometry.isWalkable(x, y), `Area 3 ${label} does not block at its visible base.`);
  });

  const libraryQuarter = maps['briarwell-library-quarter'];
  assert(libraryQuarter, 'Area 4 must load as a playable runtime map.');
  assert(libraryQuarter.version === '0.2.0', 'Area 4 must remove the obsolete sewer-grate route.');
  assert(libraryQuarter.exits.length === 2, 'Area 4 must expose only west and southwest public roads.');
  assert(libraryQuarter.portals.length === 0, 'Area 4 hidden routes must not appear as normal navigation triggers.');
  const libraryWest = libraryQuarter.exits.find((exit) => exit.id === 'west-road');
  const librarySouthwest = libraryQuarter.exits.find((exit) => exit.id === 'southwest-road');
  assert(
    libraryWest?.status === 'active'
      && libraryWest.target?.areaId === 'briarwell-brewmaster-row'
      && libraryWest.target?.spawnId === 'from-east'
      && libraryWest.target?.returnTransitionId === 'east-road',
    'Area 4 west road must return precisely to Area 3.'
  );
  assert(
    librarySouthwest?.status === 'active'
      && librarySouthwest.target?.areaId === 'briarwell-town-center'
      && librarySouthwest.target?.spawnId === 'from-northeast'
      && librarySouthwest.target?.returnTransitionId === 'northeast-road',
    'Area 4 southwest road must return precisely to Town Center northeast.'
  );
  const hiddenFeatureIds = new Set(libraryQuarter.interactables.map((feature) => feature.id));
  assert(hiddenFeatureIds.has('alley-open-window'), 'Area 4 must preserve the open-window clue.');
  assert(!hiddenFeatureIds.has('alley-sewer-grate'), 'Area 4 must not advertise the removed sewer route.');
  const libraryGeometry = new MapGeometry(libraryQuarter);
  [
    [620, 790, 'open civic square'],
    [145, 700, 'west approach'],
    [470, 955, 'southwest approach'],
    [1225, 900, 'cliffside alley entry'],
    [1310, 620, 'open-window approach'],
    [1310, 850, 'sewer-grate approach']
  ].forEach(([x, y, label]) => {
    assert(libraryGeometry.isWalkable(x, y), `Area 4 ${label} is not walkable.`);
  });
  [
    [850, 530, 'Library foundation'],
    [500, 600, 'Library courtyard wall'],
    [900, 850, 'lower houses'],
    [1330, 780, 'sewer grate'],
    [1400, 1030, 'southeast cliff wall']
  ].forEach(([x, y, label]) => {
    assert(!libraryGeometry.isWalkable(x, y), `Area 4 ${label} does not block at its visible base.`);
  });

  const westernHomes = maps['briarwell-western-homes'];
  assert(westernHomes, 'Area 5 must load as a playable runtime map.');
  assert(westernHomes.version === '0.1.0', 'Area 5 must start at runtime map version 0.1.0.');
  assert(westernHomes.exits.length === 3, 'Area 5 must expose east, west and south-alley routes.');
  const homesEast = westernHomes.exits.find((exit) => exit.id === 'east-road');
  const homesWest = westernHomes.exits.find((exit) => exit.id === 'west-road');
  const homesSouth = westernHomes.exits.find((exit) => exit.id === 'south-alley');
  assert(
    homesEast?.status === 'active'
      && homesEast.target?.areaId === 'briarwell-town-center'
      && homesEast.target?.spawnId === 'from-west'
      && homesEast.target?.returnTransitionId === 'west-road',
    'Area 5 east road must return precisely to Town Center west.'
  );
  assert(
    homesWest?.status === 'active'
      && homesWest.target?.areaId === 'briarwell-west-road-junction'
      && homesWest.target?.spawnId === 'from-east'
      && homesWest.target?.returnTransitionId === 'east-road',
    'Area 5 west road must load the western junction through its east road.'
  );
  assert(
    homesSouth?.status === 'active'
      && homesSouth.target?.areaId === 'briarwell-ainsley-church'
      && homesSouth.target?.returnTransitionId === 'north-alley',
    "Area 5 south alley must load Ainsley's/church through its north alley."
  );
  const homesGeometry = new MapGeometry(westernHomes);
  [
    [730, 700, 'open residential square'],
    [150, 690, 'west approach'],
    [1300, 650, 'east approach'],
    [720, 950, 'south-alley approach'],
    [720, 560, 'home forecourt'],
    [1080, 650, 'Fletcher forecourt']
  ].forEach(([x, y, label]) => {
    assert(homesGeometry.isWalkable(x, y), `Area 5 ${label} is not walkable.`);
  });
  [
    [700, 470, 'hero home'],
    [280, 610, 'left house'],
    [1160, 520, 'Fletcher workbench'],
    [300, 900, 'southwest yard wall'],
    [1180, 900, 'southeast yard wall']
  ].forEach(([x, y, label]) => {
    assert(!homesGeometry.isWalkable(x, y), `Area 5 ${label} does not block at its visible base.`);
  });

  const tanneryWarehouses = maps['briarwell-tannery-warehouses'];
  assert(tanneryWarehouses, 'Area 6 must load as a playable runtime map.');
  assert(tanneryWarehouses.version === '0.1.0', 'Area 6 must start at runtime map version 0.1.0.');
  assert(tanneryWarehouses.exits.length === 2, 'Area 6 must expose only west and south roads.');
  const tanneryWest = tanneryWarehouses.exits.find((exit) => exit.id === 'west-road');
  const tannerySouth = tanneryWarehouses.exits.find((exit) => exit.id === 'south-road');
  assert(
    tanneryWest?.status === 'active'
      && tanneryWest.target?.areaId === 'briarwell-town-center'
      && tanneryWest.target?.spawnId === 'from-east'
      && tanneryWest.target?.returnTransitionId === 'east-road',
    'Area 6 west road must return precisely to Town Center east.'
  );
  assert(
    tannerySouth?.status === 'active'
      && tannerySouth.target?.areaId === 'briarwell-docks'
      && tannerySouth.target?.spawnId === 'from-north'
      && tannerySouth.target?.returnTransitionId === 'north-road',
    'Area 6 south road must load the docks through its north road.'
  );
  const tanneryGeometry = new MapGeometry(tanneryWarehouses);
  [
    [720, 720, 'open work yard'],
    [120, 690, 'west approach'],
    [650, 950, 'south approach'],
    [720, 680, 'Tannery forecourt'],
    [1000, 600, 'warehouse loading apron']
  ].forEach(([x, y, label]) => {
    assert(tanneryGeometry.isWalkable(x, y), `Area 6 ${label} is not walkable.`);
  });
  [
    [360, 500, 'Tannery vats'],
    [950, 460, 'main warehouse'],
    [1280, 650, 'east warehouse'],
    [1180, 930, 'foreground warehouse'],
    [220, 900, 'southwest loading wall']
  ].forEach(([x, y, label]) => {
    assert(!tanneryGeometry.isWalkable(x, y), `Area 6 ${label} does not block at its visible base.`);
  });

  const ainsleyChurch = maps['briarwell-ainsley-church'];
  assert(ainsleyChurch, 'Area 7 must load as a playable runtime map.');
  assert(ainsleyChurch.version === '0.2.0', 'Area 7 must expose the active sewer access beside Ainsley\'s.');
  assert(ainsleyChurch.exits.length === 2, 'Area 7 must expose only north alley and east road.');
  assert(
    ainsleyChurch.portals.length === 1
      && ainsleyChurch.portals[0].id === 'sewer-grate'
      && ainsleyChurch.portals[0].activation === 'interact'
      && ainsleyChurch.portals[0].target?.areaId === 'briarwell-sewer-04',
    "Area 7 must expose one interacted sewer grate to Sewer Area 4."
  );
  const ainsleyNorth = ainsleyChurch.exits.find((exit) => exit.id === 'north-alley');
  const ainsleyEast = ainsleyChurch.exits.find((exit) => exit.id === 'east-road');
  assert(
    ainsleyNorth?.status === 'active'
      && ainsleyNorth.target?.areaId === 'briarwell-western-homes'
      && ainsleyNorth.target?.spawnId === 'from-south'
      && ainsleyNorth.target?.returnTransitionId === 'south-alley',
    'Area 7 north alley must return precisely to Area 5.'
  );
  assert(
    ainsleyEast?.status === 'active'
      && ainsleyEast.target?.areaId === 'briarwell-south-gate'
      && ainsleyEast.target?.returnTransitionId === 'west-road',
    'Area 7 east road must load the South Gate through its west road.'
  );
  const ainsleyGeometry = new MapGeometry(ainsleyChurch);
  [
    [800, 700, 'open courtyard'],
    [790, 500, 'north-alley approach'],
    [1320, 600, 'east-road approach'],
    [620, 650, "Ainsley's forecourt"],
    [1000, 650, 'church forecourt'],
    [210, 760, 'sewer-alley approach']
  ].forEach(([x, y, label]) => {
    assert(ainsleyGeometry.isWalkable(x, y), `Area 7 ${label} is not walkable.`);
  });
  [
    [420, 560, "Ainsley's foundation"],
    [1040, 560, 'church foundation'],
    [160, 700, 'sewer grate'],
    [600, 900, 'south garden wall'],
    [1260, 850, 'southeast wall']
  ].forEach(([x, y, label]) => {
    assert(!ainsleyGeometry.isWalkable(x, y), `Area 7 ${label} does not block at its visible base.`);
  });

  const southGate = maps['briarwell-south-gate'];
  assert(southGate, 'Area 8 must load as a playable runtime map.');
  assert(southGate.version === '0.3.0', 'Area 8 must expose the active south-outskirts route.');
  assert(
    southGate.art.background.endsWith('/briarwell-south-gate-v4.png'),
    'Area 8 must use the lightly snow-dusted welcome-sign background.'
  );
  assert(southGate.collisions.length === 9, 'Area 8 must contain nine visible ground footprints.');
  const welcomeSign = southGate.depthOccluders.find(
    (region) => region.id === 'welcome-to-briarwell-sign'
  );
  assert(
    welcomeSign?.depthY === 710,
    'The Welcome to Briarwell sign must remain an overhead depth layer.'
  );
  assert(
    !southGate.collisions.some((region) => region.id.includes('welcome')),
    'The overhead welcome sign must never become a ground collision.'
  );
  assert(southGate.exits.length === 4, 'Area 8 must expose north, west, east and south roads.');
  const gateNorth = southGate.exits.find((exit) => exit.id === 'north-road');
  const gateWest = southGate.exits.find((exit) => exit.id === 'west-road');
  const gateEast = southGate.exits.find((exit) => exit.id === 'east-road');
  const gateSouth = southGate.exits.find((exit) => exit.id === 'south-road');
  assert(
    gateNorth?.status === 'active'
      && gateNorth.target?.areaId === 'briarwell-town-center'
      && gateNorth.target?.spawnId === 'from-south'
      && gateNorth.target?.returnTransitionId === 'south-road',
    'Area 8 north road must return precisely to Town Center south.'
  );
  assert(
    gateWest?.status === 'active'
      && gateWest.target?.areaId === 'briarwell-ainsley-church'
      && gateWest.target?.spawnId === 'from-east'
      && gateWest.target?.returnTransitionId === 'east-road',
    'Area 8 west road must return precisely to Area 7.'
  );
  assert(
    gateEast?.status === 'active'
      && gateEast.target?.areaId === 'briarwell-docks'
      && gateEast.target?.spawnId === 'from-west'
      && gateEast.target?.returnTransitionId === 'west-road',
    'Area 8 east road must load the docks through its west road.'
  );
  assert(
    gateSouth?.status === 'active'
      && gateSouth.target?.areaId === 'briarwell-forest-f1'
      && gateSouth.target?.spawnId === 'from-north'
      && gateSouth.target?.returnTransitionId === 'north-road',
    'Area 8 south road must load Forest F1 through its north road.'
  );
  const gateGeometry = new MapGeometry(southGate);
  [
    [720, 600, 'mustering square'],
    [720, 400, 'north approach'],
    [145, 460, 'west approach'],
    [1320, 520, 'east approach'],
    [720, 610, 'road beneath the overhead welcome sign'],
    [330, 820, 'ground behind the west foreground wall'],
    [1180, 820, 'ground behind the east foreground wall'],
    [540, 800, 'ground behind the open west gate leaf'],
    [860, 800, 'ground behind the open east gate leaf'],
    [720, 930, 'open city-gate approach'],
    [720, 1020, 'road outside the city gate']
  ].forEach(([x, y, label]) => {
    assert(gateGeometry.isWalkable(x, y), `Area 8 ${label} is not walkable.`);
  });
  [
    [520, 100, 1340, 20, 'across the mustering square'],
    [800, 620, 820, 10, 'through the open gate throat'],
    [1000, 580, 860, 10, 'along the road beyond the gate']
  ].forEach(([y, left, right, step, label]) => {
    for (let x = left; x <= right; x += step) {
      assert(gateGeometry.isWalkable(x, y), `Area 8 path pinches ${label} at ${x},${y}.`);
    }
  });
  [
    [320, 420, 'house foundation'],
    [1030, 420, 'barracks foundation'],
    [560, 420, 'guardhouse foundation'],
    [330, 950, 'west wall foundation'],
    [1200, 965, 'east wall foundation'],
    [570, 910, 'open west gate leaf ground edge'],
    [820, 924, 'open east gate leaf ground edge'],
    [425, 920, 'west gate brazier'],
    [968, 920, 'east gate brazier']
  ].forEach(([x, y, label]) => {
    assert(!gateGeometry.isWalkable(x, y), `Area 8 ${label} does not block at its visible base.`);
  });

  const docks = maps['briarwell-docks'];
  assert(docks, 'Area 9 must load as a playable runtime map.');
  assert(docks.version === '0.5.0', 'Area 9 must expose the active dockside sewer access.');
  assert(docks.exits.length === 2, 'Area 9 must expose only north and west roads.');
  assert(
    docks.portals.length === 1
      && docks.portals[0].id === 'sewer-access'
      && docks.portals[0].activation === 'interact'
      && docks.portals[0].target?.areaId === 'briarwell-sewer-07',
    'Area 9 must expose one interacted dockside access to Sewer Area 7.'
  );
  const docksNorth = docks.exits.find((exit) => exit.id === 'north-road');
  const docksWest = docks.exits.find((exit) => exit.id === 'west-road');
  assert(
    docksNorth?.status === 'active'
      && docksNorth.target?.areaId === 'briarwell-tannery-warehouses'
      && docksNorth.target?.spawnId === 'from-south'
      && docksNorth.target?.returnTransitionId === 'south-road',
    'Area 9 north road must return precisely to Area 6.'
  );
  assert(
    docksWest?.status === 'active'
      && docksWest.target?.areaId === 'briarwell-south-gate'
      && docksWest.target?.spawnId === 'from-east'
      && docksWest.target?.returnTransitionId === 'east-road',
    'Area 9 west road must return precisely to Area 8.'
  );
  const docksGeometry = new MapGeometry(docks);
  [
    [560, 500, 'loading square'],
    [575, 330, 'north approach'],
    [145, 500, 'west approach'],
    [760, 500, "fisherman's-house side forecourt"],
    [610, 760, 'main pier']
  ].forEach(([x, y, label]) => {
    assert(docksGeometry.isWalkable(x, y), `Area 9 ${label} is not walkable.`);
  });
  [
    [980, 500, "fisherman's-house foundation"],
    [200, 690, 'west quay wall'],
    [900, 600, 'main quay wall'],
    [900, 720, 'central fishing boat'],
    [790, 1010, 'foreground pier cargo']
  ].forEach(([x, y, label]) => {
    assert(!docksGeometry.isWalkable(x, y), `Area 9 ${label} does not block at its visible base.`);
  });

  const mayorsHill = maps['briarwell-mayors-hill'];
  assert(mayorsHill, 'Area 10 must load as a playable runtime map.');
  assert(mayorsHill.version === '0.1.0', 'Area 10 must start at runtime map version 0.1.0.');
  assert(mayorsHill.exits.length === 1 && mayorsHill.portals.length === 0, 'Area 10 must expose only its south road.');
  const mayorSouth = mayorsHill.exits.find((exit) => exit.id === 'south-road');
  assert(
    mayorSouth?.status === 'active'
      && mayorSouth.target?.areaId === 'briarwell-brewmaster-row'
      && mayorSouth.target?.spawnId === 'from-north'
      && mayorSouth.target?.returnTransitionId === 'north-road',
    'Area 10 south road must return precisely to Area 3.'
  );
  const mayorGeometry = new MapGeometry(mayorsHill);
  [
    [730, 620, 'open hill road'],
    [730, 940, 'south approach'],
    [810, 340, 'manor forecourt']
  ].forEach(([x, y, label]) => {
    assert(mayorGeometry.isWalkable(x, y), `Area 10 ${label} is not walkable.`);
  });
  [
    [700, 150, 'manor foundation'],
    [400, 330, 'west terrace wall'],
    [1100, 340, 'east terrace wall'],
    [500, 220, 'civic statue']
  ].forEach(([x, y, label]) => {
    assert(!mayorGeometry.isWalkable(x, y), `Area 10 ${label} does not block at its visible base.`);
  });

  const blightOrphanage = maps['briarwell-blight-orphanage'];
  assert(blightOrphanage, 'Area 11 must load as a playable runtime map.');
  assert(blightOrphanage.version === '0.2.0', 'Area 11 must expose the cave access to the sewers.');
  assert(
    blightOrphanage.exits.length === 0
      && blightOrphanage.portals.length === 1
      && blightOrphanage.portals[0].id === 'sewer-cave'
      && blightOrphanage.portals[0].activation === 'interact'
      && blightOrphanage.portals[0].target?.areaId === 'briarwell-sewer-14',
    'Area 11 must expose only one interacted cave access to Sewer Area 14.'
  );
  assert(
    blightOrphanage.interactables.some((feature) => feature.id === 'alley-open-window'),
    'Area 11 must preserve the open-window clue for future secret traversal.'
  );
  const blightGeometry = new MapGeometry(blightOrphanage);
  [
    [720, 650, 'enclosed courtyard'],
    [1180, 620, 'hidden-window arrival'],
    [870, 585, 'orphanage forecourt'],
    [420, 555, 'barn forecourt']
  ].forEach(([x, y, label]) => {
    assert(blightGeometry.isWalkable(x, y), `Area 11 ${label} is not walkable.`);
  });
  [
    [300, 400, 'barn foundation'],
    [700, 350, 'orphanage left foundation'],
    [1100, 450, 'orphanage right foundation'],
    [700, 850, 'locked south wall'],
    [1320, 700, 'east cliff barrier']
  ].forEach(([x, y, label]) => {
    assert(!blightGeometry.isWalkable(x, y), `Area 11 ${label} does not block at its visible base.`);
  });

  const hensonHomestead = maps['briarwell-henson-homestead'];
  assert(hensonHomestead, 'Area 12 must load as a playable runtime map.');
  assert(hensonHomestead.version === '0.1.0', 'Area 12 must start at runtime map version 0.1.0.');
  assert(
    hensonHomestead.exits.length === 1 && hensonHomestead.portals.length === 0,
    'Area 12 must expose only its south road.'
  );
  const hensonSouth = hensonHomestead.exits.find((exit) => exit.id === 'south-road');
  assert(
    hensonSouth?.status === 'active'
      && hensonSouth.target?.areaId === 'briarwell-west-road-junction'
      && hensonSouth.target?.spawnId === 'from-north'
      && hensonSouth.target?.returnTransitionId === 'north-road',
    'Area 12 south road must return precisely to the western junction.'
  );
  const hensonGeometry = new MapGeometry(hensonHomestead);
  [
    [720, 670, 'open yard'],
    [720, 950, 'south approach'],
    [710, 430, 'house forecourt']
  ].forEach(([x, y, label]) => {
    assert(hensonGeometry.isWalkable(x, y), `Area 12 ${label} is not walkable.`);
  });
  [
    [650, 300, 'house foundation'],
    [300, 350, 'winter garden wall'],
    [1090, 480, 'work wheel'],
    [1100, 650, 'saw and hoist'],
    [200, 700, 'west yard wall']
  ].forEach(([x, y, label]) => {
    assert(!hensonGeometry.isWalkable(x, y), `Area 12 ${label} does not block at its visible base.`);
  });

  const westJunction = maps['briarwell-west-road-junction'];
  assert(westJunction, 'The western junction must load as a playable runtime map.');
  assert(westJunction.version === '0.1.1', 'The western junction must expose the corrected collision geometry.');
  assert(westJunction.exits.length === 3, 'The western junction must expose west, east and north roads only.');
  const junctionWest = westJunction.exits.find((exit) => exit.id === 'west-road');
  const junctionEast = westJunction.exits.find((exit) => exit.id === 'east-road');
  const junctionNorth = westJunction.exits.find((exit) => exit.id === 'north-road');
  assert(
    junctionWest?.status === 'unassigned' && junctionWest.target === null,
    'The junction west road must remain an explicit target-free city exit.'
  );
  assert(
    junctionEast?.status === 'active'
      && junctionEast.target?.areaId === 'briarwell-western-homes'
      && junctionEast.target?.spawnId === 'from-west'
      && junctionEast.target?.returnTransitionId === 'west-road',
    'The junction east road must load Area 5 through its west road.'
  );
  assert(
    junctionNorth?.status === 'active'
      && junctionNorth.target?.areaId === 'briarwell-henson-homestead'
      && junctionNorth.target?.spawnId === 'from-south'
      && junctionNorth.target?.returnTransitionId === 'south-road',
    'The junction north road must load Area 12 through its south road.'
  );
  assert(
    registry.getCityExitForTransition('briarwell-west-road-junction', 'west-road')?.id
      === 'west-road-out-of-briarwell',
    'The junction west road must be claimed by the approved city-exit contract.'
  );
  const junctionGeometry = new MapGeometry(westJunction);
  [
    [720, 540, 'open junction'],
    [145, 540, 'west approach'],
    [1300, 540, 'east approach'],
    [720, 150, 'north approach']
  ].forEach(([x, y, label]) => {
    assert(junctionGeometry.isWalkable(x, y), `Western junction ${label} is not walkable.`);
  });
  [
    [420, 520, 'signpost island'],
    [300, 300, 'northwest forest wall'],
    [1100, 300, 'northeast forest wall'],
    [720, 850, 'closed south boundary']
  ].forEach(([x, y, label]) => {
    assert(!junctionGeometry.isWalkable(x, y), `Western junction ${label} does not block at its visible base.`);
  });

  const sewerTopology = {
    1: [['north', 13], ['east', 10], ['west', 2]],
    2: [['east', 1], ['south', 3]],
    3: [['north', 2], ['south', 4]],
    4: [['north', 3], ['east', 5]],
    5: [['east', 6], ['west', 4]],
    6: [['east', 7], ['west', 5]],
    7: [['north', 8], ['west', 6]],
    8: [['north', 9], ['south', 7], ['west', 15]],
    9: [['north', 11], ['south', 8], ['west', 10]],
    10: [['north', 12], ['east', 9], ['west', 1]],
    11: [['north', 14], ['south', 9], ['west', 12]],
    12: [['east', 11], ['south', 10], ['west', 13]],
    13: [['east', 12], ['south', 1]],
    14: [['south', 11]],
    15: [['east', 8]]
  };
  const sewerMaps = Array.from({ length: 15 }, (_, index) => (
    maps[`briarwell-sewer-${String(index + 1).padStart(2, '0')}`]
  ));
  assert(sewerMaps.every(Boolean), 'All 15 numbered Briarwell sewer maps must load.');
  sewerMaps.forEach((sewer, index) => {
    const areaNumber = index + 1;
    const expectedVersion = areaNumber === 15 ? '1.2.0' : '1.0.0';
    assert(sewer.version === expectedVersion, `Sewer Area ${areaNumber} must use runtime map version ${expectedVersion}.`);
    const actualLinks = sewer.exits
      .map((exit) => [exit.direction, Number(exit.target.areaId.slice(-2))])
      .sort((left, right) => left[0].localeCompare(right[0]));
    const expectedLinks = sewerTopology[areaNumber]
      .slice()
      .sort((left, right) => left[0].localeCompare(right[0]));
    assert(
      JSON.stringify(actualLinks) === JSON.stringify(expectedLinks),
      `Sewer Area ${areaNumber} does not match Jay's approved map topology.`
    );
  });

  const expectedSewerPortals = {
    1: ['town-center-well-ladder', 'briarwell-town-center'],
    4: ['ainsley-alley-ladder', 'briarwell-ainsley-church'],
    5: ['hidden-dwarven-door', 'briarwell-sewer-secret'],
    7: ['docks-ladder', 'briarwell-docks'],
    14: ['blight-cave-ladder', 'briarwell-blight-orphanage']
  };
  sewerMaps.forEach((sewer, index) => {
    const areaNumber = index + 1;
    const expectedPortal = expectedSewerPortals[areaNumber];
    assert(
      sewer.portals.length === (expectedPortal ? 1 : 0),
      `Sewer Area ${areaNumber} has an unexpected access portal count.`
    );
    if (!expectedPortal) return;
    assert(
      sewer.portals[0].id === expectedPortal[0]
        && sewer.portals[0].target?.areaId === expectedPortal[1]
        && sewer.portals[0].activation === 'interact',
      `Sewer Area ${areaNumber} has the wrong interacted access portal.`
    );
  });

  const areaOne = sewerMaps[0];
  const cleanCistern = areaOne.interactables.find((feature) => feature.id === 'clean-spring-cistern');
  assert(
    areaOne.art.background.endsWith('/sewer-area-01-v1.png')
      && areaOne.art.alt.includes('raised clear-water cistern')
      && areaOne.collisions.some((region) => region.id === 'raised-clean-water-cistern')
      && cleanCistern?.interactionText.includes('Clear spring water')
      && cleanCistern?.interactionText.includes('one-way')
      && cleanCistern?.interactionText.includes('masonry divider'),
    'Sewer Area 1 must unmistakably separate the spring-fed well cistern from the lower sewer water.'
  );

  const areaFiveDoor = sewerMaps[4].portals.find((portal) => portal.id === 'hidden-dwarven-door');
  assert(
    areaFiveDoor?.check?.type === 'stat'
      && areaFiveDoor.check.stat === 'perception'
      && areaFiveDoor.check.target === 12
      && areaFiveDoor.check.discoveryId === 'briarwell-sewer-dwarven-door',
    'Sewer Area 5 must guard the dwarven chamber with the approved Perception 12 discovery check.'
  );

  const areaSevenDock = sewerMaps[6].portals.find((portal) => portal.id === 'docks-ladder');
  assert(
    areaSevenDock?.target?.areaId === 'briarwell-docks',
    'Sewer Area 7 must preserve Jay\'s added exit to the docks.'
  );

  const koboldMembers = sewerMaps[14].koboldEncounters.groups
    .flatMap((group) => group.members);
  assert(
    sewerMaps[14].exits.length === 1
      && sewerMaps[14].exits[0].direction === 'east'
      && koboldMembers.length === 13
      && koboldMembers.some((member) => member.variant === 'wizard')
      && koboldMembers.some((member) => member.variant === 'champion')
      && koboldMembers.some((member) => member.variant === 'chieftain'),
    'Sewer Area 15 must preserve all four encounter waves, including the wizard, champion and chieftain, behind its east-only route.'
  );

  const dwarvenChamber = maps['briarwell-sewer-secret'];
  assert(dwarvenChamber?.version === '1.0.2', 'The ancient dwarven chamber must load at version 1.0.2.');
  assert(
    dwarvenChamber.exits.length === 1
      && dwarvenChamber.exits[0].target?.areaId === 'briarwell-sewer-05',
    'The ancient dwarven chamber must return only to Sewer Area 5.'
  );
  const axe = dwarvenChamber.interactables.find((feature) => feature.id === 'ancient-two-handed-battle-axe');
  const chest = dwarvenChamber.interactables.find((feature) => feature.id === 'dwarven-treasure-chest');
  assert(
    axe?.interactionText.includes('two-handed battle axe')
      && chest?.interactionText.includes('chainmail armour')
      && chest?.interactionText.includes('350 silver')
      && chest?.interactionText.includes('20 gold'),
    'The dwarven chamber must preserve the approved axe and exact chest contents.'
  );

  assert(
    registryData.connections
      .filter((connection) => connection.kind === 'sewer-access')
      .every((connection) => connection.status === 'active' && connection.visibility === 'hidden'),
    'All four surface sewer connections must be active, interacted and hidden from public navigation.'
  );
  assert(
    registryData.connections
      .filter((connection) => connection.kind === 'sewer-tunnel')
      .every((connection) => connection.status === 'active' && connection.visibility === 'public'),
    'All 17 internal sewer tunnels must be active within the underground network.'
  );

  const tavern = maps['lodestone-tavern-interior'];
  assert(tavern, 'The Lodestone Tavern must load as a playable runtime map.');
  assert(tavern.version === '0.1.0', 'The Lodestone Tavern must start at runtime map version 0.1.0.');
  assert(tavern.exits.length === 0 && tavern.portals.length === 1, 'The Tavern must expose only its front door.');
  const tavernDoor = tavern.portals.find((portal) => portal.id === 'front-door');
  assert(
    tavernDoor?.status === 'active'
      && tavernDoor.target?.areaId === 'briarwell-town-center'
      && tavernDoor.target?.spawnId === 'tavern-return'
      && tavernDoor.target?.returnTransitionId === 'lodestone-tavern-door',
    'The Tavern front door must return precisely to the Town Center Tavern portal.'
  );
  const tavernGeometry = new MapGeometry(tavern);
  [
    [720, 500, 'front-door arrival'],
    [430, 600, 'hearth aisle'],
    [900, 600, 'bar aisle'],
    [720, 1000, 'foreground floor']
  ].forEach(([x, y, label]) => {
    assert(tavernGeometry.isWalkable(x, y), `Lodestone Tavern ${label} is not walkable.`);
  });
  [
    [200, 400, 'hearth foundation'],
    [450, 350, 'northwest table'],
    [1200, 500, 'bar base'],
    [200, 700, 'southwest table'],
    [1250, 800, 'southeast table']
  ].forEach(([x, y, label]) => {
    assert(!tavernGeometry.isWalkable(x, y), `Lodestone Tavern ${label} does not block.`);
  });

  const generalStore = maps['general-store-interior'];
  assert(generalStore, 'The General Store must load as a playable runtime map.');
  assert(generalStore.version === '0.1.0', 'The General Store must start at runtime map version 0.1.0.');
  assert(
    generalStore.exits.length === 0 && generalStore.portals.length === 1,
    'The General Store must expose only its front door.'
  );
  const storeDoor = generalStore.portals.find((portal) => portal.id === 'front-door');
  assert(
    storeDoor?.status === 'active'
      && storeDoor.target?.areaId === 'briarwell-town-center'
      && storeDoor.target?.spawnId === 'store-return'
      && storeDoor.target?.returnTransitionId === 'general-store-door',
    'The General Store front door must return precisely to the Town Center Store portal.'
  );
  const storeGeometry = new MapGeometry(generalStore);
  [
    [720, 500, 'front-door arrival'],
    [350, 600, 'shelf aisle'],
    [850, 650, 'counter aisle'],
    [720, 1000, 'foreground floor']
  ].forEach(([x, y, label]) => {
    assert(storeGeometry.isWalkable(x, y), `General Store ${label} is not walkable.`);
  });
  [
    [200, 300, 'left shelves'],
    [100, 700, 'foreground crates'],
    [1100, 500, 'service counter'],
    [1300, 700, 'right-side stock']
  ].forEach(([x, y, label]) => {
    assert(!storeGeometry.isWalkable(x, y), `General Store ${label} does not block.`);
  });
  assert(
    ['town-center-lodestone-tavern', 'town-center-general-store'].every((connectionId) => (
      registry.getConnection(connectionId)?.status === 'active'
    )),
    'Both Town Center doorway connections must remain active.'
  );

  const graphMismatchMaps = JSON.parse(JSON.stringify(maps));
  graphMismatchMaps['briarwell-town-center'].exits[1].target.areaId = 'briarwell-northwest-workshops';
  const graphMismatch = engine.auditTopology(registry, graphMismatchMaps);
  assert(
    graphMismatch.errors.some((error) => error.includes('target disagrees with town graph')),
    'Topology validation did not catch a map target that contradicts the approved route graph.'
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

function assertRouteGraphContract(engine) {
  const registryData = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

  const publicSecret = JSON.parse(JSON.stringify(registryData));
  publicSecret.connections.find((connection) => connection.kind === 'secret-passage').visibility = 'public';
  assert(
    (() => {
      try {
        new engine.AreaRegistry(publicSecret);
        return false;
      } catch (error) {
        return error.message.includes('must remain hidden');
      }
    })(),
    'A secret passage was allowed to become public navigation.'
  );

  const duplicateEndpoint = JSON.parse(JSON.stringify(registryData));
  const docksSewer = duplicateEndpoint.connections.find((connection) => connection.id === 'docks-sewers');
  docksSewer.endpoints[0] = {
    areaId: 'briarwell-town-center',
    transitionId: 'northwest-road'
  };
  assert(
    (() => {
      try {
        new engine.AreaRegistry(duplicateEndpoint);
        return false;
      } catch (error) {
        return error.message.includes('belongs to multiple connections');
      }
    })(),
    'A transition endpoint was allowed to belong to two internal connections.'
  );

  const duplicateCityExit = JSON.parse(JSON.stringify(registryData));
  duplicateCityExit.cityExits.push({
    ...duplicateCityExit.cityExits[0],
    id: 'duplicate-west-road-out-of-briarwell'
  });
  assert(
    (() => {
      try {
        new engine.AreaRegistry(duplicateCityExit);
        return false;
      } catch (error) {
        return error.message.includes('multiple city exits');
      }
    })(),
    'A transition endpoint was allowed to belong to two city exits.'
  );

  const unknownArea = JSON.parse(JSON.stringify(registryData));
  unknownArea.connections[0].endpoints[1].areaId = 'imaginary-briarwell-area';
  assert(
    (() => {
      try {
        new engine.AreaRegistry(unknownArea);
        return false;
      } catch (error) {
        return error.message.includes('unknown area');
      }
    })(),
    'A route graph endpoint was allowed to name an unregistered area.'
  );
}

(() => {
  const { worldMap, mapEngine } = loadEngines();
  assertBriarwellRegistry(worldMap, mapEngine.MapGeometry);
  assertTransitionContract(worldMap);
  assertRouteGraphContract(worldMap);
  console.log('Briarwell area registry and transition topology checks passed.');
})();
