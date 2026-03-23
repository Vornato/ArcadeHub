# Kingly Kings Structure

## Chosen Stack
- HTML5 Canvas for rendering
- CSS for menu, HUD, and overlays
- Vanilla JavaScript for game state, input, AI, combat, progression, and split-screen cameras

## Core Systems
1. `Menu / Options`
- Solo or duo mode
- Horizontal or vertical split-screen
- Difficulty preset
- Hero doctrine that changes speed, damage, recruit synergy, and survivability

2. `World`
- Large open forest map with procedural trees, ruins, rocks, campfires, and medieval props
- Shared spawn meadow near the center
- Continuous enemy spawning that escalates over time

3. `Players`
- Player 1 uses mouse click-to-move
- Player 2 uses a gamepad, with a keyboard fallback for testing
- Smooth camera follows each player and stays centered
- Leveling, recruit growth, total army-based health, and recoverable combat escape

4. `Enemies`
- Multiple species with unique speed, power, and army-size rules
- Aggressive pursuit AI
- Larger enemy warbands move more slowly, while lighter groups remain faster
- Species unlock over time so the world grows more dangerous

5. `Combat`
- Contact-based melee combat with attack timing and hit effects
- Recruits gained from defeated enemy army sizes
- Player health formula: base health + level scaling + army contribution
- Escape remains possible by issuing movement away from the engagement

6. `Presentation`
- Startup menu with setting summaries
- HUD with player stats, world pressure, and controller hints
- `Tab` toggles an on-screen controls sheet

## File Layout
- `index.html`: menu, HUD, overlays, and canvas mount
- `styles.css`: visual theme and layout
- `src/game.js`: all gameplay logic and rendering
