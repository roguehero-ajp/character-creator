(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const shell = document.getElementById('game-shell');
  if (!canvas || !shell || typeof PointerEvent === 'undefined') return;

  const W = 1280;
  const H = 720;
  const TANK_HOME = { x: 250, y: 557 };
  const DIRECT_TANK_RADIUS = 105;
  const GRAB_CENTER_OFFSET_X = 175;
  const GRAB_RADIUS = 120;

  let proxyPointerId = null;
  let grabOffsetX = 0;
  let grabOffsetY = 0;
  let hintDismissed = false;

  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const hint = document.createElement('div');
  hint.className = 'jm-grab-hint';
  hint.textContent = 'GRAB HERE';
  hint.setAttribute('aria-hidden', 'true');
  hint.hidden = true;
  shell.appendChild(hint);

  const style = document.createElement('style');
  style.textContent = `
    .jm-grab-hint {
      position: absolute;
      z-index: 6;
      pointer-events: none;
      transform: translate(-50%, -50%);
      min-width: 70px;
      height: 70px;
      padding: 0 10px;
      border: 2px solid rgba(184,255,95,.82);
      border-radius: 999px;
      background: rgba(28,45,22,.50);
      box-shadow: 0 0 0 7px rgba(184,255,95,.08), 0 0 22px rgba(184,255,95,.22);
      color: rgba(226,255,192,.96);
      font: 900 11px/66px system-ui, sans-serif;
      letter-spacing: .08em;
      text-align: center;
      white-space: nowrap;
    }
  `;
  document.head.appendChild(style);

  function metrics() {
    const rect = canvas.getBoundingClientRect();
    const canvasAspect = W / H;
    const rectAspect = rect.width / rect.height;
    let drawW; let drawH; let offsetX; let offsetY;

    if (rectAspect > canvasAspect) {
      drawH = rect.height;
      drawW = drawH * canvasAspect;
      offsetX = (rect.width - drawW) / 2;
      offsetY = 0;
    } else {
      drawW = rect.width;
      drawH = drawW / canvasAspect;
      offsetX = 0;
      offsetY = (rect.height - drawH) / 2;
    }

    return { rect, drawW, drawH, offsetX, offsetY };
  }

  function pointerToCanvas(e, m) {
    return {
      x: (e.clientX - m.rect.left - m.offsetX) * W / m.drawW,
      y: (e.clientY - m.rect.top - m.offsetY) * H / m.drawH
    };
  }

  function dispatchShifted(type, source) {
    const m = metrics();
    const clientX = source.clientX - grabOffsetX * m.drawW / W;
    const clientY = source.clientY - grabOffsetY * m.drawH / H;
    const shifted = new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: source.pointerId,
      pointerType: source.pointerType,
      isPrimary: source.isPrimary,
      clientX,
      clientY,
      screenX: source.screenX + (clientX - source.clientX),
      screenY: source.screenY + (clientY - source.clientY),
      width: source.width,
      height: source.height,
      pressure: source.pressure,
      tangentialPressure: source.tangentialPressure,
      tiltX: source.tiltX,
      tiltY: source.tiltY,
      twist: source.twist,
      button: source.button,
      buttons: source.buttons
    });
    canvas.dispatchEvent(shifted);
  }

  function hideHint() {
    hintDismissed = true;
    hint.hidden = true;
  }

  function positionHint() {
    if (!coarsePointer || hintDismissed) return;
    const m = metrics();
    const shellRect = shell.getBoundingClientRect();
    const grabX = TANK_HOME.x + GRAB_CENTER_OFFSET_X;
    const grabY = TANK_HOME.y;
    const left = m.rect.left - shellRect.left + m.offsetX + grabX * m.drawW / W;
    const top = m.rect.top - shellRect.top + m.offsetY + grabY * m.drawH / H;
    hint.style.left = `${left}px`;
    hint.style.top = `${top}px`;
  }

  function showHint() {
    if (!coarsePointer || hintDismissed) return;
    positionHint();
    hint.hidden = false;
  }

  canvas.addEventListener('pointerdown', e => {
    if (!e.isTrusted || proxyPointerId !== null) return;

    const m = metrics();
    const p = pointerToCanvas(e, m);
    if (typeof window.JMShouldBypassGrabProxy === 'function' && window.JMShouldBypassGrabProxy(p, e)) return;
    const directDistance = Math.hypot(p.x - TANK_HOME.x, p.y - TANK_HOME.y);

    if (directDistance <= DIRECT_TANK_RADIUS) {
      hideHint();
      return;
    }

    const grabX = TANK_HOME.x + GRAB_CENTER_OFFSET_X;
    const grabDistance = Math.hypot(p.x - grabX, p.y - TANK_HOME.y);
    if (grabDistance > GRAB_RADIUS) return;

    proxyPointerId = e.pointerId;
    grabOffsetX = p.x - TANK_HOME.x;
    grabOffsetY = p.y - TANK_HOME.y;
    hideHint();

    e.preventDefault();
    e.stopImmediatePropagation();
    dispatchShifted('pointerdown', e);
  }, { capture: true, passive: false });

  canvas.addEventListener('pointermove', e => {
    if (!e.isTrusted || e.pointerId !== proxyPointerId) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    dispatchShifted('pointermove', e);
  }, { capture: true, passive: false });

  canvas.addEventListener('pointerup', e => {
    if (!e.isTrusted || e.pointerId !== proxyPointerId) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    dispatchShifted('pointerup', e);
    proxyPointerId = null;
    grabOffsetX = 0;
    grabOffsetY = 0;
  }, { capture: true, passive: false });

  canvas.addEventListener('pointercancel', e => {
    if (!e.isTrusted || e.pointerId !== proxyPointerId) return;
    e.stopImmediatePropagation();
    dispatchShifted('pointercancel', e);
    proxyPointerId = null;
    grabOffsetX = 0;
    grabOffsetY = 0;
  }, { capture: true });

  document.getElementById('start')?.addEventListener('click', () => requestAnimationFrame(showHint));
  window.addEventListener('resize', positionHint);
  window.addEventListener('orientationchange', () => setTimeout(positionHint, 120));
})();