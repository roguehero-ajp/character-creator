(() => {
  'use strict';

  if (window.__avendorGariusInstalled) return;
  window.__avendorGariusInstalled = true;

  const stage = document.getElementById('avendor-title-stage');
  const npc = document.getElementById('garius-title-npc');
  const poseImages = Array.from(document.querySelectorAll('[data-garius-pose]'));
  const hat = document.getElementById('garius-hat-hitbox');
  const bubble = document.getElementById('garius-bubble');
  const bubbleText = document.getElementById('garius-bubble-text');

  if (!stage || !npc || poseImages.length < 3 || !hat || !bubble || !bubbleText) return;

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
  const POSE_TRANSITION_MS = 520;
  const THANKS_HOLD_MS = 2600;

  const IDLE_LOOK_MIN = 2600;
  const IDLE_LOOK_MAX = 5200;
  const IDLE_LOOK_HOLD_MIN = 900;
  const IDLE_LOOK_HOLD_MAX = 1550;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let promptTimer = 0;
  let sequenceTimer = 0;
  let idleTimer = 0;
  let idleReturnTimer = 0;
  let lineIndex = Math.floor(Math.random() * LINES.length);
  let sequenceActive = false;
  let thanked = false;
  let cinematicActive = stage.classList.contains('cinematic-running');

  function randomBetween(min, max) {
    return Math.round(min + Math.random() * (max - min));
  }

  function clearTimer(name) {
    if (!name) return 0;
    window.clearTimeout(name);
    return 0;
  }

  function clearPromptTimer() { promptTimer = clearTimer(promptTimer); }
  function clearSequenceTimer() { sequenceTimer = clearTimer(sequenceTimer); }
  function clearIdleTimers() {
    idleTimer = clearTimer(idleTimer);
    idleReturnTimer = clearTimer(idleReturnTimer);
  }

  function titleAvailable() {
    return !document.hidden && !cinematicActive;
  }

  function setPose(pose) {
    const safePose = ['idle', 'present', 'raise'].includes(pose) ? pose : 'idle';
    npc.dataset.pose = safePose;
    stage.dataset.gariusPose = safePose;

    poseImages.forEach((image) => {
      image.classList.toggle('is-active', image.dataset.gariusPose === safePose);
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

  function scheduleIdleLook() {
    clearIdleTimers();
    if (!titleAvailable() || sequenceActive || thanked || reducedMotion.matches) return;

    idleTimer = window.setTimeout(() => {
      if (!titleAvailable() || sequenceActive || thanked) return;

      // Garius looks up from the hat for a moment, then settles back down.
      setPose('present');
      idleReturnTimer = window.setTimeout(() => {
        if (!sequenceActive && !thanked && titleAvailable()) setPose('idle');
        scheduleIdleLook();
      }, randomBetween(IDLE_LOOK_HOLD_MIN, IDLE_LOOK_HOLD_MAX));
    }, randomBetween(IDLE_LOOK_MIN, IDLE_LOOK_MAX));
  }

  function schedulePrompt(first = false) {
    clearPromptTimer();
    if (!titleAvailable() || sequenceActive || thanked) return;

    const delay = first
      ? randomBetween(FIRST_PROMPT_MIN, FIRST_PROMPT_MAX)
      : randomBetween(NEXT_PROMPT_MIN, NEXT_PROMPT_MAX);

    promptTimer = window.setTimeout(runPrompt, delay);
  }

  function resumeIdleAndSchedule() {
    setPose('idle');
    sequenceActive = false;
    scheduleIdleLook();
    schedulePrompt(false);
  }

  function finishPrompt() {
    hideBubble();

    if (reducedMotion.matches) {
      resumeIdleAndSchedule();
      return;
    }

    setPose('present');
    clearSequenceTimer();
    sequenceTimer = window.setTimeout(resumeIdleAndSchedule, POSE_TRANSITION_MS);
  }

  function holdPrompt() {
    setPose('raise');
    showBubble(nextLine());
    clearSequenceTimer();
    sequenceTimer = window.setTimeout(finishPrompt, BUBBLE_HOLD_MS);
  }

  function runPrompt() {
    clearPromptTimer();
    if (sequenceActive || thanked || !titleAvailable()) return;

    sequenceActive = true;
    clearIdleTimers();

    if (reducedMotion.matches) {
      holdPrompt();
      return;
    }

    setPose('present');
    clearSequenceTimer();
    sequenceTimer = window.setTimeout(holdPrompt, POSE_TRANSITION_MS);
  }

  function thankTraveller() {
    clearPromptTimer();
    clearSequenceTimer();
    clearIdleTimers();

    thanked = true;
    sequenceActive = true;
    setPose('raise');
    showBubble('Many thanks, kind traveller.', true);

    sequenceTimer = window.setTimeout(() => {
      hideBubble();
      thanked = false;
      resumeIdleAndSchedule();
    }, THANKS_HOLD_MS);
  }

  function pauseForCinematic() {
    clearPromptTimer();
    clearSequenceTimer();
    clearIdleTimers();
    hideBubble();
    setPose('idle');
    sequenceActive = false;
    thanked = false;
  }

  function resumeFromCinematic() {
    setPose('idle');
    hideBubble();
    scheduleIdleLook();
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
  stageObserver.observe(stage, { attributes: true, attributeFilter: ['class'] });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearPromptTimer();
      clearIdleTimers();
      return;
    }

    if (!cinematicActive && !sequenceActive && !thanked) {
      scheduleIdleLook();
      schedulePrompt(true);
    }
  });

  reducedMotion.addEventListener?.('change', () => {
    clearIdleTimers();
    if (!sequenceActive) {
      setPose('idle');
      if (!reducedMotion.matches) scheduleIdleLook();
    }
  });

  setPose('idle');
  hideBubble();
  scheduleIdleLook();
  schedulePrompt(true);
})();
