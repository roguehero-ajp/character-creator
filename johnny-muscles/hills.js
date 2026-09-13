(() => {
  'use strict';

  const S = window.JMShared;
  const E = window.JMEnemyArt;
  const T = window.JMTankArt;
  const F = window.JMWorld3Fighter;
  if (!S || !E || !T || !F) throw new Error('World 3 requires shared, enemy, tank, and fighter modules');

  const { W, H, GROUND, GRAVITY, TANK_HOME, MAX_PULL, clamp, pseudoRandom, pointerToWorld, updateCamera, updateJohnny } = S;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const levelNumber = Number(document.getElementById('game-shell')?.dataset?.level || 1);

  const LEVELS = {
    1: {
      title: 'ROLLING THUNDER',
      toast: 'FOOTHILLS 1: ROLLING THUNDER',
      subtitle: 'THE GROUND HAS DISCOVERED CURVES',
      amp: 48,
      houses: 4,
      waves: [
        { ground: 4, bat: 1, leaper: 1 },
        { ground: 5, bat: 2, leaper: 2 },
        { ground: 5, bat: 2, leaper: 3 }
      ]
    },
    2: {
      title: 'DOWNHILL DISASTER',
      toast: 'FOOTHILLS 2: DOWNHILL DISASTER',
      subtitle: 'THE CATS HAVE INVENTED ROLLING',
      amp: 62,
      houses: 3,
      waves: [
        { ground: 3, bat: 1, leaper: 1, roller: 1 },
        { ground: 4, bat: 1, leaper: 2, roller: 2 },
        { ground: 4, bat: 2, leaper: 2, roller: 3 }
      ]
    },
    3: {
      title: 'SIGN OF THE TIMES',
      toast: 'FOOTHILLS 3: SIGN OF THE TIMES',
      subtitle: 'FRONTAL IMPACT IS NOW A SUGGESTION',
      amp: 72,
      houses: 2,
      waves: [
        { ground: 2, bat: 1, roller: 1, shield: 1 },
        { ground: 3, leaper: 2, roller: 1, shield: 2 },
        { ground: 3, bat: 2, leaper: 2, roller: 2, shield: 3 }
      ]
    },
    4: {
      title: 'BURIED TROUBLE',
      toast: 'FOOTHILLS 4: BURIED TROUBLE',
      subtitle: 'THE HILLS ARE MOVING. THAT IS BAD.',
      amp: 84,
      houses: 1,
      waves: [
        { ground: 2, bat: 1, shield: 1, burrow: 1 },
        { ground: 2, leaper: 2, roller: 1, burrow: 2, brain: 1 },
        { ground: 2, bat: 2, shield: 2, burrow: 2, brain: 2 }
      ]
    },
    5: {
      title: "MUNROE'S MARCH",
      toast: "FOOTHILLS 5: MUNROE'S MARCH",
      subtitle: 'BREAK THROUGH THE MOUNTAIN-LION LINE',
      amp: 98,
      houses: 0,
      waves: [
        { ground: 2, roller: 1, shield: 1, burrow: 1, cliff: 1 },
        { bat: 2, leaper: 2, roller: 2, shield: 1, brain: 1, cliff: 1 },
        { ground: 2, bat: 1, leaper: 2, roller: 2, shield: 2, burrow: 2, brain: 1, chonker: 1, cliff: 2 }
      ]
    }
  };

  const LEVEL = LEVELS[levelNumber] || LEVELS[1];
  const DEFENSE_X = 92;
  const HERO_HIT_X = 166;
  const HERO_HIT_Y = GROUND - 75;

  const scoreEl = document.getElementById('score');
  const healthEl = document.getElementById('health');
  const waveEl = document.getElementById('wave');
  const remainingEl = document.getElementById('remaining');
  const comboEl = document.getElementById('combo');
  const airHitsEl = document.getElementById('air-hits');
  const specialsEl = document.getElementById('special-hits');
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
  const resultSpecialEl = document.getElementById('result-special');
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
  let specialHits = 0;
  let damageTaken = 0;
  let breaches = 0;

  const actors = [];
  const shockwaves = [];
  const debris = [];
  const particles = [];
  const floaters = [];
  const hero = { armAngle: -.75, releaseTimer: 0, torsoLean: 0, squat: 0, catchPose: 0 };
  const tank = { x: TANK_HOME.x, y: TANK_HOME.y, vx: 0, vy: 0, angle: 0, angular: 0, flying: false, resetTimer: 0, bounced: false, hitIds: new Set() };

  function terrainY(x) {
    if (x < 330) return GROUND;
    const z = x - 330;
    const ramp = Math.min(1, z / 260);
    const primary = Math.sin(z / (185 - levelNumber * 7) + levelNumber * .55);
    const secondary = Math.sin(z / 92 + levelNumber * 1.3) * .34;
    const climb = levelNumber >= 4 ? Math.min(58, z * .022 * (levelNumber - 3)) : 0;
    return clamp(GROUND - ramp * LEVEL.amp * (primary * .58 + secondary) - climb, 445, 640);
  }

  function terrainSlope(x) {
    return (terrainY(x + 8) - terrainY(x - 8)) / 16;
  }

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
        throw: [90, 52, .12, 'sawtooth'], impact: [72, 38, .09, 'square'], cat: [430, 240, .08, 'triangle'],
        bat: [520, 860, .09, 'triangle'], leap: [260, 620, .11, 'triangle'], shock: [90, 34, .34, 'sawtooth'],
        hurt: [120, 70, .22, 'square'], wave: [260, 410, .18, 'square'], win: [330, 660, .42, 'triangle'],
        power: [160, 420, .25, 'sawtooth'], ping: [540, 260, .12, 'square'], roll: [180, 95, .15, 'square'],
        brain: [650, 280, .24, 'triangle'], burrow: [110, 55, .18, 'sawtooth'], cliff: [310, 140, .16, 'square']
      };
      const s = sounds[type] || sounds.impact;
      o.type = s[3];
      o.frequency.setValueAtTime(s[0], n);
      o.frequency.exponentialRampToValueAtTime(s[1], n + s[2]);
      g.gain.setValueAtTime(.055, n);
      g.gain.exponentialRampToValueAtTime(.001, n + s[2]);
      o.connect(g).connect(audioCtx.destination);
      o.start(n); o.stop(n + s[2]);
    } catch (_) {}
  }

  function totalForWave(w) {
    return Object.entries(w).reduce((sum, [key, value]) => key === 'gap' ? sum : sum + (Number(value) || 0), 0);
  }

  function updateHud() {
    scoreEl.textContent = String(score).padStart(6, '0');
    healthEl.textContent = Array.from({ length: 5 }, (_, i) => i < health ? '♥' : '♡').join(' ');
    comboEl.textContent = `x${combo}`;
    airHitsEl.textContent = String(airHits);
    specialsEl.textContent = String(specialHits);
    if (currentWave < 0) {
      waveEl.textContent = '1/3';
      remainingEl.textContent = 'INCOMING';
    } else {
      waveEl.textContent = `${currentWave + 1}/3`;
      remainingEl.textContent = missionComplete ? 'SECURED' : String(Math.max(0, totalForWave(LEVEL.waves[currentWave]) - resolved));
    }
  }

  function resetTank() {
    Object.assign(tank, { x: TANK_HOME.x, y: TANK_HOME.y, vx: 0, vy: 0, angle: 0, angular: 0, flying: false, resetTimer: 0, bounced: false });
    tank.hitIds.clear();
    aim = null;
    hero.releaseTimer = 0;
  }

  function resetGame() {
    running = true; gameOver = false; missionComplete = false; score = 0; health = 5; combo = 1; bestCombo = 1; comboTimer = 0;
    elapsed = 0; steroidsLeft = 3; steroidTimer = 0; aim = null; shake = 0; cameraX = 0; currentWave = -1;
    queue = []; spawned = 0; resolved = 0; spawnTimer = 0; intermission = 1.1; clearAnnounced = false; finishTimer = 0;
    flattened = 0; airHits = 0; specialHits = 0; damageTaken = 0; breaches = 0;
    actors.length = 0; shockwaves.length = 0; debris.length = 0; particles.length = 0; floaters.length = 0;
    Object.assign(hero, { armAngle: -.75, releaseTimer: 0, torsoLean: 0, squat: 0, catchPose: 0 });
    resetTank();
    steroidButton.disabled = false;
    steroidCountEl.textContent = '3 demo doses';
    updateHud();
    showToast(LEVEL.toast, 1300);
    if (levelNumber === 1) setTimeout(() => showToast('NEW PROBLEM: THE GROUND IS NOT FLAT.', 1500), 1350);
    if (levelNumber === 2) setTimeout(() => showToast('ROLLER CATS GAIN SPEED DOWNHILL!', 1700), 1350);
    if (levelNumber === 3) setTimeout(() => showToast('SHIELDS BLOCK FRONTAL SHOTS. ARC OVER THEM!', 1900), 1350);
    if (levelNumber === 4) setTimeout(() => showToast('WATCH THE DIRT TRAILS. BURROWERS SURFACE BRIEFLY!', 2100), 1350);
    if (levelNumber === 5) setTimeout(() => showToast('MUNROE HAS FORTIFIED THE PASS. BREAK THE LINE!', 2100), 1350);
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
    queue = [];
    for (const [kind, count] of Object.entries(w)) {
      if (kind === 'gap') continue;
      for (let i = 0; i < count; i++) queue.push(kind);
    }
    shuffle(queue);
    spawned = 0; resolved = 0; spawnTimer = .2; clearAnnounced = false;
    showToast(`WAVE ${currentWave + 1} · ${LEVEL.subtitle}`, 1050);
    beep('wave');
    updateHud();
  }

  function spawnActor(kind) {
    const x = 1160 + Math.random() * 360;
    const scale = kind === 'bat' ? .82 + Math.random() * .16 : kind === 'chonker' ? 1.42 : .93 + Math.random() * .16;
    const gy = terrainY(x) - 28 * scale;
    const isLeaper = kind === 'leaper' || kind === 'chonker';
    const isCliff = kind === 'cliff';
    const baseY = kind === 'bat' ? terrainY(x) - 185 - Math.random() * 80 : isCliff ? terrainY(x) - 150 - Math.random() * 55 : gy;
    actors.push({
      id: `${kind}-${performance.now()}-${Math.random()}`,
      kind, x, y: baseY, groundY: gy, baseY, scale,
      speed: kind === 'roller' ? 68 : kind === 'burrow' ? 50 : kind === 'brain' ? 34 : isLeaper ? (kind === 'chonker' ? 23 : 31) : kind === 'shield' ? 38 : kind === 'ground' ? 54 : kind === 'bat' ? 76 : 0,
      phase: Math.random() * Math.PI * 2,
      bob: Math.random() * Math.PI * 2,
      amp: kind === 'bat' ? 45 + Math.random() * 35 : 0,
      dead: false, resolved: false, airborne: false, vy: 0,
      jumpTimer: isLeaper ? .9 + Math.random() * 1.25 : 99,
      jumpCooldown: kind === 'chonker' ? 2.05 : 1.55 + Math.random() * .6,
      interrupted: false,
      buried: kind === 'burrow',
      modeTimer: kind === 'burrow' ? .85 + Math.random() * .8 : 0,
      pulseTimer: kind === 'brain' ? 1.4 + Math.random() * 1.2 : 0,
      attackTimer: kind === 'cliff' ? 1.2 + Math.random() * 1.3 : 0,
      roll: 0
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
    const special = !['ground', 'bat', 'leaper'].includes(a.kind);
    const base = a.kind === 'chonker' ? 560 : a.kind === 'cliff' ? 480 : a.kind === 'brain' ? 430 : a.kind === 'shield' ? 390 : a.kind === 'burrow' ? 360 : a.kind === 'roller' ? 300 : a.kind === 'leaper' ? 280 : a.kind === 'bat' ? 230 : 130;
    const bonus = airborneHit ? 220 : 0;
    const pts = (base + bonus + Math.floor(Math.min(impact / 8, 120))) * combo;
    score += pts;
    combo = Math.min(12, combo + 1);
    bestCombo = Math.max(bestCombo, combo);
    comboTimer = 2.1;
    if (airborneHit) airHits++;
    if (special) specialHits++;
    floaters.push({ x: a.x, y: a.y - 45, text: airborneHit ? `AIR HIT +${pts}` : `+${pts}`, life: .9 });
    addImpact(a.x, a.y, special || impact > 650, airborneHit ? '#a8ff58' : '#ffd85a');
    beep(a.kind === 'bat' ? 'bat' : airborneHit ? 'leap' : 'cat');
    updateHud();
  }

  function hurtHero(label) {
    if (gameOver || missionComplete) return;
    health--;
    damageTaken++;
    combo = 1; comboTimer = 0;
    shake = 18;
    addImpact(HERO_HIT_X, HERO_HIT_Y, true, '#f6be67');
    showToast(label, 900);
    beep('hurt');
    updateHud();
    if (health <= 0) endGame();
  }

  function createShockwave(a) {
    shockwaves.push({ x: a.x, radius: 18, prevRadius: 18, speed: 590, maxRadius: 310, life: 1.15, hitHero: false });
    addImpact(a.x, terrainY(a.x) - 8, true, '#f6be67');
    showToast('SHOCK CHONKER LANDING!', 650);
    beep('shock');
  }

  function launchLeaper(a) {
    a.airborne = true;
    a.vy = a.kind === 'chonker' ? -475 : -545;
    a.jumpTimer = a.jumpCooldown;
    a.interrupted = false;
    beep('leap');
  }

  function throwCliffDebris(a) {
    const flight = 1.15;
    const targetX = HERO_HIT_X + 15;
    const targetY = HERO_HIT_Y;
    debris.push({
      x: a.x - 20, y: a.y - 40,
      vx: (targetX - a.x) / flight,
      vy: (targetY - (a.y - 40) - .5 * GRAVITY * flight * flight) / flight,
      angle: 0, angular: 4 + Math.random() * 4, hit: false, life: 2.2
    });
    showToast('CLIFF CAT: INCOMING DEBRIS!', 650);
    beep('cliff');
  }

  function brainPulse(a) {
    if (!tank.flying) return;
    const distance = Math.abs(tank.x - a.x);
    if (distance > 720) return;
    tank.vy += Math.sin(a.phase * 2.7) * 125;
    tank.vx *= .92;
    addImpact(a.x, a.y - 40, false, '#d667ff');
    showToast('BRAINCATS BENT THE THROW!', 700);
    beep('brain');
  }

  function updateActor(a, dt) {
    if (a.dead) return;
    a.bob += dt * 7;
    a.phase += dt * 2.1;

    if (a.kind === 'bat') {
      a.x -= a.speed * dt;
      a.baseY = terrainY(a.x) - 190;
      a.y = clamp(a.baseY + Math.sin(a.phase * 2.1) * a.amp, 145, terrainY(a.x) - 95);
    } else if (a.kind === 'cliff') {
      a.groundY = terrainY(a.x) - 150;
      a.y = a.groundY;
      a.attackTimer -= dt;
      if (a.attackTimer <= 0) {
        throwCliffDebris(a);
        a.attackTimer = 2.4 + Math.random() * 1.1;
      }
    } else if (a.kind === 'burrow') {
      a.x -= a.speed * dt;
      a.groundY = terrainY(a.x) - 26;
      a.y = a.groundY;
      a.modeTimer -= dt;
      if (a.modeTimer <= 0) {
        a.buried = !a.buried;
        a.modeTimer = a.buried ? .75 + Math.random() * .8 : 1.15 + Math.random() * .6;
        beep('burrow');
      }
      a.speed = a.buried ? 64 : 30;
    } else if (a.kind === 'roller') {
      const nowY = terrainY(a.x);
      const nextY = terrainY(a.x - 18);
      const downhill = Math.max(0, nextY - nowY);
      a.speed = clamp(a.speed + (12 + downhill * 2.8) * dt, 68, 190);
      a.x -= a.speed * dt;
      a.groundY = terrainY(a.x) - 28 * a.scale;
      a.y = a.groundY;
      a.roll -= a.speed * dt / 30;
    } else if (a.kind === 'leaper' || a.kind === 'chonker') {
      a.x -= a.speed * dt;
      a.groundY = terrainY(a.x) - 28 * a.scale;
      if (a.airborne) {
        a.vy += GRAVITY * dt;
        a.y += a.vy * dt;
        a.x -= 34 * dt;
        a.groundY = terrainY(a.x) - 28 * a.scale;
        if (a.y >= a.groundY && a.vy > 0) {
          a.y = a.groundY;
          a.airborne = false;
          a.vy = 0;
          if (a.kind === 'chonker' && !a.interrupted) createShockwave(a);
        }
      } else {
        a.y = a.groundY;
        a.jumpTimer -= dt;
        if (a.jumpTimer <= 0 && a.x > 430) launchLeaper(a);
      }
    } else {
      a.x -= a.speed * dt;
      a.groundY = terrainY(a.x) - 28 * a.scale;
      a.y = a.groundY;
      if (a.kind === 'brain') {
        a.pulseTimer -= dt;
        if (a.pulseTimer <= 0) {
          brainPulse(a);
          a.pulseTimer = 1.6 + Math.random() * 1.0;
        }
      }
    }

    if (a.kind !== 'cliff' && a.x < DEFENSE_X) {
      breaches++;
      resolveActor(a, false);
      hurtHero(a.kind === 'roller' ? 'ROLLER CAT CRASHED THE LINE!' : a.kind === 'burrow' ? 'BURROWER POPPED UP IN THE WRONG YARD!' : 'FOOTHILL BREACH!');
    }
  }

  function updateShockwaves(dt) {
    for (const s of shockwaves) {
      s.prevRadius = s.radius;
      s.radius += s.speed * dt;
      s.life -= dt;
      const distance = Math.abs(s.x - HERO_HIT_X);
      if (!s.hitHero && distance <= s.maxRadius && s.prevRadius < distance && s.radius >= distance) {
        s.hitHero = true;
        hurtHero(`${F.shortName} ATE THE SHOCKWAVE!`);
      }
    }
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      if (shockwaves[i].life <= 0 || shockwaves[i].radius >= shockwaves[i].maxRadius) shockwaves.splice(i, 1);
    }
  }

  function updateDebris(dt) {
    for (const d of debris) {
      d.life -= dt;
      d.vy += GRAVITY * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.angle += d.angular * dt;
      if (!d.hit && d.x <= HERO_HIT_X + 25 && d.x >= HERO_HIT_X - 55 && Math.abs(d.y - HERO_HIT_Y) < 85) {
        d.hit = true;
        d.life = 0;
        hurtHero('CLIFF DEBRIS BONKED THE HERO!');
      }
      if (d.y >= terrainY(d.x) - 8) {
        d.life = Math.min(d.life, .08);
        addImpact(d.x, d.y, false, '#b8aa8e');
      }
    }
    for (let i = debris.length - 1; i >= 0; i--) if (debris[i].life <= 0) debris.splice(i, 1);
  }

  function updateMission(dt) {
    if (gameOver || missionComplete) return;
    if (currentWave < 0) {
      intermission -= dt;
      if (intermission <= 0) startWave();
      return;
    }
    const total = totalForWave(LEVEL.waves[currentWave]);
    if (spawned < total) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnActor(queue[spawned]);
        spawnTimer = .66 + Math.random() * .22;
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
    debris.length = 0;
    showToast(`${LEVEL.title} SECURED`, 1300);
    beep('win');
    const stars = 1 + (breaches === 0 ? 1 : 0) + (damageTaken === 0 ? 1 : 0);
    resultStarsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    resultScoreEl.textContent = score.toLocaleString();
    resultCatsEl.textContent = String(flattened);
    resultAirEl.textContent = String(airHits);
    resultSpecialEl.textContent = String(specialHits);
    resultComboEl.textContent = `x${bestCombo}`;
    resultDefenseEl.textContent = damageTaken === 0 ? 'UNTOUCHED' : `${health}/5 HEARTS`;
    setTimeout(() => missionCompleteScreen.classList.add('visible'), 850);
  }

  function endGame() {
    if (gameOver) return;
    running = false;
    gameOver = true;
    aim = null;
    finalScoreEl.textContent = `Score: ${score.toLocaleString()} · Special threats flattened: ${specialHits}`;
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
    Object.assign(tank, {
      x: h.x, y: h.y,
      vx: dx * sc * F.throwScale * boost,
      vy: dy * sc * F.throwScale * boost,
      angular: Math.min(9, 2 + p / 55), flying: true, bounced: false, resetTimer: 0
    });
    tank.hitIds.clear();
    aim = null;
    hero.releaseTimer = .28;
    beep('throw');
    if (navigator.vibrate) navigator.vibrate(20);
  }

  function shieldDeflect(a) {
    tank.vx *= -.28;
    tank.vy = -Math.abs(tank.vy) * .34 - 95;
    tank.angular *= -1;
    addImpact(a.x - 40, a.y - 28, true, '#d7dadd');
    floaters.push({ x: a.x, y: a.y - 78, text: 'CLANG!', life: .8 });
    showToast('SHIELD CAT! ARC THE SHOT OVER IT!', 900);
    beep('ping');
  }

  function chonkerDeflect(a) {
    tank.vx *= -.18;
    tank.vy = -Math.abs(tank.vy) * .35 - 90;
    tank.angular *= -.7;
    addImpact(a.x, a.y, false, '#d9d0c2');
    showToast('SHOCK CHONKER: HIT IT IN THE AIR!', 850);
    beep('ping');
  }

  function updateTank(dt) {
    if (!tank.flying) return;
    tank.vy += GRAVITY * F.gravityMultiplier * dt;
    tank.x += tank.vx * dt;
    tank.y += tank.vy * dt;
    tank.angle += tank.angular * dt;
    const impact = Math.hypot(tank.vx, tank.vy);

    for (const a of actors) {
      if (a.dead || tank.hitIds.has(a.id) || (a.kind === 'burrow' && a.buried)) continue;
      const centerY = a.kind === 'cliff' ? a.y - 12 : a.y;
      const radius = (a.kind === 'bat' ? 48 * a.scale : a.kind === 'chonker' ? 72 : a.kind === 'roller' ? 54 : 40 + 22 * a.scale) + F.collisionBonus;
      if (Math.hypot(tank.x - a.x, tank.y - centerY) >= radius) continue;
      tank.hitIds.add(a.id);

      if (a.kind === 'shield') {
        const descendingFromAbove = tank.vy > 0 && tank.y < a.y - 42;
        if (!descendingFromAbove) {
          shieldDeflect(a);
          continue;
        }
      }

      if (a.kind === 'chonker' && !a.airborne) {
        chonkerDeflect(a);
        continue;
      }

      const airborneHit = (a.kind === 'leaper' || a.kind === 'chonker') && a.airborne;
      if (airborneHit) a.interrupted = true;
      tank.vx *= F.impactX;
      tank.vy *= F.impactY;
      killActor(a, impact, airborneHit);
    }

    const ground = terrainY(tank.x) - 22;
    if (tank.y >= ground) {
      tank.y = ground;
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

    if (tank.x < -320 || tank.x > 2300 || (tank.y >= terrainY(tank.x) - 23 && Math.abs(tank.vx) < 14)) {
      tank.resetTimer += dt;
      if (tank.resetTimer > .62) resetTank();
    } else tank.resetTimer = 0;
  }

  function drawAim() {
    if (!aim || tank.flying) return;
    const dx = tank.x - aim.x;
    const dy = tank.y - aim.y;
    const raw = Math.hypot(dx, dy);
    const pull = Math.min(raw, MAX_PULL);
    const len = raw || 1;
    const boost = steroidTimer > 0 ? 1.42 : 1;
    const vx = (dx / len) * pull * F.throwScale * boost;
    const vy = (dy / len) * pull * F.throwScale * boost;
    const held = heldTankPosition();
    ctx.save();
    ctx.setLineDash([11, 9]); ctx.strokeStyle = steroidTimer > 0 ? '#a8ff58' : '#ffcf33'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(tank.x, tank.y); ctx.lineTo(aim.x, aim.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 1; i <= 18; i++) {
      const tt = i * .09;
      const x = held.x + vx * tt;
      const y = held.y + vy * tt + .5 * GRAVITY * F.gravityMultiplier * tt * tt;
      if (y > terrainY(x)) break;
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

  function drawSky() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, levelNumber >= 4 ? '#4c6379' : '#7095af');
    sky.addColorStop(.58, levelNumber >= 5 ? '#a5a6a1' : '#b8c4b6');
    sky.addColorStop(1, '#d6b784');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(-cameraX * .08, 0);
    ctx.fillStyle = levelNumber >= 4 ? '#59646a' : '#6f8178';
    ctx.beginPath();
    ctx.moveTo(-500, GROUND - 155);
    for (let x = -500; x < 3100; x += 130) {
      const rise = levelNumber * 18 + pseudoRandom(x, levelNumber) * (80 + levelNumber * 18);
      ctx.lineTo(x, GROUND - 125 - rise);
    }
    ctx.lineTo(3100, GROUND); ctx.lineTo(-500, GROUND); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawScenery() {
    ctx.save();
    for (let i = 0; i < LEVEL.houses; i++) {
      const x = 460 + i * 430;
      const y = terrainY(x) - 150;
      ctx.fillStyle = i % 2 ? '#a69b87' : '#b79f82';
      ctx.fillRect(x, y, 190, 125);
      ctx.fillStyle = '#524a43';
      ctx.beginPath(); ctx.moveTo(x - 15, y); ctx.lineTo(x + 95, y - 65); ctx.lineTo(x + 205, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6c5140'; ctx.fillRect(x + 78, y + 64, 34, 61);
    }

    for (let x = 420; x < 2450; x += 210) {
      if (pseudoRandom(x, levelNumber) < .28) continue;
      const y = terrainY(x);
      ctx.fillStyle = '#594a36'; ctx.fillRect(x - 5, y - 92, 10, 92);
      ctx.fillStyle = levelNumber >= 5 ? '#435443' : '#4e6b4b';
      ctx.beginPath(); ctx.arc(x, y - 105, 42 + pseudoRandom(x, 4) * 18, 0, Math.PI * 2); ctx.fill();
    }

    if (levelNumber >= 3) {
      for (let x = 720; x < 2250; x += 620) {
        const y = terrainY(x);
        ctx.fillStyle = '#7d6f58'; ctx.fillRect(x - 4, y - 92, 8, 92);
        ctx.fillStyle = levelNumber === 5 ? '#9f7044' : '#c49a4e';
        ctx.fillRect(x - 48, y - 105, 96, 42);
        ctx.fillStyle = '#2b2927'; ctx.font = '900 11px system-ui,sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(levelNumber === 5 ? 'MUNROE' : 'STEEP', x, y - 79); ctx.textAlign = 'left';
      }
    }

    if (levelNumber === 5) {
      for (const x of [980, 1580, 2110]) {
        const y = terrainY(x);
        ctx.fillStyle = '#564d44';
        ctx.fillRect(x - 70, y - 55, 140, 18);
        ctx.fillStyle = '#4d5941';
        ctx.fillRect(x - 52, y - 85, 104, 30);
      }
    }
    ctx.restore();
  }

  function drawTerrain() {
    ctx.fillStyle = levelNumber >= 5 ? '#61705a' : '#71875f';
    ctx.beginPath();
    ctx.moveTo(-650, H + 200);
    ctx.lineTo(-650, terrainY(-650));
    for (let x = -650; x <= 2700; x += 18) ctx.lineTo(x, terrainY(x));
    ctx.lineTo(2700, H + 200);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#77736b';
    ctx.lineWidth = 46;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-650, terrainY(-650) + 8);
    for (let x = -650; x <= 2700; x += 20) ctx.lineTo(x, terrainY(x) + 8);
    ctx.stroke();
    ctx.strokeStyle = '#aa9d75'; ctx.lineWidth = 4; ctx.setLineDash([34, 32]);
    ctx.beginPath();
    for (let x = -650; x <= 2700; x += 20) {
      if (x === -650) ctx.moveTo(x, terrainY(x) + 7); else ctx.lineTo(x, terrainY(x) + 7);
    }
    ctx.stroke(); ctx.setLineDash([]);
  }

  function drawShield(a) {
    ctx.save();
    ctx.translate(-48, -24);
    ctx.rotate(-.08);
    ctx.fillStyle = '#777f82';
    ctx.strokeStyle = '#282d31'; ctx.lineWidth = 5;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = Math.PI / 8 + i * Math.PI / 4;
      const px = Math.cos(ang) * 31, py = Math.sin(ang) * 31;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8d6b5'; ctx.font = '900 9px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('NOPE', 0, 4);
    ctx.restore();
  }

  function drawActor(a) {
    ctx.save();
    ctx.translate(a.x, a.y + Math.sin(a.bob) * (a.kind === 'cliff' ? 1 : 2));

    if (a.kind === 'burrow' && a.buried) {
      ctx.fillStyle = '#6a543d';
      ctx.beginPath(); ctx.ellipse(0, 12, 38, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a7253';
      for (let i = 0; i < 6; i++) {
        const xx = -26 + i * 11;
        ctx.fillRect(xx, 1 - (i % 2) * 7, 7, 6);
      }
      ctx.restore();
      return;
    }

    if (a.kind === 'roller') ctx.rotate(a.roll);
    if ((a.kind === 'leaper' || a.kind === 'chonker') && a.airborne) ctx.rotate(clamp(a.vy / 900, -.24, .24));
    ctx.scale(a.scale, a.scale);

    if (a.kind === 'bat') E.drawBat(ctx, { phase: a.phase });
    else if (a.kind === 'brain') E.drawBrain(ctx, { phase: a.phase, charge: Math.max(0, 1 - a.pulseTimer / 1.8) });
    else E.drawGround(ctx, { phase: a.bob, chonker: a.kind === 'chonker' || a.kind === 'roller' });

    if (a.kind === 'shield') drawShield(a);
    if (a.kind === 'roller') {
      ctx.strokeStyle = '#ffcf66'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 54, 0, Math.PI * 2); ctx.stroke();
    }
    if (a.kind === 'cliff') {
      ctx.fillStyle = '#ffd46b'; ctx.font = '900 12px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('▼', 0, -68); ctx.textAlign = 'left';
    }
    ctx.restore();

    if (a.kind === 'cliff') {
      ctx.fillStyle = '#68645e';
      ctx.fillRect(a.x - 75, a.y + 28, 150, 22);
      ctx.fillStyle = '#55514c';
      ctx.beginPath(); ctx.moveTo(a.x - 75, a.y + 50); ctx.lineTo(a.x + 75, a.y + 50); ctx.lineTo(a.x + 45, terrainY(a.x)); ctx.lineTo(a.x - 35, terrainY(a.x)); ctx.closePath(); ctx.fill();
    }
  }

  function drawShockwaves() {
    for (const s of shockwaves) {
      const alpha = clamp(s.life / 1.15, 0, 1);
      ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = '#f6be67'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(s.x, terrainY(s.x) - 4, s.radius, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  function drawDebris() {
    for (const d of debris) {
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.angle);
      ctx.fillStyle = '#6f685d'; ctx.strokeStyle = '#2e2d2b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-15,-10); ctx.lineTo(13,-14); ctx.lineTo(19,8); ctx.lineTo(-8,16); ctx.lineTo(-20,4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > .4) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    drawSky();
    ctx.save();
    ctx.translate(-cameraX, 0);
    drawTerrain();
    drawScenery();
    drawHeroScaled();
    for (const a of actors) drawActor(a);
    drawShockwaves();
    drawDebris();

    if (!tank.flying) {
      drawAim();
      if (aim && running) {
        const h = heldTankPosition();
        T.drawTank(ctx, { ...tank, x: h.x, y: h.y, angle: -.08 });
      } else T.drawTank(ctx, tank);
    } else T.drawTank(ctx, tank);

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (const f of floaters) {
      ctx.globalAlpha = Math.max(0, f.life / .9); ctx.fillStyle = '#fff4a5';
      ctx.font = '900 26px Impact,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
    ctx.restore();
    ctx.restore();
  }

  function update(dt) {
    if (!running) {
      cameraX = updateCamera(cameraX, tank, aim, running, dt);
      updateJohnny(hero, tank, aim, running, dt);
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
    updateDebris(dt);
    updateTank(dt);
    for (const p of particles) { p.life -= dt; p.vy += 420 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    for (const f of floaters) { f.life -= dt; f.y -= 48 * dt; }
    for (let i = actors.length - 1; i >= 0; i--) if (actors[i].dead) actors.splice(i, 1);
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
    if (!running || gameOver || missionComplete || tank.flying) return;
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
  document.getElementById('start').addEventListener('click', () => { titleScreen.classList.remove('visible'); resetGame(); beep('wave'); });
  document.getElementById('restart').addEventListener('click', () => { gameOverScreen.classList.remove('visible'); resetGame(); });
  document.getElementById('replay').addEventListener('click', () => { missionCompleteScreen.classList.remove('visible'); resetGame(); });

  updateHud();
  render();
  requestAnimationFrame(frame);
})();
