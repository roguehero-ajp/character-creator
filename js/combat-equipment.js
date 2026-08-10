/**
 * My RPG Source - Combat Equipment Module
 * ---------------------------------------
 * Adds edition-aware weapon, armor, and shield selectors to the D&D 5e builder.
 * Data sources:
 *  - Edition-specific mundane equipment collection
 *  - Edition-specific SRD magic items from the legacy Codex collection
 *
 * Responsibilities:
 *  - Populate mundane weapons before SRD magic weapons
 *  - Populate mundane armor before SRD magic armor
 *  - Resolve a magic item's base weapon/armor when required
 *  - Calculate displayed weapon attack/damage values
 *  - Calculate armor AC and optionally sync it to the sheet's Armor Class box
 *  - Show SRD special properties beneath selected magic equipment
 *
 * This module uses no timers or MutationObservers.
 */
(() => {
  'use strict';

  const config = window.MyRPGConfig || {};
  const edition = String(config.edition || '2024');

  const EQUIPMENT_PATH =
    `data/codex/dnd5e/${edition}/equipment.json`;
  const MAGIC_ITEMS_PATH =
    'data/srd-codex.json';

  const SWORD_NAMES = new Set([
    'greatsword',
    'longsword',
    'rapier',
    'scimitar',
    'shortsword'
  ]);

  const AXE_NAMES = new Set([
    'battleaxe',
    'greataxe',
    'handaxe'
  ]);

  const state = {
    mundaneWeapons: [],
    mundaneArmor: [],
    mundaneShields: [],
    magicWeapons: [],
    magicArmor: [],
    magicShields: [],
    loaded: false,
    error: null
  };

  let readyPromise = null;

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/armor/g, 'armour')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function getFacts(entry) {
    return Object.fromEntries(
      (entry?.facts || []).map((fact) => [
        String(fact?.label || '').trim(),
        String(fact?.value || '').trim()
      ])
    );
  }

  function getAbilityModifier(stat) {
    return (
      parseInt(
        document.getElementById(`${stat}-mod`)?.textContent,
        10
      ) || 0
    );
  }

  function getProficiencyBonus() {
    return (
      parseInt(
        document.getElementById('prof-bonus')?.value,
        10
      ) || 2
    );
  }

  function formatSigned(value) {
    const number = Number(value) || 0;
    return number >= 0 ? `+${number}` : `${number}`;
  }

  function appendOptions(select, label, entries, kind, titleKey) {
    if (!select || !entries.length) return;

    const group = document.createElement('optgroup');
    group.label = label;

    entries.forEach((entry) => {
      const option = document.createElement('option');
      option.value = `${kind}:${entry.id}`;
      option.textContent = String(entry[titleKey] || entry.title || entry.name);
      group.appendChild(option);
    });

    select.appendChild(group);
  }

  function buildSelectOptions(select, {
    placeholder,
    mundaneEntries,
    magicEntries,
    mundaneLabel,
    magicLabel
  }) {
    if (!select) return;

    const previous = select.value;
    select.replaceChildren();

    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = placeholder;
    select.appendChild(empty);

    appendOptions(
      select,
      mundaneLabel,
      mundaneEntries,
      'mundane',
      'title'
    );

    appendOptions(
      select,
      magicLabel,
      magicEntries,
      'magic',
      'name'
    );

    if (
      previous &&
      Array.from(select.options).some((option) => option.value === previous)
    ) {
      select.value = previous;
    }
  }

  function findByChoice(choice, mundane, magic) {
    const [kind, id] = String(choice || '').split(':');
    if (!id) return null;

    const pool = kind === 'magic' ? magic : mundane;
    const entry = pool.find((candidate) => String(candidate.id) === id);
    return entry ? { kind, entry } : null;
  }

  function weaponDamageType(entry) {
    return String(getFacts(entry).Damage || '');
  }

  function weaponProperties(entry) {
    const facts = getFacts(entry);
    const pieces = [];

    if (facts.Properties && facts.Properties !== '—') {
      pieces.push(facts.Properties);
    }

    if (facts.Mastery && facts.Mastery !== '—') {
      pieces.push(`Mastery: ${facts.Mastery}`);
    }

    return pieces.join(' • ');
  }

  function isMeleeWeapon(entry) {
    return /melee/i.test(String(entry?.subcategory || getFacts(entry).Category || ''));
  }

  function isRangedWeapon(entry) {
    return /ranged/i.test(String(entry?.subcategory || getFacts(entry).Category || ''));
  }

  function hasFinesse(entry) {
    return /\bfinesse\b/i.test(weaponProperties(entry));
  }

  function defaultWeaponAbility(entry) {
    if (hasFinesse(entry)) {
      return getAbilityModifier('dex') > getAbilityModifier('str')
        ? 'dex'
        : 'str';
    }

    if (isRangedWeapon(entry)) return 'dex';
    return 'str';
  }

  function magicWeaponBonus(item, tierValue) {
    if (!item) return 0;

    if (/weapon,\s*\+1,\s*\+2,\s*or\s*\+3/i.test(item.name || '')) {
      return Number(tierValue) || 1;
    }

    const description = String(item.description || '');
    const match = description.match(
      /\+(\d)\s+bonus to attack(?: rolls)? and damage(?: rolls)?/i
    );

    return match ? Number(match[1]) : 0;
  }

  function magicArmorBonus(item, tierValue) {
    if (!item) return 0;

    if (/^(armor|shield),\s*\+1,\s*\+2,\s*or\s*\+3/i.test(item.name || '')) {
      return Number(tierValue) || 1;
    }

    const description = String(item.description || '');

    const patterns = [
      /while (?:you are |you’re )?wearing this armor, you gain a \+(\d) bonus to (?:armor class|ac)/i,
      /you gain a \+(\d) bonus to (?:armor class|ac) while you wear this armor/i,
      /while holding this shield, you have a \+(\d) bonus to (?:armor class|ac)\./i
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) return Number(match[1]);
    }

    return 0;
  }

  function applyDamageModifier(baseDamage, modifier) {
    const text = String(baseDamage || '').trim();
    if (!text) return '—';

    const match = text.match(/^(\d+d\d+|\d+)\s*(.*)$/i);
    if (!match) return text;

    const base = match[1];
    const type = match[2];

    if (/^\d+d\d+$/i.test(base)) {
      const adjusted = modifier === 0
        ? base
        : `${base}${modifier > 0 ? '+' : ''}${modifier}`;
      return `${adjusted}${type ? ` ${type}` : ''}`;
    }

    const adjusted = Math.max(0, Number(base) + modifier);
    return `${adjusted}${type ? ` ${type}` : ''}`;
  }

  function allowedWeaponBases(item) {
    const category = String(item?.category || '');
    const inside = category.match(/\((.+)\)/)?.[1] || '';
    const rule = normalize(inside);

    let candidates = [...state.mundaneWeapons];

    if (!rule || /^any$/.test(rule) || /any simple or martial/.test(rule)) {
      return candidates;
    }

    if (/any melee weapon/.test(rule)) {
      return candidates.filter(isMeleeWeapon);
    }

    if (/any axe or sword/.test(rule)) {
      return candidates.filter((entry) => {
        const title = normalize(entry.title);
        return SWORD_NAMES.has(title) || AXE_NAMES.has(title);
      });
    }

    if (/any sword/.test(rule)) {
      candidates = candidates.filter((entry) =>
        SWORD_NAMES.has(normalize(entry.title))
      );

      if (/slashing/.test(rule)) {
        candidates = candidates.filter((entry) =>
          /slashing/i.test(weaponDamageType(entry))
        );
      }

      return candidates;
    }

    if (/any axe/.test(rule)) {
      return candidates.filter((entry) =>
        AXE_NAMES.has(normalize(entry.title))
      );
    }

    const namedMatches = candidates.filter((entry) => {
      const title = normalize(entry.title);
      return rule.includes(title);
    });

    return namedMatches.length ? namedMatches : candidates;
  }

  function allowedArmorBases(item) {
    const category = String(item?.category || '');
    const inside = category.match(/\((.+)\)/)?.[1] || '';
    const rule = normalize(inside);

    let candidates = [...state.mundaneArmor];

    if (
      !rule ||
      /any light medium or heavy/.test(rule) ||
      /^light medium or heavy$/.test(rule)
    ) {
      return candidates;
    }

    if (/medium or heavy/.test(rule)) {
      candidates = candidates.filter((entry) =>
        /medium|heavy/i.test(String(entry.subcategory || ''))
      );

      if (/except hide|but not hide/.test(rule)) {
        candidates = candidates.filter((entry) =>
          !/hide/i.test(entry.title || '')
        );
      }

      return candidates;
    }

    const namedMatches = candidates.filter((entry) => {
      const title = normalize(entry.title);
      const shortened = title.replace(/ armour$/i, '');
      return rule.includes(title) || rule.includes(shortened);
    });

    return namedMatches.length ? namedMatches : candidates;
  }

  function populateBaseSelect(select, entries, placeholder) {
    if (!select) return;

    const previous = select.value;
    select.replaceChildren();

    entries.forEach((entry, index) => {
      const option = document.createElement('option');
      option.value = entry.id;
      option.textContent = entry.title;
      select.appendChild(option);

      if (index === 0 && !previous) {
        select.value = entry.id;
      }
    });

    if (
      previous &&
      entries.some((entry) => String(entry.id) === previous)
    ) {
      select.value = previous;
    }

    if (!entries.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = placeholder;
      select.appendChild(option);
    }
  }

  function getMundaneWeaponById(id) {
    return state.mundaneWeapons.find((entry) => String(entry.id) === String(id));
  }

  function getMundaneArmorById(id) {
    return state.mundaneArmor.find((entry) => String(entry.id) === String(id));
  }

  function getMundaneShieldById(id) {
    return state.mundaneShields.find((entry) => String(entry.id) === String(id));
  }

  function setVisible(element, visible) {
    if (!element) return;
    element.hidden = !visible;
  }

  function updateAttackRow(index) {
    const select = document.getElementById(`weapon-select-${index}`);
    const baseWrap = document.getElementById(`weapon-base-wrap-${index}`);
    const baseSelect = document.getElementById(`weapon-base-select-${index}`);
    const tierWrap = document.getElementById(`weapon-tier-wrap-${index}`);
    const tierSelect = document.getElementById(`weapon-tier-${index}`);
    const abilitySelect = document.getElementById(`weapon-ability-${index}`);
    const proficient = document.getElementById(`weapon-proficient-${index}`);
    const attackInput = document.getElementById(`weapon-attack-${index}`);
    const damageInput = document.getElementById(`weapon-damage-${index}`);
    const propertiesInput = document.getElementById(`weapon-properties-${index}`);
    const special = document.getElementById(`weapon-special-${index}`);

    if (!select) return;

    const choice = findByChoice(
      select.value,
      state.mundaneWeapons,
      state.magicWeapons
    );

    if (!choice) {
      setVisible(baseWrap, false);
      setVisible(tierWrap, false);
      if (attackInput) attackInput.value = '';
      if (damageInput) damageInput.value = '';
      if (propertiesInput) propertiesInput.value = '';
      if (special) {
        special.textContent = '';
        special.hidden = true;
      }
      return;
    }

    let baseWeapon = null;
    let magicItem = null;
    let magicBonus = 0;

    if (choice.kind === 'mundane') {
      baseWeapon = choice.entry;
      setVisible(baseWrap, false);
      setVisible(tierWrap, false);
    } else {
      magicItem = choice.entry;
      const allowed = allowedWeaponBases(magicItem);
      populateBaseSelect(baseSelect, allowed, 'No compatible SRD base weapon');
      setVisible(baseWrap, allowed.length > 1);

      if (allowed.length === 1 && baseSelect) {
        baseSelect.value = allowed[0].id;
      }

      baseWeapon = getMundaneWeaponById(baseSelect?.value) || allowed[0] || null;

      const tiered = /weapon,\s*\+1,\s*\+2,\s*or\s*\+3/i.test(magicItem.name || '');
      setVisible(tierWrap, tiered);
      magicBonus = magicWeaponBonus(magicItem, tierSelect?.value);
    }

    if (!baseWeapon) {
      if (attackInput) attackInput.value = '—';
      if (damageInput) damageInput.value = '—';
      if (propertiesInput) propertiesInput.value = '—';
      return;
    }

    const requestedAbility = String(abilitySelect?.value || 'auto');
    const magicAddsFinesse = /\bfinesse property\b/i.test(
      String(magicItem?.description || '')
    );
    const ability = requestedAbility === 'auto'
      ? (
          magicAddsFinesse
            ? (getAbilityModifier('dex') > getAbilityModifier('str') ? 'dex' : 'str')
            : defaultWeaponAbility(baseWeapon)
        )
      : requestedAbility;
    const abilityMod = getAbilityModifier(ability);
    const profBonus = proficient?.checked ? getProficiencyBonus() : 0;
    const attackBonus = abilityMod + profBonus + magicBonus;
    const damageBonus = abilityMod + magicBonus;

    if (attackInput) attackInput.value = formatSigned(attackBonus);
    if (damageInput) {
      let damageText = applyDamageModifier(
        weaponDamageType(baseWeapon),
        damageBonus
      );

      const replacement = String(magicItem?.description || '').match(
        /deals ([A-Za-z]+) damage instead of ([A-Za-z]+) damage/i
      );
      if (replacement) {
        damageText = damageText.replace(
          new RegExp(`${replacement[2]}$`, 'i'),
          replacement[1]
        );
      }

      damageInput.value = damageText;
      damageInput.title = damageText;
    }
    if (propertiesInput) {
      propertiesInput.value = weaponProperties(baseWeapon) || '—';
      propertiesInput.title = propertiesInput.value;
    }

    if (special) {
      const description = String(magicItem?.description || '').trim();
      special.textContent = description;
      special.hidden = !description;
    }
  }

  function parseArmorClass(entry, dexMod) {
    const formula = String(getFacts(entry)['Armor Class'] || '').trim();
    const base = Number(formula.match(/\d+/)?.[0] || 10);

    if (/dex modifier\s*\(max\s*2\)/i.test(formula)) {
      return base + Math.min(dexMod, 2);
    }

    if (/dex modifier/i.test(formula)) {
      return base + dexMod;
    }

    return base;
  }

  function dexToAcLabel(entry) {
    const formula = String(getFacts(entry)['Armor Class'] || '').trim();

    if (/dex modifier\s*\(max\s*2\)/i.test(formula)) return 'Max +2';
    if (/dex modifier/i.test(formula)) return 'Full';
    return 'None';
  }

  function updateArmor() {
    const armorSelect = document.getElementById('armor-select');
    const armorBaseWrap = document.getElementById('armor-base-wrap');
    const armorBaseSelect = document.getElementById('armor-base-select');
    const armorTierWrap = document.getElementById('armor-tier-wrap');
    const armorTier = document.getElementById('armor-tier');
    const acDisplay = document.getElementById('armor-ac-display');
    const dexDisplay = document.getElementById('armor-dex-display');
    const stealthDisplay = document.getElementById('armor-stealth-display');
    const strengthDisplay = document.getElementById('armor-strength-display');
    const special = document.getElementById('armor-special-text');

    const dexMod = getAbilityModifier('dex');
    const choice = findByChoice(
      armorSelect?.value,
      state.mundaneArmor,
      state.magicArmor
    );

    let baseArmor = null;
    let magicItem = null;
    let magicBonus = 0;

    if (!choice) {
      setVisible(armorBaseWrap, false);
      setVisible(armorTierWrap, false);
      if (acDisplay) acDisplay.value = String(10 + dexMod);
      if (dexDisplay) dexDisplay.value = 'Full';
      if (stealthDisplay) stealthDisplay.value = '—';
      if (strengthDisplay) strengthDisplay.value = '—';
      if (special) {
        special.textContent = '';
        special.hidden = true;
      }
      return {
        ac: 10 + dexMod,
        description: ''
      };
    }

    if (choice.kind === 'mundane') {
      baseArmor = choice.entry;
      setVisible(armorBaseWrap, false);
      setVisible(armorTierWrap, false);
    } else {
      magicItem = choice.entry;
      const allowed = allowedArmorBases(magicItem);
      populateBaseSelect(armorBaseSelect, allowed, 'No compatible SRD base armor');
      setVisible(armorBaseWrap, allowed.length > 1);

      if (allowed.length === 1 && armorBaseSelect) {
        armorBaseSelect.value = allowed[0].id;
      }

      baseArmor = getMundaneArmorById(armorBaseSelect?.value) || allowed[0] || null;

      const tiered = /^armor,\s*\+1,\s*\+2,\s*or\s*\+3/i.test(magicItem.name || '');
      setVisible(armorTierWrap, tiered);
      magicBonus = magicArmorBonus(magicItem, armorTier?.value);
    }

    if (!baseArmor) {
      return { ac: 10 + dexMod, description: '' };
    }

    const facts = getFacts(baseArmor);
    const ac = parseArmorClass(baseArmor, dexMod) + magicBonus;

    if (acDisplay) acDisplay.value = String(ac);
    if (dexDisplay) dexDisplay.value = dexToAcLabel(baseArmor);
    if (stealthDisplay) stealthDisplay.value = facts.Stealth || '—';
    if (strengthDisplay) strengthDisplay.value = facts.Strength || '—';

    if (special) {
      const description = String(magicItem?.description || '').trim();
      special.textContent = description;
      special.hidden = !description;
    }

    return {
      ac,
      description: String(magicItem?.description || '')
    };
  }

  function updateShield() {
    const select = document.getElementById('shield-select');
    const tierWrap = document.getElementById('shield-tier-wrap');
    const tier = document.getElementById('shield-tier');
    const bonusDisplay = document.getElementById('shield-ac-display');
    const special = document.getElementById('shield-special-text');

    const choice = findByChoice(
      select?.value,
      state.mundaneShields,
      state.magicShields
    );

    if (!choice) {
      setVisible(tierWrap, false);
      if (bonusDisplay) bonusDisplay.value = '+0';
      if (special) {
        special.textContent = '';
        special.hidden = true;
      }
      return 0;
    }

    const baseShield = state.mundaneShields[0] || null;
    const normalBonus = Number(
      String(getFacts(baseShield)['Armor Class'] || '+2').match(/[+-]?\d+/)?.[0] || 2
    );

    let magicBonus = 0;
    let magicItem = null;

    if (choice.kind === 'magic') {
      magicItem = choice.entry;
      const tiered = /^shield,\s*\+1,\s*\+2,\s*or\s*\+3/i.test(magicItem.name || '');
      setVisible(tierWrap, tiered);
      magicBonus = magicArmorBonus(magicItem, tier?.value);
    } else {
      setVisible(tierWrap, false);
    }

    const total = normalBonus + magicBonus;
    if (bonusDisplay) bonusDisplay.value = formatSigned(total);

    if (special) {
      const description = String(magicItem?.description || '').trim();
      special.textContent = description;
      special.hidden = !description;
    }

    return total;
  }

  function syncArmorClass() {
    const armor = updateArmor();
    const shieldBonus = updateShield();
    const auto = document.getElementById('armor-auto-ac');
    const topAc = document.querySelector('[data-role="armor-class"]');

    if (auto?.checked && topAc) {
      topAc.value = String((armor?.ac || 10) + shieldBonus);
    }
  }

  function refreshAll() {
    for (let index = 1; index <= 3; index += 1) {
      updateAttackRow(index);
    }
    syncArmorClass();
  }

  function populateAllSelectors() {
    for (let index = 1; index <= 3; index += 1) {
      buildSelectOptions(
        document.getElementById(`weapon-select-${index}`),
        {
          placeholder: 'Choose a weapon…',
          mundaneEntries: state.mundaneWeapons,
          magicEntries: state.magicWeapons,
          mundaneLabel: 'Mundane Weapons',
          magicLabel: 'SRD Magic Weapons'
        }
      );
    }

    buildSelectOptions(
      document.getElementById('armor-select'),
      {
        placeholder: 'No armor',
        mundaneEntries: state.mundaneArmor,
        magicEntries: state.magicArmor,
        mundaneLabel: 'Mundane Armor',
        magicLabel: 'SRD Magic Armor'
      }
    );

    buildSelectOptions(
      document.getElementById('shield-select'),
      {
        placeholder: 'No shield',
        mundaneEntries: state.mundaneShields,
        magicEntries: state.magicShields,
        mundaneLabel: 'Mundane Shields',
        magicLabel: 'SRD Magic Shields'
      }
    );
  }

  function bindListeners() {
    const root = document.getElementById('combat-equipment-root');
    if (root && root.dataset.combatEquipmentBound !== 'true') {
      root.dataset.combatEquipmentBound = 'true';

      root.addEventListener('change', (event) => {
        const id = String(event.target?.id || '');

        const weaponMatch = id.match(
          /^weapon-(?:select|base-select|tier|ability|proficient)-(\d)$/
        );

        if (weaponMatch) {
          updateAttackRow(Number(weaponMatch[1]));
          return;
        }

        if (
          id === 'armor-select' ||
          id === 'armor-base-select' ||
          id === 'armor-tier' ||
          id === 'shield-select' ||
          id === 'shield-tier' ||
          id === 'armor-auto-ac'
        ) {
          syncArmorClass();
        }
      });
    }

    if (document.documentElement.dataset.combatEquipmentGlobalBound !== 'true') {
      document.documentElement.dataset.combatEquipmentGlobalBound = 'true';

      document.addEventListener('input', (event) => {
        if (event.target?.id === 'str' || event.target?.id === 'dex') {
          refreshAll();
        }
      });

      document.addEventListener('change', (event) => {
        if (event.target?.classList?.contains('char-level-select')) {
          refreshAll();
        }
      });

      [
        'character:restored',
        'character:base-scores-changed',
        'ability-scores:assignment-complete'
      ].forEach((eventName) => {
        document.addEventListener(eventName, refreshAll);
      });
    }
  }

  function setLoadFailure(message) {
    [
      ...document.querySelectorAll('.weapon-select'),
      document.getElementById('armor-select'),
      document.getElementById('shield-select')
    ].filter(Boolean).forEach((select) => {
      select.replaceChildren();
      const option = document.createElement('option');
      option.textContent = message;
      option.value = '';
      select.appendChild(option);
      select.disabled = true;
    });
  }

  async function loadData() {
    try {
      const [equipmentResponse, magicResponse] = await Promise.all([
        fetch(EQUIPMENT_PATH),
        fetch(MAGIC_ITEMS_PATH)
      ]);

      if (!equipmentResponse.ok) {
        throw new Error(`Equipment data returned HTTP ${equipmentResponse.status}.`);
      }

      if (!magicResponse.ok) {
        throw new Error(`Magic-item data returned HTTP ${magicResponse.status}.`);
      }

      const [equipmentData, magicData] = await Promise.all([
        equipmentResponse.json(),
        magicResponse.json()
      ]);

      const equipmentEntries = Array.isArray(equipmentData?.entries)
        ? equipmentData.entries
        : [];

      state.mundaneWeapons = equipmentEntries
        .filter((entry) => entry.category === 'weapons')
        .sort((a, b) => a.title.localeCompare(b.title));

      const armorEntries = equipmentEntries
        .filter((entry) => entry.category === 'armor');

      state.mundaneShields = armorEntries
        .filter((entry) => /shield/i.test(String(entry.subcategory || '')))
        .sort((a, b) => a.title.localeCompare(b.title));

      state.mundaneArmor = armorEntries
        .filter((entry) => !/shield/i.test(String(entry.subcategory || '')))
        .sort((a, b) => a.title.localeCompare(b.title));

      const magicEntries = (Array.isArray(magicData?.entries)
        ? magicData.entries
        : [])
        .filter((entry) =>
          entry.type === 'item' &&
          String(entry.edition) === edition
        );

      state.magicWeapons = magicEntries
        .filter((entry) =>
          /^weapon\s*\(/i.test(String(entry.category || '')) &&
          !/ammunition|\barrow\b/i.test(String(entry.category || ''))
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      const magicArmorEntries = magicEntries
        .filter((entry) => /^armor\s*\(/i.test(String(entry.category || '')));

      state.magicShields = magicArmorEntries
        .filter((entry) => /\bshield\b/i.test(String(entry.category || '')))
        .sort((a, b) => a.name.localeCompare(b.name));

      state.magicArmor = magicArmorEntries
        .filter((entry) => !/\bshield\b/i.test(String(entry.category || '')))
        .sort((a, b) => a.name.localeCompare(b.name));

      state.loaded = true;
      state.error = null;

      populateAllSelectors();
      bindListeners();
      refreshAll();

      document.dispatchEvent(
        new CustomEvent('character:combat-equipment-ready', {
          detail: {
            edition,
            mundaneWeapons: state.mundaneWeapons.length,
            magicWeapons: state.magicWeapons.length,
            mundaneArmor: state.mundaneArmor.length,
            magicArmor: state.magicArmor.length,
            magicShields: state.magicShields.length
          }
        })
      );

      return state;
    } catch (error) {
      state.loaded = false;
      state.error = error;
      console.error('Combat equipment could not be loaded:', error);
      setLoadFailure('Equipment data unavailable');
      return state;
    }
  }

  function init() {
    bindListeners();
    readyPromise = loadData();
    return readyPromise;
  }

  window.CharacterCombatEquipment = {
    get ready() {
      return readyPromise;
    },
    get state() {
      return state;
    },
    refreshAll,
    syncArmorClass,
    updateAttackRow
  };

  init();
})();
