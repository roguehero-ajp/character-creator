# My RPG Source

**Create. Learn. Play.**

My RPG Source is an independent, browser-based tabletop roleplaying project focused on reducing the friction between someone wanting to play an RPG and actually getting a character to the table.

Live site: https://www.myrpgsource.com/

## Mission

**Break down the barriers that stop people from playing tabletop roleplaying games.**

The project currently centers on Dungeons & Dragons Fifth Edition character creation and rules learning, with separate support for the 2014 and 2024 rules. The long-term plan is to expand into additional RPG systems only where licensing permits.

## Project Status

My RPG Source is an active **pre-1.0** project. The public site is usable, but several systems are still under active development and should not be treated as feature-complete.

Current priorities are:

1. Keep the public site stable and repair repository inconsistencies.
2. Regression-test the 2014 and 2024 builders after major sheet changes.
3. Improve spellcasting and spell-management usability.
4. Continue edition-aware class, subclass, proficiency, and multiclass automation.
5. Continue accessibility, mobile, print, and editorial review.

See [`roadmap.md`](roadmap.md) for the detailed working plan and [`Changelog.md`](Changelog.md) for completed work.

## What Works Today

### D&D 5e character builder

The builder supports separate 2014 and 2024 modes selected by URL:

- `builder.html?edition=2014`
- `builder.html?edition=2024`

Implemented character-building features include:

- Manual ability-score entry
- Standard Array
- 4d6, drop the lowest
- 3d6 house-rule generation
- Official 27-point Point Buy
- Drag, drop, tap, and keyboard score assignment
- Edition-specific Race data for 2014
- Edition-specific Species data for 2024
- Edition-specific backgrounds and class data
- Automatic ability modifiers and common derived values
- Hit points, hit dice, saving throws, skills, proficiency bonus, initiative, and Passive Perception
- Level Up flow for advancing an existing class
- Fixed, rolled, and manual Level Up hit-point gains
- Stored level history and Constitution-sensitive HP recalculation
- Twenty Class Ability slots on page 2
- Structured feat tracking with edition-aware SRD feat data
- 2024 Background and Human Origin feat synchronization
- Detection of class-level feat opportunities
- Manual / DM Override feat entry for content outside the included SRD data
- Edition-aware mundane and SRD magic weapon selectors
- Edition-aware mundane and SRD magic armor/shield selectors
- Weapon attack and damage calculation helpers
- Armor Class calculation and optional sheet synchronization

### Saving, export, and printing

The builder currently provides:

- Browser autosave
- Save Now and Load Saved Character
- Separate browser-save keys for the 2014 and 2024 editions
- JSON export and import
- Edition information in portable JSON backups
- Warnings when importing a character from another edition
- Character-based export filenames
- Character-sheet printing
- Temporary blank-sheet printing
- PDF export
- Multiple visual themes

Free users currently keep their characters in local browser storage or portable JSON backups. Cloud character storage is not part of the current implementation.

### Rules Codex

The standalone Rules Codex is manifest-driven and keeps game systems and editions isolated.

Current D&D 5e collections include:

- Core player rules
- Races, subraces, Species, and Species choices
- Backgrounds
- Feats
- Class foundations and 20-level progression tables
- Mundane equipment
- Spells
- Magic items

The current repository validates **2,208 versioned Codex entries** through `tools/validate-codex.mjs`.

The builder also uses contextual Knowledge Cards and links into the full Codex.

### Beginner content and site pages

The public site currently includes:

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
│   ├── dnd5e/              Edition-specific builder data
│   ├── codex.json          Contextual Knowledge Card data
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

The builder is intentionally modular. Major responsibilities are separated as follows:

- `js/config.js` - edition configuration, terminology, data paths, and save keys
- `js/app.js` - application coordination
- `js/ability-scores.js` - ability-score generation and assignment
- `js/origins.js` - Race / Species loading and choices
- `js/backgrounds.js` - background loading and application
- `js/classes.js` - edition-specific class data
- `js/calculations.js` - derived character values
- `js/level-up.js` - existing-class Level Up workflow and level history
- `js/feats.js` - structured feat selection and feat-opportunity tracking
- `js/combat-equipment.js` - weapon, armor, shield, and combat-equipment helpers
- `js/storage.js` - local saves, JSON import/export, and restoration logic
- `js/printing.js` - print and blank-sheet behavior
- `js/pdf.js` - PDF export
- `js/tooltips.js` - contextual Knowledge Cards
- `js/codex-data.js` - shared Codex collection loader
- `js/codex.js` - in-builder Codex interactions
- `js/codex-page.js` - standalone Codex page behavior
- `js/analytics.js` - site analytics events

Avoid duplicating listeners, intervals, observers, or save logic across modules when extending the project.

## Edition-Specific Builder Data

Builder-facing D&D data is separated by edition:

```text
data/dnd5e/2014/
├── backgrounds.json
├── classes.json
└── races.json

data/dnd5e/2024/
├── backgrounds.json
├── classes.json
└── species.json
```

`js/config.js` selects the correct directory and terminology for the active edition.

Do not place shared-looking rules into the wrong edition merely because the wording or mechanic appears similar. Edition boundaries are deliberate.

## Codex Data Architecture

The Codex uses this hierarchy:

```text
data/codex/manifest.json
└── game system
    └── edition
        └── collection
            └── entries
```

For D&D 5e, 2014 and 2024 each have their own collections for core rules, origins, backgrounds, feats, classes, and mundane equipment. Spells and magic items currently use `data/srd-codex.json` through the manifest's `legacy-srd` adapter.

More schema detail is documented in [`data/codex/README.md`](data/codex/README.md).

## Validation

Before a Codex deployment, run:

```text
node tools/validate-codex.mjs
```

The validator checks schema rules, IDs, edition boundaries, relationships, class progression, and synchronization between class foundations and builder class data.

The site currently has no package-install or build step. GitHub Pages serves the static HTML, CSS, JavaScript, JSON, and image files directly.

Because the application fetches JSON files, local testing should use a local web server rather than opening `builder.html` directly with a `file://` URL.

## Storage Compatibility

Character data is deliberately restored through `js/storage.js` rather than by assuming that every saved character was created by the newest sheet.

When adding new structured fields:

- Preserve older save compatibility whenever practical.
- Prefer appending new stable storage fields rather than shifting legacy positional fields.
- Test Save, Load, Export, Import, Level Up, Print, and PDF together.
- Test both editions independently.

The structured feat state was appended after legacy sheet fields for this reason.

## Development Guardrails

- Preserve working features unless a replacement has been tested.
- Keep the live site stable during external reviews and major development work.
- Keep 2014 and 2024 rules isolated.
- Keep local browser saves and JSON import/export available to free users.
- Do not place advertisements next to Save, Download, Level Up, Print, or PDF controls.
- Keep the planned **My First Steps** web onboarding experience free.
- Use **ready-to-go character** in product copy rather than language implying tournament or rules-lawyer legality.
- Review licensing before adding another game system or non-SRD rules content.
- Prefer complete, modular features over partially duplicated logic.

## Known Limitations

The current repository is functional but not finished.

Important known limitations include:

- Add a New Class remains intentionally blocked until multiclass safeguards are complete.
- Full class-feature and subclass automation is not complete.
- Reduced multiclass proficiencies and proficiency-source tracking are not complete.
- Combined multiclass spell-slot calculations are not complete.
- The current spell sheet and prepared/known spell workflow still need a major usability pass.
- Feat choices are tracked, but most feat mechanical effects are intentionally not auto-applied yet.
- Combat-equipment helpers do not replace full class proficiency-source tracking.
- Long feature text still needs additional print-layout refinement.
- Accessibility labeling, keyboard navigation, mobile polish, and cross-browser testing remain ongoing work.
- Accounts, cloud saves, hosted campaigns, and cross-device synchronization are not implemented.
- Displayed application version numbers are not yet standardized across all files.

## Licensing and Attribution

My RPG Source is an independent project and is not an official Wizards of the Coast product.

Open-game rules content must remain limited to material that can be used under the applicable license and attribution requirements. Public attribution and project legal information are maintained in `legal.html`.

When adding another RPG system, review its current licensing terms before adding rules text, character data, logos, product identity, or monetized tools.

## Product Direction

Longer-term plans include:

- Better spellcasting and spell-management tools
- Complete class and subclass automation
- Safe multiclass automation
- **My First Steps**, a free Level 0 to Level 1 onboarding adventure that produces a ready-to-go character
- Optional accounts and paid cloud/campaign services
- Mobile applications
- Additional tabletop systems where licensing permits
- Game Master and world-building tools

The roadmap is intentionally a priority guide, not a promise of release dates.

## Project History

My RPG Source began in July 2026 as a much smaller character-sheet project and has been progressively refactored into a modular static web application.

The repository history remains an important recovery tool. When a major file becomes corrupted or overwritten, prefer recovering known-good work from version history over reconstructing it from memory.
