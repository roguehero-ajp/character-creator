/**
 * My RPG Source - D&D Edition Configuration
 * ------------------------------------------
 *
 * Responsibilities:
 *  - Read the selected D&D edition from the page URL
 *  - Default safely to the 2024 rules
 *  - Provide edition-specific data-file paths
 *  - Provide edition-specific storage keys and terminology
 *  - Update basic page identity such as title and Race/Species labels
 *
 * Example URLs:
 *  builder.html?edition=2024
 *  builder.html?edition=2014
 */

(() => {
  'use strict';

  const DEFAULT_EDITION = '2024';

  const SUPPORTED_EDITIONS =
    Object.freeze([
      '2014',
      '2024'
    ]);

  const EDITION_SETTINGS =
    Object.freeze({
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
   * Build a path to any file inside
   * the selected edition's data folder.
   */
  function getDataPath(filename) {
    const cleanFilename =
      String(filename || '')
        .trim()
        .replace(/^\/+/, '');

    if (!cleanFilename) {
      throw new Error(
        'A data filename is required.'
      );
    }

    return (
      `${settings.dataBasePath}/` +
      cleanFilename
    );
  }


  /**
   * Edition-specific origin data.
   *
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
    const normalizedEdition =
      normalizeEdition(edition);

    return (
      'builder.html?edition=' +
      normalizedEdition
    );
  }


  /**
   * Change the existing Race field to say
   * Race in 2014 mode or Species in 2024 mode.
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
   * Apply basic edition identity to the page.
   *
   * This does not yet load race, species,
   * background, or class rules.
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
   * Other modules can read:
   *
   * MyRPGConfig.edition
   * MyRPGConfig.is2014
   * MyRPGConfig.is2024
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
