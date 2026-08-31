'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'hero-animation-lab.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'js', 'hero-animation-lab-import.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(html.includes('id="lab-paste"'), 'Paste JSON button is missing.');
assert(html.includes('>Paste JSON</button>'), 'Paste JSON button label is missing.');
assert(html.includes('js/hero-animation-lab-import.js'), 'JSON import module is not loaded.');
assert(html.indexOf('id="lab-paste"') < html.indexOf('id="lab-copy"'), 'Paste JSON should sit beside and before Copy JSON.');
assert(html.includes('paste a JSON export from an earlier Animation Lab version'), 'Earlier-version JSON compatibility is not explained.');

assert(source.includes("const VERSION = '0.1.0'"), 'Import module version is missing.');
assert(source.includes('navigator.clipboard?.readText'), 'Clipboard paste support is missing.');
assert(source.includes("window.prompt('Paste Hero Animation Lab JSON here:')"), 'Clipboard permission fallback is missing.');
assert(source.includes('const sourcePoses = payload.poses'), 'Full Animation Lab export compatibility is missing.');
assert(source.includes("'idle',"), 'Idle pose import is missing.');
assert(source.includes("'walk8'"), 'Eight-frame walk import is missing.');
assert(source.includes("input.dispatchEvent(new Event('input', { bubbles: true }))"), 'Imported values are not routed through existing lab controls.');
assert(source.includes('lab.selectPose(poseId)'), 'Imported poses are not applied through the current lab.');
assert(source.includes("lab.selectPose('idle')"), 'Importer does not return to Idle after loading.');
assert(source.includes('validation?.stopValidation?.(false)'), 'Importer does not stop an active validation playback before loading poses.');
assert(source.includes('output.value = lab.exportJson()'), 'Output JSON is not refreshed after import.');
assert(source.includes('window.AvendorHeroAnimationLabImport'), 'Import helper API is not exposed for development testing.');

assert(!source.includes('assets/sprites/hero/body/male/idle.png'), 'Importer must not touch the production idle atlas.');
assert(!source.includes('assets/sprites/hero/body/male/walk.png'), 'Importer must not touch the production walk atlas.');
assert(!source.includes('requestAnimationFrame('), 'Importer must not add an animation loop.');
assert(!source.includes('setInterval('), 'Importer must not add an interval loop.');

console.log('Hero Animation Lab JSON paste smoke checks passed.');
