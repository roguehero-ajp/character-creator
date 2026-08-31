(() => {
  'use strict';

  const FRAME_W = 128;
  const FRAME_H = 240;
  const FLOOR_Y = 226;
  const LAB_VERSION = '0.2.0';
  const UI_VERSION = '0.5.1';
  const BASE_WALK_POSE_MS = 110;

  const canvas = document.getElementById('hero-animation-canvas');
  const ctx = canvas?.getContext('2d');
  const poseStrip = document.getElementById('lab-pose-strip');
  const sliderGrid = document.getElementById('lab-sliders');
  const measurementGrid = document.getElementById('lab-measurements');
  const status = document.getElementById('lab-status');
  const output = document.getElementById('lab-output');
  const playButton = document.getElementById('lab-play');
  const onionToggle = document.getElementById('lab-onion');
  const prevButton = document.getElementById('lab-prev');
  const nextButton = document.getElementById('lab-next');
  const resetPoseButton = document.getElementById('lab-reset-pose');
  const resetAllButton = document.getElementById('lab-reset-all');
  const copyButton = document.getElementById('lab-copy');
  const viewModeButtons = [...document.querySelectorAll('[data-view-mode]')];
  const bodyStyleButtons = [...document.querySelectorAll('[data-body-style]')];
  const bodyOpacityInput = document.getElementById('lab-body-opacity');
  const bodyOpacityValue = document.getElementById('lab-body-opacity-value');
  const speedInput = document.getElementById('lab-speed');
  const speedValue = document.getElementById('lab-speed-value');

  if (!canvas || !ctx || !poseStrip || !sliderGrid || !measurementGrid || !output) return;

  const MEASUREMENTS = Object.freeze({
    headRadius: 17,
    neck: 8,
    torso: 55,
    shoulderHalfWidth: 4,
    hipHalfWidth: 3,
    upperArm: 38,
    forearm: 35,
    thigh: 52,
    shin: 50,
    foot: 24
  });

  const BODY_PALETTE = Object.freeze({
    outline: '#171617',
    hair: '#4a3025',
    hairShadow: '#322018',
    skin: '#c68e63',
    skinShadow: '#9d6949',
    shirt: '#d8c8a8',
    shirtShadow: '#a99a80',
    tunic: '#7c4930',
    tunicShadow: '#563224',
    trousers: '#454b50',
    trousersShadow: '#30353a',
    boot: '#30251f',
    bootShadow: '#1e1916',
    belt: '#3b271d'
  });

  // 0.5.1 is intentionally a lab-only near-final skin: recognisable hero identity,
  // clean articulated parts, but no production atlas pixels are copied or modified.
  const HERO_PALETTE = Object.freeze({
    outline: '#211711',
    outlineSoft: '#38261b',
    hair: '#4b3022',
    hairShadow: '#2d1d16',
    hairLight: '#76503a',
    skin: '#ca936c',
    skinShadow: '#9d6749',
    skinLight: '#e0b089',
    shirt: '#d6c39b',
    shirtShadow: '#9b896c',
    shirtLight: '#ead9b5',
    tunic: '#7b4d34',
    tunicShadow: '#503124',
    tunicLight: '#a46d4a',
    trousers: '#454b4f',
    trousersShadow: '#303438',
    trousersLight: '#62696d',
    boot: '#3b2b21',
    bootShadow: '#241a15',
    bootLight: '#5d4432',
    belt: '#3a251a',
    buckle: '#ad8a4d'
  });

  const GHOST_PALETTE = Object.freeze({
    outline: 'rgba(118,220,237,.38)', outlineSoft: 'rgba(118,220,237,.25)',
    hair: 'rgba(94,180,194,.22)', hairShadow: 'rgba(94,180,194,.16)', hairLight: 'rgba(126,219,235,.22)',
    skin: 'rgba(126,219,235,.24)', skinShadow: 'rgba(126,219,235,.17)', skinLight: 'rgba(126,219,235,.27)',
    shirt: 'rgba(126,219,235,.18)', shirtShadow: 'rgba(126,219,235,.13)', shirtLight: 'rgba(126,219,235,.21)',
    tunic: 'rgba(126,219,235,.20)', tunicShadow: 'rgba(126,219,235,.14)', tunicLight: 'rgba(126,219,235,.22)',
    trousers: 'rgba(126,219,235,.17)', trousersShadow: 'rgba(126,219,235,.12)', trousersLight: 'rgba(126,219,235,.20)',
    boot: 'rgba(126,219,235,.15)', bootShadow: 'rgba(126,219,235,.10)', bootLight: 'rgba(126,219,235,.18)',
    belt: 'rgba(126,219,235,.18)', buckle: 'rgba(126,219,235,.22)'
  });

  const POSE_ORDER = Object.freeze([
    'idle',
    'walk1', 'walk2', 'walk3', 'walk4',
    'walk5', 'walk6', 'walk7', 'walk8'
  ]);

  const POSE_LABELS = Object.freeze({
    idle: 'Idle',
    walk1: 'W1', walk2: 'W2', walk3: 'W3', walk4: 'W4',
    walk5: 'W5', walk6: 'W6', walk7: 'W7', walk8: 'W8'
  });

  // Fallback pose data is kept byte-for-value aligned with male-east-west-candidate-0.2.json.
  const DEFAULT_POSES = Object.freeze({
    idle: Object.freeze({
      pelvisY: 126, torsoLean: 1, headForward: 4,
      nearUpperArm: 4, nearForearm: 16, farUpperArm: -5, farForearm: -2,
      nearThigh: 2, nearShin: 0, farThigh: -3, farShin: 2,
      nearFoot: 0, farFoot: 0
    }),
    walk1: Object.freeze({
      pelvisY: 124, torsoLean: 2, headForward: 5,
      nearUpperArm: -22, nearForearm: -12, farUpperArm: 22, farForearm: 29,
      nearThigh: 22, nearShin: -5, farThigh: -8, farShin: -5,
      nearFoot: 0, farFoot: 4
    }),
    walk2: Object.freeze({
      pelvisY: 125, torsoLean: 3, headForward: 5,
      nearUpperArm: -16, nearForearm: -8, farUpperArm: 16, farForearm: 21,
      nearThigh: 35, nearShin: 6, farThigh: -8, farShin: -13,
      nearFoot: 1, farFoot: 2
    }),
    walk3: Object.freeze({
      pelvisY: 124, torsoLean: 2, headForward: 5,
      nearUpperArm: -8, nearForearm: -4, farUpperArm: 8, farForearm: 4,
      nearThigh: 21, nearShin: 7, farThigh: 0, farShin: -12,
      nearFoot: 3, farFoot: -2
    }),
    walk4: Object.freeze({
      pelvisY: 123, torsoLean: 1, headForward: 4,
      nearUpperArm: 10, nearForearm: 26, farUpperArm: -6, farForearm: 9,
      nearThigh: 11, nearShin: -8, farThigh: -1, farShin: -5,
      nearFoot: 5, farFoot: 0
    }),
    walk5: Object.freeze({
      pelvisY: 122, torsoLean: 2, headForward: 5,
      nearUpperArm: 7, nearForearm: 36, farUpperArm: -22, farForearm: -11,
      nearThigh: 3, nearShin: -9, farThigh: 23, farShin: 9,
      nearFoot: 4, farFoot: 5
    }),
    walk6: Object.freeze({
      pelvisY: 125, torsoLean: 3, headForward: 5,
      nearUpperArm: 5, nearForearm: 23, farUpperArm: -16, farForearm: -8,
      nearThigh: -7, nearShin: -10, farThigh: 33, farShin: 14,
      nearFoot: 2, farFoot: 1
    }),
    walk7: Object.freeze({
      pelvisY: 127, torsoLean: 2, headForward: 5,
      nearUpperArm: 8, nearForearm: 15, farUpperArm: -8, farForearm: -4,
      nearThigh: -7, nearShin: -12, farThigh: 26, farShin: 4,
      nearFoot: -2, farFoot: 3
    }),
    walk8: Object.freeze({
      pelvisY: 124, torsoLean: 1, headForward: 4,
      nearUpperArm: -8, nearForearm: -4, farUpperArm: 8, farForearm: 4,
      nearThigh: 16, nearShin: -8, farThigh: 6, farShin: -4,
      nearFoot: 0, farFoot: 5
    })
  });

  const CONTROL_DEFS = Object.freeze([
    ['pelvisY', 'Pelvis height', 122, 130, 1, 'px'],
    ['torsoLean', 'Torso lean', -8, 8, 1, '°'],
    ['headForward', 'Head forward', -4, 10, 1, 'px'],
    ['nearUpperArm', 'Near upper arm', -40, 40, 1, '°'],
    ['nearForearm', 'Near forearm', -40, 40, 1, '°'],
    ['farUpperArm', 'Far upper arm', -40, 40, 1, '°'],
    ['farForearm', 'Far forearm', -40, 40, 1, '°'],
    ['nearThigh', 'Near thigh', -35, 35, 1, '°'],
    ['nearShin', 'Near shin', -25, 35, 1, '°'],
    ['farThigh', 'Far thigh', -35, 35, 1, '°'],
    ['farShin', 'Far shin', -25, 35, 1, '°'],
    ['nearFoot', 'Near foot', -15, 15, 1, '°'],
    ['farFoot', 'Far foot', -15, 15, 1, '°']
  ]);

  const cloneDefaultPoses = () => Object.fromEntries(
    POSE_ORDER.map((id) => [id, { ...DEFAULT_POSES[id] }])
  );

  let poses = cloneDefaultPoses();
  let selectedPoseId = 'idle';
  let playing = false;
  let lastPlaybackAt = performance.now();
  let viewMode = 'both';
  let bodyStyle = 'hero';
  let bodyOpacity = 0.90;
  let speedPercent = 100;
  const sliderRecords = new Map();

  function radians(degrees) {
    return degrees * Math.PI / 180;
  }

  function fromDown(origin, length, degrees) {
    const angle = radians(degrees);
    return {
      x: origin.x + Math.sin(angle) * length,
      y: origin.y + Math.cos(angle) * length
    };
  }

  function fromUp(origin, length, degrees) {
    const angle = radians(degrees);
    return {
      x: origin.x + Math.sin(angle) * length,
      y: origin.y - Math.cos(angle) * length
    };
  }

  function footTip(ankle, length, degrees) {
    const angle = radians(degrees);
    return {
      x: ankle.x + Math.cos(angle) * length,
      y: ankle.y + Math.sin(angle) * length
    };
  }

  function buildSkeleton(pose) {
    const pelvis = { x: FRAME_W / 2, y: pose.pelvisY };
    const shoulder = fromUp(pelvis, MEASUREMENTS.torso, pose.torsoLean);
    const neck = fromUp(shoulder, MEASUREMENTS.neck, pose.torsoLean);
    const headBase = fromUp(neck, MEASUREMENTS.headRadius, pose.torsoLean);
    const head = { x: headBase.x + pose.headForward, y: headBase.y };

    const nearShoulder = { x: shoulder.x + MEASUREMENTS.shoulderHalfWidth, y: shoulder.y };
    const farShoulder = { x: shoulder.x - MEASUREMENTS.shoulderHalfWidth, y: shoulder.y + 1 };
    const nearHip = { x: pelvis.x + MEASUREMENTS.hipHalfWidth, y: pelvis.y };
    const farHip = { x: pelvis.x - MEASUREMENTS.hipHalfWidth, y: pelvis.y + 1 };

    const nearElbow = fromDown(nearShoulder, MEASUREMENTS.upperArm, pose.nearUpperArm);
    const nearWrist = fromDown(nearElbow, MEASUREMENTS.forearm, pose.nearForearm);
    const farElbow = fromDown(farShoulder, MEASUREMENTS.upperArm, pose.farUpperArm);
    const farWrist = fromDown(farElbow, MEASUREMENTS.forearm, pose.farForearm);

    const nearKnee = fromDown(nearHip, MEASUREMENTS.thigh, pose.nearThigh);
    const nearAnkle = fromDown(nearKnee, MEASUREMENTS.shin, pose.nearShin);
    const farKnee = fromDown(farHip, MEASUREMENTS.thigh, pose.farThigh);
    const farAnkle = fromDown(farKnee, MEASUREMENTS.shin, pose.farShin);

    return {
      pelvis, shoulder, neck, headBase, head,
      nearShoulder, farShoulder, nearHip, farHip,
      nearElbow, nearWrist, farElbow, farWrist,
      nearKnee, nearAnkle, farKnee, farAnkle,
      nearToe: footTip(nearAnkle, MEASUREMENTS.foot, pose.nearFoot),
      farToe: footTip(farAnkle, MEASUREMENTS.foot, pose.farFoot)
    };
  }

  function line(a, b, width, color) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  function joint(point, radius, fill, alpha = ctx.globalAlpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#081014';
    ctx.stroke();
    ctx.restore();
  }

  function fillPolygon(points, fill, stroke = BODY_PALETTE.outline, lineWidth = 1.5) {
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  function pointBetween(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function segmentPolygon(a, b, startHalfWidth, endHalfWidth) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.max(0.001, Math.hypot(dx, dy));
    const px = -dy / length;
    const py = dx / length;
    return [
      { x: a.x + px * startHalfWidth, y: a.y + py * startHalfWidth },
      { x: a.x - px * startHalfWidth, y: a.y - py * startHalfWidth },
      { x: b.x - px * endHalfWidth, y: b.y - py * endHalfWidth },
      { x: b.x + px * endHalfWidth, y: b.y + py * endHalfWidth }
    ];
  }

  function drawSegment(a, b, startHalfWidth, endHalfWidth, fill, outline) {
    fillPolygon(segmentPolygon(a, b, startHalfWidth, endHalfWidth), fill, outline, 1.15);
  }

  function paletteFor(style, ghost) {
    if (ghost) return GHOST_PALETTE;
    return style === 'hero' ? HERO_PALETTE : BODY_PALETTE;
  }

  function drawProxyBody(pose, options = {}) {
    const points = buildSkeleton(pose);
    const ghost = Boolean(options.ghost);
    const alpha = options.alpha ?? bodyOpacity;
    const palette = paletteFor('proxy', ghost);

    ctx.save();
    ctx.globalAlpha = alpha;

    line(points.farHip, points.farKnee, 12, palette.trousersShadow);
    line(points.farKnee, points.farAnkle, 10, palette.trousersShadow);
    line(points.farAnkle, points.farToe, 8, palette.bootShadow);
    line(points.farShoulder, points.farElbow, 10, palette.shirtShadow);
    line(points.farElbow, points.farWrist, 8, palette.skinShadow);
    joint(points.farWrist, 4.3, palette.skinShadow);

    const torsoTopY = points.shoulder.y - 8;
    const torsoBottomY = points.pelvis.y + 14;
    fillPolygon([
      { x: points.shoulder.x - 10, y: torsoTopY },
      { x: points.shoulder.x + 11, y: torsoTopY + 1 },
      { x: points.pelvis.x + 12, y: torsoBottomY },
      { x: points.pelvis.x - 10, y: torsoBottomY - 1 }
    ], palette.tunic, palette.outline, 1.3);

    ctx.fillStyle = palette.belt;
    ctx.fillRect(points.pelvis.x - 10, points.pelvis.y + 5, 22, 4);

    line(points.nearHip, points.nearKnee, 14, palette.trousers);
    line(points.nearKnee, points.nearAnkle, 12, palette.trousers);
    line(points.nearAnkle, points.nearToe, 10, palette.boot);
    line(points.nearShoulder, points.nearElbow, 12, palette.shirt);
    line(points.nearElbow, points.nearWrist, 9, palette.skin);
    joint(points.nearWrist, 4.6, palette.skin);

    line(points.shoulder, points.neck, 7, palette.skinShadow);

    ctx.beginPath();
    ctx.ellipse(points.head.x, points.head.y, MEASUREMENTS.headRadius * .80, MEASUREMENTS.headRadius * 1.02, 0, 0, Math.PI * 2);
    ctx.fillStyle = palette.skin;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = palette.outline;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(points.head.x - 3, points.head.y - 7, MEASUREMENTS.headRadius * .76, MEASUREMENTS.headRadius * .62, -0.12, Math.PI, Math.PI * 2);
    ctx.lineTo(points.head.x - 12, points.head.y + 3);
    ctx.quadraticCurveTo(points.head.x - 7, points.head.y - 2, points.head.x - 1, points.head.y - 1);
    ctx.fillStyle = palette.hair;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(points.head.x + 10, points.head.y - 2);
    ctx.lineTo(points.head.x + 17, points.head.y + 1);
    ctx.lineTo(points.head.x + 10, points.head.y + 4);
    ctx.closePath();
    ctx.fillStyle = palette.skin;
    ctx.fill();
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1;
    ctx.stroke();

    if (!ghost) {
      ctx.fillStyle = '#1b1512';
      ctx.fillRect(Math.round(points.head.x + 8), Math.round(points.head.y - 4), 2, 2);
      ctx.strokeStyle = palette.hairShadow;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(points.head.x - 11, points.head.y + 1);
      ctx.quadraticCurveTo(points.head.x - 7, points.head.y + 7, points.head.x - 3, points.head.y + 8);
      ctx.stroke();
    }

    ctx.restore();
    return points;
  }

  function drawRoundedSegment(a, b, width, fill, outline, outlineExtra = 2.4) {
    line(a, b, width + outlineExtra, outline);
    line(a, b, width, fill);
  }

  function drawSoftJoint(point, radius, fill, outline) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius + 1.1, 0, Math.PI * 2);
    ctx.fillStyle = outline;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawEllipse(center, radiusX, radiusY, rotation, fill, outline, lineWidth = 1.2) {
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, radiusX, radiusY, rotation, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (outline) {
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = outline;
      ctx.stroke();
    }
  }

  function segmentAngle(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  function heroColors(palette, far) {
    return {
      tunic: far ? palette.tunicShadow : palette.tunic,
      shirt: far ? palette.shirtShadow : palette.shirt,
      skin: far ? palette.skinShadow : palette.skin,
      trousers: far ? palette.trousersShadow : palette.trousers,
      boot: far ? palette.bootShadow : palette.boot
    };
  }

  function drawHeroHand(elbow, wrist, fill, palette, far) {
    const angle = segmentAngle(elbow, wrist);
    const center = {
      x: wrist.x + Math.cos(angle) * 1.8,
      y: wrist.y + Math.sin(angle) * 1.8
    };
    drawEllipse(center, far ? 4.2 : 4.7, far ? 3.0 : 3.3, angle, fill, palette.outline, 1.05);
    if (!far && palette.skinLight) {
      ctx.save();
      ctx.strokeStyle = palette.skinLight;
      ctx.lineWidth = .8;
      ctx.beginPath();
      ctx.moveTo(center.x - Math.sin(angle) * 1.2, center.y + Math.cos(angle) * 1.2);
      ctx.lineTo(center.x + Math.cos(angle) * 2.4, center.y + Math.sin(angle) * 2.4);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawHeroArm(points, side, palette, far = false) {
    const shoulder = points[`${side}Shoulder`];
    const elbow = points[`${side}Elbow`];
    const wrist = points[`${side}Wrist`];
    const colors = heroColors(palette, far);
    const tunicSleeveEnd = pointBetween(shoulder, elbow, .28);
    const shirtSleeveEnd = pointBetween(shoulder, elbow, .62);

    // Rounded overlapping pieces deliberately preserve the smoother 0.4 anatomy read.
    drawRoundedSegment(shoulder, tunicSleeveEnd, far ? 9.5 : 11.5, colors.tunic, palette.outline);
    drawSoftJoint(tunicSleeveEnd, far ? 4.3 : 5.1, colors.tunic, palette.outline);
    drawRoundedSegment(tunicSleeveEnd, shirtSleeveEnd, far ? 8.0 : 9.3, colors.shirt, palette.outline);
    drawRoundedSegment(shirtSleeveEnd, elbow, far ? 7.5 : 8.6, colors.shirt, palette.outline);
    drawSoftJoint(elbow, far ? 3.7 : 4.2, colors.skin, palette.outline);
    drawRoundedSegment(elbow, wrist, far ? 6.6 : 7.5, colors.skin, palette.outline);

    // A simple rolled sleeve edge and shaped hand keep the body recognisably clothed.
    line(
      pointBetween(tunicSleeveEnd, shirtSleeveEnd, .86),
      pointBetween(tunicSleeveEnd, shirtSleeveEnd, .99),
      far ? 7.9 : 9.0,
      far ? palette.shirtShadow : palette.shirtLight
    );
    drawHeroHand(elbow, wrist, colors.skin, palette, far);
  }

  function drawHeroBoot(ankle, toe, fill, palette, far) {
    const angle = segmentAngle(ankle, toe);
    drawRoundedSegment(ankle, toe, far ? 8.8 : 10.2, fill, palette.outline, 2.2);

    // Extend the sole slightly past the toe so the planted foot reads cleanly at 128×240.
    const soleStart = {
      x: ankle.x + Math.sin(angle) * (far ? 3.7 : 4.2),
      y: ankle.y - Math.cos(angle) * (far ? 3.7 : 4.2)
    };
    const soleEnd = {
      x: toe.x + Math.cos(angle) * 2.8 + Math.sin(angle) * (far ? 3.0 : 3.5),
      y: toe.y + Math.sin(angle) * 2.8 - Math.cos(angle) * (far ? 3.0 : 3.5)
    };
    line(soleStart, soleEnd, far ? 2.2 : 2.7, palette.bootShadow);

    if (!far && palette.bootLight) {
      const shineA = pointBetween(ankle, toe, .35);
      const shineB = pointBetween(ankle, toe, .72);
      line(shineA, shineB, 1.2, palette.bootLight);
    }
  }

  function drawHeroLeg(points, side, palette, far = false) {
    const hip = points[`${side}Hip`];
    const knee = points[`${side}Knee`];
    const ankle = points[`${side}Ankle`];
    const toe = points[`${side}Toe`];
    const colors = heroColors(palette, far);
    const bootTop = pointBetween(knee, ankle, .57);

    drawRoundedSegment(hip, knee, far ? 11.0 : 13.0, colors.trousers, palette.outline);
    drawSoftJoint(knee, far ? 5.0 : 5.8, colors.trousers, palette.outline);
    drawRoundedSegment(knee, bootTop, far ? 9.5 : 11.0, colors.trousers, palette.outline);

    // Narrow at the calf and broaden at the foot, matching the current rugged-costume read.
    drawRoundedSegment(bootTop, ankle, far ? 8.5 : 9.8, colors.boot, palette.outline);
    line(pointBetween(knee, bootTop, .88), bootTop, far ? 9.1 : 10.5, palette.bootLight || colors.boot);
    drawSoftJoint(ankle, far ? 4.1 : 4.8, colors.boot, palette.outline);
    drawHeroBoot(ankle, toe, colors.boot, palette, far);

    if (!far && palette.trousersLight) {
      line(pointBetween(hip, knee, .18), pointBetween(hip, knee, .54), 1.0, palette.trousersLight);
    }
  }

  function drawHeroTorso(points, palette) {
    const shoulder = points.shoulder;
    const pelvis = points.pelvis;
    const dx = pelvis.x - shoulder.x;
    const dy = pelvis.y - shoulder.y;
    const length = Math.max(0.001, Math.hypot(dx, dy));
    const downX = dx / length;
    const downY = dy / length;
    const px = -downY;
    const py = downX;
    const frontX = -px;
    const frontY = -py;
    const backX = px;
    const backY = py;

    const chest = pointBetween(shoulder, pelvis, .30);
    const waist = pointBetween(shoulder, pelvis, .78);
    const hem = { x: pelvis.x + downX * 17, y: pelvis.y + downY * 17 };

    // Shirt underlayer gives the neck and shoulder transition a human shape.
    fillPolygon([
      { x: shoulder.x + backX * 10.5 - downX * 4, y: shoulder.y + backY * 10.5 - downY * 4 },
      { x: shoulder.x + frontX * 11.8 - downX * 3, y: shoulder.y + frontY * 11.8 - downY * 3 },
      { x: chest.x + frontX * 11.5, y: chest.y + frontY * 11.5 },
      { x: waist.x + frontX * 8.4, y: waist.y + frontY * 8.4 },
      { x: waist.x + backX * 8.0, y: waist.y + backY * 8.0 },
      { x: chest.x + backX * 9.5, y: chest.y + backY * 9.5 }
    ], palette.shirt, palette.outline, 1.25);

    // Side-profile tunic: slightly fuller at chest and hem, tucked at the belt.
    fillPolygon([
      { x: shoulder.x + backX * 9.3 + downX * 3, y: shoulder.y + backY * 9.3 + downY * 3 },
      { x: shoulder.x + frontX * 10.8 + downX * 4, y: shoulder.y + frontY * 10.8 + downY * 4 },
      { x: chest.x + frontX * 12.4, y: chest.y + frontY * 12.4 },
      { x: waist.x + frontX * 9.2, y: waist.y + frontY * 9.2 },
      { x: hem.x + frontX * 11.7, y: hem.y + frontY * 11.7 },
      { x: hem.x + backX * 10.7, y: hem.y + backY * 10.7 },
      { x: waist.x + backX * 8.5, y: waist.y + backY * 8.5 },
      { x: chest.x + backX * 9.8, y: chest.y + backY * 9.8 }
    ], palette.tunic, palette.outline, 1.45);

    // Back shadow and front highlight add volume without pretending to be final pixel art.
    ctx.save();
    ctx.strokeStyle = palette.tunicShadow;
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(chest.x + backX * 7.6, chest.y + backY * 7.6);
    ctx.lineTo(hem.x + backX * 8.2, hem.y + backY * 8.2);
    ctx.stroke();

    ctx.strokeStyle = palette.tunicLight;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(chest.x + frontX * 8.4, chest.y + frontY * 8.4);
    ctx.lineTo(waist.x + frontX * 7.1, waist.y + frontY * 7.1);
    ctx.stroke();
    ctx.restore();

    const beltCenter = pointBetween(shoulder, pelvis, .88);
    line(
      { x: beltCenter.x + backX * 9.0, y: beltCenter.y + backY * 9.0 },
      { x: beltCenter.x + frontX * 10.0, y: beltCenter.y + frontY * 10.0 },
      4.0,
      palette.belt
    );

    if (palette.buckle) {
      const buckle = { x: beltCenter.x + frontX * 7.2, y: beltCenter.y + frontY * 7.2 };
      drawEllipse(buckle, 2.2, 1.8, segmentAngle(shoulder, pelvis), palette.buckle, palette.outlineSoft, .8);
    }

    // Tiny front split gives the tunic hem a readable medieval garment edge in motion.
    const splitTop = { x: pelvis.x + downX * 9 + frontX * 5.0, y: pelvis.y + downY * 9 + frontY * 5.0 };
    const splitBottom = { x: hem.x + frontX * 4.2, y: hem.y + frontY * 4.2 };
    line(splitTop, splitBottom, 1.1, palette.tunicShadow);
  }

  function drawHeroHead(points, palette, ghost) {
    const h = points.head;

    // Neck sits inside the shirt/tunic silhouette rather than looking pasted beneath the head.
    drawRoundedSegment(points.shoulder, points.neck, 6.8, palette.skinShadow, palette.outline, 2.0);
    const neckTop = { x: h.x - 5.5, y: h.y + 11.0 };
    drawRoundedSegment(points.neck, neckTop, 7.2, palette.skin, palette.outline, 2.0);

    // Profile face. East is the authored master: forehead → nose → lips → chin → jaw.
    ctx.beginPath();
    ctx.moveTo(h.x - 7.5, h.y - 13.5);
    ctx.bezierCurveTo(h.x - 1.5, h.y - 17.5, h.x + 6.5, h.y - 15.0, h.x + 9.0, h.y - 9.0);
    ctx.quadraticCurveTo(h.x + 10.5, h.y - 5.5, h.x + 10.7, h.y - 2.8);
    ctx.quadraticCurveTo(h.x + 13.0, h.y - 1.2, h.x + 16.2, h.y + .6);
    ctx.quadraticCurveTo(h.x + 13.7, h.y + 3.2, h.x + 10.5, h.y + 3.3);
    ctx.quadraticCurveTo(h.x + 12.7, h.y + 5.1, h.x + 11.2, h.y + 6.7);
    ctx.quadraticCurveTo(h.x + 10.0, h.y + 11.4, h.x + 5.0, h.y + 14.0);
    ctx.quadraticCurveTo(h.x - 1.0, h.y + 16.8, h.x - 7.7, h.y + 10.2);
    ctx.quadraticCurveTo(h.x - 11.1, h.y + 4.2, h.x - 10.6, h.y - 4.5);
    ctx.quadraticCurveTo(h.x - 10.2, h.y - 10.4, h.x - 7.5, h.y - 13.5);
    ctx.closePath();
    ctx.fillStyle = palette.skin;
    ctx.fill();
    ctx.lineWidth = 1.45;
    ctx.strokeStyle = palette.outline;
    ctx.stroke();

    // Brown hair silhouette is deliberately closer to the in-world hero than the 0.5 cutout.
    ctx.beginPath();
    ctx.moveTo(h.x - 11.5, h.y + 6.8);
    ctx.bezierCurveTo(h.x - 16.2, h.y - 1.0, h.x - 14.0, h.y - 12.0, h.x - 5.0, h.y - 17.3);
    ctx.bezierCurveTo(h.x + 1.0, h.y - 20.0, h.x + 8.0, h.y - 16.7, h.x + 9.0, h.y - 11.0);
    ctx.lineTo(h.x + 5.0, h.y - 8.0);
    ctx.lineTo(h.x + 2.0, h.y - 10.7);
    ctx.quadraticCurveTo(h.x - 1.0, h.y - 6.3, h.x - 3.0, h.y - 2.0);
    ctx.quadraticCurveTo(h.x - 6.0, h.y + 2.0, h.x - 7.0, h.y + 8.5);
    ctx.closePath();
    ctx.fillStyle = palette.hair;
    ctx.fill();
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = palette.outline;
    ctx.stroke();

    // Fringe, nape and a small sideburn make the profile read as one head rather than two shapes.
    ctx.beginPath();
    ctx.moveTo(h.x - 7.5, h.y - 13.0);
    ctx.quadraticCurveTo(h.x - .5, h.y - 18.1, h.x + 7.6, h.y - 12.0);
    ctx.lineTo(h.x + 3.2, h.y - 7.2);
    ctx.lineTo(h.x + .3, h.y - 10.0);
    ctx.lineTo(h.x - 3.0, h.y - 4.2);
    ctx.lineTo(h.x - 7.2, h.y - 1.0);
    ctx.closePath();
    ctx.fillStyle = palette.hair;
    ctx.fill();

    ctx.strokeStyle = palette.hairShadow;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(h.x - 9.0, h.y - 1.0);
    ctx.quadraticCurveTo(h.x - 10.0, h.y + 5.4, h.x - 6.3, h.y + 9.5);
    ctx.stroke();

    if (!ghost) {
      // Eye, brow, ear and mouth are intentionally restrained at this scale.
      ctx.strokeStyle = palette.hairShadow;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(h.x + 5.8, h.y - 7.2);
      ctx.lineTo(h.x + 9.0, h.y - 7.6);
      ctx.stroke();

      ctx.fillStyle = '#211711';
      ctx.beginPath();
      ctx.arc(h.x + 7.6, h.y - 5.2, 1.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = palette.skinShadow;
      ctx.lineWidth = .9;
      ctx.beginPath();
      ctx.moveTo(h.x + 10.3, h.y + 6.3);
      ctx.quadraticCurveTo(h.x + 12.0, h.y + 6.8, h.x + 13.0, h.y + 6.0);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(h.x - 3.7, h.y + .4, 2.3, 0, Math.PI * 2);
      ctx.strokeStyle = palette.skinShadow;
      ctx.stroke();

      ctx.strokeStyle = palette.hairLight;
      ctx.lineWidth = .9;
      ctx.beginPath();
      ctx.moveTo(h.x - 9.0, h.y - 8.6);
      ctx.quadraticCurveTo(h.x - 3.0, h.y - 16.0, h.x + 3.8, h.y - 13.7);
      ctx.stroke();

      ctx.strokeStyle = palette.skinLight;
      ctx.lineWidth = .7;
      ctx.beginPath();
      ctx.moveTo(h.x + 9.8, h.y - 2.0);
      ctx.lineTo(h.x + 13.3, h.y + .3);
      ctx.stroke();
    }
  }

  function drawHeroBody(pose, options = {}) {
    const points = buildSkeleton(pose);
    const ghost = Boolean(options.ghost);
    const alpha = options.alpha ?? bodyOpacity;
    const palette = paletteFor('hero', ghost);

    ctx.save();
    ctx.globalAlpha = alpha;

    // Painter's order is intentional: far limbs, body/head, near limbs.
    drawHeroLeg(points, 'far', palette, true);
    drawHeroArm(points, 'far', palette, true);

    drawHeroTorso(points, palette);
    drawHeroHead(points, palette, ghost);

    drawHeroLeg(points, 'near', palette, false);
    drawHeroArm(points, 'near', palette, false);

    ctx.restore();
    return points;
  }

  function drawBody(pose, options = {}) {
    return bodyStyle === 'hero'
      ? drawHeroBody(pose, options)
      : drawProxyBody(pose, options);
  }

  function drawRig(pose, options = {}) {
    const points = buildSkeleton(pose);
    const alpha = options.alpha ?? 1;
    const ghost = Boolean(options.ghost);
    const nearColor = ghost ? 'rgba(126,219,235,.58)' : '#e5c880';
    const farColor = ghost ? 'rgba(126,219,235,.34)' : '#758d98';
    const bodyColor = ghost ? 'rgba(126,219,235,.46)' : '#b99b62';

    ctx.save();
    ctx.globalAlpha = alpha;

    line(points.farShoulder, points.farElbow, 5, farColor);
    line(points.farElbow, points.farWrist, 4, farColor);
    line(points.farHip, points.farKnee, 7, farColor);
    line(points.farKnee, points.farAnkle, 6, farColor);
    line(points.farAnkle, points.farToe, 4, farColor);

    line(points.pelvis, points.shoulder, 11, bodyColor);
    line(points.farShoulder, points.nearShoulder, 5, bodyColor);
    line(points.farHip, points.nearHip, 7, bodyColor);
    line(points.shoulder, points.neck, 5, bodyColor);

    line(points.nearShoulder, points.nearElbow, 6, nearColor);
    line(points.nearElbow, points.nearWrist, 5, nearColor);
    line(points.nearHip, points.nearKnee, 8, nearColor);
    line(points.nearKnee, points.nearAnkle, 7, nearColor);
    line(points.nearAnkle, points.nearToe, 5, nearColor);

    ctx.beginPath();
    ctx.ellipse(points.head.x, points.head.y, MEASUREMENTS.headRadius * .78, MEASUREMENTS.headRadius, 0, 0, Math.PI * 2);
    ctx.fillStyle = ghost ? 'rgba(126,219,235,.24)' : '#c6aa72';
    ctx.fill();
    ctx.lineWidth = ghost ? 1 : 2;
    ctx.strokeStyle = ghost ? 'rgba(126,219,235,.58)' : '#f0d599';
    ctx.stroke();

    const nose = { x: points.head.x + MEASUREMENTS.headRadius * .9, y: points.head.y + 1 };
    line({ x: points.head.x + 8, y: points.head.y - 2 }, nose, ghost ? 1 : 2, nearColor);

    if (!ghost) {
      [
        points.nearShoulder, points.nearElbow, points.nearWrist,
        points.nearHip, points.nearKnee, points.nearAnkle,
        points.farShoulder, points.farElbow, points.farWrist,
        points.farHip, points.farKnee, points.farAnkle,
        points.pelvis, points.shoulder, points.neck
      ].forEach((point) => joint(point, 2.3, '#9be8f3'));
    }

    ctx.restore();
    return points;
  }

  function previousPoseId() {
    if (selectedPoseId === 'idle') return null;
    const index = POSE_ORDER.indexOf(selectedPoseId);
    return index === 1 ? 'walk8' : POSE_ORDER[index - 1];
  }

  function currentPlaybackPoseMs() {
    return Math.max(40, BASE_WALK_POSE_MS * (100 / speedPercent));
  }

  function draw() {
    ctx.clearRect(0, 0, FRAME_W, FRAME_H);

    ctx.save();
    ctx.strokeStyle = 'rgba(190,218,224,.18)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(FRAME_W / 2, 4);
    ctx.lineTo(FRAME_W / 2, FRAME_H - 4);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(239,210,146,.55)';
    ctx.beginPath();
    ctx.moveTo(6, FLOOR_Y);
    ctx.lineTo(FRAME_W - 6, FLOOR_Y);
    ctx.stroke();
    ctx.restore();

    const previous = previousPoseId();
    if (onionToggle.checked && previous) {
      if (viewMode !== 'skeleton') drawBody(poses[previous], { ghost: true, alpha: bodyOpacity * .30 });
      if (viewMode !== 'body') drawRig(poses[previous], { ghost: true, alpha: .34 });
    }

    let points;
    if (viewMode !== 'skeleton') points = drawBody(poses[selectedPoseId], { alpha: bodyOpacity });
    if (viewMode !== 'body') points = drawRig(poses[selectedPoseId]);
    if (!points) points = buildSkeleton(poses[selectedPoseId]);

    const footMarkers = [
      ['N', points.nearAnkle],
      ['F', points.farAnkle]
    ];
    footMarkers.forEach(([label, point]) => {
      const distance = Math.round(FLOOR_Y - point.y);
      ctx.font = '700 7px ui-monospace, Consolas, monospace';
      ctx.fillStyle = Math.abs(distance) <= 3 ? '#9cffb1' : '#efc982';
      ctx.fillText(`${label}${distance >= 0 ? '+' : ''}${distance}`, Math.min(FRAME_W - 20, point.x + 3), Math.min(FRAME_H - 5, point.y + 9));
    });
  }

  function serialise() {
    return JSON.stringify({
      version: LAB_VERSION,
      direction: 'east',
      body: 'male',
      frameSize: { width: FRAME_W, height: FRAME_H },
      floorY: FLOOR_Y,
      baseWalkPoseMs: BASE_WALK_POSE_MS,
      preview: {
        viewMode,
        bodyStyle,
        bodyOpacity: Number(bodyOpacity.toFixed(2)),
        speedPercent,
        poseMs: Math.round(currentPlaybackPoseMs())
      },
      measurements: { ...MEASUREMENTS },
      poseOrder: [...POSE_ORDER],
      poses
    }, null, 2);
  }

  function refreshOutput() {
    output.value = serialise();
  }

  function setStatus(message) {
    status.textContent = message;
  }

  function stopPlayback() {
    if (!playing) return;
    playing = false;
    playButton.setAttribute('aria-pressed', 'false');
    playButton.textContent = '▶ Play walk';
  }

  function selectPose(id, options = {}) {
    if (!poses[id]) return;
    if (!options.fromPlayback) stopPlayback();
    selectedPoseId = id;
    poseStrip.querySelectorAll('button').forEach((button) => {
      button.classList.toggle('selected', button.dataset.poseId === id);
    });
    syncSliders();
    draw();
    setStatus(`${POSE_LABELS[id]} selected · ${bodyStyle === 'hero' ? 'Hero 0.5.1 skin' : 'Proxy'} · east profile`);
  }

  function stepPose(delta) {
    stopPlayback();
    const index = POSE_ORDER.indexOf(selectedPoseId);
    const next = (index + delta + POSE_ORDER.length) % POSE_ORDER.length;
    selectPose(POSE_ORDER[next]);
  }

  function buildPoseStrip() {
    POSE_ORDER.forEach((id) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.poseId = id;
      button.textContent = POSE_LABELS[id];
      button.addEventListener('click', () => selectPose(id));
      poseStrip.appendChild(button);
    });
  }

  function buildMeasurements() {
    Object.entries(MEASUREMENTS).forEach(([name, value]) => {
      const card = document.createElement('div');
      card.className = 'measurement-card';
      const label = document.createElement('span');
      label.textContent = name.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
      const strong = document.createElement('strong');
      strong.textContent = `${value}px`;
      card.append(label, strong);
      measurementGrid.appendChild(card);
    });
  }

  function buildSliders() {
    CONTROL_DEFS.forEach(([key, labelText, min, max, step, unit]) => {
      const row = document.createElement('div');
      row.className = 'slider-row';
      const label = document.createElement('label');
      const input = document.createElement('input');
      const value = document.createElement('span');
      const id = `lab-control-${key}`;

      label.htmlFor = id;
      label.textContent = labelText;
      input.id = id;
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      value.className = 'slider-value';

      input.addEventListener('input', () => {
        stopPlayback();
        poses[selectedPoseId][key] = Number(input.value);
        value.textContent = `${input.value}${unit}`;
        draw();
        refreshOutput();
        setStatus(`${POSE_LABELS[selectedPoseId]} · ${labelText} ${input.value}${unit}`);
      });

      row.append(label, input, value);
      sliderGrid.appendChild(row);
      sliderRecords.set(key, { input, value, unit });
    });
  }

  function syncSliders() {
    const pose = poses[selectedPoseId];
    sliderRecords.forEach(({ input, value, unit }, key) => {
      const resolved = Number.isFinite(pose[key]) ? pose[key] : DEFAULT_POSES[selectedPoseId][key];
      input.value = String(resolved);
      value.textContent = `${resolved}${unit}`;
    });
  }

  function resetPose() {
    stopPlayback();
    poses[selectedPoseId] = { ...DEFAULT_POSES[selectedPoseId] };
    syncSliders();
    draw();
    refreshOutput();
    setStatus(`${POSE_LABELS[selectedPoseId]} reset to the canonical 0.2 pose.`);
  }

  function resetAll() {
    stopPlayback();
    poses = cloneDefaultPoses();
    syncSliders();
    draw();
    refreshOutput();
    setStatus('All nine poses reset to the canonical 0.2 cycle.');
  }

  async function copyJson() {
    const text = serialise();
    output.value = text;
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Pose JSON copied.');
    } catch (_) {
      output.focus();
      output.select();
      document.execCommand('copy');
      setStatus('Pose JSON selected/copied.');
    }
  }

  function setViewMode(nextMode) {
    if (!['body', 'both', 'skeleton'].includes(nextMode)) nextMode = 'both';
    viewMode = nextMode;
    viewModeButtons.forEach((button) => {
      const selected = button.dataset.viewMode === viewMode;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    draw();
    refreshOutput();
    setStatus(`Preview mode: ${viewMode === 'both' ? 'body + rig' : viewMode}.`);
  }

  function setBodyStyle(nextStyle) {
    if (!['proxy', 'hero'].includes(nextStyle)) nextStyle = 'hero';
    bodyStyle = nextStyle;
    bodyStyleButtons.forEach((button) => {
      const selected = button.dataset.bodyStyle === bodyStyle;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    draw();
    refreshOutput();
    setStatus(`Body style: ${bodyStyle === 'hero' ? 'Hero 0.5.1 near-final skin' : 'Proxy'}. Same rig, same pose data.`);
  }

  function syncBodyOpacity() {
    const percent = Math.max(25, Math.min(100, Number(bodyOpacityInput?.value || 90)));
    bodyOpacity = percent / 100;
    if (bodyOpacityValue) bodyOpacityValue.textContent = `${percent}%`;
    draw();
    refreshOutput();
  }

  function syncPlaybackSpeed() {
    speedPercent = Math.max(20, Math.min(200, Number(speedInput?.value || 100)));
    const poseMs = Math.round(currentPlaybackPoseMs());
    if (speedValue) speedValue.textContent = `${speedPercent}% · ${poseMs} ms/frame`;
    lastPlaybackAt = performance.now();
    refreshOutput();
    if (playing) setStatus(`Playing east walk at ${speedPercent}% speed · ${poseMs} ms per pose.`);
  }

  function togglePlayback() {
    playing = !playing;
    playButton.setAttribute('aria-pressed', String(playing));
    playButton.textContent = playing ? '■ Stop' : '▶ Play walk';
    if (playing) {
      if (selectedPoseId === 'idle') selectPose('walk1', { fromPlayback: true });
      lastPlaybackAt = performance.now();
      const poseMs = Math.round(currentPlaybackPoseMs());
      setStatus(`Playing east walk at ${speedPercent}% speed · ${poseMs} ms per pose.`);
    }
  }

  function playbackTick(now) {
    const poseMs = currentPlaybackPoseMs();
    if (playing && now - lastPlaybackAt >= poseMs) {
      const elapsed = now - lastPlaybackAt;
      const steps = Math.max(1, Math.floor(elapsed / poseMs));
      const currentWalkIndex = Math.max(0, POSE_ORDER.indexOf(selectedPoseId) - 1);
      const nextWalkIndex = (currentWalkIndex + steps) % 8;
      selectPose(`walk${nextWalkIndex + 1}`, { fromPlayback: true });
      lastPlaybackAt += steps * poseMs;
    }
    requestAnimationFrame(playbackTick);
  }

  prevButton.addEventListener('click', () => stepPose(-1));
  nextButton.addEventListener('click', () => stepPose(1));
  playButton.addEventListener('click', togglePlayback);
  onionToggle.addEventListener('change', draw);
  resetPoseButton.addEventListener('click', resetPose);
  resetAllButton.addEventListener('click', resetAll);
  copyButton.addEventListener('click', copyJson);
  viewModeButtons.forEach((button) => button.addEventListener('click', () => setViewMode(button.dataset.viewMode)));
  bodyStyleButtons.forEach((button) => button.addEventListener('click', () => setBodyStyle(button.dataset.bodyStyle)));
  bodyOpacityInput?.addEventListener('input', syncBodyOpacity);
  speedInput?.addEventListener('input', syncPlaybackSpeed);

  window.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      stepPose(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      stepPose(1);
    } else if (event.key === ' ') {
      event.preventDefault();
      togglePlayback();
    }
  });

  buildPoseStrip();
  buildMeasurements();
  buildSliders();
  setBodyStyle('hero');
  syncBodyOpacity();
  syncPlaybackSpeed();
  selectPose('idle');
  refreshOutput();
  requestAnimationFrame(playbackTick);

  window.AvendorHeroAnimationLab = Object.freeze({
    version: LAB_VERSION,
    uiVersion: UI_VERSION,
    measurements: MEASUREMENTS,
    getPoses: () => JSON.parse(JSON.stringify(poses)),
    getBodyStyle: () => bodyStyle,
    exportJson: serialise,
    selectPose,
    setViewMode,
    setBodyStyle,
    resetPose,
    resetAll
  });
})();