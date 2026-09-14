(() => {
'use strict';

const BASE='boss3.js?rev=0.13.0-base';
const lines=(...x)=>x.join('\n');

function mustReplace(src,re,replacement,label){
  if(!re.test(src)) throw new Error(`Boss 3 patch failed: ${label}`);
  return src.replace(re,replacement);
}

fetch(BASE,{cache:'no-store'})
  .then(r=>{if(!r.ok)throw new Error(`Boss 3 base load failed: ${r.status}`);return r.text()})
  .then(src=>{
    src=mustReplace(
      src,
      /  const HERO_HIT_X = 166;/,
      lines(
        '  const HERO_HIT_X = 166;',
        '  const CATCH_POINT = { x: 205, y: GROUND - 120 };',
        '  const CATCH_START = 190;',
        '  const CATCH_SECURE = 118;',
        '  const CATCH_HOLD = .11;',
        '  const CAUGHT_POS = { x: 235, y: GROUND - 180 };'
      ),
      'catch constants'
    );

    src=mustReplace(
      src,
      /  let attackCount = 0;/,
      lines(
        '  let attackCount = 0;',
        '  let catches = 0;',
        '  let returnMisses = 0;',
        '  let catchHolding = false;',
        '  let catchPointer = null;',
        '  let catchHold = 0;',
        '  let caughtTank = false;'
      ),
      'catch state'
    );

    src=mustReplace(
      src,
      /  const tank = \{ x: TANK_HOME\.x, y: TANK_HOME\.y, vx: 0, vy: 0, angle: 0, angular: 0, flying: false, resetTimer: 0, bounced: false, hitMunroe: false, ridden: false \};/,
      "  const tank = { x: TANK_HOME.x, y: TANK_HOME.y, vx: 0, vy: 0, angle: 0, angular: 0, flying: false, ready: true, resetTimer: 0, bounced: false, hitMunroe: false, ridden: false, returning: false, flightLife: 0 };",
      'tank state'
    );

    src=mustReplace(
      src,
      /  function resetTank\(\) \{[\s\S]*?\n  \}\n\n  function resetFight\(\) \{/,
      lines(
        '  function resetTank() {',
        '    caughtTank = false; catchHolding = false; catchPointer = null; catchHold = 0;',
        "    Object.assign(tank, { x: TANK_HOME.x, y: TANK_HOME.y, vx: 0, vy: 0, angle: 0, angular: 0, flying: false, ready: true, resetTimer: 0, bounced: false, hitMunroe: false, ridden: false, returning: false, flightLife: 0 });",
        '    aim = null;',
        '    hero.releaseTimer = 0;',
        '  }',
        '',
        '  function holdCaughtTank() {',
        '    catches++; caughtTank = true; catchHolding = false; catchPointer = null; catchHold = 0;',
        "    Object.assign(tank, { x: CAUGHT_POS.x, y: CAUGHT_POS.y, vx: 0, vy: 0, angle: -.08, angular: 0, flying: false, ready: true, resetTimer: 0, bounced: false, hitMunroe: false, ridden: false, returning: false, flightLife: 0 });",
        '    aim = null; hero.catchPose = .28; score += 350;',
        "    showToast('CAUGHT! RETURN TO MUNROE!', 900); beep('ride'); updateHud();",
        '  }',
        '',
        '  function catchWindow() {',
        '    return tank.flying && tank.returning && Math.hypot(tank.x - CATCH_POINT.x, tank.y - CATCH_POINT.y) <= CATCH_START;',
        '  }',
        '  window.JMShouldBypassGrabProxy = p => catchWindow() && Math.hypot(p.x - tank.x, p.y - tank.y) < 145;',
        '',
        '  function resetFight() {'
      ),
      'reset/catch helpers'
    );

    src=mustReplace(
      src,
      /    rides = 0; pounceHits = 0; directHits = 0; damageTaken = 0; attackCount = 0;/,
      '    rides = 0; pounceHits = 0; directHits = 0; damageTaken = 0; attackCount = 0; catches = 0; returnMisses = 0; catchHolding = false; catchPointer = null; catchHold = 0;',
      'fight counters'
    );

    src=mustReplace(
      src,
      /    setTimeout\(\(\) => showToast\(`WARNING: MUNROE MAY BOARD THE \$\{F\.projectileName\}\.`, 1700\), 1550\);/,
      "    setTimeout(() => showToast('HEAD SHOTS HURT. BODY SHOTS GIVE MUNROE A RIDE.', 1900), 1550);",
      'intro instructions'
    );

    src=mustReplace(
      src,
      /  function startRide\(\) \{[\s\S]*?\n  \}\n\n  function finishRide\(\) \{[\s\S]*?\n  \}/,
      lines(
        '  function startRide() {',
        "    munroe.state = 'riding';",
        '    munroe.rideTimer = Math.max(.34, phaseSettings().ride * .68);',
        '    munroe.interceptReady = false;',
        '    munroe.interceptCooldown = phaseSettings().intercept;',
        '    tank.ridden = true; tank.hitMunroe = true; tank.returning = false;',
        '    rides++; score += 250;',
        "    showToast(`LOW HIT! MUNROE RIDES THE ${F.projectileName}!`, 900);",
        "    beep('ride'); updateHud();",
        '  }',
        '',
        '  function finishRide() {',
        '    tank.ridden = false; tank.returning = true; tank.hitMunroe = true; tank.bounced = false; tank.resetTimer = 0;',
        '    tank.vx = -Math.max(920, Math.abs(tank.vx) * 1.25);',
        '    tank.vy = -260;',
        '    tank.angular = -8.5;',
        "    addImpact(munroe.x, munroe.y, true, '#ffd85a');",
        "    showToast('FAST RETURN! CATCH IT!', 900);",
        "    beep('throw');",
        '    beginPounce(true);',
        '  }'
      ),
      'ride counter'
    );

    src=mustReplace(
      src,
      /  function throwTank\(\) \{[\s\S]*?\n  \}\n\n  function hitMunroe\(\) \{/,
      lines(
        '  function throwTank() {',
        '    if (!aim || tank.flying || !tank.ready || !running || victory || gameOver) return;',
        '    const dx = tank.x - aim.x;',
        '    const dy = tank.y - aim.y;',
        '    const p = Math.hypot(dx, dy);',
        '    if (p < 18) { aim = null; return; }',
        '    const sc = Math.min(p, MAX_PULL) / p;',
        '    const boost = (steroidTimer > 0 ? 1.42 : 1) * (window.JMPowerUps?.getThrowMultiplier() ?? 1);',
        '    const h = heldTankPosition();',
        '    caughtTank = false;',
        '    Object.assign(tank, {',
        '      x: h.x, y: h.y,',
        '      vx: dx * sc * F.throwScale * boost,',
        '      vy: dy * sc * F.throwScale * boost,',
        '      angular: Math.min(9, 2 + p / 55), flying: true, ready: false, resetTimer: 0, bounced: false, hitMunroe: false, ridden: false, returning: false, flightLife: 0',
        '    });',
        '    aim = null;',
        '    hero.releaseTimer = .28;',
        "    beep('throw');",
        '    if (navigator.vibrate) navigator.vibrate(20);',
        '  }',
        '',
        '  function hitMunroe(zone) {'
      ),
      'throw/zone signature'
    );

    src=mustReplace(
      src,
      /  function hitMunroe\(zone\) \{[\s\S]*?\n  \}\n\n  function updateTank\(dt\) \{/,
      lines(
        '  function hitMunroe(zone) {',
        "    if (tank.hitMunroe || munroe.state === 'riding' || munroe.state === 'wiggle' || tank.returning) return;",
        '',
        "    if (zone === 'pounce') {",
        '      tank.hitMunroe = true;',
        '      if (!munroe.hitThisPounce) {',
        '        munroe.hitThisPounce = true; munroe.staggered = true; pounceHits++;',
        "        damageMunroe(2, 'MID-POUNCE BONK');",
        "        showToast('POUNCE INTERCEPTED!', 850);",
        '      }',
        '      tank.vx *= .72; tank.vy *= .72; updateHud(); return;',
        '    }',
        '',
        "    if (zone === 'head') {",
        '      tank.hitMunroe = true; directHits++;',
        "      damageMunroe(1, 'HEAD SHOT');",
        '      tank.vx *= F.impactX; tank.vy *= F.impactY; return;',
        '    }',
        '',
        "    if (zone === 'body') startRide();",
        '  }',
        '',
        '  function updateTank(dt) {'
      ),
      'zone collision handler'
    );

    src=mustReplace(
      src,
      /  function updateTank\(dt\) \{[\s\S]*?\n  \}\n\n  function loseFight\(\) \{/,
      lines(
        '  function updateTank(dt) {',
        '    if (!tank.flying) return;',
        '    tank.flightLife += dt;',
        '    tank.vy += GRAVITY * F.gravityMultiplier * dt;',
        '    tank.x += tank.vx * dt;',
        '    tank.y += tank.vy * dt;',
        '    tank.angle += tank.angular * dt;',
        '',
        '    if (!tank.ridden && !tank.returning) {',
        "      if (munroe.state === 'pounce') {",
        "        if (Math.hypot(tank.x - munroe.x, tank.y - (munroe.y - 110)) < 105 + F.collisionBonus) hitMunroe('pounce');",
        '      } else {',
        '        const headHit = Math.hypot(tank.x - munroe.x, tank.y - (munroe.y - 202)) < 62 + F.collisionBonus;',
        '        const bodyHit = Math.hypot(tank.x - munroe.x, tank.y - (munroe.y - 105)) < 88 + F.collisionBonus;',
        "        if (headHit) hitMunroe('head');",
        "        else if (bodyHit) hitMunroe('body');",
        '      }',
        '    }',
        '',
        '    if (tank.returning) {',
        '      if (catchHolding && catchWindow()) {',
        '        catchHold += dt;',
        '        if (catchHold >= CATCH_HOLD && Math.hypot(tank.x - CATCH_POINT.x, tank.y - CATCH_POINT.y) <= CATCH_SECURE) { holdCaughtTank(); return; }',
        '      } else if (!catchHolding) catchHold = 0;',
        '      if (tank.x <= HERO_HIT_X + 35 && tank.y > GROUND - 235) {',
        '        returnMisses++;',
        "        hurtHero(`MUNROE RETURNED THE ${F.projectileName} AT FULL SPEED!`);",
        '        resetTank(); return;',
        '      }',
        '    }',
        '',
        '    if (tank.y >= GROUND - 22) {',
        '      tank.y = GROUND - 22;',
        '      if (Math.abs(tank.vy) > 160 && !tank.bounced) {',
        "        tank.vy *= F.bounceY; tank.vx *= F.bounceX; tank.angular *= .65; tank.bounced = true; addImpact(tank.x, tank.y + 15, true); beep('impact');",
        '      } else {',
        '        tank.vy = 0; tank.vx *= Math.pow(.055, dt); tank.angular *= Math.pow(.03, dt);',
        '      }',
        '    }',
        '',
        "    if (tank.flightLife > 5.5 && munroe.state !== 'riding') { resetTank(); return; }",
        "    if (tank.x < -300 || tank.x > 2250 || (tank.y >= GROUND - 23 && Math.abs(tank.vx) < 14)) {",
        '      tank.resetTimer += dt;',
        "      if (tank.resetTimer > .60 && munroe.state !== 'riding') resetTank();",
        '    } else tank.resetTimer = 0;',
        '  }',
        '',
        '  function loseFight() {'
      ),
      'tank collision/reset'
    );

    src=mustReplace(
      src,
      /    finalScoreEl\.textContent = `Munroe HP: \$\{bossHealth\}\/\$\{BOSS_MAX_HP\} · Rides stolen: \$\{rides\} · Pounces interrupted: \$\{pounceHits\}`;/,
      '    finalScoreEl.textContent = `Munroe HP: ${bossHealth}/${BOSS_MAX_HP} · Rides stolen: ${rides} · Returns missed: ${returnMisses}`;',
      'loss summary'
    );

    src=mustReplace(
      src,
      /  canvas\.addEventListener\('pointerdown', e => \{[\s\S]*?  canvas\.addEventListener\('pointercancel', \(\) => \{ aim = null; \}\);/,
      lines(
        "  canvas.addEventListener('pointerdown', e => {",
        '    if (!running || gameOver || victory) return;',
        '    const p = pointerToWorld(canvas, e, cameraX);',
        '    if (catchWindow() && Math.hypot(p.x - tank.x, p.y - tank.y) < 145) {',
        '      catchHolding = true; catchPointer = e.pointerId; catchHold = 0; canvas.setPointerCapture?.(e.pointerId); return;',
        '    }',
        '    if (tank.flying || !tank.ready) return;',
        '    if (Math.hypot(p.x - tank.x, p.y - tank.y) < 125) { aim = p; canvas.setPointerCapture?.(e.pointerId); }',
        '  });',
        "  canvas.addEventListener('pointermove', e => {",
        '    if (catchHolding || !aim || tank.flying) return;',
        '    const p = pointerToWorld(canvas, e, cameraX);',
        '    const dx = p.x - tank.x, dy = p.y - tank.y, len = Math.hypot(dx, dy);',
        '    aim = len > MAX_PULL ? { x: tank.x + dx / len * MAX_PULL, y: tank.y + dy / len * MAX_PULL } : p;',
        '  });',
        "  canvas.addEventListener('pointerup', e => {",
        '    if (catchHolding && e.pointerId === catchPointer) { catchHolding = false; catchPointer = null; catchHold = 0; return; }',
        '    throwTank();',
        '  });',
        "  canvas.addEventListener('pointercancel', () => { catchHolding = false; catchPointer = null; catchHold = 0; aim = null; });"
      ),
      'catch input'
    );

    (0,eval)(src);
  })
  .catch(err=>{console.error(err);const t=document.getElementById('toast');if(t){t.textContent='BOSS 3 PATCH ERROR — REFRESH';t.classList.add('show')}});
})();