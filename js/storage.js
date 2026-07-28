/**
 * My RPG Source - Character Storage Module
 * ----------------------------------------
 * Responsibilities:
 *  - Autosave the current character in localStorage
 *  - Save / load on demand
 *  - Export a portable JSON backup
 *  - Import a JSON backup
 *  - Preserve multiclass rows
 *  - Restore the UI and trigger existing calculations after load
 *
 * This file intentionally does NOT calculate game rules.
 */

(() => {
  'use strict';

  /**********************************************************************
   * CONFIGURATION
   **********************************************************************/

  const DEFAULT_getStorageKey() =
  'myrpgsource.characterCreator.dnd5e.2024.v1';

function getStorageKey() {
  return (
    window.MyRPGConfig?.settings?.storageKey ||
    DEFAULT_getStorageKey()
  );
}
  const SAVE_FORMAT = 'myrpgsource-character';
  const SAVE_VERSION = 1;
  const AUTOSAVE_DELAY_MS = 500;

  // Fields outside #character-document that should also be remembered.
  const EXTRA_FIELD_SELECTORS = ['#theme-select', '#stat-method'];

  /**********************************************************************
   * MODULE STATE
   **********************************************************************/

  let autosaveTimer = null;
  let isRestoring = false;

  let saveNowBtn = null;
  let loadNowBtn = null;
  let exportJsonBtn = null;
  let importJsonBtn = null;
  let importJsonInput = null;
  let saveStatus = null;

  /**********************************************************************
   * STATUS DISPLAY
   **********************************************************************/

  function setStatus(message, kind = 'warn') {
    if (!saveStatus) return;

    saveStatus.textContent = message;
    saveStatus.dataset.kind = kind;
  }

  function formatTime(date = new Date()) {
    try {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return date.toLocaleTimeString();
    }
  }

  /**********************************************************************
   * FIELD DISCOVERY
   **********************************************************************/

  /**
   * Returns the ordinary fields that belong in a character save.
   *
   * Multiclass class/level selects are excluded here because they are
   * stored separately. Their number can change dynamically.
   */
  function getSavableFields() {
    const fields = Array.from(
      document.querySelectorAll(
        '#character-document input, ' +
        '#character-document select, ' +
        '#character-document textarea'
      )
    );

    EXTRA_FIELD_SELECTORS.forEach((selector) => {
      const field = document.querySelector(selector);
      if (field) fields.push(field);
    });

    return fields.filter((field) => {
      const type = String(field.type || '').toLowerCase();

      if (field.id === 'import-json-file') return false;
      if (field.closest('.class-level-row')) return false;
      if (['button', 'submit', 'reset', 'file'].includes(type)) return false;

      return true;
    });
  }

  /**
   * Builds a stable key for a field.
   *
   * Existing IDs are preferred. For older fields without an ID, the
   * fallback key uses the field's position among the normal saved fields.
   * This lets today's sheet save cleanly without forcing a giant HTML edit.
   */
  function getFieldKey(field, index) {
    if (field.id) return `id:${field.id}`;
    if (field.name) return `name:${field.name}:${index}`;
    return `field:${index}`;
  }

  function readField(field) {
    const type = String(field.type || '').toLowerCase();

    if (type === 'checkbox' || type === 'radio') {
      return {
        kind: type,
        checked: Boolean(field.checked),
        value: field.value
      };
    }

    return {
      kind: field.tagName.toLowerCase(),
      value: field.value
    };
  }

  function writeField(field, savedField) {
    if (!field || !savedField) return;

    const type = String(field.type || '').toLowerCase();

    if (type === 'checkbox' || type === 'radio') {
      field.checked = Boolean(savedField.checked);
    } else if (savedField.value !== undefined && savedField.value !== null) {
      field.value = String(savedField.value);
    }
  }

  /**********************************************************************
   * MULTICLASS STORAGE
   **********************************************************************/

  function captureClassRows() {
    return Array.from(document.querySelectorAll('.class-level-row')).map((row) => {
      const classSelect = row.querySelector('.char-class-select');
      const levelSelect = row.querySelector('.char-level-select');

      return {
        className: classSelect?.value || 'Fighter',
        level: levelSelect?.value || '1'
      };
    });
  }

  /**
   * Restores the number of multiclass rows by using the builder's own
   * Add/Remove buttons. This avoids duplicating the builder's row-creation
   * logic inside storage.js.
   */
  async function restoreClassRows(savedRows) {
    if (!Array.isArray(savedRows) || savedRows.length === 0) return;

    const container = document.getElementById('class-level-container');
    const addBtn = document.getElementById('multiclass-btn');
    const removeBtn = document.getElementById('remove-multiclass-btn');

    if (!container) return;

    const targetCount = Math.max(1, savedRows.length);

    // Reduce row count if necessary.
    let safety = 30;
    while (
      container.querySelectorAll('.class-level-row').length > targetCount &&
      removeBtn &&
      safety-- > 0
    ) {
      removeBtn.click();
    }

    // Increase row count if necessary.
    safety = 30;
    while (
      container.querySelectorAll('.class-level-row').length < targetCount &&
      addBtn &&
      safety-- > 0
    ) {
      const before = container.querySelectorAll('.class-level-row').length;
      addBtn.click();
      const after = container.querySelectorAll('.class-level-row').length;

      // Prevent an infinite loop if the builder refuses another row.
      if (after <= before) break;
    }

    const rows = Array.from(container.querySelectorAll('.class-level-row'));

    savedRows.forEach((savedRow, index) => {
      const row = rows[index];
      if (!row) return;

      const classSelect = row.querySelector('.char-class-select');
      const levelSelect = row.querySelector('.char-level-select');

      if (classSelect && savedRow.className != null) {
        const desiredClass = String(savedRow.className);
        const matchingOption = Array.from(classSelect.options).find(
          (option) => option.value === desiredClass
        );

        if (matchingOption) {
          classSelect.value = desiredClass;
          classSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      if (levelSelect && savedRow.level != null) {
        const desiredLevel = String(savedRow.level);
        const matchingOption = Array.from(levelSelect.options).find(
          (option) => option.value === desiredLevel
        );

        if (matchingOption) {
          levelSelect.value = desiredLevel;
          levelSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
  }

  /**********************************************************************
   * CAPTURE / RESTORE
   **********************************************************************/

  function captureState() {
    const fields = getSavableFields();
    const savedFields = {};

    fields.forEach((field, index) => {
      savedFields[getFieldKey(field, index)] = readField(field);
    });

    return {
      format: SAVE_FORMAT,
      version: SAVE_VERSION,
      savedAt: new Date().toISOString(),
      page: 'dnd5e-character-builder',
      fields: savedFields,
      classRows: captureClassRows()
    };
  }

  function validateSaveData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('The selected file does not contain valid character data.');
    }

    if (!data.fields || typeof data.fields !== 'object') {
      throw new Error('This character file is missing its saved fields.');
    }

    // Older or manually edited saves are allowed as long as the data shape
    // is usable. The format marker is therefore checked only when present.
    if (data.format && data.format !== SAVE_FORMAT) {
      throw new Error('This JSON file belongs to a different application.');
    }

    return true;
  }

  /**
   * Dispatch both input and change so the builder's existing calculation
   * code gets a chance to refresh derived values after a restore.
   */
  function notifyFieldChanged(field) {
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function applyState(data) {
    validateSaveData(data);

    isRestoring = true;

    try {
      // Multiclass rows must exist before ordinary fields are restored.
      await restoreClassRows(data.classRows || []);

      const fields = getSavableFields();

      fields.forEach((field, index) => {
        const key = getFieldKey(field, index);
        const savedField = data.fields[key];

        if (!savedField) return;

        writeField(field, savedField);
        notifyFieldChanged(field);
      });

      // A small final nudge for modules that listen globally rather than
      // directly to the individual fields.
      document.dispatchEvent(
        new CustomEvent('character:restored', {
          detail: {
            sourceVersion: data.version ?? null,
            savedAt: data.savedAt ?? null
          }
        })
      );
    } finally {
      isRestoring = false;
    }
  }

  /**********************************************************************
   * LOCAL STORAGE
   **********************************************************************/

  function saveLocal({ showMessage = true } = {}) {
    try {
      const state = captureState();
      localStorage.setItem(getStorageKey(), JSON.stringify(state));

      if (showMessage) {
        setStatus(`Saved in this browser at ${formatTime()}.`, 'ok');
      }

      return state;
    } catch (error) {
      console.error('Character save failed:', error);
      setStatus('Save failed. Browser storage may be unavailable.', 'error');
      return null;
    }
  }

  async function loadLocal() {
    const raw = localStorage.getItem(getStorageKey());

    if (!raw) {
      setStatus('No saved character was found in this browser.', 'warn');
      return false;
    }

    try {
      const data = JSON.parse(raw);
      await applyState(data);
      setStatus('Saved character loaded.', 'ok');
      return true;
    } catch (error) {
      console.error('Character load failed:', error);
      setStatus('The local character save could not be loaded.', 'error');
      return false;
    }
  }

  function queueAutosave() {
    if (isRestoring) return;

    window.clearTimeout(autosaveTimer);

    autosaveTimer = window.setTimeout(() => {
      saveLocal({ showMessage: false });
      setStatus(`Autosaved at ${formatTime()}.`, 'ok');
    }, AUTOSAVE_DELAY_MS);
  }

  /**********************************************************************
   * JSON EXPORT
   **********************************************************************/

  function sanitizeFilename(value) {
    return String(value || 'character')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9_-]/gi, '')
      .replace(/-+/g, '-')
      .slice(0, 60) || 'character';
  }

  function findCharacterName() {
    const candidates = [
      document.getElementById('character-name'),
      document.querySelector('input[placeholder="Hero Name"]'),
      document.querySelector('.name-container input[type="text"]')
    ];

    const field = candidates.find(Boolean);
    return field?.value?.trim() || 'character';
  }

  function downloadTextFile(filename, contents, type = 'application/json') {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportJson() {
    try {
      const state = captureState();
      const characterName = sanitizeFilename(findCharacterName());
      const filename = `${characterName}.json`;

      downloadTextFile(filename, JSON.stringify(state, null, 2));
      setStatus(`Exported ${filename}.`, 'ok');
    } catch (error) {
      console.error('JSON export failed:', error);
      setStatus('JSON export failed.', 'error');
    }
  }

  /**********************************************************************
   * JSON IMPORT
   **********************************************************************/

  async function importJsonFile(file) {
    if (!file) return;

    // Accept .json even if the OS/browser supplies an empty MIME type.
    const looksLikeJson =
      file.name.toLowerCase().endsWith('.json') ||
      file.type === 'application/json' ||
      file.type === '';

    if (!looksLikeJson) {
      setStatus('Please choose a JSON character backup.', 'warn');
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      await applyState(data);
      saveLocal({ showMessage: false });
      setStatus(`Imported ${file.name}.`, 'ok');
    } catch (error) {
      console.error('JSON import failed:', error);
      setStatus(error?.message || 'That JSON backup could not be imported.', 'error');
    }
  }

  /**********************************************************************
   * EVENT WIRING
   **********************************************************************/

  function bindButtons() {
    saveNowBtn?.addEventListener('click', () => {
      saveLocal({ showMessage: true });
    });

    loadNowBtn?.addEventListener('click', () => {
      loadLocal();
    });

    exportJsonBtn?.addEventListener('click', () => {
      exportJson();
    });

    importJsonBtn?.addEventListener('click', () => {
      importJsonInput?.click();
    });

    importJsonInput?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0] || null;

      await importJsonFile(file);

      // Reset the chooser so the same file can be selected again later.
      event.target.value = '';
    });
  }

  function bindAutosave() {
    document.addEventListener(
      'input',
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        if (
          target.matches(
            '#character-document input, ' +
            '#character-document select, ' +
            '#character-document textarea, ' +
            '#theme-select, #stat-method'
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
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        if (
          target.matches(
            '#character-document input, ' +
            '#character-document select, ' +
            '#character-document textarea, ' +
            '#theme-select, #stat-method'
          )
        ) {
          queueAutosave();
        }
      },
      true
    );

    // A final synchronous save attempt when the page is closed/refreshed.
    window.addEventListener('beforeunload', () => {
      if (isRestoring) return;

      try {
        localStorage.setItem(getStorageKey(), JSON.stringify(captureState()));
      } catch (_) {
        // Avoid blocking page exit because storage is unavailable.
      }
    });
  }

  /**********************************************************************
   * INITIALIZATION
   **********************************************************************/

  function initializeStatus() {
    const raw = localStorage.getItem(getStorageKey());

    if (!raw) {
      setStatus('No local save yet. Changes will autosave in this browser.', 'warn');
      return;
    }

    try {
      const data = JSON.parse(raw);
      const savedDate = data.savedAt ? new Date(data.savedAt) : null;

      if (savedDate && !Number.isNaN(savedDate.getTime())) {
        setStatus(
          `A local save is available from ${savedDate.toLocaleDateString()} at ${formatTime(savedDate)}.`,
          'warn'
        );
      } else {
        setStatus('A local character save is available.', 'warn');
      }
    } catch (_) {
      setStatus('A local save exists, but it may be damaged.', 'error');
    }
  }

  function init() {
    saveNowBtn = document.getElementById('save-now-btn');
    loadNowBtn = document.getElementById('load-now-btn');
    exportJsonBtn = document.getElementById('export-json-btn');
    importJsonBtn = document.getElementById('import-json-btn');
    importJsonInput = document.getElementById('import-json-file');
    saveStatus = document.getElementById('save-status');

    const missing = [
      ['save-now-btn', saveNowBtn],
      ['load-now-btn', loadNowBtn],
      ['export-json-btn', exportJsonBtn],
      ['import-json-btn', importJsonBtn],
      ['import-json-file', importJsonInput]
    ].filter(([, element]) => !element);

    if (missing.length) {
      console.warn(
        'Storage module initialized, but these controls were not found:',
        missing.map(([id]) => id).join(', ')
      );
    }

    bindButtons();
    bindAutosave();
    initializeStatus();

    // Expose a tiny public API for debugging and future modules.
    window.CharacterStorage = Object.freeze({
      save: () => saveLocal({ showMessage: true }),
      load: loadLocal,
      exportJson,
      capture: captureState,
      apply: applyState,
      storageKey: getStorageKey()
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
