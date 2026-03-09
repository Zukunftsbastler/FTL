We need to drastically improve the visual quality of our star map background. The current shader makes stars invisible on many screens and lacks proper galaxy structures.

Please read `docs/sprints/SPRINT_50_ADVANCED_GALAXY_SHADER.md` carefully.

**Execution Rules:**
1. **WebGL Setup (Task A):** Open `src/game/world/BackgroundGenerator.ts`. Update the shader to accept a `u_resolution` uniform (vec2) and pass `width` and `height` to it in the `generate` function.
2. **Shader Rewrite (Task B):** Completely replace the `main()` function in `FRAG_SRC`. 
   - Calculate pixel coordinates for the stars using `u_resolution` to ensure they are crisp 1x1 dots. 
   - Implement polar-coordinate math (`atan` and `length`) to create spiral galaxies for the `STANDARD` theme. Use `u_seed` to randomize the number of spiral arms and the twist factor so every sector looks like a unique galaxy.
   - Boost the base space color and cloud visibility so nothing is entirely pitch black.
3. **Fallback (Task C):** Update `cpuFallback`. Draw 400 random 1x1 white rectangles (stars) after the background fill.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the new galaxy shader and fallback are fully implemented and visually stunning, stage and commit the changes.
Use the commit message: "feat: Sprint 50 complete - Advanced spiral galaxy shader with pixel-perfect stars".

Please apply these changes to `BackgroundGenerator.ts` now!