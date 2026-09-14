(() => {
  'use strict';

  const KEYS = {
    bobBeatenAsJohnny: 'johnnyMuscles.bobBeatenAsJohnny',
    rickUnlocked: 'johnnyMuscles.rickUnlocked',
    rickIntroSeen: 'johnnyMuscles.rickIntroSeen',
    selectedCharacter: 'johnnyMuscles.selectedCharacter'
  };

  const read = key => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  };
  const remove = key => {
    try { localStorage.removeItem(key); } catch { /* Storage unavailable. */ }
  };

  // Migration from the old City 1 unlock rule. There is no trustworthy old
  // flag proving Bob was beaten as Johnny, so invalid early unlocks are reset.
  const bobBeatenAsJohnny = read(KEYS.bobBeatenAsJohnny) === 'true';
  if (!bobBeatenAsJohnny) {
    remove(KEYS.rickUnlocked);
    remove(KEYS.rickIntroSeen);
    if (read(KEYS.selectedCharacter) === 'rick') write(KEYS.selectedCharacter, 'johnny');
  }

  const rickUnlocked = bobBeatenAsJohnny && read(KEYS.rickUnlocked) === 'true';
  const selectedCharacter = read(KEYS.selectedCharacter) || 'johnny';
  const useRickRoutine = selectedCharacter === 'rick' && rickUnlocked;

  const script = document.createElement('script');
  if (useRickRoutine) {
    script.src = 'rick-boss1.js?rev=0.11.11';
  } else {
    script.src = 'enemy-runtime.js?rev=0.11.11';
    script.dataset.core = 'boss1.js';
  }
  document.body.appendChild(script);

  // The Rick introduction comic now plays after every Bob victory, including
  // Rick rematches. Unlock eligibility itself remains Johnny-only.
  if (useRickRoutine) return;

  const missionComplete = document.getElementById('mission-complete');
  if (!missionComplete) return;

  let handled = false;

  function handleJohnnyVictory() {
    if (handled || !missionComplete.classList.contains('visible')) return;
    handled = true;
    write(KEYS.bobBeatenAsJohnny, 'true');
    write(KEYS.rickUnlocked, 'true');
    observer.disconnect();
  }

  const observer = new MutationObserver(handleJohnnyVictory);
  observer.observe(missionComplete, { attributes: true, attributeFilter: ['class'] });
  handleJohnnyVictory();
})();
