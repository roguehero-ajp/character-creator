'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const skipBrowser = process.env.AVENDOR_SKIP_BROWSER === '1';
const { chromium } = skipBrowser ? {} : require('playwright');

const avendorRoot = path.resolve(__dirname, '..');
const mapPath = path.join(avendorRoot, 'data/maps/briarwell-town-center.json');
const enginePath = path.join(avendorRoot, 'js/map-engine.js');
const testUrl = process.env.AVENDOR_TEST_URL
  || 'http://127.0.0.1:4173/avendor/walk-test.html';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertSimplePolygon(region) {
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
        `Occluder polygon crosses itself: ${region.id}`
      );
    }
  }
}

function loadGeometry() {
  const data = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(enginePath, 'utf8'), context);
  const engine = context.window.AvendorMapEngine;
  const map = new engine.MapGeometry(data);
  return { data, map, pointInPolygon: engine.pointInPolygon };
}

function assertGeometry() {
  const { data, map, pointInPolygon } = loadGeometry();

  assert(data.schemaVersion === 2, 'Wrong Town Center map schema version.');
  assert(data.version === '0.8.0', 'Wrong Town Center map version.');
  assert(data.collisions.length === 8, 'Town Center should contain eight foot-level obstacles.');
  assert(data.npcs.length === 2, 'Town Center should contain exactly two residents.');
  assert(
    data.npcs.map((npc) => npc.id).join(',') === 'fanny-allwood,lain-menny',
    'Town Center residents are not Fanny Allwood and Lain Menny.'
  );

  const occluderIds = data.depthOccluders.map((region) => region.id);
  assert(data.depthOccluders.length === 56, 'Town Center occlusion tracing is incomplete.');
  assert(new Set(occluderIds).size === occluderIds.length, 'Occluder ids must be unique.');
  assert(
    new Set(data.depthOccluders.map((region) => region.depthY)).size === 15,
    'Occluders should collapse into fifteen locally depth-sorted SVG layers.'
  );

  data.depthOccluders.forEach((region) => {
    assert(region.points.length >= 3, `Occluder has too few points: ${region.id}`);
    assertSimplePolygon(region);
    region.points.forEach(([x, y]) => {
      assert(
        x >= 0 && x <= data.referenceSize.width
          && y >= 0 && y <= data.referenceSize.height,
        `Occluder point is outside the map: ${region.id}`
      );
    });
    const twiceArea = Math.abs(region.points.reduce((area, [x, y], index) => {
      const [nextX, nextY] = region.points[(index + 1) % region.points.length];
      return area + (x * nextY) - (nextX * y);
    }, 0));
    assert(twiceArea >= 8, `Occluder polygon has no usable area: ${region.id}`);
  });

  const isOccludedAt = (x, y, actorY) => data.depthOccluders.some((region) => (
    region.depthY > actorY && pointInPolygon([x, y], region.points)
  ));
  const visibleActorEnvelopeFraction = (x, y) => {
    const scale = map.getScale(y);
    const activeOccluders = data.depthOccluders.filter((region) => region.depthY > y);
    let visibleSamples = 0;
    let totalSamples = 0;

    // The male north-idle frame's opaque envelope is x 27..100, y 32..223
    // inside the 128x240 runtime canvas. Sample that scaled envelope in map space.
    for (let sampleY = y - (208 * scale); sampleY <= y - (17 * scale); sampleY += 3) {
      for (let sampleX = x - (37 * scale); sampleX <= x + (36 * scale); sampleX += 3) {
        totalSamples += 1;
        if (!activeOccluders.some((region) => pointInPolygon([sampleX, sampleY], region.points))) {
          visibleSamples += 1;
        }
      }
    }

    return visibleSamples / totalSamples;
  };
  const assertVisibleWalkableSpan = (y, left, right, label) => {
    for (let x = left; x <= right; x += 1) {
      assert(map.isWalkable(x, y), `Movement lane is pinched ${label} at ${x},${y}.`);
      assert(
        visibleActorEnvelopeFraction(x, y) >= 0.3,
        `The hero becomes effectively invisible ${label} at ${x},${y}.`
      );
    }
  };
  const assertWalkableSpan = (y, left, right, label) => {
    for (let x = left; x <= right; x += 1) {
      assert(map.isWalkable(x, y), `Movement lane is pinched ${label} at ${x},${y}.`);
    }
  };
  assert(isOccludedAt(370, 520, 590), 'The fruit-stall post no longer occludes the hero.');
  assert(!isOccludedAt(344, 520, 590), 'The fruit-stall post mask is still too wide on the left.');
  assert(!isOccludedAt(397, 540, 590), 'The fruit-stall post mask is still too wide on the right.');
  assert(isOccludedAt(380, 800, 900), 'The Northgate board no longer occludes the hero.');
  assert(!isOccludedAt(350, 818, 900), 'The gap beneath the Northgate board is painted shut.');
  assert(isOccludedAt(1270, 846, 820), 'The southeast upper fence rail no longer occludes the hero.');
  assert(!isOccludedAt(1270, 870, 820), 'The gap between southeast fence rails is painted shut.');
  assert(isOccludedAt(180, 900, 760), 'The southwest gate no longer occludes the hero.');
  assert(!isOccludedAt(180, 790, 760), 'The open space above the southwest gate is painted shut.');
  assert(
    data.depthOccluders.find((region) => region.id === 'lodestone-tavern-front')?.depthY === 560,
    'The Lodestone foreground still extends below its painted base.'
  );
  Object.entries({
    'general-store-awning': 470,
    'general-store-hanging-sign': 480,
    'general-store-left-barrel': 560,
    'general-store-sign-post': 570,
    'general-store-left-crate': 570,
    'general-store-building': 620
  }).forEach(([id, expectedDepth]) => {
    assert(
      data.depthOccluders.find((region) => region.id === id)?.depthY === expectedDepth,
      `General Store occluder has the wrong local depth: ${id}`
    );
  });

  [
    [365, 375, 'through the northwest exit'],
    [400, 430, 'along the northwest approach'],
    [405, 500, 'past the fruit-stall post'],
    [450, 540, 'into the northwest side of the square'],
    [1065, 420, 'through the northeast exit'],
    [1055, 470, 'beneath the General Store sign'],
    [1060, 480, 'past the General Store hanging sign'],
    [1060, 500, 'through the narrow northeast lane'],
    [1060, 540, 'into the northeast side of the square'],
    [1010, 570, 'past the Lodestone east wall']
  ].forEach(([x, y, label]) => {
    assert(map.isWalkable(x, y), `North-road visibility route is blocked ${label}.`);
    assert(
      visibleActorEnvelopeFraction(x, y) >= 0.3,
      `The hero is still effectively invisible ${label}.`
    );
  });

  [
    [490, 1035, 1090, 'below the General Store hanging sign'],
    [520, 1038, 1080, 'beside the General Store barrel and crate'],
    [540, 1045, 1078, 'between the General Store and Lodestone Tavern'],
    [570, 1010, 1070, 'where the northeast road opens into the square']
  ].forEach(([y, left, right, label]) => {
    assertVisibleWalkableSpan(y, left, right, label);
  });

  [
    [780, 1100, 1400, 'across the upper east approach'],
    [820, 1100, 1400, 'along the southeast fence approach'],
    [850, 1100, 1400, 'through the southeast fence line'],
    [880, 1100, 1400, 'up to the southeast stone wall']
  ].forEach(([y, left, right, label]) => {
    assertWalkableSpan(y, left, right, label);
  });

  [
    [450, 430, 'inside the Lodestone northwest wall'],
    [375, 530, 'inside the fruit-stall post silhouette'],
    [1016, 540, 'inside the Lodestone northeast wall'],
    [1120, 470, 'inside the General Store facade']
  ].forEach(([x, y, label]) => {
    assert(!map.isWalkable(x, y), `The hero can still enter a fully hidden pocket ${label}.`);
  });

  const artPath = path.join(avendorRoot, data.art.background);
  const art = fs.readFileSync(artPath);
  assert(art.toString('ascii', 1, 4) === 'PNG', 'Town Center background is not a PNG.');
  assert(
    art.readUInt32BE(16) === data.referenceSize.width
      && art.readUInt32BE(20) === data.referenceSize.height,
    'Town Center map dimensions do not match the background art.'
  );

  const html = fs.readFileSync(path.join(avendorRoot, 'walk-test.html'), 'utf8');
  [
    data.art.background,
    'js/map-engine.js',
    'js/world-map.js',
    'js/sprite-engine.js',
    'js/walk-test.js'
  ].forEach((asset) => {
    assert(html.includes(asset), `Walk test does not load: ${asset}`);
  });

  Object.entries(data.spawnPoints).forEach(([id, spawn]) => {
    assert(map.isWalkable(spawn.x, spawn.y), `Spawn is blocked: ${id}`);
  });

  data.npcs.forEach((npc) => {
    assert(!map.isWalkable(npc.x, npc.y), `Resident collision is missing: ${npc.id}`);
    assert(fs.existsSync(path.join(avendorRoot, npc.sprite.idle)), `Resident sprite is missing: ${npc.id}`);
  });

  const fanny = map.getNearbyInteractable({ x: 238, y: 690 });
  assert(fanny?.id === 'fanny-allwood' && fanny.type === 'npc', 'Fanny cannot be reached across her stall.');
  const lain = map.getNearbyInteractable({ x: 750, y: 742 });
  assert(lain?.id === 'lain-menny' && lain.type === 'npc', 'Lain cannot be approached beside the well.');

  [
    [350, 470, 'behind the fruit canopy'],
    [400, 590, 'behind the fruit-stall beam'],
    [215, 760, 'behind the southwest fence'],
    [1180, 740, 'behind the southeast fence'],
    [420, 470, 'beside the Lodestone north path'],
    [1055, 470, 'beside the northeast path'],
    [450, 540, 'through the widened northwest Lodestone passage'],
    [1060, 540, 'through the widened northeast Lodestone passage'],
    [1210, 820, 'beside the southeast lantern post'],
    [1400, 850, 'through the widened southeast fence line'],
    [1160, 952, 'close to the southeast stone wall']
  ].forEach(([x, y, label]) => {
    assert(map.isWalkable(x, y), `Expected walkable space ${label}.`);
  });

  [
    [370, 630, 'fruit-stall post base'],
    [250, 850, 'southwest fence base'],
    [1400, 900, 'southeast stone wall east end'],
    [1205, 970, 'southeast stone wall base']
  ].forEach(([x, y, label]) => {
    assert(!map.isWalkable(x, y), `Expected collision at the ${label}.`);
  });

  const transitions = [...data.exits, ...data.portals];
  transitions.forEach((transition) => {
    const x = transition.points.reduce((sum, point) => sum + point[0], 0)
      / transition.points.length;
    const y = transition.points.reduce((sum, point) => sum + point[1], 0)
      / transition.points.length;
    assert(map.isWalkable(x, y), `Transition is unreachable: ${transition.id}`);
    assert(
      map.getTriggerAt({ x, y })?.id === transition.id,
      `Transition resolves incorrectly: ${transition.id}`
    );
    if (transition.status === 'unassigned') {
      assert(transition.target === null, `Unassigned transition has a provisional target: ${transition.id}`);
    } else {
      assert(transition.target?.areaId, `Transition target is missing: ${transition.id}`);
    }
    const fallback = map.getExactSpawn(transition.fallbackSpawn);
    assert(fallback, `Transition fallback spawn is missing: ${transition.id}`);
    assert(
      !map.getTriggerAt(fallback),
      `Transition fallback spawn overlaps a trigger: ${transition.id}`
    );
  });

  const step = 5;
  const start = data.spawnPoints.default;
  const queue = [[
    Math.round(start.x / step) * step,
    Math.round(start.y / step) * step
  ]];
  const seen = new Set([queue[0].join(',')]);
  const found = new Set();
  const directions = [
    [step, 0], [-step, 0], [0, step], [0, -step],
    [step, step], [step, -step], [-step, step], [-step, -step]
  ];

  for (let head = 0; head < queue.length; head += 1) {
    const [x, y] = queue[head];
    const trigger = map.getTriggerAt({ x, y });
    if (trigger) found.add(trigger.id);

    directions.forEach(([dx, dy]) => {
      const next = [x + dx, y + dy];
      const key = next.join(',');
      if (!seen.has(key) && map.isWalkable(next[0], next[1])) {
        seen.add(key);
        queue.push(next);
      }
    });
  }

  transitions.forEach((transition) => {
    assert(found.has(transition.id), `Transition is disconnected: ${transition.id}`);
  });
}

async function assertBrowser() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1448, height: 1086 } });
  const failures = [];
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`);
  });

  await page.goto(testUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => (
    document.getElementById('rig-status')?.textContent.includes('TOWN CENTER MAP 0.8.0')
  ));

  const snapshot = await page.evaluate(() => ({
    imageWidth: document.querySelector('.stage-art').naturalWidth,
    imageHeight: document.querySelector('.stage-art').naturalHeight,
    occluderGroups: document.querySelectorAll('.scene-occluder').length,
    occluderParts: document.querySelectorAll('.scene-occluder polygon').length,
    expectedOccluderGroups: new Set(
      window.AvendorWalkTest.getMap().data.depthOccluders.map((region) => region.depthY)
    ).size,
    expectedOccluderParts: window.AvendorWalkTest.getMap().data.depthOccluders.length,
    exits: window.AvendorWalkTest.getMap().data.exits.length,
    portals: window.AvendorWalkTest.getMap().data.portals.length,
    residents: window.AvendorWalkTest.getMap().npcs.length,
    areaId: window.AvendorWalkTest.getArea().id,
    registryStart: window.AvendorWalkTest.getRegistry().getStart().areaId,
    mountedResidents: document.querySelectorAll('.map-npc').length,
    npcSprites: window.AvendorWalkTest.getNpcs().map(({ definition, sprite }) => ({
      id: definition.id,
      ready: sprite.getStatus().ready,
      direction: sprite.getStatus().direction
    })),
    hero: window.AvendorWalkTest.hero.getStatus(),
    start: window.AvendorWalkTest.getPosition()
  }));

  assert(snapshot.imageWidth === 1448 && snapshot.imageHeight === 1086, 'Wrong Town Center art loaded.');
  assert(
    snapshot.occluderGroups === snapshot.expectedOccluderGroups,
    'Depth-sorted occluder groups were not mounted.'
  );
  assert(snapshot.occluderParts === snapshot.expectedOccluderParts, 'Occluder polygons were not mounted.');
  assert(snapshot.exits === 5 && snapshot.portals === 2, 'Transition counts are wrong.');
  assert(
    snapshot.areaId === 'briarwell-town-center'
      && snapshot.registryStart === 'briarwell-town-center',
    'The walk test did not boot through the Briarwell area registry.'
  );
  assert(snapshot.residents === 2 && snapshot.mountedResidents === 2, 'Resident count is wrong.');
  assert(snapshot.npcSprites.every((npc) => npc.ready), 'A resident sprite did not finish loading.');
  assert(
    snapshot.npcSprites.map((npc) => `${npc.id}:${npc.direction}`).join(',')
      === 'fanny-allwood:south,lain-menny:east',
    'A resident is facing the wrong direction.'
  );
  assert(snapshot.hero.ready, 'Hero sprite did not finish loading.');
  assert(snapshot.hero.artVersion === '0.4.3', 'Wrong hero art version loaded.');

  const spriteFrames = await page.evaluate(async () => {
    const hero = window.AvendorWalkTest.hero;
    const canvas = document.getElementById('player-canvas');
    const context = canvas.getContext('2d');
    const directions = [
      'south', 'southeast', 'east', 'northeast',
      'north', 'northwest', 'west', 'southwest'
    ];
    const results = [];

    function inspect(body, state, direction, frame) {
      hero.state = state;
      hero.direction = direction;
      hero.frame = frame;
      hero.draw();
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let minY = canvas.height;
      let maxY = -1;
      let visiblePixels = 0;

      for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index] < 16) continue;
        const y = Math.floor((index >> 2) / canvas.width);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        visiblePixels += 1;
      }

      results.push({
        body,
        state,
        direction,
        frame,
        visiblePixels,
        height: maxY >= minY ? maxY - minY + 1 : 0,
        bottom: maxY
      });
    }

    for (const body of ['male', 'female']) {
      await window.AvendorWalkTest.setBody(body);
      for (const direction of directions) {
        inspect(body, 'idle', direction, 0);
        for (let frame = 0; frame < 6; frame += 1) {
          inspect(body, 'walk', direction, frame);
        }
      }
    }

    await window.AvendorWalkTest.setBody('male');
    hero.setMotion('idle', 'north');
    return results;
  });

  assert(spriteFrames.length === 112, 'Not every runtime hero frame was checked.');
  spriteFrames.forEach((frame) => {
    const expectedHeight = frame.body === 'male' ? 192 : 180;
    const label = `${frame.body} ${frame.state} ${frame.direction} frame ${frame.frame}`;
    assert(frame.visiblePixels >= 1800, `${label} is visually incomplete.`);
    assert(frame.height === expectedHeight, `${label} rendered at the wrong height.`);
    assert(frame.bottom >= 222 && frame.bottom <= 223, `${label} missed the foot anchor.`);
  });

  await page.keyboard.down('w');
  await page.waitForTimeout(350);
  await page.keyboard.up('w');
  const moved = await page.evaluate(() => window.AvendorWalkTest.getPosition());
  assert(moved.y < snapshot.start.y, 'Keyboard movement did not move the hero north.');

  await page.click('#map-debug-toggle');
  assert(await page.locator('#map-debug-layer').evaluate((node) => node.classList.contains('show')), 'Debug map did not open.');
  await page.screenshot({ path: '/tmp/avendor-town-center-debug.png' });

  await page.click('#body-female');
  await page.waitForFunction(() => document.getElementById('rig-status').textContent.includes('FEMALE'));
  const reload = await page.evaluate(async () => {
    await window.AvendorWalkTest.loadArea('briarwell-town-center', 'from-south');
    return {
      areaId: window.AvendorWalkTest.getArea().id,
      body: window.AvendorWalkTest.hero.getStatus().body,
      position: window.AvendorWalkTest.getPosition(),
      occluderGroups: document.querySelectorAll('.scene-occluder').length,
      residents: document.querySelectorAll('.map-npc').length
    };
  });
  assert(reload.areaId === 'briarwell-town-center', 'Area reload changed the active area incorrectly.');
  assert(reload.body === 'female', 'Area reload did not preserve the selected hero body.');
  assert(reload.position.x === 724 && reload.position.y === 990, 'Area reload used the wrong spawn.');
  assert(
    reload.occluderGroups === snapshot.expectedOccluderGroups && reload.residents === 2,
    'Area reload duplicated or dropped scene layers.'
  );
  await page.click('#body-male');
  await page.waitForFunction(() => document.getElementById('rig-status').textContent.includes('MALE'));

  const townAudit = await page.evaluate(async () => {
    const walkTest = window.AvendorWalkTest;
    const playableAreas = walkTest.getRegistry().areas.filter((area) => area.status === 'playable');
    const results = [];

    for (const area of playableAreas) {
      const sceneMap = await walkTest.loadArea(area.id, 'default');
      const stageArt = document.querySelector('.stage-art');
      if (stageArt.decode) await stageArt.decode().catch(() => {});
      results.push({
        areaId: area.id,
        mapId: sceneMap.data.id,
        width: stageArt.naturalWidth,
        height: stageArt.naturalHeight,
        position: walkTest.getPosition(),
        expectedPosition: sceneMap.data.spawnPoints.default,
        occluderParts: document.querySelectorAll('.scene-occluder polygon').length,
        expectedOccluderParts: sceneMap.data.depthOccluders.length,
        mountedResidents: document.querySelectorAll('.map-npc').length,
        expectedResidents: sceneMap.npcs.length,
        stageAreaId: document.getElementById('walk-stage').dataset.areaId
      });
    }

    return results;
  });
  assert(townAudit.length === 16, 'The browser did not load all 16 playable Briarwell maps.');
  townAudit.forEach((area) => {
    assert(area.areaId === area.mapId && area.areaId === area.stageAreaId, `Wrong map mounted for ${area.areaId}.`);
    assert(area.width === 1448 && area.height === 1086, `Wrong background dimensions for ${area.areaId}.`);
    assert(
      area.position.x === area.expectedPosition.x && area.position.y === area.expectedPosition.y,
      `Wrong default spawn mounted for ${area.areaId}.`
    );
    assert(
      area.occluderParts === area.expectedOccluderParts,
      `Occluder parts were duplicated or dropped for ${area.areaId}.`
    );
    assert(
      area.mountedResidents === area.expectedResidents,
      `Resident layers were duplicated or dropped for ${area.areaId}.`
    );
  });
  await page.evaluate(() => window.AvendorWalkTest.loadArea('briarwell-sewers', 'default'));
  await page.screenshot({ path: '/tmp/avendor-briarwell-sewers-debug.png' });

  await browser.close();
  assert(failures.length === 0, failures.join('\n'));
}

(async () => {
  assertGeometry();
  if (skipBrowser) {
    console.log('Briarwell Town Center geometry checks passed; browser smoke check skipped.');
  } else {
    await assertBrowser();
    console.log('Briarwell complete town smoke checks passed.');
  }
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
