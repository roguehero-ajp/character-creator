(() => {
  'use strict';

  const STYLE_ID = 'avendor-environment-animation-style';
  const WIDTH = 1448;
  const HEIGHT = 1086;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const DOCKS_ART = 'assets/maps/briarwell/docks/background/briarwell-docks-v1.png';

  const DOCK_BOATS = Object.freeze({
    central: Object.freeze({
      left: 52.5, top: 55.2, width: 25.5, height: 21.5,
      clipPath: 'polygon(6.7% 8.4%, 78.8% 4.7%, 96.1% 34.4%, 87.5% 79.5%, 58.8% 95.3%, 22.4% 87.0%, 3.9% 55.8%)',
      imageWidth: 392.16, imageHeight: 465.12, imageLeft: -205.88, imageTop: -256.74,
      zIndex: 1812
    }),
    west: Object.freeze({
      left: 9.5, top: 68.8, width: 19.9, height: 23.0,
      clipPath: 'polygon(9.5% 10.4%, 71.9% 4.3%, 95.0% 27.4%, 92.0% 75.7%, 57.8% 95.7%, 19.6% 84.3%, 5.0% 47.8%)',
      imageWidth: 502.51, imageHeight: 434.78, imageLeft: -47.74, imageTop: -299.13,
      zIndex: 1978
    })
  });

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .environment-animation-layer,
      .boundary-overlay-layer {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        overflow: hidden;
      }

      .environment-animation-layer {
        --forge-pulse-min: .58;
        --forge-pulse-max: .92;
        --forge-core-min: .76;
        --forge-core-max: 1;
        --forge-smoke-peak: .30;
        --dock-light-alpha: .52;
        --dock-water-alpha: .18;
        --dock-mist-alpha: .035;
        --dock-smoke-peak: .54;
      }
      .walk-stage[data-daypart="day"] .environment-animation-layer {
        --forge-pulse-min: .36;
        --forge-pulse-max: .62;
        --forge-core-min: .58;
        --forge-core-max: .88;
        --forge-smoke-peak: .24;
        --dock-light-alpha: .12;
        --dock-water-alpha: .10;
        --dock-mist-alpha: .010;
        --dock-smoke-peak: .46;
      }
      .walk-stage[data-daypart="dawn"] .environment-animation-layer {
        --forge-pulse-min: .50;
        --forge-pulse-max: .82;
        --forge-core-min: .70;
        --forge-core-max: .96;
        --forge-smoke-peak: .27;
        --dock-light-alpha: .34;
        --dock-water-alpha: .15;
        --dock-mist-alpha: .075;
        --dock-smoke-peak: .62;
      }
      .walk-stage[data-daypart="dusk"] .environment-animation-layer {
        --forge-pulse-min: .58;
        --forge-pulse-max: .92;
        --forge-core-min: .76;
        --forge-core-max: 1;
        --forge-smoke-peak: .30;
        --dock-light-alpha: .56;
        --dock-water-alpha: .18;
        --dock-mist-alpha: .035;
        --dock-smoke-peak: .60;
      }
      .walk-stage[data-daypart="night"] .environment-animation-layer {
        --forge-pulse-min: .78;
        --forge-pulse-max: 1;
        --forge-core-min: .90;
        --forge-core-max: 1;
        --forge-smoke-peak: .22;
        --dock-light-alpha: .82;
        --dock-water-alpha: .23;
        --dock-mist-alpha: .060;
        --dock-smoke-peak: .48;
      }

      .forge-glow {
        position: absolute;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        background: radial-gradient(circle, rgba(255,220,120,.60) 0%, rgba(255,132,40,.34) 32%, rgba(255,72,20,.13) 58%, rgba(255,72,20,0) 76%);
        mix-blend-mode: screen;
        filter: blur(4px);
        animation: avendor-forge-pulse 1.35s ease-in-out infinite alternate;
      }
      .forge-core {
        position: absolute;
        transform: translate(-50%, -50%);
        border-radius: 48% 52% 50% 50%;
        background: radial-gradient(ellipse at 50% 70%, rgba(255,250,190,.96), rgba(255,174,52,.82) 38%, rgba(232,72,20,.30) 67%, rgba(232,72,20,0) 78%);
        filter: blur(1px);
        animation: avendor-forge-core .42s ease-in-out infinite alternate;
      }
      .forge-ember {
        position: absolute;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: rgba(255,205,95,.96);
        box-shadow: 0 0 6px rgba(255,116,36,.9);
        animation: avendor-ember-rise var(--ember-duration, 1.8s) ease-out infinite;
        animation-delay: var(--ember-delay, 0s);
        opacity: 0;
      }
      .forge-smoke,
      .dock-smoke {
        position: absolute;
        border-radius: 50%;
        opacity: 0;
      }
      .forge-smoke {
        background: radial-gradient(circle, rgba(82,78,76,.34), rgba(82,78,76,.14) 58%, rgba(82,78,76,0) 76%);
        filter: blur(5px);
        animation: avendor-smoke-rise var(--smoke-duration, 5.5s) ease-out infinite;
        animation-delay: var(--smoke-delay, 0s);
      }
      .dock-smoke {
        background: radial-gradient(circle, rgba(210,216,221,.64), rgba(151,160,168,.34) 48%, rgba(102,112,121,.12) 70%, rgba(70,78,86,0) 84%);
        filter: blur(3px);
        animation: avendor-dock-smoke var(--smoke-duration, 8.2s) ease-out infinite;
        animation-delay: var(--smoke-delay, 0s);
      }

      /* Performance rule: water effects are bounded to their authored basins, never full-stage layers. */
      .dock-water-window {
        position: absolute;
        overflow: hidden;
        pointer-events: none;
      }
      .dock-water-window::before {
        content: '';
        position: absolute;
        inset: -8%;
        opacity: var(--dock-water-alpha);
        mix-blend-mode: screen;
        background:
          repeating-linear-gradient(164deg, transparent 0 21px, rgba(205,229,241,.28) 22px 24px, transparent 25px 52px),
          repeating-linear-gradient(8deg, transparent 0 35px, rgba(135,176,198,.14) 36px 38px, transparent 39px 72px);
        background-size: 165% 140%, 145% 120%;
        animation: avendor-water-shimmer var(--water-duration, 9s) linear infinite;
        animation-delay: var(--water-delay, 0s);
      }
      .dock-water-ripple {
        position: absolute;
        border: 2px solid rgba(191,221,234,.48);
        border-left-color: transparent;
        border-right-color: transparent;
        border-radius: 50%;
        opacity: 0;
        transform: translate(-50%, -50%) scale(.65,.42);
        animation: avendor-water-ripple var(--ripple-duration, 5.2s) ease-out infinite;
        animation-delay: var(--ripple-delay, 0s);
      }
      .dock-lantern-glow {
        position: absolute;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        background: radial-gradient(circle, rgba(255,226,146,.90) 0%, rgba(255,171,64,.38) 22%, rgba(240,112,30,.12) 48%, rgba(240,112,30,0) 72%);
        mix-blend-mode: screen;
        opacity: var(--dock-light-alpha);
        filter: blur(3px);
        animation: avendor-lantern-breathe var(--light-duration, 4.2s) ease-in-out infinite alternate;
        animation-delay: var(--light-delay, 0s);
      }
      .dock-mist {
        position: absolute;
        border-radius: 50%;
        background: radial-gradient(ellipse at center, rgba(205,221,232,.46), rgba(171,197,213,.14) 52%, rgba(160,190,209,0) 78%);
        filter: blur(12px);
        opacity: var(--dock-mist-alpha);
        animation: avendor-dock-mist var(--mist-duration, 15s) ease-in-out infinite alternate;
        animation-delay: var(--mist-delay, 0s);
      }

      /* Performance rule: each boat is a small crop window, not a full-screen duplicate of the map. */
      .dock-boat-window {
        position: absolute;
        pointer-events: none;
        overflow: hidden;
      }
      .dock-boat-image {
        position: absolute;
        max-width: none;
        max-height: none;
        user-select: none;
        pointer-events: none;
      }
      .dock-boat-window[data-boat="central"] {
        animation: avendor-boat-central 5.9s ease-in-out infinite alternate;
      }
      .dock-boat-window[data-boat="west"] {
        animation: avendor-boat-west 6.7s ease-in-out infinite alternate;
        animation-delay: -2.1s;
      }
      .walk-stage[data-daypart="night"] .dock-boat-window { opacity: .72; }
      .walk-stage[data-daypart="dawn"] .dock-boat-window { opacity: .90; }
      .walk-stage[data-daypart="day"] .dock-boat-window,
      .walk-stage[data-daypart="dusk"] .dock-boat-window { opacity: 1; }

      .boundary-overlay-layer .fence-shadow {
        fill: none;
        stroke: rgba(12,15,18,.34);
        stroke-width: 12;
        stroke-linecap: round;
      }

      @keyframes avendor-forge-pulse {
        from { opacity: var(--forge-pulse-min); transform: translate(-50%, -50%) scale(.94); }
        to { opacity: var(--forge-pulse-max); transform: translate(-50%, -50%) scale(1.06); }
      }
      @keyframes avendor-forge-core {
        from { opacity: var(--forge-core-min); transform: translate(-50%, -50%) scale(.88,.96) rotate(-1deg); }
        to { opacity: var(--forge-core-max); transform: translate(-50%, -50%) scale(1.06,1.04) rotate(1deg); }
      }
      @keyframes avendor-ember-rise {
        0% { opacity: 0; transform: translate(0, 0) scale(.65); }
        15% { opacity: .95; }
        75% { opacity: .45; }
        100% { opacity: 0; transform: translate(var(--ember-drift, 10px), -58px) scale(.15); }
      }
      @keyframes avendor-smoke-rise {
        0% { opacity: 0; transform: translate(0, 0) scale(.65); }
        16% { opacity: var(--forge-smoke-peak); }
        72% { opacity: calc(var(--forge-smoke-peak) * .5); }
        100% { opacity: 0; transform: translate(var(--smoke-drift, 20px), -120px) scale(1.75); }
      }
      @keyframes avendor-dock-smoke {
        0% { opacity: 0; transform: translate(0, 0) scale(.52); }
        10% { opacity: var(--dock-smoke-peak); }
        76% { opacity: calc(var(--dock-smoke-peak) * .68); }
        100% { opacity: 0; transform: translate(var(--smoke-drift, -38px), -132px) scale(1.95); }
      }
      @keyframes avendor-water-shimmer {
        from { background-position: 0 0, 0 0; }
        to { background-position: -128px 52px, 96px -28px; }
      }
      @keyframes avendor-water-ripple {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(.58,.38); }
        24% { opacity: calc(var(--dock-water-alpha) * 1.55); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(1.18,.62); }
      }
      @keyframes avendor-lantern-breathe {
        from { transform: translate(-50%, -50%) scale(.97); }
        to { transform: translate(-50%, -50%) scale(1.025); }
      }
      @keyframes avendor-dock-mist {
        from { transform: translate3d(-8px, 2px, 0) scale(.97); }
        to { transform: translate3d(12px, -2px, 0) scale(1.03); }
      }
      @keyframes avendor-boat-central {
        from { transform: translate3d(0, .6px, 0) rotate(-.10deg); }
        to { transform: translate3d(0, -1.4px, 0) rotate(.11deg); }
      }
      @keyframes avendor-boat-west {
        from { transform: translate3d(0, .8px, 0) rotate(.11deg); }
        to { transform: translate3d(0, -1.6px, 0) rotate(-.12deg); }
      }

      @media (prefers-reduced-motion: reduce) {
        .environment-animation-layer *,
        .dock-boat-window { animation: none !important; }
        .forge-glow { opacity: var(--forge-pulse-min); }
        .forge-core { opacity: var(--forge-core-min); }
        .forge-ember,
        .forge-smoke,
        .dock-smoke,
        .dock-mist { display: none; }
        .dock-water-ripple { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  function percent(value, span) {
    return `${((value / span) * 100).toFixed(3)}%`;
  }

  function addParticle(layer, className, x, y, width, height, variables = {}) {
    const element = document.createElement('div');
    element.className = className;
    element.style.left = percent(x, WIDTH);
    element.style.top = percent(y, HEIGHT);
    if (width) element.style.width = percent(width, WIDTH);
    if (height) element.style.height = percent(height, HEIGHT);
    Object.entries(variables).forEach(([name, value]) => element.style.setProperty(name, value));
    layer.appendChild(element);
    return element;
  }

  function createEnvironmentLayer(stage, areaId, zIndex = 900) {
    const layer = document.createElement('div');
    layer.className = 'environment-animation-layer';
    layer.dataset.areaId = areaId;
    layer.setAttribute('aria-hidden', 'true');
    layer.style.zIndex = String(zIndex);
    stage.insertBefore(layer, stage.querySelector('.map-debug-layer'));
    return layer;
  }

  function createSvgLayer(areaId, depthY) {
    const layer = document.createElementNS(SVG_NS, 'svg');
    layer.classList.add('boundary-overlay-layer');
    layer.dataset.areaId = areaId;
    layer.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
    layer.setAttribute('preserveAspectRatio', 'none');
    layer.setAttribute('aria-hidden', 'true');
    layer.style.zIndex = String(1000 + depthY);
    return layer;
  }

  function svgElement(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  }

  function mountNorthwestForge(layer) {
    addParticle(layer, 'forge-glow', 414, 431, 116, 82);
    addParticle(layer, 'forge-core', 414, 436, 54, 38);

    [
      [400, 425, '1.45s', '-.25s', '-9px'],
      [414, 420, '1.72s', '-.9s', '6px'],
      [430, 426, '1.56s', '-.55s', '10px'],
      [421, 414, '1.95s', '-1.35s', '-5px']
    ].forEach(([x, y, duration, delay, drift]) => {
      addParticle(layer, 'forge-ember', x, y, 0, 0, {
        '--ember-duration': duration,
        '--ember-delay': delay,
        '--ember-drift': drift
      });
    });

    [
      [340, 54, 44, 34, '5.1s', '-1.3s', '-16px'],
      [348, 48, 56, 42, '6.2s', '-3.8s', '20px'],
      [356, 58, 38, 31, '5.6s', '-.4s', '11px']
    ].forEach(([x, y, width, height, duration, delay, drift]) => {
      addParticle(layer, 'forge-smoke', x, y, width, height, {
        '--smoke-duration': duration,
        '--smoke-delay': delay,
        '--smoke-drift': drift
      });
    });
  }

  function addWaterWindow(layer, left, top, width, height, clipPath, duration, delay) {
    const windowElement = document.createElement('div');
    windowElement.className = 'dock-water-window';
    windowElement.style.left = `${left}%`;
    windowElement.style.top = `${top}%`;
    windowElement.style.width = `${width}%`;
    windowElement.style.height = `${height}%`;
    windowElement.style.clipPath = clipPath;
    windowElement.style.setProperty('--water-duration', duration);
    windowElement.style.setProperty('--water-delay', delay);
    layer.appendChild(windowElement);
  }

  function mountDockBoatWindow(stage, boatId) {
    const definition = DOCK_BOATS[boatId];
    if (!definition) return;

    const windowElement = document.createElement('div');
    windowElement.className = 'dock-boat-window';
    windowElement.dataset.areaId = 'briarwell-docks';
    windowElement.dataset.boat = boatId;
    windowElement.setAttribute('aria-hidden', 'true');
    windowElement.style.left = `${definition.left}%`;
    windowElement.style.top = `${definition.top}%`;
    windowElement.style.width = `${definition.width}%`;
    windowElement.style.height = `${definition.height}%`;
    windowElement.style.clipPath = definition.clipPath;
    windowElement.style.zIndex = String(definition.zIndex);

    const image = document.createElement('img');
    image.className = 'dock-boat-image';
    image.src = DOCKS_ART;
    image.alt = '';
    image.draggable = false;
    image.style.width = `${definition.imageWidth}%`;
    image.style.height = `${definition.imageHeight}%`;
    image.style.left = `${definition.imageLeft}%`;
    image.style.top = `${definition.imageTop}%`;
    windowElement.appendChild(image);

    stage.insertBefore(windowElement, stage.querySelector('.map-debug-layer'));
  }

  function mountDocks(stage, layer) {
    addWaterWindow(layer, 0, 63, 34, 37,
      'polygon(0% 2.7%, 52.9% 0%, 38.2% 24.3%, 35.3% 59.5%, 100% 100%, 0% 100%)',
      '10.8s', '-2.4s');
    addWaterWindow(layer, 39, 58, 41, 42,
      'polygon(0% 0%, 39.0% 0%, 68.3% 33.3%, 100% 100%, 65.9% 100%, 36.6% 61.9%, 7.3% 42.9%)',
      '9.4s', '-4.1s');
    addWaterWindow(layer, 62, 61, 38, 39,
      'polygon(10.5% 0%, 55.3% 0%, 100% 10.3%, 100% 100%, 36.8% 100%, 23.7% 61.5%, 0% 38.5%)',
      '11.6s', '-1.2s');

    addParticle(layer, 'dock-water-ripple', 286, 920, 220, 72, {
      '--ripple-duration': '6.0s', '--ripple-delay': '-1.8s'
    });
    addParticle(layer, 'dock-water-ripple', 930, 792, 270, 78, {
      '--ripple-duration': '5.6s', '--ripple-delay': '-3.1s'
    });
    addParticle(layer, 'dock-water-ripple', 1118, 705, 190, 56, {
      '--ripple-duration': '6.4s', '--ripple-delay': '-.7s'
    });

    [
      [310, 275, 82, 82, '5.0s', '-1.1s'],
      [625, 290, 76, 78, '4.8s', '-2.2s'],
      [463, 873, 108, 116, '4.5s', '-.6s'],
      [1014, 353, 104, 100, '4.9s', '-1.9s'],
      [1142, 270, 126, 108, '5.2s', '-2.7s'],
      [1174, 360, 98, 92, '5.0s', '-.9s']
    ].forEach(([x, y, width, height, duration, delay]) => {
      addParticle(layer, 'dock-lantern-glow', x, y, width, height, {
        '--light-duration': duration,
        '--light-delay': delay
      });
    });

    // addParticle uses top-left placement; these clouds are authored to emerge above the chimney cap.
    [
      [1284, 66, 88, 64, '8.8s', '-1.0s', '-44px'],
      [1294, 54, 102, 76, '10.0s', '-4.2s', '-60px'],
      [1276, 78, 76, 58, '8.0s', '-2.7s', '-34px'],
      [1290, 62, 94, 70, '10.8s', '-6.4s', '-52px']
    ].forEach(([x, y, width, height, duration, delay, drift]) => {
      addParticle(layer, 'dock-smoke', x, y, width, height, {
        '--smoke-duration': duration,
        '--smoke-delay': delay,
        '--smoke-drift': drift
      });
    });

    addParticle(layer, 'dock-mist', 265, 868, 430, 120, {
      '--mist-duration': '16.5s', '--mist-delay': '-5.2s'
    });
    addParticle(layer, 'dock-mist', 1030, 880, 560, 136, {
      '--mist-duration': '18.2s', '--mist-delay': '-2.6s'
    });

    mountDockBoatWindow(stage, 'central');
    mountDockBoatWindow(stage, 'west');
  }

  function addFenceSegment(group, x0, x1, y0, slope) {
    const posts = 4;
    const yAt = (x) => y0 + (slope * (x - x0));

    group.appendChild(svgElement('path', {
      d: `M ${x0} ${yAt(x0) + 6} L ${x1} ${yAt(x1) + 6}`,
      class: 'fence-shadow'
    }));

    [13, 29].forEach((offset) => {
      group.appendChild(svgElement('path', {
        d: `M ${x0} ${yAt(x0) - offset} L ${x1} ${yAt(x1) - offset}`,
        fill: 'none', stroke: '#4d321f', 'stroke-width': 8,
        'stroke-linecap': 'round'
      }));
      group.appendChild(svgElement('path', {
        d: `M ${x0 + 2} ${yAt(x0) - offset - 2} L ${x1 - 2} ${yAt(x1) - offset - 2}`,
        fill: 'none', stroke: '#805333', 'stroke-width': 2.4,
        'stroke-linecap': 'round', opacity: .75
      }));
    });

    for (let index = 0; index < posts; index += 1) {
      const x = x0 + ((x1 - x0) * index / (posts - 1));
      const y = yAt(x);
      group.appendChild(svgElement('path', {
        d: `M ${x - 5} ${y + 5} L ${x + 5} ${y + 5} L ${x + 4} ${y - 43} L ${x - 4} ${y - 43} Z`,
        fill: '#553722', stroke: '#2b2119', 'stroke-width': 2.5
      }));
      group.appendChild(svgElement('path', {
        d: `M ${x - 6} ${y - 42} Q ${x} ${y - 48} ${x + 7} ${y - 42}`,
        fill: 'none', stroke: '#a8bacb', 'stroke-width': 5,
        'stroke-linecap': 'round', opacity: .88
      }));
    }
  }

  function mountWestJunctionFence(stage) {
    const layer = createSvgLayer('briarwell-west-road-junction', 355);
    const group = svgElement('g', { opacity: .90 });
    addFenceSegment(group, 505, 625, 355, -.045);
    addFenceSegment(group, 820, 935, 340, .03);
    layer.appendChild(group);
    stage.insertBefore(layer, stage.querySelector('.map-debug-layer'));
  }

  function mountForArea(stage, areaId) {
    ensureStyles();
    stage.querySelectorAll('.environment-animation-layer, .boundary-overlay-layer, .dock-boat-window').forEach((element) => element.remove());

    if (areaId === 'briarwell-northwest-workshops') {
      const layer = createEnvironmentLayer(stage, areaId);
      mountNorthwestForge(layer);
      return layer;
    }

    if (areaId === 'briarwell-docks') {
      const layer = createEnvironmentLayer(stage, areaId);
      mountDocks(stage, layer);
      return layer;
    }

    if (areaId === 'briarwell-west-road-junction') {
      mountWestJunctionFence(stage);
    }
    return null;
  }

  function observe(stage) {
    let currentAreaId = null;
    const sync = () => {
      const areaId = stage.dataset.areaId || null;
      if (areaId === currentAreaId) return;
      currentAreaId = areaId;
      mountForArea(stage, areaId);
    };
    new MutationObserver(sync).observe(stage, { attributes: true, attributeFilter: ['data-area-id'] });
    sync();
  }

  const stage = document.getElementById('walk-stage');
  if (stage) observe(stage);

  window.AvendorEnvironmentAnimation = Object.freeze({ mountForArea, observe });
})();
