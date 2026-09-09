(() => {
  'use strict';

  const S = window.JMShared;
  const E = window.JMEnemyArt;
  const T = window.JMTankArt;
  if (!S || !E || !T) throw new Error('campaign-shared.js, enemy-art.js, and tank-art.js must load before suburb.js');

  const { W, H, GROUND, GRAVITY, TANK_HOME, MAX_PULL, clamp, pseudoRandom, pointerToWorld, drawAim, updateCamera, updateJohnny } = S;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const levelNumber = Number(document.getElementById('game-shell')?.dataset?.level || 1);

  const LEVELS = {
    1: {
      title: 'LAWN & ORDER',
      toast: 'SUBURB 1: LAWN & ORDER',
      subtitle: 'THE QUIET PART OF TOWN IS NOT QUIET',
      waves: [
        { ground: 5, bats: 0, leapers: 0, gap: .90 },
        { ground: 6, bats: 1, leapers: 0, gap: .82 },
        { ground: 7, bats: 2, leapers: 0, gap: .74 }
      ],
      airOnly: false,
      shockLanding: false,
      scenery: 'lawns'
    },
    2: {
      title: 'ROOF-HOPPER ROW',
      toast: 'SUBURB 2: ROOF-HOPPER ROW',
      subtitle: 'SOME OF THEM HAVE DISCOVERED UP',
      waves: [
        { ground: 4, bats: 1, leapers: 1, gap: .88 },
        { ground: 5, bats: 1, leapers: 2, gap: .78 },
        { ground: 5, bats: 2, leapers: 3, gap: .70 }
      ],
      airOnly: false,
      shockLanding: false,
      scenery: 'roofs'
    },
    3: {
      title: 'POUNCE & CIRCUMSTANCE',
      toast: 'SUBURB 3: POUNCE & CIRCUMSTANCE',
      subtitle: 'GROUND SHOTS ARE NOW A TERRIBLE IDEA',
      waves: [
        { ground: 3, bats: 1, leapers: 2, gap: .86 },
        { ground: 4, bats: 2, leapers: 3, gap: .74 },
        { ground: 4, bats: 2, leapers: 4, gap: .65 }
      ],
      airOnly: true,
      shockLanding: false,
      scenery: 'split'
    },
    4: {
      title: 'SHOCKWAVE AVENUE',
      toast: 'SUBURB 4: SHOCKWAVE AVENUE',
      subtitle: 'INTERRUPT THE LANDING OR EAT THE THUNDER',
      waves: [
        { ground: 2, bats: 1, leapers: 2, gap: .90 },
        { ground: 3, bats: 2, leapers: 3, gap: .78 },
        { ground: 3, bats: 2, leapers: 4, gap: .68 }
      ],
      airOnly: true,
      shockLanding: true,
      scenery: 'avenue'
    }
  };

  const LEVEL = LEVELS[levelNumber] || LEVELS[1];
  const DEFENSE_X = 92;
  const JOHNNY_HIT_X = 166;
  const TANK_HIT_BONUS = T.HIT_BONUS || 18;

  const scoreEl = document.getElementById('score');
  const healthEl = document.getElementById('health');
  const waveEl = document.getElementById('wave');
  const remainingEl = document.getElementById('remaining');
  const comboEl = document.getElementById('combo');
  const airHitsEl = document.getElementById('air-hits');
  const shockwavesEl = document.getElementById('shockwaves');
  const steroidButton = document.getElementById('steroids');
  const steroidCountEl = document.getElementById('steroid-count');
  const muteButton = document.getElementById('mute');
  const titleScreen = document.getElementById('title-screen');
  const gameOverScreen = document.getElementById('game-over');
  const missionCompleteScreen = document.getElementById('mission-complete');
  const finalScoreEl = document.getElementById('final-score');
  const toastEl = document.getElementById('toast');
  const resultStarsEl = document.getElementById('result-stars');
  const resultScoreEl = document.getElementById('result-score');
  const resultCatsEl = document.getElementById('result-cats');
  const resultAirEl = document.getElementById('result-air');
  const resultShockEl = document.getElementById('result-shock');
  const resultComboEl = document.getElementById('result-combo');
  const resultDefenseEl = document.getElementById('result-defense');

  let lastTime = performance.now();
  let running = false;
  let gameOver = false;
  let missionComplete = false;
  let score = 0;
  let health = 5;
  let combo = 1;
  let bestCombo = 1;
  let comboTimer = 0;
  let elapsed = 0;
  let steroidsLeft = 3;
  let steroidTimer = 0;
  let muted = false;
  let audioCtx = null;
  let aim = null;
  let shake = 0;
  let cameraX = 0;
  let toastTimer = null;
  let currentWave = -1;
  let queue = [];
  let spawned = 0;
  let resolved = 0;
  let spawnTimer = 0;
  let intermission = 1.1;
  let clearAnnounced = false;
  let finishTimer = 0;
  let flattened = 0;
  let airHits = 0;
  let shockwavesTaken = 0;
  let breaches = 0;

  const actors = [];
  const shockwaves = [];
  const particles = [];
  const floaters = [];
  const johnny = { armAngle: -.75, releaseTimer: 0, torsoLean: 0, squat: 0, catchPose: 0 };
  const tank = { x: TANK_HOME.x, y: TANK_HOME.y, vx: 0, vy: 0, angle: 0, angular: 0, flying: false, resetTimer: 0, bounced: false, hitIds: new Set() };

  function showToast(text, duration = 850) {
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
        throw: [90, 52, .12, 'sawtooth'], impact: [72, 38, .09, 'square'], cat: [430, 240, .08, 'triangle'],
        bat: [520, 860, .09, 'triangle'], leap: [260, 620, .11, 'triangle'], shock: [90, 34, .34, 'sawtooth'],
        hurt: [120, 70, .22, 'square'], wave: [260, 410, .18, 'square'], win: [330, 660, .42, 'triangle'],
        power: [160, 420, .25, 'sawtooth'], ping: [540, 260, .12, 'square']
      };
      const s = sounds[type] || [120, 80, .1, 'sine'];
      o.type = s[3];
      o.frequency.setValueAtTime(s[0], n);
      o.frequency.exponentialRampToValueAtTime(s[1], n + s[2]);
      g.gain.setValueAtTime(.055, n);
      g.gain.exponentialRampToValueAtTime(.001, n + s[2]);
      o.connect(g).connect(audioCtx.destination);
      o.start(n); o.stop(n + s[2]);
    } catch (_) {}
  }

  function updateHud() {
    scoreEl.textContent = String(score).padStart(6, '0');
    healthEl.textContent = Array.from({ length: 5 }, (_, i) => i < health ? '♥' : '♡').join(' ');
    comboEl.textContent = `x${combo}`;
    airHitsEl.textContent = String(airHits);
    shockwavesEl.textContent = String(shockwavesTaken);
    if (currentWave < 0) {
      waveEl.textContent = '1/3';
      remainingEl.textContent = 'INCOMING';
      return;
    }
    const w = LEVEL.waves[currentWave];
    const total = w.ground + w.bats + w.leapers;
    waveEl.textContent = `${currentWave + 1}/3`;
    remainingEl.textContent = missionComplete ? 'SECURED' : String(Math.max(0, total - resolved));
  }

  function resetTank() {
    Object.assign(tank, { x: TANK_HOME.x, y: TANK_HOME.y, vx: 0, vy: 0, angle: 0, angular: 0, flying: false, resetTimer: 0, bounced: false });
    tank.hitIds.clear();
    aim = null;
    johnny.releaseTimer = 0;
  }

  function resetGame() {
    running = true; gameOver = false; missionComplete = false; score = 0; health = 5; combo = 1; bestCombo = 1; comboTimer = 0;
    elapsed = 0; steroidsLeft = 3; steroidTimer = 0; aim = null; shake = 0; cameraX = 0; currentWave = -1; queue = [];
    spawned = 0; resolved = 0; spawnTimer = 0; intermission = 1.1; clearAnnounced = false; finishTimer = 0;
    flattened = 0; airHits = 0; shockwavesTaken = 0; breaches = 0;
    actors.length = 0; shockwaves.length = 0; particles.length = 0; floaters.length = 0;
    Object.assign(johnny, { armAngle: -.75, releaseTimer: 0, torsoLean: 0, squat: 0, catchPose: 0 });
    resetTank();
    steroidButton.disabled = false;
    steroidCountEl.textContent = '3 demo doses';
    updateHud();
    showToast(LEVEL.toast, 1250);
    if (levelNumber === 2) setTimeout(() => showToast('NEW THREAT: LEAPER CATS!', 1150), 1350);
    if (levelNumber === 3) setTimeout(() => showToast('LEAPERS ARE ARMORED ON THE GROUND. AIR HITS ONLY!', 1800), 1350);
    if (levelNumber === 4) setTimeout(() => showToast('STOP THE LANDING OR THE SHOCKWAVE HITS JOHNNY!', 1900), 1350);
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function startWave() {
    currentWave++;
    const w = LEVEL.waves[currentWave];
    queue = shuffle([...Array(w.ground).fill('ground'), ...Array(w.bats).fill('bat'), ...Array(w.leapers).fill('leaper')]);
    spawned = 0; resolved = 0; spawnTimer = .2; clearAnnounced = false;
    showToast(`WAVE ${currentWave + 1} · ${LEVEL.subtitle}`, 950);
    beep('wave');
    updateHud();
  }

  function spawnActor(kind) {
    const isBat = kind === 'bat';
    const isLeaper = kind === 'leaper';
    const scale = isBat ? .82 + Math.random() * .16 : isLeaper ? .96 + Math.random() * .12 : .9 + Math.random() * .18;
    const groundY = GROUND - 29 * scale;
    actors.push({
      id: `${kind}-${performance.now()}-${Math.random()}`,
      kind,
      x: 1190 + Math.random() * 280,
      y: isBat ? 250 : groundY,
      baseY: isBat ? 215 + Math.random() * 165 : groundY,
      groundY,
      scale,
      speed: isBat ? 72 + Math.random() * 16 : isLeaper ? 30 + Math.random() * 8 : 54 + Math.random() * 17,
      phase: Math.random() * Math.PI * 2,
      amp: isBat ? 52 + Math.random() * 38 : 0,
      bob: Math.random() * Math.PI * 2,
      dead: false,
      resolved: false,
      airborne: false,
      vy: 0,
      jumpTimer: isLeaper ? 1.0 + Math.random() * 1.25 : 99,
      jumpCooldown: 1.55 + Math.random() * .65,
      interrupted: false,
      landedOnce: false
    });
    spawned++;
    updateHud();
  }

  function resolveActor(a, defeated) {
    if (a.resolved) return;
    a.resolved = true;
    a.dead = true;
    resolved++;
    if (defeated) flattened++;
    updateHud();
  }

  function addImpact(x, y, strong = false, color = '#ffd85a') {
    for (let i = 0; i < (strong ? 22 : 11); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * (strong ? 300 : 150);
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 80, life: .35 + Math.random() * .5, max: .85, size: 3 + Math.random() * 9, color });
    }
    shake = Math.max(shake, strong ? 15 : 7);
  }

  function killActor(a, impact, airborneHit = false) {
    resolveActor(a, true);
    const base = a.kind === 'leaper' ? 360 : a.kind === 'bat' ? 240 : 130;
    const bonus = airborneHit ? 220 : 0;
    const pts = (base + bonus + Math.floor(Math.min(impact / 8, 120))) * combo;
    score += pts;
    combo = Math.min(12, combo + 1);
    bestCombo = Math.max(bestCombo, combo);
    comboTimer = 2.1;
    if (airborneHit) airHits++;
    floaters.push({ x: a.x, y: a.y - 35, text: airborneHit ? `AIR HIT +${pts}` : `+${pts}`, life: .9 });
    addImpact(a.x, a.y, a.kind !== 'ground' || impact > 650, airborneHit ? '#a8ff58' : '#ffd85a');
    beep(a.kind === 'bat' ? 'bat' : airborneHit ? 'leap' : 'cat');
    if (airborneHit) showToast(levelNumber >= 4 ? 'LANDING CANCELLED!' : 'MID-AIR BONK!', 650);
    updateHud();
  }

  function createShockwave(a) {
    shockwaves.push({ x: a.x, radius: 18, prevRadius: 18, speed: 720, maxRadius: Math.max(220, Math.abs(a.x - JOHNNY_HIT_X) + 70), life: 1.7, hitJohnny: false });
    addImpact(a.x, GROUND - 8, true, '#f6be67');
    showToast('SHOCKWAVE!', 540);
    beep('shock');
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
        combo = 1; comboTimer = 0;
        shake = 18;
        addImpact(JOHNNY_HIT_X, GROUND - 40, true, '#f6be67');
        showToast('JOHNNY ATE THE SHOCKWAVE!', 900);
        beep('hurt');
        updateHud();
        if (health <= 0) endGame();
      }
    }
    for (let i = shockwaves.length - 1; i >= 0; i--) if (shockwaves[i].life <= 0 || shockwaves[i].radius >= shockwaves[i].maxRadius) shockwaves.splice(i, 1);
  }

  function launchLeaper(a) {
    a.airborne = true;
    a.vy = -530 - (levelNumber - 2) * 18;
    a.jumpTimer = a.jumpCooldown;
    a.interrupted = false;
    beep('leap');
  }

  function updateActor(a, dt) {
    if (a.dead) return;
    a.bob += dt * 7;
    a.phase += dt * 2.1;

    if (a.kind === 'bat') {
      a.x -= a.speed * dt;
      a.y = clamp(a.baseY + Math.sin(a.phase * 2.1) * a.amp, 170, GROUND - 105);
    } else if (a.kind === 'leaper') {
      a.x -= a.speed * dt;
      if (a.airborne) {
        a.vy += GRAVITY * dt;
        a.y += a.vy * dt;
        a.x -= 34 * dt;
        if (a.y >= a.groundY) {
          a.y = a.groundY;
          a.airborne = false;
          a.vy = 0;
          a.landedOnce = true;
          if (LEVEL.shockLanding && !a.interrupted) createShockwave(a);
        }
      } else {
        a.y = a.groundY;
        a.jumpTimer -= dt;
        if (a.jumpTimer <= 0 && a.x > 430) launchLeaper(a);
      }
    } else {
      a.x -= a.speed * dt;
      a.y = a.groundY;
    }

    if (a.x < DEFENSE_X) {
      breaches++;
      health--;
      combo = 1; comboTimer = 0;
      resolveActor(a, false);
      showToast('SUBURBAN BREACH!');
      beep('hurt');
      shake = 12;
      updateHud();
      if (health <= 0) endGame();
    }
  }

  function updateMission(dt) {
    if (gameOver || missionComplete) return;
    if (currentWave < 0) {
      intermission -= dt;
      if (intermission <= 0) startWave();
      return;
    }
    const w = LEVEL.waves[currentWave];
    const total = w.ground + w.bats + w.leapers;
    if (spawned < total) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnActor(queue[spawned]);
        spawnTimer = w.gap;
      }
      return;
    }
    if (resolved < total || actors.some(a => !a.dead)) return;
    if (currentWave < 2) {
      if (!clearAnnounced) {
        clearAnnounced = true;
        intermission = 1.35;
        showToast(`WAVE ${currentWave + 1} CLEAR`, 760);
        return;
      }
      intermission -= dt;
      if (intermission <= 0) startWave();
      return;
    }
    finishTimer += dt;
    if (finishTimer > .75) completeMission();
  }

  function completeMission() {
    if (missionComplete) return;
    missionComplete = true;
    running = false;
    aim = null;
    showToast(`${LEVEL.title} SECURED`, 1300);
    beep('win');
    const stars = 1 + (breaches === 0 ? 1 : 0) + (shockwavesTaken === 0 ? 1 : 0);
    resultStarsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    resultScoreEl.textContent = score.toLocaleString();
    resultCatsEl.textContent = String(flattened);
    resultAirEl.textContent = String(airHits);
    resultShockEl.textContent = String(shockwavesTaken);
    resultComboEl.textContent = `x${bestCombo}`;
    resultDefenseEl.textContent = breaches === 0 && shockwavesTaken === 0 ? 'UNTOUCHED' : `${health}/5 HEARTS`;
    setTimeout(() => missionCompleteScreen.classList.add('visible'), 850);
  }

  function endGame() {
    if (gameOver) return;
    running = false;
    gameOver = true;
    aim = null;
    finalScoreEl.textContent = `Score: ${score.toLocaleString()} · Air hits: ${airHits} · Shockwaves: ${shockwavesTaken}`;
    gameOverScreen.classList.add('visible');
  }

  function heldTankPosition() {
    return !aim || tank.flying ? { x: tank.x, y: tank.y } : { x: aim.x, y: Math.min(aim.y, GROUND - 40) };
  }

  function throwTank() {
    if (!aim || tank.flying || !running) return;
    const dx = tank.x - aim.x;
    const dy = tank.y - aim.y;
    const p = Math.hypot(dx, dy);
    if (p < 18) { aim = null; return; }
    const sc = Math.min(p, MAX_PULL) / p;
    const boost = steroidTimer > 0 ? 1.42 : 1;
    const h = heldTankPosition();
    Object.assign(tank, { x: h.x, y: h.y, vx: dx * sc * 4.05 * boost, vy: dy * sc * 4.05 * boost, angular: Math.min(9, 2 + p / 55), flying: true, bounced: false, resetTimer: 0 });
    tank.hitIds.clear();
    aim = null;
    johnny.releaseTimer = .28;
    beep('throw');
    if (navigator.vibrate) navigator.vibrate(20);
  }

  function updateTank(dt) {
    if (!tank.flying) return;
    tank.vy += GRAVITY * dt;
    tank.x += tank.vx * dt;
    tank.y += tank.vy * dt;
    tank.angle += tank.angular * dt;
    const impact = Math.hypot(tank.vx, tank.vy);

    for (const a of actors) {
      if (a.dead || tank.hitIds.has(a.id)) continue;
      const radius = (a.kind === 'bat' ? 48 * a.scale : 37 + 25 * a.scale) + TANK_HIT_BONUS;
      if (Math.hypot(tank.x - a.x, tank.y - a.y) >= radius) continue;
      tank.hitIds.add(a.id);

      if (a.kind === 'leaper' && LEVEL.airOnly && !a.airborne) {
        tank.vx *= -.18;
        tank.vy = -Math.abs(tank.vy) * .35 - 90;
        tank.angular *= -.7;
        addImpact(a.x, a.y, false, '#d9d0c2');
        floaters.push({ x: a.x, y: a.y - 40, text: 'TOO LOW!', life: .8 });
        showToast('HIT THE LEAPER WHILE IT IS IN THE AIR!', 900);
        beep('ping');
        continue;
      }

      const airborneHit = a.kind === 'leaper' && a.airborne;
      if (airborneHit) a.interrupted = true;
      tank.vx *= .82;
      tank.vy *= .82;
      killActor(a, impact, airborneHit);
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
      if (tank.resetTimer > .62) resetTank();
    } else tank.resetTimer = 0;
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
    sky.addColorStop(0, levelNumber >= 4 ? '#1c2033' : '#5f7f9a');
    sky.addColorStop(.65, levelNumber >= 4 ? '#76606d' : '#d5a274');
    sky.addColorStop(1, '#e2b47a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = levelNumber >= 4 ? '#29362f' : '#4f674d';
    for (let i = -2; i < 16; i++) {
      const x = i * 110 - ((cameraX * .08) % 110);
      const r = 46 + pseudoRandom(i, 12) * 34;
      ctx.beginPath(); ctx.arc(x, GROUND - 205, r, 0, Math.PI * 2); ctx.fill();
    }

    ctx.save();
    ctx.translate(-cameraX * .20, 0);
    for (let i = 0; i < 8; i++) {
      const x = 360 + i * 360;
      const houseY = GROUND - 205 - (i % 2) * 22;
      const body = i % 3 === 0 ? '#b99b7d' : i % 3 === 1 ? '#8e9c9e' : '#c3b38c';
      ctx.fillStyle = body;
      ctx.fillRect(x, houseY, 250, 170);
      ctx.fillStyle = '#534943';
      ctx.beginPath(); ctx.moveTo(x - 18, houseY); ctx.lineTo(x + 125, houseY - 92); ctx.lineTo(x + 270, houseY); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,231,166,.62)';
      for (const wx of [x + 38, x + 168]) ctx.fillRect(wx, houseY + 38, 48, 50);
      ctx.fillStyle = '#5a4638'; ctx.fillRect(x + 105, houseY + 82, 42, 88);
      if (LEVEL.scenery === 'roofs' || LEVEL.scenery === 'split') {
        ctx.fillStyle = '#6e6357'; ctx.fillRect(x + 212, houseY - 32, 58, 32);
      }
      ctx.fillStyle = '#e4ddd0';
      for (let fx = x - 40; fx < x + 310; fx += 38) ctx.fillRect(fx, GROUND - 78, 9, 44);
      ctx.fillRect(x - 45, GROUND - 48, 360, 8);
      ctx.fillStyle = '#36453b'; ctx.fillRect(x + 288, GROUND - 88, 8, 55); ctx.fillRect(x + 275, GROUND - 92, 35, 22);
    }
    ctx.restore();

    ctx.fillStyle = levelNumber >= 4 ? '#556654' : '#6f8a60';
    ctx.fillRect(0, GROUND - 34, W, 34);
    ctx.fillStyle = '#3e4145';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#777a7d';
    ctx.fillRect(0, GROUND, W, 7);
    ctx.fillStyle = '#d7c66d';
    for (let x = -100; x < W + 180; x += 170) ctx.fillRect(x - (cameraX % 170), GROUND + 63, 82, 7);
  }

  function drawActor(a) {
    ctx.save();
    ctx.translate(a.x, a.y + Math.sin(a.bob) * 2);
    if (a.kind === 'leaper' && a.airborne) {
      const tilt = clamp(a.vy / 900, -.25, .25);
      ctx.rotate(tilt);
    }
    ctx.scale(a.scale, a.scale);
    if (a.kind === 'bat') {
      E.drawBat(ctx, { phase: a.phase });
    } else {
      if (a.kind === 'leaper') {
        ctx.save();
        ctx.globalAlpha = .30;
        ctx.fillStyle = LEVEL.airOnly ? '#ffcf66' : '#a8ff58';
        ctx.beginPath(); ctx.ellipse(0, -2, 44, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      E.drawGround(ctx, { phase: a.bob });
      if (a.kind === 'leaper') {
        ctx.fillStyle = '#d6b14e';
        ctx.font = '900 12px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('↟', 0, -53);
      }
    }
    ctx.restore();
  }

  function drawShockwaves() {
    for (const s of shockwaves) {
      const alpha = clamp(s.life / 1.7, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#f6be67';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(s.x, GROUND - 4, s.radius, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,245,205,.75)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(s.x, GROUND - 4, Math.max(6, s.radius - 12), Math.PI, Math.PI * 2);
      ctx.stroke();
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
    for (const a of actors) drawActor(a);
    drawShockwaves();
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
      ctx.globalAlpha = Math.max(0, f.life / .9);
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
      cameraX = updateCamera(cameraX, tank, aim, running, dt);
      updateJohnny(johnny, tank, aim, running, dt);
      return;
    }
    elapsed += dt;
    if (steroidTimer > 0) steroidTimer = Math.max(0, steroidTimer - dt);
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0 && combo !== 1) { combo = 1; updateHud(); }
    }
    updateMission(dt);
    for (const a of actors) updateActor(a, dt);
    updateShockwaves(dt);
    updateTank(dt);
    for (const p of particles) { p.life -= dt; p.vy += 420 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    for (const f of floaters) { f.life -= dt; f.y -= 48 * dt; }
    for (let i = actors.length - 1; i >= 0; i--) if (actors[i].dead) actors.splice(i, 1);
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
    if (!running || gameOver || missionComplete || tank.flying) return;
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
  document.getElementById('start').addEventListener('click', () => { titleScreen.classList.remove('visible'); resetGame(); beep('wave'); });
  document.getElementById('restart').addEventListener('click', () => { gameOverScreen.classList.remove('visible'); resetGame(); });
  document.getElementById('replay').addEventListener('click', () => { missionCompleteScreen.classList.remove('visible'); resetGame(); });

  updateHud();
  render();
  requestAnimationFrame(frame);
})();