# Changelog

All notable changes to My RPG Source are documented here.

The project is still pre-1.0. Until formal release versioning is standardized, recent work is collected under **Unreleased** and earlier repository milestones are preserved below.

## [Unreleased]

### Documentation

- Replaced the outdated README with an accurate description of the live project, current features, known limitations, structure, development priorities, privacy model, and licensing status.
- Rebuilt the roadmap around the current product sequence: original Rules Codex content, edition-aware classes, multiclassing, sheet refinement, My First Steps, and later cloud services.
- Reorganized this changelog so completed work is no longer listed as planned.
- Documented the distinction between class data that is already edition-aware and class rules or features that still require edition-aware implementation.

### Added

- Manifest-driven Codex architecture organized by game system, edition, collection, and entry.
- Separate core-rules collections containing 215 D&D 5e 2014 entries and 218 D&D 5e 2024 entries.
- Separate mundane-equipment collections containing 273 D&D 5e 2014 entries and 246 D&D 5e 2024 entries.
- Edition-specific background and feat collections containing 5 SRD backgrounds and 18 SRD feats across the 2014 and 2024 rules.
- Separate character-origin collections containing 23 D&D 5e 2014 race, subrace, and ancestry-choice entries and 33 D&D 5e 2024 species and species-choice entries.
- Separate class-foundation collections containing all 12 SRD classes for each edition, for 24 edition-specific class entries.
- Twenty-level feature-name progression tables for every 2014 and 2024 class.
- Class facts covering Hit Dice, primary abilities, saving throws, skills, armor, weapons, tools, starting equipment, spellcasting progression, multiclass prerequisites, gained multiclass proficiencies, and the included SRD subclass.
- Class data validation that cross-checks Codex foundations against the edition-specific builder class records.
- Complete searchable catalogues for SRD weapons, armour, ammunition, spellcasting focuses, adventuring gear, equipment packs, tools, mounts, vehicles, lifestyles, hospitality, and services.
- 2014 trade-goods entries and 2024 weapon-mastery fields, firearm ammunition, airship, and spellcasting-service tiers.
- Shared `js/codex-data.js` loader with request caching and normalized entry IDs.
- Game-system, edition, entry-type, rule-category, race/species-category, and equipment-category filters on the standalone Codex page, including a dedicated Classes collection.
- Stable query-string deep links to individual Codex entries.
- Parent-race/species and child-choice navigation for subraces, lineages, giant ancestries, fiendish legacies, and draconic ancestries.
- Related-rule navigation and builder links to the corresponding full Codex entry.
- Automated Codex schema, ID, edition, category, and relationship validation through `tools/validate-codex.mjs`.
- Separate D&D 5e 2014 and D&D 5e 2024 builder modes.
- Edition configuration with separate terminology, data paths, page identity, and browser-save keys.
- Edition-specific Race data for 2014 and Species data for 2024.
- Edition-specific background and class data files.
- Structured multiclass prerequisites in the class data.
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
- Standalone Spells & Magic Items Codex with edition labels and filters.
- Dynamic Featured Knowledge Card on the homepage with Previous, Pause, and Next controls.
- Two-stage homepage card-flip animation and guarded rotation timer.
- Level Up flow for advancing an existing class.
- Fixed, rolled, and manual hit-point gain options during Level Up.
- Review-before-commit step for Level Up.
- Stored level history and historical hit-point recalculation after Constitution changes.
- Visible but intentionally locked Add a New Class branch.
- New Player FAQ with seven expanded question panels and a complete example of play.
- About, Contact, Privacy Policy, and Legal / SRD Attribution pages.
- Custom `404.html` using `images/penguin404.jpg`.
- `robots.txt`, `sitemap.xml`, `ads.txt`, and custom-domain configuration.

### Changed

- Rebuilt the homepage around the new illustrated fantasy artboard with responsive, accessible overlay links.
- Moved the live nine-second Featured Knowledge Card rotation into the artwork’s reserved panel, including direct Codex links and guarded Previous, Pause, and Next controls.
- Changed the artwork navigation label from Home to News, linked the portal Get Started area to the edition selector, and preserved the full footer navigation below the page.
- Anchored Knowledge Cards beside their triggers instead of moving them with the mouse cursor.
- Made Knowledge Cards remain open while hovered or focused and added an edition-aware **Codex** link to each card.
- Removed the redundant per-ability Codex buttons from the character sheet.
- Expanded `codex.html` from a spells-and-magic-items catalogue into a unified 2,208-entry Rules Codex while preserving all 1,153 existing SRD spell and magic-item entries and adding rules, origins, backgrounds, feats, classes, and mundane equipment.
- Made the builder Codex drawer load only the active edition's rule collection.
- Made the homepage Featured Knowledge Card draw from the new edition-specific Codex collections without changing its guarded timer, pause controls, or two-stage flip behaviour.
- Replaced stale homepage wording that described the Codex as a future feature.
- Renamed the builder Codex link to reflect the complete Rules Codex and added prominent homepage and footer links to it.
- Replaced the site-wide page backgrounds with the new starfield artwork while preserving readable content panels and print styling.
- Replaced the original single-page implementation with modular CSS, JavaScript, and JSON data files.
- Split D&D data into `data/dnd5e/2014` and `data/dnd5e/2024` directories.
- Made Race or Species labels and data loading depend on the selected edition.
- Made class dropdown population use the selected edition's class data.
- Separated individual class levels from calculated total character level.
- Improved print layout and removed temporary interface content from printed output.
- Improved saving and import compatibility for older backups.
- Expanded site navigation and beginner-facing content.
- Kept the live Add a New Class option disabled until multiclass prerequisites, proficiencies, and spell-slot rules are complete.

### Fixed

- Removed a duplicate Codex list-render call from the builder drawer initialization.
- Corrected an existing duplicated border declaration in the Codex drawer stylesheet.
- Manual ability-score entry being overwritten while typing physical ability scores.
- Level Up class-dropdown crashes.
- Single-option Species choice controls.
- Duplicate JSON downloads.
- Missing save, load, import, export, print, theme, roll, and Codex controls after earlier refactors.
- Separate-edition save collisions.
- Print overflow that produced excessive pages.
- Print headers, timestamps, placeholders, and layout elements that did not belong on the sheet.
- Homepage Featured Knowledge Card timer stacking by clearing the active interval before restarting it.
- FAQ answer visibility by keeping all seven panels open.
- FAQ answer-label alignment by aligning the label with the first line of the answer.
- Footer and internal navigation links.
- SRD attribution links and legal-page references.

### Known Limitations

- Class data loading is edition-aware, but complete class-feature, subclass, proficiency, and spellcasting behavior is not yet fully edition-aware.
- Add a New Class is locked until multiclass safeguards are implemented.
- Reduced multiclass proficiencies and proficiency-source tracking are not complete.
- Combined multiclass spell-slot calculations are not complete.
- The Codex background collections intentionally include only the backgrounds released in the applicable SRD.
- Class foundations and progression tables are complete, but individual class-feature mechanics, subclasses, and subclass-feature entries still need to be added, followed by focused edition comparisons and final editorial and licensing review.
- Dense character features still need additional print-layout work.
- Accounts, cloud saves, synchronization, hosted campaigns, and version history are not implemented.
- The displayed application version still needs to be standardized across code, footer, and documentation.

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
