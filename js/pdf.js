/**
 * My RPG Source - PDF Export Module
 * ---------------------------------
 * Responsibilities:
 *  - Export the complete character sheet as a PDF
 *  - Temporarily enable export-specific styling
 *  - Restore the normal sheet afterward
 */

(() => {
  'use strict';

  const EXPORT_BUTTON_ID = 'export-btn';
  const CHARACTER_DOCUMENT_ID = 'character-document';

  async function exportCharacterPdf() {
    const element =
      document.getElementById(
        CHARACTER_DOCUMENT_ID
      );

    if (!element) {
      console.error(
        `PDF export failed: #${CHARACTER_DOCUMENT_ID} was not found.`
      );

      return;
    }

    if (typeof window.html2pdf !== 'function') {
      console.error(
        'PDF export failed: html2pdf is not loaded.'
      );

      alert(
        'PDF export is currently unavailable.'
      );

      return;
    }

    window.scrollTo(0, 0);

    element.classList.add(
      'exporting'
    );

    const options = {
      margin: 0,

      filename:
        'character-sheet.pdf',

      image: {
        type: 'jpeg',
        quality: 0.98
      },

      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollY: 0
      },

      jsPDF: {
        unit: 'px',

        format: [
          816,
          1056
        ],

        orientation:
          'portrait'
      },

      pagebreak: {
        mode: 'css'
      }
    };

    try {
      await window
        .html2pdf()
        .from(element)
        .set(options)
        .save();

    } catch (error) {
      console.error(
        'PDF export failed:',
        error
      );

      alert(
        'Something went wrong while creating the PDF.'
      );

    } finally {
      element.classList.remove(
        'exporting'
      );
    }
  }

  function init() {
    const exportButton =
      document.getElementById(
        EXPORT_BUTTON_ID
      );

    if (!exportButton) {
      console.warn(
        `PDF module loaded, but #${EXPORT_BUTTON_ID} was not found.`
      );

      return;
    }

    exportButton.addEventListener(
      'click',
      exportCharacterPdf
    );
  }

  window.CharacterPDF =
    Object.freeze({
      export:
        exportCharacterPdf
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
