(() => {
  'use strict';

  const stage = document.getElementById('walk-stage');
  const canvas = document.getElementById('geometry-sketch-layer');
  const toggle = document.getElementById('geometry-sketch-toggle');
  const panel = document.getElementById('geometry-sketch-panel');
  const mapLabel = document.getElementById('geometry-sketch-map');
  const coordsLabel = document.getElementById('geometry-sketch-coords');
  const walkableButton = document.getElementById('geometry-sketch-walkable');
  const blockedButton = document.getElementById('geometry-sketch-blocked');
  const occluderButton = document.getElementById('geometry-sketch-occluder');
  const undoButton = document.getElementById('geometry-sketch-undo');
  const closeButton = document.getElementById('geometry-sketch-close');
  const clearButton = document.getElementById('geometry-sketch-clear');
  const copyButton = document.getElementById('geometry-sketch-copy');
  const output = document.getElementById('geometry-sketch-output');
  const walkTest = window.AvendorWalkTest;

  if (!stage || !canvas || !toggle || !panel || !walkTest) return;

  const ctx = canvas.getContext('2d');
  const blockedKeys = new Set([
    'w', 'a', 's', 'd',
    'arrowup', 'arrowleft', 'arrowdown', 'arrowright',
    'e', ' '
  ]);

  let active = false;
  let kind = 'walkable';
  let areaId = null;
  let shapes = [];
  let currentPoints = [];
  let hoverPoint = null;

  function getMap() {
    return walkTest.getMap();
  }

  function resizeForMap() {
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

  function paletteForKind(polygonKind) {
    if (polygonKind === 'collision') {
      return {
        stroke: 'rgba(255,108,94,.98)',
        fill: 'rgba(231,76,60,.28)'
      };
    }
    if (polygonKind === 'occluder') {
      return {
        stroke: 'rgba(255,226,122,.98)',
        fill: 'rgba(255,210,92,.20)'
      };
    }
    return {
      stroke: 'rgba(104,255,164,.98)',
      fill: 'rgba(46,204,113,.24)'
    };
  }

  function getDepthY(points) {
    return points.reduce((maximum, point) => Math.max(maximum, point.y), 0);
  }

  function paintPolygon(points, polygonKind, isCurrent = false) {
    if (!points.length) return;
    const { stroke, fill } = paletteForKind(polygonKind);

    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    if (!isCurrent && points.length >= 3) ctx.closePath();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = isCurrent ? 4 : 3;
    if (polygonKind === 'occluder') ctx.setLineDash([12, 7]);
    if (!isCurrent && points.length >= 3) ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    points.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, index === 0 ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 ? '#fff3b8' : stroke;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.88)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    if (polygonKind === 'occluder' && points.length >= 3) {
      const depthY = getDepthY(points);
      const depthPoint = points.reduce((best, point) => point.y >= best.y ? point : best, points[0]);
      ctx.beginPath();
      ctx.moveTo(Math.max(0, depthPoint.x - 26), depthY);
      ctx.lineTo(Math.min(canvas.width, depthPoint.x + 26), depthY);
      ctx.strokeStyle = '#fff3b8';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.font = '700 16px ui-monospace, Consolas, monospace';
      ctx.fillStyle = '#fff3b8';
      ctx.fillText(`depth ${depthY}`, Math.min(canvas.width - 100, depthPoint.x + 8), Math.max(18, depthY - 8));
    }
  }

  function draw() {
    resizeForMap();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    shapes.forEach((shape) => paintPolygon(shape.points, shape.kind));

    if (currentPoints.length) {
      const preview = hoverPoint ? [...currentPoints, hoverPoint] : currentPoints;
      paintPolygon(preview, kind, true);
    }
  }

  function serialise() {
    const map = getMap();
    if (!map) return '';
    const withIds = (targetKind, prefix) => shapes
      .filter((shape) => shape.kind === targetKind)
      .map((shape, index) => ({
        id: `${prefix}-sketch-${index + 1}`,
        points: shape.points.map(({ x, y }) => [x, y])
      }));
    const occluders = shapes
      .filter((shape) => shape.kind === 'occluder')
      .map((shape, index) => ({
        id: `occluder-sketch-${index + 1}`,
        depthY: getDepthY(shape.points),
        points: shape.points.map(({ x, y }) => [x, y])
      }));

    return JSON.stringify({
      areaId: map.data.id,
      referenceSize: { width: map.width, height: map.height },
      walkable: withIds('walkable', 'walkable'),
      collisions: withIds('collision', 'collision'),
      depthOccluders: occluders
    }, null, 2);
  }

  function refreshOutput() {
    output.value = serialise();
  }

  function clearSketches() {
    shapes = [];
    currentPoints = [];
    hoverPoint = null;
    refreshOutput();
    draw();
  }

  function syncArea() {
    const map = getMap();
    const nextAreaId = map?.data?.id || stage.dataset.areaId || null;
    if (nextAreaId !== areaId) {
      areaId = nextAreaId;
      clearSketches();
    }
    mapLabel.textContent = nextAreaId || 'No map loaded';
    resizeForMap();
    draw();
  }

  function setKind(nextKind) {
    if (nextKind === 'collision' || nextKind === 'occluder') kind = nextKind;
    else kind = 'walkable';
    walkableButton.classList.toggle('selected', kind === 'walkable');
    blockedButton.classList.toggle('selected', kind === 'collision');
    occluderButton?.classList.toggle('selected', kind === 'occluder');
    walkableButton.setAttribute('aria-pressed', String(kind === 'walkable'));
    blockedButton.setAttribute('aria-pressed', String(kind === 'collision'));
    occluderButton?.setAttribute('aria-pressed', String(kind === 'occluder'));
    draw();
  }

  function closeShape() {
    if (currentPoints.length < 3) {
      coordsLabel.textContent = 'Need at least 3 points';
      return;
    }
    const stored = {
      kind,
      points: currentPoints.map((point) => ({ ...point }))
    };
    shapes.push(stored);
    currentPoints = [];
    hoverPoint = null;
    refreshOutput();
    draw();
    const depthNote = stored.kind === 'occluder' ? ` · depth ${getDepthY(stored.points)}` : '';
    coordsLabel.textContent = `${shapes.length} shape${shapes.length === 1 ? '' : 's'} stored${depthNote}`;
  }

  function undoPoint() {
    if (currentPoints.length) {
      currentPoints.pop();
    } else if (shapes.length) {
      const previous = shapes.pop();
      kind = previous.kind;
      currentPoints = previous.points.map((point) => ({ ...point }));
      setKind(kind);
    }
    refreshOutput();
    draw();
  }

  async function copyJson() {
    const text = serialise();
    if (!text) return;
    output.value = text;
    try {
      await navigator.clipboard.writeText(text);
      coordsLabel.textContent = 'JSON copied';
    } catch (_) {
      output.focus();
      output.select();
      document.execCommand('copy');
      stage.focus({ preventScroll: true });
      coordsLabel.textContent = 'JSON selected/copied';
    }
  }

  function setActive(nextActive) {
    active = Boolean(nextActive);
    if (active) {
      window.dispatchEvent(new Event('blur'));
      walkTest.setDebug(true);
      syncArea();
      panel.hidden = false;
      canvas.classList.add('show');
      stage.classList.add('geometry-sketch-active');
      toggle.classList.add('selected');
      toggle.setAttribute('aria-pressed', 'true');
      toggle.textContent = 'Geometry sketch: on';
      coordsLabel.textContent = 'Click to add vertices';
    } else {
      panel.hidden = true;
      canvas.classList.remove('show');
      stage.classList.remove('geometry-sketch-active');
      toggle.classList.remove('selected');
      toggle.setAttribute('aria-pressed', 'false');
      toggle.textContent = 'Geometry sketch: off';
      hoverPoint = null;
      draw();
      stage.focus({ preventScroll: true });
    }
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (!active || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const point = mapPointFromEvent(event);
    if (!point) return;
    currentPoints.push(point);
    hoverPoint = point;
    coordsLabel.textContent = `x ${point.x}, y ${point.y} · ${currentPoints.length} point${currentPoints.length === 1 ? '' : 's'}`;
    draw();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!active) return;
    hoverPoint = mapPointFromEvent(event);
    if (hoverPoint) coordsLabel.textContent = `x ${hoverPoint.x}, y ${hoverPoint.y}`;
    draw();
  });

  canvas.addEventListener('pointerleave', () => {
    if (!active) return;
    hoverPoint = null;
    draw();
  });

  canvas.addEventListener('contextmenu', (event) => {
    if (!active) return;
    event.preventDefault();
    undoPoint();
  });

  window.addEventListener('keydown', (event) => {
    if (!active) return;
    const key = event.key.toLowerCase();

    if (blockedKeys.has(key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (key === '1') {
      event.preventDefault();
      setKind('walkable');
    } else if (key === '2') {
      event.preventDefault();
      setKind('collision');
    } else if (key === '3') {
      event.preventDefault();
      setKind('occluder');
    } else if (key === 'enter') {
      event.preventDefault();
      closeShape();
    } else if (key === 'backspace') {
      event.preventDefault();
      undoPoint();
    } else if (key === 'escape') {
      event.preventDefault();
      setActive(false);
    }
  }, true);

  toggle.addEventListener('click', () => setActive(!active));
  walkableButton.addEventListener('click', () => setKind('walkable'));
  blockedButton.addEventListener('click', () => setKind('collision'));
  occluderButton?.addEventListener('click', () => setKind('occluder'));
  undoButton.addEventListener('click', undoPoint);
  closeButton.addEventListener('click', closeShape);
  clearButton.addEventListener('click', clearSketches);
  copyButton.addEventListener('click', copyJson);

  new MutationObserver(syncArea).observe(stage, {
    attributes: true,
    attributeFilter: ['data-area-id']
  });

  syncArea();
  refreshOutput();

  window.AvendorGeometrySketch = Object.freeze({
    setActive,
    clear: clearSketches,
    closeShape,
    setKind,
    exportJson: serialise,
    getShapes: () => shapes.map((shape) => ({
      kind: shape.kind,
      points: shape.points.map((point) => ({ ...point }))
    }))
  });
})();
