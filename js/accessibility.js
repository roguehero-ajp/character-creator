/**
 * My RPG Source - Character Builder Accessibility
 * ------------------------------------------------
 *
 * Responsibilities:
 *  - Give visible character-builder form controls an accessible name
 *  - Preserve the existing DOM order, IDs, names, values, and save keys
 *  - Label dynamically-added controls such as multiclass rows
 *  - Provide a small audit API for development diagnostics
 *
 * Important:
 *  This module intentionally adds aria-label attributes only when a
 *  control does not already have a programmatic label. It does not
 *  rename fields or change storage behavior.
 */

(() => {
  'use strict';

  const CONTROL_SELECTOR =
    'input, select, textarea, button';

  let observer = null;


  /* ========================================================
     VISIBILITY
     ======================================================== */

  function isHiddenControl(control) {
    if (!control) {
      return true;
    }

    const type =
      String(control.type || '')
        .toLowerCase();

    if (type === 'hidden') {
      return true;
    }

    if (
      control.hidden ||
      control.closest('[hidden]')
    ) {
      return true;
    }

    /*
     * The JSON import file picker is intentionally hidden and
     * activated by the visible Import JSON button.
     */
    if (
      control.id ===
      'import-json-file'
    ) {
      return true;
    }

    return false;
  }


  /* ========================================================
     EXISTING LABEL DETECTION
     ======================================================== */

  function hasProgrammaticName(control) {
    if (!control) {
      return false;
    }

    if (
      String(
        control.getAttribute(
          'aria-label'
        ) || ''
      ).trim()
    ) {
      return true;
    }

    if (
      String(
        control.getAttribute(
          'aria-labelledby'
        ) || ''
      ).trim()
    ) {
      return true;
    }

    if (
      control.closest('label')
    ) {
      return true;
    }

    if (control.id) {
      const escapedId =
        window.CSS?.escape
          ? CSS.escape(control.id)
          : control.id.replace(
              /(["\\])/g,
              '\\$1'
            );

      if (
        document.querySelector(
          `label[for="${escapedId}"]`
        )
      ) {
        return true;
      }
    }

    if (
      control.tagName ===
        'BUTTON' &&
      String(
        control.textContent || ''
      ).trim()
    ) {
      return true;
    }

    return false;
  }


  /* ========================================================
     LABEL HELPERS
     ======================================================== */

  function cleanText(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }


  function textFromContainer(
    control,
    containerSelector,
    labelSelector
  ) {
    const container =
      control.closest(
        containerSelector
      );

    if (!container) {
      return '';
    }

    return cleanText(
      container.querySelector(
        labelSelector
      )?.textContent
    );
  }


  function getClassRowNumber(control) {
    const row =
      control.closest(
        '.class-level-row'
      );

    const container =
      row?.parentElement;

    if (!row || !container) {
      return 1;
    }

    const rows =
      Array.from(
        container.querySelectorAll(
          ':scope > .class-level-row'
        )
      );

    const index =
      rows.indexOf(row);

    return index >= 0
      ? index + 1
      : 1;
  }


  function labelFromKnownControl(control) {
    const id =
      String(control.id || '');

    if (
      control.matches(
        '[data-role="armor-class"]'
      )
    ) {
      return 'Armor Class';
    }

    if (
      control.matches(
        '.char-class-select'
      )
    ) {
      return (
        `Character class ${getClassRowNumber(control)}`
      );
    }

    if (
      control.matches(
        '.char-level-select'
      )
    ) {
      return (
        `Class level ${getClassRowNumber(control)}`
      );
    }

    const knownIds = {
      'hp-input':
        'Hit Points',

      'racial-abilities-input':
        'Race or Species Abilities',

      'attack-action-notes':
        'Additional Attack and Combat Notes',

      'equipment-inventory':
        'Equipment Inventory'
    };

    if (knownIds[id]) {
      return knownIds[id];
    }

    if (
      /^hit-dice-\d+$/.test(id)
    ) {
      return (
        'Hit Dice ' +
        id.split('-').pop()
      );
    }

    return '';
  }


  function labelFromStructure(control) {
    const structuralCandidates = [
      [
        '.detail-box',
        'label'
      ],
      [
        '.combat-box',
        'label'
      ],
      [
        '.money-field',
        'label'
      ],
      [
        '.trait-section',
        '.fantasy-header, h2, h3'
      ],
      [
        '.spell-tier',
        '.fantasy-header, h2, h3'
      ]
    ];

    for (
      const [
        containerSelector,
        labelSelector
      ] of structuralCandidates
    ) {
      const label =
        textFromContainer(
          control,
          containerSelector,
          labelSelector
        );

      if (label) {
        return label;
      }
    }

    /*
     * Some larger freeform text areas live in a generic attacks
     * box rather than a trait/spell section.
     */
    const attacksLabel =
      textFromContainer(
        control,
        '.attacks-box',
        '.fantasy-header, h2, h3'
      );

    if (attacksLabel) {
      return attacksLabel;
    }

    return '';
  }


  function inferAccessibleName(control) {
    return (
      labelFromKnownControl(control) ||
      labelFromStructure(control) ||
      cleanText(
        control.getAttribute(
          'placeholder'
        )
      ) ||
      cleanText(
        control.getAttribute(
          'title'
        )
      )
    );
  }


  /* ========================================================
     APPLY LABELS
     ======================================================== */

  function labelControl(control) {
    if (
      !control?.matches?.(
        CONTROL_SELECTOR
      ) ||
      isHiddenControl(control) ||
      hasProgrammaticName(control)
    ) {
      return false;
    }

    const label =
      inferAccessibleName(
        control
      );

    if (!label) {
      return false;
    }

    control.setAttribute(
      'aria-label',
      label
    );

    return true;
  }


  function labelWithin(root = document) {
    if (!root) {
      return 0;
    }

    let changed = 0;

    if (
      root.nodeType ===
        Node.ELEMENT_NODE &&
      root.matches?.(
        CONTROL_SELECTOR
      )
    ) {
      changed +=
        labelControl(root)
          ? 1
          : 0;
    }

    root
      .querySelectorAll?.(
        CONTROL_SELECTOR
      )
      .forEach(
        (control) => {
          changed +=
            labelControl(control)
              ? 1
              : 0;
        }
      );

    return changed;
  }


  /* ========================================================
     DYNAMIC CONTROLS
     ======================================================== */

  function startObserver() {
    /*
     * Observe the whole page because Level Up, Feat, Point Buy,
     * and Codex interfaces may add modal controls outside the
     * character-document element.
     */
    const target =
      document.body;

    if (
      !target ||
      observer
    ) {
      return;
    }

    observer =
      new MutationObserver(
        (mutations) => {
          mutations.forEach(
            (mutation) => {
              mutation.addedNodes
                .forEach(
                  (node) => {
                    if (
                      node.nodeType ===
                      Node.ELEMENT_NODE
                    ) {
                      labelWithin(node);
                    }
                  }
                );
            }
          );
        }
      );

    observer.observe(
      target,
      {
        childList: true,
        subtree: true
      }
    );
  }


  /* ========================================================
     DEVELOPMENT AUDIT
     ======================================================== */

  function audit() {
    const controls =
      Array.from(
        document.querySelectorAll(
          CONTROL_SELECTOR
        )
      )
        .filter(
          (control) =>
            !isHiddenControl(
              control
            )
        );

    const missing =
      controls.filter(
        (control) =>
          !hasProgrammaticName(
            control
          )
      );

    return {
      visibleControls:
        controls.length,

      namedControls:
        controls.length -
        missing.length,

      missingCount:
        missing.length,

      missing:
        missing.map(
          (control) => ({
            tag:
              control.tagName
                .toLowerCase(),

            id:
              control.id ||
              null,

            className:
              cleanText(
                control.className
              ) ||
              null,

            placeholder:
              cleanText(
                control.getAttribute(
                  'placeholder'
                )
              ) ||
              null
          })
        )
    };
  }


  /* ========================================================
     INITIALIZATION
     ======================================================== */

  function init() {
    labelWithin(document);
    startObserver();

    document.dispatchEvent(
      new CustomEvent(
        'character:accessibility-ready',
        {
          detail:
            audit()
        }
      )
    );
  }


  window.CharacterAccessibility =
    Object.freeze({
      apply:
        labelWithin,

      audit
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
