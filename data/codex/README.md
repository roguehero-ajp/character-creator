# Codex Data Architecture

The Codex uses a versioned manifest so each tabletop game and edition can keep its rules isolated.

## Hierarchy

```text
data/codex/manifest.json
└── game system
    └── edition
        └── collection
            └── entries
```

The current D&D files are:

```text
data/codex/dnd5e/2014/core-rules.json
data/codex/dnd5e/2014/ancestries.json
data/codex/dnd5e/2014/backgrounds.json
data/codex/dnd5e/2014/feats.json
data/codex/dnd5e/2014/classes.json
data/codex/dnd5e/2014/equipment.json
data/codex/dnd5e/2024/core-rules.json
data/codex/dnd5e/2024/ancestries.json
data/codex/dnd5e/2024/backgrounds.json
data/codex/dnd5e/2024/feats.json
data/codex/dnd5e/2024/classes.json
data/codex/dnd5e/2024/equipment.json
data/srd-codex.json
```

The modular rules, origins, backgrounds, feats, classes, and equipment files use schema version 2. The existing spell and magic-item file is loaded through the `legacy-srd` adapter declared in the manifest.

## Important rule

An entry belongs to exactly one game system and one edition. When two editions use the same explanation, each edition still receives its own entry. This prevents later edits to one ruleset from silently changing another.

## Schema version 2 entry fields

Required fields:

- `id`: unique inside the edition collection
- `title`
- `entryType`: currently `rule`, `ancestry`, `background`, `feat`, `class`, or `equipment` in schema-version-2 collections
- `gameSystem`
- `edition`
- `category`
- `categoryName`
- `summary`
- `sourceType`
- `sourceDocument`

Common optional fields:

Rules entries commonly use:

- `whatItMeans`
- `whatItAffects`
- `exampleInPlay`
- `whyItMatters`
- `commonMistakes`
- `bestFor`
- `related`
- `tags`

Ancestry entries commonly use:

- `description`
- `facts`: structured label/value pairs such as ability-score increases, creature type, size, speed, languages, and spellcasting choices
- `traits`: named rules features with complete reference descriptions
- `parentId` and `parentTitle` for subraces or species choices
- `childIds` for parent races or species with finite choices
- `sourceSection` for the audited SRD section and page range
- `tags`
- `license`

Class entries commonly use:

- `description`
- `facts`: structured class traits, proficiencies, starting equipment, spellcasting progression, and multiclass information
- `progression`: exactly twenty level rows with proficiency bonus and feature names
- `builderClassId`: stable link to the edition-specific builder class record
- `subclass`: the subclass included in the applicable SRD and its feature levels
- `sourceSection`
- `tags`
- `license`

Equipment entries commonly use:

- `subcategory`
- `description`
- `facts`: structured label/value pairs such as cost, weight, damage, Armor Class, mastery, capacity, or service availability
- `tags`
- `license`

Related, parent, and child IDs are local to the same game system, edition, and entry type.

## Adding another game system

1. Add the game system to `data/codex/manifest.json`.
2. Give it one or more editions.
3. Give each edition its own collection files.
4. Add a loader adapter in `js/codex-data.js` only if the new files do not use schema version 2.
5. Run `node tools/validate-codex.mjs` before deployment.

Do not place another game's rules inside the D&D folders, even when the mechanic appears similar.
