/**
 * My RPG Source - Edition-Aware Class Data
 * ----------------------------------------
 *
 * Loads:
 *   data/dnd5e/2014/classes.json
 *   data/dnd5e/2024/classes.json
 *
 * This module supplies stable class data to level-up and future
 * class-rule modules. It also removes non-core hardcoded options
 * from new character dropdowns while preserving an already selected
 * legacy/expanded class on an imported character.
 */

(() => {
  'use strict';

  const config =
    window.MyRPGConfig;

  const state = {
    loaded: false,
    active: false,
    entries: [],
    byId: new Map(),
    byName: new Map(),
    error: null,
    observer: null
  };

  let readyPromise =
    Promise.resolve(state);


  function text(value) {
    return String(
      value ?? ''
    ).trim();
  }


  function slugify(value) {
    return text(value)
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        '-'
      )
      .replace(
        /^-+|-+$/g,
        ''
      );
  }


  function normalizeEntry(
    entry,
    index
  ) {
    if (
      !entry ||
      typeof entry !==
        'object'
    ) {
      return null;
    }

    const name =
      text(entry.name);

    if (!name) {
      return null;
    }

    const hitDie =
      Math.max(
        1,
        Number(
          entry.hitDie
        ) || 8
      );

    return {
      id:
        text(entry.id) ||
        slugify(name) ||
        `class-${index + 1}`,

      name,

      hitDie,

      hitDieLabel:
        `d${hitDie}`,

      fixedHitPointsPerLevel:
        Math.max(
          1,
          Number(
            entry
              .fixedHitPointsPerLevel
          ) ||
          Math.floor(
            hitDie / 2
          ) + 1
        ),

      primaryAbilities:
        Array.isArray(
          entry.primaryAbilities
        )
          ? [
              ...entry
                .primaryAbilities
            ]
          : [],

      savingThrows:
        Array.isArray(
          entry.savingThrows
        )
          ? [
              ...entry
                .savingThrows
            ]
          : [],

      spellcastingAbility:
        text(
          entry
            .spellcastingAbility
        ) ||
        null,

      multiclassPrerequisite:
        entry
          .multiclassPrerequisite ||
        null,

      raw:
        entry
    };
  }


  function indexEntries() {
    state.byId.clear();
    state.byName.clear();

    state.entries.forEach(
      (entry) => {
        state.byId.set(
          entry.id,
          entry
        );

        state.byName.set(
          entry.name
            .toLowerCase(),
          entry
        );
      }
    );
  }


  function findEntry(value) {
    const cleaned =
      text(value);

    if (!cleaned) {
      return null;
    }

    return (
      state.byId.get(
        cleaned
      ) ||
      state.byName.get(
        cleaned.toLowerCase()
      ) ||
      null
    );
  }


  function populateSelect(select) {
    if (
      !select ||
      state.entries.length ===
        0
    ) {
      return;
    }

    const previous =
      text(
        select.value
      );

    const previousEntry =
      findEntry(
        previous
      );

    const fragment =
      document
        .createDocumentFragment();

    state.entries.forEach(
      (entry) => {
        const option =
          document.createElement(
            'option'
          );

        option.value =
          entry.name;

        option.textContent =
          entry.name;

        fragment.appendChild(
          option
        );
      }
    );

    /*
     * Do not destroy an imported expanded class merely because
     * it is outside this first core-SRD data pass.
     */
    if (
      previous &&
      !previousEntry
    ) {
      const legacy =
        document.createElement(
          'option'
        );

      legacy.value =
        previous;

      legacy.textContent =
        `${previous} (Expanded / Legacy)`;

      fragment.appendChild(
        legacy
      );
    }

    select.replaceChildren(
      fragment
    );

    if (previous) {
      select.value =
        previous;
    }

    if (!select.value) {
      select.value =
        state.byName.has(
          'fighter'
        )
          ? 'Fighter'
          : state.entries[0].name;
    }
  }


  function populateAllClassSelects() {
    document
      .querySelectorAll(
        '.char-class-select'
      )
      .forEach(
        populateSelect
      );

    window.CharacterUI
      ?.updateClassDropdowns
      ?.();
  }


  async function loadClasses() {
    if (!config) {
      throw new Error(
        'classes.js requires config.js.'
      );
    }

    const path =
      config
        .getClassesDataPath();

    const response =
      await fetch(
        path,
        {
          cache:
            'no-store'
        }
      );

    if (!response.ok) {
      throw new Error(
        `Could not load ${path} (${response.status}).`
      );
    }

    const data =
      await response.json();

    if (
      data?.edition &&
      String(
        data.edition
      ) !==
      config.edition
    ) {
      throw new Error(
        `Class data edition ${data.edition} does not match builder edition ${config.edition}.`
      );
    }

    state.entries =
      (
        Array.isArray(
          data?.classes
        )
          ? data.classes
          : []
      )
        .map(
          normalizeEntry
        )
        .filter(Boolean);

    state.loaded =
      true;

    state.active =
      state.entries.length >
      0;

    state.error =
      null;

    indexEntries();

    populateAllClassSelects();

    /*
     * Do not observe and rebuild the class dropdowns here.
     * Replacing a select's option children triggers a child-list
     * observer again and can create an infinite mutation loop.
     *
     * ui.js owns dynamic multiclass rows. Refresh the class data
     * once after its Add Multiclass button finishes adding a row.
     */
    document
      .getElementById(
        'multiclass-btn'
      )
      ?.addEventListener(
        'click',
        () => {
          window.setTimeout(
            populateAllClassSelects,
            0
          );
        }
      );

    document.dispatchEvent(
      new CustomEvent(
        'character:classes-ready',
        {
          detail: {
            edition:
              config.edition,

            count:
              state.entries.length,

            path
          }
        }
      )
    );

    return state;
  }


  function init() {
    readyPromise =
      loadClasses().catch(
        (error) => {
          state.loaded =
            false;

          state.active =
            false;

          state.error =
            error;

          console.error(
            'Character classes could not be loaded:',
            error
          );

          document.dispatchEvent(
            new CustomEvent(
              'character:classes-error',
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
        }
      );

    return readyPromise;
  }


  window.CharacterClasses =
    Object.freeze({
      get ready() {
        return readyPromise;
      },

      get loaded() {
        return state.loaded;
      },

      get active() {
        return state.active;
      },

      get entries() {
        return [
          ...state.entries
        ];
      },

      get error() {
        return state.error;
      },

      findEntry,

      populateAllClassSelects,

      loadClasses
    });


  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      {
        once:
          true
      }
    );
  } else {
    init();
  }

})();
