We are focusing heavily on Art Direction and procedural Canvas graphics in this sprint. The UI AST works perfectly, but we need to structure the layout better and replace boring rectangles with sweeping sci-fi shapes.

Please read `docs/sprints/SPRINT_33_ART_DIRECTION.md`.

**Execution Rules:**
1. **Procedural Hulls:** For Task A, do not just draw a bounding box. You must use `ctx.beginPath()`, `moveTo()`, and `lineTo()` to draw an angular spaceship shape. For the player, make the nose point to the right. For the enemy, point it to the left. The rooms will be drawn on top of this shape.
2. **Planetary Atmosphere:** For Task B, draw the planet BEFORE the stars so it sits deep in the background. Use `ctx.createRadialGradient` or `createLinearGradient` to give it a 3D sphere look.
3. **AST Update:** For Task C, update the `COMBAT_HUD` constant. The first child should no longer be a single Panel, but a `Row` containing a Panel (Player), a Spacer, and a Panel (Enemy). Move the text rendering for Enemy Hull into this new target panel.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the ships look like angular delta-wings, a planet is in the background, the top UI is split into player/enemy panels, and power bars are segmented, please stage and commit all changes. Use the commit message: "style: Sprint 33 complete - Procedural delta hulls, planetary backgrounds, and targeted enemy UI".

Please begin and let me know when the commit is successful!