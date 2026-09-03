(() => {
  'use strict';

  const Rig = window.AvendorFemaleSERig;
  const Painted = window.AvendorFemalePaintedSERig;
  if (!Rig || !Painted) return;

  const FRAME_W = 128;
  const FRAME_H = 240;
  const BASE_INDICES = [0, 1, 2, 4, 5, 6, 7, 9];
  const HANDLE_RADIUS = 4.1;
  const HIT_RADIUS = 9;

  const $ = (id) => document.getElementById(id);
  const canvas = $('studio-canvas');
  const overlay = $('studio-overlay');
  const ctx = canvas?.getContext('2d');
  const octx = overlay?.getContext('2d');
  const frameStrip = $('studio-frame-strip');
  const status = $('studio-status');
  const jsonBox = $('studio-json');
  if (!canvas || !overlay || !ctx || !octx || !frameStrip || !status || !jsonBox) return;

  const ui = {
    prev: $('studio-prev'), play: $('studio-play'), next: $('studio-next'),
    duplicate: $('studio-duplicate'), resetFrame: $('studio-reset-frame'),
    lockFrame: $('studio-lock-frame'), onionPrev: $('studio-onion-prev'), onionNext: $('studio-onion-next'),
    showHandles: $('studio-show-handles'), lockLeft: $('studio-lock-left-foot'), lockRight: $('studio-lock-right-foot'),
    leftStatus: $('studio-left-foot-status'), rightStatus: $('studio-right-foot-status'),
    speed: $('studio-speed'), speedOutput: $('studio-speed-output'),
    copyJson: $('studio-copy-json'), pasteJson: $('studio-paste-json'), exportPng: $('studio-export-png')
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const radians = (degrees) => degrees * Math.PI / 180;
  const degrees = (angle) => angle * 180 / Math.PI;
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const angle = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const lerpPoint = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  function legMetrics(leg) {
    const lowerLength = dist(leg.knee, leg.toe);
    const ankleRatio = lowerLength > 0 ? clamp(dist(leg.knee, leg.ankle) / lowerLength, 0.1, 0.95) : 0.72;
    return { thigh: dist(leg.hip, leg.knee), lower: lowerLength, ankleRatio };
  }

  function frameFromPose(pose, index) {
    return {
      id: index + 1,
      locked: false,
      footLocks: { screenLeft: null, screenRight: null },
      pose: clone(pose),
      metrics: {
        screenLeft: legMetrics(pose.screenLeft),
        screenRight: legMetrics(pose.screenRight)
      }
    };
  }

  const state = {
    ready: false,
    selected: 0,
    baseline: BASE_INDICES.map((index) => clone(Rig.SE_POSES[index])),
    frames: [],
    playing: false,
    timer: null,
    drag: null,
    hover: null,
    renderQueued: false
  };
  state.frames = state.baseline.map(frameFromPose);

  const currentFrame = () => state.frames[state.selected];
  const currentPose = () => currentFrame().pose;
  const previousIndex = () => (state.selected + 7) % 8;
  const nextIndex = () => (state.selected + 1) % 8;

  function updateAnkle(leg, metrics) {
    leg.ankle = lerpPoint(leg.knee, leg.toe, metrics.ankleRatio).map(Math.round);
  }

  function solveKnee(hip, toe, metrics, preferredKnee) {
    let dx = toe[0] - hip[0];
    let dy = toe[1] - hip[1];
    let d = Math.hypot(dx, dy);
    const minD = Math.abs(metrics.thigh - metrics.lower) + 0.001;
    const maxD = metrics.thigh + metrics.lower - 0.001;
    d = clamp(d, minD, maxD);
    if (d < 0.001) { dx = 0.001; dy = 0; d = 0.001; }

    const ux = dx / d;
    const uy = dy / d;
    const along = (metrics.thigh ** 2 - metrics.lower ** 2 + d ** 2) / (2 * d);
    const height = Math.sqrt(Math.max(0, metrics.thigh ** 2 - along ** 2));
    const mid = [hip[0] + ux * along, hip[1] + uy * along];
    const perp = [-uy, ux];
    const candidateA = [mid[0] + perp[0] * height, mid[1] + perp[1] * height];
    const candidateB = [mid[0] - perp[0] * height, mid[1] - perp[1] * height];
    const da = Math.hypot(candidateA[0] - preferredKnee[0], candidateA[1] - preferredKnee[1]);
    const db = Math.hypot(candidateB[0] - preferredKnee[0], candidateB[1] - preferredKnee[1]);
    return (da <= db ? candidateA : candidateB).map(Math.round);
  }

  function solveLegToFoot(pose, side, targetToe, frame, preferredKnee = null) {
    const leg = pose[side];
    const metrics = frame.metrics[side];
    const preferred = preferredKnee || leg.knee;
    leg.toe = [Math.round(targetToe[0]), Math.round(targetToe[1])];
    leg.knee = solveKnee(leg.hip, leg.toe, metrics, preferred);
    updateAnkle(leg, metrics);
  }

  function moveKnee(pose, side, target, frame) {
    const leg = pose[side];
    const metrics = frame.metrics[side];
    const upperAngle = angle(leg.hip, target);
    const oldUpperAngle = angle(leg.hip, leg.knee);
    const oldLowerAngle = angle(leg.knee, leg.toe);
    const relativeLowerAngle = oldLowerAngle - oldUpperAngle;

    leg.knee = [
      Math.round(leg.hip[0] + Math.cos(upperAngle) * metrics.thigh),
      Math.round(leg.hip[1] + Math.sin(upperAngle) * metrics.thigh)
    ];

    const lowerAngle = upperAngle + relativeLowerAngle;
    leg.toe = [
      Math.round(leg.knee[0] + Math.cos(lowerAngle) * metrics.lower),
      Math.round(leg.knee[1] + Math.sin(lowerAngle) * metrics.lower)
    ];
    updateAnkle(leg, metrics);
  }

  function shiftLeg(leg, dx, dy) {
    ['hip', 'knee', 'ankle', 'toe'].forEach((key) => {
      leg[key] = [Math.round(leg[key][0] + dx), Math.round(leg[key][1] + dy)];
    });
  }

  function handleDefs(pose) {
    return [
      { id: 'pelvis', label: 'Pelvis', x: pose.pelvisX + 2, y: 143 + pose.bob, tone: 'core' },
      { id: 'leftKnee', label: 'L knee', x: pose.screenLeft.knee[0], y: pose.screenLeft.knee[1], tone: 'left' },
      { id: 'leftFoot', label: 'L foot', x: pose.screenLeft.toe[0], y: pose.screenLeft.toe[1], tone: currentFrame().footLocks.screenLeft ? 'locked' : 'left' },
      { id: 'rightKnee', label: 'R knee', x: pose.screenRight.knee[0], y: pose.screenRight.knee[1], tone: 'right' },
      { id: 'rightFoot', label: 'R foot', x: pose.screenRight.toe[0], y: pose.screenRight.toe[1], tone: currentFrame().footLocks.screenRight ? 'locked' : 'right' }
    ];
  }

  function drawGround() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.09)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(4, Rig.GROUND_Y + .5);
    ctx.lineTo(124, Rig.GROUND_Y + .5);
    ctx.stroke();
    ctx.restore();
  }

  function drawPose(pose, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    Painted.drawPose(ctx, pose, { debug: false });
    ctx.restore();
  }

  function handleColor(tone) {
    if (tone === 'left') return '#efcb82';
    if (tone === 'right') return '#86d8ff';
    if (tone === 'locked') return '#ff9f9f';
    return '#f5f8fa';
  }

  function drawHandles() {
    octx.clearRect(0, 0, FRAME_W, FRAME_H);
    if (!ui.showHandles.checked) return;
    handleDefs(currentPose()).forEach((handle) => {
      const hot = state.hover === handle.id || state.drag?.handleId === handle.id;
      const radius = HANDLE_RADIUS + (hot ? 1.2 : 0);
      octx.beginPath();
      octx.arc(handle.x, handle.y, radius + 1.4, 0, Math.PI * 2);
      octx.fillStyle = 'rgba(3,8,12,.86)';
      octx.fill();
      octx.beginPath();
      octx.arc(handle.x, handle.y, radius, 0, Math.PI * 2);
      octx.fillStyle = currentFrame().locked ? '#77818a' : handleColor(handle.tone);
      octx.fill();
      octx.lineWidth = 1;
      octx.strokeStyle = hot ? '#fff' : 'rgba(0,0,0,.88)';
      octx.stroke();
    });
  }

  function render() {
    if (!state.ready) return;
    ctx.clearRect(0, 0, FRAME_W, FRAME_H);
    if (ui.onionPrev.checked) drawPose(state.frames[previousIndex()].pose, .17);
    if (ui.onionNext.checked) drawPose(state.frames[nextIndex()].pose, .17);
    drawGround();
    drawPose(currentPose(), 1);
    drawHandles();
    updateJson();
    updateContactStatus();
  }

  function queueRender() {
    if (state.renderQueued) return;
    state.renderQueued = true;
    requestAnimationFrame(() => {
      state.renderQueued = false;
      render();
    });
  }

  function updateContactStatus() {
    ui.leftStatus.textContent = currentFrame().footLocks.screenLeft ? 'Pinned' : (currentPose().screenLeft.planted ? 'Grounded' : 'Travel');
    ui.rightStatus.textContent = currentFrame().footLocks.screenRight ? 'Pinned' : (currentPose().screenRight.planted ? 'Grounded' : 'Travel');
  }

  function updateFrameStrip() {
    frameStrip.textContent = '';
    state.frames.forEach((frame, index) => {
      const wrap = document.createElement('div');
      wrap.className = 'frame-chip';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `Frame ${frame.id}`;
      if (index === state.selected) button.classList.add('selected');
      button.addEventListener('click', () => selectFrame(index));
      const note = document.createElement('small');
      note.className = frame.locked ? 'locked' : '';
      note.textContent = frame.locked ? '🔒 Locked' : frame.pose.phase.replace('SE · ', '');
      wrap.append(button, note);
      frameStrip.appendChild(wrap);
    });
  }

  function refreshUi() {
    const frame = currentFrame();
    ui.lockFrame.checked = frame.locked;
    ui.lockLeft.checked = Boolean(frame.footLocks.screenLeft);
    ui.lockRight.checked = Boolean(frame.footLocks.screenRight);
    updateFrameStrip();
    updateContactStatus();
  }

  function selectFrame(index) {
    state.selected = (index + 8) % 8;
    refreshUi();
    queueRender();
  }

  function stopPlayback() {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
    state.playing = false;
    ui.play.textContent = '▶ Play';
    ui.play.setAttribute('aria-pressed', 'false');
  }

  function startPlayback() {
    stopPlayback();
    state.playing = true;
    ui.play.textContent = '⏸ Pause';
    ui.play.setAttribute('aria-pressed', 'true');
    state.timer = setInterval(() => selectFrame(nextIndex()), Number(ui.speed.value));
  }

  function togglePlayback() {
    if (state.playing) stopPlayback(); else startPlayback();
  }

  function canvasPoint(event) {
    const rect = overlay.getBoundingClientRect();
    return [
      ((event.clientX - rect.left) / rect.width) * FRAME_W,
      ((event.clientY - rect.top) / rect.height) * FRAME_H
    ];
  }

  function nearestHandle(target) {
    let best = null;
    let bestDistance = HIT_RADIUS;
    handleDefs(currentPose()).forEach((handle) => {
      const d = Math.hypot(handle.x - target[0], handle.y - target[1]);
      if (d <= bestDistance) { best = handle; bestDistance = d; }
    });
    return best;
  }

  function applyPinnedFeet(pose, frame, preferredPose) {
    ['screenLeft', 'screenRight'].forEach((side) => {
      const lock = frame.footLocks[side];
      if (!lock) return;
      solveLegToFoot(pose, side, lock, frame, preferredPose[side].knee);
      pose[side].planted = true;
    });
  }

  function beginDrag(event) {
    const frame = currentFrame();
    if (frame.locked) {
      status.textContent = `Frame ${frame.id} is locked.`;
      return;
    }
    const hit = nearestHandle(canvasPoint(event));
    if (!hit) return;
    stopPlayback();
    event.preventDefault();
    state.drag = {
      pointerId: event.pointerId,
      handleId: hit.id,
      start: canvasPoint(event),
      startPose: clone(frame.pose),
      startLocks: clone(frame.footLocks)
    };
    overlay.setPointerCapture(event.pointerId);
    overlay.classList.add('dragging');
    state.hover = hit.id;
    status.textContent = `Editing ${hit.label} on Frame ${frame.id}.`;
    drawHandles();
  }

  function dragMove(event) {
    const point = canvasPoint(event);
    if (!state.drag || event.pointerId !== state.drag.pointerId) {
      const hit = nearestHandle(point);
      state.hover = hit?.id || null;
      overlay.style.cursor = hit ? 'grab' : 'default';
      drawHandles();
      return;
    }

    event.preventDefault();
    const frame = currentFrame();
    const pose = clone(state.drag.startPose);
    const dx = point[0] - state.drag.start[0];
    const dy = point[1] - state.drag.start[1];

    if (state.drag.handleId === 'pelvis') {
      pose.pelvisX = Math.round(state.drag.startPose.pelvisX + dx);
      pose.bob = Math.round(state.drag.startPose.bob + dy);
      shiftLeg(pose.screenLeft, dx, dy);
      shiftLeg(pose.screenRight, dx, dy);
      applyPinnedFeet(pose, frame, state.drag.startPose);
    } else if (state.drag.handleId === 'leftFoot') {
      solveLegToFoot(pose, 'screenLeft', point, frame, state.drag.startPose.screenLeft.knee);
      if (ui.lockLeft.checked) frame.footLocks.screenLeft = [Math.round(point[0]), Math.round(point[1])];
    } else if (state.drag.handleId === 'rightFoot') {
      solveLegToFoot(pose, 'screenRight', point, frame, state.drag.startPose.screenRight.knee);
      if (ui.lockRight.checked) frame.footLocks.screenRight = [Math.round(point[0]), Math.round(point[1])];
    } else if (state.drag.handleId === 'leftKnee') {
      moveKnee(pose, 'screenLeft', point, frame);
      if (frame.footLocks.screenLeft) solveLegToFoot(pose, 'screenLeft', frame.footLocks.screenLeft, frame, point);
    } else if (state.drag.handleId === 'rightKnee') {
      moveKnee(pose, 'screenRight', point, frame);
      if (frame.footLocks.screenRight) solveLegToFoot(pose, 'screenRight', frame.footLocks.screenRight, frame, point);
    }

    frame.pose = pose;
    queueRender();
  }

  function endDrag(event) {
    if (!state.drag || event.pointerId !== state.drag.pointerId) return;
    if (overlay.hasPointerCapture(event.pointerId)) overlay.releasePointerCapture(event.pointerId);
    overlay.classList.remove('dragging');
    state.drag = null;
    currentFrame().metrics = {
      screenLeft: legMetrics(currentPose().screenLeft),
      screenRight: legMetrics(currentPose().screenRight)
    };
    status.textContent = `Frame ${currentFrame().id} updated.`;
    refreshUi();
    queueRender();
  }

  function setFootLock(side, checked) {
    const frame = currentFrame();
    frame.footLocks[side] = checked ? clone(frame.pose[side].toe) : null;
    if (checked) frame.pose[side].planted = true;
    refreshUi();
    queueRender();
  }

  function resetFrame() {
    const index = state.selected;
    state.frames[index] = frameFromPose(state.baseline[index], index);
    refreshUi();
    queueRender();
    status.textContent = `Frame ${index + 1} reset.`;
  }

  function duplicatePrevious() {
    if (currentFrame().locked) {
      status.textContent = `Frame ${currentFrame().id} is locked.`;
      return;
    }
    const source = state.frames[previousIndex()];
    const locked = currentFrame().locked;
    state.frames[state.selected] = clone(source);
    state.frames[state.selected].id = state.selected + 1;
    state.frames[state.selected].locked = locked;
    refreshUi();
    queueRender();
    status.textContent = `Copied Frame ${source.id} into Frame ${state.selected + 1}.`;
  }

  function updateJson() {
    jsonBox.value = JSON.stringify({
      version: '0.1.0',
      direction: 'SE',
      frameSize: [FRAME_W, FRAME_H],
      frames: state.frames.map(({ id, locked, footLocks, pose }) => ({ id, locked, footLocks, pose }))
    }, null, 2);
  }

  async function copyJson() {
    updateJson();
    try {
      await navigator.clipboard.writeText(jsonBox.value);
      status.textContent = 'Pose JSON copied.';
    } catch {
      jsonBox.focus(); jsonBox.select();
      status.textContent = 'JSON selected. Copy it manually.';
    }
  }

  async function pasteJson() {
    let text = '';
    try { text = await navigator.clipboard.readText(); }
    catch { text = window.prompt('Paste Sprite Studio JSON:') || ''; }
    if (!text) return;
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.frames) || parsed.frames.length !== 8) throw new Error('Expected exactly 8 frames.');
      state.frames = parsed.frames.map((item, index) => {
        const frame = frameFromPose(item.pose, index);
        frame.locked = Boolean(item.locked);
        frame.footLocks = clone(item.footLocks || { screenLeft: null, screenRight: null });
        return frame;
      });
      selectFrame(0);
      status.textContent = 'Pose JSON loaded.';
    } catch (error) {
      status.textContent = `JSON load failed: ${error.message}`;
    }
  }

  function exportSheet() {
    const sheet = document.createElement('canvas');
    sheet.width = FRAME_W * 8;
    sheet.height = FRAME_H;
    const sheetCtx = sheet.getContext('2d');
    state.frames.forEach((frame, index) => {
      sheetCtx.save();
      sheetCtx.translate(index * FRAME_W, 0);
      Painted.drawPose(sheetCtx, frame.pose, { debug: false });
      sheetCtx.restore();
    });
    const link = document.createElement('a');
    link.download = 'avendor-female-se-sprite-studio-0.1.png';
    link.href = sheet.toDataURL('image/png');
    link.click();
    status.textContent = 'Transparent 8-frame PNG sheet exported.';
  }

  function bind() {
    ui.prev.addEventListener('click', () => { stopPlayback(); selectFrame(previousIndex()); });
    ui.next.addEventListener('click', () => { stopPlayback(); selectFrame(nextIndex()); });
    ui.play.addEventListener('click', togglePlayback);
    ui.duplicate.addEventListener('click', duplicatePrevious);
    ui.resetFrame.addEventListener('click', resetFrame);
    ui.lockFrame.addEventListener('change', () => { currentFrame().locked = ui.lockFrame.checked; refreshUi(); queueRender(); });
    ui.onionPrev.addEventListener('change', queueRender);
    ui.onionNext.addEventListener('change', queueRender);
    ui.showHandles.addEventListener('change', queueRender);
    ui.lockLeft.addEventListener('change', () => setFootLock('screenLeft', ui.lockLeft.checked));
    ui.lockRight.addEventListener('change', () => setFootLock('screenRight', ui.lockRight.checked));
    ui.speed.addEventListener('input', () => {
      ui.speedOutput.value = `${ui.speed.value} ms`;
      if (state.playing) startPlayback();
    });
    ui.copyJson.addEventListener('click', copyJson);
    ui.pasteJson.addEventListener('click', pasteJson);
    ui.exportPng.addEventListener('click', exportSheet);
    overlay.addEventListener('pointerdown', beginDrag);
    overlay.addEventListener('pointermove', dragMove);
    overlay.addEventListener('pointerup', endDrag);
    overlay.addEventListener('pointercancel', endDrag);
    overlay.addEventListener('pointerleave', () => { if (!state.drag) { state.hover = null; overlay.style.cursor = 'default'; drawHandles(); } });
  }

  async function init() {
    try {
      await Painted.load();
      bind();
      state.ready = true;
      refreshUi();
      queueRender();
      status.textContent = 'Sprite Studio 0.1 ready. Painted heroine visible; hidden rig math active.';
    } catch (error) {
      status.textContent = `Sprite Studio could not load painted assets: ${error.message}`;
    }
  }

  init();
})();
