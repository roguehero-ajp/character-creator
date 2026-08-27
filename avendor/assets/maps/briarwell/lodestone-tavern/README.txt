BRIARWELL - LODESTONE TAVERN INTERIOR
=====================================

LOCKED CONTENT
--------------
- Warm common room with hearth and tables on the left and the bar on the right.
- Broad central aisle connecting the snowy front door to the full room.
- Exactly one route: the front door back to Town Center.
- No proprietor, guests, stairs or secondary rooms are invented in this v1 pass.

RUNTIME BASE ART
----------------
background/lodestone-tavern-interior-v1.png
Reference size: 1448 x 1086 pixels.

GAMEPLAY DATA
-------------
../../../../data/maps/lodestone-tavern-interior.json
../../../../data/maps/briarwell-area-registry.json

GEOMETRY RULES
--------------
- The central floor and both service aisles remain connected.
- Hearth, tables, bar, stools and barrels collide at visible bases.
- The front-door trigger is reachable and returns to Town Center's tavern spawn.
- No painted feature or map edge behaves like a second doorway.

PRODUCTION CHECKLIST
--------------------
[x] Production-candidate background at 1448 x 1086.
[x] Runtime map JSON with reciprocal Town Center portal.
[x] Initial collision, occlusion and interaction pass.
[x] Automated geometry and topology tests.
[ ] Named staff, patrons and dialogue.
[ ] Playwright doorway traversal screenshot.
