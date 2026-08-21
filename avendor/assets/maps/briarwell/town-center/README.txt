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
background/briarwell-town-center-v2.png
Reference size: 1448 x 1086 pixels.

GAMEPLAY DATA
-------------
../../../../data/maps/briarwell-town-center.json
../../../../data/maps/briarwell-area-registry.json

The map data is separate from the painted art and currently defines:
- Three connected walkable regions.
- Nine foot-level collision regions fitted to visible object bases.
- Five outdoor exit triggers.
- Lodestone Tavern and General Store portals.
- Perspective scale stops and independent canopy, fence, and prop depth occluders.
- Five inspectable features and two active resident anchors.

The northwest road is registered to the planned Northwest Workshops, whose
approved return is the Workshops' south road. The other undefined outdoor roads
remain explicitly unassigned pending the numbered town layout. Building interiors
remain planned. The area loader returns the hero to a safe authored spawn until a
destination becomes playable.
