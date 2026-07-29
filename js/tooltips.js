/**
 * My RPG Source - Knowledge Cards
 * --------------------------------
 * Uses data/codex.json as the single source of truth for both
 * hover/focus Knowledge Cards and the full Codex.
 */

(() => {
  'use strict';

  const state = {
    entries: new Map(),
    tooltip: null,
    activeElement: null,
    hideTimer: null,
    observer: null
  };

  const edition =
    window.MyRPGConfig?.edition ||
    '2024';

  const abilityMap = {
    str: 'strength',
    dex: 'dexterity',
    con: 'constitution',
    int: 'intelligence',
    wis: 'wisdom',
    cha: 'charisma'
  };

  const skillMap = {
    acrobatics: 'acrobatics',
    'animal handling': 'animal-handling',
    arcana: 'arcana',
    athletics: 'athletics',
    deception: 'deception',
    history: 'history',
    insight: 'insight',
    intimidation: 'intimidation',
    investigation: 'investigation',
    medicine: 'medicine',
    nature: 'nature',
    perception: 'perception',
    performance: 'performance',
    persuasion: 'persuasion',
    religion: 'religion',
    'sleight of hand': 'sleight-of-hand',
    stealth: 'stealth',
    survival: 'survival'
  };

  const saveMap = {
    str: 'strength-saving-throw',
    dex: 'dexterity-saving-throw',
    con: 'constitution-saving-throw',
    int: 'intelligence-saving-throw',
    wis: 'wisdom-saving-throw',
    cha: 'charisma-saving-throw'
  };

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function isAvailable(entry) {
    return (
      !Array.isArray(entry?.editions) ||
      entry.editions.includes(edition)
    );
  }

  function createTooltip() {
    const element =
      document.createElement('div');

    element.className =
      'knowledge-tooltip';

    element.setAttribute(
      'aria-hidden',
      'true'
    );

    document.body.appendChild(
      element
    );

    return element;
  }

  function buildTooltipHtml(entry) {
    const affects =
      Array.isArray(entry.whatItAffects)
        ? entry.whatItAffects.slice(0, 4)
        : [];

    const editionLabel =
      Array.isArray(entry.editions)
        ? entry.editions.join(' / ')
        : '2014 / 2024';

    return `
      <div class="kt-title">${escapeHtml(entry.title || 'Knowledge')}</div>

      <div class="kt-meta">
        <span class="kt-pill">${escapeHtml(entry.categoryName || 'Rules')}</span>
        <span class="kt-pill">${escapeHtml(editionLabel)}</span>
      </div>

      <div class="kt-section">
        <div class="kt-section-title">What it means</div>
        <p>${escapeHtml(entry.summary || entry.whatItMeans || '')}</p>
      </div>

      ${
        affects.length
          ? `
            <div class="kt-section">
              <div class="kt-section-title">What it affects</div>
              <ul>
                ${affects.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
              </ul>
            </div>
          `
          : ''
      }

      ${
        entry.exampleInPlay
          ? `
            <div class="kt-section">
              <div class="kt-section-title">Example</div>
              <p>${escapeHtml(entry.exampleInPlay)}</p>
            </div>
          `
          : ''
      }

      <div class="kt-more">Open the Codex for the full entry.</div>
    `;
  }

  function positionTooltip(event, target) {
    if (!state.tooltip) {
      return;
    }

    const padding = 14;
    const rect =
      state.tooltip.getBoundingClientRect();

    const targetRect =
      target?.getBoundingClientRect?.();

    let x =
      Number.isFinite(event?.clientX) &&
      event.clientX > 0
        ? event.clientX + 18
        : (targetRect?.right || 20) + 10;

    let y =
      Number.isFinite(event?.clientY) &&
      event.clientY > 0
        ? event.clientY + 18
        : (targetRect?.top || 20);

    if (
      x + rect.width >
      window.innerWidth - padding
    ) {
      x =
        (
          Number.isFinite(event?.clientX) &&
          event.clientX > 0
            ? event.clientX
            : targetRect?.left || window.innerWidth
        ) -
        rect.width -
        18;
    }

    if (
      y + rect.height >
      window.innerHeight - padding
    ) {
      y =
        Math.max(
          padding,
          window.innerHeight -
          rect.height -
          padding
        );
    }

    state.tooltip.style.left =
      `${Math.max(padding, x)}px`;

    state.tooltip.style.top =
      `${Math.max(padding, y)}px`;
  }

  function showTooltip(entry, event, target) {
    if (
      !state.tooltip ||
      !entry
    ) {
      return;
    }

    clearTimeout(
      state.hideTimer
    );

    state.tooltip.innerHTML =
      buildTooltipHtml(entry);

    state.tooltip.classList.add(
      'visible'
    );

    state.tooltip.setAttribute(
      'aria-hidden',
      'false'
    );

    positionTooltip(
      event,
      target
    );
  }

  function hideTooltip(delay = 80) {
    clearTimeout(
      state.hideTimer
    );

    state.hideTimer =
      setTimeout(
        () => {
          if (!state.tooltip) {
            return;
          }

          state.tooltip.classList.remove(
            'visible'
          );

          state.tooltip.setAttribute(
            'aria-hidden',
            'true'
          );

          state.activeElement =
            null;
        },
        delay
      );
  }

  function getEntry(id) {
    return state.entries.get(id) || null;
  }

  function isNaturallyFocusable(element) {
    return element.matches(
      'a, button, input, select, textarea, [tabindex]'
    );
  }

  function mark(element, entryId) {
    if (
      !element ||
      !getEntry(entryId)
    ) {
      return;
    }

    element.dataset.knowledgeId =
      entryId;

    element.classList.add(
      'tooltip-trigger'
    );

    if (
      !isNaturallyFocusable(element)
    ) {
      element.tabIndex = 0;
    }

    bindElement(element);
  }

  function bindElement(element) {
    if (
      !element ||
      element.dataset.knowledgeBound ===
        'true'
    ) {
      return;
    }

    element.dataset.knowledgeBound =
      'true';

    element.addEventListener(
      'mouseenter',
      (event) => {
        const entry =
          getEntry(
            element.dataset.knowledgeId
          );

        state.activeElement =
          element;

        showTooltip(
          entry,
          event,
          element
        );
      }
    );

    element.addEventListener(
      'mousemove',
      (event) => {
        if (
          state.activeElement ===
          element
        ) {
          positionTooltip(
            event,
            element
          );
        }
      }
    );

    element.addEventListener(
      'mouseleave',
      () => hideTooltip(80)
    );

    element.addEventListener(
      'focusin',
      (event) => {
        const entry =
          getEntry(
            element.dataset.knowledgeId
          );

        state.activeElement =
          element;

        showTooltip(
          entry,
          event,
          element
        );
      }
    );

    element.addEventListener(
      'focusout',
      () => hideTooltip(0)
    );
  }

  function findContainerByText(selector, text) {
    const wanted =
      normalize(text);

    return Array.from(
      document.querySelectorAll(selector)
    ).find(
      (element) =>
        normalize(element.textContent)
          .includes(wanted)
    ) || null;
  }

  function markAbilityRows() {
    document
      .querySelectorAll(
        '.stats-grid .stat-row'
      )
      .forEach(
        (row) => {
          const input =
            row.querySelector(
              '.stat-val'
            );

          mark(
            row,
            abilityMap[input?.id]
          );
        }
      );
  }

  function markSkills() {
    document
      .querySelectorAll(
        '.skills-box-container .saves-list label'
      )
      .forEach(
        (label) => {
          const labelText =
            normalize(
              label.childNodes
                ? Array.from(label.childNodes)
                    .filter((node) => node.nodeType === Node.TEXT_NODE)
                    .map((node) => node.textContent)
                    .join(' ')
                : label.textContent
            );

          const key =
            Object.keys(skillMap).find(
              (name) =>
                labelText.includes(name)
            );

          mark(
            label,
            skillMap[key]
          );
        }
      );
  }

  function markSavingThrows() {
    document
      .querySelectorAll(
        '.save-check[data-stat]'
      )
      .forEach(
        (checkbox) => {
          mark(
            checkbox.closest('label'),
            saveMap[
              checkbox.dataset.stat
            ]
          );
        }
      );

    const box =
      findContainerByText(
        '.attacks-box',
        'Saving Throws'
      );

    const heading =
      box?.querySelector(
        '.fantasy-header'
      );

    mark(
      heading,
      'saving-throws'
    );
  }

  function markCharacterCreation() {
    mark(
      document
        .getElementById('stat-method')
        ?.closest('.control-group'),
      'ability-score-generation'
    );

    document
      .querySelectorAll(
        '.char-class-select, .char-level-select'
      )
      .forEach(
        (element) =>
          mark(
            element.closest(
              '.class-level-row'
            ) || element,
            'classes-and-levels'
          )
      );

    mark(
      document.getElementById(
        'multiclass-btn'
      ),
      'multiclassing'
    );

    mark(
      document.getElementById(
        'remove-multiclass-btn'
      ),
      'multiclassing'
    );

    mark(
      document
        .getElementById('char-race')
        ?.closest('.detail-box'),
      edition === '2014'
        ? 'race-2014'
        : 'species-2024'
    );

    mark(
      document.getElementById(
        'species-choice-panel'
      ),
      'species-choices-2024'
    );

    mark(
      document
        .getElementById('racial-abilities-input')
        ?.closest('.attacks-box'),
      edition === '2014'
        ? 'race-traits-2014'
        : 'species-2024'
    );

    mark(
      document
        .getElementById('char-background')
        ?.closest('.detail-box'),
      edition === '2014'
        ? 'background-2014'
        : 'background-2024'
    );

    mark(
      document.getElementById(
        'background-ability-controls'
      ),
      'background-ability-scores-2024'
    );

    mark(
      document
        .getElementById('alignment-select')
        ?.closest('.detail-box'),
      'alignment'
    );

    mark(
      findContainerByText(
        '.detail-box',
        'Experience Points'
      ),
      'experience-points'
    );

    mark(
      document.querySelector(
        '.abilities-box'
      ),
      'class-features'
    );

    document
      .querySelectorAll(
        '#page-2 .trait-section'
      )
      .forEach(
        (section) =>
          mark(
            section,
            'personality-ideals-bonds-flaws'
          )
      );
  }

  function markCombat() {
    const mappings = [
      ['Armor Class', 'armor-class'],
      ['Initiative', 'initiative'],
      ['Speed', 'speed'],
      ['Hit Point Maximum', 'hit-points'],
      ['Hit Dice', 'hit-dice'],
      ['Prof. Bonus', 'proficiency-bonus'],
      ['Passive Perc.', 'passive-perception']
    ];

    mappings.forEach(
      ([label, entryId]) => {
        mark(
          findContainerByText(
            '.combat-box',
            label
          ),
          entryId
        );
      }
    );

    mark(
      document.querySelector(
        '.death-saves-box'
      ),
      'death-saves'
    );

    const attacksBox =
      findContainerByText(
        '.attacks-box',
        'Attacks & Spellcasting'
      );

    mark(
      attacksBox?.querySelector(
        '.fantasy-header'
      ),
      'attack-rolls'
    );

    const attackHeaders =
      attacksBox?.querySelectorAll(
        '.header-row span'
      ) || [];

    const attackIds = [
      'weapons',
      'attack-bonus',
      'damage-rolls',
      'weapon-properties'
    ];

    attackHeaders.forEach(
      (header, index) =>
        mark(
          header,
          attackIds[index]
        )
    );
  }

  function markSpellcasting() {
    const summary =
      findContainerByText(
        '.attacks-box',
        'Spellcasting Stats'
      );

    mark(
      summary?.querySelector(
        '.fantasy-header'
      ),
      'spellcasting'
    );

    mark(
      document
        .getElementById('spell-ability')
        ?.closest('.detail-box'),
      'spellcasting-ability'
    );

    mark(
      document
        .getElementById('spell-dc')
        ?.closest('.detail-box'),
      'spell-save-dc'
    );

    mark(
      document
        .getElementById('spell-atk')
        ?.closest('.detail-box'),
      'spell-attack-bonus'
    );

    document
      .querySelectorAll(
        '.spell-tier'
      )
      .forEach(
        (tier) => {
          const heading =
            normalize(
              tier.querySelector(
                '.fantasy-header'
              )?.textContent
            );

          mark(
            tier.querySelector(
              '.spell-tier-header'
            ),
            heading.includes(
              'cantrip'
            )
              ? 'cantrips'
              : 'spell-slots'
          );
        }
      );

    mark(
      findContainerByText(
        '#page-4 .attacks-box',
        'Sorcery Points'
      ),
      'sorcery-points'
    );
  }

  function markEquipment() {
    mark(
      document.querySelector(
        '.money-column'
      ),
      'currency'
    );

    mark(
      document
        .getElementById(
          'equipment-inventory'
        ),
      'equipment'
    );
  }

  function markAll() {
    markAbilityRows();
    markSkills();
    markSavingThrows();
    markCharacterCreation();
    markCombat();
    markSpellcasting();
    markEquipment();
  }

  async function loadData() {
    const response =
      await fetch(
        'data/codex.json',
        {
          cache:
            'no-store'
        }
      );

    if (!response.ok) {
      throw new Error(
        `Failed to load data/codex.json: ${response.status}`
      );
    }

    const data =
      await response.json();

    const entries =
      Array.isArray(data?.entries)
        ? data.entries
        : [];

    entries
      .filter(isAvailable)
      .forEach(
        (entry) =>
          state.entries.set(
            entry.id,
            entry
          )
      );
  }

  async function init() {
    state.tooltip =
      createTooltip();

    try {
      await loadData();
      markAll();

      state.observer =
        new MutationObserver(
          () => markAll()
        );

      state.observer.observe(
        document.body,
        {
          childList:
            true,

          subtree:
            true
        }
      );

      document.addEventListener(
        'scroll',
        () => hideTooltip(0),
        true
      );

      window.addEventListener(
        'resize',
        () => hideTooltip(0)
      );

      document.dispatchEvent(
        new CustomEvent(
          'knowledge:ready',
          {
            detail: {
              edition,
              count:
                state.entries.size
            }
          }
        )
      );
    } catch (error) {
      console.error(
        'Knowledge Cards could not be loaded.',
        error
      );
    }
  }

  window.CharacterKnowledge =
    Object.freeze({
      getEntry,

      refresh:
        markAll,

      get count() {
        return state.entries.size;
      }
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
