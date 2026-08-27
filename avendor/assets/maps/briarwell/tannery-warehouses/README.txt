BRIARWELL - AREA 6 - TANNERY AND WAREHOUSES
============================================

LOCKED CONTENT
--------------
- Tannery with clean finished hides, vats and drying racks.
- Multiple warehouses and loading aprons.
- West road to Town Center Area 1.
- South downhill road to Area 9 docks.
- No north or east road.

RUNTIME BASE ART
----------------
background/briarwell-tannery-warehouses-v1.png
Reference size: 1448 x 1086 pixels.

GAMEPLAY DATA
-------------
../../../../data/maps/briarwell-tannery-warehouses.json
../../../../data/maps/briarwell-area-registry.json

Area 6 is playable from Town Center and the docks. Both public roads are active
and use reciprocal entry spawns.

GEOMETRY RULES
--------------
- The west and south road corridors remain visually open and mutually reachable.
- Tannery collision follows rack feet, vats, barrels and the building foundation.
- Warehouses collide only at loading steps, crate stacks and visible stone bases.
- Racks, hoists, warehouse fronts and foreground walls use separate depth layers.
- No hides, crates, lamp posts or wall edges may intrude into either road trigger.

PRODUCTION CHECKLIST
--------------------
[x] Production-candidate background at 1448 x 1086.
[x] Runtime map JSON with west/south reciprocal targets.
[x] Both triggers reachable from every spawn.
[x] Initial foot-level collision and occlusion passes.
[x] Tannery and warehouse interaction anchors.
[x] Automated geometry and topology tests.
[ ] Playwright traversal screenshots from Town Center and Area 9.
