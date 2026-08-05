/**
 * My RPG Source - Standalone Rules Codex
 * ---------------------------------------
 * Uses the shared Codex data layer to load game-system and edition-specific
 * rules, mundane equipment, spells, and magic items. Event listeners are bound once. No timers or
 * MutationObservers are used.
 */

'use strict';

const CODEX_PAGE_SIZE = 48;
const CODEX_SEARCH_DELAY = 120;
const DEFAULT_PAGE_TITLE = 'Rules Codex | My RPG Source';

const codexState = {
  manifest: null,
  gameSystem: null,
  entries: [],
  filteredEntries: [],
  categories: [],
  equipmentCategories: [],
  byGlobalId: new Map(),
  byLocalKey: new Map(),
  visibleCount: CODEX_PAGE_SIZE,
  pendingEntryId: null,
  searchTimer: null,
};

const codexElements = {};

function cacheCodexElements() {
  codexElements.form = document.getElementById('codex-filter-form');
  codexElements.search = document.getElementById('codex-search');
  codexElements.game = document.getElementById('codex-game');
  codexElements.edition = document.getElementById('codex-edition');
  codexElements.type = document.getElementById('codex-type');
  codexElements.category = document.getElementById('codex-category');
  codexElements.equipmentCategory = document.getElementById('codex-equipment-category');
  codexElements.level = document.getElementById('codex-level');
  codexElements.school = document.getElementById('codex-school');
  codexElements.rarity = document.getElementById('codex-rarity');
  codexElements.attunement = document.getElementById('codex-attunement');
  codexElements.reset = document.getElementById('codex-reset');
  codexElements.status = document.getElementById('codex-status');
  codexElements.results = document.getElementById('codex-results');
  codexElements.loadMore = document.getElementById('codex-load-more');
  codexElements.error = document.getElementById('codex-error');
  codexElements.totalCount = document.getElementById('codex-total-count');
  codexElements.ruleCount = document.getElementById('codex-rule-count');
  codexElements.spellCount = document.getElementById('codex-spell-count');
  codexElements.itemCount = document.getElementById('codex-item-count');
  codexElements.equipmentCount = document.getElementById('codex-equipment-count');
  codexElements.ruleFields = Array.from(document.querySelectorAll('[data-rule-filter]'));
  codexElements.equipmentFields = Array.from(document.querySelectorAll('[data-equipment-filter]'));
  codexElements.spellFields = Array.from(document.querySelectorAll('[data-spell-filter]'));
  codexElements.itemFields = Array.from(document.querySelectorAll('[data-item-filter]'));
}

function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-CA');
}

function createSearchIndex(entry) {
  const searchableParts = [
    entry.name,
    entry.title,
    entry.edition,
    entry.editionName,
    entry.source,
    entry.meta,
    entry.description,
    entry.summary,
    entry.whatItMeans,
    entry.whyItMatters,
    entry.categoryName,
    ...(entry.whatItAffects || []),
    ...(entry.bestFor || []),
    ...(entry.commonMistakes || []),
    entry.subcategory,
    ...(entry.tags || []),
    ...((entry.facts || []).flatMap((fact) => [fact.label, fact.value])),
  ];

  if (entry.entryType === 'spell') {
    searchableParts.push(
      entry.school,
      entry.castingTime,
      entry.range,
      entry.components,
      entry.duration,
      ...(entry.classes || [])
    );
  }

  if (entry.entryType === 'equipment') {
    searchableParts.push(entry.category, entry.categoryName, entry.subcategory);
  }

  if (entry.entryType === 'item') {
    searchableParts.push(entry.category, ...(entry.rarities || []));
  }

  return normalizeSearchText(searchableParts.filter(Boolean).join(' '));
}

function localEntryKey(entry) {
  return [entry.edition, entry.entryType, entry.localId].join(':');
}

function compareCodexEntries(left, right) {
  const nameComparison = left.name.localeCompare(right.name, 'en-CA', {
    sensitivity: 'base',
    numeric: true,
  });

  if (nameComparison !== 0) {
    return nameComparison;
  }

  if (left.edition !== right.edition) {
    return left.edition.localeCompare(right.edition);
  }

  return left.entryType.localeCompare(right.entryType);
}

function populateGameSystems() {
  codexElements.game.replaceChildren();

  (codexState.manifest?.gameSystems || []).forEach((gameSystem) => {
    const option = document.createElement('option');
    option.value = gameSystem.id;
    option.textContent = gameSystem.name;
    codexElements.game.append(option);
  });
}

function populateEditions(gameSystem) {
  const previousValue = codexElements.edition.value;
  codexElements.edition.replaceChildren();

  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'All available editions';
  codexElements.edition.append(allOption);

  (gameSystem?.editions || []).forEach((edition) => {
    const option = document.createElement('option');
    option.value = edition.id;
    option.textContent = `${edition.name} / ${edition.source}`;
    codexElements.edition.append(option);
  });

  const allowed = Array.from(codexElements.edition.options).some((option) => option.value === previousValue);
  codexElements.edition.value = allowed ? previousValue : (gameSystem?.defaultEdition || 'all');
}

function populateCategories(select, categories, allLabel) {
  const previousValue = select.value;
  select.replaceChildren();

  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = allLabel;
  select.append(allOption);

  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    select.append(option);
  });

  const allowed = Array.from(select.options).some((option) => option.value === previousValue);
  select.value = allowed ? previousValue : 'all';
}

function populateRuleCategories(categories) {
  populateCategories(codexElements.category, categories, 'All rule categories');
}

function populateEquipmentCategories(categories) {
  populateCategories(codexElements.equipmentCategory, categories, 'All equipment categories');
}

async function loadGameSystem(gameSystemId) {
  const result = await window.MyRPGCodexData.loadEntries({
    gameSystem: gameSystemId,
    entryTypes: ['rule', 'equipment', 'spell', 'item'],
  });

  codexState.gameSystem = result.gameSystem;
  codexState.categories = result.categories;
  codexState.equipmentCategories = result.categoryGroups?.equipment || [];
  codexState.entries = result.entries
    .map((entry) => ({
      ...entry,
      name: entry.name || entry.title,
      searchIndex: createSearchIndex(entry),
    }))
    .sort(compareCodexEntries);

  codexState.byGlobalId.clear();
  codexState.byLocalKey.clear();

  codexState.entries.forEach((entry) => {
    codexState.byGlobalId.set(entry.globalId, entry);
    codexState.byLocalKey.set(localEntryKey(entry), entry);
  });

  populateEditions(result.gameSystem);
  populateRuleCategories(result.categories);
  populateEquipmentCategories(codexState.equipmentCategories);
  updateCollectionTotals(codexState.entries);
}

function updateCollectionTotals(entries) {
  const ruleCount = entries.filter((entry) => entry.entryType === 'rule').length;
  const equipmentCount = entries.filter((entry) => entry.entryType === 'equipment').length;
  const spellCount = entries.filter((entry) => entry.entryType === 'spell').length;
  const itemCount = entries.filter((entry) => entry.entryType === 'item').length;

  codexElements.totalCount.textContent = entries.length.toLocaleString('en-CA');
  codexElements.ruleCount.textContent = ruleCount.toLocaleString('en-CA');
  codexElements.equipmentCount.textContent = equipmentCount.toLocaleString('en-CA');
  codexElements.spellCount.textContent = spellCount.toLocaleString('en-CA');
  codexElements.itemCount.textContent = itemCount.toLocaleString('en-CA');
}

function getFilterValues() {
  return {
    search: normalizeSearchText(codexElements.search.value.trim()),
    game: codexElements.game.value,
    edition: codexElements.edition.value,
    type: codexElements.type.value,
    category: codexElements.category.value,
    equipmentCategory: codexElements.equipmentCategory.value,
    level: codexElements.level.value,
    school: codexElements.school.value,
    rarity: codexElements.rarity.value,
    attunement: codexElements.attunement.value,
  };
}

function entryMatchesFilters(entry, filters) {
  if (filters.search && !entry.searchIndex.includes(filters.search)) {
    return false;
  }

  if (filters.edition !== 'all' && entry.edition !== filters.edition) {
    return false;
  }

  if (filters.type !== 'all' && entry.entryType !== filters.type) {
    return false;
  }

  if (filters.category !== 'all') {
    if (entry.entryType !== 'rule' || entry.category !== filters.category) {
      return false;
    }
  }

  if (filters.equipmentCategory !== 'all') {
    if (entry.entryType !== 'equipment' || entry.category !== filters.equipmentCategory) {
      return false;
    }
  }

  if (filters.level !== 'all') {
    if (entry.entryType !== 'spell' || String(entry.level) !== filters.level) {
      return false;
    }
  }

  if (filters.school !== 'all') {
    if (entry.entryType !== 'spell' || entry.school !== filters.school) {
      return false;
    }
  }

  if (filters.rarity !== 'all') {
    if (entry.entryType !== 'item' || !(entry.rarities || []).includes(filters.rarity)) {
      return false;
    }
  }

  if (filters.attunement !== 'all') {
    if (entry.entryType !== 'item') {
      return false;
    }

    const requiresAttunement = filters.attunement === 'required';
    if (Boolean(entry.attunement) !== requiresAttunement) {
      return false;
    }
  }

  return true;
}

function setFieldGroupAvailability(fields, active) {
  fields.forEach((field) => {
    const select = field.querySelector('select');
    field.classList.toggle('is-inactive', !active);
    select.disabled = !active;

    if (!active) {
      select.value = 'all';
    }
  });
}

function updateFilterAvailability() {
  const selectedType = codexElements.type.value;

  setFieldGroupAvailability(
    codexElements.ruleFields,
    selectedType === 'all' || selectedType === 'rule'
  );
  setFieldGroupAvailability(
    codexElements.equipmentFields,
    selectedType === 'all' || selectedType === 'equipment'
  );
  setFieldGroupAvailability(
    codexElements.spellFields,
    selectedType === 'all' || selectedType === 'spell'
  );
  setFieldGroupAvailability(
    codexElements.itemFields,
    selectedType === 'all' || selectedType === 'item'
  );
}

function spellLevelLabel(level) {
  if (level === 0) {
    return 'Cantrip';
  }

  const suffix = level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th';
  return `${level}${suffix}-level spell`;
}

function entryTypeLabel(entryType) {
  if (entryType === 'rule') {
    return 'Rule';
  }

  if (entryType === 'equipment') {
    return 'Mundane equipment';
  }

  if (entryType === 'spell') {
    return 'Spell';
  }

  return 'Magic item';
}

function createBadge(text, className = '') {
  const badge = document.createElement('span');
  badge.className = `codex-badge ${className}`.trim();
  badge.textContent = text;
  return badge;
}

function createFact(label, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'codex-fact';

  const term = document.createElement('dt');
  term.textContent = label;

  const description = document.createElement('dd');
  description.textContent = value || 'Not specified';

  wrapper.append(term, description);
  return wrapper;
}

function createSpellFacts(entry) {
  const facts = document.createElement('dl');
  facts.className = 'codex-facts';

  facts.append(
    createFact('Level', spellLevelLabel(entry.level)),
    createFact('School', entry.school),
    createFact('Casting time', entry.castingTime),
    createFact('Range', entry.range),
    createFact('Components', entry.components),
    createFact('Duration', entry.duration)
  );

  if (entry.ritual) {
    facts.append(createFact('Ritual', 'Yes'));
  }

  if (Array.isArray(entry.classes) && entry.classes.length > 0) {
    facts.append(createFact('Classes', entry.classes.join(', ')));
  }

  return facts;
}

function createEquipmentFacts(entry) {
  const factsElement = document.createElement('dl');
  factsElement.className = 'codex-facts';

  factsElement.append(createFact('Category', entry.categoryName || entry.category));

  if (entry.subcategory) {
    factsElement.append(createFact('Type', entry.subcategory));
  }

  (entry.facts || []).forEach((fact) => {
    if (fact?.label && fact?.value) {
      factsElement.append(createFact(fact.label, fact.value));
    }
  });

  return factsElement;
}

function createItemFacts(entry) {
  const facts = document.createElement('dl');
  facts.className = 'codex-facts';

  facts.append(
    createFact('Category', entry.category),
    createFact('Rarity', (entry.rarities || []).join(', ')),
    createFact('Attunement', entry.attunement ? 'Required' : 'Not required')
  );

  return facts;
}

function appendTextSection(container, heading, text) {
  if (!text) {
    return;
  }

  const section = document.createElement('section');
  section.className = 'codex-rule-section';

  const title = document.createElement('h4');
  title.textContent = heading;

  const paragraph = document.createElement('p');
  paragraph.textContent = text;

  section.append(title, paragraph);
  container.append(section);
}

function appendListSection(container, heading, items) {
  if (!Array.isArray(items) || items.length === 0) {
    return;
  }

  const section = document.createElement('section');
  section.className = 'codex-rule-section';

  const title = document.createElement('h4');
  title.textContent = heading;

  const list = document.createElement('ul');
  items.forEach((item) => {
    const listItem = document.createElement('li');
    listItem.textContent = item;
    list.append(listItem);
  });

  section.append(title, list);
  container.append(section);
}

function createRelatedRules(entry) {
  const relatedEntries = (entry.related || [])
    .map((relatedId) => codexState.byLocalKey.get([entry.edition, 'rule', relatedId].join(':')))
    .filter(Boolean);

  if (relatedEntries.length === 0) {
    return null;
  }

  const section = document.createElement('section');
  section.className = 'codex-rule-section';

  const title = document.createElement('h4');
  title.textContent = 'Related topics';

  const links = document.createElement('div');
  links.className = 'codex-related-links';

  relatedEntries.forEach((relatedEntry) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.openEntry = relatedEntry.globalId;
    button.textContent = relatedEntry.title;
    links.append(button);
  });

  section.append(title, links);
  return section;
}

function createRuleBody(entry) {
  const fragment = document.createDocumentFragment();

  appendTextSection(fragment, 'What it means', entry.whatItMeans || entry.summary);
  appendListSection(fragment, 'What it affects', entry.whatItAffects);
  appendTextSection(fragment, 'Example in play', entry.exampleInPlay);
  appendTextSection(fragment, 'Why it matters', entry.whyItMatters);
  appendListSection(fragment, 'Common mistakes', entry.commonMistakes);
  appendListSection(fragment, 'Especially useful for', entry.bestFor);

  const related = createRelatedRules(entry);
  if (related) {
    fragment.append(related);
  }

  return fragment;
}

function createCodexEntry(entry) {
  const details = document.createElement('details');
  details.className = 'codex-entry';
  details.dataset.entryId = entry.globalId;

  const summary = document.createElement('summary');
  const titleWrapper = document.createElement('div');
  titleWrapper.className = 'codex-entry-title';

  const title = document.createElement('h3');
  title.textContent = entry.name;

  const badges = document.createElement('div');
  badges.className = 'codex-entry-meta';
  badges.append(
    createBadge(`${entry.edition} rules`, 'codex-badge-edition'),
    createBadge(
      entryTypeLabel(entry.entryType),
      `codex-badge-${entry.entryType}`
    )
  );

  if (entry.entryType === 'rule' || entry.entryType === 'equipment') {
    badges.append(createBadge(entry.categoryName));
  } else if (entry.entryType === 'spell') {
    badges.append(createBadge(spellLevelLabel(entry.level)));
  } else {
    badges.append(createBadge((entry.rarities || []).join(', ')));
  }

  badges.append(createBadge(entry.source));
  titleWrapper.append(title, badges);
  summary.append(titleWrapper);

  const body = document.createElement('div');
  body.className = 'codex-entry-body';

  if (entry.entryType === 'rule') {
    body.append(createRuleBody(entry));
  } else {
    if (entry.entryType === 'spell') {
      body.append(createSpellFacts(entry));
    } else if (entry.entryType === 'equipment') {
      body.append(createEquipmentFacts(entry));
    } else {
      body.append(createItemFacts(entry));
    }

    const description = document.createElement('p');
    description.className = 'codex-description';
    description.textContent = entry.description;
    body.append(description);
  }

  const sourceNote = document.createElement('p');
  sourceNote.className = 'codex-source-note';
  sourceNote.textContent = entry.entryType === 'rule'
    ? `Original My RPG Source explanation for ${entry.source} / ${entry.edition} rules.`
    : `${entry.source} / ${entry.edition} rules. Licensed under CC BY 4.0.`;

  body.append(sourceNote);
  details.append(summary, body);

  details.addEventListener('toggle', () => {
    if (details.open) {
      document.querySelectorAll('.codex-entry[open]').forEach((other) => {
        if (other !== details) {
          other.open = false;
        }
      });
      syncUrl(entry.globalId);
      document.title = `${entry.name} | Rules Codex | My RPG Source`;
    } else if (getUrlEntryId() === entry.globalId) {
      syncUrl(null);
      document.title = DEFAULT_PAGE_TITLE;
    }
  });

  return details;
}

function updateStatus(total, shown) {
  if (total === 0) {
    codexElements.status.textContent = 'No entries match the current filters.';
    return;
  }

  const entryWord = total === 1 ? 'entry' : 'entries';
  codexElements.status.textContent = `Showing ${shown.toLocaleString('en-CA')} of ${total.toLocaleString('en-CA')} ${entryWord}.`;
}

function renderResults() {
  const total = codexState.filteredEntries.length;
  const visibleEntries = codexState.filteredEntries.slice(0, codexState.visibleCount);
  const fragment = document.createDocumentFragment();

  codexElements.results.replaceChildren();

  if (visibleEntries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'codex-empty';
    empty.textContent = 'No Codex entries match those filters. Try a broader search.';
    codexElements.results.append(empty);
  } else {
    visibleEntries.forEach((entry) => {
      fragment.append(createCodexEntry(entry));
    });
    codexElements.results.append(fragment);
  }

  const shown = Math.min(visibleEntries.length, total);
  updateStatus(total, shown);

  codexElements.loadMore.hidden = shown >= total;
  if (!codexElements.loadMore.hidden) {
    const remaining = total - shown;
    codexElements.loadMore.textContent = `Load more entries (${remaining.toLocaleString('en-CA')} remaining)`;
  }

  openPendingEntry();
}

function applyFilters(options = {}) {
  const filters = getFilterValues();
  codexState.filteredEntries = codexState.entries.filter((entry) => entryMatchesFilters(entry, filters));

  if (!options.keepVisibleCount) {
    codexState.visibleCount = CODEX_PAGE_SIZE;
  }

  renderResults();

  if (!options.skipUrlSync) {
    syncUrl(options.entryId || null);
  }
}

function resetFilters() {
  codexElements.search.value = '';
  codexElements.edition.value = codexState.gameSystem?.defaultEdition || 'all';
  codexElements.type.value = 'all';
  codexElements.category.value = 'all';
  codexElements.equipmentCategory.value = 'all';
  codexElements.level.value = 'all';
  codexElements.school.value = 'all';
  codexElements.rarity.value = 'all';
  codexElements.attunement.value = 'all';
  codexState.pendingEntryId = null;
  document.title = DEFAULT_PAGE_TITLE;
  updateFilterAvailability();
  applyFilters({ skipUrlSync: true });
  syncUrl(null);
  codexElements.search.focus();
}

async function handleGameSystemChange() {
  try {
    setLoadingState('Loading the selected game system...');
    await loadGameSystem(codexElements.game.value);
    updateFilterAvailability();
    applyFilters({ skipUrlSync: true });
    syncUrl(null);
  } catch (error) {
    showCodexError(error);
  }
}

function handleFilterChange(event) {
  if (event.target === codexElements.game) {
    handleGameSystemChange();
    return;
  }

  if (event.target === codexElements.type) {
    updateFilterAvailability();
  }

  codexState.pendingEntryId = null;
  document.title = DEFAULT_PAGE_TITLE;
  applyFilters();
}

function handleSearchInput() {
  window.clearTimeout(codexState.searchTimer);
  codexState.searchTimer = window.setTimeout(() => {
    codexState.pendingEntryId = null;
    document.title = DEFAULT_PAGE_TITLE;
    applyFilters();
  }, CODEX_SEARCH_DELAY);
}

function loadMoreEntries() {
  codexState.visibleCount += CODEX_PAGE_SIZE;
  renderResults();
}

function bindCodexEvents() {
  codexElements.search.addEventListener('input', handleSearchInput);
  codexElements.form.addEventListener('change', handleFilterChange);
  codexElements.form.addEventListener('submit', (event) => event.preventDefault());
  codexElements.reset.addEventListener('click', resetFilters);
  codexElements.loadMore.addEventListener('click', loadMoreEntries);

  codexElements.results.addEventListener('click', (event) => {
    const button = event.target.closest('[data-open-entry]');
    if (!button) {
      return;
    }

    openEntryById(button.dataset.openEntry, { updateFilters: true, scroll: true });
  });

  window.addEventListener('popstate', () => {
    applyUrlState();
    applyFilters({ skipUrlSync: true });
  });
}

function setLoadingState(message) {
  codexElements.status.textContent = message;
  codexElements.results.replaceChildren();
  codexElements.loadMore.hidden = true;
  codexElements.error.hidden = true;
}

function showCodexError(error) {
  console.error('Unable to initialize the Rules Codex:', error);
  codexElements.status.textContent = 'The Codex could not be loaded.';
  codexElements.results.replaceChildren();
  codexElements.loadMore.hidden = true;
  codexElements.error.hidden = false;
}

function getUrlEntryId() {
  return new URLSearchParams(window.location.search).get('entry');
}

function setSelectFromUrl(select, value, fallback) {
  const allowed = Array.from(select.options).some((option) => option.value === value);
  select.value = allowed ? value : fallback;
}

function applyUrlState() {
  const params = new URLSearchParams(window.location.search);

  setSelectFromUrl(
    codexElements.edition,
    params.get('edition'),
    codexState.gameSystem?.defaultEdition || 'all'
  );
  setSelectFromUrl(codexElements.type, params.get('type'), 'all');
  setSelectFromUrl(codexElements.category, params.get('category'), 'all');
  setSelectFromUrl(codexElements.equipmentCategory, params.get('equipmentCategory'), 'all');
  setSelectFromUrl(codexElements.level, params.get('level'), 'all');
  setSelectFromUrl(codexElements.school, params.get('school'), 'all');
  setSelectFromUrl(codexElements.rarity, params.get('rarity'), 'all');
  setSelectFromUrl(codexElements.attunement, params.get('attunement'), 'all');
  codexElements.search.value = params.get('q') || '';
  codexState.pendingEntryId = params.get('entry');
  updateFilterAvailability();
}

function syncUrl(entryId = null) {
  const filters = getFilterValues();
  const params = new URLSearchParams();

  params.set('game', filters.game);
  params.set('edition', filters.edition);
  params.set('type', filters.type);

  if (filters.search) {
    params.set('q', codexElements.search.value.trim());
  }
  if (filters.category !== 'all') {
    params.set('category', filters.category);
  }
  if (filters.equipmentCategory !== 'all') {
    params.set('equipmentCategory', filters.equipmentCategory);
  }
  if (filters.level !== 'all') {
    params.set('level', filters.level);
  }
  if (filters.school !== 'all') {
    params.set('school', filters.school);
  }
  if (filters.rarity !== 'all') {
    params.set('rarity', filters.rarity);
  }
  if (filters.attunement !== 'all') {
    params.set('attunement', filters.attunement);
  }
  if (entryId) {
    params.set('entry', entryId);
  }

  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', nextUrl);
}

function prepareFiltersForEntry(entry) {
  codexElements.edition.value = entry.edition;
  codexElements.type.value = entry.entryType;
  codexElements.search.value = '';
  codexElements.category.value = 'all';
  codexElements.equipmentCategory.value = 'all';
  codexElements.level.value = 'all';
  codexElements.school.value = 'all';
  codexElements.rarity.value = 'all';
  codexElements.attunement.value = 'all';
  updateFilterAvailability();
}

function openEntryById(entryId, options = {}) {
  const entry = codexState.byGlobalId.get(entryId);
  if (!entry) {
    return false;
  }

  if (options.updateFilters) {
    prepareFiltersForEntry(entry);
    codexState.pendingEntryId = entry.globalId;
    applyFilters({ skipUrlSync: true });
  }

  const index = codexState.filteredEntries.findIndex((candidate) => candidate.globalId === entry.globalId);
  if (index < 0) {
    return false;
  }

  if (index >= codexState.visibleCount) {
    codexState.visibleCount = Math.ceil((index + 1) / CODEX_PAGE_SIZE) * CODEX_PAGE_SIZE;
    renderResults();
    return true;
  }

  const details = codexElements.results.querySelector(`[data-entry-id="${CSS.escape(entry.globalId)}"]`);
  if (!details) {
    return false;
  }

  details.open = true;
  codexState.pendingEntryId = null;
  syncUrl(entry.globalId);
  document.title = `${entry.name} | Rules Codex | My RPG Source`;

  if (options.scroll) {
    details.scrollIntoView({ behavior: 'smooth', block: 'start' });
    details.querySelector('summary')?.focus({ preventScroll: true });
  }

  return true;
}

function openPendingEntry() {
  if (!codexState.pendingEntryId) {
    return;
  }

  openEntryById(codexState.pendingEntryId, { updateFilters: false, scroll: true });
}

function deriveInitialGameSystemId() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('game');
  const exists = (codexState.manifest?.gameSystems || []).some((system) => system.id === requested);
  return exists ? requested : codexState.manifest.defaultGameSystem;
}

async function initializeCodexPage() {
  cacheCodexElements();
  bindCodexEvents();
  setLoadingState('Loading the Codex...');

  try {
    if (!window.MyRPGCodexData) {
      throw new Error('The shared Codex data layer did not load.');
    }

    codexState.manifest = await window.MyRPGCodexData.loadManifest();
    populateGameSystems();

    const gameSystemId = deriveInitialGameSystemId();
    codexElements.game.value = gameSystemId;
    await loadGameSystem(gameSystemId);
    applyUrlState();
    codexElements.error.hidden = true;
    applyFilters({ skipUrlSync: true });
    syncUrl(getUrlEntryId());
  } catch (error) {
    showCodexError(error);
  }
}

initializeCodexPage();
