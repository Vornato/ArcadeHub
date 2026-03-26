Original prompt: Add a new two-player branching video episode to Artificial Skin called Series 4 - Unknown is Calling, starting from left player 1, with Player 1 choosing Kael or Zyra first, Player 2 auto-assigned the remaining fighter, exact scene ids/filenames from the Unknown_is_calling folder, rock-paper-scissors combat resolution for attack scenes, direct branch mapping for narrative scenes, and final ending resolution based on the scene 28 choice.

- Added `unknown` episode data, scene graph, and progress map in `game.js`.
- Added episode-specific resolution for opening fighter assignment, Kael-vs-Zyra combat exchanges, and the scene 33 ending resolver.
- Added the new menu card in `index.html` and responsive three-card layout support in `style.css`.
- Added `window.render_game_to_text` and `window.advanceTime` hooks for browser-side verification.
- Generated `posters/unknown-is-calling.jpg` from the opening `left player 1.mp4` clip.
- Verified the branching logic in headless Chrome through browser-side autotests covering:
  - `unknown-kael-rebellion` -> final `scene 35c`
  - `unknown-zyra-sacrifice` -> final `scene 34b`
  - `unknown-kael-duel` -> final `scene 34a`
- Captured `menu-series4.png` and visually checked the new Series 4 card in the menu layout.
- Remaining caveat: the verification harness is query-param driven because Node/Playwright was not available in this workspace.
