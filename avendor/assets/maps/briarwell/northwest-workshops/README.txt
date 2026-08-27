BRIARWELL - AREA 2 - NORTHWEST WORKSHOPS
========================================

PURPOSE
-------
Area 2 is the first new surface screen after Town Center. It establishes the town's
working district without becoming visually cramped or blocking the hero's routes.

LOCKED CONTENT
--------------
- Blacksmith at the top-left.
- Cooper at the top-center.
- One or two houses along the left side.
- South exit returning to Town Center Area 1.
- East exit leading to Area 3.
- No north or west surface exits.

REFERENCE CANVAS
----------------
1448 x 1086 pixels, matching Town Center.

reference/area-02-layout.svg is the production wireframe. It remains the layout
contract for the two exit corridors, open central circulation and landmark
hierarchy.

RUNTIME BASE ART
----------------
background/briarwell-northwest-workshops-v1.png

The first 1448 x 1086 visual pass is installed as the playable runtime background.
It is production candidate v1, not a declaration that future art polish is closed.

GAMEPLAY DATA
-------------
../../../../data/maps/briarwell-northwest-workshops.json
../../../../data/maps/briarwell-area-registry.json

TRANSITION CONTRACT
-------------------
  south-road
    direction: south
    target: briarwell-town-center/from-northwest
    reciprocal transition: northwest-road

  east-road
    direction: east
    target: briarwell-brewmaster-row/from-west
    reciprocal transition: west-road

Planned authored spawns:

  default       Safe center-lower start used during development.
  from-south    Entry from Town Center, above the south trigger.
  from-east     Entry from Area 3, left of the east trigger.
  smith-return  Safe approach in front of the Blacksmith.
  cooper-return Safe approach in front of the Cooper.

WALKABILITY AND COLLISION
-------------------------
- Preserve a broad south-to-center-to-east walking route.
- Keep the Blacksmith and Cooper forecourts mutually reachable.
- Houses may narrow the far-left edge but must not pinch the south approach.
- Fit collision to visible foot-level foundations, fences, anvils, barrel stacks
  and walls; never block an entire tall sprite silhouette.
- A sign, lamp, chimney smoke or roof edge may occlude the hero only through a
  separate depth polygon or foreground layer.
- The hero must be able to approach every door and trade landmark closely.

ART DIRECTION
-------------
Use Town Center's original hand-painted 16/32-bit adventure-game language and
robust winter palette. The Blacksmith should read through warm forge light, soot,
an anvil and stacked fuel. The Cooper should read through barrels, hoops, staves
and a sheltered workbench. Houses should support the screen rather than compete
with the two trades. Keep people, labels and interface elements out of the base art.

PRODUCTION CHECKLIST
--------------------
[x] Production-candidate background at 1448 x 1086.
[x] Runtime map JSON with south/east reciprocal targets.
[x] South and east triggers reachable from every spawn.
[x] Initial foot-level collision pass fitted to v1 pixels.
[x] Initial prop occlusion pass.
[x] Blacksmith and Cooper inspect/interaction anchors.
[x] Automated geometry and topology tests.
[ ] Playwright traversal screenshots from Town Center and Area 3.
