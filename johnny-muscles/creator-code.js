(() => {
  'use strict';

  if (window.JohnnyCreatorCodes) return;

  const REDEEMED_KEY = 'johnnyMuscles.creatorCodes.redeemed';
  const registry = new Map();
  let opener = null;

  function normalizeCode(value) {
    return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  }

  function readRedeemed() {
    try {
      const parsed = JSON.parse(localStorage.getItem(REDEEMED_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(value => typeof value === 'string') : [];
    } catch {
      return [];
    }
  }

  function writeRedeemed(codes) {
    try { localStorage.setItem(REDEEMED_KEY, JSON.stringify([...new Set(codes)])); } catch {}
  }

  function register(code, reward = {}) {
    const normalized = normalizeCode(code);
    if (!normalized) throw new Error('Creator code cannot be empty.');
    registry.set(normalized, {
      label: String(reward.label || 'Special reward'),
      once: reward.once !== false,
      apply: typeof reward.apply === 'function' ? reward.apply : () => true
    });
  }

  function loadStyles() {
    if (document.querySelector('link[data-creator-code-styles]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'creator-code.css?rev=0.11.7';
    link.dataset.creatorCodeStyles = 'true';
    document.head.appendChild(link);
  }

  function focusables(panel) {
    return [...panel.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.hidden);
  }

  const version = document.querySelector('.version-note');
  if (version) version.textContent = 'Prototype 0.11.7 · Creator Codes';

  const menuActions = document.querySelector('.menu-actions');
  if (!menuActions) return;
  loadStyles();

  const creatorButton = document.createElement('button');
  creatorButton.className = 'menu-button';
  creatorButton.type = 'button';
  creatorButton.setAttribute('aria-haspopup', 'dialog');
  creatorButton.setAttribute('aria-controls', 'creator-code-panel');
  creatorButton.innerHTML = `
    <span class="action-icon" aria-hidden="true">⌨</span>
    <span class="action-copy"><span class="action-title">Creator Code</span><span class="action-note">Enter a code for special stuff</span></span>
    <span class="action-arrow" aria-hidden="true">›</span>`;

  if (version) menuActions.insertBefore(creatorButton, version);
  else menuActions.appendChild(creatorButton);

  const panel = document.createElement('section');
  panel.id = 'creator-code-panel';
  panel.className = 'panel-layer';
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = `
    <div class="menu-panel creator-code-panel" role="dialog" aria-modal="true" aria-labelledby="creator-code-title" aria-describedby="creator-code-description">
      <div class="panel-head">
        <div><p class="panel-kicker">Bonus transmission</p><h2 id="creator-code-title" tabindex="-1">Creator Code</h2></div>
        <button class="close-button" type="button" data-creator-code-close aria-label="Close creator code entry">×</button>
      </div>
      <p id="creator-code-description" class="creator-code-intro">Got a creator code? Punch it in here. Valid codes can unlock special surprises and bonus content on this device.</p>
      <form id="creator-code-form" class="creator-code-form" novalidate>
        <label class="creator-code-label" for="creator-code-input">Enter code</label>
        <div class="creator-code-input-row">
          <input id="creator-code-input" class="creator-code-input" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="32" placeholder="YOUR-CODE-HERE" aria-describedby="creator-code-help creator-code-status" />
          <button class="creator-code-submit" type="submit">Redeem</button>
        </div>
        <p id="creator-code-help" class="creator-code-help">Codes are not case-sensitive. We haven’t activated any public codes yet, so this is ready for the first one we design.</p>
        <p id="creator-code-status" class="creator-code-status" role="status" aria-live="polite" aria-atomic="true">Ready for a code.</p>
      </form>
      <div class="creator-code-redeemed">
        <h3>Redeemed on this device</h3>
        <ul id="creator-code-redeemed-list" class="creator-code-redeemed-list"></ul>
      </div>
    </div>`;
  document.body.appendChild(panel);

  const dialog = panel.querySelector('[role="dialog"]');
  const heading = document.getElementById('creator-code-title');
  const form = document.getElementById('creator-code-form');
  const input = document.getElementById('creator-code-input');
  const status = document.getElementById('creator-code-status');
  const redeemedList = document.getElementById('creator-code-redeemed-list');
  const closeButton = panel.querySelector('[data-creator-code-close]');

  function renderRedeemed() {
    if (!redeemedList) return;
    redeemedList.textContent = '';
    readRedeemed().forEach(code => {
      const item = document.createElement('li');
      const reward = registry.get(code);
      item.textContent = reward ? `${code} · ${reward.label}` : code;
      redeemedList.appendChild(item);
    });
  }

  function setStatus(message, state = '') {
    if (!status) return;
    status.textContent = message;
    status.className = `creator-code-status${state ? ` ${state}` : ''}`;
  }

  function openPanel() {
    opener = document.activeElement;
    panel.classList.add('visible');
    panel.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    renderRedeemed();
    requestAnimationFrame(() => {
      if (input) input.focus();
      else heading?.focus();
    });
  }

  function closePanel() {
    panel.classList.remove('visible');
    panel.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (opener instanceof HTMLElement) opener.focus();
    opener = null;
  }

  creatorButton.addEventListener('click', openPanel);
  closeButton?.addEventListener('click', closePanel);
  panel.addEventListener('pointerdown', event => {
    if (event.target === panel) closePanel();
  });

  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePanel();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusables(panel);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const code = normalizeCode(input?.value);
    if (!code) {
      setStatus('Enter a creator code first.', 'error');
      input?.focus();
      return;
    }

    const reward = registry.get(code);
    if (!reward) {
      setStatus('That creator code isn’t active. Check the spelling and try again.', 'error');
      input?.select();
      return;
    }

    const redeemed = readRedeemed();
    if (reward.once && redeemed.includes(code)) {
      setStatus(`You’ve already redeemed ${code}.`, 'success');
      return;
    }

    try {
      const result = await reward.apply({ code, label: reward.label });
      if (result === false) throw new Error('Reward was not applied.');
      writeRedeemed([...redeemed, code]);
      setStatus(`${reward.label} unlocked!`, 'success');
      renderRedeemed();
      window.dispatchEvent(new CustomEvent('johnny-muscles:creator-code-redeemed', { detail: { code, label: reward.label } }));
      if (input) input.value = '';
    } catch (error) {
      console.error('Creator code reward failed:', error);
      setStatus('That code is valid, but the reward could not be applied. Try again.', 'error');
    }
  });

  window.JohnnyCreatorCodes = Object.freeze({
    register,
    normalize: normalizeCode,
    redeemed: () => [...readRedeemed()],
    isRedeemed: code => readRedeemed().includes(normalizeCode(code))
  });

  renderRedeemed();
})();
