'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'hero-animation-lab.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'hero-animation-lab.css'), 'utf8');
const source = fs.readFileSync(path.join(root, 'js', 'hero-animation-lab.js'), 'utf8');
const drag = fs.readFileSync(path.join(root, 'js', 'hero-animation-lab-drag.js'), 'utf8');
const validation = fs.readFileSync(path.join(root, 'js', 'hero-animation-lab-validation.js'), 'utf8');
const canonical = fs.readFileSync(path.join(root, 'js', 'hero-animation-lab-candidate-0.3.js'), 'utf8');
const gender = fs.readFileSync(path.join(root, 'js', 'hero-animation-lab-gender.js'), 'utf8');
const candidate = JSON.parse(fs.readFileSync(path.join(root, 'data', 'hero-animation', 'male-east-west-candidate-0.3.json'), 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function count(sourceText, token) {
  return sourceText.split(token).length - 1;
}

assert(html.includes('Hero Animation Lab <span>0.5.2</span>'), 'Animation Lab page is not labelled 0.5.2.');
assert(html.includes('approved candidate 0.3'), 'Candidate 0.3 is not described as the approved baseline.');
assert(html.includes('data-hero-gender="male" class="selected"'), 'Male Hero body is not the default.');
assert(html.includes('data-hero-gender="female"'), 'Female Hero body toggle is missing.');
assert(html.includes('>Male</button>') && html.includes('>Female</button>'), 'Male / Female labels are missing.');
assert(html.includes('value="105"'), 'Approved 105% preview speed is not the initial lab value.');
assert(html.includes('js/hero-animation-lab-candidate-0.3.js'), 'Candidate 0.3 controller is not loaded.');
assert(html.includes('js/hero-animation-lab-gender.js'), 'Gender comparison renderer is not loaded.');

assert(source.includes("const UI_VERSION = '0.5.1'"), '0.5.1 core Hero renderer unexpectedly changed; 0.5.2 should layer comparison tooling around it.');
assert(source.includes("let bodyStyle = 'hero'"), 'Hero is not the renderer default.');
assert(source.includes('function drawProxyBody('), 'Proxy renderer was not preserved.');
assert(source.includes('function drawHeroBody('), 'Male Hero renderer is missing.');
assert(source.includes("return bodyStyle === 'hero'"), 'Body-style renderer dispatch is missing.');
assert(source.includes('function drawRoundedSegment('), 'Rounded male articulated segment renderer is missing.');
assert(source.includes('function drawHeroTorso('), 'Male Hero torso renderer is missing.');
assert(source.includes('function drawHeroHead('), 'Male Hero profile head renderer is missing.');

assert(canonical.includes("const CANDIDATE_URL = 'data/hero-animation/male-east-west-candidate-0.3.json'"), 'Candidate controller does not target 0.3.');
assert(canonical.includes('applyCandidateAll'), 'Candidate 0.3 cannot be restored as the reset baseline.');
assert(canonical.includes("resetPoseButton.addEventListener('click'"), 'Reset pose is not intercepted for candidate 0.3.');
assert(canonical.includes("resetAllButton.addEventListener('click'"), 'Reset all is not intercepted for candidate 0.3.');
assert(canonical.includes('event.stopImmediatePropagation()'), 'Legacy 0.2 reset handlers are not prevented after candidate 0.3 is ready.');
assert(canonical.includes('candidate?.preview?.speedPercent'), 'Candidate 0.3 preview speed is not restored.');

assert(candidate.version === '0.2.0', 'Candidate schema version drifted.');
assert(candidate.direction === 'east' && candidate.body === 'male', 'Candidate 0.3 is no longer the male east-authored master.');
assert(candidate.frameSize.width === 128 && candidate.frameSize.height === 240, 'Candidate frame size drifted from 128×240.');
assert(candidate.floorY === 226, 'Candidate floor Y drifted from 226.');
assert(candidate.baseWalkPoseMs === 110, 'Candidate base timing drifted from 110ms.');
assert(candidate.preview.speedPercent === 105 && candidate.preview.poseMs === 105, 'Approved 105% preview cadence drifted.');
assert(candidate.poseOrder.length === 9 && candidate.poseOrder[0] === 'idle' && candidate.poseOrder[8] === 'walk8', 'Candidate no longer contains idle + 8 walk poses.');
assert(candidate.poses.walk1.pelvisY === 123, 'Approved Walk 1 pelvis value drifted.');
assert(candidate.poses.walk2.nearThigh === 33 && candidate.poses.walk2.farThigh === -12, 'Approved Walk 2 leg separation drifted.');
assert(candidate.poses.walk4.nearForearm === 19, 'Approved Walk 4 near forearm drifted.');
assert(candidate.poses.walk5.nearForearm === 27, 'Approved Walk 5 near forearm drifted.');
assert(candidate.poses.walk6.nearThigh === -12 && candidate.poses.walk6.nearShin === -12, 'Approved Walk 6 near leg drifted.');
assert(candidate.poses.walk7.pelvisY === 125, 'Approved Walk 7 pelvis value drifted.');

assert(gender.includes("const VERSION = '0.5.2'"), 'Gender renderer is not versioned 0.5.2.');
assert(gender.includes("hair: '#7b3f2f'"), 'Established auburn female hair palette is missing.');
assert(gender.includes("blouse: '#e8dcc3'"), 'Established cream blouse palette is missing.');
assert(gender.includes("vest: '#72513b'"), 'Established brown vest palette is missing.');
assert(gender.includes("trousers: '#365c78'"), 'Established blue trouser palette is missing.');
assert(gender.includes("boots: '#4a3327'"), 'Established brown boot palette is missing.');
assert(gender.includes('function buildSkeleton(pose)'), 'Female validation body is not driven by the same skeleton pose data.');
assert(gender.includes('modest side-profile chest contour'), 'Female torso silhouette contract is missing.');
assert(gender.includes('Auburn hair and ponytail carry over the established female hero identity.'), 'Female hair identity contract is missing.');
assert(gender.includes("drawFemaleLeg(points, 'far'"), 'Female far leg painter order is missing.');
assert(gender.includes("drawFemaleArm(points, 'far'"), 'Female far arm painter order is missing.');
assert(gender.includes('drawFemaleTorso(points, palette)'), 'Female torso renderer is missing.');
assert(gender.includes('drawFemaleHead(points, pose, palette, ghost)'), 'Female profile head renderer is missing.');
assert(gender.includes("drawFemaleLeg(points, 'near'"), 'Female near leg painter order is missing.');
assert(gender.includes("drawFemaleArm(points, 'near'"), 'Female near arm painter order is missing.');
assert(!gender.includes('assets/sprites/hero/body/female/idle.png'), 'Female lab comparison must not paste the production idle atlas.');
assert(!gender.includes('assets/sprites/hero/body/female/walk.png'), 'Female lab comparison must not paste the production walk atlas.');

assert(html.includes('data-view-mode="body"'), 'Body-only preview was lost.');
assert(html.includes('data-view-mode="both"'), 'Body + Rig preview was lost.');
assert(html.includes('data-view-mode="skeleton"'), 'Rig-only preview was lost.');
assert(html.includes('data-validation-direction="east"'), 'East preview was lost.');
assert(html.includes('data-validation-direction="west"'), 'West mirror preview was lost.');
assert(html.includes('data-validation-direction="compare"'), 'East + West comparison was lost.');
assert(html.includes('id="lab-play"'), 'Play Walk control was lost.');
assert(html.includes('id="lab-test-transition"'), 'Idle → Walk → Idle test was lost.');
assert(html.includes('id="lab-test-seam"'), 'Walk 8 ↔ Walk 1 seam test was lost.');
assert(html.includes('id="lab-paste"'), 'Paste JSON control was lost.');
assert(html.includes('id="hero-animation-handle-canvas"'), 'Draggable joint overlay was lost.');
assert(drag.includes("overlay.addEventListener('pointerdown'"), 'Draggable joint editing is no longer wired.');
assert(validation.includes('drawMirror'), 'West is no longer generated as a non-destructive east mirror.');
assert(validation.includes("if (mode === 'seam') return ['walk8', 'walk1'];"), 'Loop seam test no longer isolates Walk 8 ↔ Walk 1.');
assert(validation.includes('refreshFootDiagnostics'), 'Foot-contact diagnostics are no longer refreshed.');

const combined = [source, drag, validation, canonical, gender].join('\n');
assert(!combined.includes('setInterval('), 'Animation Lab 0.5.2 must not add unmanaged setInterval loops.');
assert(!drag.includes('requestAnimationFrame('), 'Drag editor must not add a competing animation loop.');
assert(!validation.includes('requestAnimationFrame('), 'Validation controller must not add a competing animation loop.');
assert(!canonical.includes('requestAnimationFrame('), 'Candidate 0.3 controller must not add an animation loop.');
assert(!gender.includes('requestAnimationFrame('), 'Gender comparison renderer must not add a competing animation loop.');
assert(count(source, 'requestAnimationFrame(') === 2, 'Core should contain only the initial and recursive calls for one playback animation loop.');
assert(count(source, 'requestAnimationFrame(playbackTick)') === 2, 'Core animation frame calls must both target the single playbackTick loop.');

assert(css.includes('.body-style'), 'Male / Female selector has no inherited body-style layout styling.');
assert(css.includes('.preview-toolbar'), 'Preview toolbar styling was lost.');

console.log('Hero Animation Lab 0.5.2 candidate 0.3 and Male/Female comparison smoke checks passed.');
