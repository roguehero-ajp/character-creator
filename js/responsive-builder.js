/**
 * My RPG Source
 * Responsive builder controls
 * ------------------------------------------
 * Collapses the large control panel on tablet/phone screens so the
 * character sheet reaches the top of the page quickly.
 *
 * UI-only state. This module does not participate in character saves.
 */

(() => {
  'use strict';

  const BREAKPOINT = '(max-width: 1180px)';

  function initResponsiveControls() {
    const controls = document.querySelector('.controls');
    const toggle = document.getElementById('responsive-controls-toggle');

    if (!controls || !toggle || controls.dataset.responsiveControlsReady === 'true') {
      return;
    }

    controls.dataset.responsiveControlsReady = 'true';

    const media = window.matchMedia(BREAKPOINT);
    let userChoseState = false;

    function render(collapsed) {
      controls.classList.toggle('responsive-controls-collapsed', collapsed);
      toggle.setAttribute('aria-expanded', String(!collapsed));
      toggle.textContent = collapsed ? 'Show Tools & Save' : 'Hide Tools & Save';
    }

    function syncToViewport() {
      if (!media.matches) {
        userChoseState = false;
        render(false);
        return;
      }

      if (!userChoseState) {
        render(true);
      }
    }

    toggle.addEventListener('click', () => {
      userChoseState = true;
      render(!controls.classList.contains('responsive-controls-collapsed'));
    });

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', syncToViewport);
    } else if (typeof media.addListener === 'function') {
      media.addListener(syncToViewport);
    }

    syncToViewport();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResponsiveControls, { once: true });
  } else {
    initResponsiveControls();
  }
})();
