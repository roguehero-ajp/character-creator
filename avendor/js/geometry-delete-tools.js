(() => {
  'use strict';

  const stage = document.getElementById('walk-stage');
  const panel = document.getElementById('geometry-sketch-panel');
  const tools = panel?.querySelector('.geometry-sketch-tools');
  const baseCanvas = document.getElementById('geometry-sketch-layer');
  const debugCanvas = document.getElementById('map-debug-layer');
  const coordsLabel = document.getElementById('geometry-sketch-coords');
  const output = document.getElementById('geometry-sketch-output');
  const copyButton = document.getElementById('geometry-sketch-copy');
  const resetButton = document.getElementById('geometry-sketch-reset-edits');
  const walkTest = window.AvendorWalkTest;
  const mapEngine = window.AvendorMapEngine;
  const geometrySketch = window.AvendorGeometrySketch;

  if (!stage || !panel || !tools || !baseCanvas || !walkTest || !mapEngine || !geometrySketch) return;

  const deleteBlockedButton = document.getElementById('geometry-sketch-delete-blocked');
  const deleteOcclusionButton = document.createElement('button');
  deleteOcclusionButton.type = 'button';
  deleteOcclusionButton.id = 'geometry-sketch-delete-occlusion';
  deleteOcclusionButton.setAttribute('aria-pressed', 'false');
  deleteOcclusionButton.textContent = 'Delete occlusion';

  const deleteWalkableButton = document.createElement('button');
  deleteWalkableButton.type = 'button';
  deleteWalkableButton.id = 'geometry-sketch-delete-walkable';
  deleteWalkableButton.setAttribute('aria-pressed', 'false');
  deleteWalkableButton.textContent = 'Delete walk area';

  if (deleteBlockedButton) {
    deleteBlockedButton.insertAdjacentElement('afterend', deleteWalkableButton);
    deleteBlockedButton.insertAdjacentElement('afterend', deleteOcclusionButton);
  } else {
    tools.append(deleteOcclusionButton, deleteWalkableButton);
  }

  const instructions = panel.querySelector('.geometry-sketch-instructions');
  if (instructions) {
    instructions.append(document.createTextNode(
      ' Delete occlusion paints every authored occlusion region opaque black and removes the clicked region. Delete walk area shows authored walk regions in green and removes the clicked region.'
    ));
  }

  const canvas = document.createElement('canvas');
  canvas.id = 'geometry-delete-layer';
  canvas.className = 'geometry-delete-layer';
  canvas.setAttribute('aria-label', 'Map geometry delete surface');
  baseCanvas.insertAdjacentElement('afterend', canvas);
  const ctx = canvas.getContext('2d');

  let mode = null;
  let areaId = null;
  let baseline = null;
  let editableWalkable = [];
  let editableOccluders = [];
  let hoverTarget = null;

  function clone(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function getMap() {
    return walkTest.getMap();
  }

  function resizeCanvas() {
    const map = getMap();
    if (!map) return;
    if (canvas.width !== map.width) canvas.width = map.width;
    if (canvas.height !== map.height) canvas.height = map.height;
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
        && (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || Number.EPSILON) + xi);
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function findRegionAt(regions, point) {
    for (let index = regions.length - 1; index >= 0; index -= 1) {
      if (pointInPolygon(point, regions[index].points || [])) {
        return { index, region: regions[index] };
      }
    }
    return null;
  }

  function paintRegion(region, regionMode, highlighted) {
    if (!region?.points?.length) return;
    ctx.beginPath();
    region.points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();

    if (regionMode === 'occlusion') {
      ctx.fillStyle = '#000';
      ctx.strokeStyle = highlighted ? '#fff' : 'rgba(255, 226, 122, .96)';
      ctx.lineWidth = highlighted ? 6 : 2;
    } else {
      ctx.fillStyle = highlighted ? 'rgba(46, 204, 113, .50)' : 'rgba(46, 204, 113, .30)';
      ctx.strokeStyle = highlighted ? '#fff' : 'rgba(104, 255, 164, .98)';
      ctx.lineWidth = highlighted ? 6 : 3;
    }

    ctx.fill();
    ctx.stroke();

    if (highlighted && region.id) {
      const [x, y] = region.points[0];
      ctx.font = '700 16px ui-monospace, Consolas, monospace';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,.92)';
      ctx.fillStyle = '#fff';
      ctx.strokeText(region.id.slice(0, 52), x + 8, Math.max(20, y - 8));
      ctx.fillText(region.id.slice(0, 52), x + 8, Math.max(20, y - 8));
    }
  }

  function draw() {
    resizeCanvas();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!mode) return;

    const regions = mode === 'occlusion' ? editableOccluders : editableWalkable;
    regions.forEach((region) => paintRegion(
      region,
      mode,
      hoverTarget?.id === region.id && hoverTarget?.index === regions.indexOf(region)
    ));
  }

  function buildOcclusionLayer(map, depthY, definitions, index) {
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const safeAreaId = String(map.data.id || 'map').replace(/[^a-z0-9-]/gi, '-');
    const layer = document.createElementNS(svgNamespace, 'svg');
    const clipId = `${safeAreaId}-occlusion-editor-${index}`;
    layer.classList.add('scene-occluder');
    layer.dataset.occluderDepth = String(depthY);
    layer.dataset.occluderIds = definitions.map((definition) => definition.id).join(',');
    layer.setAttribute('viewBox', `0 0 ${map.width} ${map.height}`);
    layer.setAttribute('preserveAspectRatio', 'none');
    layer.setAttribute('aria-hidden', 'true');
    layer.style.zIndex = String(map.getDepth(depthY));

    const defs = document.createElementNS(svgNamespace, 'defs');
    const clipPath = document.createElementNS(svgNamespace, 'clipPath');
    clipPath.id = clipId;
    clipPath.setAttribute('clipPathUnits', 'userSpaceOnUse');
    definitions.forEach((definition) => {
      const polygon = document.createElementNS(svgNamespace, 'polygon');
      polygon.dataset.occluderId = definition.id;
      polygon.setAttribute('points', definition.points.map((point) => point.join(',')).join(' '));
      clipPath.appendChild(polygon);
    });
    defs.appendChild(clipPath);
    layer.appendChild(defs);

    const image = document.createElementNS(svgNamespace, 'image');
    image.setAttribute('href', map.data.art.background);
    image.setAttribute('x', '0');
    image.setAttribute('y', '0');
    image.setAttribute('width', String(map.width));
    image.setAttribute('height', String(map.height));
    image.setAttribute('preserveAspectRatio', 'none');
    image.setAttribute('clip-path', `url(#${clipId})`);
    layer.appendChild(image);
    return layer;
  }

  function refreshRuntimeOccluders() {
    const map = getMap();
    if (!map || !debugCanvas) return;
    stage.querySelectorAll('.scene-occluder').forEach((element) => element.remove());

    const groups = new Map();
    editableOccluders.forEach((definition) => {
      const group = groups.get(definition.depthY) || [];
      group.push(definition);
      groups.set(definition.depthY, group);
    });

    [...groups.entries()]
      .sort(([leftDepth], [rightDepth]) => leftDepth - rightDepth)
      .forEach(([depthY, definitions], index) => {
        stage.insertBefore(buildOcclusionLayer(map, depthY, definitions, index), debugCanvas);
      });
  }

  function combinedJson() {
    const text = geometrySketch.exportJson?.();
    if (!text) return '';
    try {
      const payload = JSON.parse(text);
      payload.authoredEdits = payload.authoredEdits || {};
      payload.authoredEdits.walkable = clone(editableWalkable);
      payload.authoredEdits.depthOccluders = clone(editableOccluders);
      return JSON.stringify(payload, null, 2);
    } catch (_) {
      return text;
    }
  }

  function refreshOutput() {
    if (!output) return;
    const text = combinedJson();
    if (text) output.value = text;
  }

  function redrawDebug() {
    const map = getMap();
    if (map && debugCanvas) mapEngine.drawDebugMap(debugCanvas, map);
  }

  function applyEdits() {
    const map = getMap();
    if (!map) return;
    map.data.walkable = clone(editableWalkable);
    map.walkable = map.data.walkable;
    map.data.depthOccluders = clone(editableOccluders);
    refreshRuntimeOccluders();
    redrawDebug();
    refreshOutput();
  }

  function captureArea(force = false) {
    const map = getMap();
    if (!map) return;
    const nextAreaId = map.data.id || stage.dataset.areaId || null;
    if (!force && nextAreaId === areaId && baseline) return;

    areaId = nextAreaId;
    baseline = {
      walkable: clone(map.data.walkable || map.walkable || []),
      depthOccluders: clone(map.data.depthOccluders || [])
    };
    editableWalkable = clone(baseline.walkable);
    editableOccluders = clone(baseline.depthOccluders);
    hoverTarget = null;
    draw();
    refreshOutput();
  }

  function clearSelectedGeometryButtons() {
    tools.querySelectorAll('button[aria-pressed]').forEach((button) => {
      if (button === deleteOcclusionButton || button === deleteWalkableButton) return;
      button.classList.remove('selected');
      button.setAttribute('aria-pressed', 'false');
    });
  }

  function updateButtonStates() {
    const occlusionSelected = mode === 'occlusion';
    const walkableSelected = mode === 'walkable';
    deleteOcclusionButton.classList.toggle('selected', occlusionSelected);
    deleteOcclusionButton.setAttribute('aria-pressed', String(occlusionSelected));
    deleteWalkableButton.classList.toggle('selected', walkableSelected);
    deleteWalkableButton.setAttribute('aria-pressed', String(walkableSelected));
  }

  function setMode(nextMode) {
    const validMode = nextMode === 'occlusion' || nextMode === 'walkable' ? nextMode : null;
    if (validMode) {
      captureArea();
      geometrySketch.setKind('walkable');
      clearSelectedGeometryButtons();
    }
    mode = validMode;
    hoverTarget = null;
    canvas.classList.toggle('show', Boolean(mode));
    updateButtonStates();
    draw();

    if (coordsLabel && mode === 'occlusion') {
      coordsLabel.textContent = 'Delete occlusion: click a black region to remove it';
    } else if (coordsLabel && mode === 'walkable') {
      coordsLabel.textContent = 'Delete walk area: click a green region to remove it';
    }
  }

  function deleteAt(point) {
    const regions = mode === 'occlusion' ? editableOccluders : editableWalkable;
    const hit = findRegionAt(regions, point);
    if (!hit) {
      if (coordsLabel) coordsLabel.textContent = mode === 'occlusion'
        ? 'No occlusion region under cursor'
        : 'No walk area under cursor';
      return;
    }

    const removed = regions.splice(hit.index, 1)[0];
    hoverTarget = null;
    applyEdits();
    draw();
    if (coordsLabel) {
      coordsLabel.textContent = `Removed ${mode === 'occlusion' ? 'occlusion' : 'walk area'}: ${removed.id || hit.index + 1}`;
    }
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (!mode || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const point = mapPointFromEvent(event);
    if (point) deleteAt(point);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!mode) return;
    const point = mapPointFromEvent(event);
    if (!point) return;
    const regions = mode === 'occlusion' ? editableOccluders : editableWalkable;
    const hit = findRegionAt(regions, point);
    hoverTarget = hit ? { index: hit.index, id: hit.region.id } : null;
    if (coordsLabel) {
      const targetText = hit?.region?.id ? ` · ${hit.region.id}` : '';
      coordsLabel.textContent = `x ${point.x}, y ${point.y}${targetText}`;
    }
    draw();
  });

  canvas.addEventListener('pointerleave', () => {
    if (!mode) return;
    hoverTarget = null;
    draw();
  });

  deleteOcclusionButton.addEventListener('click', () => {
    setMode(mode === 'occlusion' ? null : 'occlusion');
  });

  deleteWalkableButton.addEventListener('click', () => {
    setMode(mode === 'walkable' ? null : 'walkable');
  });

  tools.addEventListener('click', (event) => {
    if (!mode) return;
    if (event.target === deleteOcclusionButton || event.target === deleteWalkableButton) return;
    setMode(null);
  }, true);

  resetButton?.addEventListener('click', () => {
    if (!baseline) return;
    editableWalkable = clone(baseline.walkable);
    editableOccluders = clone(baseline.depthOccluders);
    hoverTarget = null;
    applyEdits();
    draw();
    if (coordsLabel) coordsLabel.textContent = 'Existing map edits reset, including walk and occlusion regions';
  });

  copyButton?.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const text = combinedJson();
    if (!text) return;
    if (output) output.value = text;
    try {
      await navigator.clipboard.writeText(text);
      if (coordsLabel) coordsLabel.textContent = 'JSON copied, including walk and occlusion edits';
    } catch (_) {
      if (output) {
        output.focus();
        output.select();
        document.execCommand('copy');
        stage.focus({ preventScroll: true });
      }
      if (coordsLabel) coordsLabel.textContent = 'JSON selected/copied';
    }
  }, true);

  new MutationObserver(() => {
    const nextAreaId = getMap()?.data?.id || stage.dataset.areaId || null;
    if (nextAreaId !== areaId) captureArea(true);
    if (!stage.classList.contains('geometry-sketch-active') && mode) setMode(null);
  }).observe(stage, {
    attributes: true,
    attributeFilter: ['data-area-id', 'class']
  });

  captureArea(true);

  window.AvendorGeometryDeleteTools = Object.freeze({
    setMode,
    reset: () => {
      if (!baseline) return;
      editableWalkable = clone(baseline.walkable);
      editableOccluders = clone(baseline.depthOccluders);
      applyEdits();
      draw();
    },
    getEdits: () => ({
      walkable: clone(editableWalkable),
      depthOccluders: clone(editableOccluders)
    })
  });
})();
