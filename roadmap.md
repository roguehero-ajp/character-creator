# My RPG Source Roadmap

Last updated: August 10, 2026

## Mission

**Break down the barriers that stop people from playing tabletop roleplaying games.**

This roadmap is a working priority guide, not a promise of release dates. The live site should remain dependable while larger changes are developed and tested separately.

## Status Key

- [x] Complete and present in the current repository
- [~] Partially implemented or actively being improved
- [ ] Not yet implemented
- [!] Intentionally blocked until required safeguards are complete

## Product Guardrails

- Preserve existing working features unless a deliberate replacement is tested.
- Keep the live site reasonably stable during external reviews and major development work.
- Do not place advertisements near Save, Download, Level Up, Print, or PDF controls.
- Keep local browser saves and JSON import/export available to free users.
- Do not include personal cloud storage in the free tier.
- Keep the planned **My First Steps** web experience free.
- Use **ready-to-go character** consistently in product copy.
- Keep game systems and editions isolated in the data architecture.
- Add new game systems only after licensing and product-identity risks have been reviewed.
- Prefer modular additions over duplicating listeners, timers, observers, storage, or calculation logic.

# 1. Foundation and Public Site

## Completed

- [x] Custom domain and HTTPS
- [x] GitHub repository and GitHub Pages deployment
- [x] 2014 and 2024 builder entry points
- [x] Responsive portal homepage
- [x] About page
- [x] Contact page
- [x] Privacy Policy
- [x] Legal / SRD Attribution page
- [x] New Player FAQ with a complete example of play
- [x] Custom 404 page
- [x] `robots.txt`
- [x] `sitemap.xml`
- [x] `ads.txt`
- [x] Featured Knowledge Card with Previous, Pause, and Next controls
- [x] News & Guides hub
- [x] First evergreen beginner guide
- [x] Google Analytics integration

## Repository repair and project truth

- [x] Repair Contact, Legal, and 404 files after the August 7 file-content shuffle
- [x] Restore the root README as project documentation
- [x] Restore the changelog as project history
- [x] Restore the roadmap as the working priority guide
- [x] Identify the stray root-level beginner-guide filename as duplicated CSS content
- [~] Remove or quarantine obsolete root-level data stubs only after confirming they are not part of any save/load or legacy workflow
- [ ] Standardize the displayed application version across code, footer, and documentation
- [ ] Standardize navigation, canonical metadata, Analytics loading, and footer structure across every public content page
- [ ] Complete a full broken-link and accessibility pass after the current repair sequence

# 2. Current Builder Foundation

## Character creation and calculations

- [x] Manual ability-score entry
- [x] Standard Array
- [x] 4d6, drop the lowest
- [x] 3d6 house-rule generation
- [x] Official 27-point Point Buy
- [x] Drag, drop, tap, and keyboard score assignment
- [x] Ability modifiers
- [x] Initiative
- [x] Passive Perception
- [x] Saving throws
- [x] Skill bonuses
- [x] Spell save DC and spell attack bonus
- [x] Hit dice
- [x] Hit points
- [x] Total character level
- [x] Proficiency bonus
- [~] Character validation and rule warnings

## Edition support

- [x] Edition selected by URL configuration
- [x] Separate 2014 and 2024 data paths
- [x] Separate 2014 and 2024 browser-save keys
- [x] Race terminology and data for 2014
- [x] Species terminology and data for 2024
- [x] Edition-specific background data loading
- [x] Edition-specific class data loading
- [x] Twelve core class records for each edition
- [x] Multiclass prerequisites represented in class data
- [x] Complete SRD background collections used by the current builder scope
- [~] Complete edition-aware class behavior
- [ ] Automated edition-specific class features
- [ ] Automated edition-specific subclass progression

## Saving, import, and export

- [x] Browser autosave
- [x] Save Now
- [x] Load Saved Character
- [x] JSON export
- [x] JSON import
- [x] Edition labels in exported backups
- [x] Warning before importing a different edition
- [x] Restoration of dynamic controls and class rows
- [x] Character-based export filenames
- [x] Structured feat state included without shifting legacy positional fields
- [x] Combat-equipment fields restored through the storage compatibility layer
- [ ] Full regression test matrix for both editions after the current sheet changes

## Printing and PDF

- [x] Character-sheet printing
- [x] Temporary blank-sheet printing
- [x] PDF export
- [x] Print-specific field and placeholder cleanup
- [x] Restoration of character data after blank printing
- [~] Long class-feature and Species/Race feature print layout
- [~] Structured feat and equipment print-layout review
- [~] Print testing across browsers and page sizes

# 3. Character Sheet Usability

## Page organization

- [x] Keep core identity, abilities, saves, skills, and combat information on page 1
- [x] Move Class Abilities to page 2
- [x] Expand Class Abilities to twenty slots
- [x] Add structured Feats to page 2
- [x] Keep Equipment & Currency on page 2
- [~] Continue reducing crowding while preserving useful print density

## Structured feats

- [x] Edition-specific SRD feat loading
- [x] Structured feat records instead of free-text-only storage
- [x] Automatic 2024 Background feat synchronization
- [x] Automatic applicable Human Origin feat synchronization
- [x] Detect class-level feat opportunities
- [x] Open the appropriate feat chooser after Level Up
- [x] Support manual / DM Override feat entries
- [x] Preserve unsupported or non-SRD feat names without reproducing protected rules text
- [x] Record 2014 ASI-vs-Feat resolution state
- [~] Final prerequisite and edge-case testing
- [ ] Apply safe, well-defined feat mechanical effects automatically
- [ ] Automate 2014 ASI score changes after the ability-score improvement interface is redesigned

## Combat equipment

- [x] Edition-aware mundane weapon selectors
- [x] Edition-aware mundane armor and shield selectors
- [x] SRD magic weapon, armor, and shield choices
- [x] Resolve generic magic items to compatible base equipment where required
- [x] Calculate common weapon attack and damage values
- [x] Support Strength/Dexterity weapon ability choices where appropriate
- [x] Calculate armor and shield Armor Class
- [x] Optionally synchronize calculated Armor Class to the sheet
- [x] Display special SRD magic-equipment properties
- [~] Integrate complete proficiency-source awareness
- [ ] Auto-populate appropriate starting equipment from class/background decisions
- [ ] Add a cleaner equipment inventory workflow for larger inventories

# 4. Rules Learning and Original Content

## Knowledge Cards

- [x] Ability-score Knowledge Cards
- [x] Skill Knowledge Cards
- [x] Combat Knowledge Cards
- [x] Saving-throw Knowledge Cards
- [x] Edition-isolated rule collections
- [x] Homepage Featured Knowledge Card rotation
- [x] Related-entry links and direct full-Codex links
- [~] Content audit for accuracy, consistency, source labels, and edition boundaries
- [ ] Guided beginner learning paths

## Rules Codex architecture and core player rules

The Codex uses a manifest-driven hierarchy of **game system → edition → collection → entry**. D&D 5e 2014 and D&D 5e 2024 have independent rule files even when a topic appears in both editions.

- [x] Versioned Codex manifest and shared data loader
- [x] Separate 2014 and 2024 core-rules files
- [x] 215 edition-specific 2014 player-rule entries
- [x] 218 edition-specific 2024 player-rule entries
- [x] Ability scores, skills, and saving throws
- [x] Core checks, Difficulty Classes, proficiency, Expertise, Advantage, and Disadvantage
- [x] Character creation methods and character-level versus class-level guidance
- [x] Exploration, light, senses, travel, and social interaction fundamentals
- [x] Combat structure, actions, attacks, damage, healing, defeat, and conditions
- [x] Resting, recovery, and common resource rules
- [x] Spellcasting fundamentals, components, targets, areas, and multiclass spellcasting overview
- [x] Edition-specific procedures and terminology stored independently
- [x] Related-entry links and stable deep links
- [x] Automated validation currently passes 2,208 versioned entries
- [~] Final mechanical, editorial, accessibility, and source audit
- [ ] Focused 2014-versus-2024 comparison entries

## Unified standalone Codex

- [x] Rules, origins, backgrounds, feats, class foundations, mundane equipment, spells, and magic items in one searchable page
- [x] Game-system, edition, entry-type, and category filters
- [x] Dedicated Classes collection
- [x] Spell and magic-item filters
- [x] 2014 and 2024 edition labels
- [x] More than one thousand SRD spell and magic-item entries preserved
- [x] Progressive rendering and debounced search
- [x] Builder-to-full-Codex links for rule entries
- [~] Search, mobile, and accessibility usability review
- [ ] Builder-to-Codex links for relevant spells and items
- [ ] Additional original guidance around choosing and using spells

## Mundane equipment catalogue

- [x] Separate 2014 and 2024 equipment collection files
- [x] 273 edition-specific 2014 mundane-equipment entries
- [x] 246 edition-specific 2024 mundane-equipment entries
- [x] Currency, weapons, armor, ammunition, and spellcasting focuses
- [x] Adventuring gear, equipment packs, tools, and tool variants
- [x] Mounts, tack, drawn vehicles, and large vehicles
- [x] Edition-specific lifestyles, hospitality, hirelings, services, and related equipment data
- [x] Equipment-category filtering, deep links, source labels, and searchable structured facts
- [~] Final item-by-item mechanical and editorial audit

## Character origins catalogue

- [x] Separate 2014 Race/subrace and 2024 Species/Species-choice collection files
- [x] 23 edition-specific 2014 origin entries
- [x] 33 edition-specific 2024 origin entries
- [x] Parent-and-choice navigation, deep links, source labels, structured facts, and trait sections
- [x] 2024 Species entries keep Background-based ability-score increases edition-correct
- [~] Final entry-by-entry mechanical and editorial audit

## Class foundations catalogue

- [x] Separate 2014 and 2024 class-foundation collection files
- [x] Twelve SRD class overview entries for each edition
- [x] Twenty-level feature-name progression tables for every class
- [x] Hit Dice, primary abilities, saving throws, skills, armor, weapons, tools, and starting equipment
- [x] Edition-specific multiclass prerequisites and gained proficiencies
- [x] SRD subclass identity and subclass-feature levels represented in foundations
- [x] Automated synchronization checks against builder class data
- [~] Final class-by-class mechanical and editorial audit
- [ ] Individual class-feature Codex entries
- [ ] Full subclass and subclass-feature collections

## Original news and guides

- [x] News & Guides hub
- [x] Editorial standards document
- [x] How to Create Your First D&D Character
- [x] First standalone news article
- [ ] D&D 2014 and 2024: Which Builder Should I Use?
- [ ] What Happens During Your First RPG Session?
- [ ] How Ability Scores Affect Your Character
- [ ] How Leveling Up Works
- [~] Establish a sustainable original publishing cadence

# 5. Spellcasting and Magic Sheet Redesign

The current spell pages work as printable tracking space, but they are not yet the guided, edition-aware spell-management experience planned for the finished builder.

- [ ] Define the improved spell-selection workflow before changing storage fields
- [ ] Load class spellcasting rules by edition and class
- [ ] Identify spellcasting ability automatically where appropriate
- [ ] Filter available spells by edition, class, and spell level
- [ ] Support known, prepared, always-prepared, and granted spells where the rules require different treatment
- [ ] Distinguish cantrips from leveled spells cleanly
- [ ] Calculate spell slots from class progression
- [ ] Handle multiclass spell-slot progression
- [ ] Handle Pact Magic separately where required
- [ ] Link selected spells directly to full Codex entries
- [ ] Preserve spell selections through Save, Load, JSON import/export, Print, and PDF
- [ ] Design page 3 and page 4 for high usability without making printed sheets explode into extra pages
- [ ] Add graceful handling for custom / non-SRD spell names without reproducing protected rules text

# 6. Edition-Aware Classes and Multiclassing

## Data model and class identity

- [x] Load the correct class data file for the selected edition
- [x] Store class levels in individual class rows
- [x] Calculate total character level from all class rows
- [~] Preserve edition and class rows during save, load, import, and export
- [ ] Store a stable class ID and edition with each class row
- [ ] Prevent an edition switch from silently reinterpreting class data
- [ ] Define migration rules for older exported characters

## Level Up: Add a New Class

- [!] Add a New Class interface remains locked
- [ ] Validate multiclass ability-score prerequisites
- [ ] Display clear prerequisite failures
- [ ] Add explicit DM Override
- [ ] Record when DM Override was used
- [ ] Apply the new class level without replacing the existing class
- [ ] Add multiclass HP correctly
- [ ] Record multiclass changes in level history

## Proficiencies and features

- [ ] Define full starting proficiencies for each edition and class
- [ ] Define reduced multiclass proficiencies
- [ ] Track every proficiency by source
- [ ] Prevent duplicate proficiencies from producing invalid bonuses
- [ ] Support tool proficiencies and languages
- [ ] Add subclass selection at the correct class level
- [ ] Add class features by class level and edition
- [x] Detect and record class feat-choice opportunities
- [~] Integrate feat choices with the future complete class-feature system

## Acceptance tests

- [ ] Single-class Level Up still works in both editions
- [ ] Feat opportunities appear at the correct class levels
- [ ] Multiclass prerequisites are edition-correct
- [ ] DM Override is explicit and reversible before commit
- [ ] Class and total levels remain separate
- [ ] HP history remains correct after Constitution changes
- [ ] Proficiencies show their sources
- [ ] Spell slots remain correct after adding or advancing classes
- [ ] JSON round trips preserve all multiclass, feat, equipment, and spell data
- [ ] Printing and PDF output show multiclass information clearly

# 7. Accessibility, Mobile, and Quality Assurance

- [~] Responsive layout exists across the main site and builder
- [~] Keyboard support exists for major ability-score assignment controls
- [ ] Add explicit programmatic labels to remaining unlabeled form controls
- [ ] Expand keyboard navigation across the full builder
- [ ] Improve focus states and modal focus handling
- [ ] Review contrast across every theme
- [ ] Complete mobile layout polish
- [ ] Test Chrome, Edge, Firefox, Safari where available, and mobile browsers
- [ ] Run a repeatable two-edition regression checklist before major releases
- [ ] Add lightweight automated checks for internal file references and common HTML integrity failures

# 8. My First Steps

**My First Steps** is a planned free web onboarding experience that takes a new player from Level 0 to Level 1 through a short interactive adventure and produces a ready-to-go character based on their choices.

- [ ] Define the Level 0 character state
- [ ] Define the minimum onboarding questions
- [ ] Write the first short adventure structure
- [ ] Map decisions to character traits and class direction
- [ ] Produce a ready-to-go Level 1 character
- [ ] Explain why each choice changed the character
- [ ] Allow export into the standard builder
- [ ] Test with people who have never played before
- [ ] Keep the PC/web experience free

# 9. Accounts, Cloud, and Campaign Services

These features come after the local builder and character data model are dependable.

## Free experience

- [x] Local browser saves
- [x] JSON import and export
- [ ] Optional account without requiring personal cloud storage

## Paid services

- [ ] Personal cloud saves
- [ ] Cross-device synchronization
- [ ] Character version history
- [ ] Hosted campaigns
- [ ] Game Master storage sponsorship for invited free players
- [ ] Homebrew rules and content
- [ ] Basic campaign communication
- [ ] Privacy, security, backup, and account-recovery design

# 10. Mobile Applications

- [ ] Evaluate shared web and app architecture
- [ ] Create local-only Android prototype
- [ ] Create local-only iOS prototype
- [ ] Keep paid mobile applications ad-free
- [ ] Use subscriptions only for optional cloud and campaign services where appropriate

# 11. Additional Game Systems

Additional systems will be considered only after the D&D 5e builders are stable and each system's licensing requirements have been reviewed.

Potential future systems include:

- [ ] Pathfinder
- [ ] Cyberpunk RED
- [ ] Shadowrun
- [ ] Vampire: The Masquerade
- [ ] Werewolf: The Apocalypse
- [ ] Mage: The Ascension
- [ ] Wraith: The Oblivion
- [ ] Changeling
- [ ] Powered by the Apocalypse games where licensing permits
- [ ] Basic Roleplaying under appropriate ORC-compatible terms and without protected product branding

# 12. Long-Term Original Tools

- [ ] Game Master campaign dashboard
- [ ] Encounter builder
- [ ] NPC generator
- [ ] Treasure generator
- [ ] Initiative tracker
- [ ] Original adventure generator
- [ ] World-building tools
- [ ] Accessible dice tools

## Immediate Sequence

1. Complete the repository repair and public-page consistency audit.
2. Run a full two-edition Save, Load, JSON, Level Up, Feats, Combat Equipment, Print, and PDF regression pass.
3. Design and implement the next spellcasting / magic-sheet usability pass without breaking existing saves.
4. Return to edition-aware class-feature, subclass, proficiency, and multiclass automation.
5. Implement Add a New Class prerequisites and explicit DM Override.
6. Implement reduced multiclass proficiencies and source tracking.
7. Implement combined spell-slot handling and the remaining multiclass acceptance tests.
8. Continue beginner content, accessibility, and mobile polish alongside stable engineering work.
