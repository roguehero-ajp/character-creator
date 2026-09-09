(() => {
  'use strict';
  const S = window.JMShared;
  if (!S) throw new Error('campaign-shared.js must load before city4.js');
  const { W,H,GROUND,GRAVITY,TANK_HOME,MAX_PULL,clamp,pseudoRandom,pointerToWorld,drawTank,drawJohnny,drawAim,updateCamera,updateJohnny } = S;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const healthEl = document.getElementById('health');
  const comboEl = document.getElementById('combo');
  const waveEl = document.getElementById('wave');
  const remainingEl = document.getElementById('remaining');
  const safeEl = document.getElementById('safe');
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
  const resultSafeEl = document.getElementById('result-safe');
  const resultBonksEl = document.getElementById('result-bonks');
  const resultComboEl = document.getElementById('result-combo');
  const resultDefenseEl = document.getElementById('result-defense');
  const toastEl = document.getElementById('toast');

  const DEFENSE_X = 86;
  const LEVEL = { waves: [
    { infected:4, friendly:2, gap:0.92, chonker:0.00 },
    { infected:6, friendly:3, gap:0.80, chonker:0.08 },
    { infected:8, friendly:4, gap:0.68, chonker:0.16 }
  ]};
  const BARRICADES = [ {x:760,w:90,h:58}, {x:1450,w:105,h:62} ];

  let lastTime = performance.now();
  let running=false, gameOver=false, missionComplete=false;
  let score=0, health=5, combo=1, bestCombo=1, comboTimer=0, elapsed=0;
  let steroidsLeft=3, steroidTimer=0, muted=false, audioCtx=null, aim=null, shake=0, cameraX=0, toastTimer=null;
  let currentWave=-1, queue=[], spawned=0, resolved=0, spawnTimer=0, intermission=1.1, clearAnnounced=false, finishTimer=0;
  let infectedFlattened=0, friendliesSafe=0, friendlyBonks=0, breaches=0;
  const actors=[], particles=[], floaters=[];
  const tank={x:TANK_HOME.x,y:TANK_HOME.y,vx:0,vy:0,angle:0,angular:0,flying:false,resetTimer:0,bounced:false,hitIds:new Set(),hitBarricades:new Set()};
  const johnny={armAngle:-0.75,releaseTimer:0,torsoLean:0,squat:0,catchPose:0};

  function showToast(text,duration=850){ toastEl.textContent=text; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toastEl.classList.remove('show'),duration); }
  function beep(type='impact'){
    if(muted) return;
    try{
      if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      const o=audioCtx.createOscillator(), g=audioCtx.createGain(), now=audioCtx.currentTime;
      const s={throw:[90,52,.12,'sawtooth'],impact:[72,38,.09,'square'],cat:[430,240,.08,'triangle'],friendly:[650,880,.09,'triangle'],hurt:[120,70,.22,'square'],wave:[260,410,.18,'square'],win:[330,660,.42,'triangle'],power:[160,420,.25,'sawtooth']}[type]||[120,80,.1,'sine'];
      o.type=s[3]; o.frequency.setValueAtTime(s[0],now); o.frequency.exponentialRampToValueAtTime(s[1],now+s[2]);
      g.gain.setValueAtTime(.06,now); g.gain.exponentialRampToValueAtTime(.001,now+s[2]); o.connect(g).connect(audioCtx.destination); o.start(now); o.stop(now+s[2]);
    }catch(_){ }
  }
  function updateHud(){
    scoreEl.textContent=String(Math.max(0,score)).padStart(6,'0');
    healthEl.textContent=Array.from({length:5},(_,i)=>i<health?'♥':'♡').join(' ');
    comboEl.textContent=`x${combo}`; safeEl.textContent=String(friendliesSafe);
    if(currentWave<0){ waveEl.textContent='1/3'; remainingEl.textContent='INCOMING'; return; }
    const spec=LEVEL.waves[currentWave];
    waveEl.textContent=`${currentWave+1}/3`; remainingEl.textContent=missionComplete?'SECURED':String(Math.max(0,spec.infected+spec.friendly-resolved));
  }
  function resetTank(){ Object.assign(tank,{x:TANK_HOME.x,y:TANK_HOME.y,vx:0,vy:0,angle:0,angular:0,flying:false,resetTimer:0,bounced:false}); tank.hitIds.clear(); tank.hitBarricades.clear(); aim=null; johnny.releaseTimer=0; }
  function resetGame(){
    score=0; health=5; combo=1; bestCombo=1; comboTimer=0; elapsed=0; steroidsLeft=3; steroidTimer=0; aim=null; shake=0; cameraX=0;
    currentWave=-1; queue=[]; spawned=0; resolved=0; spawnTimer=0; intermission=1.1; clearAnnounced=false; finishTimer=0;
    infectedFlattened=0; friendliesSafe=0; friendlyBonks=0; breaches=0; actors.length=0; particles.length=0; floaters.length=0;
    running=true; gameOver=false; missionComplete=false; Object.assign(johnny,{armAngle:-.75,releaseTimer:0,torsoLean:0,squat:0,catchPose:0}); resetTank();
    steroidButton.disabled=false; steroidCountEl.textContent='3 demo doses'; updateHud(); showToast('CITY 4: EVACUATION ROUTE',1200);
  }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
  function startWave(){ currentWave++; const s=LEVEL.waves[currentWave]; queue=shuffle([...Array(s.infected).fill('infected'),...Array(s.friendly).fill('friendly')]); spawned=0;resolved=0;spawnTimer=.2;clearAnnounced=false;showToast(`WAVE ${currentWave+1} · KEEP THE ROUTE CLEAR`,1000);beep('wave');updateHud(); }
  function spawnActor(kind){
    const spec=LEVEL.waves[currentWave];
    if(kind==='friendly'){
      const colors=['#d9b96e','#d5d5d5','#b97853','#7894b8'];
      actors.push({id:`f-${performance.now()}-${Math.random()}`,kind,x:150+Math.random()*90,y:GROUND-24,scale:.78+Math.random()*.18,speed:72+Math.random()*24,color:colors[Math.floor(Math.random()*colors.length)],bob:Math.random()*6.2,dead:false,resolved:false,bonked:false,vy:0,spin:0});
    }else{
      const chonker=Math.random()<spec.chonker, scale=chonker?1.5:.9+Math.random()*.2, hp=chonker?2:1;
      actors.push({id:`i-${performance.now()}-${Math.random()}`,kind,x:1220+Math.random()*180,y:GROUND-29*scale,scale,speed:(chonker?39:58+Math.random()*18),hp,maxHp:hp,chonker,bob:Math.random()*6.2,dead:false,resolved:false});
    }
    spawned++; updateHud();
  }
  function resolveActor(a){ if(a.resolved)return; a.resolved=true; resolved++; updateHud(); }
  function bonkFriendly(a,impact){
    if(a.dead||a.bonked)return; a.bonked=true; friendlyBonks++; score=Math.max(0,score-250); combo=1; comboTimer=0; a.vy=-260-Math.min(180,impact*.2); a.spin=(Math.random()<.5?-1:1)*5.5;
    floaters.push({x:a.x,y:a.y-25,text:'-250 FRIENDLY!',life:1}); showToast('JOHNNY, THAT ONE WAS NORMAL!',1050); beep('friendly'); updateHud();
  }
  function flattenInfected(a,impact){
    if(a.dead)return; a.dead=true; resolveActor(a); infectedFlattened++; const pts=(a.chonker?350:130)+Math.floor(Math.min(120,impact/8)); score+=pts*combo; combo=Math.min(12,combo+1); bestCombo=Math.max(bestCombo,combo); comboTimer=2.1;
    floaters.push({x:a.x,y:a.y-22,text:`+${pts*(combo-1||1)}`,life:.9}); addImpact(a.x,a.y,a.chonker||impact>650); beep('cat'); if(combo===5)showToast('CAT-ASTROPHE x5'); updateHud();
  }
  function addImpact(x,y,strong=false){ const n=strong?20:10; for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=70+Math.random()*(strong?280:150);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-80,life:.35+Math.random()*.45,max:.8,size:3+Math.random()*8});} shake=Math.max(shake,strong?14:7); }
  function updateActors(dt){
    for(const a of actors){
      if(a.dead)continue; a.bob+=dt*7;
      if(a.kind==='friendly'){
        if(a.bonked){ a.vy+=700*dt; a.y+=a.vy*dt; a.x+=a.speed*.35*dt; a.spin+=dt*4; if(a.y>GROUND+110){a.dead=true;resolveActor(a);} }
        else {a.x+=a.speed*dt; if(a.x>1880){friendliesSafe++;a.dead=true;resolveActor(a);showToast('EVAC CAT SAFE +100',500);score+=100;updateHud();}}
      }else{
        a.x-=a.speed*dt; a.y=GROUND-29*a.scale;
        if(a.x<DEFENSE_X){breaches++;health--;combo=1;comboTimer=0;a.dead=true;resolveActor(a);showToast('DEFENSE BREACH!');beep('hurt');shake=12;updateHud();if(health<=0)endGame();}
      }
    }
  }
  function updateMission(dt){
    if(gameOver||missionComplete)return;
    if(currentWave<0){intermission-=dt;if(intermission<=0)startWave();return;}
    const s=LEVEL.waves[currentWave], total=s.infected+s.friendly;
    if(spawned<total){spawnTimer-=dt;if(spawnTimer<=0){spawnActor(queue[spawned]);spawnTimer=s.gap;}return;}
    if(resolved<total||actors.some(a=>!a.dead))return;
    if(currentWave<2){if(!clearAnnounced){clearAnnounced=true;intermission=1.5;showToast(`WAVE ${currentWave+1} CLEAR`,800);return;} intermission-=dt;if(intermission<=0)startWave();return;}
    finishTimer+=dt;if(finishTimer>.75)completeMission();
  }
  function completeMission(){ if(missionComplete)return;missionComplete=true;running=false;aim=null;showToast('EVACUATION ROUTE SECURED',1300);beep('win');const stars=1+(breaches===0?1:0)+(friendlyBonks===0?1:0);resultStarsEl.textContent='★'.repeat(stars)+'☆'.repeat(3-stars);resultScoreEl.textContent=score.toLocaleString();resultCatsEl.textContent=String(infectedFlattened);resultSafeEl.textContent=String(friendliesSafe);resultBonksEl.textContent=String(friendlyBonks);resultComboEl.textContent=`x${bestCombo}`;resultDefenseEl.textContent=breaches===0?'UNTOUCHED':`${health}/5 HEARTS`;setTimeout(()=>missionCompleteScreen.classList.add('visible'),850); }
  function endGame(){running=false;gameOver=true;aim=null;finalScoreEl.textContent=`Score: ${score.toLocaleString()} · Friendly bonks: ${friendlyBonks}`;gameOverScreen.classList.add('visible');}

  function getHeldTankPosition(){return !aim||tank.flying?{x:tank.x,y:tank.y}:{x:aim.x,y:Math.min(aim.y,GROUND-40)};}
  function throwTank(){if(!aim||tank.flying||!running)return;const dx=tank.x-aim.x,dy=tank.y-aim.y,p=Math.hypot(dx,dy);if(p<18){aim=null;return;}const sc=Math.min(p,MAX_PULL)/p,boost=steroidTimer>0?1.42:1,held=getHeldTankPosition();Object.assign(tank,{x:held.x,y:held.y,vx:dx*sc*4.05*boost,vy:dy*sc*4.05*boost,angular:Math.min(9,2+p/55),flying:true,bounced:false});tank.hitIds.clear();tank.hitBarricades.clear();aim=null;johnny.releaseTimer=.28;addImpact(142,GROUND-8,false);beep('throw');if(navigator.vibrate)navigator.vibrate(20);}
  function updateTank(dt){
    if(!tank.flying)return; const prevY=tank.y; tank.vy+=GRAVITY*dt;tank.x+=tank.vx*dt;tank.y+=tank.vy*dt;tank.angle+=tank.angular*dt; const impact=Math.hypot(tank.vx,tank.vy);
    for(let i=0;i<BARRICADES.length;i++){const b=BARRICADES[i];if(tank.hitBarricades.has(i))continue;if(tank.vy>0&&prevY<GROUND-b.h-18&&tank.y>=GROUND-b.h-18&&tank.x>b.x-b.w/2-35&&tank.x<b.x+b.w/2+35){tank.y=GROUND-b.h-18;tank.vy*=-.46;tank.vx*=.88;tank.hitBarricades.add(i);floaters.push({x:tank.x,y:tank.y-20,text:'BANK!',life:.65});beep('impact');}}
    for(const a of actors){if(a.dead||tank.hitIds.has(a.id))continue;const r=(a.kind==='friendly'?34:37+25*a.scale);if(Math.hypot(tank.x-a.x,tank.y-a.y)<r){tank.hitIds.add(a.id);if(a.kind==='friendly'){bonkFriendly(a,impact);tank.vx*=.9;tank.vy*=.92;}else{const dmg=(steroidTimer>0?2:1)+(impact>760?1:0);a.hp-=dmg;tank.vx*=.86;tank.vy*=.9;addImpact(a.x,a.y,dmg>1);if(a.hp<=0)flattenInfected(a,impact);else{floaters.push({x:a.x,y:a.y-35,text:'BONK!',life:.7});beep('impact');}}}}
    if(tank.y>=GROUND-22){tank.y=GROUND-22;if(Math.abs(tank.vy)>160&&!tank.bounced){tank.vy*=-.30;tank.vx*=.74;tank.angular*=.65;tank.bounced=true;addImpact(tank.x,tank.y+15,true);beep('impact');}else{tank.vy=0;tank.vx*=Math.pow(.055,dt);tank.angular*=Math.pow(.03,dt);}}
    if(tank.x<-260||(tank.y>=GROUND-23&&Math.abs(tank.vx)<14)){tank.resetTimer+=dt;if(tank.resetTimer>.65)resetTank();}else tank.resetTimer=0;
  }
  function update(dt){if(!running){cameraX=updateCamera(cameraX,tank,aim,running,dt);updateJohnny(johnny,tank,aim,running,dt);return;}elapsed+=dt;if(steroidTimer>0)steroidTimer=Math.max(0,steroidTimer-dt);if(comboTimer>0){comboTimer-=dt;if(comboTimer<=0&&combo!==1){combo=1;updateHud();}}updateMission(dt);updateActors(dt);updateTank(dt);for(const p of particles){p.life-=dt;p.vy+=420*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}for(const f of floaters){f.life-=dt;f.y-=48*dt;}for(let i=actors.length-1;i>=0;i--)if(actors[i].dead)actors.splice(i,1);for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);for(let i=floaters.length-1;i>=0;i--)if(floaters[i].life<=0)floaters.splice(i,1);shake*=Math.pow(.002,dt);cameraX=updateCamera(cameraX,tank,aim,running,dt);updateJohnny(johnny,tank,aim,running,dt);}

  function drawBackground(){
    const sky=ctx.createLinearGradient(0,0,0,GROUND);sky.addColorStop(0,'#27374e');sky.addColorStop(.65,'#7b7881');sky.addColorStop(1,'#b08369');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    const px=cameraX*.12;for(let i=-2;i<12;i++){const x=i*175-(px%175),h=190+pseudoRandom(i,2)*210;ctx.fillStyle=i%2?'#394354':'#323b49';ctx.fillRect(x,GROUND-h,145,h);ctx.fillStyle='rgba(255,220,140,.10)';for(let y=GROUND-h+30;y<GROUND-40;y+=48)if(pseudoRandom(i+y,4)>.55)ctx.fillRect(x+28,y,18,22);}
    ctx.fillStyle='#55504b';ctx.fillRect(0,GROUND,W,H-GROUND);ctx.fillStyle='#6c655e';ctx.fillRect(0,GROUND,W,7);
    const roadOffset=-(((cameraX%120)+120)%120);ctx.fillStyle='rgba(255,255,255,.16)';for(let x=roadOffset;x<W+120;x+=120)ctx.fillRect(x,GROUND+62,62,5);
    const busX=((elapsed*55-cameraX*.25)%(W+500))-220;ctx.fillStyle='#dfb93f';ctx.fillRect(busX,GROUND-105,210,72);ctx.fillStyle='#242b34';for(let i=0;i<5;i++)ctx.fillRect(busX+18+i*36,GROUND-92,25,24);ctx.fillStyle='#15191e';ctx.beginPath();ctx.arc(busX+42,GROUND-27,16,0,Math.PI*2);ctx.arc(busX+170,GROUND-27,16,0,Math.PI*2);ctx.fill();
  }
  function drawBarricades(){for(const b of BARRICADES){ctx.fillStyle='#db7b2e';ctx.fillRect(b.x-b.w/2,GROUND-b.h,b.w,b.h);ctx.fillStyle='#f0d16b';for(let x=b.x-b.w/2+6;x<b.x+b.w/2-8;x+=28)ctx.fillRect(x,GROUND-b.h+10,16,b.h-20);ctx.fillStyle='#2d3137';ctx.fillRect(b.x-b.w/2-10,GROUND-7,b.w+20,7);}}
  function drawActor(a){ctx.save();ctx.translate(a.x,a.y+Math.sin(a.bob)*2);if(a.kind==='friendly'&&a.bonked)ctx.rotate(a.spin*.15);ctx.scale(a.scale,a.scale);if(a.kind==='friendly'){ctx.fillStyle=a.color;ctx.beginPath();ctx.ellipse(0,0,28,19,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(-20,-16,18,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-34,-29);ctx.lineTo(-31,-45);ctx.lineTo(-21,-31);ctx.fill();ctx.beginPath();ctx.moveTo(-10,-31);ctx.lineTo(-2,-44);ctx.lineTo(1,-27);ctx.fill();ctx.strokeStyle='#e6534f';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-28,4);ctx.lineTo(17,4);ctx.stroke();ctx.fillStyle='#222';ctx.beginPath();ctx.arc(-26,-17,3,0,Math.PI*2);ctx.arc(-15,-17,3,0,Math.PI*2);ctx.fill();}else{ctx.fillStyle=a.chonker?'#3e3344':'#554358';ctx.beginPath();ctx.ellipse(0,0,31,22,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(-22,-18,20,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-38,-31);ctx.lineTo(-34,-50);ctx.lineTo(-22,-35);ctx.fill();ctx.beginPath();ctx.moveTo(-12,-35);ctx.lineTo(-4,-49);ctx.lineTo(0,-29);ctx.fill();ctx.strokeStyle='#6fdf78';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(24,-5);ctx.quadraticCurveTo(48,-28,55,-10);ctx.stroke();ctx.fillStyle=a.hp<a.maxHp?'#ffe34e':'#77ff62';ctx.beginPath();ctx.arc(-29,-20,4,0,Math.PI*2);ctx.arc(-17,-20,4,0,Math.PI*2);ctx.fill();}ctx.restore();}
  function render(){ctx.clearRect(0,0,W,H);ctx.save();if(shake>.4)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);drawBackground();ctx.save();ctx.translate(-cameraX,0);drawBarricades();drawJohnny(ctx,johnny,steroidTimer,elapsed);drawAim(ctx,tank,aim,steroidTimer);if(aim&&!tank.flying&&running){const h=getHeldTankPosition();drawTank(ctx,{...tank,x:h.x,y:h.y,angle:-.08});}else drawTank(ctx,tank);for(const a of actors)drawActor(a);for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle='#ffd85a';ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);}ctx.globalAlpha=1;for(const f of floaters){ctx.globalAlpha=Math.max(0,f.life/.9);ctx.fillStyle='#fff4a5';ctx.font='900 23px Impact, system-ui, sans-serif';ctx.textAlign='center';ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;ctx.textAlign='left';ctx.restore();if(steroidTimer>0&&running){ctx.fillStyle='rgba(168,255,88,.10)';ctx.fillRect(0,0,W,H);}ctx.restore();}
  function frame(now){const dt=Math.min((now-lastTime)/1000,.033);lastTime=now;update(dt);render();requestAnimationFrame(frame);}

  canvas.addEventListener('pointerdown',e=>{if(!running||tank.flying||gameOver||missionComplete)return;const p=pointerToWorld(canvas,e,cameraX);if(Math.hypot(p.x-tank.x,p.y-tank.y)<105){aim=p;canvas.setPointerCapture?.(e.pointerId);}});
  canvas.addEventListener('pointermove',e=>{if(!aim||tank.flying)return;const p=pointerToWorld(canvas,e,cameraX),dx=p.x-tank.x,dy=p.y-tank.y,len=Math.hypot(dx,dy);aim=len>MAX_PULL?{x:tank.x+dx/len*MAX_PULL,y:tank.y+dy/len*MAX_PULL}:p;});
  canvas.addEventListener('pointerup',()=>throwTank()); canvas.addEventListener('pointercancel',()=>{aim=null;});
  steroidButton.addEventListener('click',()=>{if(!running||steroidsLeft<=0)return;steroidsLeft--;steroidTimer=12;steroidCountEl.textContent=steroidsLeft===1?'1 demo dose':`${steroidsLeft} demo doses`;steroidButton.disabled=steroidsLeft<=0;showToast('UNREGULATED STRENGTH!');beep('power');});
  muteButton.addEventListener('click',()=>{muted=!muted;muteButton.textContent=muted?'🔇':'🔊';});
  document.getElementById('start').addEventListener('click',()=>{titleScreen.classList.remove('visible');resetGame();beep('power');});
  document.getElementById('restart').addEventListener('click',()=>{gameOverScreen.classList.remove('visible');resetGame();});
  document.getElementById('replay').addEventListener('click',()=>{missionCompleteScreen.classList.remove('visible');resetGame();});
  updateHud();render();requestAnimationFrame(frame);
})();