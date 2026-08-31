'use strict';

const fs = require('fs');
const path = require('path');

const avendorRoot = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(avendorRoot, 'hero-animation-lab.html'), 'utf8');
const css = fs.readFileSync(path.join(avendorRoot, 'css', 'hero-animation-lab.css'), 'utf8');
const source = fs.readFileSync(path.join(avendorRoot, 'js', 'hero-animation-lab-drag.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(html.includes('Hero Animation Lab <span>0.5.2</span>'), 'Hero Animation Lab page was not advanced to 0.5.2.');
assert(html.includes('id="hero-animation-handle-canvas"'), 'Direct-manipulation handle canvas is missing.');
assert(html.includes('East master editing:'), 'Hero Animation Lab does not explain direct east-master joint dragging.');
assert(html.includes('js/hero-animation-lab-drag.js'), 'Direct-manipulation module is not loaded.');
assert(source.includes("const VERSION = '0.3.0'"), 'Hero Animation Lab drag module version contract is missing.');
assert(source.includes('const CONTROL_GROUPS = Object.freeze'), 'Grouped pose-control definition is missing.');
assert(source.includes("label: 'Head & Pelvis Control'"), 'Head and pelvis controls are not grouped.');
assert(source.includes("label: 'Arm Controls'"), 'Arm controls are not grouped.');
assert(source.includes("label: 'Leg Controls'"), 'Leg controls are not grouped.');
assert(source.includes('organizeControlGroups'), 'Pose controls are not reorganized into headings.');
assert(source.includes('buildSkeleton'), 'Drag editing does not reconstruct the locked skeleton.');
assert(source.includes('updatePoseFromHandle'), 'Direct joint manipulation cannot update pose controls.');
assert(source.includes('degreesFromDown'), 'Limb drag angle conversion is missing.');
assert(source.includes('degreesFromUp'), 'Torso drag angle conversion is missing.');
assert(source.includes('degreesFromRight'), 'Foot drag angle conversion is missing.');
assert(source.includes('setControl'), 'Joint dragging is not wired back into the existing precision sliders.');
assert(source.includes("overlay.addEventListener('pointerdown'"), 'Joint drag pointer-down handling is missing.');
assert(source.includes("overlay.addEventListener('pointermove'"), 'Joint drag pointer-move handling is missing.');
assert(source.includes("overlay.addEventListener('pointerup'"), 'Joint drag pointer-up handling is missing.');
assert(source.includes('setPointerCapture'), 'Joint dragging does not retain pointer capture.');
assert(source.includes('releasePointerCapture'), 'Joint dragging does not release pointer capture.');
assert(source.includes('MutationObserver'), 'Joint handles do not follow pose playback/timeline changes.');
assert(!source.includes('setInterval('), 'Joint editor must not add an unmanaged timer.');
assert(!source.includes('requestAnimationFrame('), 'Joint editor must not add a competing animation frame loop.');
assert(css.includes('#hero-animation-handle-canvas'), 'Drag-handle overlay has no canvas styling.');
assert(css.includes('touch-action: none'), 'Drag-handle canvas is not protected from touch scrolling.');
assert(css.includes('cursor: grab'), 'Drag-handle canvas does not communicate draggable joints.');
assert(css.includes('.pose-control-group'), 'Grouped pose-control sections have no layout.');
assert(css.includes('.pose-control-group h3'), 'Grouped pose-control headings have no styling.');

console.log('Hero Animation Lab 0.5.2 draggable-joint and grouped-control smoke checks passed.');
