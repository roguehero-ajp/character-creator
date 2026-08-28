(() => {
  'use strict';

  const STYLE_ID = 'avendor-environment-animation-style';
  const WIDTH = 1448;
  const HEIGHT = 1086;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .environment-animation-layer {
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
      @keyframes avendor-forge-pulse {
        from { opacity: .58; transform: translate(-50%, -50%) scale(.94); }
        to { opacity: .92; transform: translate(-50%, -50%) scale(1.06); }
      }
      @keyframes avendor-forge-core {
        from { opacity: .76; transform: translate(-50%, -50%) scale(.88,.96) rotate(-1deg); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1.06,1.04) rotate(1deg); }
      }
      @keyframes avendor-ember-rise {
        0% { opacity: 0; transform: translate(0, 0) scale(.65); }
        15% { opacity: .95; }
        75% { opacity: .45; }
        100% { opacity: 0; transform: translate(var(--ember-drift, 10px), -58px) scale(.15); }
      }
      @keyframes avendor-smoke-rise {
        0% { opacity: 0; transform: translate(0, 0) scale(.65); }
        16% { opacity: .30; }
        72% { opacity: .15; }
        100% { opacity: 0; transform: translate(var(--smoke-drift, 20px), -120px) scale(1.75); }
      }
      @media (prefers-reduced-motion: reduce) {
        .environment-animation-layer * { animation: none !important; }
        .environment-animation-layer .forge-glow { opacity: .66; }
        .environment-animation-layer .forge-core { opacity: .78; }
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

  function mountNorthwestForge(layer) {
    addParticle(layer, 'forge-glow', 588, 506, 180, 128);
    addParticle(layer, 'forge-core', 590, 518, 72, 52);

    [
      [566, 500, '1.45s', '-.25s', '-12px'],
      [588, 493, '1.72s', '-.9s', '8px'],
      [608, 503, '1.56s', '-.55s', '14px'],
      [598, 488, '1.95s', '-1.35s', '-6px']
    ].forEach(([x, y, duration, delay, drift]) => {
      addParticle(layer, 'forge-ember', x, y, 0, 0, {
        '--ember-duration': duration,
        '--ember-delay': delay,
        '--ember-drift': drift
      });
    });

    [
      [576, 478, 54, 42, '5.1s', '-1.3s', '-18px'],
      [598, 468, 68, 52, '6.2s', '-3.8s', '24px'],
      [612, 482, 46, 38, '5.6s', '-.4s', '12px']
    ].forEach(([x, y, width, height, duration, delay, drift]) => {
      addParticle(layer, 'forge-smoke', x, y, width, height, {
        '--smoke-duration': duration,
        '--smoke-delay': delay,
        '--smoke-drift': drift
      });
    });
  }

  function mountForArea(stage, areaId) {
    ensureStyles();
    stage.querySelectorAll('.environment-animation-layer').forEach((element) => element.remove());
    if (areaId !== 'briarwell-northwest-workshops') return null;

    const layer = document.createElement('div');
    layer.className = 'environment-animation-layer';
    layer.dataset.areaId = areaId;
    layer.setAttribute('aria-hidden', 'true');
    layer.style.zIndex = '900';
    stage.insertBefore(layer, stage.querySelector('.map-debug-layer'));
    mountNorthwestForge(layer);
    return layer;
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
