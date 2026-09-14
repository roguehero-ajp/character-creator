(() => {
  'use strict';

  const STORAGE_KEY = 'johnnyMuscles.powerUps.v1';
  const MAX_INVENTORY = 99;
  const CATALOG = Object.freeze([
    Object.freeze({
      id: 'kevlar-tank-top',
      icon: '🦺',
      name: 'Kevlar Tank Top',
      short: 'Blocks 2 hits',
      description: 'Absorbs the first two hits that would damage the defense line.',
      productId: 'jm.powerup.kevlar_tank_top.pack5',
      shieldHits: 2
    }),
    Object.freeze({
      id: 'backup-juice',
      icon: '💉',
      name: 'Backup Juice',
      short: '+2 steroid doses',
      description: 'Starts the mission with five steroid doses instead of three.',
      productId: 'jm.powerup.backup_juice.pack5',
      bonusSteroids: 2
    }),
    Object.freeze({
      id: 'flex-capacitor',
      icon: '⚡',
      name: 'Flex Capacitor',
      short: '20-second hot start',
      description: 'Begins the mission fully powered up for the first twenty seconds.',
      productId: 'jm.powerup.flex_capacitor.pack5',
      startingSteroidSeconds: 20
    }),
    Object.freeze({
      id: 'tank-rocket-wax',
      icon: '🚀',
      name: 'Tank Rocket Wax',
      short: '+10% throw force',
      description: 'Every vehicle leaves Johnny or Rick with ten percent more launch speed.',
      productId: 'jm.powerup.tank_rocket_wax.pack5',
      throwMultiplier: 1.10
    })
  ]);
  const BY_ID = new Map(CATALOG.map(item => [item.id, item]));
  const defaultInventory = () => Object.fromEntries(CATALOG.map(item => [item.id, 1]));

  let state = loadState();
  let activeId = null;
  let runStarted = false;
  let shieldHitsLeft = 0;
  let busy = false;
  let initialized = false;
  let lastFocus = null;
  let statusTimer = null;

  function clampCount(value) {
    const number = Number(value);
    return Number.isFinite(number)
      ? Math.max(0, Math.min(MAX_INVENTORY, Math.floor(number)))
      : 0;
  }

  function loadState() {
    const fallback = { version: 1, selected: null, inventory: defaultInventory() };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      const saved = JSON.parse(raw);
      const inventory = defaultInventory();
      CATALOG.forEach(item => {
        if (saved?.inventory && Object.prototype.hasOwnProperty.call(saved.inventory, item.id)) {
          inventory[item.id] = clampCount(saved.inventory[item.id]);
        }
      });
      return {
        version: 1,
        selected: BY_ID.has(saved?.selected) ? saved.selected : null,
        inventory
      };
    } catch {
      return fallback;
    }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {
      // The current page remains playable when storage is unavailable.
    }
  }

  function selectedPowerUp() {
    return BY_ID.get(state.selected) || null;
  }

  function activePowerUp() {
    return BY_ID.get(activeId) || null;
  }

  function countFor(id) {
    return clampCount(state.inventory[id]);
  }

  function doseLabel(count) {
    return `${count} ${count === 1 ? 'dose' : 'doses'}`;
  }

  function beginRun() {
    if (runStarted) return activePowerUp();
    runStarted = true;
    const selected = selectedPowerUp();

    if (selected && countFor(selected.id) > 0) {
      state.inventory[selected.id] = countFor(selected.id) - 1;
      activeId = selected.id;
      shieldHitsLeft = selected.shieldHits || 0;
      saveState();
      announce(`${selected.icon} ${selected.name} activated!`);
    } else {
      activeId = null;
      shieldHitsLeft = 0;
    }

    renderUi();
    renderActiveBadge();
    window.dispatchEvent(new CustomEvent('jm:powerup-started', {
      detail: { id: activeId, powerUp: activePowerUp() }
    }));
    return activePowerUp();
  }

  function getStartingState({ health = 5, steroids = 3, steroidTimer = 0 } = {}) {
    const powerUp = activePowerUp();
    return {
      health,
      steroids: steroids + (powerUp?.bonusSteroids || 0),
      steroidTimer: Math.max(steroidTimer, powerUp?.startingSteroidSeconds || 0)
    };
  }

  function getThrowMultiplier() {
    return activePowerUp()?.throwMultiplier || 1;
  }

  function resetAttempt() {
    shieldHitsLeft = activePowerUp()?.shieldHits || 0;
    renderActiveBadge();
  }

  function takeDamage(currentHealth, amount = 1) {
    let damage = Math.max(0, Math.floor(Number(amount) || 0));
    let blocked = 0;

    while (damage > 0 && shieldHitsLeft > 0 && activeId === 'kevlar-tank-top') {
      shieldHitsLeft--;
      damage--;
      blocked++;
    }

    if (blocked > 0) {
      renderActiveBadge();
      announce(shieldHitsLeft > 0
        ? `🦺 Kevlar Tank Top blocked the hit — ${shieldHitsLeft} block left!`
        : '🦺 Kevlar Tank Top blocked the hit — armour spent!');
      window.dispatchEvent(new CustomEvent('jm:powerup-shield-used', {
        detail: { blocked, shieldHitsLeft }
      }));
    }

    return Math.max(0, Number(currentHealth) - damage);
  }

  function grant(id, quantity = 1) {
    if (!BY_ID.has(id)) return false;
    state.inventory[id] = Math.min(MAX_INVENTORY, countFor(id) + clampCount(quantity));
    saveState();
    renderUi();
    return true;
  }

  function setSelected(id) {
    if (id !== null && !BY_ID.has(id)) return false;
    if (id && countFor(id) < 1) {
      setStatus('That power-up is out of charges. Grab one first.');
      return false;
    }
    state.selected = id;
    saveState();
    renderUi();
    setStatus(id ? `${BY_ID.get(id).name} equipped for the next mission.` : 'Starting without a power-up.');
    return true;
  }

  function isLiveMode() {
    return window.JM_MONETIZATION_MODE === 'live';
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function runDemoAd(powerUp) {
    for (let count = 3; count >= 1; count--) {
      setStatus(`DEMO REWARDED AD · ${count}`);
      await wait(600);
    }
    grant(powerUp.id, 1);
    setStatus(`${powerUp.icon} Demo complete — one ${powerUp.name} added.`);
  }

  async function runDemoPurchase(powerUp) {
    setStatus('TEST PURCHASE · No money will be charged.');
    await wait(450);
    grant(powerUp.id, 5);
    setStatus(`${powerUp.icon} Test complete — five ${powerUp.name} charges added.`);
  }

  async function requestReward(powerUp, kind) {
    if (busy || !powerUp) return;
    busy = true;
    renderUi();

    try {
      if (!isLiveMode()) {
        if (kind === 'ad') await runDemoAd(powerUp);
        else await runDemoPurchase(powerUp);
        return;
      }

      const bridge = window.JMMonetization;
      if (kind === 'ad') {
        if (typeof bridge?.showRewardedAd !== 'function') throw new Error('Rewarded ads are not connected yet.');
        const result = await bridge.showRewardedAd({
          placementId: 'mission-start-power-up',
          powerUpId: powerUp.id,
          quantity: 1
        });
        if (result !== true && result?.rewarded !== true) throw new Error('The ad ended before the reward was earned.');
        grant(powerUp.id, 1);
        setStatus(`${powerUp.icon} Reward earned — one ${powerUp.name} added.`);
      } else {
        if (typeof bridge?.purchasePowerUpPack !== 'function') throw new Error('Purchases are not connected yet.');
        const result = await bridge.purchasePowerUpPack({
          productId: powerUp.productId,
          powerUpId: powerUp.id,
          quantity: 5
        });
        if (result !== true && result?.purchased !== true) throw new Error('The purchase was not completed.');
        const quantity = clampCount(result?.quantity || 5) || 5;
        grant(powerUp.id, quantity);
        setStatus(`${powerUp.icon} Purchase complete — ${quantity} charges added.`);
      }
    } catch (error) {
      setStatus(error?.message || 'That did not complete. Please try again.', true);
    } finally {
      busy = false;
      renderUi();
    }
  }

  function announce(message) {
    let live = document.getElementById('jm-powerups-announcer');
    if (!live) {
      live = document.createElement('div');
      live.id = 'jm-powerups-announcer';
      live.className = 'jm-visually-hidden';
      live.setAttribute('aria-live', 'assertive');
      live.setAttribute('aria-atomic', 'true');
      document.body.appendChild(live);
    }
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = message; });
  }

  function setStatus(message, isError = false) {
    const status = document.getElementById('jm-powerups-status');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', isError);
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      if (status.textContent === message) renderModeStatus(status);
    }, 5200);
  }

  function renderModeStatus(status = document.getElementById('jm-powerups-status')) {
    if (!status) return;
    status.classList.remove('is-error');
    status.textContent = isLiveMode()
      ? 'Watch one rewarded ad for 1 charge, or buy a pack of 5.'
      : 'PROTOTYPE STORE · Demo ads and test purchases only. No money changes hands.';
  }

  function createLauncher() {
    const titleCard = document.querySelector('#title-screen .title-card');
    const startButton = document.getElementById('start');
    if (titleCard && startButton) {
      titleCard.classList.add('jm-has-powerups');
      const launcher = document.createElement('button');
      launcher.id = 'jm-powerups-open';
      launcher.className = 'jm-powerups-launcher';
      launcher.type = 'button';
      launcher.setAttribute('aria-haspopup', 'dialog');
      launcher.setAttribute('aria-controls', 'jm-powerups-panel');
      launcher.setAttribute('aria-expanded', 'false');
      launcher.innerHTML = '<span class="jm-launcher-icon" aria-hidden="true">⚡</span><span><strong>POWER-UPS</strong><small id="jm-powerups-launcher-status">None equipped</small></span>';
      const row = startButton.closest('.button-row');
      if (row && row.contains(startButton)) row.insertBefore(launcher, startButton);
      else startButton.before(launcher);
      launcher.addEventListener('click', openPanel);
      return;
    }

    const menu = document.querySelector('.menu-actions');
    if (!menu) return;
    const launcher = document.createElement('button');
    launcher.id = 'jm-powerups-open';
    launcher.className = 'menu-button jm-menu-powerups';
    launcher.type = 'button';
    launcher.setAttribute('aria-haspopup', 'dialog');
    launcher.setAttribute('aria-controls', 'jm-powerups-panel');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.innerHTML = '<span class="action-icon" aria-hidden="true">⚡</span><span class="action-copy"><span class="action-title">Power-Ups</span><span id="jm-powerups-launcher-status" class="action-note">Choose a boost for your next mission</span></span><span class="action-arrow" aria-hidden="true">›</span>';
    const version = menu.querySelector('.version-note');
    menu.insertBefore(launcher, version || null);
    launcher.addEventListener('click', openPanel);
  }

  function createPanel() {
    const layer = document.createElement('section');
    layer.id = 'jm-powerups-panel';
    layer.className = 'jm-powerups-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = `
      <div class="jm-powerups-dialog" role="dialog" aria-modal="true" aria-labelledby="jm-powerups-title" aria-describedby="jm-powerups-status">
        <header class="jm-powerups-head">
          <div><p>MISSION LOADOUT</p><h2 id="jm-powerups-title" tabindex="-1">Choose One Power-Up</h2></div>
          <button class="jm-powerups-close" type="button" aria-label="Close power-ups">×</button>
        </header>
        <p class="jm-powerups-rule">Your first loadout includes one free sample of each. One charge is used when the mission starts; retries keep the boost.</p>
        <div class="jm-powerups-grid">
          ${CATALOG.map(item => `
            <article class="jm-powerup-card" data-power-up-card="${item.id}">
              <div class="jm-powerup-title"><span aria-hidden="true">${item.icon}</span><div><h3>${item.name}</h3><strong>${item.short}</strong></div></div>
              <p>${item.description}</p>
              <div class="jm-powerup-count"><span>INVENTORY</span><b data-power-up-count="${item.id}">1</b></div>
              <button class="jm-equip-button" type="button" data-power-up-action="equip" data-power-up-id="${item.id}">Equip</button>
              <div class="jm-acquire-row">
                <button type="button" data-power-up-action="ad" data-power-up-id="${item.id}">Demo Ad · +1</button>
                <button type="button" data-power-up-action="buy" data-power-up-id="${item.id}">Test Buy · +5</button>
              </div>
            </article>`).join('')}
        </div>
        <footer class="jm-powerups-footer">
          <button type="button" class="jm-no-powerup" data-power-up-action="none">Equip No Power-Up</button>
          <p id="jm-powerups-status" role="status" aria-live="polite"></p>
        </footer>
      </div>`;
    document.body.appendChild(layer);

    layer.querySelector('.jm-powerups-close')?.addEventListener('click', closePanel);
    layer.addEventListener('pointerdown', event => {
      if (event.target === layer) closePanel();
    });
    layer.addEventListener('click', event => {
      const button = event.target.closest('[data-power-up-action]');
      if (!button || busy) return;
      const action = button.dataset.powerUpAction;
      const id = button.dataset.powerUpId;
      if (action === 'none') setSelected(null);
      else if (action === 'equip') setSelected(id);
      else if (action === 'ad' || action === 'buy') requestReward(BY_ID.get(id), action);
    });
  }

  function openPanel() {
    const panel = document.getElementById('jm-powerups-panel');
    if (!panel) return;
    lastFocus = document.activeElement;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.getElementById('jm-powerups-open')?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('jm-powerups-open');
    panel.querySelector('#jm-powerups-title')?.focus();
  }

  function closePanel() {
    const panel = document.getElementById('jm-powerups-panel');
    if (!panel) return;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    document.getElementById('jm-powerups-open')?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('jm-powerups-open');
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
    lastFocus = null;
  }

  function renderUi() {
    CATALOG.forEach(item => {
      const count = countFor(item.id);
      document.querySelectorAll(`[data-power-up-count="${item.id}"]`).forEach(el => { el.textContent = String(count); });
      const card = document.querySelector(`[data-power-up-card="${item.id}"]`);
      const equip = card?.querySelector('[data-power-up-action="equip"]');
      const selected = state.selected === item.id;
      card?.classList.toggle('is-selected', selected);
      if (equip) {
        equip.disabled = busy || count < 1;
        equip.textContent = selected ? 'Equipped' : count > 0 ? 'Equip' : 'Out of Charges';
        equip.setAttribute('aria-pressed', String(selected));
      }
    });

    document.querySelectorAll('[data-power-up-action="ad"], [data-power-up-action="buy"]').forEach(button => {
      button.disabled = busy;
      if (button.dataset.powerUpAction === 'ad') button.textContent = isLiveMode() ? 'Watch Ad · +1' : 'Demo Ad · +1';
      else button.textContent = isLiveMode() ? 'Buy Pack · +5' : 'Test Buy · +5';
    });

    const selected = selectedPowerUp();
    const launcherStatus = document.getElementById('jm-powerups-launcher-status');
    if (launcherStatus) {
      launcherStatus.textContent = selected
        ? `${selected.icon} ${selected.name} · ${countFor(selected.id)} left`
        : 'Choose a boost for your next mission';
    }

    const none = document.querySelector('[data-power-up-action="none"]');
    if (none) {
      none.classList.toggle('is-selected', state.selected === null);
      none.setAttribute('aria-pressed', String(state.selected === null));
      none.disabled = busy;
    }
    const status = document.getElementById('jm-powerups-status');
    if (!busy && status && !status.textContent) renderModeStatus(status);
  }

  function renderActiveBadge() {
    const controls = document.querySelector('.controls');
    if (!controls) return;
    let badge = document.getElementById('jm-active-powerup');
    const powerUp = activePowerUp();
    if (!runStarted || !powerUp) {
      badge?.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'jm-active-powerup';
      badge.className = 'jm-active-powerup';
      const mute = document.getElementById('mute');
      controls.insertBefore(badge, mute || null);
    }
    const shield = powerUp.id === 'kevlar-tank-top'
      ? ` · ${shieldHitsLeft} block${shieldHitsLeft === 1 ? '' : 's'}`
      : '';
    badge.textContent = `${powerUp.icon} ${powerUp.name}${shield}`;
  }

  function handleKeydown(event) {
    const panel = document.getElementById('jm-powerups-panel');
    if (!panel?.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closePanel();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...panel.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;
    document.body.classList.add('jm-powerups-ready');
    createLauncher();
    createPanel();
    renderUi();
    document.addEventListener('keydown', handleKeydown);
    document.getElementById('start')?.addEventListener('click', () => {
      closePanel();
      beginRun();
    }, true);
    document.getElementById('restart')?.addEventListener('click', resetAttempt, true);
    document.getElementById('replay')?.addEventListener('click', resetAttempt, true);
  }

  window.JMPowerUps = Object.freeze({
    catalog: CATALOG,
    beginRun,
    getStartingState,
    getThrowMultiplier,
    takeDamage,
    resetAttempt,
    doseLabel,
    getActive: activePowerUp,
    getSelected: selectedPowerUp,
    getCount: countFor,
    grant,
    select: setSelected
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
