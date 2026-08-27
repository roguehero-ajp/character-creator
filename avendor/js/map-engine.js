(() => {
  'use strict';

  const SAMPLE_DIRECTIONS = Object.freeze([
    [0, 0],
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [Math.SQRT1_2, Math.SQRT1_2],
    [-Math.SQRT1_2, Math.SQRT1_2],
    [Math.SQRT1_2, -Math.SQRT1_2],
    [-Math.SQRT1_2, -Math.SQRT1_2]
  ]);

  function pointInPolygon(point, polygon) {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      const crosses = ((yi > y) !== (yj > y))
        && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi);
      if (crosses) inside = !inside;
    }

    return inside;
  }

  function pointInAnyPolygon(point, regions) {
    return regions.some((region) => pointInPolygon(point, region.points));
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function interpolateStops(value, stops, valueKey) {
    if (!stops.length) return 1;
    if (value <= stops[0].y) return stops[0][valueKey];

    for (let i = 1; i < stops.length; i += 1) {
      const previous = stops[i - 1];
      const next = stops[i];
      if (value <= next.y) {
        const span = next.y - previous.y || 1;
        const t = (value - previous.y) / span;
        return previous[valueKey] + ((next[valueKey] - previous[valueKey]) * t);
      }
    }

    return stops[stops.length - 1][valueKey];
  }

  function geometrySidecarUrl(url) {
    const match = String(url).match(/^(.*)\.json(\?.*)?$/i);
    return match ? `${match[1]}-geometry.json${match[2] || ''}` : null;
  }

  function applyGeometryOverrides(data, geometry, source = null) {
    if (geometry.areaId !== data.id) {
      throw new Error(`Geometry sidecar area mismatch: ${geometry.areaId || '(missing)'} != ${data.id}`);
    }
    if (!Array.isArray(geometry.walkable) || !Array.isArray(geometry.collisions)) {
      throw new TypeError('Geometry sidecar is incomplete.');
    }

    let depthOccluders = data.depthOccluders || [];
    const depthOverrides = geometry.depthOccluderOverrides || [];
    if (!Array.isArray(depthOverrides)) {
      throw new TypeError('Geometry depthOccluderOverrides must be an array when provided.');
    }

    if (depthOverrides.length) {
      const overridesById = new Map(depthOverrides.map((override) => [override.id, override]));
      const knownIds = new Set(depthOccluders.map((region) => region.id));
      overridesById.forEach((override, id) => {
        if (!knownIds.has(id)) throw new Error(`Unknown depth occluder override: ${id}`);
        if (!Array.isArray(override.points) || override.points.length < 3) {
          throw new TypeError(`Depth occluder override has no usable polygon: ${id}`);
        }
      });
      depthOccluders = depthOccluders.map((region) => (
        overridesById.has(region.id) ? { ...region, ...overridesById.get(region.id) } : region
      ));
    }

    return {
      ...data,
      walkable: geometry.walkable,
      collisions: geometry.collisions,
      depthOccluders,
      geometry: {
        source,
        version: geometry.version || null,
        model: geometry.model || null
      }
    };
  }

  async function applyGeometrySidecar(url, data) {
    const sidecarUrl = geometrySidecarUrl(url);
    if (!sidecarUrl) return data;

    let response;
    try {
      response = await fetch(sidecarUrl, { cache: 'no-store' });
    } catch (_) {
      return data;
    }

    if (response.status === 404) return data;
    if (!response.ok) {
      throw new Error(`Could not load map geometry (${response.status}): ${sidecarUrl}`);
    }

    return applyGeometryOverrides(data, await response.json(), sidecarUrl);
  }

  class MapGeometry {
    constructor(data) {
      if (!data?.referenceSize?.width || !data?.referenceSize?.height) {
        throw new TypeError('MapGeometry requires referenceSize width and height.');
      }

      this.data = data;
      this.width = data.referenceSize.width;
      this.height = data.referenceSize.height;
      this.walkable = data.walkable || [];
      this.collisions = data.collisions || [];
      this.exits = data.exits || [];
      this.portals = data.portals || [];
      this.interactables = data.interactables || [];
      this.npcs = data.npcs || [];
      this.footRadius = data.movement?.footRadius || 0;
      this.maxStep = data.movement?.maxStep || 6;
    }

    static async load(url) {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Could not load map data (${response.status}): ${url}`);
      }
      const data = await applyGeometrySidecar(url, await response.json());
      return new MapGeometry(data);
    }

    getSpawn(id = 'default') {
      return this.data.spawnPoints?.[id] || this.data.spawnPoints?.default;
    }

    getExactSpawn(id) {
      return this.data.spawnPoints?.[id] || null;
    }

    getScale(y) {
      return interpolateStops(y, this.data.perspective?.stops || [], 'scale');
    }

    getDepth(y) {
      return 1000 + Math.round(y);
    }

    isWalkable(x, y, radius = this.footRadius * this.getScale(y)) {
      const points = SAMPLE_DIRECTIONS.map(([dx, dy]) => [
        x + (dx * radius),
        y + (dy * radius)
      ]);

      const clearsNpcFootprints = this.npcs.every((npc) => (
        distance({ x, y }, npc) > radius + (npc.collisionRadius || 0)
      ));

      return clearsNpcFootprints && points.every((point) => (
        point[0] >= 0
        && point[0] <= this.width
        && point[1] >= 0
        && point[1] <= this.height
        && pointInAnyPolygon(point, this.walkable)
        && !pointInAnyPolygon(point, this.collisions)
      ));
    }

    resolveStep(position, dx, dy) {
      const full = { x: position.x + dx, y: position.y + dy };
      if (this.isWalkable(full.x, full.y)) return full;

      const horizontal = { x: position.x + dx, y: position.y };
      if (dx && this.isWalkable(horizontal.x, horizontal.y)) return horizontal;

      const vertical = { x: position.x, y: position.y + dy };
      if (dy && this.isWalkable(vertical.x, vertical.y)) return vertical;

      return { ...position };
    }

    resolveMovement(position, dx, dy) {
      const distanceToTravel = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(distanceToTravel / this.maxStep));
      const stepX = dx / steps;
      const stepY = dy / steps;
      let next = { ...position };

      for (let i = 0; i < steps; i += 1) {
        next = this.resolveStep(next, stepX, stepY);
      }

      return next;
    }

    getTriggerAt(position) {
      const point = [position.x, position.y];
      const portal = this.portals.find((candidate) => pointInPolygon(point, candidate.points));
      if (portal) return { ...portal, type: 'portal' };

      const exit = this.exits.find((candidate) => pointInPolygon(point, candidate.points));
      return exit ? { ...exit, type: 'exit' } : null;
    }

    getNearbyInteractable(position) {
      const features = this.interactables.map((candidate) => ({
        ...candidate,
        type: 'feature'
      }));
      const npcs = this.npcs.map((candidate) => ({
        ...candidate,
        type: 'npc',
        radius: candidate.interactionRadius,
        interactionTarget: {
          x: candidate.interactionX ?? candidate.x,
          y: candidate.interactionY ?? candidate.y
        }
      }));

      return [...features, ...npcs]
        .map((candidate) => ({
          ...candidate,
          distance: distance(position, candidate.interactionTarget || candidate)
        }))
        .filter((candidate) => candidate.distance <= candidate.radius)
        .sort((a, b) => a.distance - b.distance)[0] || null;
    }
  }

  function polygonToCss(points, width, height) {
    return `polygon(${points.map(([x, y]) => (
      `${((x / width) * 100).toFixed(3)}% ${((y / height) * 100).toFixed(3)}%`
    )).join(', ')})`;
  }

  function drawPolygon(ctx, region, fill, stroke) {
    if (!region.points?.length) return;
    ctx.beginPath();
    region.points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();
  }

  function drawDebugMap(canvas, map) {
    const ctx = canvas.getContext('2d');
    canvas.width = map.width;
    canvas.height = map.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    map.walkable.forEach((region) => drawPolygon(
      ctx, region, 'rgba(46, 204, 113, .16)', 'rgba(104, 255, 164, .82)'
    ));
    map.collisions.forEach((region) => drawPolygon(
      ctx, region, 'rgba(231, 76, 60, .22)', 'rgba(255, 108, 94, .9)'
    ));
    map.exits.forEach((region) => drawPolygon(
      ctx, region, 'rgba(52, 152, 219, .30)', 'rgba(105, 205, 255, .95)'
    ));
    map.portals.forEach((region) => drawPolygon(
      ctx, region, 'rgba(155, 89, 182, .34)', 'rgba(230, 142, 255, .95)'
    ));
    ctx.setLineDash([14, 8]);
    (map.data.depthOccluders || []).forEach((region) => drawPolygon(
      ctx, region, 'rgba(255, 244, 194, .06)', 'rgba(255, 226, 122, .78)'
    ));
    ctx.setLineDash([]);

    ctx.font = '700 18px ui-monospace, Consolas, monospace';
    ctx.textBaseline = 'bottom';
    map.npcs.forEach((anchor) => {
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd166';
      ctx.fill();
      ctx.strokeStyle = '#231a08';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#fff0b8';
      ctx.strokeStyle = 'rgba(0,0,0,.88)';
      ctx.lineWidth = 4;
      ctx.strokeText(anchor.id, anchor.x + 13, anchor.y - 8);
      ctx.fillText(anchor.id, anchor.x + 13, anchor.y - 8);
    });
  }

  window.AvendorMapEngine = Object.freeze({
    MapGeometry,
    pointInPolygon,
    pointInAnyPolygon,
    polygonToCss,
    applyGeometryOverrides,
    drawDebugMap
  });
})();
