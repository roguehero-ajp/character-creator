/**
 * My RPG Source - Application Coordinator
 * ----------------------------------------
 *
 * Responsibilities:
 *  - Read application identity from config.js
 *  - Coordinate final application startup
 *  - Wait for edition-specific dynamic builder data
 *  - Verify that core modules loaded correctly
 *  - Perform a final character-sheet refresh
 *  - Provide diagnostics for development
 *  - Expose one central My RPG Source application API
 *
 * This file intentionally contains no game rules,
 * storage logic, printing logic, PDF logic, or UI controls.
 */

(() => {
  'use strict';

  const config =
    window.MyRPGConfig;


  /* ========================================================
     APPLICATION INFORMATION
     ======================================================== */

  function buildAppInfo() {
    const settings =
      config?.settings || {};

    const edition =
      config?.edition ||
      settings.edition ||
      '2024';

    return Object.freeze({
      name:
        'My RPG Source',

      systemId:
        settings.systemId ||
        'dnd5e',

      system:
        settings.systemName ||
        `D&D 5e ${edition}`,

      edition,

      tool:
        'Character Builder',

      title:
        settings.builderTitle ||
        `D&D 5e ${edition} Character Builder`,

      originTerm:
        settings.originTerm ||
        (
          edition === '2014'
            ? 'Race'
            : 'Species'
        ),

      dataBasePath:
        settings.dataBasePath ||
        `data/dnd5e/${edition}`,

      storageKey:
        settings.storageKey ||
        `myrpgsource.characterCreator.dnd5e.${edition}.v1`,

      version:
        '0.1.0'
    });
  }


  const APP_INFO =
    buildAppInfo();


  /* ========================================================
     CORE ELEMENTS
     ======================================================== */

  function getCharacterDocument() {
    return document.getElementById(
      'character-document'
    );
  }


  /* ========================================================
     MODULE STATUS
     ======================================================== */

  function getModuleStatus() {
    return {
      config:
        Boolean(
          window.MyRPGConfig
        ),

      calculations:
        Boolean(
          window.CharacterCalculations
        ),

      origins:
        Boolean(
          window.CharacterOrigins
        ),

      backgrounds:
        Boolean(
          window.CharacterBackgrounds
        ),

      classes:
        Boolean(
          window.CharacterClasses
        ),

      spellcasting:
        Boolean(
          window.CharacterSpellcasting
        ),

      classFeatures:
        Boolean(
          window.CharacterClassFeatures
        ),

      feats:
        Boolean(
          window.CharacterFeats
        ),

      combatEquipment:
        Boolean(
          window.CharacterCombatEquipment
        ),

      abilityScores:
        Boolean(
          window.CharacterAbilityScores
        ),

      ui:
        Boolean(
          window.CharacterUI
        ),

      accessibility:
        Boolean(
          window.CharacterAccessibility
        ),

      storage:
        Boolean(
          window.CharacterStorage
        ),

      printing:
        Boolean(
          window.CharacterPrinting
        ),

      pdf:
        Boolean(
          window.CharacterPDF
        )
    };
  }


  function getDataStatus() {
    const origins =
      window.CharacterOrigins;

    const backgrounds =
      window.CharacterBackgrounds;

    return {
      origins: {
        present:
          Boolean(origins),

        loaded:
          Boolean(
            origins?.loaded
          ),

        active:
          Boolean(
            origins?.active
          ),

        entries:
          Array.isArray(
            origins?.entries
          )
            ? origins.entries.length
            : 0,

        error:
          origins?.error
            ? String(
                origins.error.message ||
                origins.error
              )
            : null
      },

      backgrounds: {
        present:
          Boolean(backgrounds),

        loaded:
          Boolean(
            backgrounds?.loaded
          ),

        active:
          Boolean(
            backgrounds?.active
          ),

        entries:
          Array.isArray(
            backgrounds?.entries
          )
            ? backgrounds.entries.length
            : 0,

        error:
          backgrounds?.error
            ? String(
                backgrounds.error.message ||
                backgrounds.error
              )
            : null
      }
    };
  }


  function checkModules() {
    const status =
      getModuleStatus();

    const missing =
      Object.entries(status)
        .filter(
          ([, loaded]) =>
            !loaded
        )
        .map(
          ([name]) =>
            name
        );

    if (missing.length > 0) {
      console.warn(
        `${APP_INFO.name} ${APP_INFO.system} started, but some modules were not detected:`,
        missing.join(', ')
      );

      return false;
    }

    return true;
  }


  /* ========================================================
     ASYNCHRONOUS DATA STARTUP
     ======================================================== */

  async function waitForDataModules() {
    const pending = [
      window.CharacterOrigins
        ?.ready,

      window.CharacterBackgrounds
        ?.ready,

      window.CharacterClasses
        ?.ready,

      window.CharacterSpellcasting
        ?.ready,

      window.CharacterClassFeatures
        ?.ready,

      window.CharacterFeats
        ?.ready,

      window.CharacterCombatEquipment
        ?.ready
    ].filter(
      (value) =>
        value &&
        typeof value.then ===
          'function'
    );

    if (pending.length === 0) {
      return [];
    }

    const results =
      await Promise.allSettled(
        pending
      );

    const rejected =
      results.filter(
        (result) =>
          result.status ===
          'rejected'
      );

    if (rejected.length > 0) {
      console.warn(
        `${APP_INFO.name} finished starting, but one or more edition data modules reported an error.`,
        rejected.map(
          (result) =>
            result.reason
        )
      );
    }

    return results;
  }


  /* ========================================================
     CHARACTER REFRESH
     ======================================================== */

  function refreshCharacter() {
    if (
      window.CharacterCalculations
        ?.refreshAll
    ) {
      window.CharacterCalculations
        .refreshAll();

      return true;
    }

    console.warn(
      'Character refresh requested, but calculations.js is unavailable.'
    );

    return false;
  }


  /* ========================================================
     DOCUMENT IDENTITY
     ======================================================== */

  function applyApplicationIdentity() {
    document.documentElement
      .dataset
      .myRpgSourceEdition =
      APP_INFO.edition;

    document.documentElement
      .dataset
      .myRpgSourceSystem =
      APP_INFO.systemId;

    const characterDocument =
      getCharacterDocument();

    if (characterDocument) {
      characterDocument.setAttribute(
        'aria-label',
        `${APP_INFO.system} character sheet`
      );
    }
  }


  /* ========================================================
     DIAGNOSTICS
     ======================================================== */

  function diagnostics() {
    const report = {
      application: {
        ...APP_INFO
      },

      characterDocument:
        Boolean(
          getCharacterDocument()
        ),

      modules:
        getModuleStatus(),

      data:
        getDataStatus(),

      ready:
        document.documentElement
          .dataset
          .myRpgSourceReady ===
        'true'
    };

    console.group(
      `${APP_INFO.name} diagnostics`
    );

    console.table(
      report.modules
    );

    console.table({
      originsLoaded:
        report.data.origins.loaded,

      originsActive:
        report.data.origins.active,

      originEntries:
        report.data.origins.entries,

      backgroundsLoaded:
        report.data.backgrounds.loaded,

      backgroundsActive:
        report.data.backgrounds.active,

      backgroundEntries:
        report.data.backgrounds.entries
    });

    console.log(
      'Application:',
      report.application
    );

    console.log(
      'Full report:',
      report
    );

    console.groupEnd();

    return report;
  }


  /* ========================================================
     READY EVENT
     ======================================================== */

  function announceReady() {
    document.dispatchEvent(
      new CustomEvent(
        'myrpgsource:ready',
        {
          detail: {
            ...APP_INFO,

            modules:
              getModuleStatus(),

            data:
              getDataStatus()
          }
        }
      )
    );
  }


  /* ========================================================
     INITIALIZATION
     ======================================================== */

  async function init() {
    const characterDocument =
      getCharacterDocument();

    if (!characterDocument) {
      throw new Error(
        'My RPG Source could not start because #character-document was not found.'
      );
    }

    applyApplicationIdentity();

    /*
     * Several builder modules load JSON asynchronously.
     * Wait for them before marking the whole builder ready.
     */
    await waitForDataModules();

    checkModules();

    /*
     * Give derived values one final synchronized refresh
     * after the edition data modules have initialized.
     */
    refreshCharacter();

    document.documentElement
      .dataset
      .myRpgSourceReady =
      'true';

    announceReady();

    console.info(
      `${APP_INFO.name} ${APP_INFO.system} ${APP_INFO.tool} v${APP_INFO.version} ready.`
    );

    return {
      info:
        APP_INFO,

      modules:
        getModuleStatus(),

      data:
        getDataStatus()
    };
  }


  let readyPromise =
    Promise.resolve(null);


  function start() {
    readyPromise =
      init().catch(
        (error) => {
          document.documentElement
            .dataset
            .myRpgSourceReady =
            'false';

          console.error(
            `${APP_INFO.name} failed to initialize:`,
            error
          );

          document.dispatchEvent(
            new CustomEvent(
              'myrpgsource:error',
              {
                detail: {
                  ...APP_INFO,
                  error
                }
              }
            )
          );

          return {
            info:
              APP_INFO,

            modules:
              getModuleStatus(),

            data:
              getDataStatus(),

            error
          };
        }
      );

    return readyPromise;
  }


  /* ========================================================
     PUBLIC APPLICATION API
     ======================================================== */

  window.MyRPGSource =
    Object.freeze({
      info:
        APP_INFO,

      get ready() {
        return readyPromise;
      },

      refresh:
        refreshCharacter,

      diagnostics,

      modules:
        getModuleStatus,

      data:
        getDataStatus
    });


  /* ========================================================
     START APPLICATION
     ======================================================== */

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      start,
      { once: true }
    );
  } else {
    start();
  }

})();
