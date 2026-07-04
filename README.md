# Minigolf Game

A browser-based 3D mini-golf game built with Three.js and Vite. Navigate multiple golf holes with physics-based ball mechanics, aiming controls, and stroke scoring.

## Run

```bash
npm install
npm run dev
```

The game will start on a local dev server (pass `--host` for network access). Build for production with `npm run build`.

## Structure

- **src/main.js** — Game loop, scene initialization, and core game state management
- **src/controls.js** — Player input handling and aiming mechanics
- **src/physics.js** — Ball physics simulation and collision detection
- **src/courseBuilder.js** — Course layout builder from tile definitions
- **src/tiles.js** — Tile constants, directions, and deck height definitions
- **src/ui.js** — UI overlays for start screen, hole info, power meter, and scorecard
- **src/assets.js** — Asset loading and 3D model spawning
- **src/holes/index.js** — Hole definitions (3 courses included)
- **public/models/** — Pre-built 3D models (.glb files) for course pieces and obstacles
- **public/textures/** — Texture assets used by models
- **index.html** — Entry point (loads src/main.js)
- **src/style.css** — Minimal styling for the full-screen canvas

## Notes

`node_modules` and build output are not included and must be reinstalled with `npm install`. All game assets (models and textures) are in the `public/` directory and are loaded at runtime by the Three.js engine.

