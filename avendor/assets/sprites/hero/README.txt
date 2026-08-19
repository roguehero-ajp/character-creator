AVENDOR HERO SPRITE STANDARD v0.1
================================

The player is assembled from ordered visual layers. The current test uses only a
body layer, but the renderer already supports multiple layers.

Default stack plan:
1. back hair / back equipment
2. body
3. lower clothing / boots
4. upper clothing
5. armour
6. head / front hair
7. hat / helmet
8. foreground weapon / shield / accessory
9. hero-bound visual effects

Each layer supplies matching idle.png and walk.png atlases using the master frame
standard described in ../README.txt.

Do not bake character sex/body choice into movement code. Male and female are
visual presets using the same movement state, timing, directions and foot anchor.
