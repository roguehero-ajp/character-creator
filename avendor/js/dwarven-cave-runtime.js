(() => {
  'use strict';
  const SECRET_AREA = 'briarwell-dwarven-c06';
  const VISTA_AREA = 'briarwell-dwarven-vista';
  const SECRET_TARGET = 'briarwell-dwarven-secret';
  const DISCOVERY_KEY = 'avendorDwarvenSecretDoor.v1';
  const stage = document.getElementById('walk-stage');
  const player = document.getElementById('player');
  const help = document.getElementById('walk-help');
  const sceneStatus = document.getElementById('scene-status');
  if (!stage || !player || !window.AvendorWalkTest) return;

  function randomD100() {
    if (window.crypto?.getRandomValues) {
      const value = new Uint32Array(1);
      window.crypto.getRandomValues(value);
      return 1 + (value[0] % 100);
    }
    return 1 + Math.floor(Math.random() * 100);
  }

  function searchRating() {
    const state = window.AvendorPlayerState?.load?.();
    const skill = window.AvendorPlayerState?.naturalSkills?.(state)?.find((entry) => entry.name === 'Search');
    return Math.max(1, Number(skill?.rating) || 1);
  }

  function announce(text) {
    if (help) help.textContent = text;
    if (sceneStatus) sceneStatus.textContent = text;
  }

  async function useSecretMechanism(event) {
    const area = window.AvendorWalkTest.getArea?.();
    if (area?.id !== SECRET_AREA) return false;
    const position = window.AvendorWalkTest.getPosition?.();
    if (!position) return false;
    const distance = Math.hypot(position.x - 626.25, position.y - 288.75);
    if (distance > 108.75) return false;

    event.preventDefault();
    event.stopImmediatePropagation();
    const rating = searchRating();
    const chance = Math.floor(rating / 2);
    const discovered = localStorage.getItem(DISCOVERY_KEY) === '1';
    if (!discovered) {
      const roll = randomD100();
      if (roll > chance) {
        announce(`You inspect the precise eastern stonework, but its secret stays hidden. Search/2 chance ${chance}%; rolled ${roll}.`);
        return true;
      }
      localStorage.setItem(DISCOVERY_KEY, '1');
      announce(`A disguised stone catches under your fingers. Search/2 chance ${chance}%; rolled ${roll}. The hidden dwarven door opens.`);
      await new Promise((resolve) => setTimeout(resolve, 420));
    }
    await window.AvendorWalkTest.loadArea(SECRET_TARGET, 'from-west');
    return true;
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat || !['e',' ','enter'].includes(event.key.toLowerCase())) return;
    void useSecretMechanism(event);
  }, true);

  function updateVistaPresentation() {
    const onVista = window.AvendorWalkTest.getArea?.()?.id === VISTA_AREA;
    player.style.visibility = onVista ? 'hidden' : '';
    if (onVista) announce('Briarwell spreads below the mountain, with the town to the right and the twin-island lake beyond. Press E or Space to return.');
  }

  const areaObserver = new MutationObserver(updateVistaPresentation);
  areaObserver.observe(stage, { attributes: true, attributeFilter: ['data-area-id'] });
  updateVistaPresentation();
})();
