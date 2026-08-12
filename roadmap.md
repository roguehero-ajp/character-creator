# My RPG Source Roadmap

**Current release:** v1.0.0  
**Release date:** August 11, 2026

This roadmap begins from the v1.0 foundation. Completed v1.0 systems are summarized first; remaining items are future enhancements rather than blockers to the initial release.

Status markers:

- `[x]` complete in v1.0
- `[~]` usable but still worth improving
- `[ ]` planned
- `[!]` intentionally deferred or gated

# 1. v1.0 Foundation

## Builder core

- [x] Separate D&D 5e 2014 and 2024 builder modes
- [x] Edition-specific Race/Species, backgrounds, classes, feats, spells, subclasses, and equipment
- [x] Manual, Standard Array, rolled methods, and official Point Buy
- [x] Ability modifiers and common derived calculations
- [x] Saving throws and skills
- [x] HP, Hit Dice, initiative, Passive Perception, and proficiency bonus
- [x] Existing-class Level Up with HP methods and level history
- [x] Multiple class rows and total character level
- [x] Structured feats
- [x] Structured class/subclass feature progression for all twelve SRD classes
- [x] Dynamic feature-continuation pages
- [x] Edition-aware combat-equipment helpers
- [x] Dynamic class-aware spellcasting for both editions
- [x] Multiclass Spellcasting slot calculations
- [x] Pact Magic and Mystic Arcanum
- [x] SRD subclass magic
- [x] Save, Load, autosave, JSON export/import
- [x] Print Blank Sheet
- [x] Character printing
- [x] PDF export
- [x] Multiple themes

## Rules learning

- [x] Contextual Knowledge Cards
- [x] 500 ms mouse-hover delay
- [x] Persistent Knowledge Card on/off switch
- [x] Direct Codex links from spells and class/subclass features
- [x] Manifest-driven edition-isolated Codex
- [x] 2,630 validated versioned Codex entries
- [x] 422 edition-specific class/subclass feature entries
- [x] Search, edition filters, entry-type filters, and deep links

## Public site

- [x] Portal homepage
- [x] News & Guides
- [x] Beginner character guide
- [x] FAQ and example of play
- [x] About, Contact, Privacy, and Legal pages
- [x] Custom 404
- [x] Sitemap and robots file
- [x] Google Analytics
- [x] AdSense support/privacy preparation

# 2. v1.1 Candidate: Class Choices and Resources

The class-feature engine now knows **when** features exist. The next logical layer is to make choice-heavy features and expendable resources more interactive.

## Strict class-choice controls

- [ ] Fighting Style legal-option selectors by class and edition
- [ ] Expertise source and skill selectors
- [ ] Weapon Mastery choices
- [ ] Metamagic selectors
- [ ] Eldritch Invocation selectors
- [ ] Pact choice handling
- [ ] Hunter and similar subclass branch choices
- [ ] Divine Order / Primal Order and similar class-order choices
- [ ] Choice validation when class level changes
- [ ] Safe manual/DM Override path for non-SRD options

## Resource trackers

- [ ] Rage uses
- [ ] Bardic Inspiration
- [ ] Second Wind
- [ ] Action Surge
- [ ] Channel Divinity
- [ ] Focus/Ki points
- [ ] Sorcery Points
- [ ] Wild Shape / Wild Companion resources where applicable
- [ ] Other class resources that benefit from at-table counters
- [ ] Rest/reset helpers where they can be implemented without surprising the user

# 3. Multiclass and Proficiency Precision

## Guided Level Up: Add a New Class

- [!] The dedicated Level Up “Add a New Class” branch remains intentionally gated in v1.0
- [ ] Validate edition-specific multiclass ability-score prerequisites
- [ ] Show clear prerequisite failures
- [ ] Add explicit DM Override
- [ ] Record when DM Override was used
- [ ] Apply the new class without replacing the existing class
- [ ] Add multiclass HP correctly
- [ ] Record class addition in level history

## Proficiency-source tracking

- [ ] Track armor proficiency by source
- [ ] Track weapon proficiency by source
- [ ] Track skills by source
- [ ] Track tools and languages by source
- [ ] Apply reduced multiclass proficiencies
- [ ] Prevent duplicate sources from creating invalid bonuses
- [ ] Feed proficiency-source information into combat-equipment validation

# 4. Spellcasting v1.1+

The core spellcasting engine is complete. Remaining work is edge automation and convenience.

- [x] 2014 and 2024 smart caster profiles
- [x] Class-aware dynamic pages
- [x] Known/prepared/spellbook/always-prepared handling
- [x] Multiclass slots
- [x] Pact Magic / Mystic Arcanum
- [x] SRD subclass spell behavior
- [x] Knowledge Cards and Codex links
- [ ] Feat-granted spell automation
- [ ] Species/origin-granted spell automation
- [ ] Choice-dependent magic such as Blessed Warrior / Pact-related additions
- [ ] Wizard copied/found spellbook additions beyond class-level grants
- [ ] More explicit spell-source provenance on complex characters
- [ ] Additional spell-print density controls if real-world testing demands them

# 5. Feats and Ability Improvements

- [x] Structured SRD feat records
- [x] 2024 Background/Human synchronization
- [x] Class-level feat-opportunity detection
- [x] Manual / DM Override feat entry
- [ ] Safe feat prerequisite enforcement where all required data is available
- [ ] Automatic mechanical effects for carefully selected feats
- [ ] Improved 2014 ASI-versus-Feat ability-score interface
- [ ] Feat-granted spell integration with the spellcasting engine

# 6. Equipment and Inventory

- [x] Weapon, armor, shield, and SRD magic-equipment selectors
- [x] Common attack/damage and Armor Class helpers
- [ ] Starting-equipment automation from class/background choices
- [ ] Full inventory workflow for larger equipment lists
- [ ] Carrying-capacity support
- [ ] Ammunition/consumable convenience tracking where useful
- [ ] Stronger proficiency validation once proficiency-source tracking exists

# 7. Accessibility, Mobile, Print, and QA

- [x] Programmatic labels for legacy/dynamic builder controls
- [x] Keyboard-aware Knowledge Cards
- [x] Responsive site and builder foundation
- [x] Dynamic class and spell continuation pages
- [~] Expand keyboard navigation across every builder workflow
- [~] Improve modal focus trapping and restoration
- [~] Continue contrast review across all themes
- [~] Continue mobile layout polish
- [~] Continue long-feature and dense-spell print testing
- [ ] Formal Chrome/Edge/Firefox/Safari regression matrix
- [ ] Mobile-browser regression matrix
- [ ] Add lightweight automated internal-link/HTML integrity checks
- [ ] Maintain a repeatable two-edition release checklist

# 8. Beginner Experience: My First Steps

**My First Steps** is planned as a free web onboarding adventure that takes a new player from Level 0 to Level 1 and produces a ready-to-go character.

- [ ] Define the Level 0 character state
- [ ] Define minimum onboarding questions
- [ ] Write the first short adventure structure
- [ ] Map decisions to character traits and class direction
- [ ] Produce a ready-to-go Level 1 character
- [ ] Explain why each decision changed the character
- [ ] Export into the standard builder
- [ ] Test with people who have never played before
- [ ] Keep the PC/web experience free

# 9. Content and Discovery

- [x] News & Guides hub
- [x] Editorial standards
- [x] First beginner guide
- [x] First standalone news article
- [ ] D&D 2014 and 2024: Which Builder Should I Use?
- [ ] What Happens During Your First RPG Session?
- [ ] How Ability Scores Affect Your Character
- [ ] How Leveling Up Works
- [ ] Class-choice explainers tied to the new feature system
- [ ] Sustainable original publishing cadence
- [ ] Focused 2014-versus-2024 Codex comparison entries

# 10. Accounts, Cloud, and Campaign Services

These are optional services beyond the local-first v1.0 builder.

## Free experience

- [x] Local browser saves
- [x] JSON import/export
- [ ] Optional account without requiring personal cloud storage

## Paid services

- [ ] Personal cloud saves
- [ ] Cross-device synchronization
- [ ] Character version history
- [ ] Hosted campaigns
- [ ] Game Master storage sponsorship for invited free players
- [ ] Homebrew/private content storage
- [ ] Basic campaign communication
- [ ] Privacy, security, backup, and recovery design

# 11. Mobile Applications

- [ ] Evaluate shared web/app architecture
- [ ] Create local-only Android prototype
- [ ] Create local-only iOS prototype
- [ ] Keep paid mobile apps ad-free
- [ ] Reserve subscriptions for optional cloud/campaign services where appropriate

# 12. Additional Game Systems

Additional systems come only after the D&D 5e foundation remains stable and each system's licensing has been reviewed.

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

# 13. Long-Term Original Tools

- [ ] Game Master campaign dashboard
- [ ] Encounter builder
- [ ] NPC generator
- [ ] Treasure generator
- [ ] Initiative tracker
- [ ] Original adventure generator
- [ ] World-building tools
- [ ] Accessible dice tools

## Immediate Post-1.0 Sequence

1. Watch v1.0 for real-user bugs before changing core architecture.
2. Build strict class-choice selectors and resource trackers.
3. Finish proficiency-source tracking and the guided multiclass Level Up branch.
4. Add safe feat/species-granted magic and other spellcasting edge automation.
5. Continue accessibility, mobile, print, and cross-browser regression work.
6. Expand beginner content and begin **My First Steps** design.
