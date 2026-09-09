BRIARWELL MOUNTAIN RIVER MAP ART
===============================

Canonical Waterfall and Swimmable backgrounds are stored beneath this directory.
Both images are authored at the Avendor reference size of 1448 x 1086.

Approved flow:

  Rock Ledge balance-check failure
                |
                v
            Waterfall ----one-way current----> Swimmable <----trail----> MF3

Route-art contract:

- Waterfall is a forced-entry survival screen. A failed Rock Ledge balance and
  Luck check sends the hero downriver to the immense plunge pool, and the only escape follows the
  broad current southeast into Swimmable. No land path or swim route returns up
  the falls.
- Swimmable receives that current from the northwest, broadens into a deep calm
  pool, visibly continues south beyond the frame and provides a gravel landing.
  Its only ordinary land opening is the east walking trail to MF3; the upstream
  chute is visibly impossible to swim against and the south water edge is not an
  active transition.
- Until the hero has dedicated swimming animation, runtime movement stays on the
  authored landing shelves, shallows and shoreline. Deep-water movement remains
  explicit planned metadata rather than pretending the walk rig is a swim rig.

Runtime geometry, the active fall spawn and the directed escape contract live in
avendor/data/maps.
