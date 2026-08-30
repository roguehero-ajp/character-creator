'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'hero-animation-lab.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'hero-animation-lab-validation.css'), 'utf8');
const source = fs.readFileSync(path.join(root, 'js', 'hero-animation-lab-validation.js'), 'utf8');
const candidate = JSON.parse(fs.readFileSync(path.join(root, 'data', 'hero-animation', 'male-east-west-candidate-0.1.json'), 'utf8'));
const refinedSnapshot = JSON.parse(fs.readFileSync(path.join(root, 'data', 'hero-animation', 'male-east-west-candidate-0.2.json'), 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(html.includes('Hero Animation Lab <span>0.4</span>'), 'Animation Lab page is not labelled 0.4.');
assert(html.includes('hero-animation-lab-validation.css'), 'Animation Lab validation stylesheet is not loaded.');
assert(html.includes('hero-animation-lab-validation.js'), 'Animation Lab validation controller is not loaded.');
assert(html.includes('data-validation-direction="east"'), 'East validation mode is missing.');
assert(html.includes('data-validation-direction="west"'), 'West mirror validation mode is missing.');
assert(html.includes('data-validation-direction="compare"'), 'East/west comparison mode is missing.');
assert(html.includes('id="lab-test-transition"'), 'Idle-to-walk validation test is missing.');
assert(html.includes('id="lab-test-seam"'), 'Loop seam validation test is missing.');
assert(html.includes('id="lab-near-foot-card"') && html.includes('id="lab-far-foot-card"'), 'Foot contact diagnostic cards are missing.');
assert(source.includes("const VERSION = '0.4.0'"), 'Animation Lab validation controller version drifted.');
assert(source.includes("male-east-west-candidate-0.1.json"), '0.4 does not load the current saved east/west candidate.');
assert(source.includes("if (mode === 'seam') return ['walk8', 'walk1'];"), 'Loop seam test no longer isolates Walk 8 to Walk 1.');
assert(source.includes("['idle', 'idle', 'walk1'"), 'Idle-to-walk-to-idle sequence is missing.');
assert(source.includes('drawMirror'), 'West preview is not generated as a mirror of east.');
assert(source.includes('CONTACT_TOLERANCE = 3'), 'Foot contact tolerance drifted from the 3px validation threshold.');
assert(source.includes('refreshFootDiagnostics'), 'Foot contact diagnostics are not refreshed with pose changes.');
assert(source.includes('MutationObserver'), 'Validation previews do not follow the existing pose timeline.');
assert(!source.includes('setInterval('), 'Validation tests must not add unmanaged intervals.');
assert(!source.includes('requestAnimationFrame('), '0.4 should piggyback on the existing lab render loop rather than add another animation loop.');
assert(css.includes('.validation-compare-shell'), 'East/west comparison layout styles are missing.');
assert(css.includes('[data-contact="planted"]'), 'Planted-foot visual state is missing.');
assert(candidate.poses.idle.nearForearm === 16, '0.4 source candidate does not include the refined idle forearm.');
assert(candidate.poses.walk4.nearUpperArm === 10 && candidate.poses.walk4.nearForearm === 26, '0.4 source candidate does not include the refined Walk 4 near arm.');
assert(candidate.poses.walk4.farUpperArm === -6 && candidate.poses.walk4.farForearm === 9, '0.4 source candidate does not include the refined Walk 4 far arm.');
assert(JSON.stringify(candidate) === JSON.stringify(refinedSnapshot), 'Animation Lab current candidate and refined 0.2 snapshot no longer match.');

console.log('Hero Animation Lab 0.4 refined east/west candidate smoke checks passed.');
