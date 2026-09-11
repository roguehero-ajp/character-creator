(() => {
  'use strict';

  const read = key => {
    try { return localStorage.getItem(key); } catch { return null; }
  };

  const rickUnlocked = read('johnnyMuscles.rickUnlocked') === 'true' || read('johnnyMuscles.city1Beaten') === 'true';
  const useRickRoutine = read('johnnyMuscles.selectedCharacter') === 'rick' && rickUnlocked;

  const script = document.createElement('script');
  if (useRickRoutine) {
    script.src = 'rick-boss1.js?rev=0.11.10';
  } else {
    script.src = 'enemy-runtime.js?rev=0.11.10';
    script.dataset.core = 'boss1.js';
  }
  document.body.appendChild(script);
})();
