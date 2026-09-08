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

    // Jeans: thick, planted legs with a strong triangular stance.
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

    // Heavy combat boots.
    ctx.fillStyle = black;
    ctx.fillRect(-59, -14 + squatDrop, 48, 19);
    ctx.fillRect(11, -14 + squatDrop, 48, 19);
    ctx.fillStyle = '#292b30';
    ctx.fillRect(-61, 1 + squatDrop, 52, 9);
    ctx.fillRect(9, 1 + squatDrop, 52, 9);

    // Belt and buckle.
    ctx.fillStyle = '#17191d';
    ctx.fillRect(-47, -79 + squatDrop, 94, 10);
    ctx.fillStyle = '#a4a5a6';
    ctx.fillRect(-9, -82 + squatDrop, 18, 16);
    ctx.fillStyle = '#202226';
    ctx.fillRect(-5, -78 + squatDrop, 10, 8);

    // Rear arm first, oversized enough to read from gameplay scale.
    muscleArm(-42 + torsoShift * 0.45, -130, 48, 38, -2.34 - lean * 0.45, 0.62, 31, 26);

    ctx.save();
    ctx.translate(torsoShift, 0);
    ctx.rotate(lean);

    // V-taper torso: broad shoulder/chest mass, narrower waist.
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

    // Pectorals and abs, deliberately simple at gameplay scale.
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

    // Front throwing arm, now properly huge.
    muscleArm(43, -132, 59, 50, johnny.armAngle, 0.42, 34, 28);

    // Neck.
    ctx.fillStyle = skinShade;
    ctx.fillRect(-18, -174, 36, 28);
    ctx.fillStyle = skin;
    ctx.fillRect(-14, -174, 28, 27);

    // Head with square jaw.
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

    // Brown hair.
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

    // Red headband with trailing tails.
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

    // Shades.
    ctx.fillStyle = '#0d0f12';
    ctx.fillRect(-23, -189, 20, 11);
    ctx.fillRect(3, -189, 20, 11);
    ctx.fillRect(-4, -186, 8, 3);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(-20, -187, 7, 2);
    ctx.fillRect(6, -187, 7, 2);

    // Confident jaw/mouth line.
    ctx.strokeStyle = '#7e4938';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-8, -168);
    ctx.quadraticCurveTo(1, -163, 10, -169);
    ctx.stroke();

    // Dog tags.
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

  function patchJohnny(source) {
    const pattern = /  function drawJohnny\(\) \{[\s\S]*?\n  \}\n\n  function drawTank\(t = tank\) \{/;
    if (!pattern.test(source)) throw new Error('Johnny render target not found');
    return source.replace(pattern, `${JOHNNY_RENDER}\n\n  function drawTank(t = tank) {`);
  }

  async function boot() {
    const response = await fetch('game.js?rev=0.5.0', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load City 1 core (${response.status})`);

    const source = patchJohnny(await response.text());
    const blob = new Blob([source], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => URL.revokeObjectURL(url);
    script.onerror = () => {
      URL.revokeObjectURL(url);
      throw new Error('Could not deploy redesigned Johnny');
    };
    document.body.appendChild(script);
  }

  boot().catch(error => {
    console.error(error);
    const card = document.querySelector('#title-screen .card');
    if (card) {
      const notice = document.createElement('p');
      notice.className = 'premise';
      notice.textContent = 'Johnny failed to flex into existence. Refresh to redeploy.';
      card.appendChild(notice);
    }
  });
})();