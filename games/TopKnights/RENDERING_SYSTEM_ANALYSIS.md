# Top Knights Rendering System Analysis

## Tile Rendering Functions

### `renderTerrainCache()` - **Line 7712**
- **Purpose**: Renders the complete terrain map cache to an off-screen canvas
- **Key Features**:
  - Clears and redraws the entire map based on tile biome data
  - Uses `terrainPalette` colors to create diagonal gradient fills for each tile
  - Adds shore gradients where water borders land biomes
  - Adds bank shadows/glows where land borders water biomes
  - Adds procedural detail patterns (stippling, wavelines, grass strokes)
  - Handles map preset backdrop overlay (green map, canyon, desert, ocean)
  - Uses `paintTileEdgeGradient()` for transitional effects

### `paintTileEdgeGradient()` - **Line 6571**
- **Purpose**: Draws colored gradient edges on tile boundaries
- **Parameters**: 
  - `targetCtx`: Canvas context
  - `x, y, size`: Tile position and size
  - `side`: "north", "south", "west", "east"
  - `startColor, endColor`: Gradient colors (default fade to transparent)
  - `thickness`: Gradient stripe thickness (default 18% of tile size)
- **Used For**: Shore transitions (water to land), bank transitions (land to water)

---

## Tile Data Structures

### `terrainPalette` - **Line 987**
```javascript
{
  meadow: ["#617f49", "#769a57", "#4b683b"],       // 3-stop diagonal gradient
  forest: ["#36563a", "#24402c", "#4f7050"],
  hill: ["#8b7b62", "#6e614d", "#b09c7d"],
  river: ["#275f87", "#1e4f72", "#4d97c9"],
  ocean: ["#16384f", "#1e4f72", "#3d81a8"],
  marsh: ["#60735b", "#465444", "#7a8e6e"],
  desert: ["#b6965f", "#d0b37b", "#8f7347"],
  canyon: ["#824d34", "#a76442", "#603625"],
  deadlands: ["#544349", "#6a545d", "#3b3036"],
  road: ["#9f8769", "#7f6d54", "#b9a180"],
}
```
- **Structure**: Each biome has 3 colors for diagonal gradient (top-left to bottom-right)
- **Usage**: Applied in `renderTerrainCache()` as `createLinearGradient()` with `addColorStop()`

### `terrainEffects` - **Line 1000**
```javascript
{
  meadow: { label: "Meadow", move: 1, vehicleMove: 1, structure: 1, blocked: false },
  forest: { label: "Forest", move: 0.88, vehicleMove: 0.74, structure: 0.94, blocked: false },
  hill: { label: "Hill", move: 0.93, vehicleMove: 0.86, structure: 1.04, blocked: false, towerRange: 1.08 },
  river: { label: "River", move: 0.52, vehicleMove: 0.46, structure: 0.4, blocked: true, allow: new Set(["bridge", "dock"]) },
  ocean: { label: "Ocean", move: 0.3, vehicleMove: 0.24, structure: 0.22, blocked: true, allow: new Set(["bridge", "dock", "hover_port"]) },
  marsh: { label: "Marsh", move: 0.7, vehicleMove: 0.54, structure: 0.82, blocked: false },
  desert: { label: "Desert", move: 0.82, vehicleMove: 0.72, structure: 0.9, attrition: { flesh: 1.3 }, blocked: false },
  canyon: { label: "Canyon", move: 0.68, vehicleMove: 0.5, structure: 0.72, blocked: true, towerRange: 1.12, allow: Set(...) },
  deadlands: { label: "Deadlands", move: 0.76, vehicleMove: 0.68, structure: 0.76, attrition: { flesh: 2.1, wood: 0.9 }, blocked: false },
  road: { label: "Road", move: 1.12, vehicleMove: 1.08, structure: 1.02, blocked: false },
}
```
- **Properties**: Movement modifiers, structure modifiers, blockage status, special restrictions
- **Usage**: Gameplay mechanics and environmental mood selection

### `wetBiomes` - **Line 1012**
```javascript
const wetBiomes = new Set(["river", "marsh", "ocean"]);
```
- **Purpose**: Identifies which biomes are water-based for shore/bank gradient logic

---

## Building/Unit Drawing Functions

### `drawBuildings()` - **Line 12104**
- **Purpose**: Iterates through all buildings and renders them
- **Key Features**:
  - Culls off-screen buildings using `isWorldCircleVisibleInActiveViewport()`
  - Saves canvas context and applies translation + rotation
  - Draws shadow ellipse if graphics quality includes shadows
  - Calls `drawBuildingModel()` with owner color and hit status
  - Draws strategic entity markers
  - Draws health rings if selected or recently hit
  - Draws tax reserve meter for neutral buildings with reserves

### `drawBuildingModel()` - **Line 12134**
- **Purpose**: Renders individual building visual representation
- **Rendering Strategy**:
  1. **Sprite Fallback**: Attempts to draw sprite from "assets" group using `drawSpriteFromGroup()`
  2. **Procedural Fallback**: If sprite unavailable, uses vector shapes:
     - **Tower/Radar**: Triangle body with flat roof
     - **Wall**: Horizontal rectangle with crenellations
     - **Bridge/Dock**: Horizontal platform with stroke
     - **Bunker/Cannon/Mortar**: Armored box with turret details
     - **Keep/Academy/Command**: Large castle with multiple towers and roof
     - **Generic Building**: Diamond/house shape with windows, variations for Market/Plant/Hospital/Chapel/Stable/Archery/Lumber
     - **Farm**: Ground stripes
     - **Quarry**: Central stone block
  3. **Banner**: Draws owner-colored banner at building position

### `drawUnits()` - **Line 12273**
- **Purpose**: Iterates through all units and renders them
- **Key Features**:
  - Culls off-screen units using `isWorldCircleVisibleInActiveViewport()`
  - Saves context and applies translation + rotation
  - Draws shadow ellipse if graphics quality includes shadows
  - Calls `drawUnitModel()` with rotation based on unit type
  - Draws selection halo if selected
  - Draws floating health bar if selected or hit

### `drawUnitModel()` - **Line 12294**
- **Purpose**: Renders individual unit visual representation
- **Rendering Strategy**:
  1. **Simplified Mode** (if `quality.simplifyModels` is true):
     - **Vehicles/Airborne**: Horizontal rectangle with dark visor
     - **Infantry**: Head circle + body line + arm cross
  2. **Sprite Mode**: Attempts to draw sprite from "units" group using `drawSpriteFromGroup()`
  3. **Procedural Fallback**: Vector-based rendering:
     - **Vehicles/Tanks**: Tracked chassis with turret
     - **Airborne**: Ellipse body (aircraft)
     - **Hovercraft**: Special glow ring
     - **Rocket Truck/Missile Carrier**: Added payload visualization
     - **Infantry**: Head + body + weapon
     - **Cavalry**: Horse with rider
  4. **Variable Details**: Tint on hit, rally indicator, weapon pickup indicator
  5. **Banner**: Draws owner-colored banner

---

## Sprite System

### `spriteLibrary` - **Line 1386**
```javascript
{
  assets: loadSpriteMap(window.TOP_KNIGHTS_SPRITES && window.TOP_KNIGHTS_SPRITES.assets),
  units: loadSpriteMap(window.TOP_KNIGHTS_SPRITES && window.TOP_KNIGHTS_SPRITES.units),
}
```
- **Purpose**: Internal sprite map for built-in assets and units
- **Populated by**: `loadSpriteMap()` function

### `externalSpriteLibrary` - **Line 1390**
```javascript
{
  assets: loadExternalSpriteMap(externalSpriteSources.assets),
  units: loadExternalSpriteMap(externalSpriteSources.units),
  resources: loadExternalSpriteMap(externalSpriteSources.resources),
}
```
- **Purpose**: External sprite resources loaded from PNG files
- **Sources**: Defined in `externalSpriteSources` (line 1268)

### `externalSpriteSources.assets` - **Line 1268 (partial listing)**
```javascript
{
  royal_keep: { variants: ["assets/buildings/royal_keep.png", "assets/buildings/royal keep.png"] },
  village_house: { variants: [...] },
  army_house: { src: "assets/buildings/army_house.png" },
  stone_tower: { src: "assets/buildings/stone tower.png" },
  wall: { src: "assets/buildings/wall segment.png" },
  // ... 40+ building types
}
```

### `externalSpriteSources.units` - **Line 1268 (partial listing)**
```javascript
{
  militia: { variants: ["assets/Weapons/militia_squad.png", "assets/Weapons/militia.png"] },
  warrior: { variants: [...] },
  archer: { src: "assets/Weapons/archer_volley.png" },
  knight: { src: "assets/Weapons/knight_charge.png" },
  lightTank: { variants: ["assets/Weapons/light_tank.png", "assets/Weapons/light_tank_variant.png"] },
  // ... 50+ unit types with variants
}
```

### `drawSpriteFromGroup()` - **Line 5973**
```javascript
function drawSpriteFromGroup(group, key, x, y, width, height, rotation = 0, alpha = 1, variantSeed = 0)
```
- **Purpose**: Universal sprite rendering function
- **Parameters**:
  - `group`: "assets", "units", or "resources"
  - `key`: Sprite identifier
  - `x, y`: Screen position (center)
  - `width, height`: Sprite dimensions
  - `rotation`: Rotation angle in radians
  - `alpha`: Opacity multiplier
  - `variantSeed`: Seed for variant selection (uses modulo)
- **Returns**: `true` if sprite drawn, `false` if sprite missing
- **Fallback**: When sprite unavailable, calls procedural drawing code

### `getSpriteEntry()` - **Line 1541**
- **Purpose**: Retrieves sprite with variant support
- **Logic**:
  1. Checks external library first
  2. Filters ready images
  3. Uses variantSeed to select variant (deterministic based on seed)
  4. Falls back to internal sprite library
- **Returns**: `{ image, scale }` or `null`

### `getUnitSpriteKey()` - **Line 5961**
```javascript
function getUnitSpriteKey(unit) {
  if (unit.kind === "animal") return unit.species;
  if (unit.kind === "civilian") return "civilian";
  return unit.role || null;  // Returns role like "militia", "knight", "lightTank"
}
```

### `getAssetSpriteSize()` - **Line 5953**
```javascript
function getAssetSpriteSize(building, size) {
  if (building.def.style === "wall" || building.def.style === "capital-wall") return { w: size * 1.72, h: size * 0.9 };
  if (building.def.style === "bridge" || building.def.style === "dock") return { w: size * 1.84, h: size * 0.88 };
  if (building.def.style === "tower" || building.def.style === "radar") return { w: size * 1.06, h: size * 1.48 };
  if (building.def.style === "keep" || building.def.style === "academy" || building.def.style === "command") return { w: size * 1.42, h: size * 1.42 };
  return { w: size * 1.36, h: size * 1.36 };  // Default
}
```
- **Purpose**: Returns proper aspect ratios for different building types

---

## 3D/First-Person Projection System

### `projectFirstPersonPoint()` - **Line 10774** ⭐ KEY 3D FUNCTION
```javascript
function projectFirstPersonPoint(viewport, unit, fp, x, y, z = 0, motion = null) {
  // World-to-view coordinate transformation
  const dx = x - unit.x;
  const dy = y - unit.y;
  
  // Camera basis vectors
  const forwardX = Math.cos(fp.yaw);
  const forwardY = Math.sin(fp.yaw);
  const rightX = -forwardY;
  const rightY = forwardX;
  
  // Depth = distance along forward axis
  const depth = dx * forwardX + dy * forwardY;
  if (depth <= 8) return null;  // Cull behind camera
  
  // Side = lateral distance
  const side = dx * rightX + dy * rightY;
  
  // Focal length (narrower when aiming)
  const focal = viewport.w * (fp.aiming ? 0.96 : 0.74);
  
  // Screen coordinates with perspective projection
  const centerX = viewport.x + viewport.w * 0.5 + (motion?.cameraOffsetX || 0) + (side / depth) * focal;
  const horizon = getFirstPersonHorizon(viewport, fp, motion);
  const eyeHeight = getFirstPersonEyeHeight(unit);
  const screenY = horizon + ((eyeHeight - z) / depth) * focal;
  
  return {
    depth,
    side,
    scale: focal / depth,          // Scaling factor based on distance
    x: centerX,
    y: screenY,
    horizon,
    focal,
  };
}
```

**Projection Algorithm**:
- Uses **FOV-style perspective projection** (NOT orthogonal)
- Converts 3D world coordinates (x, y, z) to 2D screen coordinates
- Camera forward/right vectors computed from yaw angle
- Depth-to-scale relationship: Objects farther away are smaller
- Handles camera pitch offset through `horizon` calculation
- Returns null for objects behind camera (culling)

### `drawFirstPersonView()` - **Line 11569**
- **Purpose**: Main entry point for first-person rendering
- **Rendering Pipeline**:
  1. Setup viewport clipping
  2. Draw backdrop (sky gradients)
  3. Draw ground plane
  4. Draw world objects (sorted by depth)
  5. Draw weapon overlay
  6. Draw post-effects (muzzle flash)
  7. Draw HUD

### `drawFirstPersonWorldObjects()` - **Line 11194**
- **Purpose**: Renders all game entities in first-person view with depth sorting
- **Key Features**:
  - Collects all trees, rocks, buildings, units, animals, civilians, projectiles, effects
  - Projects each to screen using `projectFirstPersonPoint()`
  - **Depth culls**: Objects beyond 1080 world units
  - **Frustum culls**: Objects more than `depth * 1.7 + 120` pixels from center
  - **Sorts by depth**: Farthest to nearest (painter's algorithm)
  - Applies depth-based fade and alpha blending

### Depth Fading - `getFirstPersonDepthFade()` - **Line 10917**
```javascript
function getFirstPersonDepthFade(depth, maxDistance = 1080) {
  const fog = clamp((depth - 120) / Math.max(1, maxDistance - 120), 0, 1);
  return {
    fog,                          // 0=close, 1=far
    alpha: lerp(1, 0.34, fog),   // Fades to 34% alpha at distance
  };
}
```
- **Purpose**: Implements fog/atmospheric perspective
- **Effect**: Distant objects fade out and become more transparent

### Camera Motion - `getFirstPersonMotionProfile()` - **Line 10673**
- **Purpose**: Calculates camera bob, lean, and recoil effects based on movement
- **Includes**:
  - Head bob in X and Y based on movement speed
  - Weapon offset for aiming stability
  - Reticle spread calculation
  - Breathing motion
  - Leaning (strafe-dependent)
  - Sprint pose

---

## Environmental Mood System

### `getEnvironmentMood()` - **Line 6587**
- **Purpose**: Returns color palette and atmospheric properties based on biome
- **Biome-Specific Properties**:
  - **Ocean**: Bright blue sky, water reflections
  - **Desert**: Warm sandy tones, high heat effects
  - **Canyon**: Reddish-brown atmospherics, rock textures
  - **Forest**: Green-tinted sky, dappled light
  - Default (Meadow): Neutral green atmosphere
- **Properties**: `skyTop`, `skyMid`, `skyBottom`, `sunCore`, `sunGlow`, `skyGlow`, `ember`, `horizon`, `groundWash`, `groundShade`, `water`, `heat`

### `getBiomeFloorColor()` - **Line approx. 10710**
- **Purpose**: Generates animated floor colors for first-person view
- **Features**: Wave animation based on world position and time

---

## Summary of Texture/Color Management

| Biome | Palette Range | Visual Characteristics | Movement | BlockedNotes |
|-------|---------------|----------------------|-----------|----------|
| **Meadow** | #617f49→#769a57 | Bright grass greens | 1.0x | Open terrain |
| **Forest** | #36563a→#4f7050 | Dark forest greens | 0.88x | Dense trees |
| **Hill** | #8b7b62→#b09c7d | Brown-tan earth | 0.93x | Elevated land |
| **River** | #275f87→#4d97c9 | Water blue | 0.52x | **BLOCKED** (bridges only) |
| **Ocean** | #16384f→#3d81a8 | Dark deep blue | 0.3x | **BLOCKED** (ships only) |
| **Marsh** | #60735b→#7a8e6e | Murky green-brown | 0.7x | Swampy ground |
| **Desert** | #b6965f→#8f7347 | Sandy yellows | 0.82x | Attrition damage |
| **Canyon** | #824d34→#603625 | Red-brown rock | 0.68x | **BLOCKED** (bridges only) |
| **Deadlands** | #544349→#3b3036 | Grim purples | 0.76x | Special attrition |
| **Road** | #9f8769→#b9a180 | Tan-brown path | 1.12x | Fastest terrain |

Each biome has distinct colors, shore/bank transitions, procedural detail patterns, and gameplay modifiers.
