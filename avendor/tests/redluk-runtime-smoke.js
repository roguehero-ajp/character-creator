'use strict';

const skipBrowser = process.env.AVENDOR_SKIP_BROWSER === '1';
const { chromium } = skipBrowser ? {} : require('playwright');

const testUrl = process.env.AVENDOR_TEST_URL
  || 'http://127.0.0.1:4173/avendor/walk-test.html';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readMountedMap(page) {
  return page.evaluate(async () => {
    const walkTest = window.AvendorWalkTest;
    const art = document.querySelector('.stage-art');
    if (art.decode) await art.decode().catch(() => {});
    return {
      areaId: walkTest.getArea().id,
      mapId: walkTest.getMap().data.id,
      width: art.naturalWidth,
      height: art.naturalHeight,
      background: walkTest.getMap().data.art.background,
      cameraScroll: document.getElementById('walk-stage').dataset.cameraScroll,
      position: walkTest.getPosition()
    };
  });
}

async function runBrowser() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1448, height: 944 } });
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));

  try {
    await page.goto(`${testUrl}?area=briarwell-redluk`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => (
      window.AvendorWalkTest?.getArea?.()?.id === 'briarwell-redluk'
        && window.AvendorRedlukRuntime?.getState?.().rankCount === 8
    ));

    const redluk = await readMountedMap(page);
    assert(redluk.areaId === 'briarwell-redluk' && redluk.mapId === redluk.areaId, 'Redluk did not mount as the active map.');
    assert(redluk.width === 3072 && redluk.height === 944, 'Redluk mounted art at the wrong natural dimensions.');
    assert(redluk.background.endsWith('briarwell-redluk-v1.webp'), 'Redluk did not mount its canonical background.');
    assert(redluk.cameraScroll === 'true', 'Redluk did not enable the shared horizontal camera.');
    assert(redluk.position.x === 180 && redluk.position.y === 350, 'Redluk did not use its safe west arrival spawn.');

    const actorCount = await page.locator('.redluk-orc-placeholder').count();
    assert(actorCount === 9, 'Redluk did not mount eight rank placeholders and one elder placeholder.');

    await page.keyboard.down('d');
    await page.waitForFunction(() => window.AvendorRedlukRuntime.getState().triggered, null, { timeout: 8000 });
    await page.keyboard.up('d');
    await page.waitForFunction(() => document.getElementById('walk-stage').dataset.redlukEncounter === 'closing-in');
    const closing = await page.evaluate(() => ({
      runtime: window.AvendorRedlukRuntime.getState(),
      movingRanks: [...document.querySelectorAll('.redluk-orc-placeholder:not(.redluk-elder-placeholder)')]
        .filter((actor) => actor.dataset.moving === 'true').length
    }));
    assert(closing.runtime.movementLocked, 'The hero remained mobile during the Redluk convergence.');
    assert(closing.movingRanks === 8, 'Not every orc rank advances during the convergence beat.');
    await page.screenshot({ path: '/tmp/avendor-redluk-closing-in.png' });

    await page.waitForFunction(() => document.getElementById('walk-stage').dataset.redlukEncounter === 'stopped', null, { timeout: 7000 });
    const stopped = await page.evaluate(() => ({
      caption: document.querySelector('.redluk-encounter-caption').textContent,
      captionShown: document.querySelector('.redluk-encounter-caption').classList.contains('show'),
      movingRanks: [...document.querySelectorAll('.redluk-orc-placeholder:not(.redluk-elder-placeholder)')]
        .filter((actor) => actor.dataset.moving === 'true').length,
      elderOpacity: Number(document.querySelector('.redluk-elder-placeholder').style.opacity)
    }));
    assert(stopped.caption === 'Stop...' && stopped.captionShown, 'The quiet Stop caption did not appear on its authored beat.');
    assert(stopped.movingRanks === 0, 'The orc ranks did not halt on the Stop beat.');
    assert(stopped.elderOpacity === 0, 'The elder orc entered before ordering the ranks to stop.');
    await page.screenshot({ path: '/tmp/avendor-redluk-stop.png' });

    await page.waitForFunction(() => document.getElementById('walk-stage').dataset.redlukEncounter === 'elder-entering', null, { timeout: 3000 });
    await page.waitForFunction(() => Number(document.querySelector('.redluk-elder-placeholder').style.opacity) > 0.2, null, { timeout: 3000 });
    await page.screenshot({ path: '/tmp/avendor-redluk-elder-entry.png' });

    await page.waitForFunction(() => window.AvendorRedlukRuntime.getState().complete, null, { timeout: 5000 });
    const completed = await page.evaluate(() => ({
      runtime: window.AvendorRedlukRuntime.getState(),
      movementLocked: window.AvendorWalkTest.isMovementLocked(),
      elderOpacity: Number(document.querySelector('.redluk-elder-placeholder').style.opacity)
    }));
    assert(!completed.runtime.movementLocked && !completed.movementLocked, 'Redluk did not release the hero after the scaffold completed.');
    assert(completed.elderOpacity === 1, 'The elder orc did not settle into the completed tableau.');

    await page.evaluate(() => window.AvendorWalkTest.loadArea('briarwell-mountain-m15', 'from-east'));
    await page.waitForFunction(() => document.getElementById('walk-stage').dataset.areaId === 'briarwell-mountain-m15');
    const m15 = await readMountedMap(page);
    assert(m15.width === 2048 && m15.height === 944, 'M15 mounted art at the wrong natural dimensions.');
    assert(m15.background.endsWith('briarwell-mountain-m15-v1.webp'), 'M15 did not mount its canonical background.');
    assert(m15.position.x === 1838 && m15.position.y === 470, 'M15 did not use its safe east arrival spawn.');

    await page.evaluate(() => window.AvendorWalkTest.loadArea('briarwell-mountain-m14', 'from-east'));
    await page.waitForFunction(() => document.getElementById('walk-stage').dataset.areaId === 'briarwell-mountain-m14');
    const m14 = await readMountedMap(page);
    assert(m14.width === 1448 && m14.height === 1086, 'M14 v2 mounted art at the wrong natural dimensions.');
    assert(m14.background.endsWith('briarwell-mountain-m14-v2.webp'), 'M14 did not mount its revised eastbound background.');
    assert(m14.position.x === 1260 && m14.position.y === 540, 'M14 did not use its safe east arrival spawn.');

    assert(failures.length === 0, failures.join('\n'));
    console.log('M14 v2, M15 and Redluk browser runtime smoke checks passed.');
  } finally {
    await browser.close();
  }
}

if (skipBrowser) {
  console.log('M14 v2, M15 and Redluk browser runtime smoke check skipped.');
} else {
  runBrowser().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
