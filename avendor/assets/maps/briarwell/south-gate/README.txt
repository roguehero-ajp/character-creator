BRIARWELL - AREA 8 - SOUTH GATE
===============================

LOCKED CONTENT
--------------
- Guard barracks, separate guardhouse and one house.
- North road to Town Center Area 1.
- West road to Area 7.
- East road to Area 9 docks.
- Open south city gate and road leaving Briarwell.

RUNTIME BASE ART
----------------
background/briarwell-south-gate-v4.png
Reference size: 1448 x 1086 pixels.

Version 4 keeps the winter atmosphere while reducing ground cover to a light,
patchy dusting. A tower-mounted sign above the open gate reads "Welcome to
Briarwell" without adding posts to the road.

GAMEPLAY DATA
-------------
../../../../data/maps/briarwell-south-gate.json
../../../../data/maps/briarwell-area-registry.json

Area 8 is playable from Town Center, Area 7, the docks and Forest F1. All four
roads are active. The open south gate is the northern end of the first approved
south-outskirts route.

GEOMETRY RULES
--------------
- North, west, east and south corridors remain visually open and mutually reachable.
- Open gate leaves collide only along their ground edges and preserve the center passage.
- Tower, wall, building and brazier collisions follow actual ground-contact pixels.
- The hero may approach or pass behind tall foreground masonry while depth layers preserve it.
- The overhead welcome sign is an occluder, never a ground collision.
- Gate towers, open doors and the welcome sign retain foreground depth coverage.
- The active south trigger arrives safely at the north side of Forest F1.

PRODUCTION CHECKLIST
--------------------
[x] Production-candidate background at 1448 x 1086.
[x] Runtime map JSON with active north/west/east/south routes.
[x] All four triggers reachable from every spawn.
[x] Town Center-style pathway, footprint and occlusion cleanup.
[x] Barracks, guardhouse, house and gate interaction anchors.
[x] F1 connection and reciprocal spawn contract enforced by topology audit.
[x] Automated geometry and topology tests.
[ ] Playwright traversal screenshots from Town Center and Area 7.
