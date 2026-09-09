(() => {
  'use strict';

  const VISUAL_SCALE = 1.35;
  const BASE_BOTTOM = 34;
  const SCALED_BOTTOM = BASE_BOTTOM * VISUAL_SCALE;
  const ANCHOR_Y_OFFSET = BASE_BOTTOM - SCALED_BOTTOM;
  const HIT_BONUS = 18;

  function drawTank(ctx, t, label = 'THROW ME') {
    ctx.save();
    ctx.translate(t.x, t.y + ANCHOR_Y_OFFSET);
    ctx.rotate(t.angle || 0);
    ctx.scale(VISUAL_SCALE, VISUAL_SCALE);

    // Tracks and road wheels.
    ctx.fillStyle = '#171b18';
    ctx.fillRect(-52, 10, 104, 25);
    ctx.fillStyle = '#2c322c';
    ctx.fillRect(-47, 13, 94, 18);
    ctx.fillStyle = '#0d0f0e';
    for (let x = -39; x <= 39; x += 19) {
      ctx.beginPath();
      ctx.arc(x, 23, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4b5445';
      ctx.beginPath();
      ctx.arc(x, 23, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0d0f0e';
    }

    // Lower hull.
    ctx.fillStyle = '#465440';
    ctx.beginPath();
    ctx.moveTo(-44, 10);
    ctx.lineTo(-36, -12);
    ctx.lineTo(39, -12);
    ctx.lineTo(49, 9);
    ctx.closePath();
    ctx.fill();

    // Upper hull / turret.
    ctx.fillStyle = '#5e6d50';
    ctx.fillRect(-36, -15, 73, 25);
    ctx.beginPath();
    ctx.arc(2, -15, 23, Math.PI, 0);
    ctx.fill();

    // Barrel and muzzle.
    ctx.fillStyle = '#59664b';
    ctx.fillRect(10, -22, 72, 8);
    ctx.fillStyle = '#313a2f';
    ctx.fillRect(79, -24, 10, 12);

    // Turret hatch and small details.
    ctx.fillStyle = '#394535';
    ctx.fillRect(-7, -37, 22, 7);
    ctx.fillStyle = '#737f66';
    ctx.fillRect(-4, -35, 16, 3);
    ctx.fillStyle = '#879276';
    ctx.fillRect(-29, -7, 8, 4);
    ctx.fillRect(22, -7, 8, 4);

    ctx.fillStyle = '#d5deaa';
    ctx.font = '900 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, 5);
    ctx.textAlign = 'left';

    ctx.restore();
  }

  function installSharedRenderer() {
    if (window.JMShared) window.JMShared.drawTank = drawTank;
  }

  window.JMTankArt = {
    VISUAL_SCALE,
    HIT_BONUS,
    drawTank,
    installSharedRenderer
  };

  installSharedRenderer();
})();