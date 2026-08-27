(() => {
  'use strict';

  const Skeleton = window.AvendorFemaleEWRig;
  if (!Skeleton) {
    throw new Error('female-skeletal-walk-rig-ew.js must load before female-painted-walk-rig-ew.js.');
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
      image.src = `${BASE}${file}?v=0.9.2`;
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

  function traceProfile(ctx, w, h) {
    ctx.beginPath();
    ctx.moveTo(-w * 0.24, h * 0.38);
    ctx.bezierCurveTo(-w * 0.37, h * 0.25, -w * 0.39, -h * 0.14, -w * 0.28, -h * 0.32);
    ctx.bezierCurveTo(-w * 0.17, -h * 0.46, w * 0.07, -h * 0.47, w * 0.18, -h * 0.34);
    ctx.bezierCurveTo(w * 0.25, -h * 0.26, w * 0.27, -h * 0.13, w * 0.29, -h * 0.07);
    ctx.bezierCurveTo(w * 0.31, -h * 0.01, w * 0.42, h * 0.015, w * 0.45, h * 0.055);
    ctx.bezierCurveTo(w * 0.43, h * 0.085, w * 0.36, h * 0.095, w * 0.33, h * 0.115);
    ctx.bezierCurveTo(w * 0.35, h * 0.145, w * 0.39, h * 0.155, w * 0.375, h * 0.18);
    ctx.bezierCurveTo(w * 0.36, h * 0.205, w * 0.395, h * 0.22, w * 0.365, h * 0.245);
    ctx.bezierCurveTo(w * 0.33, h * 0.31, w * 0.27, h * 0.375, w * 0.17, h * 0.405);
    ctx.bezierCurveTo(w * 0.04, h * 0.45, -w * 0.10, h * 0.455, -w * 0.24, h * 0.38);
    ctx.closePath();
  }

  function drawProfileHead(ctx, image, center, scale, options = {}) {
    if (!image) return;

    const w = image.naturalWidth;
    const h = image.naturalHeight;
    const scaleX = options.scaleX ?? 0.94;
    const scaleY = options.scaleY ?? 1;

    ctx.save();
    ctx.translate(center[0], center[1]);
    if (options.rotate) ctx.rotate(options.rotate);
    ctx.scale(scale * scaleX, scale * scaleY);

    // Authored East-facing silhouette: curved rear skull, forehead, nose,
    // lips and chin. The source painting supplies near-side skin/hair texture
    // inside the shape rather than being visibly chopped in half.
    traceProfile(ctx, w, h);
    ctx.fillStyle = '#bd8068';
    ctx.fill();

    ctx.save();
    traceProfile(ctx, w, h);
    ctx.clip();
    ctx.drawImage(
      image,
      w * 0.36, h * 0.05, w * 0.59, h * 0.90,
      -w * 0.18, -h * 0.43, w * 0.61, h * 0.88
    );
    ctx.restore();

    // Rear hair cap keeps the ponytail visually behind the skull.
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = '#4b312c';
    ctx.beginPath();
    ctx.moveTo(-w * 0.25, h * 0.34);
    ctx.bezierCurveTo(-w * 0.36, h * 0.16, -w * 0.37, -h * 0.17, -w * 0.27, -h * 0.32);
    ctx.bezierCurveTo(-w * 0.15, -h * 0.45, w * 0.04, -h * 0.45, w * 0.15, -h * 0.34);
    ctx.bezierCurveTo(w * 0.07, -h * 0.26, -w * 0.015, -h * 0.20, -w * 0.07, -h * 0.10);
    ctx.bezierCurveTo(-w * 0.10, h * 0.07, -w * 0.11, h * 0.23, -w * 0.06, h * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // One visible eye only. West mirrors this exact authored East head.
    ctx.fillStyle = '#3a2725';
    ctx.strokeStyle = '#3a2725';
    ctx.lineCap = 'round';
    ctx.lineWidth = w * 0.016;
    ctx.beginPath();
    ctx.moveTo(w * 0.07, -h * 0.165);
    ctx.quadraticCurveTo(w * 0.125, -h * 0.185, w * 0.18, -h * 0.16);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(w * 0.145, -h * 0.105, w * 0.028, h * 0.012, -0.08, 0, Math.PI * 2);
    ctx.fill();

    // Painted contour accents strengthen the side-profile read at sprite size.
    ctx.strokeStyle = 'rgba(103, 59, 50, 0.78)';
    ctx.lineWidth = w * 0.013;
    ctx.beginPath();
    ctx.moveTo(w * 0.205, -h * 0.075);
    ctx.quadraticCurveTo(w * 0.285, -h * 0.015, w * 0.325, h * 0.05);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.315, h * 0.18);
    ctx.quadraticCurveTo(w * 0.35, h * 0.19, w * 0.375, h * 0.18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.27, h * 0.31);
    ctx.quadraticCurveTo(w * 0.235, h * 0.345, w * 0.18, h * 0.36);
    ctx.stroke();

    traceProfile(ctx, w, h);
    ctx.strokeStyle = 'rgba(58, 39, 37, 0.82)';
    ctx.lineWidth = w * 0.012;
    ctx.stroke();

    ctx.restore();
  }

  function armJoints(pose, side) {
    const isLeft = side === 'screen-left';
    const leg = isLeft ? pose.screenLeft : pose.screenRight;
    const other = isLeft ? pose.screenRight : pose.screenLeft;
    const legAdvance = leg.toe[0] - other.toe[0];
    const cx = pose.pelvisX;
    const shoulder = [cx + (isLeft ? -2 : 2), 92 + pose.bob + (isLeft ? 1 : -1)];
    const handTravel = Math.max(-18, Math.min(18, legAdvance * -0.46));
    return {
      shoulder,
      elbow: [shoulder[0] + handTravel * 0.50, shoulder[1] + 25],
      hand: [shoulder[0] + handTravel, shoulder[1] + 50]
    };
  }

  function drawLeg(ctx, pose, side, depthScale) {
    const leg = side === 'screen-left' ? pose.screenLeft : pose.screenRight;
    const thigh = side === 'screen-left' ? images.screenLeftThigh : images.screenRightThigh;
    const shin = side === 'screen-left' ? images.screenLeftShinBoot : images.screenRightShinBoot;

    drawVerticalSegment(ctx, thigh, leg.hip, leg.knee, {
      lengthFactor: 0.82,
      scale: 0.96 * depthScale,
      widthScale: 0.68
    });
    drawVerticalSegment(ctx, shin, leg.knee, leg.toe, {
      lengthFactor: 0.90,
      scale: 0.99 * depthScale,
      widthScale: 0.78
    });
  }

  function drawArm(ctx, pose, side, depthScale) {
    const joints = armJoints(pose, side);
    const upper = side === 'screen-left' ? images.screenLeftUpperArm : images.screenRightUpperArm;
    const lower = side === 'screen-left' ? images.screenLeftLowerArm : images.screenRightLowerArm;

    drawVerticalSegment(ctx, upper, joints.shoulder, joints.elbow, {
      lengthFactor: 0.83,
      scale: 1.00 * depthScale,
      widthScale: 0.78
    });
    drawVerticalSegment(ctx, lower, joints.elbow, joints.hand, {
      lengthFactor: 0.86,
      scale: 0.98 * depthScale,
      widthScale: 0.82
    });
  }

  function drawEastPose(ctx, pose, options = {}) {
    if (!ready) return;

    const debug = Boolean(options.debug);
    const bob = pose.bob;
    const cx = pose.pelvisX;
    const rightLegFront = pose.screenRight.toe[0] > pose.screenLeft.toe[0];
    const rearLegSide = rightLegFront ? 'screen-left' : 'screen-right';
    const frontLegSide = rightLegFront ? 'screen-right' : 'screen-left';
    const rearArmSide = rightLegFront ? 'screen-right' : 'screen-left';
    const frontArmSide = rightLegFront ? 'screen-left' : 'screen-right';

    ctx.save();
    ctx.imageSmoothingEnabled = true;

    drawCentered(
      ctx,
      images.ponytail,
      [cx - 8 + pose.ponytail.x * 0.45, 61 + bob + pose.ponytail.y],
      0.106,
      {
        anchorX: 0.42,
        anchorY: 0.20,
        scaleX: 0.86,
        rotate: -0.22 - pose.ponytail.x * 0.005
      }
    );

    drawLeg(ctx, pose, rearLegSide, 0.88);
    drawArm(ctx, pose, rearArmSide, 0.88);

    drawCentered(ctx, images.torso, [cx + 2, 111 + bob], 0.205, {
      anchorX: 0.56,
      anchorY: 0.51,
      scaleX: 0.58,
      flipX: true,
      rotate: -0.055 + pose.shoulderTilt * -0.002
    });

    drawCentered(ctx, images.pelvis, [cx + 1, 143 + bob], 0.171, {
      anchorX: 0.54,
      anchorY: 0.54,
      scaleX: 0.62,
      rotate: -0.025 + pose.hipTilt * 0.003
    });

    drawLeg(ctx, pose, frontLegSide, 1.02);
    drawArm(ctx, pose, frontArmSide, 1.02);

    drawProfileHead(ctx, images.head, [cx + 3, 71 + bob], 0.174, {
      scaleX: 0.94,
      scaleY: 1.00,
      rotate: -0.095 + pose.shoulderTilt * -0.001
    });

    if (debug) {
      Skeleton.drawPose(ctx, pose, 'east', { debug: true, showGround: true });
    }

    ctx.restore();
  }

  function drawPose(ctx, pose, direction = 'east', options = {}) {
    if (direction === 'west') {
      ctx.save();
      ctx.translate(Skeleton.FRAME_W, 0);
      ctx.scale(-1, 1);
      drawEastPose(ctx, pose, options);
      ctx.restore();
      return;
    }
    drawEastPose(ctx, pose, options);
  }

  function renderAtlas(canvas, direction = 'east', debug = false) {
    canvas.width = Skeleton.FRAME_W * Skeleton.EAST_POSES.length;
    canvas.height = Skeleton.FRAME_H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    Skeleton.EAST_POSES.forEach((pose, index) => {
      ctx.save();
      ctx.translate(index * Skeleton.FRAME_W, 0);
      drawPose(ctx, pose, direction, { debug });
      ctx.restore();
    });
  }

  window.AvendorFemalePaintedEWRig = Object.freeze({
    version: '0.9.2',
    load,
    drawPose,
    renderAtlas,
    get ready() {
      return ready;
    }
  });
})();
