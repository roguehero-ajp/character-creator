'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const avendorRoot = path.resolve(__dirname, '..');
const engineSource = fs.readFileSync(path.join(avendorRoot, 'js/map-engine.js'), 'utf8');
const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(engineSource, context);

const MapGeometry = context.window.AvendorMapEngine.MapGeometry;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function syntheticData(resolver) {
  return {
    referenceSize: { width: 200, height: 200 },
    movement: {
      resolver,
      footRadius: 1,
      footRadiusX: 1,
      footRadiusY: 1,
      maxStep: 100,
      slideAngles: [10, 20, 30, 40, 50, 60, 70, 80]
    },
    perspective: { stops: [] },
    walkable: [{ id: 'room', points: [[0,0],[200,0],[200,200],[0,200]] }],
    collisions: [{ id: 'corner', points: [[90,90],[135,90],[135,135],[90,135]] }],
    exits: [],
    portals: [],
    interactables: [],
    npcs: []
  };
}

const start = { x: 78, y: 78 };
const legacy = new MapGeometry(syntheticData('legacy-axis'));
const smooth = new MapGeometry(syntheticData('smooth-slide'));

const legacyResult = legacy.resolveMovement(start, 20, 20);
const smoothResult = smooth.resolveMovement(start, 20, 20);

assert(legacyResult.x > start.x && legacyResult.y === start.y,
  'Legacy resolver should fall back to a single axis at the synthetic corner.');
assert(smoothResult.x > start.x && smoothResult.y > start.y,
  'Smooth-slide resolver should preserve forward motion on both axes around the corner.');
assert(smooth.isWalkable(smoothResult.x, smoothResult.y),
  'Smooth-slide resolver produced a blocked position.');
assert(smooth.movementResolver === 'smooth-slide', 'Smooth resolver configuration was not retained.');
assert(smooth.footRadiusX === 1 && smooth.footRadiusY === 1,
  'Elliptical foot-radius configuration is not available to Movement Engine 0.6.');

console.log('Movement Engine 0.6 smooth-slide smoke checks passed.');
