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

  function sanitizeFilenamePart(value, fallback) {
  const cleaned = String(value || '')
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ');

  return cleaned || fallback;
}

function buildPdfFilename() {
  const characterName =
    document.getElementById('character-name')?.value;

  const race =
    document.getElementById('char-race')?.value;

  const classRows =
    Array.from(
      document.querySelectorAll('.class-level-row')
    );

  const classes = [];
  let totalLevel = 0;

  classRows.forEach((row) => {
    const className =
      row.querySelector('.char-class-select')?.value;

    const level =
      parseInt(
        row.querySelector('.char-level-select')?.value,
        10
      ) || 0;

    if (
      className &&
      !classes.includes(className)
    ) {
      classes.push(className);
    }

    totalLevel += level;
  });

  const safeName =
    sanitizeFilenamePart(
      characterName,
      'Unnamed'
    );

  const safeRace =
    sanitizeFilenamePart(
      race,
      'Unknown Race'
    );

  const safeClass =
    sanitizeFilenamePart(
      classes.join('-'),
      'Unknown Class'
    );

  const safeLevel =
    totalLevel || 1;

  return `${safeName} ${safeRace} ${safeClass} Lvl ${safeLevel}.pdf`;
}
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

      filename: buildPdfFilename(),

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
