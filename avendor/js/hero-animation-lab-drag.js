(() => {
  'use strict';

  const VERSION = '0.3.0';
  const FRAME_W = 128;
  const FRAME_H = 240;
  const HIT_RADIUS = 8;
  const HANDLE_RADIUS = 3.3;

  const overlay = document.getElementById('hero-animation-handle-canvas');
  const ctx = overlay?.getContext('2d');
  const sliderGrid = document.getElementById('lab-sliders');
  const poseStrip = document.getElementById('lab-pose-strip');
  const status = document.getElementById('lab-status');
  const playButton = document.getElementById('lab-play');
  const lab = window.AvendorHeroAnimationLab;

  if (!overlay || !ctx || !sliderGrid || !poseStrip || !lab) return;

  const MEASUREMENTS = lab.measurements;

  const CONTROL_LIMITS = Object.freeze({
    pelvisY: [122, 130], torsoLean: [-8, 8], headForward: [-4, 10],
    nearUpperArm: [-40, 40], nearForearm: [-40, 40], farUpperArm: [-40, 40], farForearm: [-40, 40],
    nearThigh: [-35, 35], nearShin: [-25, 35], farThigh: [-35, 35], farShin: [-25, 35],
    nearFoot: [-15, 15], farFoot: [-15, 15]
  });

  const CONTROL_GROUPS = Object.freeze([
    Object.freeze({ id: 'head-pelvis', label: 'Head & Pelvis Control', keys: Object.freeze(['pelvisY', 'torsoLean', 'headForward']) }),
    Object.freeze({ id: 'arms', label: 'Arm Controls', keys: Object.freeze(['nearUpperArm', 'nearForearm', 'farUpperArm', 'farForearm']) }),
    Object.freeze({ id: 'legs', label: 'Leg Controls', keys: Object.freeze(['nearThigh', 'nearShin', 'farThigh', 'farShin', 'nearFoot', 'farFoot']) })
  ]);

  const HANDLE_DEFS = Object.freeze([
    Object.freeze({ id: 'head', label: 'Head', point: 'head', tone: 'core' }),
    Object.freeze({ id: 'shoulder', label: 'Shoulder / torso', point: 'shoulder', tone: 'core' }),
    Object.freeze({ id: 'pelvis', label: 'Pelvis', point: 'pelvis', tone: 'core' }),
    Object.freeze({ id: 'nearElbow', label: 'Near elbow', point: 'nearElbow', tone: 'near' }),
    Object.freeze({ id: 'nearWrist', label: 'Near wrist', point: 'nearWrist', tone: 'near' }),
    Object.freeze({ id: 'farElbow', label: 'Far elbow', point: 'farElbow', tone: 'far' }),
    Object.freeze({ id: 'farWrist', label: 'Far wrist', point: 'farWrist', tone: 'far' }),
    Object.freeze({ id: 'nearKnee', label: 'Near knee', point: 'nearKnee', tone: 'near' }),
    Object.freeze({ id: 'nearAnkle', label: 'Near ankle', point: 'nearAnkle', tone: 'near' }),
    Object.freeze({ id: 'nearToe', label: 'Near foot', point: 'nearToe', tone: 'near' }),
    Object.freeze({ id: 'farKnee', label: 'Far knee', point: 'farKnee', tone: 'far' }),
    Object.freeze({ id: 'farAnkle', label: 'Far ankle', point: 'farAnkle', tone: 'far' }),
    Object.freeze({ id: 'farToe', label: 'Far foot', point: 'farToe', tone: 'far' })
  ]);

  let hoveredHandleId = null;
  let activeHandleId = null;
  let activePointerId = null;
  let renderQueued = false;

  function radians(degrees) { return degrees * Math.PI / 180; }
  function fromDown(origin, length, degrees) {
    const angle = radians(degrees);
    return { x: origin.x + Math.sin(angle) * length, y: origin.y + Math.cos(angle) * length };
  }
  function fromUp(origin, length, degrees) {
    const angle = radians(degrees);
    return { x: origin.x + Math.sin(angle) * length, y: origin.y - Math.cos(angle) * length };
  }
  function footTip(ankle, length, degrees) {
    const angle = radians(degrees);
    return { x: ankle.x + Math.cos(angle) * length, y: ankle.y + Math.sin(angle) * length };
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
      pelvis, shoulder, neck, headBase, head, nearShoulder, farShoulder, nearHip, farHip,
      nearElbow, nearWrist, farElbow, farWrist, nearKnee, nearAnkle, farKnee, farAnkle,
      nearToe: footTip(nearAnkle, MEASUREMENTS.foot, pose.nearFoot),
      farToe: footTip(farAnkle, MEASUREMENTS.foot, pose.farFoot)
    };
  }

  function selectedPoseId() { return poseStrip.querySelector('button.selected')?.dataset.poseId || 'idle'; }
  function currentPose() {
    const poses = lab.getPoses();
    return poses[selectedPoseId()] || poses.idle;
  }
  function currentHandles() {
    const pose = currentPose();
    const points = buildSkeleton(pose);
    return { pose, points, handles: HANDLE_DEFS.map((definition) => ({ ...definition, position: points[definition.point] })) };
  }
  function canvasPoint(event) {
    const rect = overlay.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * FRAME_W, y: ((event.clientY - rect.top) / rect.height) * FRAME_H };
  }
  function nearestHandle(point, handles) {
    let best = null;
    let bestDistance = HIT_RADIUS;
    handles.forEach((handle) => {
      const distance = Math.hypot(point.x - handle.position.x, point.y - handle.position.y);
      if (distance <= bestDistance) { best = handle; bestDistance = distance; }
    });
    return best;
  }

  function degreesFromDown(origin, target) { return Math.atan2(target.x - origin.x, target.y - origin.y) * 180 / Math.PI; }
  function degreesFromUp(origin, target) { return Math.atan2(target.x - origin.x, origin.y - target.y) * 180 / Math.PI; }
  function degreesFromRight(origin, target) { return Math.atan2(target.y - origin.y, target.x - origin.x) * 180 / Math.PI; }
  function clampControl(key, rawValue) {
    const [minimum, maximum] = CONTROL_LIMITS[key];
    return Math.max(minimum, Math.min(maximum, Math.round(rawValue)));
  }
  function setControl(key, rawValue) {
    const input = document.getElementById(`lab-control-${key}`);
    if (!input) return null;
    const value = clampControl(key, rawValue);
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return value;
  }

  function updatePoseFromHandle(handleId, target) {
    const { points } = currentHandles();
    let key = null;
    let value = null;
    switch (handleId) {
      case 'head': key = 'headForward'; value = target.x - points.headBase.x; break;
      case 'shoulder': key = 'torsoLean'; value = degreesFromUp(points.pelvis, target); break;
      case 'pelvis': key = 'pelvisY'; value = target.y; break;
      case 'nearElbow': key = 'nearUpperArm'; value = degreesFromDown(points.nearShoulder, target); break;
      case 'nearWrist': key = 'nearForearm'; value = degreesFromDown(points.nearElbow, target); break;
      case 'farElbow': key = 'farUpperArm'; value = degreesFromDown(points.farShoulder, target); break;
      case 'farWrist': key = 'farForearm'; value = degreesFromDown(points.farElbow, target); break;
      case 'nearKnee': key = 'nearThigh'; value = degreesFromDown(points.nearHip, target); break;
      case 'nearAnkle': key = 'nearShin'; value = degreesFromDown(points.nearKnee, target); break;
      case 'nearToe': key = 'nearFoot'; value = degreesFromRight(points.nearAnkle, target); break;
      case 'farKnee': key = 'farThigh'; value = degreesFromDown(points.farHip, target); break;
      case 'farAnkle': key = 'farShin'; value = degreesFromDown(points.farKnee, target); break;
      case 'farToe': key = 'farFoot'; value = degreesFromRight(points.farAnkle, target); break;
      default: return;
    }
    const resolved = setControl(key, value);
    const label = HANDLE_DEFS.find((handle) => handle.id === handleId)?.label || 'Joint';
    if (status && resolved !== null) status.textContent = `${label} dragged · ${key} ${resolved}${key === 'pelvisY' || key === 'headForward' ? 'px' : '°'}`;
  }

  function handleFill(tone) {
    if (tone === 'near') return '#f0ce86';
    if (tone === 'far') return '#819aa5';
    return '#78e3f2';
  }
  function renderHandles() {
    ctx.clearRect(0, 0, FRAME_W, FRAME_H);
    const { handles } = currentHandles();
    handles.forEach((handle) => {
      const active = handle.id === activeHandleId;
      const hovered = handle.id === hoveredHandleId;
      const radius = active || hovered ? HANDLE_RADIUS + 1.2 : HANDLE_RADIUS;
      ctx.beginPath();
      ctx.arc(handle.position.x, handle.position.y, radius + 1.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(5,9,12,.86)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(handle.position.x, handle.position.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = active ? '#ffffff' : handleFill(handle.tone);
      ctx.fill();
      ctx.lineWidth = active || hovered ? 1.35 : .8;
      ctx.strokeStyle = active || hovered ? '#ffffff' : 'rgba(6,12,15,.92)';
      ctx.stroke();
    });
    const highlighted = handles.find((handle) => handle.id === activeHandleId) || handles.find((handle) => handle.id === hoveredHandleId);
    if (highlighted) {
      const textX = Math.max(3, Math.min(FRAME_W - 48, highlighted.position.x + 5));
      const textY = Math.max(9, Math.min(FRAME_H - 4, highlighted.position.y - 6));
      ctx.font = '700 6px ui-monospace, Consolas, monospace';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(4,7,9,.92)';
      ctx.strokeText(highlighted.label, textX, textY);
      ctx.fillStyle = '#eafcff';
      ctx.fillText(highlighted.label, textX, textY);
    }
  }
  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    queueMicrotask(() => { renderQueued = false; renderHandles(); });
  }
  function stopPlaybackForDrag() {
    if (playButton?.getAttribute('aria-pressed') === 'true') playButton.click();
  }

  function organizeControlGroups() {
    const rows = new Map();
    sliderGrid.querySelectorAll('.slider-row').forEach((row) => {
      const input = row.querySelector('input[id^="lab-control-"]');
      if (input) rows.set(input.id.replace('lab-control-', ''), row);
    });
    sliderGrid.textContent = '';
    CONTROL_GROUPS.forEach((group) => {
      const section = document.createElement('section');
      section.className = 'pose-control-group';
      section.dataset.controlGroup = group.id;
      const heading = document.createElement('h3');
      heading.textContent = group.label;
      const grid = document.createElement('div');
      grid.className = 'pose-control-group-grid';
      group.keys.forEach((key) => { const row = rows.get(key); if (row) grid.appendChild(row); });
      section.append(heading, grid);
      sliderGrid.appendChild(section);
    });
  }

  overlay.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    const hit = nearestHandle(point, currentHandles().handles);
    if (!hit) return;
    event.preventDefault();
    stopPlaybackForDrag();
    activeHandleId = hit.id;
    hoveredHandleId = hit.id;
    activePointerId = event.pointerId;
    overlay.classList.add('dragging');
    overlay.setPointerCapture(event.pointerId);
    renderHandles();
  });
  overlay.addEventListener('pointermove', (event) => {
    const point = canvasPoint(event);
    if (activeHandleId && event.pointerId === activePointerId) {
      event.preventDefault();
      updatePoseFromHandle(activeHandleId, point);
      scheduleRender();
      return;
    }
    const hit = nearestHandle(point, currentHandles().handles);
    const nextHover = hit?.id || null;
    if (nextHover !== hoveredHandleId) {
      hoveredHandleId = nextHover;
      overlay.style.cursor = hoveredHandleId ? 'grab' : 'default';
      renderHandles();
    }
  });
  function finishDrag(event) {
    if (activePointerId !== null && event.pointerId !== activePointerId) return;
    if (activePointerId !== null && overlay.hasPointerCapture(activePointerId)) overlay.releasePointerCapture(activePointerId);
    activeHandleId = null;
    activePointerId = null;
    overlay.classList.remove('dragging');
    scheduleRender();
  }
  overlay.addEventListener('pointerup', finishDrag);
  overlay.addEventListener('pointercancel', finishDrag);
  overlay.addEventListener('pointerleave', () => {
    if (activeHandleId) return;
    hoveredHandleId = null;
    overlay.style.cursor = 'default';
    renderHandles();
  });

  sliderGrid.addEventListener('input', scheduleRender);
  document.getElementById('lab-reset-pose')?.addEventListener('click', () => queueMicrotask(renderHandles));
  document.getElementById('lab-reset-all')?.addEventListener('click', () => queueMicrotask(renderHandles));
  document.getElementById('lab-prev')?.addEventListener('click', () => queueMicrotask(renderHandles));
  document.getElementById('lab-next')?.addEventListener('click', () => queueMicrotask(renderHandles));
  const poseObserver = new MutationObserver(scheduleRender);
  poseObserver.observe(poseStrip, { subtree: true, attributes: true, attributeFilter: ['class'] });

  organizeControlGroups();
  renderHandles();

  window.AvendorHeroAnimationLabDrag = Object.freeze({
    version: VERSION,
    renderHandles,
    getControlGroups: () => CONTROL_GROUPS.map((group) => ({ label: group.label, keys: [...group.keys] }))
  });
})();
