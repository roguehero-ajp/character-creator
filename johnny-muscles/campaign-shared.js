(() => {
  'use strict';

  const W = 1280;
  const H = 720;
  const GROUND = 603;
  const GRAVITY = 880;
  const TANK_HOME = { x: 250, y: GROUND - 46 };
  const MAX_PULL = 360;
  const AIM_CAMERA_BACK = 600;
  const CAMERA_FOLLOW_SCREEN_X = W * 0.58;
  const CAMERA_EASE = 10.5;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pseudoRandom = (index, salt = 0) => {
    const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  function pointerToWorld(canvas, e, cameraX = 0) {
    const rect = canvas.getBoundingClientRect();
    const canvasAspect = W / H;
    const rectAspect = rect.width / rect.height;
    let drawW; let drawH; let offsetX; let offsetY;
    if (rectAspect > canvasAspect) {
      drawH = rect.height;
      drawW = drawH * canvasAspect;
      offsetX = (rect.width - drawW) / 2;
      offsetY = 0;
    } else {
      drawW = rect.width;
      drawH = drawW / canvasAspect;
      offsetX = 0;
      offsetY = (rect.height - drawH) / 2;
    }
    return {
      x: ((e.clientX - rect.left - offsetX) * W / drawW) + cameraX,
      y: ((e.clientY - rect.top - offsetY) * H / drawH)
    };
  }

  function drawTank(ctx, t, label = 'THROW ME') {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle || 0);
    ctx.fillStyle = '#1c231d';
    ctx.fillRect(-49, 12, 98, 22);
    ctx.fillStyle = '#59664b';
    ctx.fillRect(-41, -11, 82, 30);
    ctx.beginPath(); ctx.arc(4, -11, 22, Math.PI, 0); ctx.fill();
    ctx.fillRect(12, -18, 71, 8);
    ctx.fillStyle = '#111';
    for (let x = -38; x <= 38; x += 19) {
      ctx.beginPath(); ctx.arc(x, 24, 9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#c8d39e';
    ctx.font = '900 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, 7);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawJohnny(ctx, johnny, steroidTimer, elapsed) {
    const x = 142;
    const y = GROUND - 31 + (johnny.squat || 0) * 18;
    const lean = johnny.torsoLean || 0;
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
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = skinShade; ctx.lineWidth = upperWidth + 5;
      ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.lineTo(elbowX, elbowY); ctx.stroke();
      ctx.strokeStyle = skin; ctx.lineWidth = upperWidth;
      ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.lineTo(elbowX, elbowY); ctx.stroke();
      ctx.strokeStyle = skinShade; ctx.lineWidth = foreWidth + 5;
      ctx.beginPath(); ctx.moveTo(elbowX, elbowY); ctx.lineTo(handX, handY); ctx.stroke();
      ctx.strokeStyle = skin; ctx.lineWidth = foreWidth;
      ctx.beginPath(); ctx.moveTo(elbowX, elbowY); ctx.lineTo(handX, handY); ctx.stroke();
      ctx.fillStyle = black;
      ctx.beginPath(); ctx.ellipse(handX, handY, 15, 13, foreAngle, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b2d33'; ctx.fillRect(handX - 9, handY - 4, 18, 6);
    }

    ctx.save(); ctx.translate(x, y);
    if (steroidTimer > 0) { ctx.shadowColor = '#a8ff58'; ctx.shadowBlur = 24 + Math.sin(elapsed * 12) * 8; }
    const squatDrop = (johnny.squat || 0) * 13;

    ctx.fillStyle = jeansShade;
    ctx.beginPath(); ctx.moveTo(-48,-75+squatDrop); ctx.lineTo(-7,-72+squatDrop); ctx.lineTo(-13,-8+squatDrop); ctx.lineTo(-58,-8+squatDrop); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(7,-72+squatDrop); ctx.lineTo(48,-75+squatDrop); ctx.lineTo(58,-8+squatDrop); ctx.lineTo(13,-8+squatDrop); ctx.closePath(); ctx.fill();
    ctx.fillStyle = jeans;
    ctx.beginPath(); ctx.moveTo(-43,-72+squatDrop); ctx.lineTo(-8,-70+squatDrop); ctx.lineTo(-15,-10+squatDrop); ctx.lineTo(-52,-10+squatDrop); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8,-70+squatDrop); ctx.lineTo(43,-72+squatDrop); ctx.lineTo(52,-10+squatDrop); ctx.lineTo(15,-10+squatDrop); ctx.closePath(); ctx.fill();
    ctx.fillStyle = black; ctx.fillRect(-59,-14+squatDrop,48,19); ctx.fillRect(11,-14+squatDrop,48,19);
    ctx.fillStyle = '#292b30'; ctx.fillRect(-61,1+squatDrop,52,9); ctx.fillRect(9,1+squatDrop,52,9);
    ctx.fillStyle = '#17191d'; ctx.fillRect(-47,-79+squatDrop,94,10);
    ctx.fillStyle = '#a4a5a6'; ctx.fillRect(-9,-82+squatDrop,18,16);

    muscleArm(-42 + torsoShift * 0.45, -130, 48, 38, -2.34 - lean * 0.45, 0.62, 31, 26);
    ctx.save(); ctx.translate(torsoShift,0); ctx.rotate(lean);

    ctx.fillStyle = skinShade;
    ctx.beginPath(); ctx.moveTo(-61,-143); ctx.bezierCurveTo(-75,-127,-64,-88,-34,-76); ctx.lineTo(-26,-66); ctx.lineTo(26,-66); ctx.lineTo(34,-76); ctx.bezierCurveTo(64,-88,75,-127,61,-143); ctx.bezierCurveTo(38,-164,-38,-164,-61,-143); ctx.closePath(); ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.moveTo(-57,-146); ctx.bezierCurveTo(-69,-128,-58,-94,-31,-82); ctx.lineTo(-23,-69); ctx.lineTo(23,-69); ctx.lineTo(31,-82); ctx.bezierCurveTo(58,-94,69,-128,57,-146); ctx.bezierCurveTo(34,-161,-34,-161,-57,-146); ctx.closePath(); ctx.fill();

    ctx.strokeStyle = skinShade; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-46,-126); ctx.quadraticCurveTo(-24,-139,0,-124); ctx.quadraticCurveTo(24,-139,46,-126); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0,-126); ctx.lineTo(0,-78); ctx.stroke();
    for (const yy of [-108,-93,-79]) { ctx.beginPath(); ctx.moveTo(-16,yy); ctx.quadraticCurveTo(0,yy+5,16,yy); ctx.stroke(); }

    muscleArm(43, -132, 59, 50, johnny.armAngle ?? -0.75, 0.42, 34, 28);
    ctx.fillStyle = skinShade; ctx.fillRect(-18,-174,36,28);
    ctx.fillStyle = skin; ctx.fillRect(-14,-174,28,27);

    ctx.fillStyle = skinShade;
    ctx.beginPath(); ctx.moveTo(-27,-202); ctx.quadraticCurveTo(-31,-177,-19,-160); ctx.lineTo(0,-153); ctx.lineTo(19,-160); ctx.quadraticCurveTo(31,-177,27,-202); ctx.closePath(); ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.moveTo(-24,-202); ctx.quadraticCurveTo(-27,-179,-17,-163); ctx.lineTo(0,-157); ctx.lineTo(17,-163); ctx.quadraticCurveTo(27,-179,24,-202); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3b241c';
    ctx.beginPath(); ctx.moveTo(-25,-201); ctx.lineTo(-18,-218); ctx.lineTo(-8,-208); ctx.lineTo(0,-222); ctx.lineTo(8,-208); ctx.lineTo(20,-219); ctx.lineTo(26,-199); ctx.closePath(); ctx.fill();
    ctx.fillStyle = red; ctx.fillRect(-29,-201,58,9);
    ctx.beginPath(); ctx.moveTo(-27,-195); ctx.lineTo(-58,-188); ctx.lineTo(-39,-181); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-25,-193); ctx.lineTo(-51,-170); ctx.lineTo(-32,-178); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0d0f12'; ctx.fillRect(-23,-189,20,11); ctx.fillRect(3,-189,20,11); ctx.fillRect(-4,-186,8,3);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-20,-187,7,2); ctx.fillRect(6,-187,7,2);
    ctx.strokeStyle = '#7e4938'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-8,-168); ctx.quadraticCurveTo(1,-163,10,-169); ctx.stroke();
    ctx.strokeStyle = '#555c63'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10,-151); ctx.lineTo(-2,-126); ctx.lineTo(9,-151); ctx.stroke();
    ctx.fillStyle = '#aeb4b8'; ctx.fillRect(-6,-128,12,16);
    ctx.restore(); ctx.restore();
  }

  function drawAim(ctx, tank, aim, steroidTimer, gravity = GRAVITY) {
    if (!aim || tank.flying) return;
    const dx = tank.x - aim.x;
    const dy = tank.y - aim.y;
    const rawPull = Math.hypot(dx, dy);
    const pull = Math.min(rawPull, MAX_PULL);
    const len = rawPull || 1;
    const boost = steroidTimer > 0 ? 1.42 : 1;
    const vx = (dx / len) * pull * 4.05 * boost;
    const vy = (dy / len) * pull * 4.05 * boost;
    ctx.save();
    ctx.setLineDash([11,9]); ctx.strokeStyle = steroidTimer > 0 ? '#a8ff58' : '#ffcf33'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(tank.x,tank.y); ctx.lineTo(aim.x,aim.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let i=1;i<=18;i++) {
      const tt = i * 0.09;
      const x = aim.x + vx * tt;
      const y = Math.min(aim.y, GROUND - 40) + vy * tt + 0.5 * gravity * tt * tt;
      if (y > GROUND) break;
      ctx.beginPath(); ctx.arc(x,y,Math.max(2,5-i*0.18),0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  function updateCamera(cameraX, tank, aim, running, dt) {
    let target = 0;
    if (running && aim && !tank.flying) {
      const pull = Math.hypot(tank.x - aim.x, tank.y - aim.y);
      const ratio = Math.min(1, pull / MAX_PULL);
      target = -AIM_CAMERA_BACK * (0.30 + 0.70 * Math.sqrt(ratio));
    } else if (running && tank.flying) {
      target = Math.max(0, tank.x - CAMERA_FOLLOW_SCREEN_X);
    }
    const t = 1 - Math.exp(-CAMERA_EASE * dt);
    const next = cameraX + (target - cameraX) * t;
    return Math.abs(next - target) < 0.05 ? target : next;
  }

  function updateJohnny(johnny, tank, aim, running, dt) {
    let desiredArm = -0.75, desiredLean = 0, desiredSquat = 0;
    if (johnny.catchPose > 0) {
      johnny.catchPose = Math.max(0, johnny.catchPose - dt);
      desiredArm = -1.55; desiredLean = -0.06; desiredSquat = 0.18;
    } else if (aim && !tank.flying && running) {
      const heldY = Math.min(aim.y, GROUND - 40);
      desiredArm = clamp(Math.atan2(heldY - (GROUND - 172), aim.x - 176), -2.55, 1.0);
      const ratio = Math.min(MAX_PULL, Math.hypot(tank.x - aim.x, tank.y - aim.y)) / MAX_PULL;
      desiredLean = -0.18 * ratio; desiredSquat = 0.14 * ratio;
    } else if (johnny.releaseTimer > 0) {
      johnny.releaseTimer = Math.max(0, johnny.releaseTimer - dt);
      const t = johnny.releaseTimer / 0.28;
      desiredArm = 0.42 - 1.05 * (1 - t); desiredLean = 0.24 * t; desiredSquat = 0.12 * t;
    } else if (tank.flying) {
      desiredArm = -0.28; desiredLean = 0.03;
    }
    const ease = 1 - Math.exp(-14 * dt);
    johnny.armAngle += (desiredArm - johnny.armAngle) * ease;
    johnny.torsoLean += (desiredLean - johnny.torsoLean) * ease;
    johnny.squat += (desiredSquat - johnny.squat) * ease;
  }

  window.JMShared = { W,H,GROUND,GRAVITY,TANK_HOME,MAX_PULL,AIM_CAMERA_BACK,CAMERA_EASE,clamp,pseudoRandom,pointerToWorld,drawTank,drawJohnny,drawAim,updateCamera,updateJohnny };
})();