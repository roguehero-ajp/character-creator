BRIARWELL - UNNUMBERED - WEST ROAD JUNCTION
===========================================

LOCKED CONTENT
--------------
- Three-way forest T-junction with no south route.
- East road to Area 5 Western Homes.
- North road to Area 12 Henson Homestead.
- West road leaves Briarwell; destination remains unassigned.

RUNTIME BASE ART
----------------
background/briarwell-west-road-junction-v1.png
Reference size: 1448 x 1086 pixels.

GAMEPLAY DATA
-------------
../../../../data/maps/briarwell-west-road-junction.json
../../../../data/maps/briarwell-area-registry.json

The west trigger is an approved cityExit with status unassigned and target null.
It must return the hero to its safe local spawn until Jay assigns the world route.

GEOMETRY RULES
--------------
- West, east and north corridors stay wide, visually open and mutually reachable.
- The signpost island sits beside the travel lanes and remains solid at its base.
- Forest, walls and boulders fully close the south boundary.
- The unassigned west trigger never invents a provisional destination.

PRODUCTION CHECKLIST
--------------------
[x] Production-candidate background at 1448 x 1086.
[x] Runtime map JSON with east, north and explicit west city exit.
[x] All three triggers reachable from every spawn.
[x] Initial collision, occlusion and interaction pass.
[x] City-exit contract covered by topology audit.
[x] Automated geometry and topology tests.
[ ] Playwright traversal screenshots from Areas 5 and 12.
