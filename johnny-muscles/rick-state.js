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
  if (!rickSlide) return;

  function read(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  }

  const unlocked = read(KEYS.rickUnlocked) === 'true' || read(KEYS.city1Beaten) === 'true';
  if (unlocked) write(KEYS.rickUnlocked, 'true');

  if (unlocked) {
    rickSlide.dataset.status = 'playable';
    rickSlide.dataset.tagline = 'Get outta here, you gross alien cats!';
    rickSlide.setAttribute('aria-label', 'Rick Rampage, unlocked and playable');
    rickSlide.innerHTML = `
      <div class="rick-select-card">
        <img class="rick-select-art" src="assets/rick-rampage-select.webp" alt="Rick Rampage character sheet. Rick is a large muscular Black man with dreadlocks, a green T-shirt, orange camouflage shorts, gloves, and heavy boots. He throws cars at alien cats." />
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
    else if (selected === 'johnny') characterStatus.textContent = 'Active fighter: Johnny Muscles';
  }

  selectButton?.addEventListener('click', () => requestAnimationFrame(updateHomeStatus));
  updateHomeStatus();

  const params = new URLSearchParams(window.location.search);
  if (params.get('panel') === 'character') {
    const opener = document.querySelector('[data-open-panel="character-panel"]');
    opener?.click();
    if (params.get('character') === 'rick') {
      requestAnimationFrame(() => document.getElementById('character-next')?.click());
    }
  }
})();
