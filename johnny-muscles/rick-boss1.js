(() => {
  'use strict';

  const S = window.JMShared;
  const E = window.JMEnemyArt;
  const T = window.JMTankArt;
  if (!S || !E || !T) throw new Error('Rick boss routine requires shared, enemy, and tank art');

  const { W, H, GROUND, TANK_HOME, MAX_PULL, clamp, pseudoRandom, pointerToWorld, updateCamera, updateJohnny } = S;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const healthEl = document.getElementById('health');
  const bossHpEl = document.getElementById('boss-hp');
  const stoppedEl = document.getElementById('catches');
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
  const resultStoppedEl = document.getElementById('result-catches');
  const resultMissesEl = document.getElementById('result-misses');
  const resultDefenseEl = document.getElementById('result-defense');

  const BOSS_MAX_HP = 12;
  const CAR_RELOAD = 0.65;
  const CAR_THROW_SCALE = 4.50;
  const CAR_GRAVITY = 950;
  const CAR_HOME = { x: TANK_HOME.x, y: TANK_HOME.y };

  let lastTime = performance.now();
  let running = false;
  let gameOver = false;
  let victory = false;
  let score = 0;
  let health = 5;
  let bossHealth = BOSS_MAX_HP;
  let bossPhase = 1;
  let bossX = 1050;
  let bossDir = 1;
  let bossHitFlash = 0;
  let elapsed = 0;
  let steroidsLeft = 3;
  let steroidTimer = 0;
  let muted = false;
  let audioCtx = null;
  let aim = null;
  let shake = 0;
  let cameraX = 0;
  let toastTimer = null;
  let attackTimer = 1.65;
  let bossWindup = 0;
  let firstPrompt = true;
  let disarms = 0;
  let intercepts = 0;
  let tankHitsTaken = 0;
  let bossHits = 0;

  const particles = [];
  const floaters = [];
  const rick = { armAngle: -0.75, releaseTimer: 0, torsoLean: 0, squat: 0, catchPose: 0 };
  const cars = {
    x: CAR_HOME.x, y: CAR_HOME.y, vx: 0, vy: 0, angle: 0, angular: 0,
    flying: false, ready: true, resetTimer: 0, bounced: false, hitBoss: false
  };
  const incoming = { active: false, x: 0, y: 0, angle: 0, startX: 0, startY: 0, targetX: 165, targetY: GROUND - 95, speed: 430 };
  const returning = { active: false, x: 0, y: 0, angle: 0, startX: 0, startY: 0, targetX: 0, targetY: 0, time: 0, duration: 0.7, damage: 2 };
  const knocked = { active: false, x: 0, y: 0, vx: 0, vy: 0, angle: 0, angular: 0 };

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
      const s = {
        throw: [92, 48, .13, 'sawtooth'], impact: [72, 38, .09, 'square'], boss: [82, 44, .18, 'sawtooth'],
        hurt: [120, 70, .22, 'square'], win: [330, 880, .5, 'triangle'], power: [160, 420, .25, 'sawtooth'],
        warning: [180, 260, .25, 'square'], intercept: [220, 680, .18, 'triangle']
      }[type] || [120, 80, .1, 'sine'];
      o.type = s[3];
      o.frequency.setValueAtTime(s[0], n);
      o.frequency.exponentialRampToValueAtTime(s[1], n + s[2]);
      g.gain.setValueAtTime(.065, n);
      g.gain.exponentialRampToValueAtTime(.001, n + s[2]);
      o.connect(g).connect(audioCtx.destination);
      o.start(n);
      o.stop(n + s[2]);
    } catch (_) {}
  }

  function phaseForHp() { return bossHealth > 8 ? 1 : bossHealth > 4 ? 2 : 3; }
  function phaseSettings() {
    return bossPhase === 1 ? { speed: 430, cooldown: 2.65, windup: 1.0 }
      : bossPhase === 2 ? { speed: 510, cooldown: 2.15, windup: .78 }
      : { speed: 590, cooldown: 1.72, windup: .58 };
  }

  function heldTankPosition() {
    return { x: bossX - 42, y: GROUND - 248 };
  }

  function updateHud() {
    healthEl.textContent = Array.from({ length: 5 }, (_, i) => i < health ? '♥' : '♡').join(' ');
    bossHpEl.textContent = '■'.repeat(Math.max(0, bossHealth)) + '□'.repeat(Math.max(0, BOSS_MAX_HP - bossHealth));
    stoppedEl.textContent = String(disarms + intercepts);
  }

  function resetCarsReady() {
    Object.assign(cars, {
      x: CAR_HOME.x, y: CAR_HOME.y, vx: 0, vy: 0, angle: 0, angular: 0,
      flying: false, ready: true, resetTimer: 0, bounced: false, hitBoss: false
    });
    aim = null;
    rick.releaseTimer = 0;
  }

  function beginCarReload() {
    if (!cars.flying && !cars.ready) return;
    cars.flying = false;
    cars.ready = false;
    cars.resetTimer = 0.001;
    cars.x = CAR_HOME.x;
    cars.y = CAR_HOME.y;
    cars.vx = 0;
    cars.vy = 0;
    aim = null;
  }

  function resetFight() {
    running = true;
    gameOver = false;
    victory = false;
    score = 0;
    health = 5;
    bossHealth = BOSS_MAX_HP;
    bossPhase = 1;
    bossX = 1050;
    bossDir = 1;
    bossHitFlash = 0;
    elapsed = 0;
    steroidsLeft = 3;
    steroidTimer = 0;
    aim = null;
    shake = 0;
    cameraX = 0;
    attackTimer = 1.65;
    bossWindup = 0;
    firstPrompt = true;
    disarms = 0;
    intercepts = 0;
    tankHitsTaken = 0;
    bossHits = 0;
    incoming.active = false;
    returning.active = false;
    knocked.active = false;
    particles.length = 0;
    floaters.length = 0;
    Object.assign(rick, { armAngle: -.75, releaseTimer: 0, torsoLean: 0, squat: 0, catchPose: 0 });
    resetCarsReady();
    steroidButton.disabled = false;
    steroidCountEl.textContent = '3 demo doses';
    updateHud();
    showToast('BOSS 1: SEARGENT BOB THE BOBCAT', 1400);
  }

  function addImpact(x, y, strong = false) {
    for (let i = 0; i < (strong ? 28 : 14); i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * (strong ? 340 : 180);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 90, life: .4 + Math.random() * .5, max: .9, size: 3 + Math.random() * 10 });
    }
    shake = Math.max(shake, strong ? 18 : 8);
  }

  function getHeldCars() {
    return !aim || cars.flying ? { x: cars.x, y: cars.y } : { x: aim.x, y: Math.min(aim.y, GROUND - 40) };
  }

  function throwCars() {
    if (!aim || cars.flying || !cars.ready || !running) return;
    const dx = cars.x - aim.x;
    const dy = cars.y - aim.y;
    const p = Math.hypot(dx, dy);
    if (p < 18) { aim = null; return; }
    const sc = Math.min(p, MAX_PULL) / p;
    const boost = steroidTimer > 0 ? 1.42 : 1;
    const h = getHeldCars();
    Object.assign(cars, {
      x: h.x, y: h.y, vx: dx * sc * CAR_THROW_SCALE * boost, vy: dy * sc * CAR_THROW_SCALE * boost,
      angular: Math.min(9, 2 + p / 55), flying: true, ready: false, resetTimer: 0, bounced: false, hitBoss: false
    });
    aim = null;
    rick.releaseTimer = .28;
    addImpact(142, GROUND - 8, false);
    beep('throw');
    if (navigator.vibrate) navigator.vibrate(20);
  }

  function damageBob(amount, label) {
    if (victory) return;
    bossHealth = Math.max(0, bossHealth - amount);
    bossHits += 1;
    score += 400 * amount;
    bossHitFlash = .28;
    addImpact(bossX, GROUND - 150, true);
    floaters.push({ x: bossX, y: GROUND - 245, text: `${label} -${amount}`, life: 1.0 });
    beep('boss');
    shake = 18;
    const oldPhase = bossPhase;
    bossPhase = phaseForHp();
    if (bossPhase !== oldPhase) {
      showToast(bossPhase === 2 ? 'BOB IS GRIPPING THE TANKS HARDER.' : 'BOB HAS ENTERED MAXIMUM BOB.', 1200);
      beep('warning');
    }
    attackTimer = phaseSettings().cooldown;
    bossWindup = 0;
    updateHud();
    if (bossHealth <= 0) winFight();
  }

  function disarmBob(impact) {
    const pos = heldTankPosition();
    disarms += 1;
    incoming.active = false;
    bossWindup = 0;
    knocked.active = true;
    Object.assign(knocked, { x: pos.x, y: pos.y, vx: 420 + Math.min(220, impact * .18), vy: -230, angle: -.12, angular: 5.5 });
    cars.vx *= .42;
    cars.vy *= .72;
    cars.hitBoss = true;
    showToast('DISARMED! BOB JUST ATE HIS OWN TANK!', 980);
    beep('intercept');
    damageBob(steroidTimer > 0 ? 3 : 2, 'DISARM');
  }

  function startReturningTank() {
    intercepts += 1;
    returning.active = true;
    returning.startX = incoming.x;
    returning.startY = incoming.y;
    returning.x = incoming.x;
    returning.y = incoming.y;
    returning.targetX = bossX - 35;
    returning.targetY = GROUND - 150;
    returning.time = 0;
    returning.duration = clamp((returning.targetX - returning.startX) / 650, .38, 1.05);
    returning.damage = steroidTimer > 0 ? 3 : 2;
    returning.angle = incoming.angle;
    incoming.active = false;
    cars.vx *= .34;
    cars.vy *= .70;
    cars.hitBoss = true;
    score += 250;
    showToast('INTERCEPT! SEND IT BACK!', 820);
    beep('intercept');
    updateHud();
  }

  function hitByTank() {
    incoming.active = false;
    tankHitsTaken += 1;
    health -= 1;
    shake = 20;
    addImpact(175, GROUND - 90, true);
    showToast('TANKED! HIT THE NEXT ONE WITH THE CARS!', 1100);
    beep('hurt');
    attackTimer = phaseSettings().cooldown * .72;
    updateHud();
    if (health <= 0) loseFight();
  }

  function beginBossWindup() {
    if (incoming.active || returning.active || bossWindup > 0 || victory || gameOver) return;
    bossWindup = phaseSettings().windup;
    if (firstPrompt) {
      firstPrompt = false;
      showToast('SMASH THE TANK OUT OF BOB\'S HANDS, OR HIT IT IN MID-AIR!', 2300);
    } else {
      showToast('BOB FOUND ANOTHER TANK!', 700);
    }
    beep('warning');
  }

  function spawnIncoming() {
    const ps = phaseSettings();
    const pos = heldTankPosition();
    incoming.active = true;
    incoming.startX = pos.x;
    incoming.startY = pos.y;
    incoming.x = pos.x;
    incoming.y = pos.y;
    incoming.angle = -.12;
    incoming.speed = ps.speed;
    bossWindup = 0;
    showToast('BOB THREW THE TANK!', 620);
    beep('throw');
  }

  function updateBoss(dt) {
    if (victory || gameOver) return;
    bossHitFlash = Math.max(0, bossHitFlash - dt);
    bossX += bossDir * (bossPhase === 3 ? 42 : 28) * dt;
    if (bossX > 1140) { bossX = 1140; bossDir = -1; }
    if (bossX < 940) { bossX = 940; bossDir = 1; }
    if (incoming.active || returning.active) return;
    if (bossWindup > 0) {
      bossWindup -= dt;
      if (bossWindup <= 0) spawnIncoming();
      return;
    }
    attackTimer -= dt;
    if (attackTimer <= 0) beginBossWindup();
  }

  function updateIncoming(dt) {
    if (!incoming.active) return;
    const total = Math.max(1, incoming.startX - incoming.targetX);
    incoming.x -= incoming.speed * dt;
    const t = clamp((incoming.startX - incoming.x) / total, 0, 1);
    incoming.y = incoming.startY + (incoming.targetY - incoming.startY) * t - Math.sin(Math.PI * t) * 112;
    incoming.angle -= dt * 5.4;
    if (incoming.x < 155) hitByTank();
  }

  function updateReturning(dt) {
    if (!returning.active) return;
    returning.time += dt;
    const t = clamp(returning.time / returning.duration, 0, 1);
    returning.x = returning.startX + (returning.targetX - returning.startX) * t;
    returning.y = returning.startY + (returning.targetY - returning.startY) * t - Math.sin(Math.PI * t) * 88;
    returning.angle += dt * 7.5;
    if (t >= 1) {
      returning.active = false;
      damageBob(returning.damage, 'RETURN TO BOB');
    }
  }

  function updateKnocked(dt) {
    if (!knocked.active) return;
    knocked.vy += 760 * dt;
    knocked.x += knocked.vx * dt;
    knocked.y += knocked.vy * dt;
    knocked.angle += knocked.angular * dt;
    if (knocked.x > 1500 || knocked.y > H + 100) knocked.active = false;
  }

  function updateCars(dt) {
    if (!cars.flying) {
      if (!cars.ready) {
        cars.resetTimer += dt;
        if (cars.resetTimer >= CAR_RELOAD) resetCarsReady();
      }
      return;
    }

    cars.vy += CAR_GRAVITY * dt;
    cars.x += cars.vx * dt;
    cars.y += cars.vy * dt;
    cars.angle += cars.angular * dt;
    const impact = Math.hypot(cars.vx, cars.vy);

    if (bossWindup > 0) {
      const held = heldTankPosition();
      if (Math.hypot(cars.x - held.x, cars.y - held.y) < 112) disarmBob(impact);
    }

    if (incoming.active && Math.hypot(cars.x - incoming.x, cars.y - incoming.y) < 108) startReturningTank();

    if (!cars.hitBoss && Math.hypot(cars.x - bossX, cars.y - (GROUND - 145)) < 128) {
      cars.hitBoss = true;
      cars.vx *= -.22;
      cars.vy = -Math.abs(cars.vy) * .30 - 70;
      addImpact(bossX - 55, GROUND - 150, false);
      showToast('BOB SHRUGGED OFF THE CARS. HIT HIS TANK!', 900);
      beep('impact');
    }

    if (cars.y >= GROUND - 22) {
      cars.y = GROUND - 22;
      if (Math.abs(cars.vy) > 160 && !cars.bounced) {
        cars.vy *= -.18;
        cars.vx *= .62;
        cars.angular *= .58;
        cars.bounced = true;
        addImpact(cars.x, cars.y + 15, true);
        beep('impact');
      } else {
        cars.vy = 0;
        cars.vx *= Math.pow(.045, dt);
        cars.angular *= Math.pow(.03, dt);
      }
    }

    if (cars.x < -260 || cars.x > 1850 || (cars.y >= GROUND - 23 && Math.abs(cars.vx) < 15)) beginCarReload();
  }

  function loseFight() {
    running = false;
    gameOver = true;
    aim = null;
    finalScoreEl.textContent = `Bob HP: ${bossHealth}/${BOSS_MAX_HP} · Tanks stopped: ${disarms + intercepts} · Hits taken: ${tankHitsTaken}`;
    gameOverScreen.classList.add('visible');
  }

  function winFight() {
    if (victory) return;
    victory = true;
    running = false;
    aim = null;
    incoming.active = false;
    returning.active = false;
    showToast('SEARGENT BOB DEFEATED!', 1600);
    beep('win');
    const stops = disarms + intercepts;
    const stars = 1 + (stops >= 4 ? 1 : 0) + (tankHitsTaken === 0 ? 1 : 0);
    resultStarsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    resultScoreEl.textContent = score.toLocaleString();
    resultHitsEl.textContent = String(bossHits);
    resultStoppedEl.textContent = String(stops);
    resultMissesEl.textContent = String(tankHitsTaken);
    resultDefenseEl.textContent = tankHitsTaken === 0 ? 'UNTOUCHED' : `${health}/5 HEARTS`;
    setTimeout(() => victoryScreen.classList.add('visible'), 950);
  }

  function drawCarBody(ox, oy, color, accent) {
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

  function drawCarPair(t) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle || 0);
    drawCarBody(-38, -13, '#4f789e', '#f0e4af');
    drawCarBody(38, 12, '#b6543f', '#f4d27d');
    ctx.restore();
  }

  function drawRick() {
    const x = 142;
    const y = GROUND - 31 + (rick.squat || 0) * 18;
    const lean = rick.torsoLean || 0;
    const skin = '#6b4031';
    const skinDark = '#47291f';
    const green = '#2f7a43';
    const greenDark = '#20552f';
    const orange = '#d8782f';
    const orangeDark = '#84461f';

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
    ctx.translate(24, 3);
    ctx.translate(142, 582);
    ctx.scale(.50, .50);
    ctx.translate(-142, -582);
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
    arm(57, -143, rick.armAngle ?? -.75, .40);

    ctx.fillStyle = skinDark; ctx.fillRect(-19,-190,38,31);
    ctx.fillStyle = skin; ctx.fillRect(-15,-190,30,29);
    ctx.fillStyle = skinDark; ctx.beginPath(); ctx.ellipse(0,-216,31,36,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0,-218,27,32,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#17120f'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    for (let i = -4; i <= 4; i++) {
      const xx = i * 7;
      ctx.beginPath(); ctx.moveTo(xx,-241 + Math.abs(i)*2); ctx.quadraticCurveTo(xx + (i%2?6:-5),-263,xx + (i%2?10:-9),-276 - Math.abs(i)*3); ctx.stroke();
    }
    ctx.restore();
  }

  function drawAim() {
    if (!aim || cars.flying || !cars.ready) return;
    const dx = cars.x - aim.x;
    const dy = cars.y - aim.y;
    const raw = Math.hypot(dx, dy);
    const pull = Math.min(raw, MAX_PULL);
    const len = raw || 1;
    const boost = steroidTimer > 0 ? 1.42 : 1;
    const vx = (dx / len) * pull * CAR_THROW_SCALE * boost;
    const vy = (dy / len) * pull * CAR_THROW_SCALE * boost;
    const held = getHeldCars();
    ctx.save();
    ctx.setLineDash([11, 9]);
    ctx.strokeStyle = steroidTimer > 0 ? '#a8ff58' : '#ffcf33';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cars.x, cars.y); ctx.lineTo(aim.x, aim.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 1; i <= 18; i++) {
      const tt = i * .09;
      const x = held.x + vx * tt;
      const y = held.y + vy * tt + .5 * CAR_GRAVITY * tt * tt;
      if (y > GROUND) break;
      ctx.beginPath(); ctx.arc(x, y, Math.max(2, 5 - i * .18), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, '#171a28'); sky.addColorStop(.65, '#494757'); sky.addColorStop(1, '#8d6154');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    for (let i = -2; i < 10; i++) {
      const x = i * 185 - ((cameraX * .1) % 185);
      const h = 220 + pseudoRandom(i, 4) * 200;
      ctx.fillStyle = i % 2 ? '#272d37' : '#30343e'; ctx.fillRect(x, GROUND - h, 150, h);
    }
    ctx.fillStyle = '#403936'; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#615650'; ctx.fillRect(0, GROUND, W, 7);
  }

  function drawArena() {
    for (let x = 520; x < 1850; x += 420) {
      ctx.fillStyle = '#2a2e35'; ctx.fillRect(x, GROUND - 260, 310, 260);
      ctx.fillStyle = 'rgba(255,214,120,.10)';
      for (let wx = x + 30; wx < x + 280; wx += 60) {
        for (let wy = GROUND - 220; wy < GROUND - 45; wy += 62) if (pseudoRandom(wx + wy, 3) > .52) ctx.fillRect(wx, wy, 20, 26);
      }
    }
  }

  function drawBob() {
    ctx.save();
    ctx.translate(bossX, GROUND - 45);
    ctx.scale(1.6, 1.6);
    E.drawBob(ctx, { flash: bossHitFlash > 0, phase: bossPhase, windup: bossWindup, time: elapsed });
    ctx.restore();
  }

  function drawReloadCars() {
    const p = clamp(cars.resetTimer / CAR_RELOAD, 0, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    drawCarPair({ x: CAR_HOME.x + (1 - eased) * 430, y: CAR_HOME.y, angle: 0 });
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > .4) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    drawBackground();
    ctx.save();
    ctx.translate(-cameraX, 0);
    drawArena();
    drawRick();
    drawBob();

    if (bossWindup > 0) T.drawTank(ctx, { ...heldTankPosition(), angle: -.12 }, 'BOB TANK');
    if (incoming.active) T.drawTank(ctx, incoming, 'INCOMING');
    if (returning.active) T.drawTank(ctx, returning, 'RETURN');
    if (knocked.active) T.drawTank(ctx, knocked, 'DISARMED');

    if (cars.ready) {
      drawAim();
      if (aim && !cars.flying && running) {
        const h = getHeldCars();
        drawCarPair({ ...cars, x: h.x, y: h.y, angle: -.08 });
      } else {
        drawCarPair(cars);
      }
    } else if (cars.flying) {
      drawCarPair(cars);
    } else {
      drawReloadCars();
    }

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = '#ffd85a';
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (const f of floaters) {
      ctx.globalAlpha = Math.max(0, f.life / 1.0);
      ctx.fillStyle = '#fff4a5';
      ctx.font = '900 26px Impact, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.restore();
    ctx.restore();
  }

  function update(dt) {
    if (!running) {
      cameraX = updateCamera(cameraX, cars, aim, running, dt);
      updateJohnny(rick, cars, aim, running, dt);
      return;
    }
    elapsed += dt;
    if (steroidTimer > 0) steroidTimer = Math.max(0, steroidTimer - dt);
    updateBoss(dt);
    updateIncoming(dt);
    updateReturning(dt);
    updateKnocked(dt);
    updateCars(dt);
    for (const p of particles) { p.life -= dt; p.vy += 420 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    for (const f of floaters) { f.life -= dt; f.y -= 48 * dt; }
    for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
    for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].life <= 0) floaters.splice(i, 1);
    shake *= Math.pow(.002, dt);
    cameraX = updateCamera(cameraX, cars, aim, running, dt);
    updateJohnny(rick, cars, aim, running, dt);
  }

  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, .033);
    lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  canvas.addEventListener('pointerdown', e => {
    if (!running || gameOver || victory || cars.flying || !cars.ready) return;
    const p = pointerToWorld(canvas, e, cameraX);
    if (Math.hypot(p.x - cars.x, p.y - cars.y) < 125) {
      aim = p;
      canvas.setPointerCapture?.(e.pointerId);
    }
  });

  canvas.addEventListener('pointermove', e => {
    if (!aim || cars.flying || !cars.ready) return;
    const p = pointerToWorld(canvas, e, cameraX);
    const dx = p.x - cars.x;
    const dy = p.y - cars.y;
    const len = Math.hypot(dx, dy);
    aim = len > MAX_PULL ? { x: cars.x + dx / len * MAX_PULL, y: cars.y + dy / len * MAX_PULL } : p;
  });

  canvas.addEventListener('pointerup', () => throwCars());
  canvas.addEventListener('pointercancel', () => { aim = null; });

  steroidButton.addEventListener('click', () => {
    if (!running || steroidsLeft <= 0) return;
    steroidsLeft -= 1;
    steroidTimer = 12;
    steroidCountEl.textContent = steroidsLeft === 1 ? '1 demo dose' : `${steroidsLeft} demo doses`;
    steroidButton.disabled = steroidsLeft <= 0;
    showToast('UNREGULATED STRENGTH!');
    beep('power');
  });

  muteButton.addEventListener('click', () => {
    muted = !muted;
    muteButton.textContent = muted ? '🔇' : '🔊';
  });

  document.getElementById('start').addEventListener('click', () => {
    titleScreen.classList.remove('visible');
    resetFight();
    beep('power');
  });
  document.getElementById('restart').addEventListener('click', () => {
    gameOverScreen.classList.remove('visible');
    resetFight();
  });
  document.getElementById('replay').addEventListener('click', () => {
    victoryScreen.classList.remove('visible');
    resetFight();
  });

  window.addEventListener('keydown', e => {
    if (e.code === 'Space' && titleScreen.classList.contains('visible')) document.getElementById('start').click();
    if (e.code === 'KeyS') steroidButton.click();
  });

  document.getElementById('boss-player-label').textContent = 'RICK';
  document.getElementById('boss-result-player-label').textContent = 'Rick';
  const catchLabel = stoppedEl?.parentElement?.querySelector('.hud-label');
  if (catchLabel) catchLabel.textContent = 'TANKS STOPPED';
  const stoppedLabel = resultStoppedEl?.parentElement?.querySelector('span');
  if (stoppedLabel) stoppedLabel.textContent = 'Tanks Stopped';
  const missLabel = resultMissesEl?.parentElement?.querySelector('span');
  if (missLabel) missLabel.textContent = 'Tank Hits Taken';
  document.querySelector('#title-screen h1').textContent = 'RICK RAMPAGE';
  document.querySelector('#title-screen .premise').textContent = 'Bob brought tanks. Rick brought cars. The insurance adjuster has stopped returning calls.';
  document.getElementById('boss-instructions').innerHTML = '<strong>HIT BOB\'S TANK.</strong> Throw the car pair into the tank while Bob is winding up, or intercept it after he throws. Direct car hits barely faze Bob. His own tanks are another story.';

  updateHud();
  render();
  requestAnimationFrame(frame);
})();
