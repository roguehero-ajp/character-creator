'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const avendorRoot = path.resolve(__dirname, '..');
const mapData = JSON.parse(fs.readFileSync(path.join(avendorRoot, 'data/maps/briarwell-west-road-junction.json'), 'utf8'));
const engineSource = fs.readFileSync(path.join(avendorRoot, 'js/map-engine.js'), 'utf8');
const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(engineSource, context);

const MapGeometry = context.window.AvendorMapEngine.MapGeometry;
const map = new MapGeometry(mapData);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const collisionIds = new Set(mapData.collisions.map((region) => region.id));
assert(collisionIds.has('north-boundary-fence-left-base'), 'West-junction left boundary fence collision is missing.');
assert(collisionIds.has('north-boundary-fence-right-base'), 'West-junction right boundary fence collision is missing.');

assert(!map.isWalkable(600, 355), 'Left boundary fence does not block at its visible base.');
assert(!map.isWalkable(840, 346), 'Right boundary fence does not block at its visible base.');
assert(map.isWalkable(720, 350), 'Town-boundary fence closes the Henson road opening.');
assert(map.isWalkable(720, 390), 'Henson-road approach is blocked below the town-boundary fence.');
assert(map.isWalkable(720, 300), 'Henson-road approach is blocked above the town-boundary fence.');
assert(!map.getTriggerAt({ x: 720, y: 350 }), 'Fence opening unexpectedly overlaps a transition trigger.');

console.log('West Road Junction boundary-fence contract checks passed.');
