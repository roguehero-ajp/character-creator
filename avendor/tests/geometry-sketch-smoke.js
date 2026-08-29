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
assert(html.includes('id="geometry-sketch-animation"'), 'Animation placement sketch tool is missing.');
assert(html.includes('id="geometry-sketch-animation-label"'), 'Animation placement label input is missing.');
assert(html.includes('id="geometry-sketch-copy"'), 'Geometry sketch export control is missing.');
assert(html.includes('4 animation'), 'Geometry sketch instructions do not expose the animation shortcut.');
assert(html.includes('js/geometry-sketch.js'), 'walk-test.html does not load the geometry sketch module.');
assert(html.includes('css/geometry-sketch.css'), 'walk-test.html does not load geometry sketch styles.');

assert(source.includes("kind = 'walkable'"), 'Geometry sketch does not default to walkable mode.');
assert(source.includes("nextKind === 'collision' || nextKind === 'occluder' || nextKind === 'animation'"),
  'Geometry sketch does not support all four polygon kinds.');
assert(source.includes('getDepthY'), 'Geometry sketch does not derive occluder depth from the traced base.');
assert(source.includes('getBounds'), 'Geometry sketch does not calculate animation bounds and centre.');
assert(source.includes("shape.kind === 'occluder'"), 'Geometry sketch does not serialise occluder shapes.');
assert(source.includes("shape.kind === 'animation'"), 'Geometry sketch does not serialise animation placement shapes.');
assert(source.includes('depthOccluders: occluders'), 'Geometry sketch JSON does not export depth occluders.');
assert(source.includes('animationZones'), 'Geometry sketch JSON does not export animation placement zones.');
assert(source.includes('bounds:'), 'Animation placement export is missing an exact bounding box.');
assert(source.includes('center: bounds.center'), 'Animation placement export is missing a centre point.');
assert(source.includes("key === '3'"), 'Geometry sketch does not provide the 3-key occluder shortcut.');
assert(source.includes("key === '4'"), 'Geometry sketch does not provide the 4-key animation shortcut.');
assert(source.includes('animationLabelInput'), 'Geometry sketch does not preserve animation intent labels.');
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
assert(css.includes('#geometry-sketch-animation.selected'), 'Animation placement tool has no distinct visual state.');
assert(css.includes('.geometry-sketch-animation-label'), 'Animation placement label has no styled editing state.');

console.log('Geometry sketch debugger walkable, blocked, occluder and animation-zone smoke checks passed.');
