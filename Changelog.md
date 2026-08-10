# Changelog

All notable changes to My RPG Source are documented here.

The project is still pre-1.0. Until formal release versioning is standardized, recent work is collected under **Unreleased** and earlier repository milestones are preserved below.

## [Unreleased]

### Repository Repair and Documentation

- Restored the public Contact, Legal / SRD Attribution, and custom 404 pages after an August 7 file-content shuffle placed unrelated page contents under those filenames.
- Restored `README.md`, `Changelog.md`, and `roadmap.md` as project documentation instead of unrelated HTML or editorial content.
- Identified the stray root-level `how-to-create-your-first-dnd-character.html` as a duplicate of `css/content.css`; the real guide remains under `guides/`.
- Audited JavaScript syntax across the repository with no syntax failures found.
- Re-ran the Codex validator successfully against 2,208 versioned entries.
- Confirmed active edition-specific builder JSON and Codex JSON parse successfully.
- Identified older root-level JSON stubs for a later cleanup pass rather than deleting them during active builder work.

### Added

- News & Guides hub for original RPG reporting, analysis, guides, and project updates.
- Beginner guide: **How to Create Your First D&D Character**.
- Google Analytics page and interaction tracking through `js/analytics.js`.
- Structured feat manager in `js/feats.js`.
- Edition-specific SRD feat loading from the Codex data.
- Automatic synchronization of applicable 2024 Background and Human Origin feats.
- Detection of class-level feat-choice opportunities.
- Automatic feat-choice prompt after qualifying Level Up events.
- Manual / DM Override feat entry for choices outside the included SRD data.
- Persistent structured feat state designed to remain compatible with older character saves.
- Edition-aware combat-equipment module in `js/combat-equipment.js`.
- Mundane weapon, armor, and shield selectors sourced from edition-specific Codex equipment.
- SRD magic weapon, armor, and shield choices sourced from the spell/magic-item Codex collection.
- Magic-item base-weapon and base-armor resolution where a generic magic item requires a specific equipment type.
- Weapon ability selection and attack/damage calculation helpers.
- Armor Class calculation and optional synchronization to the character sheet.
- SRD special-property display for selected magic equipment.
- Dedicated CSS modules for structured feats and combat equipment.

### Changed

- Reworked the character-sheet layout so page 2 carries Class Abilities, structured Feats, and Equipment & Currency while page 1 focuses more tightly on core character and combat information.
- Expanded Class Abilities to twenty visible slots.
- Replaced free-text-only feat handling with structured edition-aware feat records while retaining custom entries for unsupported or non-SRD choices.
- Made Level Up and feat selection communicate through character events rather than duplicating Level Up logic inside the feat module.
- Expanded the live builder with structured combat equipment while keeping the module separate from core calculation and storage responsibilities.
- Expanded `codex.html` from a spells-and-magic-items catalogue into a unified 2,208-entry Rules Codex while preserving the existing spell and magic-item collection.
- Made the builder Codex drawer load only the active edition's rule collection.
- Made the homepage Featured Knowledge Card draw from edition-specific Codex collections while preserving pause and navigation controls.
- Replaced stale homepage wording that described the Codex as a future feature.
- Renamed the builder Codex link to reflect the complete Rules Codex and added prominent homepage and footer links.
- Replaced site-wide page backgrounds with the newer starfield artwork while preserving readable content panels and print styling.
- Replaced the original single-page implementation with modular CSS, JavaScript, and JSON data files.
- Split D&D builder data into `data/dnd5e/2014` and `data/dnd5e/2024` directories.
- Made Race or Species labels and data loading depend on the selected edition.
- Made class dropdown population use the selected edition's class data.
- Separated individual class levels from calculated total character level.
- Improved print layout and removed temporary interface content from printed output.
- Improved saving and import compatibility for older backups.
- Expanded site navigation and beginner-facing content.
- Kept the live Add a New Class option disabled until multiclass prerequisites, proficiencies, and spell-slot rules are complete.

### Codex and Data Added Earlier in This Development Cycle

- Manifest-driven Codex architecture organized by game system, edition, collection, and entry.
- Separate core-rules collections containing 215 D&D 5e 2014 entries and 218 D&D 5e 2024 entries.
- Separate mundane-equipment collections containing 273 D&D 5e 2014 entries and 246 D&D 5e 2024 entries.
- Edition-specific background and feat collections containing SRD material for the 2014 and 2024 rules.
- Separate character-origin collections containing 2014 race/subrace records and 2024 Species/choice records.
- Separate class-foundation collections containing all 12 SRD classes for each edition.
- Twenty-level feature-name progression tables for every 2014 and 2024 class.
- Class facts covering Hit Dice, primary abilities, saving throws, skills, armor, weapons, tools, starting equipment, spellcasting progression, multiclass prerequisites, gained multiclass proficiencies, and the included SRD subclass.
- Class data validation that cross-checks Codex foundations against edition-specific builder class records.
- Searchable catalogues for SRD weapons, armor, ammunition, spellcasting focuses, adventuring gear, equipment packs, tools, mounts, vehicles, lifestyles, hospitality, and services.
- Shared `js/codex-data.js` loader with request caching and normalized entry IDs.
- Game-system, edition, entry-type, and category filters on the standalone Codex page.
- Stable query-string deep links to individual Codex entries.
- Parent-origin and child-choice navigation for edition-specific ancestry choices.
- Related-rule navigation and builder links to corresponding full Codex entries.
- Automated Codex schema, ID, edition, category, relationship, and class synchronization validation through `tools/validate-codex.mjs`.

### Builder Foundation Added Earlier in This Development Cycle

- Separate D&D 5e 2014 and D&D 5e 2024 builder modes.
- Edition configuration with separate terminology, data paths, page identity, and browser-save keys.
- Edition-specific Race data for 2014 and Species data for 2024.
- Edition-specific background and class data files.
- Structured multiclass prerequisites in class data.
- Manual ability-score entry.
- Standard Array assignment.
- 4d6, drop the lowest generation.
- 3d6 house-rule generation.
- Official 27-point Point Buy.
- Drag, drop, tap, and keyboard score assignment.
- Dynamic Species or Race choices and concise trait summaries.
- Background benefits, equipment, currency, and 2024 ability-score increases.
- Separate local browser saves for each edition.
- Save Now and Load Saved Character controls.
- JSON export and import with edition information.
- Warnings before importing a character created for a different edition.
- Restoration of dynamic sheet controls and multiclass rows after loading or importing.
- Character-based JSON and PDF filenames.
- Blank character-sheet printing that preserves and restores the active character.
- Multiple visual themes.
- Contextual Knowledge Cards.
- Searchable in-builder Rules Codex.
- Dynamic Featured Knowledge Card on the homepage with Previous, Pause, and Next controls.
- Two-stage homepage card-flip animation and guarded rotation timer.
- Level Up flow for advancing an existing class.
- Fixed, rolled, and manual hit-point gain options during Level Up.
- Review-before-commit step for Level Up.
- Stored level history and historical hit-point recalculation after Constitution changes.
- New Player FAQ with expanded question panels and a complete example of play.
- About, Contact, Privacy Policy, and Legal / SRD Attribution pages.
- Custom `404.html` using `images/penguin404.jpg`.
- `robots.txt`, `sitemap.xml`, `ads.txt`, and custom-domain configuration.

### Fixed

- Repository file-content shuffle that placed the builder in `contact.html`, Contact in `legal.html`, the beginner guide in `404.html`, the News page in `README.md`, the About page in `Changelog.md`, and the editorial guide in `roadmap.md`.
- Manual ability-score entry being overwritten while typing physical ability scores.
- Level Up class-dropdown crashes.
- Single-option Species choice controls.
- Duplicate JSON downloads.
- Missing save, load, import, export, print, theme, roll, and Codex controls after earlier refactors.
- Separate-edition save collisions.
- Print overflow that produced excessive pages.
- Print headers, timestamps, placeholders, and layout elements that did not belong on the sheet.
- Homepage Featured Knowledge Card timer stacking by clearing the active interval before restarting it.
- FAQ answer visibility and answer-label alignment.
- Footer and internal navigation links.
- SRD attribution links and legal-page references.
- Duplicate Codex list-render initialization.
- Duplicated border declaration in the Codex drawer stylesheet.

### Known Limitations

- Complete class-feature, subclass, proficiency, and spellcasting behavior is not yet fully automated or edition-aware.
- Add a New Class remains locked until multiclass safeguards are implemented.
- Reduced multiclass proficiencies and proficiency-source tracking are not complete.
- Combined multiclass spell-slot calculations are not complete.
- Feat records and eligibility are structured, but most feat mechanical effects are intentionally not auto-applied yet.
- 2014 Ability Score Improvement resolution can be recorded by the feat system, but the actual ability-score changes remain manual in the current pass.
- The combat-equipment module calculates common weapon and armor values but does not replace full proficiency-source and class-feature automation.
- The spell list and prepared/known spell workflow still need a major usability pass.
- Class foundations and progression tables are present, but individual class-feature mechanics and complete subclass-feature automation still need to be added.
- Dense character features still need additional print-layout work.
- Accessibility labels, keyboard navigation, mobile layout, and cross-browser testing remain ongoing work.
- Accounts, cloud saves, synchronization, hosted campaigns, and version history are not implemented.
- Displayed application version numbers still need to be standardized across code, footer, and documentation.

## [0.2.0] - 2026-07-28

### Added

- Browser autosave.
- Manual save and load controls.
- JSON import and export.
- Blank-sheet printing.
- PDF export with improved filenames.
- Knowledge Cards.
- Rules Codex drawer.
- Landing page.
- Theme selection.
- Improved automatic calculations.

### Changed

- Migrated major sections out of the original large HTML file.
- Established a modular architecture for future Knowledge Card, Codex, storage, printing, and rules work.

## [0.1.1] - 2026-07-26

### Added

- Initial project folder structure.
- Modular CSS directory.
- Modular JavaScript directory.
- JSON data directory.
- Image and asset directories.
- Initial ability-score Knowledge Cards.

### Notes

- This milestone marked the transition from a single large HTML document to a modular application structure.

## [0.1.0] - 2026-07-26

### Added

- Initial GitHub repository.
- First working character creator.
- Automatic character calculations.
- PDF export.
- Blank character-sheet printing.

### Changed

- General project cleanup.
- Initial printing improvements.
