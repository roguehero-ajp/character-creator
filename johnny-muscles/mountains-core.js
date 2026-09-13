(() => {
  'use strict';
  const S=window.JMShared,E=window.JMEnemyArt,T=window.JMTankArt,F=window.JMWorld4Fighter;
  if(!S||!E||!T||!F) throw new Error('World 4 requires shared, enemy, tank, and fighter modules');
  const LEVELS={
    1:{title:'THIN AIR',subtitle:'THE WIND HAS JOINED THE ENEMY TEAM',wind:true,ice:false,shelves:[],waves:[{ground:4,bat:1,leaper:1},{ground:4,bat:2,leaper:2,shield:1},{ground:4,bat:2,leaper:3,roller:1}]},
    2:{title:'ICE TO MEET YOU',subtitle:'EVERYTHING SLIDES. ESPECIALLY BAD IDEAS.',wind:true,ice:true,shelves:[],waves:[{ground:2,ski:2,roller:1},{ski:3,leaper:2,shield:1,roller:2},{ski:4,bat:2,shield:2,chonker:1}]},
    3:{title:'AMBUSH PASS',subtitle:'REMOVE THE SPOTTERS OR ENJOY THEIR PLAN',wind:true,ice:true,shelves:[],waves:[{snow:3,ski:1,spotter:1},{snow:3,leaper:2,shield:1,spotter:1,cliff:1},{snow:4,ski:2,chonker:1,spotter:2,cliff:1}]},
    4:{title:'AVALANCHE ALLEY',subtitle:'THE MOUNTAIN IS NOW THROWABLE',wind:true,ice:true,shelves:[760,1260,1770],waves:[{ground:3,ski:2,saboteur:1},{shield:2,snow:2,ski:2,saboteur:2},{ground:4,roller:2,chonker:1,saboteur:2,spotter:1}]},
    5:{title:"SHAUN'S SUMMIT",subtitle:'SPECIAL SOLDIER SHAUN HAS PREPARED EVERYTHING',wind:true,ice:true,shelves:[690,1190,1690,2100],waves:[{snow:2,ski:2,commando:2,spotter:1},{shield:2,commando:3,saboteur:1,cliff:1,leaper:1},{ski:2,snow:2,commando:3,chonker:1,saboteur:2,spotter:1,cliff:1}]}
  };

  class MountainGame {
    constructor(){
      this.S=S;this.E=E;this.T=T;this.F=F;
      this.W=S.W;this.H=S.H;this.GROUND=S.GROUND;this.GRAVITY=S.GRAVITY;this.TANK_HOME=S.TANK_HOME;this.MAX_PULL=S.MAX_PULL;
      this.canvas=document.getElementById('game');this.ctx=this.canvas.getContext('2d');this.levelNumber=Number(document.getElementById('game-shell')?.dataset?.level||1);this.LEVEL=LEVELS[this.levelNumber]||LEVELS[1];
      this.DEFENSE_X=90;this.HERO_HIT_X=166;this.HERO_HIT_Y=this.GROUND-72;
      const id=x=>document.getElementById(x);
      this.scoreEl=id('score');this.healthEl=id('health');this.waveEl=id('wave');this.remainingEl=id('remaining');this.windEl=id('wind');this.tacticalEl=id('tactical');this.avalancheEl=id('avalanche-kills');
      this.steroidButton=id('steroids');this.steroidCountEl=id('steroid-count');this.muteButton=id('mute');this.titleScreen=id('title-screen');this.gameOverScreen=id('game-over');this.missionCompleteScreen=id('mission-complete');this.finalScoreEl=id('final-score');this.toastEl=id('toast');
      this.resultStarsEl=id('result-stars');this.resultScoreEl=id('result-score');this.resultCatsEl=id('result-cats');this.resultAvalancheEl=id('result-avalanche');this.resultSpecialEl=id('result-special');this.resultDefenseEl=id('result-defense');
      this.lastTime=performance.now();this.running=false;this.gameOver=false;this.missionComplete=false;this.score=0;this.health=5;this.elapsed=0;this.steroidsLeft=3;this.steroidTimer=0;this.muted=false;this.audioCtx=null;this.aim=null;this.shake=0;this.cameraX=0;this.toastTimer=null;
      this.currentWave=-1;this.queue=[];this.spawned=0;this.resolved=0;this.spawnTimer=0;this.intermission=1;this.finishTimer=0;this.clearAnnounced=false;this.flattened=0;this.specialKills=0;this.avalancheKills=0;this.damageTaken=0;this.breaches=0;this.wind=0;this.windTarget=0;this.windTimer=.5;
      this.actors=[];this.avalanches=[];this.debris=[];this.particles=[];this.floaters=[];this.shelves=this.LEVEL.shelves.map(x=>({x,triggered:false}));
      this.hero={armAngle:-.75,releaseTimer:0,torsoLean:0,squat:0,catchPose:0};
      this.tank={x:this.TANK_HOME.x,y:this.TANK_HOME.y,vx:0,vy:0,angle:0,angular:0,flying:false,resetTimer:0,bounced:false,hitIds:new Set()};
    }
    terrainY(x){if(x<300)return this.GROUND;const z=x-300,climb=Math.min(125,z*(.032+this.levelNumber*.003)),wave=Math.sin(z/205+this.levelNumber*.7)*(34+this.levelNumber*5),rough=Math.sin(z/79+1.4)*17;return this.S.clamp(this.GROUND-climb-wave-rough,370,630);}
    isIcyAt(x){return !!(this.LEVEL.ice&&x>=430&&Math.sin((x+this.levelNumber*90)/230)>-.25);}
    totalForWave(w){return Object.values(w).reduce((sum,v)=>sum+(Number(v)||0),0);}
    activeSpotters(){return this.actors.filter(a=>!a.dead&&a.kind==='spotter').length;}
    tacticalMultiplier(){return this.activeSpotters()>0?1.28:1;}
    showToast(text,duration=900){this.toastEl.textContent=text;this.toastEl.classList.add('show');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>this.toastEl.classList.remove('show'),duration);}
    beep(type='impact'){
      if(this.muted)return;try{if(!this.audioCtx)this.audioCtx=new(window.AudioContext||window.webkitAudioContext)();const o=this.audioCtx.createOscillator(),g=this.audioCtx.createGain(),n=this.audioCtx.currentTime;
      const sounds={throw:[90,52,.12,'sawtooth'],impact:[72,38,.09,'square'],hurt:[120,70,.22,'square'],wind:[150,230,.2,'triangle'],ice:[650,330,.12,'triangle'],spotter:[700,950,.13,'square'],avalanche:[88,32,.62,'sawtooth'],win:[330,760,.42,'triangle'],power:[160,420,.25,'sawtooth'],ping:[560,300,.12,'square']};const s=sounds[type]||sounds.impact;o.type=s[3];o.frequency.setValueAtTime(s[0],n);o.frequency.exponentialRampToValueAtTime(s[1],n+s[2]);g.gain.setValueAtTime(.055,n);g.gain.exponentialRampToValueAtTime(.001,n+s[2]);o.connect(g).connect(this.audioCtx.destination);o.start(n);o.stop(n+s[2]);}catch(_){}
    }
    updateHud(){this.scoreEl.textContent=String(this.score).padStart(6,'0');this.healthEl.textContent=Array.from({length:5},(_,i)=>i<this.health?'♥':'♡').join(' ');this.waveEl.textContent=`${Math.max(1,this.currentWave+1)}/3`;const total=this.currentWave>=0?this.totalForWave(this.LEVEL.waves[this.currentWave]):0;this.remainingEl.textContent=this.currentWave<0?'INCOMING':this.missionComplete?'SECURED':String(Math.max(0,total-this.resolved));const abs=Math.abs(Math.round(this.wind));this.windEl.textContent=abs<12?'CALM':`${this.wind>0?'→':'←'} ${abs}`;this.tacticalEl.textContent=this.activeSpotters()>0?`SPOTTER x${this.activeSpotters()}`:'CLEAR';this.avalancheEl.textContent=String(this.avalancheKills);}
    resetTank(){Object.assign(this.tank,{x:this.TANK_HOME.x,y:this.TANK_HOME.y,vx:0,vy:0,angle:0,angular:0,flying:false,resetTimer:0,bounced:false});this.tank.hitIds.clear();this.aim=null;this.hero.releaseTimer=0;}
    resetGame(){
      Object.assign(this,{running:true,gameOver:false,missionComplete:false,score:0,health:5,elapsed:0,steroidsLeft:3,steroidTimer:0,aim:null,shake:0,cameraX:0,currentWave:-1,queue:[],spawned:0,resolved:0,spawnTimer:0,intermission:1,finishTimer:0,clearAnnounced:false,flattened:0,specialKills:0,avalancheKills:0,damageTaken:0,breaches:0,wind:0,windTarget:0,windTimer:.35});
      this.actors.length=0;this.avalanches.length=0;this.debris.length=0;this.particles.length=0;this.floaters.length=0;this.shelves.forEach(s=>s.triggered=false);Object.assign(this.hero,{armAngle:-.75,releaseTimer:0,torsoLean:0,squat:0,catchPose:0});this.resetTank();this.steroidButton.disabled=false;this.steroidCountEl.textContent='3 demo doses';this.updateHud();this.showToast(`MOUNTAINS ${this.levelNumber}: ${this.LEVEL.title}`,1300);
      const tutorials={1:'WATCH THE WIND INDICATOR. GUSTS BEND EVERY THROW.',2:'ICE KEEPS VEHICLES AND SKI CATS MOVING.',3:"SPOTTERS BUFF SHAUN'S TROOPS. PRIORITIZE THEM.",4:'HIT UNSTABLE SNOW TO TRIGGER AN AVALANCHE. CATS GET BURIED TOO.',5:"SHAUN'S SUMMIT COMBINES WIND, ICE, COMMANDOS AND AVALANCHES."};setTimeout(()=>this.showToast(tutorials[this.levelNumber],2100),1350);
    }
    pickWind(){const choices=this.levelNumber>=4?[-210,-150,-90,90,150,210]:[-155,-95,-45,45,95,155];this.windTarget=choices[Math.floor(Math.random()*choices.length)];this.windTimer=3.5+Math.random()*2.3;this.beep('wind');}
    updateWind(dt){this.windTimer-=dt;if(this.windTimer<=0)this.pickWind();this.wind+=(this.windTarget-this.wind)*(1-Math.exp(-2.5*dt));}
    shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
    startWave(){this.currentWave++;const w=this.LEVEL.waves[this.currentWave];this.queue=[];for(const[k,c]of Object.entries(w))for(let i=0;i<c;i++)this.queue.push(k);this.shuffle(this.queue);this.spawned=0;this.resolved=0;this.spawnTimer=.2;this.clearAnnounced=false;this.showToast(`WAVE ${this.currentWave+1} · ${this.LEVEL.subtitle}`,1100);this.updateHud();}
    spawnActor(kind){const x=1160+Math.random()*360,gy=this.terrainY(x)-28,perched=kind==='spotter'||kind==='cliff',y=perched?this.terrainY(x)-(kind==='spotter'?150:185):kind==='bat'?this.terrainY(x)-210:gy;this.actors.push({id:`${kind}-${performance.now()}-${Math.random()}`,kind,x,y,groundY:gy,dead:false,resolved:false,scale:kind==='chonker'?1.38:kind==='ski'?.92:.98,speed:kind==='ski'?108:kind==='snow'?52:kind==='commando'?58:kind==='saboteur'?42:kind==='roller'?82:kind==='chonker'?26:kind==='shield'?38:kind==='leaper'?34:kind==='bat'?76:50,phase:Math.random()*Math.PI*2,vy:0,airborne:false,jumpTimer:.9+Math.random()*1.4,avalancheHits:0,avalancheTagged:new Set(),slide:0,cover:kind==='commando',coverTimer:.8+Math.random(),chargeTimer:kind==='saboteur'?2.7+Math.random()*1.3:99,attackTimer:perched?1.5+Math.random()*1.2:99,hidden:kind==='snow'&&Math.random()>.25});this.spawned++;this.updateHud();}
    resolveActor(a,defeated){if(a.resolved)return;a.resolved=true;a.dead=true;this.resolved++;if(defeated)this.flattened++;this.updateHud();}
    addImpact(x,y,strong=false,color='#f4dc96'){for(let i=0;i<(strong?24:12);i++){const ang=Math.random()*Math.PI*2,spd=80+Math.random()*(strong?290:160);this.particles.push({x,y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd-70,life:.35+Math.random()*.5,max:.85,size:3+Math.random()*9,color});}this.shake=Math.max(this.shake,strong?15:7);}
    actorPoints(kind){return({ground:140,bat:220,leaper:290,roller:320,shield:380,ski:340,snow:360,spotter:520,cliff:470,saboteur:500,commando:560,chonker:620})[kind]||160;}
    killActor(a,source='vehicle'){if(a.dead)return;this.resolveActor(a,true);if(!['ground','bat','leaper'].includes(a.kind))this.specialKills++;const bonus=source==='avalanche'?300:0,pts=this.actorPoints(a.kind)+bonus;this.score+=pts;if(source==='avalanche'){this.avalancheKills++;this.floaters.push({x:a.x,y:a.y-50,text:`MOUNTAIN ASSIST +${pts}`,life:1});}else this.floaters.push({x:a.x,y:a.y-50,text:`+${pts}`,life:.8});this.addImpact(a.x,a.y,source==='avalanche'||!['ground','bat','leaper'].includes(a.kind),source==='avalanche'?'#eef7ff':'#ffd85a');this.updateHud();}
    hurtHero(label){if(this.gameOver||this.missionComplete)return;this.health--;this.damageTaken++;this.shake=20;this.addImpact(this.HERO_HIT_X,this.HERO_HIT_Y,true,'#f8d7ba');this.showToast(label,900);this.beep('hurt');this.updateHud();if(this.health<=0)this.endGame();}
    nearestShelf(x){return this.shelves.filter(s=>!s.triggered).sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x))[0]||null;}
    triggerAvalanche(shelf,source='impact'){if(!shelf||shelf.triggered)return;shelf.triggered=true;this.avalanches.push({id:`${shelf.x}-${performance.now()}`,frontX:shelf.x+120,width:250,speed:500+this.levelNumber*25,life:3.4,hitHero:false});this.showToast(source==='saboteur'?'SABOTEUR TRIGGERED AN AVALANCHE!':'AVALANCHE! THE MOUNTAIN IS HELPING!',1200);this.beep('avalanche');this.shake=24;}
  }
  window.JMMountainGame=MountainGame;
})();
