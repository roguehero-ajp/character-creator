/**
 * My RPG Source - Level Advancement
 * ---------------------------------
 *
 * First advancement pass:
 *  - One Level Up button
 *  - Advance an existing class
 *  - Fixed, rolled, or manually entered HP
 *  - Review before committing
 *  - Saved level-history state
 *  - Constitution changes recalculate historical HP
 *  - Dwarven Toughness remains dynamic
 *
 * The Add a New Class branch is intentionally visible but locked
 * until multiclass prerequisites, proficiencies, and spell slots
 * are implemented.
 */

(() => {
  'use strict';

  const config =
    window.MyRPGConfig;

  const calc =
    window.CharacterCalculations;

  const classes =
    window.CharacterClasses;

  const HISTORY_FIELD_ID =
    'level-history-state';

  const MAX_CHARACTER_LEVEL =
    20;

  const state = {
    open: false,
    committing: false,
    selectedRowIndex: 0,
    hpMethod: 'fixed',
    rolledValue: null,
    manualGain: '',
    overlay: null,
    modal: null,
    historyField: null
  };


  function number(
    value,
    fallback = 0
  ) {
    const parsed =
      Number(value);

    return Number.isFinite(
      parsed
    )
      ? parsed
      : fallback;
  }


  function integer(
    value,
    fallback = 0
  ) {
    const parsed =
      parseInt(
        value,
        10
      );

    return Number.isFinite(
      parsed
    )
      ? parsed
      : fallback;
  }


  function clamp(
    value,
    minimum,
    maximum
  ) {
    return Math.min(
      maximum,
      Math.max(
        minimum,
        value
      )
    );
  }


  function getConModifier() {
    const score =
      integer(
        document
          .getElementById(
            'con'
          )
          ?.value,
        10
      );

    return Math.floor(
      (
        score -
        10
      ) /
      2
    );
  }


  function getClassRows() {
    return Array.from(
      document.querySelectorAll(
        '.class-level-row'
      )
    ).map(
      (
        row,
        index
      ) => {
        const classSelect =
          row.querySelector(
            '.char-class-select'
          );

        const levelSelect =
          row.querySelector(
            '.char-level-select'
          );

        return {
          index,

          row,

          classSelect,

          levelSelect,

          className:
            classSelect?.value ||
            '',

          level:
            integer(
              levelSelect?.value,
              1
            )
        };
      }
    );
  }


  function getTotalLevel() {
    return getClassRows()
      .reduce(
        (
          total,
          row
        ) =>
          total +
          row.level,
        0
      );
  }


  function getProficiencyBonus(
    level
  ) {
    if (level >= 17) {
      return 6;
    }

    if (level >= 13) {
      return 5;
    }

    if (level >= 9) {
      return 4;
    }

    if (level >= 5) {
      return 3;
    }

    return 2;
  }


  function formatSigned(value) {
    const numeric =
      number(
        value,
        0
      );

    return numeric >= 0
      ? `+${numeric}`
      : String(
          numeric
        );
  }


  function hasDwarvenToughness() {
    const direct =
      calc
        ?.hasDwarvenToughness;

    if (
      typeof direct ===
      'function'
    ) {
      return Boolean(
        direct()
      );
    }

    const originValue =
      document
        .getElementById(
          'char-race'
        )
        ?.value ||
      '';

    const origin =
      window.CharacterOrigins
        ?.findEntry
        ?.(
          originValue
        );

    if (
      origin
        ?.traits
        ?.some(
          (trait) =>
            String(
              trait?.name ||
              trait ||
              ''
            )
              .trim()
              .toLowerCase() ===
            'dwarven toughness'
        )
    ) {
      return true;
    }

    return (
      /\bdwarven toughness\b/i
        .test(
          document
            .getElementById(
              'racial-abilities-input'
            )
            ?.value ||
          ''
        )
    );
  }


  function getDwarvenBonus(
    totalLevel =
      getTotalLevel()
  ) {
    return hasDwarvenToughness()
      ? totalLevel
      : 0;
  }


  function getMaximumHpInput() {
    return document.getElementById(
      'hp-input'
    );
  }


  function getCurrentHpInput() {
    return document.querySelector(
      '.hp-inputs input:not(#hp-input)'
    );
  }


  function createHistoryField() {
    const characterDocument =
      document.getElementById(
        'character-document'
      );

    if (!characterDocument) {
      return null;
    }

    let field =
      document.getElementById(
        HISTORY_FIELD_ID
      );

    if (!field) {
      field =
        document.createElement(
          'input'
        );

      field.type =
        'hidden';

      field.id =
        HISTORY_FIELD_ID;

      field.value =
        '';

      characterDocument.appendChild(
        field
      );
    }

    state.historyField =
      field;

    return field;
  }


  function parseHistory() {
    const field =
      state.historyField ||
      createHistoryField();

    if (
      !field ||
      !field.value
    ) {
      return null;
    }

    try {
      const parsed =
        JSON.parse(
          field.value
        );

      if (
        parsed?.version !==
          1 ||
        !parsed?.baseline ||
        !Array.isArray(
          parsed?.levels
        )
      ) {
        return null;
      }

      return parsed;
    } catch (error) {
      console.warn(
        'Level history could not be parsed.',
        error
      );

      return null;
    }
  }


  function writeHistory(history) {
    const field =
      state.historyField ||
      createHistoryField();

    if (!field) {
      return;
    }

    field.value =
      JSON.stringify(
        history
      );

    field.dispatchEvent(
      new Event(
        'input',
        {
          bubbles:
            true
        }
      )
    );
  }


  function clearHistory() {
    const field =
      state.historyField ||
      createHistoryField();

    if (!field) {
      return;
    }

    field.value =
      '';

    field.dispatchEvent(
      new Event(
        'input',
        {
          bubbles:
            true
        }
      )
    );
  }


  function snapshotClasses() {
    return getClassRows()
      .map(
        (row) => ({
          className:
            row.className,

          level:
            row.level
        })
      );
  }


  function createBaselineHistory() {
    const totalLevel =
      getTotalLevel();

    if (
      totalLevel < 1
    ) {
      return null;
    }

    const conModifier =
      getConModifier();

    const currentMaximum =
      integer(
        getMaximumHpInput()
          ?.value,
        0
      );

    const dwarvenBonus =
      getDwarvenBonus(
        totalLevel
      );

    let baseHitPointTotal =
      currentMaximum -
      (
        conModifier *
        totalLevel
      ) -
      dwarvenBonus;

    /*
     * If the sheet has no useful current HP maximum, derive a
     * fixed-value baseline from the visible class rows.
     */
    if (
      currentMaximum < 1
    ) {
      let firstLevel =
        true;

      baseHitPointTotal =
        0;

      getClassRows()
        .forEach(
          (row) => {
            const entry =
              classes
                ?.findEntry
                ?.(
                  row.className
                );

            const hitDie =
              entry?.hitDie ||
              8;

            const fixed =
              entry
                ?.fixedHitPointsPerLevel ||
              Math.floor(
                hitDie / 2
              ) + 1;

            for (
              let level = 1;
              level <= row.level;
              level += 1
            ) {
              baseHitPointTotal +=
                firstLevel
                  ? hitDie
                  : fixed;

              firstLevel =
                false;
            }
          }
        );
    }

    return {
      version:
        1,

      edition:
        config?.edition ||
        '2024',

      createdAt:
        new Date()
          .toISOString(),

      baseline: {
        totalLevel,

        baseHitPointTotal,

        classes:
          snapshotClasses()
      },

      levels: []
    };
  }


  function getExpectedClassLevels(
    history
  ) {
    const totals =
      new Map();

    history
      .baseline
      .classes
      .forEach(
        (row) => {
          totals.set(
            row.className,
            (
              totals.get(
                row.className
              ) ||
              0
            ) +
            integer(
              row.level,
              0
            )
          );
        }
      );

    history.levels.forEach(
      (level) => {
        totals.set(
          level.className,
          (
            totals.get(
              level.className
            ) ||
            0
          ) +
          1
        );
      }
    );

    return totals;
  }


  function historyMatchesSheet(
    history
  ) {
    if (!history) {
      return false;
    }

    const expected =
      getExpectedClassLevels(
        history
      );

    const actual =
      new Map();

    getClassRows()
      .forEach(
        (row) => {
          actual.set(
            row.className,
            (
              actual.get(
                row.className
              ) ||
              0
            ) +
            row.level
          );
        }
      );

    if (
      expected.size !==
      actual.size
    ) {
      return false;
    }

    return Array.from(
      expected.entries()
    ).every(
      (
        [
          className,
          level
        ]
      ) =>
        actual.get(
          className
        ) ===
        level
    );
  }


  function ensureHistory() {
    const existing =
      parseHistory();

    if (
      existing &&
      historyMatchesSheet(
        existing
      )
    ) {
      return existing;
    }

    const created =
      createBaselineHistory();

    if (created) {
      writeHistory(
        created
      );
    }

    return created;
  }


  function calculateHistoricalHP() {
    const history =
      parseHistory();

    if (
      !history ||
      !historyMatchesSheet(
        history
      )
    ) {
      return null;
    }

    const conModifier =
      getConModifier();

    let total =
      number(
        history
          .baseline
          .baseHitPointTotal,
        0
      ) +
      (
        conModifier *
        integer(
          history
            .baseline
            .totalLevel,
          0
        )
      );

    history.levels.forEach(
      (level) => {
        total +=
          Math.max(
            1,
            number(
              level.hpBase,
              0
            ) +
            conModifier
          );
      }
    );

    total +=
      getDwarvenBonus(
        getTotalLevel()
      );

    return Math.max(
      getTotalLevel(),
      Math.floor(
        total
      )
    );
  }


  function invalidateHistoryForManualClassEdit(
    event
  ) {
    if (
      state.committing ||
      !event.isTrusted
    ) {
      return;
    }

    clearHistory();
  }


  function bindClassEditDetection() {
    document.addEventListener(
      'change',
      (event) => {
        if (
          event.target
            ?.matches
            ?.(
              '.char-class-select, .char-level-select'
            )
        ) {
          invalidateHistoryForManualClassEdit(
            event
          );
        }
      }
    );
  }


  function buildModal() {
    const overlay =
      document.createElement(
        'div'
      );

    overlay.className =
      'level-up-overlay';

    overlay.setAttribute(
      'aria-hidden',
      'true'
    );

    const modal =
      document.createElement(
        'section'
      );

    modal.className =
      'level-up-modal';

    modal.setAttribute(
      'role',
      'dialog'
    );

    modal.setAttribute(
      'aria-modal',
      'true'
    );

    modal.setAttribute(
      'aria-labelledby',
      'level-up-title'
    );

    modal.innerHTML = `
      <div class="level-up-header">
        <div>
          <div class="level-up-kicker">Character Advancement</div>
          <h2 id="level-up-title">Level Up</h2>
        </div>

        <button
          type="button"
          class="level-up-close"
          aria-label="Close level-up window"
        >×</button>
      </div>

      <div class="level-up-content">
        <div class="level-up-level-summary"></div>

        <fieldset class="level-up-choice-group">
          <legend>How are you gaining this level?</legend>

          <label class="level-up-path selected">
            <input
              type="radio"
              name="level-up-path"
              value="existing"
              checked
            >

            <span>
              <strong>Advance an Existing Class</strong>
              <small>Increase one of your current classes by one level.</small>
            </span>
          </label>

          <label class="level-up-path locked">
            <input
              type="radio"
              name="level-up-path"
              value="new"
              disabled
            >

            <span>
              <strong>Add a New Class</strong>
              <small>Available after the multiclass prerequisite and proficiency pass.</small>
            </span>
          </label>
        </fieldset>

        <div class="level-up-field">
          <label for="level-up-class-select">
            Class to Advance
          </label>

          <select
            id="level-up-class-select"
          ></select>
        </div>

        <fieldset class="level-up-choice-group">
          <legend>Hit Point Increase</legend>

          <label class="level-up-hp-option selected">
            <input
              type="radio"
              name="level-up-hp-method"
              value="fixed"
              checked
            >

            <span>
              <strong>Use Fixed Value</strong>
              <small class="level-up-fixed-description"></small>
            </span>
          </label>

          <label class="level-up-hp-option">
            <input
              type="radio"
              name="level-up-hp-method"
              value="roll"
            >

            <span>
              <strong>Roll Hit Die</strong>
              <small class="level-up-roll-description"></small>
            </span>
          </label>

          <div
            class="level-up-roll-controls"
            hidden
          >
            <button
              type="button"
              class="level-up-roll-button"
            >
              Roll
            </button>

            <output
              class="level-up-roll-result"
            >
              Not rolled
            </output>
          </div>

          <label class="level-up-hp-option">
            <input
              type="radio"
              name="level-up-hp-method"
              value="manual"
            >

            <span>
              <strong>Enter Manually</strong>
              <small>Enter the HP gained from the class level after Constitution, before Dwarven Toughness.</small>
            </span>
          </label>

          <div
            class="level-up-manual-controls"
            hidden
          >
            <label for="level-up-manual-hp">
              HP Gained
            </label>

            <input
              id="level-up-manual-hp"
              type="number"
              min="1"
              max="99"
              inputmode="numeric"
            >
          </div>
        </fieldset>

        <div class="level-up-review"></div>
      </div>

      <div class="level-up-actions">
        <button
          type="button"
          class="level-up-cancel"
        >
          Cancel
        </button>

        <button
          type="button"
          class="level-up-confirm"
        >
          Confirm Level Up
        </button>
      </div>
    `;

    document.body.appendChild(
      overlay
    );

    document.body.appendChild(
      modal
    );

    state.overlay =
      overlay;

    state.modal =
      modal;

    overlay.addEventListener(
      'click',
      () => {
        /*
         * Deliberately do nothing. A level-up draft should not
         * vanish from an accidental click outside the modal.
         */
      }
    );

    modal
      .querySelector(
        '.level-up-close'
      )
      .addEventListener(
        'click',
        closeModal
      );

    modal
      .querySelector(
        '.level-up-cancel'
      )
      .addEventListener(
        'click',
        closeModal
      );

    modal
      .querySelector(
        '#level-up-class-select'
      )
      .addEventListener(
        'change',
        (event) => {
          state.selectedRowIndex =
            integer(
              event.target.value,
              0
            );

          state.rolledValue =
            null;

          renderModal();
        }
      );

    modal
      .querySelectorAll(
        'input[name="level-up-hp-method"]'
      )
      .forEach(
        (radio) => {
          radio.addEventListener(
            'change',
            (event) => {
              state.hpMethod =
                event.target.value;

              renderModal();
            }
          );
        }
      );

    modal
      .querySelector(
        '.level-up-roll-button'
      )
      .addEventListener(
        'click',
        () => {
          const classData =
            getSelectedClassData();

          if (!classData) {
            return;
          }

          state.rolledValue =
            Math.floor(
              Math.random() *
              classData.hitDie
            ) + 1;

          renderModal();
        }
      );

    modal
      .querySelector(
        '#level-up-manual-hp'
      )
      .addEventListener(
        'input',
        (event) => {
          state.manualGain =
            event.target.value;

          renderModal();
        }
      );

    modal
      .querySelector(
        '.level-up-confirm'
      )
      .addEventListener(
        'click',
        commitLevelUp
      );

    document.addEventListener(
      'keydown',
      (event) => {
        if (
          state.open &&
          event.key ===
            'Escape'
        ) {
          closeModal();
        }
      }
    );
  }


  function addLevelUpButton() {
    const controls =
      document.querySelector(
        '.controls'
      );

    const rollButton =
      document.getElementById(
        'roll-btn'
      );

    if (
      !controls ||
      !rollButton ||
      document.getElementById(
        'level-up-btn'
      )
    ) {
      return;
    }

    const separator =
      document.createElement(
        'hr'
      );

    separator.className =
      'level-up-control-separator';

    const heading =
      document.createElement(
        'h3'
      );

    heading.className =
      'level-up-control-heading';

    heading.textContent =
      'Level Advancement';

    const button =
      document.createElement(
        'button'
      );

    button.type =
      'button';

    button.id =
      'level-up-btn';

    button.className =
      'level-up-control-button';

    button.textContent =
      'Level Up';

    button.addEventListener(
      'click',
      openModal
    );

    const insertionPoint =
      rollButton
        .nextElementSibling;

    controls.insertBefore(
      separator,
      insertionPoint
    );

    controls.insertBefore(
      heading,
      insertionPoint
    );

    controls.insertBefore(
      button,
      insertionPoint
    );
  }


  function getSelectedRow() {
    const rows =
      getClassRows();

    return (
      rows[
        state.selectedRowIndex
      ] ||
      rows[0] ||
      null
    );
  }


  function getSelectedClassData() {
    const row =
      getSelectedRow();

    return classes
      ?.findEntry
      ?.(
        row?.className
      ) ||
      null;
  }


  function getClassHpGain() {
    const classData =
      getSelectedClassData();

    if (!classData) {
      return null;
    }

    const conModifier =
      getConModifier();

    if (
      state.hpMethod ===
      'fixed'
    ) {
      return Math.max(
        1,
        classData
          .fixedHitPointsPerLevel +
        conModifier
      );
    }

    if (
      state.hpMethod ===
      'roll'
    ) {
      if (
        !Number.isFinite(
          state.rolledValue
        )
      ) {
        return null;
      }

      return Math.max(
        1,
        state.rolledValue +
        conModifier
      );
    }

    const manual =
      integer(
        state.manualGain,
        0
      );

    return manual >= 1
      ? manual
      : null;
  }


  function getHpBaseForHistory() {
    const classData =
      getSelectedClassData();

    const conModifier =
      getConModifier();

    if (
      !classData
    ) {
      return null;
    }

    if (
      state.hpMethod ===
      'fixed'
    ) {
      return classData
        .fixedHitPointsPerLevel;
    }

    if (
      state.hpMethod ===
      'roll'
    ) {
      return Number.isFinite(
        state.rolledValue
      )
        ? state.rolledValue
        : null;
    }

    const manualGain =
      getClassHpGain();

    return manualGain == null
      ? null
      : manualGain -
        conModifier;
  }


  function renderPathStyles() {
    state.modal
      .querySelectorAll(
        '.level-up-hp-option'
      )
      .forEach(
        (label) => {
          const radio =
            label.querySelector(
              'input[name="level-up-hp-method"]'
            );

          const selected =
            radio?.value ===
            state.hpMethod;

          /*
           * Keep the browser's checked radio state synchronized
           * with the modal's internal HP method. Previously the
           * browser could remember "Roll Hit Die" while state had
           * already reset to "fixed", hiding the Roll button.
           */
          if (radio) {
            radio.checked =
              selected;
          }

          label.classList.toggle(
            'selected',
            selected
          );
        }
      );
  }


  function renderModal() {
    if (
      !state.modal
    ) {
      return;
    }

    const rows =
      getClassRows();

    const totalLevel =
      getTotalLevel();

    const selectedRow =
      getSelectedRow();

    const classData =
      getSelectedClassData();

    const conModifier =
      getConModifier();

    const newTotalLevel =
      totalLevel + 1;

    const currentProf =
      getProficiencyBonus(
        totalLevel
      );

    const newProf =
      getProficiencyBonus(
        newTotalLevel
      );

    const classSelect =
      state.modal.querySelector(
        '#level-up-class-select'
      );

    classSelect.replaceChildren();

    rows.forEach(
      (row) => {
        const option =
          document.createElement(
            'option'
          );

        option.value =
          String(
            row.index
          );

        option.textContent =
          `${row.className} ${row.level} → ${row.level + 1}`;

        classSelect.appendChild(
          option
        );
      }
    );

    classSelect.value =
      String(
        selectedRow?.index ||
        0
      );

    state.modal
      .querySelector(
        '.level-up-level-summary'
      )
      .innerHTML = `
        <div>
          <span>Current Character Level</span>
          <strong>${totalLevel}</strong>
        </div>

        <div>
          <span>New Character Level</span>
          <strong>${newTotalLevel}</strong>
        </div>

        <div>
          <span>Edition</span>
          <strong>${config?.edition || '2024'}</strong>
        </div>
      `;

    const fixedGain =
      classData
        ? Math.max(
            1,
            classData
              .fixedHitPointsPerLevel +
            conModifier
          )
        : 0;

    state.modal
      .querySelector(
        '.level-up-fixed-description'
      )
      .textContent =
      classData
        ? `${classData.fixedHitPointsPerLevel} ${formatSigned(conModifier)} Constitution = ${fixedGain} HP`
        : 'Class data unavailable';

    state.modal
      .querySelector(
        '.level-up-roll-description'
      )
      .textContent =
      classData
        ? `Roll ${classData.hitDieLabel}, then add ${formatSigned(conModifier)} Constitution`
        : 'Class data unavailable';

    const rollControls =
      state.modal.querySelector(
        '.level-up-roll-controls'
      );

    rollControls.hidden =
      state.hpMethod !==
      'roll';

    state.modal
      .querySelector(
        '.level-up-roll-button'
      )
      .textContent =
      classData
        ? `Roll ${classData.hitDieLabel}`
        : 'Roll';

    state.modal
      .querySelector(
        '.level-up-roll-result'
      )
      .textContent =
      Number.isFinite(
        state.rolledValue
      )
        ? `Rolled ${state.rolledValue}; class HP gain ${Math.max(1, state.rolledValue + conModifier)}`
        : 'Not rolled';

    const manualControls =
      state.modal.querySelector(
        '.level-up-manual-controls'
      );

    manualControls.hidden =
      state.hpMethod !==
      'manual';

    const manualInput =
      state.modal.querySelector(
        '#level-up-manual-hp'
      );

    if (
      manualInput.value !==
      state.manualGain
    ) {
      manualInput.value =
        state.manualGain;
    }

    const classHpGain =
      getClassHpGain();

    const dwarfGain =
      hasDwarvenToughness()
        ? 1
        : 0;

    const totalHpGain =
      classHpGain == null
        ? null
        : classHpGain +
          dwarfGain;

    const currentMaximum =
      integer(
        getMaximumHpInput()
          ?.value,
        0
      );

    const newMaximum =
      totalHpGain == null
        ? null
        : currentMaximum +
          totalHpGain;

    const profLine =
      currentProf ===
      newProf
        ? `Proficiency Bonus remains ${formatSigned(currentProf)}`
        : `Proficiency Bonus ${formatSigned(currentProf)} → ${formatSigned(newProf)}`;

    state.modal
      .querySelector(
        '.level-up-review'
      )
      .innerHTML = `
        <h3>Level-Up Preview</h3>

        <div class="level-up-review-row">
          <span>Class</span>
          <strong>
            ${
              selectedRow
                ? `${selectedRow.className} ${selectedRow.level} → ${selectedRow.level + 1}`
                : 'Unavailable'
            }
          </strong>
        </div>

        <div class="level-up-review-row">
          <span>Hit Die</span>
          <strong>
            ${
              classData
                ? `${classData.hitDieLabel}`
                : '—'
            }
          </strong>
        </div>

        <div class="level-up-review-row">
          <span>Class HP Gain</span>
          <strong>
            ${
              classHpGain == null
                ? 'Choose or roll a value'
                : `+${classHpGain}`
            }
          </strong>
        </div>

        ${
          dwarfGain
            ? `
              <div class="level-up-review-row">
                <span>Dwarven Toughness</span>
                <strong>+1</strong>
              </div>
            `
            : ''
        }

        <div class="level-up-review-row">
          <span>Maximum HP</span>
          <strong>
            ${
              newMaximum == null
                ? `${currentMaximum} → ?`
                : `${currentMaximum} → ${newMaximum}`
            }
          </strong>
        </div>

        <div class="level-up-review-note">
          ${profLine}. Class-feature automation will be added during the full class-rules pass.
        </div>
      `;

    renderPathStyles();

    const confirm =
      state.modal.querySelector(
        '.level-up-confirm'
      );

    confirm.disabled =
      (
        totalLevel >=
        MAX_CHARACTER_LEVEL
      ) ||
      !selectedRow ||
      !classData ||
      classHpGain == null;

    confirm.textContent =
      totalLevel >=
      MAX_CHARACTER_LEVEL
        ? 'Maximum Level Reached'
        : 'Confirm Level Up';
  }


  async function openModal() {
    await classes
      ?.ready;

    const totalLevel =
      getTotalLevel();

    if (
      totalLevel >=
      MAX_CHARACTER_LEVEL
    ) {
      window.alert(
        'This character is already level 20.'
      );

      return;
    }

    if (
      !classes?.active
    ) {
      window.alert(
        'Class data is not available. Check that classes.json and classes.js loaded correctly.'
      );

      return;
    }

    ensureHistory();

    state.selectedRowIndex =
      0;

    /*
     * Preserve the HP method used on the previous level-up during
     * this browser session. A rolled value itself never carries
     * forward, so choosing Roll opens with a fresh Roll button.
     */
    state.rolledValue =
      null;

    state.manualGain =
      '';

    state.open =
      true;

    state.overlay
      .classList
      .add(
        'visible'
      );

    state.overlay
      .setAttribute(
        'aria-hidden',
        'false'
      );

    state.modal
      .classList
      .add(
        'open'
      );

    document.body.style
      .overflow =
      'hidden';

    renderModal();

    state.modal
      .querySelector(
        '#level-up-class-select'
      )
      ?.focus();
  }


  function closeModal() {
    state.open =
      false;

    state.overlay
      ?.classList
      .remove(
        'visible'
      );

    state.overlay
      ?.setAttribute(
        'aria-hidden',
        'true'
      );

    state.modal
      ?.classList
      .remove(
        'open'
      );

    document.body.style
      .overflow =
      '';
  }


  function commitLevelUp() {
    const row =
      getSelectedRow();

    const classData =
      getSelectedClassData();

    const classHpGain =
      getClassHpGain();

    const hpBase =
      getHpBaseForHistory();

    if (
      !row ||
      !classData ||
      classHpGain == null ||
      hpBase == null
    ) {
      return;
    }

    const currentTotal =
      getTotalLevel();

    if (
      currentTotal >=
      MAX_CHARACTER_LEVEL
    ) {
      return;
    }

    const history =
      ensureHistory();

    if (!history) {
      return;
    }

    const oldMaximum =
      integer(
        getMaximumHpInput()
          ?.value,
        0
      );

    const currentHpInput =
      getCurrentHpInput();

    const oldCurrentHp =
      integer(
        currentHpInput?.value,
        -1
      );

    history.levels.push({
      characterLevel:
        currentTotal + 1,

      className:
        row.className,

      classId:
        classData.id,

      classLevel:
        row.level + 1,

      hpMethod:
        state.hpMethod,

      hpBase,

      rolledValue:
        state.hpMethod ===
          'roll'
          ? state.rolledValue
          : null,

      classHpGain,

      createdAt:
        new Date()
          .toISOString()
    });

    writeHistory(
      history
    );

    state.committing =
      true;

    try {
      const desiredLevel =
        row.level + 1;

      const optionExists =
        Array.from(
          row.levelSelect.options
        ).some(
          (option) =>
            integer(
              option.value,
              0
            ) ===
            desiredLevel
        );

      if (!optionExists) {
        const option =
          document.createElement(
            'option'
          );

        option.value =
          String(
            desiredLevel
          );

        option.textContent =
          String(
            desiredLevel
          );

        row.levelSelect.appendChild(
          option
        );
      }

      row.levelSelect.value =
        String(
          desiredLevel
        );

      row.levelSelect
        .dispatchEvent(
          new Event(
            'change',
            {
              bubbles:
                true
            }
          )
        );

      calc
        ?.refreshAll
        ?.();

      calc
        ?.calculateHP
        ?.();

      const newMaximum =
        integer(
          getMaximumHpInput()
            ?.value,
          oldMaximum
        );

      if (
        currentHpInput &&
        oldCurrentHp >= 0
      ) {
        currentHpInput.value =
          String(
            clamp(
              oldCurrentHp +
              (
                newMaximum -
                oldMaximum
              ),
              0,
              newMaximum
            )
          );

        currentHpInput
          .dispatchEvent(
            new Event(
              'input',
              {
                bubbles:
                  true
              }
            )
          );
      }

      document.dispatchEvent(
        new CustomEvent(
          'character:leveled-up',
          {
            detail: {
              edition:
                config?.edition ||
                '2024',

              characterLevel:
                currentTotal + 1,

              className:
                row.className,

              classLevel:
                desiredLevel,

              hpMethod:
                state.hpMethod,

              classHpGain,

              dwarvenToughness:
                hasDwarvenToughness()
                  ? 1
                  : 0,

              maximumHitPoints:
                newMaximum
            }
          }
        )
      );
    } finally {
      state.committing =
        false;
    }

    closeModal();
  }


  function refreshAfterRestore() {
    createHistoryField();

    calc
      ?.calculateHP
      ?.();
  }


  function init() {
    createHistoryField();
    buildModal();
    addLevelUpButton();
    bindClassEditDetection();

    document.addEventListener(
      'character:restored',
      refreshAfterRestore
    );

    document.addEventListener(
      'character:classes-ready',
      () => {
        if (
          state.open
        ) {
          renderModal();
        }
      }
    );
  }


  window.CharacterLevelUp =
    Object.freeze({
      open:
        openModal,

      close:
        closeModal,

      calculateHistoricalHP,

      ensureHistory,

      clearHistory,

      getHistory:
        parseHistory
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
