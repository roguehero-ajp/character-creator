'use strict';

const fs = require('fs');
const path = require('path');

const avendorRoot = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(avendorRoot, 'walk-test.html'), 'utf8');
const css = fs.readFileSync(path.join(avendorRoot, 'css/geometry-sketch.css'), 'utf8');
const source = fs.readFileSync(path.join(avendorRoot, 'js/geometry-sketch.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(html.includes('id="geometry-sketch-layer"'), 'Geometry sketch canvas is missing from walk-test.html.');
assert(html.includes('id="geometry-sketch-toggle"'), 'Geometry sketch toggle is missing.');
assert(html.includes('id="geometry-sketch-walkable"'), 'Walkable sketch tool is missing.');
assert(html.includes('id="geometry-sketch-blocked"'), 'Blocked sketch tool is missing.');
assert(html.includes('id="geometry-sketch-occluder"'), 'Occluder sketch tool is missing.');
assert(html.includes('id="geometry-sketch-copy"'), 'Geometry sketch export control is missing.');
assert(html.includes('3 occluder'), 'Geometry sketch instructions do not expose the occluder shortcut.');
assert(html.includes('js/geometry-sketch.js'), 'walk-test.html does not load the geometry sketch module.');
assert(html.includes('css/geometry-sketch.css'), 'walk-test.html does not load geometry sketch styles.');

assert(source.includes("kind = 'walkable'"), 'Geometry sketch does not default to walkable mode.');
assert(source.includes("nextKind === 'collision' || nextKind === 'occluder'"),
  'Geometry sketch does not support occluder polygons.');
assert(source.includes('getDepthY'), 'Geometry sketch does not derive occluder depth from the traced base.');
assert(source.includes("shape.kind === 'occluder'"), 'Geometry sketch does not serialise occluder shapes.');
assert(source.includes('depthOccluders: occluders'), 'Geometry sketch JSON does not export depth occluders.');
assert(source.includes("key === '3'"), 'Geometry sketch does not provide the 3-key occluder shortcut.');
assert(source.includes('mapPointFromEvent'), 'Geometry sketch does not convert pointer locations into map coordinates.');
assert(source.includes('closeShape'), 'Geometry sketch cannot close/store polygons.');
assert(source.includes('undoPoint'), 'Geometry sketch cannot undo vertices.');
assert(source.includes('navigator.clipboard.writeText'), 'Geometry sketch cannot copy JSON output.');
assert(source.includes("areaId: map.data.id"), 'Geometry sketch export does not identify the current map.');
assert(source.includes("walkTest.setDebug(true)"), 'Geometry sketch does not automatically expose authored map geometry.');
assert(source.includes("window.dispatchEvent(new Event('blur'))"), 'Geometry sketch does not clear active movement input when editing begins.');
assert(source.includes("event.stopImmediatePropagation()"), 'Geometry sketch does not suspend hero movement keys while tracing.');
assert(!source.includes('setInterval('), 'Geometry sketch should not introduce an unmanaged timer loop.');

assert(css.includes('.geometry-sketch-layer.show'), 'Geometry sketch canvas has no active display state.');
assert(css.includes('#geometry-sketch-walkable.selected'), 'Walkable tool has no distinct visual state.');
assert(css.includes('#geometry-sketch-blocked.selected'), 'Blocked tool has no distinct visual state.');
assert(css.includes('#geometry-sketch-occluder.selected'), 'Occluder tool has no distinct visual state.');

console.log('Geometry sketch debugger walkable, blocked and occluder smoke checks passed.');
