(() => {
  'use strict';

  const AREA_ID = 'briarwell-docks';
  const LAYER_CLASS = 'dock-bird-layer';
  const stage = document.getElementById('walk-stage');

  if (!stage) return;

  function clearBirds() {
    stage.querySelectorAll(`.${LAYER_CLASS}`).forEach((element) => element.remove());
  }

  function createBird(className, label) {
    const bird = document.createElement('div');
    bird.className = `dock-bird ${className}`;
    bird.setAttribute('aria-hidden', 'true');
    bird.dataset.bird = label;
    return bird;
  }

  function mountBirds() {
    if (stage.dataset.areaId !== AREA_ID || stage.querySelector(`.${LAYER_CLASS}`)) return;

    const layer = document.createElement('div');
    layer.className = LAYER_CLASS;
    layer.dataset.areaId = AREA_ID;
    layer.setAttribute('aria-hidden', 'true');

    layer.appendChild(createBird('dock-bird-a', 'harbor-gull-a'));
    layer.appendChild(createBird('dock-bird-b', 'harbor-gull-b'));

    stage.insertBefore(layer, stage.querySelector('.map-debug-layer'));
  }

  function sync() {
    clearBirds();
    if (stage.dataset.areaId === AREA_ID) mountBirds();
  }

  let currentAreaId = stage.dataset.areaId || null;
  const observer = new MutationObserver(() => {
    const nextAreaId = stage.dataset.areaId || null;
    if (nextAreaId === currentAreaId) return;
    currentAreaId = nextAreaId;
    sync();
  });

  observer.observe(stage, { attributes: true, attributeFilter: ['data-area-id'] });
  sync();

  window.AvendorDocksAmbientLife = Object.freeze({ mountBirds, clearBirds });
})();
