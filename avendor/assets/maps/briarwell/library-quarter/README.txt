BRIARWELL - AREA 4 - LIBRARY QUARTER
====================================

LOCKED CONTENT
--------------
- Briarwell Library as the dominant civic landmark.
- Supporting houses.
- West road to Area 3.
- Southwest road to Town Center Area 1.
- Far-right cliffside dead-end alley.
- Open alley window reserved as the hidden route to Area 11.
- Iron alley grate reserved as hidden access to the sewers.
- No public north, east, south-center or southeast road.

RUNTIME BASE ART
----------------
background/briarwell-library-quarter-v1.png
Reference size: 1448 x 1086 pixels.

GAMEPLAY DATA
-------------
../../../../data/maps/briarwell-library-quarter.json
../../../../data/maps/briarwell-area-registry.json

Area 4 completes the playable Town Center → Area 2 → Area 3 → Area 4 → Town
Center northern circuit. The open window and sewer grate are inspectable clues, but
they are deliberately absent from normal transition triggers while their routes are
undiscovered and their destination maps remain planned.

GEOMETRY RULES
--------------
- West and southwest public roads remain broad and mutually reachable.
- The cliffside alley is approachable but never reads as a public edge exit.
- The grate blocks only at its visible iron footprint.
- Library walls, house fronts and alley lamps use separate depth polygons.
- No full-screen building mask may make the hero disappear behind a narrow prop.

PRODUCTION CHECKLIST
--------------------
[x] Production-candidate background at 1448 x 1086.
[x] Runtime map JSON with west/southwest reciprocal targets.
[x] Both public triggers and the cliffside alley reachable from every spawn.
[x] Initial foot-level collision and occlusion passes.
[x] Library, house, open-window and sewer-grate interaction anchors.
[x] Hidden routes withheld from public transition triggers.
[x] Automated geometry and topology tests.
[ ] Playwright traversal screenshots around the full northern circuit.
