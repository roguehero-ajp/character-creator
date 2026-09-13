(() => {
  'use strict';

  const S = window.JMShared;
  const T = window.JMTankArt;
  const F = window.JMWorld3Fighter;
  if (!S || !T || !F) throw new Error('Boss 3 requires shared, tank, and World 3 fighter modules');

  const { W, H, GROUND, GRAVITY, TANK_HOME, MAX_PULL, clamp, pointerToWorld, updateCamera, updateJohnny } = S;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const healthEl = document.getElementById('health');
  const bossHpEl = document.getElementById('boss-hp');
  const ridesEl = document.getElementById('rides');
  const pounceHitsEl = document.getElementById('pounce-hits');
  const steroidButton = document.getElementById('steroids');
  const steroidCountEl = document.getElementById('steroid-count');
  const muteButton = document.getElementById('mute');
  const titleScreen = document.getElementById('title-screen');
  const gameOverScreen = document.getElementById('game-over');
  const victoryScreen = document.getElementById('mission-complete');
  const finalScoreEl = document.getElementById('final-score');
  const toastEl = document.getElementById('toast');
  const resultStarsEl = document.getElementById('result-stars');
  const resultScoreEl = document.getElementById('result-score');
  const resultHitsEl = document.getElementById('result-hits');
  const resultRidesEl = document.getElementById('result-rides');
  const resultPouncesEl = document.getElementById('result-pounces');
  const resultDefenseEl = document.getElementById('result-defense');

  const BOSS_MAX_HP = 9;
  const HERO_HIT_X = 166;
  const LEDGES = [
    { x: 990, y: GROUND - 38, w: 190 },
    { x: 1110, y: GROUND - 176, w: 175 },
    { x: 900, y: GROUND - 304, w: 165 }
  ];

  let lastTime = performance.now();
  let running = false;
  let gameOver = false;
  let victory = false;
  let score = 0;
  let health = 5;
  let bossHealth = BOSS_MAX_HP;
  let bossPhase = 1;
  let elapsed = 0;
  let steroidsLeft = 3;
  let steroidTimer = 0;
  let muted = false;
  let audioCtx = null;
  let aim = null;
  let shake = 0;
  let cameraX = 0;
  let toastTimer = null;
  let bossHitFlash = 0;
  let rides = 0;
  let pounceHits = 0;
  let directHits = 0;
  let damageTaken = 0;
  let attackCount = 0;

  const particles = [];
  const floaters = [];
  const hero = { armAngle: -.75, releaseTimer: 0, torsoLean: 0, squat: 0, catchPose: 0 };
  const tank = { x: TANK_HOME.x, y: TANK_HOME.y, vx: 0, vy: 0, angle: 0, angular: 0, flying: false, resetTimer: 0, bounced: false, hitMunroe: false, ridden: false };
  const munroe = {
    x: LEDGES[1].x,
    y: LEDGES[1].y,
    ledge: 1,
    state: 'perched',
    stateTimer: 2.0,
    interceptReady: true,
    interceptCooldown: 0,
    rideTimer: 0,
    pounceT: 0,
    pounceDuration: .8,
    startX: 0,
    startY: 0,
    targetX: 0,
    targetY: 0,
    targetLedge: 0,
    attackDive: false,
    hitThisPounce: false,
    staggered: false,
    wiggle: 0
  };

  function showToast(text, duration = 900) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), duration);
  }

  function beep(type = 'impact') {
    if (muted) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const n = audioCtx.currentTime;
      const sounds = {
        throw: [90, 52, .12, 'sawtooth'], impact: [72, 38, .09, 'square'], hurt: [120, 70, .22, 'square'],
        boss: [105, 54, .18, 'sawtooth'], warning: [180, 300, .24, 'square'], ride: [360, 95, .30, 'triangle'],
        pounce: [260, 680, .18, 'triangle'], crash: [92, 38, .28, 'square'], win: [330, 880, .5, 'triangle'],
        power: [160, 420, .25, 'sawtooth'], ping: [560, 300, .12, 'square']
      };
      const s = sounds[type] || sounds.impact;
      o.type = s[3];
      o.frequency.setValueAtTime(s[0], n);
      o.frequency.exponentialRampToValueAtTime(s[1], n + s[2]);
      g.gain.setValueAtTime(.065, n);
      g.gain.exponentialRampToValueAtTime(.001, n + s[2]);
      o.connect(g).connect(audioCtx.destination);
      o.start(n); o.stop(n + s[2]);
    } catch (_) {}
  }

  function phaseForHp() {
    return bossHealth > 6 ? 1 : bossHealth > 3 ? 2 : 3;
  }

  function phaseSettings() {
    if (bossPhase === 1) return { attack: 3.4, wiggle: .82, ride: .60, intercept: 4.8 };
    if (bossPhase === 2) return { attack: 2.6, wiggle: .68, ride: .76, intercept: 3.6 };
    return { attack: 1.95, wiggle: .54, ride: .92, intercept: 2.75 };
  }

  function updateHud() {
    scoreEl.textContent = String(score).padStart(6, '0');
    healthEl.textContent = Array.from({ length: 5 }, (_, i) => i < health ? '♥' : '♡').join(' ');
    bossHpEl.textContent = '■'.repeat(Math.max(0, bossHealth)) + '□'.repeat(Math.max(0, BOSS_MAX_HP - bossHealth));
    ridesEl.textContent = String(rides);
    pounceHitsEl.textContent = String(pounceHits);
  }

  function addImpact(x, y, strong = false, color = '#ffd85a') {
    for (let i = 0; i < (strong ? 28 : 14); i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * (strong ? 340 : 180);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 90, life: .4 + Math.random() * .5, max: .9, size: 3 + Math.random() * 10, color });
    }
    shake = Math.max(shake, strong ? 18 : 8);
  }

  function resetTank() {
    Object.assign(tank, { x: TANK_HOME.x, y: TANK_HOME.y, vx: 0, vy: 0, angle: 0, angular: 0, flying: false, resetTimer: 0, bounced: false, hitMunroe: false, ridden: false });
    aim = null;
    hero.releaseTimer = 0;
  }

  function resetFight() {
    running = true; gameOver = false; victory = false; score = 0; health = 5; bossHealth = BOSS_MAX_HP; bossPhase = 1;
    elapsed = 0; steroidsLeft = 3; steroidTimer = 0; aim = null; shake = 0; cameraX = 0; bossHitFlash = 0;
    rides = 0; pounceHits = 0; directHits = 0; damageTaken = 0; attackCount = 0;
    particles.length = 0; floaters.length = 0;
    Object.assign(hero, { armAngle: -.75, releaseTimer: 0, torsoLean: 0, squat: 0, catchPose: 0 });
    Object.assign(munroe, {
      x: LEDGES[1].x, y: LEDGES[1].y, ledge: 1, state: 'perched', stateTimer: 2.1,
      interceptReady: true, interceptCooldown: 0, rideTimer: 0, pounceT: 0, pounceDuration: .8,
      startX: 0, startY: 0, targetX: 0, targetY: 0, targetLedge: 0,
      attackDive: false, hitThisPounce: false, staggered: false, wiggle: 0
    });
    resetTank();
    steroidButton.disabled = false;
    steroidCountEl.textContent = '3 demo doses';
    updateHud();
    showToast('BOSS 3: MAJOR MUNROE THE MOUNTAIN LION', 1500);
    setTimeout(() => showToast(`WARNING: MUNROE MAY BOARD THE ${F.projectileName}.`, 1700), 1550);
  }

  function hurtHero(label) {
    if (gameOver || victory) return;
    health--;
    damageTaken++;
    shake = 22;
    addImpact(HERO_HIT_X, GROUND - 72, true, '#ffbb63');
    showToast(label, 1000);
    beep('hurt');
    updateHud();
    if (health <= 0) loseFight();
  }

  function damageMunroe(amount, label) {
    if (victory) return;
    bossHealth = Math.max(0, bossHealth - amount);
    score += 700 * amount * bossPhase;
    bossHitFlash = .30;
    shake = 20;
    addImpact(munroe.x, munroe.y - 105, true, '#a8ff58');
    floaters.push({ x: munroe.x, y: munroe.y - 185, text: `${label} -${amount}`, life: 1.0 });
    beep('boss');
    const oldPhase = bossPhase;
    bossPhase = phaseForHp();
    updateHud();
    if (bossHealth <= 0) {
      winFight();
      return;
    }
    if (bossPhase !== oldPhase) {
      showToast(bossPhase === 2 ? 'MUNROE HAS STARTED USING YOUR THROW AS TRANSPORTATION.' : 'MUNROE HAS ENTERED MAXIMUM MOUNTAIN LION.', 1750);
    }
  }

  function chooseDifferentLedge() {
    let next = munroe.ledge;
    while (next === munroe.ledge) next = Math.floor(Math.random() * LEDGES.length);
    return next;
  }

  function beginPounce(fromRide = false) {
    if (victory || gameOver) return;
    munroe.state = 'wiggle';
    munroe.stateTimer = fromRide ? .28 : phaseSettings().wiggle;
    munroe.wiggle = 0;
    munroe.attackDive = bossPhase === 3 && !fromRide && attackCount % 2 === 1;
    munroe.hitThisPounce = false;
    munroe.staggered = false;
    showToast(fromRide ? 'MUNROE IS PREPARING TO DISMOUNT!' : 'MUNROE IS ASSUMING THE CAT POSITION', fromRide ? 650 : 1050);
    beep('warning');
  }

  function launchPounce() {
    munroe.state = 'pounce';
    munroe.pounceT = 0;
    munroe.startX = munroe.x;
    munroe.startY = munroe.y;
    if (munroe.attackDive) {
      munroe.targetLedge = -1;
      munroe.targetX = 335;
      munroe.targetY = GROUND - 38;
      munroe.pounceDuration = .82;
      showToast(`${F.shortName}: INCOMING MOUNTAIN LION!`, 900);
    } else {
      munroe.targetLedge = chooseDifferentLedge();
      const target = LEDGES[munroe.targetLedge];
      munroe.targetX = target.x;
      munroe.targetY = target.y;
      munroe.pounceDuration = bossPhase === 1 ? .78 : .62;
    }
    beep('pounce');
  }

  function finishPounce() {
    if (munroe.attackDive) {
      addImpact(munroe.x, GROUND - 20, true, '#d8c18b');
      if (!munroe.staggered) hurtHero('MAJOR MUNROE LANDED THE DIVING POUNCE!');
      else showToast('POUNCE CANCELLED! MUNROE LANDED FACE-FIRST.', 1000);
      munroe.state = 'retreat';
      munroe.stateTimer = .68;
      return;
    }
    if (munroe.targetLedge >= 0) munroe.ledge = munroe.targetLedge;
    const ledge = LEDGES[munroe.ledge];
    munroe.x = ledge.x;
    munroe.y = ledge.y;
    munroe.state = 'perched';
    munroe.stateTimer = phaseSettings().attack;
  }

  function retreatToLedge() {
    munroe.ledge = 0;
    munroe.x = LEDGES[0].x;
    munroe.y = LEDGES[0].y;
    munroe.state = 'perched';
    munroe.stateTimer = phaseSettings().attack * .72;
    showToast('MUNROE SCRAMBLED BACK TO THE ROCKS.', 700);
  }

  function startRide() {
    munroe.state = 'riding';
    munroe.rideTimer = phaseSettings().ride;
    munroe.interceptReady = false;
    munroe.interceptCooldown = phaseSettings().intercept;
    tank.ridden = true;
    tank.hitMunroe = true;
    rides++;
    score += 250;
    showToast(`MUNROE CAUGHT A RIDE ON THE ${F.projectileName}!`, 1150);
    beep('ride');
    updateHud();
  }

  function finishRide() {
    tank.ridden = false;
    tank.vx *= -.36;
    tank.vy = -Math.abs(tank.vy) * .42 - 95;
    tank.angular *= -1.1;
    addImpact(munroe.x, munroe.y, true, '#ffd85a');
    beginPounce(true);
  }

  function updateMunroe(dt) {
    if (victory || gameOver) return;
    bossHitFlash = Math.max(0, bossHitFlash - dt);
    if (!munroe.interceptReady) {
      munroe.interceptCooldown -= dt;
      if (munroe.interceptCooldown <= 0) munroe.interceptReady = true;
    }

    if (munroe.state === 'riding') {
      munroe.x = tank.x;
      munroe.y = tank.y - 8;
      munroe.rideTimer -= dt;
      tank.vy -= 55 * bossPhase * dt;
      tank.angular += 1.8 * dt;
      if (munroe.rideTimer <= 0 || tank.y > GROUND - 75 || tank.x > 1900) finishRide();
      return;
    }

    if (munroe.state === 'wiggle') {
      munroe.stateTimer -= dt;
      munroe.wiggle += dt * 28;
      if (munroe.stateTimer <= 0) launchPounce();
      return;
    }

    if (munroe.state === 'pounce') {
      munroe.pounceT += dt / munroe.pounceDuration;
      const t = clamp(munroe.pounceT, 0, 1);
      const arc = Math.sin(Math.PI * t) * (munroe.attackDive ? 205 : 145);
      munroe.x = munroe.startX + (munroe.targetX - munroe.startX) * t;
      munroe.y = munroe.startY + (munroe.targetY - munroe.startY) * t - arc;
      if (t >= 1) finishPounce();
      return;
    }

    if (munroe.state === 'retreat') {
      munroe.stateTimer -= dt;
      if (munroe.stateTimer <= 0) retreatToLedge();
      return;
    }

    munroe.stateTimer -= dt;
    if (munroe.stateTimer <= 0) {
      attackCount++;
      beginPounce(false);
    }
  }

  function heldTankPosition() {
    return !aim || tank.flying ? { x: tank.x, y: tank.y } : { x: aim.x, y: Math.min(aim.y, GROUND - 40) };
  }

  function throwTank() {
    if (!aim || tank.flying || !running || victory || gameOver) return;
    const dx = tank.x - aim.x;
    const dy = tank.y - aim.y;
    const p = Math.hypot(dx, dy);
    if (p < 18) { aim = null; return; }
    const sc = Math.min(p, MAX_PULL) / p;
    const boost = steroidTimer > 0 ? 1.42 : 1;
    const h = heldTankPosition();
    Object.assign(tank, {
      x: h.x, y: h.y,
      vx: dx * sc * F.throwScale * boost,
      vy: dy * sc * F.throwScale * boost,
      angular: Math.min(9, 2 + p / 55), flying: true, resetTimer: 0, bounced: false, hitMunroe: false, ridden: false
    });
    aim = null;
    hero.releaseTimer = .28;
    beep('throw');
    if (navigator.vibrate) navigator.vibrate(20);
  }

  function hitMunroe() {
    if (tank.hitMunroe || munroe.state === 'riding' || munroe.state === 'wiggle') return;
    tank.hitMunroe = true;

    if (munroe.state === 'pounce') {
      if (!munroe.hitThisPounce) {
        munroe.hitThisPounce = true;
        munroe.staggered = true;
        pounceHits++;
        damageMunroe(2, 'MID-POUNCE BONK');
        showToast('POUNCE INTERCEPTED!', 850);
      }
      tank.vx *= .72;
      tank.vy *= .72;
      updateHud();
      return;
    }

    if (munroe.state === 'perched' && munroe.interceptReady && tank.vx > 0 && bossHealth > 1) {
      startRide();
      return;
    }

    directHits++;
    damageMunroe(1, 'DIRECT HIT');
    tank.vx *= F.impactX;
    tank.vy *= F.impactY;
  }

  function updateTank(dt) {
    if (!tank.flying) return;
    tank.vy += GRAVITY * F.gravityMultiplier * dt;
    tank.x += tank.vx * dt;
    tank.y += tank.vy * dt;
    tank.angle += tank.angular * dt;

    const centerY = munroe.state === 'riding' ? munroe.y : munroe.y - 100;
    const hitRadius = munroe.state === 'pounce' ? 105 : 92;
    if (!tank.ridden && Math.hypot(tank.x - munroe.x, tank.y - centerY) < hitRadius + F.collisionBonus) hitMunroe();

    if (tank.y >= GROUND - 22) {
      tank.y = GROUND - 22;
      if (Math.abs(tank.vy) > 160 && !tank.bounced) {
        tank.vy *= F.bounceY;
        tank.vx *= F.bounceX;
        tank.angular *= .65;
        tank.bounced = true;
        addImpact(tank.x, tank.y + 15, true);
        beep('impact');
      } else {
        tank.vy = 0;
        tank.vx *= Math.pow(.055, dt);
        tank.angular *= Math.pow(.03, dt);
      }
    }

    if (tank.x < -300 || tank.x > 2250 || (tank.y >= GROUND - 23 && Math.abs(tank.vx) < 14)) {
      tank.resetTimer += dt;
      if (tank.resetTimer > .60 && munroe.state !== 'riding') resetTank();
    } else tank.resetTimer = 0;
  }

  function loseFight() {
    if (gameOver) return;
    running = false;
    gameOver = true;
    aim = null;
    finalScoreEl.textContent = `Munroe HP: ${bossHealth}/${BOSS_MAX_HP} · Rides stolen: ${rides} · Pounces interrupted: ${pounceHits}`;
    gameOverScreen.classList.add('visible');
  }

  function winFight() {
    if (victory) return;
    victory = true;
    running = false;
    aim = null;
    tank.ridden = false;
    showToast('MAJOR MUNROE DEFEATED!', 1800);
    beep('win');
    const stars = 1 + (damageTaken === 0 ? 1 : 0) + (pounceHits >= 1 ? 1 : 0);
    resultStarsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    resultScoreEl.textContent = score.toLocaleString();
    resultHitsEl.textContent = String(directHits + pounceHits);
    resultRidesEl.textContent = String(rides);
    resultPouncesEl.textContent = String(pounceHits);
    resultDefenseEl.textContent = damageTaken === 0 ? 'UNTOUCHED' : `${health}/5 HEARTS`;
    setTimeout(() => victoryScreen.classList.add('visible'), 950);
  }

  function drawAim() {
    if (!aim || tank.flying) return;
    const dx = tank.x - aim.x, dy = tank.y - aim.y;
    const raw = Math.hypot(dx, dy), pull = Math.min(raw, MAX_PULL), len = raw || 1;
    const boost = steroidTimer > 0 ? 1.42 : 1;
    const vx = (dx / len) * pull * F.throwScale * boost;
    const vy = (dy / len) * pull * F.throwScale * boost;
    const held = heldTankPosition();
    ctx.save(); ctx.setLineDash([11, 9]); ctx.strokeStyle = steroidTimer > 0 ? '#a8ff58' : '#ffcf33'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(tank.x, tank.y); ctx.lineTo(aim.x, aim.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 1; i <= 18; i++) {
      const tt = i * .09;
      const x = held.x + vx * tt;
      const y = held.y + vy * tt + .5 * GRAVITY * F.gravityMultiplier * tt * tt;
      if (y > GROUND) break;
      ctx.beginPath(); ctx.arc(x, y, Math.max(2, 5 - i * .18), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawHeroScaled() {
    ctx.save();
    ctx.translate(24, 3);
    ctx.translate(142, 582);
    ctx.scale(.50, .50);
    ctx.translate(-142, -582);
    S.drawJohnny(ctx, hero, steroidTimer, elapsed);
    ctx.restore();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#3f536b'); sky.addColorStop(.55, '#8d9393'); sky.addColorStop(1, '#d1ad7d');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    ctx.save(); ctx.translate(-cameraX * .08, 0);
    ctx.fillStyle = '#414b50';
    ctx.beginPath(); ctx.moveTo(-500, GROUND - 160);
    for (let x = -500; x < 2800; x += 135) {
      const peak = 190 + Math.abs(Math.sin(x * .007)) * 180;
      ctx.lineTo(x, GROUND - peak);
    }
    ctx.lineTo(2800, GROUND); ctx.lineTo(-500, GROUND); ctx.closePath(); ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#5b6656'; ctx.fillRect(0, GROUND - 34, W, 34);
    ctx.fillStyle = '#4d4d49'; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#77746d'; ctx.fillRect(0, GROUND, W, 7);
  }

  function drawLedges() {
    for (let i = 0; i < LEDGES.length; i++) {
      const l = LEDGES[i];
      ctx.fillStyle = i === 2 ? '#66625c' : '#706b62';
      ctx.beginPath();
      ctx.moveTo(l.x - l.w / 2, l.y + 8);
      ctx.lineTo(l.x + l.w / 2, l.y + 8);
      ctx.lineTo(l.x + l.w * .32, l.y + 88);
      ctx.lineTo(l.x - l.w * .38, l.y + 95);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#898177'; ctx.fillRect(l.x - l.w / 2, l.y, l.w, 13);
    }
  }

  function drawMunroe() {
    const riding = munroe.state === 'riding';
    ctx.save();
    ctx.translate(munroe.x, munroe.y);
    if (riding) ctx.rotate(-.12 + Math.sin(elapsed * 18) * .05);
    else if (munroe.state === 'pounce') ctx.rotate((munroe.targetX - munroe.startX) < 0 ? -.22 : .16);
    const wiggle = munroe.state === 'wiggle' ? Math.sin(munroe.wiggle) * 8 : 0;
    ctx.translate(wiggle, 0);
    ctx.scale(1.35, 1.35);

    const flash = bossHitFlash > 0;
    const fur = flash ? '#f7d5a0' : '#b9824f';
    const light = flash ? '#fff0c8' : '#d8ad76';
    const dark = '#5b3e2c';
    const uniform = '#46533b';
    const uniformDark = '#293124';
    const gold = '#d1ad4b';

    ctx.fillStyle = 'rgba(0,0,0,.24)';
    if (munroe.state !== 'pounce' && !riding) { ctx.beginPath(); ctx.ellipse(0, 4, 58, 13, 0, 0, Math.PI * 2); ctx.fill(); }

    ctx.strokeStyle = dark; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(42, -70); ctx.quadraticCurveTo(93, -88, 86, -42); ctx.quadraticCurveTo(82, -18, 102, -23); ctx.stroke();

    ctx.fillStyle = uniformDark;
    ctx.beginPath(); ctx.ellipse(3, -83, 54, 47, -.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = uniform;
    ctx.beginPath(); ctx.ellipse(0, -88, 48, 43, -.05, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = gold; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-28,-115); ctx.lineTo(0,-70); ctx.lineTo(30,-115); ctx.stroke();
    ctx.fillStyle = gold; ctx.fillRect(-7, -78, 14, 12);

    const legSpread = munroe.state === 'wiggle' ? 5 : munroe.state === 'pounce' ? 18 : 0;
    ctx.strokeStyle = dark; ctx.lineWidth = 19;
    ctx.beginPath(); ctx.moveTo(-27,-72); ctx.lineTo(-38-legSpread,-15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(27,-72); ctx.lineTo(40+legSpread,-15); ctx.stroke();
    ctx.strokeStyle = fur; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(-38-legSpread,-18); ctx.lineTo(-48-legSpread,1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(40+legSpread,-18); ctx.lineTo(50+legSpread,1); ctx.stroke();

    ctx.fillStyle = light;
    ctx.beginPath(); ctx.ellipse(-2, -151, 38, 42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.moveTo(-28,-176); ctx.lineTo(-43,-208); ctx.lineTo(-10,-185); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(27,-177); ctx.lineTo(44,-210); ctx.lineTo(10,-186); ctx.closePath(); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(-42,-207); ctx.lineTo(-46,-218); ctx.lineTo(-35,-207); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(43,-209); ctx.lineTo(47,-220); ctx.lineTo(36,-209); ctx.closePath(); ctx.fill();

    ctx.fillStyle = uniform;
    ctx.fillRect(-34, -195, 67, 11);
    ctx.beginPath(); ctx.ellipse(-1, -194, 34, 11, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = gold; ctx.fillRect(-5, -202, 9, 10);

    ctx.strokeStyle = '#2c211a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-22,-157); ctx.lineTo(-8,-153); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20,-157); ctx.lineTo(7,-153); ctx.stroke();
    ctx.fillStyle = bossPhase === 3 ? '#ffe15f' : '#2e241e';
    ctx.beginPath(); ctx.ellipse(-13,-148,5,6,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(13,-148,5,6,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#5a3d31'; ctx.beginPath(); ctx.moveTo(-6,-133); ctx.lineTo(6,-133); ctx.lineTo(0,-126); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6d4937'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-11,-116); ctx.quadraticCurveTo(0,-108,11,-116); ctx.stroke();

    ctx.fillStyle = gold;
    ctx.font = '900 11px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('MAJ', 0, -91); ctx.textAlign = 'left';

    if (riding) {
      ctx.fillStyle = '#fff0a5'; ctx.font = '900 17px Impact,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('WHEEE!', 0, -235); ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > .4) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    drawBackground();
    ctx.save(); ctx.translate(-cameraX, 0);
    drawLedges();
    drawHeroScaled();
    if (!tank.flying) {
      drawAim();
      if (aim && running) {
        const h = heldTankPosition();
        T.drawTank(ctx, { ...tank, x: h.x, y: h.y, angle: -.08 });
      } else T.drawTank(ctx, tank);
    } else T.drawTank(ctx, tank);
    drawMunroe();

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (const f of floaters) {
      ctx.globalAlpha = Math.max(0, f.life / 1.0); ctx.fillStyle = '#fff4a5';
      ctx.font = '900 26px Impact,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
    ctx.restore(); ctx.restore();
  }

  function update(dt) {
    if (!running) {
      cameraX = updateCamera(cameraX, tank, aim, running, dt);
      updateJohnny(hero, tank, aim, running, dt);
      return;
    }
    elapsed += dt;
    if (steroidTimer > 0) steroidTimer = Math.max(0, steroidTimer - dt);
    updateMunroe(dt);
    updateTank(dt);
    for (const p of particles) { p.life -= dt; p.vy += 420 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    for (const f of floaters) { f.life -= dt; f.y -= 48 * dt; }
    for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
    for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].life <= 0) floaters.splice(i, 1);
    shake *= Math.pow(.002, dt);
    cameraX = updateCamera(cameraX, tank, aim, running, dt);
    updateJohnny(hero, tank, aim, running, dt);
  }

  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, .033);
    lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  canvas.addEventListener('pointerdown', e => {
    if (!running || gameOver || victory || tank.flying) return;
    const p = pointerToWorld(canvas, e, cameraX);
    if (Math.hypot(p.x - tank.x, p.y - tank.y) < 125) {
      aim = p;
      canvas.setPointerCapture?.(e.pointerId);
    }
  });
  canvas.addEventListener('pointermove', e => {
    if (!aim || tank.flying) return;
    const p = pointerToWorld(canvas, e, cameraX);
    const dx = p.x - tank.x, dy = p.y - tank.y, len = Math.hypot(dx, dy);
    aim = len > MAX_PULL ? { x: tank.x + dx / len * MAX_PULL, y: tank.y + dy / len * MAX_PULL } : p;
  });
  canvas.addEventListener('pointerup', throwTank);
  canvas.addEventListener('pointercancel', () => { aim = null; });

  steroidButton.addEventListener('click', () => {
    if (!running || steroidsLeft <= 0) return;
    steroidsLeft--;
    steroidTimer = 12;
    steroidCountEl.textContent = steroidsLeft === 1 ? '1 demo dose' : `${steroidsLeft} demo doses`;
    steroidButton.disabled = steroidsLeft <= 0;
    showToast('UNREGULATED STRENGTH!');
    beep('power');
  });
  muteButton.addEventListener('click', () => { muted = !muted; muteButton.textContent = muted ? '🔇' : '🔊'; });
  document.getElementById('start').addEventListener('click', () => { titleScreen.classList.remove('visible'); resetFight(); beep('warning'); });
  document.getElementById('restart').addEventListener('click', () => { gameOverScreen.classList.remove('visible'); resetFight(); });
  document.getElementById('replay').addEventListener('click', () => { victoryScreen.classList.remove('visible'); resetFight(); });

  updateHud();
  render();
  requestAnimationFrame(frame);
})();
