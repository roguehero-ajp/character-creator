(() => {
  'use strict';

  const South = window.AvendorFemaleSouthRig;
  if (!South) {
    throw new Error('female-skeletal-walk-rig.js must load before female-skeletal-walk-rig-ew.js.');
  }

  const FRAME_W = South.FRAME_W;
  const FRAME_H = South.FRAME_H;
  const GROUND_Y = South.GROUND_Y;
  const POSE_MS = South.POSE_MS;
  const COLORS = South.COLORS;

  const stride = [
    { left: 22, right: -16 },
    { left: 13, right: -20 },
    { left: 5, right: -6 },
    { left: -4, right: 7 },
    { left: -13, right: 18 },
    { left: -19, right: 22 },
    { left: -21, right: 13 },
    { left: -7, right: 5 },
    { left: 6, right: -4 },
    { left: 18, right: -13 },
    { left: 22, right: -19 },
    { left: 13, right: -21 }
  ];

  function makeLeg(sourceLeg, cx, toeOffset, sideOffset) {
    return Object.freeze({
      hip: Object.freeze([cx + sideOffset, sourceLeg.hip[1]]),
      knee: Object.freeze([cx + sideOffset + toeOffset * 0.34, sourceLeg.knee[1]]),
      ankle: Object.freeze([cx + sideOffset + toeOffset * 0.72, sourceLeg.ankle[1]]),
      toe: Object.freeze([cx + toeOffset, sourceLeg.toe[1]]),
      planted: sourceLeg.planted
    });
  }

  const EAST_POSES = Object.freeze(
    South.SOUTH_POSES.map((pose, index) => {
      const cx = pose.pelvisX;
      const travel = stride[index];
      return Object.freeze({
        phase: pose.phase.replace('Screen-', 'E · screen-'),
        support: pose.support,
        bob: pose.bob,
        pelvisX: cx,
        shoulderTilt: pose.shoulderTilt * 0.28,
        hipTilt: pose.hipTilt * 0.22,
        ponytail: Object.freeze({
          x: -7 + pose.ponytail.x * 0.22,
          y: pose.ponytail.y
        }),
        screenLeft: makeLeg(pose.screenLeft, cx, travel.left, -2),
        screenRight: makeLeg(pose.screenRight, cx, travel.right, 2)
      });
    })
  );

  function validateEastCycle() {
    const errors = [];
    if (EAST_POSES.length !== 12) errors.push(`Expected 12 poses, found ${EAST_POSES.length}.`);

    EAST_POSES.forEach((pose, index) => {
      const source = South.SOUTH_POSES[index];
      if (pose.support !== source.support) {
        errors.push(`Frame ${index + 1}: support changed from the locked South cadence.`);
      }
      const supportKey = pose.support === 'screen-left' ? 'screenLeft' : 'screenRight';
      const supportLeg = pose[supportKey];
      if (!supportLeg.planted) errors.push(`Frame ${index + 1}: support foot is not marked planted.`);
      if (supportLeg.toe[1] !== GROUND_Y) {
        errors.push(`Frame ${index + 1}: planted toe must remain at y=${GROUND_Y}.`);
      }
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
    line(ctx, leg.hip, leg.knee, 11 * widthScale, COLORS.trousers);
    line(ctx, leg.knee, leg.ankle, 10 * widthScale, COLORS.trousers);
    line(ctx, leg.ankle, leg.toe, 8 * widthScale, COLORS.boots);
    if (debug) {
      [leg.hip, leg.knee, leg.ankle, leg.toe].forEach((point) => circle(ctx, point, 2.5, COLORS.joint));
      circle(ctx, leg.toe, 3.1, leg.planted ? COLORS.planted : COLORS.airborne);
    }
  }

  function armPoints(pose, side) {
    const cx = pose.pelvisX;
    const isLeft = side === 'screen-left';
    const leg = isLeft ? pose.screenLeft : pose.screenRight;
    const other = isLeft ? pose.screenRight : pose.screenLeft;
    const legAdvance = leg.toe[0] - other.toe[0];
    const shoulder = [cx + (isLeft ? -2 : 2), 92 + pose.bob + (isLeft ? 1 : -1)];
    const handTravel = Math.max(-18, Math.min(18, legAdvance * -0.46));
    return {
      shoulder,
      elbow: [shoulder[0] + handTravel * 0.50, shoulder[1] + 25],
      hand: [shoulder[0] + handTravel, shoulder[1] + 50]
    };
  }

  function drawArm(ctx, arm, debug, widthScale = 1) {
    line(ctx, arm.shoulder, arm.elbow, 7 * widthScale, COLORS.blouse);
    line(ctx, arm.elbow, arm.hand, 6 * widthScale, COLORS.skin);
    if (debug) {
      [arm.shoulder, arm.elbow, arm.hand].forEach((point) => circle(ctx, point, 2.3, COLORS.joint));
    }
  }

  function drawEastPose(ctx, pose, options = {}) {
    const debug = Boolean(options.debug);
    const showGround = options.showGround !== false;
    const cx = pose.pelvisX;
    const bob = pose.bob;
    const hipY = 137 + bob;
    const leftArm = armPoints(pose, 'screen-left');
    const rightArm = armPoints(pose, 'screen-right');
    const rightLegFront = pose.screenRight.toe[0] > pose.screenLeft.toe[0];
    const rearLeg = rightLegFront ? pose.screenLeft : pose.screenRight;
    const frontLeg = rightLegFront ? pose.screenRight : pose.screenLeft;
    const rearArm = rightLegFront ? rightArm : leftArm;
    const frontArm = rightLegFront ? leftArm : rightArm;

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

    drawLeg(ctx, rearLeg, debug, 0.86);
    drawArm(ctx, rearArm, debug, 0.86);

    ctx.fillStyle = COLORS.blouse;
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 6, 91 + bob);
    ctx.lineTo(cx + 7, 92 + bob);
    ctx.lineTo(cx + 6, hipY);
    ctx.lineTo(cx - 5, hipY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.vest;
    ctx.fillRect(cx - 4, 96 + bob, 10, 35);
    ctx.fillStyle = COLORS.belt;
    ctx.fillRect(cx - 5, 129 + bob, 12, 7);

    drawLeg(ctx, frontLeg, debug, 1.02);
    drawArm(ctx, frontArm, debug, 1.02);

    const neck = [cx + 2, 73 + bob];
    const head = [cx + 5, 53 + bob];
    line(ctx, neck, [cx + 2, 82 + bob], 6, COLORS.skin);
    circle(ctx, head, 16, COLORS.skin);
    ctx.fillStyle = COLORS.hair;
    ctx.beginPath();
    ctx.arc(head[0], head[1] - 3, 17, Math.PI, Math.PI * 2);
    ctx.lineTo(head[0] + 13, head[1] + 4);
    ctx.lineTo(head[0] - 15, head[1] + 3);
    ctx.closePath();
    ctx.fill();

    const ponyRoot = [cx - 5, 52 + bob];
    const ponyEnd = [ponyRoot[0] + pose.ponytail.x, ponyRoot[1] + 23 + pose.ponytail.y];
    line(ctx, ponyRoot, ponyEnd, 8, COLORS.hair);

    if (debug) {
      circle(ctx, neck, 2.5, COLORS.joint);
      circle(ctx, ponyRoot, 2.5, COLORS.joint);
    }

    ctx.restore();
  }

  function drawPose(ctx, pose, direction = 'east', options = {}) {
    if (direction === 'west') {
      ctx.save();
      ctx.translate(FRAME_W, 0);
      ctx.scale(-1, 1);
      drawEastPose(ctx, pose, options);
      ctx.restore();
      return;
    }
    drawEastPose(ctx, pose, options);
  }

  function renderAtlas(canvas, direction = 'east', debug = false) {
    canvas.width = FRAME_W * EAST_POSES.length;
    canvas.height = FRAME_H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    EAST_POSES.forEach((pose, index) => {
      ctx.save();
      ctx.translate(index * FRAME_W, 0);
      drawPose(ctx, pose, direction, { debug, showGround: false });
      ctx.restore();
    });
  }

  window.AvendorFemaleEWRig = Object.freeze({
    version: '0.9.0',
    FRAME_W,
    FRAME_H,
    GROUND_Y,
    POSE_MS,
    EAST_POSES,
    COLORS,
    validateEastCycle,
    drawPose,
    renderAtlas
  });
})();
