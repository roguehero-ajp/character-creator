(() => {
  'use strict';

  const Skeleton = window.AvendorFemaleSERig;
  if (!Skeleton) {
    throw new Error('female-skeletal-walk-rig-se.js must load before female-painted-walk-rig-se.js.');
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
      image.onerror = () => reject(new Error(`Could not load painted rig asset: ${BASE}${file}`));
      image.src = `${BASE}${file}?v=0.8.5`;
    });
  }

  async function load() {
    await Promise.all(Object.entries(PART_FILES).map(([name, file]) => loadImage(name, file)));
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
    if (options.rotate) ctx.rotate(options.rotate);
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

    // Stronger SE shoulder depth: screen-right recedes, screen-left advances.
    const rearShoulder = [cx + 15, 90 + bob - pose.shoulderTilt * 1.10];
    const frontShoulder = [cx - 11, 94 + bob + pose.shoulderTilt * 1.10];

    function make(shoulder, swing, sideSign) {
      return {
        shoulder,
        elbow: [
          shoulder[0] + sideSign * 2 + swing * 0.15,
          shoulder[1] + 24 + swing * 0.10
        ],
        hand: [
          shoulder[0] + sideSign * 3 + swing * 0.34,
          shoulder[1] + 49 + swing * 0.34
        ],
        forward: swing
      };
    }

    return {
      rear: make(rearShoulder, -pose.armSwing, 1),
      front: make(frontShoulder, pose.armSwing, -1)
    };
  }

  function drawLeg(ctx, pose, side, depthScale) {
    const leg = side === 'screen-left' ? pose.screenLeft : pose.screenRight;
    const thigh = side === 'screen-left' ? images.screenLeftThigh : images.screenRightThigh;
    const shin = side === 'screen-left' ? images.screenLeftShinBoot : images.screenRightShinBoot;

    // Preserve the SE depth/read while straightening the visible leg axes.
    // The gait still advances diagonally, but the limbs no longer lean with it.
    const knee = [
      leg.hip[0] + (leg.knee[0] - leg.hip[0]) * 0.35,
      leg.knee[1]
    ];
    const toe = [
      leg.hip[0] + (leg.toe[0] - leg.hip[0]) * 0.18,
      leg.toe[1]
    ];

    drawVerticalSegment(ctx, thigh, leg.hip, knee, {
      lengthFactor: 0.82,
      scale: 0.95 * depthScale,
      widthScale: side === 'screen-left' ? 0.84 : 0.78
    });

    drawVerticalSegment(ctx, shin, knee, toe, {
      lengthFactor: 0.90,
      scale: 0.98 * depthScale,
      widthScale: side === 'screen-left' ? 0.93 : 0.87
    });
  }

  function drawArm(ctx, joints, side, depthScale) {
    const upper = side === 'screen-left' ? images.screenLeftUpperArm : images.screenRightUpperArm;
    const lower = side === 'screen-left' ? images.screenLeftLowerArm : images.screenRightLowerArm;
    drawVerticalSegment(ctx, upper, joints.shoulder, joints.elbow, {
      lengthFactor: 0.83,
      scale: 1.00 * depthScale,
      widthScale: side === 'screen-left' ? 0.88 : 0.96
    });
    drawVerticalSegment(ctx, lower, joints.elbow, joints.hand, {
      lengthFactor: 0.86,
      scale: 0.97 * depthScale,
      widthScale: side === 'screen-left' ? 0.90 : 0.98
    });
  }

  function drawPose(ctx, pose, options = {}) {
    if (!ready) return;

    const debug = Boolean(options.debug);
    const bob = pose.bob;
    const cx = pose.pelvisX;
    const arms = armJoints(pose);

    const headCenter = [cx + 7, 71 + bob];
    const torsoCenter = [cx + 3, 111 + bob];
    const pelvisCenter = [cx + 2, 143 + bob];

    ctx.save();
    ctx.imageSmoothingEnabled = true;

    drawCentered(
      ctx,
      images.ponytail,
      [cx - 6 + pose.ponytail.x * 0.36, 61 + bob + pose.ponytail.y],
      0.107,
      {
        anchorX: 0.40,
        anchorY: 0.20,
        scaleX: 0.93,
        rotate: -0.19 - pose.ponytail.x * 0.006
      }
    );

    // Rear body parts for SE: screen-right leg and screen-right arm.
    drawLeg(ctx, pose, 'screen-right', 0.90);
    drawArm(ctx, arms.rear, 'screen-right', 0.90);

    // Turn the torso farther toward SE without changing the locked South art.
    drawCentered(ctx, images.torso, torsoCenter, 0.205, {
      anchorX: 0.53,
      anchorY: 0.51,
      scaleX: 0.76,
      flipX: true,
      rotate: -0.045 + pose.shoulderTilt * -0.003
    });

    drawCentered(ctx, images.pelvis, pelvisCenter, 0.172, {
      anchorX: 0.51,
      anchorY: 0.54,
      scaleX: 0.83,
      rotate: -0.030 + pose.hipTilt * 0.004
    });

    // Front body parts for SE: screen-left leg and screen-left arm.
    drawLeg(ctx, pose, 'screen-left', 1.03);
    drawArm(ctx, arms.front, 'screen-left', 1.03);

    // Increase the three-quarter head read so the screen-left eye dominates.
    drawCentered(ctx, images.head, headCenter, 0.174, {
      anchorX: 0.62,
      anchorY: 0.43,
      scaleX: 0.70,
      rotate: -0.080 + pose.shoulderTilt * -0.0015
    });

    if (debug) {
      Skeleton.drawPose(ctx, pose, { debug: true, showGround: true });
    }

    ctx.restore();
  }

  function renderAtlas(canvas, debug = false) {
    canvas.width = Skeleton.FRAME_W * Skeleton.SE_POSES.length;
    canvas.height = Skeleton.FRAME_H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    Skeleton.SE_POSES.forEach((pose, index) => {
      ctx.save();
      ctx.translate(index * Skeleton.FRAME_W, 0);
      drawPose(ctx, pose, { debug });
      ctx.restore();
    });
  }

  window.AvendorFemalePaintedSERig = Object.freeze({
    version: '0.8.5',
    load,
    drawPose,
    renderAtlas,
    get ready() {
      return ready;
    }
  });
})();
