(() => {
'use strict';
const S=window.JMShared,T=window.JMTankArt,F=window.JMWorld4Fighter;
if(!S||!T||!F) throw new Error('Boss 7 requires shared, tank, and fighter modules');
const {W,H,GROUND,GRAVITY,TANK_HOME,MAX_PULL,pointerToWorld,updateJohnny}=S;
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),$=id=>document.getElementById(id);
const scoreEl=$('score'),healthEl=$('health'),hpEl=$('boss-hp'),vehicleEl=$('vehicle-status'),catchEl=$('catches'),steroidButton=$('steroids'),steroidCountEl=$('steroid-count'),muteButton=$('mute'),titleScreen=$('title-screen'),overScreen=$('game-over'),winScreen=$('mission-complete'),finalScoreEl=$('final-score'),toastEl=$('toast'),rStars=$('result-stars'),rScore=$('result-score'),rHits=$('result-hits'),rCatches=$('result-catches'),rDefense=$('result-defense');
const MAX_HP=20;
let last=performance.now(),running=false,over=false,win=false,score=0,health=5,hp=MAX_HP,elapsed=0,steroids=3,steroidTimer=0,muted=false,audio=null,aim=null,shake=0,toastTimer=null,hits=0,catches=0;
let dinaState='idle',stateTimer=0,stateMax=1,grabClock=3.3,dropX=160,dropVy=0,reachProgress=0,turnProgress=0;
const particles=[],floaters=[];
const hero={armAngle:-.75,releaseTimer:0,torsoLean:0,squat:0,catchPose:0};
const tank={x:TANK_HOME.x,y:TANK_HOME.y,vx:0,vy:0,angle:0,angular:0,flying:false,ready:true,resetTimer:0,bounced:false,hitBoss:false,stolen:false,dropping:false,hitIds:new Set()};
window.JMShouldBypassGrabProxy=(p)=>tank.dropping&&Math.hypot(p.x-tank.x,p.y-tank.y)<210;
function phase(){return hp>15?1:hp>10?2:hp>5?3:4}
function timings(){const p=phase();return p===1?{grab:3.2,reach:1.35,turn:1.15,drop:1}:p===2?{grab:2.8,reach:1.15,turn:1.0,drop:1.08}:p===3?{grab:2.4,reach:.98,turn:.88,drop:1.16}:{grab:2.05,reach:.84,turn:.74,drop:1.24}}
function toast(t,d=950){toastEl.textContent=t;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),d)}
function beep(type='hit'){if(muted)return;try{if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain(),n=audio.currentTime,m={throw:[96,52,.1],hit:[75,42,.1],grab:[170,90,.2],turn:[260,130,.18],drop:[140,70,.2],catch:[220,700,.2],hurt:[120,70,.22],win:[330,930,.5],power:[160,420,.25]}[type]||[120,80,.1];o.type=type==='grab'?'sawtooth':'square';o.frequency.setValueAtTime(m[0],n);o.frequency.exponentialRampToValueAtTime(m[1],n+m[2]);g.gain.setValueAtTime(.055,n);g.gain.exponentialRampToValueAtTime(.001,n+m[2]);o.connect(g).connect(audio.destination);o.start(n);o.stop(n+m[2])}catch{}}
function impact(x,y,strong=false,c='#78e8ff'){for(let i=0;i<(strong?30:13);i++){const a=Math.random()*Math.PI*2,s=70+Math.random()*(strong?330:170);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-90,life:.4+Math.random()*.4,max:.8,size:3+Math.random()*8,c})}shake=Math.max(shake,strong?20:8)}
function hud(){scoreEl.textContent=String(score).padStart(6,'0');healthEl.textContent=Array.from({length:5},(_,i)=>i<health?'♥':'♡').join(' ');hpEl.textContent='■'.repeat(hp)+'□'.repeat(MAX_HP-hp);vehicleEl.textContent=tank.dropping?'FALLING':tank.stolen?'STOLEN':tank.flying?'AIRBORNE':aim?'GRABBED':'READY';catchEl.textContent=String(catches)}
function resetTank(delayGrab=true){Object.assign(tank,{x:TANK_HOME.x,y:TANK_HOME.y,vx:0,vy:0,angle:0,angular:0,flying:false,ready:true,resetTimer:0,bounced:false,hitBoss:false,stolen:false,dropping:false});tank.hitIds.clear();aim=null;dropVy=0;if(delayGrab){dinaState='idle';grabClock=timings().grab}hud()}
function hurt(t){if(over||win)return;health--;shake=22;impact(155,GROUND-88,true,'#ffac7d');toast(t,1050);beep('hurt');hud();if(health<=0){running=false;over=true;finalScoreEl.textContent=`Dina HP: ${hp}/${MAX_HP} · Overhead catches: ${catches}`;overScreen.classList.add('visible')}}
function damageDina(){if(win)return;hp=Math.max(0,hp-1);hits++;score+=900*phase();impact(1005,310,true,'#ffe175');floaters.push({x:1010,y:250,text:'GIANT HIT! -1',life:.9});beep('hit');dinaState='recover';stateTimer=.75;stateMax=.75;grabClock=timings().grab+1;hud();if(hp<=0)finishWin();else if([15,10,5].includes(hp))toast('DINA IS GETTING FASTER. THIS SEEMS UNFAIR.',1200)}
function startReach(){if(!running||tank.flying||!tank.ready||aim||tank.stolen||tank.dropping)return;dinaState='reach';stateMax=timings().reach;stateTimer=stateMax;reachProgress=0;toast(`DINA IS REACHING FOR THE ${F.projectileName}! GRAB IT FIRST!`,1100);beep('grab');hud()}
function abortReach(){if(dinaState!=='reach')return;dinaState='idle';stateTimer=0;reachProgress=0;grabClock=timings().grab;toast(`TOO SLOW, DINA. ${F.shortName} GOT THERE FIRST.`,650)}
function stealTank(){aim=null;tank.ready=false;tank.stolen=true;tank.flying=false;tank.dropping=false;dinaState='lift';stateMax=.88;stateTimer=stateMax;beep('grab');toast(`DINA STOLE THE ${F.projectileName}!`,850);hud()}
function startTurn(){dinaState='turn';stateMax=timings().turn;stateTimer=stateMax;turnProgress=0;toast('DINA TURNS HER BACK...',850);beep('turn');hud()}
function startDrop(){dinaState='drop';stateTimer=0;stateMax=1;turnProgress=1;tank.stolen=false;tank.dropping=true;tank.ready=false;tank.flying=false;dropX=112+Math.random()*116;tank.x=dropX;tank.y=-85;tank.angle=(Math.random()-.5)*.35;dropVy=30;beep('drop');hud()}
function catchDrop(){if(!tank.dropping)return;catches++;score+=500;tank.dropping=false;hero.catchPose=.35;impact(tank.x,tank.y,false,'#fff08a');toast(`CAUGHT! ${F.projectileName} SAVED!`,850);beep('catch');resetTank(true)}
function updateDina(dt){const tm=timings();if(dinaState==='idle'){if(!tank.flying&&tank.ready&&!aim){grabClock-=dt;if(grabClock<=0)startReach()}return}
if(dinaState==='reach'){if(aim){abortReach();return}stateTimer-=dt;reachProgress=1-Math.max(0,stateTimer)/stateMax;if(stateTimer<=0)stealTank();return}
if(dinaState==='lift'){stateTimer-=dt;const p=1-Math.max(0,stateTimer)/stateMax;reachProgress=1-p;tank.x=890+(965-890)*p;tank.y=390+(-110-390)*p;tank.angle=-.15+p*.32;if(stateTimer<=0){tank.y=-120;dinaState='hold';stateMax=.35;stateTimer=.35}return}
if(dinaState==='hold'){stateTimer-=dt;if(stateTimer<=0)startTurn();return}
if(dinaState==='turn'){stateTimer-=dt;turnProgress=1-Math.max(0,stateTimer)/stateMax;if(stateTimer<=0)startDrop();return}
if(dinaState==='drop'){dropVy+=GRAVITY*tm.drop*dt;tank.y+=dropVy*dt;tank.angle+=2.8*dt;if(tank.y>=GROUND-105&&Math.abs(tank.x-155)<125){tank.dropping=false;hurt(`DINA DROPPED THE ${F.projectileName} ON ${F.shortName}!`);resetTank(true);return}if(tank.y>=GROUND-22){tank.dropping=false;impact(tank.x,GROUND-18,true,'#9bb9c8');resetTank(true)}return}
if(dinaState==='recover'){stateTimer-=dt;if(stateTimer<=0){dinaState='idle';grabClock=tm.grab}return}}
function held(){return !aim||tank.flying?{x:tank.x,y:tank.y}:{x:aim.x,y:Math.min(aim.y,GROUND-40)}}
function throwTank(){if(!aim||tank.flying||!tank.ready||!running||tank.stolen||tank.dropping)return;const dx=tank.x-aim.x,dy=tank.y-aim.y,p=Math.hypot(dx,dy);if(p<18){aim=null;return}const sc=Math.min(p,MAX_PULL)/p,b=steroidTimer>0?1.42:1,h=held();Object.assign(tank,{x:h.x,y:h.y,vx:dx*sc*F.throwScale*b,vy:dy*sc*F.throwScale*b,angular:Math.min(9,2+p/55),flying:true,ready:false,resetTimer:0,bounced:false,hitBoss:false});tank.hitIds.clear();aim=null;hero.releaseTimer=.28;dinaState='idle';grabClock=timings().grab;beep('throw');hud()}
function updateTank(dt){if(!tank.flying)return;tank.vy+=GRAVITY*F.gravityMultiplier*dt;tank.x+=tank.vx*dt;tank.y+=tank.vy*dt;tank.angle+=tank.angular*dt;if(!tank.hitBoss&&tank.x>820&&tank.x<1245&&tank.y>45&&tank.y<GROUND-35){tank.hitBoss=true;damageDina();tank.vx*=F.impactX*.8;tank.vy*=F.impactY*.72}if(tank.y>=GROUND-22){tank.y=GROUND-22;if(Math.abs(tank.vy)>150&&!tank.bounced){tank.vy*=F.bounceY;tank.vx*=F.bounceX;tank.bounced=true;impact(tank.x,tank.y+8)}else{tank.vy=0;tank.vx*=Math.pow(.07,dt)}}if(tank.x<-450||tank.x>1700||(tank.y>=GROUND-23&&Math.abs(tank.vx)<13)){tank.resetTimer+=dt;if(tank.resetTimer>.58)resetTank(true)}else tank.resetTimer=0}
function update(dt){if(!running){updateJohnny(hero,tank,aim,running,dt);return}elapsed+=dt;if(steroidTimer>0)steroidTimer=Math.max(0,steroidTimer-dt);updateDina(dt);updateTank(dt);for(const p of particles){p.life-=dt;p.vy+=420*dt;p.x+=p.vx*dt;p.y+=p.vy*dt}for(const f of floaters){f.life-=dt;f.y-=45*dt}for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);for(let i=floaters.length-1;i>=0;i--)if(floaters[i].life<=0)floaters.splice(i,1);shake*=Math.pow(.002,dt);updateJohnny(hero,tank,aim,running,dt);hud()}
function drawBridge(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#050713');g.addColorStop(.62,'#10172e');g.addColorStop(1,'#1e2743');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.fillStyle='#27304d';ctx.fillRect(0,GROUND-28,W,28);ctx.strokeStyle='#6474a1';ctx.lineWidth=3;for(let x=0;x<W;x+=110){ctx.beginPath();ctx.moveTo(x,GROUND-28);ctx.lineTo(x+40,GROUND);ctx.stroke()}ctx.fillStyle='#0b1125';ctx.fillRect(0,0,W,72);ctx.fillStyle='#6ee8ff';ctx.font='900 18px system-ui';ctx.fillText('MOTHERSHIP COMMAND CHAMBER · FINAL BOSS',26,42);ctx.save();ctx.globalAlpha=.45;ctx.strokeStyle='#bd6cff';ctx.lineWidth=5;for(let x=500;x<1280;x+=120){ctx.beginPath();ctx.moveTo(x,92);ctx.lineTo(x+55,210);ctx.lineTo(x+20,350);ctx.stroke()}ctx.restore()}

function smoothstep(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
function drawDina(){
  const p=phase();
  const reaching=dinaState==='reach'||dinaState==='lift';
  const lean=reaching?Math.max(.08,reachProgress):0;
  const turn=dinaState==='turn'?smoothstep(turnProgress):(dinaState==='drop'?1:0);
  const back=turn>.5;
  const turnSquash=.84+.16*Math.abs(Math.cos(turn*Math.PI));
  const idleSway=!reaching&&!back?Math.sin(elapsed*.72)*7:0;
  const breath=Math.sin(elapsed*1.25)*2.5;
  const hipX=(back?8:14)+idleSway;
  const shoulderX=-hipX*.38;
  const bodyScale=1.08;
  const tailSwing=Math.sin(elapsed*1.08+turn*1.7)*18;

  ctx.save();
  ctx.translate(1030,GROUND);
  ctx.translate(0,lean*188);
  ctx.scale(bodyScale*turnSquash,bodyScale);

  const tailBaseX=(back?118:146)+hipX;
  const tailBaseY=-405;
  const tailTipX=276+tailSwing*.35;
  const tailTipY=-150+tailSwing*.30;
  ctx.save();
  ctx.lineCap='round';
  ctx.lineJoin='round';
  ctx.strokeStyle='#4b342a';
  ctx.lineWidth=42;
  ctx.beginPath();
  ctx.moveTo(tailBaseX,tailBaseY);
  ctx.bezierCurveTo(220+tailSwing*.18,-392,268+tailSwing*.55,-310,226+tailSwing*.25,-238);
  ctx.bezierCurveTo(205+tailSwing*.10,-205,237+tailSwing*.28,-174,tailTipX,tailTipY);
  ctx.stroke();
  ctx.strokeStyle='#c59662';
  ctx.lineWidth=31;
  ctx.beginPath();
  ctx.moveTo(tailBaseX,tailBaseY);
  ctx.bezierCurveTo(220+tailSwing*.18,-392,268+tailSwing*.55,-310,226+tailSwing*.25,-238);
  ctx.bezierCurveTo(205+tailSwing*.10,-205,237+tailSwing*.28,-174,tailTipX,tailTipY);
  ctx.stroke();
  ctx.strokeStyle='#76513a';
  ctx.lineWidth=8;
  for(const [x,y,a] of [[205+tailSwing*.18,-356,-.55],[241+tailSwing*.36,-306,-.28],[230+tailSwing*.25,-249,.12],[229+tailSwing*.22,-194,.44]]){
    ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(13,0);ctx.stroke();ctx.restore();
  }
  ctx.fillStyle='#4b342a';
  ctx.beginPath();ctx.arc(tailTipX,tailTipY,17,0,Math.PI*2);ctx.fill();
  ctx.restore();

  ctx.fillStyle='#0d0e13';
  ctx.strokeStyle='#050609';
  ctx.lineWidth=7;
  ctx.beginPath();ctx.roundRect(-192,-66,145,66,22);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.roundRect(38,-62,151,62,22);ctx.fill();ctx.stroke();
  ctx.fillStyle='#282332';
  ctx.fillRect(-174,-22,111,13);
  ctx.fillRect(58,-20,111,13);

  const leather=ctx.createLinearGradient(-190,-455,185,-70);
  leather.addColorStop(0,'#100f14');
  leather.addColorStop(.20,'#422d43');
  leather.addColorStop(.38,'#151319');
  leather.addColorStop(.60,'#54334f');
  leather.addColorStop(.78,'#17151b');
  leather.addColorStop(1,'#0e0e13');
  ctx.fillStyle=leather;
  ctx.strokeStyle='#07080b';
  ctx.lineWidth=9;
  ctx.beginPath();
  if(back){
    ctx.moveTo(-170+hipX,-438);ctx.bezierCurveTo(-196+hipX,-408,-191+hipX,-348,-164+hipX,-292);ctx.bezierCurveTo(-150+hipX,-250,-153+hipX,-172,-169+hipX,-66);ctx.lineTo(-31+hipX,-66);ctx.bezierCurveTo(-17+hipX,-150,-8+hipX,-236,-5+hipX,-296);ctx.bezierCurveTo(-3+hipX,-316,0+hipX,-327,0+hipX,-350);ctx.bezierCurveTo(-6+hipX,-384,-21+hipX,-421,-38+hipX,-438);
  }else{
    ctx.moveTo(-174+hipX,-438);ctx.bezierCurveTo(-197+hipX,-397,-183+hipX,-333,-155+hipX,-278);ctx.bezierCurveTo(-140+hipX,-229,-149+hipX,-149,-164+hipX,-66);ctx.lineTo(-29+hipX,-66);ctx.bezierCurveTo(-16+hipX,-151,-8+hipX,-236,-5+hipX,-296);ctx.bezierCurveTo(-3+hipX,-316,0+hipX,-328,0+hipX,-350);ctx.bezierCurveTo(-7+hipX,-385,-22+hipX,-422,-40+hipX,-438);
  }
  ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();
  if(back){
    ctx.moveTo(38+hipX,-438);ctx.bezierCurveTo(21+hipX,-421,6+hipX,-384,0+hipX,-350);ctx.bezierCurveTo(0+hipX,-327,3+hipX,-316,5+hipX,-296);ctx.bezierCurveTo(8+hipX,-236,17+hipX,-150,31+hipX,-66);ctx.lineTo(169+hipX,-66);ctx.bezierCurveTo(153+hipX,-172,150+hipX,-250,164+hipX,-292);ctx.bezierCurveTo(191+hipX,-348,196+hipX,-408,170+hipX,-438);
  }else{
    ctx.moveTo(40+hipX,-438);ctx.bezierCurveTo(22+hipX,-422,7+hipX,-385,0+hipX,-350);ctx.bezierCurveTo(0+hipX,-328,3+hipX,-316,5+hipX,-296);ctx.bezierCurveTo(8+hipX,-236,16+hipX,-151,29+hipX,-66);ctx.lineTo(164+hipX,-66);ctx.bezierCurveTo(149+hipX,-149,140+hipX,-229,155+hipX,-278);ctx.bezierCurveTo(183+hipX,-333,197+hipX,-397,174+hipX,-438);
  }
  ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle='#8d6a87';ctx.lineWidth=3.5;ctx.beginPath();ctx.moveTo(hipX,-350);ctx.bezierCurveTo(-2+hipX,-334,2+hipX,-316,hipX,-296);ctx.stroke();

  ctx.save();ctx.globalAlpha=.78;ctx.strokeStyle='#9e7896';ctx.lineCap='round';ctx.lineWidth=7;
  ctx.beginPath();ctx.moveTo(-139+hipX,-395);ctx.bezierCurveTo(-167+hipX,-338,-148+hipX,-274,-126+hipX,-232);ctx.stroke();
  ctx.beginPath();ctx.moveTo(123+hipX,-390);ctx.bezierCurveTo(150+hipX,-327,137+hipX,-263,117+hipX,-214);ctx.stroke();
  ctx.strokeStyle='#6f536c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-146+hipX,-176);ctx.quadraticCurveTo(-92+hipX,-158,-37+hipX,-176);ctx.stroke();ctx.beginPath();ctx.moveTo(143+hipX,-174);ctx.quadraticCurveTo(92+hipX,-156,37+hipX,-176);ctx.stroke();ctx.restore();

  ctx.strokeStyle='#cdb6cb';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-164+hipX,-438);ctx.quadraticCurveTo(0+hipX,-420,164+hipX,-438);ctx.stroke();ctx.fillStyle='#342639';ctx.beginPath();ctx.roundRect(-23+hipX,-452,46,24,6);ctx.fill();
  if(back){
    ctx.strokeStyle='#a98aa6';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-152+hipX,-420);ctx.quadraticCurveTo(-78+hipX,-386,0+hipX,-397);ctx.quadraticCurveTo(78+hipX,-386,152+hipX,-420);ctx.stroke();ctx.beginPath();ctx.moveTo(0+hipX,-430);ctx.bezierCurveTo(-5+hipX,-392,7+hipX,-350,1+hipX,-302);ctx.stroke();ctx.beginPath();ctx.moveTo(-126+hipX,-385);ctx.quadraticCurveTo(-91+hipX,-408,-50+hipX,-382);ctx.lineTo(-60+hipX,-337);ctx.quadraticCurveTo(-94+hipX,-322,-126+hipX,-346);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.moveTo(126+hipX,-385);ctx.quadraticCurveTo(91+hipX,-408,50+hipX,-382);ctx.lineTo(60+hipX,-337);ctx.quadraticCurveTo(94+hipX,-322,126+hipX,-346);ctx.closePath();ctx.stroke();ctx.strokeStyle='#72556f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-151+hipX,-330);ctx.bezierCurveTo(-98+hipX,-286,-39+hipX,-300,-7+hipX,-329);ctx.stroke();ctx.beginPath();ctx.moveTo(151+hipX,-330);ctx.bezierCurveTo(98+hipX,-286,39+hipX,-300,7+hipX,-329);ctx.stroke();
  }else{
    ctx.strokeStyle='#a17d9d';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0+hipX,-430);ctx.lineTo(0+hipX,-353);ctx.stroke();ctx.beginPath();ctx.moveTo(-145+hipX,-404);ctx.quadraticCurveTo(-104+hipX,-378,-61+hipX,-389);ctx.stroke();ctx.beginPath();ctx.moveTo(145+hipX,-404);ctx.quadraticCurveTo(104+hipX,-378,61+hipX,-389);ctx.stroke();
  }

  ctx.save();ctx.translate(shoulderX,breath);ctx.fillStyle='#c68f67';ctx.strokeStyle='#51362d';ctx.lineWidth=7;ctx.beginPath();
  if(back){ctx.moveTo(-144,-655);ctx.quadraticCurveTo(-120,-706,-66,-720);ctx.lineTo(68,-720);ctx.quadraticCurveTo(122,-706,146,-655);ctx.bezierCurveTo(136,-585,122,-510,101,-455);ctx.quadraticCurveTo(0,-428,-101,-455);ctx.bezierCurveTo(-122,-510,-136,-585,-144,-655);}else{ctx.moveTo(-145,-655);ctx.quadraticCurveTo(-120,-710,-66,-724);ctx.lineTo(68,-724);ctx.quadraticCurveTo(122,-710,145,-655);ctx.bezierCurveTo(138,-585,119,-510,96,-454);ctx.quadraticCurveTo(0,-430,-96,-454);ctx.bezierCurveTo(-119,-510,-138,-585,-145,-655);}ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=back?'#3f2239':'#642d58';ctx.beginPath();if(back){ctx.moveTo(-136,-650);ctx.quadraticCurveTo(-78,-624,0,-630);ctx.quadraticCurveTo(78,-624,136,-650);ctx.lineTo(100,-475);ctx.quadraticCurveTo(0,-458,-100,-475);ctx.closePath();}else{ctx.moveTo(-136,-650);ctx.quadraticCurveTo(-82,-612,0,-622);ctx.quadraticCurveTo(82,-612,136,-650);ctx.lineTo(101,-472);ctx.quadraticCurveTo(0,-452,-101,-472);ctx.closePath();}ctx.fill();ctx.strokeStyle='#d0a4c6';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-101,-472);ctx.quadraticCurveTo(0,-459,101,-472);ctx.stroke();
  ctx.lineCap='round';ctx.strokeStyle='#51362d';ctx.lineWidth=50;ctx.beginPath();ctx.moveTo(-126,-624);ctx.lineTo(-196,-458);ctx.stroke();ctx.strokeStyle='#c68f67';ctx.lineWidth=39;ctx.beginPath();ctx.moveTo(-126,-624);ctx.lineTo(-196,-458);ctx.stroke();
  if(reaching){const handWorldX=TANK_HOME.x+(890-TANK_HOME.x)*lean,handWorldY=TANK_HOME.y+(390-TANK_HOME.y)*lean;const hx=(handWorldX-1030)/(bodyScale*turnSquash)-shoulderX;const hy=(handWorldY-GROUND-lean*188)/bodyScale-breath;ctx.strokeStyle='#51362d';ctx.lineWidth=58;ctx.beginPath();ctx.moveTo(125,-625);ctx.quadraticCurveTo(196,-525,174,-462);ctx.lineTo(hx,hy);ctx.stroke();ctx.strokeStyle='#c68f67';ctx.lineWidth=46;ctx.beginPath();ctx.moveTo(125,-625);ctx.quadraticCurveTo(196,-525,174,-462);ctx.lineTo(hx,hy);ctx.stroke();ctx.fillStyle='#c68f67';ctx.beginPath();ctx.arc(hx,hy,32,0,Math.PI*2);ctx.fill();}else{ctx.strokeStyle='#51362d';ctx.lineWidth=50;ctx.beginPath();ctx.moveTo(126,-624);ctx.lineTo(192,-452);ctx.stroke();ctx.strokeStyle='#c68f67';ctx.lineWidth=39;ctx.beginPath();ctx.moveTo(126,-624);ctx.lineTo(192,-452);ctx.stroke();}
  if(lean>.18){const headY=-770;ctx.fillStyle='#c68f67';ctx.strokeStyle='#51362d';ctx.lineWidth=6;ctx.beginPath();ctx.ellipse(10,headY,72,82,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#e4c55d';ctx.beginPath();ctx.moveTo(-78,headY-36);ctx.quadraticCurveTo(-39,headY-116,24,headY-101);ctx.quadraticCurveTo(104,headY-79,88,headY+21);ctx.lineTo(54,headY-35);ctx.quadraticCurveTo(14,headY-62,-22,headY-27);ctx.lineTo(-63,headY+15);ctx.closePath();ctx.fill();ctx.strokeStyle='#553729';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-35,headY-7);ctx.lineTo(-7,headY-16);ctx.stroke();ctx.beginPath();ctx.moveTo(29,headY-16);ctx.lineTo(58,headY-7);ctx.stroke();ctx.fillStyle='#91ff69';ctx.beginPath();ctx.arc(-17,headY+5,6,0,Math.PI*2);ctx.arc(41,headY+5,6,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#7a3d39';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-7,headY+43);ctx.quadraticCurveTo(16,headY+30,41,headY+43);ctx.stroke();}
  if(back){ctx.fillStyle='#e4c55d';ctx.beginPath();ctx.moveTo(-86,-717);ctx.quadraticCurveTo(-34,-770,28,-758);ctx.quadraticCurveTo(97,-741,83,-653);ctx.lineTo(62,-562);ctx.quadraticCurveTo(3,-526,-65,-566);ctx.lineTo(-84,-642);ctx.closePath();ctx.fill();ctx.strokeStyle='#b29445';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-49,-696);ctx.quadraticCurveTo(3,-650,57,-682);ctx.stroke();}
  ctx.restore();ctx.restore();ctx.save();ctx.globalAlpha=.18+.05*p;ctx.strokeStyle='#cf75ff';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(1030,GROUND-300,238,305,0,0,Math.PI*2);ctx.stroke();ctx.restore();
}
function drawTrajectory(){if(!aim||tank.flying)return;const dx=tank.x-aim.x,dy=tank.y-aim.y,p=Math.hypot(dx,dy);if(p<1)return;const sc=Math.min(p,MAX_PULL)/p,b=steroidTimer>0?1.42:1,h=held(),vx=dx*sc*F.throwScale*b,vy=dy*sc*F.throwScale*b,g=GRAVITY*F.gravityMultiplier;ctx.save();ctx.strokeStyle='#ffcf33';ctx.lineWidth=3;ctx.setLineDash([7,7]);ctx.beginPath();ctx.moveTo(h.x,h.y);for(let i=1;i<=34;i++){const t=i*.07,x=h.x+vx*t,y=h.y+vy*t+.5*g*t*t;if(y>GROUND-22||x>1500)break;ctx.lineTo(x,y)}ctx.stroke();ctx.restore()}
function render(){ctx.clearRect(0,0,W,H);ctx.save();if(shake>.4)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);drawBridge();ctx.save();ctx.translate(24,3);ctx.translate(142,582);ctx.scale(.5,.5);ctx.translate(-142,-582);S.drawJohnny(ctx,hero,steroidTimer,elapsed);ctx.restore();drawDina();if(!tank.flying&&aim&&!tank.dropping&&!tank.stolen){const h=held();T.drawTank(ctx,{...tank,x:h.x,y:h.y,angle:-.08})}else if(tank.y>-180)T.drawTank(ctx,tank);drawTrajectory();for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,p.size,p.size)}ctx.globalAlpha=1;for(const f of floaters){ctx.globalAlpha=Math.max(0,f.life);ctx.fillStyle='#fff0a3';ctx.font='900 24px Impact,system-ui';ctx.textAlign='center';ctx.fillText(f.text,f.x,f.y)}ctx.globalAlpha=1;ctx.restore()}
function finishWin(){if(win)return;win=true;running=false;aim=null;tank.dropping=false;tank.stolen=false;toast('DINA HAS FINALLY COME DOWN TO EARTH. METAPHORICALLY.',1700);beep('win');const stars=1+(catches>=2?1:0)+(health===5?1:0);rStars.textContent='★'.repeat(stars)+'☆'.repeat(3-stars);rScore.textContent=score.toLocaleString();rHits.textContent=hits;rCatches.textContent=catches;rDefense.textContent=health===5?'UNTOUCHED':`${health}/5 HEARTS`;setTimeout(()=>winScreen.classList.add('visible'),900)}
function reset(){running=true;over=win=false;score=0;health=5;hp=MAX_HP;elapsed=0;steroids=3;steroidTimer=0;aim=null;shake=0;hits=catches=0;dinaState='idle';stateTimer=0;stateMax=1;grabClock=3.5;reachProgress=turnProgress=0;particles.length=floaters.length=0;Object.assign(hero,{armAngle:-.75,releaseTimer:0,torsoLean:0,squat:0,catchPose:0});resetTank(false);grabClock=3.5;steroidButton.disabled=false;steroidCountEl.textContent='3 demo doses';hud();toast(`DINA IS TOO TALL FOR THE CAMERA. DO NOT LET HER STEAL THE ${F.projectileName}.`,2300)}
function frame(now){const dt=Math.min((now-last)/1000,.033);last=now;update(dt);render();requestAnimationFrame(frame)}
canvas.addEventListener('pointerdown',e=>{if(!running)return;const p=pointerToWorld(canvas,e,0);if(tank.dropping){if(Math.hypot(p.x-tank.x,p.y-tank.y)<185)catchDrop();return}if(tank.flying||tank.stolen||!tank.ready)return;if(Math.hypot(p.x-tank.x,p.y-tank.y)<150){aim=p;abortReach();canvas.setPointerCapture?.(e.pointerId);hud()}});
canvas.addEventListener('pointermove',e=>{if(!aim||tank.flying||tank.stolen||tank.dropping)return;const p=pointerToWorld(canvas,e,0),dx=p.x-tank.x,dy=p.y-tank.y,l=Math.hypot(dx,dy);aim=l>MAX_PULL?{x:tank.x+dx/l*MAX_PULL,y:tank.y+dy/l*MAX_PULL}:p});
canvas.addEventListener('pointerup',throwTank);canvas.addEventListener('pointercancel',()=>aim=null);
steroidButton.addEventListener('click',()=>{if(!running||steroids<=0)return;steroids--;steroidTimer=12;steroidCountEl.textContent=steroids===1?'1 demo dose':`${steroids} demo doses`;steroidButton.disabled=steroids<=0;toast('UNREGULATED STRENGTH!');beep('power')});
muteButton.addEventListener('click',()=>{muted=!muted;muteButton.textContent=muted?'🔇':'🔊'});
$('start').addEventListener('click',()=>{titleScreen.classList.remove('visible');reset()});
$('restart').addEventListener('click',()=>{overScreen.classList.remove('visible');reset()});
$('replay').addEventListener('click',()=>{winScreen.classList.remove('visible');reset()});
hud();render();requestAnimationFrame(frame);
})();