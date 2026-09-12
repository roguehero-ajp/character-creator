'use strict';

const skipBrowser = process.env.AVENDOR_SKIP_BROWSER === '1';
const { chromium } = skipBrowser ? {} : require('playwright');

const testUrl = process.env.AVENDOR_TEST_URL
  || 'http://127.0.0.1:4173/avendor/walk-test.html';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForArea(page, areaId) {
  await page.waitForFunction((expected) => (
    window.AvendorWalkTest?.getArea?.()?.id === expected
      && window.AvendorWalkTest?.getMap?.()?.data?.id === expected
  ), areaId);
}

async function mountedScene(page) {
  return page.evaluate(async () => {
    const art = document.querySelector('.stage-art');
    if (art.decode) await art.decode().catch(() => {});
    return {
      areaId: window.AvendorWalkTest.getArea().id,
      width: art.naturalWidth,
      height: art.naturalHeight,
      background: window.AvendorWalkTest.getMap().data.art.background
    };
  });
}

async function runBrowser() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1448, height: 1086 } });
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));

  try {
    await page.goto(`${testUrl}?area=briarwell-ogre-clearing`, { waitUntil: 'networkidle' });
    await waitForArea(page, 'briarwell-ogre-clearing');
    await page.evaluate(() => {
      localStorage.removeItem('avendorDiscoveries.v1');
      localStorage.removeItem('avendorOgreCaveLoot.v1');
      const state = window.AvendorPlayerState.createDefault();
      state.stats.strength = 7;
      window.AvendorPlayerState.save(state);
      return window.AvendorWalkTest.loadArea('briarwell-ogre-clearing', 'from-ogre-cave');
    });
    await waitForArea(page, 'briarwell-ogre-clearing');

    await page.keyboard.press('e');
    await page.waitForFunction(() => document.getElementById('walk-help').textContent.includes('Strength: 7/8'));
    assert(
      await page.evaluate(() => window.AvendorWalkTest.getArea().id) === 'briarwell-ogre-clearing',
      'Strength 7 incorrectly opened the Ogre Cave.'
    );

    await page.evaluate(() => {
      const state = window.AvendorPlayerState.load();
      state.stats.strength = 8;
      window.AvendorPlayerState.save(state);
    });
    await page.keyboard.press('e');
    await page.waitForFunction(() => document.getElementById('walk-help').textContent.includes('Strength: 8/8'));
    assert(
      await page.evaluate(() => window.AvendorWalkTest.getArea().id) === 'briarwell-ogre-clearing',
      'Moving the boulder must be a visible first interaction before traversal.'
    );
    await page.keyboard.press('e');
    await waitForArea(page, 'briarwell-ogre-cave');

    const caveScene = await mountedScene(page);
    assert(caveScene.width === 1448 && caveScene.height === 1086, 'The Ogre Cave mounted low-resolution art.');
    assert(caveScene.background.endsWith('briarwell-ogre-cave-v1.webp'), 'The Ogre Cave mounted the wrong background.');

    const claimState = await page.evaluate(() => {
      const data = window.AvendorWalkTest.getMap().data;
      data.interactables.forEach((feature) => {
        window.dispatchEvent(new CustomEvent('avendor:feature-interaction', {
          cancelable: true,
          detail: { feature, area: window.AvendorWalkTest.getArea(), map: data }
        }));
      });
      return {
        chest: document.getElementById('walk-stage').dataset.ogreCaveChest,
        sword: document.getElementById('walk-stage').dataset.ogreCaveSword,
        shield: document.getElementById('walk-stage').dataset.ogreCaveShield,
        saved: window.AvendorOgreCave.readState()
      };
    });
    assert(
      claimState.chest === 'opened'
        && claimState.sword === 'claimed'
        && claimState.shield === 'claimed'
        && claimState.saved.chestOpened
        && claimState.saved.swordClaimed
        && claimState.saved.shieldClaimed,
      'Ogre Cave pickup state did not persist through the mounted runtime.'
    );

    const islandScenes = [
      ['briarwell-haunted-island-landing', 'from-boat', 'briarwell-haunted-island-landing-v1.webp'],
      ['briarwell-haunted-island-house', 'from-south', 'briarwell-haunted-island-house-v1.webp'],
      ['briarwell-little-island', 'from-boat', 'briarwell-little-island-v1.webp'],
      ['briarwell-little-island-treasure', 'from-south', 'briarwell-little-island-treasure-v1.webp']
    ];
    for (const [areaId, spawnId, filename] of islandScenes) {
      await page.evaluate(([id, spawn]) => window.AvendorWalkTest.loadArea(id, spawn), [areaId, spawnId]);
      await waitForArea(page, areaId);
      const scene = await mountedScene(page);
      assert(scene.width === 1448 && scene.height === 1086, `Island mounted low-resolution art: ${areaId}`);
      assert(scene.background.endsWith(filename), `Island mounted the wrong background: ${areaId}`);
    }

    assert(failures.length === 0, failures.join('\n'));
    console.log('Ogre Cave gate, persistent loot and full-resolution island runtime checks passed.');
  } finally {
    await browser.close();
  }
}

if (skipBrowser) {
  console.log('Ogre Cave and lake-island browser runtime smoke check skipped.');
} else {
  runBrowser().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
