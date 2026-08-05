# My RPG Source

A free, browser-based tabletop roleplaying character builder and rules-learning project.

**Live site:** [www.myrpgsource.com](https://www.myrpgsource.com)  
**Repository:** [roguehero-ajp/character-creator](https://github.com/roguehero-ajp/character-creator)

## Mission

**Break down the barriers that stop people from playing tabletop roleplaying games.**

My RPG Source is designed to make character creation clearer, friendlier, and easier to learn. The project combines practical character tools with plain-language rules guidance so players can spend less time wrestling with forms and more time imagining who they want to play.

## Current Status

My RPG Source is a public, pre-1.0 project under active development.

The live site currently supports:

- Dungeons & Dragons 5e using the 2024 rules
- Dungeons & Dragons 5e using the 2014 rules

The builders are usable now, but some advanced class, subclass, multiclass, spellcasting, and printing features remain in development. The current development priorities are documented in [`roadmap.md`](roadmap.md).

## Current Features

### Character creation

- Separate 2014 and 2024 builder modes
- Edition-specific Race or Species terminology and data paths
- Edition-specific background and class data loading
- Manual ability-score entry
- Standard Array
- 4d6, drop the lowest
- 3d6 house-rule generation
- Official 27-point Point Buy
- Automatic ability modifiers and core derived calculations
- Dynamic class-level rows and total character-level calculation
- Theme selection

### Saving and portability

- Automatic local browser saving
- Save Now and Load Saved Character controls
- Separate local saves for the 2014 and 2024 builders
- JSON backup export
- JSON backup import
- Edition warnings when importing a character from a different rules version
- Restoration of dynamic controls and multiclass rows

My RPG Source does not currently require an account. Browser saves can be cleared by the browser or device, so exported JSON backups are recommended for important characters.

### Printing and PDF

- Printable character sheet
- Blank character-sheet printing without altering the current character
- PDF export with character-based filenames
- Print-specific layout and cleanup rules

### Rules learning

- Contextual Knowledge Cards throughout the builder
- Searchable in-builder Rules Codex that loads only the active edition
- Dynamic Featured Knowledge Card on the homepage
- Unified standalone Rules Codex containing core player rules, 519 edition-specific mundane-equipment entries, spells, and magic items
- Separate D&D 5e 2014 and D&D 5e 2024 rules collections
- Game-system, edition, entry-type, and category filters
- Stable deep links to individual Codex entries
- New Player FAQ with a complete example of play

### Character advancement

- Level Up flow for advancing an existing class
- Fixed, rolled, and manual hit-point gain methods
- Review step before committing a level
- Stored level history
- Hit-point recalculation when Constitution changes

The visible **Add a New Class** branch is intentionally locked until multiclass prerequisites, proficiency handling, and combined spell-slot calculations are complete.

### Site foundation

- Custom domain with HTTPS
- GitHub Pages deployment
- Responsive site layout
- About, Contact, Privacy Policy, and Legal / SRD Attribution pages
- `robots.txt`
- `sitemap.xml`
- Custom `404.html`
- `ads.txt`

## Known Limitations

- Class lists and basic class data are edition-aware, but complete class rules and features are not yet fully automated by edition.
- Subclass selection and class-feature progression are not complete.
- Multiclass prerequisites exist in the class data, but the Add a New Class flow is not yet enabled.
- Reduced multiclass proficiencies and proficiency-source tracking are not complete.
- Combined multiclass spell-slot calculations are not complete.
- Background data is currently limited and will be expanded.
- The Codex architecture, broad core-player-rules collection, and mundane-equipment catalogue are in place, but SRD character options, detailed class features, focused edition comparisons, and final editorial review remain incomplete.
- Long feature lists and other dense character information still need print-layout refinement.
- There are no user accounts, cloud saves, cross-device synchronization, hosted campaigns, or version history yet.

## Project Structure

```text
/
├── index.html                 Homepage and edition selection
├── builder.html               Shared 2014 and 2024 character builder
├── codex.html                 Unified Rules, Equipment, Spells & Magic Items Codex
├── faq.html                   New Player FAQ and example of play
├── about.html                 Project information
├── contact.html               Contact page
├── privacy.html               Privacy policy
├── legal.html                 Legal and SRD attribution
├── 404.html                   Custom not-found page
├── css/                       Layout, themes, printing, Codex, and responsive styles
├── js/                        Modular application logic
│   └── codex-data.js          Shared manifest-driven Codex data loader
├── data/
│   ├── codex.json             Legacy rules data retained for rollback
│   ├── srd-codex.json         Existing SRD spells and magic items
│   ├── codex/                Edition-isolated rules and mundane-equipment collections
│   │   ├── manifest.json      Game-system, edition, and collection registry
│   │   └── dnd5e/
│   │       ├── 2014/          Edition-isolated 2014 core rules
│   │       └── 2024/          Edition-isolated 2024 core rules
│   └── dnd5e/
│       ├── 2014/              2014 races, backgrounds, and classes
│       └── 2024/              2024 species, backgrounds, and classes
├── tools/
│   └── validate-codex.mjs     Codex schema and relationship validation
└── images/                    Site images
```

The builder reads JSON files with `fetch()`, so it should be tested through GitHub Pages or another web server rather than opened only as a local `file://` page.

## Development Priorities

The current sequence is:

1. Keep public documentation and homepage status accurate.
2. Complete Codex editorial QA and add the SRD character-option collections.
3. Make class behavior fully edition-aware.
4. Enable safe multiclassing with prerequisites and DM Override.
5. Track proficiency sources and reduced multiclass proficiencies.
6. Add subclass, class-feature, and multiclass spell-slot handling.
7. Test printing, saving, loading, import, and export across both editions.
8. Improve accessibility, mobile presentation, and dense print layouts.
9. Prototype **My First Steps**, a free web onboarding adventure that produces a ready-to-go character.

See [`roadmap.md`](roadmap.md) for the detailed plan.

## Future Direction

After the D&D 5e builders are dependable, My RPG Source may expand into:

- Additional tabletop game systems, subject to licensing and product scope
- Original beginner guides and rules explanations
- Optional accounts and paid cloud services
- Cross-device saves and version history
- Game Master hosted campaigns
- Homebrew rules and campaign tools
- Basic campaign communication
- Android and iOS applications

The free web experience will continue to support local saves and JSON import/export. Personal cloud storage is planned as a future optional paid service rather than a free-tier requirement.

## Licensing and Attribution

My RPG Source is an independent project and is not affiliated with, endorsed by, or sponsored by Wizards of the Coast or any other tabletop game publisher.

Licensed rules material and required attribution are documented in [`legal.html`](legal.html).

No general open-source licence has been granted for the project source code at this time. Unless a file states otherwise, the project code and original content remain all rights reserved.

## Maintainer

My RPG Source is built and maintained by Jason Paul in Ontario, Canada.

Contact: [myrpgsource@gmail.com](mailto:myrpgsource@gmail.com)
