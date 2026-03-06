We are undertaking a major Art Direction upgrade for the background. We are replacing the soft gradient with a procedural 3D planet generator that creates distinct biomes (Lava, Earth, Ice) using the Canvas API.

Please read `docs/sprints/SPRINT_35_PROCEDURAL_PLANETS.md`.

**Execution Rules:**
1. **Offscreen Canvas:** Task A is the core. You MUST create a `document.createElement('canvas')`, draw the planet onto it, and return it. This acts as a cached sprite.
2. **The Layering Magic:** The order of drawing in `PlanetGenerator` is critical:
   - First: Atmosphere (no clip).
   - Second: `ctx.beginPath(); ctx.arc(); ctx.clip();`
   - Third: Base color fill.
   - Fourth: Loop to draw random texture blobs (they will be clipped perfectly to the arc).
   - Fifth: The 3D Shading overlays (Volume radial gradient + Terminator linear gradient).
   - Sixth: `ctx.restore()` to remove the clip.
3. **Texture RNG:** Write a tiny, simple pseudo-random function using the `seed` parameter so that the same seed always produces the exact same layout of craters/continents.
4. **Integration:** Update `GameState` to store this generated canvas, and update `RenderSystem` to `drawImage` it.
5. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the PlanetGenerator is implemented, creating gorgeous 3D-looking spheres with day/night cycles, and they are rendered via cached offscreen canvases without lagging the game, please stage and commit all changes. Use the commit message: "style: Sprint 35 complete - Procedural 3D planets with offscreen canvas caching and biomes".

Please begin and let me know when the commit is successful!