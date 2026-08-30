(() => {
  'use strict';

  const VERSION = '0.4.0';
  const FRAME_W = 128;
  const FRAME_H = 240;
  const FLOOR_Y = 226;
  const CONTACT_TOLERANCE = 3;
  const CANDIDATE_URL = 'data/hero-animation/male-east-west-candidate-0.1.json';

  const lab = window.AvendorHeroAnimationLab;
  const sourceCanvas = document.getElementById('hero-animation-canvas');
  const canvasShell = document.querySelector('.canvas-shell');
  const westShell = document.getElementById('lab-west-preview-shell');
  const westCanvas = document.getElementById('lab-west-preview-canvas');
  const compareShell = document.getElementById('lab-compare-shell');
  const compareEastCanvas = document.getElementById('lab-compare-east');
  const compareWestCanvas = document.getElementById('lab-compare-west');
  const poseStrip = document.getElementById('lab-pose-strip');
  const sliderGrid = document.getElementById('lab-sliders');
  const status = document.getElementById('lab-status');
  const speedInput = document.getElementById('lab-speed');
  const playButton = document.getElementById('lab-play');
  const prevButton = document.getElementById('lab-prev');
  const nextButton = document.getElementById('lab-next');
  const resetPoseButton = document.getElementById('lab-reset-pose');
  const resetAllButton = document.getElementById('lab-reset-all');
  const transitionButton = document.getElementById('lab-test-transition');
  const seamButton = document.getElementById('lab-test-seam');
  const directionButtons = [...document.querySelectorAll('[data-validation-direction]')];
  const candidateStatus = document.getElementById('lab-candidate-status');
  const nearFootCard = document.getElementById('lab-near-foot-card');
  const nearFootValue = document.getElementById('lab-near-foot-value');
  const farFootCard = document.getElementById('lab-far-foot-card');
  const farFootValue = document.getElementById('lab-far-foot-value');
  const footSummary = document.getElementById('lab-foot-summary');

  if (!lab || !sourceCanvas || !canvasShell || !westCanvas || !compareEastCanvas || !compareWestCanvas || !poseStrip) return;

  const westCtx = westCanvas.getContext('2d');
  const compareEastCtx = compareEastCanvas.getContext('2d');
  const compareWestCtx = compareWestCanvas.getContext('2d');

  let candidate = null;
  let directionMode = 'east';
  let validationTimer = null;
  let validationMode = null;
  let validationIndex = 0;

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

  function footTip(ankle, length, degrees) {
    const angle = radians(degrees);
    return {
      x: ankle.x + Math.cos(angle) * length,
      y: ankle.y + Math.sin(angle) * length
    };
  }

  function selectedPoseId() {
    return poseStrip.querySelector('button.selected')?.dataset.poseId || 'idle';
  }

  function buildFeet(pose) {
    const m = lab.measurements;
    const pelvis = { x: FRAME_W / 2, y: pose.pelvisY };
    const nearHip = { x: pelvis.x + m.hipHalfWidth, y: pelvis.y };
    const farHip = { x: pelvis.x - m.hipHalfWidth, y: pelvis.y + 1 };
    const nearKnee = fromDown(nearHip, m.thigh, pose.nearThigh);
    const nearAnkle = fromDown(nearKnee, m.shin, pose.nearShin);
    const farKnee = fromDown(farHip, m.thigh, pose.farThigh);
    const farAnkle = fromDown(farKnee, m.shin, pose.farShin);
    const nearToe = footTip(nearAnkle, m.foot, pose.nearFoot);
    const farToe = footTip(farAnkle, m.foot, pose.farFoot);
    return { nearAnkle, nearToe, farAnkle, farToe };
  }

  function footGap(ankle, toe) {
    return FLOOR_Y - Math.max(ankle.y, toe.y);
  }

  function contactState(gap) {
    return Math.abs(gap) <= CONTACT_TOLERANCE ? 'planted' : 'travel';
  }

  function gapText(gap) {
    const rounded = Math.round(gap * 10) / 10;
    if (Math.abs(rounded) <= CONTACT_TOLERANCE) return `PLANTED · ${Math.abs(rounded).toFixed(1)} px from floor`;
    return rounded > 0
      ? `TRAVEL · ${rounded.toFixed(1)} px above floor`
      : `TRAVEL · ${Math.abs(rounded).toFixed(1)} px below floor`;
  }

  function drawMirror(targetCtx) {
    targetCtx.clearRect(0, 0, FRAME_W, FRAME_H);
    targetCtx.save();
    targetCtx.translate(FRAME_W, 0);
    targetCtx.scale(-1, 1);
    targetCtx.drawImage(sourceCanvas, 0, 0, FRAME_W, FRAME_H);
    targetCtx.restore();
  }

  function drawEast(targetCtx) {
    targetCtx.clearRect(0, 0, FRAME_W, FRAME_H);
    targetCtx.drawImage(sourceCanvas, 0, 0, FRAME_W, FRAME_H);
  }

  function drawContactGuide(ctx, pose, mirrored = false) {
    const feet = buildFeet(pose);
    const entries = [
      { ankle: feet.nearAnkle, toe: feet.nearToe, label: 'N' },
      { ankle: feet.farAnkle, toe: feet.farToe, label: 'F' }
    ];

    entries.forEach(({ ankle, toe, label }) => {
      const gap = footGap(ankle, toe);
      const planted = contactState(gap) === 'planted';
      const footX = (ankle.x + toe.x) / 2;
      const x = mirrored ? FRAME_W - footX : footX;
      const y = Math.min(FLOOR_Y, Math.max(ankle.y, toe.y));
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = planted ? '#9cffb1' : '#efc982';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(5,9,12,.9)';
      ctx.stroke();
      ctx.font = '700 6px ui-monospace, Consolas, monospace';
      ctx.fillStyle = planted ? '#baffc8' : '#f6d69a';
      ctx.fillText(label, Math.max(2, Math.min(FRAME_W - 8, x + 4)), Math.max(8, y - 4));
      ctx.restore();
    });
  }

  function refreshFootDiagnostics() {
    const poses = lab.getPoses();
    const poseId = selectedPoseId();
    const pose = poses[poseId];
    if (!pose) return;
    const feet = buildFeet(pose);
    const nearGap = footGap(feet.nearAnkle, feet.nearToe);
    const farGap = footGap(feet.farAnkle, feet.farToe);
    const nearState = contactState(nearGap);
    const farState = contactState(farGap);

    if (nearFootCard) nearFootCard.dataset.contact = nearState;
    if (farFootCard) farFootCard.dataset.contact = farState;
    if (nearFootValue) nearFootValue.textContent = gapText(nearGap);
    if (farFootValue) farFootValue.textContent = gapText(farGap);
    if (footSummary) {
      const planted = [nearState === 'planted' ? 'near' : null, farState === 'planted' ? 'far' : null].filter(Boolean);
      footSummary.textContent = `${poseId.toUpperCase()} · ${planted.length ? `${planted.join(' + ')} foot contact` : 'both feet travelling'} · tolerance ±${CONTACT_TOLERANCE}px`;
    }
  }

  function refreshValidationPreview() {
    const pose = lab.getPoses()[selectedPoseId()];
    if (!pose) return;
    drawMirror(westCtx);
    drawContactGuide(westCtx, pose, true);
    drawEast(compareEastCtx);
    drawContactGuide(compareEastCtx, pose, false);
    drawMirror(compareWestCtx);
    drawContactGuide(compareWestCtx, pose, true);
    refreshFootDiagnostics();
  }

  function setDirectionMode(nextMode) {
    if (!['east', 'west', 'compare'].includes(nextMode)) nextMode = 'east';
    directionMode = nextMode;
    canvasShell.hidden = nextMode !== 'east';
    if (westShell) westShell.hidden = nextMode !== 'west';
    if (compareShell) compareShell.hidden = nextMode !== 'compare';
    directionButtons.forEach((button) => {
      const selected = button.dataset.validationDirection === nextMode;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    refreshValidationPreview();
    if (status) {
      const label = nextMode === 'compare' ? 'East + mirrored West' : nextMode[0].toUpperCase() + nextMode.slice(1);
      status.textContent = `${label} validation preview · edit the east master to change the mirrored pair.`;
    }
  }

  function setControl(key, value) {
    const input = document.getElementById(`lab-control-${key}`);
    if (!input) return;
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function applyCandidatePose(poseId) {
    if (!candidate?.poses?.[poseId]) return;
    lab.selectPose(poseId);
    Object.entries(candidate.poses[poseId]).forEach(([key, value]) => setControl(key, value));
  }

  function applyCandidateAll() {
    if (!candidate) return;
    candidate.poseOrder.forEach((poseId) => applyCandidatePose(poseId));
    lab.selectPose('idle');
    refreshValidationPreview();
    if (candidateStatus) candidateStatus.innerHTML = '<strong>Saved candidate loaded</strong> · corrected Walk 4 · west mirrors east';
    if (status) status.textContent = 'Saved male east/west candidate loaded · ready for 0.4 validation.';
  }

  function poseDuration() {
    const speed = Math.max(20, Math.min(200, Number(speedInput?.value || 100)));
    return Math.max(40, 110 * (100 / speed));
  }

  function stopCorePlayback() {
    if (playButton?.getAttribute('aria-pressed') === 'true') playButton.click();
  }

  function clearValidationTimer() {
    if (validationTimer !== null) {
      clearTimeout(validationTimer);
      validationTimer = null;
    }
  }

  function stopValidation(updateStatus = true) {
    clearValidationTimer();
    validationMode = null;
    validationIndex = 0;
    transitionButton?.classList.remove('validation-test-active');
    seamButton?.classList.remove('validation-test-active');
    transitionButton?.setAttribute('aria-pressed', 'false');
    seamButton?.setAttribute('aria-pressed', 'false');
    if (updateStatus && status) status.textContent = 'Validation playback stopped.';
  }

  function validationSequence(mode) {
    if (mode === 'seam') return ['walk8', 'walk1'];
    return ['idle', 'idle', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'walk6', 'walk7', 'walk8', 'idle', 'idle'];
  }

  function validationStep() {
    if (!validationMode) return;
    const sequence = validationSequence(validationMode);
    const poseId = sequence[validationIndex % sequence.length];
    lab.selectPose(poseId, { fromPlayback: true });
    refreshValidationPreview();
    if (status) {
      status.textContent = validationMode === 'seam'
        ? `Loop seam test · ${poseId.toUpperCase()} · watching Walk 8 ↔ Walk 1`
        : `Idle → Walk → Idle test · ${poseId.toUpperCase()}`;
    }
    validationIndex = (validationIndex + 1) % sequence.length;
    validationTimer = setTimeout(validationStep, poseDuration());
  }

  function startValidation(mode) {
    if (validationMode === mode) {
      stopValidation();
      return;
    }
    stopValidation(false);
    stopCorePlayback();
    validationMode = mode;
    validationIndex = 0;
    const activeButton = mode === 'seam' ? seamButton : transitionButton;
    activeButton?.classList.add('validation-test-active');
    activeButton?.setAttribute('aria-pressed', 'true');
    validationStep();
  }

  async function loadCandidate() {
    try {
      const response = await fetch(CANDIDATE_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data?.body !== 'male' || data?.direction !== 'east' || !data?.poses) throw new Error('Unexpected candidate payload');
      candidate = data;
      applyCandidateAll();
    } catch (error) {
      if (candidateStatus) candidateStatus.textContent = `Candidate load failed: ${error.message}`;
      if (status) status.textContent = 'Could not load saved candidate. Current lab poses remain editable.';
    }
  }

  directionButtons.forEach((button) => button.addEventListener('click', () => setDirectionMode(button.dataset.validationDirection)));
  transitionButton?.addEventListener('click', () => startValidation('transition'));
  seamButton?.addEventListener('click', () => startValidation('seam'));
  playButton?.addEventListener('click', () => {
    if (validationMode) stopValidation(false);
    queueMicrotask(refreshValidationPreview);
  });
  prevButton?.addEventListener('click', () => {
    if (validationMode) stopValidation(false);
  });
  nextButton?.addEventListener('click', () => {
    if (validationMode) stopValidation(false);
  });
  poseStrip.addEventListener('click', (event) => {
    if (validationMode && event.target.closest('button[data-pose-id]')) stopValidation(false);
  });
  sliderGrid?.addEventListener('input', () => {
    if (validationMode) stopValidation(false);
    queueMicrotask(refreshValidationPreview);
  });
  document.querySelectorAll('[data-view-mode]').forEach((button) => button.addEventListener('click', () => queueMicrotask(refreshValidationPreview)));
  document.getElementById('lab-body-opacity')?.addEventListener('input', () => queueMicrotask(refreshValidationPreview));
  document.getElementById('lab-onion')?.addEventListener('change', () => queueMicrotask(refreshValidationPreview));
  speedInput?.addEventListener('input', () => {
    if (validationMode) {
      clearValidationTimer();
      validationTimer = setTimeout(validationStep, poseDuration());
    }
  });

  resetPoseButton?.addEventListener('click', () => {
    if (!candidate) return;
    stopValidation(false);
    const poseId = selectedPoseId();
    queueMicrotask(() => {
      applyCandidatePose(poseId);
      refreshValidationPreview();
      if (status) status.textContent = `${poseId.toUpperCase()} reset to the saved east/west candidate.`;
    });
  });

  resetAllButton?.addEventListener('click', () => {
    if (!candidate) return;
    stopValidation(false);
    queueMicrotask(applyCandidateAll);
  });

  const poseObserver = new MutationObserver(() => queueMicrotask(refreshValidationPreview));
  poseObserver.observe(poseStrip, { subtree: true, attributes: true, attributeFilter: ['class'] });

  setDirectionMode('east');
  loadCandidate();

  window.AvendorHeroAnimationLabValidation = Object.freeze({
    version: VERSION,
    candidateUrl: CANDIDATE_URL,
    getDirectionMode: () => directionMode,
    getValidationMode: () => validationMode,
    setDirectionMode,
    stopValidation,
    reloadCandidate: loadCandidate
  });
})();
