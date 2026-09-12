# Briarwell town plan

This is the human-readable companion to `briarwell-area-registry.json`. The JSON
registry is authoritative for stable IDs and transition contracts; this document
keeps Jay's numbered layout understandable during art and map production.

## Current production state

| State | Areas |
|---|---|
| Playable | All numbered surface Areas 1–12; western junction; Forest F1–F22; the Ogre's Clearing and secret Ogre Cave; Haunted Island landing and house exterior; Little Island landing and buried-treasure clearing; Donson's Farm; Bayard's Ranch; Allwood's Gardens; Old River Bridge; Northfield; Misty Forest MF1–MF3; Mountain M1–M15, Redluk, Rock Ledge Pass, the Dwarven Cave forecourt, C1–C16, secret armoury, goblin battle chamber and cliffside overlook; Swimmable; Waterfall; Witchwood and ancient maple; Sewer Areas 1–15 and the ancient dwarven chamber; Tavern; General Store |
| Planned | Lake-ferry story unlock; haunted-house interior; Little Island buried-cache reward; final M15 boss encounter; final Redluk orc sprites and expanded in-game movie; final goblin battle sprites and combat; swimming animation and deep-water movement; Ogre boss sprite and combat; combat resolution for the Area 15 kobolds; inventory handoff for Ogre Cave and dwarven treasure items; open-window traversal |

The complete Briarwell surface and sewer network are now playable. The surface contains the northern circuit
`1 → 2 → 3 → 4 → 1`, the southern circuit
`1 → 5 → 7 → 8 → 9 → 6 → 1`, Mayor's Hill from Area 3, and the western branch
`1 → 5 → west junction → 12`. The Library Quarter also connects south to the
Tannery and Warehouses and northeast to Ms. Blight's Orphanage. Area 11 is publicly
accessible from the Library Quarter, with an additional hidden connection through
the Sewer Area 14 cave; its open-window route still awaits traversal logic.
The western branch now continues from the junction to F13, north through F14 and
F15, then east across the Old River Bridge into Northfield. F15 also opens into
the complete F16–F22 dark-forest loop to its north and west, with the Ogre's
Clearing branching north from F20 and its Strength 8 boulder opening the secret
Ogre Cave. The two lake-island pairs are playable through the development area
selector; their boat crossings from the docks remain locked to a later story event.
The road runs south
through F12, F11 and F8, with one west farm spur at F11, F12 and F13.
Northfield's foot trail now climbs through MF1, MF2 and MF3. MF3 turns west to
Swimmable or continues north through Mountain M1, M2 and M3 to the high junction
at M4. M4 branches east to the outdoor Dwarven Cave forecourt or west through M5,
Rock Ledge Pass and M6–M10, then south and east through M11–M14. M14's revised
east trail now crosses the broad M15 basin and continues into scrollable Redluk.
The Dwarven Cave forecourt now descends into the complete C1–C16 passage graph.
C6 conceals a playable secret armoury behind `1d100 <= floor(Search / 2)`, C16
opens into the wide goblin battle chamber, and C9 reaches a cliff edge whose
scenic view looks down on Briarwell, its lake and two islands.
Rock Ledge Pass is a shallow horizontal scroll with
three balance checks and an active failure route into Waterfall. Waterfall's
enlarged current then escapes one way into Swimmable.
Swimmable's river visibly continues south beyond the screen, but that water edge
remains non-traversable until swimming is implemented.

## Numbered surface areas

| Area | Stable ID | Approved landmarks | Public surface links | Hidden routes |
|---:|---|---|---|---|
| 1 | `briarwell-town-center` | Lodestone Tavern, General Store, well, fruit vendor | 2 NW, 4 NE, 5 W, 6 E, 8 S | Well to sewers |
| 2 | `briarwell-northwest-workshops` | Blacksmith top-left, Cooper top-center, houses on left | 1 S, 3 E | — |
| 3 | `briarwell-brewmaster-row` | Brewmaster bottom-left, houses along top | 2 W, 4 E, 10 N | — |
| 4 | `briarwell-library-quarter` | Library, houses, cliffside alley | 1 SW, 3 W, 6 S, 11 NE | Open window to 11 |
| 5 | `briarwell-western-homes` | My house, other houses, Fletcher | 1 E, 7 S by alley, west road junction W | — |
| 6 | `briarwell-tannery-warehouses` | Tannery, warehouses | 1 W, 4 N, 9 S | — |
| 7 | `briarwell-ainsley-church` | Ainsley's House for Unwanted Children, church | 5 N by alley, 8 E | Alley grate to Sewer Area 4 |
| 8 | `briarwell-south-gate` | Guards, barracks, city gate, house | 1 N, 7 W, 9 E; road out of town S | — |
| 9 | `briarwell-docks` | Docks, fisherman's house | 6 N, 8 W | Dockside access to Sewer Area 7 |
| 10 | `briarwell-mayors-hill` | Mayor's house on the hill | 3 S | — |
| 11 | `briarwell-blight-orphanage` | Ms. Blight's orphanage, barn | 4 SW | Open window to Area 4 alley; cave to Sewer Area 14 |
| 12 | `briarwell-henson-homestead` | Old Man Henson's place | West junction S | — |

Area 7 and Area 11 are deliberately separate entities. Ms. Blight's cliffside
orphanage is part of the town and has a public road to the Library Quarter.
Its hidden window passage and sewer cave provide additional routes.

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
| `briarwell-misty-forest-mf3` | Upper forest/mountain transition and active M1 approach | MF2 S, Swimmable W, Mountain M1 N |
| `briarwell-mountain-m1` | Last treeline and lower exposed mountain slope | MF3 S, Mountain M2 N |
| `briarwell-mountain-m2` | Steep wind-scoured rocky ascent | Mountain M1 S, Mountain M3 N |
| `briarwell-mountain-m3` | Narrow high pass between cliffs | Mountain M2 S, Mountain M4 N |
| `briarwell-mountain-m4` | High snowy three-way junction | Mountain M3 S, Mountain M5 W, Dwarven Cave E; N sealed |
| `briarwell-mountain-m5` | Exposed western traverse | Mountain M4 E, Rock Ledge Pass W |
| `briarwell-rock-ledge-pass` | Scrollable narrow shelf above the mountain river | Mountain M5 E, Mountain M6 NW; failed balance and Luck checks force entry to Waterfall |
| `briarwell-mountain-m6` | High bending shelf | Rock Ledge Pass SE, Mountain M7 SW |
| `briarwell-mountain-m7` | Basalt switchback | Mountain M6 NE, Mountain M8 W |
| `briarwell-mountain-m8` | Wind-scoured ridge | Mountain M7 E, Mountain M9 W |
| `briarwell-mountain-m9` | Basalt-fin traverse | Mountain M8 E, Mountain M10 W |
| `briarwell-mountain-m10` | Southern turning shelf | Mountain M9 E, Mountain M11 S |
| `briarwell-mountain-m11` | Narrow basalt ascent | Mountain M10 N, Mountain M12 S |
| `briarwell-mountain-m12` | Wind-scoured elbow and cairn | Mountain M11 N, Mountain M13 E |
| `briarwell-mountain-m13` | Cloud-sea saddle | Mountain M12 W, Mountain M14 N |
| `briarwell-mountain-m14` | Wind-scoured high shoulder | Mountain M13 S, Mountain M15 E |
| `briarwell-mountain-m15` | Wide open future-boss basin | Mountain M14 W, Redluk E |
| `briarwell-redluk` | Vast iron-red orc convergence ground | Mountain M15 W; all other edges sealed |
| `briarwell-mountain-dwarven-cave` | Open ancient dwarven forecourt | Mountain M4 W; active descent into C1 |
| `briarwell-dwarven-cave-c01`–`briarwell-dwarven-cave-c16` | Complete monumental dwarven passage network | Forecourt through C1; secret route at C6; cliffside at C9; battle chamber beyond C16 |
| `briarwell-dwarven-cave-secret` | Search-gated preserved dwarven armoury | Hidden door east of C6; chest, plate mail, two-handed sword and mace |
| `briarwell-dwarven-cave-battle-chamber` | Very large scrolling goblin hall | C16 W; five goblins, two hobgoblins and a hobgoblin chieftain staged as placeholders |
| `briarwell-dwarven-cave-cliffside` | Mountain shelf and cinematic Briarwell overlook | C9 NW; walking to the edge opens the scenic vista |
| `briarwell-swimmable` | Broad calmer pool, gravel landing and visible south-flowing outlet below the falls | MF3 E; receives Waterfall current from NW; south water edge is visual only |
| `briarwell-waterfall` | Immense forced-fall plunge pool | Active forced arrival from Rock Ledge Pass; one-way current SE to Swimmable |
| `briarwell-ogre-clearing` | Wide scrollable boss arena with a future ogre encounter | Forest F20 S; Strength 8 boulder to Secret Ogre Cave N |
| `briarwell-ogre-cave` | One-room secret treasure cave | Ogre's Clearing S; fixed chest, frost longsword and metal shield |
| `briarwell-haunted-island-landing` | Plot-gated boat landing on Haunted Island | Haunted house path N; future ferry to Briarwell docks |
| `briarwell-haunted-island-house` | Playable haunted-manor exterior | Island landing S; house interior reserved |
| `briarwell-little-island` | Plot-gated boat landing on Little Island | Buried-treasure clearing N; future ferry to Briarwell docks |
| `briarwell-little-island-treasure` | Cairn and disturbed-earth cache site | Little Island landing S; reward definition pending |

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
| MF3 | `briarwell-misty-forest-mf3` | MF2 S, Swimmable W, Mountain M1 N |
| M1 | `briarwell-mountain-m1` | MF3 S, Mountain M2 N |
| M2 | `briarwell-mountain-m2` | Mountain M1 S, Mountain M3 N |
| M3 | `briarwell-mountain-m3` | Mountain M2 S, Mountain M4 N |
| M4 | `briarwell-mountain-m4` | Mountain M3 S, Mountain M5 W, Dwarven Cave E; N sealed |
| M5 | `briarwell-mountain-m5` | Mountain M4 E, Rock Ledge Pass W |
| Rock Ledge Pass | `briarwell-rock-ledge-pass` | Mountain M5 E, Mountain M6 NW; three automatic ledge checks |
| M6 | `briarwell-mountain-m6` | Rock Ledge Pass SE, Mountain M7 SW |
| M7 | `briarwell-mountain-m7` | Mountain M6 NE, Mountain M8 W |
| M8 | `briarwell-mountain-m8` | Mountain M7 E, Mountain M9 W |
| M9 | `briarwell-mountain-m9` | Mountain M8 E, Mountain M10 W |
| M10 | `briarwell-mountain-m10` | Mountain M9 E, Mountain M11 S |
| M11 | `briarwell-mountain-m11` | Mountain M10 N, Mountain M12 S |
| M12 | `briarwell-mountain-m12` | Mountain M11 N, Mountain M13 E |
| M13 | `briarwell-mountain-m13` | Mountain M12 W, Mountain M14 N |
| M14 | `briarwell-mountain-m14` | Mountain M13 S, Mountain M15 E |
| M15 | `briarwell-mountain-m15` | Mountain M14 W, Redluk E |
| Redluk | `briarwell-redluk` | Mountain M15 W only; E sealed |
| Dwarven Cave | `briarwell-mountain-dwarven-cave` | Mountain M4 W; active descent into C1 |
| Swimmable | `briarwell-swimmable` | MF3 E; one-way arrival from Waterfall NW |
| Waterfall | `briarwell-waterfall` | Forced arrival from Rock Ledge Pass; one-way current SE to Swimmable |

F15's south and east branches retain the faded ruts and old stone edging of the
historic wagon road. Its western branch is deliberately only a walking path. Its
northern opening into F16 is rough untracked ground rather than a fourth road.
The Old River Bridge is intact and wagon-wide, but the rapid river is impassable
away from its deck. Northfield is open green ground dominated by rock outcrops,
with only a few distant trees and no invented road mouths. Beyond it, MF1–MF3 and
M1–M15 and Redluk are walking terrain rather than roads. The climb grows progressively steeper
and rockier above the forest line: M1 keeps the last sparse pines, M2 opens onto
bare slope, and M3 constricts into a high pass before M4's snowy junction. M4's
north edge is sealed. M5 now continues west through the scrollable Rock Ledge
Pass and M6–M10. The active route then switchbacks south through M11 and M12,
east into M13, north into M14, and east through M15 into Redluk. M15 is a
2048 x 944 open horizontal arena with a reserved future boss anchor. Redluk is a
3072 x 944 scrolling destination whose far east edge is sealed. Its current
encounter scaffold stages eight replaceable orc silhouettes closing in, the very
quiet `Stop...` cue, their immediate halt, and a replaceable elder-orc entrance;
final character sprites and the expanded in-game movie remain planned. East of
M4, the Dwarven Cave forecourt descends into the complete playable C1–C16 cave
network, including its secret armoury, goblin chamber and cliffside overlook.

Waterfall is not reachable by ordinary travel. It accepts the active forced fall
from Rock Ledge Pass, then permits only a downstream escape
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
| Ogre's Clearing | `briarwell-ogre-clearing` | F20 S; Secret Ogre Cave N after Strength 8 | E, W |
| Secret Ogre Cave | `briarwell-ogre-cave` | Ogre's Clearing S | N, E, W |

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
the center of the arena. A massive northern boulder requires Strength 8 and
persistently opens the active one-room Secret Ogre Cave. Its chest contains one
emerald, sapphire and ruby plus 30 gold and 40 silver. A magic longsword on the
ground adds 2 frost damage and inflicts Slow, and a metal shield is also available.

## Lake islands

| Area | Stable ID | Approved public links | Story boundary |
|---|---|---|---|
| Haunted Island landing | `briarwell-haunted-island-landing` | Haunted house N | Boat from docks unlocks at a later plot event |
| Haunted Island house | `briarwell-haunted-island-house` | Island landing S | House interior reserved for future work |
| Little Island | `briarwell-little-island` | Buried-treasure clearing N | Boat from docks unlocks at a later plot event |
| Buried treasure | `briarwell-little-island-treasure` | Little Island S | Cache reward remains undefined |

The islands are separate lake destinations with no swimming or direct route
between them. Their internal north/south paths are active and reciprocal. Until
the plot unlocks lake travel, all four maps remain available from the development
area selector so their art, geometry and landmarks can be tested independently.

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
14. ~~Scrollable Ogre clearing and corrected F20 north link.~~ Arena foundation complete v1; boss remains planned and the Strength 8 cave route is now active.
15. ~~Misty Forest MF1–MF3, Swimmable and Waterfall.~~ MF screens complete v1 and river art complete v2; swimming animation remains planned and the Waterfall forced-fall source is now active.
16. ~~Mountain M1–M5 and the Dwarven Cave forecourt.~~ Complete v1; the descent into C1 is active.
17. ~~Rock Ledge Pass and Mountain M6–M10.~~ Complete v1.
18. ~~Mountain M11–M14.~~ Complete v1; M10's south route is active through the M14 shoulder.
19. ~~Mountain M15 and Redluk.~~ Environment and route foundations complete v1; M14 revised to its approved east link, M15's boss remains planned, and Redluk's orc-convergence movie remains a replaceable scaffold.
20. ~~Dwarven Cave C1–C16, secret armoury, goblin hall and cliffside overlook.~~ Environment, traversal, discovery, treasure roll, encounter placeholders and scenic vista complete v1; final combat and inventory handoff remain planned.
21. ~~Secret Ogre Cave and both lake-island pairs.~~ Full-resolution environments, geometry, reciprocal internal routes and Ogre loot persistence complete v1; ferry story unlock, haunted-house interior, buried-cache reward and inventory-system handoff remain planned.

Every playable area requires its own runtime map JSON, background art, safe spawn
points, exact transition triggers, foot-level collisions and depth occluders
before its registry status changes from `planned` to `playable`. Ordinary routes
also require reciprocal transition tests. Explicit `river-escape` connections
are directional and instead require a tested source transition and safe arrival
spawn.
