/**
 * My RPG Source - D&D Edition Configuration
 * ------------------------------------------
 *
 * Responsibilities:
 *  - Read the selected D&D edition from the page URL
 *  - Default safely to the 2024 rules
 *  - Expose edition-specific terminology, data paths, and storage keys
 *  - Apply lightweight edition identity to the document
 *
 * Example URLs:
 *  builder.html?edition=2024
 *  builder.html?edition=2014
 */

(() => {
  'use strict';

  const DEFAULT_EDITION = '2024';

  const SUPPORTED_EDITIONS = Object.freeze([
    '2014',
    '2024'
  ]);

  const EDITION_SETTINGS = Object.freeze({
    '2014': Object.freeze({
      edition: '2014',

      systemId: 'dnd5e',

      systemName:
        'D&D 5e 2014',

      sheetTitle:
        'D&D 5e 2014 Character Sheet',

      builderTitle:
        'D&D 5e 2014 Character Builder',

      originTerm:
        'Race',

      originTermLower:
        'race',

      originCollection:
        'races',

      originFilename:
        'races.json',

      dataBasePath:
        'data/dnd5e/2014',

      storageKey:
        'myrpgsource.characterCreator.dnd5e.2014.v1'
    }),

    '2024': Object.freeze({
      edition: '2024',

      systemId: 'dnd5e',

      systemName:
        'D&D 5e 2024',

      sheetTitle:
        'D&D 5e 2024 Character Sheet',

      builderTitle:
        'D&D 5e 2024 Character Builder',

      originTerm:
        'Species',

      originTermLower:
        'species',

      originCollection:
        'species',

      originFilename:
        'species.json',

      dataBasePath:
        'data/dnd5e/2024',

      storageKey:
        'myrpgsource.characterCreator.dnd5e.2024.v1'
    })
  });


  /**
   * Accept only supported edition values.
   * Anything unknown safely falls back to 2024.
   */
  function normalizeEdition(value) {
    const edition =
      String(value || '').trim();

    return SUPPORTED_EDITIONS.includes(
      edition
    )
      ? edition
      : DEFAULT_EDITION;
  }


  /**
   * Read ?edition=2014 or ?edition=2024
   * from the current page URL.
   */
  function readEditionFromUrl() {
    try {
      const params =
        new URLSearchParams(
          window.location.search
        );

      return normalizeEdition(
        params.get('edition')
      );

    } catch (error) {
      console.warn(
        'My RPG Source could not read the edition from the URL. Using 2024.',
        error
      );

      return DEFAULT_EDITION;
    }
  }


  const selectedEdition =
    readEditionFromUrl();

  const settings =
    EDITION_SETTINGS[
      selectedEdition
    ];


  /**
   * Clean a filename before joining it
   * to an edition-specific data path.
   */
  function cleanFilename(filename) {
    return String(filename || '')
      .trim()
      .replace(/^\/+/, '');
  }


  /**
   * Build a path to any JSON file inside
   * the selected edition's data folder.
   */
  function getDataPath(filename) {
    const cleaned =
      cleanFilename(filename);

    if (!cleaned) {
      throw new Error(
        'A data filename is required.'
      );
    }

    return (
      `${settings.dataBasePath}/` +
      cleaned
    );
  }


  /**
   * 2014:
   * data/dnd5e/2014/races.json
   *
   * 2024:
   * data/dnd5e/2024/species.json
   */
  function getOriginDataPath() {
    return getDataPath(
      settings.originFilename
    );
  }


  function getBackgroundsDataPath() {
    return getDataPath(
      'backgrounds.json'
    );
  }


  function getClassesDataPath() {
    return getDataPath(
      'classes.json'
    );
  }


  /**
   * Build a link to either edition.
   */
  function buildBuilderUrl(
    edition = selectedEdition
  ) {
    const normalized =
      normalizeEdition(edition);

    return (
      'builder.html?edition=' +
      normalized
    );
  }


  /**
   * Change the existing Race field to:
   *
   * 2014 → Race
   * 2024 → Species
   */
  function updateOriginLabels() {
    const originSelect =
      document.getElementById(
        'char-race'
      );

    if (!originSelect) {
      return;
    }

    const detailBox =
      originSelect.closest(
        '.detail-box'
      );

    const label =
      detailBox?.querySelector(
        'label'
      );

    if (label) {
      label.textContent =
        settings.originTerm;
    }

    const placeholderOption =
      originSelect.querySelector(
        'option[value=""]'
      );

    if (placeholderOption) {
      placeholderOption.textContent =
        `--Select ${settings.originTerm}--`;
    }

    originSelect.setAttribute(
      'aria-label',
      `Select ${settings.originTerm}`
    );
  }


  /**
   * Change the racial/species abilities section:
   *
   * 2014 → Race Abilities
   * 2024 → Species Abilities
   */
  function updateOriginAbilitiesHeading() {
    const textarea =
      document.getElementById(
        'racial-abilities-input'
      );

    if (!textarea) {
      return;
    }

    const container =
      textarea.closest(
        '.attacks-box'
      );

    const heading =
      container?.querySelector(
        '.fantasy-header'
      );

    if (heading) {
      heading.textContent =
        `${settings.originTerm} Abilities`;
    }

    textarea.placeholder =
      `${settings.originTerm} traits...`;
  }


  /**
   * Apply edition identity to the page.
   *
   * This does not yet load or apply
   * race/species/background rules.
   */
  function applyDocumentIdentity() {
    document.title =
      settings.sheetTitle;

    document.documentElement
      .dataset
      .gameSystem =
      settings.systemId;

    document.documentElement
      .dataset
      .edition =
      settings.edition;

    if (document.body) {
      document.body
        .dataset
        .gameSystem =
        settings.systemId;

      document.body
        .dataset
        .edition =
        settings.edition;
    }

    updateOriginLabels();
    updateOriginAbilitiesHeading();

    document.dispatchEvent(
      new CustomEvent(
        'myrpgsource:config-ready',
        {
          detail: {
            edition:
              settings.edition,

            settings
          }
        }
      )
    );
  }


  /**
   * Public configuration API.
   *
   * Other modules can use:
   *
   * MyRPGConfig.edition
   * MyRPGConfig.is2014
   * MyRPGConfig.is2024
   * MyRPGConfig.settings.storageKey
   * MyRPGConfig.getOriginDataPath()
   * MyRPGConfig.getBackgroundsDataPath()
   * MyRPGConfig.getClassesDataPath()
   */
  const publicConfig =
    Object.freeze({
      defaultEdition:
        DEFAULT_EDITION,

      supportedEditions:
        SUPPORTED_EDITIONS,

      edition:
        settings.edition,

      settings,

      is2014:
        settings.edition ===
        '2014',

      is2024:
        settings.edition ===
        '2024',

      normalizeEdition,

      getDataPath,

      getOriginDataPath,

      getBackgroundsDataPath,

      getClassesDataPath,

      buildBuilderUrl,

      applyDocumentIdentity
    });


  window.MyRPGConfig =
    publicConfig;


  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      applyDocumentIdentity,
      { once: true }
    );
  } else {
    applyDocumentIdentity();
  }

})();
