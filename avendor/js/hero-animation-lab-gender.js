(() => {
  'use strict';

  const VERSION = '0.5.2';
  const FRAME_W = 128;
  const FRAME_H = 240;
  const FLOOR_Y = 226;

  const lab = window.AvendorHeroAnimationLab;
  const canvas = document.getElementById('hero-animation-canvas');
  const poseStrip = document.getElementById('lab-pose-strip');
  const sliderGrid = document.getElementById('lab-sliders');
  const status = document.getElementById('lab-status');
  const opacityInput = document.getElementById('lab-body-opacity');
  const onionToggle = document.getElementById('lab-onion');
  const genderButtons = [...document.querySelectorAll('[data-hero-gender]')];
  const viewButtons = [...document.querySelectorAll('[data-view-mode]')];
  const bodyStyleButtons = [...document.querySelectorAll('[data-body-style]')];

  if (!lab || !canvas || !poseStrip || !genderButtons.length) return;

  const ctx = canvas.getContext('2d');
  const rigBuffer = document.createElement('canvas');
  rigBuffer.width = FRAME_W;
  rigBuffer.height = FRAME_H;
  const rigCtx = rigBuffer.getContext('2d');
  const m = lab.measurements;

  const COLORS = Object.freeze({
    outline: '#211916',
    outlineSoft: '#3b2a23',
    hair: '#7b3f2f',
    hairShadow: '#4f291f',
    hairLight: '#a2614c',
    skin: '#d7a477',
    skinShadow: '#aa7958',
    skinLight: '#ebc39e',
    blouse: '#e8dcc3',
    blouseShadow: '#b9aa91',
    blouseLight: '#f4ead5',
    vest: '#72513b',
    vestShadow: '#4c3529',
    vestLight: '#936d50',
    trousers: '#365c78',
    trousersShadow: '#29465b',
    trousersLight: '#527b98',
    boots: '#4a3327',
    bootsShadow: '#2d211b',
    bootsLight: '#705040',
    belt: '#5a3c2c',
    buckle: '#b08a4f'
  });

  const GHOST = Object.freeze({
    outline: 'rgba(118,220,237,.38)', outlineSoft: 'rgba(118,220,237,.25)',
    hair: 'rgba(94,180,194,.22)', hairShadow: 'rgba(94,180,194,.16)', hairLight: 'rgba(126,219,235,.22)',
    skin: 'rgba(126,219,235,.24)', skinShadow: 'rgba(126,219,235,.17)', skinLight: 'rgba(126,219,235,.27)',
    blouse: 'rgba(126,219,235,.18)', blouseShadow: 'rgba(126,219,235,.13)', blouseLight: 'rgba(126,219,235,.21)',
    vest: 'rgba(126,219,235,.20)', vestShadow: 'rgba(126,219,235,.14)', vestLight: 'rgba(126,219,235,.22)',
    trousers: 'rgba(126,219,235,.17)', trousersShadow: 'rgba(126,219,235,.12)', trousersLight: 'rgba(126,219,235,.20)',
    boots: 'rgba(126,219,235,.15)', bootsShadow: 'rgba(126,219,235,.10)', bootsLight: 'rgba(126,219,235,.18)',
    belt: 'rgba(126,219,235,.18)', buckle: 'rgba(126,219,235,.22)'
  });

  let heroGender = 'male';
  let femaleViewMode = selectedViewMode();
  let composeQueued = false;
  let composing = false;

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
    const farAnkle = fromDown(farKnee, m.shin, pose.farShin);

    return {
      pelvis, shoulder, neck, head,
      nearShoulder, farShoulder, nearHip, farHip,
      nearElbow, nearWrist, farElbow, farWrist,
      nearKnee, nearAnkle, farKnee, farAnkle,
      nearToe: footTip(nearAnkle, m.foot, pose.nearFoot),
      farToe: footTip(farAnkle, m.foot, pose.farFoot)
    };
  }

  function pointBetween(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function segmentAngle(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x);
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

  function roundedSegment(a, b, width, fill, outline, extra = 2.1) {
    line(a, b, width + extra, outline);
    line(a, b, width, fill);
  }

  function ellipse(center, rx, ry, rotation, fill, outline, lineWidth = 1.15) {
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

  function polygon(points, fill, outline, lineWidth = 1.25) {
    ctx.beginPath();
    points.forEach((point, index) => {
      if (!index) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = outline;
    ctx.stroke();
  }

  function drawFemaleHand(elbow, wrist, palette, far) {
    const angle = segmentAngle(elbow, wrist);
    const center = {
      x: wrist.x + Math.cos(angle) * 1.4,
      y: wrist.y + Math.sin(angle) * 1.4
    };
    ellipse(center, far ? 3.7 : 4.2, far ? 2.7 : 3.0, angle, far ? palette.skinShadow : palette.skin, palette.outline, 1.0);
  }

  function drawFemaleArm(points, side, palette, far) {
    const shoulder = points[`${side}Shoulder`];
    const elbow = points[`${side}Elbow`];
    const wrist = points[`${side}Wrist`];
    const blouse = far ? palette.blouseShadow : palette.blouse;
    const skin = far ? palette.skinShadow : palette.skin;
    const sleeveEnd = pointBetween(shoulder, elbow, .58);

    roundedSegment(shoulder, sleeveEnd, far ? 7.3 : 8.6, blouse, palette.outline);
    roundedSegment(sleeveEnd, elbow, far ? 6.5 : 7.5, blouse, palette.outline);
    roundedSegment(elbow, wrist, far ? 5.8 : 6.6, skin, palette.outline);
    line(pointBetween(shoulder, sleeveEnd, .86), sleeveEnd, far ? 7.2 : 8.2, far ? palette.blouseShadow : palette.blouseLight);
    drawFemaleHand(elbow, wrist, palette, far);
  }

  function drawFemaleBoot(ankle, toe, palette, far) {
    const fill = far ? palette.bootsShadow : palette.boots;
    roundedSegment(ankle, toe, far ? 8.0 : 9.2, fill, palette.outline, 2.0);
    const angle = segmentAngle(ankle, toe);
    const soleA = { x: ankle.x + Math.sin(angle) * 3.2, y: ankle.y - Math.cos(angle) * 3.2 };
    const soleB = { x: toe.x + Math.cos(angle) * 2.6 + Math.sin(angle) * 3.0, y: toe.y + Math.sin(angle) * 2.6 - Math.cos(angle) * 3.0 };
    line(soleA, soleB, far ? 2.0 : 2.4, palette.bootsShadow);
  }

  function drawFemaleLeg(points, side, palette, far) {
    const hip = points[`${side}Hip`];
    const knee = points[`${side}Knee`];
    const ankle = points[`${side}Ankle`];
    const toe = points[`${side}Toe`];
    const trousers = far ? palette.trousersShadow : palette.trousers;
    const boots = far ? palette.bootsShadow : palette.boots;
    const bootTop = pointBetween(knee, ankle, .60);

    roundedSegment(hip, knee, far ? 9.8 : 11.2, trousers, palette.outline);
    roundedSegment(knee, bootTop, far ? 8.8 : 10.0, trousers, palette.outline);
    roundedSegment(bootTop, ankle, far ? 7.5 : 8.5, boots, palette.outline);
    drawFemaleBoot(ankle, toe, palette, far);

    if (!far && palette.trousersLight) {
      line(pointBetween(hip, knee, .2), pointBetween(hip, knee, .52), .9, palette.trousersLight);
    }
  }

  function drawFemaleTorso(points, palette) {
    const shoulder = points.shoulder;
    const pelvis = points.pelvis;
    const dx = pelvis.x - shoulder.x;
    const dy = pelvis.y - shoulder.y;
    const length = Math.max(.001, Math.hypot(dx, dy));
    const downX = dx / length;
    const downY = dy / length;
    const sideX = -downY;
    const sideY = downX;
    const frontX = -sideX;
    const frontY = -sideY;
    const backX = sideX;
    const backY = sideY;

    const upperChest = pointBetween(shoulder, pelvis, .26);
    const chest = pointBetween(shoulder, pelvis, .39);
    const underChest = pointBetween(shoulder, pelvis, .52);
    const waist = pointBetween(shoulder, pelvis, .76);
    const hem = { x: pelvis.x + downX * 15.5, y: pelvis.y + downY * 15.5 };

    // Cream blouse establishes the shoulder line and a modest side-profile chest contour.
    ctx.beginPath();
    ctx.moveTo(shoulder.x + backX * 8.8 - downX * 4, shoulder.y + backY * 8.8 - downY * 4);
    ctx.lineTo(shoulder.x + frontX * 9.3 - downX * 3, shoulder.y + frontY * 9.3 - downY * 3);
    ctx.quadraticCurveTo(
      chest.x + frontX * 13.6, chest.y + frontY * 13.6,
      underChest.x + frontX * 10.2, underChest.y + frontY * 10.2
    );
    ctx.lineTo(waist.x + frontX * 7.8, waist.y + frontY * 7.8);
    ctx.lineTo(waist.x + backX * 7.4, waist.y + backY * 7.4);
    ctx.lineTo(upperChest.x + backX * 8.2, upperChest.y + backY * 8.2);
    ctx.closePath();
    ctx.fillStyle = palette.blouse;
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = palette.outline;
    ctx.stroke();

    // Brown vest follows the same body rather than hiding the silhouette under a box.
    ctx.beginPath();
    ctx.moveTo(upperChest.x + backX * 7.9, upperChest.y + backY * 7.9);
    ctx.lineTo(upperChest.x + frontX * 8.6, upperChest.y + frontY * 8.6);
    ctx.quadraticCurveTo(
      chest.x + frontX * 11.7, chest.y + frontY * 11.7,
      underChest.x + frontX * 8.9, underChest.y + frontY * 8.9
    );
    ctx.lineTo(waist.x + frontX * 7.2, waist.y + frontY * 7.2);
    ctx.lineTo(hem.x + frontX * 9.8, hem.y + frontY * 9.8);
    ctx.lineTo(hem.x + backX * 9.2, hem.y + backY * 9.2);
    ctx.lineTo(waist.x + backX * 7.0, waist.y + backY * 7.0);
    ctx.closePath();
    ctx.fillStyle = palette.vest;
    ctx.fill();
    ctx.lineWidth = 1.35;
    ctx.strokeStyle = palette.outline;
    ctx.stroke();

    ctx.strokeStyle = palette.vestLight;
    ctx.lineWidth = .9;
    ctx.beginPath();
    ctx.moveTo(upperChest.x + frontX * 6.5, upperChest.y + frontY * 6.5);
    ctx.quadraticCurveTo(chest.x + frontX * 9.2, chest.y + frontY * 9.2, underChest.x + frontX * 6.6, underChest.y + frontY * 6.6);
    ctx.stroke();

    const beltCenter = pointBetween(shoulder, pelvis, .87);
    line(
      { x: beltCenter.x + backX * 8.0, y: beltCenter.y + backY * 8.0 },
      { x: beltCenter.x + frontX * 8.7, y: beltCenter.y + frontY * 8.7 },
      3.6,
      palette.belt
    );
    ellipse({ x: beltCenter.x + frontX * 6.0, y: beltCenter.y + frontY * 6.0 }, 1.9, 1.5, segmentAngle(shoulder, pelvis), palette.buckle, palette.outlineSoft, .7);
  }

  function drawFemaleHead(points, pose, palette, ghost) {
    const h = points.head;
    roundedSegment(points.shoulder, points.neck, 5.9, palette.skinShadow, palette.outline, 1.9);
    roundedSegment(points.neck, { x: h.x - 5.2, y: h.y + 10.4 }, 6.2, palette.skin, palette.outline, 1.9);

    // East-facing profile with a slightly softer jaw and smaller facial mass than the male shell.
    ctx.beginPath();
    ctx.moveTo(h.x - 7.0, h.y - 13.0);
    ctx.bezierCurveTo(h.x - 1.5, h.y - 16.8, h.x + 5.7, h.y - 14.4, h.x + 8.5, h.y - 8.6);
    ctx.quadraticCurveTo(h.x + 9.8, h.y - 5.2, h.x + 10.0, h.y - 2.4);
    ctx.quadraticCurveTo(h.x + 12.0, h.y - .8, h.x + 15.0, h.y + .7);
    ctx.quadraticCurveTo(h.x + 12.8, h.y + 2.8, h.x + 10.0, h.y + 3.1);
    ctx.quadraticCurveTo(h.x + 11.8, h.y + 4.8, h.x + 10.4, h.y + 6.2);
    ctx.quadraticCurveTo(h.x + 8.7, h.y + 10.8, h.x + 4.0, h.y + 13.3);
    ctx.quadraticCurveTo(h.x - 1.6, h.y + 15.8, h.x - 7.3, h.y + 9.7);
    ctx.quadraticCurveTo(h.x - 10.3, h.y + 3.8, h.x - 10.0, h.y - 4.2);
    ctx.quadraticCurveTo(h.x - 9.6, h.y - 9.9, h.x - 7.0, h.y - 13.0);
    ctx.closePath();
    ctx.fillStyle = palette.skin;
    ctx.fill();
    ctx.lineWidth = 1.35;
    ctx.strokeStyle = palette.outline;
    ctx.stroke();

    // Auburn hair and ponytail carry over the established female hero identity.
    ctx.beginPath();
    ctx.moveTo(h.x - 11.0, h.y + 7.0);
    ctx.bezierCurveTo(h.x - 15.0, h.y - 1.0, h.x - 13.0, h.y - 12.0, h.x - 4.2, h.y - 17.0);
    ctx.bezierCurveTo(h.x + 1.0, h.y - 19.0, h.x + 7.4, h.y - 16.0, h.x + 8.2, h.y - 10.6);
    ctx.lineTo(h.x + 4.0, h.y - 7.2);
    ctx.lineTo(h.x + .8, h.y - 10.0);
    ctx.quadraticCurveTo(h.x - 2.0, h.y - 5.0, h.x - 3.7, h.y - .8);
    ctx.quadraticCurveTo(h.x - 6.8, h.y + 3.0, h.x - 7.4, h.y + 9.0);
    ctx.closePath();
    ctx.fillStyle = palette.hair;
    ctx.fill();
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = palette.outline;
    ctx.stroke();

    const gaitSwing = Math.max(-5, Math.min(5, (pose.nearThigh - pose.farThigh) * .09));
    const ponyRoot = { x: h.x - 10.3, y: h.y - 2.0 };
    const ponyMid = { x: h.x - 16.0 - gaitSwing * .35, y: h.y + 8.0 };
    const ponyEnd = { x: h.x - 14.0 - gaitSwing, y: h.y + 22.0 };
    roundedSegment(ponyRoot, ponyMid, 7.2, palette.hair, palette.outline, 1.8);
    roundedSegment(ponyMid, ponyEnd, 6.4, palette.hairShadow, palette.outline, 1.8);

    if (!ghost) {
      ctx.strokeStyle = palette.hairLight;
      ctx.lineWidth = .85;
      ctx.beginPath();
      ctx.moveTo(h.x - 8.0, h.y - 9.0);
      ctx.quadraticCurveTo(h.x - 2.0, h.y - 15.0, h.x + 3.0, h.y - 13.0);
      ctx.stroke();

      ctx.strokeStyle = palette.hairShadow;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(h.x + 5.5, h.y - 7.0);
      ctx.lineTo(h.x + 8.7, h.y - 7.4);
      ctx.stroke();

      ctx.fillStyle = palette.outline;
      ctx.beginPath();
      ctx.arc(h.x + 7.2, h.y - 4.8, 1.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = palette.skinShadow;
      ctx.lineWidth = .8;
      ctx.beginPath();
      ctx.moveTo(h.x + 9.7, h.y + 5.9);
      ctx.quadraticCurveTo(h.x + 11.2, h.y + 6.4, h.x + 12.1, h.y + 5.7);
      ctx.stroke();
    }
  }

  function drawFemaleBody(pose, options = {}) {
    const points = buildSkeleton(pose);
    const ghost = Boolean(options.ghost);
    const palette = ghost ? GHOST : COLORS;

    ctx.save();
    ctx.globalAlpha = options.alpha ?? Number(opacityInput?.value || 90) / 100;
    drawFemaleLeg(points, 'far', palette, true);
    drawFemaleArm(points, 'far', palette, true);
    drawFemaleTorso(points, palette);
    drawFemaleHead(points, pose, palette, ghost);
    drawFemaleLeg(points, 'near', palette, false);
    drawFemaleArm(points, 'near', palette, false);
    ctx.restore();
    return points;
  }

  function drawGuides() {
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
  }

  function drawFootMarkers(points) {
    [['N', points.nearAnkle], ['F', points.farAnkle]].forEach(([label, point]) => {
      const distance = Math.round(FLOOR_Y - point.y);
      ctx.font = '700 7px ui-monospace, Consolas, monospace';
      ctx.fillStyle = Math.abs(distance) <= 3 ? '#9cffb1' : '#efc982';
      ctx.fillText(`${label}${distance >= 0 ? '+' : ''}${distance}`, Math.min(FRAME_W - 20, point.x + 3), Math.min(FRAME_H - 5, point.y + 9));
    });
  }

  function selectedPoseId() {
    return poseStrip.querySelector('button.selected')?.dataset.poseId || 'idle';
  }

  function previousPoseId() {
    const id = selectedPoseId();
    if (id === 'idle') return null;
    const index = Number(id.replace('walk', ''));
    return index === 1 ? 'walk8' : `walk${index - 1}`;
  }

  function selectedViewMode() {
    return viewButtons.find((button) => button.classList.contains('selected'))?.dataset.viewMode || 'both';
  }

  function selectedBodyStyle() {
    return bodyStyleButtons.find((button) => button.classList.contains('selected'))?.dataset.bodyStyle || lab.getBodyStyle();
  }

  function updateGenderButtons() {
    genderButtons.forEach((button) => {
      const selected = button.dataset.heroGender === heroGender;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function showRequestedViewButtons() {
    viewButtons.forEach((button) => {
      const selected = button.dataset.viewMode === femaleViewMode;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function refreshValidation() {
    const validation = window.AvendorHeroAnimationLabValidation;
    if (validation?.setDirectionMode && validation?.getDirectionMode) {
      validation.setDirectionMode(validation.getDirectionMode());
    }
  }

  function composeFemale() {
    composeQueued = false;
    if (composing || heroGender !== 'female' || selectedBodyStyle() !== 'hero') return;
    composing = true;

    const poses = lab.getPoses();
    const poseId = selectedPoseId();
    const pose = poses[poseId];
    const previous = previousPoseId();

    // Keep the core renderer in Rig mode while female Hero is selected. We snapshot that
    // diagnostic layer, then place the female lab skin underneath it when Body + Rig is requested.
    lab.setViewMode('skeleton');
    rigCtx.clearRect(0, 0, FRAME_W, FRAME_H);
    rigCtx.drawImage(canvas, 0, 0, FRAME_W, FRAME_H);

    ctx.clearRect(0, 0, FRAME_W, FRAME_H);

    if (femaleViewMode === 'skeleton') {
      ctx.drawImage(rigBuffer, 0, 0);
    } else {
      drawGuides();
      if (onionToggle?.checked && previous && poses[previous]) {
        drawFemaleBody(poses[previous], { ghost: true, alpha: (Number(opacityInput?.value || 90) / 100) * .30 });
      }
      const points = drawFemaleBody(pose, { alpha: Number(opacityInput?.value || 90) / 100 });
      if (femaleViewMode === 'both') ctx.drawImage(rigBuffer, 0, 0);
      else drawFootMarkers(points);
    }

    showRequestedViewButtons();
    refreshValidation();
    if (status) status.textContent = `${poseId.toUpperCase()} · Female Hero validation · same approved candidate 0.3 motion`;
    composing = false;
  }

  function queueCompose() {
    if (composeQueued) return;
    composeQueued = true;
    queueMicrotask(composeFemale);
  }

  function syncCurrentMode() {
    updateGenderButtons();
    if (heroGender === 'female' && selectedBodyStyle() === 'hero') {
      queueCompose();
      return;
    }

    lab.setViewMode(femaleViewMode);
    refreshValidation();
    if (status && heroGender === 'male') {
      status.textContent = `${selectedPoseId().toUpperCase()} · Male Hero validation · approved candidate 0.3`;
    } else if (status) {
      status.textContent = 'Proxy is a neutral rig reference; switch back to Hero skin to compare Male / Female silhouettes.';
    }
  }

  genderButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (heroGender === button.dataset.heroGender) return;
      if (heroGender === 'male') femaleViewMode = selectedViewMode();
      heroGender = button.dataset.heroGender === 'female' ? 'female' : 'male';
      syncCurrentMode();
    });
  });

  viewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      femaleViewMode = button.dataset.viewMode || 'both';
      if (heroGender === 'female' && selectedBodyStyle() === 'hero') queueCompose();
    });
  });

  bodyStyleButtons.forEach((button) => button.addEventListener('click', () => queueMicrotask(syncCurrentMode)));
  sliderGrid?.addEventListener('input', queueCompose);
  opacityInput?.addEventListener('input', queueCompose);
  onionToggle?.addEventListener('change', queueCompose);

  const poseObserver = new MutationObserver(queueCompose);
  poseObserver.observe(poseStrip, { subtree: true, attributes: true, attributeFilter: ['class'] });

  updateGenderButtons();

  window.AvendorHeroAnimationLabGender = Object.freeze({
    version: VERSION,
    getGender: () => heroGender,
    setGender: (gender) => {
      heroGender = gender === 'female' ? 'female' : 'male';
      syncCurrentMode();
    },
    getFemaleViewMode: () => femaleViewMode,
    redraw: queueCompose
  });
})();
