'use strict';

const fs = require('fs');
const path = require('path');

const avendorRoot = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(avendorRoot, 'walk-test.html'), 'utf8');
const source = fs.readFileSync(path.join(avendorRoot, 'js/environment-animation.js'), 'utf8');
const ambientLife = fs.readFileSync(path.join(avendorRoot, 'js/docks-ambient-life.js'), 'utf8');
const tuning = fs.readFileSync(path.join(avendorRoot, 'css/environment-animation-tuning.css'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(html.includes('js/environment-animation.js'), 'Walk test does not load the native environment animation layer.');
assert(html.includes('js/docks-ambient-life.js'), 'Walk test does not load Docks ambient bird life.');
assert(html.includes('css/environment-animation-tuning.css'), 'Walk test does not load environment animation tuning.');
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
assert(source.includes('[310, 275, 82, 82'), 'West harbor lamp glow is no longer calibrated to the painted lamp.');
assert(source.includes('[625, 290, 76, 78'), 'Central harbor lamp glow is no longer calibrated to the painted lamp.');
assert(source.includes('[1284, 66, 88, 64'), 'Foreground fishery chimney smoke is no longer calibrated above the chimney cap.');
assert(source.includes('--dock-smoke-peak: .54;'), 'Base Docks chimney smoke visibility has drifted below the calibrated level.');
assert(source.includes('--dock-smoke-peak: .62;'), 'Dawn Docks chimney smoke visibility has drifted below the calibrated level.');
assert(source.includes("mountDockBoatWindow(stage, 'central')"), 'Central fishing boat float window is missing.');
assert(source.includes("mountDockBoatWindow(stage, 'west')"), 'West moored boat float window is missing.');

assert(tuning.includes('z-index: 930 !important'), 'Decorative Docks boat copies can rise into hero depth again.');
assert(tuning.includes('.dock-boat-window[data-boat="central"]'), 'Central boat hull mask tuning is missing.');
assert(tuning.includes('.dock-boat-window[data-boat="west"]'), 'West boat hull mask tuning is missing.');
assert(tuning.includes('93.5% 35%'), 'Central boat mask drifted back toward the dock edge.');
assert(tuning.includes('92% 29%'), 'West boat mask drifted back toward the dock edge.');
assert(tuning.includes('animation-duration: 4.1s !important'), 'Central boat bobbing is no longer using the quicker approved cadence.');
assert(tuning.includes('animation-duration: 4.7s !important'), 'West boat bobbing is no longer using the quicker approved cadence.');
assert(tuning.includes('@keyframes avendor-lantern-flicker'), 'Docks lantern flame flicker tuning is missing.');
assert(tuning.includes('brightness(1.18)'), 'Docks lantern flicker no longer has a visible warm flare.');
assert(tuning.includes('.dock-bird-layer'), 'Docks bird layer styles are missing.');
assert(tuning.includes('z-index: 920'), 'Docks birds can rise into hero/occluder depth.');
assert(tuning.includes('.dock-bird-a') && tuning.includes('.dock-bird-b'), 'Docks does not style both ambient birds.');
assert(tuning.includes('@media (prefers-reduced-motion: reduce)'), 'Docks ambience tuning does not respect reduced motion.');

assert(ambientLife.includes("const AREA_ID = 'briarwell-docks'"), 'Ambient birds are not scoped to Docks.');
assert(ambientLife.includes("createBird('dock-bird-a'"), 'Primary Docks bird is missing.');
assert(ambientLife.includes("createBird('dock-bird-b'"), 'Secondary Docks bird is missing.');
assert(ambientLife.includes('MutationObserver'), 'Docks bird life does not react to area transitions.');
assert(ambientLife.includes("setAttribute('aria-hidden', 'true')"), 'Docks birds are not marked decorative.');
assert(!ambientLife.includes('setInterval('), 'Docks birds should rely on CSS animation, not unmanaged timers.');
assert(!ambientLife.includes('requestAnimationFrame('), 'Docks birds should not add a competing animation frame loop.');
assert(!source.includes('setInterval('), 'Environment animation should rely on browser animation timing, not unmanaged intervals.');
assert(!source.includes('requestAnimationFrame('), 'Environment animation should not add a competing frame loop for decorative CSS effects.');

console.log('Native environment animation, Docks bobbing, lantern flicker and bird ambience smoke checks passed.');
