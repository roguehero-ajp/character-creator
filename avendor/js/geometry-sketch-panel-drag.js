(() => {
  'use strict';

  const stage = document.getElementById('walk-stage');
  const panel = document.getElementById('geometry-sketch-panel');
  const handle = panel?.querySelector('.geometry-sketch-heading');
  if (!stage || !panel || !handle) return;

  const STORAGE_KEY = 'avendorGeometrySketchPanelPosition';
  const EDGE_GAP = 8;

  let activePointerId = null;
  let grabOffsetX = 0;
  let grabOffsetY = 0;

  handle.title = 'Drag to move. Double-click to return to the top-right.';
  handle.setAttribute('aria-label', 'Geometry sketch window. Drag to move; double-click to reset position.');

  function stageRect() {
    return stage.getBoundingClientRect();
  }

  function panelRect() {
    return panel.getBoundingClientRect();
  }

  function clampPosition(left, top) {
    const stageBox = stageRect();
    const panelBox = panelRect();
    const maxLeft = Math.max(EDGE_GAP, stageBox.width - panelBox.width - EDGE_GAP);
    const maxTop = Math.max(EDGE_GAP, stageBox.height - panelBox.height - EDGE_GAP);
    return {
      left: Math.max(EDGE_GAP, Math.min(maxLeft, left)),
      top: Math.max(EDGE_GAP, Math.min(maxTop, top))
    };
  }

  function applyPosition(left, top, save = true) {
    const next = clampPosition(left, top);
    panel.style.left = `${next.left}px`;
    panel.style.top = `${next.top}px`;
    panel.style.right = 'auto';
    if (save) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (_) {
        // Session persistence is optional; dragging still works without storage.
      }
    }
  }

  function readSavedPosition() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Number.isFinite(parsed?.left) || !Number.isFinite(parsed?.top)) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function restoreSavedPosition() {
    if (panel.hidden) return;
    const saved = readSavedPosition();
    if (saved) applyPosition(saved.left, saved.top, false);
  }

  function resetPosition() {
    activePointerId = null;
    panel.classList.remove('geometry-panel-dragging');
    panel.style.removeProperty('left');
    panel.style.removeProperty('top');
    panel.style.removeProperty('right');
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      // Nothing else to do.
    }
  }

  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || panel.hidden) return;
    event.preventDefault();
    event.stopPropagation();

    const stageBox = stageRect();
    const panelBox = panelRect();
    activePointerId = event.pointerId;
    grabOffsetX = event.clientX - panelBox.left;
    grabOffsetY = event.clientY - panelBox.top;

    panel.classList.add('geometry-panel-dragging');
    handle.setPointerCapture(event.pointerId);

    // Convert the default right-positioned panel to explicit left/top coordinates.
    applyPosition(panelBox.left - stageBox.left, panelBox.top - stageBox.top, false);
  });

  handle.addEventListener('pointermove', (event) => {
    if (event.pointerId !== activePointerId) return;
    event.preventDefault();
    const stageBox = stageRect();
    applyPosition(
      event.clientX - stageBox.left - grabOffsetX,
      event.clientY - stageBox.top - grabOffsetY,
      false
    );
  });

  function finishDrag(event) {
    if (activePointerId === null || event.pointerId !== activePointerId) return;
    if (handle.hasPointerCapture(activePointerId)) handle.releasePointerCapture(activePointerId);
    activePointerId = null;
    panel.classList.remove('geometry-panel-dragging');

    const stageBox = stageRect();
    const panelBox = panelRect();
    applyPosition(panelBox.left - stageBox.left, panelBox.top - stageBox.top, true);
  }

  handle.addEventListener('pointerup', finishDrag);
  handle.addEventListener('pointercancel', finishDrag);

  handle.addEventListener('dblclick', (event) => {
    event.preventDefault();
    event.stopPropagation();
    resetPosition();
  });

  window.addEventListener('resize', () => {
    if (panel.hidden || !panel.style.left) return;
    const stageBox = stageRect();
    const panelBox = panelRect();
    applyPosition(panelBox.left - stageBox.left, panelBox.top - stageBox.top, true);
  });

  const visibilityObserver = new MutationObserver(() => {
    if (!panel.hidden) requestAnimationFrame(restoreSavedPosition);
  });
  visibilityObserver.observe(panel, { attributes: true, attributeFilter: ['hidden'] });

  window.AvendorGeometrySketchPanelDrag = Object.freeze({
    restore: restoreSavedPosition,
    reset: resetPosition
  });
})();
