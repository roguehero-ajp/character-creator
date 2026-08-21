(() => {
  'use strict';

  const AREA_STATUSES = Object.freeze(['playable', 'planned']);
  const TRANSITION_STATUSES = Object.freeze(['active', 'planned', 'unassigned']);
  const AREA_KINDS = Object.freeze(['outdoor', 'interior']);
  const OUTDOOR_DIRECTIONS = Object.freeze([
    'north', 'northeast', 'east', 'southeast',
    'south', 'southwest', 'west', 'northwest'
  ]);
  const STABLE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function isStableId(value) {
    return isNonEmptyString(value) && STABLE_ID_PATTERN.test(value);
  }

  function requireValue(condition, message) {
    if (!condition) throw new TypeError(message);
  }

  function asMap(mapsByArea) {
    if (mapsByArea && typeof mapsByArea.get === 'function') return mapsByArea;
    return new Map(Object.entries(mapsByArea || {}));
  }

  class AreaRegistry {
    constructor(data) {
      requireValue(data && typeof data === 'object', 'AreaRegistry requires registry data.');
      requireValue(data.schemaVersion === 1, 'AreaRegistry only supports schemaVersion 1.');
      requireValue(isStableId(data.id), 'AreaRegistry requires a stable kebab-case id.');
      requireValue(isNonEmptyString(data.title), 'AreaRegistry requires a title.');
      requireValue(isNonEmptyString(data.version), 'AreaRegistry requires a version.');
      requireValue(Array.isArray(data.areas) && data.areas.length > 0, 'AreaRegistry requires at least one area.');

      this.data = data;
      this.areas = data.areas;
      this.areaById = new Map();
      this.areaByNumber = new Map();

      this.areas.forEach((area) => {
        requireValue(isStableId(area.id), 'Every registered area requires a stable kebab-case id.');
        requireValue(!this.areaById.has(area.id), `Duplicate area id: ${area.id}`);
        requireValue(isNonEmptyString(area.title), `Area ${area.id} requires a title.`);
        requireValue(AREA_KINDS.includes(area.kind), `Area ${area.id} has an unsupported kind.`);
        requireValue(AREA_STATUSES.includes(area.status), `Area ${area.id} has an unsupported status.`);

        if (area.areaNumber !== null && area.areaNumber !== undefined) {
          requireValue(
            Number.isInteger(area.areaNumber) && area.areaNumber > 0,
            `Area ${area.id} has an invalid areaNumber.`
          );
          requireValue(
            !this.areaByNumber.has(area.areaNumber),
            `Duplicate areaNumber: ${area.areaNumber}`
          );
          this.areaByNumber.set(area.areaNumber, area);
        }

        if (area.status === 'playable') {
          requireValue(isNonEmptyString(area.map), `Playable area ${area.id} requires a map path.`);
        } else {
          requireValue(
            area.map === null || area.map === undefined,
            `Non-playable area ${area.id} cannot provide a map path.`
          );
        }

        this.areaById.set(area.id, area);
      });

      requireValue(data.start && typeof data.start === 'object', 'AreaRegistry requires a start entry.');
      const startArea = this.areaById.get(data.start.areaId);
      requireValue(startArea, `Start area is not registered: ${data.start.areaId}`);
      requireValue(startArea.status === 'playable', 'The start area must be playable.');
      requireValue(isNonEmptyString(data.start.spawnId), 'The start entry requires a spawnId.');
    }

    static async load(url) {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Could not load the area registry (${response.status}): ${url}`);
      }
      return new AreaRegistry(await response.json());
    }

    getArea(id) {
      return this.areaById.get(id) || null;
    }

    getAreaByNumber(areaNumber) {
      return this.areaByNumber.get(areaNumber) || null;
    }

    getStart() {
      return {
        ...this.data.start,
        area: this.getArea(this.data.start.areaId)
      };
    }

    resolveTransition(trigger) {
      if (trigger?.status === 'unassigned') {
        if (trigger.target?.areaId) {
          return {
            state: 'invalid',
            reason: 'unassigned-has-target',
            message: 'An unassigned transition cannot name a provisional target area.'
          };
        }
        return {
          state: 'unavailable',
          reason: 'unassigned',
          area: null,
          targetAreaId: null
        };
      }

      if (!trigger?.target || !isNonEmptyString(trigger.target.areaId)) {
        return {
          state: 'invalid',
          reason: 'missing-target',
          message: 'The transition does not name a target area.'
        };
      }

      const area = this.getArea(trigger.target.areaId);
      if (!area) {
        return {
          state: 'invalid',
          reason: 'unknown-target',
          targetAreaId: trigger.target.areaId,
          message: `The target area is not registered: ${trigger.target.areaId}`
        };
      }

      if (area.status !== 'playable') {
        return {
          state: 'unavailable',
          reason: area.status,
          area,
          targetAreaId: area.id
        };
      }

      if (!isNonEmptyString(trigger.target.spawnId)) {
        return {
          state: 'invalid',
          reason: 'missing-target-spawn',
          area,
          targetAreaId: area.id,
          message: `Playable target ${area.id} requires a spawnId.`
        };
      }

      return {
        state: 'ready',
        area,
        targetAreaId: area.id,
        mapUrl: area.map,
        spawnId: trigger.target.spawnId,
        returnTransitionId: trigger.target.returnTransitionId || null
      };
    }
  }

  function auditTopology(registryInput, mapsByAreaInput) {
    const registry = registryInput instanceof AreaRegistry
      ? registryInput
      : new AreaRegistry(registryInput);
    const mapsByArea = asMap(mapsByAreaInput);
    const errors = [];
    const warnings = [];

    registry.areas.forEach((area) => {
      if (area.status !== 'playable') return;
      const map = mapsByArea.get(area.id);
      if (!map) {
        errors.push(`Playable area has no loaded map data: ${area.id}`);
        return;
      }
      if (map.id !== area.id) {
        errors.push(`Registry/map id mismatch: ${area.id} -> ${map.id || '(missing)'}`);
      }
      if (map.title !== area.title) {
        errors.push(`Registry/map title mismatch: ${area.id}`);
      }
      if (map.schemaVersion !== 2) {
        errors.push(`Playable map does not use schemaVersion 2: ${area.id}`);
      }

      const spawnPoints = map.spawnPoints || {};
      if (area.id === registry.data.start.areaId && !spawnPoints[registry.data.start.spawnId]) {
        errors.push(`Registry start spawn is missing: ${area.id}/${registry.data.start.spawnId}`);
      }

      const transitions = [
        ...(map.exits || []).map((transition) => ({ ...transition, type: 'exit' })),
        ...(map.portals || []).map((transition) => ({ ...transition, type: 'portal' }))
      ];
      const transitionIds = new Set();

      transitions.forEach((transition) => {
        const label = `${area.id}/${transition.id || '(missing id)'}`;
        if (!isStableId(transition.id)) {
          errors.push(`Transition id is not stable kebab-case: ${label}`);
        }
        if (transitionIds.has(transition.id)) errors.push(`Duplicate transition id: ${label}`);
        transitionIds.add(transition.id);

        if (transition.type === 'exit' && !OUTDOOR_DIRECTIONS.includes(transition.direction)) {
          errors.push(`Outdoor transition has no valid direction: ${label}`);
        }
        if (!TRANSITION_STATUSES.includes(transition.status)) {
          errors.push(`Transition has no valid status: ${label}`);
        }
        if (!isNonEmptyString(transition.fallbackSpawn) || !spawnPoints[transition.fallbackSpawn]) {
          errors.push(`Transition fallback spawn is missing: ${label}`);
        }

        const resolution = registry.resolveTransition(transition);
        if (resolution.state === 'invalid') {
          errors.push(`Invalid transition ${label}: ${resolution.reason}`);
          return;
        }

        if (resolution.state === 'unavailable') {
          if (resolution.reason === 'unassigned') {
            warnings.push(`${label} has no approved target area yet.`);
            return;
          }
          if (transition.status !== resolution.area.status) {
            errors.push(
              `Transition status mismatch: ${label} is ${transition.status || '(missing)'}, `
              + `target is ${resolution.area.status}`
            );
          }
          warnings.push(`${label} targets ${resolution.area.status} area ${resolution.area.id}.`);
          return;
        }

        if (transition.status !== 'active') {
          errors.push(`Playable transition is not marked active: ${label}`);
        }

        const targetMap = mapsByArea.get(resolution.area.id);
        if (!targetMap) {
          errors.push(`Target map data is not loaded: ${label} -> ${resolution.area.id}`);
          return;
        }
        if (!targetMap.spawnPoints?.[resolution.spawnId]) {
          errors.push(`Target spawn is missing: ${label} -> ${resolution.area.id}/${resolution.spawnId}`);
        }
        if (!resolution.returnTransitionId) {
          errors.push(`Active transition has no returnTransitionId: ${label}`);
          return;
        }

        const returnTransition = [
          ...(targetMap.exits || []),
          ...(targetMap.portals || [])
        ].find((candidate) => candidate.id === resolution.returnTransitionId);
        if (!returnTransition) {
          errors.push(
            `Return transition is missing: ${label} -> ${resolution.area.id}/${resolution.returnTransitionId}`
          );
          return;
        }
        if (returnTransition.target?.areaId !== area.id) {
          errors.push(`Return transition points elsewhere: ${resolution.area.id}/${returnTransition.id}`);
        }
        if (returnTransition.target?.returnTransitionId !== transition.id) {
          errors.push(`Return transition does not name its reciprocal: ${resolution.area.id}/${returnTransition.id}`);
        }
      });
    });

    return { errors, warnings };
  }

  window.AvendorWorldMap = Object.freeze({
    AreaRegistry,
    AREA_STATUSES,
    TRANSITION_STATUSES,
    AREA_KINDS,
    OUTDOOR_DIRECTIONS,
    auditTopology
  });
})();
