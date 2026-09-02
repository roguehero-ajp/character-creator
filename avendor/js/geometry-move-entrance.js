(() => {
  'use strict';

  const stage = document.getElementById('walk-stage');
  const canvas = document.getElementById('geometry-sketch-layer');
  const button = document.getElementById('geometry-sketch-move-entrance');
  const coordsLabel = document.getElementById('geometry-sketch-coords');
  const resetButton = document.getElementById('geometry-sketch-reset-edits');
  const copyButton = document.getElementById('geometry-sketch-copy');
  const output = document.getElementById('geometry-sketch-output');
  const walkTest = window.AvendorWalkTest;
  const geometrySketch = window.AvendorGeometrySketch;
  const mapEngine = window.AvendorMapEngine;

  if (!stage || !canvas || !button || !walkTest || !geometrySketch || !mapEngine) return;

  const ordinaryToolIds = [
    'geometry-sketch-walkable',
    'geometry-sketch-blocked',
    'geometry-sketch-occluder',
    'geometry-sketch-animation',
    'geometry-sketch-delete-blocked',
    'geometry-sketch-move-exit',
    'geometry-sketch-move-spawn'
  ];

  let active = false;
  let areaId = null;
  let baselinePortals = [];
  let dragState = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value ?? null));
  }

  function getMap() {
    return walkTest.getMap();
  }

  function mapPointFromEvent(event) {
    const map = getMap();
    if (!map) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: Math.max(0, Math.min(map.width, Math.round(((event.clientX - rect.left) / rect.width) * map.width))),
      y: Math.max(0, Math.min(map.height, Math.round(((event.clientY - rect.top) / rect.height) * map.height)))
    };
  }

  function pointInPolygon(point, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      const crosses = ((yi > point.y) !== (yj > point.y))
        && point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || Number.EPSILON) + xi;
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function findPortalAt(point) {
    const portals = getMap()?.data?.portals || [];
    for (let index = portals.length - 1; index >= 0; index -= 1) {
      if (pointInPolygon(point, portals[index].points || [])) {
        return { index, portal: portals[index] };
      }
    }
    return null;
  }

  function clampDraggedPoints(points, dx, dy) {
    const map = getMap();
    if (!map || !points.length) return points;
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const safeDx = Math.max(-Math.min(...xs), Math.min(map.width - Math.max(...xs), dx));
    const safeDy = Math.max(-Math.min(...ys), Math.min(map.height - Math.max(...ys), dy));
    return points.map(([x, y]) => [Math.round(x + safeDx), Math.round(y + safeDy)]);
  }

  function redrawDebug() {
    const map = getMap();
    const debugCanvas = document.getElementById('map-debug-layer');
    if (map && debugCanvas) mapEngine.drawDebugMap(debugCanvas, map);
  }

  function setPortals(portals) {
    const map = getMap();
    if (!map) return;
    map.data.portals = clone(portals);
    map.portals = map.data.portals;
    redrawDebug();
    refreshOutput();
  }

  function currentExport() {
    let data = {};
    try {
      data = JSON.parse(geometrySketch.exportJson() || '{}');
    } catch (_) {
      data = {};
    }
    data.authoredEdits = data.authoredEdits || {};
    data.authoredEdits.portals = clone(getMap()?.data?.portals || []);
    return JSON.stringify(data, null, 2);
  }

  function refreshOutput() {
    if (output) output.value = currentExport();
  }

  function syncArea() {
    const map = getMap();
    const nextAreaId = map?.data?.id || stage.dataset.areaId || null;
    if (!map || nextAreaId === areaId) return;
    areaId = nextAreaId;
    baselinePortals = clone(map.data.portals || []);
    dragState = null;
    setActive(false);
    refreshOutput();
  }

  function setActive(nextActive) {
    active = Boolean(nextActive);
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
    if (active) {
      geometrySketch.setKind('walkable');
      button.classList.add('selected');
      button.setAttribute('aria-pressed', 'true');
      canvas.style.cursor = 'move';
      if (coordsLabel) coordsLabel.textContent = 'Drag a purple building entrance';
    } else {
      dragState = null;
      if (canvas.classList.contains('show')) canvas.style.cursor = 'crosshair';
    }
  }

  function restorePortals() {
    if (!getMap()) return;
    setPortals(baselinePortals);
    dragState = null;
    if (coordsLabel) coordsLabel.textContent = 'Existing map edits reset';
  }

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    setActive(!active);
  }, true);

  ordinaryToolIds.forEach((id) => {
    document.getElementById(id)?.addEventListener('click', () => setActive(false));
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (!active || event.button !== 0) return;
    const point = mapPointFromEvent(event);
    if (!point) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const hit = findPortalAt(point);
    if (!hit) {
      if (coordsLabel) coordsLabel.textContent = 'No purple entrance trigger under cursor';
      return;
    }

    dragState = {
      index: hit.index,
      id: hit.portal.id || `portal-${hit.index + 1}`,
      label: hit.portal.label || hit.portal.id || 'entrance',
      start: point,
      originalPoints: clone(hit.portal.points || [])
    };
    canvas.setPointerCapture?.(event.pointerId);
    if (coordsLabel) coordsLabel.textContent = `Moving entrance: ${dragState.label}`;
  }, true);

  canvas.addEventListener('pointermove', (event) => {
    if (!active) return;
    const point = mapPointFromEvent(event);
    if (!point) return;
    event.stopImmediatePropagation();

    if (!dragState) {
      if (coordsLabel) {
        const hit = findPortalAt(point);
        coordsLabel.textContent = hit
          ? `Entrance: ${hit.portal.label || hit.portal.id || 'portal'} · drag to move`
          : `x ${point.x}, y ${point.y}`;
      }
      return;
    }

    event.preventDefault();
    const map = getMap();
    if (!map) return;
    const dx = point.x - dragState.start.x;
    const dy = point.y - dragState.start.y;
    const portals = clone(map.data.portals || []);
    portals[dragState.index].points = clampDraggedPoints(dragState.originalPoints, dx, dy);
    setPortals(portals);
    if (coordsLabel) coordsLabel.textContent = `Entrance ${dragState.id} · Δx ${dx}, Δy ${dy}`;
  }, true);

  function endDrag(event) {
    if (!active || !dragState) return;
    event.stopImmediatePropagation();
    dragState = null;
    if (event?.pointerId != null && canvas.hasPointerCapture?.(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    refreshOutput();
  }

  canvas.addEventListener('pointerup', endDrag, true);
  canvas.addEventListener('pointercancel', endDrag, true);

  resetButton?.addEventListener('click', restorePortals, true);

  copyButton?.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const text = currentExport();
    if (output) output.value = text;
    try {
      await navigator.clipboard.writeText(text);
      if (coordsLabel) coordsLabel.textContent = 'JSON copied, including entrance edits';
    } catch (_) {
      output?.focus();
      output?.select();
      document.execCommand('copy');
      stage.focus({ preventScroll: true });
      if (coordsLabel) coordsLabel.textContent = 'JSON selected/copied';
    }
  }, true);

  window.addEventListener('keydown', (event) => {
    if (!canvas.classList.contains('show')) return;
    const key = event.key.toLowerCase();
    if (key === '8') {
      event.preventDefault();
      event.stopImmediatePropagation();
      setActive(true);
    } else if (/^[1-7]$/.test(key) || key === 'escape') {
      setActive(false);
    }
  }, true);

  new MutationObserver(syncArea).observe(stage, {
    attributes: true,
    attributeFilter: ['data-area-id']
  });

  syncArea();

  window.AvendorGeometryEntranceEditor = Object.freeze({
    setActive,
    reset: restorePortals,
    exportPortals: () => clone(getMap()?.data?.portals || [])
  });
})();
