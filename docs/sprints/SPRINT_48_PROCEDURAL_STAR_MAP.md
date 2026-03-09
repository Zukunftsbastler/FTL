# SPRINT 48: Procedural Star Map Background

## 1. Sprint Objective
**To the AI Assistant:** The user wants to replace the plain black background of the star map with a beautiful, procedural 2D space scene (stars and nebula clouds). To keep the project lightweight and dependency-free, we must reuse the WebGL2 boilerplate and Fractional Brownian Motion (FBM) noise functions already established in `PlanetGenerator.ts`. The map background should be generated once per sector and cached to ensure high performance.

## 2. Tasks

### A. Procedural Background Generator (`BackgroundGenerator.ts`)
* **The Logic:** Create a new utility class similar to `PlanetGenerator`. It should create an offscreen `HTMLCanvasElement` sized to the screen and render a full-screen WebGL shader into it.
* **The Shader:**
  1. **Stars:** Use a `hash(pos)` function. If `hash > 0.995`, draw a bright white/yellow pixel (star).
  2. **Nebula Clouds:** Use the 6-octave `fbm(pos)` function (already existing in `PlanetGenerator.ts`). Use this noise to smoothly mix background colors.
* **Theming:** The generator must accept a sector type (e.g., 'NEBULA' or 'STANDARD'). 
  * If 'NEBULA': Make the FBM clouds highly visible and tint them purple/magenta/dark blue.
  * If 'STANDARD': Make the clouds very faint (dark blue/black) to act as subtle space dust.

### B. Integrate and Cache in `MapSystem.ts`
* **The Problem:** Running a complex FBM shader every frame will destroy the framerate.
* **The Fix:** 1. Add a `private backgroundCanvas: HTMLCanvasElement | null = null;` to `MapSystem`.
  2. Inside `MapSystem.generate()` (which runs once per sector), call `BackgroundGenerator.generate(...)` using the current `this.sectorTemplate.type` and cache the resulting canvas.
  3. In `drawStarMap`, right at the beginning (Layer 0), draw this cached canvas using `renderer.drawImage(this.backgroundCanvas, 0, 0)`. (You may need to add a `drawImage` method to `IRenderer`/`Renderer` if it doesn't exist, passing the raw canvas).

### C. UI Polish (`MapSystem.ts`)
* Ensure the Rebel Fleet red zone (Layer 0) is drawn *on top* of the new procedural background, but *behind* the map nodes and edges. Use a slightly translucent red fill (`rgba(180,20,20, 0.4)`) so the stars and nebulas shine through the rebel warning zone.

## 3. Success Criteria
* A procedural space background with stars and FBM noise clouds is visible on the star map.
* The background visuals change depending on whether the sector is a NEBULA or standard space.
* The background is generated only once per sector and cached, maintaining a smooth 60 FPS.
* The Rebel Fleet warning zone overlays the background translucently.
* No external libraries are used; entirely self-contained WebGL/Canvas2D.
* No TypeScript errors.