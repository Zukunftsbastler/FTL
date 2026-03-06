# SPRINT 36: WebGL Pixel-Art Planet Generator

## 1. Sprint Objective
**To the AI Assistant:** The procedural planets created in Sprint 35 look too basic and use expensive CPU-bound 2D Canvas calls. The user wants the visual fidelity of "Deep-Fold's Pixel Planet Generator" (a famous open-source shader-based tool). We are going to rewrite `PlanetGenerator.ts` to spin up an offscreen **WebGL** canvas. We will write a custom GLSL Fragment Shader that handles 3D sphere mapping, procedural noise (continents), dithering (pixel-art shading), and biomes via uniforms, completely offloading the generation to the GPU.

## 2. Tasks

### A. The WebGL Infrastructure (`src/game/world/PlanetGenerator.ts`)
* Completely rewrite `PlanetGenerator.generatePlanet`.
* Instead of `getContext('2d')`, create a canvas and use `getContext('webgl')` (or `webgl2`).
* Set up a basic WebGL pipeline:
  1. Compile a simple Vertex Shader (renders a full-screen quad from `-1.0` to `1.0`).
  2. Compile the Fragment Shader (see Task B).
  3. Create buffers for the quad vertices.
  4. Pass uniforms (resolution, seed, color palettes, time/rotation).
  5. `gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)`.
* The method must still return the `<canvas>` element so `GameState` and `RenderSystem` can `ctx.drawImage()` it as before.

### B. The GLSL Fragment Shader (The Deep-Fold Magic)
* Write a GLSL fragment shader as a string constant within the file.
* **Sphere Mapping:** Map the 2D UV coordinates to a 3D sphere normal. If the distance from the center is `> 1.0`, discard the pixel (transparent).
* **Noise:** Implement a basic GLSL 3D Simplex or Hash noise function.
* **Lighting & Dithering:**
  * Calculate light intensity based on a hardcoded light direction (e.g., top-left).
  * Implement a simple 4x4 or 8x8 Bayer matrix (or a pseudo-random dithering function using mod operations on pixel coordinates) to create the pixel-art shadow banding (Terminator line).
* **Color Mapping:** Use the generated noise value to pick colors from uniforms passed to the shader (e.g., Water Color, Land Color, Cloud Color).

### C. Biome Uniforms (Themes)
* Define uniform setups for our themes (`TERRA`, `LAVA`, `ICE`, `DESERT`):
  * **TERRA:** Deep blue water, green/brown continents, white clouds.
  * **LAVA:** Dark red/charcoal base, bright glowing orange/yellow magma rivers.
  * **ICE:** Light blue/white base, cyan fractures.
* When generating, pass these 3-4 color vectors (as `vec3` RGB) into the shader.

## 3. Success Criteria
* The background planet is generated via WebGL and looks like a 3D, pixel-art sphere with noise-based continents and dithered shadows.
* The generation is nearly instantaneous (GPU bound) and does not lag the game.
* The offscreen canvas is perfectly read by the existing `RenderSystem`'s 2D context.
* No TypeScript errors.