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

function loadGeometry() {
  const data = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(enginePath, 'utf8'), context);
  const map = new context.window.AvendorMapEngine.MapGeometry(data);
  return { data, map };
}

function assertGeometry() {
  const { data, map } = loadGeometry();

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

  [
    [350, 470, 'behind the fruit canopy'],
    [400, 590, 'behind the fruit-stall beam'],
    [215, 760, 'behind the southwest fence'],
    [1180, 740, 'behind the southeast fence'],
    [450, 470, 'beside the Lodestone north path'],
    [1120, 470, 'beside the northeast path']
  ].forEach(([x, y, label]) => {
    assert(map.isWalkable(x, y), `Expected walkable space ${label}.`);
  });

  [
    [370, 630, 'fruit-stall post base'],
    [250, 850, 'southwest fence base'],
    [1190, 750, 'southeast fence base']
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
    document.getElementById('rig-status')?.textContent.includes('TOWN CENTER MAP 0.5.1')
  ));

  const snapshot = await page.evaluate(() => ({
    imageWidth: document.querySelector('.stage-art').naturalWidth,
    imageHeight: document.querySelector('.stage-art').naturalHeight,
    occluders: document.querySelectorAll('.scene-occluder').length,
    expectedOccluders: window.AvendorWalkTest.getMap().data.depthOccluders.length,
    exits: window.AvendorWalkTest.getMap().data.exits.length,
    portals: window.AvendorWalkTest.getMap().data.portals.length,
    anchors: window.AvendorWalkTest.getMap().data.npcAnchors.length,
    start: window.AvendorWalkTest.getPosition()
  }));

  assert(snapshot.imageWidth === 1448 && snapshot.imageHeight === 1086, 'Wrong Town Center art loaded.');
  assert(snapshot.occluders === snapshot.expectedOccluders, 'Depth occluders were not mounted.');
  assert(snapshot.exits === 5 && snapshot.portals === 2, 'Transition counts are wrong.');
  assert(snapshot.anchors === 10, 'NPC anchor count is wrong.');

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
