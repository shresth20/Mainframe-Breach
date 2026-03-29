# Mainframe Breach

Mainframe Breach is a browser-based, single-player, grid-based puzzle-racer built with vanilla JavaScript, HTML5 Canvas, and a retro terminal UI. Each level asks the player to collect all data nodes before the timer expires while predicting patrol routes from security bots.

## Features

- Tile-by-tile movement with Arrow Keys or WASD
- Six handcrafted levels with rising difficulty
- Data-node collection and timed level clears
- Security bots with looping patrol paths
- Collision resets and retry-from-current-level flow
- Local high-score tracking with `localStorage`
- Retro green-on-black terminal presentation
- Web Audio API sound cues
- Stretch systems: slow-bot debug pickups and blink teleport pickups

## Controls

- Move: `Arrow Keys` / `WASD`
- Blink teleport: `Space` when a blink charge is loaded
- Restart current level: `R`
- Menu navigation: `Arrow Keys` / `WASD` + `Enter`
- Back from info screens: `Escape` or `Enter`

## Project Structure

- `index.html`: app shell and overlay
- `css/style.css`: terminal/CRT styling
- `js/game.js`: main game state machine and rendering
- `js/grid.js`: grid rendering and entity drawing
- `js/level.js`: level loading and level model
- `js/player.js`: player movement and blink charges
- `js/bot.js`: patrol bot loop logic
- `js/ui.js`: DOM HUD updates
- `js/storage.js`: local score persistence
- `js/audio.js`: synthesized sound effects
- `data/levels.json`: campaign level definitions

## Run Locally

1. Start a local server:

   ```bash
   python -m http.server 8000 --bind 127.0.0.1
   ```

2. Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/).

## Tests

Run the smoke test suite with:

```bash
npm test
```
