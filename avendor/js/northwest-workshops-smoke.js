(() => {
  'use strict';

  const AREA_ID = 'briarwell-northwest-workshops';
  const STYLE_ID = 'avendor-northwest-workshops-heavy-smoke-style';
  const WIDTH = 1448;
  const HEIGHT = 1086;

  // Authored animation zone from the Northwest Workshops geometry pass:
  // x 315..421, y 2..44. Particles originate inside/around that chimney zone.
  const PARTICLES = Object.freeze([
    [326, 34, 82, 62, '4.8s', '-0.4s', '-52px'],
    [338, 26, 104, 78, '5.6s', '-1.8s', '38px'],
    [348, 38, 92, 70, '5.1s', '-3.5s', '-26px'],
    [356, 20, 118, 88, '6.4s', '-4.9s', '56px'],
    [366, 33, 86, 66, '4.6s', '-2.7s', '-44px'],
    [374, 18, 110, 82, '5.9s', '-5.7s', '24px'],
    [382, 36, 96, 74, '5.0s', '-1.1s', '64px'],
    [390, 24, 122, 92, '6.8s', '-6.2s', '-34px'],
    [344, 42, 76, 58, '4.4s', '-3.9s', '18px'],
    [360, 30, 100, 76, '5.3s', '-2.2s', '-60px'],
    [378, 28, 114, 86, '6.1s', '-4.4s', '46px'],
    [352, 16, 128, 96, '7.0s', '-6.6s', '-18px']
  ]);

  function percent(value, span) {
    return `${((value / span) * 100).toFixed(3)}%`;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .environment-animation-layer[data-area-id="${AREA_ID}"] {
        --blacksmith-heavy-smoke-peak: .82;
      }
      .walk-stage[data-daypart="day"] .environment-animation-layer[data-area-id="${AREA_ID}"] {
        --blacksmith-heavy-smoke-peak: .74;
      }
      .walk-stage[data-daypart="dawn"] .environment-animation-layer[data-area-id="${AREA_ID}"] {
        --blacksmith-heavy-smoke-peak: .86;
      }
      .walk-stage[data-daypart="dusk"] .environment-animation-layer[data-area-id="${AREA_ID}"] {
        --blacksmith-heavy-smoke-peak: .90;
      }
      .walk-stage[data-daypart="night"] .environment-animation-layer[data-area-id="${AREA_ID}"] {
        --blacksmith-heavy-smoke-peak: .68;
      }
      .forge-smoke-heavy {
        position: absolute;
        border-radius: 48% 52% 54% 46%;
        opacity: 0;
        background: radial-gradient(circle at 44% 58%,
          rgba(45,43,42,.82) 0%,
          rgba(58,55,54,.72) 32%,
          rgba(78,74,72,.50) 55%,
          rgba(92,88,86,.20) 72%,
          rgba(92,88,86,0) 86%);
        filter: blur(7px);
        animation: avendor-blacksmith-heavy-smoke var(--smoke-duration, 5.4s) ease-out infinite;
        animation-delay: var(--smoke-delay, 0s);
        will-change: transform, opacity;
      }
      @keyframes avendor-blacksmith-heavy-smoke {
        0% {
          opacity: 0;
          transform: translate3d(0, 8px, 0) scale(.52);
        }
        8% {
          opacity: var(--blacksmith-heavy-smoke-peak);
        }
        58% {
          opacity: calc(var(--blacksmith-heavy-smoke-peak) * .88);
        }
        82% {
          opacity: calc(var(--blacksmith-heavy-smoke-peak) * .56);
        }
        100% {
          opacity: 0;
          transform: translate3d(var(--smoke-drift, 36px), -188px, 0) scale(2.35);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .forge-smoke-heavy { display: none; }
      }
    `;
    document.head.appendChild(style);
  }

  function addParticle(layer, x, y, width, height, duration, delay, drift) {
    const particle = document.createElement('div');
    particle.className = 'forge-smoke-heavy';
    particle.style.left = percent(x, WIDTH);
    particle.style.top = percent(y, HEIGHT);
    particle.style.width = percent(width, WIDTH);
    particle.style.height = percent(height, HEIGHT);
    particle.style.setProperty('--smoke-duration', duration);
    particle.style.setProperty('--smoke-delay', delay);
    particle.style.setProperty('--smoke-drift', drift);
    layer.appendChild(particle);
  }

  function mountHeavySmoke(stage) {
    if (stage.dataset.areaId !== AREA_ID) return;
    const layer = stage.querySelector(`.environment-animation-layer[data-area-id="${AREA_ID}"]`);
    if (!layer || layer.dataset.heavyBlacksmithSmoke === '1') return;

    // Replace the older polite chimney wisps with the authored heavy-smoke treatment.
    layer.querySelectorAll('.forge-smoke').forEach((particle) => particle.remove());
    PARTICLES.forEach((definition) => addParticle(layer, ...definition));
    layer.dataset.heavyBlacksmithSmoke = '1';
  }

  function observe(stage) {
    const sync = () => requestAnimationFrame(() => mountHeavySmoke(stage));
    new MutationObserver(sync).observe(stage, {
      attributes: true,
      attributeFilter: ['data-area-id'],
      childList: true
    });
    sync();
  }

  ensureStyles();
  const stage = document.getElementById('walk-stage');
  if (stage) observe(stage);
})();
