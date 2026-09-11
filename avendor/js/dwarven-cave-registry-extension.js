(() => {
  'use strict';
  const WorldMap = window.AvendorWorldMap;
  if (!WorldMap?.AreaRegistry) return;
  const AreaRegistry = WorldMap.AreaRegistry;
  const originalLoad = AreaRegistry.load.bind(AreaRegistry);
  const EXTENSION_URL = 'data/maps/briarwell-dwarven-cave-registry.json';

  AreaRegistry.load = async function loadWithDwarvenCaves(url) {
    const base = await originalLoad(url);
    let response;
    try {
      response = await fetch(EXTENSION_URL, { cache: 'no-store' });
    } catch (error) {
      console.warn('Could not load Dwarven Cave registry extension.', error);
      return base;
    }
    if (!response.ok) {
      console.warn(`Could not load Dwarven Cave registry extension (${response.status}).`);
      return base;
    }
    const extension = await response.json();
    const existingAreaIds = new Set(base.data.areas.map((area) => area.id));
    const existingConnectionIds = new Set((base.data.connections || []).map((connection) => connection.id));
    return new AreaRegistry({
      ...base.data,
      version: `${base.data.version}+dwarven-caves.0.1.0`,
      areas: [...base.data.areas, ...(extension.areas || []).filter((area) => !existingAreaIds.has(area.id))],
      connections: [...(base.data.connections || []), ...(extension.connections || []).filter((connection) => !existingConnectionIds.has(connection.id))]
    });
  };
})();
