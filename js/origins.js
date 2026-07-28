/**
 * My RPG Source - Character Origins Module
 * ----------------------------------------
 * Loads edition-specific Race or Species data and applies:
 *  - dropdown options
 *  - speed
 *  - concise trait summaries
 *  - 2014 race ability bonuses
 *  - flexible 2014 bonuses such as Half-Elf
 *
 * 2014 data: data/dnd5e/2014/races.json
 * 2024 data: data/dnd5e/2024/species.json
 *
 * Until the selected JSON file contains entries, this module stays
 * inactive so the current legacy Race controls keep working.
 */

(() => {
  'use strict';

  const config = window.MyRPGConfig;
  const calc = window.CharacterCalculations;
  const STAT_IDS = calc?.STAT_INPUTS || ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  const state = {
    active: false,
    loaded: false,
    entries: [],
    byId: new Map(),
    byName: new Map(),
    selectedId: '',
    error: null
  };

  let readyPromise = Promise.resolve(state);

  function text(value) {
    return String(value ?? '').trim();
  }

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function slugify(value) {
    return text(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function uniqueStrings(values) {
    const seen = new Set();

    return values
      .map(text)
      .filter(Boolean)
      .filter((value) => {
        const key = value.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function getElements() {
    return {
      select: document.getElementById('char-race'),
      speed: document.getElementById('speed-input'),
      traits: document.getElementById('racial-abilities-input'),
      flexibleContainer: document.getElementById('half-elf-bonuses'),
      flexibleFirst: document.getElementById('half-elf-stat1'),
      flexibleSecond: document.getElementById('half-elf-stat2')
    };
  }

  function refreshCalculations() {
    if (calc?.refreshAll) {
      calc.refreshAll();
    } else if (typeof window.updateModifiers === 'function') {
      window.updateModifiers();
    }
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Could not load ${path} (${response.status}).`);
    }

    return response.json();
  }

  function getCollection(data) {
    const preferred = config?.settings?.originCollection;

    if (preferred && Array.isArray(data?.[preferred])) {
      return data[preferred];
    }

    if (Array.isArray(data?.races)) return data.races;
    if (Array.isArray(data?.species)) return data.species;
    return [];
  }

  function normalizeBonuses(entry) {
    const source = entry?.abilityBonuses || entry?.fixedAbilityBonuses || {};
    const result = {};

    STAT_IDS.forEach((stat) => {
      const bonus = number(source[stat], 0);
      if (bonus !== 0) result[stat] = bonus;
    });

    return result;
  }

  function normalizeFlexibleBonuses(entry) {
    const source = entry?.flexibleAbilityBonuses || entry?.abilityChoices;
    if (!source) return null;

    const count = Math.max(0, Math.floor(number(source.count, 0)));
    const amount = Math.max(0, number(source.amount ?? source.bonus, 0));

    if (!count || !amount) return null;

    return {
      count,
      amount,
      distinct: source.distinct !== false && source.mustBeDifferent !== false,
      exclude: uniqueStrings(Array.isArray(source.exclude) ? source.exclude : [])
        .map((stat) => stat.toLowerCase())
    };
  }

  function normalizeTraits(entry) {
    const source = Array.isArray(entry?.traits) ? entry.traits : [];

    return source
      .map((trait) => {
        if (trait && typeof trait === 'object') {
          return {
            name: text(trait.name || trait.title),
            summary: text(trait.summary || trait.description)
          };
        }

        return { name: text(trait), summary: '' };
      })
      .filter((trait) => trait.name);
  }

  function normalizeSpeed(entry) {
    if (typeof entry?.speed === 'string' || typeof entry?.speed === 'number') {
      return text(entry.speed);
    }

    if (!entry?.speed || typeof entry.speed !== 'object') return '';

    const parts = [];
    const walking = entry.speed.walking ?? entry.speed.walk;
    const flying = entry.speed.flying ?? entry.speed.fly;
    const swimming = entry.speed.swimming ?? entry.speed.swim;
    const climbing = entry.speed.climbing ?? entry.speed.climb;

    if (walking) parts.push(`${walking} ft`);
    if (flying) parts.push(`${flying} ft fly`);
    if (swimming) parts.push(`${swimming} ft swim`);
    if (climbing) parts.push(`${climbing} ft climb`);

    return parts.join(' / ');
  }

  function normalizeEntry(entry, index) {
    if (!entry || typeof entry !== 'object') return null;

    const name = text(entry.name);
    if (!name) return null;

    return {
      id: text(entry.id) || slugify(name) || `origin-${index + 1}`,
      name,
      speed: normalizeSpeed(entry),
      traits: normalizeTraits(entry),
      abilityBonuses: normalizeBonuses(entry),
      flexibleAbilityBonuses: normalizeFlexibleBonuses(entry),
      category: text(entry.category),
      sourceScope: text(entry.sourceScope),
      raw: entry
    };
  }

  function validateEdition(data) {
    const fileEdition = text(data?.edition);

    if (fileEdition && fileEdition !== config.edition) {
      throw new Error(
        `Origin data edition ${fileEdition} does not match builder edition ${config.edition}.`
      );
    }
  }

  function indexEntries(entries) {
    state.byId.clear();
    state.byName.clear();

    entries.forEach((entry) => {
      state.byId.set(entry.id, entry);
      state.byName.set(entry.name.toLowerCase(), entry);
    });
  }

  function findEntry(value) {
    const cleaned = text(value);
    if (!cleaned) return null;

    return state.byId.get(cleaned) || state.byName.get(cleaned.toLowerCase()) || null;
  }

  function populateDropdown(entries) {
    const { select } = getElements();
    if (!select) return;

    const previousEntry = findEntry(select.value);
    const fragment = document.createDocumentFragment();
    const placeholder = document.createElement('option');

    placeholder.value = '';
    placeholder.textContent = `--Select ${config.settings.originTerm}--`;
    fragment.appendChild(placeholder);

    entries.forEach((entry) => {
      const option = document.createElement('option');
      option.value = entry.id;
      option.textContent = entry.name;
      fragment.appendChild(option);
    });

    select.replaceChildren(fragment);

    const desiredId = previousEntry?.id || state.selectedId;
    if (desiredId && state.byId.has(desiredId)) select.value = desiredId;
  }

  function formatTraits(entry) {
    if (!entry) return '';

    return entry.traits
      .map((trait) => trait.summary
        ? `• ${trait.name}: ${trait.summary}`
        : `• ${trait.name}`)
      .join('\n');
  }

  function updateDisplay(entry) {
    const { speed, traits } = getElements();

    if (speed) speed.value = entry?.speed || '30 ft';
    if (traits) traits.value = formatTraits(entry);
  }

  function ensureBaseScores() {
    STAT_IDS.forEach((stat) => {
      const input = document.getElementById(stat);
      if (!input) return;

      if (input.dataset.base === undefined || input.dataset.base === '') {
        input.dataset.base = input.value || '10';
      }
    });
  }

  function resetScoresToBase() {
    ensureBaseScores();

    STAT_IDS.forEach((stat) => {
      const input = document.getElementById(stat);
      if (input) input.value = input.dataset.base || '10';
    });
  }

  function addBonus(stat, amount) {
    const input = document.getElementById(stat);
    if (!input) return;

    input.value = String(number(input.value, 10) + amount);
  }

  function applyFixedBonuses(entry) {
    if (!config.is2014 || !entry) return;

    Object.entries(entry.abilityBonuses).forEach(([stat, amount]) => {
      if (STAT_IDS.includes(stat)) addBonus(stat, amount);
    });
  }

  function replaceFlexibleOptions(select, flexible) {
    if (!select || !flexible) return;

    const previous = select.value;
    const available = STAT_IDS.filter((stat) => !flexible.exclude.includes(stat));

    select.replaceChildren();

    available.forEach((stat) => {
      const option = document.createElement('option');
      option.value = stat;
      option.textContent = stat.toUpperCase();
      select.appendChild(option);
    });

    if (available.includes(previous)) select.value = previous;
  }

  function updateFlexibleControls(entry) {
    const elements = getElements();
    const flexible = config.is2014 ? entry?.flexibleAbilityBonuses : null;
    const show = Boolean(flexible?.count);

    if (elements.flexibleContainer) {
      elements.flexibleContainer.style.display = show ? 'flex' : 'none';
    }

    if (!show) return;

    replaceFlexibleOptions(elements.flexibleFirst, flexible);
    replaceFlexibleOptions(elements.flexibleSecond, flexible);

    const label = elements.flexibleContainer?.querySelector('label');
    if (label) {
      label.textContent =
        `${entry.name} Stat Boosts (+${flexible.amount} to ${flexible.count})`;
    }
  }

  function applyFlexibleBonuses(entry) {
    if (!config.is2014 || !entry?.flexibleAbilityBonuses) return;

    const elements = getElements();
    const flexible = entry.flexibleAbilityBonuses;
    const selected = [elements.flexibleFirst?.value, elements.flexibleSecond?.value]
      .map(text)
      .filter((stat) => STAT_IDS.includes(stat))
      .filter((stat) => !flexible.exclude.includes(stat));

    const used = new Set();

    selected.slice(0, flexible.count).forEach((stat) => {
      if (flexible.distinct && used.has(stat)) return;
      used.add(stat);
      addBonus(stat, flexible.amount);
    });
  }

  function applyOriginRules() {
    if (!state.active) return false;

    const { select } = getElements();
    const entry = findEntry(select?.value);

    state.selectedId = entry?.id || '';

    resetScoresToBase();
    updateDisplay(entry);
    updateFlexibleControls(entry);

    if (config.is2014 && entry) {
      applyFixedBonuses(entry);
      applyFlexibleBonuses(entry);
    }

    refreshCalculations();

    document.dispatchEvent(new CustomEvent('character:origin-applied', {
      detail: { edition: config.edition, origin: entry }
    }));

    return true;
  }

  function bindControls() {
    const elements = getElements();

    elements.select?.addEventListener('change', applyOriginRules);
    elements.flexibleFirst?.addEventListener('change', applyOriginRules);
    elements.flexibleSecond?.addEventListener('change', applyOriginRules);

    document.addEventListener('character:restored', () => {
      if (state.active) applyOriginRules();
    });
  }

  async function loadOrigins() {
    if (!config) throw new Error('origins.js requires config.js.');

    const path = config.getOriginDataPath();
    const data = await fetchJson(path);

    validateEdition(data);

    const entries = getCollection(data)
      .map(normalizeEntry)
      .filter(Boolean);

    state.loaded = true;
    state.entries = entries;
    state.error = null;
    indexEntries(entries);

    if (entries.length === 0) {
      state.active = false;

      console.info(
        `No ${config.settings.originCollection} have been added to ${path} yet. ` +
        'The existing legacy controls remain active.'
      );

      document.dispatchEvent(new CustomEvent('character:origins-empty', {
        detail: { edition: config.edition, path }
      }));

      return state;
    }

    state.active = true;
    populateDropdown(entries);
    bindControls();
    applyOriginRules();

    document.dispatchEvent(new CustomEvent('character:origins-ready', {
      detail: { edition: config.edition, count: entries.length, path }
    }));

    return state;
  }

  function init() {
    readyPromise = loadOrigins().catch((error) => {
      state.active = false;
      state.loaded = false;
      state.error = error;

      console.error('Character origins could not be loaded:', error);

      document.dispatchEvent(new CustomEvent('character:origins-error', {
        detail: { edition: config?.edition || '', error }
      }));

      return state;
    });

    return readyPromise;
  }

  window.CharacterOrigins = Object.freeze({
    get active() {
      return state.active;
    },

    get loaded() {
      return state.loaded;
    },

    get entries() {
      return [...state.entries];
    },

    get error() {
      return state.error;
    },

    get ready() {
      return readyPromise;
    },

    findEntry,
    loadOrigins,
    applyOriginRules,
    resetScoresToBase
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
