(() => {
  'use strict';

  const FRAME_W = 128;
  const FRAME_H = 240;
  const GROUND_Y = 220;
  const POSE_MS = 110;

  const COLORS = Object.freeze({
    hair: '#7b3f2f',
    skin: '#d7a477',
    blouse: '#e8dcc3',
    vest: '#72513b',
    trousers: '#365c78',
    boots: '#4a3327',
    belt: '#5a3c2c',
    line: '#211b18',
    joint: '#f4d35e',
    planted: '#68c07a',
    airborne: '#d96b6b'
  });

  // Viewer-relative naming only. Positive x moves toward screen-right.
  // Every pose is authored explicitly so gait alternation never depends on image-model inference.
  const SOUTH_POSES = Object.freeze([
    {
      phase: 'Screen-left foot contact', support: 'screen-left', bob: 0,
      pelvisX: 62, shoulderTilt: -1, hipTilt: 1, ponytail: { x: 7, y: -2 },
      screenLeft: { hip: [57, 137], knee: [51, 176], ankle: [47, 211], toe: [42, 220], planted: true },
      screenRight: { hip: [67, 137], knee: [72, 171], ankle: [76, 204], toe: [82, 216], planted: false }
    },
    {
      phase: 'Weight over screen-left', support: 'screen-left', bob: 2,
      pelvisX: 59, shoulderTilt: -2, hipTilt: 2, ponytail: { x: 5, y: -1 },
      screenLeft: { hip: [55, 139], knee: [50, 177], ankle: [47, 212], toe: [42, 220], planted: true },
      screenRight: { hip: [65, 137], knee: [67, 174], ankle: [70, 204], toe: [75, 215], planted: false }
    },
    {
      phase: 'Screen-right passes', support: 'screen-left', bob: 1,
      pelvisX: 60, shoulderTilt: -1, hipTilt: 1, ponytail: { x: 3, y: 0 },
      screenLeft: { hip: [55, 138], knee: [51, 177], ankle: [48, 212], toe: [43, 220], planted: true },
      screenRight: { hip: [65, 138], knee: [63, 174], ankle: [61, 202], toe: [64, 213], planted: false }
    },
    {
      phase: 'Screen-right lift', support: 'screen-left', bob: -1,
      pelvisX: 61, shoulderTilt: 0, hipTilt: 0, ponytail: { x: 1, y: 1 },
      screenLeft: { hip: [56, 136], knee: [52, 176], ankle: [49, 212], toe: [44, 220], planted: true },
      screenRight: { hip: [66, 136], knee: [70, 166], ankle: [66, 190], toe: [70, 201], planted: false }
    },
    {
      phase: 'Screen-right extend', support: 'screen-left', bob: 0,
      pelvisX: 62, shoulderTilt: 1, hipTilt: -1, ponytail: { x: -2, y: 1 },
      screenLeft: { hip: [57, 137], knee: [53, 177], ankle: [50, 212], toe: [45, 220], planted: true },
      screenRight: { hip: [67, 137], knee: [71, 172], ankle: [75, 206], toe: [82, 218], planted: false }
    },
    {
      phase: 'Screen-right foot contact', support: 'screen-right', bob: 0,
      pelvisX: 64, shoulderTilt: 1, hipTilt: -1, ponytail: { x: -5, y: 0 },
      screenLeft: { hip: [59, 137], knee: [54, 173], ankle: [51, 205], toe: [46, 216], planted: false },
      screenRight: { hip: [69, 137], knee: [74, 176], ankle: [78, 212], toe: [84, 220], planted: true }
    },
    {
      phase: 'Weight over screen-right', support: 'screen-right', bob: 2,
      pelvisX: 67, shoulderTilt: 2, hipTilt: -2, ponytail: { x: -6, y: -1 },
      screenLeft: { hip: [61, 137], knee: [59, 174], ankle: [57, 204], toe: [52, 215], planted: false },
      screenRight: { hip: [71, 139], knee: [76, 177], ankle: [79, 212], toe: [85, 220], planted: true }
    },
    {
      phase: 'Screen-left passes', support: 'screen-right', bob: 1,
      pelvisX: 66, shoulderTilt: 1, hipTilt: -1, ponytail: { x: -4, y: 0 },
      screenLeft: { hip: [61, 138], knee: [63, 174], ankle: [65, 202], toe: [62, 213], planted: false },
      screenRight: { hip: [71, 138], knee: [75, 177], ankle: [78, 212], toe: [84, 220], planted: true }
    },
    {
      phase: 'Screen-left lift', support: 'screen-right', bob: -1,
      pelvisX: 65, shoulderTilt: 0, hipTilt: 0, ponytail: { x: -1, y: 1 },
      screenLeft: { hip: [60, 136], knee: [56, 166], ankle: [60, 190], toe: [56, 201], planted: false },
      screenRight: { hip: [70, 136], knee: [74, 176], ankle: [77, 212], toe: [83, 220], planted: true }
    },
    {
      phase: 'Screen-left extend', support: 'screen-right', bob: 0,
      pelvisX: 64, shoulderTilt: -1, hipTilt: 1, ponytail: { x: 2, y: 1 },
      screenLeft: { hip: [59, 137], knee: [55, 172], ankle: [51, 206], toe: [44, 218], planted: false },
      screenRight: { hip: [69, 137], knee: [73, 177], ankle: [76, 212], toe: [82, 220], planted: true }
    },
    {
      phase: 'Screen-left foot contact', support: 'screen-left', bob: 0,
      pelvisX: 62, shoulderTilt: -1, hipTilt: 1, ponytail: { x: 5, y: 0 },
      screenLeft: { hip: [57, 137], knee: [52, 176], ankle: [48, 212], toe: [42, 220], planted: true },
      screenRight: { hip: [67, 137], knee: [72, 173], ankle: [75, 205], toe: [81, 216], planted: false }
    },
    {
      phase: 'Transition toward frame 1', support: 'screen-left', bob: 1,
      pelvisX: 61, shoulderTilt: -1, hipTilt: 1, ponytail: { x: 6, y: -1 },
      screenLeft: { hip: [56, 138], knee: [51, 177], ankle: [47, 212], toe: [42, 220], planted: true },
      screenRight: { hip: [66, 138], knee: [70, 172], ankle: [74, 204], toe: [80, 216], planted: false }
    }
  ]);

  function clonePoint(point, dx = 0, dy = 0) {
    return [point[0] + dx, point[1] + dy];
  }

  function validateSouthCycle() {
    const errors = [];
    if (SOUTH_POSES.length !== 12) errors.push(`Expected 12 poses, found ${SOUTH_POSES.length}.`);

    const expectedSupport = [
      'screen-left', 'screen-left', 'screen-left', 'screen-left', 'screen-left',
      'screen-right', 'screen-right', 'screen-right', 'screen-right', 'screen-right',
      'screen-left', 'screen-left'
    ];

    SOUTH_POSES.forEach((pose, index) => {
      if (pose.support !== expectedSupport[index]) {
        errors.push(`Frame ${index + 1}: expected ${expectedSupport[index]} support, got ${pose.support}.`);
      }
      const plantedLeg = pose[pose.support === 'screen-left' ? 'screenLeft' : 'screenRight'];
      if (!plantedLeg.planted) errors.push(`Frame ${index + 1}: support foot is not marked planted.`);
      if (plantedLeg.toe[1] !== GROUND_Y) errors.push(`Frame ${index + 1}: planted toe must remain at y=${GROUND_Y}.`);
    });

    if (!SOUTH_POSES[0].screenLeft.planted || !SOUTH_POSES[5].screenRight.planted || !SOUTH_POSES[10].screenLeft.planted) {
      errors.push('Canonical contact frames 1, 6 and 11 do not alternate correctly.');
    }

    const rightLift = SOUTH_POSES[3].screenRight;
    const leftLift = SOUTH_POSES[8].screenLeft;
    if (!(rightLift.knee[1] < rightLift.ankle[1] && leftLift.knee[1] < leftLift.ankle[1])) {
      errors.push('Lift poses must show visibly bent knees.');
    }

    return errors;
  }

  function line(ctx, from, to, width, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
  }

  function circle(ctx, point, radius, fill, stroke = COLORS.line) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(point[0], point[1], radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function drawLeg(ctx, leg, debug) {
    line(ctx, leg.hip, leg.knee, 12, COLORS.trousers);
    line(ctx, leg.knee, leg.ankle, 11, COLORS.trousers);
    line(ctx, leg.ankle, leg.toe, 9, COLORS.boots);
    if (debug) {
      [leg.hip, leg.knee, leg.ankle, leg.toe].forEach((point) => circle(ctx, point, 2.8, COLORS.joint));
      circle(ctx, leg.toe, 3.5, leg.planted ? COLORS.planted : COLORS.airborne);
    }
  }

  function drawArm(ctx, shoulder, swing, sideSign, bob, debug) {
    const elbow = [shoulder[0] + sideSign * (7 + swing * 0.25), shoulder[1] + 26 + bob];
    const hand = [elbow[0] + sideSign * (4 + swing * 0.16), elbow[1] + 26];
    line(ctx, shoulder, elbow, 8, COLORS.blouse);
    line(ctx, elbow, hand, 7, COLORS.skin);
    if (debug) {
      circle(ctx, shoulder, 2.5, COLORS.joint);
      circle(ctx, elbow, 2.5, COLORS.joint);
      circle(ctx, hand, 2.5, COLORS.joint);
    }
  }

  function drawPose(ctx, pose, options = {}) {
    const debug = Boolean(options.debug);
    const showGround = options.showGround !== false;
    const bob = pose.bob;
    const cx = pose.pelvisX;
    const shoulderY = 92 + bob;
    const hipY = 137 + bob;
    const neck = [cx, 73 + bob];
    const head = [cx, 53 + bob];
    const screenLeftShoulder = [cx - 18, shoulderY + pose.shoulderTilt];
    const screenRightShoulder = [cx + 18, shoulderY - pose.shoulderTilt];

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (showGround) {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(12, GROUND_Y + 0.5);
      ctx.lineTo(116, GROUND_Y + 0.5);
      ctx.stroke();
    }

    // Rear leg first, then support/front leg for readable overlap.
    const rearKey = pose.support === 'screen-left' ? 'screenRight' : 'screenLeft';
    const frontKey = pose.support === 'screen-left' ? 'screenLeft' : 'screenRight';
    drawLeg(ctx, pose[rearKey], debug);

    // Torso and pelvis.
    ctx.fillStyle = COLORS.blouse;
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenLeftShoulder[0], screenLeftShoulder[1]);
    ctx.lineTo(screenRightShoulder[0], screenRightShoulder[1]);
    ctx.lineTo(cx + 14, hipY);
    ctx.lineTo(cx - 14, hipY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.vest;
    ctx.fillRect(cx - 12, 95 + bob, 24, 37);
    ctx.fillStyle = COLORS.belt;
    ctx.fillRect(cx - 15, 129 + bob, 30, 7);
    ctx.fillRect(cx + 10, 133 + bob, 8, 12);

    drawLeg(ctx, pose[frontKey], debug);

    // Arms swing opposite the advancing leg. Positive means screen-right arm forward.
    const rightAdvance = (pose.screenRight.toe[0] - cx) - (cx - pose.screenLeft.toe[0]);
    const armSwing = Math.max(-12, Math.min(12, rightAdvance * 0.55));
    drawArm(ctx, screenLeftShoulder, armSwing, -1, bob, debug);
    drawArm(ctx, screenRightShoulder, -armSwing, 1, bob, debug);

    // Neck, head, hair and ponytail.
    line(ctx, neck, [cx, 82 + bob], 7, COLORS.skin);
    circle(ctx, head, 17, COLORS.skin);
    ctx.fillStyle = COLORS.hair;
    ctx.beginPath();
    ctx.arc(head[0], head[1] - 3, 18, Math.PI, Math.PI * 2);
    ctx.lineTo(head[0] + 17, head[1] + 3);
    ctx.lineTo(head[0] - 17, head[1] + 3);
    ctx.closePath();
    ctx.fill();

    const ponyRoot = [cx + 14, 51 + bob];
    const ponyEnd = [ponyRoot[0] + pose.ponytail.x, ponyRoot[1] + 22 + pose.ponytail.y];
    line(ctx, ponyRoot, ponyEnd, 9, COLORS.hair);

    if (debug) {
      line(ctx, screenLeftShoulder, screenRightShoulder, 1.5, COLORS.joint);
      line(ctx, [cx - 10, hipY + pose.hipTilt], [cx + 10, hipY - pose.hipTilt], 1.5, COLORS.joint);
      circle(ctx, neck, 2.8, COLORS.joint);
      circle(ctx, ponyRoot, 2.8, COLORS.joint);
    }

    ctx.restore();
  }

  function renderAtlas(canvas, debug = false) {
    canvas.width = FRAME_W * SOUTH_POSES.length;
    canvas.height = FRAME_H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    SOUTH_POSES.forEach((pose, index) => {
      ctx.save();
      ctx.translate(index * FRAME_W, 0);
      drawPose(ctx, pose, { debug, showGround: false });
      ctx.restore();
    });
  }

  window.AvendorFemaleSouthRig = Object.freeze({
    FRAME_W,
    FRAME_H,
    GROUND_Y,
    POSE_MS,
    SOUTH_POSES,
    COLORS,
    validateSouthCycle,
    drawPose,
    renderAtlas
  });
})();
