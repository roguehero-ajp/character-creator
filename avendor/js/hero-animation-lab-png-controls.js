(() => {
  'use strict';

  const VERSION = '0.5.3';
  const lab = window.AvendorHeroAnimationLab;
  const overlay = window.AvendorHeroAnimationLabPngOverlay;
  const output = document.getElementById('lab-output');
  const status = document.getElementById('lab-status');

  if (!lab || !overlay) return;

  function visibleViewMode() {
    return document.querySelector('[data-view-mode].selected')?.dataset.viewMode || 'both';
  }

  function decoratedJson() {
    const data = JSON.parse(lab.exportJson());
    data.body = overlay.getGender() === 'female' ? 'female' : 'male';
    data.preview = data.preview || {};
    data.preview.bodyStyle = 'png';
    data.preview.viewMode = visibleViewMode();
    return JSON.stringify(data, null, 2);
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (!target) return;

    if (target.id === 'lab-copy' && overlay.getActive()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const text = decoratedJson();
      if (output) output.value = text;

      navigator.clipboard.writeText(text).then(() => {
        if (status) status.textContent = 'Pose JSON copied with PNG Hero preview metadata.';
      }).catch(() => {
        output?.focus();
        output?.select();
        document.execCommand('copy');
        if (status) status.textContent = 'Pose JSON selected/copied with PNG Hero preview metadata.';
      });
      return;
    }

    if (target.matches('[data-body-style]') && overlay.getActive()) {
      const requestedView = visibleViewMode();
      queueMicrotask(() => lab.setViewMode(requestedView));
    }
  }, true);

  window.AvendorHeroAnimationLabPngControls = Object.freeze({
    version: VERSION,
    decoratedJson
  });
})();
