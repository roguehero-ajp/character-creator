(() => {
  'use strict';

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function integer(value, fallback) {
    const resolved = Number(value);
    return Number.isFinite(resolved) ? resolved : fallback;
  }

  function defaultRoll(minimum, maximum) {
    const range = maximum - minimum + 1;
    if (window.crypto?.getRandomValues) {
      const bucket = new Uint32Array(1);
      window.crypto.getRandomValues(bucket);
      return minimum + (bucket[0] % range);
    }
    return minimum + Math.floor(Math.random() * range);
  }

  function calculateChance(agility, climb, multiplier) {
    const agilityValue = clamp(integer(agility, 5), 1, 10);
    const climbValue = clamp(integer(climb, 1), 1, 99);
    const multiplierValue = Math.max(0, integer(multiplier, 0));
    return clamp((agilityValue * multiplierValue) + climbValue, 1, 100);
  }

  function resolve(check, character, roll = defaultRoll) {
    if (check?.type !== 'ledge-balance') {
      throw new TypeError('Rock Ledge hazards require a ledge-balance check.');
    }

    const agility = clamp(integer(character?.agility, 5), 1, 10);
    const climb = clamp(integer(character?.climb, 1), 1, 99);
    const luck = clamp(integer(character?.luck, 1), 1, 10);
    const multiplier = Math.max(0, integer(check.multiplier, 0));
    const chance = calculateChance(agility, climb, multiplier);
    const agilityRoll = roll(1, 100);

    if (agilityRoll <= chance) {
      return {
        outcome: 'crossed',
        agility,
        climb,
        multiplier,
        chance,
        agilityRoll,
        luckRoll: null
      };
    }

    const luckRoll = roll(1, 10);
    return {
      outcome: luckRoll <= luck ? 'caught' : 'fell',
      agility,
      climb,
      multiplier,
      chance,
      agilityRoll,
      luckRoll
    };
  }

  window.AvendorLedgeHazard = Object.freeze({
    calculateChance,
    resolve
  });
})();
