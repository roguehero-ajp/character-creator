BRIARWELL SOUTH OUTSKIRTS MAP ART
=================================

Runtime route:

  South Gate -> F1 -> F2 -> F3 -> F4 -> Broken Bridge
                  |    \
             Graveyard  F5 -> F7 (planned)

Approved screen relationships:

- The graveyard connects only to the west side of F1.
- F1 connects north to the Briarwell South Gate and south to F2.
- F2 connects north to F1, southeast to F3 and southwest to F5.
- F5 connects northeast to F2. Its west trail toward F7 is registered and
  visible, but returns the hero safely until the F7 screen is built.
- F3 connects northwest to F2 and south to F4.
- F4 connects north to F3 and east to the broken bridge.
- The broken bridge connects west to F4. Its eastward road toward Bushavic is
  visible but inaccessible because the bridge span is destroyed.

All backgrounds are authored at the runtime reference size of 1448 x 1086.
Collision and transition geometry lives in avendor/data/maps rather than in the
background PNG files.

Road-art standard for the well-travelled forest:

- Public roads must read as maintained packed-earth routes broad enough for a
  full-size wagon, with believable clearance and turning space.
- A background may show exactly one road mouth for each approved route above.
  Forest, rocks, roots and brush must close every other image-edge opening so
  no decorative clearing reads as an unregistered exit.
