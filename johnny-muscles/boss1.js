(() => {
  'use strict';
  const S=window.JMShared;
  if(!S) throw new Error('campaign-shared.js must load before boss1.js');
  const {W,H,GROUND,TANK_HOME,MAX_PULL,clamp,pseudoRandom,pointerToWorld,drawTank,drawJohnny,drawAim,updateCamera,updateJohnny}=S;
  const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
  const scoreEl=document.getElementById('score'),healthEl=document.getElementById('health'),bossHpEl=document.getElementById('boss-hp'),catchEl=document.getElementById('catches');
  const steroidButton=document.getElementById('steroids'),steroidCountEl=document.getElementById('steroid-count'),muteButton=document.getElementById('mute');
  const titleScreen=document.getElementById('title-screen'),gameOverScreen=document.getElementById('game-over'),victoryScreen=document.getElementById('mission-complete'),finalScoreEl=document.getElementById('final-score'),toastEl=document.getElementById('toast');
  const resultStarsEl=document.getElementById('result-stars'),resultScoreEl=document.getElementById('result-score'),resultHitsEl=document.getElementById('result-hits'),resultCatchesEl=document.getElementById('result-catches'),resultMissesEl=document.getElementById('result-misses'),resultDefenseEl=document.getElementById('result-defense');

  const BOSS_MAX_HP=12;
  const CATCH_POINT={x:205,y:GROUND-120};
  const CATCH_START_RADIUS=180;
  const CATCH_SECURE_RADIUS=110;
  const CATCH_HOLD_TIME=.16;
  const CAUGHT_TANK_POS={x:235,y:GROUND-180};
  let lastTime=performance.now(),running=false,gameOver=false,victory=false,score=0,health=5,bossHealth=BOSS_MAX_HP,bossPhase=1,bossX=1050,bossDir=1,bossHitFlash=0;
  let elapsed=0,steroidsLeft=3,steroidTimer=0,muted=false,audioCtx=null,aim=null,shake=0,cameraX=0,toastTimer=null;
  let attackTimer=2.2,bossWindup=0,firstCatchPrompt=true,catches=0,misses=0,bossHits=0;
  let catchHolding=false,catchPointer=null,caughtTank=false;
  const particles=[],floaters=[];
  const johnny={armAngle:-.75,releaseTimer:0,torsoLean:0,squat:0,catchPose:0};
  const tank={x:TANK_HOME.x,y:TANK_HOME.y,vx:0,vy:0,angle:0,angular:0,flying:false,ready:true,resetTimer:0};
  const incoming={active:false,x:0,y:0,angle:0,startX:0,startY:0,targetX:165,targetY:GROUND-95,speed:430,holdTime:0};
  function incomingInCatchWindow(){return incoming.active&&Math.hypot(incoming.x-CATCH_POINT.x,incoming.y-CATCH_POINT.y)<=CATCH_START_RADIUS;}
  window.JMShouldBypassGrabProxy = p => incomingInCatchWindow() && Math.hypot(p.x - incoming.x, p.y - incoming.y) < 125;

  function showToast(text,duration=900){toastEl.textContent=text;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),duration);}
  function beep(type='impact'){if(muted)return;try{if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain(),n=audioCtx.currentTime,s={throw:[90,52,.12,'sawtooth'],impact:[72,38,.09,'square'],catch:[220,660,.22,'triangle'],boss:[80,46,.18,'sawtooth'],hurt:[120,70,.22,'square'],win:[330,880,.5,'triangle'],power:[160,420,.25,'sawtooth'],warning:[180,260,.25,'square']}[type]||[120,80,.1,'sine'];o.type=s[3];o.frequency.setValueAtTime(s[0],n);o.frequency.exponentialRampToValueAtTime(s[1],n+s[2]);g.gain.setValueAtTime(.065,n);g.gain.exponentialRampToValueAtTime(.001,n+s[2]);o.connect(g).connect(audioCtx.destination);o.start(n);o.stop(n+s[2]);}catch(_){} }
  function phaseForHp(){return bossHealth>8?1:bossHealth>4?2:3;}
  function phaseSettings(){return bossPhase===1?{speed:430,cooldown:2.55,windup:.9}:bossPhase===2?{speed:500,cooldown:2.05,windup:.7}:{speed:575,cooldown:1.6,windup:.52};}
  function updateHud(){scoreEl.textContent=String(score).padStart(6,'0');healthEl.textContent=Array.from({length:5},(_,i)=>i<health?'♥':'♡').join(' ');bossHpEl.textContent='■'.repeat(Math.max(0,bossHealth))+'□'.repeat(Math.max(0,BOSS_MAX_HP-bossHealth));catchEl.textContent=String(catches);}
  function resetPlayerTank(ready){caughtTank=false;Object.assign(tank,{x:TANK_HOME.x,y:TANK_HOME.y,vx:0,vy:0,angle:0,angular:0,flying:false,ready,resetTimer:0});aim=null;johnny.releaseTimer=0;}
  function holdCaughtTank(){caughtTank=true;Object.assign(tank,{x:CAUGHT_TANK_POS.x,y:CAUGHT_TANK_POS.y,vx:0,vy:0,angle:-.08,angular:0,flying:false,ready:true,resetTimer:0});aim=null;johnny.releaseTimer=0;johnny.catchPose=.18;}
  function resetFight(){running=true;gameOver=false;victory=false;score=0;health=5;bossHealth=BOSS_MAX_HP;bossPhase=1;bossX=1050;bossDir=1;bossHitFlash=0;elapsed=0;steroidsLeft=3;steroidTimer=0;aim=null;shake=0;cameraX=0;attackTimer=2.2;bossWindup=0;firstCatchPrompt=true;catches=0;misses=0;bossHits=0;catchHolding=false;catchPointer=null;incoming.active=false;particles.length=0;floaters.length=0;Object.assign(johnny,{armAngle:-.75,releaseTimer:0,torsoLean:0,squat:0,catchPose:0});resetPlayerTank(true);steroidButton.disabled=false;steroidCountEl.textContent='3 demo doses';updateHud();showToast('BOSS 1: SEARGENT BOB THE BOBCAT',1400);}
  function addImpact(x,y,strong=false){for(let i=0;i<(strong?28:14);i++){const a=Math.random()*Math.PI*2,s=80+Math.random()*(strong?340:180);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-90,life:.4+Math.random()*.5,max:.9,size:3+Math.random()*10});}shake=Math.max(shake,strong?18:8);}
  function getHeld(){return !aim||tank.flying?{x:tank.x,y:tank.y}:{x:aim.x,y:Math.min(aim.y,GROUND-40)};}
  function throwPlayerTank(){if(!aim||tank.flying||!tank.ready||!running)return;const dx=tank.x-aim.x,dy=tank.y-aim.y,p=Math.hypot(dx,dy);if(p<18){aim=null;return;}const sc=Math.min(p,MAX_PULL)/p,b=steroidTimer>0?1.42:1,h=getHeld();caughtTank=false;Object.assign(tank,{x:h.x,y:h.y,vx:dx*sc*4.05*b,vy:dy*sc*4.05*b,angular:Math.min(9,2+p/55),flying:true,ready:false});aim=null;johnny.releaseTimer=.28;beep('throw');if(navigator.vibrate)navigator.vibrate(20);}
  function resolvePlayerShot(hitBoss=false){tank.flying=false;tank.ready=false;aim=null;if(!victory&&!gameOver){attackTimer=phaseSettings().cooldown;bossWindup=0;}if(!hitBoss)showToast('MISS! BOB FOUND ANOTHER TANK.',650);}
  function hitBob(impact){const damage=1+(impact>780?1:0)+(steroidTimer>0?1:0);bossHealth=Math.max(0,bossHealth-damage);bossHits++;score+=350*damage;bossHitFlash=.24;addImpact(bossX,GROUND-150,true);floaters.push({x:bossX,y:GROUND-235,text:`BOB -${damage}`,life:.9});beep('boss');shake=18;const old=bossPhase;bossPhase=phaseForHp();if(bossPhase!==old){showToast(bossPhase===2?'BOB IS ANGRY. STILL NOT SMART.':'BOB HAS ENTERED MAXIMUM BOB.',1200);beep('warning');}updateHud();resolvePlayerShot(true);if(bossHealth<=0)winFight();}
  function updatePlayerTank(dt){if(!tank.flying)return;tank.vy+=880*dt;tank.x+=tank.vx*dt;tank.y+=tank.vy*dt;tank.angle+=tank.angular*dt;const impact=Math.hypot(tank.vx,tank.vy);if(Math.hypot(tank.x-bossX,tank.y-(GROUND-145))<125){hitBob(impact);return;}if(tank.y>=GROUND-22){tank.y=GROUND-22;tank.vy*=-.22;tank.vx*=.64;tank.angular*=.55;if(Math.abs(tank.vx)<45){tank.resetTimer+=dt;if(tank.resetTimer>.35)resolvePlayerShot(false);}}if(tank.x>1700||tank.x<-260)resolvePlayerShot(false);}

  function beginBossWindup(){if(incoming.active||tank.ready||tank.flying||victory||gameOver)return;bossWindup=phaseSettings().windup;beep('warning');}
  function spawnIncoming(){const ps=phaseSettings();incoming.active=true;incoming.startX=bossX-30;incoming.startY=GROUND-128;incoming.x=incoming.startX;incoming.y=incoming.startY;incoming.angle=0;incoming.speed=ps.speed;incoming.holdTime=0;catchHolding=false;catchPointer=null;if(firstCatchPrompt){firstCatchPrompt=false;showToast('CATCH THE TANK! (tap and hold it as it comes to you)',2300);}else showToast('BOB THREW A TANK!',650);beep('throw');}
  function catchTank(){incoming.active=false;catchHolding=false;catchPointer=null;catches++;score+=250;holdCaughtTank();showToast('CAUGHT! RETURN TO SENDER!',1050);beep('catch');shake=8;updateHud();}
  function missIncoming(){incoming.active=false;catchHolding=false;catchPointer=null;misses++;health--;shake=20;addImpact(175,GROUND-90,true);showToast('TANKED! HOLD IT NEXT TIME!',1100);beep('hurt');updateHud();if(health<=0){loseFight();return;}attackTimer=phaseSettings().cooldown*.72;}
  function updateIncoming(dt){if(!incoming.active)return;const total=Math.max(1,incoming.startX-incoming.targetX);incoming.x-=incoming.speed*dt;const t=clamp((incoming.startX-incoming.x)/total,0,1);incoming.y=incoming.startY+(incoming.targetY-incoming.startY)*t-Math.sin(Math.PI*t)*112;incoming.angle-=dt*5.4;if(catchHolding){incoming.holdTime+=dt;const catchDistance=Math.hypot(incoming.x-CATCH_POINT.x,incoming.y-CATCH_POINT.y);if(incoming.holdTime>=CATCH_HOLD_TIME&&catchDistance<=CATCH_SECURE_RADIUS){catchTank();return;}}if(incoming.x<155)missIncoming();}
  function updateBoss(dt){if(victory||gameOver)return;bossHitFlash=Math.max(0,bossHitFlash-dt);bossX+=bossDir*(bossPhase===3?42:28)*dt;if(bossX>1140){bossX=1140;bossDir=-1;}if(bossX<940){bossX=940;bossDir=1;}if(tank.ready||tank.flying||incoming.active)return;if(bossWindup>0){bossWindup-=dt;if(bossWindup<=0)spawnIncoming();return;}attackTimer-=dt;if(attackTimer<=0)beginBossWindup();}
  function loseFight(){running=false;gameOver=true;aim=null;finalScoreEl.textContent=`Bob HP: ${bossHealth}/${BOSS_MAX_HP} · Catches: ${catches} · Missed: ${misses}`;gameOverScreen.classList.add('visible');}
  function winFight(){if(victory)return;victory=true;running=false;aim=null;incoming.active=false;showToast('SEARGENT BOB DEFEATED!',1600);beep('win');const stars=1+(catches>=4?1:0)+(misses===0?1:0);resultStarsEl.textContent='★'.repeat(stars)+'☆'.repeat(3-stars);resultScoreEl.textContent=score.toLocaleString();resultHitsEl.textContent=String(bossHits);resultCatchesEl.textContent=String(catches);resultMissesEl.textContent=String(misses);resultDefenseEl.textContent=misses===0?'UNTOUCHED':`${health}/5 HEARTS`;setTimeout(()=>victoryScreen.classList.add('visible'),950);}

  function update(dt){if(!running){cameraX=updateCamera(cameraX,tank,aim,running,dt);if(caughtTank&&tank.ready&&!aim)johnny.catchPose=Math.max(johnny.catchPose,.08);updateJohnny(johnny,tank,aim,running,dt);return;}elapsed+=dt;if(steroidTimer>0)steroidTimer=Math.max(0,steroidTimer-dt);updateBoss(dt);updateIncoming(dt);updatePlayerTank(dt);for(const p of particles){p.life-=dt;p.vy+=420*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}for(const f of floaters){f.life-=dt;f.y-=48*dt;}for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);for(let i=floaters.length-1;i>=0;i--)if(floaters[i].life<=0)floaters.splice(i,1);shake*=Math.pow(.002,dt);cameraX=updateCamera(cameraX,tank,aim,running,dt);if(caughtTank&&tank.ready&&!aim)johnny.catchPose=Math.max(johnny.catchPose,.08);updateJohnny(johnny,tank,aim,running,dt);}

  function drawBackground(){const sky=ctx.createLinearGradient(0,0,0,GROUND);sky.addColorStop(0,'#171a28');sky.addColorStop(.65,'#494757');sky.addColorStop(1,'#8d6154');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);for(let i=-2;i<10;i++){const x=i*185-(cameraX*.1%185),h=220+pseudoRandom(i,4)*200;ctx.fillStyle=i%2?'#272d37':'#30343e';ctx.fillRect(x,GROUND-h,150,h);}ctx.fillStyle='#403936';ctx.fillRect(0,GROUND,W,H-GROUND);ctx.fillStyle='#615650';ctx.fillRect(0,GROUND,W,7);}
  function drawArena(){for(let x=520;x<1850;x+=420){ctx.fillStyle='#2a2e35';ctx.fillRect(x,GROUND-260,310,260);ctx.fillStyle='rgba(255,214,120,.10)';for(let wx=x+30;wx<x+280;wx+=60)for(let wy=GROUND-220;wy<GROUND-45;wy+=62)if(pseudoRandom(wx+wy,3)>.52)ctx.fillRect(wx,wy,20,26);}ctx.fillStyle='#59664b';for(let i=0;i<4;i++){ctx.save();ctx.translate(1220+i*92,GROUND-34);ctx.rotate((i-1.5)*.12);ctx.fillRect(-38,-12,76,25);ctx.fillStyle='#171b18';ctx.fillRect(-42,10,84,15);ctx.restore();ctx.fillStyle='#59664b';}}
  function drawBob(){
    ctx.save();
    ctx.translate(bossX,GROUND-45);
    const flash=bossHitFlash>0;
    const skin=flash?'#f4bd8e':'#b78155';
    const skinLight=flash?'#ffe0b6':'#cf986b';
    const skinDark=flash?'#d99d76':'#855437';
    const fur='#8a5c42';
    const furDark='#55392d';
    const olive='#354535';
    const oliveDark='#202821';
    const oliveLight='#52674a';
    const ink='#1a1717';
    ctx.scale(1.6,1.6);

    // Ground shadow: broad enough to sell Bob's planted, heavyweight stance.
    ctx.save();
    ctx.globalAlpha=.34;
    ctx.fillStyle='#090a0b';
    ctx.beginPath();
    ctx.ellipse(0,13,73,15,0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();

    // Heavy boots and thick trouser legs.
    ctx.fillStyle=oliveDark;
    ctx.beginPath();ctx.roundRect(-61,-27,48,39,13);ctx.fill();
    ctx.beginPath();ctx.roundRect(13,-27,48,39,13);ctx.fill();
    ctx.fillStyle='#121514';
    ctx.beginPath();ctx.roundRect(-68,0,57,18,7);ctx.fill();
    ctx.beginPath();ctx.roundRect(11,0,57,18,7);ctx.fill();
    ctx.fillStyle='#596058';
    ctx.fillRect(-62,4,44,4);ctx.fillRect(18,4,44,4);

    // Arms first so the torso overlaps the shoulder roots naturally.
    ctx.strokeStyle=skin;
    ctx.lineWidth=31;
    ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-61,-110);ctx.quadraticCurveTo(-82,-88,-86,-48);ctx.stroke();
    ctx.beginPath();ctx.moveTo(61,-110);ctx.quadraticCurveTo(82,-88,86,-48);ctx.stroke();
    ctx.strokeStyle=skinLight;
    ctx.lineWidth=7;
    ctx.globalAlpha=.42;
    ctx.beginPath();ctx.moveTo(-70,-104);ctx.quadraticCurveTo(-83,-82,-84,-60);ctx.stroke();
    ctx.beginPath();ctx.moveTo(70,-104);ctx.quadraticCurveTo(83,-82,84,-60);ctx.stroke();
    ctx.globalAlpha=1;

    // Fingerless gloves / enormous fists.
    ctx.fillStyle=oliveDark;
    ctx.beginPath();ctx.ellipse(-87,-42,19,17,-.12,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(87,-42,19,17,.12,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#687366';ctx.lineWidth=3;
    for(const x of [-94,-87,-80]){ctx.beginPath();ctx.moveTo(x,-49);ctx.lineTo(x+1,-38);ctx.stroke();}
    for(const x of [80,87,94]){ctx.beginPath();ctx.moveTo(x,-49);ctx.lineTo(x-1,-38);ctx.stroke();}

    // Barrel torso: huge shoulders and chest taper into a round powerlifter belly.
    ctx.fillStyle=skin;
    ctx.beginPath();
    ctx.moveTo(-44,-133);
    ctx.bezierCurveTo(-70,-132,-78,-116,-75,-94);
    ctx.bezierCurveTo(-72,-78,-69,-62,-64,-45);
    ctx.bezierCurveTo(-58,-25,-38,-16,0,-16);
    ctx.bezierCurveTo(38,-16,58,-25,64,-45);
    ctx.bezierCurveTo(69,-62,72,-78,75,-94);
    ctx.bezierCurveTo(78,-116,70,-132,44,-133);
    ctx.bezierCurveTo(29,-139,18,-142,0,-142);
    ctx.bezierCurveTo(-18,-142,-29,-139,-44,-133);
    ctx.closePath();ctx.fill();

    // Traps and bull neck.
    ctx.fillStyle=skinDark;
    ctx.beginPath();
    ctx.moveTo(-42,-133);ctx.quadraticCurveTo(-25,-151,-17,-154);
    ctx.lineTo(17,-154);ctx.quadraticCurveTo(25,-151,42,-133);
    ctx.quadraticCurveTo(20,-139,0,-137);ctx.quadraticCurveTo(-20,-139,-42,-133);ctx.fill();
    ctx.fillStyle=skin;
    ctx.beginPath();ctx.roundRect(-21,-162,42,34,15);ctx.fill();

    // Pecs. Defined, but still sitting on a thick torso instead of a bodybuilder V taper.
    ctx.fillStyle=skinLight;
    ctx.globalAlpha=.34;
    ctx.beginPath();ctx.ellipse(-27,-111,31,20,-.08,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(27,-111,31,20,.08,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
    ctx.strokeStyle=skinDark;ctx.lineWidth=3.5;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-55,-112);ctx.quadraticCurveTo(-28,-125,-3,-111);ctx.stroke();
    ctx.beginPath();ctx.moveTo(3,-111);ctx.quadraticCurveTo(28,-125,55,-112);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,-127);ctx.lineTo(0,-101);ctx.stroke();

    // "Fat with abs": definition rides over the round belly rather than flattening it.
    ctx.strokeStyle='#8b593d';ctx.lineWidth=3;ctx.globalAlpha=.8;
    ctx.beginPath();ctx.moveTo(0,-95);ctx.quadraticCurveTo(-2,-69,0,-39);ctx.stroke();
    for(const y of [-88,-72,-56]){
      ctx.beginPath();ctx.moveTo(-26,y);ctx.quadraticCurveTo(-12,y-5,-4,y);ctx.stroke();
      ctx.beginPath();ctx.moveTo(4,y);ctx.quadraticCurveTo(12,y-5,26,y);ctx.stroke();
    }
    ctx.globalAlpha=1;
    ctx.fillStyle=skinLight;ctx.globalAlpha=.22;
    ctx.beginPath();ctx.ellipse(0,-48,45,26,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;

    // Military harness, belt and unit tattoo. Canadian without turning him into a flag costume.
    ctx.strokeStyle=olive;ctx.lineWidth=8;
    ctx.beginPath();ctx.moveTo(-45,-126);ctx.lineTo(-39,-72);ctx.stroke();
    ctx.beginPath();ctx.moveTo(45,-126);ctx.lineTo(39,-72);ctx.stroke();
    ctx.fillStyle=oliveDark;ctx.fillRect(-63,-36,126,14);
    ctx.fillStyle='#a59055';ctx.fillRect(-10,-38,20,18);
    ctx.fillStyle=oliveLight;ctx.beginPath();ctx.roundRect(42,-118,18,22,4);ctx.fill();
    ctx.fillStyle='#b23b35';ctx.font='900 8px system-ui, sans-serif';ctx.textAlign='center';ctx.fillText('CA',51,-103);
    ctx.save();ctx.translate(-39,-91);ctx.rotate(-.18);ctx.fillStyle='#6c3f31';ctx.font='900 11px Impact, system-ui, sans-serif';ctx.textAlign='center';ctx.fillText('13bn',0,0);ctx.restore();

    // Bobcat head with wide jaw, cheek ruffs and unmistakable ear tufts.
    ctx.fillStyle=furDark;
    ctx.beginPath();ctx.moveTo(-38,-178);ctx.lineTo(-55,-205);ctx.lineTo(-27,-188);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(30,-188);ctx.lineTo(53,-207);ctx.lineTo(43,-175);ctx.closePath();ctx.fill();
    ctx.fillStyle=fur;
    ctx.beginPath();ctx.moveTo(-36,-177);ctx.lineTo(-48,-198);ctx.lineTo(-24,-184);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(28,-185);ctx.lineTo(47,-199);ctx.lineTo(40,-173);ctx.closePath();ctx.fill();
    ctx.fillStyle=skinLight;
    ctx.beginPath();
    ctx.ellipse(-3,-166,43,38,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.moveTo(-39,-160);ctx.lineTo(-55,-151);ctx.lineTo(-38,-145);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(34,-160);ctx.lineTo(53,-151);ctx.lineTo(35,-144);ctx.closePath();ctx.fill();

    // Field cap sits between the ears.
    ctx.fillStyle=olive;
    ctx.beginPath();ctx.ellipse(-4,-193,39,12,-.03,Math.PI,0);ctx.fill();
    ctx.beginPath();ctx.roundRect(-42,-197,74,12,5);ctx.fill();
    ctx.fillStyle=oliveDark;ctx.beginPath();ctx.ellipse(-2,-185,37,7,0,0,Math.PI);ctx.fill();
    ctx.fillStyle='#9b873e';ctx.fillRect(-8,-198,8,7);

    // Brow, eyes and muzzle. The brow steepens as Bob gets angrier.
    const browDrop=bossPhase===1?0:bossPhase===2?2:4;
    ctx.strokeStyle=ink;ctx.lineWidth=5;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-28,-172+browDrop);ctx.lineTo(-10,-168);ctx.stroke();
    ctx.beginPath();ctx.moveTo(20,-172+browDrop);ctx.lineTo(4,-168);ctx.stroke();
    ctx.fillStyle=bossPhase===3?'#efb44c':'#211d1a';
    ctx.beginPath();ctx.ellipse(-17,-163,4.5,5,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(12,-163,4.5,5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f1d3ac';
    ctx.beginPath();ctx.ellipse(-4,-145,26,18,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#442d28';
    ctx.beginPath();ctx.moveTo(-11,-151);ctx.quadraticCurveTo(-3,-158,5,-151);ctx.quadraticCurveTo(-3,-145,-11,-151);ctx.fill();
    ctx.strokeStyle=furDark;ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(-4,-145);ctx.lineTo(-4,-136);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-19,-136);ctx.quadraticCurveTo(-4,-128,12,-136);ctx.stroke();

    // Cheek stripes and whisker dots keep the bobcat identity readable at game scale.
    ctx.strokeStyle=furDark;ctx.lineWidth=5;
    for(const y of [-171,-159]){
      ctx.beginPath();ctx.moveTo(-36,y);ctx.lineTo(-25,y+5);ctx.stroke();
      ctx.beginPath();ctx.moveTo(31,y);ctx.lineTo(21,y+5);ctx.stroke();
    }
    ctx.fillStyle='#6a4938';
    for(const p of [[-18,-145],[-14,-140],[9,-145],[5,-140]]){ctx.beginPath();ctx.arc(p[0],p[1],1.4,0,Math.PI*2);ctx.fill();}

    // A little scar and tooth make him feel like a recurring nuisance, not a clean mascot.
    ctx.strokeStyle='#7f4c3d';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(24,-158);ctx.lineTo(31,-148);ctx.moveTo(29,-160);ctx.lineTo(34,-154);ctx.stroke();
    ctx.fillStyle='#f4ead6';ctx.beginPath();ctx.moveTo(7,-135);ctx.lineTo(13,-135);ctx.lineTo(10,-128);ctx.closePath();ctx.fill();

    if(bossWindup>0){drawTank(ctx,{x:0,y:-225,angle:-.12},'BOB TANK');}
    ctx.restore();
  }
  function render(){ctx.clearRect(0,0,W,H);ctx.save();if(shake>.4)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);drawBackground();ctx.save();ctx.translate(-cameraX,0);drawArena();drawJohnny(ctx,johnny,steroidTimer,elapsed);drawBob();if(tank.ready){drawAim(ctx,tank,aim,steroidTimer);if(aim&&!tank.flying&&running){const h=getHeld();drawTank(ctx,{...tank,x:h.x,y:h.y,angle:-.08});}else drawTank(ctx,tank);}else if(tank.flying)drawTank(ctx,tank);if(incoming.active){drawTank(ctx,incoming,'INCOMING');if(catchHolding){ctx.strokeStyle='#a8ff58';ctx.lineWidth=7;ctx.beginPath();ctx.arc(incoming.x,incoming.y,72+Math.sin(elapsed*10)*8,0,Math.PI*2);ctx.stroke();}}for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle='#ffd85a';ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);}ctx.globalAlpha=1;for(const f of floaters){ctx.globalAlpha=Math.max(0,f.life/.9);ctx.fillStyle='#fff4a5';ctx.font='900 26px Impact, system-ui, sans-serif';ctx.textAlign='center';ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;ctx.textAlign='left';ctx.restore();ctx.restore();}
  function frame(now){const dt=Math.min((now-lastTime)/1000,.033);lastTime=now;update(dt);render();requestAnimationFrame(frame);}

  canvas.addEventListener('pointerdown',e=>{if(!running||gameOver||victory)return;const p=pointerToWorld(canvas,e,cameraX);if(incoming.active&&Math.hypot(p.x-incoming.x,p.y-incoming.y)<105){if(!incomingInCatchWindow()){showToast('WAIT... LET IT GET CLOSER!',650);return;}catchHolding=true;catchPointer=e.pointerId;incoming.holdTime=0;canvas.setPointerCapture?.(e.pointerId);showToast('HOLD IT...',500);return;}if(tank.ready&&!tank.flying&&Math.hypot(p.x-tank.x,p.y-tank.y)<105){aim=p;canvas.setPointerCapture?.(e.pointerId);}});
  canvas.addEventListener('pointermove',e=>{if(catchHolding&&e.pointerId===catchPointer)return;if(!aim||tank.flying||!tank.ready)return;const p=pointerToWorld(canvas,e,cameraX),dx=p.x-tank.x,dy=p.y-tank.y,l=Math.hypot(dx,dy);aim=l>MAX_PULL?{x:tank.x+dx/l*MAX_PULL,y:tank.y+dy/l*MAX_PULL}:p;});
  canvas.addEventListener('pointerup',e=>{if(catchHolding&&e.pointerId===catchPointer){catchHolding=false;catchPointer=null;if(incoming.active)showToast('KEEP HOLDING UNTIL JOHNNY CATCHES IT!',850);return;}throwPlayerTank();});
  canvas.addEventListener('pointercancel',e=>{if(e.pointerId===catchPointer){catchHolding=false;catchPointer=null;}aim=null;});
  steroidButton.addEventListener('click',()=>{if(!running||steroidsLeft<=0)return;steroidsLeft--;steroidTimer=12;steroidCountEl.textContent=steroidsLeft===1?'1 demo dose':`${steroidsLeft} demo doses`;steroidButton.disabled=steroidsLeft<=0;showToast('UNREGULATED STRENGTH!');beep('power');});muteButton.addEventListener('click',()=>{muted=!muted;muteButton.textContent=muted?'🔇':'🔊';});
  document.getElementById('start').addEventListener('click',()=>{titleScreen.classList.remove('visible');resetFight();beep('warning');});document.getElementById('restart').addEventListener('click',()=>{gameOverScreen.classList.remove('visible');resetFight();});document.getElementById('replay').addEventListener('click',()=>{victoryScreen.classList.remove('visible');resetFight();});
  updateHud();render();requestAnimationFrame(frame);
})();