/**
 * My RPG Source - Blank Character Sheet Printing
 * ------------------------------------------------
 * Responsibilities:
 *  - Print a temporary blank version of the character sheet
 *  - Preserve the user's current character exactly as-is
 *  - Remove ALL field placeholder text while printing
 *  - Clear form values, selections, and checkboxes for the printout
 *  - Clear calculated ability modifier text such as +0
 *  - Restore everything immediately after the print dialog closes
 *
 * This module does NOT modify saved character data.
 */

(() => {
  'use strict';

  const PRINT_BUTTON_ID = 'print-blank-btn';
  const CHARACTER_DOCUMENT_ID = 'character-document';
  const PRINT_TITLE = 'Character Builder';

  let isPrintingBlank = false;
  let activeRestore = null;
  let autosaveSuspended = false;

  /**
   * Capture the exact current state of one form control.
   */
  function snapshotField(field) {
    const type = String(field.type || '').toLowerCase();

    return {
      element: field,

      value: field.value,

      checked:
        type === 'checkbox' || type === 'radio'
          ? Boolean(field.checked)
          : null,

      selectedIndex:
        field.tagName === 'SELECT'
          ? field.selectedIndex
          : null,

      placeholder:
        field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement
          ? field.getAttribute('placeholder')
          : null,

      hadPlaceholder:
        field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement
          ? field.hasAttribute('placeholder')
          : false
    };
  }

  /**
   * Make one control blank for printing.
   *
   * Values are changed directly without dispatching input/change events.
   * That prevents storage.js from autosaving the temporary blank state.
   */
  function blankField(field) {
    const type = String(field.type || '').toLowerCase();

    /*
     * Checkboxes and radio buttons
     */
    if (type === 'checkbox' || type === 'radio') {
      field.checked = false;
      return;
    }

    /*
     * Dropdowns
     *
     * selectedIndex = -1 means nothing is temporarily selected.
     */
    if (field.tagName === 'SELECT') {
      field.selectedIndex = -1;
      return;
    }

    /*
     * Text fields, number fields, textareas, etc.
     */
    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement
    ) {
      field.value = '';

      /*
       * Remove placeholder entirely.
       *
       * This is more reliable for printing than trying to hide placeholder
       * text using CSS.
       */
      field.removeAttribute('placeholder');
    }
  }

  /**
   * Restore one field exactly as it existed before printing.
   */
  function restoreField(snapshot) {
    const field = snapshot.element;

    if (!field || !field.isConnected) {
      return;
    }

    const type = String(field.type || '').toLowerCase();

    if (type === 'checkbox' || type === 'radio') {
      field.checked = snapshot.checked;
    } else if (field.tagName === 'SELECT') {
      field.selectedIndex = snapshot.selectedIndex;
    } else {
      field.value = snapshot.value;
    }

    /*
     * Restore placeholder text exactly as it originally existed.
     */
    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement
    ) {
      if (snapshot.hadPlaceholder) {
        field.setAttribute(
          'placeholder',
          snapshot.placeholder ?? ''
        );
      } else {
        field.removeAttribute('placeholder');
      }
    }
  }

  /**
   * Ability modifiers such as +0 are spans rather than form fields.
   *
   * Blank those separately so the printed sheet is genuinely blank.
   */
  function blankCalculatedText(characterDocument) {
    const elements = Array.from(
      characterDocument.querySelectorAll('.stat-mod')
    );

    const snapshots = elements.map((element) => ({
      element,
      text: element.textContent
    }));

    elements.forEach((element) => {
      element.textContent = '';
    });

    return snapshots;
  }

  /**
   * Restore the calculated modifier text after printing.
   */
  function restoreCalculatedText(snapshots) {
    snapshots.forEach(({ element, text }) => {
      if (element && element.isConnected) {
        element.textContent = text;
      }
    });
  }

  /**
   * Feat cards are rendered DOM content rather than ordinary form fields.
   *
   * The hidden #feat-state textarea is already cleared by blankField(), but
   * that alone does not remove cards that CharacterFeats has already rendered.
   * Detach those cards temporarily so the printed Feats area is truly blank.
   *
   * The original DOM nodes are preserved and reattached afterward, which keeps
   * their existing event listeners intact and does not modify actual feat state.
   */
  function blankStructuredFeatDisplay(characterDocument) {
    const list =
      characterDocument.querySelector(
        '#feat-list'
      );

    const count =
      characterDocument.querySelector(
        '#feat-count'
      );

    const empty =
      characterDocument.querySelector(
        '#feat-empty'
      );

    const originalChildren =
      list
        ? Array.from(
            list.childNodes
          )
        : [];

    const originalCountText =
      count
        ? count.textContent
        : null;

    const originalEmptyHidden =
      empty
        ? empty.hidden
        : null;

    /*
     * Leave the Feats box itself in place so a blank printed sheet still
     * provides usable space for handwritten feats.
     */
    list?.replaceChildren();

    if (count) {
      count.textContent = '';
    }

    if (empty) {
      empty.hidden = true;
    }

    let restored = false;

    return function restoreStructuredFeatDisplay() {
      if (restored) {
        return;
      }

      restored = true;

      if (list?.isConnected) {
        list.replaceChildren(
          ...originalChildren
        );
      }

      if (
        count?.isConnected &&
        originalCountText !== null
      ) {
        count.textContent =
          originalCountText;
      }

      if (
        empty?.isConnected &&
        originalEmptyHidden !== null
      ) {
        empty.hidden =
          originalEmptyHidden;
      }
    };
  }


  /**
   * 2024 dynamic magic pages are class-generated DOM rather than legacy
   * blank-sheet furniture. A truly blank character has no spellcasting class,
   * so Print Blank temporarily hides the generated magic pages and the
   * class-specific Spellcasting Stats summary.
   *
   * 2014 is unaffected because its dynamic host is empty.
   */
  function blankDynamicSpellcastingDisplay(characterDocument) {
    const host = characterDocument.querySelector('#spellcasting-pages');
    const hasDynamicPages = Boolean(host?.querySelector('.dynamic-spell-page'));

    if (!hasDynamicPages) {
      return () => {};
    }

    const summary = characterDocument.querySelector('.spellcasting-summary-box');
    const hostDisplay = host.style.display;
    const hostPriority = host.style.getPropertyPriority('display');
    const summaryDisplay = summary?.style.display ?? '';
    const summaryPriority = summary?.style.getPropertyPriority('display') ?? '';

    host.style.setProperty('display', 'none', 'important');
    summary?.style.setProperty('display', 'none', 'important');

    let restored = false;
    return function restoreDynamicSpellcastingDisplay() {
      if (restored) return;
      restored = true;

      if (host?.isConnected) {
        if (hostDisplay) host.style.setProperty('display', hostDisplay, hostPriority);
        else host.style.removeProperty('display');
      }

      if (summary?.isConnected) {
        if (summaryDisplay) summary.style.setProperty('display', summaryDisplay, summaryPriority);
        else summary.style.removeProperty('display');
      }
    };
  }


  /**
   * Prepare the character sheet for blank printing.
   *
   * Returns a function that restores everything afterward.
   */
  function prepareBlankSheet(characterDocument) {
    const fields = Array.from(
      characterDocument.querySelectorAll(
        'input, textarea, select'
      )
    );

    /*
     * Save all current values before touching anything.
     */
    const fieldSnapshots = fields.map(snapshotField);

    /*
     * Save modifier text such as STR +2, DEX +1, etc.
     */
    const calculatedSnapshots =
      blankCalculatedText(characterDocument);

    /*
     * Structured Feats are rendered cards, not ordinary form fields.
     * Temporarily remove the rendered cards for the blank printout.
     */
    const restoreFeatDisplay =
      blankStructuredFeatDisplay(
        characterDocument
      );

    /*
     * A blank 2024 character has no class-generated magic pages.
     */
    const restoreSpellcastingDisplay =
      blankDynamicSpellcastingDisplay(
        characterDocument
      );

    /*
     * Preserve the browser page title.
     *
     * Browsers may use this in their optional print headers.
     */
    const originalTitle = document.title;

    /*
     * Blank every field.
     */
    fields.forEach(blankField);

    /*
     * Use the desired print title.
     */
    document.title = PRINT_TITLE;

    /*
     * These classes can be used by print.css.
     */
    document.body.classList.add('printing-blank');
    characterDocument.classList.add('printing-blank');

    let restored = false;

    /*
     * Return a restoration function.
     */
    return function restoreBlankSheet() {
      if (restored) {
        return;
      }

      restored = true;

      /*
       * Restore every form field.
       */
      fieldSnapshots.forEach(restoreField);

      /*
       * Restore modifiers.
       */
      restoreCalculatedText(calculatedSnapshots);

      /*
       * Restore the exact feat cards/count that were visible before printing.
       */
      restoreFeatDisplay();

      /*
       * Restore class-generated spell pages after the blank printout.
       */
      restoreSpellcastingDisplay();

      /*
       * Restore the browser title.
       */
      document.title = originalTitle;

      /*
       * Remove temporary print classes.
       */
      document.body.classList.remove('printing-blank');
      characterDocument.classList.remove('printing-blank');
    };
  }

  /**
   * Give the browser a couple of rendering frames to visibly apply the blank
   * state before opening print preview.
   */
  function waitForPaint() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  }

  /**
   * Suspend character autosave while the sheet contains temporary
   * blank print values. Any dirty character state remains dirty and
   * will be queued again after the original fields are restored.
   */
  function suspendCharacterAutosave() {
    if (
      autosaveSuspended ||
      typeof window
        .CharacterStorage
        ?.suspendAutosave !==
        'function'
    ) {
      return;
    }

    window
      .CharacterStorage
      .suspendAutosave();

    autosaveSuspended =
      true;
  }


  function resumeCharacterAutosave() {
    if (!autosaveSuspended) {
      return;
    }

    autosaveSuspended =
      false;

    window
      .CharacterStorage
      ?.resumeAutosave
      ?.();
  }


  /**
   * Main blank-print workflow.
   */
  async function printBlankCharacterSheet() {
    /*
     * Prevent accidental double-click printing.
     */
    if (isPrintingBlank) {
      return;
    }

    const characterDocument =
      document.getElementById(
        CHARACTER_DOCUMENT_ID
      );

    if (!characterDocument) {
      console.error(
        `Printing failed: #${CHARACTER_DOCUMENT_ID} was not found.`
      );

      alert(
        'The character sheet could not be found for printing.'
      );

      return;
    }

    isPrintingBlank = true;

    /*
     * Cancel any already-queued autosave before temporary print
     * values are introduced.
     */
    suspendCharacterAutosave();

    /*
     * Temporarily blank the sheet.
     *
     * If preparation itself ever fails, release the autosave
     * suspension immediately before propagating the error into
     * the existing print error handling.
     */
    try {
      activeRestore =
        prepareBlankSheet(characterDocument);
    } catch (error) {
      isPrintingBlank =
        false;

      resumeCharacterAutosave();

      console.error(
        'Blank character sheet preparation failed:',
        error
      );

      alert(
        'Something went wrong while preparing the blank character sheet.'
      );

      return;
    }

    /**
     * Safe restoration function.
     *
     * It is deliberately written so calling it twice does no harm.
     */
    const restoreOnce = () => {
      if (typeof activeRestore === 'function') {
        activeRestore();
      }

      activeRestore = null;
      isPrintingBlank = false;

      /*
       * Resume autosave only after every original field has been
       * restored. If the character was dirty before printing,
       * storage.js will safely queue that real state now.
       */
      resumeCharacterAutosave();
    };

    /*
     * Most browsers fire afterprint when print preview closes.
     */
    window.addEventListener(
      'afterprint',
      restoreOnce,
      { once: true }
    );

    try {
      /*
       * Allow blank values and removed placeholders to render first.
       */
      await waitForPaint();

      /*
       * Open the browser's print dialog.
       */
      window.print();

    } catch (error) {

      console.error(
        'Blank character sheet printing failed:',
        error
      );

      alert(
        'Something went wrong while opening the print dialog.'
      );

    } finally {

      /*
       * Desktop browsers normally return from window.print() after the
       * print dialog closes.
       *
       * This also protects us if afterprint fails to fire.
       */
      restoreOnce();
    }
  }

  /**
   * Initialize module.
   */
  function init() {
    const printButton =
      document.getElementById(
        PRINT_BUTTON_ID
      );

    if (!printButton) {
      console.warn(
        `Printing module loaded, but #${PRINT_BUTTON_ID} was not found.`
      );

      return;
    }

    /*
     * Wire existing sidebar button.
     */
    printButton.addEventListener(
      'click',
      printBlankCharacterSheet
    );

    /*
     * Small public API for future use/debugging.
     */
    window.CharacterPrinting =
      Object.freeze({
        printBlank:
          printBlankCharacterSheet
      });
  }

  /*
   * Start safely regardless of when this script loads.
   */
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );
  } else {
    init();
  }

})();
