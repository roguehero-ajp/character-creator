BRIARWELL - SEWERS
==================

PROVISIONAL FOUNDATION
----------------------
- This single-screen hub is a temporary playable scaffold, not the final sewer
  design. Briarwell's actual sewer network will be more complicated and may use
  multiple rooms, junctions or screens.
- The four approved access contracts remain stable: Town Center well, Library
  Quarter cliff alley, Ainsley's alley and the dockside culvert.
- Current art and geometry exist to exercise those anchors safely while the final
  sewer layout is designed; they may be replaced wholesale later.

RUNTIME BASE ART
----------------
background/briarwell-sewers-v2.png
Reference size: 1448 x 1086 pixels.

GAMEPLAY DATA
-------------
../../../../data/maps/briarwell-sewers.json
../../../../data/maps/briarwell-area-registry.json

The provisional sewer hub has functional v1 art and geometry but exposes no
automatic portal. Each ladder remains an interactable clue until the matching
surface feature is opened by future discovery/state logic. This prevents a sealed
grate or well from becoming a normal map-edge transition while leaving the final
network free to become substantially more complex.

GEOMETRY RULES
--------------
- The broad dry-stone floor remains connected between all four access landmarks.
- Water channels, shaft walls, culvert masonry and the south wall remain solid.
- All four authored arrival spawns sit on dry visible ground outside collision.
- No walkable polygon touches an image edge or implies an extra sewer route.

PRODUCTION CHECKLIST
--------------------
[x] Provisional runtime background at 1448 x 1086.
[x] Runtime map JSON with four safe arrival anchors.
[x] Initial collision, occlusion and interaction pass.
[x] Automated geometry and registry tests.
[ ] Surface-feature discovery and two-way traversal logic.
[ ] Replace the single-screen scaffold with Jay's full sewer design.
[ ] Playwright hidden-route screenshots from Areas 1, 4, 7 and 9.
