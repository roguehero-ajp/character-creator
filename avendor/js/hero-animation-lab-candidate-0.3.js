(() => {
  'use strict';

  const VERSION = '0.3.0';
  const CANDIDATE_URL = 'data/hero-animation/male-east-west-candidate-0.3.json';
  const POSE_ORDER = Object.freeze([
    'idle',
    'walk1', 'walk2', 'walk3', 'walk4',
    'walk5', 'walk6', 'walk7', 'walk8'
  ]);
  const CONTROL_KEYS = Object.freeze([
    'pelvisY', 'torsoLean', 'headForward',
    'nearUpperArm', 'nearForearm', 'farUpperArm', 'farForearm',
    'nearThigh', 'nearShin', 'farThigh', 'farShin',
    'nearFoot', 'farFoot'
  ]);

  const lab = window.AvendorHeroAnimationLab;
  const importer = window.AvendorHeroAnimationLabImport;
  const validation = window.AvendorHeroAnimationLabValidation;
  const candidateStatus = document.getElementById('lab-candidate-status');
  const status = document.getElementById('lab-status');
  const speedInput = document.getElementById('lab-speed');
  const resetPoseButton = document.getElementById('lab-reset-pose');
  const resetAllButton = document.getElementById('lab-reset-all');
  const poseStrip = document.getElementById('lab-pose-strip');

  if (!lab || !importer || !resetPoseButton || !resetAllButton || !poseStrip) return;

  let candidate = null;
  let candidateReady = false;
  let settleObserver = null;

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function selectedPoseId() {
    return poseStrip.querySelector('button.selected')?.dataset.poseId || 'idle';
  }

  function setControl(key, value) {
    const input = document.getElementById(`lab-control-${key}`);
    if (!input) return;
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function applySpeed() {
    const speed = Number(candidate?.preview?.speedPercent);
    if (!speedInput || !Number.isFinite(speed)) return;
    speedInput.value = String(speed);
    speedInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function refreshValidation() {
    const currentValidation = window.AvendorHeroAnimationLabValidation;
    if (!currentValidation?.setDirectionMode || !currentValidation?.getDirectionMode) return;
    currentValidation.setDirectionMode(currentValidation.getDirectionMode());
  }

  function applyCandidatePose(poseId) {
    const pose = candidate?.poses?.[poseId];
    if (!pose) return;
    lab.selectPose(poseId);
    CONTROL_KEYS.forEach((key) => {
      if (Number.isFinite(Number(pose[key]))) setControl(key, Number(pose[key]));
    });
    refreshValidation();
  }

  function applyCandidateAll() {
    if (!candidate) return;
    importer.importJsonText(JSON.stringify(candidate));
    applySpeed();
    candidateReady = true;
    if (candidateStatus) {
      candidateStatus.innerHTML = '<strong>Approved candidate 0.3 loaded</strong> · perfected male East/West poses · 105% preview · west mirrors east';
    }
    setStatus('Approved East/West candidate 0.3 loaded · use Male / Female to judge the same motion on both hero silhouettes.');
    refreshValidation();
  }

  function installValidationFacade() {
    const current = window.AvendorHeroAnimationLabValidation;
    if (!current) return;
    window.AvendorHeroAnimationLabValidation = Object.freeze({
      ...current,
      candidateUrl: CANDIDATE_URL,
      reloadCandidate: async () => {
        if (!candidate) await loadCandidate();
        applyCandidateAll();
      }
    });
  }

  function waitForLegacyValidationToSettle() {
    const text = candidateStatus?.textContent || '';
    if (!candidateStatus || text.includes('candidate 0.2') || text.includes('Candidate load failed')) {
      applyCandidateAll();
      installValidationFacade();
      return;
    }

    settleObserver?.disconnect();
    settleObserver = new MutationObserver(() => {
      const nextText = candidateStatus.textContent || '';
      if (!nextText.includes('candidate 0.2') && !nextText.includes('Candidate load failed')) return;
      settleObserver.disconnect();
      settleObserver = null;
      applyCandidateAll();
      installValidationFacade();
    });
    settleObserver.observe(candidateStatus, { childList: true, subtree: true, characterData: true });
  }

  async function loadCandidate() {
    try {
      const response = await fetch(CANDIDATE_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data?.body !== 'male' || data?.direction !== 'east' || !data?.poses) {
        throw new Error('Unexpected candidate payload');
      }
      if (!POSE_ORDER.every((poseId) => data.poses[poseId])) {
        throw new Error('Candidate 0.3 is missing one or more required poses.');
      }
      candidate = data;
      waitForLegacyValidationToSettle();
    } catch (error) {
      if (candidateStatus) candidateStatus.textContent = `Candidate 0.3 load failed: ${error.message}`;
      setStatus('Could not load approved candidate 0.3. Current editable poses remain available.');
    }
  }

  resetPoseButton.addEventListener('click', (event) => {
    if (!candidateReady || !candidate) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    validation?.stopValidation?.(false);
    const poseId = selectedPoseId();
    applyCandidatePose(poseId);
    setStatus(`${poseId.toUpperCase()} reset to approved candidate 0.3.`);
  }, true);

  resetAllButton.addEventListener('click', (event) => {
    if (!candidateReady || !candidate) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    validation?.stopValidation?.(false);
    applyCandidateAll();
  }, true);

  loadCandidate();

  window.AvendorHeroAnimationCandidate03 = Object.freeze({
    version: VERSION,
    candidateUrl: CANDIDATE_URL,
    getCandidate: () => candidate ? JSON.parse(JSON.stringify(candidate)) : null,
    reload: loadCandidate,
    applyAll: applyCandidateAll,
    applyPose: applyCandidatePose
  });
})();
