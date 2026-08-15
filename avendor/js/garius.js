(() => {
  'use strict';

  /*
   * Avendor 0.3.5 - Garius static-body stability pass
   * -------------------------------------------------
   * The existing idle / present / raise images are separate full-body paintings,
   * not layered animation frames. Crossfading them makes Garius appear to phase.
   * Until dedicated body/head/arm layers exist, the approved idle frame is kept
   * completely stationary and only the support bubble animates.
   *
   * This module remains independent of cinematic.js and does not affect title
   * inactivity, Bruckner playback, or cinematic replay timing.
   */

  if (window.__avendorGariusInstalled) return;
  window.__avendorGariusInstalled = true;

  const stage = document.getElementById('avendor-title-stage');
  const npc = document.getElementById('garius-title-npc');
  const poseImages = Array.from(document.querySelectorAll('[data-garius-pose]'));
  const hat = document.getElementById('garius-hat-hitbox');
  const bubble = document.getElementById('garius-bubble');
  const bubbleText = document.getElementById('garius-bubble-text');

  if (!stage || !npc || !poseImages.length || !hat || !bubble || !bubbleText) return;

  const LINES = Object.freeze([
    'Spare some coin for a weary game developer?',
    'Kind traveller, support a humble creator?',
    'A coin for a road-worn developer?',
    'Help keep the adventure alive?'
  ]);

  const FIRST_PROMPT_MIN = 6500;
  const FIRST_PROMPT_MAX = 9000;
  const NEXT_PROMPT_MIN = 28000;
  const NEXT_PROMPT_MAX = 46000;
  const BUBBLE_HOLD_MS = 5600;
  const THANKS_HOLD_MS = 2600;

  let promptTimer = 0;
  let sequenceTimer = 0;
  let lineIndex = Math.floor(Math.random() * LINES.length);
  let sequenceActive = false;
  let thanked = false;
  let cinematicActive = stage.classList.contains('cinematic-running');

  function randomBetween(min, max) {
    return Math.round(min + Math.random() * (max - min));
  }

  function clearTimer(timer) {
    if (!timer) return 0;
    window.clearTimeout(timer);
    return 0;
  }

  function clearPromptTimer() {
    promptTimer = clearTimer(promptTimer);
  }

  function clearSequenceTimer() {
    sequenceTimer = clearTimer(sequenceTimer);
  }

  function titleAvailable() {
    return !document.hidden && !cinematicActive;
  }

  function lockStaticPose() {
    npc.dataset.pose = 'idle';
    stage.dataset.gariusPose = 'idle';

    poseImages.forEach((image) => {
      image.classList.toggle('is-active', image.dataset.gariusPose === 'idle');
    });
  }

  function hideBubble() {
    bubble.classList.remove('is-visible', 'is-thanks');
    bubble.setAttribute('aria-hidden', 'true');
    bubble.tabIndex = -1;
  }

  function showBubble(text, thanks = false) {
    bubbleText.textContent = text;
    bubble.classList.toggle('is-thanks', thanks);
    bubble.classList.add('is-visible');
    bubble.setAttribute('aria-hidden', 'false');
    bubble.tabIndex = 0;
  }

  function nextLine() {
    const line = LINES[lineIndex % LINES.length];
    lineIndex = (lineIndex + 1) % LINES.length;
    return line;
  }

  function schedulePrompt(first = false) {
    clearPromptTimer();
    if (!titleAvailable() || sequenceActive || thanked) return;

    const delay = first
      ? randomBetween(FIRST_PROMPT_MIN, FIRST_PROMPT_MAX)
      : randomBetween(NEXT_PROMPT_MIN, NEXT_PROMPT_MAX);

    promptTimer = window.setTimeout(runPrompt, delay);
  }

  function finishPrompt() {
    hideBubble();
    sequenceActive = false;
    lockStaticPose();
    schedulePrompt(false);
  }

  function runPrompt() {
    clearPromptTimer();
    if (sequenceActive || thanked || !titleAvailable()) return;

    sequenceActive = true;
    lockStaticPose();
    showBubble(nextLine());

    clearSequenceTimer();
    sequenceTimer = window.setTimeout(finishPrompt, BUBBLE_HOLD_MS);
  }

  function thankTraveller() {
    clearPromptTimer();
    clearSequenceTimer();

    thanked = true;
    sequenceActive = true;
    lockStaticPose();
    showBubble('Many thanks, kind traveller.', true);

    sequenceTimer = window.setTimeout(() => {
      hideBubble();
      thanked = false;
      sequenceActive = false;
      lockStaticPose();
      schedulePrompt(false);
    }, THANKS_HOLD_MS);
  }

  function pauseForCinematic() {
    clearPromptTimer();
    clearSequenceTimer();
    hideBubble();
    lockStaticPose();
    sequenceActive = false;
    thanked = false;
  }

  function resumeFromCinematic() {
    lockStaticPose();
    hideBubble();
    schedulePrompt(true);
  }

  hat.addEventListener('click', thankTraveller);
  bubble.addEventListener('click', thankTraveller);

  const stageObserver = new MutationObserver(() => {
    const nowCinematic = stage.classList.contains('cinematic-running');
    if (nowCinematic === cinematicActive) return;

    cinematicActive = nowCinematic;
    if (cinematicActive) pauseForCinematic();
    else resumeFromCinematic();
  });

  stageObserver.observe(stage, {
    attributes: true,
    attributeFilter: ['class']
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearPromptTimer();
      clearSequenceTimer();
      return;
    }

    if (!cinematicActive && !sequenceActive && !thanked) {
      lockStaticPose();
      schedulePrompt(true);
    }
  });

  lockStaticPose();
  hideBubble();
  schedulePrompt(true);
})();
