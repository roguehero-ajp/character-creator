# Briarwell environmental animation hooks

Planning inventory for the native environment pass. These are visual layers only unless explicitly promoted to a gameplay state. Static collision remains authoritative by default.

## Shared exterior hooks

- visual dayparts: dawn, day, dusk and night use the same authored geometry and source composition
- snowfall: sparse foreground and background flakes; keep gameplay silhouettes readable
- chimney smoke: slow irregular drift, no collision
- lantern/fire light: subtle luminance flicker rather than large sprite motion
- hanging signs/cloth: restrained wind response
- water: low-amplitude surface shimmer/ripple where visible
- depth rule: animated foreground layers must preserve the map's existing occlusion intent

## Daypart foundation

Phase 1 is presentation-only. `js/world-time.js` owns the current visual daypart and exposes a manual setter/cycle control for testing. The renderer changes color grading, ambient tint and effect intensity without changing exits, collisions, spawn points, NPC schedules or shop states.

The approved Northwest Workshops painting is the canonical composition and dusk benchmark. Other dayparts are rendered from the same geometry-safe composition so time-of-day changes cannot cause map drift. A later gameplay-time phase may add NPC/shop schedules, but those states must be explicit and must never be inferred from the rendered lighting.

## Priority screens

### Area 1: Town Center
- Lodestone Tavern/general building chimney smoke
- fruit-stall cloth or hanging detail
- well/wind micro-motion only if visually justified

### Area 2: Northwest Workshops
- forge/fire glow and ember flicker
- chimney/forge smoke
- forge intensity responds to the visual daypart
- approved v2 background permanently closes the northward visual route
- only east and southwest exits are authored
- optional hammer/workshop ambient loop later

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
- wooden town-boundary fence is native SVG presentation with matching static collision
- broad Henson-road opening remains navigation-authoritative

## Implementation rule

Native CSS/DOM/SVG/canvas environment output should be layered above/below the static background through named environment slots. Decorative animation must not redefine walkable polygons, exits, spawn points, or collision footprints. Any animation that truly changes navigation (gate opening, moving obstruction, bridge state) must use an explicit gameplay state and a matching collision-state change rather than deriving collision from rendered frames.
