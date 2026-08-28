# Briarwell environmental animation hooks

Planning inventory for the later Synfig/environment pass. These are visual layers only unless explicitly promoted to a gameplay state. Static collision remains authoritative by default.

## Shared exterior hooks

- snowfall: sparse foreground and background flakes; keep gameplay silhouettes readable
- chimney smoke: slow irregular drift, no collision
- lantern/fire light: subtle luminance flicker rather than large sprite motion
- hanging signs/cloth: restrained wind response
- water: low-amplitude surface shimmer/ripple where visible
- depth rule: animated foreground layers must preserve the map's existing occlusion intent

## Priority screens

### Area 1: Town Center
- Lodestone Tavern/general building chimney smoke
- fruit-stall cloth or hanging detail
- well/wind micro-motion only if visually justified

### Area 2: Northwest Workshops
- forge/fire glow and ember flicker
- chimney/forge smoke
- optional hammer/workshop ambient loop later
- future north-boundary houses/wall remain static collision

### Area 3: Brewmaster Row
- chimney smoke
- subtle workshop steam or hanging-sign movement

### Area 4: Library Quarter
- chimney smoke / window warmth
- alley lantern flicker
- hidden window remains gameplay-controlled, not decorative animation

### Area 5: Western Homes
- domestic chimney smoke
- Fletcher hanging sign / light cloth movement

### Area 6: Tannery and Warehouses
- drying racks/cloth minimal wind motion
- warehouse lanterns
- dockward atmospheric mist

### Area 7: Ainsley's and Church
- church/house chimney smoke
- lanterns
- optional bell-rope or weather-vane ambience later

### Area 8: South Gate
- guardhouse/barracks smoke
- braziers/flame flicker
- gate flags or pennants if present
- gate collision stays static until a real open/close gameplay state exists

### Area 9: Docks
- highest environmental-animation priority
- lake/harbor surface motion
- tiny moored-boat bob, visual transform only
- rope/flag movement
- pier lantern flicker
- culvert water shimmer
- never move collision with decorative boat bobbing

### Area 10: Mayor's Hill
- manor chimney smoke
- lanterns
- restrained garden/tree wind movement

### Area 11: Ms. Blight's Orphanage
- chimney smoke
- barn/weather detail
- hidden window state remains gameplay-controlled

### Area 12: Henson Homestead
- workshop smoke/steam
- handmade mechanism motion where it helps characterize Henson
- winter-garden ambient movement

### West Road Junction
- tree/wind ambience
- future wooden town-boundary fence remains static collision

## Implementation rule

Synfig output should be layered above/below the static background through named environment slots. Decorative animation must not redefine walkable polygons, exits, spawn points, or collision footprints. Any animation that truly changes navigation (gate opening, moving obstruction, bridge state) must use an explicit gameplay state and a matching collision-state change rather than deriving collision from rendered frames.
