/**
 * My RPG Source - Application Coordinator
 * ----------------------------------------
 *
 * Responsibilities:
 *  - Coordinate application startup
 *  - Verify that core modules loaded correctly
 *  - Perform a final character-sheet refresh
 *  - Provide simple diagnostics for development
 *  - Expose one central My RPG Source application API
 *
 * This file intentionally contains NO game rules,
 * storage logic, printing logic, PDF logic, or UI controls.
 */

(() => {
  'use strict';

  /**********************************************************************
   * APPLICATION INFORMATION
   **********************************************************************/

  const APP_INFO = Object.freeze({
    name: 'My RPG Source',
    system: 'D&D 5e 2024',
    tool: 'Character Builder',
    version: '0.1.0'
  });


  /**********************************************************************
   * CORE ELEMENTS
   **********************************************************************/

  function getCharacterDocument() {
    return document.getElementById(
      'character-document'
    );
  }


  /**********************************************************************
   * MODULE STATUS
   **********************************************************************/

  /**
   * Returns the current status of modules that expose a public API.
   *
   * Knowledge Cards and Codex currently initialize independently,
   * so they are not required to expose globals here.
   */
  function getModuleStatus() {
    return {
      calculations:
        Boolean(
          window.CharacterCalculations
        ),

      ui:
        Boolean(
          window.CharacterUI
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


  /**
   * Report missing modules without crashing the application.
   */
  function checkModules() {
    const status =
      getModuleStatus();

    const missing =
      Object.entries(status)
        .filter(
          ([, loaded]) => !loaded
        )
        .map(
          ([name]) => name
        );

    if (missing.length > 0) {
      console.warn(
        'My RPG Source started, but some modules were not detected:',
        missing.join(', ')
      );

      return false;
    }

    return true;
  }


  /**********************************************************************
   * CHARACTER REFRESH
   **********************************************************************/

  /**
   * Ask the calculation engine to refresh all derived character values.
   *
   * Other modules remain responsible for their own behavior.
   */
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


  /**********************************************************************
   * DIAGNOSTICS
   **********************************************************************/

  /**
   * Handy developer diagnostic.
   *
   * Later, while debugging, we can type:
   *
   * MyRPGSource.diagnostics()
   *
   * into the browser console and immediately see whether
   * the important pieces of the application are alive.
   */
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

      ready:
        document.documentElement
          .dataset
          .myRpgSourceReady ===
        'true'
    };

    console.table(
      report.modules
    );

    console.log(
      'My RPG Source diagnostics:',
      report
    );

    return report;
  }


  /**********************************************************************
   * READY EVENT
   **********************************************************************/

  function announceReady() {
    document.dispatchEvent(
      new CustomEvent(
        'myrpgsource:ready',
        {
          detail: {
            ...APP_INFO,
            modules:
              getModuleStatus()
          }
        }
      )
    );
  }


  /**********************************************************************
   * INITIALIZATION
   **********************************************************************/

  function init() {
    const characterDocument =
      getCharacterDocument();

    if (!characterDocument) {
      console.error(
        'My RPG Source could not start because #character-document was not found.'
      );

      return;
    }

    /*
     * By the time app.js initializes, the individual modules have
     * already registered their own DOMContentLoaded handlers.
     *
     * We do not bind their buttons again here.
     */
    checkModules();

    /*
     * Give derived values one final synchronized refresh after
     * the UI and calculation modules have initialized.
     */
    refreshCharacter();

    /*
     * Mark the document as successfully initialized.
     *
     * This is useful for future debugging, testing, and CSS hooks.
     */
    document.documentElement
      .dataset
      .myRpgSourceReady =
      'true';

    announceReady();

    console.info(
      `${APP_INFO.name} ${APP_INFO.system} ${APP_INFO.tool} v${APP_INFO.version} ready.`
    );
  }


  /**********************************************************************
   * PUBLIC APPLICATION API
   **********************************************************************/

  window.MyRPGSource =
    Object.freeze({
      info:
        APP_INFO,

      refresh:
        refreshCharacter,

      diagnostics,

      modules:
        getModuleStatus
    });


  /**********************************************************************
   * START APPLICATION
   **********************************************************************/

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
