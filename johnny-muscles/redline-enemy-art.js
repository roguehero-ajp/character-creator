(() => {
  'use strict';
  const E = window.JMEnemyArt;
  if (!E) return;
  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function afterimage(ctx, a, offset, alpha, crouch = 0) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(offset, 0);
    E.drawGround(ctx, { phase: a.phase - offset * .006, crouch });
    ctx.restore();
  }

  function drawShield(ctx) {
    ctx.save();
    ctx.translate(-52, -14);
    ctx.fillStyle = '#6f787c';
    ctx.strokeStyle = '#252b2e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-20, -34); ctx.lineTo(12, -42); ctx.lineTo(31, -19); ctx.lineTo(29, 22);
    ctx.lineTo(6, 37); ctx.lineTo(-25, 27); ctx.lineTo(-34, -4); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c9b46b';
    for (const [x, y] of [[-18,-23],[15,-29],[20,16],[-18,18]]) { ctx.beginPath(); ctx.arc(x,y,4,0,TAU); ctx.fill(); }
    ctx.fillStyle = '#e9dcaf'; ctx.font = '900 8px system-ui'; ctx.textAlign = 'center'; ctx.fillText('NOPE', -1, 2);
    ctx.restore();
  }

  function drawActor(ctx, a) {
    if (!a || a.dead) return;
    ctx.save();
    ctx.translate(a.x, a.y + Math.sin(a.phase) * 1.8);
    ctx.globalAlpha = a.hidden ? .38 : 1;

    ctx.fillStyle = 'rgba(35,24,30,.24)';
    ctx.beginPath(); ctx.ellipse(3, 14, 42 * a.scale, 11 * a.scale, 0, 0, TAU); ctx.fill();

    const dash = a.kind === 'sprinter' && a.state === 'dash';
    const slip = a.kind === 'slipstream';
    const wall = a.kind === 'wallrunner';
    const lean = dash ? -.17 : slip ? -.11 : wall ? clamp(Math.sin(a.wallTimer * 2.7) * .16, -.16, .16) : 0;
    ctx.rotate(lean);
    ctx.scale(a.scale, a.scale);

    if (dash) {
      afterimage(ctx, a, 78, .18, .12); afterimage(ctx, a, 52, .24, .12); afterimage(ctx, a, 28, .32, .12);
    } else if (slip) {
      afterimage(ctx, a, 84, .11); afterimage(ctx, a, 55, .16); afterimage(ctx, a, 29, .22);
    }

    if (a.boost > 1.05) {
      ctx.save();
      ctx.globalAlpha *= .55 + .15 * Math.sin(a.phase * 2);
      ctx.strokeStyle = '#ffe86a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(3, -8, 48, 37, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    E.drawGround(ctx, {
      phase: a.phase,
      chonker: a.kind === 'chonker' || a.kind === 'roller',
      crouch: a.kind === 'sprinter' && a.state === 'ready' ? .34 : 0,
      windup: a.kind === 'sprinter' && a.state === 'ready'
    });

    if (a.kind === 'basic') {
      ctx.strokeStyle = '#a969c3'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(2,-10); ctx.lineTo(19,-4); ctx.lineTo(31,-11); ctx.stroke();
    }

    if (a.kind === 'sprinter') {
      ctx.fillStyle = '#f4ca55'; ctx.strokeStyle = '#402c24'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.rect(-43,-31,31,12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4b3024'; ctx.fillRect(-35,-28,7,5); ctx.fillRect(-23,-28,7,5);
      ctx.strokeStyle = '#f4ca55'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(2,-8); ctx.lineTo(14,2); ctx.lineTo(5,9); ctx.stroke();
      if (a.state === 'ready') {
        ctx.save(); ctx.globalAlpha *= .8; ctx.strokeStyle = '#fff1a1'; ctx.lineWidth = 3;
        for (const r of [47,58]) { ctx.beginPath(); ctx.arc(-2,-8,r,Math.PI*.82,Math.PI*1.2); ctx.stroke(); }
        ctx.restore();
      }
      if (dash) {
        ctx.strokeStyle = 'rgba(255,227,116,.65)'; ctx.lineWidth = 5;
        for (const y of [-31,-14,4]) { ctx.beginPath(); ctx.moveTo(30,y); ctx.lineTo(98,y+4); ctx.stroke(); }
      }
    }

    if (a.kind === 'dust') {
      ctx.fillStyle = '#d9b077'; ctx.strokeStyle = '#4a3527'; ctx.lineWidth = 2.5;
      ctx.fillRect(-43,-31,31,12); ctx.strokeRect(-43,-31,31,12);
      ctx.fillStyle = '#775237'; ctx.beginPath(); ctx.moveTo(-41,-12); ctx.lineTo(-12,-9); ctx.lineTo(-19,3); ctx.lineTo(-42,-1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(185,132,76,.34)';
      for (let i=0;i<4;i++) { ctx.beginPath(); ctx.arc(40+i*13,10-i*3,8+i*2,0,TAU); ctx.fill(); }
    }

    if (a.kind === 'wallrunner') {
      ctx.fillStyle = '#4f9fb0';
      for (const x of [-30,-12,20,35]) ctx.fillRect(x,11,12,7);
      ctx.strokeStyle = '#b9f0ff'; ctx.lineWidth = 3;
      for (let i=0;i<3;i++) { ctx.beginPath(); ctx.moveTo(34+i*7,-8+i*4); ctx.lineTo(54+i*9,-20+i*3); ctx.stroke(); }
    }

    if (a.kind === 'relay') {
      ctx.strokeStyle = '#f3dc4b'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(-19,-2); ctx.lineTo(23,10); ctx.stroke();
      ctx.fillStyle = '#fff17a'; ctx.strokeStyle = '#685d20'; ctx.lineWidth = 2;
      ctx.fillRect(7,-23,18,27); ctx.strokeRect(7,-23,18,27);
      ctx.fillStyle = '#30291a'; ctx.fillRect(12,-18,8,11);
      ctx.strokeStyle = 'rgba(255,241,122,.72)'; ctx.lineWidth = 3;
      for (const r of [18,25,32]) { ctx.beginPath(); ctx.arc(16,-12,r,-1.05,-.15); ctx.stroke(); }
    }

    if (a.kind === 'slipstream') {
      ctx.strokeStyle = 'rgba(255,221,151,.58)'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(23,-9); ctx.bezierCurveTo(62,-26,100,-17,142,-30); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,147,83,.42)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(26,3); ctx.bezierCurveTo(68,-4,105,8,155,-4); ctx.stroke();
      ctx.fillStyle = '#dd7a43'; ctx.beginPath(); ctx.moveTo(-9,-13); ctx.lineTo(22,-8); ctx.lineTo(11,7); ctx.lineTo(-13,2); ctx.closePath(); ctx.fill();
      for (let i=0;i<3;i++) { ctx.fillStyle = `rgba(255,231,173,${.62-i*.14})`; ctx.beginPath(); ctx.moveTo(37+i*15,-20); ctx.lineTo(49+i*15,-13); ctx.lineTo(37+i*15,-6); ctx.closePath(); ctx.fill(); }
    }

    if (a.kind === 'shield') drawShield(ctx);

    if (a.kind === 'chonker') {
      ctx.strokeStyle = '#b95ed0'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-5,8); ctx.quadraticCurveTo(10,-5,27,7); ctx.stroke();
      ctx.fillStyle = '#d789e7'; ctx.beginPath(); ctx.arc(13,4,5,0,TAU); ctx.fill();
      ctx.fillStyle = '#44323f'; ctx.fillRect(-8,17,43,7);
    }

    if (a.kind === 'roller') {
      ctx.strokeStyle = '#ffbb56'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(4,-1,43,0,TAU); ctx.stroke();
    }
    ctx.restore();
  }

  window.JMRedlineArt = Object.freeze({ drawActor });
})();