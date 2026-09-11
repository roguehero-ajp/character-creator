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

async function runBrowser() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1448, height: 1086 } });
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));

  try {
    await page.goto(`${testUrl}?area=briarwell-dwarven-cave-cliffside`, { waitUntil: 'networkidle' });
    await waitForArea(page, 'briarwell-dwarven-cave-cliffside');
    await page.evaluate(() => localStorage.removeItem('avendorDwarvenCaveTreasure.v1'));

    const cliffside = await page.evaluate(() => ({
      position: window.AvendorWalkTest.getPosition(),
      background: window.AvendorWalkTest.getMap().data.art.background,
      vista: window.AvendorWalkTest.getMap().data.scenicView
    }));
    assert(cliffside.position.x === 360 && cliffside.position.y === 430, 'The cliffside did not use its safe cave-arrival spawn.');
    assert(cliffside.background.endsWith('briarwell-dwarven-cave-cliffside-v1.webp'), 'The playable cliff shelf mounted the wrong artwork.');
    assert(cliffside.vista.image.endsWith('briarwell-dwarven-cave-cliffside-vista-v1.webp'), 'The cliff shelf names the wrong scenic vista.');

    await page.keyboard.down('d');
    await page.waitForFunction(() => document.getElementById('walk-stage').dataset.dwarvenScenicView === 'open', null, { timeout: 7000 });
    await page.keyboard.up('d');
    await page.waitForFunction(() => document.querySelector('.dwarven-scenic-view.show'));
    const openedVista = await page.evaluate(async () => {
      const overlay = document.querySelector('.dwarven-scenic-view');
      const image = overlay.querySelector('img');
      if (image.decode) await image.decode().catch(() => {});
      return {
        locked: window.AvendorWalkTest.isMovementLocked(),
        open: window.AvendorDwarvenCaveRuntime.getState().scenicOpen,
        width: image.naturalWidth,
        height: image.naturalHeight,
        alt: image.alt,
        caption: overlay.querySelector('.dwarven-scenic-caption').textContent
      };
    });
    assert(openedVista.locked && openedVista.open, 'The cliff vista did not lock movement while replacing the play view.');
    assert(openedVista.width === 2048 && openedVista.height === 1152, 'The cliff vista mounted at the wrong natural dimensions.');
    assert(openedVista.alt.includes('Briarwell on the left') && openedVista.alt.includes('exactly two islands'), 'The mounted panorama lost the approved mirrored Briarwell composition.');
    assert(openedVista.caption.includes('Briarwell'), 'The scenic view did not expose its caption.');

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.AvendorDwarvenCaveRuntime.getState().scenicOpen);
    assert(!await page.evaluate(() => window.AvendorWalkTest.isMovementLocked()), 'Closing the cliff vista did not release movement.');

    await page.evaluate(() => window.AvendorWalkTest.loadArea('briarwell-dwarven-cave-battle-chamber', 'from-west'));
    await waitForArea(page, 'briarwell-dwarven-cave-battle-chamber');
    await page.waitForFunction(() => window.AvendorDwarvenCaveRuntime.getState().actorCount === 8);
    const battle = await page.evaluate(async () => {
      const art = document.querySelector('.stage-art');
      if (art.decode) await art.decode().catch(() => {});
      return {
        width: art.naturalWidth,
        height: art.naturalHeight,
        cameraScroll: document.getElementById('walk-stage').dataset.cameraScroll,
        actorCount: document.querySelectorAll('.dwarven-goblin-placeholder').length,
        variants: [...document.querySelectorAll('.dwarven-goblin-placeholder')]
          .map((actor) => actor.dataset.variant)
      };
    });
    assert(battle.width === 3072 && battle.height === 1024, 'The battle chamber mounted at the wrong natural dimensions.');
    assert(battle.cameraScroll === 'true', 'The battle chamber did not enable the shared horizontal camera.');
    assert(
      battle.actorCount === 8
        && battle.variants.filter((variant) => variant === 'goblin').length === 5
        && battle.variants.filter((variant) => variant === 'hobgoblin').length === 2
        && battle.variants.filter((variant) => variant === 'chieftain').length === 1,
      'The battle chamber did not mount the approved eight-enemy placeholder force.'
    );

    await page.evaluate(() => window.AvendorWalkTest.loadArea('briarwell-dwarven-cave-secret', 'from-west'));
    await waitForArea(page, 'briarwell-dwarven-cave-secret');
    assert(await page.locator('.dwarven-goblin-placeholder').count() === 0, 'Battle placeholders survived outside the goblin chamber.');
    await page.keyboard.down('d');
    await page.waitForTimeout(1100);
    await page.keyboard.up('d');
    await page.keyboard.press('e');
    await page.waitForFunction(() => document.getElementById('walk-stage').dataset.dwarvenTreasure === 'opened');
    const firstTreasure = await page.evaluate(() => ({
      state: window.AvendorDwarvenCaveRuntime.getState().treasure,
      notice: document.getElementById('walk-help').textContent
    }));
    assert(Number.isInteger(firstTreasure.state.loot.silver) && firstTreasure.state.loot.silver >= 1 && firstTreasure.state.loot.silver <= 100, 'The chest made an invalid silver roll.');
    assert(Number.isInteger(firstTreasure.state.loot.gold) && firstTreasure.state.loot.gold >= 1 && firstTreasure.state.loot.gold <= 100, 'The chest made an invalid gold roll.');
    assert(firstTreasure.notice.includes('silver pieces') && firstTreasure.notice.includes('gold pieces'), 'Opening the chest did not report both coin rolls.');

    await page.keyboard.press('e');
    const secondTreasure = await page.evaluate(() => window.AvendorDwarvenCaveRuntime.getState().treasure);
    assert(JSON.stringify(secondTreasure) === JSON.stringify(firstTreasure.state), 'Reopening the chest rerolled its persistent treasure.');

    assert(failures.length === 0, failures.join('\n'));
    console.log('Dwarven Cave cliff vista, battle staging and persistent treasure browser checks passed.');
  } finally {
    await browser.close();
  }
}

if (skipBrowser) {
  console.log('Dwarven Cave browser runtime smoke check skipped.');
} else {
  runBrowser().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
