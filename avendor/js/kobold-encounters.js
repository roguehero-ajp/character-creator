(() => {
  'use strict';

  const STORAGE_KEY = 'avendorSewerKobolds.v1';
  const CLEAR_TARGET = 25;

  const LOOT = Object.freeze({
    regular: Object.freeze({
      weapons: [{ item: 'short-sword', quality: 'poor', quantity: 1 }],
      copper: [0, 10],
      silver: [0, 10],
      gold: [0, 0]
    }),
    champion: Object.freeze({
      weapons: [
        { item: 'mace', quality: 'average', quantity: 1 },
        { item: 'shield', quality: 'average', quantity: 1 }
      ],
      copper: [0, 0],
      silverRolls: [[5, 10], [5, 20]],
      gold: [0, 2]
    })
  });

  function randomInt(minimum, maximum) {
    if (window.crypto?.getRandomValues) {
      const bucket = new Uint32Array(1);
      window.crypto.getRandomValues(bucket);
      return minimum + (bucket[0] % (maximum - minimum + 1));
    }
    return minimum + Math.floor(Math.random() * (maximum - minimum + 1));
  }

  function rollChance(chance) {
    return Math.random() < chance;
  }

  function defaultState() {
    return {
      roamingKills: 0,
      area15Cleared: false,
      sewersCleared: false
    };
  }

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return { ...defaultState(), ...(stored && typeof stored === 'object' ? stored : {}) };
    } catch (_) {
      return defaultState();
    }
  }

  function saveState(state) {
    const next = {
      ...defaultState(),
      ...state
    };
    next.sewersCleared = next.roamingKills >= CLEAR_TARGET && next.area15Cleared === true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function rollAreaEntry(areaId) {
    const state = loadState();
    if (state.sewersCleared) {
      return { areaId, regular: 0, champion: 0, cleared: true };
    }

    return {
      areaId,
      regular: rollChance(0.25) ? randomInt(1, 3) : 0,
      champion: rollChance(0.05) ? 1 : 0,
      cleared: false
    };
  }

  function rollLoot(variant) {
    const table = LOOT[variant] || LOOT.regular;
    const result = {
      weapons: table.weapons.map((item) => ({ ...item })),
      copper: randomInt(...table.copper),
      silver: 0,
      gold: randomInt(...table.gold)
    };
    if (table.silverRolls) {
      result.silverRolls = table.silverRolls.map((range) => randomInt(range[0], range[1]));
      result.silver = result.silverRolls.reduce((total, value) => total + value, 0);
    } else {
      result.silver = randomInt(...table.silver);
    }
    return result;
  }

  function recordRoamingKill(count = 1) {
    const state = loadState();
    state.roamingKills = Math.max(0, state.roamingKills + Number(count || 0));
    return saveState(state);
  }

  function markArea15Cleared() {
    const state = loadState();
    state.area15Cleared = true;
    return saveState(state);
  }

  window.AvendorKoboldEncounters = Object.freeze({
    STORAGE_KEY,
    CLEAR_TARGET,
    LOOT,
    loadState,
    saveState,
    rollAreaEntry,
    rollLoot,
    recordRoamingKill,
    markArea15Cleared
  });
})();
