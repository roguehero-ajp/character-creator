(() => {
  'use strict';

  const FRAME_W = 128;
  const FRAME_H = 240;
  const FLOOR_Y = 226;
  const LAB_VERSION = '0.2.0';
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

  const DEFAULT_POSES = Object.freeze({
    idle: Object.freeze({
      pelvisY: 126, torsoLean: 1, headForward: 4,
      nearUpperArm: 4, nearForearm: 2, farUpperArm: -5, farForearm: -2,
      nearThigh: 2, nearShin: 0, farThigh: -3, farShin: 2,
      nearFoot: 0, farFoot: 0
    }),
    walk1: Object.freeze({
      pelvisY: 126, torsoLean: 2, headForward: 5,
      nearUpperArm: -22, nearForearm: -12, farUpperArm: 22, farForearm: 10,
      nearThigh: 22, nearShin: -5, farThigh: -24, farShin: 13,
      nearFoot: 0, farFoot: 4
    }),
    walk2: Object.freeze({
      pelvisY: 128, torsoLean: 3, headForward: 5,
      nearUpperArm: -16, nearForearm: -8, farUpperArm: 16, farForearm: 8,
      nearThigh: 16, nearShin: 10, farThigh: -18, farShin: 2,
      nearFoot: 1, farFoot: 2
    }),
    walk3: Object.freeze({
      pelvisY: 127, torsoLean: 2, headForward: 5,
      nearUpperArm: -8, nearForearm: -4, farUpperArm: 8, farForearm: 4,
      nearThigh: 7, nearShin: 24, farThigh: -7, farShin: -12,
      nearFoot: 3, farFoot: -2
    }),
    walk4: Object.freeze({
      pelvisY: 124, torsoLean: 1, headForward: 4,
      nearUpperArm: 8, nearForearm: 4, farUpperArm: -8, farForearm: -4,
      nearThigh: -10, nearShin: 28, farThigh: 11, farShin: -8,
      nearFoot: 5, farFoot: 0
    }),
    walk5: Object.freeze({
      pelvisY: 126, torsoLean: 2, headForward: 5,
      nearUpperArm: 22, nearForearm: 10, farUpperArm: -22, farForearm: -12,
      nearThigh: -24, nearShin: 13, farThigh: 22, farShin: -5,
      nearFoot: 4, farFoot: 0
    }),
    walk6: Object.freeze({
      pelvisY: 128, torsoLean: 3, headForward: 5,
      nearUpperArm: 16, nearForearm: 8, farUpperArm: -16, farForearm: -8,
      nearThigh: -18, nearShin: 2, farThigh: 16, farShin: 10,
      nearFoot: 2, farFoot: 1
    }),
    walk7: Object.freeze({
      pelvisY: 127, torsoLean: 2, headForward: 5,
      nearUpperArm: 8, nearForearm: 4, farUpperArm: -8, farForearm: -4,
      nearThigh: -7, nearShin: -12, farThigh: 7, farShin: 24,
      nearFoot: -2, farFoot: 3
    }),
    walk8: Object.freeze({
      pelvisY: 124, torsoLean: 1, headForward: 4,
      nearUpperArm: -8, nearForearm: -4, farUpperArm: 8, farForearm: 4,
      nearThigh: 11, nearShin: -8, farThigh: -10, farShin: 28,
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
      pelvis, shoulder, neck, head,
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

  function drawBody(pose, options = {}) {
    const points = buildSkeleton(pose);
    const ghost = Boolean(options.ghost);
    const alpha = options.alpha ?? bodyOpacity;
    const palette = ghost
      ? {
          outline: 'rgba(118,220,237,.38)', hair: 'rgba(94,180,194,.22)', hairShadow: 'rgba(94,180,194,.16)',
          skin: 'rgba(126,219,235,.24)', skinShadow: 'rgba(126,219,235,.17)', shirt: 'rgba(126,219,235,.18)',
          shirtShadow: 'rgba(126,219,235,.13)', tunic: 'rgba(126,219,235,.20)', tunicShadow: 'rgba(126,219,235,.14)',
          trousers: 'rgba(126,219,235,.17)', trousersShadow: 'rgba(126,219,235,.12)', boot: 'rgba(126,219,235,.15)',
          bootShadow: 'rgba(126,219,235,.10)', belt: 'rgba(126,219,235,.18)'
        }
      : BODY_PALETTE;

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
    ctx.ellipse(
      points.head.x,
      points.head.y,
      MEASUREMENTS.headRadius * .80,
      MEASUREMENTS.headRadius * 1.02,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = palette.skin;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = palette.outline;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      points.head.x - 3,
      points.head.y - 7,
      MEASUREMENTS.headRadius * .76,
      MEASUREMENTS.headRadius * .62,
      -0.12,
      Math.PI,
      Math.PI * 2
    );
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
    setStatus(`${POSE_LABELS[id]} selected · proportions locked · east profile`);
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
  syncBodyOpacity();
  syncPlaybackSpeed();
  selectPose('idle');
  refreshOutput();
  requestAnimationFrame(playbackTick);

  window.AvendorHeroAnimationLab = Object.freeze({
    version: LAB_VERSION,
    measurements: MEASUREMENTS,
    getPoses: () => JSON.parse(JSON.stringify(poses)),
    exportJson: serialise,
    selectPose,
    setViewMode,
    resetPose,
    resetAll
  });
})();
