AVENDOR MAP DATA
================

BRIARWELL REGISTRY
------------------
briarwell-area-registry.json is the single source of truth for Briarwell area
identity, availability and approved travel topology. Schema version 2 locks the
12 numbered surface areas, the unnumbered western road junction, the connected
15-area sewer network, its hidden dwarven chamber, two building interiors, the
south-outskirts forest, western farm road, F15 river crossing, Northfield, the
three-screen Misty Forest climb, Swimmable, the one-way Waterfall escape, the dark
western forest and scrollable Ogre's Clearing, Witchwood and the three-screen
ancient maple, Mountain M1 through M5 and the outdoor Dwarven Cave forecourt.

Each entry keeps three different concerns separate:

  id          Permanent semantic identity used by code and map links.
  areaNumber  Optional planning number from the approved town layout.
  title       Player-facing display name.

Changing a title or planning number must never require renaming an id. Briarwell's
approved surface numbers are the complete range 1 through 12. Support spaces such
as interiors, sewers and the western junction keep areaNumber null.

AREA STATUS
-----------
  playable    Runtime map data and art exist.
  planned     The area's identity is approved, but it is not playable yet.

Only approved area identities belong in the registry, and only playable entries
may provide a map path. All Town Center transitions name approved destinations.
All five of its surface roads and the two building doorways are active.
The western road junction now connects directly to playable Forest F13. Only the
destroyed bridge's far road toward Bushavic remains a cityExit with status
unassigned and target null. The loader returns the hero to a safe local spawn
when a planned, unassigned, invalid or failed target is encountered.

APPROVED CONNECTION GRAPH
-------------------------
connections records every approved route independently from runtime map geometry.
Ordinary connections have two unique area/transition endpoints. A directed river
escape instead has one source transition followed by one safe destination spawn.

  road            Public surface road.
  trail           Public walking trail that is explicitly not a wagon road.
  river-escape    Public one-way water route from a source exit to an arrival spawn.
  alley           Public surface alley.
  doorway         Public building entrance.
  climb           Public vertical traversal between outdoor screens.
  secret-passage  Hidden authored route; never player-facing navigation.
  sewer-access    Hidden surface-to-sewer route.
  sewer-tunnel    Public navigation inside the underground network.

visibility is either public or hidden. Secret passages and sewer entrances must
remain hidden. status is planned until both endpoint maps are playable, then may
become active.

The current graph contains:

  51 road connections: the established town, forest, farm, Witchwood, bridge and
                       Ogre's Clearing routes
  10 walking trails: Northfield through MF1-MF3, MF3 to Swimmable, MF3 through
                     Mountain M1-M4, M4 to M5 and M4 to the Dwarven Cave
   1 directed river escape: Waterfall downstream into Swimmable
   1 alley connection
   2 doorway connections
   2 ancient-maple climb connections
   2 hidden passages: the open window and ancient dwarven chamber
   4 hidden sewer entrances at Areas 1, 7, 9 and 11
  17 public tunnels inside the sewer network

cityExits separately records only the inaccessible road beyond the destroyed
bridge toward Bushavic. This keeps unresolved world geography out of the town's
internal connection graph.

TRANSITION CONTRACT
-------------------
Map schemaVersion 2 uses explicit transition targets:

  target.areaId              Registered destination identity.
  target.spawnId             Exact entry spawn; required once the target is playable.
  target.returnTransitionId  Reciprocal exit or portal; required for ordinary active links.

Outdoor exits also declare their geographically meaningful direction. Reciprocal
screen edges do not have to be mathematical opposites: for example, Town Center's
northwest road enters the Workshops through that screen's southwest road.

Every transition must declare an authored fallbackSpawn in its current map.
Automated topology checks reject duplicate ids/numbers, duplicate route endpoints,
public secret routes, unknown areas, missing playable maps, missing entry spawns,
accidental one-way active links, registry/map identity mismatches and runtime
transitions that contradict the approved graph.

The deliberate exception is a connection with kind `river-escape` and
`oneWay: true`. Its first endpoint names the only runtime transition, while its
second endpoint names a safe arrival spawn. Such a transition must omit
target.returnTransitionId. Waterfall uses this contract to flow southeast into
Swimmable without permitting the hero to swim back upstream.

Ancient-maple ascents use interacted transitions guarded by repeatable percentile
Climb checks. Each check names an authored failureSpawn so a failed attempt lands
the hero safely on the current screen. The three climb modifiers are +30 at the
roots, +15 in the middle boughs and +0 in the crown. The last success teleports
within the crown to the isolated cowl perch, which has its own safe descent.

Dark-forest connections retain the registry's public outdoor `road` kind for
route-graph compatibility, but their painted environments are not roads. F16
through F22 and the Ogre's Clearing use `*-clearing` transition ids and untracked
glade geometry. Only the edge clearings listed in BRIARWELL-TOWN-PLAN.md are
walkable; every other edge is closed by dense vegetation. The Ogre arena is a
2048 x 944 wide map that uses the existing horizontal camera-scroll contract;
its planned boss anchor stays separate from the background art.

The mountain route is made entirely of rough walking trails. M1-M3 climb north
from MF3, while M4 forms the only three-way high junction: south to M3, west to
M5 and east to the outdoor Dwarven Cave forecourt. M4 has no north opening. M5's
visible westward continuation and the cave's descending interior entrance are
recorded as art-only future connections, never live transitions.

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
  node avendor/tests/briarwell-route-contract.js
  node avendor/tests/south-outskirts-contract.js
  node avendor/tests/west-outskirts-contract.js
  node avendor/tests/northern-outskirts-contract.js
  node avendor/tests/misty-forest-river-contract.js
  node avendor/tests/mountain-route-contract.js
  node avendor/tests/witchwood-maple-tree-contract.js
  node avendor/tests/town-center-footprints.js
  AVENDOR_SKIP_BROWSER=1 node avendor/tests/town-center-smoke.js

See BRIARWELL-TOWN-PLAN.md for the human-readable area and route index.

ART SEPARATION
--------------
Runtime geometry, spawns and transitions stay in data/maps. Painted backgrounds,
foregrounds, overlays, interactables and masks stay under assets/maps. Never bake
collision or town-topology identity into the art folders.
