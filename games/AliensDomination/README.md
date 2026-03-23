# Aliens Domination

Playable HTML/Three.js prototype with:
- top-down UFO control (P1 click-to-move, P2 gamepad movement)
- split-screen coop
- torus world wrap (1x1 km)
- enemies, civilians, harvesting, minimap, inventory/hotbar
- orbit station upgrades, planet selection, and time machine evolution

## Run

1. Install dependencies:
   - `npm install`
2. Start dev server:
   - `npm run dev`
3. Open the shown local URL (usually `http://localhost:5173`)

## Controls

### Player 1 (Keyboard + Mouse)
- Left Click: set movement target
- Right Mouse (or `F`): fire laser
- `Space`: boost/dash
- `1..5`: select hotbar slot
- `X`: use selected item
- `I`: toggle inventory
- `O`: ascend to orbit (requires 10 cows)
- `P` or `Esc`: pause/resume

### Player 2 (Gamepad)
- Left Stick: movement
- `RT` or `RB`: fire laser
- `A`: boost/dash
- `X`: use selected item
- `Y`: toggle inventory
- `LB/RB`: cycle hotbar
- `B`: ascend to orbit

## Notes

- The game uses lightweight kinematics (no heavy physics engine).
- Terrain and world content are stylized low-poly placeholders intended for expansion.
- `game_logic_roadmap.txt` is included in project root for future build planning.
