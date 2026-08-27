BRIARWELL - AREA 3 - BREWMASTER ROW
===================================

LOCKED CONTENT
--------------
- Brewmaster and copper brewery at the bottom-left.
- Houses along the top edge.
- West road to Area 2.
- East road to Area 4.
- North uphill road to Area 10, Mayor's Hill.
- No south road; the low retaining wall visibly closes the bottom edge.

RUNTIME BASE ART
----------------
background/briarwell-brewmaster-row-v1.png
Reference size: 1448 x 1086 pixels.

GAMEPLAY DATA
-------------
../../../../data/maps/briarwell-brewmaster-row.json
../../../../data/maps/briarwell-area-registry.json

Area 3 is playable between Areas 2 and 4. Its north road already names the approved
Mayor's Hill destination but remains safely planned until Area 10 has a runtime map.

GEOMETRY RULES
--------------
- The west, east and north corridors must remain visibly open and mutually reachable.
- The south retaining wall is approachable; collision stays at its visible base.
- Brewery collision follows the copper equipment, casks, grain and stone foundation.
- House collisions remain at their front foundations and props.
- Tall kettle, casks, house-front props and the south wall use separate depth layers.

PRODUCTION CHECKLIST
--------------------
[x] Production-candidate background at 1448 x 1086.
[x] Runtime map JSON with west/east/north reciprocal targets.
[x] West, east and north triggers reachable from every spawn.
[x] Initial foot-level collision and occlusion passes.
[x] Brewmaster and house interaction anchors.
[x] Automated geometry and topology tests.
[ ] Playwright traversal screenshots through Areas 1, 2 and 3.
