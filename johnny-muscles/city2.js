(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const healthEl = document.getElementById('health');
  const comboEl = document.getElementById('combo');
  const waveEl = document.getElementById('wave');
  const remainingEl = document.getElementById('remaining');
  const steroidButton = document.getElementById('steroids');
  const steroidCountEl = document.getElementById('steroid-count');
  const muteButton = document.getElementById('mute');
  const titleScreen = document.getElementById('title-screen');
  const gameOverScreen = document.getElementById('game-over');
  const missionCompleteScreen = document.getElementById('mission-complete');
  const finalScoreEl = document.getElementById('final-score');
  const resultStarsEl = document.getElementById('result-stars');
  const resultScoreEl = document.getElementById('result-score');
  const resultCatsEl = document.getElementById('result-cats');
  const resultMidairEl = document.getElementById('result-midair');
  const resultComboEl = document.getElementById('result-combo');
  const resultDefenseEl = document.getElementById('result-defense');
  const toastEl = document.getElementById('toast');

  const W = 1280;
  const H = 720;
  const GROUND = 603;
  const GRAVITY = 880;
  const DEFENSE_X = 86;
  const TANK_HOME = { x: 250, y: GROUND - 46 };
  const MAX_PULL = 360;
  const AIM_CAMERA_BACK = 450;
  const CAMERA_FOLLOW_SCREEN_X = W * 0.58;
  const CAMERA_EASE = 10.5;

  const BUILDINGS = [
    { x: 520, w: 215, top: 430, label: 'PARKING' },
    { x: 805, w: 220, top: 350, label: 'OFFICES' },
    { x: 1095, w: 205, top: 402, label: 'HOTEL' },
    { x: 1375, w: 235, top: 318, label: 'TOWER' }
  ];

  const LEVEL = {
    waves: [
      { ground: 2, rooftop: 3, movingFraction: 0.34, chonkerChance: 0.0, spawnGap: 0.95 },
      { ground: 2, rooftop: 5, movingFraction: 0.82, chonkerChance: 0.05, spawnGap: 0.82 },
      { ground: 3, rooftop: 6, movingFraction: 1.0, chonkerChance: 0.14, spawnGap: 0.72 }
    ]
  };

  let lastTime = performance.now();
  let running = false;
  let gameOver = false;
  let missionComplete = false;
  let score = 0;
  let health = 5;
  let combo = 1;
  let comboTimer = 0;
  let bestCombo = 1;
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
  let waveQueue = [];
  let waveResolved = 0;
  let waveSpawned = 0;
  let waveSpawnTimer = 0;
  let intermissionTimer = 0;
  let waveClearAnnounced = false;
  let missionFinishTimer = 0;
  let catsFlattened = 0;
  let midairHits = 0;
  let breaches = 0;

  const cats = [];
  const particles = [];
  const floaters = [];

  const tank = {
    x: TANK_HOME.x,
    y: TANK_HOME.y,
    vx: 0,
    vy: 0,
    angle: 0,
    angular: 0,
    flying: false,
    resetTimer: 0,
    hitIds: new Set(),
    bounced: false
  };

  const johnny = {
    armAngle: -0.75,
    targetArmAngle: -0.75,
    releaseTimer: 0,
    torsoLean: 0,
    targetTorsoLean: 0,
    squat: 0,
    targetSquat: 0
  };

  function resetTank() {
    Object.assign(tank, {
      x: TANK_HOME.x,
      y: TANK_HOME.y,
      vx: 0,
      vy: 0,
      angle: 0,
      angular: 0,
      flying: false,
      resetTimer: 0,
      bounced: false
    });
    tank.hitIds.clear();
    aim = null;
    johnny.releaseTimer = 0;
  }

  function resetGame() {
    score = 0;
    health = 5;
    combo = 1;
    comboTimer = 0;
    bestCombo = 1;
    elapsed = 0;
    steroidsLeft = 3;
    steroidTimer = 0;
    catsFlattened = 0;
    midairHits = 0;
    breaches = 0;
    cats.length = 0;
    particles.length = 0;
    floaters.length = 0;
    gameOver = false;
    missionComplete = false;
    running = true;
    cameraX = 0;
    missionFinishTimer = 0;
    currentWave = -1;
    waveQueue = [];
    waveResolved = 0;
    waveSpawned = 0;
    waveSpawnTimer = 0;
    intermissionTimer = 1.15;
    waveClearAnnounced = false;
    Object.assign(johnny, {
      armAngle: -0.75,
      targetArmAngle: -0.75,
      releaseTimer: 0,
      torsoLean: 0,
      targetTorsoLean: 0,
      squat: 0,
      targetSquat: 0
    });
    resetTank();
    updateHud();
    steroidButton.disabled = false;
    steroidCountEl.textContent = '3 demo doses';
    showToast('CITY 2: ROOFTOP PROBLEM', 1200);
  }

  function updateHud() {
    scoreEl.textContent = String(score).padStart(6, '0');
    healthEl.textContent = Array.from({ length: 5 }, (_, i) => (i < health ? '♥' : '♡')).join(' ');
    comboEl.textContent = `x${combo}`;
    if (currentWave < 0) {
      waveEl.textContent = `1/${LEVEL.waves.length}`;
      remainingEl.textContent = 'INCOMING';
      return;
    }
    const wave = LEVEL.waves[currentWave];
    const total = wave.ground + wave.rooftop;
    waveEl.textContent = `${currentWave + 1}/${LEVEL.waves.length}`;
    remainingEl.textContent = missionComplete ? 'SECURED' : String(Math.max(0, total - waveResolved));
  }

  function showToast(text, duration = 820) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), duration);
  }

  function beep(type = 'impact') {
    if (muted) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const now = audioCtx.currentTime;
      const settings = {
        throw: [90, 52, 0.12, 'sawtooth'], impact: [72, 38, 0.09, 'square'],
        cat: [430, 240, 0.08, 'triangle'], power: [160, 420, 0.25, 'sawtooth'],
        hurt: [120, 70, 0.22, 'square'], wave: [260, 410, 0.18, 'square'],
        win: [330, 660, 0.42, 'triangle'], jump: [380, 520, 0.08, 'triangle']
      }[type] || [120, 80, 0.1, 'sine'];
      osc.type = settings[3];
      osc.frequency.setValueAtTime(settings[0], now);
      osc.frequency.exponentialRampToValueAtTime(settings[1], now + settings[2]);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + settings[2]);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + settings[2]);
    } catch (_) {}
  }

  function shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  function startNextWave() {
    currentWave += 1;
    const spec = LEVEL.waves[currentWave];
    waveQueue = shuffle([
      ...Array.from({ length: spec.ground }, () => 'ground'),
      ...Array.from({ length: spec.rooftop }, () => 'rooftop')
    ]);
    waveResolved = 0;
    waveSpawned = 0;
    waveSpawnTimer = 0.25;
    waveClearAnnounced = false;
    showToast(`WAVE ${currentWave + 1} INCOMING`, 1000);
    beep('wave');
    updateHud();
  }

  function makeCatBase(chonker) {
    const scale = chonker ? 1.5 : 0.9 + Math.random() * 0.22;
    return {
      id: `${performance.now()}-${Math.random()}`,
      x: 0,
      y: 0,
      scale,
      hp: chonker ? 2 : 1,
      maxHp: chonker ? 2 : 1,
      chonker,
      dead: false,
      resolved: false,
      bob: Math.random() * Math.PI * 2,
      mode: 'ground',
      speed: chonker ? 39 : 58 + Math.random() * 20,
      staticTimer: 0,
      buildingIndex: -1,
      jumpTimer: 0,
      jumpDuration: 0.58,
      jumpStartX: 0,
      jumpStartY: 0,
      jumpEndX: 0,
      jumpEndY: 0,
      crouch: 0
    };
  }

  function spawnCat(kind) {
    const spec = LEVEL.waves[currentWave];
    const chonker = Math.random() < spec.chonkerChance;
    const cat = makeCatBase(chonker);

    if (kind === 'rooftop') {
      cat.mode = 'roof';
      cat.buildingIndex = BUILDINGS.length - 1;
      const b = BUILDINGS[cat.buildingIndex];
      cat.x = b.x + b.w - 42 - Math.random() * 75;
      cat.y = b.top - 22 * cat.scale;
      const moving = Math.random() < spec.movingFraction;
      cat.staticTimer = moving ? 0 : 5.0 + Math.random() * 1.5;
      cat.speed *= 0.72;
    } else {
      cat.mode = 'ground';
      cat.x = 1320 + Math.random() * 140;
      cat.y = GROUND - 29 * cat.scale;
    }

    cats.push(cat);
    waveSpawned += 1;
    updateHud();
  }

  function resolveCat(cat, defeated) {
    if (cat.resolved) return;
    cat.resolved = true;
    cat.dead = true;
    waveResolved += 1;
    if (defeated) catsFlattened += 1;
    updateHud();
  }

  function activeCats() {
    return cats.reduce((n, cat) => n + (!cat.dead ? 1 : 0), 0);
  }

  function beginJump(cat) {
    if (cat.chonker) {
      cat.mode = 'descent';
      cat.crouch = 0;
      floaters.push({ x: cat.x, y: cat.y - 20, text: 'CRUNCH!', life: 0.8 });
      addImpact(cat.x, cat.y + 12, true);
      return;
    }
    const nextIndex = cat.buildingIndex - 1;
    const next = BUILDINGS[nextIndex];
    cat.mode = 'jump';
    cat.jumpTimer = 0;
    cat.jumpStartX = cat.x;
    cat.jumpStartY = cat.y;
    cat.jumpEndX = next.x + next.w - 34;
    cat.jumpEndY = next.top - 22 * cat.scale;
    cat.jumpDuration = 0.52 + Math.random() * 0.12;
    cat.crouch = 0;
    beep('jump');
  }

  function updateCat(cat, dt) {
    if (cat.dead) return;
    cat.bob += dt * 7;

    if (cat.mode === 'ground') {
      cat.x -= cat.speed * dt;
      cat.y = GROUND - 29 * cat.scale;
    } else if (cat.mode === 'roof') {
      if (cat.staticTimer > 0) {
        cat.staticTimer -= dt;
        return;
      }
      const b = BUILDINGS[cat.buildingIndex];
      cat.x -= cat.speed * dt;
      cat.y = b.top - 22 * cat.scale;
      if (cat.x <= b.x + 28) {
        cat.x = b.x + 28;
        if (cat.buildingIndex > 0) {
          cat.mode = 'windup';
          cat.jumpTimer = 0.36;
        } else {
          cat.mode = 'descent';
        }
      }
    } else if (cat.mode === 'windup') {
      cat.jumpTimer -= dt;
      cat.crouch = Math.max(0, Math.min(1, 1 - cat.jumpTimer / 0.36));
      if (cat.jumpTimer <= 0) beginJump(cat);
    } else if (cat.mode === 'jump') {
      cat.jumpTimer += dt;
      const t = Math.min(1, cat.jumpTimer / cat.jumpDuration);
      const eased = t * t * (3 - 2 * t);
      cat.x = cat.jumpStartX + (cat.jumpEndX - cat.jumpStartX) * eased;
      cat.y = cat.jumpStartY + (cat.jumpEndY - cat.jumpStartY) * eased - Math.sin(Math.PI * t) * 92;
      if (t >= 1) {
        cat.buildingIndex -= 1;
        cat.mode = 'roof';
        cat.staticTimer = 0;
      }
    } else if (cat.mode === 'descent') {
      cat.x -= 28 * dt;
      cat.y += 145 * dt;
      if (cat.y >= GROUND - 29 * cat.scale) {
        cat.y = GROUND - 29 * cat.scale;
        cat.mode = 'ground';
        cat.speed *= 1.05;
      }
    }

    if (cat.mode === 'ground' && cat.x < DEFENSE_X) {
      breaches += 1;
      health -= 1;
      combo = 1;
      comboTimer = 0;
      resolveCat(cat, false);
      showToast('THEY GOT THROUGH!');
      beep('hurt');
      shake = 12;
      updateHud();
      if (health <= 0) endGame();
    }
  }

  function updateMission(dt) {
    if (missionComplete || gameOver) return;
    if (currentWave < 0) {
      intermissionTimer -= dt;
      if (intermissionTimer <= 0) startNextWave();
      return;
    }

    const spec = LEVEL.waves[currentWave];
    const total = spec.ground + spec.rooftop;
    if (waveSpawned < total) {
      waveSpawnTimer -= dt;
      if (waveSpawnTimer <= 0) {
        spawnCat(waveQueue[waveSpawned]);
        waveSpawnTimer = spec.spawnGap;
      }
      return;
    }

    if (waveResolved < total || activeCats() > 0) return;

    if (currentWave < LEVEL.waves.length - 1) {
      if (!waveClearAnnounced) {
        waveClearAnnounced = true;
        intermissionTimer = 1.6;
        showToast(`WAVE ${currentWave + 1} CLEAR`, 900);
        return;
      }
      intermissionTimer -= dt;
      if (intermissionTimer <= 0) startNextWave();
      return;
    }

    missionFinishTimer += dt;
    if (missionFinishTimer >= 0.75) completeMission();
  }

  function completeMission() {
    if (missionComplete || gameOver) return;
    missionComplete = true;
    running = false;
    aim = null;
    updateHud();
    showToast('ROOFTOPS SECURED', 1300);
    beep('win');
    const stars = 1 + (breaches === 0 ? 1 : 0) + (midairHits >= 2 ? 1 : 0);
    resultStarsEl.textContent = `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`;
    resultScoreEl.textContent = score.toLocaleString();
    resultCatsEl.textContent = String(catsFlattened);
    resultMidairEl.textContent = String(midairHits);
    resultComboEl.textContent = `x${bestCombo}`;
    resultDefenseEl.textContent = breaches === 0 ? 'UNTOUCHED' : `${health}/5 HEARTS`;
    setTimeout(() => missionCompleteScreen.classList.add('visible'), 900);
  }

  function endGame() {
    running = false;
    gameOver = true;
    aim = null;
    finalScoreEl.textContent = `Score: ${score.toLocaleString()}`;
    gameOverScreen.classList.add('visible');
  }

  function getHeldTankPosition() {
    if (!aim || tank.flying) return { x: tank.x, y: tank.y };
    return { x: aim.x, y: Math.min(aim.y, GROUND - 40) };
  }

  function throwTank() {
    if (!aim || tank.flying || !running) return;
    const dx = tank.x - aim.x;
    const dy = tank.y - aim.y;
    const pull = Math.hypot(dx, dy);
    if (pull < 18) { aim = null; return; }
    const scale = Math.min(pull, MAX_PULL) / pull;
    const boost = steroidTimer > 0 ? 1.42 : 1;
    const held = getHeldTankPosition();
    tank.x = held.x;
    tank.y = held.y;
    tank.vx = dx * scale * 4.05 * boost;
    tank.vy = dy * scale * 4.05 * boost;
    tank.angular = Math.min(9, 2 + pull / 55);
    tank.flying = true;
    tank.hitIds.clear();
    aim = null;
    johnny.releaseTimer = 0.28;
    johnny.armAngle = 0.35;
    johnny.torsoLean = 0.22;
    johnny.squat = 0.15;
    addLaunchDust();
    beep('throw');
    if (navigator.vibrate) navigator.vibrate(20);
  }

  function addLaunchDust() {
    for (let i = 0; i < 12; i++) {
      particles.push({ x: 142 + (Math.random() - 0.5) * 55, y: GROUND - 8,
        vx: (Math.random() - 0.5) * 180, vy: -45 - Math.random() * 120,
        life: 0.28 + Math.random() * 0.32, max: 0.6, size: 5 + Math.random() * 10, dust: true });
    }
  }

  function addImpact(x, y, strong = false) {
    const count = strong ? 22 : 11;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 70 + Math.random() * (strong ? 300 : 150);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80,
        life: 0.35 + Math.random() * 0.5, max: 0.85, size: 3 + Math.random() * 9, dust: false });
    }
    shake = Math.max(shake, strong ? 15 : 7);
  }

  function killCat(cat, impactSpeed) {
    const airborne = cat.mode === 'jump';
    resolveCat(cat, true);
    if (airborne) midairHits += 1;
    const base = cat.chonker ? 350 : 120;
    const airBonus = airborne ? 200 : 0;
    const velocityBonus = Math.floor(Math.min(impactSpeed / 8, 120));
    const points = (base + airBonus + velocityBonus) * combo;
    score += points;
    combo = Math.min(combo + 1, 12);
    bestCombo = Math.max(bestCombo, combo);
    comboTimer = 2.1;
    floaters.push({ x: cat.x, y: cat.y - 25, text: airborne ? `AIR +${points}` : `+${points}`, life: 0.9 });
    addImpact(cat.x, cat.y, cat.chonker || impactSpeed > 620);
    beep('cat');
    if (airborne) showToast('MID-AIR MEOWCH!');
    if (combo === 5) showToast('CAT-ASTROPHE x5');
    updateHud();
  }

  function updateTank(dt) {
    if (!tank.flying) return;
    const prevX = tank.x;
    const prevY = tank.y;
    tank.vy += GRAVITY * dt;
    tank.x += tank.vx * dt;
    tank.y += tank.vy * dt;
    tank.angle += tank.angular * dt;

    for (const b of BUILDINGS) {
      const roofY = b.top - 20;
      if (tank.vy > 0 && prevY < roofY && tank.y >= roofY && tank.x > b.x - 38 && tank.x < b.x + b.w + 38) {
        tank.y = roofY;
        tank.vy *= -0.38;
        tank.vx *= 0.84;
        tank.angular *= 0.72;
        tank.bounced = true;
        addImpact(tank.x, tank.y + 20, false);
        beep('impact');
      }
      if (Math.abs(tank.vx) > 80 && tank.y > b.top + 8 && tank.y < GROUND - 20) {
        const leftHit = prevX < b.x - 28 && tank.x >= b.x - 28;
        const rightHit = prevX > b.x + b.w + 28 && tank.x <= b.x + b.w + 28;
        if (leftHit || rightHit) {
          tank.x = leftHit ? b.x - 30 : b.x + b.w + 30;
          tank.vx *= -0.46;
          tank.angular *= -0.7;
          addImpact(tank.x, tank.y, false);
          beep('impact');
        }
      }
    }

    const impactSpeed = Math.hypot(tank.vx, tank.vy);
    for (const cat of cats) {
      if (cat.dead || tank.hitIds.has(cat.id)) continue;
      const r = 37 + 25 * cat.scale;
      if (Math.hypot(tank.x - cat.x, tank.y - cat.y) < r) {
        tank.hitIds.add(cat.id);
        const damage = (steroidTimer > 0 ? 2 : 1) + (impactSpeed > 760 ? 1 : 0);
        cat.hp -= damage;
        tank.vx *= 0.86;
        tank.vy *= 0.9;
        if (cat.hp <= 0) killCat(cat, impactSpeed);
        else {
          floaters.push({ x: cat.x, y: cat.y - 36, text: 'BONK!', life: 0.7 });
          addImpact(cat.x, cat.y, damage > 1);
          beep('impact');
        }
      }
    }

    if (tank.y >= GROUND - 22) {
      tank.y = GROUND - 22;
      if (Math.abs(tank.vy) > 160 && !tank.bounced) {
        tank.vy *= -0.30;
        tank.vx *= 0.74;
        tank.angular *= 0.65;
        tank.bounced = true;
        addImpact(tank.x, tank.y + 15, true);
        beep('impact');
      } else {
        tank.vy = 0;
        tank.vx *= Math.pow(0.055, dt);
        tank.angular *= Math.pow(0.03, dt);
      }
    }

    if (tank.x < -260 || (tank.y >= GROUND - 23 && Math.abs(tank.vx) < 14)) {
      tank.resetTimer += dt;
      if (tank.resetTimer > 0.65) resetTank();
    } else tank.resetTimer = 0;
  }

  function updateCamera(dt) {
    let target = 0;
    if (running && aim && !tank.flying) {
      const pull = Math.hypot(tank.x - aim.x, tank.y - aim.y);
      const ratio = Math.min(1, pull / MAX_PULL);
      const earlyPull = Math.sqrt(ratio);
      target = -AIM_CAMERA_BACK * (0.30 + 0.70 * earlyPull);
    } else if (running && tank.flying) {
      target = Math.max(0, tank.x - CAMERA_FOLLOW_SCREEN_X);
    }
    const t = 1 - Math.exp(-CAMERA_EASE * dt);
    cameraX += (target - cameraX) * t;
    if (Math.abs(cameraX - target) < 0.05) cameraX = target;
  }

  function updateJohnny(dt) {
    let desiredArm = -0.75;
    let desiredLean = 0;
    let desiredSquat = 0;
    if (aim && !tank.flying && running) {
      const held = getHeldTankPosition();
      desiredArm = Math.atan2(held.y - (GROUND - 172), held.x - 176);
      desiredArm = Math.max(-2.55, Math.min(1.0, desiredArm));
      const ratio = Math.min(MAX_PULL, Math.hypot(tank.x - aim.x, tank.y - aim.y)) / MAX_PULL;
      desiredLean = -0.18 * ratio;
      desiredSquat = 0.14 * ratio;
    } else if (johnny.releaseTimer > 0) {
      johnny.releaseTimer = Math.max(0, johnny.releaseTimer - dt);
      const t = johnny.releaseTimer / 0.28;
      desiredArm = 0.42 - 1.05 * (1 - t);
      desiredLean = 0.24 * t;
      desiredSquat = 0.12 * t;
    } else if (tank.flying) {
      desiredArm = -0.28;
      desiredLean = 0.03;
    }
    const ease = 1 - Math.exp(-14 * dt);
    johnny.armAngle += (desiredArm - johnny.armAngle) * ease;
    johnny.torsoLean += (desiredLean - johnny.torsoLean) * ease;
    johnny.squat += (desiredSquat - johnny.squat) * ease;
  }

  function update(dt) {
    if (!running) {
      updateCamera(dt);
      updateJohnny(dt);
      return;
    }
    elapsed += dt;
    if (steroidTimer > 0) steroidTimer = Math.max(0, steroidTimer - dt);
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0 && combo !== 1) { combo = 1; updateHud(); }
    }
    updateMission(dt);
    for (const cat of cats) updateCat(cat, dt);
    updateTank(dt);
    for (const p of particles) { p.life -= dt; p.vy += 420 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    for (const f of floaters) { f.life -= dt; f.y -= 48 * dt; }
    for (let i = cats.length - 1; i >= 0; i--) if (cats[i].dead) cats.splice(i, 1);
    for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
    for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].life <= 0) floaters.splice(i, 1);
    shake *= Math.pow(0.002, dt);
    updateCamera(dt);
    updateJohnny(dt);
  }

  function pseudoRandom(index, salt = 0) {
    const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, '#17223d');
    sky.addColorStop(0.58, '#4a5268');
    sky.addColorStop(1, '#a17863');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    const moonX = 1060 - cameraX * 0.08;
    ctx.fillStyle = 'rgba(240,242,255,.12)';
    ctx.beginPath(); ctx.arc(moonX, 105, 52, 0, Math.PI * 2); ctx.fill();

    const parallax = cameraX * 0.24;
    const width = 145;
    const start = Math.floor((parallax - 200) / width);
    const end = Math.ceil((parallax + W + 200) / width);
    for (let i = start; i <= end; i++) {
      const x = i * width - parallax;
      const h = 120 + pseudoRandom(i, 2) * 170;
      ctx.fillStyle = '#2b3346';
      ctx.fillRect(x, GROUND - h, 120 + pseudoRandom(i, 3) * 55, h);
    }
    ctx.fillStyle = '#393833';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#5a554d';
    ctx.fillRect(0, GROUND, W, 7);
  }

  function drawBuildings() {
    for (const b of BUILDINGS) {
      const h = GROUND - b.top;
      ctx.fillStyle = '#262b35';
      ctx.fillRect(b.x, b.top, b.w, h);
      ctx.fillStyle = '#3b4250';
      ctx.fillRect(b.x - 6, b.top - 12, b.w + 12, 14);
      ctx.fillStyle = 'rgba(255,211,111,.18)';
      for (let wx = b.x + 22; wx < b.x + b.w - 12; wx += 42) {
        for (let wy = b.top + 35; wy < GROUND - 25; wy += 50) {
          if (pseudoRandom(Math.floor(wx + wy), b.x) > 0.34) ctx.fillRect(wx, wy, 15, 20);
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.font = '900 10px system-ui, sans-serif';
      ctx.fillText(b.label, b.x + 12, b.top + 22);
      if (b === BUILDINGS[0]) {
        ctx.strokeStyle = '#606874';
        ctx.lineWidth = 5;
        for (let y = b.top + 38; y < GROUND - 25; y += 34) {
          ctx.beginPath(); ctx.moveTo(b.x + 8, y); ctx.lineTo(b.x + 42, y); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(b.x + 9, b.top + 28); ctx.lineTo(b.x + 9, GROUND); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(b.x + 42, b.top + 28); ctx.lineTo(b.x + 42, GROUND); ctx.stroke();
      }
    }
  }

  function drawArm(baseX, baseY, upperLen, foreLen, angle, bent, thickness) {
    const elbowX = baseX + Math.cos(angle) * upperLen;
    const elbowY = baseY + Math.sin(angle) * upperLen;
    const foreAngle = angle + bent;
    const handX = elbowX + Math.cos(foreAngle) * foreLen;
    const handY = elbowY + Math.sin(foreAngle) * foreLen;
    ctx.strokeStyle = '#d79a6e'; ctx.lineWidth = thickness; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.lineTo(elbowX, elbowY); ctx.lineTo(handX, handY); ctx.stroke();
    ctx.fillStyle = '#d79a6e';
    ctx.beginPath(); ctx.arc(elbowX, elbowY, thickness * 0.42, 0, Math.PI * 2); ctx.arc(handX, handY, thickness * 0.38, 0, Math.PI * 2); ctx.fill();
  }

  function drawJohnny() {
    const x = 142;
    const y = GROUND - 36 + johnny.squat * 22;
    const lean = johnny.torsoLean;
    const torsoShift = lean * 42;
    ctx.save(); ctx.translate(x, y);
    if (steroidTimer > 0) { ctx.shadowColor = '#a8ff58'; ctx.shadowBlur = 22 + Math.sin(elapsed * 12) * 8; }
    ctx.fillStyle = '#59664b'; ctx.fillRect(-41, -60 + johnny.squat * 14, 35, 65); ctx.fillRect(6, -60 + johnny.squat * 14, 35, 65);
    ctx.fillStyle = '#222'; ctx.fillRect(-44, -3 + johnny.squat * 14, 39, 16); ctx.fillRect(5, -3 + johnny.squat * 14, 39, 16);
    drawArm(-26 + torsoShift * 0.5, -120, 40, 28, -2.3 - lean * 0.5, 0.75, 16);
    ctx.save(); ctx.translate(torsoShift, 0); ctx.rotate(lean);
    ctx.fillStyle = '#d79a6e'; ctx.beginPath(); ctx.ellipse(0, -105, 49, 64, 0, 0, Math.PI * 2); ctx.fill();
    drawArm(27, -118, 52, 46, johnny.armAngle, 0.48, 18);
    ctx.strokeStyle = '#9c674d'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -145); ctx.lineTo(0, -65); ctx.stroke();
    ctx.fillStyle = '#eee'; ctx.font = '900 12px system-ui, sans-serif'; ctx.fillText('JM', -9, -94);
    ctx.fillStyle = '#d79a6e'; ctx.beginPath(); ctx.ellipse(0, -162, 28, 34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1c17'; ctx.fillRect(-25, -189, 50, 10);
    ctx.restore(); ctx.restore();
  }

  function drawTank(t = tank) {
    ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.angle);
    ctx.fillStyle = '#1c231d'; ctx.fillRect(-49, 12, 98, 22);
    ctx.fillStyle = '#59664b'; ctx.fillRect(-41, -11, 82, 30);
    ctx.beginPath(); ctx.arc(4, -11, 22, Math.PI, 0); ctx.fill(); ctx.fillRect(12, -18, 71, 8);
    ctx.fillStyle = '#111'; for (let x = -38; x <= 38; x += 19) { ctx.beginPath(); ctx.arc(x, 24, 9, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#c8d39e'; ctx.font = '900 10px system-ui, sans-serif'; ctx.fillText('THROW ME', -31, 7); ctx.restore();
  }

  function drawCat(cat) {
    ctx.save();
    const crouchY = cat.crouch * 10;
    ctx.translate(cat.x, cat.y + Math.sin(cat.bob) * 2 + crouchY);
    ctx.scale(cat.scale, cat.scale * (1 - cat.crouch * 0.12));
    const wounded = cat.hp < cat.maxHp;
    ctx.fillStyle = cat.chonker ? '#3e3344' : '#554358';
    ctx.beginPath(); ctx.ellipse(0, 0, 31, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-22, -18, 20, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-38, -31); ctx.lineTo(-34, -50); ctx.lineTo(-22, -35); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-12, -35); ctx.lineTo(-4, -49); ctx.lineTo(0, -29); ctx.fill();
    ctx.strokeStyle = '#6fdf78'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(24, -5); ctx.quadraticCurveTo(48, -28, 55, -10); ctx.quadraticCurveTo(67, 10, 49, 17); ctx.stroke();
    ctx.strokeStyle = '#9c5de5'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(13, 11); ctx.quadraticCurveTo(28, 36, 47, 31); ctx.stroke();
    ctx.fillStyle = wounded ? '#ffe34e' : '#77ff62'; ctx.beginPath(); ctx.arc(-29, -20, 4, 0, Math.PI * 2); ctx.arc(-17, -20, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f4dfed'; ctx.fillRect(-25, -10, 6, 4);
    if (cat.mode === 'windup') {
      ctx.fillStyle = '#ffcf33'; ctx.font = '900 11px system-ui, sans-serif'; ctx.fillText('!', -24, -62);
    }
    ctx.restore();
  }

  function drawAim() {
    if (!aim || tank.flying || !running) return;
    const dx = tank.x - aim.x;
    const dy = tank.y - aim.y;
    const rawPull = Math.hypot(dx, dy);
    const pull = Math.min(rawPull, MAX_PULL);
    const len = rawPull || 1;
    const boost = steroidTimer > 0 ? 1.42 : 1;
    const vx = (dx / len) * pull * 4.05 * boost;
    const vy = (dy / len) * pull * 4.05 * boost;
    const held = getHeldTankPosition();
    ctx.save(); ctx.setLineDash([11, 9]); ctx.strokeStyle = steroidTimer > 0 ? '#a8ff58' : '#ffcf33'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(tank.x, tank.y); ctx.lineTo(aim.x, aim.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 1; i <= 18; i++) {
      const t = i * 0.09;
      const x = held.x + vx * t;
      const y = held.y + vy * t + 0.5 * GRAVITY * t * t;
      if (y > GROUND) break;
      ctx.beginPath(); ctx.arc(x, y, Math.max(2, 5 - i * 0.18), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0.4) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    drawBackground();
    ctx.save(); ctx.translate(-cameraX, 0);
    drawBuildings();
    drawJohnny();
    drawAim();
    if (aim && !tank.flying && running) { const held = getHeldTankPosition(); drawTank({ ...tank, x: held.x, y: held.y, angle: -0.08 }); } else drawTank();
    for (const cat of cats) drawCat(cat);
    for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.dust ? '#c8b28a' : '#ffd85a'; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
    ctx.globalAlpha = 1;
    for (const f of floaters) { ctx.globalAlpha = Math.max(0, f.life / 0.9); ctx.fillStyle = '#fff4a5'; ctx.font = '900 24px Impact, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(f.text, f.x, f.y); }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
    ctx.restore();
    if (steroidTimer > 0 && running) { ctx.fillStyle = 'rgba(168,255,88,.10)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#caff8f'; ctx.font = '900 18px system-ui, sans-serif'; ctx.fillText(`STEROIDS: ${steroidTimer.toFixed(1)}s`, 24, H - 24); }
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.033);
    lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  function pointerToWorld(e) {
    const rect = canvas.getBoundingClientRect();
    const canvasAspect = W / H;
    const rectAspect = rect.width / rect.height;
    let drawW, drawH, offsetX, offsetY;
    if (rectAspect > canvasAspect) { drawH = rect.height; drawW = drawH * canvasAspect; offsetX = (rect.width - drawW) / 2; offsetY = 0; }
    else { drawW = rect.width; drawH = drawW / canvasAspect; offsetX = 0; offsetY = (rect.height - drawH) / 2; }
    return { x: ((e.clientX - rect.left - offsetX) * W / drawW) + cameraX, y: ((e.clientY - rect.top - offsetY) * H / drawH) };
  }

  canvas.addEventListener('pointerdown', e => {
    if (!running || tank.flying || gameOver || missionComplete) return;
    e.preventDefault();
    const p = pointerToWorld(e);
    if (Math.hypot(p.x - tank.x, p.y - tank.y) < 105) { aim = p; canvas.setPointerCapture?.(e.pointerId); }
  }, { passive: false });

  canvas.addEventListener('pointermove', e => {
    if (!aim || tank.flying) return;
    e.preventDefault();
    const p = pointerToWorld(e);
    const dx = p.x - tank.x;
    const dy = p.y - tank.y;
    const len = Math.hypot(dx, dy);
    aim = len > MAX_PULL ? { x: tank.x + (dx / len) * MAX_PULL, y: tank.y + (dy / len) * MAX_PULL } : p;
  }, { passive: false });

  canvas.addEventListener('pointerup', e => { e.preventDefault(); throwTank(); }, { passive: false });
  canvas.addEventListener('pointercancel', () => { aim = null; });

  steroidButton.addEventListener('click', () => {
    if (!running || steroidsLeft <= 0) return;
    steroidsLeft -= 1;
    steroidTimer = 12;
    steroidCountEl.textContent = steroidsLeft === 1 ? '1 demo dose' : `${steroidsLeft} demo doses`;
    steroidButton.disabled = steroidsLeft <= 0;
    showToast('UNREGULATED STRENGTH!');
    beep('power');
    shake = 10;
  });

  muteButton.addEventListener('click', () => { muted = !muted; muteButton.textContent = muted ? '🔇' : '🔊'; });
  document.getElementById('start').addEventListener('click', () => { titleScreen.classList.remove('visible'); resetGame(); beep('power'); });
  document.getElementById('restart').addEventListener('click', () => { gameOverScreen.classList.remove('visible'); resetGame(); });
  document.getElementById('replay').addEventListener('click', () => { missionCompleteScreen.classList.remove('visible'); resetGame(); });
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' && titleScreen.classList.contains('visible')) document.getElementById('start').click();
    if (e.code === 'KeyS') steroidButton.click();
  });

  render();
  requestAnimationFrame(frame);
})();
