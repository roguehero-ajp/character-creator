'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { chromium } = require('playwright');

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

  assert(data.version === '0.6.1', 'Wrong Town Center map version.');
  assert(data.npcs.length === 2, 'Town Center should contain exactly two residents.');
  assert(
    data.npcs.map((npc) => npc.id).join(',') === 'fanny-allwood,lain-menny',
    'Town Center residents are not Fanny Allwood and Lain Menny.'
  );

  const occluderIds = data.depthOccluders.map((region) => region.id);
  assert(data.depthOccluders.length === 56, 'Town Center occlusion tracing is incomplete.');
  assert(new Set(occluderIds).size === occluderIds.length, 'Occluder ids must be unique.');
  assert(
    new Set(data.depthOccluders.map((region) => region.depthY)).size === 12,
    'Occluders should collapse into twelve depth-sorted SVG layers.'
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
  assert(isOccludedAt(370, 520, 590), 'The fruit-stall post no longer occludes the hero.');
  assert(!isOccludedAt(344, 520, 590), 'The fruit-stall post mask is still too wide on the left.');
  assert(!isOccludedAt(397, 540, 590), 'The fruit-stall post mask is still too wide on the right.');
  assert(isOccludedAt(380, 800, 900), 'The Northgate board no longer occludes the hero.');
  assert(!isOccludedAt(350, 818, 900), 'The gap beneath the Northgate board is painted shut.');
  assert(isOccludedAt(1270, 846, 820), 'The southeast upper fence rail no longer occludes the hero.');
  assert(!isOccludedAt(1270, 870, 820), 'The gap between southeast fence rails is painted shut.');
  assert(isOccludedAt(180, 900, 760), 'The southwest gate no longer occludes the hero.');
  assert(!isOccludedAt(180, 790, 760), 'The open space above the southwest gate is painted shut.');

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
    [450, 470, 'beside the Lodestone north path'],
    [1120, 470, 'beside the northeast path'],
    [458, 540, 'through the widened northwest Lodestone passage'],
    [1016, 540, 'through the widened northeast Lodestone passage'],
    [1160, 952, 'close to the southeast stone wall']
  ].forEach(([x, y, label]) => {
    assert(map.isWalkable(x, y), `Expected walkable space ${label}.`);
  });

  [
    [370, 630, 'fruit-stall post base'],
    [250, 850, 'southwest fence base'],
    [1210, 820, 'southeast fence base'],
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
    document.getElementById('rig-status')?.textContent.includes('TOWN CENTER MAP 0.6.1')
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
  await page.click('#body-male');
  await page.waitForFunction(() => document.getElementById('rig-status').textContent.includes('MALE'));

  await browser.close();
  assert(failures.length === 0, failures.join('\n'));
}

(async () => {
  assertGeometry();
  if (process.env.AVENDOR_SKIP_BROWSER === '1') {
    console.log('Briarwell Town Center geometry checks passed; browser smoke check skipped.');
  } else {
    await assertBrowser();
    console.log('Briarwell Town Center smoke checks passed.');
  }
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
