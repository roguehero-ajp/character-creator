BRIARWELL - AREA 6 - TANNERY AND WAREHOUSES
============================================

LOCKED CONTENT
--------------
- Tannery with clean finished hides, vats and drying racks.
- Multiple warehouses and loading aprons.
- West road to Town Center Area 1.
- South downhill road to Area 9 docks.
- North road to the Library Quarter in Area 4.

RUNTIME BASE ART
----------------
background/briarwell-tannery-warehouses-v3.png
Reference size: 1448 x 1086 pixels.

GAMEPLAY DATA
-------------
../../../../data/maps/briarwell-tannery-warehouses.json
../../../../data/maps/briarwell-area-registry.json

Area 6 is playable from Town Center, the docks and the Library Quarter. All three
public roads have active reciprocal registry entries and matching arrival spawns.

GEOMETRY RULES
--------------
- The west, south and north road corridors remain mutually reachable.
- Tannery collision follows rack feet, vats, barrels and the building foundation.
- Warehouses collide only at loading steps, crate stacks and visible stone bases.
- Racks, hoists, warehouse fronts and foreground walls use separate depth layers.
- No hides, crates, lamp posts or wall edges may intrude into a road trigger.

PRODUCTION CHECKLIST
--------------------
[x] Production-candidate background at 1448 x 1086.
[x] Runtime map JSON and registry with west/south/north reciprocal targets.
[x] Initial foot-level collision and occlusion passes.
[x] Tannery and warehouse interaction anchors.
[x] Automated geometry and topology tests.
[ ] Playwright traversal screenshots from Town Center and Area 9.
