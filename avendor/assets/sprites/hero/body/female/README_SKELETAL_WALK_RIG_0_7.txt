FEMALE SKELETAL WALK RIG 0.7
============================

Purpose
-------
Build and validate a deterministic South-facing 12-frame walk cycle before
propagating gait logic to Southeast, East, Northeast and North.

This pass does NOT replace idle.png or walk.png and does NOT change the live
sprite engine from 8 walk frames to 12.

Preview
-------
Open:
  /avendor/female-skeletal-walk-test.html

The preview provides:
- animated South-facing 12-pose cycle
- frame-by-frame pose cards
- viewer-relative screen-left / screen-right labels
- joint overlay
- planted-foot markers
- deterministic gait validation
- generated 1536 x 240 diagnostic South-row atlas

Canonical choreography
----------------------
1.  Screen-left foot contact
2.  Weight over screen-left
3.  Screen-right passes
4.  Screen-right lift
5.  Screen-right extend
6.  Screen-right foot contact
7.  Weight over screen-right
8.  Screen-left passes
9.  Screen-left lift
10. Screen-left extend
11. Screen-left foot contact
12. Transition toward frame 1

Implementation
--------------
The authored pose table is in:
  /avendor/js/female-skeletal-walk-rig.js

Each leg stores explicit hip, knee, ankle and toe coordinates. Support-foot
placement is therefore deterministic rather than inferred by image generation.
The support toe is locked to the shared y=220 ground anchor during load.

The visualizer uses the approved female palette as a simplified rig proxy:
auburn hair/ponytail, cream blouse, brown vest/leather gear, blue trousers and
brown boots. It is intentionally diagnostic rather than final painted art.

Acceptance gate
---------------
Do not build the other directional rows until the South cycle is visually
approved frame-by-frame. Once approved, the same temporal gait phases can be
projected into SE/E/NE/N pose spaces and only then baked into the final
1536 x 1200 RGBA walk atlas.
