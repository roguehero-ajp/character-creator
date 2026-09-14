(() => {
'use strict';

const BASE='boss4.js?rev=0.14.0-base';

function mustReplace(src,re,replacement,label){
  if(!re.test(src)) throw new Error(`Boss 4 patch failed: ${label}`);
  return src.replace(re,replacement);
}

fetch(BASE,{cache:'no-store'})
  .then(r=>{if(!r.ok)throw new Error(`Boss 4 base load failed: ${r.status}`);return r.text()})
  .then(src=>{
    src=mustReplace(
      src,
      /  const tank = \{ x: TANK_HOME\.x, y: TANK_HOME\.y, vx: 0, vy: 0, angle: 0, angular: 0, flying: false, resetTimer: 0, bounced: false, hitShaun: false \};/,
      "  const tank = { x: TANK_HOME.x, y: TANK_HOME.y, vx: 0, vy: 0, angle: 0, angular: 0, flying: false, resetTimer: 0, bounced: false, hitShaun: false, flightLife: 0 };",
      'tank lifetime state'
    );

    src=mustReplace(
      src,
      /  function resetTank\(\)\{Object\.assign\(tank,\{x:TANK_HOME\.x,y:TANK_HOME\.y,vx:0,vy:0,angle:0,angular:0,flying:false,resetTimer:0,bounced:false,hitShaun:false\}\);aim=null;hero\.releaseTimer=0;\}/,
      "  function resetTank(){Object.assign(tank,{x:TANK_HOME.x,y:TANK_HOME.y,vx:0,vy:0,angle:0,angular:0,flying:false,resetTimer:0,bounced:false,hitShaun:false,flightLife:0});aim=null;hero.releaseTimer=0;}",
      'reset lifetime'
    );

    src=mustReplace(
      src,
      /Object\.assign\(tank,\{x:h\.x,y:h\.y,vx:dx\*sc\*F\.throwScale\*boost,vy:dy\*sc\*F\.throwScale\*boost,angular:Math\.min\(9,2\+p\/55\),flying:true,resetTimer:0,bounced:false,hitShaun:false\}\)/,
      "Object.assign(tank,{x:h.x,y:h.y,vx:dx*sc*F.throwScale*boost,vy:dy*sc*F.throwScale*boost,angular:Math.min(9,2+p/55),flying:true,resetTimer:0,bounced:false,hitShaun:false,flightLife:0})",
      'throw lifetime reset'
    );

    src=mustReplace(
      src,
      /  function updateTank\(dt\)\{\n    if\(!tank\.flying\)return;/,
      "  function updateTank(dt){\n    if(!tank.flying)return;\n    tank.flightLife+=dt;\n    if(tank.flightLife>=5.0){showToast('VEHICLE RECALLED.',450);resetTank();return;}",
      'hard timeout'
    );

    (0,eval)(src);
  })
  .catch(err=>{console.error(err);const t=document.getElementById('toast');if(t){t.textContent='BOSS 4 PATCH ERROR — REFRESH';t.classList.add('show')}});
})();