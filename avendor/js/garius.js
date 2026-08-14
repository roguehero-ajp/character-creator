(() => {
  'use strict';

  if (window.__avendorGariusInstalled) return;
  window.__avendorGariusInstalled = true;

  const stage = document.getElementById('walk-stage');
  const garius = document.getElementById('garius-npc');
  const hat = document.getElementById('garius-hat-hitbox');
  const bubble = document.getElementById('garius-bubble');
  const bubbleText = document.getElementById('garius-bubble-text');

  if (!stage || !garius || !hat || !bubble || !bubbleText) return;

  const POSES = Object.freeze({
    idle: 'assets/garius/garius-idle.png',
    present: 'assets/garius/garius-present.png',
    raise: 'assets/garius/garius-raise.png'
  });

  const LINES = Object.freeze([
    'Spare some coin for a weary game developer?',
    'Kind traveller, support a humble creator?',
    'A coin for a road-worn developer?',
    'Help keep the adventure alive?'
  ]);

  const FIRST_PROMPT_MIN = 6500;
  const FIRST_PROMPT_MAX = 9500;
  const NEXT_PROMPT_MIN = 26000;
  const NEXT_PROMPT_MAX = 44000;
  const BUBBLE_HOLD_MS = 5600;
  const TRANSITION_MS = 360;
  const THANKS_HOLD_MS = 2600;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let promptTimer = 0;
  let sequenceTimer = 0;
  let lineIndex = Math.floor(Math.random() * LINES.length);
  let sequenceActive = false;
  let thanked = false;

  function randomBetween(min, max) {
    return Math.round(min + Math.random() * (max - min));
  }

  function clearPromptTimer() {
    if (promptTimer) {
      window.clearTimeout(promptTimer);
      promptTimer = 0;
    }
  }

  function clearSequenceTimer() {
    if (sequenceTimer) {
      window.clearTimeout(sequenceTimer);
      sequenceTimer = 0;
    }
  }

  function setPose(pose) {
    const safePose = Object.prototype.hasOwnProperty.call(POSES, pose) ? pose : 'idle';
    garius.dataset.pose = safePose;
    garius.src = POSES[safePose];
    stage.dataset.gariusPose = safePose;
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
    if (document.hidden || sequenceActive || thanked) return;

    const delay = first
      ? randomBetween(FIRST_PROMPT_MIN, FIRST_PROMPT_MAX)
      : randomBetween(NEXT_PROMPT_MIN, NEXT_PROMPT_MAX);

    promptTimer = window.setTimeout(runPrompt, delay);
  }

  function finishPrompt() {
    hideBubble();

    if (reducedMotion.matches) {
      setPose('idle');
      sequenceActive = false;
      schedulePrompt(false);
      return;
    }

    setPose('present');
    clearSequenceTimer();
    sequenceTimer = window.setTimeout(() => {
      setPose('idle');
      sequenceActive = false;
      schedulePrompt(false);
    }, TRANSITION_MS);
  }

  function holdPrompt() {
    setPose('raise');
    showBubble(nextLine());
    clearSequenceTimer();
    sequenceTimer = window.setTimeout(finishPrompt, BUBBLE_HOLD_MS);
  }

  function runPrompt() {
    clearPromptTimer();
    if (sequenceActive || thanked || document.hidden) return;

    sequenceActive = true;

    if (reducedMotion.matches) {
      holdPrompt();
      return;
    }

    setPose('present');
    clearSequenceTimer();
    sequenceTimer = window.setTimeout(holdPrompt, TRANSITION_MS);
  }

  function thankTraveller() {
    clearPromptTimer();
    clearSequenceTimer();
    thanked = true;
    sequenceActive = true;
    setPose('raise');
    showBubble('Many thanks, kind traveller.', true);

    sequenceTimer = window.setTimeout(() => {
      hideBubble();
      setPose('idle');
      thanked = false;
      sequenceActive = false;
      schedulePrompt(false);
    }, THANKS_HOLD_MS);
  }

  hat.addEventListener('click', thankTraveller);
  bubble.addEventListener('click', thankTraveller);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearPromptTimer();
      return;
    }

    if (!sequenceActive && !thanked) {
      schedulePrompt(true);
    }
  });

  reducedMotion.addEventListener?.('change', () => {
    if (!sequenceActive) setPose('idle');
  });

  setPose('idle');
  hideBubble();
  schedulePrompt(true);
})();
