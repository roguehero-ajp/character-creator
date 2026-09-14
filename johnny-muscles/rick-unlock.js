(() => {
  'use strict';

  const KEYS = {
    bobBeatenAsJohnny: 'johnnyMuscles.bobBeatenAsJohnny',
    rickUnlocked: 'johnnyMuscles.rickUnlocked',
    rickIntroSeen: 'johnnyMuscles.rickIntroSeen',
    selectedCharacter: 'johnnyMuscles.selectedCharacter'
  };

  const comic = document.getElementById('rick-comic');
  const pages = comic ? [...comic.querySelectorAll('.rick-page')] : [];
  const artImages = comic ? [...comic.querySelectorAll('.rick-page img')] : [];
  const dots = [...document.querySelectorAll('[data-dot]')];
  const previous = document.getElementById('rick-prev');
  const next = document.getElementById('rick-next');
  const count = document.getElementById('rick-page-count');
  const kicker = document.getElementById('rick-kicker');
  const transcriptToggle = document.getElementById('rick-transcript-toggle');
  const selectRick = document.getElementById('rick-select');
  const continueRegion = document.getElementById('rick-city2');

  let pageIndex = 0;
  let startX = null;
  let startY = null;
  let transcriptVisible = false;

  function read(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  }

  function remove(key) {
    try { localStorage.removeItem(key); } catch { /* Storage unavailable. */ }
  }

  const bobBeatenAsJohnny = read(KEYS.bobBeatenAsJohnny) === 'true';
  if (!bobBeatenAsJohnny) {
    remove(KEYS.rickUnlocked);
    remove(KEYS.rickIntroSeen);
    if (read(KEYS.selectedCharacter) === 'rick') write(KEYS.selectedCharacter, 'johnny');
  }

  const unlockEligible = bobBeatenAsJohnny && read(KEYS.rickUnlocked) === 'true';
  const firstUnlockViewing = unlockEligible && read(KEYS.rickIntroSeen) !== 'true';

  if (kicker) kicker.textContent = firstUnlockViewing ? 'New Ally Unlocked' : 'World 1 Interlude';

  if (continueRegion) {
    continueRegion.href = 'suburb1.html?build=0.16.5';
    continueRegion.textContent = 'Continue to the Suburbs';
    continueRegion.setAttribute('aria-label', 'Continue to the Suburbs');
  }

  function showPage(index) {
    if (!pages.length) return;
    pageIndex = Math.max(0, Math.min(index, pages.length - 1));
    pages.forEach((page, i) => {
      const active = i === pageIndex;
      page.classList.toggle('is-active', active);
      page.hidden = !active;
      page.setAttribute('aria-hidden', String(!active));
    });
    dots.forEach((dot, i) => {
      const active = i === pageIndex;
      dot.classList.toggle('is-active', active);
      if (active) dot.setAttribute('aria-current', 'page');
      else dot.removeAttribute('aria-current');
    });
    if (count) count.textContent = `Page ${pageIndex + 1} / ${pages.length}`;
    if (previous) previous.disabled = pageIndex === 0;
    if (next) next.hidden = pageIndex === pages.length - 1;
    if (selectRick) {
      selectRick.hidden = pageIndex !== pages.length - 1;
      selectRick.setAttribute('aria-disabled', String(!unlockEligible));
    }
    if (continueRegion) continueRegion.hidden = pageIndex !== pages.length - 1;
  }

  function setTranscript(visible) {
    transcriptVisible = Boolean(visible);
    comic?.classList.toggle('transcript-visible', transcriptVisible);
    transcriptToggle?.setAttribute('aria-expanded', String(transcriptVisible));
    if (transcriptToggle) transcriptToggle.textContent = transcriptVisible ? 'Hide text transcript' : 'Show text transcript';
  }

  function markSeen({ select = false } = {}) {
    if (!unlockEligible) return;
    write(KEYS.rickIntroSeen, 'true');
    write(KEYS.rickUnlocked, 'true');
    if (select) write(KEYS.selectedCharacter, 'rick');
  }

  previous?.addEventListener('click', () => showPage(pageIndex - 1));
  next?.addEventListener('click', () => showPage(pageIndex + 1));
  transcriptToggle?.addEventListener('click', () => setTranscript(!transcriptVisible));
  selectRick?.addEventListener('click', event => {
    if (!unlockEligible) {
      event.preventDefault();
      return;
    }
    markSeen({ select: true });
  });
  continueRegion?.addEventListener('click', () => markSeen());
  dots.forEach(dot => dot.addEventListener('click', () => showPage(Number(dot.dataset.dot))));

  artImages.forEach(image => {
    image.addEventListener('error', () => setTranscript(true), { once: true });
  });

  comic?.addEventListener('pointerdown', event => {
    startX = event.clientX;
    startY = event.clientY;
  });
  comic?.addEventListener('pointerup', event => {
    if (startX === null || startY === null) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    startX = null;
    startY = null;
    if (Math.abs(dx) < 42 || Math.abs(dx) <= Math.abs(dy)) return;
    showPage(pageIndex + (dx < 0 ? 1 : -1));
  });
  comic?.addEventListener('pointercancel', () => { startX = null; startY = null; });

  document.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); showPage(pageIndex - 1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); showPage(pageIndex + 1); }
    else if (event.key === 'Home') { event.preventDefault(); showPage(0); }
    else if (event.key === 'End') { event.preventDefault(); showPage(pages.length - 1); }
    else if (event.key === 'Escape') { window.location.href = 'index.html?build=0.16.5'; }
  });

  showPage(0);
})();
