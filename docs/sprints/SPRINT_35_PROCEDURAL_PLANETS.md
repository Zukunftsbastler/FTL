# SPRINT 35: Procedural 3D Planet Generation

## 1. Sprint Objective
**To the AI Assistant:** We want to replace the cloudy gradient planet in the background with a crisp, pseudo-3D procedural planet. The planet must be generated using only Canvas API primitives (arcs, gradients, clipping) based on a seeded RNG or pseudo-random logic to create different biomes (TERRA, LAVA, ICE, DESERT). To maintain 60 FPS, the planet must be rendered ONCE to an offscreen canvas (cached), which is then drawn in the main render loop.

## 2. Tasks

### A. The Planet Generator Utility (`src/game/world/PlanetGenerator.ts`)
* Create a new class/utility `PlanetGenerator`.
* Define a `PlanetTheme` type: `'TERRA' | 'LAVA' | 'ICE' | 'DESERT' | 'GAS'`.
* Define palettes for each theme (e.g., TERRA: Base Blue, Features Green/White. LAVA: Base Dark Red, Features Bright Orange/Yellow).
* Create a method: `static generatePlanet(theme: PlanetTheme, radius: number, seed: number): HTMLCanvasElement`
  1. Create a raw canvas element: `const canvas = document.createElement('canvas');` and set its width/height to `radius * 2.5` (to leave room for atmosphere).
  2. Get `ctx = canvas.getContext('2d')`.
  3. **Atmosphere:** Draw a radial gradient slightly larger than `radius` (e.g., light blue for Terra).
  4. **The Clip:** `ctx.beginPath()`, `ctx.arc(center, center, radius)`, `ctx.save()`, `ctx.clip()`.
  5. **Base Color:** Fill the clipped area with the theme's base color.
  6. **Texture Generation:** Create a pseudo-random number generator using the `seed`. Use a loop (e.g., 200 iterations) to draw randomly placed, randomly sized circles/blobs using the theme's secondary colors to simulate continents, craters, or clouds.
  7. **3D Volume Shadow:** Draw a radial gradient from the center (transparent) to the edge (`rgba(0,0,0,0.8)`) to make the flat circle look like a sphere.
  8. **Terminator Shadow:** Draw a linear gradient from top-left (`rgba(0,0,0,0)`) to bottom-right (`rgba(0,0,0,0.95)`) to simulate a light source and a dark night-side.
  9. `ctx.restore()` to remove the clip.
  10. Return the `canvas`.

### B. Caching the Planet in Map/GameState (`src/engine/GameState.ts` & MapSystem)
* We do not want to generate a new planet every jump. A planet belongs to a sector or a specific map node.
* Add a `cachedPlanet: HTMLCanvasElement | null = null` property to `GameState`.
* When entering a new sector (or initializing the game), call `PlanetGenerator.generatePlanet('TERRA', 300, Math.random())` and store it in `GameState.cachedPlanet`. 

### C. Rendering the Cached Planet (`src/game/systems/RenderSystem.ts`)
* Remove the old cloudy radial gradient background logic.
* In the background render pass (before stars), check if `GameState.cachedPlanet` exists.
* If yes, use `ctx.drawImage(GameState.cachedPlanet, x, y)` to draw it.
* Continue to apply the slow parallax scrolling effect to its X coordinate.

## 3. Success Criteria
* Planets look like solid 3D spheres with a distinct day/night side and spherical volume shading.
* Planets have texture (craters/continents) created by overlapping primitives.
* Planet rendering does not drop the framerate because it is cached on an offscreen canvas.
* Different themes (Terra, Lava, Ice) use completely different color palettes.
* No TypeScript errors.