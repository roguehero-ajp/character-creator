'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'hero-animation-lab.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'hero-animation-lab.css'), 'utf8');
const source = fs.readFileSync(path.join(root, 'js', 'hero-animation-lab.js'), 'utf8');
const drag = fs.readFileSync(path.join(root, 'js', 'hero-animation-lab-drag.js'), 'utf8');
const validation = fs.readFileSync(path.join(root, 'js', 'hero-animation-lab-validation.js'), 'utf8');
const candidate = JSON.parse(fs.readFileSync(path.join(root, 'data', 'hero-animation', 'male-east-west-candidate-0.2.json'), 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function count(sourceText, token) {
  return sourceText.split(token).length - 1;
}

assert(html.includes('Hero Animation Lab <span>0.5</span>'), 'Animation Lab page is not labelled 0.5.');
assert(html.includes('data-body-style="proxy"'), 'Proxy body style is missing.');
assert(html.includes('data-body-style="hero" class="selected" aria-pressed="true"'), 'Hero body style is not present and selected by default.');
assert(source.includes("let bodyStyle = 'hero'"), 'Hero is not the renderer default.');
assert(source.includes('function drawProxyBody('), 'Proxy renderer was not preserved.');
assert(source.includes('function drawHeroBody('), 'Hero Look renderer is missing.');
assert(source.includes("return bodyStyle === 'hero'"), 'Body-style renderer dispatch is missing.');
assert(source.includes('preview: {') && source.includes('bodyStyle,'), 'Body style is not preserved in exported preview metadata.');

const heroStart = source.indexOf('function drawHeroBody(');
const heroEnd = source.indexOf('function drawBody(', heroStart);
const heroRenderer = source.slice(heroStart, heroEnd);
assert(heroRenderer.includes('const points = buildSkeleton(pose);'), 'Hero renderer is not driven by the existing skeleton/joint data.');
assert(heroRenderer.indexOf("drawHeroLeg(points, 'far'") < heroRenderer.indexOf('drawHeroTorso(points, palette)'), 'Far leg must render before torso.');
assert(heroRenderer.indexOf("drawHeroArm(points, 'far'") < heroRenderer.indexOf('drawHeroHead(points, palette, ghost)'), 'Far arm must render before head/body.');
assert(heroRenderer.indexOf('drawHeroHead(points, palette, ghost)') < heroRenderer.indexOf("drawHeroLeg(points, 'near'"), 'Near leg must render after torso/head.');
assert(heroRenderer.indexOf('drawHeroHead(points, palette, ghost)') < heroRenderer.indexOf("drawHeroArm(points, 'near'"), 'Near arm must render after torso/head.');
assert(source.includes('East-facing profile with a brow, nose bridge, nose tip, mouth, chin and jaw.'), 'Hero profile-head renderer contract is missing.');
assert(source.includes("hair: '#4b3022'"), 'Hero brown-hair palette is missing.');
assert(source.includes('drawHeroTorso'), 'Hero tunic renderer is missing.');
assert(source.includes('drawHeroArm'), 'Hero articulated sleeve renderer is missing.');
assert(source.includes('drawHeroLeg'), 'Hero articulated trouser/boot renderer is missing.');

assert(html.includes('data-view-mode="body"'), 'Body-only preview was lost.');
assert(html.includes('data-view-mode="both"'), 'Body + Rig preview was lost.');
assert(html.includes('data-view-mode="skeleton"'), 'Rig-only preview was lost.');
assert(html.includes('data-validation-direction="east"'), 'East preview was lost.');
assert(html.includes('data-validation-direction="west"'), 'West mirror preview was lost.');
assert(html.includes('data-validation-direction="compare"'), 'East + West comparison was lost.');
assert(html.includes('id="lab-play"'), 'Play Walk control was lost.');
assert(html.includes('id="lab-test-transition"'), 'Idle → Walk → Idle test was lost.');
assert(html.includes('id="lab-test-seam"'), 'Walk 8 ↔ Walk 1 seam test was lost.');
assert(html.includes('id="lab-speed"'), 'Animation speed slider was lost.');
assert(html.includes('id="lab-body-opacity"'), 'Body opacity control was lost.');
assert(html.includes('id="hero-animation-handle-canvas"'), 'Draggable joint overlay was lost.');
assert(drag.includes("overlay.addEventListener('pointerdown'"), 'Draggable joint editing is no longer wired.');
assert(drag.includes("label: 'Head & Pelvis Control'"), 'Head & Pelvis control group was lost.');
assert(drag.includes("label: 'Arm Controls'"), 'Arm Controls group was lost.');
assert(drag.includes("label: 'Leg Controls'"), 'Leg Controls group was lost.');
assert(html.includes('id="lab-near-foot-card"') && html.includes('id="lab-far-foot-card"'), 'Foot-contact diagnostics were lost.');

assert(validation.includes("const VERSION = '0.5.0'"), 'Validation controller is not versioned 0.5.');
assert(validation.includes("male-east-west-candidate-0.2.json"), 'Validation does not load candidate 0.2 directly.');
assert(!validation.includes('male-east-west-candidate-0.1.json'), 'Validation still references candidate 0.1.');
assert(validation.includes('drawMirror'), 'West is no longer generated as a non-destructive east mirror.');
assert(validation.includes("if (mode === 'seam') return ['walk8', 'walk1'];"), 'Loop seam test no longer isolates Walk 8 ↔ Walk 1.');
assert(validation.includes("['idle', 'idle', 'walk1'"), 'Idle → Walk → Idle validation sequence is missing.');
assert(validation.includes('refreshFootDiagnostics'), 'Foot-contact diagnostics are no longer refreshed.');

assert(candidate.version === '0.2.0', 'Candidate 0.2 schema version drifted.');
assert(candidate.frameSize.width === 128 && candidate.frameSize.height === 240, 'Candidate frame size drifted from 128×240.');
assert(candidate.floorY === 226, 'Candidate floor Y drifted from 226.');
assert(candidate.baseWalkPoseMs === 110, 'Candidate base timing drifted from 110ms.');
assert(candidate.direction === 'east' && candidate.body === 'male', 'Candidate is no longer the male east-authored master.');
assert(candidate.poseOrder.length === 9 && candidate.poseOrder[0] === 'idle' && candidate.poseOrder[8] === 'walk8', 'Candidate no longer contains idle + 8 walk poses.');

const combined = [source, drag, validation].join('\n');
assert(!combined.includes('setInterval('), 'Animation Lab 0.5 must not add unmanaged setInterval loops.');
assert(!drag.includes('requestAnimationFrame('), 'Drag editor must not add a competing animation loop.');
assert(!validation.includes('requestAnimationFrame('), 'Validation controller must not add a competing animation loop.');
assert(count(source, 'requestAnimationFrame(') === 2, 'Core should contain only the initial and recursive calls for one playback animation loop.');
assert(count(source, 'requestAnimationFrame(playbackTick)') === 2, 'Core animation frame calls must both target the single playbackTick loop.');

assert(css.includes('.body-style'), 'Body-style selector has no layout styling.');
assert(css.includes('.preview-toolbar'), 'Preview toolbar styling was lost.');

console.log('Hero Animation Lab 0.5 Hero Look smoke checks passed.');
