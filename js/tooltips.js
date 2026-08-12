/**
 * My RPG Source - Knowledge Cards
 * --------------------------------
 * Uses lightweight rule cards plus the full edition-specific SRD spell
 * collection so builder spell selections can open Knowledge Cards and
 * exact standalone Codex entries.
 */

(() => {
  'use strict';

  const HOVER_DELAY_MS = 500;

  const KNOWLEDGE_PREFERENCE_KEY =
    'myrpgsource:knowledge-cards-enabled';

  const state = {
    entries: new Map(),
    tooltip: null,
    activeElement: null,
    showTimer: null,
    hideTimer: null,
    positionFrame: null,
    observer: null,
    enabled: true
  };

  const edition =
    window.MyRPGConfig?.edition ||
    '2024';

  const gameSystem =
    window.MyRPGConfig?.settings?.systemId ||
    'dnd5e';

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


  function spellKey(value) {
    return `spell:${normalize(value)}`;
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

    element.id =
      'knowledge-tooltip';

    element.className =
      'knowledge-tooltip';

    element.setAttribute(
      'role',
      'dialog'
    );

    element.setAttribute(
      'aria-label',
      'Knowledge Card'
    );

    element.setAttribute(
      'aria-hidden',
      'true'
    );

    element.addEventListener(
      'mouseenter',
      cancelHide
    );

    element.addEventListener(
      'mouseleave',
      () => hideTooltip(180)
    );

    element.addEventListener(
      'focusin',
      cancelHide
    );

    element.addEventListener(
      'focusout',
      (event) => {
        cancelShow();

        if (
          element.contains(
            event.relatedTarget
          )
        ) {
          return;
        }

        hideTooltip(120);
      }
    );

    document.body.appendChild(
      element
    );

    return element;
  }

  function createCodexUrl(entry) {
    const entryType =
      entry?.entryType ||
      entry?.type ||
      'rule';

    const localId =
      entry?.localId ||
      entry?.id ||
      '';

    const entryId =
      entry?.globalId ||
      [
        gameSystem,
        entry?.edition || edition,
        entryType,
        localId
      ].join(':');

    const params =
      new URLSearchParams({
        game:
          gameSystem,
        edition:
          entry?.edition || edition,
        type:
          entryType,
        entry:
          entryId
      });

    return `codex.html?${params.toString()}`;
  }


  function buildSpellTooltipHtml(entry) {
    const codexUrl =
      createCodexUrl(entry);

    const level =
      Number(entry?.level) || 0;

    const levelLabel =
      level === 0
        ? 'Cantrip'
        : `${level}${level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th'} level`;

    const flags = [];

    if (entry?.ritual) {
      flags.push('Ritual');
    }

    if (
      String(entry?.duration || '')
        .toLowerCase()
        .startsWith('concentration')
    ) {
      flags.push('Concentration');
    }

    const description =
      entry?.description ||
      entry?.summary ||
      '';

    return `
      <div class="kt-title">${escapeHtml(entry?.name || entry?.title || 'Spell')}</div>

      <div class="kt-meta">
        <span class="kt-pill">${escapeHtml(`${levelLabel} ${entry?.school || ''}`.trim())}</span>
        <span class="kt-pill">${escapeHtml(entry?.edition || edition)}</span>
        ${flags.map((flag) => `<span class="kt-pill">${escapeHtml(flag)}</span>`).join('')}
      </div>

      <div class="kt-spell-grid">
        <div><span>Casting Time</span><strong>${escapeHtml(entry?.castingTime || '—')}</strong></div>
        <div><span>Range</span><strong>${escapeHtml(entry?.range || '—')}</strong></div>
        <div><span>Components</span><strong>${escapeHtml(entry?.components || '—')}</strong></div>
        <div><span>Duration</span><strong>${escapeHtml(entry?.duration || '—')}</strong></div>
      </div>

      <div class="kt-section">
        <div class="kt-section-title">Spell</div>
        <p>${escapeHtml(description)}</p>
      </div>

      <div class="kt-actions">
        <a
          class="kt-codex-link"
          href="${escapeHtml(codexUrl)}"
          target="_blank"
          rel="noopener"
          aria-label="Open ${escapeHtml(entry?.name || entry?.title || 'this spell')} in the full Codex in a new tab"
        >Codex</a>
      </div>
    `;
  }


  function buildTooltipHtml(entry) {
    if (
      entry?.entryType === 'spell' ||
      entry?.type === 'spell'
    ) {
      return buildSpellTooltipHtml(entry);
    }

    const affects =
      Array.isArray(entry.whatItAffects)
        ? entry.whatItAffects.slice(0, 4)
        : [];

    const editionLabel =
      Array.isArray(entry.editions)
        ? entry.editions.join(' / ')
        : entry.edition || edition;

    const codexUrl =
      createCodexUrl(entry);

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

      <div class="kt-actions">
        <a
          class="kt-codex-link"
          href="${escapeHtml(codexUrl)}"
          target="_blank"
          rel="noopener"
          aria-label="Open ${escapeHtml(entry.title || 'this topic')} in the full Codex in a new tab"
        >Codex</a>
      </div>
    `;
  }

  function readKnowledgePreference() {
    try {
      return (
        localStorage.getItem(
          KNOWLEDGE_PREFERENCE_KEY
        ) !== 'false'
      );
    } catch (_) {
      return true;
    }
  }


  function saveKnowledgePreference(
    enabled
  ) {
    try {
      localStorage.setItem(
        KNOWLEDGE_PREFERENCE_KEY,
        enabled
          ? 'true'
          : 'false'
      );
    } catch (_) {
      /*
       * The switch still works for the current page even if browser
       * storage is unavailable.
       */
    }
  }


  function cancelShow() {
    clearTimeout(
      state.showTimer
    );

    state.showTimer =
      null;
  }


  function updateKnowledgeToggleUi() {
    const toggle =
      document.getElementById(
        'knowledge-cards-toggle'
      );

    const text =
      document.getElementById(
        'knowledge-cards-toggle-text'
      );

    if (toggle) {
      toggle.checked =
        state.enabled;

      toggle.setAttribute(
        'aria-checked',
        state.enabled
          ? 'true'
          : 'false'
      );
    }

    if (text) {
      text.textContent =
        state.enabled
          ? 'Turn off Knowledge Cards'
          : 'Turn on Knowledge Cards';
    }
  }


  function updateKnowledgeTriggerAvailability() {
    document
      .querySelectorAll(
        '.tooltip-trigger'
      )
      .forEach(
        (element) => {
          if (
            element.dataset
              .knowledgeOwnsTabindex ===
            'true'
          ) {
            element.tabIndex =
              state.enabled
                ? 0
                : -1;
          }
        }
      );
  }


  function setKnowledgeCardsEnabled(
    enabled,
    {
      persist = true
    } = {}
  ) {
    state.enabled =
      Boolean(enabled);

    document.body
      ?.classList.toggle(
        'knowledge-cards-disabled',
        !state.enabled
      );

    if (!state.enabled) {
      cancelShow();
      closeTooltip();
    }

    updateKnowledgeToggleUi();
    updateKnowledgeTriggerAvailability();

    if (persist) {
      saveKnowledgePreference(
        state.enabled
      );
    }

    document.dispatchEvent(
      new CustomEvent(
        'knowledge:preference-changed',
        {
          detail: {
            enabled:
              state.enabled
          }
        }
      )
    );
  }


  function bindKnowledgeToggle() {
    const toggle =
      document.getElementById(
        'knowledge-cards-toggle'
      );

    if (!toggle) {
      return;
    }

    toggle.addEventListener(
      'change',
      () => {
        setKnowledgeCardsEnabled(
          toggle.checked
        );
      }
    );

    updateKnowledgeToggleUi();
  }


  function queueShow(
    entry,
    target,
    delay = HOVER_DELAY_MS
  ) {
    cancelShow();

    if (
      !state.enabled ||
      !entry ||
      !target
    ) {
      return;
    }

    state.showTimer =
      setTimeout(
        () => {
          state.showTimer =
            null;

          if (
            !state.enabled ||
            !target.isConnected ||
            !target.matches(':hover')
          ) {
            return;
          }

          showTooltip(
            entry,
            target
          );
        },
        delay
      );
  }


  function cancelHide() {
    clearTimeout(
      state.hideTimer
    );

    state.hideTimer =
      null;
  }

  function isTooltipVisible() {
    return Boolean(
      state.tooltip?.classList.contains(
        'visible'
      )
    );
  }

  function positionTooltip(target) {
    if (
      !state.tooltip ||
      !target ||
      !isTooltipVisible()
    ) {
      return;
    }

    const padding = 12;
    const gap = 10;

    const tooltipRect =
      state.tooltip.getBoundingClientRect();

    const targetRect =
      target.getBoundingClientRect();

    let x;
    let y;

    if (window.innerWidth <= 640) {
      x = 8;
      y = targetRect.bottom + gap;

      if (
        y + tooltipRect.height >
        window.innerHeight - padding
      ) {
        y =
          targetRect.top -
          tooltipRect.height -
          gap;
      }
    } else {
      x = targetRect.right + gap;
      y = targetRect.top;

      if (
        x + tooltipRect.width >
        window.innerWidth - padding
      ) {
        x =
          targetRect.left -
          tooltipRect.width -
          gap;
      }
    }

    const maximumX =
      Math.max(
        padding,
        window.innerWidth -
        tooltipRect.width -
        padding
      );

    const maximumY =
      Math.max(
        padding,
        window.innerHeight -
        tooltipRect.height -
        padding
      );

    state.tooltip.style.left =
      `${Math.min(Math.max(padding, x), maximumX)}px`;

    state.tooltip.style.top =
      `${Math.min(Math.max(padding, y), maximumY)}px`;
  }

  function schedulePosition() {
    if (
      !state.activeElement ||
      !isTooltipVisible() ||
      state.positionFrame !== null
    ) {
      return;
    }

    state.positionFrame =
      window.requestAnimationFrame(
        () => {
          state.positionFrame =
            null;

          positionTooltip(
            state.activeElement
          );
        }
      );
  }

  function showTooltip(entry, target) {
    if (
      !state.enabled ||
      !state.tooltip ||
      !entry ||
      !target
    ) {
      return;
    }

    cancelShow();
    cancelHide();

    if (
      state.activeElement &&
      state.activeElement !== target
    ) {
      state.activeElement.setAttribute(
        'aria-expanded',
        'false'
      );
    }

    state.activeElement =
      target;

    target.setAttribute(
      'aria-expanded',
      'true'
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

    positionTooltip(target);
  }

  function shouldRemainVisible() {
    const focusedElement =
      document.activeElement;

    return Boolean(
      state.tooltip?.matches(':hover') ||
      state.activeElement?.matches(':hover') ||
      state.tooltip?.contains(focusedElement) ||
      state.activeElement === focusedElement ||
      state.activeElement?.contains(focusedElement)
    );
  }

  function closeTooltip() {
    cancelShow();
    cancelHide();

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

    if (state.activeElement) {
      state.activeElement.setAttribute(
        'aria-expanded',
        'false'
      );
    }

    state.activeElement =
      null;
  }

  function hideTooltip(
    delay = 160
  ) {
    cancelShow();
    cancelHide();

    if (!state.enabled) {
      closeTooltip();
      return;
    }

    state.hideTimer =
      setTimeout(
        () => {
          if (
            shouldRemainVisible()
          ) {
            return;
          }

          closeTooltip();
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

    element.setAttribute(
      'aria-haspopup',
      'dialog'
    );

    element.setAttribute(
      'aria-controls',
      'knowledge-tooltip'
    );

    element.setAttribute(
      'aria-expanded',
      'false'
    );

    if (
      !isNaturallyFocusable(element)
    ) {
      element.dataset
        .knowledgeOwnsTabindex =
        'true';

      element.tabIndex =
        state.enabled
          ? 0
          : -1;
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
      () => {
        const entry =
          getEntry(
            element.dataset.knowledgeId
          );

        queueShow(
          entry,
          element
        );
      }
    );

    element.addEventListener(
      'mouseleave',
      () => {
        cancelShow();
        hideTooltip(180);
      }
    );

    element.addEventListener(
      'focusin',
      () => {
        cancelShow();

        if (!state.enabled) {
          return;
        }

        const entry =
          getEntry(
            element.dataset.knowledgeId
          );

        /*
         * Keyboard users receive the card immediately. The 500 ms
         * delay is only for pointer hover, where accidental flyovers
         * are common.
         */
        showTooltip(
          entry,
          element
        );
      }
    );

    element.addEventListener(
      'focusout',
      (event) => {
        if (
          state.tooltip?.contains(
            event.relatedTarget
          )
        ) {
          cancelHide();
          return;
        }

        hideTooltip(120);
      }
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

  function markDynamicSpells() {
    document
      .querySelectorAll(
        '[data-spell-knowledge]'
      )
      .forEach(
        (element) =>
          mark(
            element,
            element.dataset
              .spellKnowledge
          )
      );
  }

  function markClassFeatures() {
    document
      .querySelectorAll('[data-class-feature-knowledge]')
      .forEach((element) => mark(element, element.dataset.classFeatureKnowledge));
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
    markDynamicSpells();
    markClassFeatures();
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

    /*
     * Spell cards use the same licensed SRD collection that powers
     * the standalone Codex. This keeps card text and Codex text from
     * drifting apart as the spell engine evolves.
     */
    if (
      window.MyRPGCodexData
        ?.loadEntries
    ) {
      const [spellData, classFeatureData] =
        await Promise.all([
          window.MyRPGCodexData.loadEntries({
            gameSystem,
            editions: [edition],
            entryTypes: ['spell']
          }),
          window.MyRPGCodexData.loadEntries({
            gameSystem,
            editions: [edition],
            entryTypes: ['class-feature']
          })
        ]);

      (spellData?.entries || [])
        .forEach(
          (entry) => {
            state.entries.set(
              entry.localId ||
              entry.id,
              entry
            );

            state.entries.set(
              spellKey(
                entry.name ||
                entry.title
              ),
              entry
            );
          }
        );

      (classFeatureData?.entries || [])
        .forEach((entry) => {
          state.entries.set(entry.localId || entry.id, entry);
        });
    }
  }


  async function init() {
    state.tooltip =
      createTooltip();

    state.enabled =
      readKnowledgePreference();

    bindKnowledgeToggle();

    setKnowledgeCardsEnabled(
      state.enabled,
      {
        persist: false
      }
    );

    try {
      await loadData();
      markAll();
      updateKnowledgeTriggerAvailability();

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
        schedulePosition,
        {
          capture:
            true,
          passive:
            true
        }
      );

      window.addEventListener(
        'resize',
        schedulePosition,
        {
          passive:
            true
        }
      );

      document.addEventListener(
        'keydown',
        (event) => {
          if (
            event.key !== 'Escape' ||
            !isTooltipVisible()
          ) {
            return;
          }

          const trigger =
            state.activeElement;

          closeTooltip();

          if (
            trigger instanceof HTMLElement
          ) {
            trigger.focus();
          }
        }
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

      mark,

      createCodexUrl,

      spellKey,

      refresh:
        markAll,

      setEnabled:
        setKnowledgeCardsEnabled,

      get enabled() {
        return state.enabled;
      },

      get hoverDelay() {
        return HOVER_DELAY_MS;
      },

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
