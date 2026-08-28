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
      .environment-animation-layer .forge-glow {
        position: absolute;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        background: radial-gradient(circle, rgba(255,220,120,.52) 0%, rgba(255,132,40,.28) 33%, rgba(255,72,20,.10) 58%, rgba(255,72,20,0) 76%);
        mix-blend-mode: screen;
        filter: blur(3px);
        animation: avendor-forge-pulse 1.35s ease-in-out infinite alternate;
      }
      .environment-animation-layer .forge-core {
        position: absolute;
        transform: translate(-50%, -50%);
        border-radius: 48% 52% 50% 50%;
        background: radial-gradient(ellipse at 50% 72%, rgba(255,250,190,.72), rgba(255,174,52,.52) 38%, rgba(232,72,20,.16) 67%, rgba(232,72,20,0) 80%);
        filter: blur(.8px);
        mix-blend-mode: screen;
        animation: avendor-forge-core .42s ease-in-out infinite alternate;
      }
      .environment-animation-layer .forge-ember {
        position: absolute;
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: rgba(255,205,95,.90);
        box-shadow: 0 0 5px rgba(255,116,36,.82);
        animation: avendor-ember-rise var(--ember-duration, 1.8s) ease-out infinite;
        animation-delay: var(--ember-delay, 0s);
        opacity: 0;
      }
      .environment-animation-layer .forge-smoke {
        position: absolute;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(78,82,88,.28), rgba(70,75,83,.11) 58%, rgba(70,75,83,0) 78%);
        filter: blur(6px);
        animation: avendor-smoke-rise var(--smoke-duration, 5.5s) ease-out infinite;
        animation-delay: var(--smoke-delay, 0s);
        opacity: 0;
      }
      .boundary-overlay-layer {
        filter: saturate(.88) brightness(.88);
      }
      .boundary-overlay-layer .snow-cap {
        fill: none;
        stroke: rgba(184,199,215,.88);
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      @keyframes avendor-forge-pulse {
        from { opacity: .48; transform: translate(-50%, -50%) scale(.95); }
        to { opacity: .82; transform: translate(-50%, -50%) scale(1.045); }
      }
      @keyframes avendor-forge-core {
        from { opacity: .48; transform: translate(-50%, -50%) scale(.92,.97) rotate(-.8deg); }
        to { opacity: .82; transform: translate(-50%, -50%) scale(1.04,1.03) rotate(.8deg); }
      }
      @keyframes avendor-ember-rise {
        0% { opacity: 0; transform: translate(0, 0) scale(.6); }
        15% { opacity: .85; }
        72% { opacity: .38; }
        100% { opacity: 0; transform: translate(var(--ember-drift, 8px), -42px) scale(.15); }
      }
      @keyframes avendor-smoke-rise {
        0% { opacity: 0; transform: translate(0, 0) scale(.60); }
        18% { opacity: .25; }
        70% { opacity: .12; }
        100% { opacity: 0; transform: translate(var(--smoke-drift, 18px), -105px) scale(1.75); }
      }
      @media (prefers-reduced-motion: reduce) {
        .environment-animation-layer * { animation: none !important; }
        .environment-animation-layer .forge-glow { opacity: .55; }
        .environment-animation-layer .forge-core { opacity: .58; }
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
    // Calibrated against the 1448x1086 source painting: the visible coal bed is centered near 413,432.
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

    // Smoke comes from the Blacksmith chimney, rather than magically appearing in the doorway.
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

  function addStone(group, x, y, width, height, shade = 0) {
    const palette = ['#343b42', '#404851', '#4c555e', '#2c333a'];
    const stone = svgElement('rect', {
      x, y, width, height, rx: Math.max(3, height * .24),
      fill: palette[(shade + palette.length) % palette.length],
      stroke: '#1d242b', 'stroke-width': 3
    });
    group.appendChild(stone);
    const highlight = svgElement('path', {
      d: `M ${x + 4} ${y + 5} Q ${x + width * .5} ${y + 1} ${x + width - 4} ${y + 5}`,
      fill: 'none', stroke: 'rgba(111,126,139,.45)', 'stroke-width': 2, 'stroke-linecap': 'round'
    });
    group.appendChild(highlight);
  }

  function mountNorthBoundary(stage) {
    const layer = createSvgLayer('briarwell-northwest-workshops', 282);
    const group = svgElement('g', { opacity: .88, transform: 'translate(0 0)' });

    // A low, old stone boundary closes the apparent northward continuation in the distant upper-right.
    const stones = [
      [1168,258,54,28,0],[1218,254,61,31,1],[1275,250,58,30,2],[1329,248,64,31,0],
      [1188,282,58,28,2],[1242,279,64,29,0],[1302,277,58,29,1],[1356,274,48,27,3]
    ];
    stones.forEach((stone) => addStone(group, ...stone));
    group.appendChild(svgElement('path', {
      d: 'M 1167 256 C 1200 246, 1238 250, 1274 246 S 1346 244, 1395 246',
      class: 'snow-cap', 'stroke-width': 8, opacity: .88
    }));
    group.appendChild(svgElement('path', {
      d: 'M 1184 306 C 1230 300, 1276 302, 1320 298 S 1360 294, 1404 294',
      fill: 'none', stroke: 'rgba(26,35,42,.58)', 'stroke-width': 6, 'stroke-linecap': 'round'
    }));
    layer.appendChild(group);
    stage.insertBefore(layer, stage.querySelector('.map-debug-layer'));
  }

  function addFenceSegment(group, x0, x1, y0, slope) {
    const posts = 4;
    const yAt = (x) => y0 + (slope * (x - x0));

    [13, 29].forEach((offset) => {
      const rail = svgElement('path', {
        d: `M ${x0} ${yAt(x0) - offset} L ${x1} ${yAt(x1) - offset}`,
        fill: 'none', stroke: '#4d321f', 'stroke-width': 8,
        'stroke-linecap': 'round'
      });
      group.appendChild(rail);
      group.appendChild(svgElement('path', {
        d: `M ${x0 + 2} ${yAt(x0) - offset - 2} L ${x1 - 2} ${yAt(x1) - offset - 2}`,
        fill: 'none', stroke: '#805333', 'stroke-width': 2.4,
        'stroke-linecap': 'round', opacity: .75
      }));
    });

    for (let index = 0; index < posts; index += 1) {
      const x = x0 + ((x1 - x0) * index / (posts - 1));
      const y = yAt(x);
      const post = svgElement('path', {
        d: `M ${x - 5} ${y + 5} L ${x + 5} ${y + 5} L ${x + 4} ${y - 43} L ${x - 4} ${y - 43} Z`,
        fill: '#553722', stroke: '#2b2119', 'stroke-width': 2.5
      });
      group.appendChild(post);
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

    // Two short fence runs make a town-limit threshold while preserving a broad wagon-width opening.
    addFenceSegment(group, 505, 625, 355, -.045);
    addFenceSegment(group, 820, 935, 340, .03);
    layer.appendChild(group);
    stage.insertBefore(layer, stage.querySelector('.map-debug-layer'));
  }

  function mountForArea(stage, areaId) {
    ensureStyles();
    stage.querySelectorAll('.environment-animation-layer, .boundary-overlay-layer').forEach((element) => element.remove());

    if (areaId === 'briarwell-northwest-workshops') {
      mountNorthBoundary(stage);
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
