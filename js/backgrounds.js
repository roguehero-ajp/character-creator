/**
 * My RPG Source - Character Backgrounds Module
 * ---------------------------------------------
 *
 * Responsibilities:
 *  - Load edition-specific background data
 *  - Populate the Background dropdown
 *  - Display concise background benefits
 *  - Apply 2024 background ability-score increases
 *  - Leave 2014 ability scores unchanged
 *  - Reapply 2024 bonuses after Species or rolled stats reset scores
 *
 * Data files:
 *  data/dnd5e/2014/backgrounds.json
 *  data/dnd5e/2024/backgrounds.json
 */

(() => {
  'use strict';

  const config = window.MyRPGConfig;
  const calc = window.CharacterCalculations;
  const origins = window.CharacterOrigins;

  const STAT_IDS =
    calc?.STAT_INPUTS ||
    ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  const STAT_LABELS = Object.freeze({
    str: 'Strength',
    dex: 'Dexterity',
    con: 'Constitution',
    int: 'Intelligence',
    wis: 'Wisdom',
    cha: 'Charisma'
  });

  const state = {
    active: false,
    loaded: false,
    entries: [],
    byId: new Map(),
    byName: new Map(),
    selectedId: '',
    error: null,
    suppressOriginEvent: false,
    applying: false
  };

  let readyPromise = Promise.resolve(state);


  /* ========================================================
     SMALL HELPERS
     ======================================================== */

  function text(value) {
    return String(value ?? '').trim();
  }


  function number(value, fallback = 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }


  function slugify(value) {
    return text(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }


  function uniqueStrings(values) {
    const seen = new Set();

    return (Array.isArray(values) ? values : [])
      .map(text)
      .filter(Boolean)
      .filter((value) => {
        const key = value.toLowerCase();

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });
  }


  function refreshCalculations() {
    if (calc?.refreshAll) {
      calc.refreshAll();
    } else if (
      typeof window.updateModifiers ===
      'function'
    ) {
      window.updateModifiers();
    }
  }


  async function fetchJson(path) {
    const response = await fetch(
      path,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(
        `Could not load ${path} (${response.status}).`
      );
    }

    return response.json();
  }


  /* ========================================================
     ELEMENT LOOKUPS
     ======================================================== */

  function getElements() {
    return {
      select:
        document.getElementById(
          'char-background'
        ),

      summary:
        document.getElementById(
          'background-summary'
        ),

      controls:
        document.getElementById(
          'background-ability-controls'
        ),

      method:
        document.getElementById(
          'background-asi-method'
        ),

      primary:
        document.getElementById(
          'background-asi-primary'
        ),

      secondary:
        document.getElementById(
          'background-asi-secondary'
        ),

      choiceRow:
        document.getElementById(
          'background-asi-choice-row'
        ),

      abilityNote:
        document.getElementById(
          'background-ability-note'
        )
    };
  }


  /* ========================================================
     DATA NORMALIZATION
     ======================================================== */

  function normalizeAbilityScores(entry) {
    return uniqueStrings(
      entry?.abilityScores
    )
      .map((stat) => stat.toLowerCase())
      .filter((stat) =>
        STAT_IDS.includes(stat)
      )
      .slice(0, 3);
  }


  function normalizeEquipment(entry) {
    const source =
      entry?.equipment;

    if (typeof source === 'string') {
      return {
        package: text(source),
        alternative: ''
      };
    }

    if (
      !source ||
      typeof source !== 'object'
    ) {
      return {
        package: '',
        alternative: ''
      };
    }

    return {
      package: text(
        source.package ||
        source.optionA
      ),

      alternative: text(
        source.alternative ||
        source.optionB
      )
    };
  }


  function normalizeEntry(entry, index) {
    if (
      !entry ||
      typeof entry !== 'object'
    ) {
      return null;
    }

    const name = text(entry.name);

    if (!name) {
      return null;
    }

    return {
      id:
        text(entry.id) ||
        slugify(name) ||
        `background-${index + 1}`,

      name,

      abilityScores:
        normalizeAbilityScores(entry),

      feat:
        text(entry.feat),

      skills:
        uniqueStrings(
          entry.skills ||
          entry.skillProficiencies
        ),

      tools:
        uniqueStrings(
          entry.tools ||
          entry.toolProficiencies
        ),

      languages:
        uniqueStrings(
          entry.languages
        ),

      feature:
        text(entry.feature),

      equipment:
        normalizeEquipment(entry),

      category:
        text(entry.category),

      sourceScope:
        text(entry.sourceScope),

      raw:
        entry
    };
  }


  function validateEdition(data) {
    const fileEdition =
      text(data?.edition);

    if (
      fileEdition &&
      fileEdition !== config.edition
    ) {
      throw new Error(
        `Background data edition ${fileEdition} does not match builder edition ${config.edition}.`
      );
    }
  }


  function getCollection(data) {
    return Array.isArray(
      data?.backgrounds
    )
      ? data.backgrounds
      : [];
  }


  function indexEntries(entries) {
    state.byId.clear();
    state.byName.clear();

    entries.forEach((entry) => {
      state.byId.set(
        entry.id,
        entry
      );

      state.byName.set(
        entry.name.toLowerCase(),
        entry
      );
    });
  }


  function findEntry(value) {
    const cleaned = text(value);

    if (!cleaned) {
      return null;
    }

    return (
      state.byId.get(cleaned) ||
      state.byName.get(
        cleaned.toLowerCase()
      ) ||
      null
    );
  }


  /* ========================================================
     DROPDOWN AND SUMMARY
     ======================================================== */

  function populateDropdown(entries) {
    const { select } =
      getElements();

    if (!select) {
      return;
    }

    const previousEntry =
      findEntry(select.value);

    const fragment =
      document.createDocumentFragment();

    const placeholder =
      document.createElement(
        'option'
      );

    placeholder.value = '';
    placeholder.textContent =
      '--Select Background--';

    fragment.appendChild(
      placeholder
    );

    entries.forEach((entry) => {
      const option =
        document.createElement(
          'option'
        );

      option.value = entry.id;
      option.textContent =
        entry.name;

      fragment.appendChild(
        option
      );
    });

    select.replaceChildren(
      fragment
    );

    const desiredId =
      previousEntry?.id ||
      state.selectedId;

    if (
      desiredId &&
      state.byId.has(desiredId)
    ) {
      select.value = desiredId;
    }
  }


  function joinBenefits(parts) {
    return parts
      .map(text)
      .filter(Boolean)
      .join(' • ');
  }


  function formatSummary(entry) {
    if (!entry) {
      return '';
    }

    const parts = [];

    if (entry.feat) {
      parts.push(
        `Feat: ${entry.feat}`
      );
    }

    if (entry.feature) {
      parts.push(
        `Feature: ${entry.feature}`
      );
    }

    if (entry.skills.length) {
      parts.push(
        `Skills: ${entry.skills.join(', ')}`
      );
    }

    if (entry.tools.length) {
      parts.push(
        `Tool: ${entry.tools.join(', ')}`
      );
    }

    if (entry.languages.length) {
      parts.push(
        `Languages: ${entry.languages.join(', ')}`
      );
    }

    if (
      entry.equipment.package ||
      entry.equipment.alternative
    ) {
      parts.push(
        joinBenefits([
          entry.equipment.package
            ? `Equipment: ${entry.equipment.package}`
            : '',

          entry.equipment.alternative
            ? `Alternative: ${entry.equipment.alternative}`
            : ''
        ])
      );
    }

    return joinBenefits(parts);
  }


  function updateSummary(entry) {
    const {
      select,
      summary
    } = getElements();

    const summaryText =
      formatSummary(entry);

    if (summary) {
      summary.textContent =
        summaryText;

      summary.hidden =
        !summaryText;
    }

    if (select) {
      select.title =
        summaryText;
    }
  }


  /* ========================================================
     2024 ABILITY-SCORE CONTROLS
     ======================================================== */

  function replaceAbilityOptions(
    select,
    abilityScores,
    preferredValue = ''
  ) {
    if (!select) {
      return;
    }

    select.replaceChildren();

    abilityScores.forEach(
      (stat) => {
        const option =
          document.createElement(
            'option'
          );

        option.value = stat;
        option.textContent =
          STAT_LABELS[stat] ||
          stat.toUpperCase();

        select.appendChild(
          option
        );
      }
    );

    if (
      abilityScores.includes(
        preferredValue
      )
    ) {
      select.value =
        preferredValue;
    }
  }


  function ensureDistinctSelections(
    entry
  ) {
    const {
      primary,
      secondary
    } = getElements();

    if (
      !primary ||
      !secondary ||
      entry.abilityScores.length < 2
    ) {
      return;
    }

    if (
      primary.value ===
      secondary.value
    ) {
      const alternative =
        entry.abilityScores.find(
          (stat) =>
            stat !== primary.value
        );

      if (alternative) {
        secondary.value =
          alternative;
      }
    }
  }


  function configureAbilityControls(
    entry
  ) {
    const elements =
      getElements();

    const show = Boolean(
      config.is2024 &&
      entry &&
      entry.abilityScores.length === 3
    );

    if (elements.controls) {
      elements.controls.style.display =
        show
          ? 'flex'
          : 'none';
    }

    if (!show) {
      return;
    }

    const previousPrimary =
      elements.primary?.value ||
      '';

    const previousSecondary =
      elements.secondary?.value ||
      '';

    replaceAbilityOptions(
      elements.primary,
      entry.abilityScores,
      previousPrimary
    );

    replaceAbilityOptions(
      elements.secondary,
      entry.abilityScores,
      previousSecondary
    );

    if (
      !elements.primary?.value
    ) {
      elements.primary.value =
        entry.abilityScores[0];
    }

    if (
      !elements.secondary?.value
    ) {
      elements.secondary.value =
        entry.abilityScores[1];
    }

    ensureDistinctSelections(
      entry
    );

    updateAbilityControlVisibility(
      entry
    );
  }


  function updateAbilityControlVisibility(
    entry
  ) {
    const elements =
      getElements();

    if (!entry) {
      return;
    }

    const method =
      elements.method?.value ||
      '2-1';

    if (elements.choiceRow) {
      elements.choiceRow.style.display =
        method === '2-1'
          ? 'flex'
          : 'none';
    }

    if (elements.abilityNote) {
      elements.abilityNote.textContent =
        method === '1-1-1'
          ? `+1 to ${entry.abilityScores
              .map((stat) => STAT_LABELS[stat])
              .join(', ')}`
          : '+2 to one listed ability and +1 to another';
    }
  }


  /* ========================================================
     SCORE APPLICATION
     ======================================================== */

  function resetScoresToBase() {
    if (
      origins?.active &&
      typeof origins.applyOriginRules ===
        'function'
    ) {
      state.suppressOriginEvent =
        true;

      try {
        origins.applyOriginRules();
      } finally {
        state.suppressOriginEvent =
          false;
      }

      return;
    }

    STAT_IDS.forEach((stat) => {
      const input =
        document.getElementById(stat);

      if (!input) {
        return;
      }

      if (
        input.dataset.base ===
          undefined ||
        input.dataset.base === ''
      ) {
        input.dataset.base =
          input.value ||
          '10';
      }

      input.value =
        input.dataset.base ||
        '10';
    });
  }


  function addAbilityBonus(
    stat,
    amount
  ) {
    const input =
      document.getElementById(stat);

    if (!input) {
      return;
    }

    const current =
      number(input.value, 10);

    input.value = String(
      Math.min(
        20,
        current + amount
      )
    );
  }


  function apply2024AbilityBonuses(
    entry
  ) {
    if (
      !config.is2024 ||
      !entry ||
      entry.abilityScores.length !== 3
    ) {
      return;
    }

    const elements =
      getElements();

    const method =
      elements.method?.value ||
      '2-1';

    if (method === '1-1-1') {
      entry.abilityScores.forEach(
        (stat) => {
          addAbilityBonus(
            stat,
            1
          );
        }
      );

      return;
    }

    ensureDistinctSelections(
      entry
    );

    const primary =
      elements.primary?.value;

    const secondary =
      elements.secondary?.value;

    if (
      entry.abilityScores.includes(
        primary
      )
    ) {
      addAbilityBonus(
        primary,
        2
      );
    }

    if (
      secondary !== primary &&
      entry.abilityScores.includes(
        secondary
      )
    ) {
      addAbilityBonus(
        secondary,
        1
      );
    }
  }


  function applyBonusesAfterOrigin(
    entry
  ) {
    if (
      !config.is2024 ||
      !entry
    ) {
      refreshCalculations();
      return;
    }

    apply2024AbilityBonuses(
      entry
    );

    refreshCalculations();
  }


  function applyBackgroundRules({
    resetScores = true
  } = {}) {
    if (
      !state.active ||
      state.applying
    ) {
      return false;
    }

    state.applying = true;

    try {
      const { select } =
        getElements();

      const entry =
        findEntry(
          select?.value
        );

      state.selectedId =
        entry?.id ||
        '';

      updateSummary(entry);
      configureAbilityControls(entry);

      if (
        config.is2024 &&
        resetScores
      ) {
        resetScoresToBase();
      }

      applyBonusesAfterOrigin(
        entry
      );

      document.dispatchEvent(
        new CustomEvent(
          'character:background-applied',
          {
            detail: {
              edition:
                config.edition,

              background:
                entry
            }
          }
        )
      );

      return true;
    } finally {
      state.applying = false;
    }
  }


  /* ========================================================
     EVENTS
     ======================================================== */

  function handleBackgroundChange() {
    applyBackgroundRules({
      resetScores: true
    });
  }


  function handleMethodChange() {
    const { select } =
      getElements();

    const entry =
      findEntry(
        select?.value
      );

    updateAbilityControlVisibility(
      entry
    );

    applyBackgroundRules({
      resetScores: true
    });
  }


  function handleAbilityChoiceChange() {
    applyBackgroundRules({
      resetScores: true
    });
  }


  function bindControls() {
    const elements =
      getElements();

    elements.select?.addEventListener(
      'change',
      handleBackgroundChange
    );

    elements.method?.addEventListener(
      'change',
      handleMethodChange
    );

    elements.primary?.addEventListener(
      'change',
      handleAbilityChoiceChange
    );

    elements.secondary?.addEventListener(
      'change',
      handleAbilityChoiceChange
    );

    /*
     * Roll Stats replaces the base scores. Reapply the selected
     * 2024 background after ui.js finishes generating the rolls.
     */
    document
      .getElementById('roll-btn')
      ?.addEventListener(
        'click',
        () => {
          window.setTimeout(
            () => {
              if (
                state.active &&
                config.is2024
              ) {
                applyBackgroundRules({
                  resetScores: true
                });
              }
            },
            0
          );
        }
      );

    document.addEventListener(
      'character:origin-applied',
      () => {
        if (
          state.suppressOriginEvent ||
          state.applying ||
          !state.active ||
          !config.is2024
        ) {
          return;
        }

        applyBackgroundRules({
          resetScores: false
        });
      }
    );

    document.addEventListener(
      'character:restored',
      () => {
        if (!state.active) {
          return;
        }

        applyBackgroundRules({
          resetScores: true
        });
      }
    );
  }


  /* ========================================================
     LOADING AND PUBLIC API
     ======================================================== */

  async function loadBackgrounds() {
    if (!config) {
      throw new Error(
        'backgrounds.js requires config.js.'
      );
    }

    const path =
      config.getBackgroundsDataPath();

    const data =
      await fetchJson(path);

    validateEdition(data);

    const entries =
      getCollection(data)
        .map(normalizeEntry)
        .filter(Boolean);

    state.loaded = true;
    state.entries = entries;
    state.error = null;

    indexEntries(entries);

    if (
      entries.length === 0
    ) {
      state.active = false;

      console.info(
        `No backgrounds have been added to ${path} yet.`
      );

      document.dispatchEvent(
        new CustomEvent(
          'character:backgrounds-empty',
          {
            detail: {
              edition:
                config.edition,

              path
            }
          }
        )
      );

      return state;
    }

    state.active = true;

    populateDropdown(entries);
    bindControls();

    applyBackgroundRules({
      resetScores: false
    });

    document.dispatchEvent(
      new CustomEvent(
        'character:backgrounds-ready',
        {
          detail: {
            edition:
              config.edition,

            count:
              entries.length,

            path
          }
        }
      )
    );

    return state;
  }


  function init() {
    readyPromise =
      loadBackgrounds()
        .catch((error) => {
          state.active = false;
          state.loaded = false;
          state.error = error;

          console.error(
            'Character backgrounds could not be loaded:',
            error
          );

          document.dispatchEvent(
            new CustomEvent(
              'character:backgrounds-error',
              {
                detail: {
                  edition:
                    config?.edition ||
                    '',

                  error
                }
              }
            )
          );

          return state;
        });

    return readyPromise;
  }


  window.CharacterBackgrounds =
    Object.freeze({
      get active() {
        return state.active;
      },

      get loaded() {
        return state.loaded;
      },

      get entries() {
        return [
          ...state.entries
        ];
      },

      get error() {
        return state.error;
      },

      get ready() {
        return readyPromise;
      },

      findEntry,
      loadBackgrounds,
      applyBackgroundRules
    });


  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );
  } else {
    init();
  }

})();
