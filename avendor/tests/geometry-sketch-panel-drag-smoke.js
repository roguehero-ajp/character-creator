'use strict';

const fs = require('fs');
const path = require('path');

const avendorRoot = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(avendorRoot, 'walk-test.html'), 'utf8');
const css = fs.readFileSync(path.join(avendorRoot, 'css/geometry-sketch-panel-drag.css'), 'utf8');
const source = fs.readFileSync(path.join(avendorRoot, 'js/geometry-sketch-panel-drag.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(html.includes('css/geometry-sketch-panel-drag.css'), 'Geometry sketch draggable-panel stylesheet is not loaded.');
assert(html.includes('js/geometry-sketch-panel-drag.js'), 'Geometry sketch draggable-panel script is not loaded.');
assert(source.includes("const STORAGE_KEY = 'avendorGeometrySketchPanelPosition'"), 'Geometry sketch panel position is not session-persisted.');
assert(source.includes("handle.addEventListener('pointerdown'"), 'Geometry sketch panel pointer-down drag handling is missing.');
assert(source.includes("handle.addEventListener('pointermove'"), 'Geometry sketch panel pointer-move drag handling is missing.');
assert(source.includes("handle.addEventListener('pointerup'"), 'Geometry sketch panel pointer-up drag handling is missing.');
assert(source.includes('setPointerCapture'), 'Geometry sketch panel does not retain pointer capture while dragging.');
assert(source.includes('releasePointerCapture'), 'Geometry sketch panel does not release pointer capture after dragging.');
assert(source.includes('clampPosition'), 'Geometry sketch panel is not constrained to the map stage.');
assert(source.includes("handle.addEventListener('dblclick'"), 'Geometry sketch panel has no double-click reset.');
assert(source.includes('MutationObserver'), 'Geometry sketch panel does not restore its position when reopened.');
assert(!source.includes('setInterval('), 'Geometry sketch panel drag must not add an unmanaged interval.');
assert(!source.includes('requestAnimationFrame(') || source.includes('requestAnimationFrame(restoreSavedPosition)'), 'Unexpected animation loop found in geometry panel drag module.');
assert(css.includes('cursor: grab'), 'Geometry sketch heading does not advertise dragging.');
assert(css.includes('cursor: grabbing'), 'Geometry sketch heading does not show active dragging.');
assert(css.includes('touch-action: none'), 'Geometry sketch heading is not protected from touch scrolling while dragging.');

console.log('Geometry sketch draggable-panel smoke checks passed.');
