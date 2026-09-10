(() => {
  'use strict';

  const STORAGE_KEY = 'johnnyMuscles.selectedCharacter';
  const panels = [...document.querySelectorAll('[data-panel]')];
  const openers = [...document.querySelectorAll('[data-open-panel]')];
  const closers = [...document.querySelectorAll('[data-close-panel]')];
  const characterPanel = document.getElementById('character-panel');
  const characterStatus = document.getElementById('character-status');
  const sheet = document.getElementById('character-sheet');
  const slides = sheet ? [...sheet.querySelectorAll('.character-slide')] : [];
  const prevButton = document.getElementById('character-prev');
  const nextButton = document.getElementById('character-next');
  const count = document.getElementById('character-count');
  const name = document.getElementById('selector-name');
  const tagline = document.getElementById('selector-tagline');
  const selectButton = document.getElementById('character-select-button');

  let lastFocus = null;
  let currentIndex = 0;
  let pointerStartX = null;
  let pointerStartY = null;

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
    lastFocus = opener || document.activeElement;
    panels.forEach(item => {
      item.classList.remove('visible');
      item.setAttribute('aria-hidden', 'true');
    });
    panel.classList.add('visible');
    panel.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const firstControl = panel.querySelector('button, a[href], [tabindex]:not([tabindex="-1"])');
    if (firstControl instanceof HTMLElement) firstControl.focus();
  }

  function selectedCharacter() {
    return localStorage.getItem(STORAGE_KEY) || 'johnny';
  }

  function updateHomeStatus() {
    if (!characterStatus) return;
    characterStatus.textContent = selectedCharacter() === 'johnny'
      ? 'Active fighter: Johnny Muscles'
      : 'Choose a fighter';
  }

  function showSlide(nextIndex) {
    if (!slides.length) return;
    currentIndex = (nextIndex + slides.length) % slides.length;
    slides.forEach((slide, index) => slide.classList.toggle('is-active', index === currentIndex));

    const active = slides[currentIndex];
    const character = active.dataset.character || '';
    const characterName = active.dataset.name || '';
    const status = active.dataset.status || 'locked';
    const characterTagline = active.dataset.tagline || '';

    if (count) count.textContent = `${currentIndex + 1} / ${slides.length}`;
    if (name) name.textContent = characterName;
    if (tagline) tagline.textContent = characterTagline;

    if (selectButton) {
      const playable = status === 'playable';
      const selected = selectedCharacter() === character;
      selectButton.disabled = !playable;
      selectButton.setAttribute('aria-pressed', String(playable && selected));
      selectButton.textContent = playable
        ? (selected ? `${characterName} Selected` : `Select ${characterName}`)
        : 'Locked';
    }
  }

  function step(direction) {
    showSlide(currentIndex + direction);
  }

  openers.forEach(button => button.addEventListener('click', () => openPanel(button.dataset.openPanel, button)));
  closers.forEach(button => button.addEventListener('click', closePanels));

  panels.forEach(panel => {
    panel.addEventListener('pointerdown', event => {
      if (event.target === panel) closePanels();
    });
  });

  prevButton?.addEventListener('click', () => step(-1));
  nextButton?.addEventListener('click', () => step(1));

  selectButton?.addEventListener('click', () => {
    const active = slides[currentIndex];
    if (!active || active.dataset.status !== 'playable') return;
    localStorage.setItem(STORAGE_KEY, active.dataset.character || 'johnny');
    updateHomeStatus();
    showSlide(currentIndex);
  });

  sheet?.addEventListener('pointerdown', event => {
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
  });

  sheet?.addEventListener('pointerup', event => {
    if (pointerStartX === null || pointerStartY === null) return;
    const dx = event.clientX - pointerStartX;
    const dy = event.clientY - pointerStartY;
    pointerStartX = null;
    pointerStartY = null;
    if (Math.abs(dx) < 42 || Math.abs(dx) <= Math.abs(dy)) return;
    step(dx < 0 ? 1 : -1);
  });

  sheet?.addEventListener('pointercancel', () => {
    pointerStartX = null;
    pointerStartY = null;
  });

  document.addEventListener('keydown', event => {
    const visiblePanel = panels.some(panel => panel.classList.contains('visible'));
    if (event.key === 'Escape' && visiblePanel) closePanels();
    if (!characterPanel?.classList.contains('visible')) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    }
  });

  updateHomeStatus();
  showSlide(0);
})();
