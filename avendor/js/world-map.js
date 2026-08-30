(() => {
  'use strict';

  const AREA_STATUSES = Object.freeze(['playable', 'planned']);
  const TRANSITION_STATUSES = Object.freeze(['active', 'planned', 'unassigned']);
  const AREA_KINDS = Object.freeze(['outdoor', 'interior']);
  const REGISTRY_SCHEMA_VERSIONS = Object.freeze([1, 2]);
  const CONNECTION_KINDS = Object.freeze([
    'road', 'alley', 'doorway', 'secret-passage', 'sewer-access', 'sewer-tunnel'
  ]);
  const CONNECTION_VISIBILITIES = Object.freeze(['public', 'hidden']);
  const CONNECTION_STATUSES = Object.freeze(['active', 'planned']);
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
      requireValue(
        REGISTRY_SCHEMA_VERSIONS.includes(data.schemaVersion),
        `AreaRegistry does not support schemaVersion ${data.schemaVersion}.`
      );
      requireValue(isStableId(data.id), 'AreaRegistry requires a stable kebab-case id.');
      requireValue(isNonEmptyString(data.title), 'AreaRegistry requires a title.');
      requireValue(isNonEmptyString(data.version), 'AreaRegistry requires a version.');
      requireValue(Array.isArray(data.areas) && data.areas.length > 0, 'AreaRegistry requires at least one area.');

      this.data = data;
      this.areas = data.areas;
      this.areaById = new Map();
      this.areaByNumber = new Map();
      this.connectionById = new Map();
      this.connectionByEndpoint = new Map();
      this.cityExitById = new Map();
      this.cityExitByEndpoint = new Map();

      this.areas.forEach((area) => {
        requireValue(isStableId(area.id), 'Every registered area requires a stable kebab-case id.');
        requireValue(!this.areaById.has(area.id), `Duplicate area id: ${area.id}`);
        requireValue(isNonEmptyString(area.title), `Area ${area.id} requires a title.`);
        requireValue(AREA_KINDS.includes(area.kind), `Area ${area.id} has an unsupported kind.`);
        requireValue(AREA_STATUSES.includes(area.status), `Area ${area.id} has an unsupported status.`);

        if (area.planPosition !== null && area.planPosition !== undefined) {
          requireValue(
            Number.isInteger(area.planPosition.column) && Number.isInteger(area.planPosition.row),
            `Area ${area.id} has an invalid planPosition.`
          );
        }

        if (area.landmarks !== undefined) {
          requireValue(Array.isArray(area.landmarks), `Area ${area.id} landmarks must be an array.`);
          const landmarkIds = new Set();
          area.landmarks.forEach((landmark) => {
            requireValue(isStableId(landmark.id), `Area ${area.id} has an invalid landmark id.`);
            requireValue(!landmarkIds.has(landmark.id), `Area ${area.id} has duplicate landmark ${landmark.id}.`);
            requireValue(isNonEmptyString(landmark.label), `Area ${area.id}/${landmark.id} requires a label.`);
            landmarkIds.add(landmark.id);
          });
        }

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

      this.connections = data.connections || [];
      this.cityExits = data.cityExits || [];
      requireValue(Array.isArray(this.connections), 'AreaRegistry connections must be an array.');
      requireValue(Array.isArray(this.cityExits), 'AreaRegistry cityExits must be an array.');
      if (data.schemaVersion >= 2) {
        requireValue(this.connections.length > 0, 'AreaRegistry schemaVersion 2 requires connections.');
      }

      this.connections.forEach((connection) => {
        requireValue(isStableId(connection.id), 'Every connection requires a stable kebab-case id.');
        requireValue(!this.connectionById.has(connection.id), `Duplicate connection id: ${connection.id}`);
        requireValue(
          CONNECTION_KINDS.includes(connection.kind),
          `Connection ${connection.id} has an unsupported kind.`
        );
        requireValue(
          CONNECTION_VISIBILITIES.includes(connection.visibility),
          `Connection ${connection.id} has unsupported visibility.`
        );
        requireValue(
          CONNECTION_STATUSES.includes(connection.status),
          `Connection ${connection.id} has an unsupported status.`
        );
        requireValue(
          Array.isArray(connection.endpoints) && connection.endpoints.length === 2,
          `Connection ${connection.id} requires exactly two endpoints.`
        );
        requireValue(
          connection.endpoints[0].areaId !== connection.endpoints[1].areaId,
          `Connection ${connection.id} cannot connect an area to itself.`
        );

        if (['secret-passage', 'sewer-access'].includes(connection.kind)) {
          requireValue(
            connection.visibility === 'hidden',
            `Connection ${connection.id} must remain hidden.`
          );
        }

        connection.endpoints.forEach((endpoint) => {
          const area = this.getArea(endpoint.areaId);
          requireValue(area, `Connection ${connection.id} names unknown area ${endpoint.areaId}.`);
          requireValue(
            isStableId(endpoint.transitionId),
            `Connection ${connection.id} has an invalid transitionId.`
          );
          const key = `${endpoint.areaId}/${endpoint.transitionId}`;
          requireValue(
            !this.connectionByEndpoint.has(key),
            `Transition endpoint belongs to multiple connections: ${key}`
          );

          if (['road', 'alley'].includes(connection.kind)) {
            requireValue(area.kind === 'outdoor', `Connection ${connection.id} requires outdoor endpoints.`);
            requireValue(
              OUTDOOR_DIRECTIONS.includes(endpoint.direction),
              `Connection ${connection.id} endpoint ${key} requires a valid direction.`
            );
          } else if (endpoint.direction !== undefined) {
            requireValue(
              OUTDOOR_DIRECTIONS.includes(endpoint.direction),
              `Connection ${connection.id} endpoint ${key} has an invalid direction.`
            );
          }

          this.connectionByEndpoint.set(key, connection);
        });
        if (connection.status === 'active') {
          requireValue(
            connection.endpoints.every((endpoint) => this.getArea(endpoint.areaId).status === 'playable'),
            `Active connection ${connection.id} requires two playable areas.`
          );
        }
        this.connectionById.set(connection.id, connection);
      });

      this.cityExits.forEach((cityExit) => {
        requireValue(isStableId(cityExit.id), 'Every city exit requires a stable kebab-case id.');
        requireValue(!this.cityExitById.has(cityExit.id), `Duplicate city exit id: ${cityExit.id}`);
        const area = this.getArea(cityExit.areaId);
        requireValue(area, `City exit ${cityExit.id} names an unknown area.`);
        requireValue(area.kind === 'outdoor', `City exit ${cityExit.id} requires an outdoor area.`);
        requireValue(isStableId(cityExit.transitionId), `City exit ${cityExit.id} has an invalid transitionId.`);
        requireValue(
          OUTDOOR_DIRECTIONS.includes(cityExit.direction),
          `City exit ${cityExit.id} requires a valid direction.`
        );
        requireValue(
          TRANSITION_STATUSES.includes(cityExit.status),
          `City exit ${cityExit.id} has an unsupported status.`
        );
        const key = `${cityExit.areaId}/${cityExit.transitionId}`;
        requireValue(
          !this.connectionByEndpoint.has(key),
          `City exit duplicates an internal connection endpoint: ${key}`
        );
        requireValue(
          !this.cityExitByEndpoint.has(key),
          `Transition endpoint belongs to multiple city exits: ${key}`
        );
        if (cityExit.status === 'unassigned') {
          requireValue(cityExit.target === null, `Unassigned city exit ${cityExit.id} cannot name a target.`);
        }
        this.cityExitById.set(cityExit.id, cityExit);
        this.cityExitByEndpoint.set(key, cityExit);
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

    getConnection(id) {
      return this.connectionById.get(id) || null;
    }

    getConnectionForTransition(areaId, transitionId) {
      return this.connectionByEndpoint.get(`${areaId}/${transitionId}`) || null;
    }

    getConnectionsForArea(areaId, options = {}) {
      const includeHidden = options.includeHidden === true;
      return this.connections.filter((connection) => (
        (includeHidden || connection.visibility === 'public')
          && connection.endpoints.some((endpoint) => endpoint.areaId === areaId)
      ));
    }

    getCityExitsForArea(areaId) {
      return this.cityExits.filter((cityExit) => cityExit.areaId === areaId);
    }

    getCityExitForTransition(areaId, transitionId) {
      return this.cityExitByEndpoint.get(`${areaId}/${transitionId}`) || null;
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

        if (registry.data.schemaVersion >= 2) {
          if (transition.status === 'unassigned') {
            const cityExit = registry.getCityExitForTransition(area.id, transition.id);
            if (!cityExit) {
              errors.push(`Unassigned transition is absent from approved city exits: ${label}`);
            } else {
              if (transition.type !== 'exit') {
                errors.push(`A city exit cannot be a portal: ${label}`);
              }
              if (cityExit.direction !== (transition.worldDirection || transition.direction)) {
                errors.push(`City-exit direction disagrees with town graph: ${label}`);
              }
              if (cityExit.status !== transition.status) {
                errors.push(`City-exit status disagrees with town graph: ${label}`);
              }
            }
          } else {
            const connection = registry.getConnectionForTransition(area.id, transition.id);
            if (!connection) {
              errors.push(`Transition is absent from the approved town graph: ${label}`);
            } else {
              const endpoint = connection.endpoints.find((candidate) => candidate.areaId === area.id);
              const reciprocal = connection.endpoints.find((candidate) => candidate !== endpoint);
              if (transition.target?.areaId !== reciprocal.areaId) {
                errors.push(`Transition target disagrees with town graph: ${label}`);
              }
              if (
                transition.target?.returnTransitionId
                && transition.target.returnTransitionId !== reciprocal.transitionId
              ) {
                errors.push(`Transition reciprocal disagrees with town graph: ${label}`);
              }
              if (
                transition.type === 'exit'
                && endpoint.direction !== (transition.worldDirection || transition.direction)
              ) {
                errors.push(`Transition direction disagrees with town graph: ${label}`);
              }
              if (connection.status !== transition.status) {
                errors.push(`Transition status disagrees with town graph: ${label}`);
              }
            }
          }
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
    REGISTRY_SCHEMA_VERSIONS,
    CONNECTION_KINDS,
    CONNECTION_VISIBILITIES,
    CONNECTION_STATUSES,
    OUTDOOR_DIRECTIONS,
    auditTopology
  });
})();
