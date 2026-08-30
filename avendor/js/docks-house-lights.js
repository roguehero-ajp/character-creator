(() => {
  'use strict';

  const AREA_ID = 'briarwell-docks';
  const WIDTH = 1448;
  const HEIGHT = 1086;
  const stage = document.getElementById('walk-stage');

  if (!stage) return;

  const AUTHORED_HOUSE_LIGHTS = Object.freeze([
    Object.freeze({
      id: 'house-light-upper',
      bounds: Object.freeze({ x: 1090, y: 231, width: 41, height: 41 }),
      center: Object.freeze([1111, 252]),
      points: Object.freeze([[1128,272],[1090,272],[1092,237],[1123,231],[1131,265]]),
      delay: '-2.7s'
    }),
    Object.freeze({
      id: 'house-light-lower-right',
      bounds: Object.freeze({ x: 1164, y: 362, width: 37, height: 46 }),
      center: Object.freeze([1183, 385]),
      points: Object.freeze([[1166,362],[1198,367],[1201,407],[1164,408],[1164,368]]),
      delay: '-.9s'
    }),
    Object.freeze({
      id: 'house-light-lower-left',
      bounds: Object.freeze({ x: 1018, y: 339, width: 42, height: 44 }),
      center: Object.freeze([1039, 361]),
      points: Object.freeze([[1060,380],[1028,383],[1018,359],[1027,339],[1042,342],[1052,354]]),
      delay: '-1.9s'
    })
  ]);

  function percent(value, span) {
    return `${((value / span) * 100).toFixed(3)}%`;
  }

  function clipPathFor(zone) {
    const { x, y, width, height } = zone.bounds;
    return `polygon(${zone.points.map(([px, py]) => {
      const localX = ((px - x) / width) * 100;
      const localY = ((py - y) / height) * 100;
      return `${localX.toFixed(2)}% ${localY.toFixed(2)}%`;
    }).join(', ')})`;
  }

  function createHouseLight(layer, zone) {
    const light = document.createElement('div');
    light.className = 'dock-lantern-glow dock-house-light';
    light.dataset.houseLight = zone.id;
    light.setAttribute('aria-hidden', 'true');
    light.style.left = percent(zone.center[0], WIDTH);
    light.style.top = percent(zone.center[1], HEIGHT);
    light.style.width = percent(zone.bounds.width, WIDTH);
    light.style.height = percent(zone.bounds.height, HEIGHT);
    light.style.clipPath = clipPathFor(zone);
    light.style.setProperty('--light-delay', zone.delay);
    layer.appendChild(light);
    return light;
  }

  function replaceHouseLights() {
    if (stage.dataset.areaId !== AREA_ID) return false;

    const layer = stage.querySelector(`.environment-animation-layer[data-area-id="${AREA_ID}"]`);
    if (!layer) return false;
    if (layer.querySelector('.dock-house-light')) return true;

    const legacyLights = [...layer.querySelectorAll('.dock-lantern-glow')];
    if (legacyLights.length < 6) return false;

    // The first three glows are approved harbor fixtures. The last three were
    // guessed house-window positions and are replaced by the traced authoring zones.
    legacyLights.slice(-3).forEach((light) => light.remove());
    AUTHORED_HOUSE_LIGHTS.forEach((zone) => createHouseLight(layer, zone));
    return true;
  }

  let currentAreaId = stage.dataset.areaId || null;
  const observer = new MutationObserver(() => {
    const nextAreaId = stage.dataset.areaId || null;
    if (nextAreaId === currentAreaId) return;
    currentAreaId = nextAreaId;
    queueMicrotask(replaceHouseLights);
  });

  observer.observe(stage, { attributes: true, attributeFilter: ['data-area-id'] });
  replaceHouseLights();

  window.AvendorDocksHouseLights = Object.freeze({
    zones: AUTHORED_HOUSE_LIGHTS,
    replaceHouseLights
  });
})();
