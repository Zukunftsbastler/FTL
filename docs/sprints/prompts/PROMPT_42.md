We are replacing the basic transparent circle shields with a procedural, WebGL-based hexagonal energy shield. It needs to look like a glowing forcefield, completely encompass the ship's new aerodynamic hull, and visually stack based on the number of active shield bubbles.

Please read `docs/sprints/SPRINT_42_HEX_SHIELDS.md`.

**Execution Rules:**
1. **The Shader:** In Task A, building the hex pattern in GLSL is the core requirement. Look up standard 2D hexagon tiling in GLSL. The output should be a crisp circular/elliptical mask where the edge glows brightly (Fresnel) and the inside is mostly transparent but shows the glowing hex grid.
2. **Caching:** Do NOT run this WebGL context every frame. Generate it once and return a 2D Canvas sprite.
3. **Hull Sizing:** Task C is vital! Currently, the shield arc hugs the rooms. You MUST size the drawn shield image so it clears the procedural hull's nose and wings (add significant padding to the room bounding box).
4. **Layer Iteration:** In Task D, if `currentPower` is 4, that means 2 bubbles. You must call `ctx.drawImage` TWICE. The second time, make the destination width/height slightly larger so it looks like an outer shell.
5. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the WebGL hex shields are correctly generated, cached, scaled around the full aerodynamic hull, and correctly layer based on shield power, please stage and commit all changes. Use the commit message: "style: Sprint 42 complete - Procedural WebGL hexagonal shields and multi-layer rendering".

Please begin and let me know when the commit is successful!