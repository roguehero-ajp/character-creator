# My RPG Source Rules Codex Completion Checklist

**Status:** Active development — architecture and broad core-player-rules milestone implemented  
**Scope:** Player-facing D&D fifth-edition reference for the 2014 and 2024 rules  
**Primary sources:** SRD 5.1 and SRD 5.2.1 under CC BY 4.0  
**Project mission:** Break down the barriers that stop people from playing tabletop roleplaying games.

---

## 1. Definition of “Complete”

The Rules Codex milestone is complete when My RPG Source provides one coherent, searchable reference library containing:

- Original plain-language explanations of the core rules.
- Edition-aware coverage for the 2014 and 2024 fifth-edition rules.
- Character creation and advancement guidance.
- Ability scores, skills, saving throws, and core resolution mechanics.
- Exploration, social interaction, combat, recovery, and conditions.
- Mundane equipment, weapons, armor, tools, packs, services, mounts, and vehicles that are available under the applicable SRD.
- Spellcasting rules.
- SRD character options, including the races/species, backgrounds, feats, classes, and subclasses released in SRD 5.1 and SRD 5.2.1.
- The existing SRD spell and magic-item library.
- Clear source and licensing labels.
- Search, category, entry-type, and edition filters.
- Direct links to individual Codex entries.
- Builder integration that opens the correct entry for the active edition.
- Accessible keyboard, screen-reader, mobile, and reduced-motion behaviour.
- No accidental use of non-SRD rules text.

“Complete” does **not** mean reproducing every commercial D&D rulebook.

---

## 2. Current Repository Baseline

### Existing original Rules Codex

- [x] `data/codex.json` exists.
- [x] 130 original rules-reference entries exist.
- [x] 10 categories exist:
  - Character Creation
  - Abilities
  - Skills
  - Saving Throws
  - Combat
  - Conditions
  - Equipment
  - Weapons
  - Armor
  - Spellcasting
- [x] Entries can be filtered by active builder edition.
- [x] Related-topic links exist.
- [x] Search and category filtering exist in the builder drawer.
- [x] The builder has an **Open Codex** control.

### Existing SRD spell and magic-item library

- [x] `data/srd-codex.json` exists.
- [x] 1,153 SRD entries exist.
- [x] 658 spell entries exist.
- [x] 495 magic-item entries exist.
- [x] 2014 and 2024 edition filters exist.
- [x] Spell level and school filters exist.
- [x] Magic-item rarity and attunement filters exist.
- [x] Attribution is displayed.
- [x] Progressive loading is implemented.

### Existing SRD race and species library

- [x] Separate `data/codex/dnd5e/2014/ancestries.json` and `data/codex/dnd5e/2024/ancestries.json` files exist.
- [x] 23 edition-specific 2014 race, subrace, and ancestry-choice entries exist.
- [x] 33 edition-specific 2024 species and species-choice entries exist.
- [x] Parent and child navigation exists for subraces, lineages, giant ancestries, fiendish legacies, and draconic ancestries.
- [x] Race/species category filtering and stable deep links exist.
- [x] Every entry declares its edition, source document, and CC BY 4.0 licence.

### Current separation to resolve

- [x] The standalone `codex.html` page presents rules, races/species, mundane equipment, spells, and magic items through one data layer.
- [x] The builder drawer remains lightweight and loads only the active edition's core rules.
- [x] Both halves are united without forcing the builder to load the full spell and magic-item catalogue.

---

## 3. Scope and Licensing Guardrails

### Permitted content

- [ ] Use SRD 5.1 content for the 2014 rules under CC BY 4.0.
- [ ] Use SRD 5.2.1 content for the 2024 rules under CC BY 4.0.
- [ ] Continue writing original plain-language explanations, examples, comparisons, navigation, and beginner guidance.
- [ ] Mark adapted, reorganized, or summarized SRD material appropriately.
- [ ] Retain the required attribution and licence links.
- [ ] Keep original My RPG Source writing distinguishable from reproduced or adapted SRD content.

### Non-SRD content

- [ ] Do not reproduce rules text from commercial books unless that exact material is included in the applicable SRD.
- [ ] Do not use the D&D Beyond Basic Rules as a reusable content source.
- [ ] Non-SRD races, species, classes, subclasses, backgrounds, feats, spells, items, or mechanics may receive only carefully limited identification or navigation treatment.
- [ ] When a builder option is not in the SRD, direct users to the appropriate official source for its complete rules.
- [ ] Do not imply endorsement by Wizards of the Coast.
- [ ] Audit proper names and protected setting material before publication.

### Out of scope for this milestone

- [ ] Monster stat-block library.
- [ ] Encounter builder.
- [ ] Adventure-writing or campaign-management reference.
- [ ] Full Dungeon Master rules reference.
- [ ] Homebrew marketplace or public homebrew database.
- [ ] Rules from books or expansions outside SRD 5.1 and SRD 5.2.1.
- [ ] Other game systems.
- [ ] Multilingual Codex.
- [ ] AI-generated rules adjudication.

---

## 4. Codex Information Architecture

### Recommended content layers

- [x] **Rules:** Original explanations of how play works.
- [ ] **Character Options:** SRD races/species, backgrounds, feats, classes, and subclasses.
- [x] **Equipment:** Mundane gear, weapons, armor, tools, packs, services, mounts, and vehicles.
- [x] **Spells:** Existing SRD spell library.
- [x] **Magic Items:** Existing SRD magic-item library.
- [ ] **Edition Differences:** Focused 2014-versus-2024 comparisons.
- [ ] **Glossary:** Search aliases and short definitions for frequently encountered terms.

### Recommended data strategy

- [x] Preserve legacy `data/codex.json` for rollback while moving active rule loading to edition-specific files.
- [x] Preserve `data/srd-codex.json` for the existing spell and magic-item collection.
- [x] Establish modular edition-specific files and a manifest-driven loader; character options and equipment will follow this pattern:
  - Separate edition-aware JSON files, or
  - A generated Codex data bundle assembled from modular source files.
- [ ] Avoid placing every content type into one enormous hand-edited JSON file.
- [x] Add a data manifest for game systems, editions, and collections.
- [x] Version the Codex data schema.
- [x] Add automated validation for active Codex data files.

### Proposed entry schema additions

- [ ] `entryType`
- [ ] `editions`
- [ ] `sourceType`
- [ ] `sourceDocument`
- [ ] `sourceSection`
- [ ] `license`
- [ ] `summary`
- [ ] `whatItMeans`
- [ ] `steps`
- [ ] `facts`
- [ ] `tables`
- [ ] `exampleInPlay`
- [ ] `commonMistakes`
- [ ] `editionDifferences`
- [ ] `related`
- [ ] `aliases`
- [ ] `tags`
- [ ] `builderTargets`
- [ ] `sortKey`

---

## 5. Core Rules Content

### Dice and resolution

- [ ] Dice notation.
- [ ] The d20 test.
- [ ] Ability checks.
- [ ] Difficulty Classes.
- [ ] Proficiency bonus.
- [ ] Proficiency.
- [ ] Expertise.
- [ ] Advantage and Disadvantage.
- [ ] Multiple sources of Advantage and Disadvantage.
- [ ] Passive checks.
- [ ] Group checks.
- [ ] Contests or their edition-appropriate replacement.
- [ ] Automatic success and failure where applicable.
- [ ] Rounding.
- [ ] Repeated checks.
- [ ] Working together.
- [ ] Help and assistance.
- [ ] Time and turns outside combat.
- [ ] Rules-specific terminology for each edition.

### Ability scores and skills

- [x] Six ability-score overview entries exist.
- [x] Nineteen skill-related entries exist.
- [ ] Expand each ability entry with common checks and practical examples.
- [ ] Add skill-versus-ability guidance.
- [ ] Explain when a different ability can be paired with a skill.
- [ ] Add tool checks and tool/skill combinations.
- [ ] Add passive Perception, Investigation, and Insight guidance where applicable.
- [ ] Add common check-selection mistakes.
- [ ] Verify all wording separately against the 2014 and 2024 SRDs.

### Saving throws

- [x] General saving-throw entry exists.
- [x] Six ability-specific saving-throw entries exist.
- [ ] Explain saving-throw proficiency.
- [ ] Explain repeated saves.
- [ ] Explain concentration saves.
- [ ] Explain death saving throws separately from ordinary saving throws.
- [ ] Add examples of common effects associated with each saving throw.
- [ ] Audit edition-specific terminology.

---

## 6. Character Creation and Advancement

### Character foundation

- [x] Ability scores and modifiers.
- [x] Class and level.
- [x] Race concept for 2014.
- [x] Species concept for 2024.
- [x] Background concepts for both editions.
- [x] Alignment.
- [x] Experience points.
- [ ] Character creation sequence for 2014.
- [ ] Character creation sequence for 2024.
- [ ] Character level versus class level.
- [ ] Hit Dice by class.
- [ ] Starting hit points.
- [ ] Hit points after level 1.
- [ ] Proficiency sources.
- [ ] Languages.
- [ ] Size.
- [ ] Speed.
- [ ] Senses.
- [ ] Starting equipment and starting wealth.
- [ ] Personality guidance without presenting personality fields as mandatory.
- [ ] Character goals and motivations.
- [ ] Ready-to-go character checklist.

### Ability-score methods

- [ ] Standard Array.
- [ ] Point Buy.
- [ ] Rolled ability scores.
- [ ] Manual entry.
- [ ] Ability-score limits.
- [ ] Edition-specific sources of ability-score increases.
- [ ] Feats and Ability Score Improvements.
- [ ] Common ability-score mistakes.

### Advancement

- [ ] Gaining a level.
- [ ] Class levels and total character level.
- [ ] Proficiency bonus progression.
- [ ] Hit-point increases.
- [ ] Class features.
- [ ] Subclass selection.
- [ ] Feats and Ability Score Improvements.
- [ ] Spellcasting advancement.
- [ ] Multiclass prerequisites.
- [ ] Multiclass proficiencies.
- [ ] Multiclass spell slots.
- [ ] Hit Dice for multiclass characters.
- [ ] Level-history explanation.
- [ ] DM Override explanation as a My RPG Source feature, clearly distinguished from standard rules.

---

## 7. Races, Species, Backgrounds, Feats, and Classes

### General rule

For each character option, determine whether its complete mechanical text is present in the applicable SRD before including that text.

### 2014 races

- [x] Inventory every race and subrace in SRD 5.1.
- [x] Create a licensed-data entry for every SRD race and subrace.
- [x] Include size, speed, traits, languages, and ability-score changes where licensed.
- [ ] Link each entry to related rules.
- [x] Identify builder races that are not fully covered by SRD 5.1.
- [ ] Provide limited source guidance for non-SRD options without reproducing protected text.

### 2024 species

- [x] Inventory every species and lineage choice in SRD 5.2.1.
- [x] Create a licensed-data entry for every SRD species.
- [x] Include size, speed, traits, senses, resistances, and choices where licensed.
- [x] Explain that 2024 ability-score increases come from Background.
- [x] Identify builder species that are not fully covered by SRD 5.2.1.
- [ ] Provide limited source guidance for non-SRD options without reproducing protected text.

### Backgrounds

- [x] Inventory SRD 5.1 backgrounds.
- [x] Inventory SRD 5.2.1 backgrounds.
- [x] Create edition-aware entries.
- [x] Include proficiencies, languages, equipment, feats, and ability-score information where licensed.
- [ ] Explain custom or player-created background rules only where available under the relevant SRD.
- [ ] Add background-selection guidance.

### Feats

- [x] Inventory SRD 5.1 feats.
- [x] Inventory SRD 5.2.1 Origin, General, Fighting Style, Epic Boon, or other feat categories included in the SRD.
- [x] Create edition-aware feat entries.
- [x] Include prerequisites and repeatability where licensed.
- [ ] Link feats to affected abilities, proficiencies, actions, and spellcasting rules.
- [x] Prevent non-SRD feat text from entering the Codex.

### Classes and subclasses

- [x] Inventory all classes in SRD 5.1.
- [x] Inventory all classes in SRD 5.2.1.
- [x] Inventory the SRD subclass included for each class.
- [x] Create class overview entries.
- [x] Create class progression tables.
- [ ] Create class-feature entries.
- [ ] Create subclass entries and subclass-feature entries.
- [x] Include hit dice, primary abilities, saving-throw proficiencies, armor, weapons, tools, skills, and starting equipment where licensed.
- [x] Make every class entry edition-aware.
- [ ] Link class features to spellcasting, actions, rests, resources, and conditions.
- [x] Keep non-SRD class and subclass mechanics out of the Codex.
- [x] Cross-check Codex class foundations against the edition-specific builder class data; full builder behavior remains a later engineering milestone.

---

## 8. Exploration and Adventuring

### Movement and travel

- [ ] Speed.
- [ ] Walking.
- [ ] Climbing.
- [ ] Swimming.
- [ ] Crawling.
- [ ] Jumping.
- [ ] Difficult terrain.
- [ ] Travel pace.
- [ ] Forced march.
- [ ] Marching order.
- [ ] Special travel pace.
- [ ] Mounts and vehicles.
- [ ] Falling.
- [ ] Suffocating.
- [ ] Food and water.
- [ ] Environmental hazards included in the SRDs.

### Vision, light, and senses

- [ ] Bright light.
- [ ] Dim light.
- [ ] Darkness.
- [ ] Lightly obscured areas.
- [ ] Heavily obscured areas.
- [ ] Blindsight.
- [ ] Darkvision.
- [ ] Truesight.
- [ ] Tremorsense where applicable.
- [ ] Line of sight.
- [ ] Perception and noticing threats.
- [ ] Hiding.
- [ ] Stealth while travelling.
- [ ] Surprise for 2014.
- [ ] 2024 surprise and initiative treatment.

### Objects and interaction

- [ ] Interacting with objects.
- [ ] Object Armor Class and hit points where included.
- [ ] Breaking objects.
- [ ] Doors, locks, traps, and environmental interaction at a player-reference level.
- [ ] Searching.
- [ ] Studying.
- [ ] Utilizing objects in 2024.
- [ ] Improvised actions.

---

## 9. Social Interaction

- [ ] Roleplaying social encounters.
- [ ] Charisma checks.
- [ ] Deception.
- [ ] Intimidation.
- [ ] Performance.
- [ ] Persuasion.
- [ ] Insight.
- [ ] NPC attitudes where included in the SRD.
- [ ] Influence action for 2024.
- [ ] Social interaction procedure for 2014.
- [ ] Language barriers.
- [ ] Telepathy where included.
- [ ] Charm versus ordinary persuasion.
- [ ] Common social-rule misunderstandings.

---

## 10. Combat

### Combat structure

- [ ] Combat sequence.
- [ ] Rounds.
- [ ] Turns.
- [ ] Initiative.
- [ ] Surprise.
- [ ] Position and movement.
- [ ] Creature space.
- [ ] Moving around creatures.
- [ ] Squeezing.
- [ ] Dropping prone.
- [ ] Standing up.
- [ ] Flying movement.
- [ ] Mounted combat.
- [ ] Underwater combat.

### Actions and activity

- [x] General Actions entry exists.
- [x] Bonus Actions entry exists.
- [x] Reactions entry exists.
- [ ] Attack.
- [ ] Cast a Spell or Magic action, according to edition.
- [ ] Dash.
- [ ] Disengage.
- [ ] Dodge.
- [ ] Help.
- [ ] Hide.
- [ ] Influence.
- [ ] Ready.
- [ ] Search.
- [ ] Study.
- [ ] Utilize.
- [ ] Improvised actions.
- [ ] One free object interaction and edition-specific handling.
- [ ] Communication during combat.

### Attacks

- [x] Attack rolls.
- [x] Melee attacks.
- [x] Ranged attacks.
- [x] Opportunity attacks.
- [ ] Unarmed strikes.
- [ ] Grappling.
- [ ] Shoving.
- [ ] Two-weapon fighting.
- [ ] Ranged attacks in close combat.
- [ ] Long range.
- [ ] Cover and attacks.
- [ ] Unseen attackers and targets.
- [ ] Improvised weapons.
- [ ] Natural weapons where included.
- [ ] Weapon mastery for 2024.

### Damage, healing, and defeat

- [x] Damage rolls.
- [x] Critical hits.
- [x] Hit points.
- [x] Temporary hit points.
- [x] Death saving throws.
- [ ] Damage types.
- [ ] Resistance.
- [ ] Vulnerability.
- [ ] Immunity.
- [ ] Healing.
- [ ] Dropping to 0 hit points.
- [ ] Instant death.
- [ ] Stabilizing a creature.
- [ ] Knocking a creature out.
- [ ] Massive damage if applicable.
- [ ] Damage to objects.
- [ ] Simultaneous effects.
- [ ] Temporary hit-point replacement rules.
- [ ] Edition differences in critical hits and death rules.

---

## 11. Conditions and Ongoing Effects

- [x] Core 2014 condition entries exist.
- [x] Separate 2014 and 2024 Exhaustion entries exist.
- [ ] Verify the complete 2014 condition list.
- [ ] Verify the complete 2024 condition list.
- [ ] Add Bloodied as a glossary/reference term if appropriate.
- [ ] Add concentration as an ongoing state.
- [ ] Add hidden/invisible distinctions.
- [ ] Add surprise treatment by edition.
- [ ] Add condition-combination guidance.
- [ ] Add ending-condition guidance.
- [ ] Cross-link every condition to affected actions, attacks, movement, and saving throws.
- [ ] Add common condition mistakes.

---

## 12. Resting, Recovery, and Resources

- [x] Short Rest entry exists.
- [x] Long Rest entry exists.
- [ ] Hit Dice recovery.
- [ ] Healing during rests.
- [ ] Interrupting a rest.
- [ ] Activities during a rest.
- [ ] Long-rest frequency limits.
- [ ] Exhaustion recovery.
- [ ] Regaining spell slots.
- [ ] Regaining class resources.
- [ ] Temporary hit points and rests.
- [ ] Edition-specific rest differences.
- [ ] Downtime overview where included and useful to players.

---

## 13. Equipment and Mundane Items

### Currency, load, and commerce

- [x] Currency overview exists.
- [x] Carrying Capacity overview exists.
- [x] Coin conversions.
- [ ] Starting wealth.
- [ ] Selling equipment.
- [x] Lifestyle expenses where included.
- [x] Food, drink, lodging, and services.
- [ ] Encumbrance and variant encumbrance only where licensed and appropriate.
- [ ] Size and carrying capacity.
- [ ] Push, drag, and lift.
- [ ] Container capacity.

### Adventuring gear

- [x] Create a structured entry for every adventuring-gear item included in SRD 5.1.
- [x] Create a structured entry for every adventuring-gear item included in SRD 5.2.1.
- [x] Store name, cost, weight, category, edition, source, and description.
- [x] Handle edition-specific cost, weight, or wording differences.
- [x] Add equipment packs and pack contents.
- [x] Add ammunition.
- [x] Add arcane, druidic, and holy focuses where licensed.
- [x] Add kits and tools.
- [x] Add poisons, healing supplies, and special substances only where licensed.
- [x] Add services, mounts, tack, and vehicles where licensed.
- [x] Add searchable tags, variants, aliases, and common names.

### Weapons

- [x] General weapon and property entries exist.
- [x] Create full 2014 weapon table.
- [x] Create full 2024 weapon table.
- [x] Add cost, damage, damage type, weight, and properties.
- [x] Add mastery property for 2024 weapons.
- [ ] Create entries for every weapon property.
- [x] Add simple versus martial classification.
- [x] Add melee versus ranged classification.
- [ ] Add improvised weapon rules.
- [ ] Add silvered weapons where included.
- [ ] Add ammunition and loading interactions.
- [ ] Add two-weapon and versatile examples.
- [ ] Audit edition differences.

### Armor and shields

- [x] General armor category entries exist.
- [x] Create full 2014 armor table.
- [x] Create full 2024 armor table.
- [x] Add cost, base Armor Class, Dexterity limits, Strength requirements, stealth effects, and weight.
- [x] Add shield catalogue entry and edition-specific table values.
- [x] Add donning and doffing times.
- [x] Link catalogue descriptions to edition-specific armor-training or proficiency consequences.
- [ ] Audit edition differences.

### Tools

- [x] Tool Proficiency overview exists.
- [x] Inventory SRD tools by edition.
- [x] Add cost and weight.
- [ ] Explain tool proficiency.
- [x] Add 2024 associated abilities, Utilize examples, and crafting examples where licensed.
- [x] Add gaming sets, musical instruments, artisan tools, kits, and vehicles.
- [x] Link tools to relevant abilities and activities through structured facts and search tags.

---

## 14. Spellcasting Rules

- [x] Spellcasting overview exists.
- [x] Spellcasting ability exists.
- [x] Spell-save DC exists.
- [x] Spell-attack bonus exists.
- [x] Cantrips exist.
- [x] Spell slots exist.
- [x] Prepared and known spells exist.
- [x] Concentration exists.
- [x] Ritual casting exists.
- [x] Spell components exist.
- [x] Casting time, range, duration, and higher-level casting exist.
- [ ] Spell level.
- [ ] Spell lists.
- [ ] Preparing spells by edition.
- [ ] Changing prepared spells.
- [ ] Known-spell rules where applicable.
- [ ] Expending a spell slot.
- [ ] Upcasting.
- [ ] Casting without a slot.
- [ ] Multiple spells on a turn by edition.
- [ ] Bonus-action spell rule for 2014.
- [ ] 2024 spell-slot-per-turn restriction.
- [ ] Verbal components.
- [ ] Somatic components.
- [ ] Material components.
- [ ] Component pouches.
- [ ] Spellcasting focuses.
- [ ] Costly and consumed components.
- [ ] Targets.
- [ ] Areas of effect.
- [ ] Lines, cones, cubes, cylinders, and spheres.
- [ ] Clear path to the target.
- [ ] Spell attacks.
- [ ] Saving throws against spells.
- [ ] Combining magical effects.
- [ ] Identifying spells only where included.
- [ ] Spell scroll interaction where licensed.
- [ ] Multiclass spellcasting.
- [ ] Pact Magic interaction for 2014.
- [ ] Edition-specific terminology audit.

---

## 15. Existing Spells and Magic Items

### Preserve current functionality

- [x] Spell and magic-item data remain in `data/srd-codex.json`.
- [x] Preserve all 1,153 existing entries during integration.
- [x] Preserve edition filters.
- [x] Preserve spell-level and school filters.
- [x] Preserve rarity and attunement filters.
- [x] Preserve progressive loading.
- [x] Preserve source labels and attribution.
- [x] Preserve existing responsive mobile behaviour; complete final device QA before declaring the whole Codex finished.

### Improve integration

- [x] Add **Rules** and **Equipment** to the standalone Codex page.
- [ ] Add **Character Options** to the standalone Codex page.
- [x] Add a top-level entry-type filter.
- [x] Make searches span all loaded Codex collections.
- [x] Add direct links to individual entries.
- [ ] Add related-rule links from spells and items.
- [ ] Add related-spell or related-item links only when useful and maintainable.
- [x] Add “Open full Codex” from the builder drawer.
- [x] Allow builder Knowledge Cards to link to full Codex entries.
- [ ] Ensure large datasets do not freeze low-powered devices.
- [x] Avoid loading unnecessary data inside the builder drawer.

---

## 16. Edition Awareness

- [x] Every entry must declare `2014` or `2024`.
- [ ] Edition-neutral explanations must be reviewed for hidden differences.
- [x] Entries with mechanical differences use separate edition collections and entries.
- [x] Search must not return incompatible rules when an edition filter is active.
- [x] Builder links automatically use the active builder edition.
- [x] Deep links preserve the selected edition.
- [x] Source badges identify SRD 5.1 or SRD 5.2.1.
- [ ] Character-option entries must never mix progression tables or features between editions.
- [x] Equipment entries show edition-specific values.
- [ ] Rules with renamed actions or terms must include aliases without implying the rules are identical.
- [ ] Add a visible edition-comparison notice where users might otherwise combine rules accidentally.

---

## 17. Public Codex Page

### Content and navigation

- [x] Rewrite `codex.html` title, description, and introduction to describe the current library.
- [x] Replace the “spells and magic items only” statistics with collection-wide totals.
- [x] Add starting-point navigation for Rules, Equipment, Spells, and Magic Items.
- [ ] Add Character Options after that collection exists.
- [x] Add category filters that change appropriately by entry type.
- [x] Keep edition selection prominent.
- [x] Add a clear source/licensing explanation.
- [x] Add beginner-oriented starting points.
- [x] Add collection-based browsing links.
- [ ] Add an edition-comparison landing section.
- [x] Add useful empty-state messages.

### Deep links and sharing

- [ ] Give each entry a stable URL or hash.
- [ ] Restore the selected entry after page refresh.
- [ ] Update the document title for an opened entry.
- [ ] Support copied links.
- [ ] Handle invalid or retired entry IDs gracefully.
- [ ] Preserve search/filter state where practical.

### Performance

- [ ] Load only the data required for the selected collection where practical.
- [ ] Debounce search input.
- [ ] Preserve progressive result rendering.
- [ ] Test with the complete dataset on mobile.
- [ ] Avoid duplicate event listeners.
- [ ] Clear timers and observers before replacing them.
- [ ] Avoid MutationObserver feedback loops.
- [ ] Avoid rebuilding the entire result list unnecessarily.
- [ ] Consider a search index generated during development rather than at every page load.

---

## 18. Builder Integration

- [ ] Preserve the existing Codex drawer.
- [ ] Preserve the global Open Codex button.
- [ ] Preserve edition filtering.
- [ ] Preserve related-topic navigation.
- [ ] Add links from relevant builder labels and Knowledge Cards.
- [ ] Open the exact relevant entry where possible.
- [ ] Add an **Open full Codex** link.
- [ ] Keep the builder drawer focused on short, high-value rules explanations.
- [ ] Do not force the builder to load every spell, item, class feature, and equipment entry.
- [ ] Ensure Codex failures do not prevent character creation.
- [ ] Ensure the Escape key and focus behaviour remain accessible.
- [ ] Test for duplicate keyboard listeners when navigating or reopening the drawer.

---

## 19. Accessibility and Usability

- [ ] Full keyboard navigation.
- [ ] Visible focus indicators.
- [ ] Correct heading hierarchy.
- [ ] Accessible labels for all search and filter controls.
- [ ] Status announcements for result counts.
- [ ] Focus management when opening and closing entries or drawers.
- [ ] Screen-reader-friendly source and edition labels.
- [ ] Sufficient touch target sizes.
- [ ] Mobile layouts at common viewport widths.
- [ ] Reduced-motion support.
- [ ] High-contrast testing.
- [ ] No information conveyed only through colour.
- [ ] Tables remain readable or transform appropriately on narrow screens.
- [ ] Long rules text remains scannable through headings and lists.
- [ ] Plain-language introductions for beginners.
- [ ] Avoid unexplained abbreviations.

---

## 20. Content Quality Standard

Every original explanatory entry should include, where appropriate:

- [ ] A concise definition.
- [ ] What it affects.
- [ ] How it works.
- [ ] An example in play.
- [ ] Why it matters.
- [ ] A common mistake or misconception.
- [ ] Edition differences.
- [ ] Related topics.
- [ ] Search aliases.
- [ ] Source classification.

Additional standards:

- [ ] Do not use the retired character-validity terminology.
- [ ] Use **ready-to-go character** where appropriate.
- [ ] Write for new players without talking down to experienced players.
- [ ] Separate rules text from advice and examples.
- [ ] Avoid claiming that optional rules are universal.
- [ ] Avoid presenting table conventions as mandatory rules.
- [ ] Keep examples original.
- [ ] Use consistent terminology within each edition.
- [ ] Proofread every entry.
- [ ] Verify every mechanical statement against the applicable SRD.

---

## 21. Validation and Testing

### Automated data checks

- [ ] Every JSON file parses.
- [ ] Every entry has a unique ID.
- [ ] Every related entry ID resolves.
- [ ] Every category ID resolves.
- [ ] Every edition value is valid.
- [ ] Every licensed entry has source metadata.
- [ ] Every entry type uses the required schema.
- [ ] No empty titles or descriptions.
- [ ] No duplicate entries caused by edition merges.
- [ ] No broken builder-target links.
- [ ] No forbidden or retired terminology.
- [ ] No accidental non-SRD rules text.

### Functional testing

- [ ] Search.
- [ ] Edition filters.
- [ ] Entry-type filters.
- [ ] Category filters.
- [ ] Combined filters.
- [ ] Filter reset.
- [ ] Progressive loading.
- [ ] Deep links.
- [ ] Browser back and forward.
- [ ] Keyboard navigation.
- [ ] Builder drawer.
- [ ] Related-topic links.
- [ ] Mobile layouts.
- [ ] Reduced motion.
- [ ] Offline/local development behaviour.
- [ ] GitHub Pages paths.
- [ ] Custom domain paths.
- [ ] No console errors.
- [ ] No duplicate listeners, timers, or observers.
- [ ] No infinite render or update loops.

### Editorial and legal review

- [ ] Compare licensed entries to the official SRD source.
- [ ] Confirm attribution language.
- [ ] Confirm licence links.
- [ ] Mark adaptations and modifications.
- [ ] Confirm that non-SRD content is not reproduced.
- [ ] Confirm that the legal page matches the actual Codex implementation.
- [ ] Confirm that all public claims about completeness are accurate.

---

## 22. Deployment During AdSense Review

- [ ] Develop large Codex changes separately from the stable live branch.
- [ ] Deploy coherent, tested milestones rather than incomplete categories.
- [ ] Original guides and completed rules sections may be published incrementally.
- [ ] Do not remove or resubmit the site to AdSense solely because Codex work is underway.
- [ ] Avoid placing ads near Codex search controls, filters, copy/download controls, or builder actions.
- [ ] Verify navigation and crawling after every public deployment.
- [ ] Update the sitemap when new public Codex or guide pages are added.
- [ ] Update the changelog at each deployed Codex milestone.

---

## 23. Recommended Implementation Milestones

### Milestone 1: Codex architecture

- [x] Finalize the initial manifest-driven data architecture.
- [x] Extend and normalize the entry schema through the shared loader.
- [x] Add automated validation.
- [x] Make `codex.html` capable of loading rules, mundane equipment, spells, and magic items.
- [x] Preserve the current builder drawer as an edition-scoped lightweight reference.
- [x] Add deep-link support.

### Milestone 2: Core Player Rules MVP

- [x] Complete dice and resolution rules.
- [x] Complete ability, skill, and saving-throw coverage.
- [x] Complete character creation fundamentals.
- [x] Complete exploration and social interaction.
- [x] Complete combat actions, attacks, damage, recovery, and conditions.
- [x] Complete spellcasting fundamentals.
- [x] Publish after QA.

### Milestone 3: Mundane Equipment Library

- [x] Import and structure SRD equipment by edition.
- [x] Complete weapons, armor, tools, packs, services, mounts, and vehicles.
- [x] Add structured equipment facts and equipment-specific filters.
- [ ] Publish after QA.

### Milestone 4: SRD Character Options

- [x] Complete SRD races/species.
- [x] Complete SRD backgrounds.
- [x] Complete SRD feats.
- [~] Complete SRD classes, subclasses, progression tables, and features. Class foundations and progression tables are complete; feature and subclass collections remain.
- [~] Coordinate with edition-aware builder class work. Foundation fields are validated against builder data; behavioral integration remains.
- [ ] Publish after QA.

### Milestone 5: Full Library Integration

- [ ] Integrate all rules, options, equipment, spells, and magic items.
- [ ] Add edition comparisons.
- [ ] Complete builder links.
- [ ] Complete accessibility and performance testing.
- [ ] Complete licensing review.
- [ ] Update README, roadmap, changelog, homepage, and sitemap.
- [ ] Declare the scoped Player Rules Codex complete.

---

## 24. Recommended Next Development Task

> Design and implement Codex schema version 2 and the public-page architecture so that `codex.html` can search and display the existing 130 rules entries alongside the existing 1,153 spells and magic items, while preserving the current builder drawer and edition-aware filtering.

This architecture should be completed before producing hundreds of additional entries. Otherwise, the content would be poured into a container that is already too small.
