BRIARWELL MOUNTAIN MAP ART
==========================

Canonical runtime backgrounds for Mountain M1 through M15, Redluk, Rock Ledge
Pass and the Dwarven Cave forecourt are stored beneath this directory. Most
mountain screens use the standard Avendor reference size of 1448 x 1086. Rock
Ledge Pass and M15 are 2048 x 944 horizontal scrolls; Redluk is 3072 x 944.

Approved route graph:

  Misty Forest MF3 <-> M1 <-> M2 <-> M3 <-> M4 <-> Dwarven Cave
                                                |
                                                +---- M5 <-> Rock Ledge <-> M6
                                                                          |
                                                        M10 <-> M9 <-> M8 <-> M7
                                                          |
                                                         M11
                                                          |
                                                         M12 <---------------> M13
                                                                                 |
                                                                  M14 <-> M15 <-> Redluk

Route-art contract:

- M1 is the transition above the forest line. The last scattered conifers give
  way to exposed rock and a single rough north-south walking path.
- M2 continues the same north-south climb over a steeper, rockier and more
  wind-scoured slope. It has no side opening.
- M3 is a narrow high pass between cliffs and drop-offs. Its only safe route is
  the north-south trail between M2 and M4.
- M4 is a high snowy three-way junction. Its south trail returns through M3,
  its west trail reaches M5, and its east trail reaches the Dwarven Cave. The
  north edge is completely sealed by mountain rock and snow.
- M5 is an exposed east-west traverse. Its east route is active to M4 and its
  west route is active to Rock Ledge Pass.
- Rock Ledge Pass is a narrow 2048 x 944 shelf above the mountain river. It
  connects M5 east to M6 northwest and contains three automatic balance checks:
  1d100 <= Agility x 7 + Climb, then x 6 + Climb, then x 7 + Climb. A failed
  check receives a hidden 1d10 <= Luck catch attempt; failing both sends the hero
  downriver to Waterfall.
- M6 bends southeast from Rock Ledge Pass and southwest toward M7. M7 turns from
  northeast to west. M8 and M9 are strict east-west high trails with no side
  openings.
- M10 receives M9 from the east and turns south into the active M11 trail.
- M11 is a strict north-south climb through a narrow basalt chute. M12 turns
  from its northern approach onto an eastbound, cairn-marked shelf toward M13.
  M13 crosses west-to-north over an exposed cloud-sea saddle into M14.
- M14 receives M13 from the south and turns east into active M15. Its superseded
  west opening is sealed by basalt, snow and scree.
- M15 is a broad 2048 x 944 west-east mountain basin reserved for a future boss
  battle. The arena itself is currently empty and unobstructed.
- Redluk is a 3072 x 944 scrolling destination entered from M15 on the west. Its
  east edge is sealed. Mountain fissures frame a data-driven encounter scaffold:
  eight placeholder orc ranks emerge and close in, halt at a very quiet
  "Stop...", and remain still while a larger elder-orc placeholder enters. Final
  character sprites and the extended in-game movie are intentionally pending.
- The Dwarven Cave is an outdoor playable forecourt entered only from M4 on the
  west. Its ancient cave mouth visibly descends into the mountain, but remains
  an interactable landmark rather than a portal until the interior map exists.
- These are rough mountain walking trails, never wagon roads. Every unlisted
  edge is closed by cliffs, scree, snow or dense highland growth.

Runtime geometry, spawns, transition targets and future-route reservations live
in avendor/data/maps.
