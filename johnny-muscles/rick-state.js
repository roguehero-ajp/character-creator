(() => {
  'use strict';

  const KEYS = {
    city1Beaten: 'johnnyMuscles.city1Beaten',
    rickUnlocked: 'johnnyMuscles.rickUnlocked',
    selectedCharacter: 'johnnyMuscles.selectedCharacter'
  };

  const rickSlide = document.getElementById('character-rick');
  const characterStatus = document.getElementById('character-status');
  const selectButton = document.getElementById('character-select-button');
  const selectorFooter = document.querySelector('.selector-footer');
  const sheet = document.getElementById('character-sheet');
  const characterPanel = document.getElementById('character-panel');
  if (!rickSlide) return;

  function read(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  }

  const unlocked = read(KEYS.rickUnlocked) === 'true' || read(KEYS.city1Beaten) === 'true';
  if (unlocked) write(KEYS.rickUnlocked, 'true');

  if (unlocked) {
    rickSlide.dataset.status = 'playable';
    rickSlide.dataset.tagline = 'Get outta here, you gross alien cats!';
    rickSlide.setAttribute('aria-label', 'Rick Rampage, unlocked and playable');
    rickSlide.innerHTML = `
      <div class="rick-select-card">
        <img class="rick-select-art" src="assets/rick-unlock-page-1.webp?rev=0.11.6" alt="Rick Rampage casually juggles cars, then throws them at a giant alien cat while shouting, Get outta here, you gross alien cats!" />
        <div class="rick-select-caption">
          <strong>Unlocked · Beat City 1</strong>
          <span>“Get outta here, you gross alien cats!”</span>
        </div>
      </div>`;
  } else {
    const lockedCopy = rickSlide.querySelector('.locked-sheet > div:last-child');
    if (lockedCopy) {
      lockedCopy.innerHTML = '<span class="lock-chip">🔒 Locked</span><h3>Rick Rampage</h3><p>Rick joins the fight after Johnny secures City 1.</p><span class="rick-lock-rule">Unlock: Beat City 1</span>';
    }
    rickSlide.dataset.tagline = 'Unlock: Beat City 1';
  }

  function updateHomeStatus() {
    if (!characterStatus) return;
    const selected = read(KEYS.selectedCharacter) || 'johnny';
    if (selected === 'rick' && unlocked) characterStatus.textContent = 'Active fighter: Rick Rampage';
    else characterStatus.textContent = 'Active fighter: Johnny Muscles';
  }

  let deployButton = null;
  if (selectorFooter && selectButton && !document.getElementById('character-deploy-button')) {
    const actions = document.createElement('div');
    actions.className = 'character-deploy-actions';
    selectButton.parentNode.insertBefore(actions, selectButton);
    actions.appendChild(selectButton);

    deployButton = document.createElement('button');
    deployButton.id = 'character-deploy-button';
    deployButton.className = 'character-select-button character-deploy-button';
    deployButton.type = 'button';
    actions.appendChild(deployButton);
  } else {
    deployButton = document.getElementById('character-deploy-button');
  }

  function activeSlide() {
    return sheet?.querySelector('.character-slide.is-active') || null;
  }

  function syncDeployButton() {
    if (!deployButton) return;
    const slide = activeSlide();
    const playable = slide?.dataset.status === 'playable';
    const name = slide?.dataset.name || 'Fighter';
    deployButton.disabled = !playable;
    deployButton.textContent = playable ? `Deploy ${name}` : 'Fighter Locked';
    deployButton.setAttribute('aria-label', playable ? `Deploy ${name}` : `${name} is locked and cannot be deployed`);
  }

  function deployActiveFighter() {
    const slide = activeSlide();
    if (!slide || slide.dataset.status !== 'playable') return;
    const character = slide.dataset.character || 'johnny';
    write(KEYS.selectedCharacter, character);
    updateHomeStatus();
    const destination = read(KEYS.city1Beaten) === 'true' ? 'city2.html?build=0.11.9' : 'city1.html?build=0.11.9';
    window.location.href = destination;
  }

  selectButton?.addEventListener('click', () => requestAnimationFrame(() => {
    updateHomeStatus();
    syncDeployButton();
  }));
  deployButton?.addEventListener('click', deployActiveFighter);

  document.getElementById('character-prev')?.addEventListener('click', () => requestAnimationFrame(syncDeployButton));
  document.getElementById('character-next')?.addEventListener('click', () => requestAnimationFrame(syncDeployButton));
  sheet?.addEventListener('pointerup', () => requestAnimationFrame(syncDeployButton));
  characterPanel?.addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) requestAnimationFrame(syncDeployButton);
  });

  updateHomeStatus();
  syncDeployButton();

  const params = new URLSearchParams(window.location.search);
  if (params.get('panel') === 'character') {
    const opener = document.querySelector('[data-open-panel="character-panel"]');
    opener?.click();
    if (params.get('character') === 'rick') {
      requestAnimationFrame(() => {
        document.getElementById('character-next')?.click();
        requestAnimationFrame(syncDeployButton);
      });
    }
  }
})();

(() => {
  'use strict';
  if (document.querySelector('script[data-creator-code-loader]')) return;
  const script = document.createElement('script');
  script.src = 'creator-code.js?rev=0.11.9';
  script.defer = true;
  script.dataset.creatorCodeLoader = 'true';
  document.head.appendChild(script);
})();
