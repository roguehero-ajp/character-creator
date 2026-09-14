(() => {
  'use strict';
  const G=window.JMMountainGame;
  if(!G) throw new Error('mountains-core.js must load before mountains-combat.js');
  const P=G.prototype;

  P.throwCliffDebris=function(a){const flight=this.activeSpotters()>0?.95:1.18;this.debris.push({x:a.x,y:a.y-35,vx:(this.HERO_HIT_X-a.x)/flight,vy:(this.HERO_HIT_Y-(a.y-35)-.5*this.GRAVITY*flight*flight)/flight,life:2,hit:false});};

  P.updateActor=function(a,dt){
    if(a.dead)return;a.phase+=dt*4;const buff=this.tacticalMultiplier();
    if(a.kind==='spotter'){a.y=this.terrainY(a.x)-150;a.attackTimer-=dt;if(a.attackTimer<=0){this.showToast('SPOTTER MARKED YOUR POSITION!',600);this.beep('spotter');a.attackTimer=3.2;}return;}
    if(a.kind==='cliff'){a.y=this.terrainY(a.x)-185;a.attackTimer-=dt*buff;if(a.attackTimer<=0){this.throwCliffDebris(a);a.attackTimer=2.8;}return;}
    if(a.kind==='commando'){a.coverTimer-=dt;if(a.coverTimer<=0){a.cover=!a.cover;a.coverTimer=a.cover?.7+Math.random()*.6:.9+Math.random()*.7;}if(!a.cover)a.x-=a.speed*buff*dt;}
    else if(a.kind==='saboteur'){a.x-=a.speed*dt;a.chargeTimer-=dt*buff;if(a.chargeTimer<=0){const shelf=this.nearestShelf(a.x);if(shelf)this.triggerAvalanche(shelf,'saboteur');a.chargeTimer=4.5;}}
    else if(a.kind==='ski'){const nextY=this.terrainY(a.x-24),nowY=this.terrainY(a.x),downhill=Math.max(0,nextY-nowY);a.speed=this.S.clamp(a.speed+(18+downhill*3.1)*dt,105,235);a.x-=a.speed*buff*dt;a.slide+=a.speed*dt;}
    else if(a.kind==='roller'){a.speed=this.S.clamp(a.speed+20*dt,82,190);a.x-=a.speed*buff*dt;a.slide+=a.speed*dt;}
    else if(a.kind==='leaper'||a.kind==='chonker'){
      if(a.airborne){a.vy+=this.GRAVITY*dt;a.y+=a.vy*dt;a.x-=a.speed*.8*buff*dt;a.groundY=this.terrainY(a.x)-28*a.scale;if(a.y>=a.groundY&&a.vy>0){a.y=a.groundY;a.airborne=false;a.vy=0;}}
      else{a.x-=a.speed*buff*dt;a.jumpTimer-=dt;if(a.jumpTimer<=0&&a.x>430){a.airborne=true;a.vy=a.kind==='chonker'?-455:-525;a.jumpTimer=a.kind==='chonker'?2.1:1.65;}}
    } else if(a.kind==='bat'){a.x-=a.speed*buff*dt;a.y=this.terrainY(a.x)-190+Math.sin(a.phase)*48;}
    else a.x-=a.speed*buff*dt;
    if(!['bat','spotter','cliff'].includes(a.kind)){a.groundY=this.terrainY(a.x)-28*a.scale;if(!a.airborne)a.y=a.groundY;}
    if(a.x<this.DEFENSE_X){this.breaches++;this.resolveActor(a,false);this.hurtHero(`${a.kind.toUpperCase()} CAT BREACHED THE LINE!`);}
  };

  P.updateAvalanches=function(dt){
    for(const av of this.avalanches){
      av.life-=dt;av.frontX-=av.speed*dt;av.width=Math.min(470,av.width+95*dt);
      for(const a of this.actors){
        if(a.dead||['bat','spotter','cliff'].includes(a.kind)||a.avalancheTagged.has(av.id))continue;
        if(a.x<=av.frontX+av.width&&a.x>=av.frontX-35){a.avalancheTagged.add(av.id);if(a.kind==='chonker'&&a.avalancheHits<1){a.avalancheHits++;a.x-=170;a.airborne=false;this.floaters.push({x:a.x,y:a.y-70,text:'CHONKER BURIED!',life:.9});this.score+=250;}else this.killActor(a,'avalanche');}
      }
      if(!av.hitHero&&av.frontX<=this.HERO_HIT_X+60&&av.frontX+av.width>=this.HERO_HIT_X-40){av.hitHero=true;this.hurtHero(`${this.F.shortName} GOT CAUGHT IN THE AVALANCHE!`);}
    }
    for(let i=this.avalanches.length-1;i>=0;i--)if(this.avalanches[i].life<=0||this.avalanches[i].frontX<-650)this.avalanches.splice(i,1);
  };

  P.updateDebris=function(dt){
    for(const d of this.debris){
      const prevX=d.x,prevY=d.y;
      d.life-=dt;d.vy+=this.GRAVITY*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;
      if(!d.hit&&this.tank.flying){
        const nextTankVY=this.tank.vy+this.GRAVITY*this.F.gravityMultiplier*dt;
        const nextTankX=this.tank.x+this.tank.vx*dt;
        const nextTankY=this.tank.y+nextTankVY*dt;
        const r0x=prevX-this.tank.x,r0y=prevY-this.tank.y,r1x=d.x-nextTankX,r1y=d.y-nextTankY;
        const drx=r1x-r0x,dry=r1y-r0y,den=drx*drx+dry*dry;
        const u=den>0?this.S.clamp(-(r0x*drx+r0y*dry)/den,0,1):0;
        const closest=Math.hypot(r0x+drx*u,r0y+dry*u);
        if(closest<58+this.F.collisionBonus){
          d.hit=true;d.life=0;this.addImpact(d.x,d.y,true,'#e7d6b4');this.floaters.push({x:d.x,y:d.y-28,text:'DEBRIS SMASH!',life:.7});this.showToast('DEBRIS COUNTERED!',450);this.beep('impact');continue;
        }
      }
      if(!d.hit&&Math.hypot(d.x-this.HERO_HIT_X,d.y-this.HERO_HIT_Y)<65){d.hit=true;d.life=0;this.hurtHero('CLIFF DEBRIS HIT THE HERO!');}
      if(d.y>=this.terrainY(d.x))d.life=0;
    }
    for(let i=this.debris.length-1;i>=0;i--)if(this.debris[i].life<=0)this.debris.splice(i,1);
  };

  P.updateMission=function(dt){
    if(this.gameOver||this.missionComplete)return;
    if(this.currentWave<0){this.intermission-=dt;if(this.intermission<=0)this.startWave();return;}
    const total=this.totalForWave(this.LEVEL.waves[this.currentWave]);
    if(this.spawned<total){this.spawnTimer-=dt;if(this.spawnTimer<=0){this.spawnActor(this.queue[this.spawned]);this.spawnTimer=.62+Math.random()*.2;}return;}
    if(this.resolved<total||this.actors.some(a=>!a.dead))return;
    if(this.currentWave<2){if(!this.clearAnnounced){this.clearAnnounced=true;this.intermission=1.25;this.showToast(`WAVE ${this.currentWave+1} CLEAR`,700);return;}this.intermission-=dt;if(this.intermission<=0)this.startWave();return;}
    this.finishTimer+=dt;if(this.finishTimer>.75)this.completeMission();
  };

  P.completeMission=function(){if(this.missionComplete)return;this.missionComplete=true;this.running=false;this.aim=null;this.debris.length=0;this.showToast(`${this.LEVEL.title} SECURED`,1300);this.beep('win');const stars=1+(this.breaches===0?1:0)+(this.damageTaken===0?1:0);this.resultStarsEl.textContent='★'.repeat(stars)+'☆'.repeat(3-stars);this.resultScoreEl.textContent=this.score.toLocaleString();this.resultCatsEl.textContent=String(this.flattened);this.resultAvalancheEl.textContent=String(this.avalancheKills);this.resultSpecialEl.textContent=String(this.specialKills);this.resultDefenseEl.textContent=this.damageTaken===0?'UNTOUCHED':`${this.health}/5 HEARTS`;setTimeout(()=>this.missionCompleteScreen.classList.add('visible'),850);};
  P.endGame=function(){if(this.gameOver)return;this.running=false;this.gameOver=true;this.aim=null;this.finalScoreEl.textContent=`Score: ${this.score.toLocaleString()} · Avalanche kills: ${this.avalancheKills}`;this.gameOverScreen.classList.add('visible');};
  P.heldTankPosition=function(){return !this.aim||this.tank.flying?{x:this.tank.x,y:this.tank.y}:{x:this.aim.x,y:Math.min(this.aim.y,this.GROUND-40)};};
  P.throwTank=function(){if(!this.aim||this.tank.flying||!this.running)return;const dx=this.tank.x-this.aim.x,dy=this.tank.y-this.aim.y,p=Math.hypot(dx,dy);if(p<18){this.aim=null;return;}const sc=Math.min(p,this.MAX_PULL)/p,boost=(this.steroidTimer>0?1.42:1)*(window.JMPowerUps?.getThrowMultiplier()??1),h=this.heldTankPosition();Object.assign(this.tank,{x:h.x,y:h.y,vx:dx*sc*this.F.throwScale*boost,vy:dy*sc*this.F.throwScale*boost,angular:Math.min(9,2+p/55),flying:true,resetTimer:0,groundedTimer:0,bounced:false});this.tank.hitIds.clear();this.aim=null;this.hero.releaseTimer=.28;this.beep('throw');if(navigator.vibrate)navigator.vibrate(20);};
  P.deflectTank=function(a,label){this.tank.vx*=-.25;this.tank.vy=-Math.abs(this.tank.vy)*.32-90;this.tank.angular*=-1;this.addImpact(a.x,a.y-20,true,'#d9e0e4');this.showToast(label,800);this.beep('ping');};

  P.updateTank=function(dt){
    const t=this.tank;if(!t.flying)return;
    const groundBefore=this.terrainY(t.x)-22;
    const airborne=t.y<groundBefore-2||t.vy<0;
    if(airborne)t.vx+=this.wind*.52*dt;
    t.vy+=this.GRAVITY*this.F.gravityMultiplier*dt;t.x+=t.vx*dt;t.y+=t.vy*dt;t.angle+=t.angular*dt;
    for(const shelf of this.shelves)if(!shelf.triggered&&Math.abs(t.x-shelf.x)<72&&t.vy>0&&t.y>this.terrainY(shelf.x)-135)this.triggerAvalanche(shelf,'impact');
    for(const a of this.actors){
      if(a.dead||t.hitIds.has(a.id))continue;const centerY=a.y-(['spotter','cliff'].includes(a.kind)?10:0),radius=(a.kind==='chonker'?72:['spotter','cliff'].includes(a.kind)?52:46)+this.F.collisionBonus;if(Math.hypot(t.x-a.x,t.y-centerY)>=radius)continue;t.hitIds.add(a.id);
      if(a.kind==='shield'&&!(t.vy>0&&t.y<a.y-38)){this.deflectTank(a,'SHIELD CAT! ARC OVER THE SIGN!');continue;}
      if(a.kind==='commando'&&a.cover){this.deflectTank(a,'COMMANDO CAT IS BEHIND COVER!');continue;}
      if(a.kind==='snow'&&a.hidden)a.hidden=false;t.vx*=this.F.impactX;t.vy*=this.F.impactY;this.killActor(a,'vehicle');
    }
    let grounded=false;
    const ground=this.terrainY(t.x)-22;
    if(t.y>=ground){
      t.y=ground;const icy=this.isIcyAt(t.x);
      if(Math.abs(t.vy)>165&&!t.bounced){t.vy*=icy?-.16:this.F.bounceY;t.vx*=icy?.9:this.F.bounceX;t.angular*=.7;t.bounced=true;t.groundedTimer=0;this.addImpact(t.x,t.y+12,true,icy?'#dff6ff':'#e7d6b4');this.beep(icy?'ice':'impact');}
      else{grounded=true;t.vy=0;t.groundedTimer=(t.groundedTimer||0)+dt;t.vx*=Math.pow(icy?.62:.055,dt);t.angular*=Math.pow(icy?.5:.03,dt);}
    }else t.groundedTimer=0;
    if((t.groundedTimer||0)>=1.75){this.resetTank();return;}
    if(t.x<-430||t.x>2500||(grounded&&Math.abs(t.vx)<13)){t.resetTimer+=dt;if(t.resetTimer>.62)this.resetTank();}else t.resetTimer=0;
  };
})();
