(() => {
  'use strict';

  const KEYS = {
    city1Beaten: 'johnnyMuscles.city1Beaten',
    rickUnlocked: 'johnnyMuscles.rickUnlocked',
    rickIntroSeen: 'johnnyMuscles.rickIntroSeen'
  };

  const missionComplete = document.getElementById('mission-complete');
  const continueLink = document.getElementById('city1-continue');
  const unlockNote = document.getElementById('rick-unlock-note');
  if (!missionComplete || !continueLink) return;

  let handled = false;

  function completeRickUnlock() {
    if (handled || !missionComplete.classList.contains('visible')) return;
    handled = true;

    let introSeen = false;
    try {
      localStorage.setItem(KEYS.city1Beaten, 'true');
      localStorage.setItem(KEYS.rickUnlocked, 'true');
      introSeen = localStorage.getItem(KEYS.rickIntroSeen) === 'true';
    } catch {
      // The unlock comic still works for this run if storage is unavailable.
    }

    if (!introSeen) {
      if (unlockNote) unlockNote.hidden = false;
      continueLink.href = 'rick-unlock.html?build=0.11.6';
      continueLink.textContent = 'MEET RICK RAMPAGE';
      continueLink.setAttribute('aria-label', 'View Rick Rampage unlock comic');
    }

    observer.disconnect();
  }

  const observer = new MutationObserver(completeRickUnlock);
  observer.observe(missionComplete, { attributes: true, attributeFilter: ['class'] });
  completeRickUnlock();
})();
