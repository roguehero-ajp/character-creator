BRIARWELL - AREA 7 - AINSLEY'S AND THE CHURCH
==============================================

LOCKED CONTENT
--------------
- Ainsley's House for Unwanted Children and the church are separate buildings.
- North alley to Area 5.
- East road to Area 8 South Gate.
- Hidden sewer grate in the side alley by Ainsley's.
- No west or south road.

RUNTIME BASE ART
----------------
background/briarwell-ainsley-church-v1.png
Reference size: 1448 x 1086 pixels.

GAMEPLAY DATA
-------------
../../../../data/maps/briarwell-ainsley-church.json
../../../../data/maps/briarwell-area-registry.json

Area 7 is playable through Area 5's south alley. Its east road already names the
approved South Gate destination but remains planned until Area 8 has a runtime map.
The sewer grate is an inspectable clue and is deliberately absent from normal
transition triggers while the sewer route remains undiscovered.

GEOMETRY RULES
--------------
- North alley and east road remain visually open and mutually reachable.
- The grate side alley is traversable but remains a dead end.
- The south garden wall visibly closes the false bottom route and is approachable.
- Institution foundations, wall feet and the grate own collision; roofs and lamps
  use separate depth occlusion.
- A narrow pole or lamp must never apply a full-building invisibility mask.

PRODUCTION CHECKLIST
--------------------
[x] Production-candidate background at 1448 x 1086.
[x] Runtime map JSON with north/east reciprocal targets.
[x] Both public triggers and the grate alley reachable from every spawn.
[x] Initial foot-level collision and occlusion passes.
[x] Ainsley's, church and grate interaction anchors.
[x] Hidden sewer route withheld from public transition triggers.
[x] Automated geometry and topology tests.
[ ] Playwright traversal screenshots from Area 5.
