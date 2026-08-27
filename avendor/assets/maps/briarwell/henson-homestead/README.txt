BRIARWELL - AREA 12 - HENSON HOMESTEAD
======================================

LOCKED CONTENT
--------------
- Old Man Henson's cottage workshop, lean-to and winter garden.
- Handmade work mechanisms kept beside the open yard.
- Exactly one public route: south to the western junction.

RUNTIME BASE ART
----------------
background/briarwell-henson-homestead-v1.png
Reference size: 1448 x 1086 pixels.

GAMEPLAY DATA
-------------
../../../../data/maps/briarwell-henson-homestead.json
../../../../data/maps/briarwell-area-registry.json

GEOMETRY RULES
--------------
- The south road remains unobstructed from the image edge to Henson's forecourt.
- Cottage, garden, machines and yard walls collide at their visible bases.
- Work machines occlude only when the hero walks behind their actual footprint.
- No route opens through the north, east or west boundaries.

PRODUCTION CHECKLIST
--------------------
[x] Production-candidate background at 1448 x 1086.
[x] Runtime map JSON with reciprocal south road.
[x] South trigger reachable from every spawn.
[x] Initial collision, occlusion and interaction pass.
[x] Automated geometry and topology tests.
[ ] Playwright traversal screenshots from the western junction.
