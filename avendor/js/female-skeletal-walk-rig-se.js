(() => {
  'use strict';

  const South = window.AvendorFemaleSouthRig;
  if (!South) {
    throw new Error('female-skeletal-walk-rig.js must load before female-skeletal-walk-rig-se.js.');
  }

  const FRAME_W = South.FRAME_W;
  const FRAME_H = South.FRAME_H;
  const GROUND_Y = South.GROUND_Y;
  const POSE_MS = South.POSE_MS;
  const COLORS = South.COLORS;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function projectPoint(point, cx, factor, sideSign = 0) {
    const depthLean = (point[1] - 137) * 0.10;
    return [
      cx + 2 + (point[0] - cx) * factor + depthLean + sideSign * 1.5,
      point[1]
    ];
  }

  function projectLeg(leg, cx, sideSign) {
    return {
      hip: projectPoint(leg.hip, cx, 0.45, sideSign),
      knee: projectPoint(leg.knee, cx, 0.30, sideSign),
      ankle: projectPoint(leg.ankle, cx, 0.22, sideSign),
      toe: projectPoint(leg.toe, cx, 0.20, sideSign),
      planted: leg.planted
    };
  }

  const SE_POSES = Object.freeze(
    South.SOUTH_POSES.map((pose) => {
      const cx = pose.pelvisX;
      const rightAdvance =
        (pose.screenRight.toe[0] - cx) -
        (cx - pose.screenLeft.toe[0]);

      return Object.freeze({
        phase: pose.phase.replace('Screen-', 'SE · screen-'),
        support: pose.support,
        bob: pose.bob,
        pelvisX: cx,
        shoulderTilt: pose.shoulderTilt * 0.55,
        hipTilt: pose.hipTilt * 0.55,
        armSwing: clamp(rightAdvance * 0.65, -12, 12),
        ponytail: {
          x: -4 + pose.ponytail.x * 0.35,
          y: pose.ponytail.y
        },
        screenLeft: projectLeg(pose.screenLeft, cx, -1),
        screenRight: projectLeg(pose.screenRight, cx, 1)
      });
    })
  );

  function validateSECycle() {
    const errors = [];
    if (SE_POSES.length !== 12) errors.push(`Expected 12 poses, found ${SE_POSES.length}.`);

    const expectedSupport = [
      'screen-left', 'screen-left', 'screen-left', 'screen-left', 'screen-left',
      'screen-right', 'screen-right', 'screen-right', 'screen-right', 'screen-right',
      'screen-left', 'screen-left'
    ];

    SE_POSES.forEach((pose, index) => {
      if (pose.support !== expectedSupport[index]) {
        errors.push(`Frame ${index + 1}: expected ${expectedSupport[index]} support, got ${pose.support}.`);
      }
      const plantedLeg = pose[pose.support === 'screen-left' ? 'screenLeft' : 'screenRight'];
      if (!plantedLeg.planted) errors.push(`Frame ${index + 1}: support foot is not marked planted.`);
      if (plantedLeg.toe[1] !== GROUND_Y) errors.push(`Frame ${index + 1}: planted toe must remain at y=${GROUND_Y}.`);
    });

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

  function drawLeg(ctx, leg, debug, widthScale = 1) {
    line(ctx, leg.hip, leg.knee, 12 * widthScale, COLORS.trousers);
    line(ctx, leg.knee, leg.ankle, 11 * widthScale, COLORS.trousers);
    line(ctx, leg.ankle, leg.toe, 9 * widthScale, COLORS.boots);
    if (debug) {
      [leg.hip, leg.knee, leg.ankle, leg.toe].forEach((point) => circle(ctx, point, 2.6, COLORS.joint));
      circle(ctx, leg.toe, 3.2, leg.planted ? COLORS.planted : COLORS.airborne);
    }
  }

  function drawArm(ctx, shoulder, swing, sideSign, debug, widthScale = 1) {
    const elbow = [
      shoulder[0] + sideSign * 2 + swing * 0.15,
      shoulder[1] + 24 + swing * 0.10
    ];
    const hand = [
      shoulder[0] + sideSign * 3 + swing * 0.34,
      shoulder[1] + 49 + swing * 0.34
    ];
    line(ctx, shoulder, elbow, 8 * widthScale, COLORS.blouse);
    line(ctx, elbow, hand, 7 * widthScale, COLORS.skin);
    if (debug) {
      circle(ctx, shoulder, 2.4, COLORS.joint);
      circle(ctx, elbow, 2.4, COLORS.joint);
      circle(ctx, hand, 2.4, COLORS.joint);
    }
  }

  function drawPose(ctx, pose, options = {}) {
    const debug = Boolean(options.debug);
    const showGround = options.showGround !== false;
    const bob = pose.bob;
    const cx = pose.pelvisX;

    const farShoulder = [cx - 8, 93 + bob + pose.shoulderTilt];
    const nearShoulder = [cx + 13, 91 + bob - pose.shoulderTilt];
    const head = [cx + 6, 53 + bob];
    const neck = [cx + 5, 73 + bob];
    const hipY = 137 + bob;

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

    // South-East has a fixed far/near body side: screen-left is farther away.
    drawLeg(ctx, pose.screenLeft, debug, 0.88);
    drawArm(ctx, farShoulder, pose.armSwing, -1, debug, 0.88);

    ctx.fillStyle = COLORS.blouse;
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(farShoulder[0], farShoulder[1]);
    ctx.lineTo(nearShoulder[0], nearShoulder[1]);
    ctx.lineTo(cx + 12, hipY);
    ctx.lineTo(cx - 6, hipY + 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.vest;
    ctx.fillRect(cx - 4, 96 + bob, 20, 36);
    ctx.fillStyle = COLORS.belt;
    ctx.fillRect(cx - 6, 129 + bob, 24, 7);

    drawLeg(ctx, pose.screenRight, debug, 1.03);
    drawArm(ctx, nearShoulder, -pose.armSwing, 1, debug, 1.02);

    line(ctx, neck, [cx + 5, 82 + bob], 7, COLORS.skin);
    circle(ctx, head, 17, COLORS.skin);
    ctx.fillStyle = COLORS.hair;
    ctx.beginPath();
    ctx.arc(head[0], head[1] - 3, 18, Math.PI, Math.PI * 2);
    ctx.lineTo(head[0] + 17, head[1] + 3);
    ctx.lineTo(head[0] - 17, head[1] + 3);
    ctx.closePath();
    ctx.fill();

    const ponyRoot = [cx - 1, 51 + bob];
    const ponyEnd = [ponyRoot[0] + pose.ponytail.x, ponyRoot[1] + 22 + pose.ponytail.y];
    line(ctx, ponyRoot, ponyEnd, 9, COLORS.hair);

    if (debug) {
      line(ctx, farShoulder, nearShoulder, 1.5, COLORS.joint);
      circle(ctx, neck, 2.6, COLORS.joint);
      circle(ctx, ponyRoot, 2.6, COLORS.joint);
    }

    ctx.restore();
  }

  function renderAtlas(canvas, debug = false) {
    canvas.width = FRAME_W * SE_POSES.length;
    canvas.height = FRAME_H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    SE_POSES.forEach((pose, index) => {
      ctx.save();
      ctx.translate(index * FRAME_W, 0);
      drawPose(ctx, pose, { debug, showGround: false });
      ctx.restore();
    });
  }

  window.AvendorFemaleSERig = Object.freeze({
    version: '0.8.0',
    FRAME_W,
    FRAME_H,
    GROUND_Y,
    POSE_MS,
    SE_POSES,
    COLORS,
    validateSECycle,
    drawPose,
    renderAtlas
  });
})();
