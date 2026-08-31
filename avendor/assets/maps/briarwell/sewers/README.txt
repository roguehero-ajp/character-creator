BRIARWELL - SEWERS 1.1
======================

CANONICAL NETWORK
-----------------
The provisional single-screen hub has been replaced by Jay's canonical sewer
plan: Sewer Areas 1 through 15 plus one hidden ancient dwarven chamber.

Surface access:
- Area 1: Town Center well.
- Area 4: alley beside Ainsley's.
- Area 7: dockside culvert and ladder.
- Area 14: cave near Ms. Blight's property.

Special rooms:
- Area 1 contains the spring-fed municipal well cistern. Clear running water
  enters a raised reservoir used by the well bucket. An intact masonry divider
  and one-way overflow keep the lower sewer water physically separate.
- Area 5 hides the southern dwarven door behind a Perception test.
- Area 15 is a 5792 x 1086 scrolling kobold stronghold entered from the east.
  The hero travels west through groups of 3, then 2, then 3 regular kobolds before
  reaching the final chamber: two regular kobolds, a champion, wizard and chieftain.
  There is no west exit.
- The dwarven chamber contains a wall-mounted two-handed battle axe and a chest
  reserved for chainmail armour, 350 silver and 20 gold.

KOBOLD ENCOUNTERS
-----------------
Whenever Sewer Areas 1 through 14 are entered, the runtime makes two independent
checks unless the sewer infestation has already been cleared:
- 25% chance of 1-3 regular kobolds.
- 5% chance of one kobold champion.

Regular kobold loot:
- poor-quality short sword
- 0-10 copper
- 0-10 silver

Champion loot:
- average-quality mace
- average-quality shield
- 5-10 silver
- an additional 5-20 silver
- 0-2 gold

The sewers become permanently clear when the hero has defeated 25 roaming kobolds
plus every kobold in Area 15. The persistence hook is avendorSewerKobolds.v1.

CURRENT KOBOLD BEHAVIOUR
------------------------
Kobolds use the lightweight east/west movement atlas in:
../../../sprites/creatures/kobolds/

At present a kobold that detects the player walks toward the player and stops at
attack distance. The combat handoff will be implemented later. If the player is
sneaking, kobolds hold position; the future Perception check that can reveal a
sneaking hero is intentionally reserved for a later behaviour pass.

RUNTIME ART
-----------
Most production sewer backgrounds render at 1448 x 1086. Area 15 uses the new
background/sewer-area-15-v2.png at 5792 x 1086 and scrolls through a 1448 x 1086
viewport. Its matching SVG source is kept beside the PNG so the production PNG can
be reproduced without repainting the room.

The former background/briarwell-sewers-v2.png remains as an unused historical
reference for the provisional hub. It is not loaded by the runtime.

GAMEPLAY DATA
-------------
../../../../data/maps/briarwell-sewer-01.json
through
../../../../data/maps/briarwell-sewer-15.json
../../../../data/maps/briarwell-sewer-secret.json

The original generated sewer source remains:
../../../../data/maps/build-briarwell-sewers.mjs

Area 15 is currently a hand-authored scrolling override. Do not regenerate Area 15
from the builder until the builder has been taught the scrolling stronghold schema.

The area registry owns every reciprocal tunnel and surface connection. Gameplay
geometry remains separate from the painted art.

INTERACTION CONTRACT
--------------------
- Ordinary sewer tunnels transition automatically at their authored edge.
- Surface ladders, grates, caves and the Town Center well require E or Space.
- Area 5's hidden dwarven door rolls 1d10 + Perception against 12. Discovery is
  stored in avendorDiscoveries.v1 and the player presses E again to enter.
- Kobold combat and loot transfer remain reserved for the combat/inventory systems.

PRODUCTION CHECKLIST
--------------------
[x] Areas 1-15 and secret chamber registered as separate playable maps.
[x] Complete reciprocal topology.
[x] Four two-way surface access routes.
[x] Clean spring-fed well art and collision separation.
[x] Perception-gated dwarven chamber.
[x] Scrolling Area 15 stronghold with east entrance and no west exit.
[x] Area 15 encounter groups: 3 / 2 / 3 / final five.
[x] Regular/champion random sewer encounter rules and loot tables.
[x] Kobold east/west walk atlas and approach-player behaviour.
[x] Direct-entry URLs and automated topology/runtime checks.
