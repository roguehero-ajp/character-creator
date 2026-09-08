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
  const resultThrowsEl = document.getElementById('result-throws');
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
  const AIM_CAMERA_BACK = 600;
  const CAMERA_FOLLOW_SCREEN_X = W * 0.58;
  const CAMERA_EASE = 10.5;

  const LEVEL = {
    id: 'city-1',
    region: 'CITY',
    name: 'FIRST CONTACT',
    objective: 'Hold the defense line through all three waves.',
    scoreStar: 3000,
    waves: [
      { count: 4, spawnGap: 1.0, chonkerChance: 0.0, speedBonus: -4 },
      { count: 6, spawnGap: 0.88, chonkerChance: 0.08, speedBonus: 2 },
      { count: 8, spawnGap: 0.76, chonkerChance: 0.16, speedBonus: 8 }
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
  let waveSpawned = 0;
  let waveResolved = 0;
  let waveSpawnTimer = 0;
  let intermissionTimer = 0;
  let missionFinishTimer = 0;
  let waveClearAnnounced = false;

  let catsFlattened = 0;
  let tanksThrown = 0;
  let bestCombo = 1;
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

  function resetGame() {
    score = 0;
    health = 5;
    combo = 1;
    comboTimer = 0;
    elapsed = 0;
    steroidsLeft = 3;
    steroidTimer = 0;
    catsFlattened = 0;
    tanksThrown = 0;
    bestCombo = 1;
    breaches = 0;
    cats.length = 0;
    particles.length = 0;
    floaters.length = 0;
    gameOver = false;
    missionComplete = false;
    running = true;
    cameraX = 0;
    missionFinishTimer = 0;
    waveClearAnnounced = false;

    currentWave = -1;
    waveSpawned = 0;
    waveResolved = 0;
    waveSpawnTimer = 0;
    intermissionTimer = 1.15;

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
    showToast('CITY 1: FIRST CONTACT');
  }

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

  function activeCats() {
    return cats.reduce((total, cat) => total + (cat.dead ? 0 : 1), 0);
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
    const unresolved = Math.max(0, wave.count - waveResolved);
    waveEl.textContent = `${currentWave + 1}/${LEVEL.waves.length}`;
    remainingEl.textContent = missionComplete ? 'SECURED' : String(unresolved);
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
        throw: [90, 52, 0.12, 'sawtooth'],
        impact: [72, 38, 0.09, 'square'],
        cat: [430, 240, 0.08, 'triangle'],
        power: [160, 420, 0.25, 'sawtooth'],
        hurt: [120, 70, 0.22, 'square'],
        wave: [260, 410, 0.18, 'square'],
        win: [330, 660, 0.42, 'triangle']
      }[type] || [120, 80, 0.1, 'sine'];

      osc.type = settings[3];
      osc.frequency.setValueAtTime(settings[0], now);
      osc.frequency.exponentialRampToValueAtTime(settings[1], now + settings[2]);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + settings[2]);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + settings[2]);
    } catch (_) {
      // Sound is optional.
    }
  }

  function startNextWave() {
    currentWave += 1;
    waveSpawned = 0;
    waveResolved = 0;
    waveSpawnTimer = 0.3;
    waveClearAnnounced = false;
    const waveNumber = currentWave + 1;
    showToast(`WAVE ${waveNumber} INCOMING`, 1050);
    beep('wave');
    updateHud();
  }

  function spawnCat() {
    const wave = LEVEL.waves[currentWave];
    const chonker = Math.random() < wave.chonkerChance;
    const scale = chonker ? 1.55 : 0.9 + Math.random() * 0.25;
    const hp = chonker ? 2 : 1;

    cats.push({
      id: `${performance.now()}-${Math.random()}`,
      x: W + 60,
      y: GROUND - 29 * scale,
      scale,
      speed: (chonker ? 36 : 54 + Math.random() * 24) + wave.speedBonus,
      hp,
      maxHp: hp,
      chonker,
      bob: Math.random() * Math.PI * 2,
      dead: false,
      resolved: false
    });

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

  function updateMission(dt) {
    if (missionComplete || gameOver) return;

    if (currentWave < 0) {
      intermissionTimer -= dt;
      if (intermissionTimer <= 0) startNextWave();
      return;
    }

    const wave = LEVEL.waves[currentWave];

    if (waveSpawned < wave.count) {
      waveSpawnTimer -= dt;
      if (waveSpawnTimer <= 0) {
        spawnCat();
        waveSpawnTimer = wave.spawnGap;
      }
      return;
    }

    if (waveResolved < wave.count || activeCats() > 0) return;

    if (currentWave < LEVEL.waves.length - 1) {
      if (!waveClearAnnounced) {
        waveClearAnnounced = true;
        intermissionTimer = 1.65;
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
    comboTimer = 0;
    updateHud();
    showToast('AREA SECURED', 1300);
    beep('win');

    const stars = 1 + (breaches === 0 ? 1 : 0) + (score >= LEVEL.scoreStar ? 1 : 0);
    resultStarsEl.textContent = `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`;
    resultScoreEl.textContent = score.toLocaleString();
    resultCatsEl.textContent = String(catsFlattened);
    resultThrowsEl.textContent = String(tanksThrown);
    resultComboEl.textContent = `x${bestCombo}`;
    resultDefenseEl.textContent = breaches === 0 ? 'UNTOUCHED' : `${breaches} BREACH${breaches === 1 ? '' : 'ES'}`;

    setTimeout(() => missionCompleteScreen.classList.add('visible'), 850);
  }

  function getHeldTankPosition() {
    if (!aim || tank.flying) return { x: tank.x, y: tank.y };
    return { x: aim.x, y: Math.min(aim.y, GROUND - 40) };
  }

  function throwTank() {
    if (!aim || tank.flying || !running || missionComplete) return;

    const dx = tank.x - aim.x;
    const dy = tank.y - aim.y;
    const pull = Math.hypot(dx, dy);

    if (pull < 18) {
      aim = null;
      return;
    }

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
    tanksThrown += 1;

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
      particles.push({
        x: 142 + (Math.random() - 0.5) * 55,
        y: GROUND - 8,
        vx: (Math.random() - 0.5) * 180,
        vy: -45 - Math.random() * 120,
        life: 0.28 + Math.random() * 0.32,
        max: 0.6,
        size: 5 + Math.random() * 10,
        dust: true
      });
    }
  }

  function addImpact(x, y, strong = false) {
    const count = strong ? 22 : 11;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 70 + Math.random() * (strong ? 300 : 150);
      particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 80,
        life: 0.35 + Math.random() * 0.5,
        max: 0.85,
        size: 3 + Math.random() * 9,
        dust: false
      });
    }
    shake = Math.max(shake, strong ? 15 : 7);
  }

  function killCat(cat, impactSpeed) {
    resolveCat(cat, true);
    const base = cat.chonker ? 350 : 120;
    const velocityBonus = Math.floor(Math.min(impactSpeed / 8, 120));
    bestCombo = Math.max(bestCombo, combo);
    const points = (base + velocityBonus) * combo;

    score += points;
    combo = Math.min(combo + 1, 12);
    comboTimer = 2.1;

    floaters.push({ x: cat.x, y: cat.y - 20, text: `+${points}`, life: 0.9 });
    addImpact(cat.x, cat.y, cat.chonker || impactSpeed > 620);
    beep('cat');

    if (combo === 5) showToast('CAT-ASTROPHE x5');
    if (combo === 10) showToast('TACTICAL GENIUS');
    updateHud();
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
      const shoulderX = 176;
      const shoulderY = GROUND - 172;
      const held = getHeldTankPosition();
      desiredArm = Math.atan2(held.y - shoulderY, held.x - shoulderX);
      desiredArm = Math.max(-2.55, Math.min(1.0, desiredArm));
      const pull = Math.min(MAX_PULL, Math.hypot(tank.x - aim.x, tank.y - aim.y));
      const ratio = pull / MAX_PULL;
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
    johnny.targetArmAngle = desiredArm;
    johnny.targetTorsoLean = desiredLean;
    johnny.targetSquat = desiredSquat;
    johnny.armAngle += (johnny.targetArmAngle - johnny.armAngle) * ease;
    johnny.torsoLean += (johnny.targetTorsoLean - johnny.torsoLean) * ease;
    johnny.squat += (johnny.targetSquat - johnny.squat) * ease;
  }

  function update(dt) {
    if (!running) {
      updateCamera(dt);
      updateJohnny(dt);
      return;
    }

    elapsed += dt;
    updateMission(dt);

    if (steroidTimer > 0) steroidTimer = Math.max(0, steroidTimer - dt);

    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0 && combo !== 1) {
        combo = 1;
        updateHud();
      }
    }

    for (const cat of cats) {
      if (cat.dead) continue;
      cat.x -= cat.speed * dt;
      cat.bob += dt * 7;

      if (cat.x < DEFENSE_X) {
        breaches += 1;
        resolveCat(cat, false);
        health -= 1;
        combo = 1;
        comboTimer = 0;
        updateHud();
        beep('hurt');
        showToast('DEFENSE BREACH!');
        shake = 12;
        if (health <= 0) endGame();
      }
    }

    if (tank.flying) {
      tank.vy += GRAVITY * dt;
      tank.x += tank.vx * dt;
      tank.y += tank.vy * dt;
      tank.angle += tank.angular * dt;

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
          addImpact(cat.x, cat.y, damage > 1);

          if (cat.hp <= 0) {
            killCat(cat, impactSpeed);
          } else {
            floaters.push({ x: cat.x, y: cat.y - 36, text: 'BONK!', life: 0.7 });
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
      } else {
        tank.resetTimer = 0;
      }
    }

    for (const p of particles) {
      p.life -= dt;
      p.vy += 420 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (const f of floaters) {
      f.life -= dt;
      f.y -= 48 * dt;
    }

    for (let i = cats.length - 1; i >= 0; i--) if (cats[i].dead) cats.splice(i, 1);
    for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
    for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].life <= 0) floaters.splice(i, 1);

    shake *= Math.pow(0.002, dt);
    updateCamera(dt);
    updateJohnny(dt);
  }

  function endGame() {
    running = false;
    gameOver = true;
    finalScoreEl.textContent = `Score: ${score.toLocaleString()} · Reached Wave ${Math.max(1, currentWave + 1)}`;
    gameOverScreen.classList.add('visible');
  }

  function pseudoRandom(index, salt = 0) {
    const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, '#202b47');
    sky.addColorStop(0.62, '#596070');
    sky.addColorStop(1, '#958770');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    const moonX = 1040 - cameraX * 0.08;
    ctx.fillStyle = 'rgba(230,235,247,.12)';
    ctx.beginPath();
    ctx.arc(moonX, 110, 55, 0, Math.PI * 2);
    ctx.fill();

    const buildingWidth = 150;
    const startIndex = Math.floor((cameraX - 250) / buildingWidth);
    const endIndex = Math.ceil((cameraX + W + 250) / buildingWidth);

    for (let i = startIndex; i <= endIndex; i++) {
      const worldX = i * buildingWidth;
      const x = worldX - cameraX;
      const w = 125 + pseudoRandom(i, 1) * 95;
      const h = 205 + pseudoRandom(i, 2) * 165;
      const y = GROUND - h;

      ctx.fillStyle = '#313746';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,205,92,.14)';
      for (let wx = x + 18; wx < x + w - 10; wx += 32) {
        for (let wy = y + 25; wy < y + h - 20; wy += 42) {
          if (pseudoRandom(i + Math.floor(wx + wy), 4) > 0.38) ctx.fillRect(wx, wy, 11, 15);
        }
      }
    }

    ctx.fillStyle = '#48423b';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#665f53';
    ctx.fillRect(0, GROUND, W, 7);

    ctx.fillStyle = 'rgba(255,255,255,.07)';
    const stripeSpacing = 90;
    const stripeOffset = -((((cameraX % stripeSpacing) + stripeSpacing) % stripeSpacing));
    for (let x = stripeOffset; x < W + stripeSpacing; x += stripeSpacing) ctx.fillRect(x, GROUND + 63, 46, 4);

    const defenseScreenX = DEFENSE_X - cameraX;
    if (defenseScreenX > -40 && defenseScreenX < W + 40) {
      ctx.fillStyle = 'rgba(255,77,69,.17)';
      ctx.fillRect(defenseScreenX - 4, 150, 8, GROUND - 150);
      ctx.save();
      ctx.translate(defenseScreenX + 8, 165);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#ff7770';
      ctx.font = '900 15px system-ui, sans-serif';
      ctx.fillText('DEFENSE LINE', 0, 0);
      ctx.restore();
    }
  }

  function drawJohnny() {
    const x = 142;
    const y = GROUND - 31 + johnny.squat * 18;
    const lean = johnny.torsoLean;
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

      ctx.strokeStyle = skinShade;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = upperWidth + 5;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(elbowX, elbowY);
      ctx.stroke();

      ctx.strokeStyle = skin;
      ctx.lineWidth = upperWidth;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(elbowX, elbowY);
      ctx.stroke();

      ctx.strokeStyle = skinShade;
      ctx.lineWidth = foreWidth + 5;
      ctx.beginPath();
      ctx.moveTo(elbowX, elbowY);
      ctx.lineTo(handX, handY);
      ctx.stroke();

      ctx.strokeStyle = skin;
      ctx.lineWidth = foreWidth;
      ctx.beginPath();
      ctx.moveTo(elbowX, elbowY);
      ctx.lineTo(handX, handY);
      ctx.stroke();

      ctx.fillStyle = black;
      ctx.beginPath();
      ctx.ellipse(handX, handY, 15, 13, foreAngle, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b2d33';
      ctx.fillRect(handX - 9, handY - 4, 18, 6);
    }

    ctx.save();
    ctx.translate(x, y);

    if (steroidTimer > 0) {
      ctx.shadowColor = '#a8ff58';
      ctx.shadowBlur = 24 + Math.sin(elapsed * 12) * 8;
    }

    const squatDrop = johnny.squat * 13;

    ctx.fillStyle = jeansShade;
    ctx.beginPath();
    ctx.moveTo(-48, -75 + squatDrop);
    ctx.lineTo(-7, -72 + squatDrop);
    ctx.lineTo(-13, -8 + squatDrop);
    ctx.lineTo(-58, -8 + squatDrop);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(7, -72 + squatDrop);
    ctx.lineTo(48, -75 + squatDrop);
    ctx.lineTo(58, -8 + squatDrop);
    ctx.lineTo(13, -8 + squatDrop);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = jeans;
    ctx.beginPath();
    ctx.moveTo(-43, -72 + squatDrop);
    ctx.lineTo(-8, -70 + squatDrop);
    ctx.lineTo(-15, -10 + squatDrop);
    ctx.lineTo(-52, -10 + squatDrop);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -70 + squatDrop);
    ctx.lineTo(43, -72 + squatDrop);
    ctx.lineTo(52, -10 + squatDrop);
    ctx.lineTo(15, -10 + squatDrop);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = black;
    ctx.fillRect(-59, -14 + squatDrop, 48, 19);
    ctx.fillRect(11, -14 + squatDrop, 48, 19);
    ctx.fillStyle = '#292b30';
    ctx.fillRect(-61, 1 + squatDrop, 52, 9);
    ctx.fillRect(9, 1 + squatDrop, 52, 9);

    ctx.fillStyle = '#17191d';
    ctx.fillRect(-47, -79 + squatDrop, 94, 10);
    ctx.fillStyle = '#a4a5a6';
    ctx.fillRect(-9, -82 + squatDrop, 18, 16);
    ctx.fillStyle = '#202226';
    ctx.fillRect(-5, -78 + squatDrop, 10, 8);

    muscleArm(-42 + torsoShift * 0.45, -130, 48, 38, -2.34 - lean * 0.45, 0.62, 31, 26);

    ctx.save();
    ctx.translate(torsoShift, 0);
    ctx.rotate(lean);

    ctx.fillStyle = skinShade;
    ctx.beginPath();
    ctx.moveTo(-61, -143);
    ctx.bezierCurveTo(-75, -127, -64, -88, -34, -76);
    ctx.lineTo(-26, -66);
    ctx.lineTo(26, -66);
    ctx.lineTo(34, -76);
    ctx.bezierCurveTo(64, -88, 75, -127, 61, -143);
    ctx.bezierCurveTo(38, -164, -38, -164, -61, -143);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-57, -146);
    ctx.bezierCurveTo(-69, -128, -58, -94, -31, -82);
    ctx.lineTo(-23, -69);
    ctx.lineTo(23, -69);
    ctx.lineTo(31, -82);
    ctx.bezierCurveTo(58, -94, 69, -128, 57, -146);
    ctx.bezierCurveTo(34, -161, -34, -161, -57, -146);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = skinShade;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-46, -126);
    ctx.quadraticCurveTo(-24, -139, 0, -124);
    ctx.quadraticCurveTo(24, -139, 46, -126);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -126);
    ctx.lineTo(0, -78);
    ctx.stroke();
    for (const yy of [-108, -93, -79]) {
      ctx.beginPath();
      ctx.moveTo(-16, yy);
      ctx.quadraticCurveTo(0, yy + 5, 16, yy);
      ctx.stroke();
    }

    muscleArm(43, -132, 59, 50, johnny.armAngle, 0.42, 34, 28);

    ctx.fillStyle = skinShade;
    ctx.fillRect(-18, -174, 36, 28);
    ctx.fillStyle = skin;
    ctx.fillRect(-14, -174, 28, 27);

    ctx.fillStyle = skinShade;
    ctx.beginPath();
    ctx.moveTo(-27, -202);
    ctx.quadraticCurveTo(-31, -177, -19, -160);
    ctx.lineTo(0, -153);
    ctx.lineTo(19, -160);
    ctx.quadraticCurveTo(31, -177, 27, -202);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-24, -202);
    ctx.quadraticCurveTo(-27, -179, -17, -163);
    ctx.lineTo(0, -157);
    ctx.lineTo(17, -163);
    ctx.quadraticCurveTo(27, -179, 24, -202);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#3b241c';
    ctx.beginPath();
    ctx.moveTo(-25, -201);
    ctx.lineTo(-18, -218);
    ctx.lineTo(-8, -208);
    ctx.lineTo(0, -222);
    ctx.lineTo(8, -208);
    ctx.lineTo(20, -219);
    ctx.lineTo(26, -199);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = red;
    ctx.fillRect(-29, -201, 58, 9);
    ctx.beginPath();
    ctx.moveTo(-27, -195);
    ctx.lineTo(-58, -188);
    ctx.lineTo(-39, -181);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-25, -193);
    ctx.lineTo(-51, -170);
    ctx.lineTo(-32, -178);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0d0f12';
    ctx.fillRect(-23, -189, 20, 11);
    ctx.fillRect(3, -189, 20, 11);
    ctx.fillRect(-4, -186, 8, 3);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(-20, -187, 7, 2);
    ctx.fillRect(6, -187, 7, 2);

    ctx.strokeStyle = '#7e4938';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-8, -168);
    ctx.quadraticCurveTo(1, -163, 10, -169);
    ctx.stroke();

    ctx.strokeStyle = '#555c63';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -151);
    ctx.lineTo(-2, -126);
    ctx.lineTo(9, -151);
    ctx.stroke();
    ctx.fillStyle = '#aeb4b8';
    ctx.fillRect(-6, -128, 12, 16);
    ctx.fillStyle = '#666c70';
    ctx.fillRect(-3, -125, 6, 3);

    ctx.restore();
    ctx.restore();
  }

  function drawTank(t = tank) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);
    ctx.fillStyle = '#1c231d';
    ctx.fillRect(-49, 12, 98, 22);
    ctx.fillStyle = '#59664b';
    ctx.fillRect(-41, -11, 82, 30);
    ctx.beginPath();
    ctx.arc(4, -11, 22, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(12, -18, 71, 8);
    ctx.fillStyle = '#111';
    for (let x = -38; x <= 38; x += 19) {
      ctx.beginPath();
      ctx.arc(x, 24, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#c8d39e';
    ctx.font = '900 10px system-ui, sans-serif';
    ctx.fillText('THROW ME', -31, 7);
    ctx.restore();
  }

  function drawCat(cat) {
    ctx.save();
    ctx.translate(cat.x, cat.y + Math.sin(cat.bob) * 2);
    ctx.scale(cat.scale, cat.scale);
    const wounded = cat.hp < cat.maxHp;

    ctx.fillStyle = cat.chonker ? '#3e3344' : '#554358';
    ctx.beginPath(); ctx.ellipse(0, 0, 31, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-22, -18, 20, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-38, -31); ctx.lineTo(-34, -50); ctx.lineTo(-22, -35); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-12, -35); ctx.lineTo(-4, -49); ctx.lineTo(0, -29); ctx.fill();

    ctx.strokeStyle = '#6fdf78';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(24, -5);
    ctx.quadraticCurveTo(48, -28, 55, -10);
    ctx.quadraticCurveTo(67, 10, 49, 17);
    ctx.stroke();

    ctx.strokeStyle = '#9c5de5';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(13, 11);
    ctx.quadraticCurveTo(28, 36, 47, 31);
    ctx.stroke();

    ctx.fillStyle = wounded ? '#ffe34e' : '#77ff62';
    ctx.beginPath();
    ctx.arc(-29, -20, 4, 0, Math.PI * 2);
    ctx.arc(-17, -20, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4dfed';
    ctx.fillRect(-25, -10, 6, 4);
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

    ctx.save();
    ctx.setLineDash([11, 9]);
    ctx.strokeStyle = steroidTimer > 0 ? '#a8ff58' : '#ffcf33';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(tank.x, tank.y);
    ctx.lineTo(aim.x, aim.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 1; i <= 18; i++) {
      const t = i * 0.09;
      const x = held.x + vx * t;
      const y = held.y + vy * t + 0.5 * GRAVITY * t * t;
      if (y > GROUND) break;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(2, 5 - i * 0.18), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0.4) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    drawBackground();
    ctx.save();
    ctx.translate(-cameraX, 0);
    drawJohnny();
    drawAim();

    if (aim && !tank.flying && running) {
      const held = getHeldTankPosition();
      drawTank({ ...tank, x: held.x, y: held.y, angle: -0.08 });
    } else {
      drawTank();
    }

    for (const cat of cats) drawCat(cat);
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.dust ? '#c8b28a' : '#ffd85a';
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    for (const f of floaters) {
      ctx.globalAlpha = Math.max(0, f.life / 0.9);
      ctx.fillStyle = '#fff4a5';
      ctx.font = '900 24px Impact, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.restore();

    if (steroidTimer > 0 && running) {
      ctx.fillStyle = 'rgba(168,255,88,.10)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#caff8f';
      ctx.font = '900 18px system-ui, sans-serif';
      ctx.fillText(`STEROIDS: ${steroidTimer.toFixed(1)}s`, 24, H - 24);
    }
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

  canvas.addEventListener('pointerdown', e => {
    if (!running || tank.flying || gameOver || missionComplete) return;
    const p = pointerToWorld(e);
    if (Math.hypot(p.x - tank.x, p.y - tank.y) < 105) {
      aim = p;
      canvas.setPointerCapture?.(e.pointerId);
    }
  });

  canvas.addEventListener('pointermove', e => {
    if (!aim || tank.flying) return;
    const p = pointerToWorld(e);
    const dx = p.x - tank.x;
    const dy = p.y - tank.y;
    const len = Math.hypot(dx, dy);

    if (len > MAX_PULL) {
      aim = { x: tank.x + (dx / len) * MAX_PULL, y: tank.y + (dy / len) * MAX_PULL };
    } else {
      aim = p;
    }
  });

  canvas.addEventListener('pointerup', () => throwTank());
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

  muteButton.addEventListener('click', () => {
    muted = !muted;
    muteButton.textContent = muted ? '🔇' : '🔊';
  });

  document.getElementById('start').addEventListener('click', () => {
    titleScreen.classList.remove('visible');
    resetGame();
    beep('power');
  });

  document.getElementById('restart').addEventListener('click', () => {
    gameOverScreen.classList.remove('visible');
    resetGame();
  });

  document.getElementById('replay').addEventListener('click', () => {
    missionCompleteScreen.classList.remove('visible');
    resetGame();
  });

  window.addEventListener('keydown', e => {
    if (e.code === 'Space' && titleScreen.classList.contains('visible')) document.getElementById('start').click();
    if (e.code === 'KeyS') steroidButton.click();
  });

  updateHud();
  render();
  requestAnimationFrame(frame);
})();