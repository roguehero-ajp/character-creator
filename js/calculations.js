/**
 * My RPG Source - D&D 5e 2024 Character Calculations
 * ---------------------------------------------------
 * Responsibilities:
 *  - Ability modifiers
 *  - Initiative
 *  - Passive Perception
 *  - Saving throws
 *  - Skill bonuses
 *  - Spell save DC / spell attack bonus
 *  - Hit dice
 *  - Hit points
 *  - Total character level
 *  - Proficiency bonus
 *
 * This module intentionally does NOT manage themes, race UI,
 * multiclass row creation/removal, storage, printing, or PDF export.
 */

(() => {
  'use strict';

  const STAT_INPUTS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  const CLASS_HIT_DICE_MAP = {
    Barbarian: 'd12',
    Fighter: 'd10',
    Paladin: 'd10',
    Ranger: 'd10',
    Bard: 'd8',
    Cleric: 'd8',
    Druid: 'd8',
    Monk: 'd8',
    Rogue: 'd8',
    Warlock: 'd8',
    Artificer: 'd8',
    Sorcerer: 'd6',
    Wizard: 'd6'
  };

  const CLASS_HIT_DICE_VALUES = {
    Barbarian: 12,
    Fighter: 10,
    Paladin: 10,
    Ranger: 10,
    Bard: 8,
    Cleric: 8,
    Druid: 8,
    Monk: 8,
    Rogue: 8,
    Warlock: 8,
    Artificer: 8,
    Sorcerer: 6,
    Wizard: 6
  };

  const SKILL_STAT_MAP = {
    Acrobatics: 'dex',
    'Animal Handling': 'wis',
    Arcana: 'int',
    Athletics: 'str',
    Deception: 'cha',
    History: 'int',
    Insight: 'wis',
    Intimidation: 'cha',
    Investigation: 'int',
    Medicine: 'wis',
    Nature: 'int',
    Perception: 'wis',
    Performance: 'cha',
    Persuasion: 'cha',
    Religion: 'int',
    'Sleight of Hand': 'dex',
    Stealth: 'dex',
    Survival: 'wis'
  };

  function formatSigned(value) {
    const number = Number(value) || 0;
    return number >= 0 ? `+${number}` : `${number}`;
  }

  function calculateModifier(score) {
    const num = parseInt(score, 10) || 10;
    const mod = Math.floor((num - 10) / 2);

    return formatSigned(mod);
  }

  function getAbilityModifier(stat) {
    return (
      parseInt(
        document.getElementById(`${stat}-mod`)?.textContent,
        10
      ) || 0
    );
  }

  function getProficiencyBonus() {
    return (
      parseInt(
        document.getElementById('prof-bonus')?.value,
        10
      ) || 2
    );
  }

  function getTotalLevel() {
    return Array.from(
      document.querySelectorAll('.char-level-select')
    ).reduce(
      (sum, select) =>
        sum + (parseInt(select.value, 10) || 0),
      0
    );
  }

  function calculateProficiencyBonus(totalLevel) {
    if (totalLevel >= 17) return 6;
    if (totalLevel >= 13) return 5;
    if (totalLevel >= 9) return 4;
    if (totalLevel >= 5) return 3;

    return 2;
  }

  function updateSpellcastingStats(
    profBonus = getProficiencyBonus()
  ) {
    const spellAbilitySelect =
      document.getElementById('spell-ability');

    const spellDcInput =
      document.getElementById('spell-dc');

    const spellAtkInput =
      document.getElementById('spell-atk');

    if (
      !spellAbilitySelect ||
      !spellDcInput ||
      !spellAtkInput
    ) {
      return;
    }

    const ability = spellAbilitySelect.value;

    if (ability === 'none') {
      spellDcInput.value = '-';
      spellAtkInput.value = '-';

      return;
    }

    const abilityMod = getAbilityModifier(ability);

    const saveDc =
      8 + profBonus + abilityMod;

    const attackBonus =
      profBonus + abilityMod;

    spellDcInput.value = saveDc;
    spellAtkInput.value = formatSigned(attackBonus);
  }

  function updateSavesAndSkills() {
    const profBonus = getProficiencyBonus();

    document
      .querySelectorAll('.save-check')
      .forEach((checkbox) => {
        const stat = checkbox.dataset.stat;

        const modInput =
          checkbox.parentElement?.querySelector(
            '.save-mod'
          );

        if (!stat || !modInput) return;

        const baseMod =
          getAbilityModifier(stat);

        const total =
          baseMod +
          (checkbox.checked ? profBonus : 0);

        modInput.value = formatSigned(total);
      });

    document
      .querySelectorAll(
        '.skills-box-container .saves-list label'
      )
      .forEach((label) => {
        const checkbox =
          label.querySelector('.skill-check');

        const modInput =
          label.querySelector('.skill-mod');

        if (!checkbox || !modInput) return;

        const textContent =
          label.textContent || '';

        let matchedStat = 'dex';

        for (
          const [skillName, statKey]
          of Object.entries(SKILL_STAT_MAP)
        ) {
          if (textContent.includes(skillName)) {
            matchedStat = statKey;
            break;
          }
        }

        const baseMod =
          getAbilityModifier(matchedStat);

        const total =
          baseMod +
          (checkbox.checked ? profBonus : 0);

        modInput.value = formatSigned(total);
      });
  }

  function updateHitDice() {
    const hitDiceCounts = {};

    document
      .querySelectorAll('.class-level-row')
      .forEach((row) => {
        const classSelect =
          row.querySelector(
            '.char-class-select'
          );

        const levelSelect =
          row.querySelector(
            '.char-level-select'
          );

        if (!classSelect || !levelSelect) {
          return;
        }

        const className =
          classSelect.value;

        const level =
          parseInt(levelSelect.value, 10) || 1;

        const die =
          CLASS_HIT_DICE_MAP[className] ||
          'd8';

        hitDiceCounts[die] =
          (hitDiceCounts[die] || 0) +
          level;
      });

    const hitDiceParts =
      Object.entries(hitDiceCounts).map(
        ([die, count]) =>
          `${count}${die}`
      );

    [
      'hit-dice-1',
      'hit-dice-2',
      'hit-dice-3',
      'hit-dice-4'
    ].forEach((id, index) => {
      const input =
        document.getElementById(id);

      if (input) {
        input.value =
          hitDiceParts[index] || '';
      }
    });
  }

  function calculateHP() {
    const conMod =
      getAbilityModifier('con');

    let totalHP = 0;
    let firstClassProcessed = false;

    document
      .querySelectorAll('.class-level-row')
      .forEach((row) => {
        const classSelect =
          row.querySelector(
            '.char-class-select'
          );

        const levelSelect =
          row.querySelector(
            '.char-level-select'
          );

        if (!classSelect || !levelSelect) {
          return;
        }

        const className =
          classSelect.value;

        const level =
          parseInt(levelSelect.value, 10) ||
          1;

        const maxDie =
          CLASS_HIT_DICE_VALUES[
            className
          ] || 8;

        const averageDie =
          Math.floor(maxDie / 2) + 1;

        for (
          let currentLevel = 1;
          currentLevel <= level;
          currentLevel += 1
        ) {
          if (!firstClassProcessed) {
            totalHP +=
              maxDie + conMod;

            firstClassProcessed = true;
          } else {
            totalHP +=
              averageDie + conMod;
          }
        }
      });

    const totalLevel = Array.from(
      document.querySelectorAll(
        '.char-level-select'
      )
    ).reduce(
      (sum, select) =>
        sum +
        (parseInt(select.value, 10) ||
          1),
      0
    );

    const minimumHP = totalLevel;

    if (totalHP < minimumHP) {
      totalHP = minimumHP;
    }

    const hpInput =
      document.getElementById(
        'hp-input'
      );

    if (hpInput) {
      hpInput.value = totalHP;
    }
  }

  function updateDerivedStats() {
    const dexMod =
      getAbilityModifier('dex');

    const wisMod =
      getAbilityModifier('wis');

    const profBonus =
      getProficiencyBonus();

    const initiativeInput =
      document.getElementById(
        'initiative'
      );

    if (initiativeInput) {
      initiativeInput.value =
        formatSigned(dexMod);
    }

    const perceptionCheckbox =
      document.getElementById(
        'perception-skill-check'
      );

    const passivePerception =
      10 +
      wisMod +
      (
        perceptionCheckbox?.checked
          ? profBonus
          : 0
      );

    const passivePerceptionInput =
      document.getElementById(
        'passive-perception'
      );

    if (passivePerceptionInput) {
      passivePerceptionInput.value =
        passivePerception;
    }

    updateSpellcastingStats(
      profBonus
    );

    updateSavesAndSkills();
    updateHitDice();
  }

  function updateModifiers() {
    STAT_INPUTS.forEach((stat) => {
      const input =
        document.getElementById(stat);

      const modSpan =
        document.getElementById(
          `${stat}-mod`
        );

      if (input && modSpan) {
        modSpan.textContent =
          calculateModifier(
            input.value
          );
      }
    });

    updateDerivedStats();
    calculateHP();
  }

  function updateTotalLevelAndProficiency() {
    const totalLevel =
      getTotalLevel();

    const prof =
      calculateProficiencyBonus(
        totalLevel
      );

    const profBonusInput =
      document.getElementById(
        'prof-bonus'
      );

    if (profBonusInput) {
      profBonusInput.value =
        formatSigned(prof);
    }

    updateDerivedStats();
    calculateHP();
  }

  function bindCalculationListeners() {
    STAT_INPUTS.forEach((stat) => {
      const input =
        document.getElementById(stat);

      if (
        !input ||
        input.dataset
          .calculationListenerBound ===
          'true'
      ) {
        return;
      }

      input.dataset
        .calculationListenerBound =
        'true';

      input.addEventListener(
        'input',
        (event) => {
          event.target.dataset.base =
            event.target.value;

          updateModifiers();
        }
      );
    });

    document
      .querySelectorAll(
        '.save-check, .skill-check'
      )
      .forEach((element) => {
        if (
          element.dataset
            .calculationListenerBound ===
          'true'
        ) {
          return;
        }

        element.dataset
          .calculationListenerBound =
          'true';

        element.addEventListener(
          'change',
          updateDerivedStats
        );
      });

    const spellAbilitySelect =
      document.getElementById(
        'spell-ability'
      );

    if (
      spellAbilitySelect &&
      spellAbilitySelect.dataset
        .calculationListenerBound !==
        'true'
    ) {
      spellAbilitySelect.dataset
        .calculationListenerBound =
        'true';

      spellAbilitySelect.addEventListener(
        'change',
        updateDerivedStats
      );
    }
  }

  function refreshAll() {
    updateTotalLevelAndProficiency();
    updateModifiers();
  }

  function init() {
    bindCalculationListeners();
    refreshAll();

    document.addEventListener(
      'character:restored',
      () => {
        bindCalculationListeners();
        refreshAll();
      }
    );
  }

  const api = Object.freeze({
    STAT_INPUTS,
    CLASS_HIT_DICE_MAP,
    CLASS_HIT_DICE_VALUES,
    SKILL_STAT_MAP,
    calculateModifier,
    calculateProficiencyBonus,
    getTotalLevel,
    updateModifiers,
    updateDerivedStats,
    updateHitDice,
    calculateHP,
    updateSavesAndSkills,
    updateSpellcastingStats,
    updateTotalLevelAndProficiency,
    bindCalculationListeners,
    refreshAll
  });

  window.CharacterCalculations = api;

  /*
   * Transitional globals.
   *
   * The remaining inline builder code
   * currently calls these names directly.
   * When ui.js and app.js are extracted,
   * these compatibility aliases can go away.
   */

  window.statInputs =
    STAT_INPUTS;

  window.calculateModifier =
    calculateModifier;

  window.updateModifiers =
    updateModifiers;

  window.updateDerivedStats =
    updateDerivedStats;

  window.updateHitDice =
    updateHitDice;

  window.calculateHP =
    calculateHP;

  window.updateSavesAndSkills =
    updateSavesAndSkills;

  window.updateSpellcastingStats =
    updateSpellcastingStats;

  window.updateTotalLevelAndProficiency =
    updateTotalLevelAndProficiency;

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
