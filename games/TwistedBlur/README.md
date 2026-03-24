# TwistedBlur

TwistedBlur is an original HTML5 canvas local multiplayer vehicle-combat racing game built to run directly in the browser. It blends arcade racing, split-screen combat, pickups, boosts, and AI opponents without copying any copyrighted vehicles, maps, characters, UI, or story elements.

## Current Feature Set

- 1-4 local human players
- Split-screen layouts for 1, 2, 3, and 4 players
- Gamepad-first controls through the browser Gamepad API
- Keyboard fallback with four test layouts
- 4 playable vehicles with different speed, handling, armor, and boost profiles
- 7 original maps
- 4 game modes
- Weapon pickups, support pickups, hazards, boost pads, ramps, announcer messages, destructible props, HUD, minimap, respawns, and AI bots

## Run It

1. Open [index.html](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\index.html) in a modern desktop browser.
2. Click or press any key/button once to unlock audio and gamepad input.
3. Press `Enter`, `Space`, gamepad `A`, or gamepad `Start` to move past the title screen.

If your browser blocks gamepad support from `file://`, run a tiny static server in this folder and open the served page instead.

## Project Structure

- [index.html](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\index.html): browser entry point
- [style.css](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\style.css): shell styling
- [src/main.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\main.js): bootstrap and frame loop
- [src/game.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\game.js): state machine, match flow, rendering orchestration
- [src/constants.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\constants.js): vehicles, pickups, modes, tuning values
- [src/levelManager.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\levelManager.js): level data, minimap rendering, surface sampling
- [src/input.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\input.js): keyboard and Gamepad API handling
- [src/vehicle.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\vehicle.js): arcade driving model and vehicle state
- [src/weapons.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\weapons.js): autocannon, rockets, homing missiles, mines, EMP, shield, shockwave
- [src/pickups.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\pickups.js): pickup spawning and rewards
- [src/physics.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\physics.js): collision helpers and shared math
- [src/camera.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\camera.js): per-player follow cameras and shake
- [src/splitScreen.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\splitScreen.js): viewport layout logic
- [src/ui.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\ui.js): menu rendering, HUD, results, minimap framing
- [src/menu.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\menu.js): lobby and menu state data
- [src/ai.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\ai.js): bot steering, target choice, and weapon behavior
- [src/effects.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\effects.js): sparks, smoke, shockwaves, explosions, speed lines
- [src/audio.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\audio.js): placeholder synth music and sound hooks
- [assets/audio](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\assets\audio): drop in music and sound assets later
- [assets/images](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\assets\images): future visual assets
- [assets/ui](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\assets\ui): future menu and HUD art

## Controls

### Menu

- Keyboard host: `WASD` or arrow keys to navigate, `Enter` or `Space` to accept, `Backspace` or `Escape` to go back
- Lobby keyboard joins: `2`, `3`, `4` toggle extra keyboard driver slots
- Remove most recently joined human slot: `Delete`
- Gamepad: d-pad or left stick to navigate, `A` or `Start` to join or accept, `B` to go back or leave the lobby slot

### Gamepad Driving

- Left stick: steer
- Right stick: aim grapple
- Right trigger: accelerate
- Left trigger: brake or reverse
- `A`: fire autocannon
- `B`: use special pickup weapon
- `X`: boost
- `Y`: look back
- `RB`: fire grapple hook
- `LB`: cancel or retract grapple
- `Start`: pause

### Keyboard Driving

- Player 1: `WASD`, `Space`, `Left Shift`, `Q`, `E`, grapple `C`, retract `X`
- Player 2: arrow keys, numpad `0`, `1`, `2`, `3`, grapple `9`, retract `7`
- Player 3: `TFGH`, `R`, `Y`, `V`, `B`, grapple `P`, retract `O`
- Player 4: `IJKL`, `U`, `O`, `N`, `M`, grapple `.`, retract `,`

### Hook Debug

- `F3` or left stick click toggles grapple debug anchors, tether range, and state helpers

## Split-Screen Layouts

- 1 player: full-screen camera
- 2 players: side-by-side on wide screens, stacked on taller screens
- 3 players: one wide top viewport and two bottom viewports
- 4 players: four equal quadrants

Each local human gets a dedicated camera, HUD, and minimap.

## Maps

- Neon City Circuit: race track with neon shortcuts and pulse hazards
- Desert Highway Loop: wide desert route with canyon cuts and sand slow zones
- Whiteout Run: icy race course with lower traction
- Iron Basin: industrial arena for combat-heavy modes
- Skyline Shatter: rooftop arena with tight lanes and riskier positioning
- Voltage Shipyards: race through humming docks, relay towers, and container cuts
- Eclipse Vault: sealed arena with relay props and explosive canisters

## Modes

- Combat Race: 3 laps with weapons, pickups, and respawns
- Arena Deathmatch: score target or timer-based free-for-all
- Survival: no respawns, last machine rolling wins
- Quick Battle: short, dense party-friendly combat round

## Adding New Content

### Add a Vehicle

1. Add a new definition in [src/constants.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\constants.js) inside `VEHICLE_DEFS`.
2. Give it unique values for `speed`, `acceleration`, `handling`, `armor`, `boostCapacity`, `traction`, `mass`, and `radius`.
3. The vehicle select menu and spawning logic will pick it up automatically.

### Add a Map

1. Add a new level object to `LEVELS` in [src/levelManager.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\levelManager.js).
2. Set `category` to `race` or `arena`.
3. Define `world`, spawns, pickups, hazards, obstacles, and palette.
4. For race maps, also define `trackPath`, `trackWidth`, and `checkpoints`.

### Add a Weapon or Pickup

1. Add the pickup or weapon definition to [src/constants.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\constants.js).
2. Implement behavior in [src/weapons.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\weapons.js) or [src/pickups.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\pickups.js).
3. Update HUD text or balance values if needed.

### Add Destructible Props

1. Add prop placements to a level’s `props` array in [src/levelManager.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\levelManager.js).
2. Reuse or expand the prop definitions in `PROP_DEFS` inside [src/constants.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\constants.js).
3. Prop destruction and explosion handling is coordinated in [src/game.js](C:\Users\Vornato\Desktop\ArcadeHub\ArcadeHub\games\TwistedBlur\src\game.js).

## Known Limitations

- The visuals are still procedural rather than sprite-based, so the upgraded presentation is stylized and abstract instead of asset-heavy.
- Menus are still host-driven after players join instead of offering simultaneous per-player selection cursors.
- Audio uses lightweight synthesized placeholder sounds instead of produced music and layered vehicle loops.
- Collision and track physics are intentionally arcade-focused, not full rigid-body simulation.
- Respawn logic is built around the top-down camera model, so there is no literal flip recovery system.

## Future Upgrade Ideas

- Replace procedural visuals with authored vehicle art, UI art, and map previews
- Add per-player ready states in the vehicle lobby
- Add drifting score chains, assists, and combo announcers
- Add more advanced bot personalities and difficulty modifiers per mode
- Add destructible props, environmental hazards with animation, and richer sound design
- Add online netcode or remote local-streaming support later if desired
