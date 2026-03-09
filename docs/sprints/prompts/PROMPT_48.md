We need to enhance our Star Map with a stunning, procedural 2D space background without relying on external libraries. We want to recycle the excellent WebGL FBM noise implementation we already have.

Please review `docs/sprints/SPRINT_48_PROCEDURAL_STAR_MAP.md` carefully.

**Execution Rules:**
1. **Background Generator (Task A):** Create `src/game/world/BackgroundGenerator.ts`. Copy the WebGL2 setup and GLSL noise functions (`hash`, `valueNoise`, `fbm`) from `PlanetGenerator.ts`. Modify the fragment shader to render a full-screen starfield (thresholded hash) mixed with nebula clouds (FBM). Make the colors parameterized based on whether it's a 'NEBULA' sector or not.
2. **Caching (Task B):** Update `MapSystem.ts`. Generate the background canvas *only once* inside the `generate()` method and store it. 
3. **Rendering (Task B & C):** Update the `Renderer.ts` and `IRenderer.ts` to support drawing a raw HTMLCanvasElement if necessary (e.g., `drawImage(img: HTMLCanvasElement, x, y)`). In `MapSystem.ts`, render this cached background as the absolute bottom layer. Update the Rebel Fleet red zone to be a translucent overlay over this new background.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the background generator is working, correctly cached per sector, and looking good, stage and commit all changes. 
Use the commit message: "feat: Sprint 48 complete - Procedural WebGL star map background and FBM nebula rendering".

Please begin by analyzing `PlanetGenerator.ts` to see how we handle WebGL canvas generation, and then `MapSystem.ts`. Let me know when the commit is successful!