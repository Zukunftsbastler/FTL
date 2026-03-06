# SPRINT 42: Procedural WebGL Hex-Shields & Layering

## 1. Sprint Objective
**To the AI Assistant:** The current shield rendering is a simple, basic 2D arc that wraps tightly around the rooms, leaving the new procedural aerodynamic hull exposed. Furthermore, it lacks the iconic FTL "hexagonal grid" texture and fails to visualize the number of active shield layers (bubbles). We will build a WebGL-based `ShieldGenerator` to create a procedural hex-patterned shield texture with a glowing Fresnel edge. The `RenderSystem` will then draw this cached texture correctly sized around the *entire* ship chassis, rendering multiple concentric layers to represent the current shield bubbles.

## 2. Tasks

### A. The WebGL Hex Shader (`src/game/vfx/ShieldGenerator.ts`)
* Create a new utility class `ShieldGenerator` (patterned after `ExplosionGenerator`).
* Implement a static method `generateShieldTexture(color: string, radius: number): HTMLCanvasElement` that spins up a temporary WebGL context.
* **The GLSL Fragment Shader:**
  * Calculate the distance from center (making an ellipse or circle): `float d = length(uv - 0.5) * 2.0;`
  * Discard pixels where `d > 1.0`.
  * Calculate a Fresnel/Edge glow: `float edgeGlow = pow(d, 4.0);` (makes the rim bright and the center transparent).
  * **Hex Math:** Implement a standard GLSL Hexagonal grid pattern (using `mod`, `abs`, and distance math). 
  * Multiply the hex grid lines by the base color and add it to the edge glow.
  * Return the offscreen 2D Canvas.

### B. Global Shield Caching (`src/game/world/ShipFactory.ts` or `RenderSystem.ts`)
* We only need to generate this texture once (or once per faction color, e.g., Player = Cyan/Blue, Enemy = Red/Orange).
* Cache these canvases globally (e.g., `ShieldGenerator.getPlayerShield()`). Size the canvas generously (e.g., 512x512) so it looks crisp when scaled.

### C. Calculating the Proper Bounding Box (`src/game/systems/RenderSystem.ts`)
* In the `RenderSystem` shield loop, stop using the tight room bounds.
* Calculate the extreme bounds of the ship. Remember that `ShipGenerator` uses `HULL_PAD` (e.g., 100). The shield's `width` and `height` must encompass `(maxX - minX) + HULL_PAD * 2.5` to safely bubble around the entire nose and wings.

### D. Rendering Shield Layers (Bubbles)
* Find the `ShieldSystem` (or the `SystemComponent` of type `'SHIELDS'`) for the ship.
* Calculate active bubbles: `const bubbles = Math.floor(system.currentPower / 2);`
* If `bubbles > 0`, iterate from `i = 0` to `bubbles - 1`.
* For each bubble, draw the cached Hex-Shield canvas.
* **The Magic:** Scale each successive layer slightly outward (e.g., `radius + i * 8` pixels) and modulate its `globalAlpha` so the innermost shield is opaque and outermost is slightly softer. 
* *Bonus:* Make the alpha pulse slightly using `Math.sin(Date.now() / 200)`.

## 3. Success Criteria
* Shields encompass the entire procedural ship hull, not just the rooms.
* Shields feature a procedural hexagonal pattern and a bright glowing edge (Fresnel).
* The number of visible shield rings directly corresponds to the active shield bubbles (current Power / 2).
* No performance hit (the shader runs once to cache the image).
* No TypeScript errors.