(() => {
  'use strict';

  const TAU = Math.PI * 2;

  function outline(ctx, width = 3, color = '#17151a') {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }

  function fillStroke(ctx, fill, width = 3) {
    ctx.fillStyle = fill;
    ctx.fill();
    outline(ctx, width);
    ctx.stroke();
  }

  function parasiteNode(ctx, x, y, r = 7, pulse = 0) {
    const glow = r + Math.sin(pulse) * 1.2;
    ctx.save();
    ctx.shadowColor = '#d667ff';
    ctx.shadowBlur = 9;
    ctx.fillStyle = '#b957d2';
    ctx.beginPath();
    ctx.arc(x, y, glow, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    outline(ctx, 2, '#52245f');
    ctx.stroke();
    ctx.fillStyle = '#f38cff';
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, Math.max(1.5, r * 0.28), 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function glowingEyes(ctx, x1, y, x2, color = '#a8ff58') {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = color;
    for (const x of [x1, x2]) {
      ctx.beginPath();
      ctx.ellipse(x, y, 4.8, 3.3, 0, 0, TAU);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#192014';
    ctx.beginPath(); ctx.arc(x1 + 1, y, 1.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x2 + 1, y, 1.2, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawParasiteSpines(ctx, phase = 0, heavy = false) {
    const count = heavy ? 5 : 4;
    for (let i = 0; i < count; i++) {
      const x = 5 + i * 10;
      const y = -20 - Math.sin(phase + i * .8) * 2;
      ctx.fillStyle = heavy ? '#8c456f' : '#77446f';
      ctx.beginPath();
      ctx.moveTo(x - 5, y + 12);
      ctx.quadraticCurveTo(x, y - (heavy ? 22 : 16), x + 6, y + 10);
      ctx.closePath();
      fillStroke(ctx, ctx.fillStyle, 2.3);
      parasiteNode(ctx, x + 1, y + 7, heavy ? 6.5 : 5.3, phase + i);
    }
  }

  function drawGround(ctx, opt = {}) {
    const chonker = !!opt.chonker;
    const wounded = !!opt.wounded;
    const phase = opt.phase || 0;
    const crouch = opt.crouch || 0;
    const body = chonker ? '#59505a' : '#4a4852';
    const bodyLight = chonker ? '#81737b' : '#77727c';
    const belly = chonker ? '#80766f' : '#67646a';

    ctx.save();
    ctx.translate(0, crouch * 7);
    ctx.scale(1, 1 - crouch * .09);

    // Tail with alien nodes.
    outline(ctx, chonker ? 10 : 7, '#37343d');
    ctx.beginPath();
    ctx.moveTo(24, -1);
    ctx.bezierCurveTo(48, -15, 61, -2, 55, 16);
    ctx.bezierCurveTo(50, 28, 66, 31, 70, 19);
    ctx.stroke();
    parasiteNode(ctx, 55, 13, chonker ? 8 : 6, phase);

    // Body.
    ctx.beginPath();
    ctx.ellipse(6, 1, chonker ? 39 : 32, chonker ? 28 : 21, -.03, 0, TAU);
    fillStroke(ctx, body, 3.2);
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.ellipse(9, 7, chonker ? 25 : 19, chonker ? 15 : 10, 0, 0, TAU);
    ctx.fill();

    // Hind leg / paw.
    ctx.fillStyle = bodyLight;
    ctx.beginPath(); ctx.ellipse(24, 17, chonker ? 18 : 13, chonker ? 11 : 8, -.1, 0, TAU); ctx.fill();
    outline(ctx, 2.4); ctx.stroke();

    // Head and muzzle.
    ctx.beginPath();
    ctx.arc(-24, -18, chonker ? 24 : 20, 0, TAU);
    fillStroke(ctx, bodyLight, 3.2);
    ctx.fillStyle = '#afa5a1';
    ctx.beginPath(); ctx.ellipse(-34, -8, chonker ? 13 : 10, chonker ? 9 : 7, -.15, 0, TAU); ctx.fill();

    // Ears.
    ctx.fillStyle = bodyLight;
    ctx.beginPath(); ctx.moveTo(-42, -32); ctx.lineTo(-39, -52); ctx.lineTo(-25, -35); ctx.closePath(); fillStroke(ctx, bodyLight, 2.5);
    ctx.beginPath(); ctx.moveTo(-20, -37); ctx.lineTo(-8, -51); ctx.lineTo(-6, -29); ctx.closePath(); fillStroke(ctx, bodyLight, 2.5);
    ctx.fillStyle = '#8f5e78';
    ctx.beginPath(); ctx.moveTo(-38, -36); ctx.lineTo(-37, -46); ctx.lineTo(-31, -37); ctx.closePath(); ctx.fill();

    // Parasite growths.
    drawParasiteSpines(ctx, phase, chonker);
    if (chonker) {
      parasiteNode(ctx, -1, -17, 9, phase + .8);
      parasiteNode(ctx, 31, -11, 8, phase + 1.7);
    }

    // Face.
    glowingEyes(ctx, -31, -21, -18, wounded ? '#ffe85a' : '#a8ff58');
    ctx.fillStyle = '#2a1820';
    ctx.beginPath(); ctx.moveTo(-38, -5); ctx.quadraticCurveTo(-27, 4, -15, -5); ctx.quadraticCurveTo(-26, 14, -38, -5); ctx.fill();
    ctx.fillStyle = '#f5e9df';
    for (const x of [-34, -28, -22, -17]) { ctx.beginPath(); ctx.moveTo(x, -3); ctx.lineTo(x + 2, 3); ctx.lineTo(x + 4, -2); ctx.fill(); }

    // Front paws.
    ctx.fillStyle = bodyLight;
    ctx.beginPath(); ctx.ellipse(-13, 18, chonker ? 13 : 10, 7, .1, 0, TAU); ctx.fill(); outline(ctx,2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-31, 17, chonker ? 13 : 10, 7, .1, 0, TAU); ctx.fill(); ctx.stroke();

    if (opt.windup) {
      ctx.fillStyle = '#ffcf33';
      ctx.font = '900 12px system-ui, sans-serif';
      ctx.fillText('!', -29, -62);
    }
    ctx.restore();
  }

  function drawBat(ctx, opt = {}) {
    const phase = opt.phase || 0;
    const flap = Math.sin(phase * 5.1);
    ctx.save();

    // Membrane wings.
    ctx.fillStyle = '#78507e';
    outline(ctx, 3, '#2b2132');
    ctx.beginPath();
    ctx.moveTo(-8, -5); ctx.quadraticCurveTo(17, -42 - flap * 10, 52, -21); ctx.lineTo(41, -3); ctx.lineTo(55, 10); ctx.quadraticCurveTo(24, 4, 5, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8, 1); ctx.quadraticCurveTo(15, 38 + flap * 10, 48, 25); ctx.lineTo(37, 8); ctx.lineTo(50, -3); ctx.quadraticCurveTo(21, 2, 5, -2); ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.strokeStyle = '#c16bb1'; ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(48, side < 0 ? -20 - flap * 7 : 23 + flap * 7); ctx.stroke();
    }

    // Body/head.
    ctx.beginPath(); ctx.ellipse(0, 0, 27, 20, 0, 0, TAU); fillStroke(ctx, '#4c4253', 3);
    ctx.beginPath(); ctx.arc(-22, -13, 18, 0, TAU); fillStroke(ctx, '#69606f', 3);
    ctx.fillStyle = '#69606f';
    ctx.beginPath(); ctx.moveTo(-35, -24); ctx.lineTo(-33, -43); ctx.lineTo(-21, -28); ctx.closePath(); fillStroke(ctx, '#69606f', 2.4);
    ctx.beginPath(); ctx.moveTo(-18, -29); ctx.lineTo(-7, -42); ctx.lineTo(-5, -21); ctx.closePath(); fillStroke(ctx, '#69606f', 2.4);

    parasiteNode(ctx, 8, -15, 6, phase);
    parasiteNode(ctx, 24, 5, 5, phase + 1.2);
    glowingEyes(ctx, -28, -14, -17, '#a8ff58');

    ctx.fillStyle = '#24171f';
    ctx.beginPath(); ctx.moveTo(-31, -4); ctx.quadraticCurveTo(-21, 5, -11, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f7e9dc';
    ctx.beginPath(); ctx.moveTo(-27,-2);ctx.lineTo(-24,4);ctx.lineTo(-21,-2);ctx.fill();
    ctx.beginPath(); ctx.moveTo(-18,-2);ctx.lineTo(-15,4);ctx.lineTo(-12,-2);ctx.fill();

    // Tail/tendril.
    ctx.strokeStyle = '#8c4d99'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(22, 5); ctx.quadraticCurveTo(45, 15, 49, 34); ctx.stroke();
    parasiteNode(ctx, 48, 32, 5, phase + 2);
    ctx.restore();
  }

  function drawBrain(ctx, opt = {}) {
    const phase = opt.phase || 0;
    const charge = Math.max(0, Math.min(1, opt.charge || 0));
    ctx.save();

    // Small cat body.
    ctx.beginPath(); ctx.ellipse(4, 8, 24, 17, 0, 0, TAU); fillStroke(ctx, '#4a4652', 3);
    ctx.beginPath(); ctx.arc(-17, -9, 18, 0, TAU); fillStroke(ctx, '#625968', 3);
    ctx.fillStyle = '#625968';
    ctx.beginPath(); ctx.moveTo(-30,-19);ctx.lineTo(-28,-38);ctx.lineTo(-17,-23);ctx.closePath();fillStroke(ctx,'#625968',2.3);

    // Brain dome.
    ctx.save();
    ctx.shadowColor = '#c668ff'; ctx.shadowBlur = 13 + charge * 14;
    ctx.beginPath();
    ctx.ellipse(-13, -31, 28, 22, -.05, Math.PI, TAU);
    fillStroke(ctx, '#bd6add', 3, '#5f3474');
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#713c88'; ctx.lineWidth = 2;
    for (let i=0;i<5;i++) {
      const x=-31+i*9;
      ctx.beginPath(); ctx.moveTo(x,-33);ctx.bezierCurveTo(x+5,-44,x+8,-24,x+13,-36);ctx.stroke();
    }
    ctx.restore();

    parasiteNode(ctx, 19, -5, 5.5, phase);
    glowingEyes(ctx, -24, -11, -11, '#cf7cff');

    if (charge > 0) {
      ctx.strokeStyle = `rgba(205,116,255,${.35 + charge*.55})`;
      ctx.lineWidth = 4;
      for (let i=0;i<2;i++) {
        const r = 37 + i*15 + charge*28;
        ctx.beginPath();ctx.arc(-14,-20,r,0,TAU);ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawFriendly(ctx, opt = {}) {
    const color = opt.color || '#d7a15d';
    const phase = opt.phase || 0;
    ctx.save();
    ctx.strokeStyle = '#3b302c'; ctx.lineWidth = 3; ctx.lineJoin='round';

    ctx.beginPath();ctx.ellipse(5,3,30,20,0,0,TAU);ctx.fillStyle=color;ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(-21,-15,18,0,TAU);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-34,-27);ctx.lineTo(-31,-45);ctx.lineTo(-20,-30);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-17,-30);ctx.lineTo(-6,-43);ctx.lineTo(-4,-24);ctx.closePath();ctx.fill();ctx.stroke();

    // White chest and muzzle to read friendly instantly.
    ctx.fillStyle='#f3e8d7';
    ctx.beginPath();ctx.ellipse(-29,-8,10,7,-.1,0,TAU);ctx.fill();
    ctx.beginPath();ctx.ellipse(-1,10,14,10,.2,0,TAU);ctx.fill();

    // Happy eyes.
    ctx.strokeStyle='#2b2421';ctx.lineWidth=2.7;
    ctx.beginPath();ctx.arc(-27,-18,4,.15,Math.PI-.15);ctx.stroke();
    ctx.beginPath();ctx.arc(-16,-18,4,.15,Math.PI-.15);ctx.stroke();
    ctx.fillStyle='#d26a72';ctx.beginPath();ctx.arc(-22,-10,2.7,0,TAU);ctx.fill();

    // Clean upright tail, no alien growths.
    ctx.strokeStyle=color;ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(30,4);ctx.bezierCurveTo(48,-3,47,-26,36,-30);ctx.stroke();
    outline(ctx,2,'#3b302c');ctx.stroke();

    if (!opt.bonked) {
      ctx.fillStyle='rgba(255,255,255,.75)';ctx.font='900 10px system-ui,sans-serif';
      if (Math.sin(phase*.5)>0.75) ctx.fillText('♥',-4,-34);
    }
    ctx.restore();
  }

  function drawBob(ctx, opt = {}) {
    const flash = !!opt.flash;
    const phase = opt.phase || 1;
    const windup = opt.windup || 0;
    const time = opt.time || 0;
    const fur = flash ? '#f0bd88' : '#ad7449';
    const furLight = flash ? '#ffd5a7' : '#c79060';

    ctx.save();
    // Bob expects caller at feet origin; design roughly 1x, caller may scale.
    ctx.fillStyle='#1b1b1d';
    ctx.beginPath();ctx.ellipse(0,4,74,13,0,0,TAU);ctx.globalAlpha=.28;ctx.fill();ctx.globalAlpha=1;

    // Legs / boots.
    ctx.fillStyle='#2b302b';
    ctx.fillRect(-52,-42,40,45);ctx.fillRect(12,-42,40,45);
    ctx.fillStyle='#141619';ctx.fillRect(-58,-9,49,15);ctx.fillRect(9,-9,49,15);

    // Huge torso.
    ctx.beginPath();
    ctx.moveTo(-66,-132);ctx.bezierCurveTo(-85,-106,-73,-51,-45,-39);ctx.lineTo(45,-39);ctx.bezierCurveTo(74,-54,85,-105,66,-132);ctx.bezierCurveTo(47,-157,-47,-157,-66,-132);ctx.closePath();
    fillStroke(ctx, fur, 4);
    ctx.fillStyle=furLight;
    ctx.beginPath();ctx.ellipse(0,-91,44,34,0,0,TAU);ctx.fill();

    // Arms.
    outline(ctx,30,fur);ctx.beginPath();ctx.moveTo(-57,-115);ctx.lineTo(-87,-69);ctx.stroke();ctx.beginPath();ctx.moveTo(57,-115);ctx.lineTo(87,-69);ctx.stroke();
    outline(ctx,4,'#553c2f');ctx.beginPath();ctx.moveTo(-57,-115);ctx.lineTo(-87,-69);ctx.stroke();ctx.beginPath();ctx.moveTo(57,-115);ctx.lineTo(87,-69);ctx.stroke();
    ctx.fillStyle='#252b26';ctx.beginPath();ctx.arc(-89,-63,17,0,TAU);ctx.arc(89,-63,17,0,TAU);ctx.fill();

    // Harness / military gear.
    ctx.strokeStyle='#39483a';ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(-44,-132);ctx.lineTo(30,-48);ctx.stroke();ctx.beginPath();ctx.moveTo(44,-132);ctx.lineTo(-30,-48);ctx.stroke();
    ctx.fillStyle='#4a5b46';ctx.fillRect(-68,-84,23,38);ctx.fillRect(45,-84,23,38);
    ctx.fillStyle='#e4e0bd';ctx.font='900 18px system-ui,sans-serif';ctx.fillText('★',43,-55);

    // Head and bobcat tufts.
    ctx.beginPath();ctx.arc(-5,-166,45,0,TAU);fillStroke(ctx,furLight,4);
    ctx.fillStyle=fur;
    ctx.beginPath();ctx.moveTo(-44,-184);ctx.lineTo(-56,-213);ctx.lineTo(-29,-195);ctx.closePath();fillStroke(ctx,fur,3);
    ctx.beginPath();ctx.moveTo(27,-196);ctx.lineTo(53,-216);ctx.lineTo(47,-180);ctx.closePath();fillStroke(ctx,fur,3);
    // cheek tufts
    ctx.beginPath();ctx.moveTo(-42,-163);ctx.lineTo(-61,-151);ctx.lineTo(-43,-145);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(32,-160);ctx.lineTo(55,-150);ctx.lineTo(34,-143);ctx.closePath();ctx.fill();

    // Parasite infection on boss.
    parasiteNode(ctx, 30, -141, 8, time*4);
    parasiteNode(ctx, -47, -108, 7, time*4+1.2);
    ctx.fillStyle='#754160';
    for (let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(18+i*12,-139);ctx.lineTo(22+i*12,-164-Math.sin(time*5+i)*4);ctx.lineTo(29+i*12,-139);ctx.closePath();ctx.fill();outline(ctx,2,'#4c2840');ctx.stroke();}

    glowingEyes(ctx,-20,-169,8, phase===3?'#fff36b':'#a8ff58');
    ctx.fillStyle='#4a2b24';ctx.beginPath();ctx.moveTo(-26,-148);ctx.quadraticCurveTo(-5,-129,20,-151);ctx.quadraticCurveTo(-4,-117,-26,-148);ctx.fill();
    ctx.fillStyle='#f1e1cf';for(const x of [-19,-8,4,14]){ctx.beginPath();ctx.moveTo(x,-145);ctx.lineTo(x+3,-136);ctx.lineTo(x+7,-145);ctx.fill();}

    if (windup > 0) {
      ctx.strokeStyle='#ffcf33';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-165,60+Math.sin(time*12)*5,0,TAU);ctx.stroke();
    }
    ctx.restore();
  }

  function drawPreview(canvas, kind) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height*.62);
    let scale = 2.1;
    if (kind==='bob') scale=.95;
    if (kind==='brain') scale=1.7;
    ctx.scale(scale,scale);
    const t = performance.now()/1000;
    if (kind==='ground') drawGround(ctx,{phase:t});
    else if (kind==='chonker') drawGround(ctx,{chonker:true,phase:t});
    else if (kind==='bat') drawBat(ctx,{phase:t});
    else if (kind==='brain') drawBrain(ctx,{phase:t,charge:.65});
    else if (kind==='friendly') drawFriendly(ctx,{phase:t,color:'#d79a57'});
    else if (kind==='bob') {ctx.translate(0,80);drawBob(ctx,{phase:2,time:t});}
    ctx.restore();
  }

  window.JMEnemyArt = { drawGround, drawBat, drawBrain, drawFriendly, drawBob, drawPreview };
})();
