'use strict';

const fs = require('fs');
const path = require('path');

const avendorRoot = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(avendorRoot, 'hero-animation-lab.html'), 'utf8');
const css = fs.readFileSync(path.join(avendorRoot, 'css/hero-animation-lab.css'), 'utf8');
const source = fs.readFileSync(path.join(avendorRoot, 'js/hero-animation-lab.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(html.includes('id="hero-animation-canvas"'), 'Hero Animation Lab canvas is missing.');
assert(html.includes('id="lab-pose-strip"'), 'Hero Animation Lab timeline is missing.');
assert(html.includes('id="lab-play"'), 'Hero Animation Lab playback control is missing.');
assert(html.includes('id="lab-onion"'), 'Hero Animation Lab onion-skin control is missing.');
assert(html.includes('id="lab-sliders"'), 'Hero Animation Lab pose controls are missing.');
assert(html.includes('id="lab-output"'), 'Hero Animation Lab JSON export is missing.');
assert(html.includes('data-view-mode="body"'), 'Hero Animation Lab body-only preview is missing.');
assert(html.includes('data-view-mode="both"'), 'Hero Animation Lab combined body/rig preview is missing.');
assert(html.includes('data-view-mode="skeleton"'), 'Hero Animation Lab rig-only preview is missing.');
assert(html.includes('id="lab-body-opacity"'), 'Hero Animation Lab body opacity control is missing.');
assert(html.includes('id="lab-speed"'), 'Hero Animation Lab animation-speed slider is missing.');
assert(html.includes('js/hero-animation-lab.js'), 'Hero Animation Lab script is not loaded.');
assert(html.includes('css/hero-animation-lab.css'), 'Hero Animation Lab stylesheet is not loaded.');

assert(source.includes("const LAB_VERSION = '0.2.0'"), 'Hero Animation Lab 0.2 version contract is missing.');
assert(source.includes('const FRAME_W = 128'), 'Hero Animation Lab frame width drifted from the production sprite contract.');
assert(source.includes('const FRAME_H = 240'), 'Hero Animation Lab frame height drifted from the production sprite contract.');
assert(source.includes('const FLOOR_Y = 226'), 'Hero Animation Lab canonical foot-floor line is missing.');
assert(source.includes('const BASE_WALK_POSE_MS = 110'), 'Hero Animation Lab base walk cadence drifted from the production contract.');
assert(source.includes('const MEASUREMENTS = Object.freeze'), 'Hero proportions are not locked in a shared measurement object.');
assert(source.includes('const BODY_PALETTE = Object.freeze'), 'Hero Animation Lab body preview palette is missing.');
assert(source.includes("'idle',"), 'Canonical idle pose is missing.');
assert(source.includes("'walk1', 'walk2', 'walk3', 'walk4'"), 'First half of the eight-frame walk cycle is missing.');
assert(source.includes("'walk5', 'walk6', 'walk7', 'walk8'"), 'Second half of the eight-frame walk cycle is missing.');
assert(source.includes('buildSkeleton'), 'Hero Animation Lab has no shared skeleton builder.');
assert(source.includes('drawBody'), 'Hero Animation Lab has no rigged body preview renderer.');
assert(source.includes('drawRig'), 'Hero Animation Lab skeleton renderer is missing.');
assert(source.includes('previousPoseId'), 'Hero Animation Lab cannot onion-skin adjacent poses.');
assert(source.includes('setViewMode'), 'Hero Animation Lab cannot switch preview layers.');
assert(source.includes('syncBodyOpacity'), 'Hero Animation Lab cannot tune body preview opacity.');
assert(source.includes('syncPlaybackSpeed'), 'Hero Animation Lab cannot tune animation speed live.');
assert(source.includes('100 / speedPercent'), 'Hero Animation Lab speed slider does not alter pose duration.');
assert(source.includes('requestAnimationFrame(playbackTick)'), 'Hero Animation Lab playback is not browser-frame driven.');
assert(!source.includes('setInterval('), 'Hero Animation Lab must not add an unmanaged interval loop.');
assert(source.includes("direction: 'east'"), 'Hero Animation Lab 0.2 must remain scoped to the east profile experiment.');
assert(source.includes("body: 'male'"), 'Hero Animation Lab 0.2 must remain scoped to the canonical male experiment.');
assert(source.includes('measurements: { ...MEASUREMENTS }'), 'Hero Animation Lab export does not preserve locked proportions.');
assert(source.includes('speedPercent'), 'Hero Animation Lab export does not preserve preview speed.');
assert(source.includes('bodyOpacity'), 'Hero Animation Lab export does not preserve body preview opacity.');
assert(source.includes('poses'), 'Hero Animation Lab export does not include authored poses.');
assert(source.includes('navigator.clipboard.writeText'), 'Hero Animation Lab cannot copy pose JSON.');
assert(source.includes("['N', points.nearAnkle]"), 'Near-foot floor diagnostic is missing.');
assert(source.includes("['F', points.farAnkle]"), 'Far-foot floor diagnostic is missing.');

assert(css.includes('image-rendering: pixelated'), 'Hero Animation Lab preview is not pixel-art aware.');
assert(css.includes('.preview-toolbar'), 'Hero Animation Lab body/speed preview controls have no layout.');
assert(css.includes('.view-mode'), 'Hero Animation Lab preview-mode buttons have no layout.');
assert(css.includes('.compact-slider'), 'Hero Animation Lab compact speed/opacity sliders have no layout.');
assert(css.includes('.pose-strip button.selected'), 'Hero Animation Lab timeline has no selected-pose state.');
assert(css.includes('.measurement-card'), 'Locked proportion measurements have no visible presentation.');
assert(css.includes('.slider-row'), 'Pose controls have no editor layout.');

console.log('Hero Animation Lab 0.2 body-preview and variable-speed smoke checks passed.');
