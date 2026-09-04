BRIARWELL SOUTH OUTSKIRTS MAP ART
=================================

Runtime routes:

- Main eastern road: South Gate -> F1 -> F2 -> F3 -> F4 -> Broken Bridge.
- Graveyard spur: F1 -> Graveyard.
- Western forest: F2 -> F5 -> F7, with F7 north to F6 and west to F9.
- Western loop: F6 <-> F8 <-> F9 <-> F7, with F8 north to playable F11.
- Southern spur: F9 -> F10.
- Witchwood loop: F9 west -> W1 -> W2 -> F10 east.
- Ancient-maple spur: W2 southeast -> roots -> middle boughs -> crown.

Approved screen relationships:

- The graveyard connects only to the west side of F1.
- F1 connects north to the Briarwell South Gate and south to F2.
- F2 connects north to F1, southeast to F3 and southwest to F5.
- F5 connects northeast to F2 and west to F7.
- F6 connects west to F8 and south to F7.
- F7 connects north to F6, west to F9 and east to F5.
- F8 connects east to F6, south to F9 and north to F11. Its redrawn screen exposes
  exactly those three wagon roads.
- F9 is a four-way junction: north to F8, east to F7, south to F10 and west to W1.
- F10 connects north to F9 and west to W2.
- W1 connects east to F9 and south to W2.
- W2 connects north to W1, east to F10 and southeast to the ancient maple.
- The ancient maple has separate roots, middle-bough and crown screens. Each
  upward leg requires a Climb check; failed checks use an authored fall landing.
- F3 connects northwest to F2 and south to F4.
- F4 connects north to F3 and east to the broken bridge.
- The broken bridge connects west to F4. Its eastward road toward Bushavic is
  visible but inaccessible because the bridge span is destroyed.

All backgrounds are authored at the runtime reference size of 1448 x 1086.
Collision and transition geometry lives in avendor/data/maps rather than in the
background PNG or WebP files.

Road-art standard for the well-travelled forest:

- Public roads must read as maintained packed-earth routes broad enough for a
  full-size wagon, with believable clearance and turning space.
- A background may show exactly one road mouth for each approved route above.
  Forest, rocks, roots and brush must close every other image-edge opening so
  no decorative clearing reads as an unregistered exit.
