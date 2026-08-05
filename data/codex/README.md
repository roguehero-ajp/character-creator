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
data/codex/dnd5e/2014/equipment.json
data/codex/dnd5e/2024/core-rules.json
data/codex/dnd5e/2024/equipment.json
data/srd-codex.json
```

The `core-rules.json` and `equipment.json` files use schema version 2. The existing spell and magic-item file is loaded through the `legacy-srd` adapter declared in the manifest.

## Important rule

An entry belongs to exactly one game system and one edition. When two editions use the same explanation, each edition still receives its own entry. This prevents later edits to one ruleset from silently changing another.

## Schema version 2 entry fields

Required fields:

- `id`: unique inside the edition collection
- `title`
- `entryType`: currently `rule` or `equipment` in schema-version-2 collections
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

Equipment entries commonly use:

- `subcategory`
- `description`
- `facts`: structured label/value pairs such as cost, weight, damage, Armor Class, mastery, capacity, or service availability
- `tags`
- `license`

Related IDs are local to the same game system, edition, and entry type.

## Adding another game system

1. Add the game system to `data/codex/manifest.json`.
2. Give it one or more editions.
3. Give each edition its own collection files.
4. Add a loader adapter in `js/codex-data.js` only if the new files do not use schema version 2.
5. Run `node tools/validate-codex.mjs` before deployment.

Do not place another game's rules inside the D&D folders, even when the mechanic appears similar.
