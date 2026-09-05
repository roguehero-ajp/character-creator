# Briarwell town plan

This is the human-readable companion to `briarwell-area-registry.json`. The JSON
registry is authoritative for stable IDs and transition contracts; this document
keeps Jay's numbered layout understandable during art and map production.

## Current production state

| State | Areas |
|---|---|
| Playable | All numbered surface Areas 1–12; western junction; Forest F1–F22; the Ogre's Clearing; Donson's Farm; Bayard's Ranch; Allwood's Gardens; Old River Bridge; Northfield; Misty Forest MF1–MF3; Swimmable; Waterfall; Witchwood and ancient maple; Sewer Areas 1–15 and the ancient dwarven chamber; Tavern; General Store |
| Planned | Mountain M1 and the remaining mountain region; swimming animation and deep-water movement; future mountain-river knockback into Waterfall; Ogre boss sprite and combat; traversal into the sealed ogre cave; combat resolution for the Area 15 kobolds; inventory awards for the dwarven treasure; open-window traversal |

The complete Briarwell surface and sewer network are now playable. The surface contains the northern circuit
`1 → 2 → 3 → 4 → 1`, the southern circuit
`1 → 5 → 7 → 8 → 9 → 6 → 1`, Mayor's Hill from Area 3, and the western branch
`1 → 5 → west junction → 12`. Area 11 has finished runtime art and geometry and is
reachable through the Sewer Area 14 cave; its open-window route still awaits traversal logic.
The western branch now continues from the junction to F13, north through F14 and
F15, then east across the Old River Bridge into Northfield. F15 also opens into
the complete F16–F22 dark-forest loop to its north and west, with the Ogre's
Clearing branching north from F20. The road runs south
through F12, F11 and F8, with one west farm spur at F11, F12 and F13.
Northfield's foot trail now climbs through MF1, MF2 and MF3, then turns west to
Swimmable. Waterfall is a separate forced-entry screen upstream: its enlarged
current escapes one way into Swimmable, while its future mountain source remains
unbuilt. Swimmable's river visibly continues south beyond the screen, but that
water edge remains non-traversable until swimming is implemented.

## Numbered surface areas

| Area | Stable ID | Approved landmarks | Public surface links | Hidden routes |
|---:|---|---|---|---|
| 1 | `briarwell-town-center` | Lodestone Tavern, General Store, well, fruit vendor | 2 NW, 4 NE, 5 W, 6 E, 8 S | Well to sewers |
| 2 | `briarwell-northwest-workshops` | Blacksmith top-left, Cooper top-center, houses on left | 1 S, 3 E | — |
| 3 | `briarwell-brewmaster-row` | Brewmaster bottom-left, houses along top | 2 W, 4 E, 10 N | — |
| 4 | `briarwell-library-quarter` | Library, houses, cliffside alley | 1 SW, 3 W | Open window to 11 |
| 5 | `briarwell-western-homes` | My house, other houses, Fletcher | 1 E, 7 S by alley, west road junction W | — |
| 6 | `briarwell-tannery-warehouses` | Tannery, warehouses | 1 W, 9 S | — |
| 7 | `briarwell-ainsley-church` | Ainsley's House for Unwanted Children, church | 5 N by alley, 8 E | Alley grate to Sewer Area 4 |
| 8 | `briarwell-south-gate` | Guards, barracks, city gate, house | 1 N, 7 W, 9 E; road out of town S | — |
| 9 | `briarwell-docks` | Docks, fisherman's house | 6 N, 8 W | Dockside access to Sewer Area 7 |
| 10 | `briarwell-mayors-hill` | Mayor's house on the hill | 3 S | — |
| 11 | `briarwell-blight-orphanage` | Ms. Blight's orphanage, barn | None | Open window to Area 4 alley; cave to Sewer Area 14 |
| 12 | `briarwell-henson-homestead` | Old Man Henson's place | West junction S | — |

Area 7 and Area 11 are deliberately separate entities. Area 11 is physically
isolated on the cliffside and is reached by the hidden open-window passage.

## Unnumbered support areas

| Stable ID | Purpose | Links |
|---|---|---|
| `briarwell-west-road-junction` | Junction beyond Area 5 | Area 5 E, Area 12 N, Forest F13 W |
| `briarwell-sewer-01`–`briarwell-sewer-15` | Complete numbered underground network | Surface access at Town Center well, Ainsley's, docks and Ms. Blight's cave |
| `briarwell-sewer-secret` | Perception-gated ancient dwarven chamber | Hidden passage south of Sewer Area 5 |
| `lodestone-tavern-interior` | Playable empty common-room foundation | Active Area 1 front door |
| `general-store-interior` | Playable empty shop foundation | Active Area 1 front door |
| `briarwell-old-river-bridge` | Intact historic crossing over the rapid river feeding Briarwell | Forest F15 W, Northfield E |
| `briarwell-northfield` | Nearly treeless green upland covered with exposed rocks | Old River Bridge W; Misty Forest MF1 NE |
| `briarwell-misty-forest-mf1` | Lower forest/mountain transition | Northfield SW, MF2 N |
| `briarwell-misty-forest-mf2` | Rockier middle forest/mountain transition | MF1 S, MF3 N |
| `briarwell-misty-forest-mf3` | Upper forest/mountain transition and future M1 approach | MF2 S, Swimmable W; rough M1 path visible but blocked N |
| `briarwell-swimmable` | Broad calmer pool, gravel landing and visible south-flowing outlet below the falls | MF3 E; receives Waterfall current from NW; south water edge is visual only |
| `briarwell-waterfall` | Immense forced-fall plunge pool | One-way current SE to Swimmable; future mountain knockback entry reserved |
| `briarwell-ogre-clearing` | Wide scrollable boss arena with a future ogre encounter | Forest F20 S; sealed ogre cave boulder N |

The western road is now an active route to Forest F13, and the South Gate road is
the active start of the F1 forest chain. Only the inaccessible road beyond the
broken bridge toward Bushavic remains an unresolved world boundary.

## Western farm road

| Area | Stable ID | Approved public links |
|---|---|---|
| F11 | `briarwell-forest-f11` | F8 S, F12 N, Donson's Farm W |
| Donson's Farm | `briarwell-donson-farm` | F11 E only |
| F12 | `briarwell-forest-f12` | F11 S, F13 N, Bayard's Ranch W |
| Bayard's Ranch | `briarwell-bayard-ranch` | F12 E only |
| F13 | `briarwell-forest-f13` | F12 S, F14 N, Allwood's Gardens W, west junction E |
| Allwood's Gardens | `briarwell-allwood-gardens` | F13 E only |
| F14 | `briarwell-forest-f14` | F13 S; old road to F15 N |
| F15 | `briarwell-forest-f15` | F14 S, Old River Bridge E, F18 W by walking path, F16 N by untracked clearing |

The F11–F14 spine and all three farm approaches are straight wagon roads. Every
painted edge opening corresponds to the links above. F14's northern road is less
travelled and partly reclaimed by winter growth, but old ruts and stone edging
show that it once carried regular passage through the mountains.

## Northern river route

| Area | Stable ID | Approved public links |
|---|---|---|
| F15 | `briarwell-forest-f15` | F14 S, Old River Bridge E, Forest F18 walking path W, Forest F16 clearing N |
| Old River Bridge | `briarwell-old-river-bridge` | F15 W, Northfield E |
| Northfield | `briarwell-northfield` | Old River Bridge W; Misty Forest MF1 walking path NE |
| MF1 | `briarwell-misty-forest-mf1` | Northfield SW, MF2 N |
| MF2 | `briarwell-misty-forest-mf2` | MF1 S, MF3 N |
| MF3 | `briarwell-misty-forest-mf3` | MF2 S, Swimmable W; future Mountain M1 path visible but blocked N |
| Swimmable | `briarwell-swimmable` | MF3 E; one-way arrival from Waterfall NW |
| Waterfall | `briarwell-waterfall` | One-way current SE to Swimmable; future forced entry from mountain river |

F15's south and east branches retain the faded ruts and old stone edging of the
historic wagon road. Its western branch is deliberately only a walking path. Its
northern opening into F16 is rough untracked ground rather than a fourth road.
The Old River Bridge is intact and wagon-wide, but the rapid river is impassable
away from its deck. Northfield is open green ground dominated by rock outcrops,
with only a few distant trees and no invented road mouths. Beyond it, MF1–MF3
are walking trails rather than roads. They grow progressively steeper, rockier
and mistier as they approach the mountain region.

MF3's northern trail is painted deliberately: it climbs into visibly rough
terrain, but its walkable polygon stops short of the edge and there is no north
transition. Mountain M1 will activate that route in a later pass.

Waterfall is not reachable by ordinary travel. It reserves a safe spawn for a
future forced fall from the mountain river, then permits only a downstream escape
into Swimmable. Swimmable cannot return upstream. Its broad river visibly flows
south out of the screen, but that edge has no transition. The deep pool is
canonically swimmable, while only shoreline, gravel and shallow landing movement
are active until dedicated swimming animation is authored.

## Dark western forest

| Area | Stable ID | Approved public links | Closed edges |
|---|---|---|---|
| F16 | `briarwell-forest-f16` | F17 N, F15 S, F19 W | E |
| F17 | `briarwell-forest-f17` | F16 S, F20 W | N, E |
| F18 | `briarwell-forest-f18` | F19 N, F15 E | S, W |
| F19 | `briarwell-forest-f19` | F16 E, F18 S, F22 W | N |
| F20 | `briarwell-forest-f20` | Ogre's Clearing N, F17 E, F21 W | S |
| F21 | `briarwell-forest-f21` | F20 E, F22 S | N, W |
| F22 | `briarwell-forest-f22` | F21 N, F19 E | S, W |
| Ogre's Clearing | `briarwell-ogre-clearing` | F20 S | N cave sealed by boulder; E, W |

These darker-green screens are untravelled magical forest. Their art contains no
roads, paths, trails, ruts or worn directional ground. Each approved transition
is communicated only by a local clearing through the edge vegetation. Every
unlisted edge is continuous impassable bush, roots and rock. F21 and F22 are the
westernmost points, so their west boundaries are deliberately impenetrable.

There is no F19–F20 connection. The complete navigable loop is
`F15 → F18 → F19 → F22 → F21 → F20 → F17 → F16 → F15`, with the additional
cross-connection between F19 and F16.

The Ogre's Clearing is a 2048 x 944 horizontal arena, wider than the 1448-unit
camera viewport so it scrolls as the hero crosses the combat floor. Its artwork
contains no ogre: the future boss remains a separate sprite layer anchored near
the center of the arena. A massive boulder visibly seals the northern cave and
currently reports the source-map Strength 8 requirement without exposing a
premature cave transition.

## Production order

1. ~~Area 2 — Northwest Workshops: Blacksmith, Cooper, houses.~~ Complete v1.
2. ~~Areas 3 and 4 — northern row and cliffside logic.~~ Complete v1.
3. ~~Areas 5 and 6 — west/east Town Center neighbors.~~ Complete v1.
4. ~~Areas 7, 8 and 9 — southern row, city gate and docks.~~ Complete v1.
5. ~~Areas 10, 11 and 12 — destination screens and hidden compound.~~ Complete v1.
6. ~~Western junction.~~ Complete v1.
7. ~~Provisional sewer scaffold and four access anchors.~~ Superseded by the final network.
8. ~~Final 15-area sewer network, Perception discovery and two-way traversal.~~ Complete v1.
9. ~~Tavern and General Store interior foundations.~~ Complete v1.
10. Combat and inventory handoff for the kobold lair and dwarven treasure.
11. ~~Western farm road through F14, including Donson's, Bayard's and Allwood's.~~ Complete v1.
12. ~~F15, the Old River Bridge and Northfield.~~ Complete v1.
13. ~~Dark western forest F16–F22.~~ Complete v1.
14. ~~Scrollable Ogre clearing and corrected F20 north link.~~ Arena foundation complete v1; boss and cave traversal remain planned.
15. ~~Misty Forest MF1–MF3, Swimmable and Waterfall.~~ MF screens complete v1 and river screens complete v2; swimming animation, Mountain M1 and the forced-fall source remain planned.

Every playable area requires its own runtime map JSON, background art, safe spawn
points, exact transition triggers, foot-level collisions and depth occluders
before its registry status changes from `planned` to `playable`. Ordinary routes
also require reciprocal transition tests. Explicit `river-escape` connections
are directional and instead require a tested source transition and safe arrival
spawn.
