We need to drastically improve our ship rendering. Currently, our map icons only draw rooms. We need to upgrade our shared `drawShipIcon` function to draw the hull silhouette underneath the rooms, and then we need to use this function to render a beautiful ship preview in the Hangar menu.

Please carefully read the visual layering requirements in `docs/sprints/SPRINT_77_COMPREHENSIVE_SHIP_ICONS.md`.

**Execution Rules:**
1. **Upgraded Renderer (Task A):** Open the file where `drawShipIcon` is defined. Implement the dual-layer rendering. Draw the hull path first (with a dark fill and visible stroke), then loop through the `rooms` array and draw the room rectangles on top. Ensure the `scale` transform applies to both layers correctly.
2. **Hangar Integration (Task B):** Open `HangarSystem.ts`. Find the panel where ship details are displayed and call `drawShipIcon` to render a large preview of the selected ship.
3. **Map Verification (Task C):** Open `SectorMapSystem.ts` and `MapSystem.ts`. Ensure the `drawShipIcon` is still being called, and tweak the `scale` argument if the new comprehensive icon is too large or small.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**‚
Once the upgraded ship icons (hull + rooms) are rendering correctly on the maps and beautifully in the Hangar, stage and commit the changes.
Use the commit message: "ui: Sprint 77 complete - Upgraded comprehensive ship rendering (hull+rooms) for Maps and Hangar".

Please begin by upgrading the `drawShipIcon` function. Let me know when the commit is successful!