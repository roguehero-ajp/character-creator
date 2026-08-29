(() => {
  'use strict';

  const STYLE_ID = 'avendor-environment-animation-style';
  const WIDTH = 1448;
  const HEIGHT = 1086;
  const SVG_NS = 'http://www.w3.org/2000/svg';

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
      }
      .walk-stage[data-daypart="day"] .environment-animation-layer {
        --forge-pulse-min: .36;
        --forge-pulse-max: .62;
        --forge-core-min: .58;
        --forge-core-max: .88;
        --forge-smoke-peak: .24;
      }
      .walk-stage[data-daypart="dawn"] .environment-animation-layer {
        --forge-pulse-min: .50;
        --forge-pulse-max: .82;
        --forge-core-min: .70;
        --forge-core-max: .96;
        --forge-smoke-peak: .27;
      }
      .walk-stage[data-daypart="dusk"] .environment-animation-layer {
        --forge-pulse-min: .58;
        --forge-pulse-max: .92;
        --forge-core-min: .76;
        --forge-core-max: 1;
        --forge-smoke-peak: .30;
      }
      .walk-stage[data-daypart="night"] .environment-animation-layer {
        --forge-pulse-min: .78;
        --forge-pulse-max: 1;
        --forge-core-min: .90;
        --forge-core-max: 1;
        --forge-smoke-peak: .22;
      }
      .environment-animation-layer .forge-glow {
        position: absolute;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        background: radial-gradient(circle, rgba(255,220,120,.60) 0%, rgba(255,132,40,.34) 32%, rgba(255,72,20,.13) 58%, rgba(255,72,20,0) 76%);
        mix-blend-mode: screen;
        filter: blur(4px);
        animation: avendor-forge-pulse 1.35s ease-in-out infinite alternate;
      }
      .environment-animation-layer .forge-core {
        position: absolute;
        transform: translate(-50%, -50%);
        border-radius: 48% 52% 50% 50%;
        background: radial-gradient(ellipse at 50% 70%, rgba(255,250,190,.96), rgba(255,174,52,.82) 38%, rgba(232,72,20,.30) 67%, rgba(232,72,20,0) 78%);
        filter: blur(1px);
        animation: avendor-forge-core .42s ease-in-out infinite alternate;
      }
      .environment-animation-layer .forge-ember {
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
      .environment-animation-layer .forge-smoke {
        position: absolute;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(82,78,76,.34), rgba(82,78,76,.14) 58%, rgba(82,78,76,0) 76%);
        filter: blur(5px);
        animation: avendor-smoke-rise var(--smoke-duration, 5.5s) ease-out infinite;
        animation-delay: var(--smoke-delay, 0s);
        opacity: 0;
      }
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
      @media (prefers-reduced-motion: reduce) {
        .environment-animation-layer * { animation: none !important; }
        .environment-animation-layer .forge-glow { opacity: var(--forge-pulse-min); }
        .environment-animation-layer .forge-core { opacity: var(--forge-core-min); }
        .environment-animation-layer .forge-ember,
        .environment-animation-layer .forge-smoke { display: none; }
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
    // Calibrated against the canonical 1448x1086 painting: the coal bed is centered near 414,431.
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

    // Smoke belongs to the Blacksmith chimney, not the doorway or forecourt.
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

    // Two short fence runs mark the town limit while preserving a wagon-width Henson-road opening.
    addFenceSegment(group, 505, 625, 355, -.045);
    addFenceSegment(group, 820, 935, 340, .03);
    layer.appendChild(group);
    stage.insertBefore(layer, stage.querySelector('.map-debug-layer'));
  }

  function mountForArea(stage, areaId) {
    ensureStyles();
    stage.querySelectorAll('.environment-animation-layer, .boundary-overlay-layer').forEach((element) => element.remove());

    if (areaId === 'briarwell-northwest-workshops') {
      const animationLayer = document.createElement('div');
      animationLayer.className = 'environment-animation-layer';
      animationLayer.dataset.areaId = areaId;
      animationLayer.setAttribute('aria-hidden', 'true');
      animationLayer.style.zIndex = '900';
      stage.insertBefore(animationLayer, stage.querySelector('.map-debug-layer'));
      mountNorthwestForge(animationLayer);
      return animationLayer;
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
