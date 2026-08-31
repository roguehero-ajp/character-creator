(() => {
  'use strict';

  const VERSION = '0.1.0';
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
  const validation = window.AvendorHeroAnimationLabValidation;
  const pasteButton = document.getElementById('lab-paste');
  const output = document.getElementById('lab-output');
  const status = document.getElementById('lab-status');

  if (!lab || !pasteButton || !output) return;

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function normalisePosePayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('JSON must contain an Animation Lab object.');
    }

    const sourcePoses = payload.poses && typeof payload.poses === 'object'
      ? payload.poses
      : payload;

    const currentPoses = lab.getPoses();
    const nextPoses = {};

    POSE_ORDER.forEach((poseId) => {
      const incoming = sourcePoses[poseId];
      if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
        throw new Error(`Missing ${poseId} pose.`);
      }

      nextPoses[poseId] = { ...currentPoses[poseId] };
      CONTROL_KEYS.forEach((key) => {
        if (!(key in incoming)) return;
        const value = Number(incoming[key]);
        if (!Number.isFinite(value)) {
          throw new Error(`${poseId}.${key} is not a number.`);
        }
        nextPoses[poseId][key] = value;
      });
    });

    return nextPoses;
  }

  function setControl(key, value) {
    const input = document.getElementById(`lab-control-${key}`);
    if (!input) return;
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function applyPoses(nextPoses) {
    validation?.stopValidation?.(false);

    POSE_ORDER.forEach((poseId) => {
      lab.selectPose(poseId);
      CONTROL_KEYS.forEach((key) => setControl(key, nextPoses[poseId][key]));
    });

    lab.selectPose('idle');
    output.value = lab.exportJson();
    setStatus('Pasted JSON loaded · old pose values are now driving the current 0.5.1 Hero skin and mirrored west preview.');
  }

  function importJsonText(text) {
    if (!text || !text.trim()) throw new Error('No JSON was pasted.');
    const payload = JSON.parse(text);
    const nextPoses = normalisePosePayload(payload);
    applyPoses(nextPoses);
    return nextPoses;
  }

  async function readPasteText() {
    if (navigator.clipboard?.readText) {
      try {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText?.trim()) return clipboardText;
      } catch (_) {
        // Browsers may block clipboard reads. The prompt fallback keeps the tool usable.
      }
    }

    return window.prompt('Paste Hero Animation Lab JSON here:');
  }

  async function pasteJson() {
    const originalLabel = pasteButton.textContent;
    pasteButton.disabled = true;
    pasteButton.textContent = 'Reading…';

    try {
      const text = await readPasteText();
      if (text === null) {
        setStatus('Paste cancelled.');
        return;
      }
      importJsonText(text);
      pasteButton.textContent = 'Loaded ✓';
      window.setTimeout(() => {
        pasteButton.textContent = originalLabel;
      }, 900);
    } catch (error) {
      setStatus(`Could not load pasted JSON: ${error.message}`);
      pasteButton.textContent = 'Paste failed';
      window.setTimeout(() => {
        pasteButton.textContent = originalLabel;
      }, 1200);
    } finally {
      pasteButton.disabled = false;
    }
  }

  pasteButton.addEventListener('click', pasteJson);

  window.AvendorHeroAnimationLabImport = Object.freeze({
    version: VERSION,
    importJsonText
  });
})();
