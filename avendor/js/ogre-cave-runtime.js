(() => {
  'use strict';

  const AREA_ID = 'briarwell-ogre-cave';
  const STORAGE_KEY = 'avendorOgreCaveLoot.v1';
  const ACTIONS = Object.freeze({
    'claim-ogre-cave-chest': 'chestOpened',
    'claim-ogre-frost-longsword': 'swordClaimed',
    'claim-ogre-metal-shield': 'shieldClaimed'
  });

  function defaultState() {
    return {
      chestOpened: false,
      swordClaimed: false,
      shieldClaimed: false
    };
  }

  function sanitize(candidate) {
    const state = defaultState();
    if (!candidate || typeof candidate !== 'object') return state;
    Object.keys(state).forEach((key) => {
      state[key] = candidate[key] === true;
    });
    return state;
  }

  function readState() {
    try {
      return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
    } catch (_) {
      return defaultState();
    }
  }

  function saveState(candidate) {
    const state = sanitize(candidate);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  }

  function claim(action, candidate = readState()) {
    const state = sanitize(candidate);
    const key = ACTIONS[action];
    if (!key) return { handled: false, firstClaim: false, state };
    const firstClaim = !state[key];
    state[key] = true;
    return { handled: true, firstClaim, state };
  }

  function noticeFor(action, firstClaim) {
    if (action === 'claim-ogre-cave-chest') {
      return firstClaim
        ? 'The chest contains an emerald, a sapphire, a ruby, 30 gold pieces and 40 silver pieces.'
        : 'The iron-banded chest is empty.';
    }
    if (action === 'claim-ogre-frost-longsword') {
      return firstClaim
        ? 'You claim the magic longsword. Its strikes add 2 frost damage and inflict Slow.'
        : 'You already claimed the frost-touched longsword.';
    }
    if (action === 'claim-ogre-metal-shield') {
      return firstClaim
        ? 'You claim the sturdy metal shield.'
        : 'You already claimed the metal shield.';
    }
    return '';
  }

  window.AvendorOgreCave = Object.freeze({
    AREA_ID,
    STORAGE_KEY,
    ACTIONS,
    defaultState,
    sanitize,
    readState,
    saveState,
    claim,
    noticeFor
  });

  if (typeof document === 'undefined' || !window.AvendorWalkTest) return;

  const stage = document.getElementById('walk-stage');

  window.addEventListener('avendor:feature-interaction', (event) => {
    const areaId = event.detail?.area?.id || event.detail?.map?.id;
    const action = event.detail?.feature?.action;
    if (areaId !== AREA_ID || !ACTIONS[action]) return;

    event.preventDefault();
    const result = claim(action);
    if (result.firstClaim) saveState(result.state);
    window.AvendorWalkTest.setNotice?.(noticeFor(action, result.firstClaim), 5400);

    if (stage) {
      stage.dataset.ogreCaveChest = result.state.chestOpened ? 'opened' : 'closed';
      stage.dataset.ogreCaveSword = result.state.swordClaimed ? 'claimed' : 'available';
      stage.dataset.ogreCaveShield = result.state.shieldClaimed ? 'claimed' : 'available';
    }
  });
})();
