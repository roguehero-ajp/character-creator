# Changelog

All notable changes to My RPG Source are documented here.

Formal release versioning begins with **v1.0.0**.

## [Unreleased]

### Avendor

- Opened the mystical Witchwood W1 and W2 screens, with active routes from Forest F9 and F10.
- Added the ancient maple as three playable climbing screens with progressively harder repeatable Climb checks, safe fall landings, and an isolated cowl perch.
- Replaced Forest F8 art with a corrected junction that visibly carries the approved road north toward Forest F11.
- Published a project update covering the new Witchwood and ancient-maple route.
- Opened the straight western farm-road chain from F8 through Forest F11, F12, F13 and F14.
- Added Donson's Farm, Bayard's Ranch and Allwood's Gardens as playable single-entrance destinations.
- Activated the west-road junction's reciprocal route to Forest F13.
- Opened F14's quieter historic mountain road as an active route into playable Forest F15.
- Added Forest F15 with old wagon roads south and east, plus a narrower planned walking path west toward Forest F18.
- Added the intact Old River Bridge as the only safe crossing over the rapid river that feeds Briarwell.
- Added Northfield as a nearly treeless green rock field, with its future northeast walking path reserved toward Misty Forest MF1.

## [1.0.0] - 2026-08-11

### First Public Release

My RPG Source v1.0.0 is the first feature-complete public release of the D&D 5e browser character builder, supporting separate 2014 and 2024 rulesets.

### Character Builder

- Added separate D&D 5e 2014 and D&D 5e 2024 builder modes.
- Added edition-specific Race/Species, background, class, feat, spell, subclass, and equipment data.
- Added Manual, Standard Array, 4d6-drop-lowest, 3d6 house-rule, and official 27-point Point Buy ability-score workflows.
- Added drag/drop, tap, and keyboard score assignment.
- Added automatic modifiers, saving throws, skills, proficiency bonus, initiative, Passive Perception, Hit Dice, and common combat calculations.
- Added responsive themes, print layout, blank-sheet printing, and PDF export.

### Saving and Compatibility

- Added browser autosave, Save Now, and Load Saved Character.
- Added edition-specific browser save keys.
- Added JSON export/import with edition metadata and mismatch warnings.
- Added character-based export filenames.
- Preserved legacy positional-save compatibility while appending structured feat, spellcasting, class-feature, and combat-equipment state.
- Kept the character save schema at **SAVE_VERSION 2** for the v1.0 application release.
- Hardened autosave against startup overwrite, page-exit blank overwrite, transient blank-print state, and dynamic multiclass changes.

### Level Up and Feats

- Added existing-class Level Up with fixed, rolled, and manual HP gains.
- Added stored level history and Constitution-sensitive HP recalculation.
- Added structured feat tracking for both editions.
- Added 2024 Background and applicable Human Origin feat synchronization.
- Added class-level feat-opportunity detection.
- Added manual / DM Override feat records for content outside the included SRD data.
- Corrected Level Up hit-die radio/button state persistence.

### Classes and Subclasses

- Added structured class-feature progression for all twelve SRD classes in both editions.
- Added explicit edition-aware SRD subclass selection at the appropriate class level.
- Added manual subclass naming and manual subclass feature fields for non-SRD content.
- Added class/subclass feature provenance for multiclass characters.
- Added automatic class-feature continuation pages when Page 2 exceeds its compact dashboard capacity.
- Added class/subclass Knowledge Cards and direct Codex links.
- Synchronized subclass state between class-feature and spellcasting interfaces.

### Spellcasting

- Replaced permanent 2024 spell pages with generated class-aware magic modules, then ported the same architecture to 2014.
- Added two generated magic pages per active spellcasting class.
- Added smart SRD spell selection for Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, and Wizard.
- Added **319 unique 2014 SRD spell records** and **338 unique 2024 SRD spell records** to the builder datasets.
- Added class-correct known, prepared, spellbook, always-prepared, and granted-spell handling.
- Added Wizard spellbook/progression rules.
- Added edition-aware shared multiclass Spellcasting slot calculations.
- Added separate Warlock Pact Magic and Mystic Arcanum handling.
- Added SRD subclass-granted and expanded spell behavior.
- Added Bard Magical Secrets and edition-specific subclass magic exceptions.
- Added spell Knowledge Cards and exact Codex deep links.
- Preserved structured spell state through Save, Load, JSON import/export, Print, and PDF.
- Suppressed generated magic pages during blank-sheet printing.

### Combat Equipment

- Added edition-aware mundane weapon, armor, and shield selectors.
- Added SRD magic weapon, armor, and shield choices.
- Added generic magic-item base-equipment resolution where required.
- Added common attack and damage calculation helpers.
- Added Strength/Dexterity weapon ability selection where appropriate.
- Added Armor Class calculation and optional sheet synchronization.
- Added SRD special-property display for selected magic equipment.

### Rules Codex and Knowledge Cards

- Added a manifest-driven Codex architecture organized by game system, edition, collection, and entry.
- Added separate edition-specific core rules, origins, backgrounds, feats, class foundations, class features, and mundane equipment collections.
- Added searchable spells and magic items through the existing SRD collection adapter.
- Added **422 edition-specific class/subclass feature entries**.
- Expanded the validated Rules Codex to **2,630 versioned entries**.
- Added game-system, edition, entry-type, and category filters.
- Added stable deep links and related-entry navigation.
- Added contextual Knowledge Cards throughout the builder.
- Added a 500 ms mouse-hover delay to reduce accidental Knowledge Card popups.
- Kept keyboard-focus Knowledge Cards immediate for accessibility.
- Added a persistent builder switch to turn Knowledge Cards on or off while retaining direct Codex links.
- Corrected class-feature Codex registration, count display, type labeling, and detail rendering.

### Accessibility and UI

- Added programmatic labels to legacy and dynamic builder controls without changing old positional save fields.
- Added a single dynamic accessibility observer rather than duplicate listeners/observers.
- Added the Whimsical Woods forest-green/gold/light-emerald theme.
- Polished homepage footer hit areas for About, Contact, Privacy, and Legal.
- Improved Knowledge Card hover behavior and interactive controls.

### Public Site and Documentation

- Added the portal homepage, News & Guides hub, beginner guide, FAQ, About, Contact, Privacy, Legal / SRD Attribution, custom 404, sitemap, and robots file.
- Added Google Analytics integration and AdSense support/privacy preparation.
- Restored public pages and project documentation after an August repository file-content shuffle.
- Removed obsolete root-level JSON stubs and the stray duplicate root guide file.
- Standardized public navigation and repaired internal routing issues.

### Validation

The v1.0.0 release candidate passed:

- JavaScript syntax validation across 23 JavaScript files
- JSON parsing across 29 JSON files
- Codex validation across **2,630 versioned entries**
- Duplicate HTML ID checks
- Builder local-resource reference checks
- 2014/2024 spell-dataset uniqueness checks
- Class-feature collection registration checks
- Save-version compatibility checks
- Knowledge Card delay/preference checks
- Whimsical Woods palette checks

### Known Post-1.0 Enhancements

The v1.0 foundation is complete, but later releases may add:

- Strict option matrices for class choice features such as Fighting Style, Expertise, Metamagic, Invocations, and Weapon Mastery
- Rich class-resource trackers
- Full proficiency-source tracking and the guided Level Up “Add a New Class” branch
- Additional feat mechanical automation
- Feat/species/choice-granted spell automation
- More sophisticated Wizard copied/found spellbook handling
- Starting-equipment automation and larger inventory tools
- Further print, mobile, accessibility, and cross-browser polish
- Accounts, cloud saves, campaigns, My First Steps, and additional licensed game systems

## [0.1.0] - 2026-07-26

### Early Public Builder Milestone

- Established the initial modular D&D 5e character-sheet repository.
- Added early builder calculations, saving, printing, themes, edition selection, and Rules Codex foundations.
- Began separating D&D 5e 2014 and 2024 data.
- Established the project structure that later became the v1.0 architecture.
