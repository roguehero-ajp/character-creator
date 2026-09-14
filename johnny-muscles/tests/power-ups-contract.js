'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

const htmlFiles = fs.readdirSync(ROOT).filter(file => file.endsWith('.html'));
const gamePages = htmlFiles.filter(file => read(file).includes('canvas id="game"'));

assert(gamePages.length >= 41, `Expected at least 41 playable pages, found ${gamePages.length}`);
for (const file of [...gamePages, 'index.html']) {
  const source = read(file);
  assert.equal((source.match(/power-ups\.css\?rev=0\.17\.0/g) || []).length, 1, `${file}: power-up CSS`);
  assert.equal((source.match(/power-ups\.js\?rev=0\.17\.0/g) || []).length, 1, `${file}: power-up runtime`);
  if (file !== 'index.html') {
    assert(source.indexOf('power-ups.js') < source.indexOf('touch-grab.js'), `${file}: power-ups must load before game scripts`);
  }
}

const startingStateEngines = [
  'game.js', 'city2.js', 'city3.js', 'city4.js', 'city5.js', 'suburb.js', 'hills.js',
  'mountains-core.js', 'badlands.js', 'infested.js', 'mothership.js', 'boss1.js',
  'rick-boss1.js', 'boss2.js', 'boss3.js', 'boss4.js', 'boss5.js', 'boss6.js', 'boss7.js'
];

const damageEngines = [...startingStateEngines];
const throwEngines = [
  'game.js', 'city2.js', 'city3.js', 'city4.js', 'city5.js', 'suburb.js', 'hills.js',
  'mountains-combat.js', 'badlands.js', 'infested.js', 'mothership.js', 'boss1.js',
  'rick-boss1.js', 'boss2.js', 'boss3.js', 'boss4.js', 'boss5.js', 'boss6.js', 'boss7.js'
];

for (const file of startingStateEngines) {
  const integrations = (read(file).match(/getStartingState/g) || []).length;
  assert(integrations >= 4, `${file}: starting boosts are not integrated into initialization and resets`);
}

for (const file of damageEngines) {
  const source = read(file);
  assert(source.includes('takeDamage'), `${file}: shield interception is not integrated`);
  assert(!/(?:this\.)?health\s*(?:--|-=)/.test(source), `${file}: unguarded defense damage remains`);
}

for (const file of throwEngines) {
  assert(read(file).includes('getThrowMultiplier'), `${file}: throw boost is not integrated`);
}

for (const file of ['campaign-shared.js', 'enemy-runtime.js', 'mountains-render.js', 'boss3-fix.js', 'boss5-fix.js']) {
  assert(read(file).includes('getThrowMultiplier'), `${file}: boosted trajectory preview is not integrated`);
}

const runtime = read('power-ups.js');
for (const id of ['kevlar-tank-top', 'backup-juice', 'flex-capacitor', 'tank-rocket-wax']) {
  assert(runtime.includes(`id: '${id}'`), `Missing catalog item: ${id}`);
}
assert(runtime.includes("window.JM_MONETIZATION_MODE === 'live'"), 'Explicit live monetization mode is required');
assert(runtime.includes('No money changes hands'), 'Prototype purchase disclosure is required');
assert(runtime.includes("result?.rewarded !== true"), 'Rewarded ads must confirm completion');
assert(runtime.includes("result?.purchased !== true"), 'Purchases must confirm completion');
assert(!read('mountains-render.js').includes('demo dose'), 'Mountain steroid copy must use production-neutral dose labels');

const changedJavaScript = new Set([
  ...startingStateEngines,
  ...throwEngines,
  'campaign-shared.js', 'enemy-runtime.js', 'mountains-render.js', 'boss3-fix.js', 'boss5-fix.js', 'power-ups.js'
]);
for (const file of changedJavaScript) {
  assert(!read(file).includes('this.('), `${file}: malformed member expression`);
}

console.log(`Power-up contract passed across ${gamePages.length} playable pages and ${startingStateEngines.length} engines.`);
