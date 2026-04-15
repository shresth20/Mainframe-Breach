# Mainframe Breach

Mainframe Breach is a retro-styled browser puzzle-racer built with vanilla JavaScript, HTML5 Canvas, and a terminal-inspired UI. The goal is simple: route through the grid, collect every data node, and finish before the alarm timer reaches zero while avoiding roaming security bots.

## Overview

- Single-player, keyboard-driven grid game
- Runs entirely in the browser with no build step
- Uses modular ES modules instead of a framework
- Ships with handcrafted source levels plus a generated hard campaign
- Stores high scores locally with `localStorage`

## Core Gameplay

- Move one tile at a time with `Arrow Keys` or `WASD`
- Collect every data node on the map to clear the level
- Beat the countdown timer before the system locks down
- Avoid security bots or the current level resets
- Pause, resume, restart the current level, or return to the menu at any time
- Earn score from remaining time and total nodes collected

## Features

- Retro CRT presentation with a canvas playfield, status bar, message console, and footer prompts
- Six authored source layouts loaded from [`data/levels.json`](./data/levels.json)
- Easy campaign built from those six layouts and widened into a full `25 x 15` playfield
- Hard campaign with `10` generated levels derived from the source layouts
- Security bots that patrol looping routes and can switch into pathfinding-based chase behavior
- Hard-mode scaling for stronger bot detection and faster pursuit bursts
- `Debug` pickups that slow bot movement for 6 seconds
- `Blink` pickups that grant a teleport charge to a safer walkable cell
- Local top-5 high score tracking with automatic save on level clears and full run completion
- Menu, controls, pause, game-over, level-complete, run-complete, and high-score overlays
- Synthesized sound cues built with the Web Audio API
- Responsive terminal shell styling for desktop and mobile play

## Campaign Modes

### Easy

- `6` levels
- Based directly on the authored JSON layouts
- Expanded to the game's full-width grid while preserving each level's original structure

### Hard

- `10` levels
- Generated from the source layouts in [`js/level.js`](./js/level.js)
- Adds wider maps, more nodes, more patrol routes, denser wall layouts, safe-start buffering, and stronger bot pressure

## Screens And States

- `Main Menu`: start easy mode, start hard mode, open controls, open high scores
- `Controls`: quick reference for movement, blink, pause, restart, and objective rules
- `High Scores`: reads locally saved top scores from browser storage
- `Playing`: active run with timer, score, node count, blink count, and banner messaging
- `Paused`: temporarily freezes the run with resume or menu return options
- `Game Over`: triggered by bot contact or timer expiration
- `Level Complete`: shows level score, run total, and next-step options
- `Run Complete`: shown after clearing the last level in a campaign

## Controls

- `Arrow Keys` / `WASD`: move
- `Space`: confirm menu actions or use a blink charge during gameplay
- `Enter`: confirm menu and overlay selections
- `P`: pause or resume the run
- `R`: restart the current level
- `Escape`: leave info screens or return from pause/overlays to the menu

## Scoring

- Level score formula: `floor(timeLeft) * 10 + totalNodes * 100`
- Run score accumulates across cleared levels
- High scores keep the top `5` entries only
- High-score entries are tagged as `LEVEL CLEAR` or `RUN COMPLETE`

## Level Data Format

Each source level in [`data/levels.json`](./data/levels.json) defines:

- `name`: display name for the level
- `intro`: intro text shown when the level starts
- `gridSize`: base grid dimensions
- `timer`: starting countdown in seconds
- `botInterval`: base patrol step interval
- `start`: player spawn position
- `nodes`: collectible data-node coordinates
- `walls`: blocked tile coordinates
- `bots`: patrol paths as ordered coordinate lists
- `powerUps`: pickup list such as `debug` and `blink`

## Stack

- `HTML5`: application shell and canvas host
- `CSS3`: terminal styling, CRT effects, layout, responsive adjustments, design tokens via CSS variables
- `JavaScript (ES Modules)`: gameplay logic, rendering, input, state management, storage, and audio
- `HTML5 Canvas`: grid, entities, overlays, and HUD-adjacent playfield rendering

## Browser APIs Used

- `CanvasRenderingContext2D` for drawing the playfield and overlays
- `Fetch API` for loading level definitions from [`data/levels.json`](./data/levels.json)
- `Web Audio API` for synthesized UI and gameplay sound effects
- `localStorage` for persistent top-score storage
- `requestAnimationFrame` for the main render loop
- DOM APIs for HUD, message panel, and footer updates

## Tools And Libraries

### Libraries

- No third-party runtime libraries or frameworks are used
- No bundler, transpiler, or build pipeline is required

### Tools

- `python -m http.server` for local static serving

## File Structure

```text
Mainframe Breach/
|-- index.html
|-- README.md
|-- css/
|   `-- style.css
|-- data/
|   `-- levels.json
|-- js/
|   |-- audio.js
|   |-- bot.js
|   |-- game.js
|   |-- grid.js
|   |-- level.js
|   |-- player.js
|   |-- storage.js
|   |-- ui.js
|   `-- utils.js
```

## File Responsibilities

- [`index.html`](./index.html): app shell, header, status bar, canvas mount point, message panel, footer, and module entry script
- [`css/style.css`](./css/style.css): terminal color system, CRT frame styling, responsive layout rules, and status/message panel presentation
- [`data/levels.json`](./data/levels.json): six base level definitions, patrol routes, wall layouts, timers, and pickup placement
- [`js/game.js`](./js/game.js): main game controller, input handling, state machine, campaign flow, scoring, blink logic, bot stepping, UI sync, and rendering of overlays
- [`js/level.js`](./js/level.js): level normalization, fallback data, easy/hard campaign builders, layout expansion, sanitization helpers, and the `Level` class
- [`js/grid.js`](./js/grid.js): canvas renderer for the grid background, walls, nodes, power-ups, player, bots, borders, and optional patrol visualization
- [`js/player.js`](./js/player.js): player position, movement, teleporting, move counting, and blink charge management
- [`js/bot.js`](./js/bot.js): patrol advancement, chase detection, BFS pathfinding, path reconstruction, and patrol recovery
- [`js/audio.js`](./js/audio.js): audio context setup and synthesized cues for movement, collection, failure, level clear, and run completion
- [`js/storage.js`](./js/storage.js): score persistence helpers for loading, saving, sorting, truncating, and retrieving best scores
- [`js/ui.js`](./js/ui.js): DOM text updates for the HUD, banner, and footer prompt areas
- [`js/utils.js`](./js/utils.js): shared constants and helpers for timing, keyboard mapping, bounds checks, bot difficulty scaling, distance math, and random utilities

## Local Development

1. Start the local server:

   ```bash
   python -m http.server 8000
   ```

2. Open `http://127.0.0.1:8000/` in the browser.

No install step is required because the project has no external dependencies.

## Testing

No automated tests are currently present in this workspace.
