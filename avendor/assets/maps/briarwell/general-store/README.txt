BRIARWELL - GENERAL STORE INTERIOR
==================================

LOCKED CONTENT
--------------
- Practical village shop with ordinary supplies, shelving and service counter.
- Broad central customer floor and approachable counter frontage.
- Exactly one route: the front door back to Town Center.
- No proprietor, magic stock, cellar or secondary rooms are invented in v1.

RUNTIME BASE ART
----------------
background/general-store-interior-v1.png
Reference size: 1448 x 1086 pixels.

GAMEPLAY DATA
-------------
../../../../data/maps/general-store-interior.json
../../../../data/maps/briarwell-area-registry.json

GEOMETRY RULES
--------------
- The front door, central floor, counter aisle and main shelves remain connected.
- Shelves, counter, barrels, baskets and crates collide at visible bases.
- The front-door trigger is reachable and returns to Town Center's store spawn.
- No painted feature or map edge behaves like a second doorway.

PRODUCTION CHECKLIST
--------------------
[x] Production-candidate background normalized to 1448 x 1086.
[x] Runtime map JSON with reciprocal Town Center portal.
[x] Initial collision, occlusion and interaction pass.
[x] Automated geometry and topology tests.
[ ] Named staff, stock catalogue and dialogue.
[ ] Playwright doorway traversal screenshot.
