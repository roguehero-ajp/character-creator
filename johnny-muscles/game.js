(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const healthEl = document.getElementById('health');
  const comboEl = document.getElementById('combo');
  const steroidButton = document.getElementById('steroids');
  const steroidCountEl = document.getElementById('steroid-count');
  const muteButton = document.getElementById('mute');
  const titleScreen = document.getElementById('title-screen');
  const gameOverScreen = document.getElementById('game-over');
  const finalScoreEl = document.getElementById('final-score');
  const toastEl = document.getElementById('toast');

  const W = 1280;
  const H = 720;
  const GROUND = 603;
  const GRAVITY = 880;
  const DEFENSE_X = 86;
  const TANK_HOME = { x: 250, y: GROUND - 46 };

  let lastTime = performance.now();
  let running = false;
  let gameOver = false;
  let score = 0;
  let health = 5;
  let combo = 1;
  let comboTimer = 0;
  let spawnTimer = 0;
  let elapsed = 0;
  let steroidsLeft = 3;
  let steroidTimer = 0;
  let muted = false;
  let audioCtx = null;
  let aim = null;
  let shake = 0;
  let toastTimer = null;
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

  function resetGame() {
    score = 0;
    health = 5;
    combo = 1;
    comboTimer = 0;
    spawnTimer = 0.9;
    elapsed = 0;
    steroidsLeft = 3;
    steroidTimer = 0;
    cats.length = 0;
    particles.length = 0;
    floaters.length = 0;
    gameOver = false;
    running = true;
    resetTank();
    updateHud();
    steroidButton.disabled = false;
    steroidCountEl.textContent = '3 demo doses';
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
  }

  function updateHud() {
    scoreEl.textContent = String(score).padStart(6, '0');
    healthEl.textContent = Array.from({ length: 5 }, (_, i) => i < health ? '♥' : '♡').join(' ');
    comboEl.textContent = `x${combo}`;
  }

  function showToast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 820);
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
        hurt: [120, 70, 0.22, 'square']
      }[type] || [120, 80, 0.1, 'sine'];
      osc.type = settings[3];
      osc.frequency.setValueAtTime(settings[0], now);
      osc.frequency.exponentialRampToValueAtTime(settings[1], now + settings[2]);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + settings[2]);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + settings[2]);
    } catch (_) { /* Sound is optional. */ }
  }

  function spawnCat() {
    const chonker = Math.random() < Math.min(0.12 + elapsed / 180, 0.28);
    const scale = chonker ? 1.55 : 0.9 + Math.random() * 0.25;
    const hp = chonker ? 2 : 1;
    cats.push({
      id: `${performance.now()}-${Math.random()}`,
      x: W + 60,
      y: GROUND - 29 * scale,
      scale,
      speed: (chonker ? 36 : 54 + Math.random() * 26) + Math.min(elapsed * 0.3, 40),
      hp,
      maxHp: hp,
      chonker,
      bob: Math.random() * Math.PI * 2,
      dead: false
    });
  }

  function throwTank() {
    if (!aim || tank.flying || !running) return;
    const dx = tank.x - aim.x;
    const dy = tank.y - aim.y;
    const pull = Math.hypot(dx, dy);
    if (pull < 18) { aim = null; return; }
    const maxPull = 245;
    const scale = Math.min(pull, maxPull) / pull;
    const boost = steroidTimer > 0 ? 1.42 : 1;
    tank.vx = dx * scale * 4.05 * boost;
    tank.vy = dy * scale * 4.05 * boost;
    tank.angular = Math.min(7.5, 2 + pull / 55);
    tank.flying = true;
    tank.hitIds.clear();
    aim = null;
    beep('throw');
    if (navigator.vibrate) navigator.vibrate(20);
  }

  function addImpact(x, y, strong = false) {
    const count = strong ? 22 : 11;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 70 + Math.random() * (strong ? 300 : 150);
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 80,
        life: 0.35 + Math.random() * 0.5,
        max: 0.85,
        size: 3 + Math.random() * 9
      });
    }
    shake = Math.max(shake, strong ? 15 : 7);
  }

  function killCat(cat, impactSpeed) {
    cat.dead = true;
    const base = cat.chonker ? 350 : 120;
    const velocityBonus = Math.floor(Math.min(impactSpeed / 8, 120));
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

  function update(dt) {
    if (!running) return;
    elapsed += dt;
    if (steroidTimer > 0) steroidTimer = Math.max(0, steroidTimer - dt);
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0 && combo !== 1) {
        combo = 1;
        updateHud();
      }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnCat();
      const pressure = Math.max(0.48, 1.48 - elapsed * 0.008);
      spawnTimer = pressure + Math.random() * 0.55;
    }

    for (const cat of cats) {
      if (cat.dead) continue;
      cat.x -= cat.speed * dt;
      cat.bob += dt * 7;
      if (cat.x < DEFENSE_X) {
        cat.dead = true;
        health -= 1;
        combo = 1;
        comboTimer = 0;
        updateHud();
        beep('hurt');
        showToast('THEY GOT THROUGH!');
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
          if (cat.hp <= 0) killCat(cat, impactSpeed);
          else {
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

      if (tank.x > W + 180 || tank.x < -160 || (tank.y >= GROUND - 23 && Math.abs(tank.vx) < 14)) {
        tank.resetTimer += dt;
        if (tank.resetTimer > 0.65) resetTank();
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

    for (let i = cats.length - 1; i >= 0; i--) if (cats[i].dead || cats[i].x < -100) cats.splice(i, 1);
    for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
    for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].life <= 0) floaters.splice(i, 1);
    shake *= Math.pow(0.002, dt);
  }

  function endGame() {
    running = false;
    gameOver = true;
    finalScoreEl.textContent = `Score: ${score.toLocaleString()}`;
    gameOverScreen.classList.add('visible');
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, '#202b47');
    sky.addColorStop(.62, '#596070');
    sky.addColorStop(1, '#958770');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(230,235,247,.12)';
    ctx.beginPath(); ctx.arc(1040, 110, 55, 0, Math.PI * 2); ctx.fill();

    const buildings = [
      [0, 320, 150, 284], [140, 385, 120, 220], [260, 305, 185, 300], [430, 355, 115, 250],
      [545, 250, 210, 355], [742, 375, 122, 230], [850, 295, 190, 310], [1020, 340, 145, 265], [1150, 270, 160, 335]
    ];
    ctx.fillStyle = '#313746';
    for (const [x,y,w,h] of buildings) {
      ctx.fillRect(x,y,w,h);
      ctx.fillStyle = 'rgba(255,205,92,.14)';
      for (let wx = x + 18; wx < x + w - 10; wx += 32) {
        for (let wy = y + 25; wy < y + h - 20; wy += 42) ctx.fillRect(wx, wy, 11, 15);
      }
      ctx.fillStyle = '#313746';
    }

    ctx.fillStyle = '#48423b';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#665f53';
    ctx.fillRect(0, GROUND, W, 7);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    for (let x = 0; x < W; x += 90) ctx.fillRect(x, GROUND + 63, 46, 4);

    ctx.fillStyle = 'rgba(255,77,69,.17)';
    ctx.fillRect(DEFENSE_X - 4, 150, 8, GROUND - 150);
    ctx.save();
    ctx.translate(DEFENSE_X + 8, 165);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#ff7770';
    ctx.font = '900 15px system-ui, sans-serif';
    ctx.fillText('DEFENSE LINE', 0, 0);
    ctx.restore();
  }

  function drawJohnny() {
    const x = 142, y = GROUND - 36;
    ctx.save();
    ctx.translate(x, y);
    if (steroidTimer > 0) {
      ctx.shadowColor = '#a8ff58';
      ctx.shadowBlur = 22 + Math.sin(elapsed * 12) * 8;
    }
    ctx.fillStyle = '#d79a6e';
    ctx.beginPath(); ctx.ellipse(0, -162, 28, 34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1c17';
    ctx.fillRect(-25, -189, 50, 10);
    ctx.fillStyle = '#d79a6e';
    ctx.beginPath(); ctx.ellipse(0, -105, 49, 64, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-49, -112, 22, 48, -.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(49, -112, 22, 48, .25, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9c674d'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0,-145); ctx.lineTo(0,-65); ctx.stroke();
    ctx.fillStyle = '#59664b';
    ctx.fillRect(-41, -60, 35, 65); ctx.fillRect(6, -60, 35, 65);
    ctx.fillStyle = '#222';
    ctx.fillRect(-44, -3, 39, 16); ctx.fillRect(5, -3, 39, 16);
    ctx.fillStyle = '#eee';
    ctx.font = '900 12px system-ui, sans-serif';
    ctx.fillText('JM', -9, -94);
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
    ctx.beginPath(); ctx.arc(4, -11, 22, Math.PI, 0); ctx.fill();
    ctx.fillRect(12, -18, 71, 8);
    ctx.fillStyle = '#111';
    for (let x = -38; x <= 38; x += 19) { ctx.beginPath(); ctx.arc(x, 24, 9, 0, Math.PI * 2); ctx.fill(); }
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
    ctx.beginPath(); ctx.moveTo(-38,-31); ctx.lineTo(-34,-50); ctx.lineTo(-22,-35); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-12,-35); ctx.lineTo(-4,-49); ctx.lineTo(0,-29); ctx.fill();
    ctx.strokeStyle = '#6fdf78'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(24,-5); ctx.quadraticCurveTo(48,-28,55,-10); ctx.quadraticCurveTo(67,10,49,17); ctx.stroke();
    ctx.strokeStyle = '#9c5de5'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(13,11); ctx.quadraticCurveTo(28,36,47,31); ctx.stroke();
    ctx.fillStyle = wounded ? '#ffe34e' : '#77ff62';
    ctx.beginPath(); ctx.arc(-29,-20,4,0,Math.PI*2); ctx.arc(-17,-20,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#f4dfed';
    ctx.fillRect(-25,-10,6,4);
    ctx.restore();
  }

  function drawAim() {
    if (!aim || tank.flying || !running) return;
    const dx = tank.x - aim.x;
    const dy = tank.y - aim.y;
    const pull = Math.min(Math.hypot(dx, dy), 245);
    const len = Math.hypot(dx, dy) || 1;
    const vx = dx / len * pull * 4.05 * (steroidTimer > 0 ? 1.42 : 1);
    const vy = dy / len * pull * 4.05 * (steroidTimer > 0 ? 1.42 : 1);

    ctx.save();
    ctx.setLineDash([11, 9]);
    ctx.strokeStyle = steroidTimer > 0 ? '#a8ff58' : '#ffcf33';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(tank.x, tank.y); ctx.lineTo(aim.x, aim.y); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 1; i <= 12; i++) {
      const t = i * 0.09;
      const x = tank.x + vx * t;
      const y = tank.y + vy * t + 0.5 * GRAVITY * t * t;
      if (y > GROUND) break;
      ctx.beginPath(); ctx.arc(x, y, Math.max(2, 5 - i * .22), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0.4) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    drawBackground();
    drawJohnny();
    drawAim();
    drawTank();
    for (const cat of cats) drawCat(cat);

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = '#ffd85a';
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    for (const f of floaters) {
      ctx.globalAlpha = Math.max(0, f.life / .9);
      ctx.fillStyle = '#fff4a5';
      ctx.font = '900 24px Impact, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    if (steroidTimer > 0 && running) {
      ctx.fillStyle = 'rgba(168,255,88,.10)';
      ctx.fillRect(0,0,W,H);
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
    let drawW, drawH, offsetX, offsetY;
    if (rectAspect > canvasAspect) {
      drawH = rect.height; drawW = drawH * canvasAspect;
      offsetX = (rect.width - drawW) / 2; offsetY = 0;
    } else {
      drawW = rect.width; drawH = drawW / canvasAspect;
      offsetX = 0; offsetY = (rect.height - drawH) / 2;
    }
    return {
      x: (e.clientX - rect.left - offsetX) * W / drawW,
      y: (e.clientY - rect.top - offsetY) * H / drawH
    };
  }

  canvas.addEventListener('pointerdown', e => {
    if (!running || tank.flying || gameOver) return;
    const p = pointerToWorld(e);
    if (Math.hypot(p.x - tank.x, p.y - tank.y) < 105) {
      aim = p;
      canvas.setPointerCapture?.(e.pointerId);
    }
  });

  canvas.addEventListener('pointermove', e => {
    if (!aim || tank.flying) return;
    const p = pointerToWorld(e);
    const dx = p.x - tank.x, dy = p.y - tank.y;
    const len = Math.hypot(dx,dy);
    if (len > 245) {
      aim = { x: tank.x + dx / len * 245, y: tank.y + dy / len * 245 };
    } else aim = p;
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

  window.addEventListener('keydown', e => {
    if (e.code === 'Space' && titleScreen.classList.contains('visible')) document.getElementById('start').click();
    if (e.code === 'KeyS') steroidButton.click();
  });

  render();
  requestAnimationFrame(frame);
})();
