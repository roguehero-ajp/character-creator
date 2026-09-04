BRIARWELL DARK FOREST ART
==========================

Canonical runtime backgrounds for Forest F16 through F22 and the Ogre's Clearing
are stored beneath this folder. The numbered forest screens are 1448 x 1086 and
use the same cold winter-night camera and painterly rendering language as the
F15 threshold. The Ogre's Clearing is a 2048 x 944 horizontal panorama and uses
the runtime's wide-area camera scrolling.

APPROVED TOPOLOGY
-----------------

         OGRE
           |
  F21 -- F20 -- F17
   |             |
  F22 -- F19 -- F16
          |       |
         F18 -- F15

There is deliberately no connection between F19 and F20. F21 and F22 are the
westernmost screens and have no west exit. The Ogre's Clearing is directly north
of F20; its farther northern cave remains sealed by a Strength 8 boulder.

VISUAL ROUTE RULE
-----------------

- These darker-green forest areas are untravelled magical forest. No painted
  road, path, trail, worn strip, rut, paving or stone edging belongs on any of
  their backgrounds.
- A valid exit is shown only as a local clearing or gap between trees, roots,
  rocks and thorn bush at the corresponding screen edge.
- Every unlisted edge is continuous impassable vegetation. In particular, the
  west edges of F21 and F22 are formidable walls of thorn, roots and rock.
- The broad interior ground is a naturally open glade with irregular snow,
  leaves, moss, roots and stones. It must never read as a directional corridor.

SCREEN EXITS
------------

  F16: north F17, south F15, west F19; east closed
  F17: south F16, west F20; north and east closed
  F18: north F19, east F15; south and west closed
  F19: east F16, south F18, west F22; north closed
  F20: north Ogre's Clearing, east F17, west F21; south closed
  F21: east F20, south F22; north and west closed
  F22: north F21, east F19; south and west closed
  Ogre's Clearing: south F20; north cave sealed, east and west closed

OGRE ARENA CONTRACT
-------------------

- The arena background never contains the ogre. The planned boss belongs on an
  independent sprite/runtime layer at the authored center anchor.
- The open combat floor must remain broad enough to drive horizontal camera
  movement. Scenery belongs around the perimeter rather than across the arena.
- The southern opening is the only active transition. The northern cave boulder
  is an interaction landmark until its Strength 8 traversal is implemented.

The runtime geometry and reciprocal transition ids live in data/maps. Painted
art communicates the same topology but does not contain collision data.
