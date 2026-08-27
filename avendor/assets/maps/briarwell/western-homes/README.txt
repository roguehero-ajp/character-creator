BRIARWELL - AREA 5 - WESTERN HOMES
==================================

LOCKED CONTENT
--------------
- My house as the central residential anchor.
- Other houses.
- Fletcher's workshop.
- East road to Town Center Area 1.
- West road to the unnumbered outer junction.
- South alley to Area 7, Ainsley's and the church.
- No north road and no additional southern opening.

RUNTIME BASE ART
----------------
background/briarwell-western-homes-v1.png
Reference size: 1448 x 1086 pixels.

GAMEPLAY DATA
-------------
../../../../data/maps/briarwell-western-homes.json
../../../../data/maps/briarwell-area-registry.json

Area 5 is playable from Town Center. The west road and south alley already name
their approved destinations but remain planned until the road junction and Area 7
have runtime maps.

GEOMETRY RULES
--------------
- East, west and south-alley corridors remain visually open and mutually reachable.
- The yard walls close every other bottom-edge route and are approachable at base.
- House and Fletcher collisions follow visible foundations and workbench feet.
- Tall roofs, bows, awnings, lamps and yard walls use separate depth layers.

PRODUCTION CHECKLIST
--------------------
[x] Production-candidate background at 1448 x 1086.
[x] Runtime map JSON with east/west/south reciprocal targets.
[x] All three triggers reachable from every spawn.
[x] Initial foot-level collision and occlusion passes.
[x] Home, neighbor and Fletcher interaction anchors.
[x] Automated geometry and topology tests.
[ ] Playwright traversal screenshots from Town Center.
