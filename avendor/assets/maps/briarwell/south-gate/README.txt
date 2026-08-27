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
background/briarwell-south-gate-v3.png
Reference size: 1448 x 1086 pixels.

GAMEPLAY DATA
-------------
../../../../data/maps/briarwell-south-gate.json
../../../../data/maps/briarwell-area-registry.json

Area 8 is playable from Town Center, Area 7 and the docks. Its three internal roads
are active. The open south gate is an explicit cityExit with status unassigned and target null; it
must not invent a world destination before Jay approves one.

GEOMETRY RULES
--------------
- North, west, east and south corridors remain visually open and mutually reachable.
- Open gate leaves collide at their visible bases but preserve the center passage.
- Tower, wall, building and brazier collisions follow actual foot-level pixels.
- Gate towers and open doors use separate foreground depth layers.
- The unassigned south trigger always returns the hero to its safe local spawn.

PRODUCTION CHECKLIST
--------------------
[x] Production-candidate background at 1448 x 1086.
[x] Runtime map JSON with north/west/east routes and explicit city exit.
[x] All four triggers reachable from every spawn.
[x] Initial foot-level collision and occlusion passes.
[x] Barracks, guardhouse, house and gate interaction anchors.
[x] City-exit contract enforced by topology audit.
[x] Automated geometry and topology tests.
[ ] Playwright traversal screenshots from Town Center and Area 7.
