(() => {
  'use strict';

  const replacements = [
    [
      "    hp: b.maxHp,\n    damageFlash: 0,\n    collapsing: false,",
      "    hp: b.maxHp,\n    damageFlash: 0,\n    holes: [],\n    collapsing: false,"
    ],
    [
      "        hp: b.maxHp,\n        damageFlash: 0,\n        collapsing: false,",
      "        hp: b.maxHp,\n        damageFlash: 0,\n        holes: [],\n        collapsing: false,"
    ],
    [
      "    b.hp = Math.max(0, b.hp - damage);\n    b.damageFlash = 0.18;\n    addImpact(hitX, hitY, damage >= 2, true);\n    floaters.push({ x: hitX, y: hitY - 24, text: `BUILDING -${damage}`, life: 0.72 });",
      "    b.hp = Math.max(0, b.hp - damage);\n    b.damageFlash = 0.18;\n\n    const h = GROUND - b.top;\n    const localX = Math.max(-b.w / 2 + 20, Math.min(b.w / 2 - 20, hitX - (b.x + b.w / 2)));\n    const localY = Math.max(-h + 24, Math.min(-26, hitY - GROUND));\n    const radius = 14 + damage * 6 + Math.min(8, impactSpeed / 160);\n    b.holes.push({ x: localX, y: localY, radius, seed: Math.random() * 1000 });\n    if (b.holes.length > 5) b.holes.shift();\n\n    addImpact(hitX, hitY, damage >= 2, true);\n    floaters.push({ x: hitX, y: hitY - 24, text: damage >= 2 ? 'KRAK!' : 'WHUMP!', life: 0.72 });"
    ],
    [
      "    if (!b.collapsed) {\n      const barW = Math.min(110, b.w - 36);\n      ctx.fillStyle = 'rgba(0,0,0,.55)';\n      ctx.fillRect(-barW / 2, -h - 31, barW, 6);\n      ctx.fillStyle = b.hp > b.maxHp / 2 ? '#ffd85a' : '#ff6d5f';\n      ctx.fillRect(-barW / 2, -h - 31, barW * (b.hp / b.maxHp), 6);\n    }",
      "    for (const hole of b.holes || []) {\n      const points = 11;\n\n      ctx.fillStyle = '#5c5b59';\n      ctx.beginPath();\n      for (let i = 0; i < points; i++) {\n        const a = (i / points) * Math.PI * 2;\n        const jag = 0.88 + 0.20 * Math.sin(hole.seed + i * 2.17);\n        const r = hole.radius * 1.24 * jag;\n        const px = hole.x + Math.cos(a) * r;\n        const py = hole.y + Math.sin(a) * r;\n        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);\n      }\n      ctx.closePath();\n      ctx.fill();\n\n      ctx.fillStyle = '#111319';\n      ctx.beginPath();\n      for (let i = 0; i < points; i++) {\n        const a = (i / points) * Math.PI * 2;\n        const jag = 0.78 + 0.18 * Math.cos(hole.seed * 0.7 + i * 1.91);\n        const r = hole.radius * jag;\n        const px = hole.x + Math.cos(a) * r;\n        const py = hole.y + Math.sin(a) * r;\n        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);\n      }\n      ctx.closePath();\n      ctx.fill();\n\n      ctx.strokeStyle = 'rgba(15,16,19,.82)';\n      ctx.lineWidth = 2.2;\n      for (let i = 0; i < 7; i++) {\n        const a = (i / 7) * Math.PI * 2 + hole.seed * 0.013;\n        const inner = hole.radius * 0.92;\n        const outer = hole.radius * (1.45 + 0.35 * Math.abs(Math.sin(hole.seed + i)));\n        ctx.beginPath();\n        ctx.moveTo(hole.x + Math.cos(a) * inner, hole.y + Math.sin(a) * inner);\n        ctx.lineTo(hole.x + Math.cos(a + 0.08) * outer, hole.y + Math.sin(a + 0.08) * outer);\n        ctx.stroke();\n      }\n    }"
    ],
    [
      "  function drawBackground() {",
      "  function drawCityDepthLayer(factor, baseline, slotW, minH, maxH, fill, windowAlpha, salt) {\n    const parallax = cameraX * factor;\n    const start = Math.floor((parallax - 260) / slotW);\n    const end = Math.ceil((parallax + W + 260) / slotW);\n\n    for (let i = start; i <= end; i++) {\n      const x = i * slotW - parallax;\n      const width = slotW * (0.68 + pseudoRandom(i, salt + 1) * 0.24);\n      const height = minH + pseudoRandom(i, salt + 2) * (maxH - minH);\n      const top = baseline - height;\n\n      ctx.fillStyle = fill;\n      ctx.fillRect(x, top, width, height);\n\n      if (pseudoRandom(i, salt + 3) > 0.68) {\n        const roofW = width * 0.25;\n        ctx.fillRect(x + width * 0.37, top - 13, roofW, 13);\n      }\n\n      if (pseudoRandom(i, salt + 4) > 0.72) {\n        ctx.strokeStyle = fill;\n        ctx.lineWidth = 2;\n        ctx.beginPath();\n        ctx.moveTo(x + width * 0.55, top);\n        ctx.lineTo(x + width * 0.55, top - 24 - pseudoRandom(i, salt + 5) * 24);\n        ctx.stroke();\n      }\n\n      ctx.fillStyle = `rgba(245,216,139,${windowAlpha})`;\n      const stepX = Math.max(22, width / 4);\n      for (let wx = x + 12; wx < x + width - 8; wx += stepX) {\n        for (let wy = top + 20; wy < baseline - 16; wy += 34) {\n          if (pseudoRandom(Math.floor(wx * 0.7 + wy), i + salt) > 0.62) ctx.fillRect(wx, wy, 7, 10);\n        }\n      }\n    }\n  }\n\n  function drawBackground() {"
    ],
    [
      "    const parallax = cameraX * 0.24;",
      "    drawCityDepthLayer(0.055, GROUND - 36, 86, 90, 230, '#242c40', 0.045, 11);\n    drawCityDepthLayer(0.11, GROUND - 22, 104, 110, 290, '#293143', 0.06, 23);\n    drawCityDepthLayer(0.17, GROUND - 10, 126, 125, 350, '#303646', 0.075, 37);\n\n    const parallax = cameraX * 0.24;"
    ]
  ];

  async function boot() {
    const response = await fetch('city2.js?rev=0.6.1', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load City 2 core (${response.status})`);

    let source = await response.text();
    for (const [from, to] of replacements) {
      if (!source.includes(from)) {
        throw new Error(`City 2 visual patch target not found: ${from.slice(0, 72)}`);
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
      throw new Error('Could not start City 2');
    };
    document.body.appendChild(script);
  }

  boot().catch(error => {
    console.error(error);
    const card = document.querySelector('#title-screen .card');
    if (card) {
      const notice = document.createElement('p');
      notice.className = 'premise';
      notice.textContent = 'City 2 failed to deploy. Refresh to redeploy Johnny.';
      card.appendChild(notice);
    }
  });
})();
