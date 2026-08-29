'use strict';

const fs = require('fs');
const path = require('path');

const avendorRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(avendorRoot, 'js/environment-animation.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(source.includes('dock-boat-window'), 'Docks boat animation should use bounded crop windows.');
assert(source.includes('dock-water-window'), 'Docks water animation should use bounded shimmer windows.');
assert(!source.includes(".dock-boat-copy {\n        background-image"), 'Docks must not animate full-screen background copies for boats.');
assert(!source.includes(".dock-water-zone {\n        position: absolute;\n        inset: 0"), 'Docks must not animate full-screen water zones.');
assert(!source.includes('will-change: transform;'), 'Persistent will-change hints should not promote full-time compositor layers.');
assert(!source.includes('requestAnimationFrame('), 'Decorative Docks effects must not add another frame loop.');

console.log('Docks performance contract passed: animated effects stay spatially bounded.');
