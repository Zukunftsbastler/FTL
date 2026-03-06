We are vastly improving our procedural spaceship generation. Right now, the hull shrinks tightly around the rooms. We want to draw a larger aerodynamic "chassis" polygon on the mask so the WebGL shader turns it into a massive spaceship.

Please read `docs/sprints/SPRINT_38_ADVANCED_HULL_GEOMETRY.md`.

**Execution Rules:**
1. **Increase Padding:** Task A is crucial. The wings and nose will be cut off by the canvas edges if you don't increase `HULL_PAD` to at least 100.
2. **The Mask Magic:** In Task B, draw the Polygon onto `maskCtx` BEFORE the `rooms.forEach` loop. Use basic `lineTo` math based on the bounding box to make a wedge/delta shape. Ensure you respect the `faction` parameter (player points right, enemy points left).
3. **GLSL Plumes:** In Task D, you don't need animated time if it's too complex to pass `u_time` every frame. Just make a static, beautiful, semi-transparent engine flame gradient trailing behind the ship inside the fragment shader based on `v_uv`.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the 2D mask draws an aerodynamic chassis under the rooms, and the WebGL shader renders engine exhaust plumes, please stage and commit all changes. Use the commit message: "style: Sprint 38 complete - Aerodynamic hull chassis polygons and GLSL engine plumes".

Please begin and let me know when the commit is successful!