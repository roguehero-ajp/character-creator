(() => {
  'use strict';

  const VERSION = '0.5.3';
  const FRAME_W = 128;
  const FRAME_H = 240;
  const FLOOR_Y = 226;

  const lab = window.AvendorHeroAnimationLab;
  const canvas = document.getElementById('hero-animation-canvas');
  const poseStrip = document.getElementById('lab-pose-strip');
  const viewButtons = [...document.querySelectorAll('[data-view-mode]')];
  const existingBodyStyleButtons = [...document.querySelectorAll('[data-body-style]')];
  const genderButtons = [...document.querySelectorAll('[data-hero-gender]')];
  const opacityInput = document.getElementById('lab-body-opacity');
  const onionToggle = document.getElementById('lab-onion');
  const sliderGrid = document.getElementById('lab-sliders');
  const output = document.getElementById('lab-output');
  const copyButton = document.getElementById('lab-copy');
  const status = document.getElementById('lab-status');
  const bodyStyleGroup = existingBodyStyleButtons[0]?.closest('.body-style');

  if (!lab || !canvas || !poseStrip || !bodyStyleGroup) return;

  const ctx = canvas.getContext('2d');
  const rigBuffer = document.createElement('canvas');
  rigBuffer.width = FRAME_W;
  rigBuffer.height = FRAME_H;
  const rigCtx = rigBuffer.getContext('2d');
  const m = lab.measurements;

  const PART_ATLASES = Object.freeze({
    male: Object.freeze({
      src: 'assets/sprites/hero/combat-test/male-profile-parts.png',
      width: 256,
      height: 73,
      rects: Object.freeze({
        head: Object.freeze({ x: 4, y: 4, w: 46, h: 47 }),
        torso: Object.freeze({ x: 54, y: 4, w: 58, h: 65 }),
        upperArm: Object.freeze({ x: 116, y: 4, w: 22, h: 20 }),
        forearm: Object.freeze({ x: 142, y: 4, w: 20, h: 25 }),
        thigh: Object.freeze({ x: 166, y: 4, w: 23, h: 21 }),
        shin: Object.freeze({ x: 193, y: 4, w: 22, h: 30 }),
        foot: Object.freeze({ x: 219, y: 4, w: 21, h: 18 })
      })
    }),
    female: Object.freeze({
      src: 'assets/sprites/hero/combat-test/female-profile-parts.png',
      width: 256,
      height: 74,
      rects: Object.freeze({
        head: Object.freeze({ x: 4, y: 4, w: 50, h: 42 }),
        torso: Object.freeze({ x: 58, y: 4, w: 56, h: 66 }),
        upperArm: Object.freeze({ x: 118, y: 4, w: 20, h: 17 }),
        forearm: Object.freeze({ x: 142, y: 4, w: 19, h: 20 }),
        thigh: Object.freeze({ x: 165, y: 4, w: 22, h: 23 }),
        shin: Object.freeze({ x: 191, y: 4, w: 20, h: 25 }),
        foot: Object.freeze({ x: 215, y: 4, w: 21, h: 18 })
      })
    })
  });

  const DISPLAY = Object.freeze({
    male: Object.freeze({
      head: Object.freeze({ w: 47, h: 48, x: -21, y: -23 }),
      torso: Object.freeze({ w: 55, h: 73, x: -26, y: -8 }),
      upperArmWidth: 17,
      forearmWidth: 14,
      thighWidth: 18,
      shinWidth: 17,
      foot: Object.freeze({ w: 31, h: 21, x: -5, y: -13 })
    }),
    female: Object.freeze({
      head: Object.freeze({ w: 51, h: 43, x: -27, y: -20 }),
      torso: Object.freeze({ w: 52, h: 71, x: -24, y: -7 }),
      upperArmWidth: 15,
      forearmWidth: 12,
      thighWidth: 16,
      shinWidth: 15,
      foot: Object.freeze({ w: 29, h: 20, x: -5, y: -12 })
    })
  });

  const atlasPromises = new Map();
  const loadedAtlases = new Map();
  let pngMode = false;
  let requestedViewMode = selectedViewMode();
  let composeQueued = false;
  let composing = false;

  const pngButton = document.createElement('button');
  pngButton.type = 'button';
  pngButton.dataset.pngBodyStyle = 'png';
  pngButton.textContent = 'PNG Hero';
  pngButton.setAttribute('aria-pressed', 'false');
  bodyStyleGroup.appendChild(pngButton);

  document.title = 'Avendor Hero Animation Lab 0.5.3';
  const versionSpan = document.querySelector('#lab-title span');
  if (versionSpan) versionSpan.textContent = '0.5.3';
  const intro = document.querySelector('.lab-header h1 + p');
  if (intro) {
    intro.textContent = 'East/west validation bench for approved candidate 0.3. PNG Hero places the same Avendor profile artwork used by the combat test directly on the editable rig so male/female anchors, overlaps and proportions can be judged pose by pose.';
  }

  function currentGender() {
    return window.AvendorHeroAnimationLabGender?.getGender?.()
      || genderButtons.find((button) => button.classList.contains('selected'))?.dataset.heroGender
      || 'male';
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

  function segmentAngle(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  function segmentLength(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function loadPartAtlas(body) {
    const normalized = body === 'female' ? 'female' : 'male';
    if (loadedAtlases.has(normalized)) return Promise.resolve(loadedAtlases.get(normalized));
    if (atlasPromises.has(normalized)) return atlasPromises.get(normalized);

    const def = PART_ATLASES[normalized];
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        if (image.naturalWidth !== def.width || image.naturalHeight !== def.height) {
          reject(new Error(
            `PNG Hero atlas has wrong dimensions: ${def.src} `
            + `(expected ${def.width}x${def.height}, got ${image.naturalWidth}x${image.naturalHeight})`
          ));
          return;
        }
        const loaded = { image, def };
        loadedAtlases.set(normalized, loaded);
        resolve(loaded);
      };
      image.onerror = () => reject(new Error(`Could not load PNG Hero atlas: ${def.src}`));
      image.src = `${def.src}?v=${encodeURIComponent(VERSION)}`;
    });

    atlasPromises.set(normalized, promise);
    return promise;
  }

  function drawCrop(targetCtx, image, rect, dx, dy, dw, dh) {
    targetCtx.drawImage(
      image,
      rect.x, rect.y, rect.w, rect.h,
      dx, dy, dw, dh
    );
  }

  function withDepth(targetCtx, far, alpha, ghost, callback) {
    targetCtx.save();
    targetCtx.globalAlpha = alpha * (far ? 0.74 : 1);
    if (far) targetCtx.filter = 'brightness(0.78) saturate(0.88)';
    if (ghost) targetCtx.filter = `${far ? 'brightness(0.78) saturate(0.88) ' : ''}opacity(0.55)`;
    callback();
    targetCtx.restore();
  }

  function drawSegmentPart(targetCtx, image, rect, a, b, width, far, alpha, ghost) {
    const length = segmentLength(a, b);
    const angle = segmentAngle(a, b) - Math.PI / 2;
    const overlap = 3;

    withDepth(targetCtx, far, alpha, ghost, () => {
      targetCtx.translate(a.x, a.y);
      targetCtx.rotate(angle);
      drawCrop(targetCtx, image, rect, -width / 2, -overlap, width, length + overlap * 2);
    });
  }

  function drawFootPart(targetCtx, image, rect, ankle, toe, spec, far, alpha, ghost) {
    const angle = segmentAngle(ankle, toe);
    withDepth(targetCtx, far, alpha, ghost, () => {
      targetCtx.translate(ankle.x, ankle.y);
      targetCtx.rotate(angle);
      drawCrop(targetCtx, image, rect, spec.x, spec.y, spec.w, spec.h);
    });
  }

  function drawTorsoPart(targetCtx, image, rect, points, spec, alpha, ghost) {
    const angle = segmentAngle(points.shoulder, points.pelvis) - Math.PI / 2;
    targetCtx.save();
    targetCtx.globalAlpha = alpha;
    if (ghost) targetCtx.filter = 'opacity(0.55)';
    targetCtx.translate(points.shoulder.x, points.shoulder.y);
    targetCtx.rotate(angle);
    drawCrop(targetCtx, image, rect, spec.x, spec.y, spec.w, spec.h);
    targetCtx.restore();
  }

  function drawHeadPart(targetCtx, image, rect, points, spec, alpha, ghost) {
    targetCtx.save();
    targetCtx.globalAlpha = alpha;
    if (ghost) targetCtx.filter = 'opacity(0.55)';
    targetCtx.translate(points.head.x, points.head.y);
    drawCrop(targetCtx, image, rect, spec.x, spec.y, spec.w, spec.h);
    targetCtx.restore();
  }

  function drawArmParts(targetCtx, image, rects, points, side, spec, far, alpha, ghost) {
    const shoulder = points[`${side}Shoulder`];
    const elbow = points[`${side}Elbow`];
    const wrist = points[`${side}Wrist`];
    drawSegmentPart(targetCtx, image, rects.upperArm, shoulder, elbow, spec.upperArmWidth, far, alpha, ghost);
    drawSegmentPart(targetCtx, image, rects.forearm, elbow, wrist, spec.forearmWidth, far, alpha, ghost);
  }

  function drawLegParts(targetCtx, image, rects, points, side, spec, far, alpha, ghost) {
    const hip = points[`${side}Hip`];
    const knee = points[`${side}Knee`];
    const ankle = points[`${side}Ankle`];
    const toe = points[`${side}Toe`];
    drawSegmentPart(targetCtx, image, rects.thigh, hip, knee, spec.thighWidth, far, alpha, ghost);
    drawSegmentPart(targetCtx, image, rects.shin, knee, ankle, spec.shinWidth, far, alpha, ghost);
    drawFootPart(targetCtx, image, rects.foot, ankle, toe, spec.foot, far, alpha, ghost);
  }

  function drawPngBody(targetCtx, pose, body, partAtlas, options = {}) {
    const normalized = body === 'female' ? 'female' : 'male';
    const spec = DISPLAY[normalized];
    const { image, def } = partAtlas;
    const points = buildSkeleton(pose);
    const alpha = options.alpha ?? 1;
    const ghost = Boolean(options.ghost);

    targetCtx.save();
    targetCtx.imageSmoothingEnabled = false;
    drawLegParts(targetCtx, image, def.rects, points, 'far', spec, true, alpha, ghost);
    drawArmParts(targetCtx, image, def.rects, points, 'far', spec, true, alpha, ghost);
    drawTorsoPart(targetCtx, image, def.rects.torso, points, spec.torso, alpha, ghost);
    drawHeadPart(targetCtx, image, def.rects.head, points, spec.head, alpha, ghost);
    drawLegParts(targetCtx, image, def.rects, points, 'near', spec, false, alpha, ghost);
    drawArmParts(targetCtx, image, def.rects, points, 'near', spec, false, alpha, ghost);
    targetCtx.restore();
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
      ctx.fillText(
        `${label}${distance >= 0 ? '+' : ''}${distance}`,
        Math.min(FRAME_W - 20, point.x + 3),
        Math.min(FRAME_H - 5, point.y + 9)
      );
    });
  }

  function restoreRequestedViewButtons() {
    viewButtons.forEach((button) => {
      const selected = button.dataset.viewMode === requestedViewMode;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function updateBodyStyleButtons() {
    existingBodyStyleButtons.forEach((button) => {
      button.classList.remove('selected');
      button.setAttribute('aria-pressed', 'false');
    });
    pngButton.classList.toggle('selected', pngMode);
    pngButton.setAttribute('aria-pressed', String(pngMode));
  }

  function refreshOutputMetadata() {
    if (!output || !pngMode) return;
    try {
      const data = JSON.parse(lab.exportJson());
      data.body = currentGender();
      data.preview = data.preview || {};
      data.preview.bodyStyle = 'png';
      output.value = JSON.stringify(data, null, 2);
    } catch (_) {
      // The core output stays usable even if metadata decoration fails.
    }
  }

  function refreshValidation() {
    const validation = window.AvendorHeroAnimationLabValidation;
    if (validation?.setDirectionMode && validation?.getDirectionMode) {
      validation.setDirectionMode(validation.getDirectionMode());
    }
  }

  async function composePng() {
    composeQueued = false;
    if (composing || !pngMode) return;
    composing = true;

    const body = currentGender() === 'female' ? 'female' : 'male';
    let partAtlas;
    try {
      partAtlas = await loadPartAtlas(body);
    } catch (error) {
      if (status) status.textContent = `PNG Hero load failed: ${error.message}`;
      composing = false;
      return;
    }

    if (!pngMode) {
      composing = false;
      return;
    }

    const poses = lab.getPoses();
    const poseId = selectedPoseId();
    const pose = poses[poseId];
    const previous = previousPoseId();
    const alpha = Math.max(.25, Math.min(1, Number(opacityInput?.value || 90) / 100));

    // Use the core's proven skeleton render as the rig layer, then replace only its visible body.
    lab.setViewMode('skeleton');
    rigCtx.clearRect(0, 0, FRAME_W, FRAME_H);
    rigCtx.drawImage(canvas, 0, 0, FRAME_W, FRAME_H);

    ctx.clearRect(0, 0, FRAME_W, FRAME_H);

    if (requestedViewMode === 'skeleton') {
      ctx.drawImage(rigBuffer, 0, 0);
    } else {
      drawGuides();
      if (onionToggle?.checked && previous && poses[previous]) {
        drawPngBody(ctx, poses[previous], body, partAtlas, { ghost: true, alpha: alpha * .30 });
      }
      const points = drawPngBody(ctx, pose, body, partAtlas, { alpha });
      if (requestedViewMode === 'both') ctx.drawImage(rigBuffer, 0, 0);
      if (requestedViewMode === 'body') drawFootMarkers(points);
    }

    restoreRequestedViewButtons();
    updateBodyStyleButtons();
    refreshOutputMetadata();
    refreshValidation();
    if (status) status.textContent = `${poseId.toUpperCase()} · ${body === 'female' ? 'Female' : 'Male'} PNG Hero · candidate 0.3 · profile art on editable rig`;
    composing = false;
  }

  function queueCompose() {
    if (!pngMode || composeQueued) return;
    composeQueued = true;
    queueMicrotask(composePng);
  }

  function enterPngMode() {
    requestedViewMode = selectedViewMode();
    pngMode = true;

    // Keep the legacy female compositor neutral while PNG mode owns the visible body.
    lab.setBodyStyle('proxy');
    updateBodyStyleButtons();
    refreshOutputMetadata();
    if (status) status.textContent = `Loading ${currentGender() === 'female' ? 'female' : 'male'} PNG Hero profile art…`;
    queueCompose();
  }

  function leavePngMode() {
    pngMode = false;
    pngButton.classList.remove('selected');
    pngButton.setAttribute('aria-pressed', 'false');
  }

  async function copyPngJson(event) {
    if (!pngMode) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const data = JSON.parse(lab.exportJson());
    data.body = currentGender();
    data.preview = data.preview || {};
    data.preview.bodyStyle = 'png';
    const text = JSON.stringify(data, null, 2);
    if (output) output.value = text;

    try {
      await navigator.clipboard.writeText(text);
      if (status) status.textContent = 'Pose JSON copied with PNG Hero preview metadata.';
    } catch (_) {
      output?.focus();
      output?.select();
      document.execCommand('copy');
      if (status) status.textContent = 'Pose JSON selected/copied with PNG Hero preview metadata.';
    }
  }

  pngButton.addEventListener('click', enterPngMode);
  existingBodyStyleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      leavePngMode();
      requestedViewMode = selectedViewMode();
    });
  });

  genderButtons.forEach((button) => button.addEventListener('click', () => queueMicrotask(queueCompose)));
  viewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      requestedViewMode = button.dataset.viewMode || 'both';
      queueMicrotask(queueCompose);
    });
  });
  sliderGrid?.addEventListener('input', queueCompose);
  opacityInput?.addEventListener('input', queueCompose);
  onionToggle?.addEventListener('change', queueCompose);
  copyButton?.addEventListener('click', copyPngJson, true);

  // Programmatic pose changes (playback, validation tests, reset/import) do not emit a click,
  // so one observer is used solely to repaint PNG art after the selected timeline pose changes.
  const poseObserver = new MutationObserver(queueCompose);
  poseObserver.observe(poseStrip, { subtree: true, attributes: true, attributeFilter: ['class'] });

  window.AvendorHeroAnimationLabPngOverlay = Object.freeze({
    version: VERSION,
    partAtlases: PART_ATLASES,
    getActive: () => pngMode,
    getGender: currentGender,
    setActive: (active) => {
      if (active) enterPngMode();
      else leavePngMode();
    },
    redraw: queueCompose
  });

  // 0.5.3 opens on the diagnostic we came here to inspect.
  enterPngMode();
})();
