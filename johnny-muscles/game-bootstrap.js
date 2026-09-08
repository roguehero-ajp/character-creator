(() => {
  'use strict';

  const replacements = [
    ['const AIM_CAMERA_BACK = 160;', 'const AIM_CAMERA_BACK = 300;'],
    ['const CAMERA_EASE = 8.5;', 'const CAMERA_EASE = 10.5;'],
    [
      'const ratio = Math.min(1, pull / MAX_PULL);\n      target = -AIM_CAMERA_BACK * (0.35 + 0.65 * ratio);',
      'const ratio = Math.min(1, pull / MAX_PULL);\n      const earlyPull = Math.sqrt(ratio);\n      target = -AIM_CAMERA_BACK * (0.30 + 0.70 * earlyPull);'
    ]
  ];

  async function boot() {
    const response = await fetch('game.js?rev=0.4.1', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load game.js (${response.status})`);

    let source = await response.text();

    for (const [from, to] of replacements) {
      if (!source.includes(from)) {
        throw new Error(`Aiming comfort patch target not found: ${from.slice(0, 48)}`);
      }
      source = source.replace(from, to);
    }

    const blob = new Blob([source], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => URL.revokeObjectURL(url);
    script.onerror = () => {
      URL.revokeObjectURL(url);
      throw new Error('Could not start Johnny Muscles');
    };
    document.body.appendChild(script);
  }

  boot().catch(error => {
    console.error(error);
    const card = document.querySelector('#title-screen .card');
    if (card) {
      const notice = document.createElement('p');
      notice.className = 'premise';
      notice.textContent = 'Prototype failed to load. Refresh to redeploy Johnny.';
      card.appendChild(notice);
    }
  });
})();
