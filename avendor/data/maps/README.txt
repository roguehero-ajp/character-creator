AVENDOR MAP DATA
================

BRIARWELL REGISTRY
------------------
briarwell-area-registry.json is the single source of truth for Briarwell area
identity and availability.

Each entry keeps three different concerns separate:

  id          Permanent semantic identity used by code and map links.
  areaNumber  Optional planning number from the approved town layout.
  title       Player-facing display name.

Changing a planning number must never require renaming an id. Area numbers may
remain null until the numbered town plan is approved, but two assigned areas may
not share a number.

AREA STATUS
-----------
  playable    Runtime map data and art exist.
  planned     The area's identity is approved, but it is not playable yet.

Only approved area identities belong in the registry, and only playable entries
may provide a map path. An authored road whose destination has not been defined
uses transition status unassigned and target null; it must not create a provisional
area id. The loader returns the hero to a safe local spawn when a planned,
unassigned, invalid or failed target is encountered.

TRANSITION CONTRACT
-------------------
Map schemaVersion 2 uses explicit transition targets:

  target.areaId              Registered destination identity.
  target.spawnId             Exact entry spawn; required once the target is playable.
  target.returnTransitionId  Reciprocal exit or portal; required for active links.

Outdoor exits also declare their geographically meaningful direction. Reciprocal
screen edges do not have to be mathematical opposites: for example, Town Center's
northwest road enters the Workshops through that screen's south road.

Every transition must declare an authored fallbackSpawn in its current map.
Automated topology checks reject duplicate ids/numbers, missing playable maps,
missing entry spawns, one-way active links and registry/map identity mismatches.

GROUND CONTACT RULE
-------------------
Movement collision and visual occlusion are separate systems.

A collision polygon represents only the object's physical footprint: the portion
that meets the ground and cannot be occupied by the hero's feet. Roofs, rails,
awnings, signs, tree canopies, upper walls and similar painted structure do not
become movement blockers merely because they overlap the hero sprite.

Visual overlap belongs in depthOccluders. When the hero walks behind scenery, the
appropriate painted portion may cover some or all of the hero while the hero's
foot anchor remains on legal ground.

For legacy maps that need collision refitting without rewriting their primary map
payload, the map engine supports an optional sibling geometry sidecar named:

  <map-name>-geometry.json

A geometry sidecar supplies replacement walkable and collisions arrays and records
its model/version. Briarwell Town Center currently uses this migration mechanism
with model ground-contact-footprints. New maps should author true ground-contact
footprints from the beginning.

Run after changing the registry or any Briarwell map:

  node avendor/tests/briarwell-map-topology.js
  node avendor/tests/town-center-footprints.js
  AVENDOR_SKIP_BROWSER=1 node avendor/tests/town-center-smoke.js

ART SEPARATION
--------------
Runtime geometry, spawns and transitions stay in data/maps. Painted backgrounds,
foregrounds, overlays, interactables and masks stay under assets/maps. Never bake
collision or town-topology identity into the art folders.
