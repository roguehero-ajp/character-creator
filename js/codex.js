/**
 * My RPG Source - Rules Codex
 * ---------------------------
 * Loads data/codex.json, filters edition-specific material,
 * provides search/category navigation, clickable related topics,
 * and adds an Open Codex button to the control panel.
 */

(() => {
  'use strict';

  const edition =
    window.MyRPGConfig?.edition ||
    '2024';

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
    activeId: null
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

  function createDrawer() {
    const overlay =
      document.createElement('div');

    overlay.className =
      'codex-overlay';

    const drawer =
      document.createElement('aside');

    drawer.className =
      'codex-drawer';

    drawer.setAttribute(
      'aria-label',
      'Rules Codex'
    );

    drawer.innerHTML = `
      <div class="codex-header">
        <div>
          <h2 class="codex-title">Rules Codex</h2>
          <div class="codex-edition">D&amp;D 5e ${escapeHtml(edition)}</div>
        </div>

        <button
          class="codex-close"
          type="button"
          aria-label="Close Codex"
        >×</button>
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

      <div class="codex-result-count"></div>

      <div class="codex-body">
        <div class="codex-list"></div>
        <article class="codex-reading"></article>
      </div>
    `;

    document.body.appendChild(
      overlay
    );

    document.body.appendChild(
      drawer
    );

    state.overlay =
      overlay;

    state.drawer =
      drawer;

    state.list =
      drawer.querySelector(
        '.codex-list'
      );

    state.reading =
      drawer.querySelector(
        '.codex-reading'
      );

    state.search =
      drawer.querySelector(
        '.codex-search'
      );

    state.category =
      drawer.querySelector(
        '.codex-category'
      );

    state.count =
      drawer.querySelector(
        '.codex-result-count'
      );

    overlay.addEventListener(
      'click',
      closeCodex
    );

    drawer
      .querySelector(
        '.codex-close'
      )
      .addEventListener(
        'click',
        closeCodex
      );

    state.search.addEventListener(
      'input',
      renderList
    );

    state.category.addEventListener(
      'change',
      renderList
    );

    document.addEventListener(
      'keydown',
      (event) => {
        if (
          event.key ===
          'Escape'
        ) {
          closeCodex();
        }

        if (
          event.altKey &&
          event.key
            .toLowerCase() ===
            'c'
        ) {
          event.preventDefault();
          openCodex();
        }
      }
    );
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
        `Could not load codex.json (${response.status}).`
      );
    }

    state.data =
      await response.json();

    state.entries =
      (
        Array.isArray(
          state.data?.entries
        )
          ? state.data.entries
          : []
      ).filter(
        isAvailable
      );

    state.byId.clear();

    state.entries.forEach(
      (entry) =>
        state.byId.set(
          entry.id,
          entry
        )
    );
  }

  function getFilteredEntries() {
    const query =
      normalize(
        state.search?.value
      );

    const category =
      state.category?.value ||
      'all';

    return state.entries.filter(
      (entry) => {
        const categoryMatch =
          category ===
            'all' ||
          entry.category ===
            category;

        const haystack =
          normalize(
            [
              entry.title,
              entry.summary,
              entry.whatItMeans,
              entry.whyItMatters,
              ...(entry.whatItAffects || []),
              ...(entry.bestFor || []),
              ...(entry.tags || [])
            ].join(' ')
          );

        return (
          categoryMatch &&
          (
            !query ||
            haystack.includes(
              query
            )
          )
        );
      }
    );
  }

  function renderCategoryOptions() {
    const used =
      new Set(
        state.entries.map(
          (entry) =>
            entry.category
        )
      );

    state.category.innerHTML =
      '<option value="all">All Categories</option>';

    (
      state.data?.categories ||
      []
    )
      .filter(
        (category) =>
          used.has(
            category.id
          )
      )
      .forEach(
        (category) => {
          const option =
            document.createElement(
              'option'
            );

          option.value =
            category.id;

          option.textContent =
            category.name;

          state.category.appendChild(
            option
          );
        }
      );
  }

  function renderList() {
    const entries =
      getFilteredEntries();

    state.list.replaceChildren();

    state.count.textContent =
      `${entries.length} ${
        entries.length === 1
          ? 'topic'
          : 'topics'
      }`;

    if (
      entries.length === 0
    ) {
      state.list.innerHTML =
        '<p class="codex-empty">No matches found.</p>';

      state.reading.innerHTML =
        '<p class="codex-empty">Try another search or category.</p>';

      return;
    }

    entries.forEach(
      (entry) => {
        const button =
          document.createElement(
            'button'
          );

        button.type =
          'button';

        button.className =
          entry.id ===
            state.activeId
            ? 'active'
            : '';

        button.textContent =
          entry.title;

        button.addEventListener(
          'click',
          () =>
            showEntry(
              entry.id
            )
        );

        state.list.appendChild(
          button
        );
      }
    );

    if (
      !state.activeId ||
      !entries.some(
        (entry) =>
          entry.id ===
          state.activeId
      )
    ) {
      showEntry(
        entries[0].id,
        false
      );
    }
  }

  function getRelatedEntry(id) {
    return (
      state.byId.get(id) ||
      null
    );
  }

  function buildRelatedHtml(entry) {
    const related =
      Array.isArray(entry.related)
        ? entry.related
            .map(getRelatedEntry)
            .filter(Boolean)
        : [];

    if (
      related.length === 0
    ) {
      return '';
    }

    return `
      <div class="codex-section-title">Related Topics</div>
      <div class="codex-related">
        ${
          related
            .map(
              (relatedEntry) => `
                <button
                  type="button"
                  data-related-id="${escapeHtml(relatedEntry.id)}"
                >
                  ${escapeHtml(relatedEntry.title)}
                </button>
              `
            )
            .join('')
        }
      </div>
    `;
  }

  function showEntry(
    id,
    refreshList = true
  ) {
    const entry =
      state.byId.get(id);

    if (!entry) {
      return;
    }

    state.activeId =
      id;

    const editionText =
      Array.isArray(entry.editions)
        ? entry.editions.join(' / ')
        : '2014 / 2024';

    state.reading.innerHTML = `
      <h3>${escapeHtml(entry.title)}</h3>

      <div class="codex-subtitle">
        ${escapeHtml(entry.categoryName || '')}
        <span>•</span>
        ${escapeHtml(editionText)}
      </div>

      ${
        entry.whatItMeans
          ? `<p><strong>What it means:</strong> ${escapeHtml(entry.whatItMeans)}</p>`
          : ''
      }

      ${
        Array.isArray(
          entry.whatItAffects
        ) &&
        entry.whatItAffects.length
          ? `
            <div class="codex-section-title">What it affects</div>
            <ul>
              ${
                entry.whatItAffects
                  .map(
                    (item) =>
                      `<li>${escapeHtml(item)}</li>`
                  )
                  .join('')
              }
            </ul>
          `
          : ''
      }

      ${
        entry.exampleInPlay
          ? `<p><strong>Example in play:</strong> ${escapeHtml(entry.exampleInPlay)}</p>`
          : ''
      }

      ${
        entry.whyItMatters
          ? `<p><strong>Why it matters:</strong> ${escapeHtml(entry.whyItMatters)}</p>`
          : ''
      }

      ${
        Array.isArray(
          entry.bestFor
        ) &&
        entry.bestFor.length
          ? `
            <div class="codex-section-title">Especially useful for</div>
            <ul>
              ${
                entry.bestFor
                  .map(
                    (item) =>
                      `<li>${escapeHtml(item)}</li>`
                  )
                  .join('')
              }
            </ul>
          `
          : ''
      }

      ${buildRelatedHtml(entry)}
    `;

    state.reading
      .querySelectorAll(
        '[data-related-id]'
      )
      .forEach(
        (button) => {
          button.addEventListener(
            'click',
            () =>
              showEntry(
                button.dataset
                  .relatedId
              )
          );
        }
      );

    if (refreshList) {
      renderList();
    }
  }

  function openCodex(entryId) {
    if (
      entryId &&
      state.byId.has(
        entryId
      )
    ) {
      showEntry(
        entryId
      );
    }

    state.overlay.classList.add(
      'visible'
    );

    state.drawer.classList.add(
      'open'
    );

    document.body.style.overflow =
      'hidden';

    window.setTimeout(
      () =>
        state.search?.focus(),
      100
    );
  }

  function closeCodex() {
    state.overlay?.classList.remove(
      'visible'
    );

    state.drawer?.classList.remove(
      'open'
    );

    document.body.style.overflow =
      '';
  }

  function addGlobalLauncher() {
    const controls =
      document.querySelector(
        '.controls'
      );

    if (
      !controls ||
      document.getElementById(
        'open-codex-btn'
      )
    ) {
      return;
    }

    const separator =
      document.createElement(
        'hr'
      );

    separator.className =
      'codex-control-separator';

    const button =
      document.createElement(
        'button'
      );

    button.type =
      'button';

    button.id =
      'open-codex-btn';

    button.className =
      'ghost';

    button.textContent =
      'Open Rules Codex';

    button.title =
      'Open the searchable rules library (Alt+C)';

    button.addEventListener(
      'click',
      () => openCodex()
    );

    const printButton =
      document.getElementById(
        'print-blank-btn'
      );

    if (printButton) {
      controls.insertBefore(
        separator,
        printButton
      );

      controls.insertBefore(
        button,
        printButton
      );
    } else {
      controls.append(
        separator,
        button
      );
    }
  }

  function addAbilityButtons() {
    const abilityMap = {
      str: 'strength',
      dex: 'dexterity',
      con: 'constitution',
      int: 'intelligence',
      wis: 'wisdom',
      cha: 'charisma'
    };

    document
      .querySelectorAll(
        '.stats-grid .stat-row'
      )
      .forEach(
        (row) => {
          const scoreInput =
            row.querySelector(
              '.stat-val'
            );

          const statGroup =
            row.querySelector(
              '.stat-group'
            );

          const entryId =
            abilityMap[
              scoreInput?.id
            ];

          if (
            !entryId ||
            !statGroup ||
            statGroup.querySelector(
              '.codex-info-btn'
            )
          ) {
            return;
          }

          const entry =
            state.byId.get(
              entryId
            );

          if (!entry) {
            return;
          }

          const button =
            document.createElement(
              'button'
            );

          button.type =
            'button';

          button.className =
            'codex-info-btn';

          button.textContent =
            'Codex';

          button.title =
            `Open ${entry.title} in the Codex`;

          button.setAttribute(
            'aria-label',
            `Open ${entry.title} in the Codex`
          );

          button.addEventListener(
            'click',
            (event) => {
              event.preventDefault();
              event.stopPropagation();

              openCodex(
                entryId
              );
            }
          );

          statGroup.appendChild(
            button
          );
        }
      );
  }

  async function init() {
    try {
      createDrawer();
      await loadData();
      renderCategoryOptions();
      renderList();
      addGlobalLauncher();
      addAbilityButtons();

      document.addEventListener(
        'knowledge:ready',
        addAbilityButtons
      );

      document.dispatchEvent(
        new CustomEvent(
          'codex:ready',
          {
            detail: {
              edition,
              count:
                state.entries.length
            }
          }
        )
      );
    } catch (error) {
      console.error(
        'Codex failed to initialize:',
        error
      );
    }
  }

  window.CharacterCodex =
    Object.freeze({
      open:
        openCodex,

      close:
        closeCodex,

      showEntry,

      get count() {
        return state.entries.length;
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
