# My RPG Source

**Create. Learn. Play.**

My RPG Source is an independent, browser-based tabletop roleplaying project focused on reducing the friction between someone wanting to play an RPG and actually getting a character to the table.

Live site: https://www.myrpgsource.com/

Current release: **v1.0.0** — August 11, 2026

## Mission

**Break down the barriers that stop people from playing tabletop roleplaying games.**

Version 1.0 focuses on Dungeons & Dragons Fifth Edition character creation and rules learning, with separate support for the 2014 and 2024 rules. Additional RPG systems may be considered later where licensing permits.

## Version 1.0 Status

My RPG Source v1.0.0 is the first feature-complete public release of the D&D 5e character builder.

The release includes a stable two-edition character foundation, structured leveling and feats, class/subclass features, dynamic spellcasting, equipment helpers, local saves and portable backups, printing/PDF support, contextual Knowledge Cards, and an integrated Rules Codex.

Version 1.0 does **not** mean every possible D&D option is automatically enforced. Choice-heavy mechanics, non-SRD content, cloud services, and additional automation remain post-1.0 work.

See [`roadmap.md`](roadmap.md) for post-1.0 priorities and [`Changelog.md`](Changelog.md) for release history.

## D&D 5e Character Builder

The builder supports separate 2014 and 2024 modes selected by URL:

- `builder.html?edition=2014`
- `builder.html?edition=2024`

### Character creation and core calculations

Implemented features include:

- Manual ability-score entry
- Standard Array
- 4d6, drop the lowest
- 3d6 house-rule generation
- Official 27-point Point Buy
- Drag, drop, tap, and keyboard score assignment
- Edition-specific 2014 Race data
- Edition-specific 2024 Species data
- Edition-specific backgrounds
- Edition-specific class data for all twelve SRD classes
- Automatic ability modifiers and common derived values
- Hit points and Hit Dice
- Saving throws and skills
- Proficiency bonus
- Initiative and Passive Perception
- Armor Class and common weapon attack/damage helpers

### Leveling, feats, classes, and subclasses

Version 1.0 includes:

- Level Up flow for advancing an existing class
- Fixed, rolled, and manual Level Up hit-point gains
- Stored level history and Constitution-sensitive HP recalculation
- Multiple class rows and multiclass-aware character totals
- Structured feat tracking with edition-aware SRD feat data
- 2024 Background and applicable Human Origin feat synchronization
- Detection of class-level feat opportunities
- Manual / DM Override feat entry for content outside the included SRD data
- Structured class-feature progression for all twelve classes in both editions
- Explicit SRD subclass selection at the appropriate class level
- Manual subclass naming/feature fields for content outside the included SRD
- Class and subclass Knowledge Cards and direct Codex links
- Automatic class-feature continuation pages when Page 2 would otherwise overflow

The dedicated Level Up modal branch for **adding a brand-new class** remains intentionally guided/locked pending a stricter prerequisite and proficiency-source workflow. Existing multiclass rows and multiclass calculations remain supported independently of that unfinished guided branch.

### Spellcasting

The static legacy spell pages have been replaced by class-aware generated magic pages.

Version 1.0 includes:

- Dynamic spell pages only when a character has an active spellcasting source
- Separate two-page magic modules for each spellcasting class in a multiclass character
- Edition-aware spellcasting for D&D 5e 2014 and 2024
- Smart spell selection for Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, and Wizard
- 319 unique SRD spell records in the 2014 builder dataset
- 338 unique SRD spell records in the 2024 builder dataset
- Known, prepared, spellbook, always-prepared, and granted-spell handling where required
- Wizard spellbook and preparation progression
- Shared multiclass Spellcasting slot calculations
- Edition-correct half-caster contribution rules
- Separate Warlock Pact Magic handling
- Mystic Arcanum
- SRD subclass-granted/expanded spell behavior
- Bard Magical Secrets handling
- Spell Knowledge Cards and direct Codex links
- Save/load/import/export persistence for structured spell state
- Blank-print suppression of generated magic pages

Non-SRD spells and subclass content are not distributed by the project. Some choice-dependent spell sources, such as specific Fighting Styles, feats, invocations, species traits, or copied/found Wizard spells, remain candidates for later automation.

## Saving, Export, and Printing

The builder provides:

- Browser autosave
- Save Now
- Load Saved Character
- Separate browser-save keys for 2014 and 2024
- JSON export and import
- Edition information in portable JSON backups
- Warnings when importing a character from another edition
- Character-based export filenames
- Character-sheet printing
- Temporary blank-sheet printing
- PDF export
- Multiple visual themes
- A persistent Knowledge Card on/off preference

Free users keep their characters in local browser storage or portable JSON backups. Cloud character storage is not part of v1.0.

### Storage compatibility

The application version is **1.0.0**, while the character save schema remains **SAVE_VERSION 2**.

Those numbers are intentionally independent. The v1.0 release does not force a save-format migration, and older compatible saves remain supported through the storage compatibility layer.

When extending the builder:

- Preserve older save compatibility whenever practical.
- Prefer appended stable structured fields over shifting legacy positional fields.
- Keep dynamic generated controls out of positional storage.
- Test Save, Load, Export, Import, Level Up, Print, and PDF together.
- Test both editions independently.

## Rules Codex

The standalone Rules Codex is manifest-driven and keeps game systems and editions isolated.

Version 1.0 validates **2,630 versioned Codex entries** through `tools/validate-codex.mjs`.

Current D&D 5e collections include:

- Core player rules
- Races, subraces, Species, and Species choices
- Backgrounds
- Feats
- Class foundations and 20-level progression tables
- **422 edition-specific class and subclass feature entries**
- Mundane equipment
- Spells
- Magic items

The builder uses contextual Knowledge Cards with a 500 ms mouse-hover delay. Keyboard focus remains immediate for accessibility, and users can disable Knowledge Cards from the builder controls while keeping direct Codex links available.

## Beginner Content and Public Site

The public site includes:

- Portal homepage
- News & Guides hub
- Beginner guide: *How to Create Your First D&D Character*
- New Player FAQ with an example of play
- About page
- Contact page
- Privacy Policy
- Legal / SRD Attribution page
- Custom 404 page
- Search-engine sitemap and robots file
- Google Analytics integration
- AdSense support files and consent/privacy preparation

## Repository Structure

```text
/
├── assets/                 Static project assets
├── css/                    Builder, Codex, content, print, and site styles
├── data/
│   ├── codex/              Versioned Rules Codex collections
│   ├── dnd5e/
│   │   ├── 2014/           2014 builder data, spells, and subclasses
│   │   └── 2024/           2024 builder data, spells, and subclasses
│   ├── codex.json          Contextual Knowledge Card compatibility data
│   └── srd-codex.json      Legacy-adapter spell and magic-item collection
├── guides/                 Evergreen guides
├── images/                 Site and builder images
├── js/                     Builder and site JavaScript modules
├── news/                   Individual news articles
├── tools/                  Repository validation tools
├── builder.html            D&D character builder
├── codex.html              Standalone Rules Codex
├── index.html              Portal homepage
├── news.html               News & Guides hub
└── ...                     Public information and policy pages
```

## Important JavaScript Modules

Major responsibilities are separated as follows:

- `js/config.js` — edition configuration, terminology, data paths, and save keys
- `js/app.js` — application coordination and product metadata
- `js/ability-scores.js` — ability-score generation and assignment
- `js/origins.js` — Race / Species loading and choices
- `js/backgrounds.js` — background loading and application
- `js/classes.js` — edition-specific class data
- `js/class-features.js` — class/subclass progression, feature display, and subclass state
- `js/level-up.js` — existing-class Level Up workflow and level history
- `js/feats.js` — structured feat selection and feat-opportunity tracking
- `js/spellcasting.js` — edition-aware class spellcasting, multiclass slots, and subclass magic
- `js/combat-equipment.js` — weapon, armor, shield, and combat-equipment helpers
- `js/calculations.js` — derived character values
- `js/storage.js` — local saves, JSON import/export, and restoration logic
- `js/accessibility.js` — programmatic labels for legacy/dynamic controls
- `js/printing.js` — print and blank-sheet behavior
- `js/pdf.js` — PDF export
- `js/tooltips.js` — contextual Knowledge Cards and user preference
- `js/codex-data.js` — shared Codex collection loader
- `js/codex.js` — in-builder Codex interactions
- `js/codex-page.js` — standalone Codex page behavior
- `js/analytics.js` — site analytics events

Avoid duplicating listeners, intervals, observers, storage responsibilities, or rules logic across modules.

## Validation

Before a release or major Codex deployment, run:

```text
node tools/validate-codex.mjs
```

The v1.0 release candidate also passes repository-wide JavaScript syntax checks and JSON parsing checks.

The site has no package-install or build step. GitHub Pages serves the static HTML, CSS, JavaScript, JSON, and image files directly.

Because the application fetches JSON files, local testing should use a local web server rather than opening `builder.html` directly with a `file://` URL.

## Development Guardrails

- Preserve working features unless a replacement has been tested.
- Keep 2014 and 2024 rules isolated.
- Keep local browser saves and JSON import/export available to free users.
- Do not place advertisements next to Save, Download, Level Up, Print, or PDF controls.
- Keep the planned **My First Steps** web onboarding experience free.
- Use **ready-to-go character** in product copy rather than language implying tournament or rules-lawyer legality.
- Review licensing before adding another game system or non-SRD rules content.
- Prefer complete modular features over partially duplicated logic.

## Post-1.0 Priorities

Version 1.0 establishes the foundation. Likely v1.1+ work includes:

- Strict legal-choice selectors for Fighting Styles, Expertise, Metamagic, Eldritch Invocations, Weapon Mastery, and similar class branches
- Resource trackers for Rage, Bardic Inspiration, Focus/Ki, Sorcery Points, Channel Divinity, Second Wind, Action Surge, and similar features
- Full proficiency-source tracking and the guided Add a New Class Level Up path
- Additional safe feat mechanical automation
- Feat/species/choice-granted spell automation
- More sophisticated Wizard copied/found spellbook support
- Starting-equipment automation and larger inventory workflows
- Additional print/mobile/accessibility/cross-browser polish
- **My First Steps**
- Optional accounts, cloud saves, and campaign services
- Additional RPG systems where licensing permits

## Licensing and Attribution

My RPG Source is an independent project and is not an official Wizards of the Coast product.

Open-game rules content must remain limited to material that can be used under the applicable license and attribution requirements. Public attribution and project legal information are maintained in `legal.html`.

When adding another RPG system, review its current licensing terms before adding rules text, character data, logos, product identity, or monetized tools.

## Project History

My RPG Source began in July 2026 as a smaller character-sheet project and grew into a modular static web application with separate rules engines, a searchable Codex, dynamic character-sheet pages, and structured character state.

The repository history remains an important recovery tool. When a major file becomes corrupted or overwritten, prefer recovering known-good work from version history over reconstructing it from memory.
