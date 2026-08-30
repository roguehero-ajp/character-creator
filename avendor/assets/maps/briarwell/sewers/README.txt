BRIARWELL - SEWERS 1.0
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
- Area 15 contains ten kobolds, including a wizard and champion.
- The dwarven chamber contains a wall-mounted two-handed battle axe and a chest
  reserved for chainmail armour, 350 silver and 20 gold.

RUNTIME ART
-----------
All production backgrounds are in background/ and render at 1448 x 1086.
Several ordinary corridor rooms deliberately share a matching topology template;
surface-access rooms, the kobold lair, Area 1 and the secret chamber use unique art.

The former background/briarwell-sewers-v2.png remains as an unused historical
reference for the provisional hub. It is not loaded by the runtime.

GAMEPLAY DATA
-------------
../../../../data/maps/briarwell-sewer-01.json
through
../../../../data/maps/briarwell-sewer-15.json
../../../../data/maps/briarwell-sewer-secret.json

The generated JSON source is:
../../../../data/maps/build-briarwell-sewers.mjs

Run from the repository root with:
node avendor/data/maps/build-briarwell-sewers.mjs

The area registry owns every reciprocal tunnel and surface connection. Gameplay
geometry remains separate from the painted art.

INTERACTION CONTRACT
--------------------
- Ordinary sewer tunnels transition automatically at their authored edge.
- Surface ladders, grates, caves and the Town Center well require E or Space.
- Area 5's hidden dwarven door rolls 1d10 + Perception against 12. Discovery is
  stored in avendorDiscoveries.v1 and the player presses E again to enter.
- Treasure and the kobold party are inspectable, but inventory and combat handoff
  remain reserved for their dedicated systems.

PRODUCTION CHECKLIST
--------------------
[x] Areas 1-15 and secret chamber registered as separate playable maps.
[x] Complete reciprocal topology.
[x] Four two-way surface access routes.
[x] Clean spring-fed well art and collision separation.
[x] Perception-gated dwarven chamber.
[x] Kobold lair and exact treasure record.
[x] Direct-entry URLs and automated topology/runtime checks.
