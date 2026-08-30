'use strict';

const fs = require('fs');
const path = require('path');

const candidatePath = path.resolve(__dirname, '..', 'data', 'hero-animation', 'male-east-west-candidate-0.1.json');
const snapshotPath = path.resolve(__dirname, '..', 'data', 'hero-animation', 'male-east-west-candidate-0.2.json');
const candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(candidate.direction === 'east', 'Male east/west candidate direction drifted.');
assert(candidate.body === 'male', 'Male east/west candidate body drifted.');
assert(candidate.frameSize.width === 128 && candidate.frameSize.height === 240, 'Male east/west candidate frame size drifted.');
assert(candidate.floorY === 226, 'Male east/west candidate floor line drifted.');
assert(candidate.baseWalkPoseMs === 110, 'Male east/west candidate cadence drifted.');
assert(candidate.poseOrder.length === 9, 'Male east/west candidate no longer has idle plus eight walk poses.');
assert(candidate.poses.idle.nearForearm === 16, 'Idle near forearm drifted from the refined 0.2 pose.');
assert(candidate.poses.walk4.nearUpperArm === 10 && candidate.poses.walk4.nearForearm === 26, 'Walk 4 near arm drifted from the refined 0.2 pose.');
assert(candidate.poses.walk4.farUpperArm === -6 && candidate.poses.walk4.farForearm === 9, 'Walk 4 far arm drifted from the refined 0.2 pose.');
assert(candidate.poses.walk5.nearUpperArm === 7 && candidate.poses.walk5.nearForearm === 36, 'Walk 5 near arm drifted from the refined 0.2 pose.');
assert(JSON.stringify(candidate) === JSON.stringify(snapshot), 'Current candidate and candidate 0.2 snapshot no longer match.');

console.log('Male east/west authored candidate 0.2 smoke checks passed.');
