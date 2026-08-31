'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'combat-test.html'), 'utf8');
const sprite = fs.readFileSync(path.join(root, 'js', 'combat-production-sprite.js'), 'utf8');
const combat = fs.readFileSync(path.join(root, 'js', 'combat-test.js'), 'utf8');
const candidate = JSON.parse(fs.readFileSync(path.join(root, 'data', 'hero-animation', 'male-east-west-candidate-0.3.json'), 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(html.includes('Sword Combat Prototype 0.6'), 'Combat simulator is not labelled 0.6.');
assert(html.includes('js/combat-production-sprite.js'), 'Combat-only production sprite module is not loaded.');
assert(!html.includes('js/sprite-engine.js'), 'Combat test must not use the global Briarwell sprite engine in this pass.');
assert(html.includes('candidate 0.3') && html.includes('105 ms'), 'Combat page does not document the approved motion source/cadence.');

assert(sprite.includes("const WALK_FRAMES = 8"), 'Combat production renderer is not an 8-frame walk.');
assert(sprite.includes("const WALK_POSE_MS = 105"), 'Combat production renderer is not using the approved 105 ms cadence.');
assert(sprite.includes("male-east-west-candidate-0.3.json"), 'Combat renderer is not driven by candidate 0.3.');
assert(sprite.includes("male: Object.freeze"), 'Male production palette/shell is missing.');
assert(sprite.includes("female: Object.freeze"), 'Female production palette/shell is missing.');
assert(sprite.includes('function renderAtlases('), 'Combat production renderer does not pre-render its idle/walk atlases.');
assert(sprite.includes("candidate.poses[`walk${index + 1}`]"), 'Walk atlas is not rendered from all eight approved poses.');
assert(sprite.includes('class CombatHeroSprite'), 'Combat-specific sprite class is missing.');
assert(!sprite.includes('assets/sprites/hero/body/male/walk.png'), 'Combat renderer must not use the live male walk atlas.');
assert(!sprite.includes('assets/sprites/hero/body/female/walk.png'), 'Combat renderer must not use the live female walk atlas.');
assert(!sprite.includes('setInterval('), 'Combat production renderer must not add an unmanaged interval.');
assert(!sprite.includes('requestAnimationFrame('), 'Combat production renderer must not add a second animation loop.');

assert(combat.includes('window.AvendorCombatProductionSprite?.CombatHeroSprite'), 'Combat test is not using the combat-only sprite class.');
assert(combat.includes("hero.setMotion(direction ? 'walk' : 'idle')"), 'A/D movement does not switch between walk and idle.');
assert(combat.includes('hero.update(now);'), 'Combat tick does not advance the production walk animation.');
assert(combat.includes("mirror.style.setProperty('--face', String(facing))"), 'East/West facing no longer uses the existing non-destructive mirror.');
assert((combat.match(/requestAnimationFrame\(tick\)/g) || []).length === 2, 'Combat test should retain exactly one requestAnimationFrame tick loop.');

assert(candidate.preview.speedPercent === 105 && candidate.preview.poseMs === 105, 'Candidate 0.3 preview cadence drifted.');
assert(candidate.poseOrder.length === 9 && candidate.poseOrder[0] === 'idle' && candidate.poseOrder[8] === 'walk8', 'Candidate 0.3 pose order drifted.');
assert(candidate.body === 'male' && candidate.direction === 'east', 'Candidate 0.3 is no longer the male East-authored master.');

console.log('Combat East/West production 0.6 smoke checks passed.');
