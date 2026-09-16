'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

const page = read('world4-interlude.html');
const reader = read('world-interlude.js');
const boss = read('boss4.html');

assert.equal((page.match(/data-page=/g) || []).length, 2, 'World 4 has two comic pages');
assert.equal((page.match(/data-dot=/g) || []).length, 2, 'World 4 has two page controls');
assert(page.includes("'assets/world4-complete-page-1.webp?rev=0.18.2'"), 'Page 1 art is configured');
assert(page.includes("'assets/world4-complete-page-2.webp?rev=0.18.2'"), 'Page 2 art is configured');
assert(page.includes('href="badlands1.html?build=0.18.2"'), 'Comic continues to World 5');
assert(page.includes('Show text transcript'), 'Comic has an accessible transcript control');
assert(page.includes('world-interlude.js?rev=0.18.2'), 'Comic loads the shared reader');

assert(boss.includes('href="world4-interlude.html?build=0.18.2"'), 'Boss 4 routes through the comic');
assert(boss.includes('VIEW WORLD 4 COMIC'), 'Boss 4 labels the comic route');
assert(!boss.includes('href="badlands1.html?build=0.14.0">ENTER WORLD 5'), 'Boss 4 no longer skips the comic');

assert(reader.includes("typeof source === 'string'"), 'Shared reader accepts direct art assets');
assert(reader.includes('Array.isArray(source)'), 'Shared reader retains chunked art compatibility');
for (const capability of ['pointerdown', 'pointerup', 'ArrowLeft', 'ArrowRight', "event.key === 'Home'", "event.key === 'End'", "event.key === 'Escape'"]) {
  assert(reader.includes(capability), `Reader capability: ${capability}`);
}

for (const file of ['assets/world4-complete-page-1.webp', 'assets/world4-complete-page-2.webp']) {
  const bytes = fs.readFileSync(path.join(ROOT, file));
  assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF', `${file}: RIFF header`);
  assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP', `${file}: WEBP signature`);
  assert(bytes.length > 250000, `${file}: production-resolution art`);
}

console.log('World 4 interlude contract passed.');
