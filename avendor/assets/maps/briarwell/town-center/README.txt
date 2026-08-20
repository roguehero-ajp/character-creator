BRIARWELL - TOWN CENTER
=======================

STATUS
------
Current visual layout approved/locked as the gameplay-map foundation.

LOCKED ELEMENTS
---------------
- Lodestone Tavern centered toward the north.
- Fruit vendor on the west/left side.
- General Store on the east/right side.
- Well in the square, reserved for a future sewer entrance.
- Northwest and northeast road exits behind/around the Lodestone.
- West exit in front of the fruit vendor.
- East exit in front of the General Store.
- South exit at the bottom edge.
- Tavern and General Store doors reserved as building portals.

RUNTIME BASE ART
----------------
background/briarwell-town-center.png
Reference size: 1448 x 1086 pixels.

GAMEPLAY DATA
-------------
../../../../data/maps/briarwell-town-center.json

The map data is separate from the painted art and currently defines:
- Three connected walkable regions.
- Eight foot-level collision regions fitted to visible object bases.
- Five outdoor exit triggers.
- Lodestone Tavern and General Store portals.
- Perspective scale stops and independent canopy, fence, and prop depth occluders.
- Five inspectable features and ten unassigned NPC anchors.

The destination scenes and building interiors are still stubs. The walk test
registers each transition and returns the hero to a safe spawn until that
destination map exists.
