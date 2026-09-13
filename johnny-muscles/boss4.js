(() => {
  'use strict';

  const S = window.JMShared;
  const T = window.JMTankArt;
  const F = window.JMWorld4Fighter;
  if (!S || !T || !F) throw new Error('Boss 4 requires shared, tank, and World 4 fighter modules');

  const { W, H, GROUND, GRAVITY, TANK_HOME, MAX_PULL, clamp, pointerToWorld, updateCamera, updateJohnny } = S;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const healthEl = document.getElementById('health');
  const bossHpEl = document.getElementById('boss-hp');
  const tacticalEl = document.getElementById('tactical');
  const interruptsEl = document.getElementById('interrupts');
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
  const resultInterruptsEl = document.getElementById('result-interrupts');
  const resultDodgesEl = document.getElementById('result-dodges');
  const resultDefenseEl = document.getElementById('result-defense');

  const BOSS_MAX_HP = 10;
  const HERO_X = 166;
  const POSITIONS = [
    { x: 875, y: GROUND - 43, cover: 92 },
    { x: 1080, y: GROUND - 170, cover: 82 },
    { x: 1250, y: GROUND - 286, cover: 76 }
  ];

  let lastTime = performance.now();
  let running = false;
  let gameOver = false;
  let victory = false;
  let score = 0;
  let health = 5;
  let bossHealth = BOSS_MAX_HP;
  let phase = 1;
  let elapsed = 0;
  let steroidsLeft = 3;
  let steroidTimer = 0;
  let muted = false;
  let audioCtx = null;
  let aim = null;
  let shake = 0;
  let cameraX = 0;
  let toastTimer = null;
  let wind = -80;
  let windTarget = 110;
  let windTimer = 4;
  let hits = 0;
  let interrupts = 0;
  let dodges = 0;
  let damageTaken = 0;
  let throws = 0;
  let introThrowSeen = false;
  let avalancheActive = false;
  let avalancheFront = 1700;
  let avalancheLife = 0;

  const particles = [];
  const floaters = [];
  const smoke = [];
  const mortars = [];
  const hero = { armAngle: -.75, releaseTimer: 0, torsoLean: 0, squat: 0, catchPose: 0 };
  const tank = { x: TANK_HOME.x, y: TANK_HOME.y, vx: 0, vy: 0, angle: 0, angular: 0, flying: false, resetTimer: 0, bounced: false, hitShaun: false };
  const shaun = {
    pos: 1, x: POSITIONS[1].x, y: POSITIONS[1].y,
    state: 'cover', timer: 1.8, exposed: false, smokeHidden: false,
    dodgeCooldown: 0, mortarCooldown: 2.4, hitFlash: 0,
    slideVx: 0, slideVy: 0, tacticalLine: 'BEHIND COVER'
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
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); const n = audioCtx.currentTime;
      const sounds = {
        throw:[90,52,.12,'sawtooth'], impact:[72,38,.1,'square'], hurt:[120,70,.22,'square'],
        tiger:[180,74,.22,'sawtooth'], radio:[620,320,.12,'square'], smoke:[220,130,.16,'triangle'],
        mortar:[100,44,.35,'sawtooth'], dodge:[490,760,.12,'triangle'], avalanche:[88,30,.65,'sawtooth'],
        win:[330,880,.5,'triangle'], ping:[560,300,.12,'square'], power:[160,420,.25,'sawtooth']
      };
      const s=sounds[type]||sounds.impact;o.type=s[3];o.frequency.setValueAtTime(s[0],n);o.frequency.exponentialRampToValueAtTime(s[1],n+s[2]);
      g.gain.setValueAtTime(.065,n);g.gain.exponentialRampToValueAtTime(.001,n+s[2]);o.connect(g).connect(audioCtx.destination);o.start(n);o.stop(n+s[2]);
    } catch (_) {}
  }

  function updateHud() {
    scoreEl.textContent=String(score).padStart(6,'0');
    healthEl.textContent=Array.from({length:5},(_,i)=>i<health?'♥':'♡').join(' ');
    bossHpEl.textContent='■'.repeat(bossHealth)+'□'.repeat(BOSS_MAX_HP-bossHealth);
    tacticalEl.textContent=shaun.tacticalLine;
    interruptsEl.textContent=String(interrupts);
  }

  function addImpact(x,y,strong=false,color='#f6df9b') {
    for(let i=0;i<(strong?28:14);i++){const a=Math.random()*Math.PI*2,s=80+Math.random()*(strong?340:180);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-90,life:.4+Math.random()*.5,max:.9,size:3+Math.random()*10,color});}
    shake=Math.max(shake,strong?19:8);
  }

  function resetTank(){Object.assign(tank,{x:TANK_HOME.x,y:TANK_HOME.y,vx:0,vy:0,angle:0,angular:0,flying:false,resetTimer:0,bounced:false,hitShaun:false});aim=null;hero.releaseTimer=0;}

  function resetFight() {
    running=true;gameOver=false;victory=false;score=0;health=5;bossHealth=BOSS_MAX_HP;phase=1;elapsed=0;steroidsLeft=3;steroidTimer=0;aim=null;shake=0;cameraX=0;
    wind=-80;windTarget=110;windTimer=4;hits=0;interrupts=0;dodges=0;damageTaken=0;throws=0;introThrowSeen=false;avalancheActive=false;avalancheFront=1700;avalancheLife=0;
    particles.length=0;floaters.length=0;smoke.length=0;mortars.length=0;
    Object.assign(hero,{armAngle:-.75,releaseTimer:0,torsoLean:0,squat:0,catchPose:0});
    Object.assign(shaun,{pos:1,x:POSITIONS[1].x,y:POSITIONS[1].y,state:'cover',timer:1.8,exposed:false,smokeHidden:false,dodgeCooldown:0,mortarCooldown:2.4,hitFlash:0,slideVx:0,slideVy:0,tacticalLine:'BEHIND COVER'});
    resetTank();steroidButton.disabled=false;steroidCountEl.textContent='3 demo doses';updateHud();
    showToast('SPECIAL SOLDIER SHAUN: SUMMIT COMMAND',1400);setTimeout(()=>showToast('TARGET HAS DEPLOYED AN ARMOURED VEHICLE.',1450),1450);
  }

  function hurtHero(label){if(gameOver||victory)return;health--;damageTaken++;shake=22;addImpact(HERO_X,GROUND-72,true,'#ffcfaa');showToast(label,950);beep('hurt');updateHud();if(health<=0)loseFight();}

  function phaseForHp(){return bossHealth>7?1:bossHealth>4?2:3;}

  function damageShaun(amount,label){
    if(victory)return;bossHealth=Math.max(0,bossHealth-amount);hits++;score+=850*amount*phase;shaun.hitFlash=.28;addImpact(shaun.x,shaun.y-95,true,'#a8ff58');floaters.push({x:shaun.x,y:shaun.y-180,text:`${label} -${amount}`,life:1});beep('tiger');
    const old=phase;phase=phaseForHp();
    if(phase!==old){
      if(phase===2){showToast('SHAUN: TRAJECTORY ANALYSIS ACTIVE.',1500);shaun.dodgeCooldown=0;}
      if(phase===3){showToast('SHAUN: INITIATE SUMMIT DENIAL PROTOCOL.',1500);setTimeout(startAvalanche,900);}
    }
    updateHud();if(bossHealth<=0)winFight();
  }

  function choosePosition(exclude=shaun.pos){let n=exclude;while(n===exclude)n=Math.floor(Math.random()*POSITIONS.length);return n;}
  function moveShaunTo(index){shaun.pos=index;shaun.x=POSITIONS[index].x;shaun.y=POSITIONS[index].y;}

  function deploySmoke(){
    for(let i=0;i<18;i++)smoke.push({x:shaun.x+(Math.random()-.5)*110,y:shaun.y-75+(Math.random()-.5)*70,vx:(Math.random()-.5)*24,vy:-12-Math.random()*18,life:1.8+Math.random()*.8,size:24+Math.random()*38});
    shaun.smokeHidden=true;shaun.state='smoke';shaun.timer=.72;shaun.exposed=false;shaun.tacticalLine='SMOKE DEPLOYED';showToast('SHAUN DEPLOYED SMOKE!',750);beep('smoke');
  }

  function callMortar(){
    shaun.state='mortar';shaun.timer=1.35;shaun.exposed=true;shaun.tacticalLine='CALLING MORTAR';
    mortars.push({x:HERO_X+10,timer:1.35,interrupted:false});showToast('MORTAR MARKER! HIT SHAUN TO INTERRUPT!',1200);beep('radio');
  }

  function finishMortar(){
    const m=mortars[mortars.length-1];
    if(m&&!m.interrupted){addImpact(m.x,GROUND-25,true,'#ffbb63');hurtHero('MORTAR STRIKE!');beep('mortar');}
    shaun.state='cover';shaun.exposed=false;shaun.timer=.9;shaun.tacticalLine='BEHIND COVER';shaun.mortarCooldown=3.4-phase*.35;
  }

  function tryPredictiveDodge(){
    if(phase<2||shaun.dodgeCooldown>0||shaun.state!=='exposed'||!tank.flying||tank.vx<=0)return false;
    const dx=shaun.x-tank.x;if(dx<180||dx>650)return false;
    const eta=dx/Math.max(1,tank.vx);const predictedY=tank.y+tank.vy*eta+.5*GRAVITY*F.gravityMultiplier*eta*eta;
    if(Math.abs(predictedY-(shaun.y-90))>125)return false;
    const next=choosePosition();deploySmoke();moveShaunTo(next);shaun.dodgeCooldown=phase===3?1.7:2.6;dodges++;showToast('TRAJECTORY PREDICTED. SHAUN RELOCATED.',900);beep('dodge');return true;
  }

  function startAvalanche(){
    if(avalancheActive)return;avalancheActive=true;avalancheFront=1740;avalancheLife=3.8;shaun.tacticalLine='AVALANCHE PROTOCOL';showToast('SHAUN CALLED AN AVALANCHE. THIS SEEMS POORLY CONSIDERED.',1600);beep('avalanche');shake=28;
  }

  function updateAvalanche(dt){
    if(!avalancheActive)return;avalancheLife-=dt;avalancheFront-=540*dt;
    if(avalancheFront<shaun.x+80&&avalancheFront+430>shaun.x-80&&shaun.state!=='sliding'){
      shaun.state='sliding';shaun.exposed=true;shaun.tacticalLine='TACTICAL PLAN LOST';shaun.slideVx=-150;shaun.slideVy=-90;showToast('THE AVALANCHE GOT SHAUN TOO!',850);damageShaun(1,'OWN AVALANCHE');
    }
    if(avalancheFront<HERO_X+50&&avalancheFront+430>HERO_X-50){
      showToast(`${F.shortName} DUCKED BEHIND THE SUPPLY CRATE!`,700);
    }
    if(avalancheLife<=0||avalancheFront<-600){avalancheActive=false;shaun.tacticalLine=shaun.state==='sliding'?'TACTICAL PLAN LOST':'EXPOSED';}
  }

  function updateShaun(dt){
    if(victory||gameOver)return;shaun.hitFlash=Math.max(0,shaun.hitFlash-dt);shaun.dodgeCooldown=Math.max(0,shaun.dodgeCooldown-dt);shaun.mortarCooldown-=dt;
    if(shaun.state==='sliding'){
      shaun.slideVy+=GRAVITY*.35*dt;shaun.x+=shaun.slideVx*dt;shaun.y+=shaun.slideVy*dt;shaun.slideVx*=Math.pow(.82,dt);
      if(shaun.y>=GROUND-43){shaun.y=GROUND-43;shaun.slideVy=0;shaun.slideVx=-70;if(shaun.x<690){moveShaunTo(0);shaun.state='exposed';shaun.timer=1.1;shaun.tacticalLine='EXPOSED';}}
      return;
    }
    if(shaun.state==='smoke'){shaun.timer-=dt;if(shaun.timer<=0){shaun.smokeHidden=false;shaun.state='cover';shaun.timer=.6;shaun.tacticalLine='BEHIND COVER';}return;}
    if(shaun.state==='mortar'){shaun.timer-=dt;if(shaun.timer<=0)finishMortar();return;}
    if(shaun.state==='cover'){shaun.timer-=dt;if(shaun.timer<=0){shaun.state='exposed';shaun.exposed=true;shaun.timer=1.35-(phase-1)*.12;shaun.tacticalLine='EXPOSED';}return;}
    if(shaun.state==='exposed'){
      if(tryPredictiveDodge())return;
      shaun.timer-=dt;
      if(shaun.mortarCooldown<=0){callMortar();return;}
      if(shaun.timer<=0){if(Math.random()<.48&&phase>=2)deploySmoke();else{moveShaunTo(choosePosition());shaun.state='cover';shaun.exposed=false;shaun.timer=.8;shaun.tacticalLine='BEHIND COVER';}}
    }
  }

  function heldTankPosition(){return !aim||tank.flying?{x:tank.x,y:tank.y}:{x:aim.x,y:Math.min(aim.y,GROUND-40)};}

  function throwTank(){
    if(!aim||tank.flying||!running||victory||gameOver)return;const dx=tank.x-aim.x,dy=tank.y-aim.y,p=Math.hypot(dx,dy);if(p<18){aim=null;return;}const sc=Math.min(p,MAX_PULL)/p,boost=steroidTimer>0?1.42:1,h=heldTankPosition();
    Object.assign(tank,{x:h.x,y:h.y,vx:dx*sc*F.throwScale*boost,vy:dy*sc*F.throwScale*boost,angular:Math.min(9,2+p/55),flying:true,resetTimer:0,bounced:false,hitShaun:false});aim=null;hero.releaseTimer=.28;throws++;beep('throw');
    if(!introThrowSeen){introThrowSeen=true;showToast('...CORRECTION. TARGET HAS PICKED UP THE ARMOURED VEHICLE.',1450);setTimeout(()=>showToast('SHAUN: WHY DOES HE KEEP DOING THAT?',1200),1500);}
  }

  function interruptMortar(){
    const m=mortars[mortars.length-1];if(m)m.interrupted=true;interrupts++;shaun.mortarCooldown=3.2;showToast('MORTAR CALL INTERRUPTED!',850);damageShaun(1,'INTERRUPT');shaun.state='cover';shaun.exposed=false;shaun.timer=.75;shaun.tacticalLine='BEHIND COVER';updateHud();
  }

  function hitShaun(){
    if(tank.hitShaun||shaun.smokeHidden)return;tank.hitShaun=true;
    if(shaun.state==='mortar'){interruptMortar();tank.vx*=F.impactX;tank.vy*=F.impactY;return;}
    if(!shaun.exposed&&shaun.state!=='sliding'){
      tank.vx*=-.24;tank.vy=-Math.abs(tank.vy)*.32-90;tank.angular*=-1;addImpact(shaun.x,shaun.y-30,true,'#c9c4b9');showToast('SHAUN IS BEHIND COVER!',650);beep('ping');return;
    }
    const bonus=shaun.state==='sliding'?2:1;damageShaun(bonus,shaun.state==='sliding'?'SLIDING HIT':'DIRECT HIT');tank.vx*=F.impactX;tank.vy*=F.impactY;
  }

  function updateTank(dt){
    if(!tank.flying)return;tank.vx+=wind*.45*dt;tank.vy+=GRAVITY*F.gravityMultiplier*dt;tank.x+=tank.vx*dt;tank.y+=tank.vy*dt;tank.angle+=tank.angular*dt;
    const targetY=shaun.y-92;if(Math.hypot(tank.x-shaun.x,tank.y-targetY)<96+F.collisionBonus)hitShaun();
    if(tank.y>=GROUND-22){tank.y=GROUND-22;if(Math.abs(tank.vy)>160&&!tank.bounced){tank.vy*=-.16;tank.vx*=.88;tank.angular*=.7;tank.bounced=true;addImpact(tank.x,tank.y+15,true,'#dff6ff');}else{tank.vy=0;tank.vx*=Math.pow(.62,dt);tank.angular*=Math.pow(.5,dt);}}
    if(tank.x<-400||tank.x>2400||(tank.y>=GROUND-23&&Math.abs(tank.vx)<13)){tank.resetTimer+=dt;if(tank.resetTimer>.62)resetTank();}else tank.resetTimer=0;
  }

  function updateWind(dt){windTimer-=dt;if(windTimer<=0){windTarget=[-150,-95,95,150][Math.floor(Math.random()*4)];windTimer=3.5+Math.random()*2;}wind+=(windTarget-wind)*(1-Math.exp(-2.2*dt));}

  function updateEffects(dt){
    for(const s of smoke){s.life-=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.size+=11*dt;}for(let i=smoke.length-1;i>=0;i--)if(smoke[i].life<=0)smoke.splice(i,1);
    for(const m of mortars)m.timer=Math.max(0,m.timer-dt);
    for(const p of particles){p.life-=dt;p.vy+=420*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}for(const f of floaters){f.life-=dt;f.y-=45*dt;}
    for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);for(let i=floaters.length-1;i>=0;i--)if(floaters[i].life<=0)floaters.splice(i,1);
  }

  function loseFight(){if(gameOver)return;running=false;gameOver=true;aim=null;finalScoreEl.textContent=`Shaun HP: ${bossHealth}/${BOSS_MAX_HP} · Mortars interrupted: ${interrupts} · Dodges: ${dodges}`;gameOverScreen.classList.add('visible');}

  function winFight(){if(victory)return;victory=true;running=false;aim=null;showToast('SPECIAL SOLDIER SHAUN DEFEATED!',1800);beep('win');const stars=1+(damageTaken===0?1:0)+(interrupts>=1?1:0);resultStarsEl.textContent='★'.repeat(stars)+'☆'.repeat(3-stars);resultScoreEl.textContent=score.toLocaleString();resultHitsEl.textContent=String(hits);resultInterruptsEl.textContent=String(interrupts);resultDodgesEl.textContent=String(dodges);resultDefenseEl.textContent=damageTaken===0?'UNTOUCHED':`${health}/5 HEARTS`;setTimeout(()=>victoryScreen.classList.add('visible'),950);}

  function drawAim(){
    if(!aim||tank.flying)return;const dx=tank.x-aim.x,dy=tank.y-aim.y,raw=Math.hypot(dx,dy),pull=Math.min(raw,MAX_PULL),len=raw||1,boost=steroidTimer>0?1.42:1;const vx=(dx/len)*pull*F.throwScale*boost,vy=(dy/len)*pull*F.throwScale*boost,h=heldTankPosition();
    ctx.save();ctx.setLineDash([11,9]);ctx.strokeStyle=steroidTimer>0?'#a8ff58':'#ffcf33';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(tank.x,tank.y);ctx.lineTo(aim.x,aim.y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(255,255,255,.75)';
    for(let i=1;i<=18;i++){const tt=i*.09,x=h.x+vx*tt+.5*wind*.45*tt*tt,y=h.y+vy*tt+.5*GRAVITY*F.gravityMultiplier*tt*tt;if(y>GROUND)break;ctx.beginPath();ctx.arc(x,y,Math.max(2,5-i*.18),0,Math.PI*2);ctx.fill();}ctx.restore();
  }

  function drawBackground(){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#40546b');sky.addColorStop(.55,'#8796a5');sky.addColorStop(1,'#d7dcdf');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#414950';ctx.beginPath();ctx.moveTo(0,GROUND-170);for(let x=0;x<=W+120;x+=105){ctx.lineTo(x,GROUND-220-Math.abs(Math.sin(x*.009))*210);}ctx.lineTo(W,GROUND);ctx.lineTo(0,GROUND);ctx.closePath();ctx.fill();
    ctx.fillStyle='#eef4f7';ctx.globalAlpha=.45;ctx.beginPath();ctx.moveTo(0,GROUND-260);for(let x=0;x<=W+120;x+=150){ctx.lineTo(x,GROUND-270-Math.abs(Math.sin(x*.006+1.2))*150);}ctx.lineTo(W,GROUND-100);ctx.lineTo(0,GROUND-100);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
    ctx.fillStyle='#5c645a';ctx.fillRect(0,GROUND-35,W,35);ctx.fillStyle='#dce9ef';ctx.fillRect(0,GROUND-8,W,8);
  }

  function drawPositions(){
    for(let i=0;i<POSITIONS.length;i++){const p=POSITIONS[i];ctx.fillStyle=phase===3?'#696963':'#5b625d';ctx.beginPath();ctx.moveTo(p.x-p.cover,p.y+10);ctx.lineTo(p.x+p.cover,p.y+10);ctx.lineTo(p.x+p.cover*.7,p.y+95);ctx.lineTo(p.x-p.cover*.75,p.y+95);ctx.closePath();ctx.fill();ctx.fillStyle='#858984';ctx.fillRect(p.x-p.cover,p.y,p.cover*2,13);if(phase<3){ctx.fillStyle='#53604d';ctx.fillRect(p.x-58,p.y-42,116,42);ctx.fillStyle='#353b34';ctx.fillRect(p.x-49,p.y-34,98,9);}}
  }

  function drawShaun(){
    ctx.save();ctx.translate(shaun.x,shaun.y);if(shaun.state==='sliding')ctx.rotate(-.18);ctx.scale(1.35,1.35);
    const flash=shaun.hitFlash>0;const fur=flash?'#ffe2bd':'#d99a55';const dark='#31261e';const white='#f3e8d9';const camo='#596153';const camoDark='#333b34';
    ctx.strokeStyle=dark;ctx.lineWidth=13;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(42,-65);ctx.quadraticCurveTo(88,-85,94,-43);ctx.stroke();
    ctx.fillStyle=camoDark;ctx.beginPath();ctx.ellipse(0,-83,55,48,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=camo;ctx.beginPath();ctx.ellipse(0,-88,49,43,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=fur;ctx.beginPath();ctx.ellipse(0,-154,39,43,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=white;ctx.beginPath();ctx.ellipse(0,-143,25,23,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=fur;ctx.beginPath();ctx.moveTo(-29,-177);ctx.lineTo(-44,-210);ctx.lineTo(-12,-185);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(29,-177);ctx.lineTo(44,-210);ctx.lineTo(12,-185);ctx.closePath();ctx.fill();
    ctx.strokeStyle=dark;ctx.lineWidth=5;for(const x of[-25,-14,14,25]){ctx.beginPath();ctx.moveTo(x,-174);ctx.lineTo(x+(x<0?8:-8),-155);ctx.stroke();}
    ctx.fillStyle='#20251f';ctx.fillRect(-37,-199,74,11);ctx.fillStyle='#83b871';ctx.fillRect(-31,-197,20,7);ctx.fillRect(4,-197,26,7);
    ctx.fillStyle='#161a18';ctx.fillRect(-28,-159,21,11);ctx.fillRect(7,-159,21,11);ctx.fillRect(-7,-156,14,4);ctx.fillStyle='#9aff65';ctx.fillRect(-24,-157,7,3);ctx.fillRect(12,-157,7,3);
    ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(-6,-137);ctx.lineTo(6,-137);ctx.lineTo(0,-130);ctx.closePath();ctx.fill();
    ctx.fillStyle='#20251f';ctx.fillRect(-49,-121,98,12);ctx.fillStyle='#6f745f';ctx.fillRect(-43,-116,20,30);ctx.fillRect(22,-116,20,30);ctx.fillStyle='#d0ad4c';ctx.font='900 10px system-ui';ctx.textAlign='center';ctx.fillText('SS',0,-90);ctx.textAlign='left';
    ctx.strokeStyle=dark;ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(-30,-72);ctx.lineTo(-43,-10);ctx.stroke();ctx.beginPath();ctx.moveTo(30,-72);ctx.lineTo(43,-10);ctx.stroke();
    ctx.restore();
  }

  function drawSmoke(){for(const s of smoke){ctx.save();ctx.globalAlpha=Math.max(0,s.life/2.2)*.55;ctx.fillStyle='#cfd3d1';ctx.beginPath();ctx.arc(s.x,s.y,s.size,0,Math.PI*2);ctx.fill();ctx.restore();}}
  function drawMortars(){for(const m of mortars){if(m.interrupted)continue;const pulse=.5+.5*Math.sin(elapsed*18);ctx.strokeStyle=`rgba(255,65,50,${.45+.4*pulse})`;ctx.lineWidth=5;ctx.beginPath();ctx.arc(m.x,GROUND-9,35+12*pulse,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(m.x-48,GROUND-9);ctx.lineTo(m.x+48,GROUND-9);ctx.moveTo(m.x,GROUND-57);ctx.lineTo(m.x,GROUND+39);ctx.stroke();}}
  function drawAvalanche(){if(!avalancheActive)return;ctx.save();ctx.fillStyle='#eef6f8';ctx.strokeStyle='#c7dbe3';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(avalancheFront+210,GROUND-42,280,95,-.08,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();}
  function drawHeroScaled(){ctx.save();ctx.translate(24,3);ctx.translate(142,582);ctx.scale(.5,.5);ctx.translate(-142,-582);S.drawJohnny(ctx,hero,steroidTimer,elapsed);ctx.restore();}

  function render(){
    ctx.clearRect(0,0,W,H);ctx.save();if(shake>.4)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);drawBackground();ctx.save();ctx.translate(-cameraX,0);drawPositions();drawHeroScaled();drawMortars();
    if(!tank.flying){drawAim();if(aim&&running){const h=heldTankPosition();T.drawTank(ctx,{...tank,x:h.x,y:h.y,angle:-.08});}else T.drawTank(ctx,tank);}else T.drawTank(ctx,tank);
    drawShaun();drawSmoke();drawAvalanche();for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);}ctx.globalAlpha=1;for(const f of floaters){ctx.globalAlpha=Math.max(0,f.life);ctx.fillStyle='#fff4a5';ctx.font='900 25px Impact,system-ui';ctx.textAlign='center';ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;ctx.textAlign='left';ctx.restore();ctx.restore();
  }

  function update(dt){
    if(!running){cameraX=updateCamera(cameraX,tank,aim,running,dt);updateJohnny(hero,tank,aim,running,dt);return;}
    elapsed+=dt;if(steroidTimer>0)steroidTimer=Math.max(0,steroidTimer-dt);updateWind(dt);updateShaun(dt);updateAvalanche(dt);updateTank(dt);updateEffects(dt);shake*=Math.pow(.002,dt);cameraX=updateCamera(cameraX,tank,aim,running,dt);updateJohnny(hero,tank,aim,running,dt);updateHud();
  }
  function frame(now){const dt=Math.min((now-lastTime)/1000,.033);lastTime=now;update(dt);render();requestAnimationFrame(frame);}

  canvas.addEventListener('pointerdown',e=>{if(!running||gameOver||victory||tank.flying)return;const p=pointerToWorld(canvas,e,cameraX);if(Math.hypot(p.x-tank.x,p.y-tank.y)<125){aim=p;canvas.setPointerCapture?.(e.pointerId);}});
  canvas.addEventListener('pointermove',e=>{if(!aim||tank.flying)return;const p=pointerToWorld(canvas,e,cameraX),dx=p.x-tank.x,dy=p.y-tank.y,len=Math.hypot(dx,dy);aim=len>MAX_PULL?{x:tank.x+dx/len*MAX_PULL,y:tank.y+dy/len*MAX_PULL}:p;});
  canvas.addEventListener('pointerup',throwTank);canvas.addEventListener('pointercancel',()=>{aim=null;});
  steroidButton.addEventListener('click',()=>{if(!running||steroidsLeft<=0)return;steroidsLeft--;steroidTimer=12;steroidCountEl.textContent=steroidsLeft===1?'1 demo dose':`${steroidsLeft} demo doses`;steroidButton.disabled=steroidsLeft<=0;showToast('UNREGULATED STRENGTH!');beep('power');});
  muteButton.addEventListener('click',()=>{muted=!muted;muteButton.textContent=muted?'🔇':'🔊';});
  document.getElementById('start').addEventListener('click',()=>{titleScreen.classList.remove('visible');resetFight();});
  document.getElementById('restart').addEventListener('click',()=>{gameOverScreen.classList.remove('visible');resetFight();});
  document.getElementById('replay').addEventListener('click',()=>{victoryScreen.classList.remove('visible');resetFight();});

  updateHud();render();requestAnimationFrame(frame);
})();
