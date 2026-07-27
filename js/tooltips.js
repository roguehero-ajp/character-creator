(() => {
  const state = {
    abilities: {},
    skills: {},
    tooltip: null,
    activeEl: null,
    hideTimer: null
  };

  const normalize = (text) =>
    String(text || "")
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  function createTooltip() {
    const el = document.createElement("div");
    el.className = "knowledge-tooltip";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    return el;
  }

  function abilityKeyFromLabel(labelText) {
    const t = normalize(labelText);
    const map = {
      strength: "strength",
      dexterity: "dexterity",
      constitution: "constitution",
      intelligence: "intelligence",
      wisdom: "wisdom",
      charisma: "charisma"
    };
    return map[t] || null;
  }

  function skillKeyFromLabel(labelText) {
    const clean = String(labelText || "")
      .replace(/\s*\([^)]*\)\s*.*$/, "")
      .trim();

    const t = normalize(clean);
    const map = {
      acrobatics: "acrobatics",
      "animal-handling": "animal-handling",
      arcana: "arcana",
      athletics: "athletics",
      deception: "deception",
      history: "history",
      insight: "insight",
      intimidation: "intimidation",
      investigation: "investigation",
      medicine: "medicine",
      nature: "nature",
      perception: "perception",
      performance: "performance",
      persuasion: "persuasion",
      religion: "religion",
      "sleight-of-hand": "sleight-of-hand",
      stealth: "stealth",
      survival: "survival"
    };

    return map[t] || null;
  }

  function buildTooltipHTML(entry) {
    const usedFor = Array.isArray(entry.usedFor) ? entry.usedFor : [];
    const bestFor = Array.isArray(entry.bestFor) ? entry.bestFor : [];

    return `
      <div class="kt-title">${entry.title || "Knowledge"}</div>
      <div class="kt-meta">
        ${entry.ability ? `<span class="kt-pill">${entry.ability}</span>` : ""}
        ${entry.difficulty ? `<span class="kt-pill">${entry.difficulty}</span>` : ""}
      </div>
      <p>${entry.summary || ""}</p>
      ${
        usedFor.length
          ? `
          <div class="kt-section">
            <div class="kt-section-title">Used for</div>
            <ul>${usedFor.map((item) => `<li>${item}</li>`).join("")}</ul>
          </div>
        `
          : ""
      }
      ${
        bestFor.length
          ? `
          <div class="kt-section">
            <div class="kt-section-title">Best for</div>
            <ul>${bestFor.map((item) => `<li>${item}</li>`).join("")}</ul>
          </div>
        `
          : ""
      }
      ${
        entry.beginnerTip
          ? `
          <div class="kt-section">
            <div class="kt-section-title">Beginner tip</div>
            <p>${entry.beginnerTip}</p>
          </div>
        `
          : ""
      }
    `;
  }

  function positionTooltip(event) {
    if (!state.tooltip) return;

    const padding = 14;
    const tooltipRect = state.tooltip.getBoundingClientRect();
    let x = event.clientX + 18;
    let y = event.clientY + 18;

    if (x + tooltipRect.width > window.innerWidth - padding) {
      x = event.clientX - tooltipRect.width - 18;
    }

    if (y + tooltipRect.height > window.innerHeight - padding) {
      y = event.clientY - tooltipRect.height - 18;
    }

    state.tooltip.style.left = `${Math.max(padding, x)}px`;
    state.tooltip.style.top = `${Math.max(padding, y)}px`;
  }

  function showTooltip(el, entry, event) {
    if (!state.tooltip || !entry) return;

    clearTimeout(state.hideTimer);
    state.activeEl = el;
    state.tooltip.innerHTML = buildTooltipHTML(entry);
    state.tooltip.classList.add("visible");
    state.tooltip.setAttribute("aria-hidden", "false");
    positionTooltip(event);
  }

  function hideTooltip(delay = 60) {
    clearTimeout(state.hideTimer);
    state.hideTimer = setTimeout(() => {
      if (!state.tooltip) return;
      state.tooltip.classList.remove("visible");
      state.tooltip.setAttribute("aria-hidden", "true");
      state.activeEl = null;
    }, delay);
  }

  function markAbilityRows() {
    document.querySelectorAll(".stats-grid .stat-row").forEach((row) => {
      const label = row.querySelector(".stat-group label");
      if (!label) return;

      const key = abilityKeyFromLabel(label.textContent);
      if (!key) return;

      row.classList.add("tooltip-trigger");
      row.dataset.tooltipType = "ability";
      row.dataset.tooltipKey = key;
    });
  }

  function markSkillRows() {
    document.querySelectorAll(".skills-box-container .saves-list label").forEach((label) => {
      const key = skillKeyFromLabel(label.textContent);
      if (!key) return;

      label.classList.add("tooltip-trigger");
      label.dataset.tooltipType = "skill";
      label.dataset.tooltipKey = key;
    });
  }

  function attachListeners() {
    const targets = document.querySelectorAll("[data-tooltip-type][data-tooltip-key]");
    targets.forEach((el) => {
      el.addEventListener("mouseenter", (event) => {
        const type = el.dataset.tooltipType;
        const key = el.dataset.tooltipKey;
        const entry = type === "ability" ? state.abilities[key] : state.skills[key];
        showTooltip(el, entry, event);
      });

      el.addEventListener("mousemove", (event) => {
        if (state.activeEl === el) positionTooltip(event);
      });

      el.addEventListener("mouseleave", () => hideTooltip(80));
      el.addEventListener("focusin", (event) => {
        const type = el.dataset.tooltipType;
        const key = el.dataset.tooltipKey;
        const entry = type === "ability" ? state.abilities[key] : state.skills[key];
        showTooltip(el, entry, event);
      });
      el.addEventListener("focusout", () => hideTooltip(0));
    });
  }

  async function loadJSON(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
    return response.json();
  }

  async function init() {
    state.tooltip = createTooltip();

    try {
      const [abilities, skills] = await Promise.all([
        loadJSON("data/abilities.json"),
        loadJSON("data/skills.json")
      ]);

      state.abilities = abilities || {};
      state.skills = skills || {};

      markAbilityRows();
      markSkillRows();
      attachListeners();

      document.addEventListener("scroll", () => hideTooltip(0), true);
      window.addEventListener("resize", () => hideTooltip(0));
    } catch (error) {
      console.error("Knowledge cards could not be loaded.", error);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
