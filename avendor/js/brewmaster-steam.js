(() => {
  'use strict';

  const AREA_ID = 'briarwell-brewmaster-row';
  const STYLE_ID = 'avendor-brewmaster-still-steam-style';
  const WIDTH = 1448;
  const HEIGHT = 1086;

  // Authored animation zone from the Brewmaster Row geometry pass:
  // x 155..230, y 570..649. Steam rises from the copper still inside this zone.
  const PARTICLES = Object.freeze([
    [174, 622, 34, 52, '4.6s', '-0.6s', '-12px'],
    [184, 612, 42, 64, '5.4s', '-2.1s', '18px'],
    [194, 624, 30, 48, '4.2s', '-3.4s', '-18px'],
    [201, 606, 46, 70, '5.8s', '-4.8s', '13px'],
    [181, 596, 38, 58, '5.0s', '-1.5s', '22px'],
    [208, 616, 32, 50, '4.4s', '-3.0s', '-9px'],
    [190, 602, 44, 66, '5.6s', '-5.2s', '-24px'],
    [214, 594, 36, 56, '4.9s', '-2.8s', '17px'],
    [198, 586, 48, 72, '6.1s', '-5.7s', '8px']
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
        --brewmaster-steam-peak: .50;
      }
      .walk-stage[data-daypart="day"] .environment-animation-layer[data-area-id="${AREA_ID}"] {
        --brewmaster-steam-peak: .44;
      }
      .walk-stage[data-daypart="dawn"] .environment-animation-layer[data-area-id="${AREA_ID}"] {
        --brewmaster-steam-peak: .56;
      }
      .walk-stage[data-daypart="dusk"] .environment-animation-layer[data-area-id="${AREA_ID}"] {
        --brewmaster-steam-peak: .58;
      }
      .walk-stage[data-daypart="night"] .environment-animation-layer[data-area-id="${AREA_ID}"] {
        --brewmaster-steam-peak: .42;
      }
      .brewmaster-still-steam {
        position: absolute;
        border-radius: 50%;
        opacity: 0;
        background: radial-gradient(ellipse at 50% 62%,
          rgba(244,247,244,.72) 0%,
          rgba(225,232,228,.52) 34%,
          rgba(205,216,211,.26) 62%,
          rgba(205,216,211,0) 84%);
        filter: blur(5px);
        animation: avendor-brewmaster-still-steam var(--steam-duration, 5s) ease-out infinite;
        animation-delay: var(--steam-delay, 0s);
        transform-origin: 50% 80%;
        will-change: transform, opacity;
        pointer-events: none;
      }
      @keyframes avendor-brewmaster-still-steam {
        0% {
          opacity: 0;
          transform: translate3d(0, 7px, 0) scale(.46, .58);
        }
        12% {
          opacity: var(--brewmaster-steam-peak);
        }
        52% {
          opacity: calc(var(--brewmaster-steam-peak) * .82);
        }
        78% {
          opacity: calc(var(--brewmaster-steam-peak) * .42);
        }
        100% {
          opacity: 0;
          transform: translate3d(var(--steam-drift, 12px), -112px, 0) scale(1.75, 2.1);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .brewmaster-still-steam { display: none; }
      }
    `;
    document.head.appendChild(style);
  }

  function addParticle(layer, x, y, width, height, duration, delay, drift) {
    const particle = document.createElement('div');
    particle.className = 'brewmaster-still-steam';
    particle.style.left = percent(x, WIDTH);
    particle.style.top = percent(y, HEIGHT);
    particle.style.width = percent(width, WIDTH);
    particle.style.height = percent(height, HEIGHT);
    particle.style.setProperty('--steam-duration', duration);
    particle.style.setProperty('--steam-delay', delay);
    particle.style.setProperty('--steam-drift', drift);
    layer.appendChild(particle);
  }

  function mountSteam(stage) {
    if (stage.dataset.areaId !== AREA_ID) return;
    const layer = stage.querySelector(`.environment-animation-layer[data-area-id="${AREA_ID}"]`);
    if (!layer || layer.dataset.brewmasterSteam === '1') return;

    PARTICLES.forEach((definition) => addParticle(layer, ...definition));
    layer.dataset.brewmasterSteam = '1';
  }

  function observe(stage) {
    const sync = () => requestAnimationFrame(() => mountSteam(stage));
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
