(() => {
  'use strict';

  const current = document.currentScript;
  const core = current?.dataset?.core;
  if (!core) throw new Error('enemy-runtime.js requires data-core');
  if (!window.JMEnemyArt) throw new Error('enemy-art.js must load before enemy-runtime.js');

  function replaceOrThrow(source, regex, replacement, label) {
    const next = source.replace(regex, replacement);
    if (next === source) throw new Error(`Enemy art patch target not found: ${label}`);
    return next;
  }

  function patch(source) {
    if (core === 'game.js') {
      return replaceOrThrow(
        source,
        /  function drawCat\(cat\) \{[\s\S]*?\n  \}\n\n  function drawAim\(\) \{/,
        `  function drawCat(cat) {\n    ctx.save();\n    ctx.translate(cat.x, cat.y + Math.sin(cat.bob) * 2);\n    ctx.scale(cat.scale, cat.scale);\n    window.JMEnemyArt.drawGround(ctx, { chonker: cat.chonker, wounded: cat.hp < cat.maxHp, phase: cat.bob });\n    ctx.restore();\n  }\n\n  function drawAim() {`,
        'City 1 drawCat'
      );
    }

    if (core === 'city2.js') {
      return replaceOrThrow(
        source,
        /  function drawCat\(cat\) \{[\s\S]*?\n  \}\n\n  function drawAim\(\) \{/,
        `  function drawCat(cat) {\n    ctx.save();\n    const crouchY = cat.crouch * 10;\n    ctx.translate(cat.x, cat.y + Math.sin(cat.bob) * 2 + crouchY);\n    ctx.scale(cat.scale, cat.scale * (1 - cat.crouch * 0.12));\n    window.JMEnemyArt.drawGround(ctx, { chonker: cat.chonker, wounded: cat.hp < cat.maxHp, phase: cat.bob, crouch: cat.crouch, windup: cat.mode === 'windup' });\n    ctx.restore();\n  }\n\n  function drawAim() {`,
        'City 2 drawCat'
      );
    }

    if (core === 'city3.js') {
      let next = replaceOrThrow(
        source,
        /  function drawGroundCat\(cat\) \{[\s\S]*?\n  \}\n\n  function drawBatCat\(cat\) \{/,
        `  function drawGroundCat(cat) {\n    window.JMEnemyArt.drawGround(ctx, { chonker: cat.chonker, wounded: cat.hp < cat.maxHp, phase: cat.bob });\n  }\n\n  function drawBatCat(cat) {`,
        'City 3 drawGroundCat'
      );
      next = replaceOrThrow(
        next,
        /  function drawBatCat\(cat\) \{[\s\S]*?\n  \}\n\n  function drawCat\(cat\) \{/,
        `  function drawBatCat(cat) {\n    window.JMEnemyArt.drawBat(ctx, { phase: cat.phase });\n  }\n\n  function drawCat(cat) {`,
        'City 3 drawBatCat'
      );
      return next;
    }

    if (core === 'city4.js') {
      return replaceOrThrow(
        source,
        /  function drawActor\(a\)\{[\s\S]*?\n  function render\(\)\{/,
        `  function drawActor(a){\n    ctx.save();\n    ctx.translate(a.x,a.y+Math.sin(a.bob)*2);\n    if(a.kind==='friendly'&&a.bonked)ctx.rotate(a.spin*.15);\n    ctx.scale(a.scale,a.scale);\n    if(a.kind==='friendly') window.JMEnemyArt.drawFriendly(ctx,{color:a.color,phase:a.bob,bonked:a.bonked});\n    else window.JMEnemyArt.drawGround(ctx,{chonker:a.chonker,wounded:a.hp<a.maxHp,phase:a.bob});\n    ctx.restore();\n  }\n  function render(){`,
        'City 4 drawActor'
      );
    }

    if (core === 'city5.js') {
      return replaceOrThrow(
        source,
        /  function drawCat\(c\)\{[\s\S]*?\n  function render\(\)\{/,
        `  function drawCat(c){\n    ctx.save();\n    ctx.translate(c.x,c.y+Math.sin(c.bob)*2);\n    ctx.scale(c.scale,c.scale);\n    if(c.kind==='brain') window.JMEnemyArt.drawBrain(ctx,{phase:c.phase,charge:Math.max(0,Math.min(1,(.8-c.pulseTimer)/.8))});\n    else if(c.kind==='bat') window.JMEnemyArt.drawBat(ctx,{phase:c.phase});\n    else window.JMEnemyArt.drawGround(ctx,{chonker:c.chonker,wounded:c.hp<c.maxHp,phase:c.bob});\n    ctx.restore();\n  }\n  function render(){`,
        'City 5 drawCat'
      );
    }

    if (core === 'boss1.js') {
      return replaceOrThrow(
        source,
        /  function drawBob\(\)\{[\s\S]*?\n  function render\(\)\{/,
        `  function drawBob(){\n    ctx.save();\n    ctx.translate(bossX,GROUND-45);\n    ctx.scale(1.6,1.6);\n    window.JMEnemyArt.drawBob(ctx,{flash:bossHitFlash>0,phase:bossPhase,windup:bossWindup,time:elapsed});\n    if(bossWindup>0) drawTank(ctx,{x:0,y:-225,angle:-.12},'BOB TANK');\n    ctx.restore();\n  }\n  function render(){`,
        'Boss 1 drawBob'
      );
    }

    throw new Error(`Unsupported enemy runtime core: ${core}`);
  }

  fetch(`${core}?rev=0.9.2-core`, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`Could not load ${core}: ${response.status}`);
      return response.text();
    })
    .then(source => patch(source))
    .then(source => {
      const blob = new Blob([source], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => URL.revokeObjectURL(url);
      script.onerror = () => {
        URL.revokeObjectURL(url);
        throw new Error(`Could not execute patched ${core}`);
      };
      document.body.appendChild(script);
    })
    .catch(error => {
      console.error('[Johnny Muscles enemy visuals]', error);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = 'ENEMY ART FAILED TO DEPLOY';
        toast.classList.add('show');
      }
    });
})();
