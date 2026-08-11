/**
 * My RPG Source - Dynamic Spellcasting
 * ------------------------------------
 * Build 3:
 *  - Smart SRD spellcasting for D&D 5e 2014 and 2024
 *  - Edition-correct prepared/known/spellbook progression
 *  - Edition-correct multiclass slot math and half-caster start levels
 *  - SRD subclass spell grants / expanded lists / subclass magic choices
 *  - Bard Magical Secrets (both editions) + 2014 Lore bonus Secrets
 *  - Warlock Pact Magic + Mystic Arcanum
 *  - Spell Knowledge Card hooks and exact Codex links
 */

(() => {
  'use strict';

  const config = window.MyRPGConfig;
  const HOST_ID = 'spellcasting-pages';
  const STATE_FIELD_ID = 'spellcasting-state';
  const LEGACY_PAGE_SELECTOR = '[data-legacy-spell-page]';
  const STATE_VERSION = 3;
  const WIZARD_ID = 'wizard';

  const FULL_CASTERS = new Set(['bard', 'cleric', 'druid', 'sorcerer', 'wizard']);
  const HALF_CASTERS = new Set(['paladin', 'ranger']);
  const PACT_CASTERS = new Set(['warlock']);

  const FULL_SLOTS = Object.freeze({
    1:[2],2:[3],3:[4,2],4:[4,3],5:[4,3,2],6:[4,3,3],7:[4,3,3,1],8:[4,3,3,2],
    9:[4,3,3,3,1],10:[4,3,3,3,2],11:[4,3,3,3,2,1],12:[4,3,3,3,2,1],
    13:[4,3,3,3,2,1,1],14:[4,3,3,3,2,1,1],15:[4,3,3,3,2,1,1,1],16:[4,3,3,3,2,1,1,1],
    17:[4,3,3,3,2,1,1,1,1],18:[4,3,3,3,3,1,1,1,1],19:[4,3,3,3,3,2,1,1,1],20:[4,3,3,3,3,2,2,1,1]
  });

  const HALF_SLOTS_2024 = Object.freeze({
    1:[2],2:[2],3:[3],4:[3],5:[4,2],6:[4,2],7:[4,3],8:[4,3],9:[4,3,2],10:[4,3,2],
    11:[4,3,3],12:[4,3,3],13:[4,3,3,1],14:[4,3,3,1],15:[4,3,3,2],16:[4,3,3,2],
    17:[4,3,3,3,1],18:[4,3,3,3,1],19:[4,3,3,3,2],20:[4,3,3,3,2]
  });

  const HALF_SLOTS_2014 = Object.freeze({
    1:[],2:[2],3:[3],4:[3],5:[4,2],6:[4,2],7:[4,3],8:[4,3],9:[4,3,2],10:[4,3,2],
    11:[4,3,3],12:[4,3,3],13:[4,3,3,1],14:[4,3,3,1],15:[4,3,3,2],16:[4,3,3,2],
    17:[4,3,3,3,1],18:[4,3,3,3,1],19:[4,3,3,3,2],20:[4,3,3,3,2]
  });

  const COMMON_PREPARED_2024 = [4,5,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22];
  const HALF_PREPARED_2024 = [2,3,4,5,6,6,7,7,9,9,10,10,11,11,12,12,14,14,15,15];

  const PROFILES_BY_EDITION = Object.freeze({
    '2014': Object.freeze({
      bard: {
        name:'Bard', ability:'cha', cantrips:[2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
        prepared:[4,5,6,7,8,9,10,11,12,14,15,15,16,18,19,19,20,22,22,22], slots:'full', selectionMode:'known',
        change:'One Bard spell when you gain a Bard level', notes:'Magical Secrets at Bard 10, 14, and 18. College of Lore adds two bonus Magical Secrets at Bard 6.'
      },
      cleric: {
        name:'Cleric', ability:'wis', cantrips:[3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5],
        preparedFormula:'level+ability', slots:'full', selectionMode:'prepared', change:'Any prepared spells after a Long Rest'
      },
      druid: {
        name:'Druid', ability:'wis', cantrips:[2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
        preparedFormula:'level+ability', slots:'full', selectionMode:'prepared', change:'Any prepared spells after a Long Rest'
      },
      paladin: {
        name:'Paladin', ability:'cha', startsAt:2, cantrips:null, preparedFormula:'half-level+ability-floor', slots:'half', selectionMode:'prepared',
        change:'Any prepared spells after a Long Rest'
      },
      ranger: {
        name:'Ranger', ability:'wis', startsAt:2, cantrips:null,
        prepared:[0,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11], slots:'half', selectionMode:'known',
        change:'One Ranger spell when you gain a Ranger level'
      },
      sorcerer: {
        name:'Sorcerer', ability:'cha', cantrips:[4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6],
        prepared:[2,3,4,5,6,7,8,9,10,11,12,12,13,13,14,14,15,15,15,15], slots:'full', selectionMode:'known',
        change:'One Sorcerer spell when you gain a Sorcerer level'
      },
      warlock: {
        name:'Warlock', ability:'cha', cantrips:[2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
        prepared:[2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15], slots:'pact', selectionMode:'known',
        change:'One Warlock spell when you gain a Warlock level',
        pactSlots:[1,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,4,4,4,4],
        pactLevel:[1,1,2,2,3,3,4,4,5,5,5,5,5,5,5,5,5,5,5,5]
      },
      wizard: {
        name:'Wizard', ability:'int', cantrips:[3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5],
        preparedFormula:'level+ability', slots:'full', selectionMode:'prepared', change:'Any prepared spells after a Long Rest', spellbook:true
      }
    }),

    '2024': Object.freeze({
      bard: {
        name:'Bard', ability:'cha', cantrips:[2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
        prepared:COMMON_PREPARED_2024, slots:'full', selectionMode:'prepared', change:'One prepared spell when you gain a Bard level',
        notes:'Magical Secrets begins at Bard 10.'
      },
      cleric: {
        name:'Cleric', ability:'wis', cantrips:[3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5],
        prepared:COMMON_PREPARED_2024, slots:'full', selectionMode:'prepared', change:'Any prepared spells after a Long Rest'
      },
      druid: {
        name:'Druid', ability:'wis', cantrips:[2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
        prepared:COMMON_PREPARED_2024, slots:'full', selectionMode:'prepared', change:'Any prepared spells after a Long Rest',
        alwaysPrepared:[{ level:1, spell:'Speak with Animals', reason:'Druidic' }]
      },
      paladin: {
        name:'Paladin', ability:'cha', cantrips:null, prepared:HALF_PREPARED_2024, slots:'half', selectionMode:'prepared',
        change:'One prepared spell after a Long Rest',
        alwaysPrepared:[
          { level:2, spell:'Divine Smite', reason:"Paladin's Smite" },
          { level:5, spell:'Find Steed', reason:'Faithful Steed' }
        ],
        notes:'Blessed Warrior can add two Cleric cantrips if that Fighting Style is chosen; that optional Fighting Style is not yet represented elsewhere on the sheet.'
      },
      ranger: {
        name:'Ranger', ability:'wis', cantrips:null, prepared:HALF_PREPARED_2024, slots:'half', selectionMode:'prepared',
        change:'One prepared spell after a Long Rest', alwaysPrepared:[{ level:1, spell:'Hunter’s Mark', reason:'Favored Enemy' }]
      },
      sorcerer: {
        name:'Sorcerer', ability:'cha', cantrips:[4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6],
        prepared:[2,4,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22], slots:'full', selectionMode:'prepared',
        change:'One prepared spell when you gain a Sorcerer level'
      },
      warlock: {
        name:'Warlock', ability:'cha', cantrips:[2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
        prepared:[2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15], slots:'pact', selectionMode:'prepared',
        change:'One prepared spell when you gain a Warlock level',
        pactSlots:[1,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,4,4,4,4],
        pactLevel:[1,1,2,2,3,3,4,4,5,5,5,5,5,5,5,5,5,5,5,5],
        alwaysPrepared:[{ level:9, spell:'Contact Other Plane', reason:'Contact Patron' }]
      },
      wizard: {
        name:'Wizard', ability:'int', cantrips:[3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5],
        prepared:[4,5,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,23,24,25], slots:'full', selectionMode:'prepared',
        change:'Any prepared spells after a Long Rest', spellbook:true
      }
    })
  });
  const state = {
    loaded:false,
    active:false,
    spells:[],
    spellByName:new Map(),
    classSpells:new Map(),
    subclasses:new Map(),
    structured:{ version:STATE_VERSION, edition:config?.edition || '2024', sources:{} },
    error:null
  };

  let readyPromise = Promise.resolve(state);
  let writingStateField = false;

  const text = (value) => String(value ?? '').trim();
  const clampLevel = (value) => Math.min(20, Math.max(1, parseInt(value,10) || 1));
  const formatSigned = (value) => Number(value) >= 0 ? `+${Number(value) || 0}` : String(Number(value) || 0);
  const getHost = () => document.getElementById(HOST_ID);
  const getStateField = () => document.getElementById(STATE_FIELD_ID);
  const getLegacyPages = () => Array.from(document.querySelectorAll(LEGACY_PAGE_SELECTOR));

  function classId(value) {
    return text(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }

  function ordinal(level) {
    if (level === 1) return '1st';
    if (level === 2) return '2nd';
    if (level === 3) return '3rd';
    return `${level}th`;
  }

  function abilityLabel(ability) {
    return ({int:'Intelligence',wis:'Wisdom',cha:'Charisma'})[ability] || text(ability).toUpperCase() || '—';
  }

  function abilityModifier(ability) {
    return parseInt(document.getElementById(`${ability}-mod`)?.textContent,10) || 0;
  }

  function proficiencyBonus() {
    return parseInt(document.getElementById('prof-bonus')?.value,10) || 2;
  }

  function spellStats(ability) {
    const modifier = abilityModifier(ability);
    const proficiency = proficiencyBonus();
    return { modifier, saveDc:8 + proficiency + modifier, attack:proficiency + modifier };
  }

  function make(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function uniqueStrings(values) {
    const seen = new Set();
    return (Array.isArray(values) ? values : []).map(text).filter(Boolean).filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }

  function profileFor(id) { return PROFILES_BY_EDITION[config?.edition || '2024']?.[id] || null; }
  function progressionValue(values, level) { return Array.isArray(values) ? Number(values[clampLevel(level)-1] || 0) : 0; }

  function totalSelectionLimit(source) {
    const profile = profileFor(source.id);
    if (!profile) return 0;
    if (profile.preparedFormula === 'level+ability') return Math.max(1, source.level + abilityModifier(source.ability));
    if (profile.preparedFormula === 'half-level+ability-floor') return Math.max(1, Math.floor(source.level / 2) + abilityModifier(source.ability));
    return progressionValue(profile.prepared, source.level);
  }

  function selectionLabel(source) {
    return profileFor(source.id)?.selectionMode === 'known' ? 'Spells Known' : 'Prepared Choices';
  }

  function spellKey(name) {
    return `spell:${text(name).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}`;
  }

  function codexUrlForSpell(spell) {
    if (!spell) return 'codex.html';
    const localId = spell.codexId || `${config.edition}-spell-${spell.id}`;
    const globalId = [config.settings?.systemId || 'dnd5e', config.edition, 'spell', localId].join(':');
    const params = new URLSearchParams({ game:config.settings?.systemId || 'dnd5e', edition:config.edition, type:'spell', entry:globalId });
    return `codex.html?${params.toString()}`;
  }

  /* ========================================================
     STRUCTURED STATE / BUILD-1 MIGRATION
     ======================================================== */

  function defaultSourceState(id) {
    const base = { cantrips:[], prepared:[], secrets:[], subclassBonus:[], subclassId:'', manualSubclassName:'', subclassChoice:'', notes:'' };
    if (id === WIZARD_ID) return { ...base, spellbook:[] };
    return { ...base, arcanum:{} };
  }

  function legacyManualText(source) {
    const manual = source?.manual;
    if (!manual || typeof manual !== 'object') return '';
    const lines = [];
    const levels = manual.levels && typeof manual.levels === 'object' ? manual.levels : {};
    Object.keys(levels).sort((a,b) => Number(a)-Number(b)).forEach((level) => {
      const value = text(levels[level]);
      if (!value) return;
      lines.push(`${Number(level) === 0 ? 'Cantrips' : `${ordinal(Number(level))}-level`}: ${value}`);
    });
    if (text(manual.notes)) lines.push(`Notes: ${text(manual.notes)}`);
    return lines.join('\n');
  }

  function migrateBridgeState(id, source) {
    if (!source || id === WIZARD_ID || source.manualMigrated) return;
    const legacy = legacyManualText(source);
    if (legacy) {
      const heading = 'Previous manual spell-page notes (preserved from Spellcasting Build 1):';
      source.notes = [text(source.notes), heading, legacy].filter(Boolean).join('\n\n');
    }
    source.manualMigrated = true;
  }

  function ensureSourceState(id) {
    if (!state.structured.sources[id]) state.structured.sources[id] = defaultSourceState(id);
    const source = state.structured.sources[id];
    migrateBridgeState(id, source);
    if (!Array.isArray(source.cantrips)) source.cantrips = [];
    if (!Array.isArray(source.prepared)) source.prepared = [];
    if (!Array.isArray(source.secrets)) source.secrets = [];
    if (!Array.isArray(source.subclassBonus)) source.subclassBonus = [];
    if (typeof source.subclassId !== 'string') source.subclassId = text(source.subclassId);
    if (typeof source.manualSubclassName !== 'string') source.manualSubclassName = text(source.manualSubclassName);
    if (typeof source.subclassChoice !== 'string') source.subclassChoice = text(source.subclassChoice);
    if (id === WIZARD_ID && !Array.isArray(source.spellbook)) source.spellbook = [];
    if (id !== WIZARD_ID && (!source.arcanum || typeof source.arcanum !== 'object' || Array.isArray(source.arcanum))) source.arcanum = {};
    if (typeof source.notes !== 'string') source.notes = text(source.notes);
    return source;
  }

  function sanitizeSource(id, source) {
    source.cantrips = uniqueStrings(source.cantrips).filter((name) => state.spellByName.get(name.toLowerCase())?.level === 0);
    source.prepared = uniqueStrings(source.prepared).filter((name) => (state.spellByName.get(name.toLowerCase())?.level || 0) > 0);
    source.secrets = uniqueStrings(source.secrets).filter((name) => Boolean(state.spellByName.get(name.toLowerCase())));
    source.subclassBonus = uniqueStrings(source.subclassBonus).filter((name) => Boolean(state.spellByName.get(name.toLowerCase())));
    source.subclassId = text(source.subclassId);
    source.manualSubclassName = text(source.manualSubclassName);
    source.subclassChoice = text(source.subclassChoice);
    source.notes = text(source.notes);

    if (id === WIZARD_ID) {
      source.spellbook = uniqueStrings(source.spellbook).filter((name) => {
        const spell = state.spellByName.get(name.toLowerCase());
        return Boolean(spell && spell.level > 0 && spell.classes?.includes(WIZARD_ID));
      });
      const book = new Set(source.spellbook.map((name) => name.toLowerCase()));
      source.prepared = source.prepared.filter((name) => book.has(name.toLowerCase()));
      return;
    }

    if (id === 'warlock') {
      for (const level of [6,7,8,9]) {
        const value = text(source.arcanum?.[level] || source.arcanum?.[String(level)]);
        const spell = state.spellByName.get(value.toLowerCase());
        if (value && spell?.level === level && spell.classes?.includes('warlock')) source.arcanum[level] = spell.name;
        else delete source.arcanum[level];
      }
    }
  }

  function sanitizeState() {
    if (!state.structured || typeof state.structured !== 'object' || Array.isArray(state.structured)) {
      state.structured = { version:STATE_VERSION, edition:config?.edition || '2024', sources:{} };
    }
    if (!state.structured.sources || typeof state.structured.sources !== 'object' || Array.isArray(state.structured.sources)) state.structured.sources = {};
    state.structured.version = STATE_VERSION;
    state.structured.edition = config?.edition || '2024';
    Object.entries(state.structured.sources).forEach(([id, source]) => sanitizeSource(id, ensureSourceState(id)));
  }

  function hydrateStateField() {
    const raw = text(getStateField()?.value);
    if (!raw) {
      state.structured = { version:STATE_VERSION, edition:config?.edition || '2024', sources:{} };
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) state.structured = parsed;
    } catch (error) {
      console.warn('Spellcasting state could not be parsed. Starting empty.', error);
      state.structured = { version:STATE_VERSION, edition:config?.edition || '2024', sources:{} };
    }
    sanitizeState();
  }

  function syncStateField({ notify=true } = {}) {
    const field = getStateField();
    if (!field) return;
    sanitizeState();
    const next = JSON.stringify(state.structured);
    if (field.value === next) return;
    writingStateField = true;
    field.value = next;
    writingStateField = false;
    if (notify) field.dispatchEvent(new Event('input',{bubbles:true}));
  }

  /* ========================================================
     ACTIVE SOURCES / MULTICLASS SLOTS
     ======================================================== */

  function getActiveSources() {
    return Array.from(document.querySelectorAll('.class-level-row')).map((row,rowIndex) => {
      const className = text(row.querySelector('.char-class-select')?.value);
      const level = clampLevel(row.querySelector('.char-level-select')?.value);
      const entry = window.CharacterClasses?.findEntry?.(className) || null;
      if (!entry?.spellcastingAbility) return null;
      const id = entry.id || classId(className);
      const profile = profileFor(id);
      if (!profile || level < (profile.startsAt || 1)) return null;
      return { rowIndex, id, name:entry.name || className, level, ability:entry.spellcastingAbility, entry };
    }).filter(Boolean);
  }

  function nonPactSources(sources) { return sources.filter((source) => !PACT_CASTERS.has(source.id)); }

  function effectiveCasterLevel(sources) {
    return Math.min(20, nonPactSources(sources).reduce((total,source) => {
      if (FULL_CASTERS.has(source.id)) return total + source.level;
      if (HALF_CASTERS.has(source.id)) {
        return total + (config?.edition === '2014' ? Math.floor(source.level / 2) : Math.ceil(source.level / 2));
      }
      return total;
    },0));
  }

  function sharedSpellSlots(sources) {
    const level = effectiveCasterLevel(sources);
    return level > 0 ? FULL_SLOTS[level] || [] : [];
  }

  function slotSummary(slots) {
    if (!slots?.length) return 'No shared Spellcasting slots';
    return slots.map((count,index) => `L${index+1}: ${count}`).join('  •  ');
  }

  function classSlots(source) {
    const profile = profileFor(source.id);
    if (!profile) return [];
    if (profile.slots === 'full') return FULL_SLOTS[source.level] || [];
    if (profile.slots === 'half') return (config?.edition === '2014' ? HALF_SLOTS_2014[source.level] : HALF_SLOTS_2024[source.level]) || [];
    return [];
  }

  function maxClassSpellLevel(source) {
    if (source.id === 'warlock') return progressionValue(profileFor('warlock').pactLevel, source.level);
    return Math.max(1, classSlots(source).length);
  }

  function minimumClassLevelForSpell(sourceId, spellLevel) {
    if (spellLevel <= 0) return profileFor(sourceId)?.startsAt || 1;
    const profile = profileFor(sourceId);
    if (!profile || profile.slots === 'pact') return 1;
    for (let level=1; level<=20; level += 1) {
      const slots = profile.slots === 'full' ? FULL_SLOTS[level] || [] : (config?.edition === '2014' ? HALF_SLOTS_2014[level] : HALF_SLOTS_2024[level]) || [];
      if (slots.length >= spellLevel) return level;
    }
    return 20;
  }

  function availableSubclassFor(source) {
    return state.subclasses.get(source.id) || null;
  }

  function subclassFor(source) {
    const subclass = availableSubclassFor(source);
    if (!subclass) return null;
    const chosen = text(ensureSourceState(source.id).subclassId);
    return chosen === subclass.id ? subclass : null;
  }

  function subclassAvailable(source) {
    const subclass = availableSubclassFor(source);
    return Boolean(subclass && source.level >= Number(subclass.minimumLevel || 1));
  }

  function subclassActive(source) {
    const subclass = subclassFor(source);
    return Boolean(subclass && source.level >= Number(subclass.minimumLevel || 1));
  }

  function subclassChoiceOption(source) {
    const subclass = subclassFor(source);
    const group = subclass?.magic?.choiceGroup;
    if (!group || !subclassActive(source)) return null;
    const value = text(ensureSourceState(source.id).subclassChoice);
    return (group.options || []).find((option) => option.id === value) || null;
  }

  function subclassAlwaysPrepared(source) {
    const subclass = subclassFor(source);
    if (!subclassActive(source) || !subclass?.magic) return [];
    const result = [];
    (subclass.magic.alwaysPrepared || []).forEach((entry) => {
      if (source.level >= Number(entry.classLevel || 1)) result.push({ level:Number(entry.classLevel || 1), spell:entry.spell, reason:subclass.name });
    });
    const option = subclassChoiceOption(source);
    (option?.alwaysPrepared || []).forEach((entry) => {
      if (source.level >= Number(entry.classLevel || 1)) result.push({ level:Number(entry.classLevel || 1), spell:entry.spell, reason:`${subclass.name} — ${option.name}` });
    });
    return result;
  }

  function subclassExpandedSpellNames(source) {
    const subclass = subclassFor(source);
    if (!subclassActive(source)) return new Set();
    return new Set((subclass?.magic?.expandedClassList || []).map((name) => text(name).toLowerCase()));
  }

  function subclassBonusRule(source) {
    const subclass = subclassFor(source);
    if (!subclassActive(source)) return null;
    return (subclass?.magic?.bonusSelections || []).filter((rule) => source.level >= Number(rule.classLevel || 1)).slice(-1)[0] || null;
  }

  function bardMagicalSecretsTarget(level) {
    if (config?.edition !== '2014') return 0;
    if (level >= 18) return 6;
    if (level >= 14) return 4;
    if (level >= 10) return 2;
    return 0;
  }

  function standardSelectionLimit(source) {
    const total = totalSelectionLimit(source);
    if (config?.edition === '2014' && source.id === 'bard') return Math.max(0, total - bardMagicalSecretsTarget(source.level));
    return total;
  }

  function alwaysPrepared(source) {
    const profile = profileFor(source.id);
    const result = (profile?.alwaysPrepared || []).filter((entry) => source.level >= entry.level).map((entry) => ({...entry}));
    result.push(...subclassAlwaysPrepared(source));
    if (config?.edition === '2024' && source.id === 'bard' && source.level >= 20) {
      result.push({level:20,spell:'Power Word Heal',reason:'Words of Creation'});
      result.push({level:20,spell:'Power Word Kill',reason:'Words of Creation'});
    }
    return result;
  }

  function alwaysPreparedNameSet(source) {
    return new Set(alwaysPrepared(source).map((entry) => entry.spell.toLowerCase()));
  }

  /* ========================================================
     SPELL POOLS
     ======================================================== */

  function spellsForClass(className, level=null) {
    const values = state.classSpells.get(className) || [];
    return level === null ? values : values.filter((spell) => spell.level === level);
  }

  function bardMagicalSecretsCap(level) {
    if (config?.edition === '2014') return bardMagicalSecretsTarget(level);
    if (level < 10) return 0;
    const prepared = PROFILES_BY_EDITION['2024'].bard.prepared;
    let cap = 0;
    for (let current=10; current<=level; current += 1) {
      cap += 1; // one replacement opportunity on gaining each Bard level
      const currentPrepared = prepared[current-1] || 0;
      const previousPrepared = prepared[current-2] || 0;
      if (currentPrepared > previousPrepared) cap += currentPrepared - previousPrepared;
    }
    return cap;
  }

  function bardOffList(name) {
    const spell = state.spellByName.get(text(name).toLowerCase());
    return Boolean(spell && !spell.classes?.includes('bard'));
  }

  function preparedPool(source, spellLevel) {
    if (config?.edition === '2024' && source.id === 'bard' && source.level >= 10) {
      const allowed = new Set(['bard','cleric','druid','wizard']);
      return state.spells.filter((spell) => spell.level === spellLevel && spell.classes?.some((cid) => allowed.has(cid)));
    }

    const base = spellsForClass(source.id, spellLevel);
    const expanded = subclassExpandedSpellNames(source);
    if (!expanded.size) return base;
    const extra = state.spells.filter((spell) => spell.level === spellLevel && expanded.has(spell.name.toLowerCase()));
    const seen = new Set();
    return [...base,...extra].filter((spell) => { const key=spell.name.toLowerCase(); if(seen.has(key)) return false; seen.add(key); return true; });
  }

  function selectablePool(source, spellLevel) {
    const always = alwaysPreparedNameSet(source);
    return preparedPool(source, spellLevel).filter((spell) => !always.has(spell.name.toLowerCase()));
  }

  function cantripPool(source) {
    return spellsForClass(source.id,0);
  }

  function specialLabel(spell) {
    const flags = [];
    if (spell.concentration) flags.push('C');
    if (spell.ritual) flags.push('R');
    if (spell.material) flags.push('M');
    return flags.length ? ` [${flags.join(', ')}]` : '';
  }

  function optionLabel(spell, source) {
    const magicalSecret = source?.id === 'bard' && source.level >= 10 && !spell.classes?.includes('bard');
    return `${spell.name} — ${spell.school}${specialLabel(spell)}${magicalSecret ? ' • Magical Secret' : ''}`;
  }

  /* ========================================================
     PAGE 1 SUMMARY / PAGE SHELLS
     ======================================================== */

  function setLegacyPageVisibility(visible) { getLegacyPages().forEach((page) => { page.hidden = !visible; }); }

  function updatePrimarySummary(sources) {
    const box = document.querySelector('.spellcasting-summary-box');
    const heading = box?.querySelector('.fantasy-header');
    const abilitySelect = document.getElementById('spell-ability');
    const dcInput = document.getElementById('spell-dc');
    const attackInput = document.getElementById('spell-atk');
    if (!box) return;
    if (sources.length === 0) { box.hidden = true; if (abilitySelect) abilitySelect.disabled = false; return; }
    box.hidden = false;
    const primary = sources[0];
    const stats = spellStats(primary.ability);
    if (heading) heading.textContent = sources.length > 1 ? `Primary Spellcasting Stats — ${primary.name}` : `${primary.name} Spellcasting Stats`;
    if (abilitySelect) { abilitySelect.value = primary.ability; abilitySelect.disabled = true; }
    if (dcInput) dcInput.value = String(stats.saveDc);
    if (attackInput) attackInput.value = formatSigned(stats.attack);
  }

  function statCard(label,value) {
    const card = make('div','spell-stat-card');
    card.append(make('span','spell-stat-label',label),make('span','spell-stat-value',value));
    return card;
  }

  function sourceHeader(source,pageNumber,subtitle) {
    const fragment = document.createDocumentFragment();
    const heading = make('h2','fantasy-header spell-source-heading',`${source.name} Spellcasting`);
    const sub = make('div','spell-source-subtitle',`${subtitle} • Magic Page ${pageNumber} of 2`);
    const stats = spellStats(source.ability);
    const row = make('div','spell-source-stats');
    row.append(
      statCard('Class Level',String(source.level)),statCard('Ability',abilityLabel(source.ability)),
      statCard('Ability Mod',formatSigned(stats.modifier)),statCard('Save DC',String(stats.saveDc)),statCard('Spell Attack',formatSigned(stats.attack))
    );
    fragment.append(heading,sub,row); return fragment;
  }

  function createPage(source,pageNumber,subtitle) {
    const page = make('section','sheet-page dynamic-spell-page');
    page.id = `spell-page-${source.id}-${pageNumber}`;
    page.dataset.spellSource = source.id;
    page.dataset.spellPage = String(pageNumber);
    page.append(sourceHeader(source,pageNumber,subtitle));
    return page;
  }

  function progressCard(value,label) {
    const card = make('div','spell-progress-card');
    card.append(make('strong','',value),document.createTextNode(label)); return card;
  }

  function sourceSlotLines(source,sources) {
    const box = make('div','spell-slot-stack');
    if (source.id === 'warlock') {
      const profile = profileFor('warlock');
      const count = progressionValue(profile.pactSlots,source.level);
      const level = progressionValue(profile.pactLevel,source.level);
      box.append(make('div','spell-slots-line',`Pact Magic • ${count} slot${count===1?'':'s'} • Level ${level} • recover on Short or Long Rest`));
      const shared = sharedSpellSlots(sources);
      if (shared.length) box.append(make('div','spell-slots-line secondary-slot-line',`Other Spellcasting slots • ${slotSummary(shared)} • may also cast prepared Warlock spells`));
      return box;
    }
    box.append(make('div','spell-slots-line',`${sources.filter((s) => s.id !== 'warlock').length > 1 ? `Shared multiclass Spellcasting slots (caster level ${effectiveCasterLevel(sources)})` : 'Spell Slots'} • ${slotSummary(sharedSpellSlots(sources))}`));
    if (sources.some((s) => s.id === 'warlock')) box.append(make('div','spell-slots-line secondary-slot-line','Pact Magic slots are tracked on the Warlock pages and can also cast eligible prepared spells.'));
    return box;
  }

  function alwaysPreparedBox(source) {
    const entries = alwaysPrepared(source);
    if (!entries.length) return null;
    const box = make('div','always-prepared-box');
    box.append(make('div','always-prepared-title','Always Prepared'));
    const chips = make('div','always-prepared-chips');
    entries.forEach((entry) => {
      const wrap = make('span','always-prepared-chip');
      const label = make('span','always-prepared-spell',entry.spell);
      label.title = entry.reason;
      label.dataset.spellKnowledge = spellKey(entry.spell);
      const spell = state.spellByName.get(entry.spell.toLowerCase());
      wrap.appendChild(label);
      if (spell) {
        const link=make('a','always-prepared-codex','↗'); link.href=codexUrlForSpell(spell); link.target='_blank'; link.rel='noopener'; link.setAttribute('aria-label',`Open ${entry.spell} in the Codex`); wrap.appendChild(link);
      }
      chips.appendChild(wrap);
    });
    box.appendChild(chips);
    return box;
  }

  function classNote(profile) {
    if (!profile?.notes) return null;
    return make('div','spell-rule-note',profile.notes);
  }

  function spellTools(spellName, removeControl=null) {
    const tools = make('span','spell-row-tools');
    const spell = state.spellByName.get(text(spellName).toLowerCase());
    if (spell) {
      const info = make('button','spell-info-button','i');
      info.type = 'button';
      info.dataset.spellKnowledge = spellKey(spell.name);
      info.setAttribute('aria-label',`Show Knowledge Card for ${spell.name}`);
      info.title = `Knowledge Card: ${spell.name}`;
      const link = make('a','spell-codex-link','Codex');
      link.href = codexUrlForSpell(spell);
      link.target = '_blank';
      link.rel = 'noopener';
      link.setAttribute('aria-label',`Open ${spell.name} in the Codex`);
      tools.append(info,link);
    }
    if (removeControl) tools.appendChild(removeControl);
    return tools;
  }

  function subclassPanel(source) {
    const available = availableSubclassFor(source);
    if (!available || !subclassAvailable(source)) return null;

    const sourceState = ensureSourceState(source.id);
    const selected = subclassFor(source);
    const box = make('div','subclass-magic-box');
    const head = make('div','subclass-magic-heading');
    head.append(make('strong','',`Subclass Magic`));
    box.appendChild(head);

    const selectRow = make('label','subclass-choice-row');
    selectRow.appendChild(make('span','',`${source.name} subclass`));
    const subclassSelect = make('select','fantasy-input subclass-choice-select');
    subclassSelect.dataset.spellAction='subclass-select';
    subclassSelect.dataset.spellSource=source.id;

    const blank = document.createElement('option');
    blank.value='';
    blank.textContent='Choose subclass…';
    subclassSelect.appendChild(blank);

    const manual = document.createElement('option');
    manual.value='__manual__';
    manual.textContent='Other / manual subclass (no automatic SRD magic)';
    subclassSelect.appendChild(manual);

    const srd = document.createElement('option');
    srd.value=available.id;
    srd.textContent=`${available.name} (SRD)`;
    subclassSelect.appendChild(srd);
    subclassSelect.value=sourceState.subclassId || '';
    selectRow.appendChild(subclassSelect);
    box.appendChild(selectRow);

    if (!selected) {
      if (sourceState.subclassId === '__manual__') {
        const manualName = make('input','fantasy-input subclass-manual-name');
        manualName.type='text';
        manualName.dataset.spellAction='manual-subclass-name';
        manualName.dataset.spellSource=source.id;
        manualName.placeholder='Manual subclass name (optional)…';
        manualName.value=sourceState.manualSubclassName || '';
        box.appendChild(manualName);
        box.appendChild(make('div','subclass-magic-note','Manual/expanded subclasses remain usable, but My RPG Source only auto-applies magic that is present in the licensed SRD data.'));
      } else {
        box.appendChild(make('div','subclass-magic-note','Choose the SRD subclass to apply its licensed spell rules automatically, or choose Other / manual subclass for material from another source.'));
      }
      return box;
    }

    const group = selected?.magic?.choiceGroup;
    if (group) {
      const row = make('label','subclass-choice-row');
      row.appendChild(make('span','',group.label));
      const select = make('select','fantasy-input subclass-choice-select');
      select.dataset.spellAction='subclass-choice';
      select.dataset.spellSource=source.id;
      const blank=document.createElement('option'); blank.value=''; blank.textContent=`Choose ${group.label}…`; select.appendChild(blank);
      (group.options || []).forEach((option)=>{ const item=document.createElement('option'); item.value=option.id; item.textContent=option.name; select.appendChild(item); });
      select.value=sourceState.subclassChoice || '';
      row.appendChild(select); box.appendChild(row);
      if (group.changeTiming) box.appendChild(make('div','subclass-magic-note',group.changeTiming));
    }

    if (selected?.magic?.note) box.appendChild(make('div','subclass-magic-note',selected.magic.note));
    return box;
  }


  function allSelectedNames(source) {
    const s=ensureSourceState(source.id);
    return new Set([...s.cantrips,...s.prepared,...(s.spellbook || []),...s.secrets,...s.subclassBonus].map((name)=>text(name).toLowerCase()));
  }

  function renderBonusSelectionTier(source, key, label, count, values, pool, actionPrefix, note='') {
    const tier=make('div','smart-spell-tier subclass-bonus-tier');
    const head=make('div','smart-spell-tier-header');
    head.append(make('h3','smart-spell-tier-title',label),make('span','smart-spell-tier-meta',`${values.length} / ${count} selected`));
    tier.appendChild(head);
    if (note) tier.appendChild(make('div','subclass-magic-note',note));
    const selected=allSelectedNames(source);
    values.forEach((name,index)=>{
      const row=make('div','smart-spell-row cantrip-row');
      const select=createSpellSelect({source,spells:pool,value:name,placeholder:`Choose ${label} spell…`,action:`replace-${actionPrefix}`,spellLevel:-1,index,selectedNames:selected});
      row.append(select,spellTools(name,removeButton(source.id,`remove-${actionPrefix}`,index,`Remove ${name}`))); tier.appendChild(row);
    });
    if (values.length < count) {
      const add=make('div','smart-spell-add-row');
      add.appendChild(createSpellSelect({source,spells:pool,placeholder:`Choose ${label} spell…`,action:`add-${actionPrefix}`,spellLevel:-1,selectedNames:selected})); tier.appendChild(add);
    } else tier.appendChild(make('div','smart-spell-full',`${label} choices full`));
    return tier;
  }

  function bardSecretsPool(source) {
    const max=maxClassSpellLevel(source);
    return state.spells.filter((spell)=>spell.level===0 || (spell.level>0 && spell.level<=max));
  }

  function render2014BardSecrets(source) {
    if (config?.edition !== '2014' || source.id !== 'bard') return null;
    const count=bardMagicalSecretsTarget(source.level); if(!count) return null;
    const sourceState=ensureSourceState(source.id);
    return renderBonusSelectionTier(source,'secrets','Magical Secrets',count,sourceState.secrets,bardSecretsPool(source),'bard-secret','These spells count inside the Bard table’s total Spells Known, but may come from any class.');
  }

  function renderSubclassBonus(source) {
    const rule=subclassBonusRule(source); if(!rule) return null;
    const sourceState=ensureSourceState(source.id);
    const pool=rule.pool==='all-spells' ? bardSecretsPool(source) : state.spells.filter((spell)=>spell.level<=maxClassSpellLevel(source));
    return renderBonusSelectionTier(source,'subclassBonus',rule.label || 'Subclass Bonus Spells',Number(rule.count || 0),sourceState.subclassBonus,pool,'subclass-bonus',rule.note || '');
  }

  /* ========================================================
     SELECT HELPERS
     ======================================================== */

  function createSpellSelect({ source, spells, value='', placeholder, action, spellLevel, index, selectedNames, currentMayUseOffList=false }) {
    const select = make('select','fantasy-input smart-spell-select');
    select.dataset.spellAction = action;
    select.dataset.spellSource = source.id;
    select.dataset.spellLevel = String(spellLevel);
    if (index !== undefined) select.dataset.spellIndex = String(index);
    const empty = document.createElement('option');
    empty.value = ''; empty.textContent = placeholder; select.appendChild(empty);

    let pool = spells.slice();
    const currentSpell = state.spellByName.get(text(value).toLowerCase());
    if (value && currentSpell && !pool.some((spell) => spell.name.toLowerCase() === value.toLowerCase())) pool.unshift(currentSpell);

    const sourceState = ensureSourceState(source.id);
    const effectivePrepared = selectedPreparedEntries(source).map((entry) => entry.name);
    const offCount = config?.edition === '2024' && source.id === 'bard' ? effectivePrepared.filter(bardOffList).length : 0;
    const offCap = config?.edition === '2024' && source.id === 'bard' ? bardMagicalSecretsCap(source.level) : 0;

    pool.forEach((spell) => {
      const option = document.createElement('option');
      option.value = spell.name;
      option.textContent = optionLabel(spell,source);
      const duplicate = selectedNames?.has(spell.name.toLowerCase()) && spell.name.toLowerCase() !== text(value).toLowerCase();
      let blockedSecret = false;
      if (config?.edition === '2024' && source.id === 'bard' && source.level >= 10 && bardOffList(spell.name)) {
        const currentOff = currentMayUseOffList && bardOffList(value) ? 1 : 0;
        blockedSecret = (offCount - currentOff) >= offCap && spell.name.toLowerCase() !== text(value).toLowerCase();
      }
      option.disabled = Boolean(duplicate || blockedSecret);
      select.appendChild(option);
    });
    select.value = value;
    return select;
  }

  function removeButton(sourceId,action,index,label) {
    const button = make('button','smart-spell-remove','×');
    button.type = 'button'; button.dataset.spellAction = action; button.dataset.spellSource = sourceId; button.dataset.spellIndex = String(index);
    button.setAttribute('aria-label',label); return button;
  }

  function selectedPreparedEntries(source) {
    const sourceState = ensureSourceState(source.id);
    const always = alwaysPreparedNameSet(source);
    return sourceState.prepared.map((name,index) => ({name,index,spell:state.spellByName.get(name.toLowerCase())})).filter((entry) => !always.has(entry.name.toLowerCase()));
  }

  /* ========================================================
     GENERIC SMART CASTER (BARD/CLERIC/DRUID/PALADIN/RANGER/SORCERER)
     ======================================================== */

  function renderCantrips(source,sourceState) {
    const profile = profileFor(source.id);
    const limit = progressionValue(profile.cantrips,source.level);
    if (!limit) return null;
    const tier = make('div','smart-spell-tier');
    const header = make('div','smart-spell-tier-header');
    header.append(make('h3','smart-spell-tier-title','Cantrips'),make('span','smart-spell-tier-meta',`${sourceState.cantrips.length} / ${limit} known`));
    tier.appendChild(header);
    const pool = cantripPool(source);
    const selected = new Set(sourceState.cantrips.map((name) => name.toLowerCase()));

    sourceState.cantrips.forEach((name,index) => {
      const row = make('div','smart-spell-row cantrip-row');
      row.append(
        createSpellSelect({source,spells:pool,value:name,placeholder:`Choose ${source.name} cantrip…`,action:'replace-cantrip',spellLevel:0,index,selectedNames:selected}),
        spellTools(name,removeButton(source.id,'remove-cantrip',index,`Remove ${name}`))
      );
      tier.appendChild(row);
    });

    if (sourceState.cantrips.length < limit) {
      const add = make('div','smart-spell-add-row');
      add.appendChild(createSpellSelect({source,spells:pool,placeholder:`Choose another ${source.name} cantrip…`,action:'add-cantrip',spellLevel:0,selectedNames:selected}));
      tier.appendChild(add);
    } else tier.appendChild(make('div','smart-spell-full','Cantrip choices full'));

    if (sourceState.cantrips.length > limit) tier.appendChild(make('div','smart-spell-warning',`${source.name} level ${source.level} normally knows ${limit} cantrip${limit===1?'':'s'}. Extra saved choices were not deleted automatically.`));
    return tier;
  }

  function renderPreparedTier(source,sourceState,spellLevel) {
    const profile = profileFor(source.id);
    const maxLevel = maxClassSpellLevel(source);
    const unlocked = spellLevel <= maxLevel;
    const limit = standardSelectionLimit(source);
    const entries = selectedPreparedEntries(source).filter((entry) => entry.spell?.level === spellLevel);
    const allChosen = selectedPreparedEntries(source);
    const tier = make('div','smart-spell-tier');
    if (!unlocked) tier.classList.add('is-locked');
    if (!unlocked && entries.length) tier.classList.add('has-stored-spells');
    const header = make('div','smart-spell-tier-header');
    header.append(
      make('h3','smart-spell-tier-title',`${ordinal(spellLevel)}-Level Spells`),
      make('span','smart-spell-tier-meta',unlocked ? `${entries.length} selected • ${allChosen.length} / ${limit} total` : `Unlocks at ${source.name} ${minimumClassLevelForSpell(source.id,spellLevel)}`)
    );
    tier.appendChild(header);

    const pool = selectablePool(source,spellLevel);
    const selected = new Set(allChosen.map((entry) => entry.name.toLowerCase()));
    entries.forEach((entry) => {
      const row = make('div','smart-spell-row cantrip-row');
      const select = createSpellSelect({source,spells:pool,value:entry.name,placeholder:`Choose ${ordinal(spellLevel)}-level ${source.name} spell…`,action:'replace-prepared',spellLevel,index:entry.index,selectedNames:selected,currentMayUseOffList:true});
      if (!unlocked) select.disabled = true;
      row.append(select,spellTools(entry.name,removeButton(source.id,'remove-prepared',entry.index,`Remove ${entry.name}`)));
      tier.appendChild(row);
    });

    if (unlocked && allChosen.length < limit) {
      const add = make('div','smart-spell-add-row');
      add.appendChild(createSpellSelect({source,spells:pool,placeholder:`Add ${ordinal(spellLevel)}-level ${source.name} spell…`,action:'add-prepared',spellLevel,selectedNames:selected}));
      tier.appendChild(add);
    } else if (unlocked) {
      tier.appendChild(make('div','smart-spell-full','Prepared choices full'));
    } else if (!entries.length) {
      tier.appendChild(make('div','smart-spell-locked-message',`${ordinal(spellLevel)}-level ${source.name} spells are not available yet.`));
    }
    return tier;
  }

  function renderGenericSmartPages(source,sources) {
    const profile = profileFor(source.id);
    const sourceState = ensureSourceState(source.id);
    sanitizeSource(source.id,sourceState);
    const cantripLimit = progressionValue(profile.cantrips,source.level);
    const preparedLimit = standardSelectionLimit(source);
    const totalLimit = totalSelectionLimit(source);
    const chosen = selectedPreparedEntries(source);

    const pageOne = createPage(source,1,'Cantrips, prepared spells, and spell slots');
    const progress = make('div','spell-progress-row');
    if (cantripLimit) progress.append(progressCard(`${sourceState.cantrips.length} / ${cantripLimit}`,'Cantrips Known'));
    progress.append(progressCard(`${chosen.length} / ${preparedLimit}`,selectionLabel(source)));
    if (config?.edition === '2014' && source.id === 'bard' && bardMagicalSecretsTarget(source.level)) {
      const secretCount=ensureSourceState(source.id).secrets.length;
      progress.append(progressCard(`${secretCount} / ${bardMagicalSecretsTarget(source.level)}`,'Magical Secrets'));
    } else if (config?.edition === '2024' && source.id === 'bard' && source.level >= 10) {
      const secrets = chosen.filter((entry) => bardOffList(entry.name)).length;
      progress.append(progressCard(`${secrets} / ${bardMagicalSecretsCap(source.level)}`,'Magical Secrets Used'));
    } else {
      progress.append(progressCard(String(maxClassSpellLevel(source)),'Highest Class Spell Level'));
    }
    pageOne.append(progress,sourceSlotLines(source,sources));
    const subclass = subclassPanel(source); if (subclass) pageOne.appendChild(subclass);
    const always = alwaysPreparedBox(source); if (always) pageOne.appendChild(always);
    const bardSecrets = render2014BardSecrets(source); if (bardSecrets) pageOne.appendChild(bardSecrets);
    const subclassBonus = renderSubclassBonus(source); if (subclassBonus) pageOne.appendChild(subclassBonus);
    const note = classNote(profile); if (note) pageOne.appendChild(note);

    const gridOne = make('div','smart-spell-grid');
    const left = make('div','smart-spell-column');
    const right = make('div','smart-spell-column');
    const cantrips = renderCantrips(source,sourceState); if (cantrips) left.appendChild(cantrips);

    if (HALF_CASTERS.has(source.id)) {
      /* Paladin/Ranger never gain class spells above level 5. Keep their
         two pages focused on levels that can actually matter to the class. */
      [1,2].forEach((level) => left.appendChild(renderPreparedTier(source,sourceState,level)));
      [3].forEach((level) => right.appendChild(renderPreparedTier(source,sourceState,level)));
    } else {
      [1,2].forEach((level) => left.appendChild(renderPreparedTier(source,sourceState,level)));
      [3,4,5].forEach((level) => right.appendChild(renderPreparedTier(source,sourceState,level)));
    }

    gridOne.append(left,right); pageOne.appendChild(gridOne);

    if (chosen.length > preparedLimit) pageOne.insertBefore(make('div','smart-spell-warning',`${source.name} has ${chosen.length} selected prepared spells but level ${source.level} normally allows ${preparedLimit}. Nothing was deleted automatically.`),gridOne);
    if (config?.edition === '2024' && source.id === 'bard' && source.level >= 10) {
      const off = chosen.filter((entry) => bardOffList(entry.name)).length;
      const cap = bardMagicalSecretsCap(source.level);
      if (off > cap) pageOne.insertBefore(make('div','smart-spell-warning',`Magical Secrets selections exceed the progression allowance (${off} / ${cap}). Nothing was deleted automatically.`),gridOne);
    }

    const pageTwo = createPage(
      source,
      2,
      HALF_CASTERS.has(source.id)
        ? 'Upper-tier class magic and spellcasting notes'
        : 'Higher-level magic and class notes'
    );
    const gridTwo = make('div','smart-spell-grid');
    const highLeft = make('div','smart-spell-column');
    const highRight = make('div','smart-spell-column');

    if (HALF_CASTERS.has(source.id)) {
      highLeft.appendChild(renderPreparedTier(source,sourceState,4));
      highRight.appendChild(renderPreparedTier(source,sourceState,5));
    } else {
      [6,7].forEach((level) => highLeft.appendChild(renderPreparedTier(source,sourceState,level)));
      [8,9].forEach((level) => highRight.appendChild(renderPreparedTier(source,sourceState,level)));
    }

    gridTwo.append(highLeft,highRight);
    const notes = make('textarea','fantasy-input spell-source-notes');
    notes.dataset.spellAction = 'source-notes'; notes.dataset.spellSource = source.id;
    notes.placeholder = `${source.name} preparation notes, class-granted magic, subclass spells, resources, and reminders...`;
    notes.value = sourceState.notes || '';
    pageTwo.append(gridTwo,notes);
    return [pageOne,pageTwo];
  }

  /* ========================================================
     WIZARD SMART PROFILE
     ======================================================== */

  function wizardProgression(level) {
    const profile = profileFor('wizard');
    const source={id:'wizard',level:clampLevel(level),ability:'int'};
    return { cantrips:progressionValue(profile.cantrips,level), prepared:totalSelectionLimit(source), slots:FULL_SLOTS[clampLevel(level)] || [] };
  }

  function wizardBookTarget(level) { return 6 + (clampLevel(level)-1)*2; }
  function wizardMaxSpellLevel(level) { return Math.max(1,(FULL_SLOTS[clampLevel(level)] || []).length); }

  function wizardLevelCap(wizardLevel, spellLevel) {
    if (spellLevel <= 0) return 0;
    const level = clampLevel(wizardLevel);
    if (spellLevel === 1) {
      /* Six starting spells + two choices at each later level while level 1 remains eligible. */
      return wizardBookTarget(level);
    }
    const firstEligible = minimumClassLevelForSpell('wizard',spellLevel);
    if (level < firstEligible) return 0;
    /* At each Wizard level from first eligibility onward, at most two newly gained class spells can be this level. */
    return 2 * (level - firstEligible + 1);
  }

  function wizardSpellsAt(level) { return spellsForClass('wizard',level); }

  function renderWizardCantrips(source,sourceState,progression) {
    return renderCantrips(source,sourceState);
  }

  function wizardBookEntries(source,spellLevel) {
    const sourceState = ensureSourceState('wizard');
    return sourceState.spellbook.map((name,index) => ({name,index,spell:state.spellByName.get(name.toLowerCase())})).filter((entry) => entry.spell?.level === spellLevel);
  }

  function renderWizardTier(source,sourceState,progression,spellLevel) {
    const unlocked = spellLevel <= wizardMaxSpellLevel(source.level);
    const entries = wizardBookEntries(source,spellLevel);
    const tier = make('div','smart-spell-tier');
    if (!unlocked) tier.classList.add('is-locked');
    if (!unlocked && entries.length) tier.classList.add('has-stored-spells');
    const cap = wizardLevelCap(source.level,spellLevel);
    const header = make('div','smart-spell-tier-header');
    header.append(make('h3','smart-spell-tier-title',`${ordinal(spellLevel)}-Level Spells`),make('span','smart-spell-tier-meta',unlocked ? `${entries.length} class-learned • level cap ${cap}` : `Unlocks at Wizard ${minimumClassLevelForSpell('wizard',spellLevel)}`));
    tier.appendChild(header);

    const pool = wizardSpellsAt(spellLevel);
    const selected = new Set(sourceState.spellbook.map((name) => name.toLowerCase()));
    const prepared = new Set(sourceState.prepared.map((name) => name.toLowerCase()));
    const totalBookFull = sourceState.spellbook.length >= wizardBookTarget(source.level);
    const levelFull = entries.length >= cap;
    const prepFull = sourceState.prepared.length >= progression.prepared;

    entries.forEach((entry) => {
      const row = make('div','smart-spell-row');
      const select = createSpellSelect({source,spells:pool,value:entry.name,placeholder:`Choose ${ordinal(spellLevel)}-level Wizard spell…`,action:'replace-wizard-spell',spellLevel,index:entry.index,selectedNames:selected});
      if (!unlocked) select.disabled = true;
      const prepLabel = make('label','smart-spell-prepared');
      const checkbox = document.createElement('input'); checkbox.type='checkbox'; checkbox.dataset.spellAction='wizard-prepared'; checkbox.dataset.spellSource='wizard'; checkbox.dataset.spellIndex=String(entry.index);
      checkbox.checked = prepared.has(entry.name.toLowerCase()); checkbox.disabled = !unlocked || (!checkbox.checked && prepFull);
      prepLabel.append(checkbox,document.createTextNode('Prep'));
      row.append(select,prepLabel,spellTools(entry.name,removeButton('wizard','remove-wizard-spell',entry.index,`Remove ${entry.name} from spellbook`)));
      tier.appendChild(row);
    });

    if (unlocked && !totalBookFull && !levelFull) {
      const add = make('div','smart-spell-add-row');
      add.appendChild(createSpellSelect({source,spells:pool,placeholder:`Add ${ordinal(spellLevel)}-level Wizard spell…`,action:'add-wizard-spell',spellLevel,selectedNames:selected}));
      tier.appendChild(add);
    } else if (unlocked) {
      tier.appendChild(make('div','smart-spell-full',totalBookFull ? 'Class spellbook choices full' : `Maximum class-learned ${ordinal(spellLevel)}-level choices reached for this Wizard level`));
    } else if (!entries.length) tier.appendChild(make('div','smart-spell-locked-message',`${ordinal(spellLevel)}-level Wizard spells are not available yet.`));
    return tier;
  }

  function renderWizardPages(source,sources) {
    const sourceState = ensureSourceState('wizard'); sanitizeSource('wizard',sourceState);
    const progression = wizardProgression(source.level); const target = wizardBookTarget(source.level);
    const pageOne = createPage(source,1,'Spellbook, cantrips, preparation, and spell slots');
    const progress = make('div','spell-progress-row');
    progress.append(progressCard(`${sourceState.cantrips.length} / ${progression.cantrips}`,'Cantrips Known'),progressCard(`${sourceState.spellbook.length} / ${target}`,'Class Spellbook Choices'),progressCard(`${sourceState.prepared.length} / ${progression.prepared}`,'Prepared Spells'));
    pageOne.append(progress,sourceSlotLines(source,sources));
    const wizardSubclass=subclassPanel(source); if(wizardSubclass) pageOne.appendChild(wizardSubclass);
    const gridOne = make('div','smart-spell-grid');
const left=make('div','smart-spell-column'); const right=make('div','smart-spell-column');
    left.append(renderWizardCantrips(source,sourceState,progression),renderWizardTier(source,sourceState,progression,1),renderWizardTier(source,sourceState,progression,2));
    [3,4,5].forEach((level) => right.appendChild(renderWizardTier(source,sourceState,progression,level)));
    gridOne.append(left,right); pageOne.appendChild(gridOne);
    if (sourceState.spellbook.length > target) pageOne.insertBefore(make('div','smart-spell-warning',`The spellbook contains ${sourceState.spellbook.length} class-learned spells, while Wizard ${source.level} currently provides ${target}. Nothing was deleted automatically.`),gridOne);
    if (sourceState.prepared.length > progression.prepared) pageOne.insertBefore(make('div','smart-spell-warning',`Prepared spells exceed the Wizard limit (${sourceState.prepared.length} / ${progression.prepared}).`),gridOne);

    const pageTwo = createPage(source,2,'Higher-level spellbook and arcane notes');
    const gridTwo=make('div','smart-spell-grid'); const highLeft=make('div','smart-spell-column'); const highRight=make('div','smart-spell-column');
    [6,7].forEach((level)=>highLeft.appendChild(renderWizardTier(source,sourceState,progression,level)));
    [8,9].forEach((level)=>highRight.appendChild(renderWizardTier(source,sourceState,progression,level)));
    gridTwo.append(highLeft,highRight);
    const notes=make('textarea','fantasy-input spell-source-notes'); notes.dataset.spellAction='source-notes'; notes.dataset.spellSource='wizard'; notes.placeholder='Arcane Recovery, rituals, copied spells, found scrolls, Spell Mastery/Signature Spell choices, and other Wizard notes...'; notes.value=sourceState.notes || '';
    pageTwo.append(gridTwo,notes); return [pageOne,pageTwo];
  }

  /* ========================================================
     WARLOCK SMART PROFILE
     ======================================================== */

  function warlockArcanumThreshold(level) { return ({6:11,7:13,8:15,9:17})[level] || 99; }

  function renderArcanumTier(source,sourceState,spellLevel) {
    const unlocked = source.level >= warlockArcanumThreshold(spellLevel);
    const value = text(sourceState.arcanum?.[spellLevel]);
    const tier = make('div','smart-spell-tier arcanum-tier');
    if (!unlocked) tier.classList.add('is-locked');
    const header = make('div','smart-spell-tier-header');
    header.append(make('h3','smart-spell-tier-title',`Mystic Arcanum • ${ordinal(spellLevel)}`),make('span','smart-spell-tier-meta',unlocked ? 'Choose one Warlock spell • 1/Long Rest' : `Unlocks at Warlock ${warlockArcanumThreshold(spellLevel)}`)); tier.appendChild(header);
    const pool = spellsForClass('warlock',spellLevel);
    if (unlocked || value) {
      const select = createSpellSelect({source,spells:pool,value,placeholder:`Choose ${ordinal(spellLevel)}-level Mystic Arcanum…`,action:'warlock-arcanum',spellLevel,selectedNames:new Set()});
      if (!unlocked) select.disabled = true;
      if (value) { const row=make('div','smart-spell-row cantrip-row'); row.append(select,spellTools(value)); tier.appendChild(row); } else tier.appendChild(select);
      if (!unlocked && value) tier.appendChild(make('div','smart-spell-warning','Saved Arcanum retained after lowering Warlock level. Raise the class level or clear it.'));
    } else tier.appendChild(make('div','smart-spell-locked-message',`${ordinal(spellLevel)}-level Mystic Arcanum is not available yet.`));
    return tier;
  }

  function renderWarlockPages(source,sources) {
    const profile = profileFor('warlock'); const sourceState = ensureSourceState('warlock'); sanitizeSource('warlock',sourceState);
    const cantripLimit = progressionValue(profile.cantrips,source.level); const preparedLimit = standardSelectionLimit(source); const chosen=selectedPreparedEntries(source);
    const pactLevel = progressionValue(profile.pactLevel,source.level); const pactSlots = progressionValue(profile.pactSlots,source.level);
    const pageOne=createPage(source,1,'Pact Magic, prepared spells, and patron magic');
    const progress=make('div','spell-progress-row');
    progress.append(progressCard(`${sourceState.cantrips.length} / ${cantripLimit}`,'Cantrips Known'),progressCard(`${chosen.length} / ${preparedLimit}`,selectionLabel(source)),progressCard(`${pactSlots} × L${pactLevel}`,'Pact Magic Slots'));
    pageOne.append(progress,sourceSlotLines(source,sources));
    const warlockSubclass=subclassPanel(source); if(warlockSubclass) pageOne.appendChild(warlockSubclass);
    const always=alwaysPreparedBox(source); if(always) pageOne.appendChild(always);
    const gridOne=make('div','smart-spell-grid'); const left=make('div','smart-spell-column'); const right=make('div','smart-spell-column');
    left.append(renderCantrips(source,sourceState),renderPreparedTier(source,sourceState,1),renderPreparedTier(source,sourceState,2));
    [3,4,5].forEach((level)=>right.appendChild(renderPreparedTier(source,sourceState,level)));
    gridOne.append(left,right); pageOne.appendChild(gridOne);
    if (chosen.length > preparedLimit) pageOne.insertBefore(make('div','smart-spell-warning',`Warlock has ${chosen.length} selected Pact Magic spells but level ${source.level} normally allows ${preparedLimit}. Nothing was deleted automatically.`),gridOne);

    const pageTwo=createPage(source,2,'Mystic Arcanum and pact notes'); const gridTwo=make('div','smart-spell-grid'); const highLeft=make('div','smart-spell-column'); const highRight=make('div','smart-spell-column');
    [6,7].forEach((level)=>highLeft.appendChild(renderArcanumTier(source,sourceState,level))); [8,9].forEach((level)=>highRight.appendChild(renderArcanumTier(source,sourceState,level))); gridTwo.append(highLeft,highRight);
    const note=make('div','spell-rule-note','Mystic Arcanum spells are separate from the level 1–5 Pact Magic prepared-spell limit. Pact slots recover on a Short or Long Rest.');
    const notes=make('textarea','fantasy-input spell-source-notes'); notes.dataset.spellAction='source-notes'; notes.dataset.spellSource='warlock'; notes.placeholder='Eldritch Invocations, patron/subclass spells, Pact Boon magic, Mystic Arcanum reminders, and other Warlock notes...'; notes.value=sourceState.notes || '';
    pageTwo.append(note,gridTwo,notes); return [pageOne,pageTwo];
  }

  /* ========================================================
     RENDER
     ======================================================== */

  function render() {
    const host=getHost(); if(!host) return;
    setLegacyPageVisibility(false);
    const sources=getActiveSources(); updatePrimarySummary(sources); const fragment=document.createDocumentFragment();
    sources.forEach((source)=>{
      ensureSourceState(source.id);
      const pages = source.id === 'wizard' ? renderWizardPages(source,sources) : source.id === 'warlock' ? renderWarlockPages(source,sources) : renderGenericSmartPages(source,sources);
      pages.forEach((page)=>fragment.appendChild(page));
    });
    host.replaceChildren(fragment); state.active=sources.length>0;
    document.dispatchEvent(new CustomEvent('character:spellcasting-rendered',{detail:{edition:config.edition,sources:sources.map(({id,name,level,ability})=>({id,name,level,ability})),pageCount:sources.length*2,effectiveCasterLevel:effectiveCasterLevel(sources),sharedSlots:sharedSpellSlots(sources)}}));
  }

  /* ========================================================
     INTERACTIONS
     ======================================================== */

  function sourceStateForTarget(target) { return ensureSourceState(target.dataset.spellSource); }

  function changeCantrip(target) {
    const sourceState=sourceStateForTarget(target); const value=text(target.value); if(!value) return;
    const action=target.dataset.spellAction; const index=parseInt(target.dataset.spellIndex,10);
    if(action==='add-cantrip' && !sourceState.cantrips.some((name)=>name.toLowerCase()===value.toLowerCase())) sourceState.cantrips.push(value);
    if(action==='replace-cantrip' && Number.isInteger(index) && index>=0) sourceState.cantrips[index]=value;
    syncStateField(); render();
  }

  function changeGenericPrepared(target) {
    const sourceState=sourceStateForTarget(target); const value=text(target.value); if(!value) return;
    const action=target.dataset.spellAction; const index=parseInt(target.dataset.spellIndex,10);
    if(action==='add-prepared' && !sourceState.prepared.some((name)=>name.toLowerCase()===value.toLowerCase())) sourceState.prepared.push(value);
    if(action==='replace-prepared' && Number.isInteger(index) && index>=0) sourceState.prepared[index]=value;
    syncStateField(); render();
  }

  function changeWizardSpell(target) {
    const sourceState=ensureSourceState('wizard'); const value=text(target.value); if(!value) return;
    const action=target.dataset.spellAction; const index=parseInt(target.dataset.spellIndex,10);
    if(action==='add-wizard-spell' && !sourceState.spellbook.some((name)=>name.toLowerCase()===value.toLowerCase())) sourceState.spellbook.push(value);
    if(action==='replace-wizard-spell' && Number.isInteger(index) && index>=0) {
      const old=sourceState.spellbook[index]; sourceState.spellbook[index]=value;
      const prepIndex=sourceState.prepared.findIndex((name)=>name.toLowerCase()===text(old).toLowerCase()); if(prepIndex>=0) sourceState.prepared[prepIndex]=value;
    }
    syncStateField(); render();
  }

  function changeWizardPrepared(target) {
    const sourceState=ensureSourceState('wizard'); const index=parseInt(target.dataset.spellIndex,10); const name=sourceState.spellbook[index]; if(!name) return;
    const existing=sourceState.prepared.findIndex((candidate)=>candidate.toLowerCase()===name.toLowerCase()); const source=getActiveSources().find((item)=>item.id==='wizard'); const limit=wizardProgression(source?.level || 1).prepared;
    if(target.checked && existing<0 && sourceState.prepared.length<limit) sourceState.prepared.push(name);
    if(!target.checked && existing>=0) sourceState.prepared.splice(existing,1);
    syncStateField(); render();
  }

  function changeArcanum(target) {
    const sourceState=ensureSourceState('warlock'); const level=Number(target.dataset.spellLevel); const value=text(target.value);
    if(value) sourceState.arcanum[level]=value; else delete sourceState.arcanum[level];
    syncStateField(); render();
  }

  function changeSubclassSelection(target) {
    const sourceState=sourceStateForTarget(target);
    const previous=sourceState.subclassId;
    sourceState.subclassId=text(target.value);
    if (sourceState.subclassId !== '__manual__') sourceState.manualSubclassName='';
    /* A subclass-specific secondary choice must not leak across subclass modes. */
    if (previous !== sourceState.subclassId) sourceState.subclassChoice='';
    syncStateField(); render();
  }

  function changeSubclassChoice(target) {
    const sourceState=sourceStateForTarget(target); sourceState.subclassChoice=text(target.value); syncStateField(); render();
  }

  function updateManualSubclassName(target) {
    const sourceState=sourceStateForTarget(target); sourceState.manualSubclassName=target.value; syncStateField();
  }

  function changeBonusSelection(target, field) {
    const sourceState=sourceStateForTarget(target); const value=text(target.value); if(!value) return;
    const values=sourceState[field]; const action=target.dataset.spellAction; const index=parseInt(target.dataset.spellIndex,10);
    if(action.startsWith('add-') && !values.some((name)=>name.toLowerCase()===value.toLowerCase())) values.push(value);
    if(action.startsWith('replace-') && Number.isInteger(index) && index>=0) values[index]=value;
    syncStateField(); render();
  }

  function removeItem(target) {
    const sourceId=target.dataset.spellSource; const sourceState=ensureSourceState(sourceId); const index=parseInt(target.dataset.spellIndex,10); if(!Number.isInteger(index)||index<0) return;
    const action=target.dataset.spellAction;
    if(action==='remove-cantrip') sourceState.cantrips.splice(index,1);
    if(action==='remove-prepared') sourceState.prepared.splice(index,1);
    if(action==='remove-bard-secret') sourceState.secrets.splice(index,1);
    if(action==='remove-subclass-bonus') sourceState.subclassBonus.splice(index,1);
    if(action==='remove-wizard-spell') {
      const removed=sourceState.spellbook.splice(index,1)[0];
      if(removed) sourceState.prepared=sourceState.prepared.filter((name)=>name.toLowerCase()!==removed.toLowerCase());
    }
    syncStateField(); render();
  }

  function updateNotes(target) { const sourceState=sourceStateForTarget(target); sourceState.notes=target.value; syncStateField(); }

  function refreshStatsOnly() {
    const sources=getActiveSources(); updatePrimarySummary(sources);
    document.querySelectorAll('.dynamic-spell-page').forEach((page)=>{
      const source=sources.find((candidate)=>candidate.id===page.dataset.spellSource); if(!source) return;
      const values=page.querySelectorAll('.spell-stat-value'); const stats=spellStats(source.ability);
      if(values.length>=5) { values[2].textContent=formatSigned(stats.modifier); values[3].textContent=String(stats.saveDc); values[4].textContent=formatSigned(stats.attack); }
    });
  }

  function bindInteractions() {
    const host=getHost(); if(!host) return;
    host.addEventListener('change',(event)=>{
      const target=event.target; const action=target?.dataset?.spellAction;
      if(['add-cantrip','replace-cantrip'].includes(action)) return changeCantrip(target);
      if(['add-prepared','replace-prepared'].includes(action)) return changeGenericPrepared(target);
      if(['add-wizard-spell','replace-wizard-spell'].includes(action)) return changeWizardSpell(target);
      if(action==='wizard-prepared') return changeWizardPrepared(target);
      if(action==='warlock-arcanum') return changeArcanum(target);
      if(action==='subclass-select') return changeSubclassSelection(target);
      if(action==='subclass-choice') return changeSubclassChoice(target);
      if(['add-bard-secret','replace-bard-secret'].includes(action)) return changeBonusSelection(target,'secrets');
      if(['add-subclass-bonus','replace-subclass-bonus'].includes(action)) return changeBonusSelection(target,'subclassBonus');
    });
    host.addEventListener('click',(event)=>{
      const button=event.target?.closest?.('button[data-spell-action]');
      if(button && ['remove-cantrip','remove-prepared','remove-wizard-spell','remove-bard-secret','remove-subclass-bonus'].includes(button.dataset.spellAction)) removeItem(button);
    });
    host.addEventListener('input',(event)=>{
      const action=event.target?.dataset?.spellAction;
      if(action==='source-notes') return updateNotes(event.target);
      if(action==='manual-subclass-name') return updateManualSubclassName(event.target);
    });
    document.addEventListener('change',(event)=>{ if(event.target?.matches?.('.char-class-select, .char-level-select')) render(); },true);
    ['multiclass-btn','remove-multiclass-btn'].forEach((id)=>document.getElementById(id)?.addEventListener('click',()=>window.setTimeout(render,0)));
    ['int','wis','cha','prof-bonus'].forEach((id)=>{ document.getElementById(id)?.addEventListener('input',refreshStatsOnly); document.getElementById(id)?.addEventListener('change',refreshStatsOnly); });
    getStateField()?.addEventListener('change',()=>{ if(writingStateField)return; hydrateStateField(); render(); });
    document.addEventListener('character:restored',()=>{ hydrateStateField(); render(); });
  }

  /* ========================================================
     DATA / INIT
     ======================================================== */

  async function loadSpells() {
    if(!config) throw new Error('spellcasting.js requires config.js.');
    const path=config.getSpellsDataPath(); const subclassPath=config.getSubclassesDataPath();
    const [response,subclassResponse]=await Promise.all([fetch(path,{cache:'no-store'}),fetch(subclassPath,{cache:'no-store'})]);
    if(!response.ok) throw new Error(`Could not load ${path} (${response.status}).`);
    if(!subclassResponse.ok) throw new Error(`Could not load ${subclassPath} (${subclassResponse.status}).`);
    const [data,subclassData]=await Promise.all([response.json(),subclassResponse.json()]);
    if(String(data?.edition||'')!==config.edition) throw new Error(`Spell data edition ${data?.edition} does not match builder edition ${config.edition}.`);
    if(String(subclassData?.edition||'')!==config.edition) throw new Error(`Subclass data edition ${subclassData?.edition} does not match builder edition ${config.edition}.`);
    state.spells=Array.isArray(data?.spells)?data.spells.filter((spell)=>spell&&text(spell.name)).map((spell)=>({...spell,level:Number(spell.level)||0})):[];
    state.spellByName=new Map(state.spells.map((spell)=>[spell.name.toLowerCase(),spell]));
    state.classSpells=new Map();
    Object.keys(PROFILES_BY_EDITION[config.edition] || {}).forEach((cid)=>state.classSpells.set(cid,state.spells.filter((spell)=>Array.isArray(spell.classes)&&spell.classes.includes(cid))));
    state.subclasses=new Map((Array.isArray(subclassData?.subclasses)?subclassData.subclasses:[]).map((subclass)=>[subclass.classId,subclass]));
    state.loaded=true; state.error=null; hydrateStateField(); sanitizeState(); render();
    document.dispatchEvent(new CustomEvent('character:spellcasting-ready',{detail:{edition:config.edition,spellCount:state.spells.length,classCounts:Object.fromEntries(Array.from(state.classSpells.entries()).map(([cid,list])=>[cid,list.length])),subclassCount:state.subclasses.size,path,subclassPath}}));
    return state;
  }

  function init() {
    bindInteractions();
    readyPromise=Promise.allSettled([window.CharacterClasses?.ready]).then(loadSpells).catch((error)=>{ state.loaded=false; state.active=false; state.error=error; console.error('Dynamic spellcasting could not be initialized:',error); setLegacyPageVisibility(true); return state; });
    return readyPromise;
  }

  window.CharacterSpellcasting=Object.freeze({
    get ready(){return readyPromise;}, get loaded(){return state.loaded;}, get active(){return state.active;}, get spellCount(){return state.spells.length;},
    get error(){return state.error;}, get state(){return JSON.parse(JSON.stringify(state.structured));}, render, getActiveSources,effectiveCasterLevel,sharedSpellSlots,
    classSpellCount(id){return (state.classSpells.get(id)||[]).length;}, get subclassCount(){return state.subclasses.size;}, bardMagicalSecretsCap
  });

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
