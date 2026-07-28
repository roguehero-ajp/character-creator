/**
 * My RPG Source - D&D 5e 2024 UI Module
 * --------------------------------------
 * Responsibilities:
 *  - Theme switching
 *  - Ability-score generation controls
 *  - Race-related UI and racial bonuses
 *  - Half-Elf bonus selectors
 *  - Multiclass row controls
 *
 * Calculation rules remain in calculations.js.
 */

(() => {
  'use strict';

  const calc = window.CharacterCalculations;
  const statInputs =
    calc?.STAT_INPUTS || ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  const racialBonusesData = {
    Aarakocra: { dex: 2, wis: 1 },
    Dragonborn: { str: 2, cha: 1 },
    Dwarf: { con: 2 },
    Elf: { dex: 2, wis: 1 },
    'Wood Elf': { dex: 2, wis: 1 },
    Gnome: { int: 2 },
    'Half-Elf': { cha: 2, custom: 2 },
    'Half-Orc': { str: 2, con: 1 },
    Halfling: { dex: 2 },
    Human: {
      str: 1,
      dex: 1,
      con: 1,
      int: 1,
      wis: 1,
      cha: 1
    },
    Tiefling: { cha: 2, int: 1 }
  };

  const racialSpeeds = {
    Aarakocra: '30 ft / 50 ft fly',
    Dragonborn: '30 ft',
    Dwarf: '25 ft',
    Elf: '30 ft',
    'Wood Elf': '35 ft',
    Gnome: '25 ft',
    'Half-Elf': '30 ft',
    'Half-Orc': '30 ft',
    Halfling: '25 ft',
    Human: '30 ft',
    Tiefling: '30 ft'
  };

  const racialAbilitiesText = {
    Aarakocra: '• Flight\n• Talons',

    Dragonborn:
      '• Draconic Ancestry\n• Breath Weapon\n• Damage Resistance',

    Dwarf:
      '• Darkvision\n• Dwarven Resilience\n• Stonecunning',

    Elf:
      '• Darkvision\n• Keen Senses\n• Fey Ancestry\n• Trance',

    'Wood Elf':
      '• Darkvision\n• Keen Senses\n• Fey Ancestry\n• Mask of the Wild',

    Gnome:
      '• Darkvision\n• Gnome Cunning',

    'Half-Elf':
      '• Darkvision\n• Fey Ancestry\n• Skill Versatility',

    'Half-Orc':
      '• Darkvision\n• Menacing\n• Relentless Endurance',

    Halfling:
      '• Lucky\n• Brave\n• Nimbleness',

    Human:
      '• Extra Language',

    Tiefling:
      '• Darkvision\n• Hellish Resistance\n• Infernal Legacy'
  };

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

  function refreshCalculations() {
    calc?.refreshAll?.();
  }

  function updateModifiers() {
    if (calc?.updateModifiers) {
      calc.updateModifiers();
    } else if (typeof window.updateModifiers === 'function') {
      window.updateModifiers();
    }
  }

  function calculateHP() {
    if (calc?.calculateHP) {
      calc.calculateHP();
    } else if (typeof window.calculateHP === 'function') {
      window.calculateHP();
    }
  }

  function updateTotalLevelAndProficiency() {
    if (calc?.updateTotalLevelAndProficiency) {
      calc.updateTotalLevelAndProficiency();
    } else if (
      typeof window.updateTotalLevelAndProficiency === 'function'
    ) {
      window.updateTotalLevelAndProficiency();
    }
  }

  function rollDice(count, sides) {
    const rolls = [];

    for (let i = 0; i < count; i += 1) {
      rolls.push(
        Math.floor(Math.random() * sides) + 1
      );
    }

    return rolls;
  }

  function generateStatValue(method) {
    if (method === '4d6') {
      const rolls = rollDice(4, 6).sort(
        (a, b) => a - b
      );

      rolls.shift();

      return rolls.reduce(
        (a, b) => a + b,
        0
      );
    }

    if (method === '3d6') {
      return rollDice(3, 6).reduce(
        (a, b) => a + b,
        0
      );
    }

    return 10;
  }

  function applyRacialBonuses() {
    const charRaceSelect =
      document.getElementById('char-race');

    const speedInput =
      document.getElementById('speed-input');

    const halfElfStat1 =
      document.getElementById('half-elf-stat1');

    const halfElfStat2 =
      document.getElementById('half-elf-stat2');

    if (!charRaceSelect) {
      return;
    }

    const selectedRace =
      charRaceSelect.value;

    statInputs.forEach((stat) => {
      const input =
        document.getElementById(stat);

      if (!input) {
        return;
      }

      if (
        !input.dataset.base ||
        input.dataset.base === ''
      ) {
        input.dataset.base =
          input.value || '10';
      }

      input.value =
        input.dataset.base;
    });

    if (!selectedRace) {
      updateModifiers();
      return;
    }

    if (speedInput) {
      speedInput.value =
        racialSpeeds[selectedRace] ||
        '30 ft';
    }

    const bonuses =
      racialBonusesData[selectedRace] || {};

    Object.entries(bonuses).forEach(
      ([stat, bonus]) => {
        if (stat === 'custom') {
          return;
        }

        const input =
          document.getElementById(stat);

        if (input) {
          input.value =
            (parseInt(
              input.value || '10',
              10
            ) || 10) + bonus;
        }
      }
    );

    if (selectedRace === 'Half-Elf') {
      const stat1 =
        halfElfStat1?.value || '';

      const stat2 =
        halfElfStat2?.value || '';

      if (stat1) {
        const input1 =
          document.getElementById(stat1);

        if (input1) {
          input1.value =
            (parseInt(
              input1.value || '10',
              10
            ) || 10) + 1;
        }
      }

      if (
        stat2 &&
        stat2 !== stat1
      ) {
        const input2 =
          document.getElementById(stat2);

        if (input2) {
          input2.value =
            (parseInt(
              input2.value || '10',
              10
            ) || 10) + 1;
        }
      }
    }

    updateModifiers();
  }

  function updateClassDropdowns() {
    const selects =
      Array.from(
        document.querySelectorAll(
          '.char-class-select'
        )
      );

    const selectedClasses =
      selects.map(
        (select) => select.value
      );

    selects.forEach((select) => {
      const currentValue =
        select.value;

      Array.from(
        select.options
      ).forEach((option) => {
        option.disabled =
          selectedClasses.includes(
            option.value
          ) &&
          option.value !==
            currentValue;
      });
    });
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
          (parseInt(
            select.value,
            10
          ) || 0),
        0
      );

    levelSelects.forEach((select) => {
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

      let html = '';

      for (
        let level = 1;
        level <= maxAllowed;
        level += 1
      ) {
        html +=
          `<option value="${level}" ${
            level === currentValue
              ? 'selected'
              : ''
          }>${level}</option>`;
      }

      select.innerHTML = html;

      if (
        currentValue >
        maxAllowed
      ) {
        select.value =
          String(maxAllowed);
      }
    });
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
      .forEach((select) => {
        select.removeEventListener(
          'change',
          handleLevelChange
        );

        select.addEventListener(
          'change',
          handleLevelChange
        );
      });

    document
      .querySelectorAll(
        '.char-class-select'
      )
      .forEach((select) => {
        select.removeEventListener(
          'change',
          handleClassChange
        );

        select.addEventListener(
          'change',
          handleClassChange
        );
      });
  }

  function addMulticlassRow() {
    const classLevelContainer =
      document.getElementById(
        'class-level-container'
      );

    if (!classLevelContainer) {
      return;
    }

    const rows =
      classLevelContainer.querySelectorAll(
        '.class-level-row'
      );

    if (rows.length >= 13) {
      return;
    }

    const selectedClasses =
      Array.from(
        document.querySelectorAll(
          '.char-class-select'
        )
      ).map(
        (select) => select.value
      );

    const nextClass =
      allAvailableClasses.find(
        (className) =>
          !selectedClasses.includes(
            className
          )
      ) ||
      allAvailableClasses[0];

    const optionsHtml =
      allAvailableClasses
        .map(
          (className) =>
            `<option value="${className}" ${
              className === nextClass
                ? 'selected'
                : ''
            }>${className}</option>`
        )
        .join('');

    const currentTotal =
      Array.from(
        document.querySelectorAll(
          '.char-level-select'
        )
      ).reduce(
        (sum, select) =>
          sum +
          (parseInt(
            select.value,
            10
          ) || 0),
        0
      );

    const maxLevelForNew =
      Math.max(
        1,
        20 - currentTotal
      );

    let levelOptionsHtml = '';

    for (
      let level = 1;
      level <= maxLevelForNew;
      level += 1
    ) {
      levelOptionsHtml +=
        `<option value="${level}" ${
          level === 1
            ? 'selected'
            : ''
        }>${level}</option>`;
    }

    const newRow =
      document.createElement('div');

    newRow.className =
      'class-level-row';

    newRow.style.cssText =
      'display: flex; gap: 4px;';

    newRow.innerHTML = `
      <div class="detail-box" style="flex: 1.2;">
        <select class="fantasy-input char-class-select">
          ${optionsHtml}
        </select>
      </div>

      <div class="detail-box" style="flex: 0.8;">
        <select class="fantasy-input char-level-select">
          ${levelOptionsHtml}
        </select>
      </div>
    `;

    classLevelContainer.appendChild(
      newRow
    );

    setupLevelListeners();
    updateClassDropdowns();
    updateLevelDropdowns();
    updateTotalLevelAndProficiency();
    calculateHP();
  }

  function removeMulticlassRow() {
    const classLevelContainer =
      document.getElementById(
        'class-level-container'
      );

    if (!classLevelContainer) {
      return;
    }

    const rows =
      classLevelContainer.querySelectorAll(
        '.class-level-row'
      );

    if (rows.length <= 1) {
      return;
    }

    classLevelContainer.removeChild(
      rows[rows.length - 1]
    );

    updateLevelDropdowns();
    updateTotalLevelAndProficiency();
    updateClassDropdowns();
    calculateHP();
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

    characterDocument.className =
      `document-container ${
        themeSelect.value ||
        'theme-standard'
      }`;

    themeSelect.addEventListener(
      'change',
      (event) => {
        characterDocument.className =
          `document-container ${
            event.target.value
          }`;
      }
    );
  }

  function initStatGeneration() {
    const rollBtn =
      document.getElementById(
        'roll-btn'
      );

    const statMethodSelect =
      document.getElementById(
        'stat-method'
      );

    if (
      !rollBtn ||
      !statMethodSelect
    ) {
      return;
    }

    rollBtn.addEventListener(
      'click',
      () => {
        const method =
          statMethodSelect.value;

        if (method === 'manual') {
          alert(
            'Select 4d6 Drop Lowest or 3d6 Straight to generate stats automatically.'
          );

          return;
        }

        statInputs.forEach((stat) => {
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
        });

        applyRacialBonuses();
        calculateHP();
      }
    );
  }

  function initRaceControls() {
    const charRaceSelect =
      document.getElementById(
        'char-race'
      );

    const racialAbilitiesInput =
      document.getElementById(
        'racial-abilities-input'
      );

    const halfElfContainer =
      document.getElementById(
        'half-elf-bonuses'
      );

    const halfElfStat1 =
      document.getElementById(
        'half-elf-stat1'
      );

    const halfElfStat2 =
      document.getElementById(
        'half-elf-stat2'
      );

    charRaceSelect?.addEventListener(
      'change',
      function () {
        const selectedRace =
          this.value;

        if (racialAbilitiesInput) {
          racialAbilitiesInput.value =
            racialAbilitiesText[
              selectedRace
            ] || '';
        }

        if (halfElfContainer) {
          halfElfContainer.style.display =
            selectedRace === 'Half-Elf'
              ? 'flex'
              : 'none';
        }

        applyRacialBonuses();
      }
    );

    halfElfStat1?.addEventListener(
      'change',
      applyRacialBonuses
    );

    halfElfStat2?.addEventListener(
      'change',
      applyRacialBonuses
    );
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

  function init() {
    if (!calc) {
      console.warn(
        'ui.js loaded before calculations.js. Calculation-dependent UI may not work.'
      );
    }

    initThemeControls();
    initStatGeneration();
    initRaceControls();
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
      applyRacialBonuses,
      updateClassDropdowns,
      updateLevelDropdowns,
      setupLevelListeners,
      addMulticlassRow,
      removeMulticlassRow
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
