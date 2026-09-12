BRIARWELL - AREA 4 - LIBRARY QUARTER
====================================

LOCKED CONTENT
--------------
- Briarwell Library as the dominant civic landmark.
- Supporting houses.
- West road to Area 3.
- Southwest road to Town Center Area 1.
- South road to the Tannery and Warehouses in Area 6.
- Northeast uphill road to Ms. Blight's Orphanage in Area 11.
- Far-right cliffside alley.
- Open alley window reserved as the hidden route to Area 11.

RUNTIME BASE ART
----------------
background/briarwell-library-quarter-v2.png
Reference size: 1448 x 1086 pixels.

GAMEPLAY DATA
-------------
../../../../data/maps/briarwell-library-quarter.json
../../../../data/maps/briarwell-area-registry.json

Area 4 completes the playable Town Center → Area 2 → Area 3 → Area 4 → Town
Center northern circuit. Its south road connects to Area 6 and its northeast road
provides normal town access to Ms. Blight's Orphanage. All four public roads have
active reciprocal registry entries. The open window remains an inspectable clue
for an additional hidden route; window traversal is still planned.

GEOMETRY RULES
--------------
- All four public roads remain mutually reachable.
- The cliffside window clue remains distinct from the uphill public road.
- Library walls, house fronts and alley lamps use separate depth polygons.
- No full-screen building mask may make the hero disappear behind a narrow prop.

PRODUCTION CHECKLIST
--------------------
[x] Production-candidate background at 1448 x 1086.
[x] Runtime map JSON and registry with four reciprocal public roads.
[x] Initial foot-level collision and occlusion passes.
[x] Library, house and open-window interaction anchors.
[x] Hidden routes withheld from public transition triggers.
[x] Automated geometry and topology tests.
[ ] Playwright traversal screenshots around the full northern circuit.
