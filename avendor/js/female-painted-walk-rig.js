(() => {
  'use strict';

  const Skeleton = window.AvendorFemaleSouthRig;
  if (!Skeleton) throw new Error('female-skeletal-walk-rig.js must load before female-painted-walk-rig.js.');

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
      image.src = `${BASE}${file}?v=0.7.0`;
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
    ctx.scale(scale, scale);
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
    ctx.scale(scale * (options.flipX ? -1 : 1), scale);
    const anchorX = image.naturalWidth * (options.anchorX ?? 0.5);
    const anchorY = image.naturalHeight * (options.anchorY ?? 0.5);
    ctx.drawImage(image, -anchorX, -anchorY);
    ctx.restore();
  }

  function armJoints(pose) {
    const bob = pose.bob;
    const cx = pose.pelvisX;
    const shoulderY = 92 + bob;
    const leftShoulder = [cx - 18, shoulderY + pose.shoulderTilt];
    const rightShoulder = [cx + 18, shoulderY - pose.shoulderTilt];

    const rightAdvance = (pose.screenRight.toe[0] - cx) - (cx - pose.screenLeft.toe[0]);
    const swing = Math.max(-12, Math.min(12, rightAdvance * 0.55));

    function make(shoulder, localSwing, sideSign) {
      const elbow = [shoulder[0] + sideSign * (7 + localSwing * 0.25), shoulder[1] + 26 + bob];
      const hand = [elbow[0] + sideSign * (4 + localSwing * 0.16), elbow[1] + 26];
      return { shoulder, elbow, hand };
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
    drawVerticalSegment(ctx, thigh, leg.hip, leg.knee, { lengthFactor: 0.80, scale: 1.08 });
    drawVerticalSegment(ctx, shin, leg.knee, leg.toe, { lengthFactor: 0.88, scale: 1.03 });
  }

  function drawArm(ctx, joints, side) {
    const upper = side === 'screen-left' ? images.screenLeftUpperArm : images.screenRightUpperArm;
    const lower = side === 'screen-left' ? images.screenLeftLowerArm : images.screenRightLowerArm;
    drawVerticalSegment(ctx, upper, joints.shoulder, joints.elbow, { lengthFactor: 0.83, scale: 1.05 });
    drawVerticalSegment(ctx, lower, joints.elbow, joints.hand, { lengthFactor: 0.86, scale: 1.00 });
  }

  function drawPose(ctx, pose, options = {}) {
    if (!ready) return;
    const debug = Boolean(options.debug);
    const bob = pose.bob;
    const cx = pose.pelvisX;
    const headCenter = [cx, 54 + bob];
    const torsoCenter = [cx, 111 + bob];
    const pelvisCenter = [cx, 143 + bob];
    const arms = armJoints(pose);

    ctx.save();
    ctx.imageSmoothingEnabled = true;

    drawCentered(ctx, images.ponytail,
      [cx + 12 + pose.ponytail.x * 0.55, 53 + bob + pose.ponytail.y],
      0.115,
      { anchorX: 0.36, anchorY: 0.20, rotate: -pose.ponytail.x * 0.008 }
    );

    const rearSide = pose.support === 'screen-left' ? 'screen-right' : 'screen-left';
    const frontSide = pose.support === 'screen-left' ? 'screen-left' : 'screen-right';

    drawLeg(ctx, pose, rearSide);
    drawArm(ctx, arms[rearSide === 'screen-left' ? 'screenLeft' : 'screenRight'], rearSide);

    drawCentered(ctx, images.torso, torsoCenter, 0.205, {
      anchorX: 0.50,
      anchorY: 0.51,
      rotate: pose.shoulderTilt * -0.008
    });

    drawCentered(ctx, images.pelvis, pelvisCenter, 0.175, {
      anchorX: 0.50,
      anchorY: 0.54,
      rotate: pose.hipTilt * 0.010
    });

    drawLeg(ctx, pose, frontSide);
    drawArm(ctx, arms[frontSide === 'screen-left' ? 'screenLeft' : 'screenRight'], frontSide);

    drawCentered(ctx, images.head, headCenter, 0.185, {
      anchorX: 0.50,
      anchorY: 0.48,
      rotate: pose.shoulderTilt * -0.004
    });

    if (debug) {
      Skeleton.drawPose(ctx, pose, { debug: true, showGround: true });
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
    version: '0.7.0',
    load,
    drawPose,
    renderAtlas,
    get ready() { return ready; }
  });
})();