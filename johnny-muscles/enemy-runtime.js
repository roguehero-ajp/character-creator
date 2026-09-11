(() => {
  'use strict';

  const current = document.currentScript;
  const core = current?.dataset?.core;
  if (!core) throw new Error('enemy-runtime.js requires data-core');
  if (!window.JMEnemyArt) throw new Error('enemy-art.js must load before enemy-runtime.js');
  if (!window.JMTankArt) throw new Error('tank-art.js must load before enemy-runtime.js');

  const PLAYER_CORES = new Set(['game.js', 'city2.js', 'city3.js', 'city4.js', 'city5.js']);
  const SHARED_PLAYER_CORES = new Set(['city4.js', 'city5.js']);
  const STORAGE = {
    selected: 'johnnyMuscles.selectedCharacter',
    rickUnlocked: 'johnnyMuscles.rickUnlocked',
    city1Beaten: 'johnnyMuscles.city1Beaten'
  };
  const GROUND = 603;
  const HOME = { x: 250, y: GROUND - 46 };
  const RELOAD_SECONDS = 0.65;
  const JOHNNY_SCALE = 0.50;
  const JOHNNY_ANCHOR_X = 142;
  const JOHNNY_ANCHOR_Y = 582;
  const JOHNNY_OFFSET_X = 24;
  const JOHNNY_OFFSET_Y = 3;

  function read(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  const rickUnlocked = read(STORAGE.rickUnlocked) === 'true' || read(STORAGE.city1Beaten) === 'true';
  const fighterId = read(STORAGE.selected) === 'rick' && rickUnlocked ? 'rick' : 'johnny';
  const isRick = fighterId === 'rick';

  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }

  function withHeroScale(ctx, draw) {
    ctx.save();
    ctx.translate(JOHNNY_OFFSET_X, JOHNNY_OFFSET_Y);
    ctx.translate(JOHNNY_ANCHOR_X, JOHNNY_ANCHOR_Y);
    ctx.scale(JOHNNY_SCALE, JOHNNY_SCALE);
    ctx.translate(-JOHNNY_ANCHOR_X, -JOHNNY_ANCHOR_Y);
    draw();
    ctx.restore();
  }

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

  function stagedVehicle(t) {
    if (!(t.resetTimer > 0)) return t;
    const p = clamp(t.resetTimer / RELOAD_SECONDS, 0, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    return { ...t, x: HOME.x + (1 - eased) * 430, y: HOME.y, angle: 0 };
  }

  function drawVehicle(ctx, t, label = 'THROW ME') {
    const staged = stagedVehicle(t);
    if (isRick) drawCarPair(ctx, staged);
    else window.JMTankArt.drawTank(ctx, staged, label);
  }

  function drawRickFull(ctx, state = {}, steroidTimer = 0, elapsed = 0) {
    const x = 142;
    const y = GROUND - 31 + (state.squat || 0) * 18;
    const lean = state.torsoLean || 0;
    const skin = '#6b4031';
    const skinDark = '#47291f';
    const green = '#2f7a43';
    const greenDark = '#20552f';
    const orange = '#d8782f';
    const orangeDark = '#84461f';
    const boot = '#17191d';
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

    ctx.save(); ctx.translate(x, y);
    if (steroidTimer > 0) { ctx.shadowColor = '#a8ff58'; ctx.shadowBlur = 24 + Math.sin(elapsed * 12) * 8; }
    ctx.rotate(lean * .25);

    ctx.fillStyle = boot; ctx.fillRect(-62, -11, 52, 20); ctx.fillRect(10, -11, 52, 20);
    ctx.fillStyle = orangeDark; ctx.fillRect(-55, -84, 48, 76); ctx.fillRect(7, -84, 48, 76);
    ctx.fillStyle = orange;
    ctx.fillRect(-49, -82, 40, 69); ctx.fillRect(9, -82, 40, 69);
    ctx.fillStyle = '#73502e';
    ctx.fillRect(-43, -68, 16, 10); ctx.fillRect(-18, -39, 14, 10); ctx.fillRect(15, -65, 18, 11); ctx.fillRect(32, -34, 13, 9);

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

  function drawScaledRick(ctx, state, steroidTimer, elapsed) {
    withHeroScale(ctx, () => drawRickFull(ctx, state, steroidTimer, elapsed));
  }

  function drawLegacyHero(ctx, legacyDraw, state, steroidTimer, elapsed) {
    if (isRick) drawScaledRick(ctx, state, steroidTimer, elapsed);
    else withHeroScale(ctx, legacyDraw);
  }

  function fighterDamage(steroidTimer, impactSpeed) {
    if (isRick) return steroidTimer > 0 ? 3 : 2;
    return (steroidTimer > 0 ? 2 : 1) + (impactSpeed > 760 ? 1 : 0);
  }

  const fighter = {
    id: fighterId,
    name: isRick ? 'Rick Rampage' : 'Johnny Muscles',
    throwScale: isRick ? 4.50 : 4.05,
    gravityMultiplier: isRick ? 1.08 : 1,
    impactX: isRick ? 0.62 : 0.86,
    impactY: isRick ? 0.76 : 0.90,
    bounceY: isRick ? -0.18 : -0.30,
    bounceX: isRick ? 0.62 : 0.74,
    collisionBonus: isRick ? 24 : (window.JMTankArt.HIT_BONUS || 18),
    damage: fighterDamage,
    drawVehicle,
    drawLegacyHero
  };
  window.JMFighter = fighter;

  function drawSharedAim(ctx, tank, aim, steroidTimer, gravity = 880) {
    if (!aim || tank.flying) return;
    const dx = tank.x - aim.x, dy = tank.y - aim.y;
    const raw = Math.hypot(dx, dy), pull = Math.min(raw, 360), len = raw || 1;
    const boost = steroidTimer > 0 ? 1.42 : 1;
    const vx = (dx / len) * pull * fighter.throwScale * boost;
    const vy = (dy / len) * pull * fighter.throwScale * boost;
    ctx.save(); ctx.setLineDash([11, 9]); ctx.strokeStyle = steroidTimer > 0 ? '#a8ff58' : '#ffcf33'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(tank.x, tank.y); ctx.lineTo(aim.x, aim.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 1; i <= 18; i++) {
      const tt = i * .09, x = aim.x + vx * tt;
      const y = Math.min(aim.y, GROUND - 40) + vy * tt + .5 * gravity * fighter.gravityMultiplier * tt * tt;
      if (y > GROUND) break;
      ctx.beginPath(); ctx.arc(x, y, Math.max(2, 5 - i * .18), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function installSharedFighterLayer() {
    const S = window.JMShared;
    if (!S || S.__fighter0119Installed) return;
    const oldHero = S.drawJohnny;
    const oldTank = S.drawTank;
    const oldAim = S.drawAim;
    const oldCamera = S.updateCamera;

    S.drawJohnny = function fighterHero(ctx, state, steroidTimer, elapsed) {
      if (isRick) drawScaledRick(ctx, state, steroidTimer, elapsed);
      else withHeroScale(ctx, () => oldHero(ctx, state, steroidTimer, elapsed));
    };

    if (SHARED_PLAYER_CORES.has(core)) {
      S.drawTank = function fighterVehicle(ctx, t, label) { drawVehicle(ctx, t, label); };
      if (isRick) S.drawAim = drawSharedAim;
      S.updateCamera = function fighterCamera(cameraX, tank, aim, running, dt) {
        if (running && tank?.resetTimer > 0) {
          const ease = 1 - Math.exp(-10.5 * dt);
          const next = cameraX + (0 - cameraX) * ease;
          return Math.abs(next) < .05 ? 0 : next;
        }
        return oldCamera(cameraX, tank, aim, running, dt);
      };
    } else {
      S.drawTank = oldTank;
      S.drawAim = oldAim;
      S.updateCamera = oldCamera;
    }
    S.__fighter0119Installed = true;
  }

  installSharedFighterLayer();

  function applyFighterUi() {
    if (!isRick) return;
    const titleName = document.querySelector('#title-screen h1');
    if (titleName) titleName.textContent = 'RICK RAMPAGE';
    document.querySelectorAll('.premise').forEach(el => { el.textContent = el.textContent.replace(/Johnny/g, 'Rick'); });
    document.querySelectorAll('.instructions').forEach(el => {
      el.textContent = el.textContent
        .replace(/Unlimited tanks\./gi, 'Unlimited car pairs.')
        .replace(/Touch the tank or the grab point just to its right/gi, 'Touch the cars or the grab point beside them')
        .replace(/\bthe tank\b/gi, 'the car pair')
        .replace(/\btanks\b/gi, 'car pairs');
    });
    document.querySelectorAll('button').forEach(button => {
      if (/JOHNNY/i.test(button.textContent)) button.textContent = button.textContent.replace(/JOHNNY/gi, 'RICK');
    });
    const throws = document.getElementById('result-throws');
    const throwsLabel = throws?.parentElement?.querySelector('span');
    if (throwsLabel) throwsLabel.textContent = 'Car Pairs Thrown';
  }

  applyFighterUi();

  function replaceOrThrow(source, regex, replacement, label) {
    const next = source.replace(regex, replacement);
    if (next === source) throw new Error(`Visual patch target not found: ${label}`);
    return next;
  }

  function patchTankCollision(source) {
    const bonus = fighter.collisionBonus;
    if (core === 'game.js' || core === 'city2.js') {
      return replaceOrThrow(source, /const r = 37 \+ 25 \* cat\.scale;/, `const r = 37 + 25 * cat.scale + ${bonus};`, `${core} vehicle-cat collision`);
    }
    if (core === 'city3.js') {
      return replaceOrThrow(source, /const radius = cat\.kind === 'bat' \? 48 \* cat\.scale : 37 \+ 25 \* cat\.scale;/, `const radius = (cat.kind === 'bat' ? 48 * cat.scale : 37 + 25 * cat.scale) + ${bonus};`, 'City 3 vehicle-cat collision');
    }
    if (core === 'city4.js') {
      return replaceOrThrow(source, /const r=\(a\.kind==='friendly'\?34:37\+25\*a\.scale\);/, `const r=(a.kind==='friendly'?34:37+25*a.scale)+${bonus};`, 'City 4 vehicle-actor collision');
    }
    if (core === 'city5.js') {
      return replaceOrThrow(source, /const r=c\.kind==='bat'\?48\*c\.scale:c\.kind==='brain'\?55:37\+25\*c\.scale;/, `const r=(c.kind==='bat'?48*c.scale:c.kind==='brain'?55:37+25*c.scale)+${bonus};`, 'City 5 vehicle-cat collision');
    }
    return source;
  }

  function patchLocalTankRenderer(source) {
    if (core === 'game.js' || core === 'city2.js') {
      return replaceOrThrow(source, /  function drawTank\(t = tank\) \{[\s\S]*?\n  \}\n\n  function drawCat\(/, `  function drawTank(t = tank) {\n    window.JMFighter.drawVehicle(ctx, t);\n  }\n\n  function drawCat(`, `${core} drawTank`);
    }
    if (core === 'city3.js') {
      return replaceOrThrow(source, /  function drawTank\(t = tank\) \{[\s\S]*?\n  \}\n\n  function drawGroundCat\(/, `  function drawTank(t = tank) {\n    window.JMFighter.drawVehicle(ctx, t);\n  }\n\n  function drawGroundCat(`, 'City 3 drawTank');
    }
    return source;
  }

  function patchLegacyHeroRenderer(source) {
    if (core !== 'game.js' && core !== 'city2.js' && core !== 'city3.js') return source;
    return replaceOrThrow(source, /(\n\s*)drawJohnny\(\);(\n\s*drawAim\(\);)/, `$1window.JMFighter.drawLegacyHero(ctx, drawJohnny, johnny, steroidTimer, elapsed);$2`, `${core} fighter render call`);
  }

  function patchReloadCamera(source) {
    if (core !== 'game.js' && core !== 'city2.js' && core !== 'city3.js') return source;
    return source.replace(/else if \(running && tank\.flying\) \{/g, 'else if (running && tank.flying && tank.resetTimer <= 0) {');
  }

  function patchRickPhysics(source) {
    if (!isRick || !PLAYER_CORES.has(core)) return source;
    let next = source.replace(/4\.05/g, 'window.JMFighter.throwScale');
    next = next.replace(/tank\.vy\s*\+=\s*GRAVITY\s*\*\s*dt/g, 'tank.vy += GRAVITY * window.JMFighter.gravityMultiplier * dt');
    next = next.replace(/const\s+(damage|dmg)\s*=\s*\(steroidTimer\s*>\s*0\s*\?\s*2\s*:\s*1\)\s*\+\s*\((impactSpeed|impact)\s*>\s*760\s*\?\s*1\s*:\s*0\)\s*;/g, 'const $1 = window.JMFighter.damage(steroidTimer, $2);');
    next = next.replace(/tank\.vx\s*\*=\s*0?\.86\s*;\s*tank\.vy\s*\*=\s*0?\.9(?:0)?\s*;/g, 'tank.vx *= window.JMFighter.impactX; tank.vy *= window.JMFighter.impactY;');
    next = next.replace(/tank\.vy\s*\*=\s*-0?\.30\s*;\s*tank\.vx\s*\*=\s*0?\.74\s*;/g, 'tank.vy *= window.JMFighter.bounceY; tank.vx *= window.JMFighter.bounceX;');
    return next;
  }

  function patchEnemyArt(source) {
    if (core === 'game.js') {
      return replaceOrThrow(source, /  function drawCat\(cat\) \{[\s\S]*?\n  \}\n\n  function drawAim\(\) \{/, `  function drawCat(cat) {\n    ctx.save();\n    ctx.translate(cat.x, cat.y + Math.sin(cat.bob) * 2);\n    ctx.scale(cat.scale, cat.scale);\n    window.JMEnemyArt.drawGround(ctx, { chonker: cat.chonker, wounded: cat.hp < cat.maxHp, phase: cat.bob });\n    ctx.restore();\n  }\n\n  function drawAim() {`, 'City 1 drawCat');
    }
    if (core === 'city2.js') {
      return replaceOrThrow(source, /  function drawCat\(cat\) \{[\s\S]*?\n  \}\n\n  function drawAim\(\) \{/, `  function drawCat(cat) {\n    ctx.save();\n    const crouchY = cat.crouch * 10;\n    ctx.translate(cat.x, cat.y + Math.sin(cat.bob) * 2 + crouchY);\n    ctx.scale(cat.scale, cat.scale * (1 - cat.crouch * 0.12));\n    window.JMEnemyArt.drawGround(ctx, { chonker: cat.chonker, wounded: cat.hp < cat.maxHp, phase: cat.bob, crouch: cat.crouch, windup: cat.mode === 'windup' });\n    ctx.restore();\n  }\n\n  function drawAim() {`, 'City 2 drawCat');
    }
    if (core === 'city3.js') {
      let next = replaceOrThrow(source, /  function drawGroundCat\(cat\) \{[\s\S]*?\n  \}\n\n  function drawBatCat\(cat\) \{/, `  function drawGroundCat(cat) {\n    window.JMEnemyArt.drawGround(ctx, { chonker: cat.chonker, wounded: cat.hp < cat.maxHp, phase: cat.bob });\n  }\n\n  function drawBatCat(cat) {`, 'City 3 drawGroundCat');
      next = replaceOrThrow(next, /  function drawBatCat\(cat\) \{[\s\S]*?\n  \}\n\n  function drawCat\(cat\) \{/, `  function drawBatCat(cat) {\n    window.JMEnemyArt.drawBat(ctx, { phase: cat.phase });\n  }\n\n  function drawCat(cat) {`, 'City 3 drawBatCat');
      return next;
    }
    if (core === 'city4.js') {
      return replaceOrThrow(source, /  function drawActor\(a\)\{[\s\S]*?\n  function render\(\)\{/, `  function drawActor(a){\n    ctx.save();\n    ctx.translate(a.x,a.y+Math.sin(a.bob)*2);\n    if(a.kind==='friendly'&&a.bonked)ctx.rotate(a.spin*.15);\n    ctx.scale(a.scale,a.scale);\n    if(a.kind==='friendly') window.JMEnemyArt.drawFriendly(ctx,{color:a.color,phase:a.bob,bonked:a.bonked});\n    else window.JMEnemyArt.drawGround(ctx,{chonker:a.chonker,wounded:a.hp<a.maxHp,phase:a.bob});\n    ctx.restore();\n  }\n  function render(){`, 'City 4 drawActor');
    }
    if (core === 'city5.js') {
      return replaceOrThrow(source, /  function drawCat\(c\)\{[\s\S]*?\n  function render\(\)\{/, `  function drawCat(c){\n    ctx.save();\n    ctx.translate(c.x,c.y+Math.sin(c.bob)*2);\n    ctx.scale(c.scale,c.scale);\n    if(c.kind==='brain') window.JMEnemyArt.drawBrain(ctx,{phase:c.phase,charge:Math.max(0,Math.min(1,(.8-c.pulseTimer)/.8))});\n    else if(c.kind==='bat') window.JMEnemyArt.drawBat(ctx,{phase:c.phase});\n    else window.JMEnemyArt.drawGround(ctx,{chonker:c.chonker,wounded:c.hp<c.maxHp,phase:c.bob});\n    ctx.restore();\n  }\n  function render(){`, 'City 5 drawCat');
    }
    if (core === 'boss1.js') {
      return replaceOrThrow(source, /  function drawBob\(\)\{[\s\S]*?\n  function render\(\)\{/, `  function drawBob(){\n    ctx.save();\n    ctx.translate(bossX,GROUND-45);\n    ctx.scale(1.6,1.6);\n    window.JMEnemyArt.drawBob(ctx,{flash:bossHitFlash>0,phase:bossPhase,windup:bossWindup,time:elapsed});\n    if(bossWindup>0) drawTank(ctx,{x:0,y:-225,angle:-.12},'BOB TANK');\n    ctx.restore();\n  }\n  function render(){`, 'Boss 1 drawBob');
    }
    throw new Error(`Unsupported enemy runtime core: ${core}`);
  }

  function patch(source) {
    let next = patchLocalTankRenderer(source);
    next = patchTankCollision(next);
    next = patchLegacyHeroRenderer(next);
    next = patchReloadCamera(next);
    next = patchRickPhysics(next);
    next = patchEnemyArt(next);
    return next;
  }

  fetch(`${core}?rev=0.11.9-core`, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`Could not load ${core}: ${response.status}`);
      return response.text();
    })
    .then(source => patch(source))
    .then(source => {
      const blob = new Blob([source], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => URL.revokeObjectURL(url);
      script.onerror = () => {
        URL.revokeObjectURL(url);
        throw new Error(`Could not execute patched ${core}`);
      };
      document.body.appendChild(script);
    })
    .catch(error => {
      console.error('[Johnny Muscles fighter/runtime]', error);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = 'FIGHTER DEPLOYMENT FAILED';
        toast.classList.add('show');
      }
    });
})();
