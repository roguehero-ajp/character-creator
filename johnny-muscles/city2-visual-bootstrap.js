(() => {
  'use strict';

  const JOHNNY_RENDER = String.raw`  function drawJohnny() {
    const x = 142;
    const y = GROUND - 31 + johnny.squat * 18;
    const lean = johnny.torsoLean;
    const torsoShift = lean * 46;
    const skin = '#d99a6c';
    const skinShade = '#b87350';
    const jeans = '#315f98';
    const jeansShade = '#244870';
    const black = '#15171b';
    const red = '#c9342e';

    function muscleArm(baseX, baseY, upperLen, foreLen, angle, bend, upperWidth = 30, foreWidth = 25) {
      const elbowX = baseX + Math.cos(angle) * upperLen;
      const elbowY = baseY + Math.sin(angle) * upperLen;
      const foreAngle = angle + bend;
      const handX = elbowX + Math.cos(foreAngle) * foreLen;
      const handY = elbowY + Math.sin(foreAngle) * foreLen;

      ctx.strokeStyle = skinShade;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = upperWidth + 5;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(elbowX, elbowY);
      ctx.stroke();

      ctx.strokeStyle = skin;
      ctx.lineWidth = upperWidth;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(elbowX, elbowY);
      ctx.stroke();

      ctx.strokeStyle = skinShade;
      ctx.lineWidth = foreWidth + 5;
      ctx.beginPath();
      ctx.moveTo(elbowX, elbowY);
      ctx.lineTo(handX, handY);
      ctx.stroke();

      ctx.strokeStyle = skin;
      ctx.lineWidth = foreWidth;
      ctx.beginPath();
      ctx.moveTo(elbowX, elbowY);
      ctx.lineTo(handX, handY);
      ctx.stroke();

      ctx.fillStyle = black;
      ctx.beginPath();
      ctx.ellipse(handX, handY, 15, 13, foreAngle, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b2d33';
      ctx.fillRect(handX - 9, handY - 4, 18, 6);
    }

    ctx.save();
    ctx.translate(x, y);

    if (steroidTimer > 0) {
      ctx.shadowColor = '#a8ff58';
      ctx.shadowBlur = 24 + Math.sin(elapsed * 12) * 8;
    }

    const squatDrop = johnny.squat * 13;

    ctx.fillStyle = jeansShade;
    ctx.beginPath();
    ctx.moveTo(-48, -75 + squatDrop);
    ctx.lineTo(-7, -72 + squatDrop);
    ctx.lineTo(-13, -8 + squatDrop);
    ctx.lineTo(-58, -8 + squatDrop);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(7, -72 + squatDrop);
    ctx.lineTo(48, -75 + squatDrop);
    ctx.lineTo(58, -8 + squatDrop);
    ctx.lineTo(13, -8 + squatDrop);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = jeans;
    ctx.beginPath();
    ctx.moveTo(-43, -72 + squatDrop);
    ctx.lineTo(-8, -70 + squatDrop);
    ctx.lineTo(-15, -10 + squatDrop);
    ctx.lineTo(-52, -10 + squatDrop);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -70 + squatDrop);
    ctx.lineTo(43, -72 + squatDrop);
    ctx.lineTo(52, -10 + squatDrop);
    ctx.lineTo(15, -10 + squatDrop);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = black;
    ctx.fillRect(-59, -14 + squatDrop, 48, 19);
    ctx.fillRect(11, -14 + squatDrop, 48, 19);
    ctx.fillStyle = '#292b30';
    ctx.fillRect(-61, 1 + squatDrop, 52, 9);
    ctx.fillRect(9, 1 + squatDrop, 52, 9);

    ctx.fillStyle = '#17191d';
    ctx.fillRect(-47, -79 + squatDrop, 94, 10);
    ctx.fillStyle = '#a4a5a6';
    ctx.fillRect(-9, -82 + squatDrop, 18, 16);
    ctx.fillStyle = '#202226';
    ctx.fillRect(-5, -78 + squatDrop, 10, 8);

    muscleArm(-42 + torsoShift * 0.45, -130, 48, 38, -2.34 - lean * 0.45, 0.62, 31, 26);

    ctx.save();
    ctx.translate(torsoShift, 0);
    ctx.rotate(lean);

    ctx.fillStyle = skinShade;
    ctx.beginPath();
    ctx.moveTo(-61, -143);
    ctx.bezierCurveTo(-75, -127, -64, -88, -34, -76);
    ctx.lineTo(-26, -66);
    ctx.lineTo(26, -66);
    ctx.lineTo(34, -76);
    ctx.bezierCurveTo(64, -88, 75, -127, 61, -143);
    ctx.bezierCurveTo(38, -164, -38, -164, -61, -143);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-57, -146);
    ctx.bezierCurveTo(-69, -128, -58, -94, -31, -82);
    ctx.lineTo(-23, -69);
    ctx.lineTo(23, -69);
    ctx.lineTo(31, -82);
    ctx.bezierCurveTo(58, -94, 69, -128, 57, -146);
    ctx.bezierCurveTo(34, -161, -34, -161, -57, -146);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = skinShade;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-46, -126);
    ctx.quadraticCurveTo(-24, -139, 0, -124);
    ctx.quadraticCurveTo(24, -139, 46, -126);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -126);
    ctx.lineTo(0, -78);
    ctx.stroke();
    for (const yy of [-108, -93, -79]) {
      ctx.beginPath();
      ctx.moveTo(-16, yy);
      ctx.quadraticCurveTo(0, yy + 5, 16, yy);
      ctx.stroke();
    }

    muscleArm(43, -132, 59, 50, johnny.armAngle, 0.42, 34, 28);

    ctx.fillStyle = skinShade;
    ctx.fillRect(-18, -174, 36, 28);
    ctx.fillStyle = skin;
    ctx.fillRect(-14, -174, 28, 27);

    ctx.fillStyle = skinShade;
    ctx.beginPath();
    ctx.moveTo(-27, -202);
    ctx.quadraticCurveTo(-31, -177, -19, -160);
    ctx.lineTo(0, -153);
    ctx.lineTo(19, -160);
    ctx.quadraticCurveTo(31, -177, 27, -202);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-24, -202);
    ctx.quadraticCurveTo(-27, -179, -17, -163);
    ctx.lineTo(0, -157);
    ctx.lineTo(17, -163);
    ctx.quadraticCurveTo(27, -179, 24, -202);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#3b241c';
    ctx.beginPath();
    ctx.moveTo(-25, -201);
    ctx.lineTo(-18, -218);
    ctx.lineTo(-8, -208);
    ctx.lineTo(0, -222);
    ctx.lineTo(8, -208);
    ctx.lineTo(20, -219);
    ctx.lineTo(26, -199);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = red;
    ctx.fillRect(-29, -201, 58, 9);
    ctx.beginPath();
    ctx.moveTo(-27, -195);
    ctx.lineTo(-58, -188);
    ctx.lineTo(-39, -181);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-25, -193);
    ctx.lineTo(-51, -170);
    ctx.lineTo(-32, -178);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0d0f12';
    ctx.fillRect(-23, -189, 20, 11);
    ctx.fillRect(3, -189, 20, 11);
    ctx.fillRect(-4, -186, 8, 3);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(-20, -187, 7, 2);
    ctx.fillRect(6, -187, 7, 2);

    ctx.strokeStyle = '#7e4938';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-8, -168);
    ctx.quadraticCurveTo(1, -163, 10, -169);
    ctx.stroke();

    ctx.strokeStyle = '#555c63';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -151);
    ctx.lineTo(-2, -126);
    ctx.lineTo(9, -151);
    ctx.stroke();
    ctx.fillStyle = '#aeb4b8';
    ctx.fillRect(-6, -128, 12, 16);
    ctx.fillStyle = '#666c70';
    ctx.fillRect(-3, -125, 6, 3);

    ctx.restore();
    ctx.restore();
  }`;

  const replacements = [
    ["    hp: b.maxHp,\n    damageFlash: 0,\n    collapsing: false,", "    hp: b.maxHp,\n    damageFlash: 0,\n    holes: [],\n    collapsing: false,"],
    ["        hp: b.maxHp,\n        damageFlash: 0,\n        collapsing: false,", "        hp: b.maxHp,\n        damageFlash: 0,\n        holes: [],\n        collapsing: false,"],
    ["    b.hp = Math.max(0, b.hp - damage);\n    b.damageFlash = 0.18;\n    addImpact(hitX, hitY, damage >= 2, true);\n    floaters.push({ x: hitX, y: hitY - 24, text: `BUILDING -${damage}`, life: 0.72 });", "    b.hp = Math.max(0, b.hp - damage);\n    b.damageFlash = 0.18;\n\n    const h = GROUND - b.top;\n    const localX = Math.max(-b.w / 2 + 20, Math.min(b.w / 2 - 20, hitX - (b.x + b.w / 2)));\n    const localY = Math.max(-h + 24, Math.min(-26, hitY - GROUND));\n    const radius = 14 + damage * 6 + Math.min(8, impactSpeed / 160);\n    b.holes.push({ x: localX, y: localY, radius, seed: Math.random() * 1000 });\n    if (b.holes.length > 5) b.holes.shift();\n\n    addImpact(hitX, hitY, damage >= 2, true);\n    floaters.push({ x: hitX, y: hitY - 24, text: damage >= 2 ? 'KRAK!' : 'WHUMP!', life: 0.72 });"],
    ["    if (!b.collapsed) {\n      const barW = Math.min(110, b.w - 36);\n      ctx.fillStyle = 'rgba(0,0,0,.55)';\n      ctx.fillRect(-barW / 2, -h - 31, barW, 6);\n      ctx.fillStyle = b.hp > b.maxHp / 2 ? '#ffd85a' : '#ff6d5f';\n      ctx.fillRect(-barW / 2, -h - 31, barW * (b.hp / b.maxHp), 6);\n    }", "    for (const hole of b.holes || []) {\n      const points = 11;\n\n      ctx.fillStyle = '#5c5b59';\n      ctx.beginPath();\n      for (let i = 0; i < points; i++) {\n        const a = (i / points) * Math.PI * 2;\n        const jag = 0.88 + 0.20 * Math.sin(hole.seed + i * 2.17);\n        const r = hole.radius * 1.24 * jag;\n        const px = hole.x + Math.cos(a) * r;\n        const py = hole.y + Math.sin(a) * r;\n        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);\n      }\n      ctx.closePath();\n      ctx.fill();\n\n      ctx.fillStyle = '#111319';\n      ctx.beginPath();\n      for (let i = 0; i < points; i++) {\n        const a = (i / points) * Math.PI * 2;\n        const jag = 0.78 + 0.18 * Math.cos(hole.seed * 0.7 + i * 1.91);\n        const r = hole.radius * jag;\n        const px = hole.x + Math.cos(a) * r;\n        const py = hole.y + Math.sin(a) * r;\n        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);\n      }\n      ctx.closePath();\n      ctx.fill();\n\n      ctx.strokeStyle = 'rgba(15,16,19,.82)';\n      ctx.lineWidth = 2.2;\n      for (let i = 0; i < 7; i++) {\n        const a = (i / 7) * Math.PI * 2 + hole.seed * 0.013;\n        const inner = hole.radius * 0.92;\n        const outer = hole.radius * (1.45 + 0.35 * Math.abs(Math.sin(hole.seed + i)));\n        ctx.beginPath();\n        ctx.moveTo(hole.x + Math.cos(a) * inner, hole.y + Math.sin(a) * inner);\n        ctx.lineTo(hole.x + Math.cos(a + 0.08) * outer, hole.y + Math.sin(a + 0.08) * outer);\n        ctx.stroke();\n      }\n    }"],
    ["  function drawBackground() {", "  function drawCityDepthLayer(factor, baseline, slotW, minH, maxH, fill, windowAlpha, salt) {\n    const parallax = cameraX * factor;\n    const start = Math.floor((parallax - 260) / slotW);\n    const end = Math.ceil((parallax + W + 260) / slotW);\n\n    for (let i = start; i <= end; i++) {\n      const x = i * slotW - parallax;\n      const width = slotW * (0.68 + pseudoRandom(i, salt + 1) * 0.24);\n      const height = minH + pseudoRandom(i, salt + 2) * (maxH - minH);\n      const top = baseline - height;\n\n      ctx.fillStyle = fill;\n      ctx.fillRect(x, top, width, height);\n\n      if (pseudoRandom(i, salt + 3) > 0.68) {\n        const roofW = width * 0.25;\n        ctx.fillRect(x + width * 0.37, top - 13, roofW, 13);\n      }\n\n      if (pseudoRandom(i, salt + 4) > 0.72) {\n        ctx.strokeStyle = fill;\n        ctx.lineWidth = 2;\n        ctx.beginPath();\n        ctx.moveTo(x + width * 0.55, top);\n        ctx.lineTo(x + width * 0.55, top - 24 - pseudoRandom(i, salt + 5) * 24);\n        ctx.stroke();\n      }\n\n      ctx.fillStyle = `rgba(245,216,139,${windowAlpha})`;\n      const stepX = Math.max(22, width / 4);\n      for (let wx = x + 12; wx < x + width - 8; wx += stepX) {\n        for (let wy = top + 20; wy < baseline - 16; wy += 34) {\n          if (pseudoRandom(Math.floor(wx * 0.7 + wy), i + salt) > 0.62) ctx.fillRect(wx, wy, 7, 10);\n        }\n      }\n    }\n  }\n\n  function drawBackground() {"],
    ["    const parallax = cameraX * 0.24;", "    drawCityDepthLayer(0.055, GROUND - 36, 86, 90, 230, '#242c40', 0.045, 11);\n    drawCityDepthLayer(0.11, GROUND - 22, 104, 110, 290, '#293143', 0.06, 23);\n    drawCityDepthLayer(0.17, GROUND - 10, 126, 125, 350, '#303646', 0.075, 37);\n\n    const parallax = cameraX * 0.24;"]
  ];

  function patchJohnny(source) {
    const pattern = /  function drawJohnny\(\) \{[\s\S]*?\n  \}\n\n  function drawTank\(t = tank\) \{/;
    if (!pattern.test(source)) throw new Error('City 2 Johnny render target not found');
    return source.replace(pattern, `${JOHNNY_RENDER}\n\n  function drawTank(t = tank) {`);
  }

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
    source = patchJohnny(source);

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