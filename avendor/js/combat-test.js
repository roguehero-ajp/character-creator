(() => {
  'use strict';

  const PlayerState = window.AvendorPlayerState;
  const Sprite = window.AvendorCombatProductionSprite?.CombatHeroSprite;
  const Combat = window.AvendorCombatEngine;
  if (!PlayerState || !Sprite || !Combat) {
    throw new Error('Combat test requires combat-production-sprite.js, player-state.js and combat-engine.js.');
  }

  const arena = document.getElementById('combat-arena');
  const fighter = document.getElementById('fighter');
  const mirror = document.getElementById('fighter-mirror');
  const pose = document.getElementById('fighter-pose');
  const fighterCanvas = document.getElementById('fighter-canvas');
  const sword = document.getElementById('sword');
  const dummy = document.getElementById('training-dummy');
  const spark = document.getElementById('hit-spark');
  const callout = document.getElementById('combat-callout');
  const staminaFill = document.getElementById('stamina-fill');
  const staminaValue = document.getElementById('stamina-value');
  const weaponRank = document.getElementById('weapon-rank');
  const attackGrid = document.getElementById('attack-grid');
  const familiarityValue = document.getElementById('familiarity-value');
  const familiarityFill = document.getElementById('familiarity-fill');
  const experienceValue = document.getElementById('experience-value');
  const techniqueList = document.getElementById('technique-list');
  const resetPracticeButton = document.getElementById('reset-practice');
  const restoreStaminaButton = document.getElementById('restore-stamina');

  const hero = new Sprite(fighterCanvas, { body: 'male' });
  const keys = new Set();
  const movementKeys = new Set(['a', 'd', 'arrowleft', 'arrowright']);
  const attackKeys = new Map([
    ['j', Combat.ATTACKS.quick],
    ['k', Combat.ATTACKS.committed],
    ['l', Combat.ATTACKS.thrust]
  ]);

  let state = PlayerState.load();
  let x = 34;
  let facing = 1;
  let staminaMax = 100;
  let stamina = 100;
  let lastFrameAt = performance.now();
  let action = null;
  let guarding = false;
  let dodgingUntil = 0;
  let lastHitActionId = 0;
  let noticeTimer = 0;
  let actionSerial = 0;
  let stateDirty = false;
  let stateSaveTimer = 0;

  function setCallout(message, duration = 1000) {
    window.clearTimeout(noticeTimer);
    callout.textContent = message;
    noticeTimer = window.setTimeout(() => {
      callout.textContent = 'Ready.';
    }, duration);
  }

  function saveStateSoon() {
    stateDirty = true;
    window.clearTimeout(stateSaveTimer);
    stateSaveTimer = window.setTimeout(() => {
      if (!stateDirty) return;
      state = PlayerState.save(state);
      stateDirty = false;
      renderDeveloperPanel();
    }, 180);
  }

  function getProgress() {
    return Combat.getSwordProgress(state);
  }

  function rankLabel() {
    const progress = getProgress();
    const formallyTrained = state.practicedSkills?.includes('Sword');
    if (progress.combatExperience >= 180) return 'Experienced';
    if (progress.familiarity >= 24 || formallyTrained) return 'Novice';
    if (progress.familiarity >= 10) return 'Familiar';
    return 'Untrained';
  }

  function renderAttackCards() {
    attackGrid.textContent = '';
    for (const attack of Object.values(Combat.ATTACKS)) {
      const timing = Combat.attackTiming(state, attack);
      const card = document.createElement('div');
      card.className = 'attack-card';
      card.innerHTML =
        `<span><b>${attack.key}</b> ${attack.label}</span>`
        + `<b>${timing.durationMs} ms</b>`
        + `<small>${timing.staminaCost} stamina · active ${(timing.activeStart * 100).toFixed(0)}–${(timing.activeEnd * 100).toFixed(0)}%</small>`;
      attackGrid.appendChild(card);
    }
  }

  function renderDeveloperPanel() {
    const progress = getProgress();
    familiarityValue.textContent = `${Math.round(progress.familiarity)} / ${Combat.SELF_PRACTICE_CAP}`;
    familiarityFill.style.width = `${(progress.familiarity / Combat.SELF_PRACTICE_CAP) * 100}%`;
    experienceValue.textContent = String(Math.round(progress.combatExperience));
    weaponRank.textContent = `Sword · ${rankLabel()}`;
    renderAttackCards();

    techniqueList.querySelectorAll('li').forEach((item) => {
      const name = item.querySelector('span')?.textContent;
      const value = item.querySelector('b');
      if (!value || name === 'Guard') return;
      value.textContent = progress.techniques.includes(name) ? 'Learned' : 'Locked';
    });
  }

  function renderStamina() {
    stamina = Math.max(0, Math.min(staminaMax, stamina));
    staminaFill.style.width = `${(stamina / staminaMax) * 100}%`;
    staminaValue.textContent = `${Math.round(stamina)} / ${Math.round(staminaMax)}`;
  }

  function setFacing(nextFacing) {
    facing = nextFacing < 0 ? -1 : 1;
    mirror.style.setProperty('--face', String(facing));
  }

  function setSwordVisual(angle = 28, extension = 0) {
    sword.style.setProperty('--sword-angle', `${angle.toFixed(2)}deg`);
    sword.style.setProperty('--sword-extension', `${extension.toFixed(2)}px`);
  }

  function setBodyVisual(lean = 0, leanDeg = 0) {
    pose.style.transform = `translateX(${lean.toFixed(2)}px) rotate(${leanDeg.toFixed(2)}deg)`;
  }

  function setFighterPosition() {
    fighter.style.left = `${x}%`;
  }

  function dummyDistancePx() {
    const arenaWidth = arena.clientWidth || 1000;
    const playerPx = (x / 100) * arenaWidth;
    const dummyPx = 0.70 * arenaWidth;
    return (dummyPx - playerPx) * facing;
  }

  function flashHit(label) {
    dummy.classList.remove('hit');
    spark.classList.remove('show');
    void dummy.offsetWidth;
    dummy.classList.add('hit');
    spark.classList.add('show');
    setCallout(`${label}: solid contact`, 850);
  }

  function recordPractice(amount = 1) {
    state = PlayerState.recordWeaponPractice(state, 'Sword', amount);
    saveStateSoon();
    renderDeveloperPanel();
  }

  function beginAttack(attack, now) {
    if (action || guarding || now < dodgingUntil) return;
    const timing = Combat.attackTiming(state, attack);
    if (stamina < timing.staminaCost) {
      setCallout('Too exhausted to commit to that attack.', 1100);
      return;
    }

    hero.setMotion('idle');
    stamina -= timing.staminaCost;
    renderStamina();
    action = {
      id: ++actionSerial,
      attack,
      timing,
      startedAt: now,
      hitResolved: false
    };
    setCallout(attack.label, 550);
  }

  function updateAttack(now) {
    if (!action) return;
    const elapsed = now - action.startedAt;
    const progress = Math.min(1, elapsed / action.timing.durationMs);
    const sample = Combat.sampleAttack(action.attack, progress);
    setSwordVisual(sample.angle, sample.extension);
    setBodyVisual(sample.lean, sample.leanDeg);

    if (sample.active && !action.hitResolved) {
      const distance = dummyDistancePx();
      if (distance >= 0 && distance <= action.attack.reachPx) {
        action.hitResolved = true;
        lastHitActionId = action.id;
        flashHit(action.attack.label);
      }
    }

    if (progress >= 1) {
      const completed = action;
      action = null;
      setSwordVisual();
      setBodyVisual();
      recordPractice(1);
      if (completed.id !== lastHitActionId) {
        setCallout(`${completed.attack.label}: air practice`, 750);
      }
    }
  }

  function beginDodge(now) {
    if (action || guarding || now < dodgingUntil) return;
    const cost = 14;
    if (stamina < cost) {
      setCallout('Not enough stamina to dodge.', 900);
      return;
    }
    hero.setMotion('idle');
    stamina -= cost;
    dodgingUntil = now + 520;
    fighter.style.setProperty('--dodge-offset', `${-facing * 42}px`);
    fighter.classList.add('dodging');
    window.setTimeout(() => fighter.classList.remove('dodging'), 520);
    renderStamina();
  }

  function updateMovement(deltaSeconds, now) {
    let direction = 0;
    const movementBlocked = Boolean(action || guarding || now < dodgingUntil);

    if (!movementBlocked) {
      if (keys.has('a') || keys.has('arrowleft')) direction -= 1;
      if (keys.has('d') || keys.has('arrowright')) direction += 1;
    }

    hero.setMotion(direction ? 'walk' : 'idle');
    if (!direction) return 0;

    setFacing(direction);
    x += direction * 18 * deltaSeconds;
    x = Math.max(12, Math.min(82, x));
    setFighterPosition();
    return direction;
  }

  function updateGuard(deltaSeconds) {
    if (!guarding || action) return;
    stamina -= 3.5 * deltaSeconds;
    if (stamina <= 0) {
      stamina = 0;
      guarding = false;
      setCallout('Your guard collapses from exhaustion.', 1000);
    }
    setSwordVisual(-6, 0);
    setBodyVisual(-2, -1.2);
  }

  function updateStamina(deltaSeconds, now) {
    if (action || guarding || now < dodgingUntil) return;
    stamina += 9 * deltaSeconds;
  }

  function tick(now) {
    const deltaSeconds = Math.min(0.05, Math.max(0, (now - lastFrameAt) / 1000));
    lastFrameAt = now;

    updateMovement(deltaSeconds, now);
    hero.update(now);
    updateAttack(now);
    updateGuard(deltaSeconds);
    updateStamina(deltaSeconds, now);
    renderStamina();
    requestAnimationFrame(tick);
  }

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();

    if (movementKeys.has(key)) {
      event.preventDefault();
      keys.add(key);
      return;
    }

    const attack = attackKeys.get(key);
    if (attack) {
      event.preventDefault();
      if (!event.repeat) beginAttack(attack, performance.now());
      return;
    }

    if (key === 'i') {
      event.preventDefault();
      if (action || performance.now() < dodgingUntil) return;
      hero.setMotion('idle');
      guarding = true;
      setCallout('Guard', 450);
      return;
    }

    if (key === ' ') {
      event.preventDefault();
      if (!event.repeat) beginDodge(performance.now());
    }
  });

  window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (movementKeys.has(key)) keys.delete(key);
    if (key === 'i') {
      guarding = false;
      if (!action) {
        setSwordVisual();
        setBodyVisual();
      }
    }
  });

  resetPracticeButton.addEventListener('click', () => {
    state = PlayerState.resetWeaponProgress(state, 'Sword');
    state = PlayerState.save(state);
    stateDirty = false;
    renderDeveloperPanel();
    setCallout('Sword practice reset.', 900);
  });

  restoreStaminaButton.addEventListener('click', () => {
    stamina = staminaMax;
    renderStamina();
    setCallout('Stamina restored.', 700);
  });

  arena.addEventListener('pointerdown', () => arena.focus({ preventScroll: true }));

  async function boot() {
    const body = state.body === 'female' ? 'female' : 'male';
    await hero.setBody(body);
    hero.setMotion('idle');
    hero.draw();

    staminaMax = PlayerState.derivedResources(state).stamina;
    stamina = staminaMax;
    setFacing(1);
    setFighterPosition();
    setSwordVisual();
    setBodyVisual();
    renderStamina();
    renderDeveloperPanel();
    arena.focus({ preventScroll: true });
    requestAnimationFrame(tick);
  }

  void boot();
})();
