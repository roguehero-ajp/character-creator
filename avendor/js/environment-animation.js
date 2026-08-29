(() => {
  'use strict';

  const STYLE_ID = 'avendor-environment-animation-style';
  const WIDTH = 1448;
  const HEIGHT = 1086;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const DOCKS_ART = 'assets/maps/briarwell/docks/background/briarwell-docks-v1.png';

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .environment-animation-layer,
      .boundary-overlay-layer,
      .dock-boat-copy {
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
        --dock-smoke-peak: .24;
      }
      .walk-stage[data-daypart="day"] .environment-animation-layer {
        --forge-pulse-min: .36;
        --forge-pulse-max: .62;
        --forge-core-min: .58;
        --forge-core-max: .88;
        --forge-smoke-peak: .24;
        --dock-light-alpha: .12;
        --dock-water-alpha: .12;
        --dock-mist-alpha: .012;
        --dock-smoke-peak: .20;
      }
      .walk-stage[data-daypart="dawn"] .environment-animation-layer {
        --forge-pulse-min: .50;
        --forge-pulse-max: .82;
        --forge-core-min: .70;
        --forge-core-max: .96;
        --forge-smoke-peak: .27;
        --dock-light-alpha: .34;
        --dock-water-alpha: .17;
        --dock-mist-alpha: .105;
        --dock-smoke-peak: .27;
      }
      .walk-stage[data-daypart="dusk"] .environment-animation-layer {
        --forge-pulse-min: .58;
        --forge-pulse-max: .92;
        --forge-core-min: .76;
        --forge-core-max: 1;
        --forge-smoke-peak: .30;
        --dock-light-alpha: .56;
        --dock-water-alpha: .22;
        --dock-mist-alpha: .045;
        --dock-smoke-peak: .25;
      }
      .walk-stage[data-daypart="night"] .environment-animation-layer {
        --forge-pulse-min: .78;
        --forge-pulse-max: 1;
        --forge-core-min: .90;
        --forge-core-max: 1;
        --forge-smoke-peak: .22;
        --dock-light-alpha: .88;
        --dock-water-alpha: .29;
        --dock-mist-alpha: .085;
        --dock-smoke-peak: .18;
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
      .environment-animation-layer .forge-smoke,
      .environment-animation-layer .dock-smoke {
        position: absolute;
        border-radius: 50%;
        opacity: 0;
      }
      .environment-animation-layer .forge-smoke {
        background: radial-gradient(circle, rgba(82,78,76,.34), rgba(82,78,76,.14) 58%, rgba(82,78,76,0) 76%);
        filter: blur(5px);
        animation: avendor-smoke-rise var(--smoke-duration, 5.5s) ease-out infinite;
        animation-delay: var(--smoke-delay, 0s);
      }
      .environment-animation-layer .dock-smoke {
        background: radial-gradient(circle, rgba(92,96,101,.34), rgba(80,87,94,.13) 58%, rgba(70,78,86,0) 78%);
        filter: blur(7px);
        animation: avendor-dock-smoke var(--smoke-duration, 7s) ease-out infinite;
        animation-delay: var(--smoke-delay, 0s);
      }

      .environment-animation-layer .dock-water-zone {
        position: absolute;
        inset: 0;
        opacity: var(--dock-water-alpha);
        mix-blend-mode: screen;
        background:
          repeating-linear-gradient(164deg, transparent 0 19px, rgba(205,229,241,.30) 20px 22px, transparent 23px 49px),
          repeating-linear-gradient(8deg, transparent 0 31px, rgba(135,176,198,.16) 32px 34px, transparent 35px 66px);
        background-size: 210% 160%, 170% 130%;
        filter: blur(.45px);
        animation: avendor-water-shimmer var(--water-duration, 8s) linear infinite;
        animation-delay: var(--water-delay, 0s);
      }
      .environment-animation-layer .dock-water-ripple {
        position: absolute;
        border: 2px solid rgba(191,221,234,.54);
        border-left-color: transparent;
        border-right-color: transparent;
        border-radius: 50%;
        opacity: 0;
        transform: translate(-50%, -50%) scale(.65,.42);
        animation: avendor-water-ripple var(--ripple-duration, 4.6s) ease-out infinite;
        animation-delay: var(--ripple-delay, 0s);
        filter: blur(.25px);
      }
      .environment-animation-layer .dock-lantern-glow {
        position: absolute;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        background: radial-gradient(circle, rgba(255,226,146,.94) 0%, rgba(255,171,64,.42) 22%, rgba(240,112,30,.15) 48%, rgba(240,112,30,0) 74%);
        mix-blend-mode: screen;
        opacity: var(--dock-light-alpha);
        filter: blur(4px);
        animation: avendor-lantern-breathe var(--light-duration, 3.8s) ease-in-out infinite alternate;
        animation-delay: var(--light-delay, 0s);
      }
      .environment-animation-layer .dock-mist {
        position: absolute;
        border-radius: 50%;
        background: radial-gradient(ellipse at center, rgba(205,221,232,.54), rgba(171,197,213,.18) 52%, rgba(160,190,209,0) 78%);
        filter: blur(18px);
        opacity: var(--dock-mist-alpha);
        animation: avendor-dock-mist var(--mist-duration, 12s) ease-in-out infinite alternate;
        animation-delay: var(--mist-delay, 0s);
      }

      .dock-boat-copy {
        background-image: url('${DOCKS_ART}');
        background-repeat: no-repeat;
        background-size: 100% 100%;
        will-change: transform;
      }
      .dock-boat-copy[data-boat="central"] {
        clip-path: polygon(54.2% 57.0%, 72.6% 56.2%, 77.0% 62.6%, 74.8% 72.3%, 67.5% 75.7%, 58.2% 73.9%, 53.5% 67.2%);
        transform-origin: 65% 68%;
        animation: avendor-boat-central 5.6s ease-in-out infinite alternate;
      }
      .dock-boat-copy[data-boat="west"] {
        clip-path: polygon(11.4% 71.2%, 23.8% 69.8%, 28.4% 75.1%, 27.8% 86.2%, 21.0% 90.8%, 13.4% 88.2%, 10.5% 79.8%);
        transform-origin: 20% 82%;
        animation: avendor-boat-west 6.4s ease-in-out infinite alternate;
        animation-delay: -2.1s;
      }
      .walk-stage[data-daypart="day"] .dock-boat-copy {
        filter: brightness(1.15) saturate(.90) contrast(.96) hue-rotate(-3deg);
      }
      .walk-stage[data-daypart="dawn"] .dock-boat-copy {
        filter: brightness(.98) saturate(.89) contrast(.97) hue-rotate(-7deg);
      }
      .walk-stage[data-daypart="dusk"] .dock-boat-copy { filter: none; }
      .walk-stage[data-daypart="night"] .dock-boat-copy {
        filter: brightness(.58) saturate(.72) contrast(1.04) hue-rotate(9deg);
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
      @keyframes avendor-dock-smoke {
        0% { opacity: 0; transform: translate(0, 0) scale(.6); }
        18% { opacity: var(--dock-smoke-peak); }
        70% { opacity: calc(var(--dock-smoke-peak) * .55); }
        100% { opacity: 0; transform: translate(var(--smoke-drift, -38px), -118px) scale(1.9); }
      }
      @keyframes avendor-water-shimmer {
        from { background-position: 0 0, 0 0; }
        to { background-position: -210px 82px, 160px -48px; }
      }
      @keyframes avendor-water-ripple {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(.55,.34); }
        22% { opacity: calc(var(--dock-water-alpha) * 1.8); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(1.24,.66); }
      }
      @keyframes avendor-lantern-breathe {
        from { transform: translate(-50%, -50%) scale(.96); }
        to { transform: translate(-50%, -50%) scale(1.035); }
      }
      @keyframes avendor-dock-mist {
        from { transform: translate3d(-12px, 2px, 0) scale(.96); }
        to { transform: translate3d(18px, -3px, 0) scale(1.04); }
      }
      @keyframes avendor-boat-central {
        from { transform: translate3d(0, 1px, 0) rotate(-.14deg); }
        to { transform: translate3d(0, -2px, 0) rotate(.16deg); }
      }
      @keyframes avendor-boat-west {
        from { transform: translate3d(0, 1.5px, 0) rotate(.16deg); }
        to { transform: translate3d(0, -2.2px, 0) rotate(-.18deg); }
      }

      @media (prefers-reduced-motion: reduce) {
        .environment-animation-layer *,
        .dock-boat-copy { animation: none !important; }
        .environment-animation-layer .forge-glow { opacity: var(--forge-pulse-min); }
        .environment-animation-layer .forge-core { opacity: var(--forge-core-min); }
        .environment-animation-layer .forge-ember,
        .environment-animation-layer .forge-smoke,
        .environment-animation-layer .dock-smoke,
        .environment-animation-layer .dock-mist { display: none; }
        .environment-animation-layer .dock-water-ripple { opacity: 0; }
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

  function addWaterZone(layer, clipPath, duration, delay) {
    const zone = document.createElement('div');
    zone.className = 'dock-water-zone';
    zone.style.clipPath = clipPath;
    zone.style.setProperty('--water-duration', duration);
    zone.style.setProperty('--water-delay', delay);
    layer.appendChild(zone);
  }

  function mountDockBoatCopy(stage, boat, zIndex) {
    const copy = document.createElement('div');
    copy.className = 'dock-boat-copy';
    copy.dataset.areaId = 'briarwell-docks';
    copy.dataset.boat = boat;
    copy.setAttribute('aria-hidden', 'true');
    copy.style.zIndex = String(zIndex);
    stage.insertBefore(copy, stage.querySelector('.map-debug-layer'));
  }

  function mountDocks(stage, layer) {
    addWaterZone(layer, 'polygon(0% 64%, 18% 63%, 13% 72%, 12% 85%, 34% 100%, 0% 100%)', '8.8s', '-2.4s');
    addWaterZone(layer, 'polygon(39% 58%, 55% 58%, 67% 72%, 80% 100%, 66% 100%, 54% 84%, 42% 76%)', '7.2s', '-4.1s');
    addWaterZone(layer, 'polygon(66% 61%, 83% 61%, 100% 65%, 100% 100%, 76% 100%, 71% 85%, 62% 76%)', '9.6s', '-1.2s');

    addParticle(layer, 'dock-water-ripple', 286, 920, 238, 78, {
      '--ripple-duration': '5.2s', '--ripple-delay': '-1.8s'
    });
    addParticle(layer, 'dock-water-ripple', 930, 792, 310, 88, {
      '--ripple-duration': '4.6s', '--ripple-delay': '-3.1s'
    });
    addParticle(layer, 'dock-water-ripple', 1118, 705, 210, 62, {
      '--ripple-duration': '5.8s', '--ripple-delay': '-.7s'
    });

    [
      [88, 278, 92, 92, '4.6s', '-1.1s'],
      [614, 281, 84, 86, '4.1s', '-2.2s'],
      [463, 873, 122, 132, '3.8s', '-.6s'],
      [1014, 353, 118, 112, '4.3s', '-1.9s'],
      [1142, 270, 146, 124, '4.8s', '-2.7s'],
      [1174, 360, 110, 104, '4.4s', '-.9s']
    ].forEach(([x, y, width, height, duration, delay]) => {
      addParticle(layer, 'dock-lantern-glow', x, y, width, height, {
        '--light-duration': duration,
        '--light-delay': delay
      });
    });

    [
      [1366, 112, 58, 44, '7.3s', '-1.2s', '-42px'],
      [1378, 102, 72, 54, '8.4s', '-4.7s', '-54px'],
      [1354, 124, 46, 38, '6.8s', '-3.0s', '-32px']
    ].forEach(([x, y, width, height, duration, delay, drift]) => {
      addParticle(layer, 'dock-smoke', x, y, width, height, {
        '--smoke-duration': duration,
        '--smoke-delay': delay,
        '--smoke-drift': drift
      });
    });

    addParticle(layer, 'dock-mist', 265, 868, 520, 150, {
      '--mist-duration': '13.5s', '--mist-delay': '-5.2s'
    });
    addParticle(layer, 'dock-mist', 1030, 880, 700, 176, {
      '--mist-duration': '15.2s', '--mist-delay': '-2.6s'
    });

    mountDockBoatCopy(stage, 'central', 1812);
    mountDockBoatCopy(stage, 'west', 1978);
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
    stage.querySelectorAll('.environment-animation-layer, .boundary-overlay-layer, .dock-boat-copy').forEach((element) => element.remove());

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
