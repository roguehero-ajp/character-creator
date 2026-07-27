(() => {
  const state = {
    abilities: {},
    skills: {},
    tooltip: null,
    activeEl: null,
    hideTimer: null
  };

  function createTooltip() {
    const el = document.createElement("div");
    el.className = "knowledge-tooltip";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    return el;
  }

  function buildTooltipHTML(entry) {
    const whatItAffects = Array.isArray(entry.whatItAffects) ? entry.whatItAffects : [];
    const bestFor = Array.isArray(entry.bestFor) ? entry.bestFor : [];

    return `
      <div class="kt-title">${entry.title || "Knowledge"}</div>
      ${entry.ability ? `<div class="kt-meta"><span class="kt-pill">${entry.ability}</span></div>` : ""}
      ${entry.whatItMeans ? `
        <div class="kt-section">
          <div class="kt-section-title">What it means</div>
          <p>${entry.whatItMeans}</p>
        </div>
      ` : ""}
      ${whatItAffects.length ? `
        <div class="kt-section">
          <div class="kt-section-title">What it affects</div>
          <ul>${whatItAffects.map(item => `<li>${item}</li>`).join("")}</ul>
        </div>
      ` : ""}
      ${entry.exampleInPlay ? `
        <div class="kt-section">
          <div class="kt-section-title">Example in play</div>
          <p>${entry.exampleInPlay}</p>
        </div>
      ` : ""}
      ${entry.whyItMatters ? `
        <div class="kt-section">
          <div class="kt-section-title">Why it matters</div>
          <p>${entry.whyItMatters}</p>
        </div>
      ` : ""}
      ${bestFor.length ? `
        <div class="kt-section">
          <div class="kt-section-title">Best for</div>
          <ul>${bestFor.map(item => `<li>${item}</li>`).join("")}</ul>
        </div>
      ` : ""}
    `;
  }

  function positionTooltip(event) {
    if (!state.tooltip) return;

    const padding = 14;
    const rect = state.tooltip.getBoundingClientRect();
    let x = event.clientX + 18;
    let y = event.clientY + 18;

    if (x + rect.width > window.innerWidth - padding) {
      x = event.clientX - rect.width - 18;
    }

    if (y + rect.height > window.innerHeight - padding) {
      y = event.clientY - rect.height - 18;
    }

    state.tooltip.style.left = `${Math.max(padding, x)}px`;
    state.tooltip.style.top = `${Math.max(padding, y)}px`;
  }

  function showTooltip(entry, event) {
    if (!state.tooltip || !entry) return;

    clearTimeout(state.hideTimer);
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

  function abilityKeyFromLabel(labelText) {
    const text = String(labelText || "").toLowerCase().trim();
    if (text.includes("strength")) return "strength";
    if (text.includes("dexterity")) return "dexterity";
    if (text.includes("constitution")) return "constitution";
    if (text.includes("intelligence")) return "intelligence";
    if (text.includes("wisdom")) return "wisdom";
    if (text.includes("charisma")) return "charisma";
    return null;
  }

  function skillKeyFromLabel(labelText) {
    const text = String(labelText || "").toLowerCase().trim();
    if (text.includes("acrobatics")) return "acrobatics";
    if (text.includes("animal handling")) return "animal-handling";
    if (text.includes("arcana")) return "arcana";
    if (text.includes("athletics")) return "athletics";
    if (text.includes("deception")) return "deception";
    if (text.includes("history")) return "history";
    if (text.includes("insight")) return "insight";
    if (text.includes("intimidation")) return "intimidation";
    if (text.includes("investigation")) return "investigation";
    if (text.includes("medicine")) return "medicine";
    if (text.includes("nature")) return "nature";
    if (text.includes("perception")) return "perception";
    if (text.includes("performance")) return "performance";
    if (text.includes("persuasion")) return "persuasion";
    if (text.includes("religion")) return "religion";
    if (text.includes("sleight of hand")) return "sleight-of-hand";
    if (text.includes("stealth")) return "stealth";
    if (text.includes("survival")) return "survival";
    return null;
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
    document.querySelectorAll("[data-tooltip-type][data-tooltip-key]").forEach((el) => {
      el.addEventListener("mouseenter", (event) => {
        const type = el.dataset.tooltipType;
        const key = el.dataset.tooltipKey;
        const entry = type === "ability" ? state.abilities[key] : state.skills[key];
        state.activeEl = el;
        showTooltip(entry, event);
      });

      el.addEventListener("mousemove", (event) => {
        if (state.activeEl === el) positionTooltip(event);
      });

      el.addEventListener("mouseleave", () => hideTooltip(80));

      el.addEventListener("focusin", (event) => {
        const type = el.dataset.tooltipType;
        const key = el.dataset.tooltipKey;
        const entry = type === "ability" ? state.abilities[key] : state.skills[key];
        state.activeEl = el;
        showTooltip(entry, event);
      });

      el.addEventListener("focusout", () => hideTooltip(0));
    });
  }

  async function loadJSON(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.status}`);
    }
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
