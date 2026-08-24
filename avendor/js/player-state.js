(() => {
  'use strict';

  const STORAGE_KEY = 'avendorPlayerState.v1';
  const SCHEMA_VERSION = 1;
  const BASE_STAT = 5;
  const BONUS_POOL = 8;
  const STAT_MAX = 10;

  const STAT_KEYS = Object.freeze([
    'strength', 'agility', 'coordination', 'knowledge',
    'intuition', 'perception', 'charm', 'hardiness'
  ]);

  const STAT_LABELS = Object.freeze({
    strength: 'Strength',
    agility: 'Agility',
    coordination: 'Coordination',
    knowledge: 'Knowledge',
    intuition: 'Intuition',
    perception: 'Perception',
    charm: 'Charm',
    hardiness: 'Hardiness'
  });

  const BACKGROUNDS = Object.freeze({
    farmhand: {
      name: 'Farmhand',
      description: 'You grew up working with your hands, repairing what broke and enduring long days.',
      skill: 'Carpentry'
    },
    apprentice: {
      name: 'Apprentice',
      description: 'You spent your early years learning a trade under someone more experienced and demanding.',
      skill: 'Smithing'
    },
    streetUrchin: {
      name: 'Street Urchin',
      description: 'Crowded streets taught you to move quickly, read opportunity and survive with very little.',
      skill: 'Pickpocketing'
    },
    hunter: {
      name: 'Hunter',
      description: 'Trails, spoor and weather signs were part of daily life long before adventure found you.',
      skill: 'Tracking'
    },
    merchantChild: {
      name: "Merchant's Child",
      description: 'You learned early that a good price, a good story and a good read of people can change everything.',
      skill: 'Haggling'
    },
    scholar: {
      name: 'Scholar',
      description: 'Books, tutors and patient study gave you a head full of facts most people never needed to know.',
      skill: 'Lore: Avendor'
    }
  });

  const PRACTICED_SKILLS = Object.freeze([
    'Lockpicking', 'Pickpocketing', 'Tracking', 'Healing', 'Herbalism',
    'Smithing', 'Carpentry', 'Haggling', 'Stealthcraft', 'Sword',
    'Bow', 'Shield', 'Lore: Avendor', 'Languages', 'Swimming'
  ]);

  const NATURAL_SKILLS = Object.freeze([
    ['Dodge', 'agility', 'perception'],
    ['Climb', 'strength', 'agility'],
    ['Jump', 'strength', 'agility'],
    ['Sneak', 'agility', 'perception'],
    ['Notice', 'perception', 'intuition'],
    ['Search', 'perception', 'knowledge'],
    ['Persuade', 'charm', 'intuition'],
    ['Intimidate', 'charm', 'strength'],
    ['Deceive', 'charm', 'intuition'],
    ['Recall', 'knowledge', 'perception'],
    ['Endure', 'hardiness', 'strength'],
    ['Throw', 'coordination', 'strength']
  ]);

  function defaultStats() {
    return Object.fromEntries(STAT_KEYS.map((key) => [key, BASE_STAT]));
  }

  function createDefault() {
    return {
      schemaVersion: SCHEMA_VERSION,
      name: '',
      body: 'male',
      background: 'farmhand',
      stats: defaultStats(),
      practicedSkills: [],
      reputation: {
        Briarwell: 'Unknown',
        'Town Guard': 'Unknown',
        Merchants: 'Unknown',
        Underworld: 'Unknown'
      }
    };
  }

  function clampInt(value, minimum, maximum) {
    const number = Number.parseInt(value, 10);
    if (!Number.isFinite(number)) return minimum;
    return Math.max(minimum, Math.min(maximum, number));
  }

  function sanitize(candidate) {
    const state = createDefault();
    if (!candidate || typeof candidate !== 'object') return state;

    state.name = String(candidate.name || '').trim().slice(0, 32);
    state.body = candidate.body === 'female' ? 'female' : 'male';
    if (BACKGROUNDS[candidate.background]) state.background = candidate.background;

    for (const key of STAT_KEYS) {
      state.stats[key] = clampInt(candidate.stats?.[key], BASE_STAT, STAT_MAX);
    }

    const spent = pointsSpent(state);
    if (spent > BONUS_POOL) {
      state.stats = defaultStats();
    }

    const backgroundSkill = BACKGROUNDS[state.background].skill;
    const practiced = Array.isArray(candidate.practicedSkills) ? candidate.practicedSkills : [];
    state.practicedSkills = [...new Set(practiced)]
      .filter((skill) => PRACTICED_SKILLS.includes(skill) && skill !== backgroundSkill)
      .slice(0, 2);

    if (candidate.reputation && typeof candidate.reputation === 'object') {
      for (const key of Object.keys(state.reputation)) {
        if (typeof candidate.reputation[key] === 'string') {
          state.reputation[key] = candidate.reputation[key].slice(0, 30);
        }
      }
    }

    return state;
  }

  function pointsSpent(state) {
    return STAT_KEYS.reduce((sum, key) => sum + Math.max(0, state.stats[key] - BASE_STAT), 0);
  }

  function pointsRemaining(state) {
    return Math.max(0, BONUS_POOL - pointsSpent(state));
  }

  function getBackground(state) {
    return BACKGROUNDS[state.background] || BACKGROUNDS.farmhand;
  }

  function derivedResources(state) {
    const s = state.stats;
    return {
      health: 30 + (s.hardiness * 6) + (s.strength * 2),
      stamina: 30 + (s.hardiness * 4) + (s.agility * 2) + (s.strength * 2),
      will: 25 + (s.intuition * 4) + (s.knowledge * 3)
    };
  }

  function naturalSkills(state) {
    return NATURAL_SKILLS.map(([name, left, right]) => ({
      name,
      rating: ((state.stats[left] + state.stats[right]) / 2).toFixed(1),
      formula: `${STAT_LABELS[left]} + ${STAT_LABELS[right]}`
    }));
  }

  function allPracticedSkills(state) {
    const granted = getBackground(state).skill;
    return [granted, ...state.practicedSkills.filter((skill) => skill !== granted)];
  }

  function save(candidate) {
    const state = sanitize(candidate);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    sessionStorage.setItem('avendorHeroBody', state.body);
    return state;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? sanitize(JSON.parse(raw)) : createDefault();
    } catch (error) {
      console.warn('Could not load Avendor player state.', error);
      return createDefault();
    }
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  window.AvendorPlayerState = Object.freeze({
    STORAGE_KEY,
    SCHEMA_VERSION,
    BASE_STAT,
    BONUS_POOL,
    STAT_MAX,
    STAT_KEYS,
    STAT_LABELS,
    BACKGROUNDS,
    PRACTICED_SKILLS,
    NATURAL_SKILLS,
    createDefault,
    sanitize,
    pointsSpent,
    pointsRemaining,
    getBackground,
    derivedResources,
    naturalSkills,
    allPracticedSkills,
    save,
    load,
    clear
  });
})();
