# Briarwell town plan

This is the human-readable companion to `briarwell-area-registry.json`. The JSON
registry is authoritative for stable IDs and transition contracts; this document
keeps Jay's numbered layout understandable during art and map production.

## Current production state

| State | Areas |
|---|---|
| Playable | All numbered surface Areas 1–12; western junction; Sewer Areas 1–15 and the ancient dwarven chamber; Tavern; General Store |
| Planned | Combat resolution for the Area 15 kobolds; inventory awards for the dwarven treasure; open-window traversal |

The complete Briarwell surface and sewer network are now playable. The surface contains the northern circuit
`1 → 2 → 3 → 4 → 1`, the southern circuit
`1 → 5 → 7 → 8 → 9 → 6 → 1`, Mayor's Hill from Area 3, and the western branch
`1 → 5 → west junction → 12`. Area 11 has finished runtime art and geometry and is
reachable through the Sewer Area 14 cave; its open-window route still awaits traversal logic.

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
| `briarwell-west-road-junction` | Junction beyond Area 5 | Area 5 E, Area 12 N, road out of Briarwell W |
| `briarwell-sewer-01`–`briarwell-sewer-15` | Complete numbered underground network | Surface access at Town Center well, Ainsley's, docks and Ms. Blight's cave |
| `briarwell-sewer-secret` | Perception-gated ancient dwarven chamber | Hidden passage south of Sewer Area 5 |
| `lodestone-tavern-interior` | Playable empty common-room foundation | Active Area 1 front door |
| `general-store-interior` | Playable empty shop foundation | Active Area 1 front door |

The western and southern roads leave Briarwell, but their destinations are not yet
assigned. No provisional world-area identities should be invented for them.

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

Every playable area requires its own runtime map JSON, background art, safe spawn
points, exact transition triggers, foot-level collisions, depth occluders and a
reciprocal transition test before its registry status changes from `planned` to
`playable`.
