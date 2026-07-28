(() => {
  const state = {
    data: null,
    overlay: null,
    drawer: null,
    list: null,
    reading: null,
    search: null,
    category: null,
    activeId: null
  };

  const normalize = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  function createDrawer() {
    const overlay = document.createElement("div");
    overlay.className = "codex-overlay";

    const drawer = document.createElement("aside");
    drawer.className = "codex-drawer";
    drawer.innerHTML = `
      <div class="codex-header">
        <h2 class="codex-title">Codex</h2>
        <button class="codex-close" type="button" aria-label="Close Codex">×</button>
      </div>
      <div class="codex-toolbar">
        <input class="codex-search" type="search" placeholder="Search the Codex..." />
        <select class="codex-category">
          <option value="all">All Categories</option>
        </select>
      </div>
      <div class="codex-body">
        <div class="codex-list"></div>
        <div class="codex-reading"></div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    state.overlay = overlay;
    state.drawer = drawer;
    state.list = drawer.querySelector(".codex-list");
    state.reading = drawer.querySelector(".codex-reading");
    state.search = drawer.querySelector(".codex-search");
    state.category = drawer.querySelector(".codex-category");

    overlay.addEventListener("click", closeCodex);
    drawer.querySelector(".codex-close").addEventListener("click", closeCodex);

    state.search.addEventListener("input", renderList);
    state.category.addEventListener("change", renderList);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCodex();
    });
  }

  async function loadData() {
    const response = await fetch("data/codex.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load codex.json");
    state.data = await response.json();
  }

  function getEntries() {
    const entries = state.data?.entries || [];
    const q = normalize(state.search?.value || "");
    const cat = state.category?.value || "all";

    return entries.filter((entry) => {
      const matchesCategory = cat === "all" || entry.category === cat;
      const haystack = normalize([
        entry.title,
        entry.summary,
        entry.whatItMeans,
        entry.whyItMatters,
        ...(entry.whatItAffects || []),
        ...(entry.bestFor || []),
        ...(entry.tags || [])
      ].join(" "));

      const matchesSearch = !q || haystack.includes(q);
      return matchesCategory && matchesSearch;
    });
  }

  function renderCategoryOptions() {
    const categories = state.data?.categories || [];
    state.category.innerHTML = `<option value="all">All Categories</option>`;
    categories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name;
      state.category.appendChild(opt);
    });
  }

  function renderList() {
    const entries = getEntries();
    state.list.innerHTML = "";

    if (!entries.length) {
      state.list.innerHTML = `<p style="opacity:.75; padding:10px;">No matches found.</p>`;
      state.reading.innerHTML = `<p style="opacity:.75;">Pick a topic from the list.</p>`;
      return;
    }

    entries.forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = entry.id === state.activeId ? "active" : "";
      button.textContent = entry.title;
      button.addEventListener("click", () => showEntry(entry.id));
      state.list.appendChild(button);
    });

    if (!state.activeId || !entries.some((e) => e.id === state.activeId)) {
      showEntry(entries[0].id, false);
    }
  }

  function showEntry(id, focusList = true) {
    const entry = (state.data?.entries || []).find((e) => e.id === id);
    if (!entry) return;

    state.activeId = id;

    const related = Array.isArray(entry.related) ? entry.related : [];
    const relatedHtml = related.length
      ? `
        <div class="codex-section-title">Related Topics</div>
        <ul>
          ${related.map((r) => `<li>${r}</li>`).join("")}
        </ul>
      `
      : "";

    state.reading.innerHTML = `
      <h3>${entry.title}</h3>
      <div class="codex-subtitle">${entry.categoryName || ""}</div>
      ${entry.whatItMeans ? `<p><strong>What it means:</strong> ${entry.whatItMeans}</p>` : ""}
      ${Array.isArray(entry.whatItAffects) && entry.whatItAffects.length ? `
        <div class="codex-section-title">What it affects</div>
        <ul>${entry.whatItAffects.map((x) => `<li>${x}</li>`).join("")}</ul>
      ` : ""}
      ${entry.exampleInPlay ? `<p><strong>Example in play:</strong> ${entry.exampleInPlay}</p>` : ""}
      ${entry.whyItMatters ? `<p><strong>Why it matters:</strong> ${entry.whyItMatters}</p>` : ""}
      ${Array.isArray(entry.bestFor) && entry.bestFor.length ? `
        <div class="codex-section-title">Best for</div>
        <ul>${entry.bestFor.map((x) => `<li>${x}</li>`).join("")}</ul>
      ` : ""}
      ${relatedHtml}
    `;

    if (focusList) renderList();
  }

  function openCodex() {
    state.overlay.classList.add("visible");
    state.drawer.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeCodex() {
    state.overlay.classList.remove("visible");
    state.drawer.classList.remove("open");
    document.body.style.overflow = "";
  }

  function wireLauncher() {
  document
    .querySelectorAll(".stats-grid .tooltip-trigger")
    .forEach((el) => {
      const type = el.dataset.tooltipType;
      const key = el.dataset.tooltipKey;

      if (type !== "ability") {
        return;
      }

      const entry = state.data?.entries?.find(
        (item) => item.id === key
      );

      if (!entry) {
        return;
      }

      if (el.querySelector(".codex-info-btn")) {
        return;
      }

      const statGroup = el.querySelector(".stat-group");

      if (!statGroup) {
        return;
      }

      const button = document.createElement("button");

      button.type = "button";
      button.className = "codex-info-btn";
      button.textContent = "Codex";

      button.setAttribute(
        "aria-label",
        `Open ${entry.title} in the Codex`
      );

      button.title = `Open ${entry.title} in the Codex`;

      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        openCodex();
        showEntry(entry.id);
      });

      statGroup.appendChild(button);

    });
  }

  async function init() {
    try {
      createDrawer();
      await loadData();
      renderCategoryOptions();
      renderList();
      wireLauncher();

      // open with a simple keyboard shortcut for you
      document.addEventListener("keydown", (e) => {
        if (e.altKey && e.key.toLowerCase() === "c") {
          openCodex();
        }
      });
    } catch (err) {
      console.error("Codex failed to initialize:", err);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
