'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'hero-animation-lab.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'hero-animation-lab.css'), 'utf8');
const source = fs.readFileSync(path.join(root, 'js', 'hero-animation-lab.js'), 'utf8');
const drag = fs.readFileSync(path.join(root, 'js', 'hero-animation-lab-drag.js'), 'utf8');
const validation = fs.readFileSync(path.join(root, 'js', 'hero-animation-lab-validation.js'), 'utf8');
const importer = fs.readFileSync(path.join(root, 'js', 'hero-animation-lab-import.js'), 'utf8');
const canonical = fs.readFileSync(path.join(root, 'js', 'hero-animation-lab-candidate-0.3.js'), 'utf8');
const gender = fs.readFileSync(path.join(root, 'js', 'hero-animation-lab-gender.js'), 'utf8');
const png = fs.readFileSync(path.join(root, 'js', 'hero-animation-lab-png.js'), 'utf8');
const candidate = JSON.parse(fs.readFileSync(path.join(root, 'data', 'hero-animation', 'male-east-west-candidate-0.3.json'), 'utf8'));
const malePng = path.join(root, 'assets', 'sprites', 'hero', 'combat-test', 'male-profile-parts.png');
const femalePng = path.join(root, 'assets', 'sprites', 'hero', 'combat-test', 'female-profile-parts.png');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function count(sourceText, token) {
  return sourceText.split(token).length - 1;
}

assert(html.includes('Hero Animation Lab <span>0.5.3</span>'), 'Animation Lab page is not labelled 0.5.3.');
assert(html.includes('approved candidate 0.3'), 'Candidate 0.3 is not described as the approved baseline.');
assert(html.includes('js/hero-animation-lab-png.js'), 'PNG Hero overlay controller is not loaded.');
assert(html.indexOf('hero-animation-lab-png.js') > html.indexOf('hero-animation-lab-gender.js'), 'PNG overlay must load after gender comparison tooling.');
assert(html.includes('data-hero-gender="male" class="selected"'), 'Male Hero body is not the initial body.');
assert(html.includes('data-hero-gender="female"'), 'Female Hero body toggle is missing.');
assert(html.includes('value="105"'), 'Approved 105% preview speed is not the initial lab value.');

assert(source.includes("const UI_VERSION = '0.5.1'"), 'Core Hero renderer unexpectedly changed; 0.5.3 should layer PNG diagnostics around it.');
assert(source.includes('function drawProxyBody('), 'Proxy renderer was not preserved.');
assert(source.includes('function drawHeroBody('), 'Vector Hero renderer was not preserved.');
assert(source.includes("let bodyStyle = 'hero'"), 'Existing Hero renderer baseline was lost.');
assert(count(source, 'requestAnimationFrame(playbackTick)') === 2, 'Core must retain exactly one playback requestAnimationFrame loop.');

assert(canonical.includes('male-east-west-candidate-0.3.json'), 'Candidate controller does not target 0.3.');
assert(canonical.includes('applyCandidateAll'), 'Candidate 0.3 reset baseline was lost.');
assert(candidate.preview.speedPercent === 105 && candidate.preview.poseMs === 105, 'Approved 105% / 105 ms preview cadence drifted.');
assert(candidate.poseOrder.length === 9 && candidate.poseOrder[0] === 'idle' && candidate.poseOrder[8] === 'walk8', 'Candidate 0.3 no longer contains idle + eight walk poses.');
assert(candidate.poses.walk1.pelvisY === 123, 'Approved Walk 1 pelvis value drifted.');
assert(candidate.poses.walk2.nearThigh === 33 && candidate.poses.walk2.farThigh === -12, 'Approved Walk 2 leg separation drifted.');
assert(candidate.poses.walk4.nearForearm === 19, 'Approved Walk 4 near forearm drifted.');
assert(candidate.poses.walk5.nearForearm === 27, 'Approved Walk 5 near forearm drifted.');
assert(candidate.poses.walk6.nearThigh === -12 && candidate.poses.walk6.nearShin === -12, 'Approved Walk 6 near leg drifted.');
assert(candidate.poses.walk7.pelvisY === 125, 'Approved Walk 7 pelvis value drifted.');

assert(gender.includes("const VERSION = '0.5.2'"), 'Male/Female vector comparison layer unexpectedly changed.');
assert(gender.includes('function buildSkeleton(pose)'), 'Female comparison remains tied to the shared rig.');
assert(gender.includes('Auburn hair and ponytail carry over the established female hero identity.'), 'Female hero identity contract was lost.');

assert(fs.existsSync(malePng), 'Male combat-test PNG parts are missing.');
assert(fs.existsSync(femalePng), 'Female combat-test PNG parts are missing.');
assert(png.includes("const VERSION = '0.5.3'"), 'PNG Hero renderer is not versioned 0.5.3.');
assert(png.includes('assets/sprites/hero/combat-test/male-profile-parts.png'), 'Male PNG profile atlas is not wired into the lab.');
assert(png.includes('assets/sprites/hero/combat-test/female-profile-parts.png'), 'Female PNG profile atlas is not wired into the lab.');
assert(png.includes("pngButton.textContent = 'PNG Hero'"), 'PNG Hero body-style control is missing.');
assert(png.includes('function drawPngBody('), 'Rig-driven PNG body renderer is missing.');
assert(png.includes('function drawSegmentPart('), 'PNG limbs are not attached between rig joints.');
assert(png.includes('function drawTorsoPart('), 'PNG torso attachment is missing.');
assert(png.includes('function drawHeadPart('), 'PNG profile head attachment is missing.');
assert(png.includes("drawLegParts(targetCtx, image, def.rects, points, 'far'"), 'Far PNG leg painter order is missing.');
assert(png.includes("drawArmParts(targetCtx, image, def.rects, points, 'far'"), 'Far PNG arm painter order is missing.');
assert(png.includes("drawLegParts(targetCtx, image, def.rects, points, 'near'"), 'Near PNG leg painter order is missing.');
assert(png.includes("drawArmParts(targetCtx, image, def.rects, points, 'near'"), 'Near PNG arm painter order is missing.');
assert(png.includes("lab.setViewMode('skeleton')"), 'PNG Body + Rig mode no longer uses the established skeleton layer.');
assert(png.includes('refreshValidation()'), 'PNG redraws no longer refresh mirrored validation previews.');
assert(png.includes("data.preview.bodyStyle = 'png'"), 'Copy JSON does not identify PNG Hero preview mode.');
assert(png.includes('enterPngMode();'), '0.5.3 does not open on the PNG diagnostic by default.');
assert(!png.includes('assets/sprites/hero/body/male/idle.png'), 'PNG lab must not use the live Briarwell male idle atlas.');
assert(!png.includes('assets/sprites/hero/body/male/walk.png'), 'PNG lab must not use the live Briarwell male walk atlas.');
assert(!png.includes('assets/sprites/hero/body/female/idle.png'), 'PNG lab must not use the live Briarwell female idle atlas.');
assert(!png.includes('assets/sprites/hero/body/female/walk.png'), 'PNG lab must not use the live Briarwell female walk atlas.');

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
assert(importer.includes('importJsonText'), 'Paste JSON importer was lost.');
assert(validation.includes('drawMirror'), 'West is no longer generated as a non-destructive East mirror.');
assert(validation.includes("if (mode === 'seam') return ['walk8', 'walk1'];"), 'Loop seam test no longer isolates Walk 8 ↔ Walk 1.');
assert(validation.includes('refreshFootDiagnostics'), 'Foot-contact diagnostics are no longer refreshed.');
assert(css.includes('.body-style'), 'Body-style toolbar layout styling was lost.');
assert(css.includes('.preview-toolbar'), 'Preview toolbar styling was lost.');

const combined = [source, drag, validation, importer, canonical, gender, png].join('\n');
assert(!combined.includes('setInterval('), 'Animation Lab 0.5.3 must not add unmanaged setInterval loops.');
assert(!drag.includes('requestAnimationFrame('), 'Drag editor must not add a competing animation loop.');
assert(!validation.includes('requestAnimationFrame('), 'Validation controller must not add a competing animation loop.');
assert(!canonical.includes('requestAnimationFrame('), 'Candidate 0.3 controller must not add an animation loop.');
assert(!gender.includes('requestAnimationFrame('), 'Gender renderer must not add a competing animation loop.');
assert(!png.includes('requestAnimationFrame('), 'PNG overlay must not add a competing animation loop.');
assert(!png.includes('setTimeout('), 'PNG overlay must not add an unmanaged timer.');
assert(count(png, 'new MutationObserver(') === 1, 'PNG overlay should use exactly one pose-selection observer.');

console.log('Hero Animation Lab 0.5.3 PNG overlay smoke checks passed.');
