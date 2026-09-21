'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

const page = read('world5-interlude.html');
const reader = read('world-interlude.js');
const boss = read('boss5.html');

assert.equal((page.match(/data-page=/g) || []).length, 2, 'World 5 has two comic pages');
assert.equal((page.match(/data-dot=/g) || []).length, 2, 'World 5 has two page controls');
assert(page.includes("'assets/world5-complete-page-1.webp?rev=0.18.3'"), 'Page 1 art is configured');
assert(page.includes("'assets/world5-complete-page-2.webp?rev=0.18.3'"), 'Page 2 art is configured');
assert(page.includes('href="infested1.html?build=0.18.3"'), 'Comic continues to World 6');
assert(page.includes('Continue to the Infested Zone'), 'Comic names the next region');
assert(page.includes('Show text transcript'), 'Comic has an accessible transcript control');
assert(page.includes('world-interlude.js?rev=0.18.3'), 'Comic loads the shared reader');
assert(page.includes('Holly Heatwave swoops in and throws thermobaric bombs'), 'Page 1 transcript introduces Holly');
assert(page.includes('Flyin’ with our new best friend!'), 'Page 2 transcript preserves Johnny’s dialogue');
assert(page.includes('You boys sure are strong!'), 'Page 2 transcript preserves Holly’s dialogue');

assert(boss.includes('href="world5-interlude.html?build=0.18.3"'), 'Boss 5 routes through the comic');
assert(boss.includes('VIEW WORLD 5 COMIC'), 'Boss 5 labels the comic route');
assert(!boss.includes('href="infested1.html?build=0.15.0">ENTER THE INFESTED ZONE'), 'Boss 5 no longer skips the comic');

for (const capability of ['pointerdown', 'pointerup', 'ArrowLeft', 'ArrowRight', "event.key === 'Home'", "event.key === 'End'", "event.key === 'Escape'"]) {
  assert(reader.includes(capability), `Reader capability: ${capability}`);
}

for (const file of ['assets/world5-complete-page-1.webp', 'assets/world5-complete-page-2.webp']) {
  const bytes = fs.readFileSync(path.join(ROOT, file));
  assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF', `${file}: RIFF header`);
  assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP', `${file}: WEBP signature`);
  assert(bytes.length > 250000, `${file}: production-resolution art`);
}

console.log('World 5 interlude contract passed.');
