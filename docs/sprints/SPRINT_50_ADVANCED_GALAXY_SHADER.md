# SPRINT 50: Advanced Galaxy & Starfield Shader

## 1. Sprint Objective
**To the AI Assistant:** The user reported that the star map is completely dark, stars are missing, and the nebula lacks any structural shape. We need to completely rewrite the `FRAG_SRC` in `BackgroundGenerator.ts`. We must switch to pixel-coordinate hashing for crisp, guaranteed visible stars. Furthermore, `STANDARD` space must render procedurally generated spiral/elliptical galaxies (using polar coordinates and seed-based randomization for arms/twist), while `NEBULA` space remains dense FBM clouds. We also need to upgrade the CPU fallback to draw actual stars in case WebGL2 fails.

## 2. Tasks

### A. Provide Resolution to Shader (`BackgroundGenerator.ts`)
* **The Fix:** The shader needs exact screen dimensions to render crisp 1-pixel stars.
* **Update `BackgroundGenerator.generate`:**
  1. Add `uniform vec2 u_resolution;` to the top of `FRAG_SRC`.
  2. Inside `generate`, add a helper `const setV2 = (name: string, x: number, y: number) => { ... gl.uniform2f(...) };`
  3. Call `setV2('u_resolution', width, height);` before rendering.

### B. Rewrite the Fragment Shader (`FRAG_SRC`)
* **Stars:** Map `v_uv` to actual pixels: `vec2 pixel = (v_uv * 0.5 + 0.5) * u_resolution;`. Use `hash(vec3(floor(pixel), u_seed))` to guarantee crisp, resolution-independent stars. 
* **Galaxy Math:** 1. Convert UVs to polar coordinates (`length(p)` and `atan(p.y, p.x)`).
  2. Generate seed-based random properties: `twist` (tight vs loose spiral) and `arms` (e.g., 2 to 5 arms).
  3. If `u_isNebula < 0.5` (STANDARD): Combine `sin(angle * arms + distance * twist)` with `fbm` noise. Multiply by an exponential falloff `exp(-dist * factor)` to create a bright core and fading disk. Mix with `u_cloudA` and `u_cloudB`.
  4. If `u_isNebula > 0.5` (NEBULA): Render dense, screen-covering FBM noise as before, but ensure it is highly visible.
* **Base Color:** Raise the base space color slightly to `vec3(0.02, 0.02, 0.04)` to prevent completely crushed blacks.

### C. Upgrade CPU Fallback (`BackgroundGenerator.ts`)
* **The Fix:** If WebGL fails, the user currently sees a pure black screen.
* **Update `cpuFallback`:** After filling the dark background, use a loop to draw ~400 tiny white squares (`ctx.fillRect`) at random `x, y` positions so the player always sees a starry sky regardless of hardware.

## 3. Success Criteria
* Crisp, highly visible stars are present across the entire star map.
* `STANDARD` sectors generate visible, unique spiral/elliptical galaxy shapes that vary per seed.
* `NEBULA` sectors generate bright, dense clouds.
* The CPU fallback renders a visible starry sky.
* No TypeScript errors.