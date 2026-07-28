/**
 * My RPG Source - Shared D&D Character UI Module
 * ------------------------------------------------
 *
 * Responsibilities:
 *  - Theme switching
 *  - Ability-score generation controls
 *  - Multiclass row controls
 *
 * Edition-specific Race and Species behavior belongs in origins.js.
 * Calculation rules remain in calculations.js.
 */

(() => {
  'use strict';

  const calc = window.CharacterCalculations;

  const statInputs =
    calc?.STAT_INPUTS ||
    ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  const allAvailableClasses = [
    'Barbarian',
    'Bard',
    'Cleric',
    'Druid',
    'Fighter',
    'Monk',
    'Paladin',
    'Ranger',
    'Rogue',
    'Sorcerer',
    'Warlock',
    'Wizard',
    'Artificer'
  ];


  /* ========================================================
     CALCULATION BRIDGES
     ======================================================== */

  function refreshCalculations() {
    calc?.refreshAll?.();
  }


  function updateModifiers() {
    if (calc?.updateModifiers) {
      calc.updateModifiers();
    } else if (
      typeof window.updateModifiers ===
      'function'
    ) {
      window.updateModifiers();
    }
  }


  function calculateHP() {
    if (calc?.calculateHP) {
      calc.calculateHP();
    } else if (
      typeof window.calculateHP ===
      'function'
    ) {
      window.calculateHP();
    }
  }


  function updateTotalLevelAndProficiency() {
    if (
      calc?.updateTotalLevelAndProficiency
    ) {
      calc.updateTotalLevelAndProficiency();
    } else if (
      typeof window
        .updateTotalLevelAndProficiency ===
      'function'
    ) {
      window
        .updateTotalLevelAndProficiency();
    }
  }


  /**
   * Reapply the selected edition's origin rules after
   * generated ability scores replace the base scores.
   *
   * 2014:
   * origins.js reapplies Race bonuses.
   *
   * 2024:
   * Species do not add ability-score bonuses, so this
   * simply refreshes the displayed calculations.
   */
  function reapplyOriginRules() {
    const origins =
      window.CharacterOrigins;

    if (
      origins?.active &&
      typeof origins.applyOriginRules ===
        'function'
    ) {
      origins.applyOriginRules();
      return;
    }

    updateModifiers();
  }


  /* ========================================================
     ABILITY-SCORE GENERATION
     ======================================================== */

  function rollDice(count, sides) {
    const rolls = [];

    for (
      let index = 0;
      index < count;
      index += 1
    ) {
      rolls.push(
        Math.floor(
          Math.random() * sides
        ) + 1
      );
    }

    return rolls;
  }


  function generateStatValue(method) {
    if (method === '4d6') {
      const rolls =
        rollDice(4, 6).sort(
          (a, b) => a - b
        );

      rolls.shift();

      return rolls.reduce(
        (total, value) =>
          total + value,
        0
      );
    }

    if (method === '3d6') {
      return rollDice(3, 6).reduce(
        (total, value) =>
          total + value,
        0
      );
    }

    return 10;
  }


  function initStatGeneration() {
    const rollButton =
      document.getElementById(
        'roll-btn'
      );

    const methodSelect =
      document.getElementById(
        'stat-method'
      );

    if (
      !rollButton ||
      !methodSelect
    ) {
      return;
    }

    rollButton.addEventListener(
      'click',
      () => {
        const method =
          methodSelect.value;

        if (method === 'manual') {
          alert(
            'Select 4d6 Drop Lowest or 3d6 Straight to generate stats automatically.'
          );

          return;
        }

        statInputs.forEach(
          (stat) => {
            const input =
              document.getElementById(
                stat
              );

            if (!input) {
              return;
            }

            const value =
              generateStatValue(
                method
              );

            input.dataset.base =
              String(value);

            input.value =
              String(value);
          }
        );

        reapplyOriginRules();
        calculateHP();
      }
    );
  }


  /* ========================================================
     CLASS AND LEVEL CONTROLS
     ======================================================== */

  function updateClassDropdowns() {
    const selects =
      Array.from(
        document.querySelectorAll(
          '.char-class-select'
        )
      );

    const selectedClasses =
      selects.map(
        (select) =>
          select.value
      );

    selects.forEach(
      (select) => {
        const currentValue =
          select.value;

        Array.from(
          select.options
        ).forEach(
          (option) => {
            option.disabled =
              selectedClasses.includes(
                option.value
              ) &&
              option.value !==
                currentValue;
          }
        );
      }
    );
  }


  function updateLevelDropdowns() {
    const levelSelects =
      Array.from(
        document.querySelectorAll(
          '.char-level-select'
        )
      );

    const totalLevels =
      levelSelects.reduce(
        (sum, select) =>
          sum +
          (
            parseInt(
              select.value,
              10
            ) || 0
          ),
        0
      );

    levelSelects.forEach(
      (select) => {
        const currentValue =
          parseInt(
            select.value,
            10
          ) || 1;

        const otherLevels =
          totalLevels -
          currentValue;

        const maxAllowed =
          Math.max(
            1,
            20 - otherLevels
          );

        let optionsHtml = '';

        for (
          let level = 1;
          level <= maxAllowed;
          level += 1
        ) {
          optionsHtml +=
            `<option value="${level}" ${
              level === currentValue
                ? 'selected'
                : ''
            }>${level}</option>`;
        }

        select.innerHTML =
          optionsHtml;

        if (
          currentValue >
          maxAllowed
        ) {
          select.value =
            String(maxAllowed);
        }
      }
    );
  }


  function handleLevelChange() {
    updateLevelDropdowns();
    updateTotalLevelAndProficiency();
    calculateHP();
  }


  function handleClassChange() {
    updateClassDropdowns();
    updateTotalLevelAndProficiency();
    calculateHP();
  }


  function setupLevelListeners() {
    document
      .querySelectorAll(
        '.char-level-select'
      )
      .forEach(
        (select) => {
          select.removeEventListener(
            'change',
            handleLevelChange
          );

          select.addEventListener(
            'change',
            handleLevelChange
          );
        }
      );

    document
      .querySelectorAll(
        '.char-class-select'
      )
      .forEach(
        (select) => {
          select.removeEventListener(
            'change',
            handleClassChange
          );

          select.addEventListener(
            'change',
            handleClassChange
          );
        }
      );
  }


  function getSelectedClasses() {
    return Array.from(
      document.querySelectorAll(
        '.char-class-select'
      )
    ).map(
      (select) =>
        select.value
    );
  }


  function getCurrentTotalLevel() {
    return Array.from(
      document.querySelectorAll(
        '.char-level-select'
      )
    ).reduce(
      (sum, select) =>
        sum +
        (
          parseInt(
            select.value,
            10
          ) || 0
        ),
      0
    );
  }


  function buildClassOptions(
    selectedClass
  ) {
    return allAvailableClasses
      .map(
        (className) =>
          `<option value="${className}" ${
            className ===
            selectedClass
              ? 'selected'
              : ''
          }>${className}</option>`
      )
      .join('');
  }


  function buildLevelOptions(
    maxLevel,
    selectedLevel = 1
  ) {
    let optionsHtml = '';

    for (
      let level = 1;
      level <= maxLevel;
      level += 1
    ) {
      optionsHtml +=
        `<option value="${level}" ${
          level === selectedLevel
            ? 'selected'
            : ''
        }>${level}</option>`;
    }

    return optionsHtml;
  }


  function addMulticlassRow() {
    const container =
      document.getElementById(
        'class-level-container'
      );

    if (!container) {
      return;
    }

    const rows =
      container.querySelectorAll(
        '.class-level-row'
      );

    if (rows.length >= 13) {
      return;
    }

    const selectedClasses =
      getSelectedClasses();

    const nextClass =
      allAvailableClasses.find(
        (className) =>
          !selectedClasses.includes(
            className
          )
      ) ||
      allAvailableClasses[0];

    const maxLevelForNew =
      Math.max(
        1,
        20 - getCurrentTotalLevel()
      );

    const newRow =
      document.createElement(
        'div'
      );

    newRow.className =
      'class-level-row';

    newRow.style.cssText =
      'display: flex; gap: 4px;';

    newRow.innerHTML = `
      <div class="detail-box" style="flex: 1.2;">
        <select class="fantasy-input char-class-select">
          ${buildClassOptions(nextClass)}
        </select>
      </div>

      <div class="detail-box" style="flex: 0.8;">
        <select class="fantasy-input char-level-select">
          ${buildLevelOptions(maxLevelForNew, 1)}
        </select>
      </div>
    `;

    container.appendChild(
      newRow
    );

    setupLevelListeners();
    updateClassDropdowns();
    updateLevelDropdowns();
    updateTotalLevelAndProficiency();
    calculateHP();
  }


  function removeMulticlassRow() {
    const container =
      document.getElementById(
        'class-level-container'
      );

    if (!container) {
      return;
    }

    const rows =
      container.querySelectorAll(
        '.class-level-row'
      );

    if (rows.length <= 1) {
      return;
    }

    container.removeChild(
      rows[
        rows.length - 1
      ]
    );

    updateLevelDropdowns();
    updateTotalLevelAndProficiency();
    updateClassDropdowns();
    calculateHP();
  }


  function initMulticlassControls() {
    document
      .getElementById(
        'multiclass-btn'
      )
      ?.addEventListener(
        'click',
        addMulticlassRow
      );

    document
      .getElementById(
        'remove-multiclass-btn'
      )
      ?.addEventListener(
        'click',
        removeMulticlassRow
      );

    setupLevelListeners();
    updateClassDropdowns();
    updateLevelDropdowns();
  }


  /* ========================================================
     THEME CONTROLS
     ======================================================== */

  function applySelectedTheme() {
    const themeSelect =
      document.getElementById(
        'theme-select'
      );

    const characterDocument =
      document.getElementById(
        'character-document'
      );

    if (
      !themeSelect ||
      !characterDocument
    ) {
      return;
    }

    characterDocument.className =
      `document-container ${
        themeSelect.value ||
        'theme-standard'
      }`;
  }


  function initThemeControls() {
    const themeSelect =
      document.getElementById(
        'theme-select'
      );

    const characterDocument =
      document.getElementById(
        'character-document'
      );

    if (
      !themeSelect ||
      !characterDocument
    ) {
      return;
    }

    applySelectedTheme();

    themeSelect.addEventListener(
      'change',
      applySelectedTheme
    );
  }


  /* ========================================================
     INITIALIZATION
     ======================================================== */

  function init() {
    if (!calc) {
      console.warn(
        'ui.js loaded before calculations.js. Calculation-dependent UI may not work.'
      );
    }

    initThemeControls();
    initStatGeneration();
    initMulticlassControls();
    refreshCalculations();

    document.addEventListener(
      'character:restored',
      () => {
        setupLevelListeners();
        updateClassDropdowns();
        updateLevelDropdowns();
      }
    );
  }


  window.CharacterUI =
    Object.freeze({
      reapplyOriginRules,
      updateClassDropdowns,
      updateLevelDropdowns,
      setupLevelListeners,
      addMulticlassRow,
      removeMulticlassRow,
      applySelectedTheme
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
