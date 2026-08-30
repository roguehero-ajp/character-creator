'use strict';

const fs = require('fs');
const path = require('path');

const avendorRoot = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(avendorRoot, 'walk-test.html'), 'utf8');
const source = fs.readFileSync(path.join(avendorRoot, 'js/docks-house-lights.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(html.includes('js/docks-house-lights.js'), 'Walk test does not load traced Docks house lights.');
assert(source.includes("const AREA_ID = 'briarwell-docks'"), 'House light calibration is not scoped to Docks.');
assert(source.includes("center: Object.freeze([1111, 252])"), 'Upper house light drifted from the user-traced centre.');
assert(source.includes("bounds: Object.freeze({ x: 1090, y: 231, width: 41, height: 41 })"), 'Upper house light bounds drifted from the user trace.');
assert(source.includes("center: Object.freeze([1183, 385])"), 'Lower-right house light drifted from the user-traced centre.');
assert(source.includes("bounds: Object.freeze({ x: 1164, y: 362, width: 37, height: 46 })"), 'Lower-right house light bounds drifted from the user trace.');
assert(source.includes("center: Object.freeze([1039, 361])"), 'Lower-left house light drifted from the user-traced centre.');
assert(source.includes("bounds: Object.freeze({ x: 1018, y: 339, width: 42, height: 44 })"), 'Lower-left house light bounds drifted from the user trace.');
assert(source.includes('clipPathFor'), 'Traced house-light polygons are not used as clipping masks.');
assert(source.includes("legacyLights.slice(-3).forEach((light) => light.remove())"), 'The three guessed house lights are no longer explicitly replaced.');
assert(source.includes("light.className = 'dock-lantern-glow dock-house-light'"), 'Replacement house lights do not retain the approved Docks flicker styling.');
assert(source.includes('AUTHORED_HOUSE_LIGHTS.forEach'), 'All traced house-light zones are not mounted.');
assert(source.includes('MutationObserver'), 'House lights do not remount on Docks transitions.');
assert(!source.includes('setInterval('), 'House light calibration must not add an unmanaged interval.');
assert(!source.includes('requestAnimationFrame('), 'House light calibration must not add a competing animation frame loop.');

console.log('Docks user-traced house light calibration smoke checks passed.');
