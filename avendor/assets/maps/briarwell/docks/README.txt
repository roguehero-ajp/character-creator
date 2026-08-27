BRIARWELL - AREA 9 - DOCKS
==========================

LOCKED CONTENT
--------------
- Fisherman's house above the stone quay.
- Working wooden piers and harbor loading square.
- North road to Area 6 Tannery and warehouses.
- West road to Area 8 South Gate.
- Hidden barred sewer culvert connecting to the future sewer network.

RUNTIME BASE ART
----------------
background/briarwell-docks-v1.png
Reference size: 1448 x 1086 pixels.

GAMEPLAY DATA
-------------
../../../../data/maps/briarwell-docks.json
../../../../data/maps/briarwell-area-registry.json

Area 9 is playable from Areas 6 and 8. The public map exposes only its north and
west roads. The dockside culvert is an interactable clue, not a normal transition;
its hidden sewer route remains planned until sewer gameplay is implemented.

GEOMETRY RULES
--------------
- The broad west road and tapered north road remain connected through the loading square.
- The main pier is walkable from shore while open water, boats and cargo remain blocked.
- Fisherman's house, quay walls, dock cargo and boats collide at their visible bases.
- Quay walls, the house front and foreground cargo provide depth occlusion.
- The sewer culvert remains approachable from the loading-side quay.

PRODUCTION CHECKLIST
--------------------
[x] Production-candidate background at 1448 x 1086.
[x] Runtime map JSON with reciprocal north and west roads.
[x] Both public triggers reachable from every spawn.
[x] Initial foot-level collision and occlusion passes.
[x] Fisherman's house, pier and sewer-clue interaction anchors.
[x] Hidden sewer access kept out of ordinary navigation.
[x] Automated geometry and topology tests.
[ ] Playwright traversal screenshots from Areas 6 and 8.
