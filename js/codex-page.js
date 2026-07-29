/**
 * My RPG Source
 * Standalone SRD Spells & Magic Items Codex
 *
 * Loads licensed SRD data from data/srd-codex.json and renders it with
 * one-time event listeners. No MutationObserver is used.
 */

"use strict";

const CODEX_DATA_URL = "data/srd-codex.json";
const CODEX_PAGE_SIZE = 48;

const codexState = {
  entries: [],
  filteredEntries: [],
  visibleCount: CODEX_PAGE_SIZE,
};

const codexElements = {};

function cacheCodexElements() {
  codexElements.form = document.getElementById("codex-filter-form");
  codexElements.search = document.getElementById("codex-search");
  codexElements.edition = document.getElementById("codex-edition");
  codexElements.type = document.getElementById("codex-type");
  codexElements.level = document.getElementById("codex-level");
  codexElements.school = document.getElementById("codex-school");
  codexElements.rarity = document.getElementById("codex-rarity");
  codexElements.attunement = document.getElementById("codex-attunement");
  codexElements.reset = document.getElementById("codex-reset");
  codexElements.status = document.getElementById("codex-status");
  codexElements.results = document.getElementById("codex-results");
  codexElements.loadMore = document.getElementById("codex-load-more");
  codexElements.error = document.getElementById("codex-error");
  codexElements.totalCount = document.getElementById("codex-total-count");
  codexElements.spellCount = document.getElementById("codex-spell-count");
  codexElements.itemCount = document.getElementById("codex-item-count");
  codexElements.editionCount = document.getElementById("codex-edition-count");
  codexElements.spellFields = Array.from(document.querySelectorAll("[data-spell-filter]"));
  codexElements.itemFields = Array.from(document.querySelectorAll("[data-item-filter]"));
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-CA");
}

function createSearchIndex(entry) {
  const searchableParts = [
    entry.name,
    entry.edition,
    entry.source,
    entry.meta,
    entry.description,
  ];

  if (entry.type === "spell") {
    searchableParts.push(
      entry.school,
      entry.castingTime,
      entry.range,
      entry.components,
      entry.duration,
      ...(entry.classes || [])
    );
  } else {
    searchableParts.push(entry.category, ...(entry.rarities || []));
  }

  return normalizeSearchText(searchableParts.filter(Boolean).join(" "));
}

function validateCodexPayload(payload) {
  if (!payload || !Array.isArray(payload.entries)) {
    throw new Error("The Codex data file does not contain an entries array.");
  }

  return payload.entries.filter((entry) => {
    return (
      entry &&
      typeof entry.id === "string" &&
      (entry.type === "spell" || entry.type === "item") &&
      (entry.edition === "2014" || entry.edition === "2024") &&
      typeof entry.name === "string" &&
      typeof entry.description === "string"
    );
  });
}

function updateCollectionTotals(entries) {
  const spellCount = entries.filter((entry) => entry.type === "spell").length;
  const itemCount = entries.filter((entry) => entry.type === "item").length;
  const editionCount = new Set(entries.map((entry) => entry.edition)).size;

  codexElements.totalCount.textContent = entries.length.toLocaleString("en-CA");
  codexElements.spellCount.textContent = spellCount.toLocaleString("en-CA");
  codexElements.itemCount.textContent = itemCount.toLocaleString("en-CA");
  codexElements.editionCount.textContent = editionCount.toLocaleString("en-CA");
}

function compareCodexEntries(left, right) {
  const nameComparison = left.name.localeCompare(right.name, "en-CA", {
    sensitivity: "base",
    numeric: true,
  });

  if (nameComparison !== 0) {
    return nameComparison;
  }

  if (left.edition !== right.edition) {
    return left.edition.localeCompare(right.edition);
  }

  return left.type.localeCompare(right.type);
}

async function loadCodexData() {
  const response = await fetch(CODEX_DATA_URL, { cache: "no-cache" });

  if (!response.ok) {
    throw new Error(`Codex data request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const entries = validateCodexPayload(payload);

  return entries
    .map((entry) => ({
      ...entry,
      searchIndex: createSearchIndex(entry),
    }))
    .sort(compareCodexEntries);
}

function getFilterValues() {
  return {
    search: normalizeSearchText(codexElements.search.value.trim()),
    edition: codexElements.edition.value,
    type: codexElements.type.value,
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

  if (filters.edition !== "all" && entry.edition !== filters.edition) {
    return false;
  }

  if (filters.type !== "all" && entry.type !== filters.type) {
    return false;
  }

  if (filters.level !== "all") {
    if (entry.type !== "spell" || String(entry.level) !== filters.level) {
      return false;
    }
  }

  if (filters.school !== "all") {
    if (entry.type !== "spell" || entry.school !== filters.school) {
      return false;
    }
  }

  if (filters.rarity !== "all") {
    if (entry.type !== "item" || !(entry.rarities || []).includes(filters.rarity)) {
      return false;
    }
  }

  if (filters.attunement !== "all") {
    if (entry.type !== "item") {
      return false;
    }

    const requiresAttunement = filters.attunement === "required";
    if (Boolean(entry.attunement) !== requiresAttunement) {
      return false;
    }
  }

  return true;
}

function updateFilterAvailability() {
  const selectedType = codexElements.type.value;
  const spellOnly = selectedType === "spell";
  const itemOnly = selectedType === "item";

  codexElements.spellFields.forEach((field) => {
    const select = field.querySelector("select");
    const inactive = itemOnly;

    field.classList.toggle("is-inactive", inactive);
    select.disabled = inactive;

    if (inactive) {
      select.value = "all";
    }
  });

  codexElements.itemFields.forEach((field) => {
    const select = field.querySelector("select");
    const inactive = spellOnly;

    field.classList.toggle("is-inactive", inactive);
    select.disabled = inactive;

    if (inactive) {
      select.value = "all";
    }
  });
}

function spellLevelLabel(level) {
  if (level === 0) {
    return "Cantrip";
  }

  const suffix = level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th";
  return `${level}${suffix}-level spell`;
}

function createBadge(text, className = "") {
  const badge = document.createElement("span");
  badge.className = `codex-badge ${className}`.trim();
  badge.textContent = text;
  return badge;
}

function createFact(label, value) {
  const wrapper = document.createElement("div");
  wrapper.className = "codex-fact";

  const term = document.createElement("dt");
  term.textContent = label;

  const description = document.createElement("dd");
  description.textContent = value || "Not specified";

  wrapper.append(term, description);
  return wrapper;
}

function createSpellFacts(entry) {
  const facts = document.createElement("dl");
  facts.className = "codex-facts";

  facts.append(
    createFact("Level", spellLevelLabel(entry.level)),
    createFact("School", entry.school),
    createFact("Casting time", entry.castingTime),
    createFact("Range", entry.range),
    createFact("Components", entry.components),
    createFact("Duration", entry.duration)
  );

  if (entry.ritual) {
    facts.append(createFact("Ritual", "Yes"));
  }

  if (Array.isArray(entry.classes) && entry.classes.length > 0) {
    facts.append(createFact("Classes", entry.classes.join(", ")));
  }

  return facts;
}

function createItemFacts(entry) {
  const facts = document.createElement("dl");
  facts.className = "codex-facts";

  facts.append(
    createFact("Category", entry.category),
    createFact("Rarity", (entry.rarities || []).join(", ")),
    createFact("Attunement", entry.attunement ? "Required" : "Not required")
  );

  return facts;
}

function createCodexEntry(entry) {
  const details = document.createElement("details");
  details.className = "codex-entry";
  details.dataset.entryId = entry.id;

  const summary = document.createElement("summary");

  const titleWrapper = document.createElement("div");
  titleWrapper.className = "codex-entry-title";

  const title = document.createElement("h3");
  title.textContent = entry.name;

  const badges = document.createElement("div");
  badges.className = "codex-entry-meta";
  badges.append(
    createBadge(`${entry.edition} rules`, "codex-badge-edition"),
    createBadge(
      entry.type === "spell" ? "Spell" : "Magic item",
      entry.type === "spell" ? "codex-badge-spell" : "codex-badge-item"
    ),
    createBadge(entry.type === "spell" ? spellLevelLabel(entry.level) : (entry.rarities || []).join(", ")),
    createBadge(entry.source)
  );

  titleWrapper.append(title, badges);
  summary.append(titleWrapper);

  const body = document.createElement("div");
  body.className = "codex-entry-body";
  body.append(entry.type === "spell" ? createSpellFacts(entry) : createItemFacts(entry));

  const description = document.createElement("p");
  description.className = "codex-description";
  description.textContent = entry.description;

  const sourceNote = document.createElement("p");
  sourceNote.className = "codex-source-note";
  sourceNote.textContent = `${entry.source} / ${entry.edition} rules. Licensed under CC BY 4.0.`;

  body.append(description, sourceNote);
  details.append(summary, body);

  return details;
}

function updateStatus(total, shown) {
  if (total === 0) {
    codexElements.status.textContent = "No entries match the current filters.";
    return;
  }

  const entryWord = total === 1 ? "entry" : "entries";
  codexElements.status.textContent = `Showing ${shown.toLocaleString("en-CA")} of ${total.toLocaleString("en-CA")} ${entryWord}.`;
}

function renderResults() {
  const total = codexState.filteredEntries.length;
  const visibleEntries = codexState.filteredEntries.slice(0, codexState.visibleCount);
  const fragment = document.createDocumentFragment();

  codexElements.results.replaceChildren();

  if (visibleEntries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "codex-empty";
    empty.textContent = "No spells or magic items match those filters. Try a broader search.";
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
    codexElements.loadMore.textContent = `Load more entries (${remaining.toLocaleString("en-CA")} remaining)`;
  }
}

function applyFilters() {
  const filters = getFilterValues();
  codexState.filteredEntries = codexState.entries.filter((entry) => {
    return entryMatchesFilters(entry, filters);
  });
  codexState.visibleCount = CODEX_PAGE_SIZE;
  renderResults();
}

function resetFilters() {
  codexElements.form.reset();
  updateFilterAvailability();
  applyFilters();
  codexElements.search.focus();
}

function handleFilterInput(event) {
  if (event.target === codexElements.type) {
    updateFilterAvailability();
  }

  applyFilters();
}

function loadMoreEntries() {
  codexState.visibleCount += CODEX_PAGE_SIZE;
  renderResults();
}

function bindCodexEvents() {
  codexElements.search.addEventListener("input", handleFilterInput);
  codexElements.form.addEventListener("change", handleFilterInput);
  codexElements.form.addEventListener("submit", (event) => {
    event.preventDefault();
  });
  codexElements.reset.addEventListener("click", resetFilters);
  codexElements.loadMore.addEventListener("click", loadMoreEntries);
}

async function initializeCodexPage() {
  cacheCodexElements();
  bindCodexEvents();
  updateFilterAvailability();

  try {
    codexState.entries = await loadCodexData();
    codexState.filteredEntries = [...codexState.entries];
    updateCollectionTotals(codexState.entries);
    codexElements.error.hidden = true;
    renderResults();
  } catch (error) {
    console.error("Unable to initialize the standalone SRD Codex:", error);
    codexElements.status.textContent = "The Codex could not be loaded.";
    codexElements.results.replaceChildren();
    codexElements.loadMore.hidden = true;
    codexElements.error.hidden = false;
  }
}

initializeCodexPage();
