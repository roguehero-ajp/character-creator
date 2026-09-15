(() => {
  'use strict';

  const config = window.JM_INTERLUDE || {};
  const comic = document.getElementById('interlude-comic');
  const pages = comic ? [...comic.querySelectorAll('.rick-page')] : [];
  const artImages = comic ? [...comic.querySelectorAll('.rick-page img')] : [];
  const dots = [...document.querySelectorAll('[data-dot]')];
  const previous = document.getElementById('interlude-prev');
  const next = document.getElementById('interlude-next');
  const count = document.getElementById('interlude-page-count');
  const transcriptToggle = document.getElementById('interlude-transcript-toggle');
  const continueButton = document.getElementById('interlude-continue');

  let pageIndex = 0;
  let startX = null;
  let startY = null;
  let transcriptVisible = false;

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
    if (continueButton) continueButton.hidden = pageIndex !== pages.length - 1;
  }

  function setTranscript(visible) {
    transcriptVisible = Boolean(visible);
    comic?.classList.toggle('transcript-visible', transcriptVisible);
    transcriptToggle?.setAttribute('aria-expanded', String(transcriptVisible));
    if (transcriptToggle) transcriptToggle.textContent = transcriptVisible ? 'Hide text transcript' : 'Show text transcript';
  }

  async function loadPageArt(image, chunks) {
    if (!image || !Array.isArray(chunks) || !chunks.length) throw new Error('Comic art manifest is incomplete.');
    const responses = await Promise.all(chunks.map(path => fetch(path, { cache: 'force-cache' })));
    responses.forEach(response => {
      if (!response.ok) throw new Error(`Comic art chunk failed: ${response.status}`);
    });
    const base64 = (await Promise.all(responses.map(response => response.text()))).join('').replace(/\s+/g, '');
    image.src = `data:${config.mime || 'image/webp'};base64,${base64}`;
  }

  async function loadArt() {
    try {
      if (!Array.isArray(config.pages) || config.pages.length !== artImages.length) throw new Error('Comic page manifest does not match the reader.');
      await Promise.all(artImages.map((image, index) => loadPageArt(image, config.pages[index])));
    } catch (error) {
      console.error('Johnny Muscles interlude art failed to load.', error);
      setTranscript(true);
    }
  }

  previous?.addEventListener('click', () => showPage(pageIndex - 1));
  next?.addEventListener('click', () => showPage(pageIndex + 1));
  transcriptToggle?.addEventListener('click', () => setTranscript(!transcriptVisible));
  dots.forEach(dot => dot.addEventListener('click', () => showPage(Number(dot.dataset.dot))));

  artImages.forEach(image => image.addEventListener('error', () => setTranscript(true), { once: true }));

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
    else if (event.key === 'Escape') { window.location.href = 'index.html?build=0.18.0'; }
  });

  showPage(0);
  loadArt();
})();
