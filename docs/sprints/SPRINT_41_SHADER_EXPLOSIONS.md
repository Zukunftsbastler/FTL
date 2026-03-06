# SPRINT 41: Procedural Shader Explosions & VFX

## 1. Sprint Objective
**To the AI Assistant:** The current impact particles are too basic. We want to implement high-fidelity, procedural explosions based on a Simplex-Noise dissolve shader (inspired by Shadertoy techniques). To avoid WebGL context limits and maintain 60 FPS, we will build an `ExplosionGenerator` that uses a GLSL fragment shader to pre-render an animated explosion into a 2D spritesheet canvas. We will parameterize these explosions based on weapon `visualType` (Colors/Noise scale) and weapon `damage` (Physical size). Finally, we will build an `ExplosionSystem` to play these spritesheets back on the main canvas upon impact.

## 2. Tasks

### A. The GLSL Explosion Shader (`src/game/vfx/ExplosionGenerator.ts`)
* Create a new utility class `ExplosionGenerator`.
* Set up an offscreen WebGL pipeline (similar to `PlanetGenerator`).
* **The Fragment Shader:**
  * Include a 2D/3D noise function (e.g., hash or simplex).
  * Calculate distance from center: `float d = length(uv - 0.5);`
  * Add noise to the distance: `float n = snoise(uv * noiseScale - time * 2.0);`
  * Create a dissolve threshold tied to `time` (0.0 to 1.0). As time progresses, the explosion "eats" into the circle using the noise mask.
  * Map colors (Center: White, Mid: Yellow/Orange, Edge: Red/Black) based on the noise and distance.
* **Spritesheet Generation:**
  * Method `generateSheet(type: string, frames: number): HTMLCanvasElement`
  * Create a 2D Canvas wide enough to hold a grid of frames (e.g., 6x6 grid for 36 frames).
  * In a loop, render the WebGL shader passing `time` from `0.0` to `1.0`. Draw each resulting WebGL frame into the corresponding grid cell on the 2D Canvas.

### B. Parameterizing by Weapon Type
* Cache these generated sheets globally so they are only built once per type.
* Define types:
  * **MISSILE:** Deep fiery orange/black, large noise scale (chunky flames).
  * **LASER:** Quick flash, bright neon green/red, smaller noise scale (sparks).
  * **ION:** Cyan/Blue, concentric pulsing rings dissolving.
  * **BEAM:** Bright yellow/white, linear or highly noisy burst.

### C. Explosion Component & System (`src/game/components/ExplosionComponent.ts`, `src/game/systems/ExplosionSystem.ts`)
* Create `ExplosionComponent` `{ age: number, maxAge: number, type: string, size: number, frameCount: number, columns: number }`.
* Create `ExplosionSystem` that ticks `age += dt`. If `age >= maxAge`, destroy the entity.
* In `ProjectileSystem`, when a projectile hits its target, spawn a new entity with `PositionComponent` and `ExplosionComponent`. Scale the `size` property based on the projectile's `damage` (e.g., `damage * 40` pixels).

### D. Explosion Rendering (`src/game/systems/ExplosionRenderSystem.ts`)
* Create a system that renders the explosions.
* Calculate the current frame: `const frame = Math.floor((age / maxAge) * frameCount);`
* Calculate the `srcX` and `srcY` on the cached spritesheet.
* Use `ctx.drawImage(sheet, srcX, srcY, frameW, frameH, destX, destY, destW, destH)` to draw the frame centered on the explosion's coordinates.

## 3. Success Criteria
* WebGL shaders successfully generate 2D spritesheets of noise-dissolving explosions based on time.
* Projectile impacts spawn dynamic explosion entities instead of basic particles.
* Larger damage values create physically larger explosions on the canvas.
* Missiles create fiery explosions, while Ions/Lasers create distinct energy bursts.
* No WebGL context leak/crash (only 1 temporary WebGL context is used during generation).
* No TypeScript errors.