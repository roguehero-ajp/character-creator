(() => {
  'use strict';

  const CORE = 'suburb.js';

  function replaceOrThrow(source, search, replacement, label) {
    const next = source.replace(search, replacement);
    if (next === source) throw new Error(`Suburb 4 tuning target not found: ${label}`);
    return next;
  }

  function replaceAllOrThrow(source, search, replacement, label, expected = 1) {
    const count = source.split(search).length - 1;
    if (count < expected) throw new Error(`Suburb 4 tuning target not found enough times: ${label} (${count}/${expected})`);
    return source.split(search).join(replacement);
  }

  function patch(source) {
    let next = source;

    next = replaceOrThrow(
      next,
      `      waves: [\n        { ground: 2, bats: 1, leapers: 2, gap: .90 },\n        { ground: 3, bats: 2, leapers: 3, gap: .78 },\n        { ground: 3, bats: 2, leapers: 4, gap: .68 }\n      ],`,
      `      waves: [\n        { ground: 2, bats: 1, leapers: 1, chonkers: 1, gap: .90 },\n        { ground: 3, bats: 2, leapers: 2, chonkers: 1, gap: .78 },\n        { ground: 3, bats: 2, leapers: 2, chonkers: 2, gap: .68 }\n      ],`,
      'Level 4 wave mix'
    );

    next = replaceAllOrThrow(
      next,
      `const total = w.ground + w.bats + w.leapers;`,
      `const total = w.ground + w.bats + w.leapers + (w.chonkers || 0);`,
      'wave totals',
      2
    );

    next = replaceOrThrow(
      next,
      `    if (levelNumber === 4) setTimeout(() => showToast('STOP THE LANDING OR THE SHOCKWAVE HITS JOHNNY!', 1900), 1350);`,
      `    if (levelNumber === 4) setTimeout(() => showToast('SMALL LEAPERS CAN BE HIT ANYTIME. SHOCK CHONKERS: AIR HITS ONLY!', 2300), 1350);`,
      'Level 4 warning toast'
    );

    next = replaceOrThrow(
      next,
      `    queue = shuffle([...Array(w.ground).fill('ground'), ...Array(w.bats).fill('bat'), ...Array(w.leapers).fill('leaper')]);`,
      `    queue = shuffle([...Array(w.ground).fill('ground'), ...Array(w.bats).fill('bat'), ...Array(w.leapers).fill('leaper'), ...Array(w.chonkers || 0).fill('shockChonker')]);`,
      'wave queue'
    );

    next = replaceOrThrow(
      next,
      `    const isBat = kind === 'bat';\n    const isLeaper = kind === 'leaper';\n    const scale = isBat ? .82 + Math.random() * .16 : isLeaper ? .96 + Math.random() * .12 : .9 + Math.random() * .18;`,
      `    const isBat = kind === 'bat';\n    const isShockChonker = kind === 'shockChonker';\n    const isLeaper = kind === 'leaper' || isShockChonker;\n    const actorKind = isShockChonker ? 'leaper' : kind;\n    const scale = isBat ? .82 + Math.random() * .16 : isShockChonker ? 1.42 + Math.random() * .12 : isLeaper ? .96 + Math.random() * .12 : .9 + Math.random() * .18;`,
      'shock chonker spawn flags'
    );

    next = replaceOrThrow(
      next,
      `      kind,\n      x: 1190 + Math.random() * 280,`,
      `      kind: actorKind,\n      chonker: isShockChonker,\n      x: 1190 + Math.random() * 280,`,
      'actor chonker flag'
    );

    next = replaceOrThrow(
      next,
      `      speed: isBat ? 72 + Math.random() * 16 : isLeaper ? 30 + Math.random() * 8 : 54 + Math.random() * 17,`,
      `      speed: isBat ? 72 + Math.random() * 16 : isShockChonker ? 23 + Math.random() * 5 : isLeaper ? 30 + Math.random() * 8 : 54 + Math.random() * 17,`,
      'shock chonker speed'
    );

    next = replaceOrThrow(
      next,
      `      jumpCooldown: 1.55 + Math.random() * .65,`,
      `      jumpCooldown: isShockChonker ? 2.05 + Math.random() * .55 : 1.55 + Math.random() * .65,`,
      'shock chonker jump cooldown'
    );

    next = replaceOrThrow(
      next,
      `    const base = a.kind === 'leaper' ? 360 : a.kind === 'bat' ? 240 : 130;`,
      `    const base = a.chonker ? 520 : a.kind === 'leaper' ? 360 : a.kind === 'bat' ? 240 : 130;`,
      'shock chonker score'
    );

    next = replaceOrThrow(
      next,
      `    shockwaves.push({ x: a.x, radius: 18, prevRadius: 18, speed: 720, maxRadius: Math.max(220, Math.abs(a.x - JOHNNY_HIT_X) + 70), life: 1.7, hitJohnny: false });`,
      `    shockwaves.push({ x: a.x, radius: 18, prevRadius: 18, speed: 590, maxRadius: 300, life: 1.1, hitJohnny: false });`,
      'shockwave range and speed'
    );

    next = replaceOrThrow(
      next,
      `      if (!s.hitJohnny && s.prevRadius < distance && s.radius >= distance) {`,
      `      if (!s.hitJohnny && distance <= s.maxRadius && s.prevRadius < distance && s.radius >= distance) {`,
      'shockwave damage range guard'
    );

    next = replaceOrThrow(
      next,
      `    a.vy = -530 - (levelNumber - 2) * 18;`,
      `    a.vy = a.chonker ? -475 : -530 - (levelNumber - 2) * 18;`,
      'heavy chonker leap'
    );

    next = replaceOrThrow(
      next,
      `          if (LEVEL.shockLanding && !a.interrupted) createShockwave(a);`,
      `          if (LEVEL.shockLanding && a.chonker && !a.interrupted) createShockwave(a);`,
      'chonker-only shock landing'
    );

    next = replaceOrThrow(
      next,
      `      if (a.kind === 'leaper' && LEVEL.airOnly && !a.airborne) {`,
      `      if (a.kind === 'leaper' && LEVEL.airOnly && !a.airborne && a.chonker) {`,
      'Shock Chonker ground armor only'
    );

    next = replaceOrThrow(
      next,
      `      E.drawGround(ctx, { phase: a.bob });`,
      `      E.drawGround(ctx, { phase: a.bob, chonker: !!a.chonker });`,
      'chonker art'
    );

    next = replaceOrThrow(
      next,
      `        ctx.fillText('↟', 0, -53);`,
      `        ctx.fillText(a.chonker ? '⚡' : '↟', 0, -53);`,
      'shock chonker icon'
    );

    next = replaceOrThrow(
      next,
      `      const alpha = clamp(s.life / 1.7, 0, 1);`,
      `      const alpha = clamp(s.life / 1.1, 0, 1);`,
      'shockwave fade timing'
    );

    return next;
  }

  fetch(`${CORE}?rev=0.10.2-core`, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`Could not load ${CORE}: ${response.status}`);
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
        throw new Error('Could not execute tuned Suburb 4 core');
      };
      document.body.appendChild(script);
    })
    .catch(error => {
      console.error('[Johnny Muscles Suburb 4 tuning]', error);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = 'SHOCKWAVE TUNING FAILED TO DEPLOY';
        toast.classList.add('show');
      }
    });
})();
