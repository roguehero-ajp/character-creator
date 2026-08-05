/**
 * My RPG Source - In-Builder Rules Codex
 * --------------------------------------
 * Loads only the active D&D edition's core rules through the shared Codex data
 * layer. The much larger spell and magic-item collections remain on codex.html
 * so the character builder stays lightweight.
 */

(() => {
  'use strict';

  const gameSystem = 'dnd5e';
  const edition = window.MyRPGConfig?.edition || '2024';

  const state = {
    data: null,
    entries: [],
    byId: new Map(),
    overlay: null,
    drawer: null,
    list: null,
    reading: null,
    search: null,
    category: null,
    count: null,
    fullLink: null,
    activeId: null,
    lastFocused: null,
  };

  function normalize(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
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

  function createFullCodexUrl(entry = null) {
    const params = new URLSearchParams({
      game: gameSystem,
      edition,
      type: 'rule',
    });

    if (entry?.globalId) {
      params.set('entry', entry.globalId);
    }

    return `codex.html?${params.toString()}`;
  }

  function createDrawer() {
    const overlay = document.createElement('div');
    overlay.className = 'codex-overlay';

    const drawer = document.createElement('aside');
    drawer.className = 'codex-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Rules Codex');

    drawer.innerHTML = `
      <div class="codex-header">
        <div>
          <h2 class="codex-title">Rules Codex</h2>
          <div class="codex-edition">D&amp;D 5e ${escapeHtml(edition)}</div>
        </div>

        <div class="codex-header-actions">
          <a class="codex-full-link" href="${escapeHtml(createFullCodexUrl())}">
            Full Codex
          </a>
          <button
            class="codex-close"
            type="button"
            aria-label="Close Codex"
          >×</button>
        </div>
      </div>

      <div class="codex-toolbar">
        <input
          class="codex-search"
          type="search"
          placeholder="Search rules..."
          aria-label="Search the Codex"
        >

        <select
          class="codex-category"
          aria-label="Filter Codex category"
        >
          <option value="all">All Categories</option>
        </select>
      </div>

      <div class="codex-result-count" aria-live="polite"></div>

      <div class="codex-body">
        <div class="codex-list"></div>
        <article class="codex-reading"></article>
      </div>
    `;

    document.body.append(overlay, drawer);

    state.overlay = overlay;
    state.drawer = drawer;
    state.list = drawer.querySelector('.codex-list');
    state.reading = drawer.querySelector('.codex-reading');
    state.search = drawer.querySelector('.codex-search');
    state.category = drawer.querySelector('.codex-category');
    state.count = drawer.querySelector('.codex-result-count');
    state.fullLink = drawer.querySelector('.codex-full-link');

    overlay.addEventListener('click', closeCodex);
    drawer.querySelector('.codex-close').addEventListener('click', closeCodex);
    state.search.addEventListener('input', renderList);
    state.category.addEventListener('change', renderList);

    document.addEventListener('keydown', handleDocumentKeydown);
  }

  function handleDocumentKeydown(event) {
    if (event.key === 'Escape' && state.drawer?.classList.contains('open')) {
      closeCodex();
      return;
    }

    if (event.altKey && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      openCodex();
    }
  }

  async function loadData() {
    if (!window.MyRPGCodexData) {
      throw new Error('The shared Codex data layer did not load.');
    }

    const result = await window.MyRPGCodexData.loadEntries({
      gameSystem,
      editions: [edition],
      entryTypes: ['rule'],
    });

    state.data = result;
    state.entries = result.entries;
    state.byId.clear();

    state.entries.forEach((entry) => {
      state.byId.set(entry.localId || entry.id, entry);
      state.byId.set(entry.globalId, entry);
    });
  }

  function getFilteredEntries() {
    const query = normalize(state.search?.value);
    const category = state.category?.value || 'all';

    return state.entries.filter((entry) => {
      const categoryMatch = category === 'all' || entry.category === category;
      const haystack = normalize([
        entry.title,
        entry.summary,
        entry.whatItMeans,
        entry.whyItMatters,
        ...(entry.whatItAffects || []),
        ...(entry.bestFor || []),
        ...(entry.commonMistakes || []),
        ...(entry.tags || []),
      ].join(' '));

      return categoryMatch && (!query || haystack.includes(query));
    });
  }

  function renderCategoryOptions() {
    const used = new Set(state.entries.map((entry) => entry.category));
    state.category.replaceChildren();

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All Categories';
    state.category.append(allOption);

    (state.data?.categories || [])
      .filter((category) => used.has(category.id))
      .forEach((category) => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        state.category.append(option);
      });
  }

  function renderList() {
    const entries = getFilteredEntries();
    const fragment = document.createDocumentFragment();

    state.list.replaceChildren();
    state.count.textContent = `${entries.length} ${entries.length === 1 ? 'topic' : 'topics'}`;

    if (entries.length === 0) {
      const emptyList = document.createElement('p');
      emptyList.className = 'codex-empty';
      emptyList.textContent = 'No matches found.';

      const emptyReading = document.createElement('p');
      emptyReading.className = 'codex-empty';
      emptyReading.textContent = 'Try another search or category.';

      state.list.append(emptyList);
      state.reading.replaceChildren(emptyReading);
      return;
    }

    entries.forEach((entry) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = entry.localId === state.activeId ? 'active' : '';
      button.textContent = entry.title;
      button.addEventListener('click', () => showEntry(entry.localId));
      fragment.append(button);
    });

    state.list.append(fragment);

    if (!state.activeId || !entries.some((entry) => entry.localId === state.activeId)) {
      showEntry(entries[0].localId, false);
    }
  }

  function getRelatedEntry(id) {
    return state.byId.get(id) || null;
  }

  function buildListSection(title, items) {
    if (!Array.isArray(items) || items.length === 0) {
      return '';
    }

    return `
      <div class="codex-section-title">${escapeHtml(title)}</div>
      <ul>
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    `;
  }

  function buildRelatedHtml(entry) {
    const related = Array.isArray(entry.related)
      ? entry.related.map(getRelatedEntry).filter(Boolean)
      : [];

    if (related.length === 0) {
      return '';
    }

    return `
      <div class="codex-section-title">Related Topics</div>
      <div class="codex-related">
        ${related.map((relatedEntry) => `
          <button type="button" data-related-id="${escapeHtml(relatedEntry.localId)}">
            ${escapeHtml(relatedEntry.title)}
          </button>
        `).join('')}
      </div>
    `;
  }

  function showEntry(id, refreshList = true) {
    const entry = state.byId.get(id);

    if (!entry) {
      return;
    }

    state.activeId = entry.localId;
    state.fullLink.href = createFullCodexUrl(entry);

    state.reading.innerHTML = `
      <h3>${escapeHtml(entry.title)}</h3>

      <div class="codex-subtitle">
        ${escapeHtml(entry.categoryName || '')}
        <span>•</span>
        ${escapeHtml(entry.editionName || `${edition} rules`)}
      </div>

      ${entry.whatItMeans
        ? `<p><strong>What it means:</strong> ${escapeHtml(entry.whatItMeans)}</p>`
        : ''}

      ${buildListSection('What it affects', entry.whatItAffects)}

      ${entry.exampleInPlay
        ? `<p><strong>Example in play:</strong> ${escapeHtml(entry.exampleInPlay)}</p>`
        : ''}

      ${entry.whyItMatters
        ? `<p><strong>Why it matters:</strong> ${escapeHtml(entry.whyItMatters)}</p>`
        : ''}

      ${buildListSection('Common mistakes', entry.commonMistakes)}
      ${buildListSection('Especially useful for', entry.bestFor)}
      ${buildRelatedHtml(entry)}
    `;

    state.reading.querySelectorAll('[data-related-id]').forEach((button) => {
      button.addEventListener('click', () => showEntry(button.dataset.relatedId));
    });

    if (refreshList) {
      renderList();
    }
  }

  function openCodex(entryId) {
    if (entryId && state.byId.has(entryId)) {
      showEntry(entryId);
    }

    state.lastFocused = document.activeElement;
    state.overlay.classList.add('visible');
    state.drawer.classList.add('open');
    document.body.style.overflow = 'hidden';

    window.setTimeout(() => state.search?.focus(), 100);
  }

  function closeCodex() {
    if (!state.drawer?.classList.contains('open')) {
      return;
    }

    state.overlay.classList.remove('visible');
    state.drawer.classList.remove('open');
    document.body.style.overflow = '';

    if (state.lastFocused instanceof HTMLElement) {
      state.lastFocused.focus();
    }
  }

  function addGlobalLauncher() {
    const controls = document.querySelector('.controls');

    if (!controls || document.getElementById('open-codex-btn')) {
      return;
    }

    const separator = document.createElement('hr');
    separator.className = 'codex-control-separator';

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'open-codex-btn';
    button.className = 'ghost';
    button.textContent = 'Open Rules Codex';
    button.title = 'Open the searchable rules library (Alt+C)';
    button.addEventListener('click', () => openCodex());

    const printButton = document.getElementById('print-blank-btn');

    if (printButton) {
      controls.insertBefore(separator, printButton);
      controls.insertBefore(button, printButton);
    } else {
      controls.append(separator, button);
    }
  }

  function addAbilityButtons() {
    const abilityMap = {
      str: 'strength',
      dex: 'dexterity',
      con: 'constitution',
      int: 'intelligence',
      wis: 'wisdom',
      cha: 'charisma',
    };

    document.querySelectorAll('.stats-grid .stat-row').forEach((row) => {
      const scoreInput = row.querySelector('.stat-val');
      const statGroup = row.querySelector('.stat-group');
      const entryId = abilityMap[scoreInput?.id];

      if (!entryId || !statGroup || statGroup.querySelector('.codex-info-btn')) {
        return;
      }

      const entry = state.byId.get(entryId);

      if (!entry) {
        return;
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'codex-info-btn';
      button.textContent = 'Codex';
      button.title = `Open ${entry.title} in the Codex`;
      button.setAttribute('aria-label', `Open ${entry.title} in the Codex`);
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openCodex(entryId);
      });

      statGroup.append(button);
    });
  }

  async function init() {
    try {
      createDrawer();
      await loadData();
      renderCategoryOptions();
      renderList();
      addGlobalLauncher();
      addAbilityButtons();

      document.addEventListener('knowledge:ready', addAbilityButtons);

      document.dispatchEvent(new CustomEvent('codex:ready', {
        detail: {
          gameSystem,
          edition,
          count: state.entries.length,
        },
      }));
    } catch (error) {
      console.error('Codex failed to initialize:', error);
    }
  }

  window.CharacterCodex = Object.freeze({
    open: openCodex,
    close: closeCodex,
    showEntry,
    get count() {
      return state.entries.length;
    },
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
