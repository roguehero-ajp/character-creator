AVENDOR MAP ART STRUCTURE
=========================

All playable map artwork lives under:
  avendor/assets/maps/

ORGANIZATION RULE
-----------------
Use one folder per location, then one folder per playable scene.

Example:
  maps/
    briarwell/
      town-center/
      docks/
      orphanage/
      militia-yard/

Each scene can contain:
  background/     locked base environment art
  foreground/     scenery drawn in front of the hero
  overlays/       snow, light, smoke, weather, animated scenic layers
  interactables/  art for doors, signs, wells, containers, etc. when separate art is needed
  masks/          visual/depth/walk masks if later required by the renderer
  reference/      approved concepts, layout notes, and non-runtime reference images

Keep collision, exits, portals, and object coordinates OUT of the art folders.
Those should eventually live in scene/map data files so visuals and gameplay logic stay independent.
