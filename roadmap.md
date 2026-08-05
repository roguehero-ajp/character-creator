# My RPG Source Roadmap

Last updated: August 5, 2026

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
- Keep the live site reasonably stable during external reviews and major development branches.
- Do not place advertisements near save, download, Level Up, print, or PDF controls.
- Keep local browser saves and JSON import/export available to free users.
- Do not include personal cloud storage in the free tier.
- Keep the planned **My First Steps** web experience free.
- Use **ready-to-go character** consistently in product copy.
- Add new game systems only after licensing and product-identity risks have been reviewed.

# 1. Foundation and Public Site

## Completed

- [x] Custom domain and HTTPS
- [x] GitHub repository and GitHub Pages deployment
- [x] 2014 and 2024 builder entry points
- [x] Responsive homepage and shared site navigation
- [x] About page
- [x] Contact page and contact form
- [x] Privacy Policy
- [x] Legal / SRD Attribution page
- [x] New Player FAQ with a complete example of play
- [x] Custom 404 page
- [x] `robots.txt`
- [x] `sitemap.xml`
- [x] `ads.txt`
- [x] Featured Knowledge Card with Previous, Pause, and Next controls

## Project Truth Reset

- [x] Replace the outdated `README.md`
- [x] Replace the outdated `roadmap.md`
- [x] Rebuild `Changelog.md` around the actual repository state
- [ ] Update the homepage roadmap snapshot and stale feature wording
- [ ] Standardize the displayed application version across code, footer, and documentation
- [ ] Correct remaining public copy and consistency issues
- [ ] Decide how releases and version numbers will be assigned before the next formal release

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
- [~] Complete background collections
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
- [ ] Full regression test matrix for both editions

## Printing and PDF

- [x] Character-sheet printing
- [x] Temporary blank-sheet printing
- [x] PDF export
- [x] Print-specific field and placeholder cleanup
- [x] Restoration of character data after blank printing
- [~] Long class-feature and species-feature print layout
- [~] Print testing across browsers and page sizes

# 3. Rules Learning and Original Content

## Knowledge Cards

- [x] Ability-score Knowledge Cards
- [x] Skill Knowledge Cards
- [x] Combat Knowledge Cards
- [x] Saving-throw Knowledge Cards
- [x] Additional rule categories in `data/codex.json`
- [x] Homepage Featured Knowledge Card rotation
- [~] Content audit for accuracy, consistency, and edition labels
- [ ] Related-entry links and guided learning paths

## Rules Codex minimum viable collection

The next content milestone is a dependable set of original, plain-language rules explanations. Each major entry should explain what the rule means, when it appears, provide an example, identify common mistakes, and note important edition differences.

- [~] Ability scores
- [~] Skills
- [~] Saving throws
- [~] Combat basics
- [~] Conditions
- [~] Equipment
- [~] Weapons and armour
- [~] Spellcasting fundamentals
- [ ] Resting and recovery
- [ ] Proficiency and Expertise
- [ ] Advantage and Disadvantage
- [ ] Character level versus class level
- [ ] Multiclassing fundamentals
- [ ] 2014 versus 2024 comparison entries
- [ ] Internal links between related entries
- [ ] Final copy, accessibility, and accuracy review

## Standalone Spells & Magic Items Codex

- [x] Searchable standalone Codex page
- [x] Spell and magic-item filters
- [x] 2014 and 2024 edition labels
- [x] More than one thousand SRD entries
- [~] Search and filter usability review
- [ ] Builder-to-Codex links for relevant spells and items
- [ ] Additional original guidance around choosing and using spells

## Original beginner guides

- [ ] How to Create Your First D&D Character
- [ ] D&D 2014 and 2024: Which Builder Should I Use?
- [ ] What Happens During Your First RPG Session?
- [ ] How Ability Scores Affect Your Character
- [ ] How Leveling Up Works

# 4. Edition-Aware Classes and Multiclassing

This is the next major engineering sequence after the Rules Codex minimum viable collection.

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
- [ ] Add DM Override
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
- [ ] Add Ability Score Improvement and Feat choices

## Spellcasting

- [ ] Identify spellcasting classes by edition
- [ ] Track spellcasting ability by class
- [ ] Calculate combined multiclass spell slots
- [ ] Handle Pact Magic separately where required
- [ ] Support prepared and known spells by class
- [ ] Preserve spellcasting selections through save, import, export, and printing

## Acceptance tests

- [ ] Single-class Level Up still works in both editions
- [ ] Multiclass prerequisites are edition-correct
- [ ] DM Override is explicit and reversible before commit
- [ ] Class and total levels remain separate
- [ ] HP history remains correct after Constitution changes
- [ ] Proficiencies show their sources
- [ ] Spell slots remain correct after adding or advancing classes
- [ ] JSON round trips preserve all multiclass data
- [ ] Printing and PDF output show multiclass information clearly

# 5. Character Sheet Refinement

These changes should follow the class-data work unless they are critical fixes.

- [ ] Rework class and subclass presentation for multiple classes
- [ ] Create compact, printable feature summaries
- [ ] Improve long Species or Race trait printing
- [ ] Improve spell-list and prepared-spell workflow
- [ ] Improve equipment and currency workflow
- [ ] Add clearer validation without blocking house rules
- [ ] Expand keyboard navigation
- [ ] Improve focus states and screen-reader labels
- [ ] Review contrast across every theme
- [ ] Complete mobile layout polish
- [ ] Test Chrome, Edge, Firefox, and mobile browsers

# 6. My First Steps

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

# 7. Accounts, Cloud, and Campaign Services

These features come after the local builder and multiclass model are dependable.

## Free experience

- [x] Local browser saves
- [x] JSON import and export
- [ ] Optional account without requiring cloud storage

## Paid services

- [ ] Personal cloud saves
- [ ] Cross-device synchronization
- [ ] Character version history
- [ ] Hosted campaigns
- [ ] Game Master storage sponsorship for invited free players
- [ ] Homebrew rules and content
- [ ] Basic campaign communication
- [ ] Privacy, security, backup, and account-recovery design

# 8. Mobile Applications

- [ ] Evaluate shared web and app architecture
- [ ] Create local-only Android prototype
- [ ] Create local-only iOS prototype
- [ ] Keep mobile applications ad-free
- [ ] Use subscriptions for optional cloud and campaign services

# 9. Additional Game Systems

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

# 10. Long-Term Original Tools

- [ ] Game Master campaign dashboard
- [ ] Encounter builder
- [ ] NPC generator
- [ ] Treasure generator
- [ ] Initiative tracker
- [ ] Original adventure generator
- [ ] World-building tools
- [ ] Accessible dice tools

## Immediate Sequence

1. Synchronize the homepage with the Project Truth Reset.
2. Complete and audit the Rules Codex minimum viable collection.
3. Begin the edition-aware class architecture branch.
4. Implement Add a New Class, prerequisites, and DM Override.
5. Implement reduced multiclass proficiencies and source tracking.
6. Add subclass, class-feature, and combined spell-slot handling.
7. Run full two-edition storage, import, export, print, and PDF regression testing.
