BRIARWELL - AREA 11 - MS. BLIGHT'S ORPHANAGE
=============================================

LOCKED CONTENT
--------------
- Ms. Blight's large cliffside orphanage and a separate barn.
- Enclosed courtyard with a public southwest road to the Library Quarter.
- Hidden open side window connecting to Area 4's cliff alley.
- Hidden cave access to Sewer Area 14.
- This orphanage remains distinct from Ainsley's Area 7 home.

RUNTIME BASE ART
----------------
background/briarwell-blight-orphanage-v1.png
Reference size: 1448 x 1086 pixels.

GAMEPLAY DATA
-------------
../../../../data/maps/briarwell-blight-orphanage.json
../../../../data/maps/briarwell-area-registry.json

Area 11 is part of the town and is publicly accessible from the Library Quarter.
Its southwest road has an active reciprocal registry entry, and its interacted
cave portal connects to Sewer Area 14. The open window remains an interactable
clue until secret discovery and traversal logic is implemented together with
Area 4's matching alley window.

GEOMETRY RULES
--------------
- The courtyard, both forecourts and hidden-window alley remain connected.
- Building foundations, locked walls, fences and cliff barriers stay solid.
- The public road arrival stays clear of its return trigger.
- The open-window arrival spawn stays safe and outside building collision.

PRODUCTION CHECKLIST
--------------------
[x] Production-candidate background at 1448 x 1086.
[x] Runtime map JSON for the enclosed compound.
[x] Public Library Quarter road and hidden sewer-cave registry entries.
[x] Orphanage, barn and window interaction anchors.
[x] Initial collision and occlusion pass.
[x] Automated geometry tests.
[ ] Secret-discovery state and two-way window traversal.
[ ] Playwright hidden-route screenshots from Area 4.
