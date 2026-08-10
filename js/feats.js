/**
 * My RPG Source - Feat Manager
 * ----------------------------
 *
 * Responsibilities:
 *  - Load edition-specific SRD feats from the Codex data.
 *  - Track feats as structured character data instead of free text.
 *  - Auto-sync 2024 Background and Human Origin feats.
 *  - Detect class feat-choice opportunities from current class levels.
 *  - Open the appropriate feat chooser after Level Up.
 *  - Keep non-SRD choices available as user-entered Custom / Other feats
 *    without reproducing protected rules text.
 *
 * Feat mechanics are intentionally not applied automatically in this pass.
 * This module records choices, prerequisites, source, and SRD reference text.
 */

(() => {
  'use strict';

  const config = window.MyRPGConfig;
  const STATE_FIELD_ID = 'feat-state';
  const STATE_VERSION = 1;

  const STANDARD_ASI_LEVELS = Object.freeze([4, 8, 12, 16]);
  const FIGHTER_ASI_LEVELS_2014 = Object.freeze([4, 6, 8, 12, 14, 16, 19]);
  const ROGUE_ASI_LEVELS_2014 = Object.freeze([4, 8, 10, 12, 16, 19]);
  const STANDARD_ASI_LEVELS_2014 = Object.freeze([4, 8, 12, 16, 19]);
  const FIGHTER_GENERAL_LEVELS_2024 = Object.freeze([4, 6, 8, 12, 14, 16]);
  const ROGUE_GENERAL_LEVELS_2024 = Object.freeze([4, 8, 10, 12, 16]);

  const state = {
    loaded: false,
    entries: [],
    byId: new Map(),
    byTitle: new Map(),
    data: emptyState(),
    overlay: null,
    modal: null,
    activeOpportunity: null,
    manualMode: false,
    error: null
  };

  let readyPromise = Promise.resolve(state);

  function emptyState() {
    return {
      version: STATE_VERSION,
      selections: [],
      resolved: []
    };
  }

  function text(value) {
    return String(value ?? '').trim();
  }

  function slugify(value) {
    return text(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function integer(value, fallback = 0) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function uniqueId(prefix = 'feat') {
    if (globalThis.crypto?.randomUUID) {
      return `${prefix}-${globalThis.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function getEdition() {
    return text(config?.edition || '2024');
  }

  function getStateField() {
    return document.getElementById(STATE_FIELD_ID);
  }

  function normalizeSavedState(raw) {
    const normalized = emptyState();

    if (!raw || typeof raw !== 'object') {
      return normalized;
    }

    normalized.selections = Array.isArray(raw.selections)
      ? raw.selections.filter((item) => item && typeof item === 'object')
      : [];

    normalized.resolved = Array.isArray(raw.resolved)
      ? raw.resolved.filter((item) => item && typeof item === 'object')
      : [];

    return normalized;
  }

  function readStateField() {
    const field = getStateField();

    if (!field?.value) {
      state.data = emptyState();
      return state.data;
    }

    try {
      state.data = normalizeSavedState(JSON.parse(field.value));
    } catch (error) {
      console.warn('Feat state could not be parsed. Starting a clean feat state.', error);
      state.data = emptyState();
    }

    return state.data;
  }

  function writeState({ emit = true } = {}) {
    const field = getStateField();

    if (!field) {
      return;
    }

    field.value = JSON.stringify({
      version: STATE_VERSION,
      selections: state.data.selections,
      resolved: state.data.resolved
    });

    if (emit) {
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Could not load ${path} (${response.status}).`);
    }

    return response.json();
  }

  function getFact(entry, label) {
    const wanted = text(label).toLowerCase();
    const fact = (Array.isArray(entry?.facts) ? entry.facts : [])
      .find((item) => text(item?.label).toLowerCase() === wanted);

    return text(fact?.value);
  }

  function isRepeatable(entry) {
    return getFact(entry, 'Repeatable').toLowerCase() === 'yes';
  }

  function normalizeEntries(data) {
    const rawEntries = Array.isArray(data?.entries) ? data.entries : [];

    return rawEntries
      .map((entry) => ({
        ...entry,
        id: text(entry?.id) || slugify(entry?.title),
        title: text(entry?.title),
        category: text(entry?.category),
        categoryName: text(entry?.categoryName),
        summary: text(entry?.summary),
        description: text(entry?.description),
        facts: Array.isArray(entry?.facts) ? entry.facts : [],
        traits: Array.isArray(entry?.traits) ? entry.traits : []
      }))
      .filter((entry) => entry.id && entry.title);
  }

  async function loadFeats() {
    const edition = getEdition();
    const path = `data/codex/dnd5e/${edition}/feats.json`;
    const data = await fetchJson(path);
    const entries = normalizeEntries(data);

    state.entries = entries;
    state.byId = new Map(entries.map((entry) => [entry.id, entry]));
    state.byTitle = new Map(entries.map((entry) => [entry.title.toLowerCase(), entry]));
    state.loaded = true;
    state.error = null;

    return state;
  }

  function findEntry(value) {
    const key = text(value);

    if (!key) {
      return null;
    }

    return state.byId.get(key) || state.byTitle.get(key.toLowerCase()) || null;
  }

  function getClassRows() {
    return Array.from(document.querySelectorAll('.class-level-row'))
      .map((row, rowIndex) => ({
        rowIndex,
        className: text(row.querySelector('.char-class-select')?.value),
        classLevel: integer(row.querySelector('.char-level-select')?.value, 1)
      }))
      .filter((row) => row.className);
  }

  function getTotalLevel() {
    return getClassRows().reduce((total, row) => total + row.classLevel, 0);
  }

  function getAbilityScore(stat) {
    return integer(document.getElementById(stat)?.value, 10);
  }

  function hasSpellcastingFeature() {
    if (document.getElementById('spell-ability')?.value !== 'none') {
      return true;
    }

    const spellcasters = new Set([
      'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'
    ]);

    return getClassRows().some((row) => spellcasters.has(row.className));
  }

  function hasFightingStyleFeature() {
    if (getEdition() !== '2024') {
      return false;
    }

    return getClassRows().some((row) => (
      (row.className === 'Fighter' && row.classLevel >= 1) ||
      (row.className === 'Paladin' && row.classLevel >= 2) ||
      (row.className === 'Ranger' && row.classLevel >= 2)
    ));
  }

  function getSelectionsByFeatId(featId) {
    return state.data.selections.filter((item) => item.featId === featId);
  }

  function prerequisiteResult(entry, opportunity = null) {
    if (!entry) {
      return { eligible: false, reason: 'Feat data unavailable.' };
    }

    const edition = getEdition();
    const level = getTotalLevel();

    if (!isRepeatable(entry) && getSelectionsByFeatId(entry.id).length > 0) {
      return { eligible: false, reason: 'This feat is not repeatable and is already selected.' };
    }

    if (edition === '2014') {
      if (entry.id === 'grappler' && getAbilityScore('str') < 13) {
        return { eligible: false, reason: 'Requires Strength 13 or higher.' };
      }

      return { eligible: true, reason: '' };
    }

    if (entry.id === 'grappler' && Math.max(getAbilityScore('str'), getAbilityScore('dex')) < 13) {
      return { eligible: false, reason: 'Requires Strength or Dexterity 13 or higher.' };
    }

    if (entry.category === 'general-feat' && level < 4) {
      return { eligible: false, reason: 'Requires character level 4 or higher.' };
    }

    if (entry.category === 'epic-boon-feat' && level < 19) {
      return { eligible: false, reason: 'Requires character level 19 or higher.' };
    }

    if (entry.id === 'boon-of-spell-recall' && !hasSpellcastingFeature()) {
      return { eligible: false, reason: 'Requires the Spellcasting feature.' };
    }

    if (
      entry.category === 'fighting-style-feat' &&
      opportunity?.kind !== 'fighting-style' &&
      !hasFightingStyleFeature()
    ) {
      return { eligible: false, reason: 'Requires a Fighting Style feature.' };
    }

    return { eligible: true, reason: '' };
  }

  function get2014AsiLevels(className) {
    if (className === 'Fighter') {
      return FIGHTER_ASI_LEVELS_2014;
    }

    if (className === 'Rogue') {
      return ROGUE_ASI_LEVELS_2014;
    }

    return STANDARD_ASI_LEVELS_2014;
  }

  function get2024GeneralLevels(className) {
    if (className === 'Fighter') {
      return FIGHTER_GENERAL_LEVELS_2024;
    }

    if (className === 'Rogue') {
      return ROGUE_GENERAL_LEVELS_2024;
    }

    return STANDARD_ASI_LEVELS;
  }

  function buildOpportunity({ edition, className, classLevel, kind, label }) {
    return {
      key: `${edition}:class:${slugify(className)}:${classLevel}:${kind}`,
      edition,
      className,
      classLevel,
      kind,
      label
    };
  }

  function getAllClassOpportunities() {
    const edition = getEdition();
    const opportunities = [];

    getClassRows().forEach((row) => {
      if (edition === '2014') {
        get2014AsiLevels(row.className)
          .filter((level) => level <= row.classLevel)
          .forEach((level) => {
            opportunities.push(buildOpportunity({
              edition,
              className: row.className,
              classLevel: level,
              kind: 'asi-or-feat',
              label: `${row.className} ${level}: Ability Score Improvement or Feat`
            }));
          });

        return;
      }

      if (row.className === 'Fighter' && row.classLevel >= 1) {
        opportunities.push(buildOpportunity({
          edition,
          className: row.className,
          classLevel: 1,
          kind: 'fighting-style',
          label: 'Fighter 1: Fighting Style Feat'
        }));
      }

      if ((row.className === 'Paladin' || row.className === 'Ranger') && row.classLevel >= 2) {
        opportunities.push(buildOpportunity({
          edition,
          className: row.className,
          classLevel: 2,
          kind: 'fighting-style',
          label: `${row.className} 2: Fighting Style Feat`
        }));
      }

      get2024GeneralLevels(row.className)
        .filter((level) => level <= row.classLevel)
        .forEach((level) => {
          opportunities.push(buildOpportunity({
            edition,
            className: row.className,
            classLevel: level,
            kind: 'general',
            label: `${row.className} ${level}: Feat Choice`
          }));
        });

      if (row.classLevel >= 19) {
        opportunities.push(buildOpportunity({
          edition,
          className: row.className,
          classLevel: 19,
          kind: 'epic',
          label: `${row.className} 19: Epic Boon or Other Eligible Feat`
        }));
      }
    });

    const seen = new Set();

    return opportunities.filter((opportunity) => {
      if (seen.has(opportunity.key)) {
        return false;
      }

      seen.add(opportunity.key);
      return true;
    });
  }

  function isResolved(key) {
    return state.data.resolved.some((item) => item.key === key);
  }

  function getPendingOpportunities() {
    return getAllClassOpportunities().filter((opportunity) => !isResolved(opportunity.key));
  }

  function markResolved(opportunity, resolution, selectionUid = '') {
    if (!opportunity?.key) {
      return;
    }

    state.data.resolved = state.data.resolved.filter((item) => item.key !== opportunity.key);
    state.data.resolved.push({
      key: opportunity.key,
      resolution,
      selectionUid,
      className: opportunity.className,
      classLevel: opportunity.classLevel,
      kind: opportunity.kind
    });
  }

  function unresolveBySelection(selectionUid) {
    state.data.resolved = state.data.resolved.filter((item) => item.selectionUid !== selectionUid);
  }

  function getEntryDisplayTitle(entry, variant = '') {
    return variant ? `${entry?.title || 'Feat'} (${variant})` : (entry?.title || 'Feat');
  }

  function normalizeMagicInitiateVariant(label) {
    const match = text(label).match(/^Magic Initiate\s*\(([^)]+)\)$/i);

    if (!match) {
      return { title: text(label), variant: '' };
    }

    return { title: 'Magic Initiate', variant: text(match[1]) };
  }

  function upsertSystemSelection({ sourceKey, sourceLabel, featLabel }) {
    state.data.selections = state.data.selections.filter((item) => item.sourceKey !== sourceKey);

    const normalized = normalizeMagicInitiateVariant(featLabel);
    const entry = findEntry(normalized.title);

    if (!entry) {
      return false;
    }

    state.data.selections.push({
      uid: uniqueId('system-feat'),
      featId: entry.id,
      title: entry.title,
      variant: normalized.variant,
      custom: false,
      note: '',
      sourceType: 'system',
      sourceKey,
      sourceLabel,
      opportunityKey: '',
      locked: true
    });

    return true;
  }

  function removeSystemSource(prefix) {
    const before = state.data.selections.length;
    state.data.selections = state.data.selections.filter((item) => !text(item.sourceKey).startsWith(prefix));
    return before !== state.data.selections.length;
  }

  function syncBackgroundFeat(background) {
    if (getEdition() !== '2024') {
      return;
    }

    removeSystemSource('background:');

    if (background?.id && background?.raw?.feat) {
      upsertSystemSelection({
        sourceKey: `background:${background.id}`,
        sourceLabel: `${background.name} Background`,
        featLabel: background.raw.feat
      });
    } else if (background?.id && background?.feat) {
      upsertSystemSelection({
        sourceKey: `background:${background.id}`,
        sourceLabel: `${background.name} Background`,
        featLabel: background.feat
      });
    }

    writeState();
    render();
  }

  function syncSpeciesOriginFeat(detail = null) {
    if (getEdition() !== '2024') {
      return;
    }

    removeSystemSource('species:origin-feat');

    const originChoice = detail?.choices?.originFeat;
    const label = text(originChoice?.option?.label || originChoice?.label || originChoice?.value);

    if (label) {
      upsertSystemSelection({
        sourceKey: 'species:origin-feat',
        sourceLabel: 'Human Versatile',
        featLabel: label
      });
    }

    writeState();
    render();
  }

  async function syncSystemSourcesFromCurrent() {
    if (getEdition() !== '2024') {
      return;
    }

    await Promise.all([
      window.CharacterBackgrounds?.ready,
      window.CharacterOrigins?.ready
    ].filter(Boolean));

    const backgroundValue = document.getElementById('char-background')?.value;
    const background = window.CharacterBackgrounds?.findEntry?.(backgroundValue);

    if (background) {
      syncBackgroundFeat(background);
    }

    window.CharacterOrigins?.updateSpeciesChoiceDisplay?.();
  }

  function getDuplicateNonrepeatableIds() {
    const counts = new Map();

    state.data.selections.forEach((selection) => {
      if (!selection.featId) {
        return;
      }

      counts.set(selection.featId, (counts.get(selection.featId) || 0) + 1);
    });

    return new Set(
      [...counts.entries()]
        .filter(([featId, count]) => count > 1 && !isRepeatable(findEntry(featId)))
        .map(([featId]) => featId)
    );
  }

  function featCodexUrl(entry) {
    const params = new URLSearchParams({
      game: 'dnd5e',
      edition: getEdition(),
      type: 'feat',
      entry: entry.id
    });

    return `codex.html?${params.toString()}`;
  }

  function render() {
    const list = document.getElementById('feat-list');
    const empty = document.getElementById('feat-empty');
    const pendingButton = document.getElementById('feat-resolve-pending');
    const count = document.getElementById('feat-count');

    if (!list || !empty || !pendingButton || !count) {
      return;
    }

    const duplicates = getDuplicateNonrepeatableIds();
    list.replaceChildren();

    state.data.selections.forEach((selection) => {
      const entry = findEntry(selection.featId);
      const card = document.createElement('article');
      card.className = 'feat-card';

      if (selection.custom) {
        card.classList.add('custom-feat-card');
      }

      if (duplicates.has(selection.featId)) {
        card.classList.add('feat-card-warning');
      }

      const heading = document.createElement('div');
      heading.className = 'feat-card-heading';

      const titleWrap = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = selection.custom
        ? (selection.title || 'Custom Feat')
        : getEntryDisplayTitle(entry, selection.variant);

      const source = document.createElement('small');
      source.textContent = selection.sourceLabel || 'Manual selection';

      titleWrap.append(title, source);
      heading.appendChild(titleWrap);

      const actions = document.createElement('div');
      actions.className = 'feat-card-actions';

      if (entry) {
        const codex = document.createElement('a');
        codex.href = featCodexUrl(entry);
        codex.target = '_blank';
        codex.rel = 'noopener';
        codex.textContent = 'Codex';
        actions.appendChild(codex);
      }

      if (!selection.locked) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = 'Remove';
        remove.addEventListener('click', () => removeSelection(selection.uid));
        actions.appendChild(remove);
      }

      heading.appendChild(actions);
      card.appendChild(heading);

      const summary = document.createElement('p');
      summary.className = 'feat-card-summary';
      summary.textContent = selection.custom
        ? (selection.note || 'User-entered feat. Rules text is intentionally not reproduced.')
        : (entry?.summary || 'Feat details available in the Rules Codex.');
      card.appendChild(summary);

      if (duplicates.has(selection.featId)) {
        const warning = document.createElement('p');
        warning.className = 'feat-conflict';
        warning.textContent = 'This feat is not repeatable. Change one of the duplicate selections.';
        card.appendChild(warning);
      }

      list.appendChild(card);
    });

    const pending = getPendingOpportunities();
    count.textContent = `${state.data.selections.length} selected`;
    empty.hidden = state.data.selections.length !== 0;
    pendingButton.hidden = pending.length === 0;
    pendingButton.textContent = pending.length === 1
      ? 'Resolve 1 Feat Choice'
      : `Resolve ${pending.length} Feat Choices`;
  }

  function removeSelection(uid) {
    const selection = state.data.selections.find((item) => item.uid === uid);

    if (!selection || selection.locked) {
      return;
    }

    state.data.selections = state.data.selections.filter((item) => item.uid !== uid);
    unresolveBySelection(uid);
    writeState();
    render();
  }

  function getEntriesForOpportunity(opportunity) {
    const edition = getEdition();

    return state.entries.filter((entry) => {
      if (edition === '2014') {
        return true;
      }

      if (opportunity?.kind === 'origin') {
        return entry.category === 'origin-feat';
      }

      if (opportunity?.kind === 'fighting-style') {
        return entry.category === 'fighting-style-feat';
      }

      if (opportunity?.kind === 'general') {
        return entry.category !== 'epic-boon-feat';
      }

      if (opportunity?.kind === 'epic') {
        return true;
      }

      return true;
    });
  }

  function buildModal() {
    if (state.modal) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'feat-modal-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    const modal = document.createElement('section');
    modal.className = 'feat-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'feat-modal-title');
    modal.innerHTML = `
      <div class="feat-modal-header">
        <div>
          <span class="feat-modal-kicker">Character Advancement</span>
          <h2 id="feat-modal-title">Choose a Feat</h2>
        </div>
        <button type="button" class="feat-modal-close" aria-label="Close feat chooser">×</button>
      </div>

      <div class="feat-modal-body">
        <p class="feat-modal-source"></p>

        <div class="feat-2014-mode" hidden>
          <label class="feat-mode-option">
            <input type="radio" name="feat-2014-resolution" value="asi">
            <span><strong>Ability Score Improvement</strong><small>Use the normal 2014 ASI instead of a feat. Adjust the ability scores on Page 1 manually for now.</small></span>
          </label>
          <label class="feat-mode-option">
            <input type="radio" name="feat-2014-resolution" value="feat">
            <span><strong>Take a Feat</strong><small>Choose an eligible SRD feat or record another feat you are allowed to use.</small></span>
          </label>
        </div>

        <div class="feat-select-wrap">
          <label for="feat-choice-select">Feat</label>
          <select id="feat-choice-select" class="fantasy-input"></select>
        </div>

        <div class="feat-custom-fields" hidden>
          <label for="feat-custom-name">Feat Name</label>
          <input id="feat-custom-name" class="fantasy-input" type="text" maxlength="120" placeholder="Feat name">
          <label for="feat-custom-note">Personal Notes (optional)</label>
          <textarea id="feat-custom-note" class="fantasy-input" rows="3" maxlength="500" placeholder="Your own reminder only. Don't paste protected rules text here for redistribution."></textarea>
        </div>

        <div class="feat-preview"></div>
        <p class="feat-modal-error" role="alert"></p>
      </div>

      <div class="feat-modal-actions">
        <button type="button" class="feat-modal-cancel">Cancel</button>
        <button type="button" class="feat-modal-save">Save Choice</button>
      </div>
    `;

    document.body.append(overlay, modal);
    state.overlay = overlay;
    state.modal = modal;

    modal.querySelector('.feat-modal-close').addEventListener('click', closeModal);
    modal.querySelector('.feat-modal-cancel').addEventListener('click', closeModal);
    modal.querySelector('.feat-modal-save').addEventListener('click', saveModalChoice);
    modal.querySelector('#feat-choice-select').addEventListener('change', renderModalSelection);

    modal.querySelectorAll('input[name="feat-2014-resolution"]').forEach((radio) => {
      radio.addEventListener('change', renderModalSelection);
    });
  }

  function closeModal() {
    state.activeOpportunity = null;
    state.manualMode = false;
    state.overlay?.classList.remove('visible');
    state.overlay?.setAttribute('aria-hidden', 'true');
    state.modal?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function get2014ResolutionMode() {
    return state.modal?.querySelector('input[name="feat-2014-resolution"]:checked')?.value || '';
  }

  function populateFeatSelect(opportunity) {
    const select = state.modal.querySelector('#feat-choice-select');
    select.replaceChildren();

    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = '-- Choose Feat --';
    select.appendChild(blank);

    const entries = getEntriesForOpportunity(opportunity);
    const groups = new Map();

    entries.forEach((entry) => {
      const label = entry.categoryName || 'Feats';

      if (!groups.has(label)) {
        groups.set(label, []);
      }

      groups.get(label).push(entry);
    });

    groups.forEach((groupEntries, label) => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = label.replace(/^Feat:\s*/i, '');

      groupEntries.forEach((entry) => {
        const option = document.createElement('option');
        const eligibility = prerequisiteResult(entry, opportunity);
        option.value = entry.id;
        option.textContent = eligibility.eligible ? entry.title : `${entry.title} — ${eligibility.reason}`;
        option.disabled = !eligibility.eligible;
        optgroup.appendChild(option);
      });

      select.appendChild(optgroup);
    });

    const customGroup = document.createElement('optgroup');
    customGroup.label = 'Other / Owned Content';
    const custom = document.createElement('option');
    custom.value = '__custom__';
    custom.textContent = 'Custom / Other Feat…';
    customGroup.appendChild(custom);
    select.appendChild(customGroup);
  }

  function openModal(opportunity = null, { manual = false } = {}) {
    buildModal();
    state.activeOpportunity = opportunity;
    state.manualMode = manual;

    const is2014Asi = getEdition() === '2014' && opportunity?.kind === 'asi-or-feat';
    const title = state.modal.querySelector('#feat-modal-title');
    const source = state.modal.querySelector('.feat-modal-source');
    const modeWrap = state.modal.querySelector('.feat-2014-mode');
    const selectWrap = state.modal.querySelector('.feat-select-wrap');
    const error = state.modal.querySelector('.feat-modal-error');

    title.textContent = manual ? 'Add a Feat' : (opportunity?.label || 'Choose a Feat');
    source.textContent = manual
      ? 'Add an SRD feat manually, or record the name of a feat from material you are allowed to use.'
      : 'This choice was detected from your current class progression.';

    modeWrap.hidden = !is2014Asi;
    selectWrap.hidden = is2014Asi;
    error.textContent = '';

    state.modal.querySelectorAll('input[name="feat-2014-resolution"]').forEach((radio) => {
      radio.checked = false;
    });

    state.modal.querySelector('#feat-custom-name').value = '';
    state.modal.querySelector('#feat-custom-note').value = '';
    state.modal.querySelector('.feat-custom-fields').hidden = true;
    state.modal.querySelector('.feat-preview').replaceChildren();

    populateFeatSelect(opportunity);

    state.overlay.classList.add('visible');
    state.overlay.setAttribute('aria-hidden', 'false');
    state.modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    if (!is2014Asi) {
      state.modal.querySelector('#feat-choice-select').focus();
    }
  }

  function renderModalSelection() {
    const select = state.modal.querySelector('#feat-choice-select');
    const customFields = state.modal.querySelector('.feat-custom-fields');
    const preview = state.modal.querySelector('.feat-preview');
    const is2014Asi = getEdition() === '2014' && state.activeOpportunity?.kind === 'asi-or-feat';
    const resolutionMode = get2014ResolutionMode();

    if (is2014Asi) {
      const useFeat = resolutionMode === 'feat';
      state.modal.querySelector('.feat-select-wrap').hidden = !useFeat;

      if (!useFeat) {
        customFields.hidden = true;
        preview.innerHTML = resolutionMode === 'asi'
          ? '<p><strong>2014 Ability Score Improvement selected.</strong> This choice will be recorded as resolved, but ability-score changes remain manual in this pass.</p>'
          : '';
        return;
      }
    }

    customFields.hidden = select.value !== '__custom__';
    preview.replaceChildren();

    if (!select.value || select.value === '__custom__') {
      return;
    }

    const entry = findEntry(select.value);

    if (!entry) {
      return;
    }

    const heading = document.createElement('strong');
    heading.textContent = entry.title;
    const summary = document.createElement('p');
    summary.textContent = entry.summary;
    preview.append(heading, summary);

    if (entry.traits.length) {
      const list = document.createElement('ul');

      entry.traits.forEach((trait) => {
        const item = document.createElement('li');
        item.textContent = `${text(trait?.name)}: ${text(trait?.description)}`;
        list.appendChild(item);
      });

      preview.appendChild(list);
    }
  }

  function saveModalChoice() {
    const error = state.modal.querySelector('.feat-modal-error');
    const select = state.modal.querySelector('#feat-choice-select');
    const opportunity = state.activeOpportunity;
    const is2014Asi = getEdition() === '2014' && opportunity?.kind === 'asi-or-feat';

    error.textContent = '';

    if (is2014Asi) {
      const mode = get2014ResolutionMode();

      if (!mode) {
        error.textContent = 'Choose Ability Score Improvement or Take a Feat.';
        return;
      }

      if (mode === 'asi') {
        markResolved(opportunity, 'asi', '');
        writeState();
        render();
        closeModal();
        return;
      }
    }

    const value = select.value;

    if (!value) {
      error.textContent = 'Choose a feat first.';
      return;
    }

    let selection;

    if (value === '__custom__') {
      const name = text(state.modal.querySelector('#feat-custom-name').value);
      const note = text(state.modal.querySelector('#feat-custom-note').value);

      if (!name) {
        error.textContent = 'Enter the feat name.';
        return;
      }

      selection = {
        uid: uniqueId('custom-feat'),
        featId: '',
        title: name,
        variant: '',
        custom: true,
        note,
        sourceType: opportunity ? 'class' : 'manual',
        sourceKey: opportunity?.key || '',
        sourceLabel: opportunity?.label || 'Manual / DM Override',
        opportunityKey: opportunity?.key || '',
        locked: false
      };
    } else {
      const entry = findEntry(value);
      const eligibility = prerequisiteResult(entry, opportunity);

      if (!entry || !eligibility.eligible) {
        error.textContent = eligibility.reason || 'That feat is not currently eligible.';
        populateFeatSelect(opportunity);
        return;
      }

      selection = {
        uid: uniqueId('feat'),
        featId: entry.id,
        title: entry.title,
        variant: '',
        custom: false,
        note: '',
        sourceType: opportunity ? 'class' : 'manual',
        sourceKey: opportunity?.key || '',
        sourceLabel: opportunity?.label || 'Manual / DM Override',
        opportunityKey: opportunity?.key || '',
        locked: false
      };
    }

    state.data.selections.push(selection);

    if (opportunity) {
      markResolved(opportunity, 'feat', selection.uid);
    }

    writeState();
    render();
    closeModal();
  }

  function openNextPending() {
    const pending = getPendingOpportunities();

    if (pending.length) {
      openModal(pending[0]);
    }
  }

  function handleLeveledUp(event) {
    const detail = event?.detail || {};
    render();

    const pending = getPendingOpportunities();
    const matching = pending.find((opportunity) => (
      opportunity.className === detail.className &&
      opportunity.classLevel === integer(detail.classLevel, 0)
    ));

    if (matching) {
      queueMicrotask(() => openModal(matching));
    }
  }

  function bindEvents() {
    document.getElementById('feat-add-manual')?.addEventListener('click', () => {
      openModal(null, { manual: true });
    });

    document.getElementById('feat-resolve-pending')?.addEventListener('click', openNextPending);

    document.addEventListener('character:leveled-up', handleLeveledUp);

    document.addEventListener('character:background-applied', (event) => {
      syncBackgroundFeat(event.detail?.background || null);
    });

    document.addEventListener('character:species-choices-applied', (event) => {
      syncSpeciesOriginFeat(event.detail || null);
    });

    document.addEventListener('character:restored', async () => {
      readStateField();
      await readyPromise;
      await syncSystemSourcesFromCurrent();
      render();
    });

    document.addEventListener('change', (event) => {
      if (event.target?.matches?.('.char-class-select, .char-level-select, #str, #dex, #spell-ability')) {
        render();
      }
    });

    document.addEventListener('input', (event) => {
      if (event.target?.matches?.('#str, #dex')) {
        render();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.modal?.classList.contains('open')) {
        closeModal();
      }
    });
  }

  async function init() {
    readStateField();
    buildModal();
    bindEvents();

    readyPromise = loadFeats()
      .then(async () => {
        await syncSystemSourcesFromCurrent();
        render();
        document.dispatchEvent(new CustomEvent('character:feats-ready', {
          detail: {
            edition: getEdition(),
            count: state.entries.length
          }
        }));
        return state;
      })
      .catch((error) => {
        state.error = error;
        state.loaded = false;
        console.error('Feat data could not be loaded:', error);
        render();
        return state;
      });

    return readyPromise;
  }

  window.CharacterFeats = Object.freeze({
    get ready() {
      return readyPromise;
    },
    get entries() {
      return [...state.entries];
    },
    get selections() {
      return [...state.data.selections];
    },
    findEntry,
    getPendingOpportunities,
    openNextPending,
    addManual: () => openModal(null, { manual: true }),
    refresh: render
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
