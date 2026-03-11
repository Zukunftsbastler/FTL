We need to drastically improve the UX of our navigation maps. We must add color-coding and a legend to the Sector Map, and we need to render a tiny, geometrically accurate icon of the player's ship to show their current location on both maps.

Please carefully read the extraction and rendering requirements in `docs/sprints/SPRINT_76_MAP_ICONS_AND_SECTOR_LEGEND.md`.

**Execution Rules:**
1. **Reusable Renderer (Task A):** Find your existing procedural ship hull drawing code (likely in `RenderSystem.ts` or similar). Extract it into a reusable function that takes a `scale` parameter using canvas transforms.
2. **Sector Map UI (Task B & C):** Open `SectorMapSystem.ts`. Apply Red/Green/Purple colors to the nodes based on their type. Add a legend panel. Find the player's current sector and draw the miniature ship icon next to it.
3. **Star Map Icon (Task D):** Open `MapSystem.ts`. Find the current beacon node and draw the scaled-down ship icon next to it to clearly indicate the player's position.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the legend, the node colors, and the scaled ship icons are rendering correctly across both maps, stage and commit the changes.
Use the commit message: "ui: Sprint 76 complete - Added sector map legend, type coloring, and dynamic player ship map icons".

Please begin by checking how the ship hull is currently drawn and extracting that into a reusable function. Let me know when the commit is successful!