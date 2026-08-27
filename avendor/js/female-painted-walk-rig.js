(() => {
  'use strict';

  const Skeleton = window.AvendorFemaleSouthRig;
  if (!Skeleton) {
    throw new Error('female-skeletal-walk-rig.js must load before female-painted-walk-rig.js.');
  }

  const BASE = 'assets/sprites/hero/body/female/skeletal-rig/';

  const PART_FILES = Object.freeze({
    head: 'head.png',
    ponytail: 'ponytail.png',
    torso: 'torso.png',
    pelvis: 'pelvis.png',
    screenLeftUpperArm: 'screen-left-upper-arm.png',
    screenLeftLowerArm: 'screen-left-lower-arm.png',
    screenRightUpperArm: 'screen-right-upper-arm.png',
    screenRightLowerArm: 'screen-right-lower-arm.png',
    screenLeftThigh: 'screen-left-thigh.png',
    screenLeftShinBoot: 'screen-left-shin-boot.png',
    screenRightThigh: 'screen-right-thigh.png',
    screenRightShinBoot: 'screen-right-shin-boot.png'
  });

  const images = {};
  let ready = false;

  function loadImage(name, file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';

      image.onload = () => {
        images[name] = image;
        resolve(image);
      };

      image.onerror = () => {
        reject(new Error(`Could not load painted rig asset: ${BASE}${file}`));
      };

      image.src = `${BASE}${file}?v=0.7.8`;
    });
  }

  async function load() {
    await Promise.all(
      Object.entries(PART_FILES).map(([name, file]) => loadImage(name, file))
    );

    ready = true;
    return images;
  }

  function drawVerticalSegment(ctx, image, from, to, options = {}) {
    if (!image) return;

    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const targetLength = Math.hypot(dx, dy);

    if (targetLength < 1) return;

    const pivotX = image.naturalWidth * (options.pivotX ?? 0.5);
    const pivotY = image.naturalHeight * (options.pivotY ?? 0.06);
    const naturalLength = image.naturalHeight * (options.lengthFactor ?? 0.86);
    const scale = (targetLength / naturalLength) * (options.scale ?? 1);
    const angle = Math.atan2(dy, dx) - Math.PI / 2;

    ctx.save();
    ctx.translate(from[0], from[1]);
    ctx.rotate(angle);
    ctx.scale(scale * (options.widthScale ?? 1), scale);

    if (options.flipX) {
      ctx.scale(-1, 1);
      ctx.drawImage(image, pivotX - image.naturalWidth, -pivotY);
    } else {
      ctx.drawImage(image, -pivotX, -pivotY);
    }

    ctx.restore();
  }

  function drawCentered(ctx, image, center, scale, options = {}) {
    if (!image) return;

    ctx.save();
    ctx.translate(center[0], center[1]);

    if (options.rotate) {
      ctx.rotate(options.rotate);
    }

    ctx.scale(
      scale * (options.scaleX ?? 1) * (options.flipX ? -1 : 1),
      scale * (options.scaleY ?? 1)
    );

    const anchorX = image.naturalWidth * (options.anchorX ?? 0.5);
    const anchorY = image.naturalHeight * (options.anchorY ?? 0.5);

    ctx.drawImage(image, -anchorX, -anchorY);
    ctx.restore();
  }

  function armJoints(pose) {
    const bob = pose.bob;
    const cx = pose.pelvisX;
    const shoulderY = 92 + bob;

    // Keep the arms close, but leave a bit more clearance from the hips.
    const leftShoulder = [
      cx - 17,
      shoulderY + pose.shoulderTilt * 0.45
    ];

    const rightShoulder = [
      cx + 17,
      shoulderY - pose.shoulderTilt * 0.45
    ];

    const rightAdvance =
      (pose.screenRight.toe[0] - cx) -
      (cx - pose.screenLeft.toe[0]);

    // Use the leg phase only to decide which arm is forward/back.
    // Most of the visible travel is vertical/depth, not lateral X motion.
    const swing = Math.max(-12, Math.min(12, rightAdvance * 0.70));

    function make(shoulder, localSwing, sideSign) {
      const elbow = [
        shoulder[0] + sideSign * 3,
        shoulder[1] + 24 + localSwing * 0.18
      ];

      const hand = [
        shoulder[0] + sideSign * 5,
        shoulder[1] + 49 + localSwing * 0.62
      ];

      return {
        shoulder,
        elbow,
        hand,
        forward: localSwing
      };
    }

    return {
      screenLeft: make(leftShoulder, swing, -1),
      screenRight: make(rightShoulder, -swing, 1)
    };
  }

  function drawLeg(ctx, pose, side) {
    const leg = side === 'screen-left' ? pose.screenLeft : pose.screenRight;
    const thigh = side === 'screen-left' ? images.screenLeftThigh : images.screenRightThigh;
    const shin = side === 'screen-left' ? images.screenLeftShinBoot : images.screenRightShinBoot;
    const cx = pose.pelvisX;

    // Keep the foot track narrow, but separate the thighs a bit more.
    const narrowX = (x, factor) => cx + (x - cx) * factor;

    const hip = [
      narrowX(leg.hip[0], 0.72),
      leg.hip[1] + 1
    ];

    const knee = [
      narrowX(leg.knee[0], 0.42),
      leg.knee[1] + 1
    ];

    const toe = [
      narrowX(leg.toe[0], 0.18),
      leg.toe[1]
    ];

    drawVerticalSegment(ctx, thigh, hip, knee, {
      lengthFactor: 0.82,
      scale: 0.96,
      widthScale: 0.82
    });

    drawVerticalSegment(ctx, shin, knee, toe, {
      lengthFactor: 0.90,
      scale: 0.99,
      widthScale: 0.91
    });
  }

  function drawArm(ctx, joints, side) {
    const upper = side === 'screen-left'
      ? images.screenLeftUpperArm
      : images.screenRightUpperArm;

    const lower = side === 'screen-left'
      ? images.screenLeftLowerArm
      : images.screenRightLowerArm;

    // A tiny depth scale reinforces forward/back motion without making
    // the arms appear to grow and shrink dramatically.
    const depthScale = 1 + Math.max(-0.035, Math.min(0.035, joints.forward * 0.0025));

    drawVerticalSegment(ctx, upper, joints.shoulder, joints.elbow, {
      lengthFactor: 0.83,
      scale: 1.02 * depthScale
    });

    drawVerticalSegment(ctx, lower, joints.elbow, joints.hand, {
      lengthFactor: 0.86,
      scale: 0.98 * depthScale
    });
  }

  function drawPose(ctx, pose, options = {}) {
    if (!ready) return;

    const debug = Boolean(options.debug);
    const bob = pose.bob;
    const cx = pose.pelvisX;

    const headCenter = [cx, 71 + bob];
    const torsoCenter = [cx, 111 + bob];
    const pelvisCenter = [cx, 143 + bob];
    const arms = armJoints(pose);

    ctx.save();
    ctx.imageSmoothingEnabled = true;

    drawCentered(
      ctx,
      images.ponytail,
      [
        cx + 12 + pose.ponytail.x * 0.55,
        60 + bob + pose.ponytail.y
      ],
      0.115,
      {
        anchorX: 0.36,
        anchorY: 0.20,
        rotate: -pose.ponytail.x * 0.008
      }
    );

    const rearLegSide = pose.support === 'screen-left'
      ? 'screen-right'
      : 'screen-left';

    const frontLegSide = pose.support === 'screen-left'
      ? 'screen-left'
      : 'screen-right';

    const frontArmSide = arms.screenLeft.forward >= arms.screenRight.forward
      ? 'screen-left'
      : 'screen-right';

    const rearArmSide = frontArmSide === 'screen-left'
      ? 'screen-right'
      : 'screen-left';

    drawLeg(ctx, pose, rearLegSide);

    drawArm(
      ctx,
      arms[rearArmSide === 'screen-left' ? 'screenLeft' : 'screenRight'],
      rearArmSide
    );

    drawCentered(ctx, images.torso, torsoCenter, 0.210, {
      anchorX: 0.50,
      anchorY: 0.51,
      rotate: pose.shoulderTilt * -0.008
    });

    // Widen the pelvis slightly from 0.7.7 for better thigh separation.
    drawCentered(ctx, images.pelvis, pelvisCenter, 0.175, {
      anchorX: 0.50,
      anchorY: 0.54,
      scaleX: 0.90,
      rotate: pose.hipTilt * 0.010
    });

    drawLeg(ctx, pose, frontLegSide);

    drawArm(
      ctx,
      arms[frontArmSide === 'screen-left' ? 'screenLeft' : 'screenRight'],
      frontArmSide
    );

    drawCentered(ctx, images.head, headCenter, 0.180, {
      anchorX: 0.50,
      anchorY: 0.43,
      rotate: pose.shoulderTilt * -0.004
    });

    if (debug) {
      Skeleton.drawPose(ctx, pose, {
        debug: true,
        showGround: true
      });
    }

    ctx.restore();
  }

  function renderAtlas(canvas, debug = false) {
    canvas.width = Skeleton.FRAME_W * Skeleton.SOUTH_POSES.length;
    canvas.height = Skeleton.FRAME_H;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    Skeleton.SOUTH_POSES.forEach((pose, index) => {
      ctx.save();
      ctx.translate(index * Skeleton.FRAME_W, 0);
      drawPose(ctx, pose, { debug });
      ctx.restore();
    });
  }

  window.AvendorFemalePaintedSouthRig = Object.freeze({
    version: '0.7.8',
    load,
    drawPose,
    renderAtlas,

    get ready() {
      return ready;
    }
  });
})();
