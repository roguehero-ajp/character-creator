(() => {
'use strict';

const BASE='boss5.js?rev=0.14.0-base';

function mustReplace(src,re,replacement,label){
  if(!re.test(src)) throw new Error(`Boss 5 patch failed: ${label}`);
  return src.replace(re,replacement);
}

fetch(BASE,{cache:'no-store'})
  .then(r=>{if(!r.ok)throw new Error(`Boss 5 base load failed: ${r.status}`);return r.text()})
  .then(src=>{
    src=mustReplace(
      src,
      /function render\(\)\{/,
      `function drawTrajectory(){
if(!aim||tank.flying)return;
const dx=tank.x-aim.x,dy=tank.y-aim.y,p=Math.hypot(dx,dy);
if(p<1)return;
const sc=Math.min(p,MAX_PULL)/p,b=steroidTimer>0?1.42:1,h=held(),vx=dx*sc*F.throwScale*b,vy=dy*sc*F.throwScale*b,g=GRAVITY*F.gravityMultiplier;
ctx.save();ctx.strokeStyle=steroidTimer>0?'#a8ff58':'#ffcf33';ctx.lineWidth=3;ctx.setLineDash([7,7]);ctx.beginPath();ctx.moveTo(h.x,h.y);
for(let i=1;i<=34;i++){const tt=i*.07,x=h.x+vx*tt,y=h.y+vy*tt+.5*g*tt*tt;if(y>GROUND-22||x>2100)break;ctx.lineTo(x,y)}
ctx.stroke();ctx.restore();
}
function render(){`,
      'trajectory function'
    );

    src=mustReplace(
      src,
      /if\(aim&&!tank\.flying\)\{ctx\.strokeStyle='#ffcf33';ctx\.lineWidth=4;ctx\.setLineDash\(\[10,8\]\);ctx\.beginPath\(\);ctx\.moveTo\(tank\.x,tank\.y\);ctx\.lineTo\(aim\.x,aim\.y\);ctx\.stroke\(\);ctx\.setLineDash\(\[\]\)\}/,
      'drawTrajectory()',
      'straight guide replacement'
    );

    (0,eval)(src);
  })
  .catch(err=>{console.error(err);const t=document.getElementById('toast');if(t){t.textContent='BOSS 5 PATCH ERROR — REFRESH';t.classList.add('show')}});
})();