/**
 * My RPG Source - Dynamic Spellcasting
 * ------------------------------------
 * Build 1:
 *  - 2024 class-aware spell pages
 *  - Smart SRD 5.2.1 Wizard picker
 *  - Separate two-page source per spellcasting class
 *  - Manual bridge pages for the other 2024 casters
 *  - 2014 legacy spell pages remain untouched
 */

(() => {
  'use strict';

  const config = window.MyRPGConfig;
  const HOST_ID = 'spellcasting-pages';
  const STATE_FIELD_ID = 'spellcasting-state';
  const LEGACY_PAGE_SELECTOR = '[data-legacy-spell-page]';
  const WIZARD_ID = 'wizard';
  const STATE_VERSION = 1;

  const FULL_CASTERS = new Set([
    'bard', 'cleric', 'druid', 'sorcerer', 'wizard'
  ]);
  const HALF_CASTERS = new Set(['paladin', 'ranger']);
  const PACT_CASTERS = new Set(['warlock']);
  const CANTRIP_CASTERS = new Set([
    'bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard'
  ]);

  /* SRD 5.2.1 Wizard Features table. */
  const WIZARD_PROGRESSION = Object.freeze({
    1:  { cantrips: 3, prepared: 4,  slots: [2] },
    2:  { cantrips: 3, prepared: 5,  slots: [3] },
    3:  { cantrips: 3, prepared: 6,  slots: [4, 2] },
    4:  { cantrips: 4, prepared: 7,  slots: [4, 3] },
    5:  { cantrips: 4, prepared: 9,  slots: [4, 3, 2] },
    6:  { cantrips: 4, prepared: 10, slots: [4, 3, 3] },
    7:  { cantrips: 4, prepared: 11, slots: [4, 3, 3, 1] },
    8:  { cantrips: 4, prepared: 12, slots: [4, 3, 3, 2] },
    9:  { cantrips: 4, prepared: 14, slots: [4, 3, 3, 3, 1] },
    10: { cantrips: 5, prepared: 15, slots: [4, 3, 3, 3, 2] },
    11: { cantrips: 5, prepared: 16, slots: [4, 3, 3, 3, 2, 1] },
    12: { cantrips: 5, prepared: 16, slots: [4, 3, 3, 3, 2, 1] },
    13: { cantrips: 5, prepared: 17, slots: [4, 3, 3, 3, 2, 1, 1] },
    14: { cantrips: 5, prepared: 18, slots: [4, 3, 3, 3, 2, 1, 1] },
    15: { cantrips: 5, prepared: 19, slots: [4, 3, 3, 3, 2, 1, 1, 1] },
    16: { cantrips: 5, prepared: 21, slots: [4, 3, 3, 3, 2, 1, 1, 1] },
    17: { cantrips: 5, prepared: 22, slots: [4, 3, 3, 3, 2, 1, 1, 1, 1] },
    18: { cantrips: 5, prepared: 23, slots: [4, 3, 3, 3, 3, 1, 1, 1, 1] },
    19: { cantrips: 5, prepared: 24, slots: [4, 3, 3, 3, 3, 2, 1, 1, 1] },
    20: { cantrips: 5, prepared: 25, slots: [4, 3, 3, 3, 3, 2, 2, 1, 1] }
  });

  const state = {
    loaded: false,
    active: false,
    spells: [],
    wizardSpells: [],
    spellByName: new Map(),
    structured: {
      version: STATE_VERSION,
      edition: config?.edition || '2024',
      sources: {}
    },
    error: null
  };

  let readyPromise = Promise.resolve(state);
  let writingStateField = false;

  const text = (value) => String(value ?? '').trim();
  const clampLevel = (value) => Math.min(20, Math.max(1, parseInt(value, 10) || 1));
  const formatSigned = (value) => Number(value) >= 0 ? `+${Number(value) || 0}` : String(Number(value) || 0);
  const getHost = () => document.getElementById(HOST_ID);
  const getStateField = () => document.getElementById(STATE_FIELD_ID);
  const getLegacyPages = () => Array.from(document.querySelectorAll(LEGACY_PAGE_SELECTOR));

  function classId(value) {
    return text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function ordinal(level) {
    if (level === 1) return '1st';
    if (level === 2) return '2nd';
    if (level === 3) return '3rd';
    return `${level}th`;
  }

  function abilityLabel(ability) {
    return ({ int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' })[ability] || text(ability).toUpperCase() || '—';
  }

  function abilityModifier(ability) {
    return parseInt(document.getElementById(`${ability}-mod`)?.textContent, 10) || 0;
  }

  function proficiencyBonus() {
    return parseInt(document.getElementById('prof-bonus')?.value, 10) || 2;
  }

  function spellStats(ability) {
    const modifier = abilityModifier(ability);
    const proficiency = proficiencyBonus();
    return {
      modifier,
      saveDc: 8 + proficiency + modifier,
      attack: proficiency + modifier
    };
  }

  function make(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  /* ========================================================
     STRUCTURED STATE
     ======================================================== */

  function defaultSourceState(id) {
    if (id === WIZARD_ID) {
      return { cantrips: [], spellbook: [], prepared: [], notes: '' };
    }
    return { manual: { levels: {}, notes: '' } };
  }

  function ensureSourceState(id) {
    if (!state.structured.sources[id]) {
      state.structured.sources[id] = defaultSourceState(id);
    }
    return state.structured.sources[id];
  }

  function uniqueStrings(values) {
    const seen = new Set();
    return (Array.isArray(values) ? values : [])
      .map(text)
      .filter(Boolean)
      .filter((value) => {
        const key = value.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function sanitizeWizard(source) {
    const cantripNames = new Set(
      state.wizardSpells.filter((spell) => spell.level === 0).map((spell) => spell.name.toLowerCase())
    );
    const leveledNames = new Set(
      state.wizardSpells.filter((spell) => spell.level > 0).map((spell) => spell.name.toLowerCase())
    );

    source.cantrips = uniqueStrings(source.cantrips).filter((name) => cantripNames.has(name.toLowerCase()));
    source.spellbook = uniqueStrings(source.spellbook).filter((name) => leveledNames.has(name.toLowerCase()));

    const book = new Set(source.spellbook.map((name) => name.toLowerCase()));
    source.prepared = uniqueStrings(source.prepared).filter((name) => book.has(name.toLowerCase()));
    source.notes = text(source.notes);
  }

  function sanitizeState() {
    if (!state.structured || typeof state.structured !== 'object' || Array.isArray(state.structured)) {
      state.structured = { version: STATE_VERSION, edition: config?.edition || '2024', sources: {} };
    }
    if (!state.structured.sources || typeof state.structured.sources !== 'object' || Array.isArray(state.structured.sources)) {
      state.structured.sources = {};
    }
    state.structured.version = STATE_VERSION;
    state.structured.edition = config?.edition || '2024';
    if (state.structured.sources[WIZARD_ID]) sanitizeWizard(state.structured.sources[WIZARD_ID]);
  }

  function hydrateStateField() {
    const field = getStateField();
    const raw = text(field?.value);
    if (!raw) {
      state.structured = { version: STATE_VERSION, edition: config?.edition || '2024', sources: {} };
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) state.structured = parsed;
    } catch (error) {
      console.warn('Spellcasting state could not be parsed. Starting empty.', error);
      state.structured = { version: STATE_VERSION, edition: config?.edition || '2024', sources: {} };
    }
    sanitizeState();
  }

  function syncStateField({ notify = true } = {}) {
    const field = getStateField();
    if (!field) return;
    sanitizeState();
    const next = JSON.stringify(state.structured);
    if (field.value === next) return;
    writingStateField = true;
    field.value = next;
    writingStateField = false;
    if (notify) field.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* ========================================================
     ACTIVE SPELLCASTING SOURCES / SLOTS
     ======================================================== */

  function getActiveSources() {
    return Array.from(document.querySelectorAll('.class-level-row'))
      .map((row, rowIndex) => {
        const className = text(row.querySelector('.char-class-select')?.value);
        const level = clampLevel(row.querySelector('.char-level-select')?.value);
        const entry = window.CharacterClasses?.findEntry?.(className) || null;
        if (!entry?.spellcastingAbility) return null;
        return {
          rowIndex,
          id: entry.id || classId(className),
          name: entry.name || className,
          level,
          ability: entry.spellcastingAbility,
          entry
        };
      })
      .filter(Boolean);
  }

  function spellcastingSources(sources) {
    return sources.filter((source) => !PACT_CASTERS.has(source.id));
  }

  function effectiveCasterLevel(sources) {
    return Math.min(20, spellcastingSources(sources).reduce((total, source) => {
      if (FULL_CASTERS.has(source.id)) return total + source.level;
      if (HALF_CASTERS.has(source.id)) return total + Math.ceil(source.level / 2);
      return total;
    }, 0));
  }

  function sharedSpellSlots(sources) {
    const level = effectiveCasterLevel(sources);
    return level > 0 ? WIZARD_PROGRESSION[level]?.slots || [] : [];
  }

  function slotSummary(sources) {
    const slots = sharedSpellSlots(sources);
    if (!slots.length) return 'No shared Spellcasting slots';
    return slots.map((count, index) => `L${index + 1}: ${count}`).join('  •  ');
  }

  function genericMaxSpellLevel(source) {
    if (FULL_CASTERS.has(source.id)) return Math.min(9, Math.ceil(source.level / 2));
    if (HALF_CASTERS.has(source.id)) return Math.min(5, Math.ceil(source.level / 4));
    if (PACT_CASTERS.has(source.id)) return Math.min(5, Math.ceil(source.level / 2));
    return 1;
  }

  function minimumClassLevelForSpell(sourceId, spellLevel) {
    if (spellLevel <= 0) return 1;
    if (HALF_CASTERS.has(sourceId)) return (4 * (spellLevel - 1)) + 1;
    return (2 * spellLevel) - 1;
  }

  /* ========================================================
     PAGE 1 SUMMARY / LEGACY VISIBILITY
     ======================================================== */

  function setLegacyPageVisibility(visible) {
    getLegacyPages().forEach((page) => { page.hidden = !visible; });
  }

  function updatePrimarySummary(sources) {
    const box = document.querySelector('.spellcasting-summary-box');
    if (!box) return;

    const heading = box.querySelector('.fantasy-header');
    const ability = document.getElementById('spell-ability');
    const dc = document.getElementById('spell-dc');
    const attack = document.getElementById('spell-atk');

    if (config?.is2024 && sources.length === 0) {
      box.hidden = true;
      if (ability) ability.disabled = false;
      return;
    }

    box.hidden = false;
    if (!config?.is2024 || sources.length === 0) {
      if (ability) ability.disabled = false;
      return;
    }

    const primary = sources[0];
    const stats = spellStats(primary.ability);
    if (heading) heading.textContent = sources.length > 1
      ? `Primary Spellcasting Stats — ${primary.name}`
      : `${primary.name} Spellcasting Stats`;
    if (ability) {
      ability.value = primary.ability;
      ability.disabled = true;
    }
    if (dc) dc.value = String(stats.saveDc);
    if (attack) attack.value = formatSigned(stats.attack);
  }

  /* ========================================================
     PAGE BUILDERS
     ======================================================== */

  function statCard(label, value) {
    const card = make('div', 'spell-stat-card');
    card.append(make('span', 'spell-stat-label', label), make('span', 'spell-stat-value', value));
    return card;
  }

  function createPage(source, pageNumber, subtitle) {
    const page = make('section', 'sheet-page dynamic-spell-page');
    page.id = `spell-page-${source.id}-${pageNumber}`;
    page.dataset.spellSource = source.id;
    page.dataset.spellPage = String(pageNumber);

    const heading = make('h2', 'fantasy-header spell-source-heading', `${source.name} Spellcasting`);
    const sub = make('div', 'spell-source-subtitle', `${subtitle} • Magic Page ${pageNumber} of 2`);
    const stats = spellStats(source.ability);
    const row = make('div', 'spell-source-stats');
    row.append(
      statCard('Class Level', String(source.level)),
      statCard('Ability', abilityLabel(source.ability)),
      statCard('Ability Mod', formatSigned(stats.modifier)),
      statCard('Save DC', String(stats.saveDc)),
      statCard('Spell Attack', formatSigned(stats.attack))
    );
    page.append(heading, sub, row);
    return page;
  }

  /* ========================================================
     SMART WIZARD
     ======================================================== */

  const wizardProgression = (level) => WIZARD_PROGRESSION[clampLevel(level)] || WIZARD_PROGRESSION[1];
  const wizardBookTarget = (level) => 6 + ((Math.max(1, level) - 1) * 2);
  const wizardMaxSpellLevel = (level) => wizardProgression(level).slots.length;

  function wizardLevelCap(wizardLevel, spellLevel) {
    if (spellLevel === 1) return wizardBookTarget(wizardLevel);
    const unlockLevel = (2 * spellLevel) - 1;
    if (wizardLevel < unlockLevel) return 0;
    return 2 * (wizardLevel - unlockLevel + 1);
  }

  function wizardSpellsAtLevel(level) {
    return state.wizardSpells.filter((spell) => spell.level === level);
  }

  function spellOptionLabel(spell) {
    const flags = [];
    if (spell.concentration) flags.push('C');
    if (spell.ritual) flags.push('R');
    if (spell.material) flags.push('M');
    return `${spell.name} — ${spell.school}${flags.length ? ` [${flags.join(', ')}]` : ''}`;
  }

  function spellSelect({ spells, value = '', placeholder, action, sourceId, spellLevel, index, selectedNames }) {
    const select = make('select', 'fantasy-input smart-spell-select');
    select.dataset.spellAction = action;
    select.dataset.spellSource = sourceId;
    select.dataset.spellLevel = String(spellLevel);
    if (index !== undefined) select.dataset.spellIndex = String(index);

    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = placeholder;
    select.appendChild(empty);

    spells.forEach((spell) => {
      const option = document.createElement('option');
      option.value = spell.name;
      option.textContent = spellOptionLabel(spell);
      if (selectedNames.has(spell.name.toLowerCase()) && spell.name !== value) option.disabled = true;
      select.appendChild(option);
    });
    select.value = value;
    return select;
  }

  function removeButton(sourceId, action, index, label) {
    const button = make('button', 'smart-spell-remove', '×');
    button.type = 'button';
    button.dataset.spellAction = action;
    button.dataset.spellSource = sourceId;
    button.dataset.spellIndex = String(index);
    button.setAttribute('aria-label', label);
    return button;
  }

  function renderWizardCantrips(source, sourceState, progression) {
    const tier = make('div', 'smart-spell-tier');
    const header = make('div', 'smart-spell-tier-header');
    header.append(
      make('h3', 'smart-spell-tier-title', 'Cantrips'),
      make('span', 'smart-spell-tier-meta', `${sourceState.cantrips.length} / ${progression.cantrips} known`)
    );
    tier.appendChild(header);

    const choices = wizardSpellsAtLevel(0);
    const selectedNames = new Set(sourceState.cantrips.map((name) => name.toLowerCase()));
    sourceState.cantrips.forEach((name, index) => {
      const row = make('div', 'smart-spell-row cantrip-row');
      row.append(
        spellSelect({ spells: choices, value: name, placeholder: 'Choose Wizard cantrip…', action: 'replace-cantrip', sourceId: source.id, spellLevel: 0, index, selectedNames }),
        removeButton(source.id, 'remove-cantrip', index, `Remove ${name}`)
      );
      tier.appendChild(row);
    });

    if (sourceState.cantrips.length < progression.cantrips) {
      const add = make('div', 'smart-spell-add-row');
      add.appendChild(spellSelect({ spells: choices, placeholder: 'Choose another Wizard cantrip…', action: 'add-cantrip', sourceId: source.id, spellLevel: 0, selectedNames }));
      tier.appendChild(add);
    } else {
      tier.appendChild(make('div', 'smart-spell-full', 'Cantrip choices full'));
    }

    if (sourceState.cantrips.length > progression.cantrips) {
      tier.appendChild(make('div', 'smart-spell-warning', `Wizard ${source.level} normally knows ${progression.cantrips} cantrips. Nothing was deleted automatically.`));
    }
    return tier;
  }

  function renderWizardTier(source, sourceState, progression, spellLevel) {
    const unlocked = spellLevel <= wizardMaxSpellLevel(source.level);
    const selected = sourceState.spellbook
      .map((name, index) => ({ name, index, spell: state.spellByName.get(name.toLowerCase()) }))
      .filter((entry) => entry.spell?.level === spellLevel);

    const tier = make('div', `smart-spell-tier${unlocked ? '' : ' is-locked'}${!unlocked && selected.length ? ' has-stored-spells' : ''}`);
    const header = make('div', 'smart-spell-tier-header');
    const perLevelCap = wizardLevelCap(source.level, spellLevel);
    header.append(
      make('h3', 'smart-spell-tier-title', `${ordinal(spellLevel)}-Level Spells`),
      make('span', 'smart-spell-tier-meta', unlocked
        ? `${selected.length} / ${perLevelCap} class-learned max at this level`
        : `Unlocks at Wizard ${minimumClassLevelForSpell(WIZARD_ID, spellLevel)}`)
    );
    tier.appendChild(header);

    const choices = wizardSpellsAtLevel(spellLevel);
    const selectedNames = new Set(sourceState.spellbook.map((name) => name.toLowerCase()));
    const prepared = new Set(sourceState.prepared.map((name) => name.toLowerCase()));
    const preparedAtLimit = sourceState.prepared.length >= progression.prepared;

    selected.forEach((entry) => {
      const row = make('div', 'smart-spell-row');
      const select = spellSelect({
        spells: choices,
        value: entry.name,
        placeholder: `Choose ${ordinal(spellLevel)}-level Wizard spell…`,
        action: 'replace-spell',
        sourceId: source.id,
        spellLevel,
        index: entry.index,
        selectedNames
      });
      select.disabled = !unlocked;

      const prepLabel = make('label', 'smart-spell-prepared');
      const prep = document.createElement('input');
      prep.type = 'checkbox';
      prep.dataset.spellAction = 'prepared';
      prep.dataset.spellSource = source.id;
      prep.dataset.spellIndex = String(entry.index);
      prep.checked = prepared.has(entry.name.toLowerCase());
      prep.disabled = !unlocked || (!prep.checked && preparedAtLimit);
      prepLabel.append(prep, document.createTextNode('Prep'));

      row.append(select, prepLabel, removeButton(source.id, 'remove-spell', entry.index, `Remove ${entry.name} from spellbook`));
      tier.appendChild(row);
    });

    if (!unlocked) {
      if (!selected.length) tier.appendChild(make('div', 'smart-spell-locked-message', `${ordinal(spellLevel)}-level Wizard spells are not available yet.`));
      return tier;
    }

    const totalBelowCap = sourceState.spellbook.length < wizardBookTarget(source.level);
    const levelBelowCap = selected.length < perLevelCap;
    if (totalBelowCap && levelBelowCap) {
      const add = make('div', 'smart-spell-add-row');
      add.appendChild(spellSelect({
        spells: choices,
        placeholder: `Add ${ordinal(spellLevel)}-level Wizard spell…`,
        action: 'add-spell',
        sourceId: source.id,
        spellLevel,
        selectedNames
      }));
      tier.appendChild(add);
    } else {
      const reason = !totalBelowCap ? 'Class spellbook choices full' : `Maximum ${ordinal(spellLevel)}-level class-learned choices reached`;
      tier.appendChild(make('div', 'smart-spell-full', reason));
    }
    return tier;
  }

  function renderWizardPages(source, allSources) {
    const sourceState = ensureSourceState(source.id);
    sanitizeWizard(sourceState);
    const progression = wizardProgression(source.level);
    const bookTarget = wizardBookTarget(source.level);

    const pageOne = createPage(source, 1, 'Spellbook, cantrips, preparation, and slots');
    const progress = make('div', 'spell-progress-row');
    [
      [`${sourceState.cantrips.length} / ${progression.cantrips}`, 'Cantrips Known'],
      [`${sourceState.spellbook.length} / ${bookTarget}`, 'Class Spellbook Choices'],
      [`${sourceState.prepared.length} / ${progression.prepared}`, 'Prepared Spells']
    ].forEach(([value, label]) => {
      const card = make('div', 'spell-progress-card');
      card.append(make('strong', '', value), document.createTextNode(label));
      progress.appendChild(card);
    });

    const slotLine = make('div', 'spell-slots-line', `Available Spellcasting slots: ${slotSummary(allSources)}`);
    const casterLevel = effectiveCasterLevel(allSources);
    if (spellcastingSources(allSources).length > 1) {
      pageOne.appendChild(make('div', 'spell-slots-line', `Multiclass spellcaster level: ${casterLevel}. Spell eligibility still uses Wizard level ${source.level}.`));
    }

    const gridOne = make('div', 'smart-spell-grid');
    const left = make('div', 'smart-spell-column');
    const right = make('div', 'smart-spell-column');
    left.append(
      renderWizardCantrips(source, sourceState, progression),
      renderWizardTier(source, sourceState, progression, 1),
      renderWizardTier(source, sourceState, progression, 2)
    );
    right.append(
      renderWizardTier(source, sourceState, progression, 3),
      renderWizardTier(source, sourceState, progression, 4),
      renderWizardTier(source, sourceState, progression, 5)
    );
    gridOne.append(left, right);
    pageOne.append(progress, slotLine, gridOne);

    if (sourceState.spellbook.length > bookTarget) {
      pageOne.insertBefore(make('div', 'smart-spell-warning', `Saved spellbook choices exceed the current Wizard baseline (${sourceState.spellbook.length} / ${bookTarget}). Nothing was deleted automatically.`), gridOne);
    }
    if (sourceState.prepared.length > progression.prepared) {
      pageOne.insertBefore(make('div', 'smart-spell-warning', `Prepared spells exceed the current Wizard limit (${sourceState.prepared.length} / ${progression.prepared}).`), gridOne);
    }

    const pageTwo = createPage(source, 2, 'Higher-level spellbook and arcane notes');
    const gridTwo = make('div', 'smart-spell-grid');
    const highLeft = make('div', 'smart-spell-column');
    const highRight = make('div', 'smart-spell-column');
    [6, 7].forEach((level) => highLeft.appendChild(renderWizardTier(source, sourceState, progression, level)));
    [8, 9].forEach((level) => highRight.appendChild(renderWizardTier(source, sourceState, progression, level)));
    gridTwo.append(highLeft, highRight);

    const notes = make('textarea', 'fantasy-input spell-source-notes');
    notes.dataset.spellAction = 'wizard-notes';
    notes.dataset.spellSource = source.id;
    notes.placeholder = 'Arcane Recovery, ritual reminders, spellbook notes, copied spells, magical research, and other Wizard notes...';
    notes.value = sourceState.notes || '';
    pageTwo.append(gridTwo, notes);
    return [pageOne, pageTwo];
  }

  /* ========================================================
     MANUAL BRIDGE PAGES FOR OTHER 2024 CASTERS
     ======================================================== */

  function manualTier(source, spellLevel, sourceState) {
    const isCantrip = spellLevel === 0;
    const unlocked = isCantrip ? CANTRIP_CASTERS.has(source.id) : spellLevel <= genericMaxSpellLevel(source);
    const tier = make('div', `spell-tier manual-spell-tier${unlocked ? '' : ' manual-spell-locked'}`);
    const header = make('div', 'spell-tier-header');
    header.append(
      make('h3', 'fantasy-header', isCantrip ? 'Cantrips' : `${ordinal(spellLevel)}-Level Spells`),
      make('span', 'spell-guide-tip', unlocked
        ? 'Manual entry • smart SRD picker coming next'
        : (isCantrip ? 'No class cantrips' : `Unlocks at class level ${minimumClassLevelForSpell(source.id, spellLevel)}`))
    );
    tier.appendChild(header);

    if (!unlocked) {
      tier.appendChild(make('div', 'smart-spell-locked-message', isCantrip ? 'This class does not gain cantrips from its class spellcasting.' : `${ordinal(spellLevel)}-level spells are not available yet.`));
      return tier;
    }

    const area = make('textarea', 'fantasy-input');
    area.dataset.spellAction = 'manual-level';
    area.dataset.spellSource = source.id;
    area.dataset.spellLevel = String(spellLevel);
    area.placeholder = isCantrip ? `Enter ${source.name} cantrips...` : `Enter selected/prepared ${ordinal(spellLevel)}-level ${source.name} spells...`;
    area.value = sourceState.manual?.levels?.[String(spellLevel)] || '';
    tier.appendChild(area);
    return tier;
  }

  function renderGenericPages(source, allSources) {
    const sourceState = ensureSourceState(source.id);
    if (!sourceState.manual || typeof sourceState.manual !== 'object') sourceState.manual = { levels: {}, notes: '' };
    if (!sourceState.manual.levels || typeof sourceState.manual.levels !== 'object') sourceState.manual.levels = {};

    const pageOne = createPage(source, 1, 'Class-specific spellcasting — manual bridge profile');
    pageOne.appendChild(make('div', 'spell-manual-note', `${source.name} already owns its own magic pages. This first build keeps manual spell entry here while its SRD dropdown rules are added. Wizard is the smart-picker proving class.`));
    if (!PACT_CASTERS.has(source.id)) pageOne.appendChild(make('div', 'spell-slots-line', `Available Spellcasting slots: ${slotSummary(allSources)}`));
    else pageOne.appendChild(make('div', 'spell-slots-line', 'Pact Magic uses its own Warlock slot progression. Smart Pact Magic tracking arrives with the Warlock profile.'));

    const gridOne = make('div', 'smart-spell-grid');
    const left = make('div', 'smart-spell-column');
    const right = make('div', 'smart-spell-column');
    [0, 1, 2].forEach((level) => left.appendChild(manualTier(source, level, sourceState)));
    [3, 4, 5].forEach((level) => right.appendChild(manualTier(source, level, sourceState)));
    gridOne.append(left, right);
    pageOne.appendChild(gridOne);

    const pageTwo = createPage(source, 2, 'Higher-level magic and class resources');
    const gridTwo = make('div', 'smart-spell-grid');
    const highLeft = make('div', 'smart-spell-column');
    const highRight = make('div', 'smart-spell-column');
    [6, 7].forEach((level) => highLeft.appendChild(manualTier(source, level, sourceState)));
    [8, 9].forEach((level) => highRight.appendChild(manualTier(source, level, sourceState)));
    gridTwo.append(highLeft, highRight);

    const notes = make('textarea', 'fantasy-input spell-source-notes');
    notes.dataset.spellAction = 'manual-notes';
    notes.dataset.spellSource = source.id;
    notes.placeholder = `${source.name} spellcasting resources, preparation notes, magical features, and reminders...`;
    notes.value = sourceState.manual.notes || '';
    pageTwo.append(gridTwo, notes);
    return [pageOne, pageTwo];
  }

  /* ========================================================
     RENDER / INTERACTIONS
     ======================================================== */

  function render() {
    const host = getHost();
    if (!host) return;

    if (!config?.is2024) {
      setLegacyPageVisibility(true);
      host.replaceChildren();
      updatePrimarySummary([]);
      state.active = false;
      return;
    }

    setLegacyPageVisibility(false);
    const sources = getActiveSources();
    updatePrimarySummary(sources);
    const fragment = document.createDocumentFragment();

    sources.forEach((source) => {
      ensureSourceState(source.id);
      const pages = source.id === WIZARD_ID
        ? renderWizardPages(source, sources)
        : renderGenericPages(source, sources);
      pages.forEach((page) => fragment.appendChild(page));
    });

    host.replaceChildren(fragment);
    state.active = sources.length > 0;

    document.dispatchEvent(new CustomEvent('character:spellcasting-rendered', {
      detail: {
        edition: config.edition,
        sources: sources.map(({ id, name, level, ability }) => ({ id, name, level, ability })),
        pageCount: sources.length * 2,
        effectiveCasterLevel: effectiveCasterLevel(sources)
      }
    }));
  }

  function wizardState() {
    return ensureSourceState(WIZARD_ID);
  }

  function wizardSourceLevel() {
    return getActiveSources().find((source) => source.id === WIZARD_ID)?.level || 1;
  }

  function changeWizardSelect(target) {
    const source = wizardState();
    const action = target.dataset.spellAction;
    const value = text(target.value);
    if (!value) return;

    if (action === 'add-cantrip' && !source.cantrips.some((name) => name.toLowerCase() === value.toLowerCase())) source.cantrips.push(value);
    if (action === 'replace-cantrip') {
      const index = parseInt(target.dataset.spellIndex, 10);
      if (Number.isInteger(index) && index >= 0) source.cantrips[index] = value;
    }
    if (action === 'add-spell' && !source.spellbook.some((name) => name.toLowerCase() === value.toLowerCase())) source.spellbook.push(value);
    if (action === 'replace-spell') {
      const index = parseInt(target.dataset.spellIndex, 10);
      if (Number.isInteger(index) && index >= 0) {
        const oldName = source.spellbook[index];
        source.spellbook[index] = value;
        const preparedIndex = source.prepared.findIndex((name) => name.toLowerCase() === text(oldName).toLowerCase());
        if (preparedIndex >= 0) source.prepared[preparedIndex] = value;
      }
    }
    sanitizeWizard(source);
    syncStateField();
    render();
  }

  function changePrepared(target) {
    const source = wizardState();
    const index = parseInt(target.dataset.spellIndex, 10);
    const name = source.spellbook[index];
    if (!name) return;
    const existing = source.prepared.findIndex((candidate) => candidate.toLowerCase() === name.toLowerCase());

    if (target.checked && existing < 0) {
      const limit = wizardProgression(wizardSourceLevel()).prepared;
      if (source.prepared.length < limit) source.prepared.push(name);
    } else if (!target.checked && existing >= 0) {
      source.prepared.splice(existing, 1);
    }
    sanitizeWizard(source);
    syncStateField();
    render();
  }

  function removeWizard(target) {
    const source = wizardState();
    const index = parseInt(target.dataset.spellIndex, 10);
    if (!Number.isInteger(index) || index < 0) return;

    if (target.dataset.spellAction === 'remove-cantrip') source.cantrips.splice(index, 1);
    if (target.dataset.spellAction === 'remove-spell') {
      const removed = source.spellbook.splice(index, 1)[0];
      if (removed) source.prepared = source.prepared.filter((name) => name.toLowerCase() !== removed.toLowerCase());
    }
    sanitizeWizard(source);
    syncStateField();
    render();
  }

  function updateTextState(target) {
    const sourceId = target.dataset.spellSource;
    const source = ensureSourceState(sourceId);
    const action = target.dataset.spellAction;

    if (action === 'wizard-notes') source.notes = target.value;
    if (action === 'manual-level') {
      if (!source.manual) source.manual = { levels: {}, notes: '' };
      if (!source.manual.levels) source.manual.levels = {};
      source.manual.levels[String(target.dataset.spellLevel)] = target.value;
    }
    if (action === 'manual-notes') {
      if (!source.manual) source.manual = { levels: {}, notes: '' };
      source.manual.notes = target.value;
    }
    syncStateField();
  }

  function refreshStatsOnly() {
    const sources = getActiveSources();
    updatePrimarySummary(sources);
    document.querySelectorAll('.dynamic-spell-page').forEach((page) => {
      const source = sources.find((candidate) => candidate.id === page.dataset.spellSource);
      if (!source) return;
      const values = page.querySelectorAll('.spell-stat-value');
      const stats = spellStats(source.ability);
      if (values.length >= 5) {
        values[2].textContent = formatSigned(stats.modifier);
        values[3].textContent = String(stats.saveDc);
        values[4].textContent = formatSigned(stats.attack);
      }
    });
  }

  function bindInteractions() {
    const host = getHost();
    if (!host) return;

    host.addEventListener('change', (event) => {
      const target = event.target;
      const action = target?.dataset?.spellAction;
      if (['add-cantrip', 'replace-cantrip', 'add-spell', 'replace-spell'].includes(action)) changeWizardSelect(target);
      if (action === 'prepared') changePrepared(target);
    });

    host.addEventListener('click', (event) => {
      const button = event.target?.closest?.('button[data-spell-action]');
      if (button && ['remove-cantrip', 'remove-spell'].includes(button.dataset.spellAction)) removeWizard(button);
    });

    host.addEventListener('input', (event) => {
      const action = event.target?.dataset?.spellAction;
      if (['manual-level', 'manual-notes', 'wizard-notes'].includes(action)) updateTextState(event.target);
    });

    document.addEventListener('change', (event) => {
      if (event.target?.matches?.('.char-class-select, .char-level-select')) render();
    }, true);

    ['multiclass-btn', 'remove-multiclass-btn'].forEach((id) => {
      document.getElementById(id)?.addEventListener('click', () => window.setTimeout(render, 0));
    });

    ['int', 'wis', 'cha', 'prof-bonus'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', refreshStatsOnly);
      document.getElementById(id)?.addEventListener('change', refreshStatsOnly);
    });

    getStateField()?.addEventListener('change', () => {
      if (writingStateField) return;
      hydrateStateField();
      render();
    });

    document.addEventListener('character:restored', () => {
      hydrateStateField();
      render();
    });
  }

  /* ========================================================
     DATA / INIT
     ======================================================== */

  async function loadSpells() {
    if (!config) throw new Error('spellcasting.js requires config.js.');
    if (!config.is2024) {
      state.loaded = true;
      state.active = false;
      setLegacyPageVisibility(true);
      render();
      return state;
    }

    const path = config.getSpellsDataPath();
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load ${path} (${response.status}).`);
    const data = await response.json();
    if (String(data?.edition || '') !== config.edition) throw new Error(`Spell data edition ${data?.edition} does not match builder edition ${config.edition}.`);

    state.spells = Array.isArray(data?.spells)
      ? data.spells.filter((spell) => spell && text(spell.name)).map((spell) => ({ ...spell, level: Number(spell.level) || 0 }))
      : [];
    state.wizardSpells = state.spells.filter((spell) => Array.isArray(spell.classes) && spell.classes.includes(WIZARD_ID));
    state.spellByName = new Map(state.spells.map((spell) => [spell.name.toLowerCase(), spell]));
    state.loaded = true;
    state.error = null;
    hydrateStateField();
    sanitizeState();
    render();

    document.dispatchEvent(new CustomEvent('character:spellcasting-ready', {
      detail: { edition: config.edition, spellCount: state.spells.length, wizardSpellCount: state.wizardSpells.length, path }
    }));
    return state;
  }

  function init() {
    bindInteractions();
    readyPromise = Promise.allSettled([window.CharacterClasses?.ready])
      .then(loadSpells)
      .catch((error) => {
        state.loaded = false;
        state.active = false;
        state.error = error;
        console.error('Dynamic spellcasting could not be initialized:', error);
        /* Safe failure: never strand a caster without any spell pages. */
        setLegacyPageVisibility(true);
        return state;
      });
    return readyPromise;
  }

  window.CharacterSpellcasting = Object.freeze({
    get ready() { return readyPromise; },
    get loaded() { return state.loaded; },
    get active() { return state.active; },
    get spellCount() { return state.spells.length; },
    get wizardSpellCount() { return state.wizardSpells.length; },
    get error() { return state.error; },
    get state() { return JSON.parse(JSON.stringify(state.structured)); },
    render,
    getActiveSources,
    effectiveCasterLevel,
    sharedSpellSlots
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
