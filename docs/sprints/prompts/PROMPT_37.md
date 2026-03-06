We are undertaking another major Art Direction sprint. We need to generate procedural spaceship hulls using WebGL. The key constraint is that the hull must mathematically wrap around the existing grid of rooms.

Please read `docs/sprints/SPRINT_37_WEBGL_SHIPS_AND_CUTAWAYS.md`.

**Execution Rules:**
1. **The Mask Strategy:** In Task A, generating the 2D white-on-black room mask is mandatory. This is how we ensure the rooms fit.
2. **WebGL Extrusion:** In Task B, write the GLSL fragment shader. It must sample the `u_roomMask` texture. To grow the hull, if the current pixel is black, but a sample slightly offset in X or Y is white, it becomes part of the metal hull. Add a noise function for hull texture.
3. **Caching:** Do not generate this in the RenderSystem update loop. Generate it once in `ShipFactory` during `spawnShip` and save the canvas reference on the Ship entity.
4. **The Cutaway:** In `RenderSystem.ts`, draw the cached WebGL canvas first. Then, before drawing the bright room floors/systems, draw a nearly black `fillRect` for every room with a border to create the "sliced open" look.
5. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the WebGL hull generator creates metal hulls that perfectly wrap the room grids, and the RenderSystem correctly layers the hull, the cutaway shadow, and the rooms, please stage and commit all changes. Use the commit message: "style: Sprint 37 complete - WebGL room-wrapping ship hulls and cutaway rendering".

Please begin and let me know when the commit is successful!