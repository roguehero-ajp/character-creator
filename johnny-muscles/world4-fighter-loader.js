(() => {
  'use strict';

  const S = window.JMShared;
  const T = window.JMTankArt;
  if (!S || !T) throw new Error('World 4 fighter adapter requires campaign-shared.js and tank-art.js');

  const STORAGE = {
    selected: 'johnnyMuscles.selectedCharacter',
    rickUnlocked: 'johnnyMuscles.rickUnlocked',
    bobBeatenAsJohnny: 'johnnyMuscles.bobBeatenAsJohnny'
  };
  const read = key => {
    try { return localStorage.getItem(key); } catch { return null; }
  };

  const rickEligible = read(STORAGE.bobBeatenAsJohnny) === 'true' && read(STORAGE.rickUnlocked) === 'true';
  const isRick = read(STORAGE.selected) === 'rick' && rickEligible;
  const GROUND = S.GROUND;

  function drawCarBody(ctx, ox, oy, color, accent) {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = '#14171b';
    ctx.beginPath(); ctx.arc(-30, 17, 11, 0, Math.PI * 2); ctx.arc(30, 17, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#747b82';
    ctx.beginPath(); ctx.arc(-30, 17, 5, 0, Math.PI * 2); ctx.arc(30, 17, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-48, 11); ctx.lineTo(-42, -8); ctx.lineTo(-21, -14); ctx.lineTo(-8, -31);
    ctx.lineTo(22, -31); ctx.lineTo(40, -11); ctx.lineTo(49, -6); ctx.lineTo(47, 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a8c3cf';
    ctx.beginPath(); ctx.moveTo(-5, -27); ctx.lineTo(8, -27); ctx.lineTo(17, -14); ctx.lineTo(-14, -14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillRect(-44, -3, 9, 6); ctx.fillRect(36, -3, 9, 6);
    ctx.restore();
  }

  function drawCarPair(ctx, t) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle || 0);
    drawCarBody(ctx, -38, -13, '#4f789e', '#f0e4af');
    drawCarBody(ctx, 38, 12, '#b6543f', '#f4d27d');
    ctx.restore();
  }

  function drawRick(ctx, state = {}, steroidTimer = 0, elapsed = 0) {
    const x = 142;
    const y = GROUND - 31 + (state.squat || 0) * 18;
    const lean = state.torsoLean || 0;
    const skin = '#6b4031';
    const skinDark = '#47291f';
    const green = '#2f7a43';
    const greenDark = '#20552f';
    const orange = '#d8782f';
    const orangeDark = '#84461f';
    const armAngle = state.catchPose > 0 ? -1.55 : (state.armAngle ?? -0.75);

    function arm(sx, sy, angle, bend = .38) {
      const ex = sx + Math.cos(angle) * 66;
      const ey = sy + Math.sin(angle) * 66;
      const fa = angle + bend;
      const hx = ex + Math.cos(fa) * 56;
      const hy = ey + Math.sin(fa) * 56;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = skinDark; ctx.lineWidth = 39; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = skin; ctx.lineWidth = 32; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = skinDark; ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = skin; ctx.lineWidth = 27; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
    }

    ctx.save();
    ctx.translate(x, y);
    if (steroidTimer > 0) { ctx.shadowColor = '#a8ff58'; ctx.shadowBlur = 24 + Math.sin(elapsed * 12) * 8; }
    ctx.rotate(lean * .25);

    ctx.fillStyle = '#17191d'; ctx.fillRect(-62, -11, 52, 20); ctx.fillRect(10, -11, 52, 20);
    ctx.fillStyle = orangeDark; ctx.fillRect(-55, -84, 48, 76); ctx.fillRect(7, -84, 48, 76);
    ctx.fillStyle = orange; ctx.fillRect(-49, -82, 40, 69); ctx.fillRect(9, -82, 40, 69);
    ctx.fillStyle = '#73502e'; ctx.fillRect(-43, -68, 16, 10); ctx.fillRect(-18, -39, 14, 10); ctx.fillRect(15, -65, 18, 11); ctx.fillRect(32, -34, 13, 9);

    arm(-57, -143, -2.35 - lean * .3, .58);
    ctx.fillStyle = greenDark;
    ctx.beginPath(); ctx.moveTo(-72,-151); ctx.quadraticCurveTo(-54,-178,0,-174); ctx.quadraticCurveTo(54,-178,72,-151); ctx.lineTo(49,-78); ctx.lineTo(-49,-78); ctx.closePath(); ctx.fill();
    ctx.fillStyle = green;
    ctx.beginPath(); ctx.moveTo(-65,-148); ctx.quadraticCurveTo(-47,-168,0,-165); ctx.quadraticCurveTo(47,-168,65,-148); ctx.lineTo(43,-82); ctx.lineTo(-43,-82); ctx.closePath(); ctx.fill();
    arm(57, -143, armAngle, .40);

    ctx.fillStyle = skinDark; ctx.fillRect(-19,-190,38,31);
    ctx.fillStyle = skin; ctx.fillRect(-15,-190,30,29);
    ctx.fillStyle = skinDark; ctx.beginPath(); ctx.ellipse(0,-216,31,36,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0,-218,27,32,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#17120f'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    for (let i = -4; i <= 4; i++) {
      const xx = i * 7;
      ctx.beginPath(); ctx.moveTo(xx,-241 + Math.abs(i)*2); ctx.quadraticCurveTo(xx + (i%2?6:-5),-263,xx + (i%2?10:-9),-276 - Math.abs(i)*3); ctx.stroke();
    }
    ctx.fillStyle = '#17120f'; ctx.fillRect(-18,-225,8,4); ctx.fillRect(10,-225,8,4);
    ctx.strokeStyle = skinDark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-9,-204); ctx.quadraticCurveTo(0,-198,10,-205); ctx.stroke();
    ctx.restore();
  }

  if (isRick) {
    S.drawJohnny = (ctx, state, steroidTimer, elapsed) => drawRick(ctx, state, steroidTimer, elapsed);
    T.drawTank = (ctx, vehicle) => drawCarPair(ctx, vehicle);
  }

  const fighter = {
    id: isRick ? 'rick' : 'johnny',
    name: isRick ? 'Rick Rampage' : 'Johnny Muscles',
    shortName: isRick ? 'RICK' : 'JOHNNY',
    isRick,
    projectileName: isRick ? 'CAR PAIR' : 'TANK',
    projectilePlural: isRick ? 'CAR PAIRS' : 'TANKS',
    throwScale: isRick ? 4.50 : 4.05,
    gravityMultiplier: isRick ? 1.08 : 1,
    collisionBonus: isRick ? 24 : (T.HIT_BONUS || 18),
    impactX: isRick ? .62 : .82,
    impactY: isRick ? .76 : .82,
    bounceX: isRick ? .62 : .74,
    bounceY: isRick ? -.18 : -.30
  };
  window.JMWorld4Fighter = fighter;

  if (isRick) {
    const titleName = document.querySelector('#title-screen h1');
    if (titleName) titleName.textContent = 'RICK RAMPAGE';
    document.querySelectorAll('button').forEach(button => {
      if (/JOHNNY/i.test(button.textContent)) button.textContent = button.textContent.replace(/JOHNNY/gi, 'RICK');
    });
    document.querySelectorAll('[data-fighter-name]').forEach(el => { el.textContent = fighter.name; });
    document.querySelectorAll('[data-projectile-name]').forEach(el => { el.textContent = fighter.projectilePlural; });
  }
})();
