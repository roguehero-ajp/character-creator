(() => {
  'use strict';

  const CITY1_BEATEN_KEY = 'johnnyMuscles.city1Beaten';
  const missionComplete = document.getElementById('mission-complete');
  const continueLink = document.getElementById('city1-continue');
  if (!missionComplete || !continueLink) return;

  let handled = false;

  function markCity1Complete() {
    if (handled || !missionComplete.classList.contains('visible')) return;
    handled = true;

    try {
      localStorage.setItem(CITY1_BEATEN_KEY, 'true');
    } catch {
      // Progression still continues for this run if storage is unavailable.
    }

    observer.disconnect();
  }

  const observer = new MutationObserver(markCity1Complete);
  observer.observe(missionComplete, { attributes: true, attributeFilter: ['class'] });
  markCity1Complete();
})();
