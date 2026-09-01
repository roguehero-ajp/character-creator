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
  const animationButton = document.getElementById('geometry-sketch-animation');
  const deleteBlockedButton = document.getElementById('geometry-sketch-delete-blocked');
  const moveExitButton = document.getElementById('geometry-sketch-move-exit');
  const moveSpawnButton = document.getElementById('geometry-sketch-move-spawn');
  const resetEditsButton = document.getElementById('geometry-sketch-reset-edits');
  const animationLabelWrap = document.getElementById('geometry-sketch-animation-label-wrap');
  const animationLabelInput = document.getElementById('geometry-sketch-animation-label');
  const undoButton = document.getElementById('geometry-sketch-undo');
  const closeButton = document.getElementById('geometry-sketch-close');
  const clearButton = document.getElementById('geometry-sketch-clear');
  const copyButton = document.getElementById('geometry-sketch-copy');
  const output = document.getElementById('geometry-sketch-output');
  const walkTest = window.AvendorWalkTest;
  const mapEngine = window.AvendorMapEngine;

  if (!stage || !canvas || !toggle || !panel || !walkTest) return;

  const ctx = canvas.getContext('2d');
  const blockedKeys = new Set([
    'w', 'a', 's', 'd',
    'arrowup', 'arrowleft', 'arrowdown', 'arrowright',
    'e', ' '
  ]);
  const drawKinds = new Set(['walkable', 'collision', 'occluder', 'animation']);
  const editKinds = new Set(['delete-collision', 'move-exit', 'move-spawn']);

  let active = false;
  let kind = 'walkable';
  let areaId = null;
  let shapes = [];
  let currentPoints = [];
  let hoverPoint = null;
  let authoredBaseline = null;
  let editableCollisions = [];
  let editableExits = [];
  let editableSpawnPoints = {};
  let dragState = null;
  let hoverTarget = null;

  function getMap() {
    return walkTest.getMap();
  }

  function clone(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
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

  function paletteForKind(polygonKind) {
    if (polygonKind === 'collision') {
      return { stroke: 'rgba(255,108,94,.98)', fill: 'rgba(231,76,60,.28)' };
    }
    if (polygonKind === 'exit') {
      return { stroke: 'rgba(105,205,255,.98)', fill: 'rgba(52,152,219,.30)' };
    }
    if (polygonKind === 'occluder') {
      return { stroke: 'rgba(255,226,122,.98)', fill: 'rgba(255,210,92,.20)' };
    }
    if (polygonKind === 'animation') {
      return { stroke: 'rgba(91,228,255,.98)', fill: 'rgba(55,196,225,.20)' };
    }
    return { stroke: 'rgba(104,255,164,.98)', fill: 'rgba(46,204,113,.24)' };
  }

  function getDepthY(points) {
    return points.reduce((maximum, point) => Math.max(maximum, point.y), 0);
  }

  function getBounds(points) {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
      center: [Math.round((left + right) / 2), Math.round((top + bottom) / 2)]
    };
  }

  function paintPolygon(points, polygonKind, isCurrent = false, label = '', options = {}) {
    if (!points.length) return;
    const { stroke, fill } = paletteForKind(polygonKind);
    const highlighted = options.highlighted === true;

    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    if (!isCurrent && points.length >= 3) ctx.closePath();
    ctx.fillStyle = highlighted ? fill.replace(/\.[0-9]+\)$/, '.48)') : fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = highlighted ? 6 : (isCurrent ? 4 : 3);
    if (polygonKind === 'occluder') ctx.setLineDash([12, 7]);
    if (polygonKind === 'animation') ctx.setLineDash([8, 5]);
    if (!isCurrent && points.length >= 3) ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    if (!options.hideVertices) {
      points.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, index === 0 ? 6 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = index === 0 ? '#fff3b8' : stroke;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.88)';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    if (label && points.length >= 3) {
      const objectPoints = points.map((point) => ({ x: point.x, y: point.y }));
      const bounds = getBounds(objectPoints);
      ctx.font = '700 16px ui-monospace, Consolas, monospace';
      ctx.fillStyle = options.labelColor || stroke;
      ctx.strokeStyle = 'rgba(0,0,0,.88)';
      ctx.lineWidth = 4;
      const x = Math.max(6, Math.min(canvas.width - 210, bounds.center[0] + 8));
      const y = Math.max(18, bounds.center[1] - 8);
      ctx.strokeText(label.slice(0, 48), x, y);
      ctx.fillText(label.slice(0, 48), x, y);
    }

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

    if (polygonKind === 'animation' && points.length >= 3) {
      const bounds = getBounds(points);
      const displayLabel = (label || 'animation').slice(0, 48);
      ctx.font = '700 16px ui-monospace, Consolas, monospace';
      ctx.fillStyle = '#c8f8ff';
      ctx.fillText(
        displayLabel,
        Math.max(6, Math.min(canvas.width - 180, bounds.center[0] + 8)),
        Math.max(18, bounds.center[1] - 8)
      );
      ctx.beginPath();
      ctx.arc(bounds.center[0], bounds.center[1], 6, 0, Math.PI * 2);
      ctx.fillStyle = '#5be4ff';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.88)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawSpawnMarker(names, spawn, highlighted = false) {
    const label = names.join(' + ');
    ctx.beginPath();
    ctx.arc(spawn.x, spawn.y, highlighted ? 13 : 10, 0, Math.PI * 2);
    ctx.fillStyle = highlighted ? '#fff3b8' : '#e8b9ff';
    ctx.fill();
    ctx.strokeStyle = '#8d48ad';
    ctx.lineWidth = highlighted ? 5 : 3;
    ctx.stroke();
    ctx.font = '700 15px ui-monospace, Consolas, monospace';
    ctx.fillStyle = '#f3d4ff';
    ctx.strokeStyle = 'rgba(0,0,0,.9)';
    ctx.lineWidth = 4;
    ctx.strokeText(label.slice(0, 48), spawn.x + 14, Math.max(18, spawn.y - 10));
    ctx.fillText(label.slice(0, 48), spawn.x + 14, Math.max(18, spawn.y - 10));
  }

  function groupedSpawns() {
    const groups = [];
    Object.entries(editableSpawnPoints).forEach(([name, spawn]) => {
      if (!Number.isFinite(spawn?.x) || !Number.isFinite(spawn?.y)) return;
      const existing = groups.find((group) => Math.hypot(group.spawn.x - spawn.x, group.spawn.y - spawn.y) <= 2);
      if (existing) existing.names.push(name);
      else groups.push({ names: [name], spawn });
    });
    return groups;
  }

  function drawEditorOverlays() {
    if (kind === 'delete-collision') {
      editableCollisions.forEach((region) => {
        paintPolygon(
          region.points.map(([x, y]) => ({ x, y })),
          'collision',
          false,
          region.id || 'blocked',
          { hideVertices: true, highlighted: hoverTarget?.type === 'collision' && hoverTarget.id === region.id }
        );
      });
    } else if (kind === 'move-exit') {
      editableExits.forEach((region) => {
        paintPolygon(
          region.points.map(([x, y]) => ({ x, y })),
          'exit',
          false,
          region.label || region.id || 'exit',
          { hideVertices: true, highlighted: hoverTarget?.type === 'exit' && hoverTarget.id === region.id, labelColor: '#bdeaff' }
        );
      });
    } else if (kind === 'move-spawn') {
      groupedSpawns().forEach((group) => {
        const key = group.names.join('|');
        drawSpawnMarker(group.names, group.spawn, hoverTarget?.type === 'spawn' && hoverTarget.id === key);
      });
    }
  }

  function draw() {
    resizeForMap();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    shapes.forEach((shape) => paintPolygon(shape.points, shape.kind, false, shape.label || ''));
    drawEditorOverlays();

    if (drawKinds.has(kind) && currentPoints.length) {
      const preview = hoverPoint ? [...currentPoints, hoverPoint] : currentPoints;
      const previewLabel = kind === 'animation' ? animationLabelInput?.value.trim() || 'animation' : '';
      paintPolygon(preview, kind, true, previewLabel);
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
    const animationZones = shapes
      .filter((shape) => shape.kind === 'animation')
      .map((shape, index) => {
        const bounds = getBounds(shape.points);
        return {
          id: `animation-sketch-${index + 1}`,
          label: shape.label || 'animation',
          bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
          center: bounds.center,
          points: shape.points.map(({ x, y }) => [x, y])
        };
      });

    return JSON.stringify({
      areaId: map.data.id,
      referenceSize: { width: map.width, height: map.height },
      walkable: withIds('walkable', 'walkable'),
      collisions: withIds('collision', 'collision'),
      depthOccluders: occluders,
      animationZones,
      authoredEdits: {
        collisions: clone(editableCollisions),
        exits: clone(editableExits),
        spawnPoints: clone(editableSpawnPoints)
      }
    }, null, 2);
  }

  function refreshOutput() {
    if (output) output.value = serialise();
  }

  function redrawAuthoredDebug() {
    const map = getMap();
    const debugCanvas = document.getElementById('map-debug-layer');
    if (map && debugCanvas && mapEngine?.drawDebugMap) mapEngine.drawDebugMap(debugCanvas, map);
  }

  function applyAuthoredEdits() {
    const map = getMap();
    if (!map) return;
    map.data.collisions = clone(editableCollisions);
    map.collisions = map.data.collisions;
    map.data.exits = clone(editableExits);
    map.exits = map.data.exits;
    map.data.spawnPoints = clone(editableSpawnPoints);
    redrawAuthoredDebug();
    refreshOutput();
  }

  function captureAuthoredGeometry() {
    const map = getMap();
    if (!map) return;
    authoredBaseline = {
      collisions: clone(map.data.collisions || []),
      exits: clone(map.data.exits || []),
      spawnPoints: clone(map.data.spawnPoints || {})
    };
    editableCollisions = clone(authoredBaseline.collisions);
    editableExits = clone(authoredBaseline.exits);
    editableSpawnPoints = clone(authoredBaseline.spawnPoints);
  }

  function resetAuthoredEdits() {
    if (!authoredBaseline) return;
    editableCollisions = clone(authoredBaseline.collisions);
    editableExits = clone(authoredBaseline.exits);
    editableSpawnPoints = clone(authoredBaseline.spawnPoints);
    dragState = null;
    hoverTarget = null;
    applyAuthoredEdits();
    draw();
    coordsLabel.textContent = 'Existing map edits reset';
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
      shapes = [];
      currentPoints = [];
      hoverPoint = null;
      hoverTarget = null;
      dragState = null;
      authoredBaseline = null;
      captureAuthoredGeometry();
      refreshOutput();
    } else if (map && !authoredBaseline) {
      captureAuthoredGeometry();
      refreshOutput();
    }
    mapLabel.textContent = nextAreaId || 'No map loaded';
    resizeForMap();
    draw();
  }

  function updateButtonStates() {
    const stateMap = new Map([
      [walkableButton, 'walkable'],
      [blockedButton, 'collision'],
      [occluderButton, 'occluder'],
      [animationButton, 'animation'],
      [deleteBlockedButton, 'delete-collision'],
      [moveExitButton, 'move-exit'],
      [moveSpawnButton, 'move-spawn']
    ]);
    stateMap.forEach((buttonKind, button) => {
      if (!button) return;
      const selected = kind === buttonKind;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    if (animationLabelWrap) animationLabelWrap.hidden = kind !== 'animation';
    canvas.style.cursor = kind === 'delete-collision' ? 'not-allowed' : (editKinds.has(kind) ? 'move' : 'crosshair');
  }

  function setKind(nextKind) {
    kind = drawKinds.has(nextKind) || editKinds.has(nextKind) ? nextKind : 'walkable';
    if (editKinds.has(kind)) {
      currentPoints = [];
      hoverPoint = null;
    }
    dragState = null;
    hoverTarget = null;
    updateButtonStates();
    draw();
  }

  function closeShape() {
    if (!drawKinds.has(kind)) {
      coordsLabel.textContent = 'Close shape only applies to drawing tools';
      return;
    }
    if (currentPoints.length < 3) {
      coordsLabel.textContent = 'Need at least 3 points';
      return;
    }
    const stored = { kind, points: currentPoints.map((point) => ({ ...point })) };
    if (kind === 'animation') stored.label = animationLabelInput?.value.trim() || 'animation';
    shapes.push(stored);
    currentPoints = [];
    hoverPoint = null;
    refreshOutput();
    draw();
    const depthNote = stored.kind === 'occluder' ? ` · depth ${getDepthY(stored.points)}` : '';
    const animationNote = stored.kind === 'animation' ? ` · ${stored.label}` : '';
    coordsLabel.textContent = `${shapes.length} shape${shapes.length === 1 ? '' : 's'} stored${depthNote}${animationNote}`;
  }

  function undoPoint() {
    if (!drawKinds.has(kind)) {
      coordsLabel.textContent = 'Use Reset map edits to undo editor changes';
      return;
    }
    if (currentPoints.length) {
      currentPoints.pop();
    } else if (shapes.length) {
      const previous = shapes.pop();
      kind = previous.kind;
      currentPoints = previous.points.map((point) => ({ ...point }));
      if (previous.kind === 'animation' && animationLabelInput) animationLabelInput.value = previous.label || '';
      updateButtonStates();
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
      coordsLabel.textContent = 'JSON copied, including authored map edits';
    } catch (_) {
      output.focus();
      output.select();
      document.execCommand('copy');
      stage.focus({ preventScroll: true });
      coordsLabel.textContent = 'JSON selected/copied';
    }
  }

  function findCollisionAt(point) {
    for (let index = editableCollisions.length - 1; index >= 0; index -= 1) {
      if (pointInPolygon(point, editableCollisions[index].points)) return { index, region: editableCollisions[index] };
    }
    return null;
  }

  function findExitAt(point) {
    for (let index = editableExits.length - 1; index >= 0; index -= 1) {
      if (pointInPolygon(point, editableExits[index].points)) return { index, region: editableExits[index] };
    }
    return null;
  }

  function findSpawnAt(point) {
    const groups = groupedSpawns();
    return groups
      .map((group) => ({ ...group, distance: Math.hypot(point.x - group.spawn.x, point.y - group.spawn.y) }))
      .filter((group) => group.distance <= 32)
      .sort((a, b) => a.distance - b.distance)[0] || null;
  }

  function clampExitPoints(points, dx, dy) {
    const map = getMap();
    if (!map) return points;
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const safeDx = Math.max(-minX, Math.min(map.width - maxX, dx));
    const safeDy = Math.max(-minY, Math.min(map.height - maxY, dy));
    return points.map(([x, y]) => [Math.round(x + safeDx), Math.round(y + safeDy)]);
  }

  function beginEditorAction(point, event) {
    if (kind === 'delete-collision') {
      const hit = findCollisionAt(point);
      if (!hit) {
        coordsLabel.textContent = 'No blocked region under cursor';
        return;
      }
      const removed = editableCollisions.splice(hit.index, 1)[0];
      applyAuthoredEdits();
      draw();
      coordsLabel.textContent = `Removed blocked region: ${removed.id || hit.index + 1}`;
      return;
    }

    if (kind === 'move-exit') {
      const hit = findExitAt(point);
      if (!hit) {
        coordsLabel.textContent = 'No exit trigger under cursor';
        return;
      }
      dragState = {
        type: 'exit',
        index: hit.index,
        id: hit.region.id,
        start: point,
        originalPoints: clone(hit.region.points)
      };
      canvas.setPointerCapture?.(event.pointerId);
      coordsLabel.textContent = `Moving exit: ${hit.region.label || hit.region.id}`;
      return;
    }

    if (kind === 'move-spawn') {
      const hit = findSpawnAt(point);
      if (!hit) {
        coordsLabel.textContent = 'No spawn marker under cursor';
        return;
      }
      dragState = {
        type: 'spawn',
        names: [...hit.names],
        id: hit.names.join('|'),
        start: point,
        originals: Object.fromEntries(hit.names.map((name) => [name, clone(editableSpawnPoints[name])]))
      };
      canvas.setPointerCapture?.(event.pointerId);
      coordsLabel.textContent = `Moving spawn: ${hit.names.join(' + ')}`;
    }
  }

  function updateEditorDrag(point) {
    const map = getMap();
    if (!dragState || !map) return;
    const dx = point.x - dragState.start.x;
    const dy = point.y - dragState.start.y;

    if (dragState.type === 'exit') {
      editableExits[dragState.index].points = clampExitPoints(dragState.originalPoints, dx, dy);
      applyAuthoredEdits();
      coordsLabel.textContent = `Exit ${dragState.id || ''} · Δx ${dx}, Δy ${dy}`;
    } else if (dragState.type === 'spawn') {
      dragState.names.forEach((name) => {
        const original = dragState.originals[name];
        editableSpawnPoints[name] = {
          ...original,
          x: Math.max(0, Math.min(map.width, Math.round(original.x + dx))),
          y: Math.max(0, Math.min(map.height, Math.round(original.y + dy)))
        };
      });
      applyAuthoredEdits();
      coordsLabel.textContent = `Spawn ${dragState.names.join(' + ')} · x ${editableSpawnPoints[dragState.names[0]].x}, y ${editableSpawnPoints[dragState.names[0]].y}`;
    }
    draw();
  }

  function updateHoverTarget(point) {
    if (kind === 'delete-collision') {
      const hit = findCollisionAt(point);
      hoverTarget = hit ? { type: 'collision', id: hit.region.id } : null;
    } else if (kind === 'move-exit') {
      const hit = findExitAt(point);
      hoverTarget = hit ? { type: 'exit', id: hit.region.id } : null;
    } else if (kind === 'move-spawn') {
      const hit = findSpawnAt(point);
      hoverTarget = hit ? { type: 'spawn', id: hit.names.join('|') } : null;
    } else {
      hoverTarget = null;
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
      coordsLabel.textContent = 'Click to add vertices or choose an edit tool';
    } else {
      panel.hidden = true;
      canvas.classList.remove('show');
      stage.classList.remove('geometry-sketch-active');
      toggle.classList.remove('selected');
      toggle.setAttribute('aria-pressed', 'false');
      toggle.textContent = 'Geometry sketch: off';
      hoverPoint = null;
      hoverTarget = null;
      dragState = null;
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

    if (editKinds.has(kind)) {
      beginEditorAction(point, event);
      draw();
      return;
    }

    currentPoints.push(point);
    hoverPoint = point;
    coordsLabel.textContent = `x ${point.x}, y ${point.y} · ${currentPoints.length} point${currentPoints.length === 1 ? '' : 's'}`;
    draw();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!active) return;
    const point = mapPointFromEvent(event);
    if (!point) return;

    if (dragState) {
      updateEditorDrag(point);
      return;
    }

    if (editKinds.has(kind)) {
      updateHoverTarget(point);
      coordsLabel.textContent = `x ${point.x}, y ${point.y}`;
      draw();
      return;
    }

    hoverPoint = point;
    coordsLabel.textContent = `x ${hoverPoint.x}, y ${hoverPoint.y}`;
    draw();
  });

  function endPointerDrag(event) {
    if (!dragState) return;
    dragState = null;
    if (event?.pointerId != null && canvas.hasPointerCapture?.(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    refreshOutput();
    draw();
  }

  canvas.addEventListener('pointerup', endPointerDrag);
  canvas.addEventListener('pointercancel', endPointerDrag);

  canvas.addEventListener('pointerleave', () => {
    if (!active || dragState) return;
    hoverPoint = null;
    hoverTarget = null;
    draw();
  });

  canvas.addEventListener('contextmenu', (event) => {
    if (!active) return;
    event.preventDefault();
    if (drawKinds.has(kind)) undoPoint();
  });

  animationLabelInput?.addEventListener('input', draw);

  window.addEventListener('keydown', (event) => {
    if (!active) return;
    const key = event.key.toLowerCase();

    if (event.target === animationLabelInput) {
      if (key === 'escape') {
        event.preventDefault();
        setActive(false);
      }
      return;
    }

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
    } else if (key === '4') {
      event.preventDefault();
      setKind('animation');
    } else if (key === '5') {
      event.preventDefault();
      setKind('delete-collision');
    } else if (key === '6') {
      event.preventDefault();
      setKind('move-exit');
    } else if (key === '7') {
      event.preventDefault();
      setKind('move-spawn');
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
  animationButton?.addEventListener('click', () => setKind('animation'));
  deleteBlockedButton?.addEventListener('click', () => setKind('delete-collision'));
  moveExitButton?.addEventListener('click', () => setKind('move-exit'));
  moveSpawnButton?.addEventListener('click', () => setKind('move-spawn'));
  resetEditsButton?.addEventListener('click', resetAuthoredEdits);
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
  updateButtonStates();

  window.AvendorGeometrySketch = Object.freeze({
    setActive,
    clear: clearSketches,
    closeShape,
    setKind,
    resetAuthoredEdits,
    exportJson: serialise,
    getShapes: () => shapes.map((shape) => ({
      kind: shape.kind,
      label: shape.label || null,
      points: shape.points.map((point) => ({ ...point }))
    })),
    getAuthoredEdits: () => ({
      collisions: clone(editableCollisions),
      exits: clone(editableExits),
      spawnPoints: clone(editableSpawnPoints)
    })
  });
})();
