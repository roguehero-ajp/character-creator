'use strict';

const fs = require('fs');
const path = require('path');

const candidate = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '..', 'data', 'hero-animation', 'male-east-west-candidate-0.1.json'),
  'utf8'
));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(candidate.direction === 'east', 'Male east/west candidate direction drifted.');
assert(candidate.body === 'male', 'Male east/west candidate body drifted.');
assert(candidate.frameSize.width === 128 && candidate.frameSize.height === 240, 'Male east/west candidate frame size drifted.');
assert(candidate.floorY === 226, 'Male east/west candidate floor line drifted.');
assert(candidate.baseWalkPoseMs === 110, 'Male east/west candidate cadence drifted.');
assert(candidate.poseOrder.length === 9, 'Male east/west candidate no longer has idle plus eight walk poses.');
assert(candidate.poses.walk4.farUpperArm === 24, 'Walk 4 far upper arm is not using the corrected authored value.');
assert(candidate.poses.walk4.farForearm === 29, 'Walk 4 far forearm is not using the corrected authored value.');

console.log('Male east/west authored candidate smoke checks passed.');
