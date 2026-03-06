We are vastly upgrading our combat visual feedback. We want to implement a procedural noise-dissolve explosion shader (like those seen on Shadertoy) to replace our basic impact particles. To keep performance perfect, we will pre-render these shader animations into 2D spritesheets.

Please read `docs/sprints/SPRINT_41_SHADER_EXPLOSIONS.md`.

**Execution Rules:**
1. **The Spritesheet Hack:** Task A is crucial. Do NOT run WebGL in the main game loop. Spin up ONE WebGL context in `ExplosionGenerator`. Loop N times (e.g., 36 frames). Pass `u_time` to the shader. Call `gl.drawArrays`. Then immediately use `ctx.drawImage(gl.canvas, ...)` to copy that frame onto a larger offscreen 2D canvas grid. Return that 2D canvas.
2. **The GLSL Shader:** The shader must use a noise function to dissolve a circle over time. Use `smoothstep` to create a hard but organic edge where the noise eats into the core explosion shape as `u_time` goes from 0.0 to 1.0.
3. **Types & Scaling:** Cache the generated sheets by `visualType`. In Task C, when spawning the explosion in `ProjectileSystem.ts`, use the projectile's `damage` (clamped to a minimum) to set the physical width/height of the explosion on the screen.
4. **Rendering:** In Task D, ensure the `ctx.drawImage` logic correctly maps a 1D frame index to a 2D grid (row and column) on the spritesheet.
5. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the WebGL generator creates the spritesheets, impacts trigger the ExplosionSystem, and beautiful noise-dissolve explosions scale with weapon damage, please stage and commit all changes. Use the commit message: "feat: Sprint 41 complete - Procedural WebGL noise-dissolve explosions and Spritesheet VFX caching".

Please begin and let me know when the commit is successful!