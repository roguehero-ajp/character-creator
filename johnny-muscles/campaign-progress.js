(() => {
  'use strict';

  const current = document.currentScript;
  const flag = current?.dataset?.flag;
  if (!flag) return;

  const victory = document.getElementById('mission-complete');
  if (!victory) return;

  let recorded = false;
  function recordVictory() {
    if (recorded || !victory.classList.contains('visible')) return;
    recorded = true;
    try { localStorage.setItem(flag, 'true'); } catch { /* Storage unavailable; gameplay still continues. */ }
  }

  recordVictory();
  if (!recorded) {
    const observer = new MutationObserver(() => {
      recordVictory();
      if (recorded) observer.disconnect();
    });
    observer.observe(victory, { attributes: true, attributeFilter: ['class'] });
  }
})();
