(() => {
  'use strict';

  const FRAME_W = 128;
  const FRAME_H = 240;
  const WALK_FRAMES = 8;
  const WALK_POSE_MS = 105;
  const CANDIDATE_URL = 'data/hero-animation/male-east-west-candidate-0.3.json';
  const VERSION = '0.6.0';

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

  const PALETTES = Object.freeze({
    male: Object.freeze({
      outline: '#1d1712',
      outlineSoft: '#3a2b21',
      hair: '#493020',
      hairShadow: '#2c1d15',
      hairLight: '#765137',
      skin: '#c98d63',
      skinShadow: '#976447',
      skinLight: '#e0ad82',
      outer: '#53633a',
      outerShadow: '#344026',
      outerLight: '#788855',
      inner: '#b9a980',
      innerShadow: '#897a5f',
      trousers: '#59514a',
      trousersShadow: '#3b3633',
      trousersLight: '#777067',
      boots: '#4b3020',
      bootsShadow: '#2d1e16',
      bootsLight: '#765039',
      belt: '#442b1d',
      buckle: '#b09055',
      pouch: '#6f472a'
    }),
    female: Object.freeze({
      outline: '#211916',
      outlineSoft: '#3b2a23',
      hair: '#7b3f2f',
      hairShadow: '#4f291f',
      hairLight: '#aa654d',
      skin: '#d7a477',
      skinShadow: '#aa7958',
      skinLight: '#edc49c',
      outer: '#72513b',
      outerShadow: '#4c3529',
      outerLight: '#966f52',
      inner: '#e8dcc3',
      innerShadow: '#b8aa90',
      trousers: '#365c78',
      trousersShadow: '#29465b',
      trousersLight: '#527b98',
      boots: '#4a3327',
      bootsShadow: '#2d211b',
      bootsLight: '#705040',
      belt: '#5a3c2c',
      buckle: '#b08a4f',
      pouch: '#6d472d'
    })
  });

  let candidatePromise = null;

  function loadCandidate() {
    if (!candidatePromise) {
      candidatePromise = fetch(CANDIDATE_URL, { cache: 'no-store' })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((data) => {
          const order = data?.poseOrder;
          if (
            data?.body !== 'male'
            || data?.direction !== 'east'
            || !Array.isArray(order)
            || order.length !== 9
            || order[0] !== 'idle'
            || order[8] !== 'walk8'
            || !data?.poses
          ) {
            throw new Error('Unexpected candidate 0.3 payload');
          }
          return data;
        });
    }
    return candidatePromise;
  }

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

  function pointBetween(a, b, t) {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t
    };
  }

  function segmentAngle(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  function buildSkeleton(pose) {
    const m = MEASUREMENTS;
    const pelvis = { x: FRAME_W / 2, y: pose.pelvisY };
    const shoulder = fromUp(pelvis, m.torso, pose.torsoLean);
    const neck = fromUp(shoulder, m.neck, pose.torsoLean);
    const headBase = fromUp(neck, m.headRadius, pose.torsoLean);
    const head = { x: headBase.x + pose.headForward, y: headBase.y };

    const nearShoulder = { x: shoulder.x + m.shoulderHalfWidth, y: shoulder.y };
    const farShoulder = { x: shoulder.x - m.shoulderHalfWidth, y: shoulder.y + 1 };
    const nearHip = { x: pelvis.x + m.hipHalfWidth, y: pelvis.y };
    const farHip = { x: pelvis.x - m.hipHalfWidth, y: pelvis.y + 1 };

    const nearElbow = fromDown(nearShoulder, m.upperArm, pose.nearUpperArm);
    const nearWrist = fromDown(nearElbow, m.forearm, pose.nearForearm);
    const farElbow = fromDown(farShoulder, m.upperArm, pose.farUpperArm);
    const farWrist = fromDown(farElbow, m.forearm, pose.farForearm);

    const nearKnee = fromDown(nearHip, m.thigh, pose.nearThigh);
    const nearAnkle = fromDown(nearKnee, m.shin, pose.nearShin);
    const farKnee = fromDown(farHip, m.thigh, pose.farThigh);
    const farAnle = fromDown(farKnee, m.shin, pose.farShin);

    return {
      pelvis, shoulder, neck, head,
      nearShoulder, farShoulder, nearHip, farHip,
      nearElbow, nearWrist, farElbow, farWrist,
      nearKnee, nearAnkle, farKnee, farAnkle: farAnle,
      nearToe: footTip(nearAnkle, m.foot, pose.nearFoot),
      farToe: footTip(farAnle, m.foot, pose.farFoot)
    };
  }

  function line(ctx, a, b, width, color) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  function roundedSegment(ctx, a, b, width, fill, outline, extra = 2.2) {
    line(ctx, a, b, width + extra, outline);
    line(ctx, a, b, width, fill);
  }

  function ellipse(ctx, center, rx, ry, rotation, fill, outline, lineWidth = 1.1) {
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, rx, ry, rotation, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (outline) {
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = outline;
      ctx.stroke();
    }
  }

  function polygon(ctx, points, fill, outline, lineWidth = 1.2) {
    ctx.beginPath();
    points.forEach((point, index) => {
      if (!index) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (outline) {
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = outline;
      ctx.stroke();
    }
  }

  function joint(ctx, point, radius, fill, outline) {
    ellipse(ctx, point, radius, radius, 0, fill, outline, 1);
  }

  function drawBoot(ctx, ankle, toe, palette, far) {
    const fill = far ? palette.bootsShadow : palette.boots;
    const angle = segmentAngle(ankle, toe);
    roundedSegment(ctx, ankle, toe, far ? 8.5 : 10, fill, palette.outline, 2);
    const soleA = {
      x: ankle.x + Math.sin(angle) * (far ? 3.1 : 3.8),
      y: ankle.y - Math.cos(angle) * (far ? 3.1 : 3.8)
    };
    const soleB = {
      x: toe.x + Math.cos(angle) * 3.2 + Math.sin(angle) * (far ? 2.8 : 3.4),
      y: toe.y + Math.sin(angle) * 3.2 - Math.cos(angle) * (far ? 2.8 : 3.4)
    };
    line(ctx, soleA, soleB, far ? 2.1 : 2.7, palette.bootsShadow);
    if (!far) line(ctx, pointBetween(ankle, toe, .34), pointBetween(ankle, toe, .72), 1.1, palette.bootsLight);
  }

  function drawLeg(ctx, points, side, palette, far, body) {
    const hip = points[`${side}Hip`];
    const knee = points[`${side}Knee`];
    const ankle = points[`${side}Ankle`];
    const toe = points[`${side}Toe`];
    const trouser = far ? palette.trousersShadow : palette.trousers;
    const bootTop = pointBetween(knee, ankle, body === 'female' ? .60 : .57);
    const thighWidth = body === 'female' ? (far ? 10 : 11.5) : (far ? 11 : 13);
    const shinWidth = body === 'female' ? (far ? 8.7 : 9.8) : (far ? 9.5 : 11);

    roundedSegment(ctx, hip, knee, thighWidth, trouser, palette.outline);
    joint(ctx, knee, body === 'female' ? (far ? 4.2 : 4.9) : (far ? 4.7 : 5.5), trouser, palette.outline);
    roundedSegment(ctx, knee, bootTop, shinWidth, trouser, palette.outline);
    roundedSegment(ctx, bootTop, ankle, body === 'female' ? (far ? 7.5 : 8.6) : (far ? 8.3 : 9.5), far ? palette.bootsShadow : palette.boots, palette.outline);
    drawBoot(ctx, ankle, toe, palette, far);

    if (!far) {
      line(ctx, pointBetween(hip, knee, .16), pointBetween(hip, knee, .48), 1, palette.trousersLight);
      line(ctx, pointBetween(knee, bootTop, .12), pointBetween(knee, bootTop, .45), .9, palette.trousersLight);
    }
  }

  function drawHand(ctx, elbow, wrist, palette, far) {
    const angle = segmentAngle(elbow, wrist);
    const center = {
      x: wrist.x + Math.cos(angle) * 1.6,
      y: wrist.y + Math.sin(angle) * 1.6
    };
    ellipse(ctx, center, far ? 3.8 : 4.4, far ? 2.8 : 3.1, angle, far ? palette.skinShadow : palette.skin, palette.outline, 1);
  }

  function drawArm(ctx, points, side, palette, far, body) {
    const shoulder = points[`${side}Shoulder`];
    const elbow = points[`${side}Elbow`];
    const wrist = points[`${side}Wrist`];
    const outer = far ? palette.outerShadow : palette.outer;
    const inner = far ? palette.innerShadow : palette.inner;
    const skin = far ? palette.skinShadow : palette.skin;
    const sleeveEnd = pointBetween(shoulder, elbow, body === 'female' ? .62 : .33);

    if (body === 'male') {
      const rollEnd = pointBetween(shoulder, elbow, .66);
      roundedSegment(ctx, shoulder, sleeveEnd, far ? 9.3 : 11.3, outer, palette.outline);
      roundedSegment(ctx, sleeveEnd, rollEnd, far ? 7.8 : 9, inner, palette.outline);
      roundedSegment(ctx, rollEnd, elbow, far ? 7 : 8.2, inner, palette.outline);
      line(ctx, pointBetween(sleeveEnd, rollEnd, .82), rollEnd, far ? 7.6 : 8.8, far ? palette.innerShadow : palette.inner);
    } else {
      roundedSegment(ctx, shoulder, sleeveEnd, far ? 7.4 : 8.7, inner, palette.outline);
      roundedSegment(ctx, sleeveEnd, elbow, far ? 6.5 : 7.6, inner, palette.outline);
      line(ctx, pointBetween(shoulder, sleeveEnd, .82), sleeveEnd, far ? 7.1 : 8.1, far ? palette.innerShadow : '#f4ead5');
    }

    joint(ctx, elbow, far ? 3.3 : 3.8, skin, palette.outline);
    roundedSegment(ctx, elbow, wrist, body === 'female' ? (far ? 5.6 : 6.5) : (far ? 6.4 : 7.3), skin, palette.outline);
    drawHand(ctx, elbow, wrist, palette, far);
  }

  function torsoAxes(points) {
    const dx = points.pelvis.x - points.shoulder.x;
    const dy = points.pelvis.y - points.shoulder.y;
    const length = Math.max(.001, Math.hypot(dx, dy));
    const downX = dx / length;
    const downY = dy / length;
    const backX = -downY;
    const backY = downX;
    return {
      downX, downY,
      backX, backY,
      frontX: -backX,
      frontY: -backY
    };
  }

  function drawMaleTorso(ctx, points, palette) {
    const { downX, downY, backX, backY, frontX, frontY } = torsoAxes(points);
    const shoulder = points.shoulder;
    const pelvis = points.pelvis;
    const chest = pointBetween(shoulder, pelvis, .30);
    const waist = pointBetween(shoulder, pelvis, .78);
    const hem = { x: pelvis.x + downX * 17, y: pelvis.y + downY * 17 };

    polygon(ctx, [
      { x: shoulder.x + backX * 9.5 - downX * 3, y: shoulder.y + backY * 9.5 - downY * 3 },
      { x: shoulder.x + frontX * 11.8 - downX * 2, y: shoulder.y + frontY * 11.8 - downY * 2 },
      { x: chest.x + frontX * 12.8, y: chest.y + frontY * 12.8 },
      { x: waist.x + frontX * 9.2, y: waist.y + frontY * 9.2 },
      { x: hem.x + frontX * 11.4, y: hem.y + frontY * 11.4 },
      { x: hem.x + backX * 10.8, y: hem.y + backY * 10.8 },
      { x: waist.x + backX * 8.5, y: waist.y + backY * 8.5 },
      { x: chest.x + backX * 10.2, y: chest.y + backY * 10.2 }
    ], palette.outer, palette.outline, 1.5);

    line(ctx, { x: chest.x + backX * 7.6, y: chest.y + backY * 7.6 }, { x: hem.x + backX * 8.2, y: hem.y + backY * 8.2 }, 2, palette.outerShadow);
    line(ctx, { x: chest.x + frontX * 8.3, y: chest.y + frontY * 8.3 }, { x: waist.x + frontX * 7.0, y: waist.y + frontY * 7.0 }, 1.1, palette.outerLight);

    const beltCenter = pointBetween(shoulder, pelvis, .88);
    line(ctx,
      { x: beltCenter.x + backX * 9.3, y: beltCenter.y + backY * 9.3 },
      { x: beltCenter.x + frontX * 10.3, y: beltCenter.y + frontY * 10.3 },
      4, palette.belt
    );
    ellipse(ctx, { x: beltCenter.x + frontX * 7.2, y: beltCenter.y + frontY * 7.2 }, 2.2, 1.8, segmentAngle(shoulder, pelvis), palette.buckle, palette.outlineSoft, .8);

    const pouchCenter = { x: beltCenter.x + backX * 10.8 + downX * 5, y: beltCenter.y + backY * 10.8 + downY * 5 };
    polygon(ctx, [
      { x: pouchCenter.x - 4, y: pouchCenter.y - 5 },
      { x: pouchCenter.x + 5, y: pouchCenter.y - 5 },
      { x: pouchCenter.x + 5.5, y: pouchCenter.y + 5.5 },
      { x: pouchCenter.x - 4.5, y: pouchCenter.y + 5.5 }
    ], palette.pouch, palette.outline, 1);
  }

  function drawFemaleTorso(ctx, points, palette) {
    const { downX, downY, backX, backY, frontX, frontY } = torsoAxes(points);
    const shoulder = points.shoulder;
    const pelvis = points.pelvis;
    const upper = pointBetween(shoulder, pelvis, .24);
    const chest = pointBetween(shoulder, pelvis, .40);
    const under = pointBetween(shoulder, pelvis, .54);
    const waist = pointBetween(shoulder, pelvis, .77);
    const hem = { x: pelvis.x + downX * 15.5, y: pelvis.y + downY * 15.5 };

    ctx.beginPath();
    ctx.moveTo(shoulder.x + backX * 8.8 - downX * 3, shoulder.y + backY * 8.8 - downY * 3);
    ctx.lineTo(shoulder.x + frontX * 9.4 - downX * 2, shoulder.y + frontY * 9.4 - downY * 2);
    ctx.quadraticCurveTo(chest.x + frontX * 13.5, chest.y + frontY * 13.5, under.x + frontX * 10.0, under.y + frontY * 10.0);
    ctx.lineTo(waist.x + frontX * 7.8, waist.y + frontY * 7.8);
    ctx.lineTo(waist.x + backX * 7.4, waist.y + backY * 7.4);
    ctx.lineTo(upper.x + backX * 8.2, upper.y + backY * 8.2);
    ctx.closePath();
    ctx.fillStyle = palette.inner;
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = palette.outline;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(upper.x + backX * 7.8, upper.y + backY * 7.8);
    ctx.lineTo(upper.x + frontX * 8.7, upper.y + frontY * 8.7);
    ctx.quadraticCurveTo(chest.x + frontX * 11.6, chest.y + frontY * 11.6, under.x + frontX * 8.8, under.y + frontY * 8.8);
    ctx.lineTo(waist.x + frontX * 7.2, waist.y + frontY * 7.2);
    ctx.lineTo(hem.x + frontX * 9.6, hem.y + frontY * 9.6);
    ctx.lineTo(hem.x + backX * 9.0, hem.y + backY * 9.0);
    ctx.lineTo(waist.x + backX * 6.9, waist.y + backY * 6.9);
    ctx.closePath();
    ctx.fillStyle = palette.outer;
    ctx.fill();
    ctx.lineWidth = 1.35;
    ctx.strokeStyle = palette.outline;
    ctx.stroke();

    line(ctx, { x: upper.x + frontX * 6.5, y: upper.y + frontY * 6.5 }, { x: under.x + frontX * 6.5, y: under.y + frontY * 6.5 }, 1, palette.outerLight);

    const beltCenter = pointBetween(shoulder, pelvis, .87);
    line(ctx,
      { x: beltCenter.x + backX * 8.0, y: beltCenter.y + backY * 8.0 },
      { x: beltCenter.x + frontX * 8.6, y: beltCenter.y + frontY * 8.6 },
      3.7, palette.belt
    );
    ellipse(ctx, { x: beltCenter.x + frontX * 6.0, y: beltCenter.y + frontY * 6.0 }, 1.9, 1.5, segmentAngle(shoulder, pelvis), palette.buckle, palette.outlineSoft, .7);
  }

  function drawHead(ctx, points, pose, palette, body) {
    const h = points.head;
    roundedSegment(ctx, points.shoulder, points.neck, body === 'female' ? 5.8 : 6.8, palette.skinShadow, palette.outline, 1.9);
    roundedSegment(ctx, points.neck, { x: h.x - 5.3, y: h.y + 10.8 }, body === 'female' ? 6.1 : 7.1, palette.skin, palette.outline, 1.9);

    ctx.beginPath();
    ctx.moveTo(h.x - 7.3, h.y - 13.2);
    ctx.bezierCurveTo(h.x - 1.2, h.y - 17.1, h.x + 6.3, h.y - 14.8, h.x + 8.9, h.y - 8.8);
    ctx.quadraticCurveTo(h.x + 10.2, h.y - 5.0, h.x + 10.4, h.y - 2.5);
    ctx.quadraticCurveTo(h.x + 12.8, h.y - 1.0, h.x + 15.8, h.y + .7);
    ctx.quadraticCurveTo(h.x + 13.4, h.y + 3.0, h.x + 10.3, h.y + 3.3);
    ctx.quadraticCurveTo(h.x + 12.0, h.y + 5.0, h.x + 10.6, h.y + 6.5);
    ctx.quadraticCurveTo(h.x + 9.2, h.y + (body === 'female' ? 10.8 : 11.5), h.x + 4.3, h.y + (body === 'female' ? 13.5 : 14.1));
    ctx.quadraticCurveTo(h.x - 1.2, h.y + 16.2, h.x - 7.4, h.y + 10.0);
    ctx.quadraticCurveTo(h.x - 10.6, h.y + 4.0, h.x - 10.2, h.y - 4.3);
    ctx.quadraticCurveTo(h.x - 9.9, h.y - 10.0, h.x - 7.3, h.y - 13.2);
    ctx.closePath();
    ctx.fillStyle = palette.skin;
    ctx.fill();
    ctx.lineWidth = 1.35;
    ctx.strokeStyle = palette.outline;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(h.x - 11.2, h.y + 6.5);
    ctx.bezierCurveTo(h.x - 15.5, h.y - 1.0, h.x - 13.5, h.y - 12.2, h.x - 4.6, h.y - 17.2);
    ctx.bezierCurveTo(h.x + 1.2, h.y - 20.0, h.x + 7.6, h.y - 16.6, h.x + 8.6, h.y - 10.8);
    ctx.lineTo(h.x + 4.2, h.y - 7.4);
    ctx.lineTo(h.x + .8, h.y - 10.1);
    ctx.quadraticCurveTo(h.x - 1.9, h.y - 5.3, h.x - 3.5, h.y - .8);
    ctx.quadraticCurveTo(h.x - 6.6, h.y + 3.1, h.x - 7.2, h.y + 8.8);
    ctx.closePath();
    ctx.fillStyle = palette.hair;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = palette.outline;
    ctx.stroke();

    if (body === 'female') {
      const gaitSwing = Math.max(-5, Math.min(5, (pose.nearThigh - pose.farThigh) * .09));
      const root = { x: h.x - 10.0, y: h.y - 1.5 };
      const mid = { x: h.x - 16.0 - gaitSwing * .35, y: h.y + 8.0 };
      const end = { x: h.x - 14.0 - gaitSwing, y: h.y + 22.0 };
      roundedSegment(ctx, root, mid, 7.1, palette.hair, palette.outline, 1.8);
      roundedSegment(ctx, mid, end, 6.3, palette.hairShadow, palette.outline, 1.8);
    } else {
      line(ctx, { x: h.x - 8.5, y: h.y - 8.5 }, { x: h.x + 2.5, y: h.y - 13.2 }, 1, palette.hairLight);
      line(ctx, { x: h.x - 9.0, y: h.y - .5 }, { x: h.x - 6.0, y: h.y + 9.0 }, 2.2, palette.hairShadow);
    }

    ctx.strokeStyle = palette.hairShadow;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(h.x + 5.8, h.y - 7.2);
    ctx.lineTo(h.x + 9.0, h.y - 7.6);
    ctx.stroke();

    ctx.fillStyle = palette.outline;
    ctx.beginPath();
    ctx.arc(h.x + 7.4, h.y - 5.1, 1.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = palette.skinShadow;
    ctx.lineWidth = .8;
    ctx.beginPath();
    ctx.moveTo(h.x + 9.8, h.y + 6.0);
    ctx.quadraticCurveTo(h.x + 11.5, h.y + 6.5, h.x + 12.4, h.y + 5.8);
    ctx.stroke();
  }

  function drawBodyFrame(ctx, pose, body) {
    const palette = PALETTES[body];
    const points = buildSkeleton(pose);

    ctx.clearRect(0, 0, FRAME_W, FRAME_H);
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    drawLeg(ctx, points, 'far', palette, true, body);
    drawArm(ctx, points, 'far', palette, true, body);

    if (body === 'female') drawFemaleTorso(ctx, points, palette);
    else drawMaleTorso(ctx, points, palette);

    drawHead(ctx, points, pose, palette, body);

    drawLeg(ctx, points, 'near', palette, false, body);
    drawArm(ctx, points, 'near', palette, false, body);

    ctx.restore();
  }

  function renderAtlases(candidate, body) {
    const idle = document.createElement('canvas');
    idle.width = FRAME_W;
    idle.height = FRAME_H;
    const idleCtx = idle.getContext('2d');
    drawBodyFrame(idleCtx, candidate.poses.idle, body);

    const walk = document.createElement('canvas');
    walk.width = FRAME_W * WALK_FRAMES;
    walk.height = FRAME_H;
    const walkCtx = walk.getContext('2d');
    walkCtx.imageSmoothingEnabled = false;

    for (let index = 0; index < WALK_FRAMES; index += 1) {
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = FRAME_W;
      frameCanvas.height = FRAME_H;
      drawBodyFrame(frameCanvas.getContext('2d'), candidate.poses[`walk${index + 1}`], body);
      walkCtx.drawImage(frameCanvas, index * FRAME_W, 0);
    }

    return { idle, walk };
  }

  class CombatHeroSprite {
    constructor(canvas, options = {}) {
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new TypeError('CombatHeroSprite requires a canvas element.');
      }
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.body = options.body === 'female' ? 'female' : 'male';
      this.state = 'idle';
      this.frame = 0;
      this.lastFrameAt = performance.now();
      this.ready = false;
      this.atlases = null;
      this.loadToken = 0;
    }

    async setBody(body) {
      body = body === 'female' ? 'female' : 'male';
      const token = ++this.loadToken;
      this.ready = false;
      const candidate = await loadCandidate();
      if (token !== this.loadToken) return;
      this.body = body;
      this.atlases = renderAtlases(candidate, body);
      this.frame = 0;
      this.lastFrameAt = performance.now();
      this.ready = true;
      this.draw();
    }

    setMotion(state) {
      const next = state === 'walk' ? 'walk' : 'idle';
      if (next === this.state) return;
      this.state = next;
      this.frame = 0;
      this.lastFrameAt = performance.now();
      if (this.ready) this.draw();
    }

    update(now) {
      if (!this.ready) return;
      if (this.state !== 'walk') {
        if (this.frame !== 0) {
          this.frame = 0;
          this.draw();
        }
        return;
      }

      const elapsed = now - this.lastFrameAt;
      if (elapsed < WALK_POSE_MS) return;
      const steps = Math.floor(elapsed / WALK_POSE_MS);
      this.frame = (this.frame + steps) % WALK_FRAMES;
      this.lastFrameAt += steps * WALK_POSE_MS;
      this.draw();
    }

    draw() {
      this.ctx.clearRect(0, 0, FRAME_W, FRAME_H);
      if (!this.ready || !this.atlases) return;
      if (this.state === 'walk') {
        this.ctx.drawImage(
          this.atlases.walk,
          this.frame * FRAME_W, 0, FRAME_W, FRAME_H,
          0, 0, FRAME_W, FRAME_H
        );
      } else {
        this.ctx.drawImage(this.atlases.idle, 0, 0);
      }
    }

    getStatus() {
      return {
        body: this.body,
        state: this.state,
        frame: this.frame,
        ready: this.ready,
        frameWidth: FRAME_W,
        frameHeight: FRAME_H,
        walkFrames: WALK_FRAMES,
        walkPoseMs: WALK_POSE_MS,
        candidateUrl: CANDIDATE_URL,
        version: VERSION
      };
    }
  }

  window.AvendorCombatProductionSprite = Object.freeze({
    VERSION,
    FRAME_W,
    FRAME_H,
    WALK_FRAMES,
    WALK_POSE_MS,
    CANDIDATE_URL,
    CombatHeroSprite
  });
})();
