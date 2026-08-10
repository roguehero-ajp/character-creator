/**
 * My RPG Source - Character Storage Module
 * ----------------------------------------
 *
 * Responsibilities:
 *  - Keep 2014 and 2024 browser saves separate
 *  - Autosave the current character in localStorage
 *  - Save and load on demand
 *  - Export an edition-labelled JSON backup
 *  - Import current and older JSON backups
 *  - Warn before importing a different edition
 *  - Preserve multiclass rows and dynamic sheet controls
 *  - Restore the UI and trigger calculations after load
 *
 * This file intentionally does not calculate game rules.
 */

(() => {
  'use strict';

  /* ========================================================
     CONFIGURATION
     ======================================================== */

  const SAVE_FORMAT =
    'myrpgsource-character';

  const SAVE_VERSION = 2;

  const AUTOSAVE_DELAY_MS = 500;

  const LEGACY_STORAGE_KEY =
    'myrpgsource.characterCreator.dnd5e.v1';

  const DEFAULT_STORAGE_KEY =
    'myrpgsource.characterCreator.dnd5e.2024.v1';

  const EXTRA_FIELD_SELECTORS = [
    '#theme-select',
    '#stat-method'
  ];


  /* ========================================================
     MODULE STATE
     ======================================================== */

  let autosaveTimer = null;
  let isRestoring = false;

  let saveNowBtn = null;
  let loadNowBtn = null;
  let exportJsonBtn = null;
  let importJsonBtn = null;
  let importJsonInput = null;
  let saveStatus = null;


  /* ========================================================
     EDITION HELPERS
     ======================================================== */

  function getEdition() {
    return String(
      window.MyRPGConfig?.edition ||
      '2024'
    );
  }


  function getSystemId() {
    return String(
      window.MyRPGConfig
        ?.settings
        ?.systemId ||
      'dnd5e'
    );
  }


  function getSystemName() {
    return String(
      window.MyRPGConfig
        ?.settings
        ?.systemName ||
      `D&D 5e ${getEdition()}`
    );
  }


  function getStorageKey() {
    return (
      window.MyRPGConfig
        ?.settings
        ?.storageKey ||
      DEFAULT_STORAGE_KEY
    );
  }


  function getSavedEdition(data) {
    return String(
      data?.edition ||
      data?.meta?.edition ||
      ''
    ).trim();
  }


  /**
   * New exports are flat save objects.
   *
   * This also accepts a possible wrapped structure:
   * {
   *   meta: { edition: "2024" },
   *   character: { fields: ... }
   * }
   *
   * That makes the importer forgiving of older experiments
   * and manually adjusted backup files.
   */
  function normalizeImportedData(parsed) {
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      parsed.character &&
      typeof parsed.character === 'object' &&
      parsed.character.fields
    ) {
      return {
        ...parsed.character,

        edition:
          parsed.character.edition ||
          parsed.meta?.edition ||
          '',

        system:
          parsed.character.system ||
          parsed.meta?.system ||
          ''
      };
    }

    return parsed;
  }


  function confirmEditionImport(data) {
    const importedEdition =
      getSavedEdition(data);

    const currentEdition =
      getEdition();

    if (
      !importedEdition ||
      importedEdition === currentEdition
    ) {
      return true;
    }

    return window.confirm(
      `This character file was created for the ${importedEdition} edition.\n\n` +
      `You are currently using the ${currentEdition} builder.\n\n` +
      'Import it anyway? Some Race, Species, Background, or class choices may not match.'
    );
  }


  /* ========================================================
     STATUS DISPLAY
     ======================================================== */

  function setStatus(
    message,
    kind = 'warn'
  ) {
    if (!saveStatus) {
      return;
    }

    saveStatus.textContent = message;
    saveStatus.dataset.kind = kind;
  }


  function formatTime(
    date = new Date()
  ) {
    try {
      return date.toLocaleTimeString(
        [],
        {
          hour: '2-digit',
          minute: '2-digit'
        }
      );
    } catch (_) {
      return date.toLocaleTimeString();
    }
  }


  /* ========================================================
     FIELD DISCOVERY
     ======================================================== */

  /**
   * Ordinary fields inside the character document are saved.
   * Multiclass class and level selectors are stored separately
   * because the number of rows can change.
   */
  function getSavableFields() {
    const fields =
      Array.from(
        document.querySelectorAll(
          '#character-document input, ' +
          '#character-document select, ' +
          '#character-document textarea'
        )
      );

    EXTRA_FIELD_SELECTORS.forEach(
      (selector) => {
        const field =
          document.querySelector(
            selector
          );

        if (field) {
          fields.push(field);
        }
      }
    );

    return fields.filter(
      (field) => {
        const type =
          String(
            field.type || ''
          ).toLowerCase();

        if (
          field.id ===
          'import-json-file'
        ) {
          return false;
        }

        if (
          field.closest(
            '.class-level-row'
          )
        ) {
          return false;
        }

        if (
          [
            'button',
            'submit',
            'reset',
            'file'
          ].includes(type)
        ) {
          return false;
        }

        return true;
      }
    );
  }


  /**
   * IDs are the preferred stable keys.
   * Older fields without IDs retain a positional fallback.
   */
  function getFieldKey(
    field,
    index
  ) {
    if (field.id) {
      return `id:${field.id}`;
    }

    if (field.name) {
      return (
        `name:${field.name}:` +
        index
      );
    }

    return `field:${index}`;
  }


  function readField(field) {
    const type =
      String(
        field.type || ''
      ).toLowerCase();

    if (
      type === 'checkbox' ||
      type === 'radio'
    ) {
      return {
        kind: type,
        checked:
          Boolean(field.checked),
        value:
          field.value
      };
    }

    return {
      kind:
        field.tagName.toLowerCase(),

      value:
        field.value
    };
  }


  function writeField(
    field,
    savedField
  ) {
    if (
      !field ||
      !savedField
    ) {
      return;
    }

    const type =
      String(
        field.type || ''
      ).toLowerCase();

    if (
      type === 'checkbox' ||
      type === 'radio'
    ) {
      field.checked =
        Boolean(
          savedField.checked
        );

      return;
    }

    if (
      savedField.value !==
        undefined &&
      savedField.value !==
        null
    ) {
      field.value =
        String(
          savedField.value
        );
    }
  }


  /* ========================================================
     MULTICLASS STORAGE
     ======================================================== */

  function captureClassRows() {
    return Array.from(
      document.querySelectorAll(
        '.class-level-row'
      )
    ).map(
      (row) => {
        const classSelect =
          row.querySelector(
            '.char-class-select'
          );

        const levelSelect =
          row.querySelector(
            '.char-level-select'
          );

        return {
          className:
            classSelect?.value ||
            'Fighter',

          level:
            levelSelect?.value ||
            '1'
        };
      }
    );
  }


  async function restoreClassRows(
    savedRows
  ) {
    if (
      !Array.isArray(savedRows) ||
      savedRows.length === 0
    ) {
      return;
    }

    const container =
      document.getElementById(
        'class-level-container'
      );

    const addBtn =
      document.getElementById(
        'multiclass-btn'
      );

    const removeBtn =
      document.getElementById(
        'remove-multiclass-btn'
      );

    if (!container) {
      return;
    }

    const targetCount =
      Math.max(
        1,
        savedRows.length
      );

    let safety = 30;

    while (
      container.querySelectorAll(
        '.class-level-row'
      ).length > targetCount &&
      removeBtn &&
      safety-- > 0
    ) {
      removeBtn.click();
    }

    safety = 30;

    while (
      container.querySelectorAll(
        '.class-level-row'
      ).length < targetCount &&
      addBtn &&
      safety-- > 0
    ) {
      const before =
        container.querySelectorAll(
          '.class-level-row'
        ).length;

      addBtn.click();

      const after =
        container.querySelectorAll(
          '.class-level-row'
        ).length;

      if (after <= before) {
        break;
      }
    }

    const rows =
      Array.from(
        container.querySelectorAll(
          '.class-level-row'
        )
      );

    savedRows.forEach(
      (savedRow, index) => {
        const row =
          rows[index];

        if (!row) {
          return;
        }

        const classSelect =
          row.querySelector(
            '.char-class-select'
          );

        const levelSelect =
          row.querySelector(
            '.char-level-select'
          );

        if (
          classSelect &&
          savedRow.className != null
        ) {
          const desiredClass =
            String(
              savedRow.className
            );

          const matchingOption =
            Array.from(
              classSelect.options
            ).find(
              (option) =>
                option.value ===
                desiredClass
            );

          if (matchingOption) {
            classSelect.value =
              desiredClass;

            classSelect.dispatchEvent(
              new Event(
                'change',
                { bubbles: true }
              )
            );
          }
        }

        if (
          levelSelect &&
          savedRow.level != null
        ) {
          const desiredLevel =
            String(
              savedRow.level
            );

          const matchingOption =
            Array.from(
              levelSelect.options
            ).find(
              (option) =>
                option.value ===
                desiredLevel
            );

          if (matchingOption) {
            levelSelect.value =
              desiredLevel;

            levelSelect.dispatchEvent(
              new Event(
                'change',
                { bubbles: true }
              )
            );
          }
        }
      }
    );
  }


  /* ========================================================
     CAPTURE AND VALIDATION
     ======================================================== */

  function captureState() {
    const fields =
      getSavableFields();

    const savedFields = {};

    fields.forEach(
      (field, index) => {
        savedFields[
          getFieldKey(
            field,
            index
          )
        ] = readField(field);
      }
    );

    return {
      format:
        SAVE_FORMAT,

      version:
        SAVE_VERSION,

      savedAt:
        new Date().toISOString(),

      page:
        'dnd5e-character-builder',

      system:
        getSystemId(),

      systemName:
        getSystemName(),

      edition:
        getEdition(),

      fields:
        savedFields,

      classRows:
        captureClassRows()
    };
  }


  function validateSaveData(data) {
    if (
      !data ||
      typeof data !== 'object' ||
      Array.isArray(data)
    ) {
      throw new Error(
        'The selected file does not contain valid character data.'
      );
    }

    if (
      !data.fields ||
      typeof data.fields !==
        'object'
    ) {
      throw new Error(
        'This character file is missing its saved fields.'
      );
    }

    if (
      data.format &&
      data.format !==
        SAVE_FORMAT
    ) {
      throw new Error(
        'This JSON file belongs to a different application.'
      );
    }

    return true;
  }


  function notifyFieldChanged(
    field
  ) {
    field.dispatchEvent(
      new Event(
        'input',
        { bubbles: true }
      )
    );

    field.dispatchEvent(
      new Event(
        'change',
        { bubbles: true }
      )
    );
  }


  /**
   * Wait for asynchronous Race, Species, Background, and combat
   * equipment dropdown data before restoring saved select values.
   */
  async function waitForDynamicModules() {
    const promises = [
      window.CharacterOrigins
        ?.ready,

      window.CharacterBackgrounds
        ?.ready,

      window.CharacterCombatEquipment
        ?.ready
    ].filter(
      (value) =>
        value &&
        typeof value.then ===
          'function'
    );

    if (promises.length) {
      await Promise.allSettled(
        promises
      );
    }
  }


  const LEGACY_SPELL_ABILITY_FIELD_INDEX = 102;
  const LEGACY_ATTACK_ROWS = [
    { name: 89, attack: 90, damage: 91, notes: 92 },
    { name: 93, attack: 94, damage: 95, notes: 96 },
    { name: 97, attack: 98, damage: 99, notes: 100 }
  ];
  const LEGACY_EXTRA_ATTACKS_FIELD_INDEX = 101;


  function savedValueByLegacyIndex(data, index) {
    return String(
      data?.fields?.[`field:${index}`]?.value ?? ''
    ).trim();
  }


  function isPreCombatEquipmentSave(data) {
    return Boolean(
      data?.fields &&
      !data.fields['id:weapon-select-1'] &&
      !data.fields['id:armor-select']
    );
  }


  function findLegacyFallback(data, field, index, fields) {
    if (
      !isPreCombatEquipmentSave(data) ||
      field.id ||
      field.name
    ) {
      return null;
    }

    const spellAbilityIndex = fields.findIndex(
      (candidate) => candidate.id === 'spell-ability'
    );

    if (
      spellAbilityIndex < 0 ||
      index <= spellAbilityIndex + 2
    ) {
      return null;
    }

    const indexShift =
      spellAbilityIndex -
      LEGACY_SPELL_ABILITY_FIELD_INDEX;

    if (indexShift <= 0) {
      return null;
    }

    return (
      data.fields[
        `field:${index - indexShift}`
      ] ||
      null
    );
  }


  function normalizeEquipmentName(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }


  function migrateLegacyAttackFields(data) {
    if (!isPreCombatEquipmentSave(data)) {
      return;
    }

    /*
     * Older sheets allowed Armor Class to be typed manually and
     * had no equipment-driven AC toggle. Preserve that value on
     * first load instead of replacing it with unarmored AC.
     */
    const autoAc =
      document.getElementById(
        'armor-auto-ac'
      );

    if (autoAc) {
      autoAc.checked = false;
    }

    const migratedNotes = [];

    LEGACY_ATTACK_ROWS.forEach(
      (row, rowIndex) => {
        const name =
          savedValueByLegacyIndex(
            data,
            row.name
          );

        if (!name) {
          return;
        }

        const attack =
          savedValueByLegacyIndex(
            data,
            row.attack
          );

        const damage =
          savedValueByLegacyIndex(
            data,
            row.damage
          );

        const notes =
          savedValueByLegacyIndex(
            data,
            row.notes
          );

        const select =
          document.getElementById(
            `weapon-select-${rowIndex + 1}`
          );

        const normalizedName =
          normalizeEquipmentName(name);

        const matchingOption =
          Array.from(
            select?.options || []
          ).find(
            (option) =>
              normalizeEquipmentName(
                option.textContent
              ) === normalizedName
          );

        if (select && matchingOption) {
          select.value =
            matchingOption.value;

          notifyFieldChanged(
            select
          );

          if (notes) {
            migratedNotes.push(
              `${name}: ${notes}`
            );
          }

          return;
        }

        const pieces = [
          name,
          attack
            ? `Atk ${attack}`
            : '',
          damage
            ? `Damage ${damage}`
            : '',
          notes
        ].filter(Boolean);

        migratedNotes.push(
          pieces.join(' | ')
        );
      }
    );

    const extra =
      savedValueByLegacyIndex(
        data,
        LEGACY_EXTRA_ATTACKS_FIELD_INDEX
      );

    if (extra) {
      migratedNotes.push(extra);
    }

    const notesField =
      document.getElementById(
        'attack-action-notes'
      );

    if (
      notesField &&
      !data.fields[
        'id:attack-action-notes'
      ] &&
      migratedNotes.length
    ) {
      notesField.value =
        migratedNotes.join('\n');

      notifyFieldChanged(
        notesField
      );
    }
  }


  function mergeLegacyCombinedTextField({
    primarySelector,
    legacySelector,
    legacyLabel
  }) {
    const primary =
      document.querySelector(
        primarySelector
      );

    const legacy =
      document.querySelector(
        legacySelector
      );

    if (!primary || !legacy) {
      return;
    }

    const legacyText =
      String(legacy.value || '')
        .trim();

    if (!legacyText) {
      return;
    }

    const primaryText =
      String(primary.value || '')
        .trim();

    primary.value =
      primaryText
        ? `${primaryText}\n\n${legacyLabel}: ${legacyText}`
        : `${legacyLabel}: ${legacyText}`;

    /*
     * Clear the hidden legacy field after folding it into the new
     * combined box. This prevents the same text from being appended
     * again the next time the character is loaded.
     */
    legacy.value = '';

    notifyFieldChanged(primary);
    notifyFieldChanged(legacy);
  }


  function mergeLegacyCombinedTraitFields() {
    mergeLegacyCombinedTextField({
      primarySelector:
        '[data-character-section="personality-ideals"]',

      legacySelector:
        '[data-character-section="legacy-ideals"]',

      legacyLabel:
        'Ideals'
    });

    mergeLegacyCombinedTextField({
      primarySelector:
        '[data-character-section="bonds-flaws"]',

      legacySelector:
        '[data-character-section="legacy-flaws"]',

      legacyLabel:
        'Flaws'
    });
  }


  async function applyState(data) {
    validateSaveData(data);

    isRestoring = true;

    try {
      await waitForDynamicModules();

      await restoreClassRows(
        data.classRows || []
      );

      const fields =
        getSavableFields();

      fields.forEach(
        (field, index) => {
          const key =
            getFieldKey(
              field,
              index
            );

          const savedField =
            data.fields[key] ||
            findLegacyFallback(
              data,
              field,
              index,
              fields
            );

          if (!savedField) {
            return;
          }

          writeField(
            field,
            savedField
          );

          notifyFieldChanged(
            field
          );
        }
      );

      migrateLegacyAttackFields(
        data
      );

      mergeLegacyCombinedTraitFields();

      document.dispatchEvent(
        new CustomEvent(
          'character:restored',
          {
            detail: {
              sourceVersion:
                data.version ??
                null,

              sourceEdition:
                getSavedEdition(
                  data
                ) ||
                null,

              savedAt:
                data.savedAt ??
                null
            }
          }
        )
      );
    } finally {
      isRestoring = false;
    }
  }


  /* ========================================================
     LOCAL STORAGE
     ======================================================== */

  function saveLocal({
    showMessage = true
  } = {}) {
    try {
      const state =
        captureState();

      localStorage.setItem(
        getStorageKey(),
        JSON.stringify(state)
      );

      if (showMessage) {
        setStatus(
          `${getEdition()} character saved in this browser at ${formatTime()}.`,
          'ok'
        );
      }

      return state;
    } catch (error) {
      console.error(
        'Character save failed:',
        error
      );

      setStatus(
        'Save failed. Browser storage may be unavailable.',
        'error'
      );

      return null;
    }
  }


  async function loadLocal() {
    const storageKey =
      getStorageKey();

    let raw =
      localStorage.getItem(
        storageKey
      );

    let usedLegacySave = false;

    if (!raw) {
      const legacyRaw =
        localStorage.getItem(
          LEGACY_STORAGE_KEY
        );

      if (legacyRaw) {
        const proceed =
          window.confirm(
            `No ${getEdition()} save was found, but an older unlabeled character save exists.\n\n` +
            `Load that older save into the ${getEdition()} builder?`
          );

        if (!proceed) {
          setStatus(
            `No ${getEdition()} character was loaded.`,
            'warn'
          );

          return false;
        }

        raw = legacyRaw;
        usedLegacySave = true;
      }
    }

    if (!raw) {
      setStatus(
        `No saved ${getEdition()} character was found in this browser.`,
        'warn'
      );

      return false;
    }

    try {
      const data =
        normalizeImportedData(
          JSON.parse(raw)
        );

      if (
        !confirmEditionImport(data)
      ) {
        setStatus(
          'Character load cancelled.',
          'warn'
        );

        return false;
      }

      await applyState(data);

      if (usedLegacySave) {
        saveLocal({
          showMessage: false
        });

        setStatus(
          `Older save loaded and copied into the ${getEdition()} save slot.`,
          'ok'
        );
      } else {
        setStatus(
          `${getEdition()} character loaded.`,
          'ok'
        );
      }

      return true;
    } catch (error) {
      console.error(
        'Character load failed:',
        error
      );

      setStatus(
        'The local character save could not be loaded.',
        'error'
      );

      return false;
    }
  }


  function queueAutosave() {
    if (isRestoring) {
      return;
    }

    window.clearTimeout(
      autosaveTimer
    );

    autosaveTimer =
      window.setTimeout(
        () => {
          saveLocal({
            showMessage: false
          });

          setStatus(
            `${getEdition()} autosaved at ${formatTime()}.`,
            'ok'
          );
        },
        AUTOSAVE_DELAY_MS
      );
  }


  /* ========================================================
     JSON EXPORT
     ======================================================== */

  function sanitizeFilename(
    value
  ) {
    return String(
      value ||
      'character'
    )
      .trim()
      .replace(/\s+/g, '-')
      .replace(
        /[^a-z0-9_-]/gi,
        ''
      )
      .replace(/-+/g, '-')
      .slice(0, 60) ||
      'character';
  }


  function findCharacterName() {
    const candidates = [
      document.getElementById(
        'character-name'
      ),

      document.querySelector(
        'input[placeholder="Hero Name"]'
      ),

      document.querySelector(
        '.name-container input[type="text"]'
      )
    ];

    const field =
      candidates.find(Boolean);

    return (
      field?.value?.trim() ||
      'character'
    );
  }


  function downloadTextFile(
    filename,
    contents,
    type = 'application/json'
  ) {
    const blob =
      new Blob(
        [contents],
        { type }
      );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;
    link.download = filename;

    document.body.appendChild(
      link
    );

    link.click();
    link.remove();

    window.setTimeout(
      () =>
        URL.revokeObjectURL(
          url
        ),
      1000
    );
  }


  function exportJson() {
    try {
      const state =
        captureState();

      const characterName =
        sanitizeFilename(
          findCharacterName()
        );

      const filename =
        `${characterName}-dnd5e-${getEdition()}.json`;

      downloadTextFile(
        filename,
        JSON.stringify(
          state,
          null,
          2
        )
      );

      setStatus(
        `Exported ${filename}.`,
        'ok'
      );
    } catch (error) {
      console.error(
        'JSON export failed:',
        error
      );

      setStatus(
        'JSON export failed.',
        'error'
      );
    }
  }


  /* ========================================================
     JSON IMPORT
     ======================================================== */

  async function importJsonFile(
    file
  ) {
    if (!file) {
      return;
    }

    const looksLikeJson =
      file.name
        .toLowerCase()
        .endsWith('.json') ||
      file.type ===
        'application/json' ||
      file.type === '';

    if (!looksLikeJson) {
      setStatus(
        'Please choose a JSON character backup.',
        'warn'
      );

      return;
    }

    try {
      const text =
        await file.text();

      const parsed =
        JSON.parse(text);

      const data =
        normalizeImportedData(
          parsed
        );

      validateSaveData(data);

      if (
        !confirmEditionImport(data)
      ) {
        setStatus(
          'JSON import cancelled.',
          'warn'
        );

        return;
      }

      await applyState(data);

      /*
       * Save the imported character into the current
       * edition's browser slot, not the source edition's slot.
       */
      saveLocal({
        showMessage: false
      });

      setStatus(
        `Imported ${file.name} into the ${getEdition()} builder.`,
        'ok'
      );
    } catch (error) {
      console.error(
        'JSON import failed:',
        error
      );

      setStatus(
        error?.message ||
        'That JSON backup could not be imported.',
        'error'
      );
    }
  }


  /* ========================================================
     EVENT WIRING
     ======================================================== */

  function bindButtons() {
    saveNowBtn?.addEventListener(
      'click',
      () => {
        saveLocal({
          showMessage: true
        });
      }
    );

    loadNowBtn?.addEventListener(
      'click',
      () => {
        loadLocal();
      }
    );

    exportJsonBtn?.addEventListener(
      'click',
      exportJson
    );

    importJsonBtn?.addEventListener(
      'click',
      () => {
        importJsonInput?.click();
      }
    );

    importJsonInput?.addEventListener(
      'change',
      async (event) => {
        const file =
          event.target.files?.[0] ||
          null;

        await importJsonFile(
          file
        );

        event.target.value = '';
      }
    );
  }


  function isSavableTarget(
    target
  ) {
    return (
      target instanceof Element &&
      target.matches(
        '#character-document input, ' +
        '#character-document select, ' +
        '#character-document textarea, ' +
        '#theme-select, ' +
        '#stat-method'
      )
    );
  }


  function bindAutosave() {
    document.addEventListener(
      'input',
      (event) => {
        if (
          isSavableTarget(
            event.target
          )
        ) {
          queueAutosave();
        }
      },
      true
    );

    document.addEventListener(
      'change',
      (event) => {
        if (
          isSavableTarget(
            event.target
          )
        ) {
          queueAutosave();
        }
      },
      true
    );

    window.addEventListener(
      'beforeunload',
      () => {
        if (isRestoring) {
          return;
        }

        try {
          localStorage.setItem(
            getStorageKey(),
            JSON.stringify(
              captureState()
            )
          );
        } catch (_) {
          /*
           * Never block page exit because
           * browser storage is unavailable.
           */
        }
      }
    );
  }


  /* ========================================================
     INITIALIZATION
     ======================================================== */

  function initializeStatus() {
    const raw =
      localStorage.getItem(
        getStorageKey()
      );

    if (!raw) {
      const legacyExists =
        Boolean(
          localStorage.getItem(
            LEGACY_STORAGE_KEY
          )
        );

      if (legacyExists) {
        setStatus(
          `No ${getEdition()} save yet. An older unlabeled save is available through Load Saved Character.`,
          'warn'
        );
      } else {
        setStatus(
          `No local ${getEdition()} save yet. Changes will autosave in this browser.`,
          'warn'
        );
      }

      return;
    }

    try {
      const data =
        normalizeImportedData(
          JSON.parse(raw)
        );

      const savedDate =
        data.savedAt
          ? new Date(
              data.savedAt
            )
          : null;

      if (
        savedDate &&
        !Number.isNaN(
          savedDate.getTime()
        )
      ) {
        setStatus(
          `${getEdition()} save available from ${savedDate.toLocaleDateString()} at ${formatTime(savedDate)}.`,
          'warn'
        );
      } else {
        setStatus(
          `A local ${getEdition()} character save is available.`,
          'warn'
        );
      }
    } catch (_) {
      setStatus(
        `The local ${getEdition()} save exists, but it may be damaged.`,
        'error'
      );
    }
  }


  function init() {
    saveNowBtn =
      document.getElementById(
        'save-now-btn'
      );

    loadNowBtn =
      document.getElementById(
        'load-now-btn'
      );

    exportJsonBtn =
      document.getElementById(
        'export-json-btn'
      );

    importJsonBtn =
      document.getElementById(
        'import-json-btn'
      );

    importJsonInput =
      document.getElementById(
        'import-json-file'
      );

    saveStatus =
      document.getElementById(
        'save-status'
      );

    const missing = [
      [
        'save-now-btn',
        saveNowBtn
      ],
      [
        'load-now-btn',
        loadNowBtn
      ],
      [
        'export-json-btn',
        exportJsonBtn
      ],
      [
        'import-json-btn',
        importJsonBtn
      ],
      [
        'import-json-file',
        importJsonInput
      ]
    ].filter(
      ([, element]) =>
        !element
    );

    if (missing.length) {
      console.warn(
        'Storage module initialized, but these controls were not found:',
        missing
          .map(([id]) => id)
          .join(', ')
      );
    }

    bindButtons();
    bindAutosave();
    initializeStatus();

    window.CharacterStorage =
      Object.freeze({
        save:
          () =>
            saveLocal({
              showMessage: true
            }),

        load:
          loadLocal,

        exportJson,

        importJsonFile,

        capture:
          captureState,

        apply:
          applyState,

        get storageKey() {
          return getStorageKey();
        },

        get edition() {
          return getEdition();
        }
      });
  }


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
