(() => {
  'use strict';

  const S = window.JMShared;
  const T = window.JMTankArt;
  if (!S || !T) throw new Error('campaign-shared.js and tank-art.js must load before boss2.js');

  const { W, H, GROUND, GRAVITY, TANK_HOME, MAX_PULL, clamp, pseudoRandom, pointerToWorld, drawAim, updateCamera, updateJohnny } = S;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const healthEl = document.getElementById('health');
  const bossHpEl = document.getElementById('boss-hp');
  const airHitsEl = document.getElementById('air-hits');
  const shockEl = document.getElementById('shockwaves');
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
  const resultShockEl = document.getElementById('result-shock');
  const resultThrowsEl = document.getElementById('result-throws');
  const resultDefenseEl = document.getElementById('result-defense');

  const BOSS_MAX_HP = 6;
  const JOHNNY_HIT_X = 166;
  const LYNN_GROUND_Y = GROUND - 42;
  const LYNN_HIT_RADIUS = 84;
  const TANK_HIT_BONUS = T.HIT_BONUS || 18;

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
  let airHits = 0;
  let shockwavesTaken = 0;
  let throws = 0;
  let bossHitFlash = 0;
  let firstPrompt = true;

  const particles = [];
  const floaters = [];
  const shockwaves = [];
  const johnny = { armAngle: -.75, releaseTimer: 0, torsoLean: 0, squat: 0, catchPose: 0 };
  const tank = { x: TANK_HOME.x, y: TANK_HOME.y, vx: 0, vy: 0, angle: 0, angular: 0, flying: false, resetTimer: 0, bounced: false, contactedLynn: false };

  const lynn = {
    x: 1040,
    y: LYNN_GROUND_Y,
    vx: 0,
    vy: 0,
    state: 'idle',
    stateTimer: 1.65,
    dir: -1,
    staggered: false,
    hitThisLeap: false,
    spin: 0,
    landingX: 900
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
        throw: [90, 52, .12, 'sawtooth'], impact: [72, 38, .09, 'square'], leap: [230, 760, .16, 'triangle'],
        warning: [180, 300, .24, 'square'], shock: [88, 30, .38, 'sawtooth'], hurt: [120, 70, .22, 'square'],
        lynn: [420, 160, .18, 'triangle'], crash: [105, 42, .34, 'square'], win: [330, 880, .5, 'triangle'],
        power: [160, 420, .25, 'sawtooth'], ping: [560, 300, .12, 'square']
      };
      const s = sounds[type] || [120, 80, .1, 'sine'];
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
    return bossHealth > 4 ? 1 : bossHealth > 2 ? 2 : 3;
  }

  function phaseSettings() {
    if (bossPhase === 1) return { windup: 1.05, recover: 1.35, jumpVy: -650, lateral: 170, shockSpeed: 680 };
    if (bossPhase === 2) return { windup: .80, recover: 1.05, jumpVy: -700, lateral: 210, shockSpeed: 760 };
    return { windup: .56, recover: .82, jumpVy: -755, lateral: 250, shockSpeed: 850 };
  }

  function updateHud() {
    scoreEl.textContent = String(score).padStart(6, '0');
    healthEl.textContent = Array.from({ length: 5 }, (_, i) => i < health ? '♥' : '♡').join(' ');
    bossHpEl.textContent = '■'.repeat(Math.max(0, bossHealth)) + '□'.repeat(Math.max(0, BOSS_MAX_HP - bossHealth));
    airHitsEl.textContent = String(airHits);
    shockEl.textContent = String(shockwavesTaken);
  }

  function resetTank() {
    Object.assign(tank, { x: TANK_HOME.x, y: TANK_HOME.y, vx: 0, vy: 0, angle: 0, angular: 0, flying: false, resetTimer: 0, bounced: false, contactedLynn: false });
    aim = null;
    johnny.releaseTimer = 0;
  }

  function resetFight() {
    running = true; gameOver = false; victory = false; score = 0; health = 5; bossHealth = BOSS_MAX_HP; bossPhase = 1;
    elapsed = 0; steroidsLeft = 3; steroidTimer = 0; aim = null; shake = 0; cameraX = 0; airHits = 0; shockwavesTaken = 0;
    throws = 0; bossHitFlash = 0; firstPrompt = true;
    particles.length = 0; floaters.length = 0; shockwaves.length = 0;
    Object.assign(johnny, { armAngle: -.75, releaseTimer: 0, torsoLean: 0, squat: 0, catchPose: 0 });
    Object.assign(lynn, { x: 1040, y: LYNN_GROUND_Y, vx: 0, vy: 0, state: 'idle', stateTimer: 1.65, dir: -1, staggered: false, hitThisLeap: false, spin: 0, landingX: 900 });
    resetTank();
    steroidButton.disabled = false;
    steroidCountEl.textContent = '3 demo doses';
    updateHud();
    showToast('BOSS 2: LIEUTENANT LYNN', 1450);
    setTimeout(() => showToast('ONLY AIRBORNE HITS CAN HURT HER!', 1800), 1500);
  }

  function addImpact(x, y, strong = false, color = '#ffd85a') {
    for (let i = 0; i < (strong ? 28 : 14); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * (strong ? 340 : 180);
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 90, life: .4 + Math.random() * .5, max: .9, size: 3 + Math.random() * 10, color });
    }
    shake = Math.max(shake, strong ? 18 : 8);
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
    Object.assign(tank, { x: h.x, y: h.y, vx: dx * sc * 4.05 * boost, vy: dy * sc * 4.05 * boost, angular: Math.min(9, 2 + p / 55), flying: true, resetTimer: 0, bounced: false, contactedLynn: false });
    aim = null;
    johnny.releaseTimer = .28;
    throws++;
    beep('throw');
    if (navigator.vibrate) navigator.vibrate(20);
  }

  function beginWindup() {
    const ps = phaseSettings();
    lynn.state = 'windup';
    lynn.stateTimer = ps.windup;
    lynn.staggered = false;
    lynn.hitThisLeap = false;
    lynn.spin = 0;
    if (firstPrompt) {
      firstPrompt = false;
      showToast('WAIT FOR THE LEAP. HIT LYNN BEFORE SHE LANDS!', 2100);
    } else showToast('LYNN IS COILING!', 650);
    beep('warning');
  }

  function launchLynn() {
    const ps = phaseSettings();
    lynn.state = 'airborne';
    lynn.vy = ps.jumpVy;
    const minX = bossPhase === 1 ? 760 : 690;
    const maxX = 1130;
    lynn.landingX = minX + Math.random() * (maxX - minX);
    const airtime = Math.max(.9, (-2 * lynn.vy) / GRAVITY);
    lynn.vx = (lynn.landingX - lynn.x) / airtime;
    beep('leap');
  }

  function createShockwave() {
    const ps = phaseSettings();
    shockwaves.push({ x: lynn.x, radius: 20, prevRadius: 20, speed: ps.shockSpeed, maxRadius: Math.abs(lynn.x - JOHNNY_HIT_X) + 95, life: 2.0, hitJohnny: false });
    addImpact(lynn.x, GROUND - 6, true, '#ffbb63');
    showToast('PERFECT LANDING — SHOCKWAVE!', 850);
    beep('shock');
  }

  function crashLynn() {
    bossHealth = Math.max(0, bossHealth - 1);
    airHits++;
    score += 650 * bossPhase;
    bossHitFlash = .32;
    shake = 22;
    addImpact(lynn.x, GROUND - 56, true, '#a8ff58');
    floaters.push({ x: lynn.x, y: GROUND - 185, text: 'CRASH! -1', life: 1.0 });
    beep('crash');
    const previousPhase = bossPhase;
    bossPhase = phaseForHp();
    updateHud();
    if (bossHealth <= 0) {
      winFight();
      return;
    }
    if (bossPhase !== previousPhase) {
      showToast(bossPhase === 2 ? 'LYNN IS LEAPING HIGHER!' : 'LYNN HAS ENTERED MAXIMUM LAMENTATION!', 1450);
    } else showToast('LYNN LAMENTS THAT LANDING.', 850);
  }

  function landLynn() {
    lynn.y = LYNN_GROUND_Y;
    lynn.vx = 0;
    lynn.vy = 0;
    if (lynn.staggered) {
      lynn.state = 'crashed';
      lynn.stateTimer = phaseSettings().recover + .45;
      lynn.spin = 0;
      crashLynn();
    } else {
      lynn.state = 'recover';
      lynn.stateTimer = phaseSettings().recover;
      createShockwave();
    }
  }

  function updateLynn(dt) {
    if (victory || gameOver) return;
    bossHitFlash = Math.max(0, bossHitFlash - dt);

    if (lynn.state === 'idle') {
      lynn.stateTimer -= dt;
      if (lynn.stateTimer <= 0 && !tank.flying) beginWindup();
      return;
    }
    if (lynn.state === 'windup') {
      lynn.stateTimer -= dt;
      if (lynn.stateTimer <= 0) launchLynn();
      return;
    }
    if (lynn.state === 'airborne') {
      lynn.vy += GRAVITY * dt;
      lynn.x += lynn.vx * dt;
      lynn.y += lynn.vy * dt;
      if (lynn.staggered) lynn.spin += dt * 8.5;
      if (lynn.y >= LYNN_GROUND_Y && lynn.vy > 0) landLynn();
      return;
    }
    if (lynn.state === 'crashed' || lynn.state === 'recover') {
      lynn.stateTimer -= dt;
      if (lynn.stateTimer <= 0 && !tank.flying) {
        lynn.state = 'idle';
        lynn.stateTimer = .45;
      }
    }
  }

  function updateShockwaves(dt) {
    for (const s of shockwaves) {
      s.prevRadius = s.radius;
      s.radius += s.speed * dt;
      s.life -= dt;
      const distance = Math.abs(s.x - JOHNNY_HIT_X);
      if (!s.hitJohnny && s.prevRadius < distance && s.radius >= distance) {
        s.hitJohnny = true;
        shockwavesTaken++;
        health--;
        shake = 22;
        addImpact(JOHNNY_HIT_X, GROUND - 38, true, '#ffbb63');
        showToast('SHOCKWAVE HIT JOHNNY!', 1000);
        beep('hurt');
        updateHud();
        if (health <= 0) loseFight();
      }
    }
    for (let i = shockwaves.length - 1; i >= 0; i--) if (shockwaves[i].life <= 0 || shockwaves[i].radius > shockwaves[i].maxRadius) shockwaves.splice(i, 1);
  }

  function hitLynnInAir() {
    if (lynn.hitThisLeap || lynn.state !== 'airborne') return;
    lynn.hitThisLeap = true;
    lynn.staggered = true;
    lynn.vy -= 115;
    lynn.vx *= .76;
    tank.vx *= -.10;
    tank.vy = -Math.abs(tank.vy) * .24 - 90;
    tank.angular *= -1.1;
    bossHitFlash = .22;
    addImpact(lynn.x, lynn.y - 95, true, '#a8ff58');
    floaters.push({ x: lynn.x, y: lynn.y - 170, text: 'MID-AIR HIT!', life: .9 });
    showToast('HIT! NOW WATCH THE LANDING!', 850);
    beep('lynn');
  }

  function groundedDeflection() {
    if (tank.contactedLynn) return;
    tank.contactedLynn = true;
    tank.vx *= -.20;
    tank.vy = -Math.abs(tank.vy) * .32 - 110;
    tank.angular *= -.75;
    addImpact(lynn.x, lynn.y - 80, false, '#d9d0c2');
    floaters.push({ x: lynn.x, y: lynn.y - 155, text: 'TOO SLOW!', life: .8 });
    showToast('LYNN CANNOT BE HURT ON THE GROUND!', 950);
    beep('ping');
  }

  function updateTank(dt) {
    if (!tank.flying) return;
    tank.vy += GRAVITY * dt;
    tank.x += tank.vx * dt;
    tank.y += tank.vy * dt;
    tank.angle += tank.angular * dt;

    const lynnCenterY = lynn.y - 92;
    const radius = LYNN_HIT_RADIUS + TANK_HIT_BONUS;
    if (Math.hypot(tank.x - lynn.x, tank.y - lynnCenterY) < radius) {
      if (lynn.state === 'airborne') hitLynnInAir();
      else groundedDeflection();
    }

    if (tank.y >= GROUND - 22) {
      tank.y = GROUND - 22;
      if (Math.abs(tank.vy) > 160 && !tank.bounced) {
        tank.vy *= -.30;
        tank.vx *= .74;
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

    if (tank.x < -260 || tank.x > 2100 || (tank.y >= GROUND - 23 && Math.abs(tank.vx) < 14)) {
      tank.resetTimer += dt;
      if (tank.resetTimer > .58) resetTank();
    } else tank.resetTimer = 0;
  }

  function loseFight() {
    if (gameOver) return;
    running = false;
    gameOver = true;
    aim = null;
    finalScoreEl.textContent = `Lynn HP: ${bossHealth}/${BOSS_MAX_HP} · Air hits: ${airHits} · Shockwaves: ${shockwavesTaken}`;
    gameOverScreen.classList.add('visible');
  }

  function winFight() {
    if (victory) return;
    victory = true;
    running = false;
    aim = null;
    shockwaves.length = 0;
    showToast('LIEUTENANT LYNN DEFEATED!', 1700);
    beep('win');
    const stars = 1 + (shockwavesTaken === 0 ? 1 : 0) + (throws <= 8 ? 1 : 0);
    resultStarsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    resultScoreEl.textContent = score.toLocaleString();
    resultHitsEl.textContent = String(airHits);
    resultShockEl.textContent = String(shockwavesTaken);
    resultThrowsEl.textContent = String(throws);
    resultDefenseEl.textContent = shockwavesTaken === 0 ? 'UNTOUCHED' : `${health}/5 HEARTS`;
    setTimeout(() => victoryScreen.classList.add('visible'), 950);
  }

  function drawJohnnyScaled() {
    ctx.save();
    ctx.translate(24, 3);
    ctx.translate(142, 582);
    ctx.scale(.50, .50);
    ctx.translate(-142, -582);
    S.drawJohnny(ctx, johnny, steroidTimer, elapsed);
    ctx.restore();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, '#161c30');
    sky.addColorStop(.58, '#544d6c');
    sky.addColorStop(1, '#bd765f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#28323b';
    ctx.beginPath();
    ctx.moveTo(0, GROUND - 250);
    for (let x = 0; x <= W + 80; x += 100) {
      const y = GROUND - 250 - pseudoRandom(x, 18) * 115;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, GROUND); ctx.lineTo(0, GROUND); ctx.closePath(); ctx.fill();

    ctx.save();
    ctx.translate(-cameraX * .18, 0);
    for (let i = 0; i < 7; i++) {
      const x = 330 + i * 410;
      const y = GROUND - 212 - (i % 2) * 18;
      ctx.fillStyle = i % 2 ? '#9e917f' : '#839092';
      ctx.fillRect(x, y, 275, 178);
      ctx.fillStyle = '#423c3e';
      ctx.beginPath(); ctx.moveTo(x - 15, y); ctx.lineTo(x + 138, y - 88); ctx.lineTo(x + 290, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,226,151,.55)';
      ctx.fillRect(x + 35, y + 43, 52, 48); ctx.fillRect(x + 184, y + 43, 52, 48);
      ctx.fillStyle = '#4d4038'; ctx.fillRect(x + 115, y + 91, 45, 87);
    }
    ctx.restore();

    ctx.fillStyle = '#56634f'; ctx.fillRect(0, GROUND - 35, W, 35);
    ctx.fillStyle = '#3e4145'; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#74777a'; ctx.fillRect(0, GROUND, W, 7);
    ctx.fillStyle = '#d8bf61';
    for (let x = -100; x < W + 180; x += 170) ctx.fillRect(x - (cameraX % 170), GROUND + 64, 82, 7);
  }

  function drawLynn() {
    ctx.save();
    ctx.translate(lynn.x, lynn.y);
    if (lynn.state === 'airborne' && lynn.staggered) ctx.rotate(lynn.spin);
    else if (lynn.state === 'windup') ctx.rotate(Math.sin(elapsed * 18) * .025);
    else if (lynn.state === 'crashed') ctx.rotate(-1.05);

    const flash = bossHitFlash > 0;
    const fur = flash ? '#f7d9ac' : '#c49a68';
    const furLight = flash ? '#fff0cf' : '#e0bd8c';
    const furDark = '#644c38';
    const uniform = '#344735';
    const uniformDark = '#1f2b22';
    const accent = '#b78b3b';

    ctx.fillStyle = 'rgba(0,0,0,.28)';
    if (lynn.state !== 'airborne') {
      ctx.beginPath(); ctx.ellipse(0, 8, 54, 12, 0, 0, Math.PI * 2); ctx.fill();
    }

    ctx.lineCap = 'round';
    ctx.strokeStyle = uniformDark; ctx.lineWidth = 20;
    ctx.beginPath(); ctx.moveTo(-18, -88); ctx.lineTo(-26, -16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(18, -88); ctx.lineTo(26, -16); ctx.stroke();
    ctx.strokeStyle = fur; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(-26, -18); ctx.lineTo(-35, 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(26, -18); ctx.lineTo(35, 2); ctx.stroke();

    ctx.fillStyle = uniform;
    ctx.beginPath();
    ctx.moveTo(-38, -178); ctx.bezierCurveTo(-46, -145, -31, -102, -21, -84);
    ctx.lineTo(21, -84); ctx.bezierCurveTo(31, -103, 46, -145, 38, -178);
    ctx.bezierCurveTo(26, -196, -26, -196, -38, -178); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = accent; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-28, -170); ctx.lineTo(0, -98); ctx.lineTo(29, -170); ctx.stroke();
    ctx.fillStyle = '#d9c47a'; ctx.fillRect(-7, -103, 14, 12);

    const flight = lynn.state === 'airborne';
    ctx.strokeStyle = fur; ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(-32, -166); ctx.lineTo(flight ? -66 : -46, flight ? -130 : -118); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(32, -166); ctx.lineTo(flight ? 70 : 46, flight ? -132 : -118); ctx.stroke();
    ctx.fillStyle = uniformDark;
    ctx.beginPath(); ctx.arc(flight ? -68 : -47, flight ? -128 : -116, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(flight ? 72 : 47, flight ? -130 : -116, 9, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = furLight;
    ctx.beginPath(); ctx.ellipse(0, -216, 34, 38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.moveTo(-25, -239); ctx.lineTo(-37, -278); ctx.lineTo(-7, -247); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(24, -240); ctx.lineTo(39, -280); ctx.lineTo(8, -248); ctx.closePath(); ctx.fill();
    ctx.fillStyle = furDark;
    ctx.beginPath(); ctx.moveTo(-37, -278); ctx.lineTo(-43, -295); ctx.lineTo(-31, -279); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(39, -280); ctx.lineTo(45, -297); ctx.lineTo(33, -281); ctx.closePath(); ctx.fill();

    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.moveTo(-30, -216); ctx.lineTo(-49, -202); ctx.lineTo(-31, -195); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(30, -216); ctx.lineTo(49, -202); ctx.lineTo(31, -195); ctx.closePath(); ctx.fill();
    ctx.fillStyle = furDark;
    for (const p of [[-18,-228],[17,-228],[-24,-211],[23,-210],[-13,-199],[13,-199]]) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = uniform;
    ctx.fillRect(-29, -251, 58, 10);
    ctx.beginPath(); ctx.ellipse(0, -251, 29, 10, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = accent; ctx.fillRect(-4, -257, 8, 8);
    ctx.strokeStyle = '#2a231d'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-20, -224); ctx.lineTo(-7, -220); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, -224); ctx.lineTo(7, -220); ctx.stroke();
    ctx.fillStyle = bossPhase === 3 ? '#ffd65a' : '#2b241e';
    ctx.beginPath(); ctx.ellipse(-13, -215, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(13, -215, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4b352b';
    ctx.beginPath(); ctx.moveTo(-5, -202); ctx.lineTo(5, -202); ctx.lineTo(0, -196); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6d4c3b'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-9, -189); ctx.quadraticCurveTo(0, -184, 9, -189); ctx.stroke();

    ctx.strokeStyle = fur; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(20, -102); ctx.quadraticCurveTo(62, -92, 58, -58); ctx.stroke();
    ctx.strokeStyle = furDark; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(57, -62); ctx.lineTo(58, -53); ctx.stroke();

    if (lynn.state === 'windup') {
      ctx.strokeStyle = '#ffcf66'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, -150, 70 + Math.sin(elapsed * 14) * 6, 0, Math.PI * 2); ctx.stroke();
    }
    if (lynn.state === 'crashed') {
      ctx.fillStyle = '#fff0a5'; ctx.font = '900 24px Impact,system-ui,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('LAMENT!', 0, -310);
    }
    ctx.restore();
  }

  function drawShockwaves() {
    for (const s of shockwaves) {
      const alpha = clamp(s.life / 2, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#ffbb63'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.arc(s.x, GROUND - 4, s.radius, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,247,211,.82)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(s.x, GROUND - 4, Math.max(8, s.radius - 14), Math.PI, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > .4) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    drawBackground();
    ctx.save();
    ctx.translate(-cameraX, 0);
    drawJohnnyScaled();
    drawShockwaves();
    drawLynn();

    if (!tank.flying) {
      drawAim(ctx, tank, aim, steroidTimer);
      if (aim && running) {
        const h = heldTankPosition();
        T.drawTank(ctx, { ...tank, x: h.x, y: h.y, angle: -.08 });
      } else T.drawTank(ctx, tank);
    } else T.drawTank(ctx, tank);

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (const f of floaters) {
      ctx.globalAlpha = Math.max(0, f.life / 1.0);
      ctx.fillStyle = '#fff4a5'; ctx.font = '900 26px Impact,system-ui,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
    ctx.restore();
    ctx.restore();
  }

  function update(dt) {
    if (!running) {
      cameraX = updateCamera(cameraX, tank, aim, running, dt);
      updateJohnny(johnny, tank, aim, running, dt);
      return;
    }
    elapsed += dt;
    if (steroidTimer > 0) steroidTimer = Math.max(0, steroidTimer - dt);
    updateLynn(dt);
    updateShockwaves(dt);
    updateTank(dt);
    for (const p of particles) { p.life -= dt; p.vy += 420 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    for (const f of floaters) { f.life -= dt; f.y -= 48 * dt; }
    for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
    for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].life <= 0) floaters.splice(i, 1);
    shake *= Math.pow(.002, dt);
    cameraX = updateCamera(cameraX, tank, aim, running, dt);
    updateJohnny(johnny, tank, aim, running, dt);
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
    if (Math.hypot(p.x - tank.x, p.y - tank.y) < 120) {
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