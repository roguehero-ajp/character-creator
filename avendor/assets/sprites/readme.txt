AVENDOR SPRITE LIBRARY
======================

This folder is the canonical home for gameplay sprites.

STRUCTURE
---------
_shared/              shared palettes, masks, templates and future common assets
hero/                 player-character sprite layers
  body/male/           male base-body animation atlases
  body/female/         female base-body animation atlases
  hair/                player hair layers
  clothing/            tunics, trousers, boots, robes and civilian clothing
  armour/              armour layers
  weapons/             carried/equipped weapon layers
  accessories/         hats, packs, belts, jewellery, shields, etc.
  effects/             hero-bound effects such as spell glows or status visuals
npc/                   named and generic non-player characters
creatures/             monsters, animals and non-human creatures
props/                 animated world objects that behave like sprites
effects/               free-standing gameplay effects

HERO MASTER FRAME
-----------------
128 x 240 pixels.
Anchor: bottom-centre, between the feet.
All hero layers must use the same canvas size and anchor.

DIRECTION ROW ORDER
-------------------
0 South
1 Southeast
2 East
3 Northeast
4 North

West-facing directions initially mirror the corresponding East-facing art:
Southwest <- Southeast
West      <- East
Northwest <- Northeast

ANIMATION ATLAS RULE
--------------------
walk.png = 6 columns x 5 direction rows
idle.png = 1 column  x 5 direction rows

All cosmetic/equipment layers must use the same frame grid so the compositor can
stack them without per-item animation code.

CURRENT ART
-----------
The male and female base bodies in this package are CONSTRUCTION RIGS, not final
character art. Joint markers and simple under-clothes are intentional. They exist
to validate silhouette, scale, direction, frame timing and gait before final skins
and equipment are painted.
