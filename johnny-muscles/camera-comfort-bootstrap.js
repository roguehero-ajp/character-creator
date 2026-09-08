(() => {
  'use strict';

  const city2 = /(?:^|\/)city2\.html$/.test(location.pathname);
  const downstream = city2
    ? 'city2-visual-bootstrap.js?rev=0.7.0'
    : 'game-character-bootstrap.js?rev=0.7.0';

  const target = city2
    ? "    let source = await response.text();"
    : "    const source = patchJohnny(await response.text());";

  const replacement = city2
    ? "    let source = (await response.text()).replace('const AIM_CAMERA_BACK = 450;', 'const AIM_CAMERA_BACK = 600;');"
    : "    const source = patchJohnny((await response.text()).replace('const AIM_CAMERA_BACK = 450;', 'const AIM_CAMERA_BACK = 600;'));";

  async function boot() {
    const response = await fetch(downstream, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load Johnny bootstrap (${response.status})`);

    let source = await response.text();
    if (!source.includes(target)) {
      throw new Error('600-unit camera patch target not found');
    }
    source = source.replace(target, replacement);

    const blob = new Blob([source], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => URL.revokeObjectURL(url);
    script.onerror = () => {
      URL.revokeObjectURL(url);
      throw new Error('Could not deploy 600-unit camera comfort pass');
    };
    document.body.appendChild(script);
  }

  boot().catch(error => {
    console.error(error);
    const card = document.querySelector('#title-screen .card');
    if (card) {
      const notice = document.createElement('p');
      notice.className = 'premise';
      notice.textContent = 'Camera comfort pass failed to load. Refresh to redeploy Johnny.';
      card.appendChild(notice);
    }
  });
})();
