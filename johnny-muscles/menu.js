(() => {
  'use strict';

  const panels = [...document.querySelectorAll('[data-panel]')];
  const openers = [...document.querySelectorAll('[data-open-panel]')];
  const closers = [...document.querySelectorAll('[data-close-panel]')];
  const characterButton = document.getElementById('select-johnny');
  const characterStatus = document.getElementById('character-status');
  const STORAGE_KEY = 'johnnyMuscles.selectedCharacter';

  let lastFocus = null;

  function closePanels() {
    panels.forEach(panel => {
      panel.classList.remove('visible');
      panel.setAttribute('aria-hidden', 'true');
    });
    document.body.style.overflow = '';
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  }

  function openPanel(id, opener) {
    const panel = document.getElementById(id);
    if (!panel) return;
    closePanels();
    lastFocus = opener || document.activeElement;
    panel.classList.add('visible');
    panel.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const firstControl = panel.querySelector('button, a[href], [tabindex]:not([tabindex="-1"])');
    if (firstControl instanceof HTMLElement) firstControl.focus();
  }

  openers.forEach(button => {
    button.addEventListener('click', () => openPanel(button.dataset.openPanel, button));
  });

  closers.forEach(button => button.addEventListener('click', closePanels));

  panels.forEach(panel => {
    panel.addEventListener('pointerdown', event => {
      if (event.target === panel) closePanels();
    });
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panels.some(panel => panel.classList.contains('visible'))) closePanels();
  });

  function renderCharacterSelection() {
    const selected = localStorage.getItem(STORAGE_KEY) || 'johnny';
    const isJohnny = selected === 'johnny';
    if (characterButton) {
      characterButton.setAttribute('aria-pressed', String(isJohnny));
      characterButton.textContent = isJohnny ? 'Johnny Selected' : 'Select Johnny';
    }
    if (characterStatus) characterStatus.textContent = isJohnny ? 'Active fighter: Johnny Muscles' : 'Choose a fighter';
  }

  if (characterButton) {
    characterButton.addEventListener('click', () => {
      localStorage.setItem(STORAGE_KEY, 'johnny');
      renderCharacterSelection();
    });
  }

  renderCharacterSelection();
})();
