'use strict';

const fs = require('fs');
const path = require('path');

const avendorRoot = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(avendorRoot, 'walk-test.html'), 'utf8');
const source = fs.readFileSync(path.join(avendorRoot, 'js/environment-animation.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(html.includes('js/environment-animation.js'), 'Walk test does not load the native environment animation layer.');
assert(source.includes("briarwell-northwest-workshops"), 'Northwest Workshops has no native animation registration.');
assert(source.includes("briarwell-west-road-junction"), 'West Road Junction has no boundary-overlay registration.');
assert(source.includes("briarwell-docks"), 'Briarwell Docks has no native environment registration.');
assert(source.includes('MutationObserver'), 'Environment animation does not react to map-area changes.');
assert(source.includes(".environment-animation-layer, .boundary-overlay-layer, .dock-boat-window"), 'Environment layers are not fully cleaned up on transition.');
assert(source.includes('prefers-reduced-motion'), 'Native animation layer does not respect reduced-motion preference.');
assert(source.includes('forge-glow'), 'Forge glow effect is missing.');
assert(source.includes('forge-core'), 'Forge fire core effect is missing.');
assert(source.includes('forge-ember'), 'Forge ember effect is missing.');
assert(source.includes('forge-smoke'), 'Forge smoke effect is missing.');
assert(source.includes("addParticle(layer, 'forge-glow', 414, 431"), 'Forge glow is no longer calibrated to the painted hearth.');
assert(source.includes('[data-daypart="night"]'), 'Environment animation is not daypart-aware.');
assert(!source.includes('mountNorthBoundary'), 'Northwest Workshops still mounts the temporary north-boundary overlay.');
assert(source.includes('mountWestJunctionFence'), 'West Road Junction fence overlay is missing.');
assert(source.includes('mountDocks'), 'Docks environment mount is missing.');
assert(source.includes('dock-water-window'), 'Docks bounded moving-water effect is missing.');
assert(source.includes('dock-water-ripple'), 'Docks waterline ripple effect is missing.');
assert(source.includes('dock-boat-window'), 'Docks bounded boat float layer is missing.');
assert(source.includes('dock-lantern-glow'), 'Docks lantern glow effect is missing.');
assert(source.includes('dock-smoke'), 'Docks chimney smoke effect is missing.');
assert(source.includes('dock-mist'), 'Docks cold-air mist effect is missing.');
assert(source.includes("mountDockBoatWindow(stage, 'central')"), 'Central fishing boat float window is missing.');
assert(source.includes("mountDockBoatWindow(stage, 'west')"), 'West moored boat float window is missing.');
assert(!source.includes('setInterval('), 'Environment animation should rely on browser animation timing, not unmanaged intervals.');
assert(!source.includes('requestAnimationFrame('), 'Environment animation should not add a competing frame loop for decorative CSS effects.');

console.log('Native environment animation smoke checks passed.');
